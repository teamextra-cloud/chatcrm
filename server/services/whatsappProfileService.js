import axios from 'axios';
import { supabase } from '../supabase.js';

const PLATFORM = 'whatsapp';

const SYNC_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const REQUEST_TIMEOUT_MS = 3000;
const RETRIES = 2; // retry 2 times → total 3 attempts

// Optional protection against rate limits / bursts:
const DEBOUNCE_MS = 10_000; // same phone sends multiple messages quickly
const MAX_QUEUE = 5_000;

const _debounceUntil = new Map(); // phone -> timestamp
let _queue = [];
let _draining = false;

function sanitizePhone(phone) {
  // WhatsApp wa_id is numeric; keep digits only.
  const cleaned = String(phone || '').replace(/[^\d]/g, '');
  return cleaned || null;
}

function sanitizeName(name) {
  const cleaned = String(name || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'Unknown';
  return cleaned.slice(0, 120);
}

export function fallbackAvatar(name) {
  const safe = sanitizeName(name);
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(safe)}&background=random`;
}

function shouldSkipFetch(existing) {
  if (!existing?.avatar) return false;
  const ts = existing.lastSyncedAt || existing.last_synced_at;
  if (!ts) return false;
  const last = Date.parse(ts);
  if (!Number.isFinite(last)) return false;
  return Date.now() - last < SYNC_TTL_MS;
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function fetchProfilePicFromGraph({ phone }) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_ID; // Cloud API phone number id

  if (!token || !phoneNumberId) {
    throw new Error('Missing WHATSAPP_TOKEN or WHATSAPP_PHONE_ID');
  }

  const url =
    `https://graph.facebook.com/v19.0/${encodeURIComponent(phoneNumberId)}/contacts` +
    `?wa_id=${encodeURIComponent(phone)}`;

  let lastErr = null;

  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    try {
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: REQUEST_TIMEOUT_MS,
      });

      const profilePic = res?.data?.contacts?.[0]?.profile?.profile_pic || null;
      return profilePic;
    } catch (err) {
      lastErr = err;
      const status = err?.response?.status;
      const msg = err?.response?.data || err?.message || err;
      console.error('[whatsapp-profile] fetch failed', { attempt: attempt + 1, status, msg });

      // Small backoff; keep it short since this runs background anyway.
      if (attempt < RETRIES) await sleep(250 * (attempt + 1));
    }
  }

  throw lastErr || new Error('Graph API fetch failed');
}

async function ensureContact({ phone, name }) {
  // Supports either schema style:
  // - contacts: { phone, name, avatar, lastSyncedAt }
  // - contacts: { phone, name, avatar, last_synced_at }
  const { data: existing, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('phone', phone)
    .maybeSingle();

  if (error) throw error;

  if (!existing) {
    const payload = {
      phone,
      name,
      avatar: null,
      lastSyncedAt: null,
      platform: PLATFORM,
    };

    const created = await (async () => {
      const first = await supabase.from('contacts').insert(payload).select('*').single();
      if (!first.error) return first.data;

      // If schema doesn't include lastSyncedAt/platform, retry with minimal fields.
      const msg = String(first.error?.message || '').toLowerCase();
      if (msg.includes('lastsyncedat') || msg.includes('last_synced_at') || msg.includes('platform')) {
        const minimal = { phone, name, avatar: null };
        const second = await supabase.from('contacts').insert(minimal).select('*').single();
        if (second.error) throw second.error;
        return second.data;
      }

      throw first.error;
    })();

    console.log('[whatsapp-profile] created contact', { phone });
    return { contact: created, created: true };
  }

  // Keep name up to date (best effort)
  if (name && existing.name !== name) {
    try {
      const { error: updErr } = await supabase
        .from('contacts')
        .update({ name })
        .eq('id', existing.id);
      if (!updErr) {
        return { contact: { ...existing, name }, created: false, nameUpdated: true };
      }
    } catch {
      // swallow: do not break sync due to name-only issues
    }
  }

  return { contact: existing, created: false, nameUpdated: false };
}

/**
 * Sync WhatsApp contact profile (name + avatar).
 *
 * Requirements:
 * - create contact if missing
 * - update name if changed
 * - skip Graph API fetch if avatar exists and last synced < 24h
 * - retry 2 times, 3s timeout
 * - never crash caller
 */
export async function syncWhatsAppProfile({ phone, name }) {
  const safePhone = sanitizePhone(phone);
  const safeName = sanitizeName(name);

  if (!safePhone) return;

  try {
    const ensured = await ensureContact({ phone: safePhone, name: safeName });
    const contact = ensured.contact;

    if (shouldSkipFetch(contact)) return;

    let profilePic = null;
    try {
      profilePic = await fetchProfilePicFromGraph({ phone: safePhone });
    } catch (err) {
      console.error('[whatsapp-profile] fetch failed (giving up)', {
        phone: safePhone,
        error: err?.message || err,
      });
    }

    const nextAvatar = profilePic || contact?.avatar || fallbackAvatar(safeName);
    const nowIso = new Date().toISOString();

    // Update supports either column naming convention.
    const updateAttempts = [
      { avatar: nextAvatar, lastSyncedAt: nowIso, name: safeName },
      { avatar: nextAvatar, last_synced_at: nowIso, name: safeName },
      { avatar: nextAvatar, name: safeName },
    ];

    let updated = false;
    for (const payload of updateAttempts) {
      try {
        const { error } = await supabase.from('contacts').update(payload).eq('phone', safePhone);
        if (!error) {
          updated = true;
          break;
        }
      } catch {
        // try next payload
      }
    }

    if (updated) {
      if (profilePic) console.log('[whatsapp-profile] avatar updated', { phone: safePhone });
    }
  } catch (err) {
    console.error('[whatsapp-profile] sync error', { phone: safePhone, error: err?.message || err });
  }
}

/**
 * Fire-and-forget helper with debounce + simple in-memory queue.
 * Ensures webhook responses are never blocked by profile syncing.
 */
export function enqueueWhatsAppProfileSync({ phone, name }) {
  const safePhone = sanitizePhone(phone);
  const safeName = sanitizeName(name);
  if (!safePhone) return;

  const now = Date.now();
  const until = _debounceUntil.get(safePhone) || 0;
  if (now < until) return;

  _debounceUntil.set(safePhone, now + DEBOUNCE_MS);

  if (_queue.length >= MAX_QUEUE) {
    // Drop oldest to keep memory bounded; still no crash.
    _queue = _queue.slice(-Math.floor(MAX_QUEUE / 2));
  }

  _queue.push({ phone: safePhone, name: safeName });
  void drainQueue();
}

async function drainQueue() {
  if (_draining) return;
  _draining = true;

  try {
    while (_queue.length) {
      const job = _queue.shift();
      if (!job) continue;
      await syncWhatsAppProfile(job);
    }
  } finally {
    _draining = false;
  }
}


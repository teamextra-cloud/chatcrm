/**
 * WhatsApp Cloud API webhook handler
 * - Verify: GET /webhook/whatsapp
 * - Receive: POST /webhook/whatsapp
 *
 * Mirrors LINE/Facebook flow:
 * - Upsert customer (platform=whatsapp)
 * - Insert message into messages table
 * - Emit Socket.io events (new_message, customer_list_update)
 *
 * Important:
 * - Always return 200 from webhook handler
 * - Never throw uncaught errors
 * - Log payload at route level (server.js)
 */
import { supabase } from './supabase.js';
import { getIO } from './socket.js';
import { enqueueWhatsAppProfileSync } from './services/whatsappProfileService.js';

const PLATFORM = 'whatsapp';

/**
 * Simple in-memory dedupe for webhook retries / duplicates.
 * (DB-level dedupe is attempted first when schema supports it.)
 */
const seenMessageIds = new Map(); // id -> timestamp
const DEDUPE_TTL_MS = 24 * 60 * 60 * 1000;
const DEDUPE_MAX_SIZE = 10_000;

function rememberId(id) {
  const now = Date.now();
  seenMessageIds.set(id, now);

  // opportunistic cleanup
  if (seenMessageIds.size > DEDUPE_MAX_SIZE) {
    for (const [k, ts] of seenMessageIds) {
      if (now - ts > DEDUPE_TTL_MS) seenMessageIds.delete(k);
      if (seenMessageIds.size <= DEDUPE_MAX_SIZE) break;
    }
  }
}

function hasSeenId(id) {
  const ts = seenMessageIds.get(id);
  if (!ts) return false;
  if (Date.now() - ts > DEDUPE_TTL_MS) {
    seenMessageIds.delete(id);
    return false;
  }
  return true;
}

async function findMessageByPlatformId(platformMessageId) {
  if (!platformMessageId) return false;

  /**
   * DB dedupe (preferred): messages.platform_message_id (recommended column)
   * If the column doesn't exist yet, Supabase will return an error; we fall back to memory dedupe.
   */
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('id')
      .eq('platform_message_id', platformMessageId)
      .limit(1);
    if (error) throw error;
    return Array.isArray(data) && data.length > 0;
  } catch (_err) {
    return hasSeenId(platformMessageId);
  }
}

function normalizeIncomingText(msg) {
  if (!msg || typeof msg !== 'object') return '';

  if (msg.type === 'text') {
    return msg.text?.body || '';
  }

  // Minimal fallback to keep CRM stable; can be extended later.
  if (typeof msg.type === 'string' && msg.type) {
    return `[${msg.type}]`;
  }

  return '';
}

async function upsertCustomer(from) {
  const fallbackName = `WhatsApp ${String(from || '').slice(0, 8)}`;

  const { data: customer } = await supabase
    .from('customers')
    .upsert(
      {
        platform: PLATFORM,
        platform_id: String(from),
        name: fallbackName,
        last_message_at: new Date().toISOString(),
      },
      {
        onConflict: 'platform,platform_id',
      }
    )
    .select()
    .single();

  return customer;
}

async function insertMessage({ customerId, content, platformMessageId }) {
  const payload = {
    customer_id: customerId,
    sender_type: 'customer',
    message_type: 'text',
    content,
    file_url: null,
    file_size: null,
    // recommended for dedupe (schema may or may not include this column)
    platform_message_id: platformMessageId || null,
  };

  const first = await supabase
    .from('messages')
    .insert(payload)
    .select()
    .single();

  if (!first.error) return first.data;

  // If DB doesn't support platform_message_id yet, retry without it.
  const msg = (first.error?.message || '').toLowerCase();
  if (msg.includes('platform_message_id')) {
    const { platform_message_id: _drop, ...fallbackPayload } = payload;
    const second = await supabase
      .from('messages')
      .insert(fallbackPayload)
      .select()
      .single();
    return second.data;
  }

  throw first.error;
}

async function updateCustomerAfterMessage(customerId, content) {
  // Keep last_message short (matches server.js send behavior)
  const last = (content || '').slice(0, 100);

  // best-effort unread increment; ignore schema mismatches safely
  try {
    const { data: existing } = await supabase
      .from('customers')
      .select('id, unread_count')
      .eq('id', customerId)
      .maybeSingle();

    const nextUnread = (existing?.unread_count || 0) + 1;

    await supabase
      .from('customers')
      .update({
        last_message: last,
        last_message_at: new Date().toISOString(),
        unread_count: nextUnread,
      })
      .eq('id', customerId);
  } catch (err) {
    // Fall back to only updating last_message fields if unread_count column doesn't exist.
    const msg = String(err?.message || '').toLowerCase();
    if (msg.includes('unread_count')) {
      await supabase
        .from('customers')
        .update({
          last_message: last,
          last_message_at: new Date().toISOString(),
        })
        .eq('id', customerId);
      return;
    }
    // swallow: webhook must not crash
  }
}

/**
 * GET: webhook verification (Meta)
 */
export function handleWhatsAppVerify(req, res) {
  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
}

/**
 * POST: incoming WhatsApp events (messages + statuses)
 * Always respond 200.
 */
export async function handleWhatsAppWebhook(req, res) {
  try {
    const body = req.body || {};

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    const messages = value?.messages || [];

    for (const msg of messages) {
      try {
        const from = msg.from; // wa_id (phone number)
        const platformMessageId = msg.id;

        if (!from) continue;

        // Contact profile sync (non-blocking): name from webhook contacts, avatar via Graph API.
        // Must never delay webhook response.
        try {
          const phone = value?.contacts?.[0]?.wa_id || from;
          const name = value?.contacts?.[0]?.profile?.name || 'Unknown';
          enqueueWhatsAppProfileSync({ phone, name });
        } catch (e) {
          console.error('[whatsapp] profile sync enqueue failed:', e?.message || e);
        }

        const exists = await findMessageByPlatformId(platformMessageId);
        if (exists) continue;
        if (platformMessageId) rememberId(platformMessageId);

        const text = normalizeIncomingText(msg);
        if (!text) continue;

        const customer = await upsertCustomer(from);
        if (!customer?.id) continue;

        const saved = await insertMessage({
          customerId: customer.id,
          content: text,
          platformMessageId,
        });

        await updateCustomerAfterMessage(customer.id, text);

        getIO().emit('new_message', {
          message: saved,
          customer,
        });
        getIO().emit('customer_list_update', {});
      } catch (err) {
        console.error('[whatsapp] message error:', err?.message || err);
      }
    }

    return res.status(200).send('OK');
  } catch (err) {
    console.error('[whatsapp] webhook error:', err?.message || err);
    return res.status(200).send('OK');
  }
}


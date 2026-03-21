/**
 * ChatCRM backend: Express server, webhooks, Socket.io, send-message API.
 */
import 'dotenv/config';
import http from 'http';
import express from 'express';
import multer from 'multer';
import { attachSocket, getIO } from './socket.js';
import { handleLineWebhook } from './lineWebhook.js';
import { handleFacebookVerify, handleFacebookWebhook } from './facebookWebhook.js';
import { handleWhatsAppVerify, handleWhatsAppWebhook } from './whatsappWebhook.js';
import { supabase } from './supabase.js';
import { sendLineMessage } from './sendLineMessage.js';
import { sendFacebookMessage } from './sendFacebookMessage.js';
import { sendWhatsAppMessage } from './sendWhatsAppMessage.js';
import { uploadBufferToSupabase } from './uploadHandler.js';

const app = express();
const PORT = process.env.PORT || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Raw body for LINE signature verification; limit for large webhook payloads
app.use(express.json({
  limit: '10mb',
  verify: (req, _res, buf) => {
    if (buf?.length) req.rawBody = buf.toString();
  },
}));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => res.json({ ok: true }));

// ---------- Dashboard API ----------
app.get('/customers', async (_req, res) => {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('last_message_at', { ascending: false, nullsFirst: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

app.get('/messages', async (req, res) => {
  const customerId = req.query.customer_id;
  if (!customerId) return res.status(400).json({ error: 'customer_id required' });
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// ---------- Customer Profile Updates ----------
app.post('/customer/status', async (req, res) => {
  try {
    const { customerId, status } = req.body || {};
    if (!customerId) return res.status(400).json({ error: 'customerId required' });
    if (typeof status !== 'string') return res.status(400).json({ error: 'status must be a string' });

    const { error } = await supabase
      .from('customers')
      .update({ status })
      .eq('id', customerId);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    console.error('[customer/status]', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/customer/tags', async (req, res) => {
  try {
    const { customerId, tags } = req.body || {};
    if (!customerId) return res.status(400).json({ error: 'customerId required' });
    if (!Array.isArray(tags)) return res.status(400).json({ error: 'tags must be an array' });

    const cleaned = tags
      .filter((t) => typeof t === 'string')
      .map((t) => t.trim())
      .filter(Boolean);

    const { error } = await supabase
      .from('customers')
      .update({ tags: cleaned })
      .eq('id', customerId);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    console.error('[customer/tags]', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/customer/notes', async (req, res) => {
  try {
    const { customerId, notes } = req.body || {};
    if (!customerId) return res.status(400).json({ error: 'customerId required' });
    if (typeof notes !== 'string') return res.status(400).json({ error: 'notes must be a string' });

    const { error } = await supabase
      .from('customers')
      .update({ notes })
      .eq('id', customerId);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    console.error('[customer/notes]', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- Mark messages as read (agent opened chat) ----------
/**
 * POST /mark-read
 * Body: { customer_id }
 *
 * When agent opens a chat
 * unread_count should reset to 0
 */
app.post('/mark-read', async (req, res) => {
  try {

    const { customer_id: customerId } = req.body || {}

    if (!customerId) {
      return res.status(400).json({ error: 'customer_id required' })
    }

    const { error } = await supabase
      .from('customers')
      .update({
        unread_count: 0
      })
      .eq('id', customerId)

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    res.json({ success: true })

  } catch (err) {

    console.error('[mark-read]', err)

    res.status(500).json({ error: err.message })
  }
});

// ---------- Webhooks (error-safe: never throw, always 200) ----------
app.post('/webhook/line', async (req, res) => {
  try {
    if (req.body === undefined) req.body = {};
    console.log('[webhook/line] payload:', JSON.stringify(req.body, null, 2));
    await handleLineWebhook(req, res);
    if (!res.headersSent) res.status(200).send('OK');
  } catch (err) {
    console.error('LINE webhook error:', err);
    if (!res.headersSent) res.status(200).send('OK');
  }
});

app.get('/webhook/facebook', handleFacebookVerify);

app.post('/webhook/facebook', async (req, res) => {
  try {
    const body = req.body;
    if (!body || typeof body !== 'object') req.body = {};
    console.log('[webhook/facebook] payload:', JSON.stringify(req.body, null, 2));
    if (!body.entry) {
      return res.status(200).send('no entry');
    }
    await handleFacebookWebhook(req, res);
    if (!res.headersSent) res.status(200).send('OK');
  } catch (err) {
    console.error('Facebook webhook error:', err);
    if (!res.headersSent) res.status(200).send('OK');
  }
});

app.get('/webhook/whatsapp', handleWhatsAppVerify);

app.post('/webhook/whatsapp', async (req, res) => {
  try {
    const body = req.body;
    if (!body || typeof body !== 'object') req.body = {};
    console.log('[webhook/whatsapp] payload:', JSON.stringify(req.body, null, 2));
    await handleWhatsAppWebhook(req, res);
    if (!res.headersSent) res.status(200).send('OK');
  } catch (err) {
    console.error('WhatsApp webhook error:', err);
    if (!res.headersSent) res.status(200).send('OK');
  }
});

// ---------- File upload (agent dashboard) ----------
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const url = await uploadBufferToSupabase(
      req.file.buffer,
      req.file.originalname || 'file',
      req.file.mimetype
    );
    res.json({ file_url: url });
  } catch (err) {
    console.error('[upload]', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- Agent send message ----------
// POST /send-message  Body: { customer_id, message_type, content?, file_url? }
app.post('/send-message', async (req, res) => {
  try {
    const { customer_id: customerId, message_type: messageType, content, file_url: fileUrl } = req.body || {};
    if (!customerId) return res.status(400).json({ error: 'customer_id required' });

    const { data: customer, error: custError } = await supabase
      .from('customers')
      .select('id, platform, platform_id')
      .eq('id', customerId)
      .single();

    if (custError || !customer) return res.status(404).json({ error: 'Customer not found' });

    const { data: message, error: msgError } = await supabase
      .from('messages')
      .insert({
        customer_id: customerId,
        sender_type: 'agent',
        message_type: messageType || 'text',
        content: content || null,
        file_url: fileUrl || null,
      })
      .select()
      .single();

    if (msgError) return res.status(500).json({ error: msgError.message });

    await supabase
      .from('customers')
      .update({
        last_message: (content || `[${messageType}]`).slice(0, 100),
        last_message_at: new Date().toISOString(),
      })
      .eq('id', customerId);

    const payload = { type: message.message_type, content: message.content, file_url: message.file_url };
    const tokenLine = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const tokenFb = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
    const waToken = process.env.WHATSAPP_TOKEN;
    const waPhoneId = process.env.WHATSAPP_PHONE_ID;

    if (customer.platform === 'line' && tokenLine) {
      try { await sendLineMessage(customer.platform_id, payload, tokenLine); } catch (e) { console.error('[send] LINE:', e.message); }
    } else if (customer.platform === 'facebook' && tokenFb) {
      try { await sendFacebookMessage(customer.platform_id, payload, tokenFb); } catch (e) { console.error('[send] Facebook:', e.message); }
    } else if (customer.platform === 'whatsapp' && waToken && waPhoneId) {
      try {
        const text =
          payload.type === 'text'
            ? (payload.content || '')
            : `${payload.content || `[${payload.type}]`}${payload.file_url ? `\n${payload.file_url}` : ''}`;
        await sendWhatsAppMessage(customer.platform_id, text);
      } catch (e) {
        console.error('[send] WhatsApp:', e.message);
      }
    }

    getIO().emit('agent_reply', { message, customer });
    getIO().emit('customer_list_update', {});

    res.json({ success: true, message });
  } catch (err) {
    console.error('[send-message]', err);
    res.status(500).json({ error: err.message });
  }
});

const httpServer = http.createServer(app);
attachSocket(httpServer);

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err)
})

process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED PROMISE:", err)
})

app.use((err, req, res, next) => {
  console.error('SERVER ERROR:', err);
  // Webhook routes must always return 200 to avoid platform retries / 502
  if (req.path === '/webhook/facebook' || req.path === '/webhook/line' || req.path === '/webhook/whatsapp') {
    return res.status(200).send('OK');
  }
  res.status(500).json({ error: 'Internal Server Error' });
});

httpServer.listen(PORT, () => {
  console.log(`ChatCRM server running on http://localhost:${PORT}`);
});

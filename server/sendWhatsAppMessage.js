/**
 * Send WhatsApp message via Meta WhatsApp Cloud API.
 * Text-only for now (attachments are sent as links by server.js fallback).
 */
import axios from 'axios';

export async function sendWhatsAppMessage(to, text) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;

  if (!token) throw new Error('WHATSAPP_TOKEN required');
  if (!phoneId) throw new Error('WHATSAPP_PHONE_ID required');
  if (!to) throw new Error('WhatsApp "to" required');

  const url = `https://graph.facebook.com/v18.0/${encodeURIComponent(phoneId)}/messages`;

  await axios.post(
    url,
    {
      messaging_product: 'whatsapp',
      to: String(to),
      text: { body: String(text || '') },
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    }
  );
}


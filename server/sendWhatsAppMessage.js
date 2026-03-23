import axios from 'axios';

export async function sendWhatsAppMessage(to, text) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;

  if (!token) throw new Error('WHATSAPP_TOKEN required');
  if (!phoneId) throw new Error('WHATSAPP_PHONE_ID required');
  if (!to) throw new Error('WhatsApp "to" required');

  const url = `https://graph.facebook.com/v19.0/${phoneId}/messages`;

  try {
    const res = await axios.post(
      url,
      {
        messaging_product: 'whatsapp',
        to: String(to),
        type: 'text', // ✅ ต้องมี
        text: {
          body: String(text || '')
        }
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    console.log('✅ WhatsApp sent:', res.data);
  } catch (err) {
    console.error('❌ WhatsApp error:', err.response?.data || err.message);
    throw err;
  }
}
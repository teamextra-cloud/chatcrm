/**
 * API client for ChatCRM backend.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

export async function uploadFile(file) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_URL}/upload`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.file_url;
}

export async function sendMessage({ customer_id, message_type, content, file_url }) {
  const res = await fetch(`${API_URL}/send-message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customer_id, message_type, content, file_url }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getCustomers() {
  const res = await fetch(`${API_URL}/customers`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getMessages(customerId) {
  const res = await fetch(`${API_URL}/messages?customer_id=${customerId}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

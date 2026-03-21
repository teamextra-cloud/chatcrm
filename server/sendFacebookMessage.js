/**
 * Send messages to Facebook Messenger API.
 * Supports text, image, video, file (attachment URL).
 */
import axios from 'axios';

/**
 * Send a message to a Facebook user (PSID).
 * @param {string} psid - Page-scoped user ID
 * @param {object} message - { type, content?, file_url? }
 * @param {string} pageAccessToken - FACEBOOK_PAGE_ACCESS_TOKEN
 */
export async function sendFacebookMessage(psid, message, pageAccessToken) {
  if (!pageAccessToken) throw new Error('FACEBOOK_PAGE_ACCESS_TOKEN required');

  const payload = buildFacebookPayload(psid, message);
  const url = `https://graph.facebook.com/v18.0/me/messages?access_token=${encodeURIComponent(pageAccessToken)}`;

  await axios.post(url, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 10000,
  });
}

/**
 * Build Messenger Send API payload.
 * https://developers.facebook.com/docs/messenger-platform/send-messages
 */
function buildFacebookPayload(psid, message) {
  const { type, content, file_url } = message;

  const recipient = { id: psid };

  if (type === 'text') {
    return {
      recipient,
      message: { text: content || '' },
    };
  }

  if (type === 'image' && file_url) {
    return {
      recipient,
      message: {
        attachment: {
          type: 'image',
          payload: { url: file_url, is_reusable: true },
        },
      },
    };
  }

  if (type === 'video' && file_url) {
    return {
      recipient,
      message: {
        attachment: {
          type: 'video',
          payload: { url: file_url },
        },
      },
    };
  }

  if (type === 'file' && file_url) {
    return {
      recipient,
      message: {
        attachment: {
          type: 'file',
          payload: { url: file_url },
        },
      },
    };
  }

  return {
    recipient,
    message: { text: content || '[Unsupported message type]' },
  };
}

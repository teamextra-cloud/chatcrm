/**
 * Send messages to LINE via Messaging API.
 * Supports text, image, video, file (and template/quick reply if needed later).
 */
import axios from 'axios';

const LINE_API = 'https://api.line.me/v2/bot/message/push';

/**
 * Send a message to a LINE user.
 * @param {string} lineUserId - LINE user ID (from webhook)
 * @param {object} message - { type, content?, file_url? }
 * @param {string} accessToken - LINE_CHANNEL_ACCESS_TOKEN
 */
export async function sendLineMessage(lineUserId, message, accessToken) {
  if (!accessToken) throw new Error('LINE_CHANNEL_ACCESS_TOKEN required');

  const messages = buildLineMessages(message);
  await axios.post(
    LINE_API,
    { to: lineUserId, messages },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      timeout: 10000,
    }
  );
}

/**
 * Convert our message format to LINE API format.
 * LINE types: text, image, video, audio, file, location, sticker, template...
 */
function buildLineMessages(message) {
  const { type, content, file_url } = message;

  if (type === 'text') {
    return [{ type: 'text', text: content || '' }];
  }
  if (type === 'image' && file_url) {
    return [{ type: 'image', originalContentUrl: file_url, previewImageUrl: file_url }];
  }
  if (type === 'video' && file_url) {
    return [{ type: 'video', originalContentUrl: file_url, previewImageUrl: file_url }];
  }
  if (type === 'file' && file_url) {
    // LINE file message: originalContentUrl + file name from content or "file"
    return [{
      type: 'text',
      text: `[File] ${content || 'Attachment'}\n${file_url}`,
    }];
  }

  // Fallback: send as text
  return [{ type: 'text', text: content || '[Unsupported message type]' }];
}

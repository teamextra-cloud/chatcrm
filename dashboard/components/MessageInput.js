'use client';

import { useState, useRef } from 'react';
import { sendMessage, uploadFile } from '../lib/api';
import { getSocket } from '../lib/socket';

let typingTimeout;

function handleTyping(socket, customerId) {
  if (!socket || !customerId) return;
  socket.emit('typing', {
    customerId,
    from: 'agent',
  });
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit('stop_typing', {
      customerId,
      from: 'agent',
    });
  }, 1500);
}

export default function MessageInput({ customerId, onSending, onSent }) {
  const [text, setText] = useState('');
  const [fileUrl, setFileUrl] = useState(null);
  const [messageType, setMessageType] = useState('text');
  const [fileMeta, setFileMeta] = useState(null);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleSend = async () => {
    if (!customerId) return;
    const type = fileUrl ? messageType : 'text';
    const content = type === 'text' ? text : (text || fileMeta?.name || (fileUrl && 'Attachment'));
    if (!content && type === 'text') return;

    const tempId = 'temp-' + Date.now();
    const optimisticMessage = {
      id: tempId,
      customer_id: customerId,
      sender_type: 'agent',
      message_type: type,
      content: type === 'text' ? content : (text || fileMeta?.name || 'Attachment'),
      file_url: fileUrl || null,
      file_size: fileMeta?.size,
      created_at: new Date().toISOString(),
      status: 'sending',
    };
    onSending?.(optimisticMessage);

    setSending(true);
    try {
      const data = await sendMessage({
        customer_id: customerId,
        message_type: type,
        content: type === 'text' ? content : (text || fileMeta?.name || 'Attachment'),
        file_url: fileUrl || undefined,
        file_size: fileMeta?.size,
      });
      setText('');
      setFileUrl(null);
      setMessageType('text');
      setFileMeta(null);
      onSent?.(data?.message, tempId);
    } catch (e) {
      console.error(e);
      alert(e.message || 'Send failed');
      onSent?.(null, tempId);
    } finally {
      setSending(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFile(file);
      setFileUrl(url);
      setFileMeta({ name: file.name, size: file.size });
      const t = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file';
      setMessageType(t);
    } catch (err) {
      console.error(err);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
    e.target.value = '';
  };

  return (
    <div className="px-0 py-0">
      <div className="flex items-end gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 shadow-sm">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*,video/*,.pdf,.doc,.docx,*"
        style={{ display: 'none' }}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="inline-flex items-center justify-center rounded-xl bg-gray-100 px-3 py-2 text-gray-500 hover:bg-gray-200 disabled:cursor-wait disabled:opacity-70"
      >
        {uploading ? '…' : '📎'}
      </button>
      {fileUrl && (
        <span className="self-center text-xs text-gray-500">
          {fileMeta?.name ? `Attached: ${fileMeta.name}` : 'Attached'}
          <button
            type="button"
            onClick={() => { setFileUrl(null); setMessageType('text'); setFileMeta(null); }}
            className="ml-1 text-xs text-blue-600 hover:text-blue-700"
          >
            ✕
          </button>
        </span>
      )}
      <input
        type="text"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          handleTyping(getSocket(), customerId);
        }}
        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
        placeholder="Type a message..."
        className="flex-1 bg-transparent px-2 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
      />
      <button
        type="button"
        onClick={handleSend}
        disabled={sending || (!text && !fileUrl)}
        className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
      >
        {sending ? '…' : 'Send'}
      </button>
      </div>
    </div>
  );
}

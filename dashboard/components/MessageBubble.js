'use client'

import { getSocket } from '../lib/socket'

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Convert file size
 */
function formatFileSize(bytes) {
  if (!bytes) return ''
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i]
}

/**
 * Get filename
 */
function looksLikeGeneratedId(value) {
  if (typeof value !== 'string') return false
  const v = value.trim()
  if (!v) return false
  if (v === 'Attachment') return false
  if (/^\d{13}-/i.test(v)) return true
  if (v.length >= 30 && !v.includes(' ') && !v.includes('.')) return true
  return false
}

function getFileNameFromUrl(url) {
  if (typeof url !== 'string' || url.length === 0) return ''
  const clean = url.split('?')[0].split('#')[0]
  const last = clean.split('/').pop()
  if (!last) return ''
  try {
    return decodeURIComponent(last)
  } catch {
    return last
  }
}

function getFileName(message) {

  // Prefer explicit metadata fields from payload/DB
  const candidates = [
    message?.fileName,
    message?.originalName,
    message?.name,
    message?.filename,
    message?.original_name,
  ]
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim()
  }

  // Prefer filename stored in DB (messages.content) when it's actually a name
  if (typeof message?.content === 'string' && message.content.trim() && !looksLikeGeneratedId(message.content)) {
    return message.content.trim()
  }

  // Fallback: derive from file_url so older messages still show metadata
  const fromUrl = getFileNameFromUrl(message?.file_url || message?.url)
  if (fromUrl) return fromUrl

  return 'Attachment'

}

/**
 * Detect file icon
 */
function getFileIcon(name) {

  const ext =
    name.split(".").pop().toLowerCase()

  if (["jpg","jpeg","png","gif","webp"].includes(ext))
    return "🖼"

  if (["mp4","mov","avi","webm"].includes(ext))
    return "🎬"

  if (["pdf"].includes(ext))
    return "📕"

  if (["doc","docx"].includes(ext))
    return "📘"

  if (["xls","xlsx"].includes(ext))
    return "📊"

  if (["zip","rar","7z"].includes(ext))
    return "🗜"

  if (["txt"].includes(ext))
    return "📄"

  return "📎"
}

export default function MessageBubble({ message, isAgent }) {

  const type = message?.message_type || "text"

  const isImage = type === "image"
  const isVideo = type === "video"
  const isFile  = type === "file"
  const isText  = type === "text"

  const fileName = getFileName(message)
  const icon = getFileIcon(fileName)
  const rawBytes = message?.file_size ?? message?.fileSize ?? message?.size
  const size = typeof rawBytes === 'number' ? formatFileSize(rawBytes) : formatFileSize(Number(rawBytes))
  const ext = typeof fileName === 'string' && fileName.includes('.') ? fileName.split('.').pop() : ''

  function addReaction(emoji) {
    const socket = getSocket()
    if (!socket) return

    // Dashboard-side reactions: use a stable agent id unless your auth provides one.
    const currentUserId = 'agent'

    socket.emit('add_reaction', {
      messageId: message?.id,
      emoji,
      userId: currentUserId,
    })
  }

  return (
    <div
      className={[
        'mb-3 flex',
        isAgent ? 'justify-end' : 'justify-start',
      ].join(' ')}
    >
      <div className="relative group max-w-[60%]">
        <div className="absolute -top-6 right-2 opacity-0 group-hover:opacity-100 transition">
          <button className="px-1" onClick={() => addReaction("👍")}>👍</button>
          <button className="px-1" onClick={() => addReaction("❤️")}>❤️</button>
          <button className="px-1" onClick={() => addReaction("😂")}>😂</button>
        </div>

        <div
          className={[
            'rounded-2xl px-4 py-2 text-sm shadow-sm',
            isAgent
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-900 border border-gray-200',
          ].join(' ')}
        >
          {/* IMAGE */}
          {isImage && message.file_url && (
            <div className="max-w-[320px] overflow-hidden rounded-lg">
              <img
                src={message.file_url}
                className="max-w-[320px] rounded-lg"
              />
            </div>
          )}

          {/* VIDEO */}
          {isVideo && message.file_url && (
            <div className="max-w-[320px] overflow-hidden rounded-lg">
              <video
                controls
                className="max-w-[320px] rounded-lg"
              >
                <source src={message.file_url} />
              </video>
            </div>
          )}

          {/* FILE */}
          {isFile && message.file_url && (
            <a
              href={message.file_url}
              target="_blank"
              rel="noreferrer"
              className={[
                'block break-words',
                isAgent ? 'text-blue-100' : 'text-blue-600',
              ].join(' ')}
            >
              <div className="flex items-center gap-2">
                <span aria-hidden="true">{icon}</span>
                <div>
                  <div className="text-sm font-medium">{fileName}</div>
                  {(ext || size) && (
                    <div className="text-xs text-gray-500">
                      {ext ? ext.toUpperCase() : ''}
                      {ext && size ? ' • ' : ''}
                      {size ? size : ''}
                    </div>
                  )}
                </div>
              </div>
            </a>
          )}

          {/* TEXT */}
          {isText && (
            <div className="whitespace-pre-wrap">
              {message.content}
            </div>
          )}

          {/* TIME */}
          <div className="mt-1 text-right text-xs text-gray-400">
            {formatTime(message.created_at)}
          </div>

          {/* READ RECEIPTS (agent messages only) */}
          {isAgent && message?.status && (
            <div className={`mt-0.5 text-right text-xs ${message.status === 'seen' ? 'text-blue-300' : 'text-gray-400'}`}>
              {message.status === 'sending' && (
                <span className="inline-flex items-center gap-1">Sending...</span>
              )}
              {message.status === 'sent' && (
                <span className="inline-flex items-center gap-1">✓ Sent</span>
              )}
              {message.status === 'delivered' && (
                <span className="inline-flex items-center gap-1">✓✓ Delivered</span>
              )}
              {message.status === 'seen' && (
                <span className="inline-flex items-center gap-1">✓✓ Seen</span>
              )}
            </div>
          )}
        </div>

        {!!message?.reactions?.length && (
          <div className="flex gap-1 mt-1">
            {message.reactions?.map((r) => (
              <div
                key={r.emoji}
                className="text-xs bg-gray-100 px-2 py-0.5 rounded-full"
              >
                {r.emoji} {Array.isArray(r.users) ? r.users.length : 0}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

}
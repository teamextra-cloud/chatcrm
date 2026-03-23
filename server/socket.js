/**
 * Socket.io server for realtime dashboard updates.
 * Events: new_message, agent_reply, customer_list_update, user_online, user_offline, message_delivered, message_seen
 */
import { Server } from 'socket.io';
import { supabase } from './supabase.js';

let io = null;

const onlineUsers = new Map();

/**
 * Attach Socket.io to HTTP server and set CORS for Next.js dashboard.
 * @param {import('http').Server} httpServer
 * @returns {Server} Socket.io instance
 */
export function attachSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('[socket] client connected:', socket.id);

    socket.on('join', ({ userId }) => {
      if (userId) {
        onlineUsers.set(userId, socket.id);
        io.emit('user_online', { userId });
      }
    });

    // Customer profile updates (status/tags/notes) - broadcast to other clients
    socket.on('customer_updated', (data) => {
      socket.broadcast.emit('customer_updated', data);
    });

    socket.on('add_reaction', async ({ messageId, emoji, userId }) => {
      try {
        if (!messageId || !emoji || !userId) return;

        const { data: message, error: getErr } = await supabase
          .from('messages')
          .select('id, reactions')
          .eq('id', messageId)
          .single();

        if (getErr || !message) return;

        let reactions = Array.isArray(message.reactions) ? message.reactions : [];

        const idx = reactions.findIndex((r) => r?.emoji === emoji);
        if (idx >= 0) {
          const existing = reactions[idx] || { emoji, users: [] };
          const users = Array.isArray(existing.users) ? existing.users : [];

          // Toggle: if already reacted, remove; else add.
          if (users.includes(userId)) {
            const nextUsers = users.filter((u) => u !== userId);
            if (nextUsers.length === 0) {
              reactions = reactions.filter((r) => r?.emoji !== emoji);
            } else {
              reactions = reactions.map((r, i) => (i === idx ? { ...existing, users: nextUsers } : r));
            }
          } else {
            reactions = reactions.map((r, i) => (i === idx ? { ...existing, users: [...users, userId] } : r));
          }
        } else {
          reactions = [...reactions, { emoji, users: [userId] }];
        }

        const { error: updErr } = await supabase
          .from('messages')
          .update({ reactions })
          .eq('id', messageId);

        if (updErr) return;

        io.emit('reaction_updated', { messageId, reactions });
      } catch (err) {
        console.error('[socket:add_reaction]', err?.message || err);
      }
    });

    socket.on('typing', (data) => {
      socket.broadcast.emit('typing', data);
    });
    socket.on('stop_typing', (data) => {
      socket.broadcast.emit('stop_typing', data);
    });

    socket.on('delivered', ({ messageId }) => {
      io.emit('message_delivered', { messageId });
    });
    socket.on('seen', ({ messageId }) => {
      io.emit('message_seen', { messageId });
    });

    socket.on('disconnect', () => {
      console.log('[socket] client disconnected:', socket.id);
      for (const [userId, id] of onlineUsers.entries()) {
        if (id === socket.id) {
          onlineUsers.delete(userId);
          io.emit('user_offline', { userId });
          break;
        }
      }
    });
  });

  return io;
}

/**
 * Get Socket.io instance (for webhooks and send-message to emit).
 */
export function getIO() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

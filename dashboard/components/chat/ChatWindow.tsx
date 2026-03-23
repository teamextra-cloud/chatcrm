'use client';

import { useEffect, useRef, useState } from 'react';
import { getMessages } from '../../lib/api';
import { getSocket, onNewMessage, onAgentReply, onCustomerTyping } from '../../lib/socket';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';
import { ChatHeader } from './ChatHeader';
import TypingIndicator from './TypingIndicator';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type ChatWindowProps = {
  customer: any | null;
  customers: any[];
  setCustomers: (updater: (prev: any[]) => any[]) => void;
};

function updateMessageStatus(prev: any[], messageId: string, status: string) {
  return prev.map((m) => (m.id === messageId ? { ...m, status } : m));
}

function stripTempId(serverMessage: any) {
  if (!serverMessage) return serverMessage;
  // server may include tempId for optimistic reconciliation; don't keep it in UI state
  const { tempId: _t, ...rest } = serverMessage;
  return rest;
}

function reconcileIncoming(prev: any[], incoming: any) {
  if (!incoming?.id) return prev;

  const tempId = incoming?.tempId;
  const msg = stripTempId(incoming);

  const hasReal = prev.some((m) => m.id === msg.id);
  const hasTemp = tempId ? prev.some((m) => m.id === tempId) : false;

  // If the real message already exists, just drop any matching temp message.
  if (hasReal) {
    if (!hasTemp) return prev;
    return prev.filter((m) => m.id !== tempId);
  }

  // If we have a temp message for this incoming message, replace it.
  if (hasTemp && tempId) {
    return prev.map((m) => (m.id === tempId ? { ...msg, status: m.status === 'sending' ? 'sent' : m.status } : m));
  }

  // Heuristic: if this is an agent message broadcast without tempId, try to
  // replace the most recent matching optimistic "sending" message.
  if (!tempId && msg?.sender_type === 'agent') {
    const cutoffMs = 30_000;
    const now = Date.now();
    const candidateIdx = [...prev]
      .map((m, idx) => ({ m, idx }))
      .reverse()
      .find(({ m }) => {
        if (!m?.id || typeof m.id !== 'string') return false;
        if (!m.id.startsWith('temp-')) return false;
        if (m.sender_type !== 'agent') return false;
        if (m.status !== 'sending') return false;
        if (m.customer_id !== msg.customer_id) return false;
        if ((m.message_type || 'text') !== (msg.message_type || 'text')) return false;
        if ((m.content || '') !== (msg.content || '')) return false;
        if ((m.file_url || null) !== (msg.file_url || null)) return false;
        const createdAt = typeof m.created_at === 'string' ? new Date(m.created_at).getTime() : NaN;
        if (!Number.isFinite(createdAt)) return false;
        return now - createdAt <= cutoffMs;
      })?.idx;

    if (candidateIdx != null) {
      return prev.map((m, idx) => (idx === candidateIdx ? { ...msg, status: 'sent' } : m));
    }
  }

  // Otherwise, append if missing.
  return [...prev, msg];
}

export default function ChatWindow({ customer, customers, setCustomers }: ChatWindowProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCustomerTyping, setIsCustomerTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [isTyping, setIsTyping] = useState(false);

  function handleScroll() {
    const el = containerRef.current;
    if (!el) return;

    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    setIsAtBottom(atBottom);
  }

  // When switching conversations, treat as "at bottom" initially.
  useEffect(() => {
    setIsAtBottom(true);
  }, [customer?.id]);

  // Load message history
  useEffect(() => {
    if (!customer?.id) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    getMessages(customer.id)
      .then((data) => {
        setMessages(Array.isArray(data) ? data : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [customer?.id]);

  // Reset unread count when opening chat
  useEffect(() => {
    if (!customer?.id) return;

    fetch(`${API}/mark-read`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer_id: customer.id,
      }),
    }).catch(console.error);

    setCustomers((prev) => {
      const idx = prev.findIndex((c) => c.id === customer.id);
      if (idx < 0) return prev;

      const next = [...prev];
      next[idx] = {
        ...next[idx],
        unread_count: 0,
      };
      return next;
    });
  }, [customer?.id, setCustomers]);

  // Emit "seen" for customer messages when chat is open
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !customer?.id || !messages.length) return;
    messages.forEach((msg) => {
      if (!msg.seen && msg.sender_type !== 'agent') {
        socket.emit('seen', { messageId: msg.id });
      }
    });
  }, [customer?.id, messages]);

  // Realtime messages via socket + delivery/seen status
  useEffect(() => {
    const socket = getSocket();

    const handleIncoming = ({ message }: { message: any }) => {
      if (message?.customer_id !== customer?.id) return;
      setMessages((prev) => reconcileIncoming(prev, message));
      if (message?.sender_type === 'agent') {
        socket?.emit('delivered', { messageId: message.id });
      }
    };

    const unsubNew = onNewMessage(handleIncoming);
    const unsubReply = onAgentReply(handleIncoming);

    const handleMessageDelivered = ({ messageId }: { messageId: string }) => {
      setMessages((prev) => updateMessageStatus(prev, messageId, 'delivered'));
    };
    const handleMessageSeen = ({ messageId }: { messageId: string }) => {
      setMessages((prev) => updateMessageStatus(prev, messageId, 'seen'));
    };

    const handleMessageSent = (serverMessage: any) => {
      if (serverMessage?.customer_id !== customer?.id) return;
      const tempId = serverMessage.tempId;
      if (!tempId) return;
      const msg = stripTempId(serverMessage);
      setMessages((prev) => {
        // If broadcast already inserted the real message, just remove the temp one.
        const hasReal = prev.some((m) => m.id === msg.id);
        if (hasReal) {
          return prev
            .filter((m) => m.id !== tempId)
            .map((m) => (m.id === msg.id ? { ...m, ...msg, status: m.status === 'sending' ? 'sent' : (m.status || 'sent') } : m));
        }

        // Otherwise replace the temp message; if it doesn't exist, append defensively.
        const hasTemp = prev.some((m) => m.id === tempId);
        if (hasTemp) {
          return prev.map((m) => (m.id === tempId ? { ...msg, status: 'sent' } : m));
        }
        return reconcileIncoming(prev, { ...msg, tempId });
      });
    };

    if (socket) {
      socket.on('message_delivered', handleMessageDelivered);
      socket.on('message_seen', handleMessageSeen);
      socket.on('message_sent', handleMessageSent);
    }

    const handleTyping = (payload: { customer_id?: string }) => {
      if (payload?.customer_id === customer?.id) {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        setIsCustomerTyping(true);
        typingTimeoutRef.current = setTimeout(() => setIsCustomerTyping(false), 3000);
      }
    };
    const unsubTyping = onCustomerTyping(handleTyping);

    return () => {
      unsubNew();
      unsubReply();
      unsubTyping();
      socket?.off('message_delivered', handleMessageDelivered);
      socket?.off('message_seen', handleMessageSeen);
      socket?.off('message_sent', handleMessageSent);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [customer?.id]);

  // Keep message reactions in sync
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onReactionUpdated = ({ messageId, reactions }: { messageId: string; reactions: any[] }) => {
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, reactions } : m)));
    };

    socket.on('reaction_updated', onReactionUpdated);
    return () => {
      socket.off('reaction_updated', onReactionUpdated);
    };
  }, []);

  // Agent/customer typing events (used for TypingIndicator UI)
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !customer?.id) return;

    const onTyping = (data: { customerId?: string }) => {
      if (data.customerId === customer.id) setIsTyping(true);
    };
    const onStopTyping = (data: { customerId?: string }) => {
      if (data.customerId === customer.id) setIsTyping(false);
    };

    socket.on('typing', onTyping);
    socket.on('stop_typing', onStopTyping);
    return () => {
      socket.off('typing', onTyping);
      socket.off('stop_typing', onStopTyping);
    };
  }, [customer?.id]);

  // Smart auto-scroll (only when user is at bottom)
  useEffect(() => {
    if (!isAtBottom) return;
    endRef.current?.scrollIntoView({
      behavior: 'auto',
      block: 'end',
    });
  }, [messages, isAtBottom]);

  const handleSending = (optimisticMessage: any) => {
    setMessages((prev) => {
      if (!optimisticMessage?.id) return prev;
      const exists = prev.some((m) => m.id === optimisticMessage.id);
      if (exists) return prev;
      return [...prev, optimisticMessage];
    });
  };

  const handleSent = (serverMessage?: any, tempId?: string) => {
    if (!customer?.id) return;
    setMessages((prev) => {
      if (serverMessage && tempId) {
        const msg = stripTempId(serverMessage);
        const hasReal = prev.some((m) => m.id === msg.id);
        if (hasReal) {
          return prev.filter((m) => m.id !== tempId);
        }
        const hasTemp = prev.some((m) => m.id === tempId);
        if (hasTemp) {
          return prev.map((m) => (m.id === tempId ? { ...msg, status: 'sent' } : m));
        }
        return reconcileIncoming(prev, { ...msg, tempId });
      }
      if (!serverMessage && tempId) {
        return prev.filter((m) => m.id !== tempId);
      }
      if (serverMessage) {
        const idx = prev.findIndex((m) => m.status === 'sending');
        if (idx === -1) return [...prev, { ...serverMessage, status: 'sent' }];
        const next = [...prev];
        next[idx] = { ...serverMessage, status: 'sent' };
        return next;
      }
      return prev;
    });
    if (serverMessage) {
      setCustomers((prev) => {
        const idx = prev.findIndex((c) => c.id === customer.id);
        if (idx < 0) return prev;

        const next = [...prev];
        next[idx] = {
          ...next[idx],
          last_message_at: new Date().toISOString(),
          unread_count: 0,
        };

        next.sort(
          (a, b) =>
            new Date(b.last_message_at || 0).getTime() -
            new Date(a.last_message_at || 0).getTime(),
        );

        return next;
      });
    }
  };

  if (!customer) {
    return (
      <div className="flex h-full w-full min-w-0 items-center justify-center bg-gray-50 text-sm text-gray-500">
        Select a conversation to start chatting
      </div>
    );
  }

  return (
    <div className="flex h-full w-full min-w-0 flex-col">
      <ChatHeader customer={customer} currentCustomerId={customer.id} />

      {/* Messages */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto min-h-0 min-w-0 bg-gray-50 px-4 py-4 relative flex flex-col gap-3 pb-4"
      >
        {loading ? (
          <div className="text-xs text-gray-400">Loading…</div>
        ) : (
          <ChatMessages messages={messages} endRef={endRef} />
        )}

        {(isTyping || isCustomerTyping) && <TypingIndicator />}

        {!isAtBottom && (
          <button
            className="absolute bottom-20 right-4 bg-blue-500 text-white px-3 py-1 rounded"
            onClick={() => {
              endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
              setIsAtBottom(true);
            }}
            type="button"
          >
            ↓ New messages
          </button>
        )}
      </div>

      {/* Input */}
      <ChatInput customerId={customer.id} onSending={handleSending} onSent={handleSent} />
    </div>
  );
}


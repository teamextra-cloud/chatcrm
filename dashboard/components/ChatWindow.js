'use client';

import { useState, useEffect, useRef } from 'react';
import { getMessages } from '../lib/api';
import { onNewMessage, onAgentReply } from '../lib/socket';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function ChatWindow({ customer, customers, setCustomers }) {

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const chatRef = useRef(null);


  /**
   * ===============================
   * LOAD MESSAGE HISTORY
   * ===============================
   */

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


  /**
   * ===============================
   * 🔴 RESET UNREAD COUNT
   * WHEN AGENT OPENS CHAT
   * ===============================
   */

  useEffect(() => {

    if (!customer?.id) return;

    // call backend to reset unread_count

    fetch(`${API}/mark-read`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        customer_id: customer.id
      })
    }).catch(console.error);


    /**
     * ALSO UPDATE SIDEBAR STATE
     * so unread badge disappears instantly
     */

    setCustomers((prev) => {

      const idx = prev.findIndex(c => c.id === customer.id);

      if (idx < 0) return prev;

      const next = [...prev];

      next[idx] = {
        ...next[idx],
        unread_count: 0
      };

      return next;

    });

  }, [customer?.id]);


  /**
   * ===============================
   * REALTIME MESSAGE (SOCKET)
   * ===============================
   */

  useEffect(() => {

    const onNew = ({ message }) => {

      if (message?.customer_id === customer?.id) {

        setMessages((prev) => [...prev, message]);

      }

    };

    const onReply = ({ message }) => {

      if (message?.customer_id === customer?.id) {

        setMessages((prev) => [...prev, message]);

      }

    };

    const unsubNew = onNewMessage(onNew);
    const unsubReply = onAgentReply(onReply);

    return () => {
      unsubNew();
      unsubReply();
    };

  }, [customer?.id]);


  /**
   * ===============================
   * AUTO SCROLL CHAT
   * ===============================
   */

  useEffect(() => {

    if (!chatRef.current) return;

    chatRef.current.scrollTop =
      chatRef.current.scrollHeight;

  }, [messages]);


  /**
   * ===============================
   * AFTER AGENT SEND MESSAGE
   * UPDATE SIDEBAR CUSTOMER LIST
   * ===============================
   */

  const handleSent = () => {

    setCustomers((prev) => {

      const idx = prev.findIndex((c) => c.id === customer.id);

      if (idx < 0) return prev;

      const next = [...prev];

      next[idx] = {
        ...next[idx],
        last_message_at: new Date().toISOString(),
        unread_count: 0
      };

      /**
       * Sort latest chat to top
       */

      next.sort((a, b) =>
        new Date(b.last_message_at || 0) -
        new Date(a.last_message_at || 0)
      );

      return next;

    });

  };


  /**
   * ===============================
   * NO CUSTOMER SELECTED
   * ===============================
   */

  if (!customer) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[#F8FAFC] text-sm text-gray-500">
        Select a conversation to start chatting
      </div>
    );
  }


  /**
   * ===============================
   * CHAT UI
   * ===============================
   */

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* HEADER */}
      <div className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b border-gray-200 bg-white/95 px-4 backdrop-blur">
        {/* AVATAR */}
        <div className="h-10 w-10 overflow-hidden rounded-full bg-gray-100">
          {customer.avatar ? (
            <img
              src={customer.avatar}
              alt={customer.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full items-center justify-center text-sm font-medium text-gray-700">
              {customer.name?.charAt(0)?.toUpperCase()}
            </span>
          )}
        </div>

        {/* NAME + PLATFORM */}
        <div className="flex flex-1 items-center justify-between">
          <div className="flex flex-col leading-tight">
            <div className="flex items-center gap-2">
              <div className="text-sm font-semibold text-gray-900">
                {customer.name || customer.platform_id}
              </div>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-600">
                Online
              </span>
            </div>
            <div className="text-xs text-gray-500 capitalize">
              {customer.platform}
            </div>
          </div>
        </div>
      </div>

      {/* MESSAGE LIST */}
      <div
        ref={chatRef}
        className="flex-1 overflow-y-auto bg-[#F8FAFC] px-4 py-4"
      >
        {loading ? (
          <div className="text-xs text-gray-400">Loading…</div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isAgent={msg.sender_type === 'agent'}
            />
          ))
        )}
      </div>

      {/* INPUT */}
      <MessageInput customerId={customer.id} onSent={handleSent} />
    </div>
  );
}
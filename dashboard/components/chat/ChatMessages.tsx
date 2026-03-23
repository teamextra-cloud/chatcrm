'use client';

import { RefObject } from 'react';
import { ChatMessage } from './ChatMessage';

type ChatMessagesProps = {
  messages: any[];
  endRef: RefObject<HTMLDivElement | null>;
};

export function ChatMessages({ messages, endRef }: ChatMessagesProps) {
  return (
    <>
      {messages.map((msg) => (
        <ChatMessage key={msg.id} message={msg} />
      ))}
      <div ref={endRef} />
    </>
  );
}


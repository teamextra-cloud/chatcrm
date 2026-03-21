'use client';

import MessageBubble from '../MessageBubble';

type ChatMessageProps = {
  message: any;
};

export function ChatMessage({ message }: ChatMessageProps) {
  const isAgent = message?.sender_type === 'agent';

  return (
    <MessageBubble
      message={message}
      isAgent={isAgent}
    />
  );
}


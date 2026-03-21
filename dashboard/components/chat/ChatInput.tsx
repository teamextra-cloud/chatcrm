'use client';

import MessageInput from '../MessageInput';

type ChatInputProps = {
  customerId: string;
  onSending?: (optimisticMessage: any) => void;
  onSent?: (serverMessage?: any, tempId?: string) => void;
};

export function ChatInput({ customerId, onSending, onSent }: ChatInputProps) {
  return (
    <div className="border-t border-gray-200 bg-white px-4 py-3">
      <MessageInput customerId={customerId} onSending={onSending} onSent={onSent} />
    </div>
  );
}


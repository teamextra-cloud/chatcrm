'use client';

export default function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 px-2 py-1 text-sm text-gray-500">
      <div className="flex gap-1">
        <span className="animate-bounce">•</span>
        <span className="animate-bounce [animation-delay:150ms]">•</span>
        <span className="animate-bounce [animation-delay:300ms]">•</span>
      </div>
      Typing...
    </div>
  );
}

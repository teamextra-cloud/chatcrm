'use client';

import React from 'react';
import { getPlatformMeta, normalizePlatform, type PlatformKey } from '../../lib/platform';

type Size = 'sm' | 'md';

function sizeClasses(size: Size) {
  switch (size) {
    case 'md':
      return { wrap: 'h-5 w-5', icon: 'h-3 w-3' };
    case 'sm':
    default:
      return { wrap: 'h-4 w-4', icon: 'h-2.5 w-2.5' };
  }
}

function Icon({ platform }: { platform: PlatformKey }) {
  // Simple, minimal glyphs (not official brand marks).
  // Goal: fast recognition in a small circle.
  switch (platform) {
    case 'whatsapp':
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-full w-full" aria-hidden="true">
          <path
            d="M20 11.7c0 4.6-3.9 8.3-8.7 8.3-1.4 0-2.7-.3-3.9-.9L4 20l1-3.2c-.7-1.2-1.1-2.6-1.1-4.1C3.9 7.1 7.8 3.4 12.6 3.4S20 7.1 20 11.7Z"
            fill="currentColor"
            opacity="0.92"
          />
          <path
            d="M10.2 8.6c-.2-.4-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.4-.2.3-.9.9-.9 2.2s.9 2.6 1 2.8c.1.2 1.7 2.7 4.2 3.7 2 .8 2.5.6 3 .6.4-.1 1.3-.6 1.5-1.1.2-.5.2-1 .1-1.1-.1-.1-.2-.2-.5-.3l-1.7-.8c-.2-.1-.4-.1-.6.1l-.7.9c-.1.2-.3.2-.5.1-.2-.1-1-.4-1.9-1.3-.7-.7-1.2-1.6-1.3-1.8-.1-.2 0-.4.1-.5l.5-.6c.1-.1.1-.3.2-.4.1-.1 0-.3 0-.4l-.7-1.8Z"
            fill="#fff"
          />
        </svg>
      );
    case 'facebook':
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-full w-full" aria-hidden="true">
          <path
            d="M12 4c4.8 0 8.7 3.4 8.7 7.6 0 4.2-3.9 7.6-8.7 7.6-.7 0-1.4-.1-2.1-.2L6.3 20l.9-2.6C5.2 16 3.3 13.9 3.3 11.6 3.3 7.4 7.2 4 12 4Z"
            fill="currentColor"
            opacity="0.92"
          />
          <path
            d="M9 14.8l3.1-3.2L9.5 9.4c-.3-.2-.3-.6 0-.9.2-.2.6-.3.9-.1l2.6 2 2.4-2.4c.2-.2.6-.2.9 0 .2.2.2.6 0 .9l-2.4 2.4 2.4 1.8c.3.2.3.6.1.9-.2.3-.6.3-.9.1l-2.6-2-3 3.1c-.2.2-.6.2-.9 0-.2-.2-.2-.6 0-.8Z"
            fill="#fff"
          />
        </svg>
      );
    case 'line':
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-full w-full" aria-hidden="true">
          <path
            d="M12 4c5 0 9 3.3 9 7.5S17 19 12 19c-.8 0-1.6-.1-2.3-.3L6 20l.9-2.6C5 16.2 3 14 3 11.5 3 7.3 7 4 12 4Z"
            fill="currentColor"
            opacity="0.92"
          />
          <path
            d="M8.3 13.9V9.3h1.2v3.5h2.3v1.1H8.3Zm4.1 0V9.3h1.2v4.6h-1.2Zm2.5 0V9.3h3.2v1H16v.8h2v1h-2v1.7h-1.1Z"
            fill="#fff"
          />
        </svg>
      );
    default:
      return null;
  }
}

export function PlatformIndicator({
  platform,
  size = 'sm',
  showText = false,
  className = '',
}: {
  platform?: string | null;
  size?: Size;
  showText?: boolean;
  className?: string;
}) {
  const key = normalizePlatform(platform);
  const meta = getPlatformMeta(platform);
  const s = sizeClasses(size);

  if (!key || !meta) {
    return showText ? (
      <span className={['inline-flex items-center gap-2 text-xs text-gray-500', className].join(' ')}>
        <span className="h-4 w-4 rounded-full bg-gray-200" aria-hidden="true" />
        <span>Unknown</span>
      </span>
    ) : (
      <span
        className={[s.wrap, 'inline-flex items-center justify-center rounded-full bg-gray-200', className].join(' ')}
        aria-label="Unknown platform"
        title="Unknown"
      />
    );
  }

  return (
    <span className={['inline-flex items-center gap-2', className].join(' ')}>
      <span
        className={[
          s.wrap,
          'inline-flex items-center justify-center rounded-full ring-1 ring-black/5',
        ].join(' ')}
        style={{ backgroundColor: meta.color, color: '#fff' }}
        aria-label={meta.name}
        title={meta.name}
      >
        <span className={s.icon}>
          <Icon platform={key} />
        </span>
      </span>
      {showText && <span className="text-xs font-medium text-gray-700">{meta.name}</span>}
    </span>
  );
}


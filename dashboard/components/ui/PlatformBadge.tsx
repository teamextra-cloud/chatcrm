'use client';

import React from 'react';

export type PlatformBadgePlatform = 'whatsapp' | 'messenger' | 'line';

const META: Record<PlatformBadgePlatform, { label: string; color: string }> = {
  whatsapp: { label: 'WhatsApp', color: '#25D366' },
  messenger: { label: 'Messenger', color: '#0084FF' },
  line: { label: 'LINE', color: '#00C300' },
};

export function PlatformBadge({
  platform,
  className = '',
}: {
  platform: PlatformBadgePlatform;
  className?: string;
}) {
  const meta = META[platform];
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-[10px] py-1 text-xs font-semibold text-white',
        className,
      ].join(' ')}
      style={{ backgroundColor: meta.color }}
      aria-label={meta.label}
      title={meta.label}
    >
      {meta.label}
    </span>
  );
}


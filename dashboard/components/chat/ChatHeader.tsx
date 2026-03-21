'use client';

import { useEffect, useState } from 'react';
import { getSocket } from '../../lib/socket';
import { normalizePlatform } from '../../lib/platform';
import { PlatformBadge } from '../ui/PlatformBadge';

type ChatHeaderProps = {
  customer: any;
  currentCustomerId: string | null;
};

export function ChatHeader({ customer, currentCustomerId }: ChatHeaderProps) {
  const [isOnline, setIsOnline] = useState(false);
  const platformKey = normalizePlatform(customer?.platform);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || currentCustomerId == null) return;

    const onUserOnline = ({ userId }: { userId: string }) => {
      if (userId === currentCustomerId) setIsOnline(true);
    };
    const onUserOffline = ({ userId }: { userId: string }) => {
      if (userId === currentCustomerId) setIsOnline(false);
    };

    socket.on('user_online', onUserOnline);
    socket.on('user_offline', onUserOffline);

    return () => {
      socket.off('user_online', onUserOnline);
      socket.off('user_offline', onUserOffline);
    };
  }, [currentCustomerId]);

  return (
    <div className="flex h-16 items-center gap-3 border-b border-gray-200 bg-white/95 px-4 backdrop-blur-sm">
      <div className="h-10 w-10 overflow-hidden rounded-full bg-gray-100">
        {customer.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={customer.avatar}
            alt={customer.name || customer.platform_id}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full items-center justify-center text-sm font-medium text-gray-700">
            {(customer.name || customer.platform_id || '?')
              .toString()
              .slice(0, 1)
              .toUpperCase()}
          </span>
        )}
      </div>

      <div className="flex flex-1 items-center justify-between">
        <div className="flex flex-col leading-tight">
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold text-gray-900">
              {customer.name || customer.platform_id}
            </div>
            {platformKey && <PlatformBadge platform={platformKey} />}
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                isOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

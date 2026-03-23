'use client';

import { normalizePlatform } from '../../lib/platform';
import { PlatformBadge } from '../ui/PlatformBadge';

type Customer = {
  id: string;
  name?: string;
  platform?: 'line' | 'facebook' | 'whatsapp' | string;
  platform_id?: string;
  avatar?: string | null;
  last_message?: string | null;
  last_message_at?: string | null;
  unread_count?: number;
};

type CustomerItemProps = {
  customer: Customer;
  active?: boolean;
  onSelect: () => void;
};

export function CustomerItem({ customer, active, onSelect }: CustomerItemProps) {
  const hasUnread = (customer.unread_count ?? 0) > 0;
  const platformKey = normalizePlatform(customer.platform);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        'flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors',
        active
          ? 'bg-blue-50 ring-1 ring-blue-100'
          : 'hover:bg-gray-50',
      ].join(' ')}
    >
      {/* Avatar */}
      <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-full bg-gray-100">
        {customer.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={customer.avatar}
            alt={customer.name || customer.platform_id || 'Customer avatar'}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full items-center justify-center text-xs font-medium text-gray-700">
            {(customer.name || customer.platform_id || '?').toString().slice(0, 1).toUpperCase()}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              {platformKey && <PlatformBadge platform={platformKey} />}
              <span className="truncate text-sm font-semibold text-gray-900">
                {customer.name || customer.platform_id}
              </span>
            </div>
          </div>
          <span className="ml-2 whitespace-nowrap text-[11px] text-gray-400">
            {customer.last_message_at
              ? new Date(customer.last_message_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : ''}
          </span>
        </div>

        <div className="mt-0.5 flex items-center gap-2">
          <p className="truncate text-xs text-gray-500">
            {customer.last_message || 'No messages yet'}
          </p>
          {hasUnread && (
            <span className="ml-auto inline-flex items-center justify-center rounded-full bg-blue-600 px-2 text-[11px] font-semibold text-white">
              {customer.unread_count}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}


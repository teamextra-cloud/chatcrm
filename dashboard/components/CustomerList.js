'use client';

import { useEffect, useState, useMemo } from 'react';
import { onNewMessage, onAgentReply, onCustomerListUpdate } from '../lib/socket';

function getPlatformIcon(platform) {
  if (platform === 'line') return '🟢';
  if (platform === 'facebook') return '🔵';
  return '⚪';
}

export default function CustomerList({ customers, setCustomers, selectedId, onSelect, fetchCustomers }) {

  const [search, setSearch] = useState('');

  /**
   * INITIAL FETCH
   */
  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  /**
   * REALTIME REFRESH
   */
  useEffect(() => {

    const refetch = () => fetchCustomers();

    const unsub1 = onNewMessage(refetch);
    const unsub2 = onAgentReply(refetch);
    const unsub3 = onCustomerListUpdate(refetch);

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };

  }, [fetchCustomers]);


  /**
   * FILTERED CUSTOMERS (client-side search)
   */
  const filtered = useMemo(() => {

    const q = search.trim().toLowerCase();

    if (!q) return customers;

    return customers.filter((c) => {

      const name =
        (c.name || c.platform_id || '').toLowerCase();

      const last =
        (c.last_message || '').toLowerCase();

      return (
        name.includes(q) ||
        last.includes(q)
      );

    });

  }, [customers, search]);


  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      {/* SEARCH INPUT */}
      <div className="border-b border-gray-200 px-3 py-3">
        <input
          type="text"
          placeholder="Search conversations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {filtered.length === 0 && (
        <div className="px-4 py-4 text-xs text-gray-500">
          {customers.length === 0
            ? 'No conversations yet. Messages from LINE or Facebook will appear here.'
            : 'No conversations match your search.'}
        </div>
      )}

      <div className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {filtered.map((c) => {
          const isActive = selectedId === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(c)}
              className={[
                'flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition',
                'hover:bg-gray-50',
                isActive
                  ? 'bg-blue-50 ring-1 ring-blue-100'
                  : 'bg-white',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {/* AVATAR */}
              <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-gray-100">
                {c.avatar ? (
                  <img
                    src={c.avatar}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full items-center justify-center text-sm font-medium text-gray-700">
                    {c.name?.slice(0, 1) || '?'}
                  </span>
                )}
              </div>

              {/* CUSTOMER TEXT */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className="text-xs">
                      {getPlatformIcon(c.platform)}
                    </span>
                    <span className="truncate text-sm font-semibold text-gray-900">
                      {c.name || c.platform_id}
                    </span>
                  </div>
                  <div className="ml-2 whitespace-nowrap text-xs text-gray-400">
                    {c.last_message_at
                      ? new Date(c.last_message_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : ''}
                  </div>
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  <p className="truncate text-xs text-gray-500">
                    {c.last_message || 'No messages'}
                  </p>
                  {c.unread_count > 0 && (
                    <span className="ml-auto inline-flex items-center rounded-full bg-red-500 px-2 text-[11px] font-semibold text-white">
                      {c.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
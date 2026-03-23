'use client';

import { useEffect, useMemo, useState } from 'react';
import { onNewMessage, onAgentReply, onCustomerListUpdate } from '../../lib/socket';
import { CustomerItem } from './CustomerItem';

type Customer = any;

type CustomerListProps = {
  customers: Customer[];
  setCustomers: (updater: (prev: Customer[]) => Customer[]) => void;
  selectedId?: string;
  onSelect: (customer: Customer) => void;
  fetchCustomers: () => Promise<void>;
};

export default function CustomerList({
  customers,
  setCustomers,
  selectedId,
  onSelect,
  fetchCustomers,
}: CustomerListProps) {
  const [search, setSearch] = useState('');

  // Initial fetch
  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Realtime refresh
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;

    return customers.filter((c) => {
      const name = (c.name || c.platform_id || '').toLowerCase();
      const last = (c.last_message || '').toLowerCase();
      return name.includes(q) || last.includes(q);
    });
  }, [customers, search]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      {/* Header */}
      <header className="flex h-14 items-center justify-between border-b border-gray-200 px-4">
        <div className="flex flex-col">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            Inbox
          </span>
          <span className="text-sm font-semibold text-gray-900">
            Conversations
          </span>
        </div>
      </header>

      {/* Search */}
      <div className="border-b border-gray-100 px-3 py-2.5">
        <input
          type="text"
          placeholder="Search customers or messages…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {filtered.length === 0 && (
        <div className="px-4 py-4 text-xs text-gray-500">
          {customers.length === 0
            ? 'No conversations yet. New messages will appear here.'
            : 'No conversations match your search.'}
        </div>
      )}

      {/* List */}
      <div className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {filtered.map((c) => (
          <CustomerItem
            key={c.id}
            customer={c}
            active={selectedId === c.id}
            onSelect={() => onSelect(c)}
          />
        ))}
      </div>
    </div>
  );
}


'use client';

import { useEffect, useMemo, useState } from 'react';

function getPlatformIcon(platform) {
  if (platform === 'line') return '🟢';
  if (platform === 'facebook') return '🔵';
  return '⚪';
}

const STATUS_OPTIONS = ['Lead', 'Customer', 'VIP', 'Blocked'];

function statusBadgeClasses(status) {
  switch (status) {
    case 'VIP':
      return 'bg-yellow-500/10 text-yellow-400 ring-1 ring-yellow-500/40';
    case 'Customer':
      return 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/40';
    case 'Blocked':
      return 'bg-red-500/10 text-red-400 ring-1 ring-red-500/40';
    case 'Lead':
    default:
      return 'bg-sky-500/10 text-sky-400 ring-1 ring-sky-500/40';
  }
}

export default function CustomerProfilePanel({ customer }) {
  const [status, setStatus] = useState('Lead');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [orders, setOrders] = useState([]);
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    if (!customer) {
      setStatus('Lead');
      setNotes('');
      setTags([]);
      setOrders([]);
      return;
    }

    setStatus(customer.status || 'Lead');
    setNotes(customer.notes || '');

    if (Array.isArray(customer.tags)) {
      setTags(customer.tags);
    } else {
      setTags([]);
    }

    const rawOrders =
      customer.orders ||
      customer.order_history ||
      customer.orderHistory ||
      [];

    if (Array.isArray(rawOrders)) {
      setOrders(rawOrders);
    } else {
      setOrders([]);
    }
  }, [customer]);

  const phoneDisplay = useMemo(() => {
    if (!customer?.phone && !customer?.phone_number) {
      return 'Not provided';
    }
    return customer.phone || customer.phone_number;
  }, [customer]);

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (!trimmed) return;
    if (tags.includes(trimmed)) {
      setTagInput('');
      return;
    }
    setTags((prev) => [...prev, trimmed]);
    setTagInput('');
  };

  const handleRemoveTag = (tag) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleNotesSave = () => {
    // Placeholder for future API integration.
    setSavingNotes(true);
    setTimeout(() => {
      setSavingNotes(false);
    }, 400);
  };

  if (!customer) {
    return (
      <aside
        className="hidden h-screen max-w-xs flex-col border-l border-gray-200 bg-white text-gray-900 lg:flex"
        style={{ width: 320 }}
      >
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold tracking-wide text-gray-900">
            Customer profile
          </h2>
        </div>
        <div className="flex flex-1 items-center justify-center px-6 text-center text-xs text-gray-500">
          Select a customer to view their profile
        </div>
      </aside>
    );
  }

  return (
    <aside
      className="hidden h-screen max-w-xs flex-col border-l border-gray-200 bg-white text-gray-900 lg:flex"
      style={{ width: 320 }}
    >
      <div className="border-b border-gray-200 px-4 py-3">
        <h2 className="text-sm font-semibold tracking-wide text-gray-900">
          Customer profile
        </h2>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto bg-gray-50 px-4 py-4 text-sm">
        {/* BASIC INFO */}
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <header className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Basic info
            </h3>
          </header>
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-gray-100 text-base font-semibold">
              {customer.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={customer.avatar}
                  alt={customer.name || customer.platform_id}
                  className="h-full w-full object-cover rounded-full"
                />
              ) : (
                (customer.name || customer.platform_id || '?')
                  .toString()
                  .slice(0, 1)
                  .toUpperCase()
              )}
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-gray-900">
                  {customer.name || customer.platform_id || 'Unknown customer'}
                </p>
                <span className="text-lg leading-none">
                  {getPlatformIcon(customer.platform)}
                </span>
              </div>
              <p className="break-all text-xs text-gray-500">
                Platform ID:{' '}
                <span className="text-gray-900">
                  {customer.platform_id || 'Not provided'}
                </span>
              </p>
              <p className="text-xs text-gray-500">
                Phone:{' '}
                <span className="text-gray-900">{phoneDisplay}</span>
              </p>
            </div>
          </div>
        </section>

        {/* STATUS */}
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <header className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Status
            </h3>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${statusBadgeClasses(
                status
              )}`}
            >
              {status}
            </span>
          </header>
          <div className="flex items-center gap-2">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* ORDER HISTORY */}
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <header className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Order history
            </h3>
          </header>
          {orders.length === 0 ? (
            <p className="text-xs text-gray-500">No orders yet</p>
          ) : (
            <ul className="space-y-2 text-xs">
              {orders.map((order) => (
                <li
                  key={order.id || order.order_id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium text-gray-900">
                      {order.id || order.order_id}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      {order.date
                        ? new Date(order.date).toLocaleDateString()
                        : 'Unknown date'}
                    </p>
                  </div>
                  <div className="ml-3 text-right">
                    <p className="text-xs font-semibold text-gray-900">
                      {order.amount != null
                        ? typeof order.amount === 'number'
                          ? `฿${order.amount.toFixed(2)}`
                          : order.amount
                        : '—'}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* NOTES */}
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <header className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Notes
            </h3>
          </header>
          <div className="space-y-2">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full resize-none rounded-md border border-gray-200 bg-gray-50 px-2.5 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add internal notes about this customer..."
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleNotesSave}
                className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={savingNotes}
              >
                {savingNotes ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </section>

        {/* TAGS */}
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <header className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Tags
            </h3>
          </header>
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {tags.length === 0 && (
                <p className="text-xs text-gray-500">
                  No tags yet. Add one below.
                </p>
              )}
              {tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="group inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] text-gray-700 hover:border-red-300 hover:text-red-500"
                >
                  <span>{tag}</span>
                  <span className="text-[13px] leading-none group-hover:text-red-500">
                    ×
                  </span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Add tag and press Enter"
                className="flex-1 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-1.5 text-[11px] font-medium text-gray-700 transition-colors hover:bg-gray-200"
              >
                Add
              </button>
            </div>
          </div>
        </section>
      </div>
    </aside>
  );
}


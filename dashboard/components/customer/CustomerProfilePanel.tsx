'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getSocket } from '../../lib/socket';
import { normalizePlatform } from '../../lib/platform';
import { PlatformBadge } from '../ui/PlatformBadge';

const STATUS_OPTIONS = ['Lead', 'Customer', 'VIP', 'Blocked'] as const;

function statusBadgeClasses(status: string) {
  switch (status) {
    case 'VIP':
      return 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200';
    case 'Customer':
      return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
    case 'Blocked':
      return 'bg-red-50 text-red-700 ring-1 ring-red-200';
    case 'Lead':
    default:
      return 'bg-sky-50 text-sky-700 ring-1 ring-sky-200';
  }
}

type CustomerProfilePanelProps = {
  customer: any | null;
};

function createDebounce<T extends (...args: any[]) => void>(fn: T, waitMs: number) {
  let t: ReturnType<typeof setTimeout> | null = null;
  const debounced = ((...args: Parameters<T>) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), waitMs);
  }) as T & { cancel: () => void };
  debounced.cancel = () => {
    if (t) clearTimeout(t);
    t = null;
  };
  return debounced;
}

export default function CustomerProfilePanel({ customer }: CustomerProfilePanelProps) {
  const [customerState, setCustomer] = useState<any | null>(customer);
  const [tagInput, setTagInput] = useState('');
  const customerId = customerState?.id as string | undefined;
  const platformKey = normalizePlatform(customerState?.platform);

  const latestCustomerIdRef = useRef<string | undefined>(customerId);
  useEffect(() => {
    latestCustomerIdRef.current = customerId;
  }, [customerId]);

  useEffect(() => {
    setCustomer(customer);
  }, [customer]);

  // Realtime sync across clients
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !customerId) return;

    const onCustomerUpdated = (data: any) => {
      if (!data || data.customerId !== latestCustomerIdRef.current) return;
      setCustomer((prev: any | null) => {
        if (!prev || prev.id !== data.customerId) return prev;
        return {
          ...prev,
          ...(typeof data.status === 'string' ? { status: data.status } : null),
          ...(typeof data.notes === 'string' ? { notes: data.notes } : null),
          ...(Array.isArray(data.tags) ? { tags: data.tags } : null),
        };
      });
    };

    socket.on('customer_updated', onCustomerUpdated);
    return () => {
      socket.off('customer_updated', onCustomerUpdated);
    };
  }, [customerId]);

  const phoneDisplay = useMemo(() => {
    if (!customerState?.phone && !customerState?.phone_number) {
      return 'Not provided';
    }
    return customerState.phone || customerState.phone_number;
  }, [customerState]);

  const updateStatus = async (value: string) => {
    if (!customerId) return;

    // Optimistic UI update: reflect immediately, do not wait for API
    setCustomer((prev: any) => (prev ? { ...prev, status: value } : prev));

    fetch('/api/customer/status', {
      method: 'POST',
      body: JSON.stringify({
        customerId,
        status: value,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    }).catch(console.error);

    const socket = getSocket();
    socket?.emit('customer_updated', {
      customerId,
      status: value,
    });
  };

  const persistTags = (newTags: string[]) => {
    if (!customerId) return;

    // Optimistic UI update: reflect immediately, do not wait for API
    setCustomer((prev: any) => (prev ? { ...prev, tags: newTags } : prev));

    fetch('/api/customer/tags', {
      method: 'POST',
      body: JSON.stringify({
        customerId,
        tags: newTags,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    }).catch(console.error);

    const socket = getSocket();
    socket?.emit('customer_updated', {
      customerId,
      tags: newTags,
    });
  };

  const persistNotes = (value: string) => {
    if (!customerId) return;

    fetch('/api/customer/notes', {
      method: 'POST',
      body: JSON.stringify({
        customerId,
        notes: value,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    }).catch(console.error);

    const socket = getSocket();
    socket?.emit('customer_updated', {
      customerId,
      notes: value,
    });
  };

  const debouncedSaveNotesRef = useRef<(((v: string) => void) & { cancel?: () => void }) | null>(null);
  useEffect(() => {
    debouncedSaveNotesRef.current = createDebounce(persistNotes, 500);
    return () => {
      debouncedSaveNotesRef.current?.cancel?.();
    };
  }, [customerId]);

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    const existingTags = Array.isArray(customerState?.tags) ? customerState.tags : [];
    if (!trimmed || existingTags.includes(trimmed)) {
      setTagInput('');
      return;
    }
    const newTags = [...existingTags, trimmed];
    persistTags(newTags);
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    const existingTags = Array.isArray(customerState?.tags) ? customerState.tags : [];
    const newTags = existingTags.filter((t: string) => t !== tag);
    persistTags(newTags);
  };

  if (!customerState) {
    return (
      <aside className="flex h-full flex-col border-l border-gray-200 bg-white">
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
    <aside className="flex h-full flex-col border-l border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-4 py-3">
        <h2 className="text-sm font-semibold tracking-wide text-gray-900">
          Customer profile
        </h2>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto bg-gray-50 px-4 py-4 text-sm">
        {/* Basic info */}
        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <header className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Basic info
            </h3>
          </header>
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-gray-100 text-base font-semibold">
              {customerState.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={customerState.avatar}
                  alt={customerState.name || customerState.platform_id}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                (customerState.name || customerState.platform_id || '?')
                  .toString()
                  .slice(0, 1)
                  .toUpperCase()
              )}
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-gray-900">
                  {customerState.name || customerState.platform_id || 'Unknown customer'}
                </p>
              </div>
              <p className="break-all text-xs text-gray-500">
                Platform ID:{' '}
                <span className="text-gray-900">
                  {customerState.platform_id || 'Not provided'}
                </span>
              </p>
              <p className="flex items-center gap-2 text-xs text-gray-500">
                <span>Platform:</span>
                {platformKey ? (
                  <PlatformBadge platform={platformKey} />
                ) : (
                  <span className="text-gray-900">Unknown</span>
                )}
              </p>
              <p className="text-xs text-gray-500">
                Phone:{' '}
                <span className="text-gray-900">{phoneDisplay}</span>
              </p>
              <p className="text-xs text-gray-500">
                Email:{' '}
                <span className="text-gray-900">
                  {customerState.email || 'Not provided'}
                </span>
              </p>
            </div>
          </div>
        </section>

        {/* Status */}
        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <header className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Status
            </h3>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${statusBadgeClasses(
                customerState.status || 'Lead',
              )}`}
            >
              {customerState.status || 'Lead'}
            </span>
          </header>
          <select
            value={customerState.status || 'Lead'}
            onChange={(e) => updateStatus(e.target.value)}
            className="w-full rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </section>

        {/* Tags */}
        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <header className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Tags
            </h3>
          </header>
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {(Array.isArray(customerState.tags) ? customerState.tags : []).length === 0 && (
                <p className="text-xs text-gray-500">
                  No tags yet. Add one below.
                </p>
              )}
              {(Array.isArray(customerState.tags) ? customerState.tags : []).map((tag: string) => (
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

        {/* Notes */}
        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <header className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Notes
            </h3>
          </header>
          <textarea
            value={customerState.notes || ''}
            onChange={(e) => {
              const value = e.target.value;
              // Optimistic UI update: reflect immediately, do not wait for API
              setCustomer((prev: any) => (prev ? { ...prev, notes: value } : prev));
              debouncedSaveNotesRef.current?.(value);
            }}
            rows={4}
            placeholder="Add internal notes about this customer…"
            className="w-full resize-none rounded-md border border-gray-200 bg-gray-50 px-2.5 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </section>
      </div>
    </aside>
  );
}


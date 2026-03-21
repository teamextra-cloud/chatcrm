export default function Sidebar() {
  const items = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
    { id: 'inbox', label: 'Inbox', icon: '💬', active: true },
    { id: 'contacts', label: 'Contacts', icon: '👥' },
    { id: 'analytics', label: 'Analytics', icon: '📊' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <aside className="flex h-screen w-16 flex-col items-center border-r border-gray-200 bg-white py-4">
      <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-sm">
        C
      </div>
      <nav className="flex flex-1 flex-col items-center gap-4">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={[
              'flex h-10 w-10 items-center justify-center rounded-lg text-xl transition',
              'hover:bg-gray-50',
              item.active
                ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-100'
                : 'text-gray-400',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-label={item.label}
          >
            <span aria-hidden="true">{item.icon}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}


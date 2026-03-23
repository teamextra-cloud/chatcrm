import { useState } from 'react';
import {
  Inbox,
  Users,
  Megaphone,
  BarChart2,
  Settings as SettingsIcon,
} from 'lucide-react';

type SidebarItemId = 'inbox' | 'contacts' | 'broadcast' | 'analytics' | 'settings';

type SidebarItem = {
  id: SidebarItemId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const items: SidebarItem[] = [
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'contacts', label: 'Contacts', icon: Users },
  { id: 'broadcast', label: 'Broadcast', icon: Megaphone },
  { id: 'analytics', label: 'Analytics', icon: BarChart2 },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

export function Sidebar() {
  const [activeId] = useState<SidebarItemId>('inbox');

  return (
    <aside className="flex h-full w-16 flex-col items-center justify-between py-4">
      {/* Logo */}
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-sm">
        C
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col items-center gap-3 pt-6">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activeId;

          return (
            <button
              key={item.id}
              type="button"
              className={[
                'group relative flex h-10 w-10 items-center justify-center rounded-lg text-[18px] transition-colors',
                'hover:bg-gray-50',
                isActive
                  ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-100'
                  : 'text-gray-400',
              ].join(' ')}
              aria-label={item.label}
            >
              <Icon className="h-5 w-5" />
              {/* Tooltip */}
              <span className="pointer-events-none absolute left-[120%] z-20 hidden min-w-[90px] translate-y-0 rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white shadow-sm group-hover:block">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Placeholder bottom area (e.g., user avatar) */}
      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-[11px] font-medium text-gray-500">
        AG
      </div>
    </aside>
  );
}


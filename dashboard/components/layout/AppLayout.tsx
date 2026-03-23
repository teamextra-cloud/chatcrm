import type { ReactNode } from 'react';

type AppLayoutProps = {
  sidebar: ReactNode;
  customerList: ReactNode;
  chatWindow: ReactNode;
  customerProfile: ReactNode;
};

export function AppLayout({
  sidebar,
  customerList,
  chatWindow,
  customerProfile,
}: AppLayoutProps) {
  return (
    <div className="h-screen flex overflow-hidden bg-gray-50 text-gray-900">
      {/* Sidebar */}
      <div className="h-full w-16 overflow-hidden border-r border-gray-200 bg-white">
        {sidebar}
      </div>

      {/* Customer list */}
      <div className="h-full w-80 overflow-hidden border-r border-gray-200 bg-white/80 backdrop-blur-sm">
        {customerList}
      </div>

      {/* Chat window (must be shrinkable for scroll) */}
      <div className="flex h-full flex-1 min-w-0 min-h-0 overflow-hidden bg-gray-50">
        {chatWindow}
      </div>

      {/* Customer profile */}
      <div className="h-full w-[340px] overflow-hidden border-l border-gray-200 bg-white/90 backdrop-blur-sm">
        {customerProfile}
      </div>
    </div>
  );
}


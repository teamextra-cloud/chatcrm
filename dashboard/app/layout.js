import './globals.css';

export const metadata = {
  title: 'ChatCRM - Unified Inbox',
  description: 'LINE & Facebook Messenger in one dashboard',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-screen overflow-hidden">
      <body className="h-screen overflow-hidden bg-[#F8FAFC] text-[#0F172A]">
        {children}
      </body>
    </html>
  );
}

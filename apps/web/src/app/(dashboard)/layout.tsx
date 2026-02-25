'use client';

import { Sidebar } from '@/components/ui/sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50/50">
      <Sidebar />
      <main className="ml-60">
        <div className="px-8 py-6">{children}</div>
      </main>
    </div>
  );
}

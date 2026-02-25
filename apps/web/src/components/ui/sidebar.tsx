'use client';

import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Bot,
  GitBranch,
  Phone,
  Plug,
  Sheet,
  TestTube,
  PhoneCall,
  CreditCard,
  BarChart3,
  Settings,
  BookOpen,
  LogOut,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Agents', href: '/agents', icon: Bot },
  { label: 'Calls', href: '/calls', icon: PhoneCall },
  { label: 'Phone Numbers', href: '/settings', icon: Phone },
  { label: 'Knowledge Base', href: '/settings', icon: BookOpen },
  { label: 'Integrations', href: '/settings', icon: Plug },
  { label: 'Sheets', href: '/settings', icon: Sheet },
  { label: 'Testing', href: '/settings', icon: TestTube },
  { label: 'Payments', href: '/settings', icon: CreditCard },
  { label: 'Analytics', href: '/settings', icon: BarChart3 },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-60 border-r border-gray-200 bg-white flex flex-col">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-navy-900 flex items-center justify-center">
            <Phone className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-semibold text-gray-900 tracking-tight">VoiceFlow</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href) && item.href !== '/settings';

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150',
                isActive
                  ? 'bg-navy-50 text-navy-900'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50',
              )}
            >
              <item.icon className={cn('w-4 h-4', isActive ? 'text-navy-700' : 'text-gray-400')} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-gray-100">
        <button className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 w-full transition-colors">
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}

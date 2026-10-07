'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ListChecks, FileText, BarChart3, User, Compass } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: '看板', icon: LayoutDashboard },
  { href: '/applications', label: '投递记录', icon: ListChecks },
  { href: '/resumes', label: '简历', icon: FileText },
  { href: '/insights', label: '数据洞察', icon: BarChart3 },
  { href: '/profile', label: '我的', icon: User },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-60 flex-col border-r border-gray-200 bg-white">
      <div className="flex items-center gap-2 px-5 h-16 border-b border-gray-100">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
          <Compass className="w-5 h-5 text-white" />
        </div>
        <span className="font-semibold text-gray-800 text-lg">求职罗盘</span>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-gray-100">
        <div className="text-xs text-gray-400">V1.0 · MVP</div>
      </div>
    </aside>
  );
}

// 移动端底部导航
export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-40">
      {navItems.map((item) => {
        const isActive =
          item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex-1 flex flex-col items-center justify-center py-2.5 text-xs',
              isActive ? 'text-blue-600' : 'text-gray-500'
            )}
          >
            <Icon className="w-5 h-5 mb-0.5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

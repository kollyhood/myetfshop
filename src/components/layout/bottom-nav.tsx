'use client';

import { Home, Zap, Wallet, GraduationCap, Settings } from 'lucide-react';
import { useAppStore, type TabKey } from '@/lib/store';
import { cn } from '@/lib/utils';

interface NavItem {
  key: TabKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Home', icon: Home },
  { key: 'today', label: 'Today', icon: Zap },
  { key: 'portfolio', label: 'Portfolio', icon: Wallet },
  { key: 'learn', label: 'Learn', icon: GraduationCap },
  { key: 'settings', label: 'More', icon: Settings },
];

export function BottomNav() {
  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);

  return (
    <nav
      className="sticky bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur-md safe-bottom"
      aria-label="Main navigation"
    >
      <div className="grid grid-cols-5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 py-2.5 px-1 transition-colors',
                'min-h-[56px] focus:outline-none focus-visible:bg-accent',
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5', active && 'stroke-[2.5]')} />
              <span className={cn('text-[10px] font-medium', active && 'font-semibold')}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

'use client';

import { useEffect } from 'react';
import { ModeIndicator } from '@/components/layout/mode-indicator';
import { BottomNav } from '@/components/layout/bottom-nav';
import { useAppStore } from '@/lib/store';
import { Sparkles } from 'lucide-react';

export function AppShell({ children }: { children: React.ReactNode }) {
  const ensurePriceHistory = useAppStore((s) => s.ensurePriceHistory);
  const instances = useAppStore((s) => s.instances);
  const activeInstanceId = useAppStore((s) => s.activeInstanceId);
  const setActiveInstance = useAppStore((s) => s.setActiveInstance);

  // Initialize price history on first load (mock Shoonya backfill)
  useEffect(() => {
    ensurePriceHistory();
  }, [ensurePriceHistory]);

  // Auto-select first instance if none active
  useEffect(() => {
    if (!activeInstanceId && instances.length > 0) {
      setActiveInstance(instances[0].id);
    }
  }, [activeInstanceId, instances, setActiveInstance]);

  return (
    <div className="app-shell flex flex-col">
      {/* Sticky top bar with persistent mode indicator (§3.5) */}
      <header
        className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-md safe-top"
      >
        <div className="flex items-center justify-between px-3 py-2.5">
          <ModeIndicator />
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-bold tracking-tight">My ETF Shop</span>
          </div>
        </div>
      </header>

      {/* Main content area — scrolls under both bars */}
      <main className="flex-1 overflow-y-auto pb-4">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}

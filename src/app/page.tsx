'use client';

import { AppShell } from '@/components/layout/app-shell';
import { Dashboard } from '@/components/dashboard/dashboard';
import { TodaySignal } from '@/components/dashboard/today-signal';
import { Portfolio } from '@/components/portfolio/portfolio';
import { Learn } from '@/components/learn/learn';
import { Settings } from '@/components/settings/settings';
import { useAppStore } from '@/lib/store';

export default function Home() {
  const activeTab = useAppStore((s) => s.activeTab);
  const instances = useAppStore((s) => s.instances);
  const activeInstanceId = useAppStore((s) => s.activeInstanceId);

  // First-run: no instances yet → show setup flow regardless of tab
  const showSetup = instances.length === 0 || !activeInstanceId;

  return (
    <AppShell>
      {showSetup ? (
        <StrategyFirstRun />
      ) : (
        <>
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'today' && <TodaySignal />}
          {activeTab === 'portfolio' && <Portfolio />}
          {activeTab === 'learn' && <Learn />}
          {activeTab === 'settings' && <Settings />}
        </>
      )}
    </AppShell>
  );
}

function StrategyFirstRun() {
  // Show a brief welcome screen before the setup form
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  return (
    <div className="p-4 space-y-6">
      <div className="text-center pt-8">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 mb-4">
          <span className="text-3xl">📈</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">My ETF Shop</h1>
        <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
          Rules-driven RSI ETF accumulation. Paper-first by default — you graduate to live only
          when you decide you&apos;re ready.
        </p>
      </div>

      <Dashboard />
    </div>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  BookOpen,
  Inbox,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { useTickets } from '@/context/TicketsContext';

const NAV_ITEMS = [
  { href: '/', label: 'Triage Workbench', icon: Inbox },
  { href: '/known-issues', label: 'Known Issues & Playbooks', icon: BookOpen },
  { href: '/scorecard', label: 'Weekly Scorecard', icon: Activity },
];

export function Navbar() {
  const pathname = usePathname();
  const { metrics, loading, resetDemoData } = useTickets();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-bold leading-tight text-slate-900">
                RideOps Gatekeeper
              </div>
              <div className="text-[11px] font-medium text-slate-500">
                L1 Triage &amp; Escalation Workbench · v0
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${active
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {!loading && (
            <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 sm:flex">
              <span
                className={`h-2 w-2 rounded-full ${metrics.openBacklog <= 30 ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
              />
              <span>
                Open Backlog:{' '}
                <strong className="text-slate-900">{metrics.openBacklog}</strong>
              </span>
              {metrics.deflectedCount > 0 && (
                <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                  {metrics.deflectedCount} deflected
                </span>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => void resetDemoData()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-xs transition hover:bg-slate-50 hover:text-slate-900"
            title="Restore original 1,444 tickets from CSV"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Demo
          </button>
        </div>
      </div>

      {/* Mobile navigation */}
      <div className="flex items-center gap-1 overflow-x-auto border-t border-slate-100 px-4 py-2 md:hidden">
        {NAV_ITEMS.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium ${active
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
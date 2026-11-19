'use client';

import { useTickets } from '@/context/TicketsContext';

export default function Slice1VerifyPage() {
  const { loading, error, metrics, agentStats, weeklySeries } = useTickets();

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-600">
        Loading 1,444 tickets from CSV...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
        <strong>Error:</strong> {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          Slice 1 Verification — Live CSV Engine
        </h1>
        <p className="text-sm text-slate-600">
          Cross-check these live TypeScript values against your Python{' '}
          <code>metrics_summary.json</code> before moving to Slice 2.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium text-slate-500">Total Tickets</div>
          <div className="mt-1 text-2xl font-bold">{metrics.totalTickets}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium text-slate-500">Open Backlog (Sep 30)</div>
          <div className="mt-1 text-2xl font-bold text-rose-600">
            {metrics.openBacklog}
          </div>
          <div className="text-xs text-slate-500">
            {metrics.openEscalated} escalated · {metrics.openAgedOver48h} aged &gt;48h
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium text-slate-500">Avoidable Escalations</div>
          <div className="mt-1 text-2xl font-bold text-amber-600">
            {metrics.avoidableEscalationRatePct}%
          </div>
          <div className="text-xs text-slate-500">
            Ping-pong (2+): {metrics.pingPongRatePct}%
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium text-slate-500">Reopen Rate / CSAT</div>
          <div className="mt-1 text-2xl font-bold">
            {metrics.reopenRatePct}% / {metrics.avgCsat}
          </div>
          <div className="text-xs text-slate-500">
            L1 med: {metrics.medianResL1Hrs}h · Esc med: {metrics.medianResEscHrs}h
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-900">
          Agent Coaching Flags Preview ({agentStats.length} agents · {weeklySeries.length} weeks loaded)
        </h2>
        <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs text-emerald-300">
          {JSON.stringify(agentStats, null, 2)}
        </pre>
      </div>
    </div>
  );
}
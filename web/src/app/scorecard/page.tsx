'use client';

import React, { useMemo, useState } from 'react';
import {
    Activity,
    AlertTriangle,
    CheckCircle2,
    Sliders,
    TrendingDown,
    Users,
} from 'lucide-react';
import { WeeklyScorecardCharts } from '@/components/WeeklyScorecardCharts';
import { useTickets } from '@/context/TicketsContext';
import { AgentStat } from '@/lib/types';

type HealthStatus = 'On Target' | 'Watch' | 'Off Target';

interface KpiCardProps {
    tier: 'North Star' | 'Leading Lever' | 'Guardrail';
    title: string;
    value: string;
    target: string;
    subtitle: string;
    status: HealthStatus;
}

function statusPillClass(status: HealthStatus): string {
    switch (status) {
        case 'On Target':
            return 'bg-emerald-100 text-emerald-800 border-emerald-200';
        case 'Watch':
            return 'bg-amber-100 text-amber-900 border-amber-200';
        default:
            return 'bg-rose-100 text-rose-800 border-rose-200';
    }
}

function tierBadgeClass(tier: KpiCardProps['tier']): string {
    switch (tier) {
        case 'North Star':
            return 'bg-slate-900 text-white';
        case 'Leading Lever':
            return 'bg-indigo-100 text-indigo-800';
        default:
            return 'bg-slate-100 text-slate-700';
    }
}

function KpiCard({
    tier,
    title,
    value,
    target,
    subtitle,
    status,
}: KpiCardProps) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between gap-2">
                <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tierBadgeClass(
                        tier
                    )}`}
                >
                    {tier}
                </span>
                <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusPillClass(
                        status
                    )}`}
                >
                    {status}
                </span>
            </div>

            <div className="mt-3 text-xs font-semibold text-slate-600">{title}</div>
            <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-slate-900">
                    {value}
                </span>
                <span className="text-xs font-medium text-slate-500">
                    Target: {target}
                </span>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500">{subtitle}</p>
        </div>
    );
}

function coachingBadge(flag: AgentStat['coachingFlag']) {
    if (flag === 'High Reopen Risk') {
        return (
            <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-700">
                <AlertTriangle className="h-3 w-3" />
                High Reopen Risk (&gt;15%)
            </span>
        );
    }
    if (flag === 'Over-Escalating') {
        return (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                <AlertTriangle className="h-3 w-3" />
                Over-Escalating (&gt;45%)
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
            <CheckCircle2 className="h-3 w-3" />
            On Track
        </span>
    );
}

export default function WeeklyScorecardPage() {
    const { loading, error, metrics, weeklySeries, agentStats } = useTickets();

    // Interactive What-If Simulator Sliders
    const [deflectionPct, setDeflectionPct] = useState<number>(60);
    const [pingPongCutPct, setPingPongCutPct] = useState<number>(50);

    // Little's Law Simulation grounded in September intake rate (592 / 30 = 19.73/day)
    const simulation = useMemo(() => {
        const sepDailyRate = 592 / 30; // 19.73 tickets/day
        const meanL1Days = 0.83; // 19.96 hrs
        const meanEscDays = 4.16; // 99.79 hrs
        const meanCleanEscDays = 3.28; // 78.64 hrs (cleanly fixed 1-handoff norm)
        const baselineSepHandoffsPerMonth = 302; // 189 sep escalations * 1.60 avg handoffs

        const baseEscShare = metrics.escalationRatePct / 100; // ~0.337
        const avoidableShareOfEsc = metrics.avoidableEscalationRatePct / 100; // ~0.521

        const currentAvgDays =
            (1 - baseEscShare) * meanL1Days + baseEscShare * meanEscDays;
        const currentImpliedWip = sepDailyRate * currentAvgDays;

        const deflectedFractionOfEsc = (deflectionPct / 100) * avoidableShareOfEsc;
        const projectedEscShare = Math.max(
            0,
            baseEscShare * (1 - deflectedFractionOfEsc)
        );

        const projectedEscDays =
            meanEscDays - (meanEscDays - meanCleanEscDays) * (pingPongCutPct / 100);
        const projectedAvgDays =
            (1 - projectedEscShare) * meanL1Days +
            projectedEscShare * projectedEscDays;
        const projectedWip = sepDailyRate * projectedAvgDays;

        const wipReductionPct =
            currentImpliedWip > 0
                ? ((currentImpliedWip - projectedWip) / currentImpliedWip) * 100
                : 0;

        // Scale current open snapshot (48) proportionally alongside steady-state WIP
        const projectedSnapshotBacklog = Math.round(
            metrics.openBacklog * (projectedWip / currentImpliedWip)
        );

        // Monthly handoffs saved: deflected tickets + reduced bounce handoffs on remaining
        const handoffsSavedByDeflection =
            baselineSepHandoffsPerMonth * deflectedFractionOfEsc;
        const remainingHandoffs =
            baselineSepHandoffsPerMonth - handoffsSavedByDeflection;
        // Extra bounce handoffs represent ~37.5% of total handoffs ((1.60 - 1.0) / 1.60)
        const handoffsSavedByPingPongCut =
            remainingHandoffs * 0.375 * (pingPongCutPct / 100);
        const totalMonthlyHandoffsSaved = Math.round(
            handoffsSavedByDeflection + handoffsSavedByPingPongCut
        );

        return {
            projectedEscRatePct: Math.round(projectedEscShare * 1000) / 10,
            projectedSteadyWip: Math.round(projectedWip * 10) / 10,
            projectedSnapshotBacklog,
            wipReductionPct: Math.round(wipReductionPct * 10) / 10,
            totalMonthlyHandoffsSaved,
        };
    }, [
        deflectionPct,
        pingPongCutPct,
        metrics.escalationRatePct,
        metrics.avoidableEscalationRatePct,
        metrics.openBacklog,
    ]);

    if (loading) {
        return (
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-600">
                Computing weekly operational metrics...
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
            {/* Header */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-slate-900" />
                        <h1 className="text-xl font-bold tracking-tight text-slate-900">
                            Weekly Operations &amp; Quality Scorecard
                        </h1>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-600">
                        Live metrics computed directly from all{' '}
                        <strong>{metrics.totalTickets.toLocaleString()}</strong> tickets ·
                        Designed for the Monday 9:00 AM IST Ops–Support–Eng sync (Ritika,
                        Meera &amp; Sandeep).
                    </p>
                </div>

                {metrics.deflectedCount > 0 && (
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
                        <TrendingDown className="h-3.5 w-3.5" />
                        {metrics.deflectedCount} ticket
                        {metrics.deflectedCount === 1 ? '' : 's'} deflected live in this
                        session
                    </div>
                )}
            </div>

            {/* 6-Metric Framework Grid */}
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <KpiCard
                    tier="North Star"
                    title="End-of-Week Open Backlog"
                    value={`${metrics.openBacklog} open`}
                    target="≤ 30"
                    subtitle={`${metrics.openEscalated} escalated (${metrics.openBacklog > 0
                            ? Math.round((metrics.openEscalated / metrics.openBacklog) * 100)
                            : 0
                        }%) · ${metrics.openL1Only} L1 only`}
                    status={
                        metrics.openBacklog <= 30
                            ? 'On Target'
                            : metrics.openBacklog <= 38
                                ? 'Watch'
                                : 'Off Target'
                    }
                />

                <KpiCard
                    tier="North Star"
                    title="Aging Open Backlog (>48h)"
                    value={`${metrics.openAgedOver48hPct}%`}
                    target="< 25%"
                    subtitle={`${metrics.openAgedOver48h} of ${metrics.openBacklog} open tickets aged past 48h as of Sep 30`}
                    status={
                        metrics.openAgedOver48hPct < 25
                            ? 'On Target'
                            : metrics.openAgedOver48hPct <= 35
                                ? 'Watch'
                                : 'Off Target'
                    }
                />

                <KpiCard
                    tier="Leading Lever"
                    title="Avoidable Escalation Rate"
                    value={`${metrics.avoidableEscalationRatePct}%`}
                    target="< 20%"
                    subtitle="Insufficient info, config issues, duplicates & how-tos (% of escalations)"
                    status={
                        metrics.avoidableEscalationRatePct < 20
                            ? 'On Target'
                            : metrics.avoidableEscalationRatePct <= 35
                                ? 'Watch'
                                : 'Off Target'
                    }
                />

                <KpiCard
                    tier="Leading Lever"
                    title="Escalation Ping-Pong Rate (≥2 Handoffs)"
                    value={`${metrics.pingPongRatePct}%`}
                    target="< 20%"
                    subtitle={`Median close jumps from ${metrics.medianResL1Hrs}h (L1) to ${metrics.medianResEscHrs}h (escalated)`}
                    status={
                        metrics.pingPongRatePct < 20
                            ? 'On Target'
                            : metrics.pingPongRatePct <= 35
                                ? 'Watch'
                                : 'Off Target'
                    }
                />

                <KpiCard
                    tier="Guardrail"
                    title="Ticket Reopen Rate"
                    value={`${metrics.reopenRatePct}%`}
                    target="< 8% team"
                    subtitle="Protects against premature closures · Max single agent: 29.5% (Karan B)"
                    status={
                        metrics.reopenRatePct < 8
                            ? 'On Target'
                            : metrics.reopenRatePct <= 11
                                ? 'Watch'
                                : 'Off Target'
                    }
                />

                <KpiCard
                    tier="Guardrail"
                    title="Client Satisfaction (CSAT)"
                    value={`${metrics.avgCsat} / 5`}
                    target="≥ 3.90"
                    subtitle={`Measured across ${metrics.csatResponseRatePct}% response coverage (paired with Reopen Rate)`}
                    status={
                        metrics.avgCsat >= 3.9
                            ? 'On Target'
                            : metrics.avgCsat >= 3.7
                                ? 'Watch'
                                : 'Off Target'
                    }
                />
            </section>

            {/* Weekly Trend Charts */}
            <WeeklyScorecardCharts data={weeklySeries} />

            {/* Interactive What-If Impact Simulator */}
            <section className="rounded-2xl border border-slate-200 bg-slate-900 p-6 text-white shadow-sm">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                        <Sliders className="h-4 w-4 text-emerald-400" />
                        <h2 className="text-sm font-bold">
                            What-If Impact Simulator (Zero New Hires · September Volume = 592/mo)
                        </h2>
                    </div>
                    <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[11px] font-medium text-slate-300">
                        Little&apos;s Law Queue Model
                    </span>
                </div>

                <p className="mt-1 text-xs text-slate-400">
                    Model how Gatekeeper adoption shrinks open backlog and frees engineering
                    cycles without adding L1 headcount.
                </p>

                <div className="mt-5 grid gap-6 lg:grid-cols-12">
                    {/* Sliders */}
                    <div className="space-y-5 lg:col-span-5">
                        <div>
                            <div className="flex items-center justify-between text-xs">
                                <label className="font-semibold text-slate-200">
                                    Avoidable Escalations Deflected at Gate
                                </label>
                                <span className="font-mono font-bold text-emerald-400">
                                    {deflectionPct}%
                                </span>
                            </div>
                            <input
                                type="range"
                                min={0}
                                max={90}
                                step={5}
                                value={deflectionPct}
                                onChange={(e) => setDeflectionPct(Number(e.target.value))}
                                className="mt-2 w-full accent-emerald-400"
                            />
                            <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                                <span>0% (Status quo)</span>
                                <span>60% (4-wk goal)</span>
                                <span>90% (Best case)</span>
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between text-xs">
                                <label className="font-semibold text-slate-200">
                                    Ping-Pong Reduction on Remaining Escalations
                                </label>
                                <span className="font-mono font-bold text-sky-400">
                                    {pingPongCutPct}%
                                </span>
                            </div>
                            <input
                                type="range"
                                min={0}
                                max={80}
                                step={5}
                                value={pingPongCutPct}
                                onChange={(e) => setPingPongCutPct(Number(e.target.value))}
                                className="mt-2 w-full accent-sky-400"
                            />
                            <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                                <span>0%</span>
                                <span>50% (Structured packets)</span>
                                <span>80%</span>
                            </div>
                        </div>
                    </div>

                    {/* Projected Outputs */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:col-span-7">
                        <div className="rounded-xl border border-slate-800 bg-slate-800/70 p-4">
                            <div className="text-[11px] font-medium text-slate-400">
                                Projected Escalation Rate
                            </div>
                            <div className="mt-1 text-2xl font-bold text-white">
                                {simulation.projectedEscRatePct}%
                            </div>
                            <div className="mt-1 text-[11px] text-emerald-400">
                                Down from {metrics.escalationRatePct}% baseline
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-800 bg-slate-800/70 p-4">
                            <div className="text-[11px] font-medium text-slate-400">
                                Projected Steady-State WIP
                            </div>
                            <div className="mt-1 flex items-baseline gap-1.5">
                                <span
                                    className={`text-2xl font-bold ${simulation.projectedSteadyWip <= 30
                                            ? 'text-emerald-400'
                                            : 'text-amber-400'
                                        }`}
                                >
                                    {simulation.projectedSteadyWip}
                                </span>
                                <span className="text-xs text-slate-400">tickets</span>
                            </div>
                            <div className="mt-1 text-[11px] text-slate-300">
                                -{simulation.wipReductionPct}% WIP (Sep snapshot ~
                                {simulation.projectedSnapshotBacklog})
                            </div>
                        </div>

                        <div className="col-span-2 rounded-xl border border-slate-800 bg-slate-800/70 p-4 sm:col-span-1">
                            <div className="text-[11px] font-medium text-slate-400">
                                Eng Handoffs Saved / Mo
                            </div>
                            <div className="mt-1 text-2xl font-bold text-sky-400">
                                ~{simulation.totalMonthlyHandoffsSaved}
                            </div>
                            <div className="mt-1 text-[11px] text-slate-300">
                                Out of ~302 monthly handoffs
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Agent Quality & Coaching Table */}
            <section className="rounded-xl border border-slate-200 bg-white shadow-xs">
                <div className="flex flex-col gap-1 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-slate-700" />
                            <h2 className="text-sm font-bold text-slate-900">
                                L1 Agent Quality &amp; Coaching Triggers (Meera&apos;s Weekly View)
                            </h2>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">
                            Replaces raw closure-speed praise with quality-adjusted throughput:
                            flags Reopen Rate &gt; 15% or Escalation Rate &gt; 45% with &lt; 35%
                            Eng Fix Rate.
                        </p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-xs">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                <th className="px-5 py-3">Agent</th>
                                <th className="px-4 py-3 text-right">Q3 Tickets</th>
                                <th className="px-4 py-3 text-right">Open Now</th>
                                <th className="px-4 py-3 text-right">Med. First Close</th>
                                <th className="px-4 py-3 text-right">Escalation Rate</th>
                                <th className="px-4 py-3 text-right">Eng Fix Rate</th>
                                <th className="px-4 py-3 text-right">Reopen Rate</th>
                                <th className="px-4 py-3 text-right">Avg CSAT</th>
                                <th className="px-5 py-3">Coaching Trigger</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {agentStats.map((row) => (
                                <tr
                                    key={row.agent}
                                    className={
                                        row.coachingFlag === 'High Reopen Risk'
                                            ? 'bg-rose-50/40'
                                            : row.coachingFlag === 'Over-Escalating'
                                                ? 'bg-amber-50/40'
                                                : 'hover:bg-slate-50'
                                    }
                                >
                                    <td className="whitespace-nowrap px-5 py-3 font-bold text-slate-900">
                                        {row.agent}
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-slate-700">
                                        {row.tickets}
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-slate-700">
                                        {row.openCount}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono text-slate-700">
                                        {row.medFirstCloseHrs}h
                                    </td>
                                    <td
                                        className={`px-4 py-3 text-right font-semibold ${row.escRatePct > 45 ? 'text-amber-700' : 'text-slate-700'
                                            }`}
                                    >
                                        {row.escRatePct}%
                                    </td>
                                    <td
                                        className={`px-4 py-3 text-right font-semibold ${row.fixedRatePct < 35 ? 'text-amber-700' : 'text-slate-700'
                                            }`}
                                    >
                                        {row.fixedRatePct}%
                                    </td>
                                    <td
                                        className={`px-4 py-3 text-right font-bold ${row.reopenRatePct > 15 ? 'text-rose-600' : 'text-slate-700'
                                            }`}
                                    >
                                        {row.reopenRatePct}%{' '}
                                        <span className="font-normal text-slate-400">
                                            ({row.reopenEvents})
                                        </span>
                                    </td>
                                    <td
                                        className={`px-4 py-3 text-right font-semibold ${row.avgCsat < 3.4 ? 'text-rose-600' : 'text-slate-800'
                                            }`}
                                    >
                                        {row.avgCsat.toFixed(2)}
                                    </td>
                                    <td className="whitespace-nowrap px-5 py-3">
                                        {coachingBadge(row.coachingFlag)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
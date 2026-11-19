'use client';

import React, { useMemo, useState } from 'react';
import {
    BookOpen,
    Check,
    ChevronDown,
    ChevronRight,
    Copy,
    Sparkles,
    Wrench,
} from 'lucide-react';
import { useTickets } from '@/context/TicketsContext';
import { CATEGORY_PLAYBOOKS, KNOWN_ISSUES } from '@/data/playbooks';
import { matchKnownIssue } from '@/lib/triageEngine';

export default function KnownIssuesPage() {
    const { tickets, loading } = useTickets();
    const [expandedCategory, setExpandedCategory] = useState<string>(
        'Roster / booking not syncing'
    );
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const issueCounts = useMemo(() => {
        const counts = new Map<string, { total: number; open: number }>();
        for (const ki of KNOWN_ISSUES) {
            counts.set(ki.id, { total: 0, open: 0 });
        }
        for (const t of tickets) {
            const matched = matchKnownIssue(t);
            if (!matched) continue;
            const entry = counts.get(matched.id);
            if (entry) {
                entry.total += 1;
                if (t.status !== 'Closed') entry.open += 1;
            }
        }
        return counts;
    }, [tickets]);

    const copyTemplate = async (id: string, template: string) => {
        try {
            await navigator.clipboard.writeText(template);
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        } catch {
            // Ignore clipboard failures
        }
    };

    const playbooks = Object.values(CATEGORY_PLAYBOOKS).filter(
        (p) => p.category !== 'General L1 Support'
    );

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                    Active Known Issues &amp; L1 Playbooks
                </h1>
                <p className="mt-1 text-xs text-slate-600">
                    Shared source of truth between L1 Support and Engineering — prevents duplicate
                    escalations (56 tickets / 11.5% of Q3 escalations) and standardizes config
                    troubleshooting across the top 5 categories.
                </p>
            </div>

            {/* Section 1: Active Known Issues */}
            <section className="space-y-3">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-600" />
                    <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800">
                        Active Known Engineering Issues ({KNOWN_ISSUES.length})
                    </h2>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    {KNOWN_ISSUES.map((issue) => {
                        const stats = issueCounts.get(issue.id) ?? { total: 0, open: 0 };
                        return (
                            <div
                                key={issue.id}
                                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs"
                            >
                                <div>
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="rounded bg-amber-100 px-2 py-0.5 font-mono text-xs font-bold text-amber-900">
                                                {issue.engBugId}
                                            </span>
                                            <span className="text-xs font-medium text-slate-500">
                                                {issue.category}
                                            </span>
                                        </div>
                                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                                            {issue.status} · ETA {issue.eta}
                                        </span>
                                    </div>

                                    <h3 className="mt-2 text-sm font-bold text-slate-900">
                                        {issue.title}
                                    </h3>

                                    <p className="mt-2 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-700">
                                        <strong className="text-slate-900">L1 Workaround: </strong>
                                        {issue.l1Workaround}
                                    </p>
                                </div>

                                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                                    <div className="text-xs text-slate-600">
                                        {loading ? (
                                            'Counting...'
                                        ) : (
                                            <>
                                                Matched:{' '}
                                                <strong className="text-slate-900">{stats.total}</strong> Q3
                                                tickets ·{' '}
                                                <strong className="text-rose-600">{stats.open} open now</strong>
                                            </>
                                        )}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            void copyTemplate(issue.id, issue.clientUpdateTemplate)
                                        }
                                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                    >
                                        {copiedId === issue.id ? (
                                            <>
                                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                                                Copied
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="h-3.5 w-3.5" />
                                                Copy Client Update
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Section 2: Category L1 Playbooks */}
            <section className="space-y-3">
                <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-slate-700" />
                    <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800">
                        Mandatory Pre-Escalation Playbooks (Top 5 Categories)
                    </h2>
                </div>

                <div className="space-y-2.5">
                    {playbooks.map((pb) => {
                        const isOpen = expandedCategory === pb.category;
                        return (
                            <div
                                key={pb.category}
                                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs"
                            >
                                <button
                                    type="button"
                                    onClick={() =>
                                        setExpandedCategory(isOpen ? '' : pb.category)
                                    }
                                    className="flex w-full items-center justify-between px-4 py-3.5 text-left hover:bg-slate-50"
                                >
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <Wrench className="h-4 w-4 text-slate-500" />
                                            <span className="text-sm font-bold text-slate-900">
                                                {pb.category}
                                            </span>
                                        </div>
                                        <p className="mt-0.5 text-xs text-slate-500">
                                            {pb.escalationShareNote}
                                        </p>
                                    </div>
                                    {isOpen ? (
                                        <ChevronDown className="h-4 w-4 text-slate-400" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4 text-slate-400" />
                                    )}
                                </button>

                                {isOpen && (
                                    <div className="grid gap-4 border-t border-slate-100 bg-slate-50/50 p-4 md:grid-cols-2">
                                        <div>
                                            <div className="text-xs font-bold uppercase tracking-wide text-slate-700">
                                                L1 Config Checks (Required Before Escalation)
                                            </div>
                                            <ul className="mt-2 space-y-1.5 text-xs text-slate-700">
                                                {pb.l1Checks.map((chk) => (
                                                    <li key={chk} className="flex items-start gap-2">
                                                        <span className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border border-slate-300 bg-white" />
                                                        <span>{chk}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                            <p className="mt-3 rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-600">
                                                <strong className="text-slate-800">Config Fix Hint: </strong>
                                                {pb.configFixHint}
                                            </p>
                                        </div>

                                        <div>
                                            <div className="text-xs font-bold uppercase tracking-wide text-slate-700">
                                                Required Engineering Handoff Packet Fields
                                            </div>
                                            <ul className="mt-2 space-y-2 text-xs">
                                                {pb.requiredDiagFields.map((field) => (
                                                    <li
                                                        key={field.key}
                                                        className="rounded-lg border border-slate-200 bg-white px-3 py-2"
                                                    >
                                                        <div className="font-semibold text-slate-900">
                                                            {field.label}
                                                            {field.required && (
                                                                <span className="ml-1 text-rose-600">*</span>
                                                            )}
                                                        </div>
                                                        <div className="text-[11px] text-slate-500">
                                                            Example: {field.placeholder}
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}
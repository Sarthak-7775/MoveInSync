'use client';

import React, { useMemo, useState } from 'react';
import {
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
    Search,
    Sparkles,
} from 'lucide-react';
import { computeRiskScore, RiskAssessment } from '@/lib/triageEngine';
import { Ticket } from '@/lib/types';

interface TicketQueueProps {
    tickets: Ticket[];
    selectedTicketId: string | null;
    onSelectTicket: (ticket: Ticket) => void;
}

const PAGE_SIZE = 50;

function riskBadgeStyle(level: RiskAssessment['level']): string {
    switch (level) {
        case 'Critical':
            return 'bg-rose-100 text-rose-800 border-rose-200';
        case 'High':
            return 'bg-amber-100 text-amber-800 border-amber-200';
        case 'Medium':
            return 'bg-sky-100 text-sky-800 border-sky-200';
        default:
            return 'bg-slate-100 text-slate-700 border-slate-200';
    }
}

function priorityStyle(priority: Ticket['priority']): string {
    switch (priority) {
        case 'P1':
            return 'bg-rose-600 text-white';
        case 'P2':
            return 'bg-amber-500 text-white';
        case 'P3':
            return 'bg-slate-200 text-slate-800';
        default:
            return 'bg-slate-100 text-slate-600';
    }
}

function tierStyle(tier: Ticket['client_tier']): string {
    switch (tier) {
        case 'Enterprise':
            return 'bg-indigo-50 text-indigo-700 border-indigo-200';
        case 'Mid-market':
            return 'bg-slate-100 text-slate-700 border-slate-200';
        default:
            return 'bg-slate-50 text-slate-600 border-slate-200';
    }
}

export function TicketQueue({
    tickets,
    selectedTicketId,
    onSelectTicket,
}: TicketQueueProps) {
    const [scope, setScope] = useState<'open' | 'all'>('open');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
    const [tierFilter, setTierFilter] = useState<string>('ALL');
    const [agentFilter, setAgentFilter] = useState<string>('ALL');
    const [knownIssueOnly, setKnownIssueOnly] = useState<boolean>(false);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [page, setPage] = useState<number>(1);

    const filterOptions = useMemo(() => {
        const categories = Array.from(new Set(tickets.map((t) => t.category))).sort();
        const agents = Array.from(new Set(tickets.map((t) => t.assigned_agent))).sort();
        return { categories, agents };
    }, [tickets]);

    const openCount = useMemo(
        () => tickets.filter((t) => t.status !== 'Closed').length,
        [tickets]
    );

    const enrichedAndFiltered = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();

        return tickets
            .filter((t) => {
                if (scope === 'open' && t.status === 'Closed') return false;
                if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
                if (categoryFilter !== 'ALL' && t.category !== categoryFilter) return false;
                if (tierFilter !== 'ALL' && t.client_tier !== tierFilter) return false;
                if (agentFilter !== 'ALL' && t.assigned_agent !== agentFilter) return false;

                if (q) {
                    const hay = `${t.ticket_id} ${t.client_name} ${t.client_id} ${t.description} ${t.category} ${t.assigned_agent}`.toLowerCase();
                    if (!hay.includes(q)) return false;
                }
                return true;
            })
            .map((ticket) => ({
                ticket,
                risk: computeRiskScore(ticket),
            }))
            .filter(({ risk }) => (!knownIssueOnly ? true : risk.matchedKnownIssue !== null))
            .sort((a, b) => {
                // Prioritize open tickets first when viewing "all", then descending risk score, then age
                const aOpen = a.ticket.status !== 'Closed' ? 1 : 0;
                const bOpen = b.ticket.status !== 'Closed' ? 1 : 0;
                if (aOpen !== bOpen) return bOpen - aOpen;
                if (b.risk.score !== a.risk.score) return b.risk.score - a.risk.score;
                return b.risk.ageHours - a.risk.ageHours;
            });
    }, [
        tickets,
        scope,
        statusFilter,
        categoryFilter,
        tierFilter,
        agentFilter,
        knownIssueOnly,
        searchQuery,
    ]);

    const totalPages = Math.max(1, Math.ceil(enrichedAndFiltered.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const pageItems = enrichedAndFiltered.slice(
        (safePage - 1) * PAGE_SIZE,
        safePage * PAGE_SIZE
    );

    const resetFilters = () => {
        setStatusFilter('ALL');
        setCategoryFilter('ALL');
        setTierFilter('ALL');
        setAgentFilter('ALL');
        setKnownIssueOnly(false);
        setSearchQuery('');
        setPage(1);
    };

    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs">
            {/* Top Bar: Scope Toggle + Search */}
            <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1">
                    <button
                        type="button"
                        onClick={() => {
                            setScope('open');
                            setStatusFilter('ALL');
                            setPage(1);
                        }}
                        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${scope === 'open'
                                ? 'bg-white text-slate-900 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                    >
                        Open Queue ({openCount})
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setScope('all');
                            setPage(1);
                        }}
                        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${scope === 'all'
                                ? 'bg-white text-slate-900 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                    >
                        All Historical ({tickets.length.toLocaleString()})
                    </button>
                </div>

                <div className="relative w-full lg:w-80">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setPage(1);
                        }}
                        placeholder="Search ticket ID, client, or issue..."
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none"
                    />
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-2.5 border-b border-slate-100 bg-slate-50/70 px-4 py-3 text-xs">
                <select
                    value={statusFilter}
                    onChange={(e) => {
                        setStatusFilter(e.target.value);
                        setPage(1);
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-slate-400 focus:outline-none"
                >
                    <option value="ALL">All Statuses</option>
                    <option value="Open - with L1">Open - with L1</option>
                    <option value="Open - with Engineering">Open - with Engineering</option>
                    {scope === 'all' && <option value="Closed">Closed</option>}
                </select>

                <select
                    value={categoryFilter}
                    onChange={(e) => {
                        setCategoryFilter(e.target.value);
                        setPage(1);
                    }}
                    className="max-w-[220px] rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-slate-400 focus:outline-none"
                >
                    <option value="ALL">All Categories</option>
                    {filterOptions.categories.map((cat) => (
                        <option key={cat} value={cat}>
                            {cat}
                        </option>
                    ))}
                </select>

                <select
                    value={tierFilter}
                    onChange={(e) => {
                        setTierFilter(e.target.value);
                        setPage(1);
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-slate-400 focus:outline-none"
                >
                    <option value="ALL">All Client Tiers</option>
                    <option value="Enterprise">Enterprise</option>
                    <option value="Mid-market">Mid-market</option>
                    <option value="SMB">SMB</option>
                </select>

                <select
                    value={agentFilter}
                    onChange={(e) => {
                        setAgentFilter(e.target.value);
                        setPage(1);
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-slate-400 focus:outline-none"
                >
                    <option value="ALL">All Agents</option>
                    {filterOptions.agents.map((agent) => (
                        <option key={agent} value={agent}>
                            {agent}
                        </option>
                    ))}
                </select>

                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 font-medium text-amber-900">
                    <input
                        type="checkbox"
                        checked={knownIssueOnly}
                        onChange={(e) => {
                            setKnownIssueOnly(e.target.checked);
                            setPage(1);
                        }}
                        className="h-3.5 w-3.5 rounded border-amber-400 accent-amber-600"
                    />
                    <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                    Known-Issue Matches Only
                </label>

                {(statusFilter !== 'ALL' ||
                    categoryFilter !== 'ALL' ||
                    tierFilter !== 'ALL' ||
                    agentFilter !== 'ALL' ||
                    knownIssueOnly ||
                    searchQuery.trim() !== '') && (
                        <button
                            type="button"
                            onClick={resetFilters}
                            className="ml-auto text-xs font-medium text-slate-500 underline hover:text-slate-800"
                        >
                            Clear filters
                        </button>
                    )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                    <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            <th className="px-4 py-2.5">Risk</th>
                            <th className="px-4 py-2.5">Ticket</th>
                            <th className="px-4 py-2.5">Client</th>
                            <th className="px-4 py-2.5">Issue &amp; Triage Signals</th>
                            <th className="px-4 py-2.5">Status / Handoffs</th>
                            <th className="px-4 py-2.5">Agent</th>
                            <th className="px-4 py-2.5 text-right">Age</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {pageItems.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">
                                    No tickets match the current filters.
                                </td>
                            </tr>
                        ) : (
                            pageItems.map(({ ticket, risk }) => {
                                const isSelected = ticket.ticket_id === selectedTicketId;
                                return (
                                    <tr
                                        key={ticket.ticket_id}
                                        onClick={() => onSelectTicket(ticket)}
                                        className={`cursor-pointer transition ${isSelected
                                                ? 'bg-slate-900/[0.04]'
                                                : 'hover:bg-slate-50'
                                            }`}
                                    >
                                        <td className="whitespace-nowrap px-4 py-3 align-top">
                                            <span
                                                className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-bold ${riskBadgeStyle(
                                                    risk.level
                                                )}`}
                                            >
                                                {risk.score}
                                                <span className="font-medium">{risk.level}</span>
                                            </span>
                                        </td>

                                        <td className="whitespace-nowrap px-4 py-3 align-top">
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-mono text-xs font-semibold text-slate-900">
                                                    {ticket.ticket_id}
                                                </span>
                                                <span
                                                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${priorityStyle(
                                                        ticket.priority
                                                    )}`}
                                                >
                                                    {ticket.priority}
                                                </span>
                                            </div>
                                            <div className="mt-0.5 text-[11px] text-slate-500">
                                                {ticket.channel}
                                            </div>
                                        </td>

                                        <td className="whitespace-nowrap px-4 py-3 align-top">
                                            <div className="text-xs font-semibold text-slate-900">
                                                {ticket.client_name}
                                            </div>
                                            <span
                                                className={`mt-1 inline-block rounded border px-1.5 py-0.5 text-[10px] font-medium ${tierStyle(
                                                    ticket.client_tier
                                                )}`}
                                            >
                                                {ticket.client_tier}
                                            </span>
                                        </td>

                                        <td className="max-w-md px-4 py-3 align-top">
                                            <div className="text-xs font-semibold text-slate-800">
                                                {ticket.category}
                                            </div>
                                            <div className="mt-0.5 line-clamp-2 text-xs text-slate-600">
                                                {ticket.description}
                                            </div>
                                            <div className="mt-1.5 flex flex-wrap gap-1">
                                                {risk.matchedKnownIssue && (
                                                    <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">
                                                        <Sparkles className="h-3 w-3" />
                                                        Known Bug: {risk.matchedKnownIssue.engBugId}
                                                    </span>
                                                )}
                                                {ticket.reopen_count > 0 && (
                                                    <span className="inline-flex items-center gap-1 rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
                                                        <AlertTriangle className="h-3 w-3" />
                                                        Reopened {ticket.reopen_count}×
                                                    </span>
                                                )}
                                                {ticket.deflected_at_gate && (
                                                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                                                        Deflected at Gate
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        <td className="whitespace-nowrap px-4 py-3 align-top">
                                            <span
                                                className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${ticket.status === 'Closed'
                                                        ? 'bg-emerald-50 text-emerald-700'
                                                        : ticket.status === 'Open - with Engineering'
                                                            ? 'bg-rose-50 text-rose-700'
                                                            : 'bg-amber-50 text-amber-800'
                                                    }`}
                                            >
                                                {ticket.status}
                                            </span>
                                            <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                                                {ticket.eng_handoffs > 0 ? (
                                                    <span
                                                        className={`font-semibold ${ticket.eng_handoffs >= 2
                                                                ? 'text-rose-600'
                                                                : 'text-slate-600'
                                                            }`}
                                                    >
                                                        {ticket.eng_handoffs} eng handoff
                                                        {ticket.eng_handoffs > 1 ? 's' : ''}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400">L1 only</span>
                                                )}
                                            </div>
                                        </td>

                                        <td className="whitespace-nowrap px-4 py-3 align-top text-xs text-slate-700">
                                            <div className="font-medium">{ticket.assigned_agent}</div>
                                            {ticket.assigned_agent === 'Karan B' && (
                                                <div className="text-[10px] font-semibold text-rose-600">
                                                    Reopen Guardrail
                                                </div>
                                            )}
                                            {ticket.assigned_agent === 'Rahul T' && (
                                                <div className="text-[10px] font-semibold text-amber-600">
                                                    Esc. Coaching
                                                </div>
                                            )}
                                        </td>

                                        <td className="whitespace-nowrap px-4 py-3 text-right align-top">
                                            <span
                                                className={`text-xs font-semibold ${ticket.status !== 'Closed' && risk.ageHours > 48
                                                        ? 'text-rose-600'
                                                        : 'text-slate-700'
                                                    }`}
                                            >
                                                {risk.ageHours >= 24
                                                    ? `${(risk.ageHours / 24).toFixed(1)}d`
                                                    : `${risk.ageHours.toFixed(1)}h`}
                                            </span>
                                            <div className="text-[10px] text-slate-400">
                                                {risk.ageHours.toFixed(0)}h total
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer / Pagination */}
            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-600">
                <div>
                    Showing{' '}
                    <strong className="text-slate-900">
                        {enrichedAndFiltered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}
                        –{Math.min(safePage * PAGE_SIZE, enrichedAndFiltered.length)}
                    </strong>{' '}
                    of <strong className="text-slate-900">{enrichedAndFiltered.length}</strong>{' '}
                    tickets
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            disabled={safePage <= 1}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                        >
                            <ChevronLeft className="h-3.5 w-3.5" />
                            Prev
                        </button>
                        <span className="px-2 font-medium">
                            Page {safePage} / {totalPages}
                        </span>
                        <button
                            type="button"
                            disabled={safePage >= totalPages}
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                        >
                            Next
                            <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
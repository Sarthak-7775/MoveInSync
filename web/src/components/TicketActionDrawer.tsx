'use client';

import React, { useState } from 'react';
import {
    AlertTriangle,
    Check,
    CheckCircle2,
    Clock,
    Copy,
    ShieldAlert,
    ShieldCheck,
    Sparkles,
    Wrench,
    X,
} from 'lucide-react';
import { SNAPSHOT_ISO } from '@/lib/metricsCalc';
import {
    buildKnownIssueClientUpdate,
    checkClosureRisk,
    computeRiskScore,
    getPlaybookForCategory,
} from '@/lib/triageEngine';
import { Ticket } from '@/lib/types';

interface TicketActionDrawerProps {
    ticket: Ticket | null;
    onClose: () => void;
    onDeflectKnownIssue: (ticketId: string, knownIssueId: string, clientMessage: string) => void;
    onOpenGatekeeper: (ticket: Ticket) => void;
    onOpenClosure: (ticket: Ticket) => void;
}

export function TicketActionDrawer({
    ticket,
    onClose,
    onDeflectKnownIssue,
    onOpenGatekeeper,
    onOpenClosure,
}: TicketActionDrawerProps) {
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    if (!ticket) return null;

    const risk = computeRiskScore(ticket);
    const closureRisk = checkClosureRisk(ticket);
    const playbook = getPlaybookForCategory(ticket.category);
    const knownIssue = risk.matchedKnownIssue;

    const copyText = async (text: string, key: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedKey(key);
            setTimeout(() => setCopiedKey(null), 2000);
        } catch {
            // Fallback ignored in restricted clipboard environments
        }
    };

    const handleQuickDeflect = () => {
        if (!knownIssue) return;
        const msg = buildKnownIssueClientUpdate(ticket, knownIssue);
        void copyText(msg, 'deflect');
        onDeflectKnownIssue(ticket.ticket_id, knownIssue.id, msg);
    };

    return (
        <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/30 backdrop-blur-[1px]">
            <div
                className="fixed inset-0"
                onClick={onClose}
                aria-hidden="true"
            />

            <aside className="relative z-50 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
                {/* Drawer Header */}
                <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-sm font-bold text-slate-900">
                                {ticket.ticket_id}
                            </span>
                            <span className="rounded bg-slate-900 px-1.5 py-0.5 text-[11px] font-bold text-white">
                                {ticket.priority}
                            </span>
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                                {ticket.status}
                            </span>
                            <span className="rounded border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700">
                                Risk {risk.score}/100 ({risk.level})
                            </span>
                        </div>
                        <h2 className="mt-1.5 text-base font-bold text-slate-900">
                            {ticket.client_name}{' '}
                            <span className="text-xs font-medium text-slate-500">
                                ({ticket.client_id} · {ticket.client_tier})
                            </span>
                        </h2>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        aria-label="Close drawer"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
                    {/* Issue Summary */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                            <span className="font-semibold text-slate-700">{ticket.category}</span>
                            <span>
                                via <strong>{ticket.channel}</strong> · Owner:{' '}
                                <strong>{ticket.assigned_agent}</strong>
                            </span>
                        </div>
                        <p className="mt-2 text-sm font-medium text-slate-900">
                            {ticket.description}
                        </p>
                    </div>

                    {/* Known Issue Match Alert */}
                    {knownIssue && (
                        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2 text-amber-900">
                                    <Sparkles className="h-4 w-4 shrink-0 text-amber-600" />
                                    <span className="text-xs font-bold uppercase tracking-wide">
                                        Known Issue Match Detected · {knownIssue.engBugId}
                                    </span>
                                </div>
                                <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                                    {knownIssue.status} · ETA {knownIssue.eta}
                                </span>
                            </div>

                            <p className="mt-1.5 text-sm font-semibold text-amber-950">
                                {knownIssue.title}
                            </p>
                            <p className="mt-1 text-xs text-amber-900">
                                <strong>L1 Workaround:</strong> {knownIssue.l1Workaround}
                            </p>

                            {ticket.status !== 'Closed' ? (
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleQuickDeflect}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-amber-700"
                                    >
                                        {copiedKey === 'deflect' ? (
                                            <>
                                                <Check className="h-3.5 w-3.5" />
                                                Deflected &amp; Update Copied!
                                            </>
                                        ) : (
                                            <>
                                                <ShieldCheck className="h-3.5 w-3.5" />
                                                Deflect: Link Known Bug &amp; Copy Client Update
                                            </>
                                        )}
                                    </button>
                                    <span className="text-[11px] text-amber-800">
                                        Avoids duplicate engineering escalation (11.5% of all escalations)
                                    </span>
                                </div>
                            ) : (
                                <div className="mt-2 text-xs font-semibold text-emerald-700">
                                    {ticket.deflected_at_gate
                                        ? `Deflected at Gate and linked to ${ticket.linked_known_issue_id ?? knownIssue.id}.`
                                        : 'Ticket is already closed.'}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Reopen / Agent Guardrail Warning */}
                    {closureRisk.isHighRisk && ticket.status !== 'Closed' && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5">
                            <div className="flex items-center gap-2 text-xs font-bold text-rose-800">
                                <ShieldAlert className="h-4 w-4 text-rose-600" />
                                Closure Quality Guardrail Active
                            </div>
                            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-xs text-rose-900">
                                {closureRisk.reasons.map((r) => (
                                    <li key={r}>{r}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* L1 Config Hint */}
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                            <Wrench className="h-3.5 w-3.5 text-slate-600" />
                            L1 Playbook Hint ({playbook.category})
                        </div>
                        <p className="mt-1 text-xs text-slate-600">{playbook.configFixHint}</p>
                        <p className="mt-1 text-[11px] text-slate-500">
                            {playbook.escalationShareNote}
                        </p>
                    </div>

                    {/* Ticket Lifecycle Timeline */}
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="mb-3 flex items-center gap-1.5 text-xs font-bold text-slate-800">
                            <Clock className="h-3.5 w-3.5 text-slate-600" />
                            Ticket Lifecycle Timeline (IST)
                        </div>
                        <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                            <div>
                                <dt className="text-slate-500">Created At</dt>
                                <dd className="font-mono font-medium text-slate-900">
                                    {ticket.created_at || '—'}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-slate-500">First Response</dt>
                                <dd className="font-mono font-medium text-slate-900">
                                    {ticket.first_response_at || 'Pending'}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-slate-500">Escalated to Eng</dt>
                                <dd className="font-medium text-slate-900">
                                    {ticket.escalated_to_eng}
                                    {ticket.eng_ticket_id ? ` (${ticket.eng_ticket_id})` : ''}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-slate-500">Eng Handoffs / Outcome</dt>
                                <dd
                                    className={`font-medium ${ticket.eng_handoffs >= 2 ? 'text-rose-600' : 'text-slate-900'
                                        }`}
                                >
                                    {ticket.eng_handoffs} handoff{ticket.eng_handoffs === 1 ? '' : 's'}
                                    {ticket.eng_outcome ? ` · ${ticket.eng_outcome}` : ''}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-slate-500">First Closed / Final Closed</dt>
                                <dd className="font-mono font-medium text-slate-900">
                                    {ticket.first_closed_at || '—'} / {ticket.final_closed_at || 'Open'}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-slate-500">Reopens / CSAT</dt>
                                <dd className="font-medium text-slate-900">
                                    <span className={ticket.reopen_count > 0 ? 'text-rose-600 font-bold' : ''}>
                                        {ticket.reopen_count} reopen{ticket.reopen_count === 1 ? '' : 's'}
                                    </span>{' '}
                                    · CSAT: {ticket.csat_score !== null ? `${ticket.csat_score}/5` : 'Not rated'}
                                </dd>
                            </div>
                        </dl>
                        <div className="mt-3 border-t border-slate-100 pt-2 text-[11px] text-slate-500">
                            Age as of {SNAPSHOT_ISO}:{' '}
                            <strong className="text-slate-800">{risk.ageHours.toFixed(1)} hours</strong>
                        </div>
                    </div>

                    {/* Saved Handoff Packet (if generated in v0) */}
                    {ticket.handoff_packet && (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-emerald-900">
                                    Generated Engineering Handoff Packet
                                </span>
                                <button
                                    type="button"
                                    onClick={() => void copyText(ticket.handoff_packet!, 'packet')}
                                    className="inline-flex items-center gap-1 rounded border border-emerald-300 bg-white px-2 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-50"
                                >
                                    {copiedKey === 'packet' ? (
                                        <>
                                            <Check className="h-3 w-3" /> Copied
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="h-3 w-3" /> Copy Packet
                                        </>
                                    )}
                                </button>
                            </div>
                            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-3 font-mono text-[11px] text-slate-800">
                                {ticket.handoff_packet}
                            </pre>
                        </div>
                    )}

                    {/* Resolution Note (if deflected/closed in v0) */}
                    {ticket.resolution_note && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-700">
                            <div className="font-bold text-slate-900">Recorded Resolution / Client Update</div>
                            <p className="mt-1 whitespace-pre-wrap">{ticket.resolution_note}</p>
                        </div>
                    )}
                </div>

                {/* Sticky Footer Actions */}
                <div className="border-t border-slate-200 bg-slate-50 px-6 py-4">
                    {ticket.status === 'Closed' ? (
                        <div className="flex items-center justify-between text-xs text-emerald-700">
                            <span className="inline-flex items-center gap-1.5 font-semibold">
                                <CheckCircle2 className="h-4 w-4" />
                                Ticket Closed {ticket.closure_verified ? '(Guardrail Verified)' : ''}
                            </span>
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-100"
                            >
                                Done
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <button
                                type="button"
                                onClick={() => onOpenGatekeeper(ticket)}
                                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-slate-800"
                            >
                                <AlertTriangle className="h-4 w-4 text-amber-400" />
                                Run Pre-Escalation Gatekeeper
                            </button>
                            <button
                                type="button"
                                onClick={() => onOpenClosure(ticket)}
                                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-800 shadow-xs transition hover:bg-slate-100"
                            >
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                Resolve &amp; Close Ticket
                            </button>
                        </div>
                    )}
                </div>
            </aside>
        </div>
    );
}
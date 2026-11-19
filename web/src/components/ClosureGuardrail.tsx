'use client';

import React, { useMemo, useState } from 'react';
import {
    Check,
    CheckCircle2,
    Copy,
    ShieldAlert,
    X,
} from 'lucide-react';
import {
    buildClientClosureMessage,
    checkClosureRisk,
} from '@/lib/triageEngine';
import { Ticket } from '@/lib/types';

interface ClosureGuardrailProps {
    ticket: Ticket;
    onClose: () => void;
    onConfirmClose: (ticketId: string, clientMessage: string) => void;
}

export function ClosureGuardrail({
    ticket,
    onClose,
    onConfirmClose,
}: ClosureGuardrailProps) {
    const closureRisk = useMemo(() => checkClosureRisk(ticket), [ticket]);

    const [resolutionSummary, setResolutionSummary] = useState<string>(
        'Verified client configuration and confirmed the issue is resolved in production.'
    );
    const [checkRootCause, setCheckRootCause] = useState<boolean>(false);
    const [checkClientNotified, setCheckClientNotified] = useState<boolean>(false);
    const [copiedMsg, setCopiedMsg] = useState<boolean>(false);

    const clientMessage = useMemo(
        () => buildClientClosureMessage(ticket, resolutionSummary),
        [ticket, resolutionSummary]
    );

    const canClose =
        checkRootCause &&
        checkClientNotified &&
        resolutionSummary.trim().length >= 10;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(clientMessage);
            setCopiedMsg(true);
            setTimeout(() => setCopiedMsg(false), 1800);
        } catch {
            // Ignore
        }
    };

    const handleConfirm = async () => {
        if (!canClose) return;
        try {
            await navigator.clipboard.writeText(clientMessage);
        } catch {
            // Ignore
        }
        onConfirmClose(ticket.ticket_id, clientMessage);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[1px]">
            <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="rounded bg-emerald-700 px-2 py-0.5 text-[11px] font-bold text-white">
                                Pre-Closure Guardrail
                            </span>
                            <span className="font-mono text-xs font-semibold text-slate-700">
                                {ticket.ticket_id} · {ticket.assigned_agent}
                            </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                            {ticket.client_name} ({ticket.client_tier}) — {ticket.category}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        aria-label="Close modal"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
                    {closureRisk.isHighRisk ? (
                        <div className="rounded-xl border border-rose-300 bg-rose-50 p-4">
                            <div className="flex items-center gap-2 text-xs font-bold text-rose-800">
                                <ShieldAlert className="h-4 w-4 text-rose-600" />
                                Reopen Prevention Alert Triggered
                            </div>
                            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-xs text-rose-900">
                                {closureRisk.reasons.map((reason) => (
                                    <li key={reason}>{reason}</li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                            Standard closure check: confirm root resolution and copy the client update
                            before marking <strong>{ticket.ticket_id}</strong> closed.
                        </div>
                    )}

                    {/* Resolution Summary */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-800">
                            Resolution Summary (included in client update)
                            <span className="ml-0.5 text-rose-600">*</span>
                        </label>
                        <textarea
                            rows={2}
                            value={resolutionSummary}
                            onChange={(e) => setResolutionSummary(e.target.value)}
                            placeholder="Explain what was fixed so the transport admin can verify..."
                            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                        />
                    </div>

                    {/* 2 Mandatory Guardrail Checkboxes */}
                    <div className="space-y-2">
                        <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 bg-white p-3 text-xs hover:bg-slate-50">
                            <input
                                type="checkbox"
                                checked={checkRootCause}
                                onChange={(e) => setCheckRootCause(e.target.checked)}
                                className="mt-0.5 h-4 w-4 rounded accent-emerald-600"
                            />
                            <span className="font-medium text-slate-800">
                                Root cause verified in RideOps Admin/Telemetry (not just a temporary
                                refresh or unverified guess)
                            </span>
                        </label>

                        <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 bg-white p-3 text-xs hover:bg-slate-50">
                            <input
                                type="checkbox"
                                checked={checkClientNotified}
                                onChange={(e) => setCheckClientNotified(e.target.checked)}
                                className="mt-0.5 h-4 w-4 rounded accent-emerald-600"
                            />
                            <span className="font-medium text-slate-800">
                                Clear verification steps &amp; reopen path shared with{' '}
                                <strong>{ticket.client_name}</strong> transport admin
                            </span>
                        </label>
                    </div>

                    {/* Draft Client Message */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                        <div className="mb-1.5 flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-600">
                                Draft Client Closure Message
                            </span>
                            <button
                                type="button"
                                onClick={() => void handleCopy()}
                                className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                            >
                                {copiedMsg ? (
                                    <>
                                        <Check className="h-3 w-3 text-emerald-600" /> Copied
                                    </>
                                ) : (
                                    <>
                                        <Copy className="h-3 w-3" /> Copy Message
                                    </>
                                )}
                            </button>
                        </div>
                        <pre className="whitespace-pre-wrap font-sans text-xs text-slate-700">
                            {clientMessage}
                        </pre>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-3.5">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={!canClose}
                        onClick={() => void handleConfirm()}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                        <CheckCircle2 className="h-4 w-4" />
                        Copy Message &amp; Close Ticket
                    </button>
                </div>
            </div>
        </div>
    );
}
'use client';

import React, { useMemo, useState } from 'react';
import {
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    Check,
    CheckCircle2,
    Copy,
    Send,
    ShieldCheck,
    Sparkles,
    Wrench,
    X,
} from 'lucide-react';
import {
    buildHandoffPacket,
    buildKnownIssueClientUpdate,
    getPlaybookForCategory,
    matchKnownIssue,
} from '@/lib/triageEngine';
import { Ticket } from '@/lib/types';

interface EscalationGatekeeperProps {
    ticket: Ticket;
    onClose: () => void;
    onDeflectKnownIssue: (
        ticketId: string,
        knownIssueId: string,
        clientMessage: string
    ) => void;
    onResolveConfigAtL1: (ticketId: string, resolutionSummary: string) => void;
    onEscalateWithPacket: (ticketId: string, handoffPacket: string) => void;
}

export function EscalationGatekeeper({
    ticket,
    onClose,
    onDeflectKnownIssue,
    onResolveConfigAtL1,
    onEscalateWithPacket,
}: EscalationGatekeeperProps) {
    const knownIssue = useMemo(() => matchKnownIssue(ticket), [ticket]);
    const playbook = useMemo(
        () => getPlaybookForCategory(ticket.category),
        [ticket.category]
    );

    // Start at Step 1 (Duplicate Check) so the gate visibly runs every time
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});
    const [diagValues, setDiagValues] = useState<Record<string, string>>({});
    const [extraNotes, setExtraNotes] = useState<string>('');
    const [copiedPacket, setCopiedPacket] = useState<boolean>(false);

    const completedChecks = useMemo(
        () => playbook.l1Checks.filter((_, idx) => Boolean(checkedItems[idx])),
        [playbook.l1Checks, checkedItems]
    );

    const allChecksCompleted =
        completedChecks.length === playbook.l1Checks.length;

    const allRequiredDiagFilled = useMemo(
        () =>
            playbook.requiredDiagFields
                .filter((f) => f.required)
                .every((f) => (diagValues[f.key] ?? '').trim().length > 0),
        [playbook.requiredDiagFields, diagValues]
    );

    const packetPreview = useMemo(
        () => buildHandoffPacket(ticket, diagValues, completedChecks, extraNotes),
        [ticket, diagValues, completedChecks, extraNotes]
    );

    const toggleCheck = (index: number) => {
        setCheckedItems((prev) => ({ ...prev, [index]: !prev[index] }));
    };

    const handleDeflectDuplicate = async () => {
        if (!knownIssue) return;
        const msg = buildKnownIssueClientUpdate(ticket, knownIssue);
        try {
            await navigator.clipboard.writeText(msg);
        } catch {
            // Ignore clipboard failures
        }
        onDeflectKnownIssue(ticket.ticket_id, knownIssue.id, msg);
        onClose();
    };

    const handleConfigDeflect = () => {
        const summary = `Resolved at L1 via ${playbook.category} config checklist (${completedChecks.length}/${playbook.l1Checks.length} checks verified) — escalation avoided.`;
        onResolveConfigAtL1(ticket.ticket_id, summary);
        onClose();
    };

    const handleSubmitEscalation = async () => {
        if (!allRequiredDiagFilled) return;
        try {
            await navigator.clipboard.writeText(packetPreview);
            setCopiedPacket(true);
        } catch {
            // Ignore clipboard failures
        }
        onEscalateWithPacket(ticket.ticket_id, packetPreview);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[1px]">
            <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded bg-slate-900 px-2 py-0.5 text-[11px] font-bold text-white">
                                Pre-Escalation Gatekeeper
                            </span>
                            <span className="font-mono text-xs font-semibold text-slate-700">
                                {ticket.ticket_id} · {ticket.priority} · {ticket.client_name}
                            </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                            {ticket.category} — &ldquo;{ticket.description}&rdquo;
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

                {/* Stepper */}
                <div className="grid grid-cols-3 border-b border-slate-200 bg-slate-50 text-xs">
                    {[
                        { num: 1 as const, label: '1. Duplicate Check' },
                        { num: 2 as const, label: '2. L1 Config Checks' },
                        { num: 3 as const, label: '3. Handoff Packet' },
                    ].map(({ num, label }) => {
                        const active = step === num;
                        const done = step > num;
                        return (
                            <div
                                key={num}
                                className={`flex items-center justify-center gap-1.5 border-b-2 px-3 py-2.5 font-semibold ${active
                                        ? 'border-slate-900 bg-white text-slate-900'
                                        : done
                                            ? 'border-emerald-500 text-emerald-700'
                                            : 'border-transparent text-slate-400'
                                    }`}
                            >
                                {done && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                                <span>{label}</span>
                            </div>
                        );
                    })}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5">
                    {/* STEP 1: DUPLICATE KNOWN ISSUE CHECK */}
                    {step === 1 && (
                        <div className="space-y-4">
                            {knownIssue ? (
                                <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-5">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 text-amber-900">
                                            <Sparkles className="h-5 w-5 text-amber-600" />
                                            <h3 className="text-sm font-bold">
                                                Duplicate Known Bug Matched ({knownIssue.engBugId})
                                            </h3>
                                        </div>
                                        <span className="rounded-full bg-amber-200 px-2.5 py-0.5 text-[11px] font-bold text-amber-950">
                                            {knownIssue.status} · ETA {knownIssue.eta}
                                        </span>
                                    </div>

                                    <p className="mt-2 text-sm font-semibold text-amber-950">
                                        {knownIssue.title}
                                    </p>
                                    <p className="mt-2 rounded-lg bg-white/80 p-3 text-xs text-slate-800">
                                        <strong>Recommended L1 Workaround:</strong>{' '}
                                        {knownIssue.l1Workaround}
                                    </p>
                                    <p className="mt-2 text-xs text-amber-900">
                                        <strong>Why this gate matters:</strong> 11.5% of Q3 engineering
                                        escalations were duplicates of already-logged bugs, adding ~67.5h
                                        of unnecessary turnaround time.
                                    </p>

                                    <div className="mt-4 flex flex-wrap items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => void handleDeflectDuplicate()}
                                            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-amber-700"
                                        >
                                            <ShieldCheck className="h-4 w-4" />
                                            Deflect Ticket &amp; Copy Client Update
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setStep(2)}
                                            className="text-xs font-semibold text-slate-600 underline hover:text-slate-900"
                                        >
                                            Confirmed different symptom — continue to L1 checks →
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                                    <div className="flex items-center gap-2 text-emerald-900">
                                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                                        <h3 className="text-sm font-bold">
                                            No Active Known-Issue Duplicate Detected
                                        </h3>
                                    </div>
                                    <p className="mt-1.5 text-xs text-emerald-800">
                                        Scanned active engineering bugs for <strong>{ticket.category}</strong>{' '}
                                        and description keywords. Proceed to the mandatory L1 config checklist
                                        to verify this is not an L1-resolvable configuration issue.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setStep(2)}
                                        className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                                    >
                                        Proceed to L1 Config Checklist
                                        <ArrowRight className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 2: MANDATORY L1 CONFIG CHECKLIST */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                                    <Wrench className="h-3.5 w-3.5 text-slate-600" />
                                    {playbook.category} — Mandatory Pre-Escalation Checks
                                </div>
                                <p className="mt-1 text-xs text-slate-600">{playbook.configFixHint}</p>
                            </div>

                            <div className="space-y-2">
                                {playbook.l1Checks.map((check, idx) => {
                                    const checked = Boolean(checkedItems[idx]);
                                    return (
                                        <label
                                            key={check}
                                            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-xs transition ${checked
                                                    ? 'border-emerald-300 bg-emerald-50/60 text-slate-900'
                                                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                                }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => toggleCheck(idx)}
                                                className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-emerald-600"
                                            />
                                            <span className="leading-relaxed font-medium">{check}</span>
                                        </label>
                                    );
                                })}
                            </div>

                            {/* Config Deflection Exit Ramp */}
                            <div className="flex flex-col gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <div className="text-xs font-bold text-emerald-900">
                                        Fixed via one of the L1 checks above?
                                    </div>
                                    <div className="text-[11px] text-emerald-800">
                                        Intercepts 17.3% config-bounce escalations (~5.4 days saved per ticket).
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleConfigDeflect}
                                    className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-700"
                                >
                                    <ShieldCheck className="h-4 w-4" />
                                    Resolve as L1 Config Fix
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: STRUCTURED ENGINEERING HANDOFF PACKET */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                                <div className="flex items-center gap-1.5 font-bold">
                                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                                    Zero Missing-Info Bounces
                                </div>
                                <p className="mt-0.5">
                                    All required fields below must be filled before escalation unlocks. This
                                    targets the 18.3% of escalations returned for insufficient info (median
                                    121.1h resolution).
                                </p>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                {playbook.requiredDiagFields.map((field) => (
                                    <div key={field.key} className="sm:col-span-1">
                                        <label className="block text-xs font-semibold text-slate-800">
                                            {field.label}
                                            {field.required && <span className="ml-0.5 text-rose-600">*</span>}
                                        </label>
                                        <input
                                            type="text"
                                            value={diagValues[field.key] ?? ''}
                                            onChange={(e) =>
                                                setDiagValues((prev) => ({
                                                    ...prev,
                                                    [field.key]: e.target.value,
                                                }))
                                            }
                                            placeholder={field.placeholder}
                                            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none"
                                        />
                                    </div>
                                ))}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-800">
                                    Additional L1 Notes / Log Link (Optional)
                                </label>
                                <textarea
                                    rows={2}
                                    value={extraNotes}
                                    onChange={(e) => setExtraNotes(e.target.value)}
                                    placeholder="Any client urgency context, screenshot URL, or workaround attempted..."
                                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none"
                                />
                            </div>

                            {/* Live Handoff Packet Preview */}
                            <div className="rounded-xl border border-slate-200 bg-slate-900 p-3.5 text-slate-100">
                                <div className="mb-2 flex items-center justify-between text-[11px] font-semibold text-slate-300">
                                    <span>Live Engineering Handoff Packet Preview</span>
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            try {
                                                await navigator.clipboard.writeText(packetPreview);
                                                setCopiedPacket(true);
                                                setTimeout(() => setCopiedPacket(false), 1800);
                                            } catch {
                                                // Ignore
                                            }
                                        }}
                                        className="inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-700"
                                    >
                                        {copiedPacket ? (
                                            <>
                                                <Check className="h-3 w-3 text-emerald-400" /> Copied
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="h-3 w-3" /> Copy Preview
                                            </>
                                        )}
                                    </button>
                                </div>
                                <pre className="max-h-40 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-emerald-300">
                                    {packetPreview}
                                </pre>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3.5">
                    <div>
                        {step > 1 && (
                            <button
                                type="button"
                                onClick={() => setStep((s) => (s === 3 ? 2 : 1))}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                            >
                                <ArrowLeft className="h-3.5 w-3.5" />
                                Back
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
                        >
                            Cancel
                        </button>

                        {step === 2 && (
                            <button
                                type="button"
                                disabled={!allChecksCompleted}
                                onClick={() => setStep(3)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                            >
                                Next: Build Handoff Packet ({completedChecks.length}/
                                {playbook.l1Checks.length})
                                <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                        )}

                        {step === 3 && (
                            <button
                                type="button"
                                disabled={!allRequiredDiagFilled}
                                onClick={() => void handleSubmitEscalation()}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                            >
                                <Send className="h-3.5 w-3.5" />
                                Copy Packet &amp; Escalate to Engineering
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
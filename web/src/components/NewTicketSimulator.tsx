'use client';

import React, { useMemo, useState } from 'react';
import { Plus, Sparkles, X, Zap } from 'lucide-react';
import { SNAPSHOT_ISO } from '@/lib/metricsCalc';
import { matchKnownIssue } from '@/lib/triageEngine';
import { ClientTier, Ticket, TicketPriority } from '@/lib/types';

interface NewTicketSimulatorProps {
    existingTickets: Ticket[];
    onClose: () => void;
    onCreateTicket: (ticket: Ticket) => void;
}

const CATEGORIES = [
    'Roster / booking not syncing',
    'Live tracking / GPS incorrect',
    'Report export failing',
    'OTP / boarding issue',
    'Billing / invoice discrepancy',
    'Cab delay / no-show complaint',
    'Employee address / geocode change',
    'Login / access issue',
    'How-to / feature request',
    'Driver / vehicle compliance docs',
];

const AGENTS = [
    'Ananya R',
    'Arjun K',
    'Karan B',
    'Neha P',
    'Priya D',
    'Rahul T',
    'Sneha M',
    'Vikram S',
];

const CHANNELS = ['Email', 'Client portal', 'Phone', 'WhatsApp'];

interface DemoPreset {
    id: string;
    badge: string;
    label: string;
    client_id: string;
    client_name: string;
    client_tier: ClientTier;
    channel: string;
    category: string;
    priority: TicketPriority;
    assigned_agent: string;
    description: string;
}

const DEMO_PRESETS: DemoPreset[] = [
    {
        id: 'preset-duplicate',
        badge: 'Tests Known-Issue Deflection',
        label: 'Preset A: Known Duplicate Bug',
        client_id: 'CL-113',
        client_name: 'Horizon Labs',
        client_tier: 'Enterprise',
        channel: 'Email',
        category: 'Report export failing',
        priority: 'P2',
        assigned_agent: 'Rahul T',
        description:
            'Monthly trip report download stuck at loading for September billing reconciliation',
    },
    {
        id: 'preset-config',
        badge: 'Tests Config Checklist / Rahul T',
        label: 'Preset B: Roster Config Issue',
        client_id: 'CL-153',
        client_name: 'Orion Financial',
        client_tier: 'Enterprise',
        channel: 'WhatsApp',
        category: 'Roster / booking not syncing',
        priority: 'P2',
        assigned_agent: 'Rahul T',
        description:
            'Employees booked for 22:00 night shift not showing in tomorrow roster after shift update',
    },
    {
        id: 'preset-real-esc',
        badge: 'Tests P1 Handoff Packet',
        label: 'Preset C: Real P1 Eng Bug',
        client_id: 'CL-010',
        client_name: 'Meridian Labs',
        client_tier: 'Enterprise',
        channel: 'Phone',
        category: 'OTP / boarding issue',
        priority: 'P1',
        assigned_agent: 'Priya D',
        description:
            'Boarding OTP SMS failing across all Airtel employee numbers at Pune hub since 06:00 IST',
    },
];

export function NewTicketSimulator({
    existingTickets,
    onClose,
    onCreateTicket,
}: NewTicketSimulatorProps) {
    const [clientName, setClientName] = useState<string>('Horizon Labs');
    const [clientId, setClientId] = useState<string>('CL-113');
    const [clientTier, setClientTier] = useState<ClientTier>('Enterprise');
    const [channel, setChannel] = useState<string>('Email');
    const [category, setCategory] = useState<string>('Report export failing');
    const [priority, setPriority] = useState<TicketPriority>('P2');
    const [assignedAgent, setAssignedAgent] = useState<string>('Rahul T');
    const [description, setDescription] = useState<string>(
        'Monthly trip report download stuck at loading for September billing reconciliation'
    );

    const liveMatch = useMemo(
        () => matchKnownIssue({ category, description }),
        [category, description]
    );

    const nextTicketId = useMemo(() => {
        let maxNum = 11444;
        for (const t of existingTickets) {
            const m = t.ticket_id.match(/SUP-(\d+)/);
            if (m) {
                const n = Number(m[1]);
                if (n > maxNum) maxNum = n;
            }
        }
        return `SUP-${maxNum + 1}`;
    }, [existingTickets]);

    const applyPreset = (preset: DemoPreset) => {
        setClientId(preset.client_id);
        setClientName(preset.client_name);
        setClientTier(preset.client_tier);
        setChannel(preset.channel);
        setCategory(preset.category);
        setPriority(preset.priority);
        setAssignedAgent(preset.assigned_agent);
        setDescription(preset.description);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!clientName.trim() || !description.trim()) return;

        const newTicket: Ticket = {
            ticket_id: nextTicketId,
            created_at: SNAPSHOT_ISO,
            channel,
            client_id: clientId.trim() || 'CL-201',
            client_name: clientName.trim(),
            client_tier: clientTier,
            category,
            priority,
            description: description.trim(),
            assigned_agent: assignedAgent,
            first_response_at: '',
            escalated_to_eng: 'No',
            eng_ticket_id: '',
            eng_handoffs: 0,
            eng_outcome: '',
            status: 'Open - with L1',
            first_closed_at: '',
            final_closed_at: '',
            reopen_count: 0,
            csat_score: null,
        };

        onCreateTicket(newTicket);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[1px]">
            <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-amber-500" />
                            <h2 className="text-sm font-bold text-slate-900">
                                Simulate Incoming Support Ticket ({nextTicketId})
                            </h2>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">
                            Pick a demo preset or type a custom issue to test real-time triage,
                            duplicate detection, and gatekeeper deflection.
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

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5">
                    {/* 3 One-Click Presets */}
                    <div className="mb-5">
                        <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                            Quick Demo Presets
                        </div>
                        <div className="grid gap-2 sm:grid-cols-3">
                            {DEMO_PRESETS.map((preset) => (
                                <button
                                    key={preset.id}
                                    type="button"
                                    onClick={() => applyPreset(preset)}
                                    className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-left transition hover:border-slate-400 hover:bg-white"
                                >
                                    <div className="text-[10px] font-bold uppercase text-indigo-600">
                                        {preset.badge}
                                    </div>
                                    <div className="mt-0.5 text-xs font-bold text-slate-900">
                                        {preset.label}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Form Fields */}
                    <div className="grid gap-3.5 sm:grid-cols-2">
                        <div>
                            <label className="block text-xs font-semibold text-slate-800">
                                Client Name
                            </label>
                            <input
                                type="text"
                                required
                                value={clientName}
                                onChange={(e) => setClientName(e.target.value)}
                                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-semibold text-slate-800">
                                    Client Tier
                                </label>
                                <select
                                    value={clientTier}
                                    onChange={(e) => setClientTier(e.target.value as ClientTier)}
                                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                                >
                                    <option value="Enterprise">Enterprise</option>
                                    <option value="Mid-market">Mid-market</option>
                                    <option value="SMB">SMB</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-800">
                                    Priority
                                </label>
                                <select
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value as TicketPriority)}
                                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                                >
                                    <option value="P1">P1 (Critical)</option>
                                    <option value="P2">P2 (High)</option>
                                    <option value="P3">P3 (Medium)</option>
                                    <option value="P4">P4 (Low)</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-800">
                                Category
                            </label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                            >
                                {CATEGORIES.map((c) => (
                                    <option key={c} value={c}>
                                        {c}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-semibold text-slate-800">
                                    Assigned L1 Agent
                                </label>
                                <select
                                    value={assignedAgent}
                                    onChange={(e) => setAssignedAgent(e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                                >
                                    {AGENTS.map((a) => (
                                        <option key={a} value={a}>
                                            {a}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-800">
                                    Channel
                                </label>
                                <select
                                    value={channel}
                                    onChange={(e) => setChannel(e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                                >
                                    {CHANNELS.map((ch) => (
                                        <option key={ch} value={ch}>
                                            {ch}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold text-slate-800">
                                Issue Description
                            </label>
                            <textarea
                                rows={3}
                                required
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Describe the transport admin's reported issue..."
                                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Live Triage Engine Pre-Check Banner */}
                    <div className="mt-4">
                        {liveMatch ? (
                            <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950">
                                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                                <div>
                                    <strong>Live Matcher Preview:</strong> Automatically matches active
                                    known bug <strong>{liveMatch.engBugId}</strong> ({liveMatch.title}).
                                    L1 will be prompted to deflect immediately upon opening.
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                                <strong>Live Matcher Preview:</strong> No known-issue duplicate matched —
                                ticket will route through the <strong>{category}</strong> L1 playbook
                                gatekeeper.
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-slate-800"
                        >
                            <Plus className="h-4 w-4" />
                            Inject Ticket &amp; Open Triage Drawer
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
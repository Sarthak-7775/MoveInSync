'use client';

import React, { useMemo, useState } from 'react';
import { Plus, ShieldCheck } from 'lucide-react';
import { ClosureGuardrail } from '@/components/ClosureGuardrail';
import { EscalationGatekeeper } from '@/components/EscalationGatekeeper';
import { NewTicketSimulator } from '@/components/NewTicketSimulator';
import { TicketActionDrawer } from '@/components/TicketActionDrawer';
import { TicketQueue } from '@/components/TicketQueue';
import { useTickets } from '@/context/TicketsContext';
import { SNAPSHOT_ISO } from '@/lib/metricsCalc';
import { Ticket } from '@/lib/types';

export default function TriageWorkbenchPage() {
  const { tickets, loading, error, metrics, updateTicket, addTicket } =
    useTickets();

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [gatekeeperTicketId, setGatekeeperTicketId] = useState<string | null>(
    null
  );
  const [closureTicketId, setClosureTicketId] = useState<string | null>(null);
  const [simulatorOpen, setSimulatorOpen] = useState<boolean>(false);
  const [toast, setToast] = useState<string | null>(null);

  const selectedTicket = useMemo(
    () => tickets.find((t) => t.ticket_id === selectedTicketId) ?? null,
    [tickets, selectedTicketId]
  );

  const gatekeeperTicket = useMemo(
    () => tickets.find((t) => t.ticket_id === gatekeeperTicketId) ?? null,
    [tickets, gatekeeperTicketId]
  );

  const closureTicket = useMemo(
    () => tickets.find((t) => t.ticket_id === closureTicketId) ?? null,
    [tickets, closureTicketId]
  );

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleDeflectKnownIssue = (
    ticketId: string,
    knownIssueId: string,
    clientMessage: string
  ) => {
    const target = tickets.find((t) => t.ticket_id === ticketId);
    updateTicket(ticketId, {
      status: 'Closed',
      final_closed_at: SNAPSHOT_ISO,
      first_closed_at: target?.first_closed_at || SNAPSHOT_ISO,
      deflected_at_gate: true,
      linked_known_issue_id: knownIssueId,
      closure_verified: true,
      resolution_note: clientMessage,
    });
    showToast(
      `${ticketId} deflected via Known Bug (${knownIssueId}) — client update copied & backlog updated.`
    );
  };

  const handleResolveConfigAtL1 = (
    ticketId: string,
    resolutionSummary: string
  ) => {
    const target = tickets.find((t) => t.ticket_id === ticketId);
    updateTicket(ticketId, {
      status: 'Closed',
      final_closed_at: SNAPSHOT_ISO,
      first_closed_at: target?.first_closed_at || SNAPSHOT_ISO,
      deflected_at_gate: true,
      closure_verified: true,
      resolution_note: resolutionSummary,
    });
    showToast(
      `${ticketId} resolved at L1 via config playbook — engineering escalation avoided.`
    );
  };

  const handleEscalateWithPacket = (
    ticketId: string,
    handoffPacket: string
  ) => {
    const target = tickets.find((t) => t.ticket_id === ticketId);
    const nextEngId =
      target?.eng_ticket_id ||
      `ENG-${5000 + Math.floor(100 + Math.random() * 899)}`;

    updateTicket(ticketId, {
      escalated_to_eng: 'Yes',
      status: 'Open - with Engineering',
      eng_ticket_id: nextEngId,
      eng_handoffs: (target?.eng_handoffs ?? 0) + 1,
      handoff_packet: handoffPacket,
    });
    showToast(
      `${ticketId} escalated cleanly as ${nextEngId} — structured Handoff Packet copied & attached.`
    );
  };

  const handleConfirmClose = (ticketId: string, clientMessage: string) => {
    const target = tickets.find((t) => t.ticket_id === ticketId);
    updateTicket(ticketId, {
      status: 'Closed',
      first_closed_at: target?.first_closed_at || SNAPSHOT_ISO,
      final_closed_at: SNAPSHOT_ISO,
      closure_verified: true,
      resolution_note: clientMessage,
    });
    showToast(
      `${ticketId} closed after guardrail verification — client message copied to clipboard.`
    );
  };

  const handleCreateSimulatedTicket = (newTicket: Ticket) => {
    addTicket(newTicket);
    setSelectedTicketId(newTicket.ticket_id);
    showToast(
      `Injected live ticket ${newTicket.ticket_id} (${newTicket.client_name}) into open queue.`
    );
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-600">
        Loading 1,444 RideOps support tickets...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
        <strong>Dataset Error:</strong> {error}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header Row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            L1 Triage &amp; Escalation Workbench
          </h1>
          <p className="text-xs text-slate-600">
            Risk-ranked live queue as of <strong>30 Sep 2026</strong> · Intercepts
            avoidable escalations (52.1% baseline) and premature closures before they hit
            engineering or reopen.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setSimulatorOpen(true)}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          Simulate Incoming Ticket
        </button>
      </div>

      {/* Live Toast Notification */}
      {toast && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-900">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
          {toast}
        </div>
      )}

      {/* Compact 4-Card Live KPI Strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Open Backlog
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold ${metrics.openBacklog <= 30 ? 'text-emerald-600' : 'text-rose-600'
                }`}
            >
              {metrics.openBacklog}
            </span>
            <span className="text-xs text-slate-500">target ≤ 30</span>
          </div>
          <div className="mt-1 text-xs text-slate-600">
            <strong>{metrics.openEscalated}</strong> escalated ·{' '}
            <strong>{metrics.openL1Only}</strong> L1 only
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Open Aged &gt; 48h
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {metrics.openAgedOver48h}
            </span>
            <span className="text-xs font-semibold text-rose-600">
              ({metrics.openAgedOver48hPct}%)
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-600">
            Target &lt; 25% of open queue
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Avoidable Escalations
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-600">
              {metrics.avoidableEscalationRatePct}%
            </span>
            <span className="text-xs text-slate-500">target &lt; 20%</span>
          </div>
          <div className="mt-1 text-xs text-slate-600">
            Ping-pong (2+): <strong>{metrics.pingPongRatePct}%</strong> · Deflected:{' '}
            <strong className="text-emerald-700">{metrics.deflectedCount}</strong>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Quality Guardrails
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {metrics.reopenRatePct}%
            </span>
            <span className="text-xs text-slate-500">reopen</span>
            <span className="text-slate-300">|</span>
            <span className="text-lg font-bold text-slate-900">
              {metrics.avgCsat}
            </span>
            <span className="text-xs text-slate-500">CSAT</span>
          </div>
          <div className="mt-1 text-xs text-slate-600">
            L1 med {metrics.medianResL1Hrs}h vs Esc {metrics.medianResEscHrs}h
          </div>
        </div>
      </div>

      {/* Main Filterable Queue */}
      <TicketQueue
        tickets={tickets}
        selectedTicketId={selectedTicketId}
        onSelectTicket={(ticket) => setSelectedTicketId(ticket.ticket_id)}
      />

      {/* Slide-Over Action Drawer */}
      <TicketActionDrawer
        ticket={selectedTicket}
        onClose={() => setSelectedTicketId(null)}
        onDeflectKnownIssue={handleDeflectKnownIssue}
        onOpenGatekeeper={(ticket) => setGatekeeperTicketId(ticket.ticket_id)}
        onOpenClosure={(ticket) => setClosureTicketId(ticket.ticket_id)}
      />

      {/* Pre-Escalation Gatekeeper Modal */}
      {gatekeeperTicket && (
        <EscalationGatekeeper
          ticket={gatekeeperTicket}
          onClose={() => setGatekeeperTicketId(null)}
          onDeflectKnownIssue={handleDeflectKnownIssue}
          onResolveConfigAtL1={handleResolveConfigAtL1}
          onEscalateWithPacket={handleEscalateWithPacket}
        />
      )}

      {/* Pre-Closure Guardrail Modal */}
      {closureTicket && (
        <ClosureGuardrail
          ticket={closureTicket}
          onClose={() => setClosureTicketId(null)}
          onConfirmClose={handleConfirmClose}
        />
      )}

      {/* Incoming Ticket Simulator Modal */}
      {simulatorOpen && (
        <NewTicketSimulator
          existingTickets={tickets}
          onClose={() => setSimulatorOpen(false)}
          onCreateTicket={handleCreateSimulatedTicket}
        />
      )}
    </div>
  );
}
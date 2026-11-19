export type ClientTier = 'Enterprise' | 'Mid-market' | 'SMB';
export type TicketPriority = 'P1' | 'P2' | 'P3' | 'P4';
export type Priority = TicketPriority;
export type TicketStatus =
  | 'Closed'
  | 'Open - with L1'
  | 'Open - with Engineering';

export interface Ticket {
  ticket_id: string;
  created_at: string;
  channel: string;
  client_id: string;
  client_name: string;
  client_tier: ClientTier;
  category: string;
  priority: TicketPriority;
  description: string;
  assigned_agent: string;
  first_response_at: string;
  escalated_to_eng: 'Yes' | 'No';
  eng_ticket_id: string;
  eng_handoffs: number;
  eng_outcome: string;
  status: TicketStatus;
  first_closed_at: string;
  final_closed_at: string;
  reopen_count: number;
  csat_score: number | null;

  // Runtime v0 workflow fields (persisted in localStorage)
  linked_known_issue_id?: string;
  handoff_packet?: string;
  closure_verified?: boolean;
  deflected_at_gate?: boolean;
  resolution_note?: string;
}

export interface DashboardMetrics {
  totalTickets: number;
  openBacklog: number;
  openEscalated: number;
  openL1Only: number;
  openAgedOver48h: number;
  openAgedOver48hPct: number;
  escalationRatePct: number;
  avoidableEscalationRatePct: number;
  pingPongRatePct: number;
  reopenRatePct: number;
  avgCsat: number;
  csatResponseRatePct: number;
  deflectedCount: number;
  medianResL1Hrs: number;
  medianResEscHrs: number;
}

export interface WeeklyPoint {
  weekStart: string;
  weekLabel: string;
  created: number;
  eowOpen: number;
  eowOpenEscalated: number;
  eowOpenL1: number;
  eowOpenGt48h: number;
  escalatedCount: number;
  avoidableEscPct: number;
  pingPongPct: number;
  reopenRatePct: number;
  avgCsat: number | null;
}

export interface AgentStat {
  agent: string;
  tickets: number;
  openCount: number;
  medFirstCloseHrs: number;
  escRatePct: number;
  fixedRatePct: number;
  reopenRatePct: number;
  reopenEvents: number;
  avgCsat: number;
  coachingFlag: 'High Reopen Risk' | 'Over-Escalating' | 'On Track';
}
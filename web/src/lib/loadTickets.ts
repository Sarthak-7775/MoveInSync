import Papa from 'papaparse';
import { ClientTier, Ticket, TicketPriority, TicketStatus } from './types';

interface RawCsvRow {
  ticket_id?: string;
  created_at?: string;
  channel?: string;
  client_id?: string;
  client_name?: string;
  client_tier?: string;
  category?: string;
  priority?: string;
  description?: string;
  assigned_agent?: string;
  first_response_at?: string;
  escalated_to_eng?: string;
  eng_ticket_id?: string;
  eng_handoffs?: string;
  eng_outcome?: string;
  status?: string;
  first_closed_at?: string;
  final_closed_at?: string;
  reopen_count?: string;
  csat_score?: string;
}

export function parseTicketDate(value?: string | null): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.includes('T') ? trimmed : trimmed.replace(' ', 'T');
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function hoursBetween(start: Date | null, end: Date | null): number | null {
  if (!start || !end) return null;
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
}

export async function loadTicketsFromCsv(): Promise<Ticket[]> {
  const response = await fetch('/data/rideops_support_tickets.csv', {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(
      `Failed to load CSV (${response.status}). Make sure web/public/data/rideops_support_tickets.csv exists.`
    );
  }

  const csvText = await response.text();
  const parsed = Papa.parse<RawCsvRow>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0 && parsed.data.length === 0) {
    throw new Error(`CSV parse error: ${parsed.errors[0].message}`);
  }

  return parsed.data
    .filter((row) => row.ticket_id && row.ticket_id.trim().length > 0)
    .map((row): Ticket => {
      const csatRaw = row.csat_score?.trim() ?? '';
      const csatNum = csatRaw === '' ? null : Number(csatRaw);

      return {
        ticket_id: (row.ticket_id ?? '').trim(),
        created_at: (row.created_at ?? '').trim(),
        channel: (row.channel ?? '').trim(),
        client_id: (row.client_id ?? '').trim(),
        client_name: (row.client_name ?? '').trim(),
        client_tier: ((row.client_tier ?? 'Mid-market').trim() as ClientTier),
        category: (row.category ?? '').trim(),
        priority: ((row.priority ?? 'P3').trim() as TicketPriority),
        description: (row.description ?? '').trim(),
        assigned_agent: (row.assigned_agent ?? '').trim(),
        first_response_at: (row.first_response_at ?? '').trim(),
        escalated_to_eng:
          (row.escalated_to_eng ?? '').trim() === 'Yes' ? 'Yes' : 'No',
        eng_ticket_id: (row.eng_ticket_id ?? '').trim(),
        eng_handoffs: Number(row.eng_handoffs ?? 0) || 0,
        eng_outcome: (row.eng_outcome ?? '').trim(),
        status: ((row.status ?? 'Open - with L1').trim() as TicketStatus),
        first_closed_at: (row.first_closed_at ?? '').trim(),
        final_closed_at: (row.final_closed_at ?? '').trim(),
        reopen_count: Number(row.reopen_count ?? 0) || 0,
        csat_score: csatNum !== null && !Number.isNaN(csatNum) ? csatNum : null,
      };
    });
}

export const loadTickets = loadTicketsFromCsv;


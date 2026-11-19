import { hoursBetween, parseTicketDate } from './loadTickets';
import { AgentStat, DashboardMetrics, Ticket, WeeklyPoint } from './types';

export const SNAPSHOT_ISO = '2026-09-30 23:59';
export const SNAPSHOT_DATE = new Date('2026-09-30T23:59:00');

export const AVOIDABLE_OUTCOMES = new Set<string>([
  'Insufficient info - returned to L1',
  'Config issue - returned to L1',
  'Duplicate of known issue',
  'Not a bug - how-to',
]);

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function getMondayStart(date: Date): Date {
  const day = date.getDay(); // 0=Sun, 1=Mon
  const diff = day === 0 ? -6 : 1 - day;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + diff, 0, 0, 0, 0);
}

function formatYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatShortLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function getTicketAgeHours(ticket: Ticket, asOf: Date = SNAPSHOT_DATE): number {
  const created = parseTicketDate(ticket.created_at);
  if (!created) return 0;
  const end =
    ticket.status === 'Closed'
      ? parseTicketDate(ticket.final_closed_at) ?? asOf
      : asOf;
  return Math.max(0, round1((end.getTime() - created.getTime()) / (1000 * 60 * 60)));
}

export function computeDashboardMetrics(tickets: Ticket[]): DashboardMetrics {
  const totalTickets = tickets.length;
  const openTickets = tickets.filter((t) => t.status !== 'Closed');
  const openBacklog = openTickets.length;
  const openEscalated = openTickets.filter((t) => t.escalated_to_eng === 'Yes').length;
  const openL1Only = openBacklog - openEscalated;

  const openAgedOver48h = openTickets.filter((t) => {
    const hrs = hoursBetween(parseTicketDate(t.created_at), SNAPSHOT_DATE);
    return hrs !== null && hrs > 48;
  }).length;

  const escalated = tickets.filter((t) => t.escalated_to_eng === 'Yes');
  const avoidableEsc = escalated.filter((t) => AVOIDABLE_OUTCOMES.has(t.eng_outcome));
  const pingPongEsc = escalated.filter((t) => t.eng_handoffs >= 2);
  const reopened = tickets.filter((t) => t.reopen_count > 0);
  const rated = tickets.filter((t) => t.csat_score !== null);

  const avgCsat =
    rated.length > 0
      ? rated.reduce((sum, t) => sum + (t.csat_score ?? 0), 0) / rated.length
      : 0;

  const l1CloseHrs: number[] = [];
  const escCloseHrs: number[] = [];
  for (const t of tickets) {
    const h = hoursBetween(
      parseTicketDate(t.created_at),
      parseTicketDate(t.final_closed_at)
    );
    if (h !== null) {
      if (t.escalated_to_eng === 'Yes') escCloseHrs.push(h);
      else l1CloseHrs.push(h);
    }
  }

  return {
    totalTickets,
    openBacklog,
    openEscalated,
    openL1Only,
    openAgedOver48h,
    openAgedOver48hPct: openBacklog > 0 ? round1((openAgedOver48h / openBacklog) * 100) : 0,
    escalationRatePct: totalTickets > 0 ? round1((escalated.length / totalTickets) * 100) : 0,
    avoidableEscalationRatePct:
      escalated.length > 0 ? round1((avoidableEsc.length / escalated.length) * 100) : 0,
    pingPongRatePct:
      escalated.length > 0 ? round1((pingPongEsc.length / escalated.length) * 100) : 0,
    reopenRatePct: totalTickets > 0 ? round1((reopened.length / totalTickets) * 100) : 0,
    avgCsat: round2(avgCsat),
    csatResponseRatePct: totalTickets > 0 ? round1((rated.length / totalTickets) * 100) : 0,
    deflectedCount: tickets.filter((t) => t.deflected_at_gate === true).length,
    medianResL1Hrs: round1(median(l1CloseHrs)),
    medianResEscHrs: round1(median(escCloseHrs)),
  };
}

export function computeWeeklySeries(tickets: Ticket[]): WeeklyPoint[] {
  const parsedDates = tickets.map((t) => ({
    ticket: t,
    created: parseTicketDate(t.created_at),
    finalClosed: parseTicketDate(t.final_closed_at),
  }));

  const weekMap = new Map<string, { start: Date; items: Ticket[] }>();

  for (const { ticket, created } of parsedDates) {
    if (!created) continue;
    const mon = getMondayStart(created);
    const key = formatYMD(mon);
    if (!weekMap.has(key)) {
      weekMap.set(key, { start: mon, items: [] });
    }
    weekMap.get(key)!.items.push(ticket);
  }

  const sortedWeeks = Array.from(weekMap.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  return sortedWeeks.map(([weekStart, { start, items }]) => {
    const rawEnd = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate() + 6,
      23,
      59,
      0,
      0
    );
    const wkEnd = rawEnd.getTime() > SNAPSHOT_DATE.getTime() ? SNAPSHOT_DATE : rawEnd;

    let eowOpen = 0;
    let eowOpenEscalated = 0;
    let eowOpenGt48h = 0;

    for (const { ticket, created, finalClosed } of parsedDates) {
      if (!created || created.getTime() > wkEnd.getTime()) continue;
      const isOpenAtEnd =
        ticket.status !== 'Closed'
          ? true
          : !finalClosed || finalClosed.getTime() > wkEnd.getTime();

      if (isOpenAtEnd) {
        eowOpen += 1;
        if (ticket.escalated_to_eng === 'Yes') eowOpenEscalated += 1;
        const ageHrs = (wkEnd.getTime() - created.getTime()) / (1000 * 60 * 60);
        if (ageHrs > 48) eowOpenGt48h += 1;
      }
    }

    const esc = items.filter((t) => t.escalated_to_eng === 'Yes');
    const avoid = esc.filter((t) => AVOIDABLE_OUTCOMES.has(t.eng_outcome));
    const pingPong = esc.filter((t) => t.eng_handoffs >= 2);
    const reopens = items.filter((t) => t.reopen_count > 0);
    const rated = items.filter((t) => t.csat_score !== null);

    return {
      weekStart,
      weekLabel: formatShortLabel(start),
      created: items.length,
      eowOpen,
      eowOpenEscalated,
      eowOpenL1: eowOpen - eowOpenEscalated,
      eowOpenGt48h,
      escalatedCount: esc.length,
      avoidableEscPct: esc.length > 0 ? round1((avoid.length / esc.length) * 100) : 0,
      pingPongPct: esc.length > 0 ? round1((pingPong.length / esc.length) * 100) : 0,
      reopenRatePct: items.length > 0 ? round1((reopens.length / items.length) * 100) : 0,
      avgCsat:
        rated.length > 0
          ? round2(
            rated.reduce((s, t) => s + (t.csat_score ?? 0), 0) / rated.length
          )
          : null,
    };
  });
}

export function computeAgentStats(tickets: Ticket[]): AgentStat[] {
  const byAgent = new Map<string, Ticket[]>();
  for (const t of tickets) {
    const key = t.assigned_agent || 'Unassigned';
    if (!byAgent.has(key)) byAgent.set(key, []);
    byAgent.get(key)!.push(t);
  }

  return Array.from(byAgent.entries())
    .map(([agent, list]): AgentStat => {
      const esc = list.filter((t) => t.escalated_to_eng === 'Yes');
      const fixed = esc.filter((t) => t.eng_outcome === 'Fixed');
      const reopened = list.filter((t) => t.reopen_count > 0);
      const reopenEvents = list.reduce((s, t) => s + t.reopen_count, 0);
      const rated = list.filter((t) => t.csat_score !== null);

      const firstCloseHrs = list
        .map((t) =>
          hoursBetween(
            parseTicketDate(t.created_at),
            parseTicketDate(t.first_closed_at)
          )
        )
        .filter((v): v is number => v !== null);

      const escRatePct = list.length > 0 ? round1((esc.length / list.length) * 100) : 0;
      const fixedRatePct = esc.length > 0 ? round1((fixed.length / esc.length) * 100) : 0;
      const reopenRatePct =
        list.length > 0 ? round1((reopened.length / list.length) * 100) : 0;
      const avgCsat =
        rated.length > 0
          ? round2(rated.reduce((s, t) => s + (t.csat_score ?? 0), 0) / rated.length)
          : 0;

      let coachingFlag: AgentStat['coachingFlag'] = 'On Track';
      if (reopenRatePct > 15) {
        coachingFlag = 'High Reopen Risk';
      } else if (escRatePct > 45 && fixedRatePct < 35) {
        coachingFlag = 'Over-Escalating';
      }

      return {
        agent,
        tickets: list.length,
        openCount: list.filter((t) => t.status !== 'Closed').length,
        medFirstCloseHrs: round1(median(firstCloseHrs)),
        escRatePct,
        fixedRatePct,
        reopenRatePct,
        reopenEvents,
        avgCsat,
        coachingFlag,
      };
    })
    .sort((a, b) => b.reopenRatePct - a.reopenRatePct);
}
import {
    CATEGORY_PLAYBOOKS,
    CategoryPlaybook,
    KNOWN_ISSUES,
    KnownIssue,
} from '@/data/playbooks';
import { getTicketAgeHours } from '@/lib/metricsCalc';
import { Ticket } from '@/lib/types';

export type RiskLevel = 'Critical' | 'High' | 'Medium' | 'Low';

export interface RiskAssessment {
    score: number;
    level: RiskLevel;
    ageHours: number;
    matchedKnownIssue: KnownIssue | null;
    badges: string[];
}

export interface ClosureRiskAssessment {
    isHighRisk: boolean;
    reasons: string[];
}

export function matchKnownIssue(
    ticket: Pick<Ticket, 'category' | 'description'>
): KnownIssue | null {
    const desc = (ticket.description || '').toLowerCase();
    if (!desc) return null;

    // First pass: exact category + keyword match
    for (const issue of KNOWN_ISSUES) {
        if (issue.category !== ticket.category) continue;
        if (issue.matchKeywords.some((kw) => desc.includes(kw.toLowerCase()))) {
            return issue;
        }
    }

    // Second pass: cross-category fallback if description strongly matches a known signature
    for (const issue of KNOWN_ISSUES) {
        if (issue.matchKeywords.some((kw) => desc.includes(kw.toLowerCase()))) {
            return issue;
        }
    }

    return null;
}

export function getPlaybookForCategory(category: string): CategoryPlaybook {
    return CATEGORY_PLAYBOOKS[category] ?? CATEGORY_PLAYBOOKS.DEFAULT;
}

export function computeRiskScore(ticket: Ticket): RiskAssessment {
    const ageHours = getTicketAgeHours(ticket);
    const matchedKnownIssue = matchKnownIssue(ticket);
    const badges: string[] = [];

    let score = 0;

    // Priority weight
    if (ticket.priority === 'P1') {
        score += 35;
        badges.push('P1 Urgent');
    } else if (ticket.priority === 'P2') {
        score += 25;
    } else if (ticket.priority === 'P3') {
        score += 10;
    }

    // Client tier weight
    if (ticket.client_tier === 'Enterprise') {
        score += 20;
        badges.push('Enterprise');
    } else if (ticket.client_tier === 'Mid-market') {
        score += 10;
    }

    // Age weight (for open tickets)
    if (ticket.status !== 'Closed') {
        if (ageHours > 72) {
            score += 20;
            badges.push('Aged >72h');
        } else if (ageHours > 48) {
            score += 12;
            badges.push('Aged >48h');
        } else if (ageHours > 24) {
            score += 5;
        }
    }

    // Escalation ping-pong weight
    if (ticket.eng_handoffs >= 2) {
        score += 15;
        badges.push(`${ticket.eng_handoffs}× Eng Bounces`);
    } else if (ticket.eng_handoffs === 1) {
        score += 5;
    }

    // Reopen risk weight
    if (ticket.reopen_count > 0) {
        score += 15;
        badges.push(`Reopened ${ticket.reopen_count}×`);
    }

    if (matchedKnownIssue) {
        badges.unshift(`Known Bug: ${matchedKnownIssue.engBugId}`);
    }

    const capped = Math.min(100, score);
    let level: RiskLevel = 'Low';
    if (capped >= 70) level = 'Critical';
    else if (capped >= 50) level = 'High';
    else if (capped >= 30) level = 'Medium';

    return {
        score: capped,
        level,
        ageHours,
        matchedKnownIssue,
        badges,
    };
}

export function checkClosureRisk(ticket: Ticket): ClosureRiskAssessment {
    const reasons: string[] = [];
    const ageHours = getTicketAgeHours(ticket);

    if (ticket.reopen_count > 0) {
        reasons.push(
            `Ticket has already reopened ${ticket.reopen_count} time(s) — verify root cause before closing again.`
        );
    }

    if (ticket.assigned_agent === 'Karan B') {
        reasons.push(
            'Agent guardrail active: Karan B currently carries a 29.5% reopen rate (3× team avg) — mandatory 2-point verification required.'
        );
    }

    if (ticket.status !== 'Closed' && ageHours < 8) {
        reasons.push(
            `Fast-close check (${ageHours.toFixed(1)}h elapsed): confirm client acknowledged fix before closing.`
        );
    }

    if (
        ticket.escalated_to_eng === 'Yes' &&
        ticket.status === 'Open - with L1' &&
        ticket.eng_handoffs >= 2
    ) {
        reasons.push(
            `Returned after ${ticket.eng_handoffs} engineering handoffs — confirm client verified fix end-to-end.`
        );
    }

    return {
        isHighRisk: reasons.length > 0,
        reasons,
    };
}

export function buildKnownIssueClientUpdate(
    ticket: Ticket,
    issue: KnownIssue
): string {
    return issue.clientUpdateTemplate
        .replaceAll('{{client_name}}', ticket.client_name)
        .replaceAll('{{ticket_id}}', ticket.ticket_id);
}

export function buildClientClosureMessage(
    ticket: Ticket,
    resolutionSummary: string
): string {
    const summary =
        resolutionSummary.trim() ||
        'We have verified the configuration and confirmed the issue is resolved.';
    return [
        `Hi ${ticket.client_name} team,`,
        '',
        `Update on ticket ${ticket.ticket_id} (${ticket.category}):`,
        summary,
        '',
        'Could you please confirm everything looks good on your end? If the issue recurs for any shift or employee, reply directly here and we will reopen it immediately.',
        '',
        `Regards,`,
        `${ticket.assigned_agent} · RideOps Support`,
    ].join('\n');
}

export function buildHandoffPacket(
    ticket: Ticket,
    diagValues: Record<string, string>,
    completedChecks: string[],
    extraNotes: string
): string {
    const playbook = getPlaybookForCategory(ticket.category);
    const diagLines = playbook.requiredDiagFields.map(
        (field) => `- **${field.label}:** ${diagValues[field.key]?.trim() || 'N/A'}`
    );
    const checkLines = completedChecks.map((check) => `- [x] ${check}`);

    return [
        `### RideOps Engineering Handoff Packet — ${ticket.ticket_id}`,
        `**Client:** ${ticket.client_name} (${ticket.client_id} · ${ticket.client_tier})`,
        `**Category:** ${ticket.category} | **Priority:** ${ticket.priority} | **Channel:** ${ticket.channel}`,
        `**L1 Owner:** ${ticket.assigned_agent} | **Prior Eng Handoffs:** ${ticket.eng_handoffs}`,
        '',
        `**Reported Issue:**`,
        `${ticket.description}`,
        '',
        `**L1 Pre-Escalation Checks Completed (${completedChecks.length}/${playbook.l1Checks.length}):**`,
        ...checkLines,
        '',
        `**Structured Diagnostics:**`,
        ...diagLines,
        ...(extraNotes.trim()
            ? ['', `**Additional L1 Notes:**`, extraNotes.trim()]
            : []),
    ].join('\n');
}
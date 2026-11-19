export interface KnownIssue {
    id: string;
    engBugId: string;
    title: string;
    category: string;
    status: 'Fix in QA' | 'Investigating' | 'Workaround Active';
    eta: string;
    matchKeywords: string[];
    l1Workaround: string;
    clientUpdateTemplate: string;
}

export interface DiagnosticField {
    key: string;
    label: string;
    placeholder: string;
    required: boolean;
}

export interface CategoryPlaybook {
    category: string;
    escalationShareNote: string;
    configFixHint: string;
    l1Checks: string[];
    requiredDiagFields: DiagnosticField[];
}

export const KNOWN_ISSUES: KnownIssue[] = [
    {
        id: 'KI-01',
        engBugId: 'ENG-4901',
        title: 'Scheduled report email not received',
        category: 'Report export failing',
        status: 'Fix in QA',
        eta: 'Oct 2, 2026 (18:00 IST)',
        matchKeywords: ['scheduled report', 'email not received'],
        l1Workaround:
            'Trigger a manual CSV/Excel export from Reports → Trip Summary for the requested date window and email it to the transport admin.',
        clientUpdateTemplate:
            'Hi {{client_name}} team — regarding {{ticket_id}}, our engineering team has identified an active scheduling queue delay affecting automated report emails (ref: ENG-4901, fix targeted for Oct 2). In the meantime, I have generated your report manually and attached it here so your ops review is not blocked.',
    },
    {
        id: 'KI-02',
        engBugId: 'ENG-4902',
        title: 'Monthly trip report download stuck at loading (>15-day range)',
        category: 'Report export failing',
        status: 'Workaround Active',
        eta: 'Oct 4, 2026',
        matchKeywords: [
            'monthly trip report',
            'stuck at loading',
            'date range > 15',
            'download stuck',
        ],
        l1Workaround:
            'Split the export into two 15-day batches (1–15 and 16–30/31) via the Admin Portal; both complete under 10 seconds.',
        clientUpdateTemplate:
            'Hi {{client_name}} team — regarding {{ticket_id}}, large >15-day trip exports are currently hitting a known timeout (ref: ENG-4902). Until the fix ships on Oct 4, splitting the download into two 15-day windows resolves it immediately. I have also exported both halves for you here.',
    },
    {
        id: 'KI-03',
        engBugId: 'ENG-4903',
        title: 'Excel export of billing report is blank or missing trips',
        category: 'Report export failing',
        status: 'Investigating',
        eta: 'Oct 3, 2026',
        matchKeywords: [
            'excel export',
            'billing report is blank',
            'exported report missing',
        ],
        l1Workaround:
            'Switch export format from XLSX to CSV in Billing → Export; CSV pulls from the primary replica without missing rows.',
        clientUpdateTemplate:
            'Hi {{client_name}} team — regarding {{ticket_id}}, we are tracking a known XLSX formatter issue affecting billing exports (ref: ENG-4903). Exporting in CSV format includes all trips accurately; I have attached the verified CSV export for your billing reconciliation.',
    },
    {
        id: 'KI-04',
        engBugId: 'ENG-4910',
        title: "Cancelled bookings still appearing in tomorrow's roster",
        category: 'Roster / booking not syncing',
        status: 'Fix in QA',
        eta: 'Oct 1, 2026 (22:00 IST)',
        matchKeywords: [
            'cancelled bookings',
            'appearing in tomorrow',
            'still appearing in',
        ],
        l1Workaround:
            'Open Roster Admin → Shift Lock → click "Force Re-sync Cancelled Trips" for the target shift date before dispatch freeze.',
        clientUpdateTemplate:
            'Hi {{client_name}} team — regarding {{ticket_id}}, this matches a known roster cache sync lag (ref: ENG-4910, fix rolling out Oct 1). I have manually force-synced your roster so cancelled bookings are removed ahead of dispatch.',
    },
    {
        id: 'KI-05',
        engBugId: 'ENG-4911',
        title: 'Booking cutoff changed but roster still uses old cutoff',
        category: 'Roster / booking not syncing',
        status: 'Workaround Active',
        eta: 'Oct 3, 2026',
        matchKeywords: ['booking cutoff', 'old cutoff', 'cutoff changed'],
        l1Workaround:
            'Check Client Config → Shift Rules → re-save and publish the active shift template to invalidate the cached cutoff rule.',
        clientUpdateTemplate:
            'Hi {{client_name}} team — regarding {{ticket_id}}, updated booking cutoffs currently require a manual shift-template publish due to a known cache issue (ref: ENG-4911). I have refreshed your cutoff rule now and verified the new timing applies to upcoming bookings.',
    },
    {
        id: 'KI-06',
        engBugId: 'ENG-4912',
        title: 'Ad-hoc booking done by admin not reflecting for employee',
        category: 'Roster / booking not syncing',
        status: 'Investigating',
        eta: 'Oct 2, 2026',
        matchKeywords: ['ad-hoc booking', 'not reflecting for employee'],
        l1Workaround:
            'Verify employee mobile/ID mapping is active, then click "Resend Trip Push" from Admin → Ad-hoc Queue so it appears in the employee app.',
        clientUpdateTemplate:
            'Hi {{client_name}} team — regarding {{ticket_id}}, we are tracking an intermittent push-sync delay on admin-created ad-hoc trips (ref: ENG-4912). I have manually pushed the trip assignment to the employee app—please ask them to pull-to-refresh once.',
    },
    {
        id: 'KI-07',
        engBugId: 'ENG-4920',
        title: 'Cab location frozen on map / 3 km GPS offset at pickup gate',
        category: 'Live tracking / GPS incorrect',
        status: 'Workaround Active',
        eta: 'Oct 5, 2026',
        matchKeywords: ['frozen on map', '3 km away', 'at gate'],
        l1Workaround:
            'Check Driver Telemetry → Last Ping. If ping is stale (>5 min), trigger remote GPS session refresh or ask driver to toggle battery optimization off for the driver app.',
        clientUpdateTemplate:
            'Hi {{client_name}} team — regarding {{ticket_id}}, our team is addressing a background GPS polling throttle on select Android driver devices (ref: ENG-4920). I have refreshed the live telemetry session for the assigned cab and confirmed pickup ETA with dispatch.',
    },
];

export const CATEGORY_PLAYBOOKS: Record<string, CategoryPlaybook> = {
    'Roster / booking not syncing': {
        category: 'Roster / booking not syncing',
        escalationShareNote:
            'Top backlog driver (50.9% escalation rate; 64 config/info bounces in Q3).',
        configFixHint:
            'Most Roster issues resolve at L1 by republishing shift cutoff rules, verifying employee active status, or fixing CSV upload headers.',
        l1Checks: [
            'Verified client shift cutoff rule & holiday calendar are published (not in Draft)',
            'Confirmed affected employee ID(s) are Active with valid geocode/nodal point assigned',
            'Checked bulk roster upload error log for format/duplicate rows (if Excel upload)',
            'Ran "Force Roster Sync" once and waited 2 minutes to confirm persistence',
        ],
        requiredDiagFields: [
            {
                key: 'shiftDateAndTime',
                label: 'Shift Date & Timing (IST)',
                placeholder: 'e.g. 2026-10-01 · 21:00 Night Shift',
                required: true,
            },
            {
                key: 'affectedIds',
                label: 'Affected Employee / Booking IDs',
                placeholder: 'e.g. EMP-4421, BK-98312 (or count if bulk)',
                required: true,
            },
            {
                key: 'syncJobId',
                label: 'Roster Upload / Sync Job ID',
                placeholder: 'e.g. SYNC-7821 or N/A if ad-hoc',
                required: true,
            },
            {
                key: 'reproSteps',
                label: 'Observed vs Expected Behavior',
                placeholder: 'Exact mismatch verified in Admin Portal vs Employee App',
                required: true,
            },
        ],
    },

    'Live tracking / GPS incorrect': {
        category: 'Live tracking / GPS incorrect',
        escalationShareNote:
            'Highest escalation rate (55.7%; 45 config/info bounces in Q3).',
        configFixHint:
            'Verify driver app last-ping timestamp, mock-location/battery saver settings, and tracking link expiry before escalating.',
        l1Checks: [
            'Checked Driver Telemetry tab: confirmed driver app sent GPS pings in last 5 mins',
            'Verified driver device has Location = High Accuracy and Battery Saver OFF',
            'Checked whether tracking link URL expired or security-team IP whitelist blocked it',
            'Confirmed cab/trip status is "In-Transit" (not still in "Assigned" state)',
        ],
        requiredDiagFields: [
            {
                key: 'tripId',
                label: 'Trip ID & Vehicle Number',
                placeholder: 'e.g. TRP-55810 · KA-01-AB-4421',
                required: true,
            },
            {
                key: 'incidentTimestamp',
                label: 'Exact Freeze / Offset Timestamp (IST)',
                placeholder: 'e.g. 2026-09-30 08:15 IST',
                required: true,
            },
            {
                key: 'driverAppVersion',
                label: 'Driver App Version & Last Ping Age',
                placeholder: 'e.g. Android v4.12.1 · Last ping 18 mins ago',
                required: true,
            },
            {
                key: 'reproSteps',
                label: 'Telemetry Check Summary',
                placeholder: 'Actual cab location vs map pin offset observed',
                required: true,
            },
        ],
    },

    'Report export failing': {
        category: 'Report export failing',
        escalationShareNote:
            'Accounts for 30 of 56 duplicate known-issue escalations (53.6%).',
        configFixHint:
            'Test a <=15-day window or CSV format first, and verify recipient email filters / scheduled cron recipient list.',
        l1Checks: [
            'Checked Active Known Issues (ENG-4901 / ENG-4902 / ENG-4903) for exact match',
            'Tested smaller date range (<=15 days) and CSV format to isolate timeout vs data bug',
            'Verified admin role has Report Export permission for the requested site/cost center',
            'Checked Email Delivery Log for bounce/spam block (if scheduled email missing)',
        ],
        requiredDiagFields: [
            {
                key: 'reportType',
                label: 'Report Name & Format',
                placeholder: 'e.g. Monthly Billing Summary · XLSX',
                required: true,
            },
            {
                key: 'dateRange',
                label: 'Requested Date Range & Filters',
                placeholder: 'e.g. 2026-09-01 to 2026-09-30 · Site: Bengaluru HQ',
                required: true,
            },
            {
                key: 'errorCode',
                label: 'HTTP / Export Job Error Message',
                placeholder: 'e.g. 504 Gateway Timeout or Blank sheet (Job #EXP-221)',
                required: true,
            },
        ],
    },

    'OTP / boarding issue': {
        category: 'OTP / boarding issue',
        escalationShareNote:
            '35.8% escalation rate; 16 of 34 escalations returned for config/info.',
        configFixHint:
            'Confirm employee phone number format (+91), DND/SMS gateway log, and client geofence boarding radius before escalating.',
        l1Checks: [
            'Checked SMS Gateway delivery log for the employee mobile number',
            'Verified employee phone number matches HRMS profile (no leading 0 or country-code mismatch)',
            'Verified pickup geofence radius config (if trip fails to start after OTP entry)',
        ],
        requiredDiagFields: [
            {
                key: 'tripAndEmployee',
                label: 'Trip ID & Employee Mobile (Last 4 Digits)',
                placeholder: 'e.g. TRP-61029 · Mobile ending 8821',
                required: true,
            },
            {
                key: 'smsGatewayStatus',
                label: 'SMS Gateway Log Status & Timestamp',
                placeholder: 'e.g. Carrier Rejected / Timeout at 06:42 IST',
                required: true,
            },
            {
                key: 'reproSteps',
                label: 'Driver / Employee App Behavior',
                placeholder: 'Exact screen message shown during boarding attempt',
                required: true,
            },
        ],
    },

    'Billing / invoice discrepancy': {
        category: 'Billing / invoice discrepancy',
        escalationShareNote:
            'Median close is 39.6 hrs; 12 of 26 escalations were config/info bounces.',
        configFixHint:
            'Verify client rate card effective date, dead-km slab config, and toll receipt attachments in Billing Config before escalating.',
        l1Checks: [
            'Verified active Rate Card version & effective date for the billing cycle',
            'Checked Dead-KM / Cancellation penalty rules configured for this client tier',
            'Cross-checked disputed trip IDs against GPS odometer log & toll receipts',
        ],
        requiredDiagFields: [
            {
                key: 'invoiceNumber',
                label: 'Invoice ID & Billing Cycle',
                placeholder: 'e.g. INV-2026-09-142 · Sep 2026',
                required: true,
            },
            {
                key: 'disputedTripIds',
                label: 'Sample Disputed Trip IDs',
                placeholder: 'e.g. TRP-44102, TRP-44198',
                required: true,
            },
            {
                key: 'expectedVsBilled',
                label: 'Expected vs Billed Variance',
                placeholder: 'e.g. Toll INR 140 billed twice; rate card says pass-through once',
                required: true,
            },
        ],
    },

    DEFAULT: {
        category: 'General L1 Support',
        escalationShareNote:
            'Low historical escalation category — most tickets resolve directly at L1.',
        configFixHint:
            'Verify user permissions, standard how-to guide, and client configuration before creating an engineering ticket.',
        l1Checks: [
            'Confirmed issue is a product defect and not a how-to or role-permission request',
            'Checked Knowledge Base / client settings for a documented L1 resolution',
            'Reproduced the issue or captured exact error screenshot/timestamp from client',
        ],
        requiredDiagFields: [
            {
                key: 'affectedEntity',
                label: 'Affected User / Trip / Vehicle ID',
                placeholder: 'e.g. EMP-1092 or Admin email',
                required: true,
            },
            {
                key: 'incidentTimestamp',
                label: 'Exact Timestamp (IST)',
                placeholder: 'e.g. 2026-09-30 14:20 IST',
                required: true,
            },
            {
                key: 'reproSteps',
                label: 'Steps to Reproduce & Error Message',
                placeholder: 'Step-by-step actions + exact error observed',
                required: true,
            },
        ],
    },
};
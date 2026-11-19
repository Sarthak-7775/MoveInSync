# RideOps Gatekeeper — Support Triage & Escalation Workbench (v0)

> **Live Application:** [https://move-in-sync.vercel.app/](https://move-in-sync.vercel.app/)  
> **Repository:** [https://github.com/Sarthak-7775/MoveInSync](https://github.com/Sarthak-7775/MoveInSync)  
> **Target User:** L1 Support Agent *(with a Monday Ops–Support–Eng Scorecard view)*  
> **Dataset:** 1,444 support tickets (`2026-07-02` to `2026-09-30`) · 191 corporate clients · 8 L1 agents

RideOps is facing a **+60% jump in open support tickets** with zero budget for additional headcount. Rather than treating this as a raw staffing shortage, data analysis proves the queue is jammed by a **leaky L1-to-Engineering escalation loop**: over half of all engineering escalations are avoidable before they leave L1, and premature closures by speed-focused agents are quietly recycling rework.

**RideOps Gatekeeper** is a working Next.js internal tool running live on all 1,444 tickets to stop bad escalations at the gate, surface active known bugs instantly, enforce quality checks before closure, and track weekly operational health.

---

## Quick Reviewer Guide (Test Live in 2 Minutes)

Open **[https://move-in-sync.vercel.app/](https://move-in-sync.vercel.app/)** (no login required) and try four live flows:

1. **Inspect the Risk-Ranked Open Queue (`/`):** Defaults to the **48 live open tickets** as of 30 Sep 2026, ranked by operational risk (priority, Enterprise tier, ticket age, engineering bounces, and reopen history). Toggle to **All Historical (1,444)** anytime.
2. **Deflect a Duplicate Bug Live:** Click **+ Simulate Incoming Ticket** → select **Preset A (Known Duplicate)** → inject → watch the matcher immediately flag `ENG-4902` and deflect the ticket with a pre-drafted client update (updating the backlog counter live).
3. **Test the Hard Escalation Gate:** Inject **Preset C (Real P1 OTP Bug)** → click **Run Pre-Escalation Gatekeeper** → notice escalation stays locked until L1 config checks and structured diagnostic fields are completed, generating a copy-ready **Engineering Handoff Packet**.
4. **Check Quality Guardrails & Impact (`/scorecard`):** Filter by agent **Karan B** on `/` and click **Resolve & Close Ticket** to trigger the Reopen Prevention Alert; then open **`/scorecard`** to inspect the 6-KPI weekly dashboard, automated coaching flags, and the Little's Law **What-If Impact Simulator**. *(Use **Reset Demo** in the top navbar to restore the original 1,444 rows anytime.)*

---

## Table of Contents

1. [Part 1 — Diagnose: What Is Driving the Problem?](#part-1--diagnose-what-is-driving-the-problem)
2. [Part 2 — Define Success: Weekly Metrics & Operating Cadence](#part-2--define-success-weekly-metrics--operating-cadence)
3. [Part 3 — Build a v0: Working Internal Tool for L1 Agents](#part-3--build-a-v0-working-internal-tool-for-l1-agents)
4. [Part 4 — Plan the Next Four Weeks & Deliberate Trade-Offs](#part-4--plan-the-next-four-weeks--deliberate-trade-offs)
5. [Repository Layout & Running Locally](#repository-layout--running-locally)

---

## Part 1 — Diagnose: What Is Driving the Problem?

Every stakeholder interview contains a partial truth. Auditing all **1,444 tickets** (`analysis/`) separates symptoms from root causes:

### 1. Volume Grew +52%, Exposing an Escalation Bottleneck — Not an L1 Capacity Wall
* Monthly inbound volume rose from **390 tickets (July)** → **462 (August)** → **592 (September)** (**+51.8%**).
* End-of-month open backlog climbed **+60.0%**: **30 open** (Jul 31) → **23 open** (Aug 31) → **48 open** (Sep 30), with **25 of 48 (52.1%)** aged past 48 hours and **18** belonging to Enterprise accounts.
* **70.8% of the current open backlog (34 of 48 tickets)** consists of escalated tickets (**19** currently sitting with Engineering; **15** bounced back and sitting with L1). Only **14** are unescalated L1 tickets.

### 2. Over Half of All Engineering Escalations (52.1%) Should Never Reach Engineering As-Is
Out of **486 escalated tickets** (33.7% of total volume), only **211 (43.4%)** resulted in an actual engineering code fix (`Fixed`). Another **253 escalations (52.1% across Q3; 55.0% in September)** were preventable before handoff:

| Engineering Verdict (`eng_outcome`) | Tickets | % of Escalations | Median Final Close | Avoidable at L1? |
| :--- | :---: | :---: | :---: | :---: |
| `Fixed` | 211 | 43.4% | 64.8 hrs (2.7d) | No (valid engineering bug) |
| `Insufficient info - returned to L1` | 89 | 18.3% | **121.1 hrs (5.0d)** | **Yes** — missing diagnostics |
| `Config issue - returned to L1` | 84 | 17.3% | **128.6 hrs (5.4d)** | **Yes** — L1 playbook gap |
| `Duplicate of known issue` | 56 | 11.5% | 67.5 hrs (2.8d) | **Yes** — no shared bug visibility |
| `Not a bug - how-to` | 24 | 4.9% | 68.7 hrs (2.9d) | **Yes** — basic triage gap |
| `Not reproducible` | 22 | 4.5% | 62.3 hrs (2.6d) | Excluded (intermittent issues) |

* **6.9× resolution penalty:** Median close time jumps from **12.6 hours** (L1-only) to **86.8 hours** (escalated).
* **The handoff ping-pong tax:** **47.1% of escalations (229 of 486)** bounced back and forth 2–3 times (**777 total handoffs** across 486 tickets). Each bounce adds ~2.2 days to median resolution: **12.6h** (0 handoffs) → **58.7h** (1) → **110.4h** (2) → **169.9h / 7.1 days** (3).

### 3. Three Product Categories Drive 73% of the Open Backlog and 78% of Escalations

| Category | Q3 Tickets | Open (Sep 30) | Escalations (Rate) | Dominant Leak |
| :--- | :---: | :---: | :---: | :--- |
| **Roster / booking not syncing** | 344 | **17** | 175 (50.9%) | 32 config bounces, 32 missing-info bounces, 16 duplicates |
| **Live tracking / GPS incorrect** | 228 | **13** | 127 (55.7%) | 24 missing-info bounces, 21 config bounces |
| **Report export failing** | 206 | **5** | 77 (37.4%) | **30 of 56 (53.6%)** duplicate known-issue escalations |
| **Top 3 Combined** | **778 (53.9%)** | **35 (72.9%)** | **379 (78.0%)** | **196 of 253 (77.5%) avoidable escalations** |

*(Channel mix is uniform across Email, Portal, Phone, and WhatsApp — all sit at 32–34.5% escalation rate and ~1.60 handoffs — confirming the issue is missing triage standards rather than one noisy intake channel.)*

### 4. Hidden Agent Outliers: Rewarding Raw Closure Speed Creates Rework
Two agents account for a disproportionate share of systemic noise, directly disproving the assumption that fast closures equal high performance:

* **Karan B (Premature Closer):** Median first close of **7.9 hours** (vs. 18–24h for peers), **but** carries a **29.5% reopen rate** (>3× any teammate). Handling 15.0% of volume, he generates **42.4% of all reopened tickets (64/151)**, **46.2% of all reopen events (78/169)**, and the team's lowest CSAT (**3.13** vs. **3.70** average).
* **Rahul T (Over-Escalator):** Escalates **61.6%** of his queue (nearly 2× the 33.7% average), creating **75.0% of all `Not a bug - how-to` escalations (18/24)** and **29.8% of all `Config issue` escalations (25/84)**, with just a **24.7%** engineering fix rate (vs. 43.4% team average).

---

## Part 2 — Define Success: Weekly Metrics & Operating Cadence

Optimizing solely for a lower open-ticket count invites premature closures (the Karan B failure mode). "Better" for RideOps means **shrinking open backlog and aging queues while improving first-pass resolution quality and protecting engineering time**.

### Three-Tier Weekly Scorecard

| Tier | Metric | Formula (`rideops_support_tickets.csv`) | Baseline (Q3 / Sep 30) | 4-Week Target | Why It Matters |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **North Star** | **End-of-Week Open Backlog** | Count where `created_at <= EOW` and (`final_closed_at` blank or `> EOW`) | **48 open** | **≤ 30 open** *(at ~145/wk vol)* | Directly tracks leadership's core mandate |
| **North Star Health** | **Aging Open Backlog (>48h)** | `%` of EOW open tickets aged `(EOW - created_at) > 48h` | **52.1%** (25/48) | **< 25%** | Captures visible client frustration |
| **Leading Lever 1** | **Avoidable Escalation Rate** | `%` of weekly escalations ending in `Insufficient info`, `Config issue`, `Duplicate`, or `Not a bug` | **52.1%** *(Sep: 55.0%)* | **< 20%** | Primary lever moved by v0 Gatekeeper |
| **Leading Lever 2** | **Ping-Pong Rate (≥2 Handoffs)** | `%` of escalated tickets with `eng_handoffs >= 2` | **47.1%** | **< 20%** | Measures engineering handoff completeness |
| **Guardrail 1** | **Ticket Reopen Rate** | `%` of closed tickets with `reopen_count > 0` (team + max single agent) | **10.5%** team (**29.5%** max) | **< 8%** team; **< 10%** every agent | Prevents gaming via premature closures |
| **Guardrail 2** | **Weekly CSAT** | Mean `csat_score` (1–5) across rated tickets | **3.70** *(Sep: 3.68)* | **≥ 3.90** | Protects Enterprise & Mid-market trust |

### Week-to-Week Measurement Cadence
* **Monday 9:00 AM IST Ops–Support–Eng Sync (15 mins):** Ritika, Meera, and Sandeep review Sunday 23:59 backlog snapshots alongside settled prior-week quality cohorts (with a 7-day lag audit for reopens).
* **Automated Coaching Triggers:** Meera's weekly view automatically flags any agent crossing **Reopen Rate > 15%** or **Escalation Rate > 45% with Eng Fix Rate < 35%**, shifting coaching from raw closure speed to quality-adjusted throughput.

### Explicit Measurement Assumptions
1. **Right-Censoring:** Late-September open tickets (48 rows) do not yet have final `eng_outcome` or `reopen_count` completions; leading rates are evaluated on settled weekly cohorts.
2. **CSAT Coverage Bias:** Only **44.9%** of tickets (648/1,444) contain a rating, so **Reopen Rate** (100% coverage) acts as the primary companion guardrail.
3. **`Not reproducible` Excluded from Avoidable:** Intermittent GPS/OTP bugs (22 tickets / 4.5%) can legitimately require backend logs and are kept outside the 52.1% avoidable bucket.
4. **Zero-Headcount Constraint:** All targets assume the existing 8 L1 agents and current engineering capacity.

---

## Part 3 — Build a v0: Working Internal Tool for L1 Agents

### Why Build for the L1 Support Agent?
Every major failure mode happens at **the exact decision point where an L1 agent escalates or closes a ticket**. Another static BI dashboard tells leadership what already went wrong; an operational L1 workbench intercepts avoidable escalations and premature closures in real time while computing the live weekly scorecard from the exact same data.

### What Actually Runs on the Data (`https://move-in-sync.vercel.app/`)

* **1. Risk-Ranked Triage Queue & Ticket Action Drawer (`/`):**
  * Parses all **1,444 real tickets** from `rideops_support_tickets.csv` client-side with `localStorage` persistence and 1-click **Reset Demo**.
  * Ranks the **48 open tickets** by a deterministic 0–100 operational risk score (`priority`, `client_tier`, age >48h/72h, `eng_handoffs >= 2`, and `reopen_count > 0`) with filters by status, category, tier, agent, and Known-Issue matches.
  * Displays each ticket's full IST lifecycle timeline and category playbook hints.
* **2. Three-Step Pre-Escalation Gatekeeper (`EscalationGatekeeper.tsx`):**
  * **Step 1 — Automatic Known-Issue Matcher:** Scans ticket `category` and `description` against 7 active engineering bug signatures (derived from historical `Duplicate of known issue` tickets) and offers a 1-click **Deflect & Copy Client Update** workflow.
  * **Step 2 — Mandatory L1 Config Checklist:** Enforces 3–4 category-specific verification checks for the top 5 categories (`Roster`, `GPS`, `Report export`, `OTP`, `Billing`) with a 1-click **Resolve as L1 Config Fix** exit ramp. Escalation remains disabled until checks pass.
  * **Step 3 — Structured Engineering Handoff Packet:** Enforces required diagnostic fields (Trip/Employee ID, IST timestamp, Shift/Route ID, repro steps) and generates a formatted handoff brief that updates ticket status and handoff metadata live.
* **3. Pre-Closure Quality Guardrail (`ClosureGuardrail.tsx`):**
  * Automatically flags high-reopen agents (`Karan B`), previously reopened tickets, multi-bounce returns, and sub-8-hour fast closures with a mandatory 2-point verification checklist and editable client confirmation template.
* **4. Live Incoming Ticket Simulator (`NewTicketSimulator.tsx`):**
  * Allows injecting brand-new tickets (via 3 realistic presets or custom text) to watch real-time duplicate detection, risk scoring, and gatekeeper deflection live.
* **5. Shared Known Issues Catalog (`/known-issues`) & Weekly Scorecard (`/scorecard`):**
  * Live bug counts matched against all 1,444 tickets, expandable L1 playbooks, 6-KPI scorecard cards, Recharts weekly trends, automated Agent Coaching Table, and an interactive **Little's Law What-If Impact Simulator**.
  * *Sanity Check:* At September's intake rate (**19.7 tickets/day**), deflecting 60% of avoidable escalations and cutting ping-pong reduces the escalation rate from **33.7% → 23.1%** and trims steady-state WIP by **~28.4%** (bringing open backlog back into the **≤30 target** with zero new hires).

### Tech Stack
* **Web App (`web/`):** Next.js (App Router), React, TypeScript, Tailwind CSS, PapaParse, Recharts, Lucide Icons — deployed on Vercel.
* **Data Diagnosis (`analysis/`):** Python, Pandas, NumPy, Matplotlib, Seaborn, Jupyter Notebook.

---

## Part 4 — Plan the Next Four Weeks & Deliberate Trade-Offs

### Sequenced 4-Week Execution Roadmap

| Week | Objective | Concrete Actions | Exit Criteria |
| :--- | :--- | :--- | :--- |
| **Week 1: Shadow & Targeted Pilot** | Prove workflow speed & playbook accuracy with highest-leverage users | Pilot Gatekeeper + Closure Guardrail with **Rahul T**, **Karan B**, and 2 strong peers (Neha P, Vikram S) on the **top 3 categories** (78% of escalations). Run a 30-min calibration with Sandeep's lead engineer to finalize diagnostic fields and active known bugs. | Gatekeeper completed in <90s/ticket; zero P1 escalation delays. |
| **Week 2: Helpdesk & Eng Integration** | Eliminate copy-paste friction so adoption holds | Connect v0 via webhooks/API to the existing ticketing system and engineering tracker (Jira/Linear): ingest live tickets automatically, push Handoff Packets directly into eng tickets, and sync Known Issue status changes back to L1. | 100% of pilot escalations carry structured packets; pilot ping-pong rate <30%. |
| **Week 3: Full Team Rollout & Coaching Reset** | Scale to all 8 L1 agents and fix incentives | Roll out to all 8 L1 agents. Kick off the Monday 9:00 AM IST Scorecard sync with Ritika, Meera, and Sandeep; replace raw speed metrics with quality-adjusted coaching alerts. | Team avoidable escalation rate <25%; Karan B reopen rate <12%. |
| **Week 4: Upstream Deflection & Root Fixes** | Reduce recurring inbound volume on known bugs | Add a lightweight **Active Known Issues & Workarounds Banner** inside the Client Portal for top `Report export` and `Roster` bugs. Hand engineering a ranked 30-day cost report of the top 2 recurring root bugs for permanent remediation. | Open backlog ≤30; Aging >48h <25%; CSAT ≥3.90. |

### What I Would Deliberately NOT Do (and Why)

1. **Hire additional L1 agents:** Violates the zero-hiring budget and pours headcount onto a process leak—more agents without a pre-escalation gate will only flood engineering faster.
2. **Replace or migrate the existing ticketing CRM:** Replacing email/portal/WhatsApp tooling takes months of migration risk; wrapping a focused triage gatekeeper around existing ticket feeds delivers impact in Week 1.
3. **Turn on autonomous AI replies directly to corporate clients:** Missed cabs, frozen tracking, and boarding OTP failures carry immediate Enterprise SLA risk. Automation should guide L1 agents internally—not send unchecked responses to transport admins.
4. **Enforce strict L1 speed SLAs (e.g., "close everything under 8 hours"):** The dataset already demonstrates that unguarded speed pressure produces Karan B's 29.5% reopen loop and drags CSAT down to 3.13.
5. **Build playbooks for all 10 categories in Month 1:** The bottom 7 categories generate only 22% of escalations; focusing first on `Roster`, `GPS`, and `Report export` captures **77.5% of avoidable escalations** with minimal playbook maintenance overhead.

---

## Repository Layout & Running Locally

```text
MoveInSync/
├── analysis/                  # Python diagnostic notebook & exported PNG charts (Part 1)
├── data/                      # Raw CSV dataset, data dictionary & verified metrics summary
├── docs/                      # Case study write-up draft & review materials
├── web/                       # Deployed Next.js + TypeScript v0 application (Part 3)
│   ├── public/data/           # Live CSV loaded by the app at runtime
│   └── src/
│       ├── app/               # Routes: `/` (Workbench), `/known-issues`, `/scorecard`
│       ├── components/        # TicketQueue, ActionDrawer, Gatekeeper, ClosureGuardrail, Simulator, Charts
│       ├── context/           # Shared React state + localStorage persistence
│       ├── data/              # Active Known Issues & Top-5 Category L1 Playbooks
│       └── lib/               # CSV parser, metrics calculator, risk & triage engine
└── Readme.md
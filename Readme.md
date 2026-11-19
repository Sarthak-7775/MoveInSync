# RideOps Gatekeeper (v0)

**Live App:** [https://move-in-sync.vercel.app/](https://move-in-sync.vercel.app/) *(no login required)*  
**Repo:** [https://github.com/Sarthak-7775/MoveInSync](https://github.com/Sarthak-7775/MoveInSync)

RideOps Gatekeeper is a working internal triage and escalation workbench built for **L1 Support Agents**, running live on all **1,444 tickets** (`rideops_support_tickets.csv`).


---

## How to Use It (2-Minute Live Walkthrough)

Open **[https://move-in-sync.vercel.app/](https://move-in-sync.vercel.app/)**:

1. **Explore the live queue:** Filter the 48 open tickets by status, category, agent, or tick **Known-Issue Matches Only** (or toggle **All Historical (1,444)**).
2. **Deflect a duplicate live:** Click **+ Simulate Incoming Ticket** → pick **Preset A (Known Duplicate)** → inject → click **Run Pre-Escalation Gatekeeper** → click **Deflect Ticket & Copy Client Update**. Watch the Open Backlog counter update live.
3. **Test the hard escalation gate:** Inject **Preset C (Real P1 Bug)** → open **Pre-Escalation Gatekeeper** → verify escalation stays locked until all L1 checks and diagnostic fields are filled, producing a formatted **Engineering Handoff Packet**.
4. **Test the reopen guardrail & scorecard:** Filter Agent = **Karan B**, open an open ticket, and click **Resolve & Close Ticket** to see the Reopen Prevention Alert. Then visit **`/known-issues`** and **`/scorecard`** to test the What-If Impact Simulator.
5. **Reset anytime:** Click **Reset Demo** in the top-right navbar to restore the original 1,444 rows.


---

## The Problem It Solves

Leadership asked to bring RideOps' open ticket backlog down (+60% since July) with **zero budget for new hires**. Auditing the 1,444 tickets showed the bottleneck is **escalation quality, not raw L1 headcount**:

* **70.8% of the current open backlog (34 of 48 tickets)** is stuck in the escalation loop.
* **52.1% of all engineering escalations (253/486)** are avoidable before reaching engineering (`Insufficient info` 18.3%, `Config issue` 17.3%, `Duplicate of known issue` 11.5%, `Not a bug - how-to` 4.9%).
* Escalated tickets take **6.9× longer** to close (**86.8 hrs** vs. **12.6 hrs** at L1), and **47.1%** bounce back and forth 2–3 times.
* Two hidden agent patterns amplify the noise: **Karan B** closes fast (7.9h) but drives **42.4% of all reopened tickets** (29.5% reopen rate, 3.13 CSAT), while **Rahul T** escalates **61.6%** of his queue with only a **24.7%** engineering fix rate.

---

## Core Features & Why They Are Integrated

Every module maps directly to a bottleneck found in the data:

| Feature | Where | Why It Is Integrated |
| :--- | :--- | :--- |
| **Risk-Ranked Open Queue** | `/` | Defaults to the **48 open tickets** sorted by a 0–100 score (`priority`, `client_tier`, age >48h, `eng_handoffs`, `reopen_count`) so Enterprise and stalled tickets stop getting buried. |
| **Known-Issue Auto-Matcher & 1-Click Deflection** | `/` & `/known-issues` | Scans `category` + `description` against 7 active recurring bugs (e.g., stuck report exports, stale roster cutoffs) to eliminate **duplicate escalations** (11.5% of all escalations; 30 of 56 in `Report export failing` alone). |
| **3-Step Pre-Escalation Gatekeeper** | Ticket Drawer (`/`) | Stops incomplete and config-level tickets from reaching engineering: runs a duplicate check, requires category-specific **L1 config checks** (with a 1-click L1 resolution exit), and locks escalation until required diagnostic fields generate a structured **Engineering Handoff Packet**. |
| **Pre-Closure Quality Guardrail** | Ticket Drawer (`/`) | Automatically triggers on high-reopen agents (**Karan B**), previously reopened tickets, or fast (<8h) closures—requiring a 2-point root-cause check and drafting a clear client update so open tickets aren't gamed down via premature closes. |
| **Incoming Ticket Simulator** | Header (`/`) | Lets reviewers inject realistic presets (Duplicate Bug, Config Issue, Real P1 Bug) or custom text to test the triage engine live. |
| **Weekly Scorecard & What-If Simulator** | `/scorecard` | Tracks the 6 weekly KPIs (Open Backlog, Aging >48h, Avoidable Escalations, Ping-Pong Rate, Reopen Rate, CSAT), auto-flags agent coaching outliers (**Karan B** & **Rahul T**), and models backlog reduction via Little's Law. |

---


## How This Solves the Backlog Problem

Instead of adding headcount or building a passive dashboard, RideOps Gatekeeper fixes the leak **at the moment an L1 agent decides to escalate or close**:

* **Deflecting 60% of avoidable escalations** drops the overall escalation rate from **33.7% → 23.1%**, keeping those tickets on the **12.6h L1 track** instead of the **86.8h engineering loop**.
* **Structured Handoff Packets** cut multi-handoff ping-pong, reclaiming ~100+ wasted engineering handoffs per month.
* Under September's intake volume (592 tickets/month), this reduces steady-state open backlog by **~28%**—bringing open tickets back toward **≤ 30** while keeping **Reopen Rate < 8%** and **CSAT ≥ 3.90** with zero new hires.

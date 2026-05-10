# TEECO Dashboard Agent Instructions

This is the production source for dashboard.teeco.co.

Repository:
https://github.com/helloteeco/teeco-dashboard

Deployment:
GitHub Pages, custom domain dashboard.teeco.co via CNAME.

North star:
Increase revenue from Jeff's $13K 1:1 coaching program. The dashboard is not a vanity project. It should help Jeff track agents, spend, completed work, next actions, profitability, leads, calls, closes, and dropped balls.

Product direction:
TEECO Lodging Dashboard — a fun 2D rural Airbnb retreat where Atlas, Scout, and future agents look like accountable workers/characters. Each agent needs visible role, current task, completed work, spend/cost, ROI link, permissions, next action, and shutdown criteria.

Guardrails:
- Do not recursively create cron jobs from cron-run sessions.
- New agents may propose recurring jobs, but Atlas/Jeff approval is required before creating them.
- Do not invent revenue, lead, close, or spend numbers. Use placeholders or label unknown.
- Do not request/store bank logins, account numbers, SSNs, private client/investor banking info, or wire instructions.
- Do not deploy destructive redesigns without preserving existing dashboard content.
- Prefer small safe commits/patches: add one visible slice, verify, log.

Current repo shape:
Static GitHub Pages site, mostly single-file index.html plus CNAME.

Immediate development priorities:
1. Add a TEECO Lodging / Agent Retreat view or section without breaking current tabs.
2. Make Atlas and Scout visible as characters with work/spend/completed/next-up cards.
3. Add a visible task queue and development log so Jeff can monitor autonomous work.
4. Add a profitability scoreboard focused on coaching: qualified leads, calls booked, calls held, closes, follow-ups, content assets, agent cost.
5. Add a controlled new-agent proposal template: role, mission, ROI metric, permissions, budget, 7-day test, shutdown rule.

Verification before finalizing:
- Open index.html or run a local static server and confirm the dashboard renders.
- Confirm existing login still works unless intentionally changed.
- Confirm mobile layout is not obviously broken.
- Update a development log section/file if present.

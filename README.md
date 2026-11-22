# TEECO Source-of-Truth Dashboard (v1.1)

Static, mobile-friendly dashboard with ten views, built to cover what the AI Freedom Summit 2026 (AIFS Kelowna) talks and resources page say to build. No build step, no backend, no secrets. Home view is the Scoreboard.

| View | URL hash | Data file | Schema |
|---|---|---|---|
| **Scoreboard (home)**: ~10 money/growth/customer numbers, this week / last week / target / owner, green (on target) / amber (within 10%) / red (>10% off), reds on top | `#scoreboard` | `data/scoreboard.example.json` | `schema/scoreboard.schema.json` |
| Chief of Staff routing: assignments with owner + deadline, max 3 judgment calls, company-brain log | `#cos` | `data/chief-of-staff.example.json` | `schema/chief-of-staff.schema.json` |
| Commitment tracker (project tracking, **not** performance monitoring) | `#tracker` | `data/commitments.example.json` | `schema/commitments.schema.json` |
| Metrics: every metric with goal, success, pace, color, owner, how to move it (sensors, pipeline, customers, talent, AI adoption) | `#scorecard` | `data/scorecard.example.json` | `schema/scorecard.schema.json` |
| Constraint loop: locate, diagnose, quantify ($/month), prescribe, execute (surge), team replies | `#constraint` | `data/constraint.example.json` | `schema/constraint.schema.json` |
| Client Host: purple/green/yellow/red, daily 8 AM top 9 (a purple takes one green slot), quiet-customer cost, unsent drafts awaiting approval (send disabled) | `#clients` | `data/clients.example.json` | `schema/clients.schema.json` |
| Agents: the 7 AIFS agents with purpose, schedule, connections, status, prompt doc | `#agents` | `data/agents.json` | `schema/agents.schema.json` |
| Team (one card per person, computed from commitments) | `#team` | `data/team.example.json` | `schema/team.schema.json` |
| AIFS build checklist: every item the talks/workbook say to build or do, with exact quote + timestamp; status saved per device, Export JSON | `#aifs` | `data/aifs-checklist.json` | `schema/aifs-checklist.schema.json` |
| Sources (connection status + last sync, placeholders) | `#sources` | `data/sources.example.json` | `schema/sources.schema.json` |

`data/aifs-checklist.json` and `data/agents.json` are not company data: they hold quotes from the summit talks and the agent descriptions from the AIFS resources page, with role placeholders as owners. Full agent prompts are kept privately (not in this repo).

Every view is rendered from JSON by `assets/app.js`. To extend a view, add fields to the schema and the data file, then render them in that view's function.

## ⚠️ This repo is PUBLIC

- Everything in `data/` is **fictional EXAMPLE data** ("Example Owner A", "Example Client B"). Never commit real TEECO company, client, employee, or financial data here.
- GitHub Pages cannot restrict access. Anything in this repo or served from it is readable by anyone, including content behind a JavaScript password prompt (it is in the page source).
- Never commit secrets, API keys, or tokens.

## Client Host rules (shown in the UI)

Use only what is in the data. Never invent customers or quotes. Never send anything from the dashboard. A human approves every message. The top 9 takes up to 3 green, 3 yellow, and 3 red by `priority`; if a color has fewer than 3, the slot stays empty rather than being filled with invented entries.

## Run locally

```bash
python3 -m http.server 8765
# open http://localhost:8765/#tracker
```

Validate data against the schemas (optional): `pip install jsonschema` then validate each `data/*.json` against the matching `schema/*.schema.json`.

## Go-live steps (real data, private)

Goal: `dashboard.teeco.co` shows real data **only** to signed-in `@teeco.co` Google accounts, and real data never lives in this public repo or on public GitHub Pages.

1. **Pick hosting with sign-in in front.** Recommended options:
   - **Vercel + Google OAuth**: import the code into a *private* repo (or keep this repo for the shell only) and add a small auth layer (e.g. Next.js/Auth.js or Vercel middleware) that only allows Google accounts whose verified email ends in `@teeco.co` (use the `hd=teeco.co` hint **and** check the email domain on the server).
   - **Cloudflare Pages/Workers + Cloudflare Access**: put an Access application on `dashboard.teeco.co` with a policy "Emails ending in `@teeco.co`" and Google as the identity provider. No code changes needed for auth.
2. **Keep the data in a private store.** For example a private Google Sheet/Drive folder, a private repo, Vercel Blob/KV, Cloudflare R2/KV, or a small database. Expose it only via an authenticated endpoint (e.g. `/api/data/commitments`) that checks the session before returning JSON.
3. **Point the front end at the private endpoint.** Before `assets/app.js` loads, set:
   ```html
   <script>window.TEECO_DATA_URLS = {commitments:"/api/data/commitments", team:"/api/data/team", clients:"/api/data/clients", sources:"/api/data/sources", scorecard:"/api/data/scorecard", constraint:"/api/data/constraint", agents:"/api/data/agents", aifs:"/api/data/aifs", scoreboard:"/api/data/scoreboard", cos:"/api/data/cos"};</script>
   ```
   The JSON must match the schemas in `schema/`. Remove the example-data banner for the private build.
4. **OAuth setup (Vercel route).** In Google Cloud Console create an OAuth client (Web), authorized redirect URI `https://dashboard.teeco.co/api/auth/callback/google`, consent screen type *Internal* (limits to the teeco.co Workspace).
5. **Environment variables (set in the host's dashboard, never committed):** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTH_SECRET` (random 32+ bytes), `ALLOWED_EMAIL_DOMAIN=teeco.co`, plus read-only credentials for each data source (GoHighLevel, Stripe restricted read key, Google service account, Slack/Granola tokens) when integrations are built.
6. **DNS.** `dashboard.teeco.co` is currently a CNAME to `helloteeco.github.io` (DNS is at Squarespace/NS1). When the private host is ready, change that CNAME to the new host's target (e.g. `cname.vercel-dns.com`, or proxy through Cloudflare), then remove the `CNAME` file / custom domain from GitHub Pages so the public site stops answering on that name.
7. **Checklist status.** In the public build, checklist status changes live only in the browser (localStorage) and can be exported. In the private build, have the endpoint for `aifs` read/write the private store so the whole team sees the same status.
8. **Scoreboard refresh.** The Chief of Staff prompt defaults to hourly updates; the sync job writes `scoreboard` and `cos` JSON to the private store. Don't guess targets or owners: ask once, then pull from CRM / payments / bank / sheets.
9. **Integrations later.** Replace the Sources placeholders one at a time with read-only sync jobs that write to the private store and update `last_sync`. Nothing in the dashboard sends messages.

## Files

- `index.html`, `assets/styles.css`, `assets/app.js`: the site
- `data/*.example.json`: fictional example data
- `schema/*.schema.json`: JSON Schema (draft 2020-12) for each view
- `docs/screenshots/`: desktop (1280px) and mobile (390px) screenshots of every view
- `CNAME`: GitHub Pages custom domain (unchanged)

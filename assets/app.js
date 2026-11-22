/* TEECO source-of-truth dashboard. Static, no build step, no secrets.
 * Data: by default loads the public EXAMPLE files in /data. When hosted
 * privately (see README "Go-live steps"), set window.TEECO_DATA_URLS before
 * this script, pointing at an authenticated endpoint. Never put real data in /data. */
(function () {
  "use strict";
  var URLS = window.TEECO_DATA_URLS || {
    commitments: "data/commitments.example.json",
    team: "data/team.example.json",
    clients: "data/clients.example.json",
    sources: "data/sources.example.json",
    scorecard: "data/scorecard.example.json",
    constraint: "data/constraint.example.json",
    agents: "data/agents.json",
    scoreboard: "data/scoreboard.example.json",
    cos: "data/chief-of-staff.example.json",
    aifs: "data/aifs-checklist.json"
  };
  var STATUS = { on_track: "On track", behind: "Behind", stalled: "Stalled", done: "Done" };
  var COLORS = ["purple", "green", "yellow", "red"];
  var D = {};
  var filt = { owner: "", status: "", overdue: false };

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function today() { var m = D.commitments && D.commitments.meta; return (m && m.as_of) || new Date().toISOString().slice(0, 10); }
  function isOverdue(c) { return c.status !== "done" && c.committed_date && c.committed_date < today(); }
  function fmt(d) { if (!d) return "—"; var p = d.slice(0, 10).split("-"); return new Date(+p[0], p[1] - 1, +p[2]).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); }
  function safeUrl(u) { return /^https?:\/\//i.test(u || "") ? u : ""; }
  function pill(s) { return '<span class="pill s-' + esc(s) + '">' + esc(STATUS[s] || s) + "</span>"; }

  function tracker() {
    var rows = D.commitments.commitments;
    var owners = Array.from(new Set(rows.map(function (r) { return r.owner; }))).sort();
    var list = rows.filter(function (r) {
      return (!filt.owner || r.owner === filt.owner) && (!filt.status || r.status === filt.status) && (!filt.overdue || isOverdue(r));
    });
    var count = function (f) { return rows.filter(f).length; };
    var cols = [["id", "ID"], ["project", "Project"], ["item", "Item"], ["owner", "Owner"], ["requested_by", "Requested by"], ["committed_date", "Committed date"], ["source", "Source"], ["status", "Status"], ["blocker", "Blocker"], ["last_update", "Last update"], ["next_action", "Next action"], ["proof_link", "Proof"], ["visibility", "Visibility"]];
    var h = '<h1>Commitment tracker</h1><p class="sub">Who said they would do what, by when, and what happens next. This is project tracking, not performance monitoring.</p>';
    h += '<div class="stats">' +
      stat(count(function (r) { return r.status !== "done"; }), "Open") +
      stat(count(isOverdue), "Overdue") +
      stat(count(function (r) { return r.status === "stalled"; }), "Stalled") +
      stat(count(function (r) { return r.status === "behind"; }), "Behind") +
      stat(count(function (r) { return r.status === "done"; }), "Done") + "</div>";
    h += '<div class="filters"><label>Owner <select id="f-owner"><option value="">All owners</option>' +
      owners.map(function (o) { return "<option" + (o === filt.owner ? " selected" : "") + ">" + esc(o) + "</option>"; }).join("") +
      '</select></label><label>Status <select id="f-status"><option value="">All statuses</option>' +
      Object.keys(STATUS).map(function (s) { return '<option value="' + s + '"' + (s === filt.status ? " selected" : "") + ">" + STATUS[s] + "</option>"; }).join("") +
      '</select></label><label><input type="checkbox" id="f-overdue"' + (filt.overdue ? " checked" : "") + "> Overdue only</label>" +
      '<span class="muted">' + list.length + " of " + rows.length + " shown</span></div>";
    h += '<div class="tablewrap"><table><thead><tr>' + cols.map(function (c) { return "<th>" + c[1] + "</th>"; }).join("") + "</tr></thead><tbody>";
    list.forEach(function (r) {
      h += '<tr class="' + (isOverdue(r) ? "overdue" : "") + '">' + cols.map(function (c) {
        var v = r[c[0]], out;
        if (c[0] === "status") out = pill(v) + (isOverdue(r) ? '<span class="pill od">Overdue</span>' : "");
        else if (c[0] === "committed_date" || c[0] === "last_update") out = esc(fmt(v));
        else if (c[0] === "proof_link") out = safeUrl(v) ? '<a href="' + esc(v) + '" target="_blank" rel="noopener">proof</a>' : '<span class="muted">none</span>';
        else out = v ? esc(v) : '<span class="muted">—</span>';
        return '<td data-label="' + c[1] + '">' + out + "</td>";
      }).join("") + "</tr>";
    });
    if (!list.length) h += '<tr><td colspan="13" class="muted">No commitments match these filters.</td></tr>';
    h += "</tbody></table></div>";
    return h;
  }
  function stat(n, l) { return '<div class="stat"><b>' + n + "</b><span>" + l + "</span></div>"; }

  function team() {
    var rows = D.commitments.commitments;
    var h = '<h1>Team</h1><p class="sub">One card per person, computed from the commitment tracker. Shows where work is stuck so it can be unblocked.</p><div class="cards">';
    D.team.people.forEach(function (p) {
      var mine = rows.filter(function (r) { return r.owner === p.name; });
      var open = mine.filter(function (r) { return r.status !== "done"; });
      var stuck = open.filter(function (r) { return isOverdue(r) || r.status === "stalled"; });
      var last = mine.map(function (r) { return r.last_update || ""; }).sort().pop();
      h += '<div class="card"><h3>' + esc(p.name) + '</h3><div class="muted" style="font-size:13px;margin-bottom:8px">' + esc(p.role || "") + "</div>" +
        '<div class="row"><span>Open commitments</span><b>' + open.length + "</b></div>" +
        '<div class="row"><span>Overdue or stalled</span><b style="color:' + (stuck.length ? "var(--red)" : "var(--green)") + '">' + stuck.length + "</b></div>" +
        '<div class="row"><span>Last update</span><b>' + esc(fmt(last)) + "</b></div>" +
        (stuck.length ? "<ul>" + stuck.map(function (r) { return "<li>" + esc(r.id) + ": " + esc(r.item) + (r.blocker ? " (blocker: " + esc(r.blocker) + ")" : "") + "</li>"; }).join("") + "</ul>" : "") +
        "</div>";
    });
    return h + "</div>";
  }

  function clientCard(c) {
    return '<div class="client c-' + esc(c.color) + '"><b>' + esc(c.name) + '</b> <span class="muted">' + esc(c.id) + "</span><br>" +
      '<span class="muted">Owner:</span> ' + esc(c.owner || "—") + ' · <span class="muted">Last contact:</span> ' + esc(fmt(c.last_contact)) + "<br>" +
      (c.days_quiet != null ? '<span class="muted">Quiet:</span> ' + esc(c.days_quiet) + " days" + (c.channel ? ' · <span class="muted">Channel:</span> ' + esc(c.channel) : "") + "<br>" : "") +
      esc(c.reason || "") + '<br><span class="muted">Source: ' + esc(c.source || "none listed") + "</span>" +
      (c.finish_line ? '<br><span class="muted">Finish line:</span> ' + esc(c.finish_line) : "") +
      (c.signals && c.signals.length ? '<div class="sig">' + c.signals.map(function (x) { return '<span class="tag">' + esc(x.replace(/_/g, " ")) + "</span>"; }).join("") + "</div>" : "") +
      (c.next_step_draft ? '<div class="draft">' + esc(c.next_step_draft) + "</div>" : "") +
      '<button type="button" disabled title="The dashboard never sends anything. A human writes, approves and sends every message.">Sending disabled: human approves</button></div>';
  }
  function byPriority(a, b) { return (b.priority || 0) - (a.priority || 0) || String(a.last_contact).localeCompare(String(b.last_contact)); }

  function clients() {
    var cl = D.clients, defs = cl.color_definitions, list = cl.clients.slice();
    var refresh = (cl.meta && cl.meta.top9_refresh) || "08:00";
    var h = '<h1>Client Host</h1><p class="sub">Clients sorted purple, green, yellow, red. The daily top 9 refreshes at ' + esc(refresh) + " " + esc((cl.meta && cl.meta.timezone) || "local time") + ".</p>";
    var qd = (cl.meta && cl.meta.quiet_threshold_days) || 30, av = cl.meta && cl.meta.avg_monthly_value;
    var quiet = list.filter(function (c) { return c.days_quiet != null && c.days_quiet >= qd; });
    h += '<div class="stats">' + stat(list.length, "Clients") + stat(quiet.length, "Quiet " + qd + "+ days") +
      (av ? stat("$" + (quiet.length * av * 2).toLocaleString(), "Quiet-customer cost / month (x2 for lost referrals)") : "") +
      stat(list.filter(function (c) { return (c.signals || []).indexOf("waiting_on_us") >= 0 || (c.signals || []).indexOf("support_ticket_open") >= 0; }).length, "Waiting on us") + "</div>";
    h += '<div class="rule"><b>Rules:</b> Use only what is in the data. Never invent customers or quotes. Never send anything from here. A human approves every message.</div>';
    h += '<div class="legend">' + COLORS.map(function (k) { return '<div class="c-' + k + '"><span class="dot d-' + k + '"></span><b>' + k[0].toUpperCase() + k.slice(1) + "</b><br><span class=\"muted\">" + esc(defs[k]) + "</span></div>"; }).join("") + "</div>";
    h += "<h2>Today's top 9 (8 AM): 3 green · 3 yellow · 3 red</h2><p class=\"muted tiny\">A purple raving fan takes one of the green slots.</p><div class=\"top9\">";
    ["green", "yellow", "red"].forEach(function (k) {
      var pick;
      if (k === "green") {
        var pur = list.filter(function (c) { return c.color === "purple"; }).sort(byPriority).slice(0, 1);
        pick = pur.concat(list.filter(function (c) { return c.color === "green"; }).sort(byPriority)).slice(0, 3);
        if (pick.length < 3) pick = pick.concat(list.filter(function (c) { return c.color === "purple" && pick.indexOf(c) < 0; }).sort(byPriority)).slice(0, 3);
      } else pick = list.filter(function (c) { return c.color === k; }).sort(byPriority).slice(0, 3);
      h += '<div class="col"><h3><span class="dot d-' + k + '"></span>' + k + (k === "green" ? " + purple" : "") + " (" + pick.length + "/3)</h3>" +
        (pick.length ? pick.map(clientCard).join("") : '<p class="muted">No ' + k + " clients in the data. Nothing invented to fill the slot.</p>") + "</div>";
    });
    var drafts = list.filter(function (c) { return c.next_step_draft; });
    h += "</div><h2>Unsent drafts awaiting approval · " + drafts.length + '</h2><div class="cklist">' + drafts.map(function (c) {
      return '<div class="ck c-' + esc(c.color) + '" style="border-left-width:6px"><div><b>' + esc(c.name) + '</b> <span class="muted tiny">' + esc(c.color) + " · " + esc(c.channel || "channel?") + " · owner " + esc(c.owner || "—") + '</span></div><div class="draft">' + esc(c.next_step_draft) + '</div><div><button type="button" class="btn ghost" disabled title="Nothing is ever sent from the dashboard.">Send disabled: approve and send yourself</button></div></div>';
    }).join("") + "</div>";
    h += "<h2>All clients by color</h2><div class=\"groups\">";
    COLORS.forEach(function (k) {
      var g = list.filter(function (c) { return c.color === k; }).sort(byPriority);
      h += '<div><h3 style="font-size:14px;margin:0 0 8px"><span class="dot d-' + k + '"></span>' + k + " · " + g.length + "</h3>" + g.map(clientCard).join("") + "</div>";
    });
    return h + "</div>";
  }

  function sources() {
    var h = '<h1>Sources</h1><p class="sub">Where each view gets its data. These are placeholders: no live integrations exist in this public repo.</p><div class="cards">';
    D.sources.sources.forEach(function (s) {
      h += '<div class="card src"><h3>' + esc(s.name) + '</h3><div>Status: <span class="status st-' + esc(s.status) + '">' + esc(String(s.status).replace("_", " ")) + "</span></div>" +
        "<div>Last sync: <b>" + (s.last_sync ? esc(new Date(s.last_sync).toLocaleString()) : "Never") + "</b></div>" +
        '<div class="muted">Feeds: ' + esc((s.feeds || []).join(", ")) + '</div><div class="muted" style="font-size:13px">' + esc(s.notes || "") + "</div></div>";
    });
    return h + "</div>";
  }

  /* ---------- Scorecard (Barlow: goal, success, pace, color, owner; Martell: sensors) ---------- */
  var TL = { green: "On pace", yellow: "Needs attention", red: "Number one constraint" };
  function scorecard() {
    var sc = D.scorecard, ms = sc.metrics;
    var groups = Array.from(new Set(ms.map(function (m) { return m.group; })));
    var reds = ms.filter(function (m) { return m.color === "red"; });
    var h = '<h1>Scorecard</h1><p class="sub">Every number has a goal, a definition of success, a pace, a color and an owner who knows how to move it.</p>';
    h += '<div class="rule"><b>Rule:</b> ' + esc((sc.meta && sc.meta.rule) || "") + "</div>";
    h += '<div class="stats">' + ["green", "yellow", "red"].map(function (k) { return '<div class="stat c-' + k + '" style="border-left:6px solid"><b>' + ms.filter(function (m) { return m.color === k; }).length + "</b><span>" + TL[k] + "</span></div>"; }).join("") + "</div>";
    if (reds.length) h += '<div class="alert"><b>Red = constraint candidates.</b> Pick ONE and run it through the Constraint loop: ' + reds.map(function (m) { return esc(m.name) + " (" + esc(m.owner) + ")"; }).join(" · ") + ' <a href="#constraint">Open Constraint loop →</a></div>';
    groups.forEach(function (g) {
      h += "<h2>" + esc(g) + '</h2><div class="cards">';
      ms.filter(function (m) { return m.group === g; }).forEach(function (m) {
        h += '<div class="card metric c-' + esc(m.color) + '"><div class="mtop"><h3>' + esc(m.name) + '</h3><span class="tl t-' + esc(m.color) + '">' + esc(TL[m.color] || m.color) + "</span></div>" +
          '<div class="big">' + esc(m.current == null ? "—" : m.current) + ' <span class="muted">' + esc(m.unit || "") + "</span></div>" +
          row("Goal", m.goal) + row("Success", m.success) + row("Pace", m.pace_target) + row("Owner", m.owner + (m.owner_contact ? " · " + m.owner_contact : "")) + row("How to move it", m.how_to_move) + row("Source", m.source) +
          '<div class="muted tiny">Updated ' + esc(fmt(m.updated)) + (m.from_talk ? " · From: " + esc(m.from_talk) : "") + "</div></div>";
      });
      h += "</div>";
    });
    return h;
  }
  function row(k, v) { return '<div class="row"><span>' + esc(k) + "</span><b>" + (v ? esc(v) : '<span class="muted">—</span>') + "</b></div>"; }

  /* ---------- Constraint loop (Martell: locate, diagnose, quantify, prescribe, execute/surge) ---------- */
  var STEPS = [["locate", "1. Locate", "Where is the bottleneck?"], ["diagnose", "2. Diagnose", "What is the real reason?"], ["quantify", "3. Quantify", "What is it costing us NOT to solve it?"], ["prescribe", "4. Prescribe", "Who has proof? Pay for the blueprint."], ["execute", "5. Execute (surge)", "All hands. How long will it take? Go do it, come back, show it."]];
  function constraint() {
    var c = D.constraint, cur = c.current, idx = STEPS.map(function (s) { return s[0]; }).indexOf(cur.status);
    var h = '<h1>Constraint loop</h1><p class="sub">One constraint at a time. ' + esc((c.meta && c.meta.cadence) || "") + "</p>";
    h += '<div class="card hero"><div class="mtop"><h3>' + esc(cur.id) + ": " + esc(cur.title) + '</h3><span class="pill s-' + (cur.status === "solved" ? "done" : "stalled") + '">' + esc(cur.status) + "</span></div>" +
      '<div class="muted">Stage: ' + esc(cur.stage || "—") + " · Owner: " + esc(cur.owner) + " · Opened " + esc(fmt(cur.opened)) + " · Next check " + esc(fmt(cur.next_check)) + "</div>" +
      (cur.steps.quantify_monthly_cost ? '<div class="big red">$' + Number(cur.steps.quantify_monthly_cost).toLocaleString() + ' <span class="muted">/ month cost of not solving it</span></div>' : "") + "</div>";
    h += '<div class="steps">' + STEPS.map(function (s, i) {
      return '<div class="step' + (i < idx || cur.status === "solved" ? " past" : i === idx ? " now" : "") + '"><b>' + s[1] + '</b><div class="muted tiny">' + s[2] + "</div><div>" + esc(cur.steps[s[0]] || "—") + "</div></div>";
    }).join("") + "</div>";
    if (cur.evidence && cur.evidence.length) h += '<p class="muted">Evidence: ' + cur.evidence.map(esc).join(" · ") + "</p>";
    if (c.snap_question) h += '<div class="rule"><b>' + esc(c.snap_question.question) + "</b><br>" + esc(c.snap_question.answer || "Not answered yet.") + "</div>";
    h += '<h2>Team replies (learning loop)</h2><div class="cards">' + (c.feedback || []).map(function (f) {
      return '<div class="card"><div class="mtop"><b>' + esc(f.from) + '</b><span class="tl t-' + (f.agrees ? "green" : "yellow") + '">' + (f.agrees ? "Agrees" : "Disagrees") + '</span></div><div class="muted tiny">' + esc(fmt(f.date)) + "</div><div>" + esc(f.text) + "</div></div>";
    }).join("") + "</div>";
    if (c.history && c.history.length) h += "<h2>Solved before</h2><ul>" + c.history.map(function (x) { return "<li>" + esc(x.id) + ": " + esc(x.title) + " (closed " + esc(fmt(x.closed)) + ") " + esc(x.result || "") + "</li>"; }).join("") + "</ul>";
    return h;
  }

  /* ---------- Agents: the 7 AIFS agents ---------- */
  var AST = { not_installed: "Not installed", installing: "Installing", live: "Live" };
  function agents() {
    var as = D.agents.agents;
    var h = '<h1>Agents</h1><p class="sub">The 7 agents from the AI Freedom Summit resources page. Install ONE before you invent five; one manual review before any schedule turns on.</p>';
    h += '<div class="stats">' + Object.keys(AST).map(function (k) { return stat(as.filter(function (a) { return a.status === k; }).length, AST[k]); }).join("") + "</div>";
    h += '<div class="cards">' + as.map(function (a) {
      return '<div class="card ag"><div class="mtop"><h3>' + esc(a.name) + '</h3><span class="tl a-' + esc(a.status) + '">' + esc(AST[a.status] || a.status) + "</span></div>" +
        "<div>" + esc(a.purpose) + "</div>" + row("Schedule", a.schedule) + row("Setup", a.setup_time) +
        '<div class="tiny muted" style="margin-top:6px">Needs</div><div class="sig">' + (a.connections || []).map(function (c) { return '<span class="tag">' + esc(c) + "</span>"; }).join("") + "</div>" +
        '<div class="tiny" style="margin-top:6px"><span class="muted">Prompt doc:</span> <code>' + esc(a.prompt_doc) + "</code></div>" +
        (safeUrl(a.source_url) ? '<div class="tiny"><a href="' + esc(a.source_url) + '" target="_blank" rel="noopener">AIFS resources page</a> · ' + esc(a.from_talk || "") + "</div>" : "") + "</div>";
    }).join("") + "</div>";
    return h;
  }

  /* ---------- Scoreboard (home): ~10 numbers, green/amber/red, reds on top ---------- */
  function sbColor(n) {
    if (n.this_week == null || n.target == null || n.target === 0) return "amber";
    var off = n.better === "lower" ? (n.this_week - n.target) / n.target : (n.target - n.this_week) / n.target;
    return off <= 0 ? "green" : off <= 0.10 ? "amber" : "red";
  }
  function money(v, u) { if (v == null) return "—"; return u === "$" ? "$" + Number(v).toLocaleString() : Number(v).toLocaleString() + (u || ""); }
  function scoreboard() {
    var ns = D.scoreboard.numbers.map(function (n) { return Object.assign({ c: sbColor(n) }, n); });
    var rank = { red: 0, amber: 1, green: 2 };
    ns.sort(function (a, b) { return rank[a.c] - rank[b.c]; });
    var worst = ns.filter(function (n) { return n.c === "red"; })[0];
    var h = '<h1>Scoreboard</h1><p class="sub">' + esc(D.scoreboard.meta.rule) + "</p>";
    h += '<div class="stats">' + ["red", "amber", "green"].map(function (k) { return '<div class="stat sb-' + k + '"><b>' + ns.filter(function (n) { return n.c === k; }).length + "</b><span>" + k[0].toUpperCase() + k.slice(1) + "</span></div>"; }).join("") + "</div>";
    if (worst) h += '<div class="alert"><b>Needs attention most:</b> ' + esc(worst.name) + " is " + esc(money(worst.this_week, worst.unit)) + " vs target " + esc(money(worst.target, worst.unit)) + " (owner " + esc(worst.owner) + '). <a href="#cos">Routing →</a></div>';
    h += '<div class="tablewrap"><table class="sbt"><thead><tr><th>Status</th><th>Number</th><th>This week</th><th>Last week</th><th>Target</th><th>Owner</th><th>Source</th></tr></thead><tbody>';
    ns.forEach(function (n) {
      var tr = n.last_week == null ? "" : n.this_week > n.last_week ? " ▲" : n.this_week < n.last_week ? " ▼" : " =";
      h += '<tr class="sbrow sb-' + n.c + '"><td data-label="Status"><span class="tl t-' + (n.c === "amber" ? "yellow" : n.c) + '">' + n.c.toUpperCase() + '</span></td><td data-label="Number"><b>' + esc(n.name) + '</b> <span class="muted tiny">' + esc(n.group) + "</span></td>" +
        '<td data-label="This week" class="num">' + esc(money(n.this_week, n.unit)) + '<span class="muted">' + tr + "</span></td>" +
        '<td data-label="Last week" class="num">' + esc(money(n.last_week, n.unit)) + '</td><td data-label="Target" class="num">' + esc(money(n.target, n.unit)) + (n.better === "lower" ? ' <span class="muted tiny">(lower is better)</span>' : "") + "</td>" +
        '<td data-label="Owner">' + esc(n.owner) + '<br><span class="muted tiny">' + esc(n.owner_phone || "") + '</span></td><td data-label="Source"><span class="muted tiny">' + esc(n.source || "") + "<br>" + esc(n.updated ? new Date(n.updated).toLocaleString() : "") + "</span></td></tr>";
    });
    return h + "</tbody></table></div>";
  }

  /* ---------- Chief of Staff routing ---------- */
  function cos() {
    var c = D.cos, calls = (c.judgment_calls || []).slice(0, 3);
    var h = '<h1>Chief of Staff routing</h1><p class="sub">' + esc(c.meta.run || "") + ". " + esc(c.meta.rule || "") + "</p>";
    h += "<h2>Judgment calls for the founder (max 3)</h2>" + (calls.length ? '<div class="cards">' + calls.map(function (j, i) { return '<div class="card jc"><b>' + (i + 1) + ". " + esc(j.question) + '</b><div class="muted tiny" style="margin-top:4px">' + esc(j.why || "") + "</div></div>"; }).join("") + "</div>" : '<p class="muted">None today.</p>');
    h += "<h2>Today's assignments</h2><div class=\"tablewrap\"><table class=\"sbt\"><thead><tr><th>ID</th><th>Assignment</th><th>Owner</th><th>Deadline</th><th>Context</th><th>Status</th></tr></thead><tbody>";
    (c.assignments || []).forEach(function (a) {
      var od = a.status !== "done" && a.deadline < today();
      h += "<tr><td data-label=\"ID\">" + esc(a.id) + "</td><td data-label=\"Assignment\">" + esc(a.item) + (a.metric ? ' <span class="muted tiny">(' + esc(a.metric) + ")</span>" : "") + '</td><td data-label="Owner">' + esc(a.owner) + '</td><td data-label="Deadline"' + (od ? ' style="color:var(--red);font-weight:700"' : "") + ">" + esc(fmt(a.deadline)) + '</td><td data-label="Context">' + esc(a.context || "") + '</td><td data-label="Status">' + esc(a.status || "open") + "</td></tr>";
    });
    h += "</tbody></table></div><h2>Company-brain log</h2><div class=\"cklist\">" + (c.brain_log || []).map(function (l) {
      return '<div class="ck"><div><span class="tag bl-' + esc(l.type) + '">' + esc(l.type) + '</span> <span class="muted tiny">' + esc(fmt(l.date)) + "</span></div><div>" + esc(l.text) + "</div></div>";
    }).join("") + "</div>";
    return h;
  }

  /* ---------- AIFS build checklist (from the talks; status saved on this device) ---------- */
  var CK = { not_started: "Not started", in_progress: "In progress", done: "Done" };
  var LSK = "teeco-aifs-status-v1";
  var cf = { cat: "", status: "", kind: "", q: "" };
  function overrides() { try { return JSON.parse(localStorage.getItem(LSK) || "{}"); } catch (e) { return {}; } }
  function ckStatus(it) { var o = overrides()[it.id]; return o || it.status; }
  function aifs() {
    var A = D.aifs, items = A.items, cats = (A.meta && A.meta.categories) || {};
    var list = items.filter(function (it) {
      var st = ckStatus(it), q = cf.q.toLowerCase();
      return (!cf.cat || it.category === cf.cat) && (!cf.status || st === cf.status) && (!cf.kind || it.kind === cf.kind) &&
        (!q || (it.item + " " + it.quote + " " + it.owner + " " + it.id).toLowerCase().indexOf(q) >= 0);
    });
    var cnt = function (s) { return items.filter(function (it) { return ckStatus(it) === s; }).length; };
    var pct = Math.round(100 * cnt("done") / items.length), pip = Math.round(100 * cnt("in_progress") / items.length);
    var h = '<h1>AIFS build checklist</h1><p class="sub">Everything the AI Freedom Summit 2026 speakers said to build, install, set up, measure or do, with the exact quote and timestamp. Change a status and it is saved on this device; use Export to save the file.</p>';
    h += '<div class="progress" title="' + pct + '% done, ' + pip + '% in progress"><span class="p-done" style="width:' + pct + '%"></span><span class="p-ip" style="width:' + pip + '%"></span></div>';
    h += '<div class="stats">' + stat(items.length, "Items") + stat(cnt("not_started"), "Not started") + stat(cnt("in_progress"), "In progress") + stat(cnt("done"), "Done") +
      stat(items.filter(function (i) { return i.kind === "habit"; }).length, "Habits (not software)") + "</div>";
    var starts = items.filter(function (it) { return /^H0[1-4]$/.test(it.id); });
    if (starts.length) h += '<div class="rule"><b>Start-here habits:</b><ul style="margin:6px 0 0;padding-left:18px">' + starts.map(function (it) { return "<li>" + esc(it.item) + ' <span class="muted tiny">(' + esc(CK[ckStatus(it)]) + ", " + esc(it.cadence) + ")</span></li>"; }).join("") + "</ul></div>";
    h += '<div class="filters"><label>Area <select id="c-cat"><option value="">All areas</option>' + Object.keys(cats).map(function (k) { return '<option value="' + k + '"' + (cf.cat === k ? " selected" : "") + ">(" + k + ") " + esc(cats[k]) + "</option>"; }).join("") + "</select></label>" +
      '<label>Status <select id="c-st"><option value="">All</option>' + Object.keys(CK).map(function (k) { return '<option value="' + k + '"' + (cf.status === k ? " selected" : "") + ">" + CK[k] + "</option>"; }).join("") + "</select></label>" +
      '<label>Kind <select id="c-kind"><option value="">All</option><option value="software"' + (cf.kind === "software" ? " selected" : "") + '>Software</option><option value="habit"' + (cf.kind === "habit" ? " selected" : "") + ">Habit</option></select></label>" +
      '<label>Search <input id="c-q" type="search" value="' + esc(cf.q) + '" placeholder="word, owner, ID"></label>' +
      '<button type="button" id="c-export" class="btn">Export JSON</button><button type="button" id="c-reset" class="btn ghost">Reset my changes</button>' +
      '<span class="muted">' + list.length + " of " + items.length + " shown</span></div>";
    Object.keys(cats).forEach(function (k) {
      var g = list.filter(function (it) { return it.category === k; });
      if (!g.length) return;
      h += "<h2>(" + k + ") " + esc(cats[k]) + ' <span class="muted">· ' + g.length + '</span></h2><div class="cklist">';
      g.forEach(function (it) {
        var st = ckStatus(it);
        h += '<div class="ck ck-' + st + '"><div class="cktop"><span class="muted tiny">' + esc(it.id) + "</span> <b>" + esc(it.item) + "</b></div>" +
          '<div class="ckmeta"><label class="tiny">Status <select class="c-set" data-id="' + esc(it.id) + '">' + Object.keys(CK).map(function (s) { return '<option value="' + s + '"' + (s === st ? " selected" : "") + ">" + CK[s] + "</option>"; }).join("") + "</select></label>" +
          '<span class="tag">' + esc(it.kind) + '</span><span class="tag">' + esc(it.cadence || "") + '</span><span class="tag">Owner: ' + esc(it.owner) + "</span>" +
          (it.view ? '<a class="tag" href="#' + esc(it.view) + '">Open view →</a>' : "") + "</div>" +
          '<blockquote>"' + esc(it.quote) + '"<cite>' + esc(it.speaker) + (it.video ? " · video " + esc(it.video) + " @ " + esc(it.timestamp) : " · " + esc(it.source_doc || "")) + "</cite></blockquote>" +
          (it.prompt ? '<details><summary>Prompt</summary><div class="draft">' + esc(it.prompt) + "</div></details>" : "") +
          (it.workbook ? '<div class="muted tiny">Workbook prompt: ' + esc(it.workbook) + "</div>" : "") +
          (it.note ? '<div class="muted tiny">Note: ' + esc(it.note) + "</div>" : "") + "</div>";
      });
      h += "</div>";
    });
    if (!list.length) h += '<p class="muted">No items match these filters.</p>';
    return h;
  }
  function wireAifs() {
    var on = function (id, ev, fn) { var e = document.getElementById(id); if (e) e[ev] = fn; };
    on("c-cat", "onchange", function () { cf.cat = this.value; render(); });
    on("c-st", "onchange", function () { cf.status = this.value; render(); });
    on("c-kind", "onchange", function () { cf.kind = this.value; render(); });
    on("c-q", "onchange", function () { cf.q = this.value; render(); });
    document.querySelectorAll(".c-set").forEach(function (sel) {
      sel.onchange = function () { var o = overrides(); o[this.dataset.id] = this.value; try { localStorage.setItem(LSK, JSON.stringify(o)); } catch (e) {} render(); };
    });
    on("c-reset", "onclick", function () { if (confirm("Clear the statuses you changed on this device?")) { localStorage.removeItem(LSK); render(); } });
    on("c-export", "onclick", function () {
      var out = JSON.parse(JSON.stringify(D.aifs));
      out.items.forEach(function (it) { it.status = ckStatus(it); });
      out.meta.as_of = new Date().toISOString().slice(0, 10);
      var a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: "application/json" }));
      a.download = "aifs-checklist.json"; document.body.appendChild(a); a.click(); a.remove();
    });
  }

  var VIEWS = { scoreboard: scoreboard, cos: cos, tracker: tracker, scorecard: scorecard, constraint: constraint, clients: clients, agents: agents, team: team, aifs: aifs, sources: sources };
  function render() {
    var v = (location.hash || "#scoreboard").slice(1);
    if (!VIEWS[v]) v = "scoreboard";
    document.querySelectorAll(".tabs a").forEach(function (a) { a.classList.toggle("active", a.dataset.view === v); });
    document.getElementById("app").innerHTML = VIEWS[v]();
    var o = document.getElementById("f-owner");
    if (o) {
      o.onchange = function () { filt.owner = this.value; render(); };
      document.getElementById("f-status").onchange = function () { filt.status = this.value; render(); };
      document.getElementById("f-overdue").onchange = function () { filt.overdue = this.checked; render(); };
    }
    if (v === "aifs") wireAifs();
  }
  Promise.all(Object.keys(URLS).map(function (k) {
    return fetch(URLS[k], { credentials: "same-origin", cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error(k + ": HTTP " + r.status); return r.json(); }).then(function (j) { D[k] = j; });
  })).then(function () {
    document.getElementById("asof").textContent = fmt(today());
    window.addEventListener("hashchange", function () { render(); window.scrollTo(0, 0); });
    render();
  }).catch(function (e) {
    document.getElementById("app").innerHTML = '<p class="muted">Could not load data (' + esc(e.message) + ").</p>";
  });
})();

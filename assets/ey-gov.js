/* ============================================================================
 *  EY BizApps - ey-gov.js
 *  The permission, access and measurement layer.
 *  ---------------------------------------------------------------------------
 *  WHY THIS FILE EXISTS
 *
 *  The content model carries five named clients, their logos, their real
 *  numbers and fourteen indicative day-one prices. Before this file, the only
 *  thing standing between all of that and a client screen was a sentence in
 *  the footer asking the operator to confirm approval status first. A sentence
 *  is not a control.
 *
 *  This file adds three things the asset was missing:
 *
 *    1. AUDIENCE MODE - one switch that decides what the page is allowed to
 *       render. Internal shows everything. Sanitised strips the identities.
 *       External shows only the credentials a named reviewer has cleared.
 *
 *    2. AN ACCESS GATE - a credential prompt in front of the city view.
 *
 *    3. TELEMETRY - which engagement was opened, which capability was read,
 *       how long the session ran. Without this the asset cannot report on
 *       itself, and an asset that cannot report on itself cannot be defended
 *       at a budget conversation.
 *
 *  ---------------------------------------------------------------------------
 *  READ THIS BEFORE YOU RELY ON THE GATE
 *
 *  The gate is a presentation control, not a security control. These pages are
 *  static files with no server behind them, so the check necessarily runs on
 *  the client and the credential necessarily ships inside the download. Anyone
 *  who opens the developer tools can read past it in about ten seconds. It
 *  stops a colleague wandering into a live demo. It does not protect anything.
 *
 *  That is precisely why the client identities and the commercial figures are
 *  NOT protected by the gate. They are protected by audience mode, which
 *  removes them from the rendered output entirely rather than hiding them
 *  behind a password. If the sensitive content is never written into the DOM,
 *  there is nothing to read past.
 *
 *  If this ever needs to be genuinely restricted, put it behind Entra ID on a
 *  real host. Do not harden this file - it cannot be hardened.
 * ========================================================================== */

(function (root) {
  "use strict";

  var GOV = {};

  /* ==========================================================================
   *  1 · OWNERSHIP
   *  Recommendation 10. A one-person asset carrying five named clients and
   *  live commercial figures needs a version, an owner and a review date on
   *  the face of it, so anybody opening it knows how stale it is and who to
   *  ask before it goes in front of a client.
   * ======================================================================== */
  GOV.meta = {
    version: "2.0",
    built: "2026-09-14",
    owner: "Khaled Alkurdi",
    ownerEmail: "Khaled.Alkurdi@ie.ey.com",
    /* The permission reviewer. This person, and only this person, flips the
       extApproved flags below. Credentials stay anonymised until they do. */
    reviewer: "Terry Maguire",
    reviewerEmail: "Terry.Maguire@ie.ey.com",
    /* Reviewed at the weekly Studio+ launch touchpoint rather than whenever
       somebody happens to notice it has drifted. */
    cadence: "Weekly · Studio+ launch touchpoint",
    review: "2026-10-01",
  };

  /* ==========================================================================
   *  2 · AUDIENCE MODE
   *
   *    internal   Everything. Pricing, pod sizes, named leads, every client
   *               named and logoed whether or not it has been cleared.
   *               EY eyes. This is the default when nothing is specified.
   *
   *    sanitised  Every client anonymised to a sector descriptor, no logos,
   *               no pricing, no resourcing. The mode you use in front of a
   *               client who has no business seeing another client's name.
   *
   *    external   Named credentials, but ONLY the ones the reviewer has
   *               cleared for external use. Everything not cleared falls back
   *               to its sanitised descriptor rather than disappearing, so
   *               the story still holds. No pricing, no resourcing.
   *
   *  Mode is applied at load, not at render, and changing it reloads the page.
   *  That is deliberate. The 3D scene bakes client logos into facade decals at
   *  build time, so a mode change has to rebuild the scene anyway - and a full
   *  reload guarantees no sanitised view is ever left showing a stale internal
   *  fragment from before the switch.
   * ======================================================================== */
  var MODES = {
    internal:  { id: "internal",  name: "Internal",  short: "EY only",
                 note: "Full detail. Pricing, resourcing and named clients. Not for a client screen." },
    sanitised: { id: "sanitised", name: "Sanitised", short: "Anonymised",
                 note: "Clients anonymised to sector. No pricing, no resourcing. Safe with any audience." },
    external:  { id: "external",  name: "Client-ready", short: "Cleared only",
                 note: "Only credentials cleared for external use are named. No pricing, no resourcing." },
  };
  GOV.MODES = MODES;

  var KEY_MODE = "ey.biz.mode";

  function readMode() {
    var q = new URLSearchParams(root.location.search).get("mode");
    if (q && MODES[q]) { try { sessionStorage.setItem(KEY_MODE, q); } catch (e) {} return q; }
    try { var s = sessionStorage.getItem(KEY_MODE); if (s && MODES[s]) return s; } catch (e) {}
    return "internal";
  }

  GOV.mode = readMode();
  GOV.modeInfo = MODES[GOV.mode];
  GOV.is = function (m) { return GOV.mode === m; };

  GOV.setMode = function (m) {
    if (!MODES[m] || m === GOV.mode) return;
    try { sessionStorage.setItem(KEY_MODE, m); } catch (e) {}
    GOV.track("mode.change", { to: m, from: GOV.mode });
    GOV.flush();
    var u = new URL(root.location.href);
    u.searchParams.set("mode", m);
    root.location.href = u.toString();
  };

  /* Derived permissions. Everything downstream asks these, rather than each
     page re-deciding what "sanitised" means and drifting apart. */
  GOV.showPricing   = function () { return GOV.mode === "internal"; };
  GOV.showResourcing= function () { return GOV.mode === "internal"; };
  GOV.showCollab    = function () { return GOV.mode === "internal"; };
  GOV.showTelemetry = function () { return GOV.mode === "internal"; };

  /* ==========================================================================
   *  3 · THE PERMISSION TABLE
   *
   *  extApproved is FALSE for every credential, on purpose. Nothing in the
   *  source material establishes that any of these five have been cleared for
   *  external use - the pitch deck this content came from carries the same
   *  open permission gate - so the safe default is that none of them have
   *  been. The reviewer named in GOV.meta flips a flag to true once they hold
   *  the written approval. Until then, external mode behaves as sanitised.
   *
   *  anon is what renders in place of the name. It has to be specific enough
   *  to keep the credential meaningful and vague enough not to be the name.
   * ======================================================================== */
  var PERM = {
    doj: {
      extApproved: false,
      anon: "National justice agency", anonShort: "Justice",
      anonSector: "Justice · National",
    },
    hse: {
      extApproved: false,
      anon: "National health service", anonShort: "Health",
      anonSector: "Health · National",
    },
    cso: {
      extApproved: false,
      anon: "National statistics agency", anonShort: "Statistics",
      anonSector: "Statistics · National",
    },
    kerry: {
      extApproved: false,
      anon: "Global food and beverage group", anonShort: "F&B",
      anonSector: "Food & Beverage · Global",
    },
    utility: {
      extApproved: false,
      anon: "National electricity operator", anonShort: "Energy",
      anonSector: "Energy & Utilities · National",
    },
  };
  GOV.PERM = PERM;

  /* Is this client allowed to be named in the current mode? */
  GOV.named = function (c) {
    if (!c) return false;
    if (GOV.mode === "internal") return true;
    if (GOV.mode === "sanitised") return false;
    return !!(PERM[c.id] && PERM[c.id].extApproved);
  };

  /* The single accessor every page uses to put a client on screen. Returns the
     name, short name, sector and logo key appropriate to the current mode, so
     no page ever reaches into c.name directly and accidentally leaks one. */
  GOV.identity = function (c) {
    var p = PERM[c.id] || {};
    if (GOV.named(c)) {
      return { name: c.name, short: c.short, sector: c.sector,
               logo: c.logo, anonymised: false, cleared: !!p.extApproved };
    }
    return {
      name: p.anon || (c.sector ? c.sector.split("·")[0].trim() + " organisation" : "Client"),
      short: p.anonShort || "Client",
      sector: p.anonSector || c.sector,
      logo: null, anonymised: true, cleared: false,
    };
  };

  /* How many credentials are actually cleared. Surfaced on the mode bar so
     the gap between "we have five credentials" and "we may show none of them
     externally" is visible rather than discovered in a client meeting. */
  GOV.clearedCount = function (clients) {
    return (clients || []).filter(function (c) {
      return PERM[c.id] && PERM[c.id].extApproved;
    }).length;
  };

  /* ==========================================================================
   *  4 · COMMERCIAL FILTERING
   *
   *  Every capability pattern carries three value statements in a fixed order:
   *  outcome, speed and commercial shape, why EY. The middle one contains the
   *  indicative price. Recommendation 3: that one does not render outside
   *  internal mode. Fourteen day-one rates in front of a client anchor the
   *  commercial conversation before anybody has scoped anything.
   *
   *  The test is on the indicative flag and the label, not on a position in
   *  the array, so adding a fourth value statement later cannot silently
   *  reintroduce a price.
   * ======================================================================== */
  var MONEY = /[€$£]\s?\d|\bk\/month\b|\bfrom ~|\bper day\b/i;

  GOV.commercial = function (v) {
    return !!v && (v.indicative === true || /commercial|price|pricing|rate|cost/i.test(v.t || "") || MONEY.test(v.b || ""));
  };

  GOV.values = function (s) {
    var list = (s && s.value) || [];
    if (GOV.showPricing()) return list;
    return list.filter(function (v) { return !GOV.commercial(v); });
  };

  /* Resourcing. Pod sizes and named leads read as a staffing commitment when
     a client sees them before a scope exists. Recommendation 9. */
  GOV.pod = function (s) {
    return (GOV.showResourcing() && s && s.pod) ? s.pod : null;
  };

  /* The competencies that delivered it. Internal only - it describes how EY
     staffs itself, not what the client received. */
  GOV.collab = function (c) {
    return (GOV.showCollab() && c && c.collab) ? c.collab : null;
  };

  /* ==========================================================================
   *  4b · APPLY
   *
   *  One pass over the content model at load, before anything renders.
   *
   *  The alternative was to route every render site in three pages through a
   *  permission call, and the first time somebody added a fourth page or
   *  forgot one accessor, a client name would appear in a sanitised session.
   *  Filtering the model once means the restricted values are not in memory to
   *  be leaked: there is no code path that can reach c.name and find the real
   *  one, because the real one is gone.
   *
   *  It also means the 3D scene sanitises itself for free. The city bakes each
   *  client logo into a facade decal from c.logo at build time, and build runs
   *  after this - so a null logo simply produces no decal, and no render code
   *  in ey-city.js had to learn what audience mode is.
   * ======================================================================== */
  GOV.apply = function (BIZ) {
    if (!BIZ || BIZ.__gov) return BIZ;
    BIZ.__gov = true;

    (BIZ.city.clients || []).forEach(function (c) {
      var id = GOV.identity(c);
      c.anonymised = id.anonymised;
      c.cleared = id.cleared;
      if (id.anonymised) {
        c.realId = c.id;                 // kept for telemetry, never rendered
        c.name = id.name; c.short = id.short; c.sector = id.sector;
        c.logo = null;
      }
      if (!GOV.showCollab()) c.collab = null;
    });

    Object.keys(BIZ.city.solutions || {}).forEach(function (k) {
      var s = BIZ.city.solutions[k];
      s.value = GOV.values(s);
      if (!GOV.showResourcing()) s.pod = null;
    });

    /* The offerings block names a contact per offering. That is a person's
       direct line, and it belongs on an internal page, not on a client one. */
    if (!GOV.showResourcing()) {
      (BIZ.offerings && BIZ.offerings.items || []).forEach(function (o) {
        o.contact = null; o.email = null;
      });
    }
    return BIZ;
  };

  /* ==========================================================================
   *  5 · ENTRY POINTS
   *
   *  Recommendation 5. The journey used to finish on a Close button, which is
   *  the one moment in the whole asset where the audience is most persuaded
   *  and least directed. These are the two routes in: assess where the client
   *  is, or diagnose what they already own. Both carry a named owner, so the
   *  next step is a person rather than an intention.
   * ======================================================================== */
  GOV.entry = [
    {
      id: "discovery",
      name: "Business Discovery",
      when: "The outcome is agreed but the route is not.",
      body: "A short, structured look at the priority journeys and processes, the opportunities worth taking and the value case behind them.",
      gives: ["Prioritised opportunities", "Value hypotheses", "Target vision and roadmap"],
      owner: "Terry Maguire", email: "Terry.Maguire@ie.ey.com",
      tone: "#FFE600",
    },
    {
      id: "diagnostic",
      name: "System Diagnostic",
      when: "The platform is already in place and underperforming.",
      body: "An assessment of the current estate - what it does, what it costs, where the value is leaking and what to do about it first.",
      gives: ["Current-state findings", "Improvement opportunities", "Prioritised action plan"],
      owner: "Harry Corbally", email: "Harry.Corbally@ie.ey.com",
      tone: "#FF9831",
    },
  ];

  GOV.mailto = function (e, subject, body) {
    return "mailto:" + e.email +
      "?subject=" + encodeURIComponent(subject || ("BizApps · " + e.name)) +
      "&body=" + encodeURIComponent(body || "");
  };

  /* ==========================================================================
   *  6 · TELEMETRY
   *
   *  Recommendation 4. Local-first by design: there is no endpoint behind
   *  these files, so inventing a silent upload would be dishonest. Events are
   *  buffered in localStorage and exported by hand as JSON or CSV. Point
   *  GOV.sink at a real collector later and the same events post to it.
   *
   *  Nothing here identifies a person. Session id is random per tab.
   * ======================================================================== */
  var KEY_EV = "ey.biz.telemetry";
  var CAP = 800;                 // ring buffer, so a kiosk left running cannot fill the quota
  GOV.sink = null;               // set to a URL to forward events

  var session = (function () {
    try {
      var s = sessionStorage.getItem("ey.biz.sid");
      if (!s) { s = "s" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); sessionStorage.setItem("ey.biz.sid", s); }
      return s;
    } catch (e) { return "s-nostore"; }
  })();

  var buffer = [];
  var t0 = Date.now();

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY_EV) || "[]"); } catch (e) { return []; }
  }

  GOV.flush = function () {
    if (!buffer.length) return;
    try {
      var all = load().concat(buffer);
      if (all.length > CAP) all = all.slice(all.length - CAP);
      localStorage.setItem(KEY_EV, JSON.stringify(all));
    } catch (e) { /* private mode, quota - telemetry is never worth an exception */ }
    if (GOV.sink && root.navigator && root.navigator.sendBeacon) {
      try { root.navigator.sendBeacon(GOV.sink, JSON.stringify(buffer)); } catch (e) {}
    }
    buffer = [];
  };

  GOV.track = function (ev, props) {
    var rec = {
      t: new Date().toISOString(),
      ms: Date.now() - t0,
      sid: session,
      view: (root.location.pathname.split("/").pop() || "index.html"),
      mode: GOV.mode,
      ev: ev,
    };
    if (props) Object.keys(props).forEach(function (k) { rec[k] = props[k]; });
    buffer.push(rec);
    if (buffer.length >= 12) GOV.flush();
    if (GOV.onTrack) try { GOV.onTrack(rec); } catch (e) {}
  };

  GOV.events = function () { return load().concat(buffer); };
  GOV.clear = function () { buffer = []; try { localStorage.removeItem(KEY_EV); } catch (e) {} };

  /* A session summary in the shape the FY27 ask actually wants: what was
     opened, what held attention, how long the room stayed in it. */
  GOV.summary = function () {
    var ev = GOV.events(), out = { sessions: {}, clients: {}, capabilities: {}, entry: {}, total: ev.length };
    ev.forEach(function (e) {
      out.sessions[e.sid] = 1;
      if (e.client) out.clients[e.client] = (out.clients[e.client] || 0) + 1;
      if (e.solution) out.capabilities[e.solution] = (out.capabilities[e.solution] || 0) + 1;
      if (e.ev === "entry.open") out.entry[e.entry] = (out.entry[e.entry] || 0) + 1;
    });
    out.sessionCount = Object.keys(out.sessions).length;
    return out;
  };

  function download(name, text, mime) {
    var b = new Blob([text], { type: mime || "text/plain;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(b); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 400);
  }

  GOV.exportJSON = function () {
    GOV.flush();
    download("bizapps-telemetry-" + new Date().toISOString().slice(0, 10) + ".json",
      JSON.stringify({ meta: GOV.meta, summary: GOV.summary(), events: GOV.events() }, null, 2),
      "application/json");
  };

  GOV.exportCSV = function () {
    GOV.flush();
    var ev = GOV.events();
    var cols = {};
    ev.forEach(function (e) { Object.keys(e).forEach(function (k) { cols[k] = 1; }); });
    var head = Object.keys(cols);
    var esc = function (v) {
      v = v == null ? "" : String(v);
      return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
    };
    var rows = ev.map(function (e) { return head.map(function (k) { return esc(e[k]); }).join(","); });
    download("bizapps-telemetry-" + new Date().toISOString().slice(0, 10) + ".csv",
      [head.join(",")].concat(rows).join("\n"), "text/csv;charset=utf-8");
  };

  root.addEventListener("pagehide", function () { GOV.track("session.end", { seconds: Math.round((Date.now() - t0) / 1000) }); GOV.flush(); });
  document.addEventListener("visibilitychange", function () { if (document.hidden) GOV.flush(); });

  /* ==========================================================================
   *  7 · THE ACCESS GATE
   *
   *  See the header. This keeps a passer-by out of a live demo. It is not a
   *  boundary. The credential is compared as a weak hash purely so the string
   *  is not sitting in plain text in the page source - that is obfuscation,
   *  and calling it anything else would be misleading.
   * ======================================================================== */
  function h32(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = (((h * 33) >>> 0) ^ s.charCodeAt(i)) >>> 0;
    return h >>> 0;
  }
  var EXPECT = 0x2f0b4974;              // user:pass
  var KEY_OK = "ey.biz.gate";

  GOV.unlocked = function () {
    try { return sessionStorage.getItem(KEY_OK) === String(EXPECT); } catch (e) { return false; }
  };

  /* gate(onPass) - draws a full-stage credential prompt and calls onPass once
     it is satisfied. Resolves immediately if this tab is already unlocked, so
     moving between views inside a session does not re-prompt. */
  GOV.gate = function (onPass) {
    if (GOV.unlocked()) { onPass(); return; }

    var host = document.createElement("div");
    host.className = "gate";
    host.setAttribute("role", "dialog");
    host.setAttribute("aria-modal", "true");
    host.setAttribute("aria-label", "Sign in to BizApps City");
    host.innerHTML =
      '<div class="gate-bg" aria-hidden="true"></div>' +
      '<form class="gate-card" autocomplete="off">' +
        '<img class="gate-ey" alt="EY" src="assets/img/ey.png">' +
        '<p class="gate-k">Microsoft AI Business Applications</p>' +
        '<h1>BizApps City</h1>' +
        '<p class="gate-l">This view carries delivered client engagements. Sign in to continue.</p>' +
        '<label>Username<input id="gU" name="u" type="text" autocomplete="off" spellcheck="false" autocapitalize="off" required></label>' +
        '<label>Password<input id="gP" name="p" type="password" autocomplete="off" required></label>' +
        '<p class="gate-err" id="gE" role="alert" hidden></p>' +
        '<button class="gate-go" type="submit">Enter the city</button>' +
        '<p class="gate-alt">No access? The <a href="engagement-index.html">Engagement Index</a> covers the same work.</p>' +
        '<p class="gate-note">Presentation control only. Client identities and commercial figures are governed by audience mode, not by this prompt.</p>' +
      "</form>";
    document.body.appendChild(host);
    document.body.classList.add("gated");

    var u = host.querySelector("#gU"), p = host.querySelector("#gP"), e = host.querySelector("#gE");
    setTimeout(function () { u.focus(); }, 60);
    var tries = 0;

    host.querySelector("form").addEventListener("submit", function (evt) {
      evt.preventDefault();
      if (h32(u.value.trim() + ":" + p.value) === EXPECT) {
        try { sessionStorage.setItem(KEY_OK, String(EXPECT)); } catch (er) {}
        GOV.track("gate.pass", { tries: tries + 1 });
        host.classList.add("out");
        setTimeout(function () { host.remove(); document.body.classList.remove("gated"); onPass(); }, 260);
      } else {
        tries++;
        GOV.track("gate.fail", { tries: tries });
        e.textContent = "That username and password combination was not recognised.";
        e.hidden = false;
        host.querySelector(".gate-card").classList.remove("shake");
        void host.offsetWidth;
        host.querySelector(".gate-card").classList.add("shake");
        p.value = ""; p.focus();
      }
    });
  };

  /* ==========================================================================
   *  8 · THE MODE BAR
   *  Mounted on every view. Shows which audience the page is currently
   *  rendering for, how many credentials are cleared, the version and owner,
   *  and - internally only - the telemetry export.
   * ======================================================================== */
  GOV.mountBar = function (clients) {
    var m = GOV.meta;
    var cleared = GOV.clearedCount(clients);
    var total = (clients || []).length;

    var bar = document.createElement("div");
    bar.className = "govbar mode-" + GOV.mode;
    bar.innerHTML =
      '<div class="gb-in">' +
        '<div class="gb-mode">' +
          '<span class="gb-lab">Audience</span>' +
          '<div class="gb-seg" role="group" aria-label="Audience mode">' +
            Object.keys(MODES).map(function (k) {
              return '<button data-mode="' + k + '"' +
                (k === GOV.mode ? ' class="on" aria-current="true"' : "") +
                ' title="' + MODES[k].note + '">' + MODES[k].name + "</button>";
            }).join("") +
          "</div>" +
        "</div>" +
        '<p class="gb-note">' + MODES[GOV.mode].note + "</p>" +
        '<div class="gb-r">' +
          (GOV.mode !== "internal"
            ? '<span class="gb-chip' + (cleared ? " ok" : " warn") + '">' + cleared + " of " + total + " cleared to name</span>"
            : '<span class="gb-chip warn">Not for a client screen</span>') +
          (GOV.showTelemetry()
            ? '<button class="gb-btn" data-act="tel">Usage</button>' : "") +
          '<button class="gb-btn" data-act="brief">Export brief</button>' +
          '<span class="gb-v" title="Owner ' + m.owner + " · reviewer " + m.reviewer + " · next review " + m.review + '">v' + m.version + "</span>" +
        "</div>" +
      "</div>";
    document.body.appendChild(bar);

    Array.prototype.forEach.call(bar.querySelectorAll("[data-mode]"), function (b) {
      b.addEventListener("click", function () { GOV.setMode(b.dataset.mode); });
    });
    var tel = bar.querySelector('[data-act="tel"]');
    if (tel) tel.addEventListener("click", GOV.panel);
    bar.querySelector('[data-act="brief"]').addEventListener("click", function () {
      GOV.track("brief.print", {});
      if (GOV.onBrief) GOV.onBrief(); else root.print();
    });
    return bar;
  };

  /* Usage panel. Internal only. */
  GOV.panel = function () {
    var s = GOV.summary();
    var old = document.querySelector(".telpanel");
    if (old) { old.remove(); return; }

    function rows(obj, empty) {
      var ks = Object.keys(obj).sort(function (a, b) { return obj[b] - obj[a]; });
      if (!ks.length) return '<p class="tp-empty">' + empty + "</p>";
      var max = obj[ks[0]] || 1;
      return '<ul class="tp-bars">' + ks.map(function (k) {
        return "<li><span class='n'>" + k + "</span><i style='width:" +
          Math.max(6, obj[k] / max * 100) + "%'></i><b>" + obj[k] + "</b></li>";
      }).join("") + "</ul>";
    }

    var p = document.createElement("div");
    p.className = "telpanel";
    p.innerHTML =
      '<div class="tp-h"><h3>Usage</h3><button class="tp-x" aria-label="Close">&#10005;</button></div>' +
      '<div class="tp-b">' +
        '<div class="tp-kpi"><div><b>' + s.sessionCount + "</b><span>sessions</span></div>" +
          "<div><b>" + s.total + "</b><span>events</span></div></div>" +
        "<h4>Engagements opened</h4>" + rows(s.clients, "Nothing opened yet this session.") +
        "<h4>Capabilities read</h4>" + rows(s.capabilities, "No capability detail opened yet.") +
        "<h4>Next steps taken</h4>" + rows(s.entry, "No entry point opened yet.") +
        '<div class="tp-f">' +
          '<button data-a="json">Export JSON</button>' +
          '<button data-a="csv">Export CSV</button>' +
          '<button data-a="clear" class="warn">Clear</button>' +
        "</div>" +
        '<p class="tp-note">Stored in this browser only. No endpoint is configured, so nothing leaves this machine until one is.</p>' +
      "</div>";
    document.body.appendChild(p);
    p.querySelector(".tp-x").addEventListener("click", function () { p.remove(); });
    p.querySelector('[data-a="json"]').addEventListener("click", GOV.exportJSON);
    p.querySelector('[data-a="csv"]').addEventListener("click", GOV.exportCSV);
    p.querySelector('[data-a="clear"]').addEventListener("click", function () { GOV.clear(); p.remove(); });
  };

  root.EYGOV = GOV;
})(window);

/* ============================================================================
 *  CONTENT VISIBILITY  ·  internal vs client-facing presentation modes
 *  ---------------------------------------------------------------------------
 *  window.CITY (ms-data.js) is authored for an INTERNAL audience. This module
 *  derives the view the scene actually renders, so a client-facing run of the
 *  city can never expose internal-only content through the DOM, page source,
 *  tooltips, or the client-side data payload — not by hiding it with CSS.
 *
 *  Mode resolution: ?mode=client|internal in the URL, else window.CITY_MODE
 *  set before this script runs, else 'internal' (safe default for day-to-day
 *  editing; a client-facing deployment should set the query param or bake
 *  window.CITY_MODE = 'client' into the page it serves).
 *
 *  Gate for client mode (tune here as real approvals land):
 *    a client or solution is shown only if visibility !== 'internal'
 *    AND approvalStatus !== 'not-approved'.
 *  Tighten to `approvalStatus === 'approved'` once every named client has a
 *  recorded sign-off — right now every real, named client is still 'pending'
 *  content review, which the looser gate above still allows into a demo.
 * ========================================================================== */
(function () {
  "use strict";

  function resolveMode() {
    try {
      const q = new URLSearchParams(location.search).get("mode");
      if (q === "client" || q === "internal") return q;
    } catch (_) { /* no location / URLSearchParams (non-browser context) */ }
    if (window.CITY_MODE === "client" || window.CITY_MODE === "internal") return window.CITY_MODE;
    return "internal";
  }

  const NON_NUMERIC_FALLBACK = "Timeline and investment shared on request.";

  function visibleTo(entry, mode) {
    if (mode === "internal") return true;
    if (entry.visibility === "internal") return false;
    if (entry.approvalStatus === "not-approved") return false;
    return true;
  }

  /** client-mode-safe copy of one solution's `value` line. */
  function filterValueLine(line, mode) {
    if (mode === "internal") return line;
    if (line.verified === false) return Object.assign({}, line, { text: NON_NUMERIC_FALLBACK });
    return line;
  }

  /** client-mode-safe copy of a solution (`buildings[]` entry). */
  function filterSolution(cap, mode) {
    const out = Object.assign({}, cap);
    if (Array.isArray(cap.value)) out.value = cap.value.map((l) => filterValueLine(l, mode));
    if (mode !== "internal") {
      if (out.pod) out.pod = { headcount: out.pod.headcount }; // drop internal lead names
    }
    return out;
  }

  /** client-mode-safe copy of a client (`clients[]` entry). */
  function filterClient(c, mode) {
    const out = Object.assign({}, c);
    if (mode !== "internal") {
      // internal-only / not-yet-approved fields never reach the client payload
      delete out.tenant;
      delete out.approvalOwner;
      delete out.approvalReference;
      delete out.lastContentReview;
      delete out.commercialsVerified;
      if (c.visibility === "anonymised") {
        out.displayLabel = c.anonymisedName || c.short;
        out.name = c.anonymisedName || c.short;
      } else {
        out.displayLabel = c.name;
      }
      if (!c.clientFacingApproved) delete out.logoKey;
      out.outcomeMetrics = (c.outcomeMetrics || []).filter((m) => m.verified);
    } else {
      out.displayLabel = c.name;
    }
    return out;
  }

  /**
   * Produce the city the scene should actually render for `mode`.
   * Deep enough to guarantee nothing internal-only survives into the
   * client-mode object graph (not just visually hidden).
   */
  function filterCity(raw, mode) {
    const capById = {};
    raw.buildings.forEach((b) => (capById[b.id] = b));

    const buildings = raw.buildings
      .filter((b) => visibleTo(b, mode))
      .map((b) => filterSolution(b, mode));
    const allowedCapIds = new Set(buildings.map((b) => b.id));

    const clients = raw.clients
      .filter((c) => visibleTo(c, mode))
      .map((c) => {
        const filtered = filterClient(c, mode);
        filtered.runs = (c.runs || []).filter((id) => allowedCapIds.has(id));
        if (filtered.relatedClientIds) {
          filtered.relatedClientIds = filtered.relatedClientIds.filter((id) =>
            raw.clients.some((rc) => rc.id === id && visibleTo(rc, mode))
          );
        }
        return filtered;
      })
      .filter((c) => c.runs.length > 0 || mode === "internal");

    return {
      practice: raw.practice,
      substrate: raw.substrate,
      districts: raw.districts,
      buildings,
      clients,
      mode,
    };
  }

  window.ContentVisibility = { resolveMode, filterCity, NON_NUMERIC_FALLBACK };
})();

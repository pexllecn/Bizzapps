/* ============================================================================
 *  EY BizApps - ey-brief.js
 *  The leave-behind.
 *  ---------------------------------------------------------------------------
 *  Recommendation 6. A partner finished a session and the client retained
 *  nothing: there was no print stylesheet and no export anywhere in the asset.
 *  The most persuasive thing in the room walked out with the laptop.
 *
 *  This builds a two-page brief for whatever is currently on screen, renders
 *  it into a hidden container and hands it to the browser print dialogue,
 *  where it saves as a PDF. It is composed from the same content model and
 *  passed through the same EYGOV filters, so a brief printed in a sanitised
 *  session carries the sanitised identities and no pricing. There is no path
 *  by which the leave-behind says more than the screen it came from.
 * ========================================================================== */

(function (root) {
  "use strict";

  var GOV = root.EYGOV, DIAG = root.EYDIAG, ICONS = root.ICONS || {};

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function icon(k) { return ICONS[k] || ""; }

  var B = {};

  /* build(client) - the engagement one-pager. Pass null for the portfolio
     summary, which is what prints from a view with nothing selected. */
  B.build = function (c) {
    var BIZ = root.BIZ, C = BIZ.city;
    var host = document.getElementById("printbrief") || (function () {
      var d = document.createElement("div");
      d.id = "printbrief"; d.className = "printbrief";
      document.body.appendChild(d);
      return d;
    })();

    var stamp = new Date().toLocaleDateString("en-IE", { day: "numeric", month: "long", year: "numeric" });
    var m = GOV.meta;

    var head =
      '<header class="pb-h">' +
        '<img class="pb-ey" alt="EY" src="' + icon("ey") + '">' +
        '<div class="pb-hm">' +
          "<b>Microsoft AI Business Applications</b>" +
          "<span>Customer &amp; Growth &middot; Technology Consulting &middot; EY Ireland</span>" +
        "</div>" +
        '<div class="pb-hr">' + esc(GOV.modeInfo.name) + " brief<br><i>" + stamp + "</i></div>" +
      "</header>";

    var foot =
      '<footer class="pb-f">' +
        "<p>" + esc(BIZ.close.disclaimer) + "</p>" +
        "<p><b>" + esc(m.owner) + "</b> &middot; " + esc(m.ownerEmail) +
          " &middot; v" + esc(m.version) + " &middot; reviewed " + esc(m.review) + "</p>" +
      "</footer>";

    var body;

    if (c) {
      var id = GOV.identity(c);
      var br = (BIZ.briefs || {})[c.id] || {};
      var collab = GOV.collab(c);

      body =
        '<section class="pb-t">' +
          (id.logo ? '<img class="pb-lg" alt="" src="' + icon(id.logo) + '">' : "") +
          '<div><p class="pb-sec">' + esc(id.sector) + "</p>" +
          "<h1>" + esc(id.name) + "</h1>" +
          '<p class="pb-tag">' + esc(c.tagline) + "</p>" +
          (id.anonymised ? '<p class="pb-anon">Identity withheld. This credential has not been cleared for external attribution.</p>' : "") +
          "</div>" +
        "</section>" +

        '<section class="pb-kpi">' + c.stats.map(function (s) {
          return "<div><b>" + esc(s.v) + "</b><span>" + esc(s.l) + "</span></div>";
        }).join("") + "</section>" +

        (br.problem
          ? '<section class="pb-s"><h2>The problem</h2><p class="pb-lead">' + esc(br.problem) + "</p></section>"
          : "") +

        (br.pairs && DIAG
          ? '<section class="pb-s"><h2>What changed</h2>' + DIAG.beforeAfter(br.pairs, c.tone) + "</section>"
          : "") +

        (br.result
          ? '<section class="pb-s"><h2>The result</h2><p class="pb-lead">' + esc(br.result) + "</p></section>"
          : "") +

        '<section class="pb-s pb-break"><h2>How it works, end to end</h2>' +
          (DIAG ? DIAG.flow(c, { solutions: C.solutions, lifecycle: C.lifecycle, tone: c.tone }) : "") +
        "</section>" +

        '<section class="pb-s"><h2>Capabilities in production</h2><ul class="pb-caps">' +
          c.solutions.map(function (sid) {
            var s = C.solutions[sid] || {};
            return "<li><b>" + esc(s.name || sid) + "</b>" + esc(s.what || "") + "</li>";
          }).join("") + "</ul></section>" +

        '<section class="pb-s"><h2>Why EY</h2><p>' + esc(c.eyDiff) + "</p>" +
          (collab ? '<p class="pb-col">Delivered with ' + esc(collab) + "</p>" : "") +
        "</section>" +

        B.entry();
    } else {
      body =
        '<section class="pb-t"><div><p class="pb-sec">Capability overview</p>' +
        "<h1>What we deliver, and where it is already running</h1>" +
        '<p class="pb-tag">' + esc(C.lede) + "</p></div></section>" +

        '<section class="pb-kpi">' + C.stats.map(function (s) {
          return "<div><b>" + esc(s.v) + "</b><span>" + esc(s.l) + "</span></div>";
        }).join("") + "</section>" +

        '<section class="pb-s"><h2>Capability coverage</h2>' +
          (DIAG ? DIAG.matrix(C.clients, C.solutions) : "") + "</section>" +

        '<section class="pb-s pb-break"><h2>One governed platform, five layers</h2>' +
          (DIAG ? DIAG.stack(BIZ.stack.layers, BIZ.products) : "") + "</section>" +

        B.entry();
    }

    host.innerHTML = head + body + foot;
    return host;
  };

  /* The two routes in, on the page the client keeps. */
  B.entry = function () {
    return '<section class="pb-s pb-ns"><h2>Where to start</h2><div class="pb-nsg">' +
      GOV.entry.map(function (e) {
        return '<div class="pb-n"><span class="w">' + esc(e.when) + "</span>" +
          "<h3>" + esc(e.name) + "</h3><p>" + esc(e.body) + "</p><ul>" +
          e.gives.map(function (g) { return "<li>" + esc(g) + "</li>"; }).join("") +
          "</ul><p class=\"o\"><b>" + esc(e.owner) + "</b> &middot; " + esc(e.email) + "</p></div>";
      }).join("") + "</div></section>";
  };

  /* print(client) - build it, print it, leave the DOM clean afterwards. */
  B.print = function (c) {
    B.build(c);
    document.body.classList.add("printing");
    var done = function () {
      document.body.classList.remove("printing");
      root.removeEventListener("afterprint", done);
    };
    root.addEventListener("afterprint", done);
    setTimeout(function () { root.print(); setTimeout(done, 1200); }, 90);
  };

  root.EYBRIEF = B;
})(window);

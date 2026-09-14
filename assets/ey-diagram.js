/* ============================================================================
 *  EY BizApps - ey-diagram.js
 *  SVG diagram generators for the Engagement Index.
 *  ---------------------------------------------------------------------------
 *  The index was carrying the whole argument in prose: four paragraphs per
 *  client, fourteen capability cards each with a full sentence of description,
 *  and a five-layer platform rendered as three stacked lists. All of it was
 *  accurate and almost none of it was scannable. Nobody reads a credential
 *  document linearly - they look for the shape of the thing and then stop.
 *
 *  These functions draw that shape. Every one of them is fed from the same
 *  content model that produced the prose, so a diagram cannot drift away from
 *  the text beside it, and every one of them runs the client identity through
 *  EYGOV so a sanitised session cannot leak a name through a picture.
 *
 *  Plain inline SVG: no dependency, no canvas, scales to any display, prints
 *  cleanly into the leave-behind and stays legible in high contrast.
 * ========================================================================== */

(function (root) {
  "use strict";

  var GOV = root.EYGOV;
  var ICONS = root.ICONS || {};

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function icon(k) { return ICONS[k] || ""; }

  /* Wrap a label to a pixel width without a text measuring pass. Interstate at
     these sizes runs close enough to 0.54em average that a character budget is
     accurate to within a glyph, and being one glyph out is invisible. */
  function wrap(s, px, size) {
    var per = Math.max(6, Math.floor(px / (size * 0.54)));
    var words = String(s).split(/\s+/), lines = [], cur = "";
    words.forEach(function (w) {
      if (!cur.length) { cur = w; return; }
      if ((cur + " " + w).length <= per) cur += " " + w; else { lines.push(cur); cur = w; }
    });
    if (cur) lines.push(cur);
    return lines;
  }
  function tspans(s, x, y, px, size, lh) {
    return wrap(s, px, size).map(function (l, i) {
      return '<tspan x="' + x + '" y="' + (y + i * (lh || size * 1.25)) + '">' + esc(l) + "</tspan>";
    }).join("");
  }

  var D = {};

  /* ==========================================================================
   *  1 · ENGAGEMENT FLOW
   *  The six-stage journey as a single read. Previously this was a ribbon of
   *  buttons plus a paragraph that only ever showed one stage at a time, so
   *  the audience never saw the route - only the step they were standing on.
   *  Here the whole route is on screen, the active stage is lit, and the
   *  lifecycle band above shows where advise stops and run begins.
   * ======================================================================== */
  D.flow = function (c, opts) {
    opts = opts || {};
    var steps = c.journey || [];
    var sols = opts.solutions || {};
    var lifecycle = opts.lifecycle || [];
    var n = steps.length;
    if (!n) return "";

    var W = 1000, PAD = 18, GAP = 12;
    var cw = (W - PAD * 2 - GAP * (n - 1)) / n;
    var BAND = 30, TOP = BAND + 26, CH = 104, H = TOP + CH + 44;
    var tone = opts.tone || "#FFE600";

    /* lifecycle band: which stages sit under advise, build and run */
    var segs = lifecycle.map(function (l) {
      var ix = [];
      steps.forEach(function (st, i) {
        var s = sols[st.sid];
        if (s && (s.lifecycle || []).indexOf(l.id) >= 0) ix.push(i);
      });
      if (!ix.length) return null;
      var a = Math.min.apply(null, ix), b = Math.max.apply(null, ix);
      return { l: l, x: PAD + a * (cw + GAP), w: (b - a + 1) * cw + (b - a) * GAP };
    }).filter(Boolean);

    var band = segs.map(function (s, i) {
      return '<g class="dg-band b' + i + '">' +
        '<rect x="' + s.x + '" y="6" width="' + s.w + '" height="' + (BAND - 12) + '" rx="9"/>' +
        '<text x="' + (s.x + 12) + '" y="' + (BAND / 2 + 3) + '">' + esc(s.l.name.toUpperCase()) + "</text>" +
      "</g>";
    }).join("");

    var cards = steps.map(function (st, i) {
      var s = sols[st.sid] || {};
      var x = PAD + i * (cw + GAP);
      var ic = icon((s.icons || [])[0]);
      return '<g class="dg-step" data-ix="' + i + '" data-sid="' + esc(st.sid) + '" tabindex="0" role="button" ' +
             'aria-label="Stage ' + (i + 1) + ": " + esc(s.name || st.sid) + '">' +
        '<rect class="bx" x="' + x + '" y="' + TOP + '" width="' + cw + '" height="' + CH + '" rx="10"/>' +
        '<rect class="tp" x="' + x + '" y="' + TOP + '" width="' + cw + '" height="3" rx="1.5"/>' +
        '<text class="ix" x="' + (x + 13) + '" y="' + (TOP + 24) + '">' + ("0" + (i + 1)) + "</text>" +
        (ic ? '<image href="' + ic + '" x="' + (x + cw - 32) + '" y="' + (TOP + 12) + '" width="19" height="19" opacity=".9"/>' : "") +
        '<text class="nm" x="' + (x + 13) + '">' + tspans(s.short || s.name || st.sid, x + 13, TOP + 48, cw - 26, 13) + "</text>" +
      "</g>" +
      (i < n - 1
        ? '<path class="dg-link" d="M' + (x + cw + 1) + " " + (TOP + CH / 2) + "H" + (x + cw + GAP - 1) + '"/>' +
          '<circle class="dg-dot" cx="' + (x + cw + GAP / 2) + '" cy="' + (TOP + CH / 2) + '" r="2.6"/>'
        : "");
    }).join("");

    return '<svg class="dg dg-flow" viewBox="0 0 ' + W + " " + H + '" role="img" ' +
      'aria-label="Engagement flow, ' + n + ' stages" style="--c:' + esc(tone) + '">' +
      band + cards +
      '<text class="dg-cap" x="' + PAD + '" y="' + (H - 12) + '">Left to right: what happens to one request, end to end.</text>' +
    "</svg>";
  };

  /* ==========================================================================
   *  2 · BEFORE AND AFTER
   *  The challenge and the outcome were two dense paragraphs side by side. The
   *  comparison was there but you had to hold both in your head to see it.
   *  Three matched pairs, one line each, and the contrast does the work.
   * ======================================================================== */
  D.beforeAfter = function (pairs, tone) {
    if (!pairs || !pairs.length) return "";
    var W = 1000, RH = 62, PAD = 16, HEAD = 34;
    var H = HEAD + pairs.length * RH + 10;
    var colW = (W - PAD * 2 - 92) / 2;
    var lx = PAD, rx = PAD + colW + 92;

    var rows = pairs.map(function (p, i) {
      var y = HEAD + i * RH;
      return '<g class="dg-ba-row">' +
        '<rect class="l" x="' + lx + '" y="' + y + '" width="' + colW + '" height="' + (RH - 12) + '" rx="8"/>' +
        '<text class="tl" x="' + (lx + 14) + '">' + tspans(p[0], lx + 14, y + 21, colW - 28, 13) + "</text>" +
        '<path class="ar" d="M' + (lx + colW + 22) + " " + (y + (RH - 12) / 2) + "H" + (rx - 22) + '"/>' +
        '<path class="ah" d="M' + (rx - 28) + " " + (y + (RH - 12) / 2 - 4) + 'l6 4-6 4z"/>' +
        '<rect class="r" x="' + rx + '" y="' + y + '" width="' + colW + '" height="' + (RH - 12) + '" rx="8"/>' +
        '<text class="tr" x="' + (rx + 14) + '">' + tspans(p[1], rx + 14, y + 21, colW - 28, 13) + "</text>" +
      "</g>";
    }).join("");

    return '<svg class="dg dg-ba" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Before and after" ' +
      'style="--c:' + esc(tone || "#FFE600") + '">' +
      '<text class="dg-hd a" x="' + lx + '" y="18">BEFORE</text>' +
      '<text class="dg-hd b" x="' + rx + '" y="18">AFTER</text>' + rows +
    "</svg>";
  };

  /* ==========================================================================
   *  3 · COVERAGE MATRIX
   *  Fourteen capability cards, each repeating "in production at N clients",
   *  replaced by the grid that sentence was describing. This is the single
   *  most useful picture in the asset: it shows at a glance which capabilities
   *  are proven across the portfolio and which rest on one engagement - which
   *  is exactly the question a partner is asked in a pitch.
   * ======================================================================== */
  D.matrix = function (clients, solutions, order) {
    var sids = order || Object.keys(solutions);
    var LBL = 250, COL = 86, ROW = 30, HEAD = 92, PAD = 10;
    var W = LBL + clients.length * COL + PAD * 2;
    var H = HEAD + sids.length * ROW + 44;

    var heads = clients.map(function (c, i) {
      var id = GOV ? GOV.identity(c) : { name: c.name, short: c.short, logo: c.logo };
      var x = LBL + i * COL + COL / 2;
      var lg = id.logo && icon(id.logo);
      return '<g class="dg-mh">' +
        (lg ? '<image href="' + lg + '" x="' + (x - 13) + '" y="' + (HEAD - 54) + '" width="26" height="26"/>'
            : '<circle cx="' + x + '" cy="' + (HEAD - 41) + '" r="13" class="anon"/>') +
        '<text x="' + x + '" y="' + (HEAD - 16) + '">' + tspans(id.short, x, HEAD - 16, COL - 8, 10, 11) + "</text>" +
      "</g>";
    }).join("");

    var rows = sids.map(function (sid, r) {
      var s = solutions[sid] || {};
      var y = HEAD + r * ROW;
      var at = clients.filter(function (c) { return (c.solutions || []).indexOf(sid) >= 0; }).length;
      var cells = clients.map(function (c, i) {
        var on = (c.solutions || []).indexOf(sid) >= 0;
        var x = LBL + i * COL + COL / 2;
        return on
          ? '<rect class="cell on" x="' + (x - 13) + '" y="' + (y + 4) + '" width="26" height="' + (ROW - 12) + '" rx="4"/>'
          : '<line class="cell off" x1="' + (x - 5) + '" y1="' + (y + ROW / 2 - 1) + '" x2="' + (x + 5) + '" y2="' + (y + ROW / 2 - 1) + '"/>';
      }).join("");
      return '<g class="dg-mr' + (at > 2 ? " strong" : "") + '" data-sid="' + esc(sid) + '" tabindex="0" role="button" ' +
             'aria-label="' + esc(s.name || sid) + ", deployed at " + at + ' of ' + clients.length + '">' +
        '<rect class="hit" x="0" y="' + y + '" width="' + W + '" height="' + (ROW - 4) + '" rx="5"/>' +
        '<text class="lb" x="10" y="' + (y + ROW / 2 + 3) + '">' + esc(s.short || s.name || sid) + "</text>" +
        '<text class="ct" x="' + (LBL - 18) + '" y="' + (y + ROW / 2 + 3) + '">' + at + "</text>" +
        cells +
      "</g>";
    }).join("");

    return '<svg class="dg dg-mx" viewBox="0 0 ' + W + " " + H + '" role="img" ' +
      'aria-label="Capability coverage across ' + clients.length + ' engagements">' +
      '<text class="dg-hd" x="10" y="20">CAPABILITY</text>' +
      '<text class="dg-hd" x="' + (LBL - 18) + '" y="20" text-anchor="end">AT</text>' +
      heads + rows +
      '<text class="dg-cap" x="10" y="' + (H - 14) + '">A filled cell is a capability in production for that engagement. Select a row for detail.</text>' +
    "</svg>";
  };

  /* ==========================================================================
   *  4 · PLATFORM STACK
   *  Five layers were three stacked lists. Drawn as layers, the point of the
   *  content - that trust sits underneath everything and experience sits on
   *  top of all of it - is made by the picture instead of by a caption.
   * ======================================================================== */
  D.stack = function (layers, products) {
    var W = 1000, LH = 78, PAD = 12, H = layers.length * LH + PAD * 2 + 30;
    var body = layers.map(function (l, i) {
      var y = PAD + i * LH;
      var inset = i * 9;                       // each layer sits slightly inside the one below
      var x = PAD + inset, w = W - PAD * 2 - inset * 2;
      var chips = (l.products || []).slice(0, 6).map(function (k, j) {
        var p = (products || {})[k] || {}, ic = icon(k);
        var cx = x + w - 22 - (Math.min(6, l.products.length) - j) * 30;
        return ic ? '<image href="' + ic + '" x="' + cx + '" y="' + (y + LH / 2 - 21) + '" width="20" height="20">' +
                    "<title>" + esc(p.name || k) + "</title></image>" : "";
      }).join("");
      return '<g class="dg-ly" style="--c:' + esc(l.color) + '" data-layer="' + esc(l.id) + '" tabindex="0" role="button" ' +
             'aria-label="' + esc(l.name) + ' layer">' +
        '<rect class="bx" x="' + x + '" y="' + y + '" width="' + w + '" height="' + (LH - 10) + '" rx="9"/>' +
        '<rect class="ed" x="' + x + '" y="' + y + '" width="4" height="' + (LH - 10) + '" rx="2"/>' +
        '<text class="ix" x="' + (x + 18) + '" y="' + (y + 27) + '">' + esc(l.index) + "</text>" +
        '<text class="nm" x="' + (x + 48) + '" y="' + (y + 27) + '">' + esc(l.name) + "</text>" +
        '<text class="cp" x="' + (x + 48) + '">' + tspans(l.caption, x + 48, y + 46, w - 250, 11.5, 14) + "</text>" +
        chips +
      "</g>";
    }).join("");
    return '<svg class="dg dg-stack" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Five-layer Microsoft platform">' +
      body +
      '<text class="dg-cap" x="' + PAD + '" y="' + (H - 10) + '">Every engagement is assembled from these five layers. Trust sits beneath all of it.</text>' +
    "</svg>";
  };

  /* ==========================================================================
   *  5 · SCALE BARS
   *  The hero statistics were four numbers with no relationship to each other.
   *  Put on a common scale they become a portfolio shape rather than a list.
   * ======================================================================== */
  D.scale = function (items) {
    var W = 1000, RH = 46, PAD = 10, LBL = 150;
    var H = items.length * RH + PAD * 2;
    var max = Math.max.apply(null, items.map(function (i) { return i.n || 0; })) || 1;
    var body = items.map(function (it, i) {
      var y = PAD + i * RH;
      var w = Math.max(4, (it.n / max) * (W - LBL - 220));
      return '<g class="dg-sb">' +
        '<text class="v" x="' + (LBL - 14) + '" y="' + (y + 22) + '" text-anchor="end">' + esc(it.v) + "</text>" +
        '<rect class="br" x="' + LBL + '" y="' + (y + 9) + '" width="' + w + '" height="16" rx="8"/>' +
        '<text class="l" x="' + (LBL + w + 14) + '" y="' + (y + 22) + '">' + esc(it.l) + "</text>" +
      "</g>";
    }).join("");
    return '<svg class="dg dg-scale" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Delivery scale">' + body + "</svg>";
  };

  root.EYDIAG = D;
})(window);

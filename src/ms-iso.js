/* ==========================================================================
 *  POWER PLATFORM LANDSCAPE · isometric engine (pure SVG, no dependencies)
 *  Draws a light, colourful isometric scene: a Dataverse core, the Power
 *  Platform services around it (with product marks), and the business
 *  solutions we built as buildings, linked by animated data flows.
 *  Product marks are simplified, brand-coloured interpretations.
 * ========================================================================== */
(function () {
  "use strict";
  const D = window.SHOWCASE;
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const NS = "http://www.w3.org/2000/svg";
  const $ = (s) => document.querySelector(s);

  const TILE = 92;
  const COS30 = Math.cos(Math.PI / 6);
  const iso = (x, y, z) => [(x - y) * COS30 * TILE, (x + y) * 0.5 * TILE - z * TILE];

  const layerColor = {};
  D.layers.forEach((l) => (layerColor[l.id] = l.color));

  const brandColor = {
    dataverse: "#9B63D6", powerapps: "#742774", powerautomate: "#0B53CE",
    powerbi: "#E3A200", copilot: "#7A5CD6", powerpages: "#0E7C8B",
    sharepoint: "#036C70", teams: "#5B5FC7", outlook: "#0F6CBD",
    dynamics: "#0B53CE", azure: "#0078D4",
  };

  /* ---------- svg helpers ---------- */
  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
  function bd(x, y) { if (x < minX) minX = x; if (y < minY) minY = y; if (x > maxX) maxX = x; if (y > maxY) maxY = y; }
  function poly(parent, pts, fill, extra) {
    let s = "";
    for (const p of pts) { s += p[0].toFixed(1) + "," + p[1].toFixed(1) + " "; bd(p[0], p[1]); }
    el("polygon", Object.assign({ points: s.trim(), fill }, extra || {}), parent);
  }
  function shade(hex, f) {
    let r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    if (f >= 0) { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; }
    else { r *= 1 + f; g *= 1 + f; b *= 1 + f; }
    return "rgb(" + (r | 0) + "," + (g | 0) + "," + (b | 0) + ")";
  }

  /* ---------- an isometric box (3 visible faces) ---------- */
  function isoBox(parent, gx, gy, w, d, h, base, floors) {
    const xm = gx - w / 2, xM = gx + w / 2, ym = gy - d / 2, yM = gy + d / 2;
    const P = (x, y, z) => iso(x, y, z);
    const Bh = P(xM, ym, h), Ch = P(xM, yM, h), Dh = P(xm, yM, h), Ah = P(xm, ym, h);
    const B0 = P(xM, ym, 0), C0 = P(xM, yM, 0), D0 = P(xm, yM, 0);
    // left/front face (y = yM)
    poly(parent, [Dh, Ch, C0, D0], shade(base, -0.04));
    // right face (x = xM)
    poly(parent, [Bh, Ch, C0, B0], shade(base, -0.20));
    // subtle floor lines on the right face
    if (floors) {
      for (let i = 1; i < floors; i++) {
        const z = (h / floors) * i;
        const a = P(xM, ym, z), b = P(xM, yM, z);
        el("line", { x1: a[0].toFixed(1), y1: a[1].toFixed(1), x2: b[0].toFixed(1), y2: b[1].toFixed(1),
          stroke: shade(base, -0.34), "stroke-width": 1, opacity: 0.6 }, parent);
      }
    }
    // top face
    poly(parent, [Ah, Bh, Ch, Dh], shade(base, 0.30), { stroke: shade(base, 0.42), "stroke-width": 1 });
    return { top: iso(gx, gy, h), ground: iso(gx, gy, 0) };
  }

  /* =====================================================================
   *  Simplified Microsoft product marks (brand-coloured, screen-aligned)
   *  drawn in a ~28px box centred at the origin.
   * =================================================================== */
  const rrect = (p, x, y, w, h, r, fill, extra) => el("rect", Object.assign({ x, y, width: w, height: h, rx: r, fill }, extra || {}), p);
  const M = {
    dataverse(g) {
      [["#B98BE6", -10], ["#9B63D6", -1.5], ["#7D45C0", 7]].forEach(([c, y]) =>
        rrect(g, -12, y, 24, 6.5, 3, c));
    },
    powerapps(g) {
      el("polygon", { points: "0,-13 13,0 0,13 -13,0", fill: "#742774" }, g);
      el("polygon", { points: "0,-6.5 6.5,0 0,6.5 -6.5,0", fill: "none", stroke: "#E7D6F2", "stroke-width": 2.4 }, g);
    },
    powerautomate(g) {
      rrect(g, -13, -13, 26, 26, 7, "#0B53CE");
      el("path", { d: "M -5.5 -6 L -5.5 3 A 5.5 5.5 0 0 0 5.5 3 L 5.5 -1", fill: "none", stroke: "#fff",
        "stroke-width": 2.6, "stroke-linecap": "round" }, g);
      el("polygon", { points: "5.5,-5 9,0.4 2,0.4", fill: "#fff" }, g);
    },
    powerbi(g) {
      [[-9, 12], [-1.5, 18], [6, 24]].forEach(([x, hh]) => rrect(g, x, 12 - hh, 6, hh, 1.6, "#E3A200"));
    },
    copilot(g) {
      el("path", { d: "M0 -13 C 3 -4 4 -3 13 0 C 4 3 3 4 0 13 C -3 4 -4 3 -13 0 C -4 -3 -3 -4 0 -13 Z",
        fill: "#7A5CD6" }, g);
      el("circle", { cx: 0, cy: 0, r: 3, fill: "#fff" }, g);
    },
    powerpages(g) {
      el("circle", { cx: 0, cy: 0, r: 12.5, fill: "#0E7C8B" }, g);
      el("ellipse", { cx: 0, cy: 0, rx: 5.4, ry: 12.5, fill: "none", stroke: "#CFEAEE", "stroke-width": 1.6 }, g);
      el("line", { x1: -12.5, y1: 0, x2: 12.5, y2: 0, stroke: "#CFEAEE", "stroke-width": 1.6 }, g);
    },
    sharepoint(g) {
      rrect(g, -13, -13, 26, 26, 7, "#036C70");
      el("circle", { cx: -2.5, cy: 0, r: 6, fill: "none", stroke: "#fff", "stroke-width": 2.4 }, g);
      el("circle", { cx: 4.5, cy: 0, r: 4, fill: "none", stroke: "#9FE0DE", "stroke-width": 2.2 }, g);
    },
    teams(g) {
      rrect(g, -13, -13, 26, 26, 7, "#5B5FC7");
      el("rect", { x: -8, y: -6.5, width: 16, height: 3.2, rx: 1, fill: "#fff" }, g);
      el("rect", { x: -1.6, y: -6.5, width: 3.2, height: 15, rx: 1, fill: "#fff" }, g);
      el("circle", { cx: 7, cy: -3, r: 3, fill: "#CFD0F0" }, g);
    },
    outlook(g) {
      rrect(g, -13, -13, 26, 26, 7, "#0F6CBD");
      el("rect", { x: -8, y: -5.5, width: 16, height: 11, rx: 1.6, fill: "#fff" }, g);
      el("polyline", { points: "-7,-4 0,2 7,-4", fill: "none", stroke: "#0F6CBD", "stroke-width": 1.8 }, g);
    },
    dynamics(g) {
      rrect(g, -13, -13, 26, 26, 7, "#0B53CE");
      el("path", { d: "M -6 -7 L 5 -7 A 4 4 0 0 1 5 1 L -1 1 L -1 8", fill: "none", stroke: "#fff",
        "stroke-width": 2.6, "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
    },
    azure(g) {
      el("polygon", { points: "-1,-12 5,-12 13,11 -6,11", fill: "#0078D4" }, g);
      el("polygon", { points: "-1,-12 3,-2 -7,7 -13,11 -3,11", fill: "#3AA0E8" }, g);
    },
  };

  /* Draw a product mark centred at (0,0) within a `half`-radius box.
     Uses a real inlined icon from window.ICONS[id] when available,
     otherwise the built-in drawn mark above. */
  function drawMark(parent, id, half) {
    const ic = (window.ICONS || {})[id];
    if (ic) {
      const im = el("image", { x: -half, y: -half, width: half * 2, height: half * 2,
        preserveAspectRatio: "xMidYMid meet" }, parent);
      im.setAttribute("href", ic);
      im.setAttributeNS("http://www.w3.org/1999/xlink", "href", ic);
      return;
    }
    if (M[id]) M[id](el("g", { transform: `scale(${(half / 14).toFixed(3)})` }, parent));
  }

  /* =====================================================================
   *  Build the scene
   * =================================================================== */
  const svg = $("#scene");
  const Lground = $("#Lground"), Lbeams = $("#Lbeams"), Lparts = $("#Lparts"),
        Lnodes = $("#Lnodes"), Llabels = $("#Llabels");
  const nodes = {};   // id -> node
  const beams = [];
  let selected = null;

  /* ---- ground slab ---- */
  function buildGround() {
    let gxm = 1e9, gxM = -1e9, gym = 1e9, gyM = -1e9;
    const consider = (pos, size) => {
      gxm = Math.min(gxm, pos[0] - size); gxM = Math.max(gxM, pos[0] + size);
      gym = Math.min(gym, pos[1] - size); gyM = Math.max(gyM, pos[1] + size);
    };
    consider(D.services.dataverse.pos, 1.4);
    for (const k in D.services) consider(D.services[k].pos, 1.1);
    D.apps.forEach((a) => consider(a.pos, 1.1));
    const m = 0.6;
    gxm -= m; gxM += m; gym -= m; gyM += m;
    const th = 0.16;
    const A = iso(gxm, gym, 0), B = iso(gxM, gym, 0), C = iso(gxM, gyM, 0), G = iso(gxm, gyM, 0);
    const Bd = iso(gxM, gym, -th), Cd = iso(gxM, gyM, -th), Gd = iso(gxm, gyM, -th);
    // thickness
    poly(Lground, [G, C, Cd, Gd], "#C4D5EA");
    poly(Lground, [C, B, Bd, Cd], "#B4C7DF");
    // top
    poly(Lground, [A, B, C, G], "#E9F1FB", { stroke: "#D3E0F0", "stroke-width": 1.5 });
    // grid
    for (let x = Math.ceil(gxm); x <= Math.floor(gxM); x++) {
      const a = iso(x, gym, 0), b = iso(x, gyM, 0);
      el("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: "#D3E0F0", "stroke-width": 1 }, Lground);
    }
    for (let y = Math.ceil(gym); y <= Math.floor(gyM); y++) {
      const a = iso(gxm, y, 0), b = iso(gxM, y, 0);
      el("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: "#D3E0F0", "stroke-width": 1 }, Lground);
    }
    // Microsoft badge + label near the back corner
    const bp = iso(gxm + 0.55, gym + 0.55, 0);
    const bg = el("g", { transform: `translate(${bp[0].toFixed(1)},${bp[1].toFixed(1)})` }, Lground);
    const cols = ["#F25022", "#7FBA00", "#00A4EF", "#FFB900"];
    cols.forEach((c, i) => rrect(bg, (i % 2) * 9 - 8.5, Math.floor(i / 2) * 9 - 8.5, 8, 8, 1.5, c));
    const tx = el("text", { x: 14, y: 2, fill: "#5B6B85", "font-size": 13, "font-weight": 700,
      "font-family": "Segoe UI, Inter, sans-serif" }, bg);
    tx.textContent = "Microsoft Cloud";
  }

  /* ---- one node (service / core / app) ---- */
  function drawNode(id, cfg, type) {
    const g = el("g", { class: "node" }, Lnodes);
    const base = layerColor[cfg.layer];
    const isTall = type !== "service";
    const geo = isoBox(g, cfg.pos[0], cfg.pos[1], cfg.size, cfg.size, cfg.h, base, isTall ? Math.round(cfg.h * 2) : 0);

    // product mark billboard (services + core)
    if (cfg.logo) {
      const a = geo.top;
      const mg = el("g", { transform: `translate(${a[0].toFixed(1)},${(a[1] - 30).toFixed(1)})` }, g);
      // little white disc behind the mark for contrast
      el("circle", { cx: 0, cy: 0, r: 19, fill: "#fff", stroke: "#E4ECF6", "stroke-width": 1.5,
        filter: "url(#soft)" }, mg);
      drawMark(mg, cfg.logo, 13);
      bd(a[0] - 22, a[1] - 52); bd(a[0] + 22, a[1] - 8);
    }
    // label (with a white halo so it reads over any building or beam)
    const lp = geo.ground;
    const t = el("text", { x: lp[0].toFixed(1), y: (lp[1] + 25).toFixed(1), "text-anchor": "middle",
      "font-size": 12.5, "font-weight": type === "app" ? 700 : 600, fill: "#2A3A57",
      stroke: "#FFFFFF", "stroke-width": 3.5, "paint-order": "stroke", "stroke-linejoin": "round",
      "font-family": "Segoe UI, Inter, sans-serif", class: "nlabel" }, Llabels);
    t.textContent = cfg.name;
    bd(lp[0] - 60, lp[1] + 34); bd(lp[0] + 60, lp[1] + 34);

    const node = { id, type, cfg, g, label: t, top: geo.top, ground: geo.ground };
    nodes[id] = node;

    g.addEventListener("pointerenter", () => onHover(node, true));
    g.addEventListener("pointerleave", () => onHover(node, false));
    g.addEventListener("click", (e) => { if (!dragMoved) { e.stopPropagation(); selectNode(node); } });
    return node;
  }

  function depthKey(cfg) { return cfg.pos[0] + cfg.pos[1]; }

  function buildNodes() {
    const list = [];
    list.push({ id: "dataverse", cfg: D.services.dataverse, type: "core" });
    for (const k in D.services) if (k !== "dataverse") list.push({ id: k, cfg: D.services[k], type: "service" });
    D.apps.forEach((a) => list.push({ id: a.id, cfg: a, type: "app" }));
    list.sort((a, b) => depthKey(a.cfg) - depthKey(b.cfg));
    list.forEach((n, i) => { const node = drawNode(n.id, n.cfg, n.type); node.order = i; });
  }

  /* ---- beams (data flows) ---- */
  function addBeam(aId, bId, color, o) {
    o = o || {};
    const a = nodes[aId], b = nodes[bId];
    if (!a || !b) return;
    const p0 = a.top, p1 = b.top;
    const mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2;
    const dist = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    const cy = my - (dist * 0.28 + 52);
    const d = `M ${p0[0].toFixed(1)} ${p0[1].toFixed(1)} Q ${mx.toFixed(1)} ${cy.toFixed(1)} ${p1[0].toFixed(1)} ${p1[1].toFixed(1)}`;
    const grp = el("g", { class: "beam" }, Lbeams);
    const path = el("path", { d, fill: "none", stroke: color, "stroke-width": o.w || 2.2,
      "stroke-linecap": "round", opacity: o.op || 0.42 }, grp);
    bd(mx, cy);
    const pg = el("g", { class: "beam" }, Lparts);
    const dots = [];
    const n = REDUCED ? 0 : (o.n || 2);
    for (let i = 0; i < n; i++) dots.push({ c: el("circle", { r: o.r || 2.7, fill: color, opacity: 0.95 }, pg), t: i / n });
    beams.push({ grp, pg, path, dots, len: 0, aId, bId, speed: 0.10 + Math.random() * 0.06 });
  }
  function buildBeams() {
    // faint platform fabric: Dataverse to every service
    for (const k in D.services) if (k !== "dataverse") addBeam("dataverse", k, brandColor.dataverse, { w: 1.5, op: 0.24, n: 1, r: 2.3 });
    // solution -> service links (the lively flows)
    D.apps.forEach((a) => (a.uses || []).forEach((s) => addBeam(a.id, s, brandColor[s] || layerColor[a.layer], { w: 2.4, op: 0.5 })));
  }

  /* =====================================================================
   *  Interaction: hover, select, focus
   * =================================================================== */
  const tag = $("#tag");
  function screenOf(pt) {
    const r = svg.getBoundingClientRect();
    return { x: r.left + (pt[0] - VB.x) / VB.w * r.width, y: r.top + (pt[1] - VB.y) / VB.h * r.height };
  }
  function onHover(node, on) {
    if (dragging) return;
    node.g.classList.toggle("hi", on);
    if (on && node !== selected) {
      const s = screenOf(node.top);
      tag.style.left = s.x + "px"; tag.style.top = (s.y - 24) + "px";
      tag.innerHTML = node.cfg.name + (node.cfg.client ? '<span class="c">' + node.cfg.client + "</span>" : "");
      tag.classList.add("show");
    } else if (!on) tag.classList.remove("show");
  }

  function relatedIds(node) {
    const set = new Set([node.id]);
    if (node.type === "app") (node.cfg.uses || []).forEach((s) => set.add(s));
    else { // service/core: solutions that use it + dataverse
      D.apps.forEach((a) => { if (a.id === node.id || (a.uses || []).includes(node.id)) set.add(a.id); });
      if (node.id !== "dataverse") set.add("dataverse");
    }
    return set;
  }
  function selectNode(node) {
    selected = node;
    tag.classList.remove("show");
    const rel = relatedIds(node);
    svg.classList.add("focus");
    for (const id in nodes) {
      nodes[id].g.classList.toggle("sel", id === node.id);
      nodes[id].g.classList.toggle("rel", id !== node.id && rel.has(id));
    }
    beams.forEach((bm) => {
      const on = bm.aId === node.id || bm.bId === node.id ||
        (node.type !== "app" && rel.has(bm.aId) && rel.has(bm.bId) && (bm.aId === node.id || bm.bId === node.id));
      const touch = bm.aId === node.id || bm.bId === node.id;
      bm.grp.classList.toggle("rel", touch);
      bm.pg.classList.toggle("rel", touch);
    });
    fillPanel(node);
    $("#panel").classList.add("open");
  }
  function clearFocus() {
    selected = null;
    svg.classList.remove("focus");
    for (const id in nodes) nodes[id].g.classList.remove("sel", "rel");
    beams.forEach((bm) => { bm.grp.classList.remove("rel"); bm.pg.classList.remove("rel"); });
    $("#panel").classList.remove("open");
  }

  /* ---- panel ---- */
  function fillPanel(node) {
    const c = node.cfg, p = $("#panel");
    const isApp = node.type === "app";
    const layer = D.layers.find((l) => l.id === c.layer) || { name: "", color: "#888" };
    p.querySelector(".p-cat").innerHTML = '<span class="dot" style="background:' + layer.color + '"></span>' +
      (isApp ? layer.name + " solution" : (node.type === "core" ? "Data foundation" : "Platform service"));
    p.querySelector(".p-cat").style.color = layer.color;
    p.querySelector("h2").textContent = c.name;
    p.querySelector(".p-client").textContent = isApp ? c.client : (c.blurb || "");
    p.querySelector(".p-tag").textContent = isApp ? (c.year || "") : "Microsoft";
    p.querySelector(".p-summary").textContent = isApp ? c.summary : (c.blurb || "");

    // metrics
    const secM = p.querySelector(".p-sec-metrics"), mWrap = p.querySelector(".p-metrics");
    mWrap.innerHTML = "";
    if (isApp && c.metrics) {
      secM.style.display = "";
      c.metrics.forEach((m) => {
        const cell = el2("div", "p-metric");
        const v = el2("div", "mv " + (m.value < 0 ? "dn" : "up"));
        const l = el2("div", "ml"); l.textContent = m.label;
        cell.appendChild(v); cell.appendChild(l); mWrap.appendChild(cell);
        countUp(v, m.value, m.suffix || "");
      });
    } else secM.style.display = "none";

    // features / chips
    const chipCap = p.querySelector(".p-chips").previousElementSibling;
    const cWrap = p.querySelector(".p-chips"); cWrap.innerHTML = "";
    const feats = isApp ? c.features : solutionsUsing(node.id).map((a) => a.name);
    chipCap.textContent = isApp ? "What it does" : "Solutions using it";
    (feats || []).forEach((f) => { const ch = el2("span", "p-chip"); ch.textContent = f; cWrap.appendChild(ch); });
    cWrap.parentElement.style.display = (feats && feats.length) ? "" : "none";

    // built-with services (apps only)
    const secS = p.querySelector(".p-sec-svcs"), sWrap = p.querySelector(".p-svcs"); sWrap.innerHTML = "";
    if (isApp && c.uses) {
      secS.style.display = "";
      c.uses.forEach((sid) => {
        const s = D.services[sid]; if (!s) return;
        const btn = el2("button", "p-svc");
        const svgm = el("svg", { viewBox: "-16 -16 32 32" }, null);
        drawMark(svgm, s.logo, 14);
        btn.appendChild(svgm);
        const span = document.createElement("span"); span.textContent = s.name; btn.appendChild(span);
        btn.addEventListener("click", () => { if (nodes[sid]) selectNode(nodes[sid]); });
        sWrap.appendChild(btn);
      });
    } else secS.style.display = "none";
  }
  function solutionsUsing(id) { return D.apps.filter((a) => (a.uses || []).includes(id)); }
  function el2(tag, cls) { const e = document.createElement(tag); if (cls) e.className = cls; return e; }

  function countUp(elm, to, suffix) {
    const s = String(to), dot = s.indexOf("."), dec = dot < 0 ? 0 : s.length - dot - 1;
    const fmt = (v) => { const neg = v < 0; return (neg ? "-" : "") +
      Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec }); };
    const render = (v) => { elm.innerHTML = fmt(v) + '<span class="s">' + suffix + "</span>"; };
    if (REDUCED) { render(to); return; }
    const dur = 850, t0 = performance.now();
    (function step(now) {
      const t = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - t, 3);
      render(to * e); if (t < 1) requestAnimationFrame(step); else render(to);
    })(performance.now());
  }

  /* =====================================================================
   *  Camera: viewBox pan + zoom
   * =================================================================== */
  let VB = { x: 0, y: 0, w: 100, h: 100 }, fit = null;
  function applyVB() { svg.setAttribute("viewBox", `${VB.x.toFixed(1)} ${VB.y.toFixed(1)} ${VB.w.toFixed(1)} ${VB.h.toFixed(1)}`); }
  function computeFit() {
    const padX = 90, padY = 90;
    const w = maxX - minX + padX * 2, h = maxY - minY + padY * 2;
    const r = svg.getBoundingClientRect();
    const aspect = r.width / r.height || 1.6;
    let W = w, H = h;
    if (W / H > aspect) H = W / aspect; else W = H * aspect;
    fit = { x: (minX + maxX) / 2 - W / 2, y: (minY + maxY) / 2 - H / 2, w: W, h: H };
    VB = Object.assign({}, fit); applyVB();
  }

  let dragging = false, dragMoved = false, dsx = 0, dsy = 0;
  svg.addEventListener("pointerdown", (e) => {
    dragging = true; dragMoved = false; dsx = e.clientX; dsy = e.clientY;
    svg.setPointerCapture && svg.setPointerCapture(e.pointerId);
  });
  svg.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    if (Math.abs(e.clientX - dsx) + Math.abs(e.clientY - dsy) > 4) { dragMoved = true; tag.classList.remove("show"); }
    const r = svg.getBoundingClientRect();
    VB.x -= (e.clientX - dsx) * VB.w / r.width;
    VB.y -= (e.clientY - dsy) * VB.h / r.height;
    dsx = e.clientX; dsy = e.clientY; applyVB();
  });
  const endDrag = () => (dragging = false);
  svg.addEventListener("pointerup", endDrag);
  svg.addEventListener("pointercancel", endDrag);
  svg.addEventListener("click", (e) => { if (e.target === svg && !dragMoved) clearFocus(); });
  svg.addEventListener("wheel", (e) => {
    e.preventDefault();
    const r = svg.getBoundingClientRect();
    const mx = VB.x + (e.clientX - r.left) / r.width * VB.w;
    const my = VB.y + (e.clientY - r.top) / r.height * VB.h;
    const f = e.deltaY > 0 ? 1.1 : 0.9;
    const nw = Math.min(fit.w * 2.2, Math.max(fit.w * 0.45, VB.w * f));
    const k = nw / VB.w;
    VB.w = nw; VB.h *= k;
    VB.x = mx - (mx - VB.x) * k; VB.y = my - (my - VB.y) * k;
    applyVB();
  }, { passive: false });

  /* =====================================================================
   *  Particle animation
   * =================================================================== */
  let last = performance.now();
  function tick(now) {
    requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (REDUCED) return;
    for (const bm of beams) {
      if (!bm.len) { try { bm.len = bm.path.getTotalLength(); } catch (_) { continue; } }
      for (const dp of bm.dots) {
        dp.t += bm.speed * dt * 4 / (bm.len / 120);
        if (dp.t > 1) dp.t -= 1;
        try { const pt = bm.path.getPointAtLength(dp.t * bm.len);
          dp.c.setAttribute("cx", pt.x.toFixed(1)); dp.c.setAttribute("cy", pt.y.toFixed(1)); } catch (_) {}
      }
    }
  }

  /* =====================================================================
   *  Chrome (brand / legend / hud / intro)
   * =================================================================== */
  function buildChrome() {
    $("#brand .t").firstChild.textContent = D.brand.name;
    // hud + intro stats
    const hud = $("#hud"), iStats = $("#intro .intro-stats");
    D.aggregate.forEach((s) => {
      const a = el2("div", "stat");
      a.innerHTML = '<div class="n">' + s.value.toLocaleString("en-US") + '<span class="s">' + (s.suffix || "") +
        '</span></div><div class="l">' + s.label + "</div>";
      hud.appendChild(a);
      const b = el2("div", "s");
      b.innerHTML = '<div class="n">' + s.value.toLocaleString("en-US") + '<span class="s2">' + (s.suffix || "") +
        '</span></div><div class="l">' + s.label + "</div>";
      iStats.appendChild(b);
    });
    // legend
    const legend = $("#legend");
    D.layers.forEach((l) => {
      const c = el2("div", "lchip");
      c.innerHTML = '<span class="dot" style="background:' + l.color + '"></span>' + l.name;
      c.addEventListener("click", () => toggleLayer(l.id, c));
      legend.appendChild(c);
    });
  }
  let layerFilter = null;
  function toggleLayer(id, chip) {
    clearFocus();
    const chips = document.querySelectorAll(".lchip");
    if (layerFilter === id) { layerFilter = null; chips.forEach((c) => c.classList.remove("active", "dim")); svg.classList.remove("focus"); }
    else {
      layerFilter = id;
      chips.forEach((c) => { c.classList.remove("active"); c.classList.add("dim"); });
      chip.classList.add("active"); chip.classList.remove("dim");
      svg.classList.add("focus");
      for (const nid in nodes) nodes[nid].g.classList.toggle("rel", nodes[nid].cfg.layer === id);
      beams.forEach((bm) => { const r = (nodes[bm.aId] && nodes[bm.aId].cfg.layer === id) || (nodes[bm.bId] && nodes[bm.bId].cfg.layer === id);
        bm.grp.classList.toggle("rel", r); bm.pg.classList.toggle("rel", r); });
    }
  }

  /* ---- intro / reveal ---- */
  function reveal() {
    ["#brand", "#legend", "#hud", "#hint", "#reset"].forEach((s) => $(s).classList.add("in"));
    // stagger nodes rising, back-to-front
    const arr = Object.values(nodes).sort((a, b) => a.order - b.order);
    arr.forEach((n, i) => setTimeout(() => n.g.classList.add("in"), REDUCED ? 0 : 120 + i * 55));
  }
  function enterScene() {
    const intro = $("#intro"); intro.classList.add("gone");
    setTimeout(() => (intro.style.display = "none"), 800);
    if (!REDUCED) { // little zoom-in
      const start = { x: fit.x - fit.w * 0.08, y: fit.y - fit.h * 0.08, w: fit.w * 1.16, h: fit.h * 1.16 };
      VB = Object.assign({}, start); applyVB();
      const t0 = performance.now(), dur = 1100;
      (function z(now) {
        const t = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - t, 3);
        VB = { x: start.x + (fit.x - start.x) * e, y: start.y + (fit.y - start.y) * e,
          w: start.w + (fit.w - start.w) * e, h: start.h + (fit.h - start.h) * e };
        applyVB(); if (t < 1) requestAnimationFrame(z);
      })(t0);
    }
    reveal();
  }

  /* =====================================================================
   *  Boot
   * =================================================================== */
  function boot() {
    // give the solution buildings a little more breathing room from the core
    D.apps.forEach((a) => { a.pos = [a.pos[0] * 1.12, a.pos[1] * 1.12]; });
    buildGround();
    buildNodes();
    buildBeams();
    buildChrome();
    computeFit();
    requestAnimationFrame(tick);

    $("#enter").addEventListener("click", enterScene);
    $("#panel .p-close").addEventListener("click", clearFocus);
    $("#reset").addEventListener("click", () => { clearFocus(); layerFilter = null;
      document.querySelectorAll(".lchip").forEach((c) => c.classList.remove("active", "dim"));
      VB = Object.assign({}, fit); applyVB(); });
    addEventListener("keydown", (e) => { if (e.key === "Escape") clearFocus(); });
    addEventListener("resize", () => computeFit());

    // expose small API
    window.Landscape = { select: (id) => nodes[id] && selectNode(nodes[id]), reset: clearFocus,
      enter: enterScene, ids: () => Object.keys(nodes) };
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();

/* ==========================================================================
 *  POWER PLATFORM LANDSCAPE · isometric engine (pure SVG, no dependencies)
 *  Draws a light, colourful isometric scene: a Dataverse core, the Power
 *  Platform services around it (with product marks), and the business
 *  solutions we built as buildings, linked by animated data flows.
 *  Product marks are simplified, brand-coloured interpretations.
 * ========================================================================== */
(function () {
  "use strict";
  const D = window.CITY;
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const L = window.LOGOS;
  const NS = "http://www.w3.org/2000/svg";
  const $ = (s) => document.querySelector(s);

  const TILE = 92;
  const COS30 = Math.cos(Math.PI / 6);
  // yaw lets the whole scene orbit: rotate (x,y) on the ground plane, then project
  let yaw = 0, cosY = 1, sinY = 0;
  function setYaw(a) { yaw = a; cosY = Math.cos(a); sinY = Math.sin(a); }
  const iso = (x, y, z) => {
    const rx = x * cosY - y * sinY, ry = x * sinY + y * cosY;
    return [(rx - ry) * COS30 * TILE, (rx + ry) * 0.5 * TILE - z * TILE];
  };
  const depthOf = (p) => (p[0] * cosY - p[1] * sinY) + (p[0] * sinY + p[1] * cosY);

  const districtById = {};
  D.districts.forEach((d) => (districtById[d.id] = d));
  const LANDMARK = "#F3B700";        // EY-yellow beacon for proof landmarks
  const colorOf = (b) => b.landmark ? "#5A6577" : (districtById[b.district] ? districtById[b.district].color : "#5A6577");

  // deterministic 0..1 hash so code-screen lines stay stable across redraws
  function hash(str) {
    str = String(str);
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0) / 4294967295;
  }

  // neon accents (glow bar / LEDs / on-screen code) derived from a base colour
  function glowFor(hex) {
    return { bar: shade(hex, 0.55), led: shade(hex, 0.75), code: shade(hex, 0.6) };
  }

  /* ---------- svg helpers ---------- */
  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function href(node, url) {
    node.setAttribute("href", url);
    node.setAttributeNS("http://www.w3.org/1999/xlink", "href", url);
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

  /* ---- a detailed isometric SERVER TOWER: stacked rack units with glowing
         light bars, indicator LEDs and a code screen on top ---- */
  function serverTower(parent, gx, gy, w, d, h, base, glow, units) {
    const xm = gx - w / 2, xM = gx + w / 2, ym = gy - d / 2, yM = gy + d / 2;
    const uh = h / units, gap = uh * 0.14;
    // pick the two viewer-facing vertical faces for the current orbit angle
    const faces = [
      { axis: "x", k: xM, a0: ym, a1: yM, c: [xM, gy] },
      { axis: "x", k: xm, a0: ym, a1: yM, c: [xm, gy] },
      { axis: "y", k: yM, a0: xm, a1: xM, c: [gx, yM] },
      { axis: "y", k: ym, a0: xm, a1: xM, c: [gx, ym] },
    ];
    faces.forEach((f) => (f.depth = depthOf(f.c)));
    faces.sort((p, q) => q.depth - p.depth);
    const vis = faces.slice(0, 2);
    const P = (f, a, z) => (f.axis === "x" ? iso(f.k, a, z) : iso(a, f.k, z));
    const faceX = (f) => iso(f.c[0], f.c[1], 0)[0];
    vis.sort((p, q) => faceX(p) - faceX(q));   // left face first, right face last
    vis.forEach((f, fi) => {
      const sh = fi === 0 ? -0.04 : -0.20;     // left lighter, right darker
      const len = f.a1 - f.a0;
      for (let i = 0; i < units; i++) {
        const z0 = i * uh + gap * 0.5, z1 = (i + 1) * uh - gap * 0.5;
        poly(parent, [P(f, f.a0, z1), P(f, f.a1, z1), P(f, f.a1, z0), P(f, f.a0, z0)], shade(base, sh));
        el("line", { x1: P(f, f.a0, z1)[0], y1: P(f, f.a0, z1)[1], x2: P(f, f.a1, z1)[0], y2: P(f, f.a1, z1)[1],
          stroke: shade(base, -0.34), "stroke-width": 1 }, parent);
        // glowing light bar near the top of the unit
        const b1 = z1 - uh * 0.16, b0 = z1 - uh * 0.34;
        poly(parent, [P(f, f.a0, b1), P(f, f.a1, b1), P(f, f.a1, b0), P(f, f.a0, b0)], glow.bar);
        // indicator LEDs near the bottom of the unit
        const l1 = z0 + uh * 0.52, l0 = z0 + uh * 0.30;
        for (let k = 0; k < 3; k++) {
          const c0 = f.a0 + len * (0.24 + 0.24 * k), c1 = c0 + len * 0.11;
          poly(parent, [P(f, c0, l1), P(f, c1, l1), P(f, c1, l0), P(f, c0, l0)], k === 1 ? glow.led : "#F2F8FF");
        }
      }
    });
    // top: bright cap + inset dark "screen" with tiny code lines
    const R = (x, y, z) => iso(x, y, z);
    const Ah = R(xm, ym, h), Bh = R(xM, ym, h), Ch = R(xM, yM, h), Dh = R(xm, yM, h);
    poly(parent, [Ah, Bh, Ch, Dh], shade(base, 0.32), { stroke: shade(base, 0.46), "stroke-width": 1 });
    const q = 0.17;
    poly(parent, [R(xm + w * q, ym + d * q, h), R(xM - w * q, ym + d * q, h),
      R(xM - w * q, yM - d * q, h), R(xm + w * q, yM - d * q, h)], "#101D34");
    for (let r = 0; r < 4; r++) {
      const yy = ym + d * (0.30 + 0.13 * r);
      const x0 = xm + w * 0.26, x1 = xm + w * (0.42 + 0.30 * hash(gx + "" + gy + r));
      const a = R(x0, yy, h), b = R(x1, yy, h);
      el("line", { x1: a[0].toFixed(1), y1: a[1].toFixed(1), x2: b[0].toFixed(1), y2: b[1].toFixed(1),
        stroke: glow.code, "stroke-width": 1.5, "stroke-linecap": "round", opacity: 0.9 }, parent);
    }
    return { top: iso(gx, gy, h), ground: iso(gx, gy, 0) };
  }

  /* ---- a glowing isometric DATABASE CYLINDER (for the Dataverse core) ---- */
  function dbTower(parent, gx, gy, size, h, base, glow) {
    const A = iso(gx, gy, 0);
    const R = size * TILE * 0.5, ry = R * 0.5, H = h * TILE;
    const cx = A[0], cyB = A[1], cyT = A[1] - H;
    // base shadow + bottom cap
    el("ellipse", { cx, cy: cyB + 6, rx: R * 1.05, ry: ry * 1.05, fill: "#1E2D46", opacity: 0.12 }, parent);
    el("ellipse", { cx, cy: cyB, rx: R, ry, fill: shade(base, -0.16) }, parent);
    // cylinder body
    el("rect", { x: cx - R, y: cyT, width: R * 2, height: H, fill: shade(base, -0.04) }, parent);
    // soft vertical gloss
    el("rect", { x: cx - R * 0.34, y: cyT, width: R * 0.5, height: H, fill: shade(base, 0.14), opacity: 0.5 }, parent);
    // glowing rings
    [0.30, 0.58, 0.86].forEach((f) => {
      const y = cyT + H * f;
      el("ellipse", { cx, cy: y, rx: R, ry, fill: "none", stroke: glow.bar, "stroke-width": 5 }, parent);
      el("ellipse", { cx, cy: y - 1.5, rx: R, ry, fill: "none", stroke: "#FFFFFF", "stroke-width": 1.4, opacity: 0.6 }, parent);
    });
    // top disk
    el("ellipse", { cx, cy: cyT, rx: R, ry, fill: shade(base, 0.30), stroke: shade(base, 0.46), "stroke-width": 1.5 }, parent);
    el("ellipse", { cx, cy: cyT, rx: R * 0.62, ry: ry * 0.62, fill: "none", stroke: glow.bar, "stroke-width": 2, opacity: 0.85 }, parent);
    bd(cx - R, cyT - ry - 6); bd(cx + R, cyB + ry + 8);
    return { top: [cx, cyT], ground: [cx, cyB] };
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
  let selectedId = null;   // persists across orbit rebuilds
  let sceneFirst = true;   // first build plays the rise animation; rebuilds don't

  /* ---- the substrate (shared platform plate; not clickable) ---- */
  function buildGround() {
    let gxm = 1e9, gxM = -1e9, gym = 1e9, gyM = -1e9;
    const consider = (pos, size) => {
      gxm = Math.min(gxm, pos[0] - size); gxM = Math.max(gxM, pos[0] + size);
      gym = Math.min(gym, pos[1] - size); gyM = Math.max(gyM, pos[1] + size);
    };
    D.buildings.forEach((b) => consider(b.pos, b.size + 0.4));
    D.landmarks.forEach((b) => consider(b.pos, b.size + 0.4));
    const m = 1.1;
    gxm -= m; gxM += m; gym -= m; gyM += m;
    const A = iso(gxm, gym, 0), B = iso(gxM, gym, 0), C = iso(gxM, gyM, 0), G = iso(gxm, gyM, 0);
    const thPx = 13;
    poly(Lground, [A, B, C, G].map((p) => [p[0], p[1] + thPx]), "#BCCEDF");
    poly(Lground, [A, B, C, G], "#E9F1FB", { stroke: "#D3E0F0", "stroke-width": 1.5 });
    for (let x = Math.ceil(gxm); x <= Math.floor(gxM); x++) {
      const a = iso(x, gym, 0), b = iso(x, gyM, 0);
      el("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: "#D6E2F1", "stroke-width": 1 }, Lground);
    }
    for (let y = Math.ceil(gym); y <= Math.floor(gyM); y++) {
      const a = iso(gxm, y, 0), b = iso(gxM, y, 0);
      el("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: "#D6E2F1", "stroke-width": 1 }, Lground);
    }
    // platform logos etched low-opacity into the plate (Dataverse · Azure · Fabric · Purview)
    const et = D.substrate.etched || [];
    et.forEach((key, i) => {
      const fx = gxm + (gxM - gxm) * (0.30 + 0.40 * (i / Math.max(1, et.length - 1)));
      const p = iso(fx, gyM - 1.4, 0.02);
      const gg = el("g", { transform: `translate(${p[0].toFixed(1)},${p[1].toFixed(1)})`, opacity: 0.16 }, Lground);
      L.svg(gg, key, 24);
    });
    const lp = iso((gxm + gxM) / 2, gyM - 0.3, 0);
    el("text", { x: lp[0].toFixed(1), y: (lp[1] + 6).toFixed(1), "text-anchor": "middle", fill: "#8DA0BC",
      "font-size": 12.5, "font-weight": 600, "letter-spacing": ".02em",
      "font-family": "Segoe UI, Inter, sans-serif" }, Lground).textContent = D.substrate.label;
  }

  /* population dots under a building — density reads as scale */
  function drawPopulation(parent, ground, n, color) {
    const per = 8, gap = 6, r = 2.3, rows = Math.ceil(n / per);
    let drawn = 0;
    const y0 = ground[1] + 7;
    for (let row = 0; row < rows; row++) {
      const inRow = Math.min(per, n - drawn), w = (inRow - 1) * gap;
      for (let i = 0; i < inRow; i++)
        el("circle", { cx: (ground[0] - w / 2 + i * gap).toFixed(1), cy: (y0 + row * gap).toFixed(1),
          r, fill: color, opacity: 0.92, stroke: "#fff", "stroke-width": 0.6 }, parent);
      drawn += inRow;
    }
    bd(ground[0] - 28, y0 + rows * gap + 2);
    return 7 + rows * gap + 8;
  }

  /* ---- one building or landmark ---- */
  function drawNode(b) {
    const g = el("g", { class: sceneFirst ? "node" : "node in", "data-id": b.id, tabindex: "0",
      role: "button", "aria-label": b.name }, Lnodes);
    const color = colorOf(b), glow = glowFor(color);
    const units = Math.max(3, Math.round(b.h / 0.42));
    const geo = serverTower(g, b.pos[0], b.pos[1], b.size, b.size, b.h, color, glow, units);

    let beacon = null, pulse = null;
    if (b.landmark) {
      // EY-yellow beacon on the roof — proof, not an offering
      const a = geo.top;
      const bg = el("g", { transform: `translate(${a[0].toFixed(1)},${(a[1]).toFixed(1)})` }, g);
      el("line", { x1: 0, y1: 0, x2: 0, y2: -18, stroke: LANDMARK, "stroke-width": 2.5, opacity: 0.55 }, bg);
      beacon = el("circle", { cx: 0, cy: -20, r: 9, fill: LANDMARK, opacity: 0.55, filter: "url(#soft)" }, bg);
      el("circle", { cx: 0, cy: -20, r: 3.6, fill: "#FFF4C2" }, bg);
      bd(a[0] - 16, a[1] - 34); bd(a[0] + 16, a[1]);
    } else {
      // primary Microsoft product mark on a white disc
      const key = (b.microsoftProducts || [])[0];
      if (key) {
        const a = geo.top;
        const mg = el("g", { transform: `translate(${a[0].toFixed(1)},${(a[1] - 30).toFixed(1)})` }, g);
        el("circle", { cx: 0, cy: 0, r: 19, fill: "#fff", stroke: "#E4ECF6", "stroke-width": 1.5, filter: "url(#soft)" }, mg);
        L.svg(mg, key, 13);
        bd(a[0] - 22, a[1] - 52); bd(a[0] + 22, a[1] - 8);
      }
      if (b.flagship) {
        const a = geo.top;
        pulse = el("circle", { cx: a[0], cy: a[1] - 2, r: 20, fill: "none", stroke: color, "stroke-width": 2, opacity: 0.5 }, g);
      }
    }

    // population dots
    let labelDrop = 25;
    if (!b.landmark && b.pod && b.pod.headcount) labelDrop = drawPopulation(g, geo.ground, b.pod.headcount, color) + 10;

    // label
    const lp = geo.ground;
    const t = el("text", { x: lp[0].toFixed(1), y: (lp[1] + labelDrop).toFixed(1), "text-anchor": "middle",
      "font-size": b.landmark ? 12 : 12.5, "font-weight": b.flagship ? 800 : 700, fill: b.landmark ? "#7A6A16" : "#2A3A57",
      stroke: "#FFFFFF", "stroke-width": 3.5, "paint-order": "stroke", "stroke-linejoin": "round",
      "font-family": "Segoe UI, Inter, sans-serif", class: "nlabel" }, Llabels);
    t.textContent = b.name;
    bd(lp[0] - 74, lp[1] + labelDrop + 8); bd(lp[0] + 74, lp[1] + labelDrop + 8);

    const node = { id: b.id, b, g, top: geo.top, ground: geo.ground, beacon, pulse, flagship: !!b.flagship, landmark: !!b.landmark };
    nodes[b.id] = node;

    g.addEventListener("pointerenter", () => onHover(node, true));
    g.addEventListener("pointerleave", () => onHover(node, false));
    g.addEventListener("click", (e) => { if (!dragMoved) { e.stopPropagation(); selectNode(node); } });
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectNode(node); } });
    return node;
  }

  function buildNodes() {
    const list = D.buildings.map((b) => b).concat(D.landmarks.map((b) => Object.assign({ landmark: true }, b)));
    // painter's order follows the current orbit angle (far nodes first)
    list.sort((a, b) => depthOf(a.pos) - depthOf(b.pos));
    list.forEach((b, i) => { const node = drawNode(b); node.order = i; });
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
  function districtAnchor(did) {
    const inD = D.buildings.filter((b) => b.district === did);
    return ((inD.find((b) => b.flagship)) || inD[0] || {}).id;
  }
  function buildBeams() {
    // intra-district connectors — each district wired together (ambient drift)
    D.districts.forEach((d) => {
      const a = districtAnchor(d.id); if (!a) return;
      D.buildings.forEach((b) => {
        if (b.district === d.id && b.id !== a) addBeam(a, b.id, d.color, { w: 1.8, op: 0.34, n: 1, r: 2.3 });
      });
    });
    // landmark → the districts it drew on (visible EY-yellow line)
    D.landmarks.forEach((lm) => (lm.connectsTo || []).forEach((did) => {
      const a = districtAnchor(did); if (a) addBeam(lm.id, a, LANDMARK, { w: 2.2, op: 0.5, n: 2, r: 2.6 });
    }));
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
    if (on && node.id !== selectedId) {
      const s = screenOf(node.top);
      tag.style.left = s.x + "px"; tag.style.top = (s.y - 24) + "px";
      const sub = node.landmark ? "Proof" : (node.b.pod ? node.b.pod.headcount + " people" : "");
      tag.innerHTML = node.b.name + (sub ? '<span class="c">' + sub + "</span>" : "");
      tag.classList.add("show");
    } else if (!on) tag.classList.remove("show");
  }

  function relatedIds(node) {
    const set = new Set([node.id]);
    if (node.landmark) {
      D.buildings.forEach((b) => { if ((b.proof || []).includes(node.id)) set.add(b.id); });
    } else {
      (node.b.proof || []).forEach((id) => set.add(id));
      D.buildings.forEach((b) => { if (b.district === node.b.district) set.add(b.id); });
    }
    return set;
  }
  // apply .sel/.rel highlight classes from the current selection; called after
  // selecting and after every orbit rebuild.
  function applyFocusStates() {
    for (const id in nodes) nodes[id].g.classList.remove("sel", "rel");
    beams.forEach((bm) => { bm.grp.classList.remove("rel"); bm.pg.classList.remove("rel"); });
    if (selectedId && nodes[selectedId]) {
      const rel = relatedIds(nodes[selectedId]);
      for (const id in nodes) {
        nodes[id].g.classList.toggle("sel", id === selectedId);
        nodes[id].g.classList.toggle("rel", id !== selectedId && rel.has(id));
      }
      beams.forEach((bm) => {
        const touch = bm.aId === selectedId || bm.bId === selectedId;
        bm.grp.classList.toggle("rel", touch); bm.pg.classList.toggle("rel", touch);
      });
      svg.classList.add("focus");
    } else {
      svg.classList.remove("focus");
    }
  }
  /* ---- people-met counter (discovered by exploring, never announced) ---- */
  const met = new Set();
  let peopleMet = 0;
  const totalPeople = D.buildings.reduce((s, b) => s + (b.pod ? b.pod.headcount : 0), 0);
  const totalBuildings = D.buildings.length;
  function updateCounter() {
    const c = $("#counter"); if (!c) return;
    if (met.size >= totalBuildings) c.innerHTML = '<b>50 people</b> · one practice · Advise. Build. Run.';
    else c.innerHTML = 'people met · <b>' + peopleMet + '</b> / ' + totalPeople;
  }
  function markMet(node) {
    if (node.landmark || met.has(node.id)) return;
    met.add(node.id); peopleMet += (node.b.pod ? node.b.pod.headcount : 0); updateCounter();
  }

  let returnFocusId = null;
  function selectNode(node) {
    returnFocusId = node.id;
    selectedId = node.id;
    tag.classList.remove("show");
    markMet(node);
    applyFocusStates();
    fillPanel(node);
    const p = $("#panel"); p.classList.add("open"); p.scrollTop = 0;
    // move keyboard focus into the panel (returned on close)
    const close = p.querySelector(".p-close"); if (close) setTimeout(() => close.focus(), 0);
    // NB: selecting never moves the camera — only the Reset button and a
    // "Proven at" jump are allowed to do that.
  }
  function clearFocus() {
    selectedId = null;
    applyFocusStates();
    $("#panel").classList.remove("open");
    // return focus to the building the user came from (keyboard users)
    if (returnFocusId) { const g = svg.querySelector('[data-id="' + returnFocusId + '"]'); if (g) g.focus(); returnFocusId = null; }
  }
  function el2(tag, cls) { const e = document.createElement(tag); if (cls) e.className = cls; return e; }
  const cleanCopy = (s) => s.replace(/\s*\/\/\s*VERIFY\s*$/i, "");
  const shortLandmark = (name) => name.split("—")[0].trim();

  function proofLink(label) {
    const a = el2("button", "p-proof-link");
    a.innerHTML = '<span class="arw">&rarr;</span>'; const s = document.createElement("span");
    s.textContent = label; a.appendChild(s); return a;
  }

  // the ONLY navigation allowed to move the camera: jump to a proof landmark
  let vbAnim = null;
  function tweenVBCenter(cx, cy, dur, onDone) {
    const fromX = VB.x, fromY = VB.y, toX = cx - VB.w / 2, toY = cy - VB.h / 2;
    if (REDUCED) { VB.x = toX; VB.y = toY; applyVB(); if (onDone) onDone(); return; }
    const t0 = performance.now();
    cancelAnimationFrame(vbAnim);
    (function step(now) {
      const t = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - t, 3);
      VB.x = fromX + (toX - fromX) * e; VB.y = fromY + (toY - fromY) * e; applyVB();
      if (t < 1) vbAnim = requestAnimationFrame(step); else if (onDone) onDone();
    })(t0);
  }
  function flyToAndSelect(id) {
    const n = nodes[id]; if (!n) return;
    tweenVBCenter(n.top[0], n.top[1] - 40, 650, () => selectNode(n));
  }

  /* ---- panel ---- */
  function fillPanel(node) {
    const p = $("#panel"), b = node.b, isLm = node.landmark, dist = districtById[b.district];
    const q = (s) => p.querySelector(s);

    const eye = q(".p-eyebrow");
    eye.textContent = isLm ? "Proof" : (dist ? dist.name : "");
    eye.style.color = isLm ? "#B08900" : (dist ? dist.color : "#68758C");
    q("h2").textContent = b.name;

    // product logos, top-right (1–3)
    const logos = q(".p-logos"); logos.innerHTML = "";
    if (!isLm) (b.microsoftProducts || []).slice(0, 3).forEach((k) => logos.appendChild(L.html(k, 28)));

    // lifecycle · Advise / Build / Run
    const life = q(".p-life"); life.innerHTML = "";
    if (!isLm && b.lifecycle) {
      ["advise", "build", "run"].forEach((stage) => {
        const on = b.lifecycle.indexOf(stage) >= 0;
        const seg = el2("span", "p-life-seg" + (on ? " on" : ""));
        seg.innerHTML = '<span class="d"></span>' + stage.charAt(0).toUpperCase() + stage.slice(1);
        life.appendChild(seg);
      });
      life.style.display = "";
    } else life.style.display = "none";

    // what it does / landmark story
    q(".p-does").textContent = isLm ? b.story : b.whatItDoes;

    // the value — exactly three lines
    const vSec = q(".p-value-sec"), vWrap = q(".p-value"); vWrap.innerHTML = "";
    if (!isLm && b.value) {
      vSec.style.display = "";
      b.value.forEach((line) => {
        const row = el2("div", "p-vline");
        const ar = el2("span", "p-arrow"); ar.textContent = "→";
        const tx = document.createElement("span"); tx.textContent = cleanCopy(line);
        row.appendChild(ar); row.appendChild(tx); vWrap.appendChild(row);
      });
    } else vSec.style.display = "none";

    // built with — product chips
    const bSec = q(".p-built-sec"), bWrap = q(".p-built"); bWrap.innerHTML = "";
    if (!isLm && b.microsoftProducts) {
      bSec.style.display = "";
      b.microsoftProducts.forEach((k) => bWrap.appendChild(L.chip(k)));
    } else bSec.style.display = "none";

    // who runs it — pod dots + headcount + lead
    const rSec = q(".p-run-sec"), rWrap = q(".p-run"); rWrap.innerHTML = "";
    if (!isLm && b.pod) {
      rSec.style.display = "";
      const dots = el2("span", "p-run-dots");
      for (let i = 0; i < b.pod.headcount; i++) dots.appendChild(document.createElement("i"));
      const txt = el2("span", "p-run-txt");
      txt.textContent = b.pod.headcount + " people" + (b.pod.lead ? " · " + b.pod.lead : "");
      rWrap.appendChild(dots); rWrap.appendChild(txt);
    } else rSec.style.display = "none";

    // proven at (building) / built by (landmark)
    const pSec = q(".p-proof-sec"), pWrap = q(".p-proof"); pWrap.innerHTML = "";
    const cap = pSec.querySelector(".p-cap");
    if (isLm) {
      const contrib = D.buildings.filter((x) => (x.proof || []).includes(node.id));
      if (contrib.length) {
        pSec.style.display = ""; cap.textContent = "Built by";
        contrib.forEach((x) => { const a = proofLink(x.name); a.addEventListener("click", () => selectNode(nodes[x.id])); pWrap.appendChild(a); });
      } else pSec.style.display = "none";
    } else {
      const pr = (b.proof || []);
      if (pr.length) {
        pSec.style.display = ""; cap.textContent = "Proven at";
        pr.forEach((id) => {
          const lm = D.landmarks.find((l) => l.id === id); if (!lm) return;
          const a = proofLink(shortLandmark(lm.name));
          a.addEventListener("click", () => flyToAndSelect(id));
          pWrap.appendChild(a);
        });
      } else pSec.style.display = "none";
    }
  }

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
    const cxc = (minX + maxX) / 2, cyc = (minY + maxY) / 2;
    // pad generously so the scene never clips as it orbits (extent grows ~diagonally)
    const w = (maxX - minX) * 1.24 + 150, h = (maxY - minY) * 1.24 + 150;
    const r = svg.getBoundingClientRect();
    const aspect = r.width / r.height || 1.6;
    let W = w, H = h;
    if (W / H > aspect) H = W / aspect; else W = H * aspect;
    fit = { x: cxc - W / 2, y: cyc - H / 2, w: W, h: H };
    VB = Object.assign({}, fit); applyVB();
  }

  // rebuild the whole scene at the current yaw (used when orbiting)
  function buildScene(first) {
    sceneFirst = !!first;
    [Lground, Lbeams, Lparts, Lnodes, Llabels].forEach((g) => g.replaceChildren());
    minX = 1e9; minY = 1e9; maxX = -1e9; maxY = -1e9;
    for (const k in nodes) delete nodes[k];
    beams.length = 0;
    buildGround();
    buildNodes();
    buildBeams();
    applyFocusStates();
  }
  let rebuildQueued = false;
  function queueRebuild() {
    if (rebuildQueued) return;
    rebuildQueued = true;
    requestAnimationFrame(() => { rebuildQueued = false; buildScene(false); });
  }

  // zoom the viewBox toward a client point by factor k (k<1 zooms in)
  function zoomAt(clientX, clientY, k) {
    const r = svg.getBoundingClientRect();
    const mx = VB.x + (clientX - r.left) / r.width * VB.w;
    const my = VB.y + (clientY - r.top) / r.height * VB.h;
    const nw = Math.min(fit.w * 2.4, Math.max(fit.w * 0.4, VB.w * k));
    const f = nw / VB.w;
    VB.w = nw; VB.h *= f;
    VB.x = mx - (mx - VB.x) * f; VB.y = my - (my - VB.y) * f;
    applyVB();
  }

  const pts = new Map();               // active pointers → {x,y}
  let dragging = false, dragMoved = false, captured = false, dsx = 0, dsy = 0, pid = null;
  let pinchDist = 0;                    // 0 = not pinching
  svg.addEventListener("pointerdown", (e) => {
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 1) {
      dragging = true; dragMoved = false; captured = false; pid = e.pointerId;
      dsx = e.clientX; dsy = e.clientY;
    } else if (pts.size === 2) {
      // second finger down → pinch-zoom, stop orbiting
      dragging = false;
      const a = [...pts.values()]; pinchDist = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) || 1;
      tag.classList.remove("show");
    }
  });
  svg.addEventListener("pointermove", (e) => {
    if (pts.has(e.pointerId)) pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size >= 2) {                // pinch
      const a = [...pts.values()], d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) || 1;
      const cx = (a[0].x + a[1].x) / 2, cy = (a[0].y + a[1].y) / 2;
      if (pinchDist) zoomAt(cx, cy, pinchDist / d);
      pinchDist = d;
      return;
    }
    if (!dragging) return;
    if (!dragMoved) {
      // stay a "click" until the pointer clearly moves; only then start orbiting
      if (Math.abs(e.clientX - dsx) + Math.abs(e.clientY - dsy) <= 4) return;
      dragMoved = true; tag.classList.remove("show");
      if (svg.setPointerCapture) { try { svg.setPointerCapture(pid); captured = true; } catch (_) {} }
    }
    setYaw(yaw - (e.clientX - dsx) * 0.006);   // horizontal drag orbits
    dsx = e.clientX; dsy = e.clientY;
    queueRebuild();
  });
  const liftPointer = (e) => {
    pts.delete(e.pointerId);
    if (pts.size < 2) pinchDist = 0;
    if (pts.size === 0) {
      if (captured && svg.releasePointerCapture) { try { svg.releasePointerCapture(pid); } catch (_) {} }
      dragging = false; captured = false;
    }
  };
  svg.addEventListener("pointerup", liftPointer);
  svg.addEventListener("pointercancel", liftPointer);
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
    // ambient: a soft pulse on the flagship, a slow glow on landmark beacons
    const ts = now / 1000;
    for (const id in nodes) {
      const n = nodes[id];
      if (n.pulse) {
        const s = Math.sin(ts * 1.5);
        n.pulse.setAttribute("r", (21 + s * 6).toFixed(1));
        n.pulse.setAttribute("opacity", (0.28 + 0.22 * (0.5 + 0.5 * s)).toFixed(2));
      }
      if (n.beacon) n.beacon.setAttribute("opacity", (0.4 + 0.32 * (0.5 + 0.5 * Math.sin(ts * 2.1))).toFixed(2));
    }
  }

  /* =====================================================================
   *  Chrome (brand / legend / hud / intro)
   * =================================================================== */
  function buildChrome() {
    // EY (header + intro) and the small Microsoft alliance mark (top-right)
    const ic = window.ICONS || {};
    document.querySelectorAll("img.ey").forEach((im) => { if (ic.ey) im.src = ic.ey; else im.remove(); });
    document.querySelectorAll("img.ms").forEach((im) => { if (ic.microsoft) im.src = ic.microsoft; else im.remove(); });
    // copy from content
    const set = (sel, txt) => { const e = $(sel); if (e) e.textContent = txt; };
    set("#brand .wordmark", D.practice.wordmark);
    set("#intro h1", D.practice.hero.headline);
    set("#intro .lede", D.practice.hero.sub);
    set("#footer", D.practice.footer);
    updateCounter();
  }

  /* ---- intro / reveal ---- */
  function reveal() {
    ["#brand", "#ms-corner", "#hint", "#reset", "#counter", "#footer"].forEach((s) => { const e = $(s); if (e) e.classList.add("in"); });
    // stagger buildings rising, back-to-front
    const arr = Object.values(nodes).sort((a, b) => a.order - b.order);
    arr.forEach((n, i) => setTimeout(() => n.g.classList.add("in"), REDUCED ? 0 : 120 + i * 40));
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
    buildScene(true);
    buildChrome();
    computeFit();
    requestAnimationFrame(tick);

    $("#enter").addEventListener("click", enterScene);
    $("#panel .p-close").addEventListener("click", clearFocus);
    $("#reset").addEventListener("click", () => {   // the only button that moves the camera back
      setYaw(0); buildScene(false);
      VB = Object.assign({}, fit); applyVB();
    });
    addEventListener("keydown", (e) => { if (e.key === "Escape") clearFocus(); });
    addEventListener("resize", () => computeFit());

    // small API (also used by automated checks)
    window.Landscape = { select: (id) => nodes[id] && selectNode(nodes[id]), reset: clearFocus,
      enter: enterScene, ids: () => Object.keys(nodes), fly: flyToAndSelect };
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();

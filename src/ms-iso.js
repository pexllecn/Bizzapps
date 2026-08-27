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
  // yaw rotates the scene on the ground plane; pitch tilts the camera elevation.
  // Together they give a free orbit in all orientations.
  let yaw = 0, cosY = 1, sinY = 0, pitch = 0.5;
  function setYaw(a) { yaw = a; cosY = Math.cos(a); sinY = Math.sin(a); }
  function setPitch(p) { pitch = Math.max(0.26, Math.min(0.72, p)); }
  const iso = (x, y, z) => {
    const rx = x * cosY - y * sinY, ry = x * sinY + y * cosY;
    return [(rx - ry) * COS30 * TILE, (rx + ry) * pitch * TILE - z * TILE];
  };
  const depthOf = (p) => (p[0] * cosY - p[1] * sinY) + (p[0] * sinY + p[1] * cosY);
  // inverse of iso() on the ground plane (z=0): screen/scene point → tile (x,y)
  function unproject(sx, sy) {
    const A = sx / (COS30 * TILE), B = sy / (pitch * TILE);
    const rx = (A + B) / 2, ry = (B - A) / 2;
    return { x: rx * cosY + ry * sinY, y: -rx * sinY + ry * cosY };
  }

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

  /* ---- an isometric LAPTOP: a thin deck + a tilted screen leaning back,
         with a couple of glowing "code" lines — reads as the app/run layer ---- */
  function drawLaptop(parent, gx, gy, w, base, glow) {
    const d = w * 0.68, hDeck = 0.10;
    const geo = isoBox(parent, gx, gy, w, d, hDeck, base, 0);
    const xm = gx - w / 2, xM = gx + w / 2, yBack = gy - d / 2, lean = d * 0.92, hScreen = w * 0.62;
    const b0 = iso(xm, yBack, hDeck), b1 = iso(xM, yBack, hDeck);
    const t0 = iso(xm, yBack - lean, hDeck + hScreen), t1 = iso(xM, yBack - lean, hDeck + hScreen);
    poly(parent, [b0, b1, t1, t0], shade(base, -0.06), { stroke: shade(base, -0.30), "stroke-width": 1 });
    // inset dark screen panel + code lines, echoing the server-tower screens
    const q = 0.14;
    const sx0 = xm + w * q, sx1 = xM - w * q, sz0 = hDeck + hScreen * q, sz1 = hDeck + hScreen * (1 - q * 0.6);
    const sy = yBack - lean * (1 - q * 0.4);
    poly(parent, [iso(sx0, sy, sz1), iso(sx1, sy, sz1), iso(sx1, sy, sz0), iso(sx0, sy, sz0)], "#08131C");
    for (let r = 0; r < 3; r++) {
      const zz = sz0 + (sz1 - sz0) * (0.25 + 0.28 * r);
      const a = iso(sx0 + (sx1 - sx0) * 0.14, sy, zz), b = iso(sx0 + (sx1 - sx0) * (0.4 + 0.35 * hash(gx + "l" + r)), sy, zz);
      el("line", { x1: a[0].toFixed(1), y1: a[1].toFixed(1), x2: b[0].toFixed(1), y2: b[1].toFixed(1),
        stroke: glow.code, "stroke-width": 1.4, "stroke-linecap": "round", opacity: 0.9 }, parent);
    }
    // faint keyboard highlight bar on the deck top face
    const kb0 = iso(xm + w * 0.16, gy + d * 0.06, hDeck), kb1 = iso(xM - w * 0.16, gy + d * 0.06, hDeck);
    el("line", { x1: kb0[0].toFixed(1), y1: kb0[1].toFixed(1), x2: kb1[0].toFixed(1), y2: kb1[1].toFixed(1),
      stroke: glow.bar, "stroke-width": 2, "stroke-linecap": "round", opacity: 0.55 }, parent);
    bd(t0[0], t0[1]); bd(t1[0], t1[1]);
    return geo;
  }

  /* ---- a small floating isometric CUBE — decorative data/connectivity
         accent, drifting near a beam or tucked beside the core ---- */
  function drawCube(parent, gx, gy, size, color, liftPx) {
    const wrap = el("g", { transform: `translate(0,${(-liftPx).toFixed(1)})` }, parent);
    isoBox(wrap, gx, gy, size, size, size, color, 0);
    const a = iso(gx, gy, size);
    return { wrap, cx: a[0], baseY: a[1] - liftPx, liftPx };
  }

  /* ---- an isometric CLOUD mark, screen-space (like the client emblem
         plaques) — floats above an island, tethered down by a soft beam,
         signalling "this runs on the Microsoft cloud" ---- */
  function drawCloudMark(anchorTop, color) {
    const cx = anchorTop[0], baseY = anchorTop[1] - 84;
    const wrap = el("g", { class: "cloud-mark", "pointer-events": "none" }, Llabels);
    el("line", { x1: cx, y1: anchorTop[1] - 6, x2: cx, y2: baseY + 22,
      stroke: color, "stroke-width": 1.6, "stroke-dasharray": "1.5 5", "stroke-linecap": "round", opacity: 0.4 }, wrap);
    const g = el("g", { transform: `translate(${cx.toFixed(1)},${baseY.toFixed(1)})` }, wrap);
    el("ellipse", { cx: 0, cy: 10, rx: 30, ry: 8, fill: "#1E2D46", opacity: 0.14, filter: "url(#soft)" }, g);
    [[-13, 2, 13], [3, -4, 15], [16, 3, 11], [-2, 6, 17]].forEach(([x, y, r]) =>
      el("circle", { cx: x, cy: y, r, fill: "#FFFFFF", stroke: shade(color, -0.15), "stroke-width": 1.2 }, g));
    [[-9, 1], [1, -2], [10, 1]].forEach(([x, y]) => el("circle", { cx: x, cy: y, r: 1.8, fill: color, opacity: 0.9 }, g));
    bd(cx - 32, baseY - 14); bd(cx + 32, baseY + 20);
    return { wrap, cx, baseY };
  }

  /* =====================================================================
   *  Solution-shape vocabulary — each returns {top, ground} like isoBox.
   *  Every solution is one of a few architectural forms so the city reads
   *  as varied structures, not identical racks: cloud pavilion, insight
   *  gallery, low-code cube stack, secure vault, portal (laptop), or a
   *  civic tower (default d365 case). All sit on a shared plinth.
   * =================================================================== */

  // soft contact-shadow ellipse under any building at ground z=0
  function groundShadow(parent, gx, gy, rTiles) {
    const c = iso(gx, gy, 0), rx = rTiles * TILE * COS30 * 1.05, ry = rTiles * TILE * pitch * 1.05;
    el("ellipse", { cx: c[0].toFixed(1), cy: (c[1] + 4).toFixed(1),
      rx: rx.toFixed(1), ry: ry.toFixed(1), fill: "url(#contact)", opacity: 0.9 }, parent);
    return c;
  }

  // a low plinth (podium) that every non-tower solution sits on
  // (isoBox already shades its own faces from a raw hex — never pre-shade here)
  function plinth(parent, gx, gy, w, d, base) {
    isoBox(parent, gx, gy, w, d, 0.28, base, 0);
  }

  /* ---- CLOUD PAVILION: a fluffy isometric cloud floating over a plinth
         with dashed rain-of-data lines — reads as the AI / cloud layer ---- */
  function cloudBuilding(parent, gx, gy, w, h, base, glow) {
    plinth(parent, gx, gy, w, w, base);
    const c = iso(gx, gy, 0.28 + h * 0.55);
    const R = w * TILE * 0.42;
    const g = el("g", {}, parent);
    // soft shadow disc under the cloud (in scene space, at cloud height)
    el("ellipse", { cx: c[0].toFixed(1), cy: (c[1] + R * 0.85).toFixed(1),
      rx: (R * 1.15).toFixed(1), ry: (R * 0.28).toFixed(1),
      fill: "url(#contact)", opacity: 0.7 }, g);
    // three overlapping puffs (front-facing so it reads from any orbit angle)
    const puffs = [[-R * 0.5, 0, R * 0.62], [R * 0.55, R * 0.05, R * 0.55], [0, -R * 0.28, R * 0.7]];
    puffs.forEach(([dx, dy, r]) => {
      el("ellipse", { cx: (c[0] + dx).toFixed(1), cy: (c[1] + dy).toFixed(1),
        rx: r.toFixed(1), ry: (r * 0.78).toFixed(1),
        fill: shade(base, 0.42), stroke: shade(base, 0.10), "stroke-width": 1.4 }, g);
    });
    // subtle inner highlight (top puff)
    el("ellipse", { cx: c[0].toFixed(1), cy: (c[1] - R * 0.35).toFixed(1),
      rx: (R * 0.45).toFixed(1), ry: (R * 0.16).toFixed(1),
      fill: "#FFFFFF", opacity: 0.55 }, g);
    // dashed data-rain from cloud down to plinth
    const plinthTop = iso(gx, gy, 0.28);
    for (let i = -1; i <= 1; i++) {
      const sx = c[0] + i * R * 0.5;
      el("line", { x1: sx.toFixed(1), y1: (c[1] + R * 0.6).toFixed(1),
        x2: (plinthTop[0] + i * R * 0.4).toFixed(1), y2: (plinthTop[1] - 4).toFixed(1),
        stroke: glow.bar, "stroke-width": 1.6, "stroke-dasharray": "2 4",
        "stroke-linecap": "round", opacity: 0.75 }, g);
    }
    bd(c[0] - R * 1.4, c[1] - R * 1.2); bd(c[0] + R * 1.4, c[1] + R * 1.2);
    return { top: [c[0], c[1] - R * 0.9], ground: iso(gx, gy, 0) };
  }

  /* ---- INSIGHT GALLERY: three growing bars (Power BI silhouette) rising
         from a plinth, with a soft glow behind — reads as analytics ---- */
  function chartBuilding(parent, gx, gy, w, h, base, glow) {
    plinth(parent, gx, gy, w, w, base);
    const bw = w * 0.22, gap = w * 0.06, xs = [-bw - gap, 0, bw + gap];
    const heights = [h * 0.55, h * 0.8, h * 1.05];
    xs.forEach((dx, i) => {
      const bx = gx + dx * 0.55;
      isoBox(parent, bx, gy, bw, bw, heights[i], base, 0);
      // glowing top strip
      const t = iso(bx, gy, heights[i]);
      el("ellipse", { cx: t[0].toFixed(1), cy: t[1].toFixed(1),
        rx: (bw * TILE * COS30 * 0.5).toFixed(1), ry: (bw * TILE * pitch * 0.5).toFixed(1),
        fill: glow.bar, opacity: 0.85 }, parent);
    });
    return { top: iso(gx, gy, heights[2]), ground: iso(gx, gy, 0) };
  }

  /* ---- LOW-CODE CUBE STACK: three translucent cubes ascending in a
         zig-zag on a plinth — reads as composable low-code building blocks ---- */
  function cubesBuilding(parent, gx, gy, w, h, base, glow) {
    plinth(parent, gx, gy, w, w, base);
    const s = w * 0.44;
    const seats = [
      { dx: -s * 0.35, dy: s * 0.20, z: 0.28,        sz: s * 0.95 },
      { dx:  s * 0.30, dy: -s * 0.15, z: 0.28 + s * 0.85, sz: s * 0.82 },
      { dx: -s * 0.10, dy: -s * 0.35, z: 0.28 + s * 1.60, sz: s * 0.66 },
    ];
    seats.forEach((c) => {
      const cx = gx + c.dx, cy = gy + c.dy;
      // per-cube faux plinth (bottom cap) then the cube
      isoBox(parent, cx, cy, c.sz, c.sz, c.sz, base, 0);
      // glow band under the cube
      const b = iso(cx, cy, c.z + c.sz);
      el("ellipse", { cx: b[0].toFixed(1), cy: (b[1] + 1).toFixed(1),
        rx: (c.sz * TILE * COS30 * 0.55).toFixed(1), ry: (c.sz * TILE * pitch * 0.55).toFixed(1),
        fill: glow.bar, opacity: 0.7 }, parent);
    });
    const t = iso(gx + seats[2].dx, gy + seats[2].dy, seats[2].z + seats[2].sz);
    return { top: t, ground: iso(gx, gy, 0) };
  }

  /* ---- SECURE VAULT: a low, wide block with a bright chevron-shield mark
         etched on its front — reads as governance / Purview ---- */
  function vaultBuilding(parent, gx, gy, w, h, base, glow) {
    const vw = w * 1.05, vd = w * 0.9, vh = h * 0.62;
    isoBox(parent, gx, gy, vw, vd, vh, base, 0);
    // shield mark on the front face
    const front = gy + vd / 2;
    const cx0 = gx, z0 = vh * 0.28, z1 = vh * 0.78;
    const s0 = iso(cx0, front, z1), s1 = iso(cx0 - vw * 0.22, front, z1 * 0.75),
          s2 = iso(cx0, front, z0), s3 = iso(cx0 + vw * 0.22, front, z1 * 0.75);
    poly(parent, [s0, s1, s2, s3], glow.bar, { stroke: shade(base, 0.55), "stroke-width": 1.4 });
    // beacon on top
    const top = iso(gx, gy, vh);
    el("circle", { cx: top[0].toFixed(1), cy: (top[1] - 6).toFixed(1), r: 4,
      fill: glow.led, stroke: "#FFFFFF", "stroke-width": 1 }, parent);
    return { top, ground: iso(gx, gy, 0) };
  }

  /* ---- shape picker: infer form from the solution's primary product ---- */
  function formOfCap(cap) {
    const p = (cap.microsoftProducts || [])[0] || "";
    if (p === "copilot" || p === "copilot-studio" || p === "azure-ai" || p === "azure") return "cloud";
    if (p === "power-pages") return "laptop";
    if (p === "power-bi" || p === "fabric") return "chart";
    if (p === "power-apps" || p === "power-automate" || p === "power-platform") return "cubes";
    if (p === "purview") return "vault";
    if (p === "dataverse") return "db";
    return "tower"; // d365-*, dynamics365, m365 → civic tower
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
  const emblems = []; // floating spinning client crests
  const clouds = [];  // floating "runs on the Microsoft cloud" marks
  const cubes = [];   // decorative floating data cubes
  let selectedId = null;   // persists across orbit rebuilds
  let focusClient = null;  // which client tenant is spotlighted
  let sceneFirst = true;   // first build plays the rise animation; rebuilds don't

  /* ---- capability catalogue + per-client island layout ---- */
  const capById = {};
  D.buildings.forEach((b) => (capById[b.id] = b));
  const CL = {};   // clientId -> { client, corePos, ring:[{capId,pos,h,size,flagship}], box:[gxm,gym,gxM,gyM] }
  function computeLayout() {
    for (const k in CL) delete CL[k];
    D.clients.forEach((c) => {
      const cx = c.center[0], cy = c.center[1], n = c.runs.length, R = 2.25;
      const ring = c.runs.map((capId, i) => {
        const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
        const cap = capById[capId] || {};
        const isFlag = capId === c.flagship;
        return { capId, pos: [cx + Math.cos(a) * R, cy + Math.sin(a) * R],
          h: 1.35 * (isFlag ? 1.3 : 1) + (i % 3) * 0.12, size: 1.12, flagship: isFlag };
      });
      let gxm = cx, gxM = cx, gym = cy, gyM = cy;
      const consider = (p, s) => { gxm = Math.min(gxm, p[0] - s); gxM = Math.max(gxM, p[0] + s); gym = Math.min(gym, p[1] - s); gyM = Math.max(gyM, p[1] + s); };
      consider(c.center, 1.0);
      ring.forEach((b) => consider(b.pos, b.size * 0.6 + 0.35));
      const pad = 0.75; gxm -= pad; gxM += pad; gym -= pad; gyM += pad;
      CL[c.id] = { client: c, corePos: c.center.slice(), coreH: 1.5, coreSize: 1.15, ring, box: [gxm, gym, gxM, gyM] };
    });
  }

  /* ---- per-client island plates (each a separate tenant; no shared plate) ---- */
  function buildGround() {
    const diamond = (gxm, gym, gxM, gyM) => [iso(gxm, gym, 0), iso(gxM, gym, 0), iso(gxM, gyM, 0), iso(gxm, gyM, 0)];
    D.clients.forEach((c) => {
      const L2 = CL[c.id]; const [gxm, gym, gxM, gyM] = L2.box;
      const top = diamond(gxm, gym, gxM, gyM);
      const thPx = 12;
      // soft shadow so each tenant island reads as floating apart
      const scx = (top[0][0] + top[2][0]) / 2;
      const sbot = Math.max(top[0][1], top[1][1], top[2][1], top[3][1]);
      el("ellipse", { cx: scx.toFixed(1), cy: (sbot + 10).toFixed(1), rx: (Math.abs(top[1][0] - top[3][0]) / 2 * 0.82).toFixed(1),
        ry: 20, fill: "url(#contact)", opacity: 0.62 }, Lground);
      poly(Lground, top.map((p) => [p[0], p[1] + thPx]), shade(c.color, -0.30));  // tenant wall (thickness)
      poly(Lground, top, "#EEF3FA", { stroke: c.color, "stroke-width": 2, opacity: 1 });
      // faint client tint + soft inner grid
      poly(Lground, top, c.color + "0F");
      for (let gx = Math.ceil(gxm); gx <= Math.floor(gxM); gx++) {
        const a = iso(gx, gym, 0), b = iso(gx, gyM, 0);
        el("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: c.color, "stroke-width": 0.6, opacity: 0.10 }, Lground);
      }
      for (let gy = Math.ceil(gym); gy <= Math.floor(gyM); gy++) {
        const a = iso(gxm, gy, 0), b = iso(gxM, gy, 0);
        el("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: c.color, "stroke-width": 0.6, opacity: 0.10 }, Lground);
      }
      // island caption at the front edge: name · sector · isolated tenant
      const lp = iso((gxm + gxM) / 2, gyM - 0.2, 0);
      const cap = el("g", { transform: `translate(${lp[0].toFixed(1)},${(lp[1] + 14).toFixed(1)})` }, Lground);
      const nm = el("text", { x: 0, y: 0, "text-anchor": "middle", fill: "#22324C", "font-size": 14, "font-weight": 800,
        stroke: "#EEF3FA", "stroke-width": 3, "paint-order": "stroke", "font-family": "Segoe UI, Inter, sans-serif" }, cap);
      nm.textContent = c.name + (c.real ? "" : "  ·  illustrative");
      const sub = el("text", { x: 0, y: 16, "text-anchor": "middle", fill: c.color, "font-size": 11, "font-weight": 700,
        "letter-spacing": ".04em", "font-family": "Segoe UI, Inter, sans-serif" }, cap);
      sub.textContent = "ISOLATED TENANT · " + c.sector.toUpperCase();
      bd(lp[0] - 120, lp[1] + 30); bd(lp[0] + 120, lp[1] + 30);
    });
    // ambient MICROSOFT CLOUD — a large, quiet cloud over the whole city,
    // signalling the platform underneath every tenant. Behind everything.
    drawAmbientCloud();
  }

  /* soft, screen-space cloud floating high above the city centre. Behind
     all buildings; re-drawn each orbit rebuild so it tracks the view. */
  function drawAmbientCloud() {
    const c = iso(0, 0, 4.6);
    const R = 130;
    const g = el("g", { class: "ambient-cloud", "pointer-events": "none", opacity: 0.75 }, Lground);
    // very soft shadow disc under it (still in scene space, above buildings)
    el("ellipse", { cx: c[0].toFixed(1), cy: (c[1] + R * 0.85).toFixed(1),
      rx: (R * 1.4).toFixed(1), ry: (R * 0.28).toFixed(1),
      fill: "url(#contact)", opacity: 0.25 }, g);
    // stacked puffs (soft, brand-neutral)
    const puffs = [[-R * 0.7, R * 0.1, R * 0.72], [R * 0.65, R * 0.14, R * 0.66],
                   [-R * 0.15, -R * 0.20, R * 0.85], [R * 0.35, -R * 0.05, R * 0.62]];
    puffs.forEach(([dx, dy, r]) => {
      el("ellipse", { cx: (c[0] + dx).toFixed(1), cy: (c[1] + dy).toFixed(1),
        rx: r.toFixed(1), ry: (r * 0.72).toFixed(1),
        fill: "#FFFFFF", stroke: "#C8D9F1", "stroke-width": 1.4 }, g);
    });
    // inner highlight (top of the cloud)
    el("ellipse", { cx: c[0].toFixed(1), cy: (c[1] - R * 0.35).toFixed(1),
      rx: (R * 0.55).toFixed(1), ry: (R * 0.13).toFixed(1),
      fill: "#F5FAFF", opacity: 0.9 }, g);
    // small Azure mark on the cloud
    const mg = el("g", { transform: `translate(${c[0].toFixed(1)},${(c[1] + 4).toFixed(1)}) scale(0.9)` }, g);
    L.svg(mg, "azure", 14);
    // quiet label under it
    el("text", { x: c[0].toFixed(1), y: (c[1] + R * 0.68).toFixed(1),
      "text-anchor": "middle", fill: "#2E7AD1", "font-size": 11.5, "font-weight": 700,
      "letter-spacing": ".09em", opacity: 0.7,
      "font-family": "Segoe UI, Inter, sans-serif" }, g).textContent = "MICROSOFT CLOUD";
    bd(c[0] - R * 1.4, c[1] - R * 1.1); bd(c[0] + R * 1.4, c[1] + R * 1.1);
  }

  /* population dots under a building — density reads as scale */
  function drawPopulation(parent, ground, n, color) {
    const per = 8, gap = 6, r = 2.3, rows = Math.ceil(n / per);
    let drawn = 0; const y0 = ground[1] + 7;
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

  function nodeShell(id, ariaLabel) {
    return el("g", { class: sceneFirst ? "node" : "node in", "data-id": id, tabindex: "0", role: "button", "aria-label": ariaLabel }, Lnodes);
  }
  function wireNode(node) {
    const g = node.g;
    g.addEventListener("pointerenter", () => onHover(node, true));
    g.addEventListener("pointerleave", () => onHover(node, false));
    g.addEventListener("click", (e) => { if (!dragMoved) { e.stopPropagation(); selectNode(node); } });
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectNode(node); } });
  }

  /* each client's OWN Dataverse core (a glowing cylinder at the island centre) */
  function drawCore(client, pos) {
    const id = "core:" + client.id;
    const g = nodeShell(id, client.name + " — isolated Dataverse tenant");
    const color = client.color, glow = glowFor(color);
    const geo = dbTower(g, pos[0], pos[1], 1.15, 1.6, color, glow);
    // Dataverse mark on a disc above the core
    const a = geo.top, mg = el("g", { transform: `translate(${a[0].toFixed(1)},${(a[1] - 26).toFixed(1)})` }, g);
    el("circle", { cx: 0, cy: 0, r: 17, fill: "#fff", stroke: "#E4ECF6", "stroke-width": 1.5, filter: "url(#soft)" }, mg);
    L.svg(mg, "dataverse", 12);
    bd(a[0] - 20, a[1] - 46);
    const lp = geo.ground;
    const lbl = el("text", { x: lp[0].toFixed(1), y: (lp[1] + 22).toFixed(1), "text-anchor": "middle", fill: "#3A4A66",
      "font-size": 11.5, "font-weight": 700, stroke: "#EEF3FA", "stroke-width": 3, "paint-order": "stroke",
      "font-family": "Segoe UI, Inter, sans-serif" }, Llabels);
    lbl.textContent = "Dataverse";
    const node = { id, kind: "core", clientId: client.id, client, g, labelEl: lbl, top: geo.top, ground: geo.ground, pulse: null };
    nodes[id] = node; wireNode(node);
    if (client.crest) drawEmblem(client, geo);
    return node;
  }

  /* A real client crest, floating on a glass plaque above its Dataverse core
   * and slowly turning like a coin — readable on both faces so text never
   * mirrors. Loaded from the supplied asset (never redrawn). */
  function drawEmblem(client, geo) {
    const src = (window.ICONS || {})[client.crest]; if (!src) return;
    const a = geo.top;
    const cx = a[0], baseY = a[1] - 66;          // hover above the core
    const ratio = client.crestRatio || 2.4;
    const W = 128, H = Math.round(W / ratio);    // plaque size (scene units)
    const pad = 11, iw = W - pad * 2, ih = iw / ratio;
    const col = client.color;

    // anchor group (positioned in scene space, pans/zooms with the scene)
    const wrap = el("g", { class: "emblem", "pointer-events": "none" }, Llabels);

    // a soft light-shaft tethering the plaque to the core — feels embedded
    el("line", { x1: cx, y1: a[1] - 24, x2: cx, y2: baseY + H / 2,
      stroke: col, "stroke-width": 2, "stroke-linecap": "round", opacity: 0.16 }, wrap);
    el("ellipse", { cx: cx, cy: a[1] - 22, rx: 15, ry: 6, fill: col, opacity: 0.14 }, wrap);

    // the spinner: a group we translate to the plaque + scale horizontally
    // each frame (coin flip about its own vertical centre line)
    const spin = el("g", { transform: `translate(${cx.toFixed(1)},${baseY.toFixed(1)})` }, wrap);

    // one plaque face, drawn centred on (0,0); `back` pre-mirrors it so that
    // when the wrapper's negative X-scale flips it, the logo reads correctly.
    function face(back) {
      const f = el("g", { transform: back ? "scale(-1,1)" : "" }, spin);
      el("rect", { x: -W / 2, y: -H / 2, width: W, height: H, rx: 13, ry: 13,
        fill: "#ffffff", stroke: shade(col, 0.35), "stroke-width": 1.4, filter: "url(#soft)" }, f);
      el("rect", { x: -W / 2 + 3, y: -H / 2 + 3, width: W - 6, height: H - 6, rx: 10, ry: 10,
        fill: "none", stroke: shade(col, 0.72), "stroke-width": 1 }, f);
      const img = el("image", { x: -iw / 2, y: -ih / 2, width: iw, height: ih,
        preserveAspectRatio: "xMidYMid meet" }, f);
      href(img, src);
      return f;
    }
    const front = face(false), back = face(true);
    back.setAttribute("opacity", "0");   // hidden until the coin turns past edge-on

    // reserve layout space so the fit-to-view maths never clips the plaque
    bd(cx - W / 2, baseY - H / 2 - 6); bd(cx + W / 2, baseY + H / 2 + 6);

    emblems.push({ spin, front, back, cx, baseY, H });
  }

  /* one deployed solution building inside a client's island */
  function drawBuilding(client, item) {
    const cap = capById[item.capId]; if (!cap) return null;
    const id = client.id + ":" + item.capId;
    const g = nodeShell(id, cap.name + " — deployed for " + client.name);
    const color = client.color, glow = glowFor(color);
    const units = Math.max(3, Math.round(item.h / 0.42));
    // soft ground contact-shadow so no shape looks like it's floating
    groundShadow(g, item.pos[0], item.pos[1], item.size * 0.72);
    const form = formOfCap(cap);
    let geo;
    if (form === "cloud")       geo = cloudBuilding(g, item.pos[0], item.pos[1], item.size, item.h, color, glow);
    else if (form === "laptop") geo = drawLaptop(g, item.pos[0], item.pos[1], item.size * 1.15, color, glow);
    else if (form === "chart")  geo = chartBuilding(g, item.pos[0], item.pos[1], item.size, item.h, color, glow);
    else if (form === "cubes")  geo = cubesBuilding(g, item.pos[0], item.pos[1], item.size, item.h, color, glow);
    else if (form === "vault")  geo = vaultBuilding(g, item.pos[0], item.pos[1], item.size, item.h, color, glow);
    else if (form === "db")     geo = dbTower(g, item.pos[0], item.pos[1], item.size, item.h, color, glow);
    else                        geo = serverTower(g, item.pos[0], item.pos[1], item.size, item.size, item.h, color, glow, units);
    const key = (cap.microsoftProducts || [])[0];
    if (key) {
      const a = geo.top, mg = el("g", { transform: `translate(${a[0].toFixed(1)},${(a[1] - 28).toFixed(1)})` }, g);
      el("circle", { cx: 0, cy: 0, r: 18, fill: "#fff", stroke: "#E4ECF6", "stroke-width": 1.5, filter: "url(#soft)" }, mg);
      L.svg(mg, key, 12.5);
      bd(a[0] - 22, a[1] - 50);
    }
    let pulse = null;
    if (item.flagship) { const a = geo.top; pulse = el("circle", { cx: a[0], cy: a[1] - 2, r: 20, fill: "none", stroke: color, "stroke-width": 2, opacity: 0.5 }, g); }
    let drop = 24;
    if (cap.pod && cap.pod.headcount) drop = drawPopulation(g, geo.ground, cap.pod.headcount, color) + 8;
    const lp = geo.ground;
    const lbl = el("text", { x: lp[0].toFixed(1), y: (lp[1] + drop).toFixed(1), "text-anchor": "middle", fill: "#2A3A57",
      "font-size": 12, "font-weight": item.flagship ? 800 : 700, stroke: "#FFFFFF", "stroke-width": 3.4,
      "paint-order": "stroke", "stroke-linejoin": "round", "font-family": "Segoe UI, Inter, sans-serif" }, Llabels);
    lbl.textContent = cap.name;
    bd(lp[0] - 70, lp[1] + drop + 8); bd(lp[0] + 70, lp[1] + drop + 8);
    const node = { id, kind: "building", clientId: client.id, client, cap, g, labelEl: lbl, top: geo.top, ground: geo.ground, pulse, flagship: !!item.flagship };
    nodes[id] = node; wireNode(node); return node;
  }

  function buildNodes() {
    const list = [];
    D.clients.forEach((c) => {
      const L2 = CL[c.id];
      list.push({ depth: depthOf(L2.corePos), draw: () => drawCore(c, L2.corePos) });
      L2.ring.forEach((it) => list.push({ depth: depthOf(it.pos), draw: () => drawBuilding(c, it) }));
    });
    list.sort((a, b) => a.depth - b.depth);
    list.forEach((n, i) => { const node = n.draw(); if (node) node.order = i; });
  }

  /* ---- beams: WITHIN a client only (its Dataverse to its solutions). Never
         between clients — the whole point is that tenants don't touch. ---- */
  function addBeam(aId, bId, color, o) {
    o = o || {};
    const a = nodes[aId], b = nodes[bId]; if (!a || !b) return;
    const p0 = a.top, p1 = b.top;
    const mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2;
    const dist = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    const cy = my - (dist * 0.30 + 40);
    const d = `M ${p0[0].toFixed(1)} ${p0[1].toFixed(1)} Q ${mx.toFixed(1)} ${cy.toFixed(1)} ${p1[0].toFixed(1)} ${p1[1].toFixed(1)}`;
    const grp = el("g", { class: "beam" }, Lbeams);
    const path = el("path", { d, fill: "none", stroke: color, "stroke-width": o.w || 1.8, "stroke-linecap": "round", opacity: o.op || 0.36 }, grp);
    bd(mx, cy);
    const pg = el("g", { class: "beam" }, Lparts);
    const dots = [];
    const n = REDUCED ? 0 : (o.n || 1);
    for (let i = 0; i < n; i++) dots.push({ c: el("circle", { r: o.r || 2.4, fill: color, opacity: 0.95 }, pg), t: i / n });
    beams.push({ grp, pg, path, dots, len: 0, aId, bId, clientId: o.clientId, speed: 0.10 + Math.random() * 0.06 });
  }
  function buildBeams() {
    D.clients.forEach((c) => {
      c.runs.forEach((capId) => addBeam("core:" + c.id, c.id + ":" + capId, c.color, { clientId: c.id }));
    });
  }

  /* ---- extra scenery per island: a laptop (the "run" access point), a
         cloud mark tethered above the core, and a couple of drifting data
         cubes — so the landscape isn't just repeated towers. ---- */
  function buildDecor() {
    D.clients.forEach((c) => {
      const L2 = CL[c.id]; const [gxm, gym, gxM, gyM] = L2.box;
      const glow = glowFor(c.color);
      // laptop: front-left corner of the island, facing the viewer
      const lx = gxm + 0.62, ly = gyM - 0.5;
      drawLaptop(Lparts, lx, ly, 0.62, c.color, glow);
      // cloud: tethered above the Dataverse core
      const coreTop = nodes["core:" + c.id] ? nodes["core:" + c.id].top : iso(L2.corePos[0], L2.corePos[1], L2.coreH);
      clouds.push(drawCloudMark(coreTop, c.color));
      // a couple of small drifting cubes near the island's open corner
      const spots = [[gxM - 0.5, gym + 0.55], [gxM - 1.15, gym + 1.25]];
      spots.forEach((p, i) => {
        const cu = drawCube(Lparts, p[0], p[1], 0.16 + i * 0.03, c.color, 26 + i * 16);
        bd(cu.cx - 14, cu.baseY - 14); bd(cu.cx + 14, cu.baseY + 14 + 8);   // + bob headroom
        cubes.push(cu);
      });
    });
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
      let title, sub;
      if (node.kind === "core") { title = node.client.name + " — Dataverse"; sub = "isolated tenant"; }
      else { title = node.cap.name; sub = node.client.name; }
      tag.innerHTML = title + (sub ? '<span class="c">' + sub + "</span>" : "");
      tag.classList.add("show");
    } else if (!on) tag.classList.remove("show");
  }

  // everything in the same client tenant is "related" (the island lights up)
  function relatedIds(node) {
    const set = new Set();
    for (const id in nodes) if (nodes[id].clientId === node.clientId) set.add(id);
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
      const cid = nodes[selectedId].clientId;
      beams.forEach((bm) => {
        const on = bm.clientId === cid;
        bm.grp.classList.toggle("rel", on); bm.pg.classList.toggle("rel", on);
      });
      svg.classList.add("focus");
    } else if (focusClient) {
      for (const id in nodes) nodes[id].g.classList.toggle("rel", nodes[id].clientId === focusClient);
      beams.forEach((bm) => { const on = bm.clientId === focusClient; bm.grp.classList.toggle("rel", on); bm.pg.classList.toggle("rel", on); });
      svg.classList.add("focus");
    } else {
      svg.classList.remove("focus");
    }
    // declutter: building/Dataverse labels show only for the focused tenant
    for (const id in nodes) {
      const n = nodes[id];
      if (n.labelEl) n.labelEl.style.opacity = focusClient ? (n.clientId === focusClient ? 1 : 0) : 0;
    }
  }
  /* ---- tenants-seen counter (discovered by exploring, never announced) ---- */
  const explored = new Set();
  const totalClients = D.clients.length;
  function updateCounter() {
    const c = $("#counter"); if (!c) return;
    if (explored.size >= totalClients) c.innerHTML = '<b>' + totalClients + ' clients</b> · ' + totalClients + ' isolated tenants';
    else c.innerHTML = 'tenants seen · <b>' + explored.size + '</b> / ' + totalClients;
  }
  function markExplored(node) {
    if (node.clientId && !explored.has(node.clientId)) { explored.add(node.clientId); updateCounter(); }
  }

  let returnFocusId = null;
  function selectNode(node) {
    returnFocusId = node.id;
    selectedId = node.id;
    focusClient = node.clientId;               // keep the island highlighted
    tag.classList.remove("show");
    markExplored(node);
    applyFocusStates();
    if (node.kind === "core") fillClientPanel(node.client); else fillPanel(node);
    const p = $("#panel"); p.classList.add("open"); p.scrollTop = 0;
    const close = p.querySelector(".p-close"); if (close) setTimeout(() => close.focus(), 0);
    // NB: selecting a node never moves the camera. Only Reset and picking a
    // client from the top tiles move it.
  }
  function clearFocus() {
    selectedId = null;
    applyFocusStates();
    $("#panel").classList.remove("open");
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

  /* ---- solution (building) panel ---- */
  function fillPanel(node) {
    const p = $("#panel"), cap = node.cap, client = node.client, q = (s) => p.querySelector(s);

    const eye = q(".p-eyebrow");
    eye.textContent = client.name + " · tenant";
    eye.style.color = client.color;
    q("h2").textContent = cap.name;

    const logos = q(".p-logos"); logos.innerHTML = "";
    (cap.microsoftProducts || []).slice(0, 3).forEach((k) => logos.appendChild(L.html(k, 28)));

    const life = q(".p-life"); life.innerHTML = "";
    if (cap.lifecycle) {
      ["advise", "build", "run"].forEach((stage) => {
        const on = cap.lifecycle.indexOf(stage) >= 0;
        const seg = el2("span", "p-life-seg" + (on ? " on" : ""));
        seg.innerHTML = '<span class="d"></span>' + stage.charAt(0).toUpperCase() + stage.slice(1);
        life.appendChild(seg);
      });
      life.style.display = "";
    } else life.style.display = "none";

    q(".p-does").textContent = cap.whatItDoes;

    const vSec = q(".p-value-sec"), vWrap = q(".p-value"); vWrap.innerHTML = "";
    if (cap.value) {
      vSec.style.display = "";
      cap.value.forEach((line) => {
        const row = el2("div", "p-vline");
        const ar = el2("span", "p-arrow"); ar.textContent = "→";
        const tx = document.createElement("span"); tx.textContent = cleanCopy(line);
        row.appendChild(ar); row.appendChild(tx); vWrap.appendChild(row);
      });
    } else vSec.style.display = "none";

    const bSec = q(".p-built-sec"), bWrap = q(".p-built"); bWrap.innerHTML = "";
    bSec.querySelector(".p-cap").textContent = "Built with";
    if (cap.microsoftProducts) { bSec.style.display = ""; cap.microsoftProducts.forEach((k) => bWrap.appendChild(L.chip(k))); }
    else bSec.style.display = "none";

    const rSec = q(".p-run-sec"), rWrap = q(".p-run"); rWrap.innerHTML = "";
    rSec.querySelector(".p-cap").textContent = "Who runs it";
    if (cap.pod) {
      rSec.style.display = "";
      const dots = el2("span", "p-run-dots");
      for (let i = 0; i < cap.pod.headcount; i++) dots.appendChild(document.createElement("i"));
      const txt = el2("span", "p-run-txt");
      txt.textContent = cap.pod.headcount + " people" + (cap.pod.lead ? " · " + cap.pod.lead : "");
      rWrap.appendChild(dots); rWrap.appendChild(txt);
    } else rSec.style.display = "none";

    // deployed in — link back to this client's isolated tenant
    const pSec = q(".p-proof-sec"), pWrap = q(".p-proof"); pWrap.innerHTML = "";
    pSec.style.display = ""; pSec.querySelector(".p-cap").textContent = "Deployed in";
    const a = proofLink(client.name + " · isolated tenant");
    a.addEventListener("click", () => selectNode(nodes["core:" + client.id]));
    pWrap.appendChild(a);
  }

  /* ---- client (tenant) panel ---- */
  function fillClientPanel(client) {
    const p = $("#panel"), q = (s) => p.querySelector(s);
    const eye = q(".p-eyebrow");
    eye.textContent = client.real ? "Client engagement" : "Illustrative client";
    eye.style.color = client.color;
    q("h2").textContent = client.name;

    const logos = q(".p-logos"); logos.innerHTML = ""; logos.appendChild(L.html("dataverse", 28));

    const life = q(".p-life"); life.innerHTML = ""; life.style.display = "";
    const seg = el2("span", "p-life-seg on"); seg.innerHTML = '<span class="d"></span>Isolated tenant · own Dataverse';
    life.appendChild(seg);

    q(".p-does").textContent = client.story;

    q(".p-value-sec").style.display = "none";

    const bSec = q(".p-built-sec"), bWrap = q(".p-built"); bWrap.innerHTML = "";
    bSec.style.display = ""; bSec.querySelector(".p-cap").textContent = "Solutions deployed here";
    client.runs.forEach((capId) => {
      const cap = capById[capId]; if (!cap) return;
      const chip = el2("button", "p-chip2"); chip.style.cursor = "pointer";
      const k = (cap.microsoftProducts || [])[0]; if (k) chip.appendChild(L.html(k, 16));
      const s = document.createElement("span"); s.textContent = cap.name; chip.appendChild(s);
      chip.addEventListener("click", () => selectNode(nodes[client.id + ":" + capId]));
      bWrap.appendChild(chip);
    });

    const rSec = q(".p-run-sec"), rWrap = q(".p-run"); rWrap.innerHTML = "";
    rSec.style.display = ""; rSec.querySelector(".p-cap").textContent = "Tenant";
    const txt = el2("span", "p-run-txt");
    const mono = document.createElement("span"); mono.className = "mono"; mono.textContent = client.tenant;
    txt.appendChild(mono);
    txt.appendChild(document.createTextNode(" — its own governed Dataverse, isolated from every other client."));
    rWrap.appendChild(txt);

    q(".p-proof-sec").style.display = "none";
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
    emblems.length = 0;
    clouds.length = 0;
    cubes.length = 0;
    computeLayout();
    buildGround();
    buildNodes();
    buildBeams();
    buildDecor();
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

  // zoom by factor k toward the middle of the current view (for the +/- buttons)
  function zoomCenter(k) {
    const nw = Math.min(fit.w * 2.4, Math.max(fit.w * 0.35, VB.w * k));
    const f = nw / VB.w, cx = VB.x + VB.w / 2, cy = VB.y + VB.h / 2;
    VB.w = nw; VB.h *= f;
    VB.x = cx - VB.w / 2; VB.y = cy - VB.h / 2;
    applyVB();
  }

  function panBy(dx, dy) {
    const r = svg.getBoundingClientRect();
    VB.x -= dx * VB.w / r.width; VB.y -= dy * VB.h / r.height; applyVB();
  }
  // Orbit (yaw + tilt) around a ground pivot, keeping that pivot fixed on
  // screen so the view never snaps to the scene centre. pivotScene defaults
  // to the middle of the current viewBox (used by the compass buttons).
  function orbitBy(dyaw, dpitch, pivotScene) {
    const sp = pivotScene || [VB.x + VB.w / 2, VB.y + VB.h / 2];
    const piv = unproject(sp[0], sp[1]);
    setYaw(yaw + dyaw); setPitch(pitch + dpitch);
    const np = iso(piv.x, piv.y, 0);
    VB.x += np[0] - sp[0]; VB.y += np[1] - sp[1];
    applyVB(); queueRebuild();
  }
  const pts = new Map();               // active pointers → {x,y}
  let dragging = false, dragMoved = false, captured = false, dsx = 0, dsy = 0, pid = null, mode = "orbit";
  let pinchDist = 0, pinchAng = 0, pinchMidY = 0;
  svg.addEventListener("contextmenu", (e) => e.preventDefault());   // right-drag pans
  svg.addEventListener("pointerdown", (e) => {
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 1) {
      dragging = true; dragMoved = false; captured = false; pid = e.pointerId;
      dsx = e.clientX; dsy = e.clientY;
      // left = orbit (tilt + rotate); right / middle / Shift / Ctrl / Alt = pan
      mode = (e.button === 2 || e.button === 1 || e.shiftKey || e.ctrlKey || e.altKey) ? "pan" : "orbit";
    } else if (pts.size === 2) {
      dragging = false;
      const a = [...pts.values()];
      pinchDist = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) || 1;
      pinchAng = Math.atan2(a[1].y - a[0].y, a[1].x - a[0].x);
      pinchMidY = (a[0].y + a[1].y) / 2;
      tag.classList.remove("show");
    }
  });
  svg.addEventListener("pointermove", (e) => {
    if (pts.has(e.pointerId)) pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size >= 2) {                // two fingers: pinch-zoom + twist + tilt
      const a = [...pts.values()], d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) || 1;
      const cx = (a[0].x + a[1].x) / 2, cy = (a[0].y + a[1].y) / 2;
      const ang = Math.atan2(a[1].y - a[0].y, a[1].x - a[0].x);
      if (pinchDist) {
        zoomAt(cx, cy, pinchDist / d);          // spread/pinch → zoom
        let da = ang - pinchAng;                 // twist → yaw
        while (da > Math.PI) da -= 2 * Math.PI;
        while (da < -Math.PI) da += 2 * Math.PI;
        const dmy = cy - pinchMidY;              // both fingers slide up/down → tilt
        if (Math.abs(da) > 0.003 || Math.abs(dmy) > 0.5) orbitBy(da, -dmy * 0.0016, scenePoint(cx, cy));
      }
      pinchDist = d; pinchAng = ang; pinchMidY = cy; return;
    }
    if (!dragging) return;
    const dx = e.clientX - dsx, dy = e.clientY - dsy;
    if (!dragMoved) {
      if (Math.abs(dx) + Math.abs(dy) <= 4) return;   // still a click
      dragMoved = true; tag.classList.remove("show");
      if (svg.setPointerCapture) { try { svg.setPointerCapture(pid); captured = true; } catch (_) {} }
    }
    if (mode === "pan") { panBy(dx, dy); }
    else { orbitBy(-dx * 0.006, -dy * 0.0016, scenePoint(e.clientX, e.clientY)); }  // orbit around cursor
    dsx = e.clientX; dsy = e.clientY;
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

  // click empty space: focus the island under the cursor, else back to all
  function scenePoint(cx, cy) { const r = svg.getBoundingClientRect(); return [VB.x + (cx - r.left) / r.width * VB.w, VB.y + (cy - r.top) / r.height * VB.h]; }
  function pointInPoly(px, py, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  }
  function islandAt(px, py) {
    for (const c of D.clients) {
      const [gxm, gym, gxM, gyM] = CL[c.id].box;
      if (pointInPoly(px, py, [iso(gxm, gym, 0), iso(gxM, gym, 0), iso(gxM, gyM, 0), iso(gxm, gyM, 0)])) return c.id;
    }
    return null;
  }
  svg.addEventListener("click", (e) => {
    if (e.target !== svg || dragMoved) return;
    const p = scenePoint(e.clientX, e.clientY), cid = islandAt(p[0], p[1]);
    if (cid) focusClientTile(cid); else showAllClients();
  });
  svg.addEventListener("wheel", (e) => {
    e.preventDefault();
    const r = svg.getBoundingClientRect();
    const mx = VB.x + (e.clientX - r.left) / r.width * VB.w;
    const my = VB.y + (e.clientY - r.top) / r.height * VB.h;
    const f = e.deltaY > 0 ? 1.1 : 0.9;
    const nw = Math.min(fit.w * 2.4, Math.max(fit.w * 0.35, VB.w * f));
    const k = nw / VB.w;
    VB.w = nw; VB.h *= k;
    VB.x = mx - (mx - VB.x) * k; VB.y = my - (my - VB.y) * k;
    applyVB();
  }, { passive: false });
  // keyboard: arrows pan the view
  addEventListener("keydown", (e) => {
    const step = VB.w * 0.06;
    if (e.key === "ArrowLeft") { VB.x -= step; applyVB(); e.preventDefault(); }
    else if (e.key === "ArrowRight") { VB.x += step; applyVB(); e.preventDefault(); }
    else if (e.key === "ArrowUp") { VB.y -= step; applyVB(); e.preventDefault(); }
    else if (e.key === "ArrowDown") { VB.y += step; applyVB(); e.preventDefault(); }
  });

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
    // floating client crests: slow coin-spin about the vertical axis + gentle bob
    for (const em of emblems) {
      const s = Math.cos(ts * 0.62);                 // +1 front … 0 edge … -1 back
      const bob = Math.sin(ts * 1.05) * 4;
      const y = em.baseY + bob;
      // keep a sliver of thickness at the edge so it never fully vanishes
      const sx = (s < 0 ? -1 : 1) * Math.max(0.06, Math.abs(s));
      em.spin.setAttribute("transform", `translate(${em.cx.toFixed(1)},${y.toFixed(1)}) scale(${sx.toFixed(3)},1)`);
      const facingFront = s >= 0;
      em.front.setAttribute("opacity", facingFront ? "1" : "0");
      em.back.setAttribute("opacity", facingFront ? "0" : "1");
    }
    // clouds: a slow, gentle bob
    clouds.forEach((cl, i) => {
      const bob = Math.sin(ts * 0.5 + i) * 5;
      cl.wrap.setAttribute("transform", `translate(0,${bob.toFixed(1)})`);
    });
    // cubes: drift up/down at slightly different phases, on top of their base lift
    cubes.forEach((cu, i) => {
      const bob = Math.sin(ts * 0.9 + i * 1.7) * 6;
      cu.wrap.setAttribute("transform", `translate(0,${(-cu.liftPx + bob).toFixed(1)})`);
    });
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
    const hero = D.practice.hero;
    set("#intro .intro-eyebrow", hero.eyebrow || "");
    set("#intro h1 .h1-a", hero.headline);
    set("#intro h1 .h1-b", hero.headlineAccent || "");
    set("#intro .lede", hero.sub);
    const stats = $("#intro .intro-stats");
    if (stats) {
      stats.innerHTML = "";
      (hero.stats || []).forEach((s) => {
        const cell = el2("div", "stat");
        const num = el2("div", "stat-n"); num.textContent = s.n; cell.appendChild(num);
        if (s.unit) { const u = el2("span", "stat-u"); u.textContent = s.unit; num.appendChild(u); }
        const lbl = el2("div", "stat-l"); lbl.textContent = s.label; cell.appendChild(lbl);
        stats.appendChild(cell);
      });
    }
    const logoRow = $("#intro .intro-built-row");
    if (logoRow) {
      logoRow.innerHTML = "";
      const ic = window.ICONS || {};
      (hero.logos || []).forEach((id) => {
        if (!ic[id]) return;
        const im = el2("img", "built-logo");
        im.src = ic[id]; im.alt = ""; im.loading = "lazy";
        logoRow.appendChild(im);
      });
    }
    set("#intro .intro-note", hero.note || "");
    if (hero.cta) { const btn = $("#enter"); if (btn) btn.innerHTML = hero.cta + " &rarr;"; }
    set("#footer", D.practice.footer);
    updateCounter();

    // client tiles (top-right): pick a tenant to fly into its environment
    const tiles = $("#clients"); if (tiles) {
      tiles.innerHTML = '<span class="cap">Clients · separate tenants</span>';
      const row = el2("div", "ctiles");
      const all = el2("button", "ctile all on"); all.textContent = "All"; all.setAttribute("data-client", "");
      all.addEventListener("click", showAllClients); row.appendChild(all);
      D.clients.forEach((c) => {
        const t = el2("button", "ctile"); t.setAttribute("data-client", c.id);
        t.innerHTML = '<span class="dot" style="background:' + c.color + '"></span>' + c.short + (c.real ? "" : "*");
        t.addEventListener("click", () => focusClientTile(c.id));
        row.appendChild(t);
      });
      tiles.appendChild(row);
    }
  }

  function setActiveTile(clientId) {
    document.querySelectorAll(".ctile").forEach((t) => t.classList.toggle("on", t.getAttribute("data-client") === (clientId || "")));
  }
  function islandCentreScreen(clientId) {
    const [gxm, gym, gxM, gyM] = CL[clientId].box;
    return iso((gxm + gxM) / 2, (gym + gyM) / 2, 0.8);
  }
  function focusClientTile(clientId) {
    focusClient = clientId; selectedId = null;
    markExplored({ clientId });
    applyFocusStates();
    setActiveTile(clientId);
    fillClientPanel(CL[clientId].client);
    const p = $("#panel"); p.classList.add("open"); p.scrollTop = 0;
    const c = islandCentreScreen(clientId); tweenVBCenter(c[0], c[1] - 30, 650);
  }
  function showAllClients() {
    focusClient = null; selectedId = null;
    applyFocusStates();
    setActiveTile(null);
    $("#panel").classList.remove("open");
    tweenVBCenter(fit.x + fit.w / 2, fit.y + fit.h / 2, 650);
  }

  /* ---- intro / reveal ---- */
  function reveal() {
    ["#brand", "#ms-corner", "#clients", "#hint", "#actions", "#nav", "#zoom", "#fs", "#counter", "#footer"].forEach((s) => { const e = $(s); if (e) e.classList.add("in"); });
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
    $("#reset").addEventListener("click", () => {   // back to all clients, level view
      focusClient = null; selectedId = null; setActiveTile(null);
      $("#panel").classList.remove("open");
      setYaw(0); setPitch(0.5); buildScene(false);
      VB = Object.assign({}, fit); applyVB();
    });
    // Home: return to the intro overlay (and reset the scene behind it)
    const homeBtn = $("#home");
    if (homeBtn) homeBtn.addEventListener("click", () => {
      focusClient = null; selectedId = null; setActiveTile(null);
      $("#panel").classList.remove("open");
      setYaw(0); setPitch(0.5); buildScene(false);
      VB = Object.assign({}, fit); applyVB();
      const intro = $("#intro");
      if (intro) { intro.style.display = ""; requestAnimationFrame(() => intro.classList.remove("gone")); }
    });
    addEventListener("keydown", (e) => { if (e.key === "Escape") clearFocus(); });
    addEventListener("resize", () => computeFit());

    // full-screen toggle
    const fsBtn = $("#fs");
    if (fsBtn) {
      const root = document.documentElement;
      fsBtn.addEventListener("click", () => {
        const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
        if (!fsEl) { (root.requestFullscreen || root.webkitRequestFullscreen || (() => {})).call(root); }
        else { (document.exitFullscreen || document.webkitExitFullscreen || (() => {})).call(document); }
      });
      const sync = () => { const on = !!(document.fullscreenElement || document.webkitFullscreenElement); fsBtn.classList.toggle("on", on); fsBtn.title = on ? "Exit full screen" : "Full screen"; setTimeout(computeFit, 60); };
      document.addEventListener("fullscreenchange", sync);
      document.addEventListener("webkitfullscreenchange", sync);
    }

    // press-and-hold helper for the on-screen control clusters
    function holdRepeat(container, btnSel, run) {
      if (!container) return;
      container.addEventListener("pointerdown", (e) => {
        const b = e.target.closest(btnSel); if (!b) return;
        e.preventDefault();
        const a = b.dataset.act; run(a);
        const timer = setInterval(() => run(a), 90);
        const stop = () => { clearInterval(timer); removeEventListener("pointerup", stop); removeEventListener("pointercancel", stop); };
        addEventListener("pointerup", stop); addEventListener("pointercancel", stop);
      });
    }

    // move pad: press (or hold) to pan the view up / down / left / right
    const MOVE = { up: [0, 34], down: [0, -34], left: [34, 0], right: [-34, 0] };
    holdRepeat($("#nav"), ".nav-btn", (a) => { const m = MOVE[a]; if (m) panBy(m[0], m[1]); });

    // zoom buttons: press (or hold) to zoom the view centre in / out
    holdRepeat($("#zoom"), ".zoom-btn", (a) => zoomCenter(a === "in" ? 0.88 : 1.14));

    // small API (also used by automated checks)
    window.Landscape = { select: (id) => nodes[id] && selectNode(nodes[id]), reset: clearFocus,
      enter: enterScene, ids: () => Object.keys(nodes), client: focusClientTile, allClients: showAllClients };
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();

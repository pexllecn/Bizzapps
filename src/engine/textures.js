// Procedural surface maps: colour, roughness and normal, drawn on canvases.
// Every tiling map is built from periodic noise so it repeats without a seam.

import * as THREE from "three";
import { rng } from "./noise.js";

const cache = new Map();
function once(key, make) {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key);
}

/** Tileable value noise on a lattice of `cells`, fbm'd over octaves. */
export function periodic(seed, cells) {
  const r = rng(seed);
  const tables = [];
  for (let o = 0; o < 7; o++) {
    const n = cells << o, t = new Float32Array(n * n);
    for (let i = 0; i < t.length; i++) t[i] = r();
    tables.push({ n, t });
  }
  const s = (x) => x * x * (3 - 2 * x);
  function lattice(o, u, v) {
    const { n, t } = tables[o];
    const x = u * n, y = v * n;
    const xi = Math.floor(x), yi = Math.floor(y);
    const fx = s(x - xi), fy = s(y - yi);
    const x0 = ((xi % n) + n) % n, y0 = ((yi % n) + n) % n;
    const x1 = (x0 + 1) % n, y1 = (y0 + 1) % n;
    const a = t[y0 * n + x0], b = t[y0 * n + x1], c = t[y1 * n + x0], d = t[y1 * n + x1];
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }
  return function (u, v, octaves = 5, gain = 0.5) {
    let a = 1, sum = 0, norm = 0;
    for (let o = 0; o < Math.min(octaves, 7); o++) { sum += a * lattice(o, u, v); norm += a; a *= gain; }
    return sum / norm;
  };
}

function canvas(w, h) {
  const el = document.createElement("canvas");
  el.width = w; el.height = h;
  return [el, el.getContext("2d")];
}

function tex(el, srgb, repeat) {
  const t = new THREE.CanvasTexture(el);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  if (repeat) t.repeat.set(repeat, repeat);
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.needsUpdate = true;
  return t;
}

/** A tangent-space normal map from a height field, sampled with wrap. */
function normalFrom(height, size, strength) {
  const [el, ctx] = canvas(size, size);
  const img = ctx.createImageData(size, size);
  const at = (x, y) => height[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
    const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
    const l = Math.hypot(dx, dy, 1);
    const i = (y * size + x) * 4;
    img.data[i] = (-dx / l * 0.5 + 0.5) * 255;
    img.data[i + 1] = (dy / l * 0.5 + 0.5) * 255;
    img.data[i + 2] = (1 / l * 0.5 + 0.5) * 255;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return tex(el, false);
}

function fieldToCanvas(size, fn) {
  const [el, ctx] = canvas(size, size);
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const c = fn(x, y, (y * size + x));
    const i = (y * size + x) * 4;
    img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2]; img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return el;
}

const mix = (a, b, t) => a + (b - a) * t;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const smooth = (e0, e1, x) => { const t = clamp01((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };

/**
 * Weathered sarsen: grey-buff sandstone, pitted, streaked by rain and
 * spotted with pale lichen. Returns { map, roughnessMap, normalMap }.
 */
export function stoneMaps(size = 1024) {
  return once("stone:" + size, () => {
    const big = periodic(11, 3), mid = periodic(23, 8), fine = periodic(37, 32), streak = periodic(41, 4), lich = periodic(53, 20);
    const H = new Float32Array(size * size);
    const col = fieldToCanvas(size, (x, y, i) => {
      const u = x / size, v = y / size;
      const b = big(u, v, 4), m = mid(u, v, 5), f = fine(u, v, 3, 0.6);
      // vertical rain streaks: stretched noise along v
      const st = streak(u * 1.0, v * 0.12, 4);
      const pits = smooth(0.62, 0.8, fine(u * 1.7 + 0.3, v * 1.7, 2)) * 0.9;
      const h = b * 0.45 + m * 0.35 + f * 0.2 - pits * 0.18;
      H[i] = h;
      // base sandstone, grey-buff
      let r = mix(138, 184, b) + (m - 0.5) * 30;
      let g = mix(131, 174, b) + (m - 0.5) * 28;
      let bl = mix(118, 152, b) + (m - 0.5) * 24;
      // darker weathering in the crevices and streaks
      const dark = smooth(0.45, 0.8, st) * 0.22 + pits * 0.3 + (0.5 - h) * 0.25;
      r *= 1 - dark; g *= 1 - dark; bl *= 1 - dark * 0.9;
      // lichen: pale grey-green crusts, and small ochre spots
      const L = lich(u, v, 5);
      const pale = smooth(0.62, 0.7, L) * 0.4;
      r = mix(r, 200, pale); g = mix(g, 202, pale); bl = mix(bl, 184, pale);
      const ochre = smooth(0.72, 0.75, mid(u * 3.1, v * 3.1, 3)) * 0.3;
      r = mix(r, 178, ochre); g = mix(g, 150, ochre); bl = mix(bl, 72, ochre);
      const grain = (f - 0.5) * 22;
      return [clamp01((r + grain) / 255) * 255, clamp01((g + grain) / 255) * 255, clamp01((bl + grain) / 255) * 255];
    });
    const rough = fieldToCanvas(size, (x, y, i) => { const v = 200 + (H[i] - 0.5) * 90; return [v, v, v]; });
    return { map: tex(col, true), roughnessMap: tex(rough, false), normalMap: normalFrom(H, size, 9) };
  });
}

/** The meadow floor, seen from further off than the blades are drawn. */
export function meadowMaps(size = 1024) {
  return once("meadow:" + size, () => {
    const a = periodic(71, 6), b = periodic(83, 24), c = periodic(97, 64), d = periodic(101, 3);
    const H = new Float32Array(size * size);
    const col = fieldToCanvas(size, (x, y, i) => {
      const u = x / size, v = y / size;
      const A = a(u, v, 4), B = b(u, v, 3), C = c(u, v, 2), D = d(u, v, 3);
      H[i] = C * 0.6 + B * 0.4;
      // summer grass at low sun: olive green with straw and dry patches
      const dry = smooth(0.52, 0.72, A * 0.7 + D * 0.3);
      let r = mix(92, 150, dry), g = mix(112, 138, dry), bl = mix(40, 62, dry);
      const blade = (C - 0.5) * 60 + (B - 0.5) * 30;
      r += blade * 0.8; g += blade; bl += blade * 0.4;
      return [clamp01(r / 255) * 255, clamp01(g / 255) * 255, clamp01(bl / 255) * 255];
    });
    return { map: tex(col, true), normalMap: normalFrom(H, size, 6) };
  });
}

/** Chalk track: a pale worn path, packed earth with flint. */
export function chalkMaps(size = 512) {
  return once("chalk:" + size, () => {
    const a = periodic(131, 8), b = periodic(137, 40);
    const H = new Float32Array(size * size);
    const col = fieldToCanvas(size, (x, y, i) => {
      const u = x / size, v = y / size, A = a(u, v, 5), B = b(u, v, 2);
      H[i] = A * 0.5 + B * 0.5;
      const flint = smooth(0.78, 0.82, B) * 0.6;
      const r = mix(168, 206, A) - flint * 90, g = mix(158, 196, A) - flint * 90, bl = mix(132, 170, A) - flint * 80;
      return [r, g, bl];
    });
    return { map: tex(col, true), normalMap: normalFrom(H, size, 7) };
  });
}

/** Blackened steel plate for the bench: fine scratches, tool marks. */
export function steelMaps(size = 1024) {
  return once("steel:" + size, () => {
    const a = periodic(211, 4), b = periodic(223, 16);
    const [el, ctx] = canvas(size, size);
    const [rel, rctx] = canvas(size, size);
    const img = ctx.createImageData(size, size), rim = rctx.createImageData(size, size);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size, A = a(u, v, 5), B = b(u, v, 3);
      const i = (y * size + x) * 4;
      const c = 20 + A * 22 + (B - 0.5) * 8;
      img.data[i] = c; img.data[i + 1] = c; img.data[i + 2] = c * 1.08; img.data[i + 3] = 255;
      const rr = 120 + A * 80;
      rim.data[i] = rim.data[i + 1] = rim.data[i + 2] = rr; rim.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0); rctx.putImageData(rim, 0, 0);
    // scratches: many short strokes, brighter and smoother than the plate
    const r = rng(5);
    for (let k = 0; k < 1400; k++) {
      const x = r() * size, y = r() * size, ang = (r() - 0.5) * 0.6 + (r() > 0.7 ? 1.57 : 0), len = 10 + r() * 90;
      const a2 = 0.05 + r() * 0.12;
      for (const [c2, al, lw] of [[ctx, a2, 0.6], [rctx, a2 * 2.2, 0.8]]) {
        c2.strokeStyle = c2 === ctx ? `rgba(180,180,190,${al})` : `rgba(40,40,40,${al})`;
        c2.lineWidth = lw; c2.beginPath(); c2.moveTo(x, y);
        c2.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len); c2.stroke();
      }
    }
    return { map: tex(el, true), roughnessMap: tex(rel, false) };
  });
}

/** Drafting paper with a sepia sketch of gears and a schematic, as in a workshop. */
export function schematicMap(w = 1024, h = 2048) {
  return once("schematic", () => {
    const [el, ctx] = canvas(w, h);
    const r = rng(9);
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#e9dcc0"); g.addColorStop(1, "#d8c7a3");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    for (let k = 0; k < 9000; k++) {
      ctx.fillStyle = `rgba(90,60,20,${r() * 0.05})`;
      ctx.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2);
    }
    ctx.strokeStyle = "rgba(92,60,28,.72)"; ctx.fillStyle = "rgba(92,60,28,.72)";
    function gear(cx, cy, R, teeth) {
      ctx.lineWidth = 2.2; ctx.beginPath();
      for (let t = 0; t <= teeth * 4; t++) {
        const a = (t / (teeth * 4)) * Math.PI * 2, rr = (t % 4 < 2) ? R : R * 0.86;
        const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
        t ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath(); ctx.stroke();
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.55, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.16, 0, 7); ctx.stroke();
      for (let s = 0; s < 6; s++) {
        const a = s / 6 * Math.PI * 2;
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * R * 0.16, cy + Math.sin(a) * R * 0.16);
        ctx.lineTo(cx + Math.cos(a) * R * 0.55, cy + Math.sin(a) * R * 0.55); ctx.stroke();
      }
      ctx.setLineDash([6, 5]); ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(cx - R * 1.3, cy); ctx.lineTo(cx + R * 1.3, cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy - R * 1.3); ctx.lineTo(cx, cy + R * 1.3); ctx.stroke();
      ctx.setLineDash([]);
    }
    gear(300, 420, 150, 18); gear(560, 560, 92, 12); gear(720, 330, 120, 16);
    gear(360, 1180, 110, 14); gear(640, 1320, 170, 22); gear(300, 1620, 80, 10);
    ctx.lineWidth = 1.2;
    for (let k = 0; k < 22; k++) {
      const y = 800 + k * 14;
      ctx.beginPath(); ctx.moveTo(110, y); ctx.lineTo(110 + 300 + r() * 500, y); ctx.stroke();
    }
    ctx.font = "italic 34px Georgia, serif";
    ctx.fillText("Differential engine — No. 2", 110, 120);
    ctx.font = "italic 22px Georgia, serif";
    ctx.fillText("fig. 1   main train", 120, 650);
    ctx.fillText("fig. 2   carriage", 120, 1880);
    ctx.lineWidth = 3; ctx.strokeRect(60, 60, w - 120, h - 120);
    const t = new THREE.CanvasTexture(el);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    return t;
  });
}

/** A circuit board trace pattern for the glass cores, as an emissive mask. */
export function circuitMap(size = 512, seed = 1) {
  return once("circuit:" + seed, () => {
    const [el, ctx] = canvas(size, size);
    const r = rng(seed * 97 + 13);
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = "#fff"; ctx.fillStyle = "#fff"; ctx.lineCap = "round";
    const step = size / 16;
    for (let k = 0; k < 46; k++) {
      let x = Math.floor(r() * 16) * step + step / 2, y = Math.floor(r() * 16) * step + step / 2;
      ctx.lineWidth = r() > 0.8 ? 3 : 1.6;
      ctx.beginPath(); ctx.moveTo(x, y);
      const n = 2 + Math.floor(r() * 4);
      for (let s = 0; s < n; s++) {
        const dir = Math.floor(r() * 4), len = (1 + Math.floor(r() * 4)) * step;
        const diag = r() > 0.7;
        if (dir === 0) { x += len; if (diag) y += step; } else if (dir === 1) { x -= len; if (diag) y -= step; }
        else if (dir === 2) { y += len; } else { y -= len; }
        ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, 3.2, 0, 7); ctx.fill();
    }
    // chips
    for (let k = 0; k < 5; k++) {
      const cx = r() * size * 0.7 + size * 0.15, cy = r() * size * 0.7 + size * 0.15, s = step * (1.2 + r() * 1.5);
      ctx.lineWidth = 1.5; ctx.strokeRect(cx - s / 2, cy - s / 2, s, s);
    }
    const t = new THREE.CanvasTexture(el);
    t.colorSpace = THREE.NoColorSpace;
    return t;
  });
}

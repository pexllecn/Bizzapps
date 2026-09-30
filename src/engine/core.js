// The stage every world stands on: a physically lit renderer, a filmic grade,
// a damped camera rig and a render loop that sleeps when nobody is looking.

import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";

export { THREE };

export const REDUCED = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Can this browser draw the worlds at all? */
export function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch (e) { return false; }
}

/**
 * Pick a quality tier. `high` gets the full meadow, soft shadows and bloom;
 * `mid` thins the grass and the shadow map; `low` is for software rendering
 * and small phones, and still looks like the same place.
 */
function detectQuality(renderer) {
  const q = new URLSearchParams(location.search).get("q");
  if (q === "low" || q === "mid" || q === "high") return q;
  let gpu = "";
  try {
    const gl = renderer.getContext();
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    gpu = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "";
  } catch (e) { /* ignore */ }
  if (/swiftshader|llvmpipe|software|basic render/i.test(gpu)) return "low";
  const small = Math.min(screen.width, screen.height) < 700;
  const coarse = matchMedia("(pointer: coarse)").matches;
  if (small || coarse) return "mid";
  return "high";
}

/**
 * Replaces any pixel that is not a finite number with black, and clamps the
 * extreme ones, before bloom sees them. A single NaN from any shader on any
 * GPU is otherwise blurred by the bloom into a black blotch that flickers
 * across the screen; this pass makes that impossible.
 */
export const SANITIZE = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
  fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      if (!(c.r == c.r) || !(c.g == c.g) || !(c.b == c.b) || isinf(c.r) || isinf(c.g) || isinf(c.b)) c = vec4(0.0, 0.0, 0.0, 1.0);
      gl_FragColor = vec4(clamp(c.rgb, 0.0, 64.0), 1.0);
    }`,
};

export const GRADE = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uVignette: { value: 0.55 },
    uGrain: { value: 0.045 },
    uLift: { value: new THREE.Vector3(0.0, 0.0, 0.0) },
    uFade: { value: 0 },
    uSat: { value: 1.1 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime, uVignette, uGrain, uFade, uSat; uniform vec3 uLift;
    varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 q = vUv - .5;
      float v = smoothstep(.95, .18, length(q * vec2(1.05, 1.25)));
      c.rgb *= mix(1., v, uVignette);
      float lum = dot(c.rgb, vec3(.2126, .7152, .0722));
      c.rgb = mix(vec3(lum), c.rgb, uSat);
      c.rgb += uLift * (1. - c.rgb);
      float g = h(vUv * 1024. + fract(uTime) * 91.7) - .5;
      c.rgb += g * uGrain;
      c.rgb = mix(c.rgb, vec3(0.), uFade);
      gl_FragColor = c;
    }`,
};

export class Stage {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.opts = opts;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance", alpha: false, preserveDrawingBuffer: !!opts.preserve });
    this.renderer = renderer;
    this.quality = opts.quality || detectQuality(renderer);
    const dpr = window.devicePixelRatio || 1;
    this.pixelRatio = this.quality === "high" ? Math.min(dpr, 2) : this.quality === "mid" ? Math.min(dpr, 1.5) : 1;
    renderer.setPixelRatio(this.pixelRatio);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = opts.exposure ?? 1;
    renderer.shadowMap.enabled = this.quality !== "low" || !!opts.lowShadows;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.camera = opts.camera || new THREE.PerspectiveCamera(opts.fov || 38, 1, opts.near || 0.1, opts.far || 6000);
    this.clock = new THREE.Clock();
    this.time = 0;
    this.frameHooks = [];
    this.running = false;
    this.visible = true;
    this.dirty = 2;
    // ?still=N renders N frames and then holds, for screenshots on software GL
    const still = +new URLSearchParams(location.search).get("still");
    this.stillAfter = still > 0 ? still : 0;
    this.frames = 0;

    // MSAA on a half-float target is where some drivers go wrong; ?msaa=0 turns it off
    const msaa = new URLSearchParams(location.search).get("msaa");
    const samples = msaa === "0" || this.quality === "low" ? 0 : 4;
    const rt = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, samples });
    const composer = new EffectComposer(renderer, rt);
    composer.addPass(new RenderPass(this.scene, this.camera));
    composer.addPass(new ShaderPass(SANITIZE));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), opts.bloom ?? 0.5, 0.6, opts.bloomThreshold ?? 1.0);
    if (this.quality !== "low" || opts.lowBloom) composer.addPass(this.bloom);
    composer.addPass(new OutputPass());
    this.grade = new ShaderPass(GRADE);
    composer.addPass(this.grade);
    this.composer = composer;

    this.resize = this.resize.bind(this);
    this._tick = this._tick.bind(this);
    this._ro = typeof ResizeObserver === "function" ? new ResizeObserver(this.resize) : null;
    if (this._ro) this._ro.observe(canvas); else addEventListener("resize", this.resize);
    this.resize();

    // Only draw while on screen and while the tab is visible.
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((es) => {
        es.forEach((e) => { this.visible = e.isIntersecting; if (this.visible) this.start(); });
      }, { threshold: 0 }).observe(canvas);
    }
    document.addEventListener("visibilitychange", () => { if (!document.hidden) this.start(); });
    // a lost context is recovered by starting again, not by a frozen or black canvas
    canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); this.running = false; });
    canvas.addEventListener("webglcontextrestored", () => location.reload());
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    if (w === this.w && h === this.h) return;
    this.w = w; this.h = h;
    this.renderer.setSize(w, h, false);
    this.composer.setPixelRatio(this.pixelRatio);
    this.composer.setSize(w, h);
    if (this.camera.isPerspectiveCamera) { this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
    this.dirty = 2;
    if (this.onResize) this.onResize(w, h);
  }

  onFrame(fn) { this.frameHooks.push(fn); }

  start() {
    if (this.running) return;
    this.running = true;
    this.clock.getDelta();
    requestAnimationFrame(this._tick);
  }

  stop() { this.running = false; }

  _tick() {
    if (!this.running) return;
    if (!this.visible || document.hidden) { this.running = false; return; }
    const dt = this.stillAfter ? 0.05 : Math.min(0.05, this.clock.getDelta());
    if (this.stillAfter && ++this.frames > this.stillAfter) { this.running = false; document.documentElement.dataset.still = "1"; return; }
    this.time += dt;
    for (const fn of this.frameHooks) fn(dt, this.time);
    this.grade.uniforms.uTime.value = this.time;
    this.composer.render(dt);
    requestAnimationFrame(this._tick);
  }

  /** Render one frame now, for reduced motion and first paint. */
  renderOnce() {
    for (const fn of this.frameHooks) fn(0, this.time);
    this.composer.render(0);
  }

  /** Screen position of a world point, in CSS pixels. Null if behind the camera. */
  project(v, out = {}) {
    const p = _v.copy(v).project(this.camera);
    if (p.z > 1) return null;
    out.x = (p.x * 0.5 + 0.5) * this.w;
    out.y = (-p.y * 0.5 + 0.5) * this.h;
    out.z = p.z;
    return out;
  }

  /** Raycast the given objects from a CSS-pixel position on the canvas. */
  pick(x, y, objects) {
    _ndc.set((x / this.w) * 2 - 1, -(y / this.h) * 2 + 1);
    _ray.setFromCamera(_ndc, this.camera);
    const hits = _ray.intersectObjects(objects, true);
    return hits[0] || null;
  }
}

const _v = new THREE.Vector3(), _ndc = new THREE.Vector2(), _ray = new THREE.Raycaster();

/**
 * An orbit rig with damping, written for presenting rather than for editing:
 * everything eases, nothing snaps, and the camera can be flown to a framing.
 */
export class Rig {
  constructor(camera, o = {}) {
    this.camera = camera;
    this.target = new THREE.Vector3().fromArray(o.target || [0, 0, 0]);
    this.targetT = this.target.clone();
    this.az = this.azT = o.az ?? 0;
    this.el = this.elT = o.el ?? 0.3;
    this.dist = this.distT = o.dist ?? 50;
    this.minEl = o.minEl ?? 0.02; this.maxEl = o.maxEl ?? 1.35;
    this.minDist = o.minDist ?? 5; this.maxDist = o.maxDist ?? 400;
    this.damp = o.damp ?? 3.2;
    this.bounds = o.bounds || null;      // radius the target may wander from origin
    this.drift = 0;                      // idle azimuth drift, rad/s
    this.sway = new THREE.Vector2();     // pointer parallax, applied on top
    this.swayT = new THREE.Vector2();
    this.update(1);
  }

  clamp() {
    this.elT = Math.max(this.minEl, Math.min(this.maxEl, this.elT));
    this.distT = Math.max(this.minDist, Math.min(this.maxDist, this.distT));
    if (this.bounds) {
      const l = Math.hypot(this.targetT.x, this.targetT.z);
      if (l > this.bounds) { this.targetT.x *= this.bounds / l; this.targetT.z *= this.bounds / l; }
    }
  }

  fly(o, instant) {
    if (o.az != null) {
      // take the short way round
      let d = o.az - this.azT;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.azT += d;
    }
    if (o.el != null) this.elT = o.el;
    if (o.dist != null) this.distT = o.dist;
    if (o.target) this.targetT.fromArray(o.target);
    this.clamp();
    if (instant) { this.az = this.azT; this.el = this.elT; this.dist = this.distT; this.target.copy(this.targetT); }
  }

  update(dt) {
    const k = 1 - Math.exp(-this.damp * dt);
    this.azT += this.drift * dt;
    this.az += (this.azT - this.az) * k;
    this.el += (this.elT - this.el) * k;
    this.dist += (this.distT - this.dist) * k;
    this.target.lerp(this.targetT, k);
    this.sway.lerp(this.swayT, 1 - Math.exp(-2 * dt));
    const az = this.az + this.sway.x * 0.05, el = this.el + this.sway.y * 0.025;
    const c = this.camera, ce = Math.cos(el);
    c.position.set(
      this.target.x + Math.sin(az) * ce * this.dist,
      this.target.y + Math.sin(el) * this.dist,
      this.target.z + Math.cos(az) * ce * this.dist,
    );
    c.lookAt(this.target);
    return Math.abs(this.azT - this.az) + Math.abs(this.elT - this.el) + Math.abs(this.distT - this.dist) / this.dist > 0.0005;
  }

  /** Pointer and wheel handling on an element. Calls onTap(x, y) for a click that did not drag. */
  attach(el, { onTap, onHover, onUser } = {}) {
    const pts = new Map();
    let moved = 0, panning = false, pinch0 = 0;
    el.addEventListener("pointerdown", (e) => {
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      moved = 0; panning = e.shiftKey || e.button === 2 || e.button === 1;
      if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); }
      try { el.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ }
      el.classList.add("grab");
      onUser && onUser();
    });
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      this.swayT.set(((e.clientX - r.left) / r.width - 0.5) * 2, ((e.clientY - r.top) / r.height - 0.5) * 2);
      const p = pts.get(e.pointerId);
      if (!p) { onHover && onHover(e.clientX - r.left, e.clientY - r.top); return; }
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch0) this.distT *= pinch0 / d;
        pinch0 = d; this.clamp(); return;
      }
      if (panning) {
        const k = this.dist * Math.tan((this.camera.fov * Math.PI / 180) / 2) / (r.height / 2);
        const sa = Math.sin(this.az), ca = Math.cos(this.az);
        this.targetT.x -= (ca * dx + sa * dy) * k;
        this.targetT.z -= (-sa * dx + ca * dy) * k;
      } else {
        this.azT -= dx * 0.006;
        this.elT += dy * 0.0035;
      }
      this.clamp();
    });
    const up = (e) => {
      const r = el.getBoundingClientRect();
      if (pts.has(e.pointerId) && moved < 6 && pts.size === 1 && onTap) onTap(e.clientX - r.left, e.clientY - r.top);
      pts.delete(e.pointerId);
      if (!pts.size) el.classList.remove("grab");
    };
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("pointerleave", () => { this.swayT.set(0, 0); });
    el.addEventListener("contextmenu", (e) => e.preventDefault());
    el.addEventListener("wheel", (e) => {
      e.preventDefault();
      this.distT *= Math.exp(e.deltaY * 0.001);
      this.clamp();
      onUser && onUser();
    }, { passive: false });
  }
}

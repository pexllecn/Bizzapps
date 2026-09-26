// The Igloo stage: one continuous 360-degree canvas wrapped round the room.
//
// The scene is rendered once per frame into a cube map from the audience's
// position, then unwrapped onto the canvas as a cylinder: every column of
// pixels is one compass bearing, and every row is the elevation a person at
// the centre of the room sees on the wall at that height. A cylinder has no
// seams and no stretching at the corners, which a row of flat views stitched
// together would have. Turning the room is a single uniform, so rotating the
// whole city to bring a landmark to the front wall costs nothing.
//
// Built for the room's PC rendering a very wide canvas, so it measures itself
// and trades cube-map resolution for frame rate as it goes.

import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { Pass, FullScreenQuad } from "three/examples/jsm/postprocessing/Pass.js";
import { GRADE, SANITIZE } from "./core.js";

const TAU = Math.PI * 2;

/** Unwraps the cube map onto the canvas as a cylinder seen from its axis. */
class PanoPass extends Pass {
  constructor(cubeTexture) {
    super();
    this.needsSwap = false;
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tCube: { value: cubeTexture },
        uSize: { value: new THREE.Vector2(1, 1) },
        uYaw: { value: 0 },
        uFront: { value: 0.5 },
        uHorizon: { value: 0.4 },
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
      fragmentShader: `
        uniform samplerCube tCube; uniform vec2 uSize; uniform float uYaw, uFront, uHorizon;
        varying vec2 vUv;
        void main(){
          float R = uSize.x / 6.28318530718;                  // pixels per radian round the room
          float y = vUv.y * uSize.y;                            // up from the bottom of the band
          float th = uYaw - (vUv.x - uFront) * 6.28318530718;   // bearing: to the right is clockwise
          float el = atan((y - uHorizon * uSize.y) / R);
          vec3 d = vec3(cos(el) * sin(th), sin(el), cos(el) * cos(th));
          gl_FragColor = textureCube(tCube, d);
        }`,
      depthTest: false, depthWrite: false,
    });
    this.quad = new FullScreenQuad(this.material);
  }
  // like RenderPass, this is where the frame begins, so it draws into the read buffer
  render(renderer, writeBuffer, readBuffer) {
    renderer.setRenderTarget(this.renderToScreen ? null : readBuffer);
    this.quad.render(renderer);
  }
  dispose() { this.material.dispose(); this.quad.dispose(); }
}

export class PanoStage {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.opts = opts;
    const q = new URLSearchParams(location.search);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance", alpha: false, preserveDrawingBuffer: false });
    this.renderer = renderer;
    renderer.setPixelRatio(1);                               // the layer's own resolution is the canvas
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.shadowMap.enabled = false;
    this.quality = q.get("q") || "high";

    this.scene = new THREE.Scene();
    this.eye = new THREE.Vector3().fromArray(opts.eye || [0, 12, 0]);
    this.faceMax = +(q.get("face")) || (this.quality === "low" ? 1024 : this.quality === "mid" ? 1536 : 2048);
    this.face = Math.min(this.faceMax, 1536);
    this.cubeRT = new THREE.WebGLCubeRenderTarget(this.face, { type: THREE.HalfFloatType, generateMipmaps: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
    this.cubeCam = new THREE.CubeCamera(1, 4000, this.cubeRT);
    this.cubeCam.position.copy(this.eye);
    this.scene.add(this.cubeCam);
    // a stand-in perspective camera for code that asks for one (fov, position)
    this.camera = new THREE.PerspectiveCamera(90, 1, 1, 4000);
    this.camera.position.copy(this.eye);

    this.yaw = 0; this.yawT = 0;
    this.spin = 0;                                          // radians a second the room turns by itself
    // the colours along the bottom of the walls, by bearing, for the floor to blend into
    this.edgeBins = +(q.get("edgebins")) || 48;
    this.edge = null; this.edgeAt = -1e9;
    this.front = q.has("front") ? +q.get("front") : 0.5;
    this.horizon = q.has("horizon") ? +q.get("horizon") : 0.4;
    this.fpsCap = +(q.get("fps")) || 60;
    this.adaptive = q.get("adaptive") !== "0";
    this.time = 0; this.frameHooks = []; this.running = false; this.frames = 0;
    const still = +q.get("still");
    this.stillAfter = still > 0 ? still : 0;

    const rt = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType });
    const composer = new EffectComposer(renderer, rt);
    this.pano = new PanoPass(this.cubeRT.texture);
    composer.addPass(this.pano);
    composer.addPass(new ShaderPass(SANITIZE));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), opts.bloom ?? 0.9, 0.55, opts.bloomThreshold ?? 0.62);
    if (q.get("bloom") !== "0") composer.addPass(this.bloom);
    composer.addPass(new OutputPass());
    this.grade = new ShaderPass(GRADE);
    this.grade.uniforms.uVignette.value = 0;            // a wall has no frame edge to darken toward
    this.grade.uniforms.uGrain.value = 0.02;
    composer.addPass(this.grade);
    this.composer = composer;

    this.clock = new THREE.Clock();
    this._tick = this._tick.bind(this);
    this.resize = this.resize.bind(this);
    addEventListener("resize", this.resize);
    this.resize();
    canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); this.running = false; if (this.onLost) this.onLost(); });
    canvas.addEventListener("webglcontextrestored", () => location.reload());
    this.perf = { acc: 0, n: 0, since: 0 };
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    if (w === this.w && h === this.h) return;
    this.w = w; this.h = h;
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    // bloom does not need the full width of a room; a third is indistinguishable
    this.bloom.resolution.set(Math.max(256, w / 3), Math.max(128, h / 3));
    this.pano.material.uniforms.uSize.value.set(w, h);
    // the cube face only needs to match a quarter of the room's circumference
    const want = Math.min(this.faceMax, Math.max(512, Math.ceil(w / 4 / 128) * 128));
    this.setFace(want);
    if (this.onResize) this.onResize(w, h);
  }

  setFace(n) {
    n = Math.round(Math.max(512, Math.min(this.faceMax, n)) / 64) * 64;
    if (n === this.face) return;
    this.face = n;
    this.cubeRT.setSize(n, n);
  }

  onFrame(fn) { this.frameHooks.push(fn); }

  start() {
    if (this.running) return;
    this.running = true;
    this.clock.getDelta();
    this.last = performance.now();
    requestAnimationFrame(this._tick);
  }
  stop() { this.running = false; }

  _tick(now) {
    if (!this.running) return;
    requestAnimationFrame(this._tick);
    if (this.fpsCap < 60 && now - this.last < 1000 / this.fpsCap - 2) return;
    this.last = now;
    const dt = this.stillAfter ? 0.05 : Math.min(0.05, this.clock.getDelta());
    if (this.stillAfter && ++this.frames > this.stillAfter) { this.running = false; document.documentElement.dataset.still = "1"; return; }
    this.time += dt;
    const t0 = performance.now();
    for (const fn of this.frameHooks) fn(dt, this.time);
    // the room's own slow turn, then ease toward where it should face. Both run on
    // the clock rather than the frame, so a slow frame never puts the floor out of step
    const rdt = this.stillAfter ? dt : Math.min(1, (now - (this._rt || now)) / 1000);
    this._rt = now;
    if (this.spin) this.yawT += this.spin * rdt;
    let d = this.yawT - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
    this.yaw += d * (1 - Math.exp(-1.6 * rdt));
    const u = this.pano.material.uniforms;
    u.uYaw.value = this.yaw; u.uFront.value = this.front; u.uHorizon.value = this.horizon;
    this.cubeCam.update(this.renderer, this.scene);
    this.grade.uniforms.uTime.value = this.time;
    this.composer.render(dt);
    this._collectEdge();
    if (now - this.edgeAt > 2500) { this.edgeAt = now; this._sampleEdge(); }
    this._adapt(performance.now() - t0, dt);
  }

  /**
   * Read the bottom rows of the wall, straight after they are drawn, and bin
   * them by world bearing. Keyed by bearing rather than column, the colours
   * stay put while the room turns, so the floor can turn them itself and only
   * needs them again when the light changes. The read goes into a pixel buffer
   * and is collected a few frames later, once the GPU has finished with it,
   * so the wall never waits on it.
   */
  _sampleEdge() {
    const gl = this.renderer.getContext(), w = this.w, rows = 2;
    if (!w || !gl.fenceSync || this._edgeFence) return;
    const size = w * rows * 4;
    if (!this._edgePBO || this._edgeSize !== size) {
      if (this._edgePBO) gl.deleteBuffer(this._edgePBO);
      this._edgePBO = gl.createBuffer(); this._edgeSize = size;
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, this._edgePBO);
      gl.bufferData(gl.PIXEL_PACK_BUFFER, size, gl.STREAM_READ);
    } else gl.bindBuffer(gl.PIXEL_PACK_BUFFER, this._edgePBO);
    this.renderer.setRenderTarget(null);
    gl.readPixels(0, 2, w, rows, gl.RGBA, gl.UNSIGNED_BYTE, 0);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    this._edgeFence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    this._edgeRead = { w, rows, yaw: this.yaw };
    gl.flush();
  }

  _collectEdge() {
    const gl = this.renderer.getContext(), f = this._edgeFence;
    if (!f) return;
    const st = gl.clientWaitSync(f, 0, 0);
    if (st !== gl.ALREADY_SIGNALED && st !== gl.CONDITION_SATISFIED) return;
    gl.deleteSync(f); this._edgeFence = null;
    const { w, rows, yaw } = this._edgeRead;
    const buf = this._edgeBuf && this._edgeBuf.length === this._edgeSize ? this._edgeBuf : (this._edgeBuf = new Uint8Array(this._edgeSize));
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, this._edgePBO);
    gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, buf);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    const N = this.edgeBins, acc = new Float32Array(N * 4);
    for (let x = 0; x < w; x++) {
      // the bearing of this column when it was drawn
      let th = (yaw - ((x + 0.5) / w - this.front) * TAU) / TAU; th -= Math.floor(th);
      const k = Math.min(N - 1, Math.floor(th * N)) * 4;
      for (let r = 0; r < rows; r++) {
        const i = (r * w + x) * 4;
        acc[k] += buf[i]; acc[k + 1] += buf[i + 1]; acc[k + 2] += buf[i + 2]; acc[k + 3]++;
      }
    }
    const prev = this.edge, out = [];
    for (let k = 0; k < N; k++) {
      const n = acc[k * 4 + 3];
      let c = n ? [acc[k * 4] / n, acc[k * 4 + 1] / n, acc[k * 4 + 2] / n] : prev ? prev[k] : [0, 0, 0];
      if (prev && n) c = c.map((v, j) => prev[k][j] * 0.4 + v * 0.6);
      out.push(c);
    }
    this.edge = out;
  }

  /** The edge colours as short hex strings, for the room's state. */
  edgeHex() {
    if (!this.edge) return null;
    return this.edge.map((c) => c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join(""));
  }

  /**
   * Hold the frame rate. The CPU-side time of a frame is a lower bound on
   * the GPU's, so it is a cautious signal: it only ever lowers the cube map
   * when frames are clearly late, and raises it again only after a long
   * stretch of headroom.
   */
  _adapt(ms, dt) {
    if (!this.adaptive || this.stillAfter) return;
    const p = this.perf;
    p.acc += dt; p.n++; p.since += dt;
    if (p.since < 2) return;
    const fps = p.n / p.acc;
    p.acc = 0; p.n = 0; p.since = 0;
    if (fps < Math.min(50, this.fpsCap - 8) && this.face > 768) this.setFace(this.face * 0.8);
    else if (fps > Math.min(58, this.fpsCap - 1) && this.face < this.faceMax) { p.good = (p.good || 0) + 1; if (p.good > 4) { p.good = 0; this.setFace(this.face * 1.15); } }
    this.fps = fps;
  }

  renderOnce() { for (const fn of this.frameHooks) fn(0, this.time); this.cubeCam.update(this.renderer, this.scene); this.composer.render(0); }

  /** Bearing of a canvas column, and back. */
  bearingAt(x) { return this.yaw - (x / this.w - this.front) * TAU; }
  columnOf(theta) {
    let u = this.front + (this.yaw - theta) / TAU;
    u -= Math.floor(u);
    return u * this.w;
  }

  /** Where a world point appears on the wall, in CSS pixels; null below the band. */
  project(v, out = {}) {
    const dx = v.x - this.eye.x, dy = v.y - this.eye.y, dz = v.z - this.eye.z;
    const th = Math.atan2(dx, dz), hd = Math.hypot(dx, dz);
    const R = this.w / TAU;
    const y = this.horizon * this.h + R * (dy / Math.max(1e-3, hd));
    out.x = this.columnOf(th);
    out.y = this.h - y;
    out.z = hd;
    return out;
  }

  /** A ray from the centre of the room through a point on the wall. */
  pick(x, y, objects) {
    const R = this.w / TAU;
    const th = this.bearingAt(x);
    const el = Math.atan(((this.h - y) - this.horizon * this.h) / R);
    const dir = new THREE.Vector3(Math.cos(el) * Math.sin(th), Math.sin(el), Math.cos(el) * Math.cos(th));
    const ray = new THREE.Raycaster(this.eye.clone(), dir, 1, 4000);
    return ray.intersectObjects(objects, true)[0] || null;
  }

  /** Turn the room so a bearing lands on the front wall. */
  turnTo(theta) { this.yawT = theta; }
}

// The Circle: the practice drawn as a monument on open downland.
//
// Five great trilithons stand in a horseshoe, one per client engagement. Each
// is a separate gateway with its own light, because each client is a separate
// tenant: they are not joined to one another. At the centre lies the altar
// stone, EY, and from it a thread of light runs out to every gateway - the
// one standard the practice brings to all of them. Around them the outer
// ring has fallen in places, as rings do. The five gateways have not.

import * as THREE from "three";
import { Stage, Rig, REDUCED, webglAvailable } from "./engine/core.js";
import { Land, TIMES } from "./engine/land.js";
import { stoneGeometry, stoneMaterial } from "./engine/stone.js";
import { rng } from "./engine/noise.js";

const DEG = Math.PI / 180;

/** The monument's axis: the horseshoe opens toward the midsummer sunrise. */
const AXIS_AZ = 38 * DEG;
const AXIS = new THREE.Vector3(Math.sin(AXIS_AZ), 0, Math.cos(AXIS_AZ));

/** Order round the horseshoe, from one horn to the other. */
const SLOTS = [
  { ang: -122, H: 6.0 }, { ang: -64, H: 6.5 }, { ang: 0, H: 7.4 }, { ang: 64, H: 6.5 }, { ang: 122, H: 6.0 },
];
const HORSE_R = 9.6;

function softSprite() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.35, "rgba(255,255,255,.45)"); g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function imageTexture(src) {
  if (!src) return null;
  const t = new THREE.TextureLoader().load(src);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Additive light: a portal in a doorway, a beam, a thread on the grass. */
function glowMaterial(color, kind) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uI: { value: 1 }, uTime: { value: 0 } },
    vertexShader: `varying vec2 vUv; varying vec3 vP; void main(){ vUv = uv; vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: `
      uniform vec3 uColor; uniform float uI, uTime; varying vec2 vUv; varying vec3 vP;
      void main(){
        float a = 0.0;
        ${kind === "portal" ? `
          float ex = min(vUv.x, 1. - vUv.x), ey = 1. - vUv.y;
          float edge = smoothstep(.07, .0, ex) + smoothstep(.04, .0, ey) * .9;
          float fill = (1. - vUv.y * .85) * .22 * (1. - smoothstep(.0, .5, abs(vUv.x - .5)) * .6);
          float shimmer = .85 + .15 * sin(vUv.y * 40. - uTime * 2.);
          a = (edge * 1.2 + fill * shimmer);` : ""}
        ${kind === "beam" ? `
          float r = abs(vUv.x - .5) * 2.;
          a = (1. - vUv.y) * (1. - vUv.y) * .5 * (.6 + .4 * sin(vUv.x * 60. + uTime * .6));
          a *= 1. - smoothstep(.0, 1., vUv.y);` : ""}
        ${kind === "pool" ? `
          float d = length(vUv - .5) * 2.;
          a = pow(max(0., 1. - d), 2.2) * .55 * (.9 + .1 * sin(uTime * 1.3));` : ""}
        ${kind === "thread" ? `
          float core = 1. - smoothstep(.0, .5, abs(vUv.y - .5));
          float pulse = pow(fract(vUv.x * 3. - uTime * .35), 10.) * 2.2;
          float fade = smoothstep(.0, .08, vUv.x) * smoothstep(1., .9, vUv.x);
          a = core * (.35 + pulse) * fade;` : ""}
        gl_FragColor = vec4(uColor * a * uI, 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
  });
}

/** The title sits on the left, so the hero looks past the ring's left shoulder. */
function heroHome() {
  const az = AXIS_AZ + Math.PI + 0.36;
  const right = new THREE.Vector3(Math.cos(az), 0, -Math.sin(az));
  const t = new THREE.Vector3(0, 5.8, 0).addScaledVector(right, -8.5);
  return { az, el: 0.12, dist: 56, target: t.toArray() };
}

class Circle {
  constructor(canvas, BIZ, opts = {}) {
    this.BIZ = BIZ;
    this.mode = opts.mode || "explore";           // "explore" | "hero"
    this.ICONS = opts.icons || window.ICONS || {};
    const stage = new Stage(canvas, { fov: this.mode === "hero" ? 30 : 36, bloom: this.mode === "hero" ? 0.35 : 0.5, bloomThreshold: 0.95, quality: opts.quality });
    this.stage = stage;
    this.quality = stage.quality;
    this.listeners = { hover: [], select: [], frame: [] };
    this.hoverId = null; this.selId = null;

    const clients = BIZ.city.clients;
    this.clients = clients;

    // clear grass from where the stones stand, so blades do not poke through
    const clearings = [[0, 0, 3.2]];
    this.land = new Land(stage, { quality: this.quality, clearings });
    this.stoneMat = stoneMaterial(this.quality);
    this.world = new THREE.Group();
    stage.scene.add(this.world);

    this.monuments = [];
    this._outerRing();
    this._bluestones();
    this._trilithons(clients);
    this._altar();
    this._heelStone();
    this._motes();
    this._journeyLayer();
    this.land.plant();

    this.setTime(opts.time || "golden");

    // camera
    this.HOME = this.mode === "hero"
      ? heroHome()
      : { az: AXIS_AZ + 1.62, el: 0.2, dist: 62, target: [0, 4.5, 0] };
    // a tall, narrow screen needs to stand further back to hold the whole ring
    const fit = () => { const a = stage.w / stage.h; return Math.max(1, Math.pow(1.25 / a, 0.85)); };
    this.baseDist = this.HOME.dist;
    this.HOME.dist = this.baseDist * fit();
    this.rig = new Rig(stage.camera, {
      ...this.HOME, minEl: 0.03, maxEl: 1.25, minDist: 12, maxDist: 190, bounds: 40, damp: this.mode === "hero" ? 1.2 : 2.6,
    });
    if (this.mode === "hero") {
      this.rig.drift = 0;
      this._heroSwing = 0;
    }

    stage.onResize = () => { this.HOME.dist = this.baseDist * fit(); };
    stage.onFrame((dt, t) => this._frame(dt, t));
    stage.start();
    if (REDUCED) stage.renderOnce();
  }

  on(ev, fn) { this.listeners[ev].push(fn); return this; }
  _emit(ev, a) { this.listeners[ev].forEach((f) => f(a)); }

  setTime(key) {
    const T = this.land.setTime(key);
    this.glow = T.glow;
    return T;
  }

  /* ------------------------------------------------------------ geometry */

  _stone(w, h, d, seed, pos, rotY, opts) {
    const m = new THREE.Mesh(stoneGeometry(w, h, d, seed, { res: this.quality === "low" ? 0.6 : 1, ...opts }), this.stoneMat);
    m.position.copy(pos);
    m.rotation.y = rotY;
    m.castShadow = true; m.receiveShadow = true;
    this.world.add(m);
    return m;
  }

  _outerRing() {
    const r = rng(101), N = 30, R = 15.8;
    // which uprights still stand: most of the north-east arc, gaps elsewhere
    const standing = [];
    for (let i = 0; i < N; i++) {
      const a = AXIS_AZ + (i / N) * Math.PI * 2;
      const rel = Math.abs(Math.atan2(Math.sin(a - AXIS_AZ), Math.cos(a - AXIS_AZ)));
      standing.push(rel < 1.4 ? r() > 0.06 : r() > 0.45);
    }
    const pos = new THREE.Vector3();
    for (let i = 0; i < N; i++) {
      const a = AXIS_AZ + (i / N) * Math.PI * 2 + Math.PI / N;
      pos.set(Math.sin(a) * R, 0, Math.cos(a) * R);
      if (standing[i]) {
        const s = this._stone(2.05, 4.1 + (r() - 0.5) * 0.3, 1.1, 200 + i, pos, a, { taper: 0.1 });
        s.rotation.z = (r() - 0.5) * 0.05; s.rotation.x = (r() - 0.5) * 0.04;
        this._clear(pos.x, pos.z, 1.5);
      } else if (r() > 0.4) {
        // a fallen stone lying beside its socket
        const f = this._stone(2.0, 3.9, 1.05, 300 + i, pos.clone().multiplyScalar(1 + r() * 0.12), a + (r() - 0.5) * 1.2, { taper: 0.1 });
        f.rotation.z = Math.PI / 2 * (r() > 0.5 ? 1 : -1); f.position.y = 0.45;
        f.rotateOnAxis(new THREE.Vector3(1, 0, 0), (r() - 0.5) * 0.3);
      }
    }
    // lintels between standing neighbours
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N;
      if (!standing[i] || !standing[j]) continue;
      const a = AXIS_AZ + ((i + 1) / N) * Math.PI * 2;
      const rel = Math.abs(Math.atan2(Math.sin(a - AXIS_AZ), Math.cos(a - AXIS_AZ)));
      if (rel > 1.1 && r() > 0.35) continue;
      pos.set(Math.sin(a) * R, 4.1, Math.cos(a) * R);
      const L = this._stone(3.45, 0.8, 1.0, 400 + i, pos, a + Math.PI / 2, { lintel: true, round: 0.2, rough: 0.05 });
      L.rotation.set(0, a + Math.PI / 2, 0);
    }
  }

  _bluestones() {
    const r = rng(501), N = 44, R = 12.2, pos = new THREE.Vector3();
    for (let i = 0; i < N; i++) {
      if (r() < 0.42) continue;
      const a = (i / N) * Math.PI * 2 + (r() - 0.5) * 0.05;
      const rel = Math.abs(Math.atan2(Math.sin(a - AXIS_AZ), Math.cos(a - AXIS_AZ)));
      if (rel < 0.12) continue;                            // keep the avenue open
      pos.set(Math.sin(a) * R, 0, Math.cos(a) * R);
      const h = 1.4 + r() * 0.9;
      const s = this._stone(0.75 + r() * 0.3, h, 0.5 + r() * 0.2, 600 + i, pos, a + (r() - 0.5) * 0.4, { taper: 0.25, rough: 0.05 });
      s.rotation.z = (r() - 0.5) * 0.18;
      if (r() > 0.85) { s.rotation.z = 1.35; s.position.y = 0.3; }
      this._clear(pos.x, pos.z, 0.7);
    }
  }

  _clear(x, z, rad) {
    // the meadow is sown after the stones are placed, so no blade grows through one
    this.land.clearings.push([x, z, rad]);
  }

  _trilithons(clients) {
    const back = AXIS.clone().negate();
    const up = new THREE.Vector3(0, 1, 0);
    clients.slice(0, SLOTS.length).forEach((c, i) => {
      const S = SLOTS[i];
      const dir = back.clone().applyAxisAngle(up, S.ang * DEG);
      const centre = dir.clone().multiplyScalar(HORSE_R);
      const face = Math.atan2(-dir.x, -dir.z);          // local +z looks at the centre
      const tangent = new THREE.Vector3(Math.cos(face), 0, -Math.sin(face));
      const g = new THREE.Group();
      g.position.copy(centre); g.rotation.y = face;
      this.world.add(g);
      const H = S.H, gap = 1.0, uw = 2.2, ud = 1.2;
      const offs = gap / 2 + uw / 2;
      const s0 = this._stone(uw, H, ud, 900 + i * 3, new THREE.Vector3(-offs, 0, 0), 0, { taper: 0.08, rough: 0.06 });
      const s1 = this._stone(uw, H * 0.985, ud, 901 + i * 3, new THREE.Vector3(offs, 0, 0), 0, { taper: 0.08, rough: 0.06 });
      const L = this._stone(uw * 2 + gap + 0.5, 1.0, ud * 1.02, 902 + i * 3, new THREE.Vector3(0, H - 0.08, 0), 0, { lintel: true, round: 0.24, rough: 0.05 });
      for (const m of [s0, s1, L]) { this.world.remove(m); g.add(m); }

      // the portal of light in the doorway, in the client's own colour
      const pg = new THREE.PlaneGeometry(gap - 0.06, H - 0.35);
      pg.translate(0, (H - 0.35) / 2 + 0.02, 0);
      const pm = glowMaterial(c.tone, "portal");
      const portal = new THREE.Mesh(pg, pm);
      portal.renderOrder = 2;
      g.add(portal);

      // a pool of the client's light on the grass at the foot of the gateway
      const pool = new THREE.Mesh(new THREE.CircleGeometry(4.2, 48), glowMaterial(c.tone, "pool"));
      pool.rotation.x = -Math.PI / 2; pool.position.set(0, 0.07, 0.6);
      pool.renderOrder = 1;
      g.add(pool);

      // a marker stone in front of the gateway carrying the client's mark
      const mk = new THREE.Group();
      mk.position.set(0, 0, 2.8);
      g.add(mk);
      const plinth = new THREE.Mesh(stoneGeometry(1.5, 0.75, 0.9, 950 + i, { taper: 0, rough: 0.03, round: 0.14 }), this.stoneMat);
      plinth.castShadow = plinth.receiveShadow = true;
      mk.add(plinth);
      const logo = c.logo && this.ICONS[c.logo];
      if (logo) {
        const plate = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 0.52),
          new THREE.MeshStandardMaterial({ map: imageTexture(logo), roughness: 0.55, metalness: 0.0, color: 0xf2efe8, envMapIntensity: 0.6, polygonOffset: true, polygonOffsetFactor: -2 }));
        plate.position.set(0, 0.8, 0.12);
        plate.rotation.x = -1.05;
        mk.add(plate);
        const back = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.6, 0.04), new THREE.MeshStandardMaterial({ color: 0x3a2a18, roughness: 0.35, metalness: 0.9 }));
        back.position.set(0, 0.79, 0.105); back.rotation.x = -1.05;
        back.castShadow = true;
        mk.add(back);
        plate.position.y += 0.012;
      }

      // a beam that stands over the gateway when it is chosen
      const bg = new THREE.CylinderGeometry(2.6, 3.6, 70, 40, 1, true);
      bg.translate(0, 35, 0);
      const bm = glowMaterial(c.tone, "beam");
      bm.uniforms.uI.value = 0;
      const beam = new THREE.Mesh(bg, bm);
      beam.renderOrder = 3;
      g.add(beam);

      // picking proxy: the whole gateway and its marker
      const proxy = new THREE.Mesh(new THREE.BoxGeometry(uw * 2 + gap + 0.9, H + 1.2, 5.2), new THREE.MeshBasicMaterial({ visible: false }));
      proxy.position.set(0, (H + 1.2) / 2 - 0.2, 1.1);
      proxy.userData.id = c.id;
      g.add(proxy);

      // the thread from the altar to the gateway
      const len = HORSE_R - 3.4;
      const tg = new THREE.PlaneGeometry(len, 0.34, 32, 1);
      tg.rotateX(-Math.PI / 2);
      const thread = new THREE.Mesh(tg, glowMaterial(0xffe600, "thread"));
      thread.position.copy(dir.clone().multiplyScalar(2.9 + len / 2)); thread.position.y = 0.06;
      thread.rotation.y = face + Math.PI / 2;
      thread.renderOrder = 1;
      this.world.add(thread);

      const top = H + 1;
      this.monuments.push({
        id: c.id, client: c, group: g, portal, pool, beam, proxy, thread, H, top, dir, tangent, centre,
        anchor: new THREE.Vector3(centre.x, H + 1.6, centre.z),
        hover: 0, sel: 0,
      });
      this._clear(centre.x, centre.z, 3.4);
    });
  }

  _altar() {
    const g = new THREE.Group();
    this.world.add(g);
    const face = AXIS_AZ + Math.PI / 2;
    const slab = this._stone(1.1, 4.8, 0.55, 1200, new THREE.Vector3(), 0, { taper: 0.02, round: 0.18, rough: 0.04 });
    this.world.remove(slab); g.add(slab);
    slab.rotation.set(0, 0, Math.PI / 2); slab.position.set(2.4, 0.5, 0);
    g.rotation.y = face;
    // the EY mark, the official asset on a dark bronze plate set into the stone
    const src = this.ICONS["ey-decal"] || this.ICONS["ey"];
    const plate = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.03, 0.62), new THREE.MeshStandardMaterial({ color: 0x1d1a14, roughness: 0.3, metalness: 0.85 }));
    plate.position.set(0, 1.12, 0);
    g.add(plate);
    if (src) {
      const mark = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.515), new THREE.MeshBasicMaterial({ map: imageTexture(src), transparent: true, toneMapped: false }));
      mark.rotation.x = -Math.PI / 2; mark.position.set(0, 1.14, 0);
      g.add(mark);
    }
    // a pool of EY Yellow light under the altar's lip
    const halo = new THREE.Mesh(new THREE.RingGeometry(2.6, 3.4, 64), glowMaterial(0xffe600, "thread"));
    halo.rotation.x = -Math.PI / 2; halo.position.y = 0.05;
    halo.material.uniforms.uI.value = 0.0;
    this.world.add(halo);
    const proxy = new THREE.Mesh(new THREE.BoxGeometry(5.4, 1.8, 1.8), new THREE.MeshBasicMaterial({ visible: false }));
    proxy.position.set(0, 0.8, 0); proxy.userData.id = "__ey";
    g.add(proxy);
    this.core = { group: g, proxy, halo, anchor: new THREE.Vector3(0, 2.6, 0), hover: 0, sel: 0 };
  }

  _heelStone() {
    const p = AXIS.clone().multiplyScalar(78);
    const s = this._stone(2.6, 4.9, 2.2, 1300, p, AXIS_AZ + 0.4, { taper: 0.3, rough: 0.09 });
    s.rotation.z = 0.12;
  }

  /** Pollen and dust drifting in the low light. */
  _motes() {
    const n = this.quality === "low" ? 240 : 900;
    const r = rng(7), pos = new Float32Array(n * 3), seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 34;
      pos[i * 3] = Math.cos(a) * d; pos[i * 3 + 1] = 0.2 + r() * 9; pos[i * 3 + 2] = Math.sin(a) * d;
      seed[i] = r() * 100;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("seed", new THREE.BufferAttribute(seed, 1));
    const m = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uMap: { value: softSprite() }, uColor: { value: new THREE.Color(0xffd9a0) }, uI: { value: 1 } },
      vertexShader: `attribute float seed; uniform float uTime; varying float vA;
        void main(){ vec3 p = position;
          p.x += sin(uTime * .21 + seed) * 1.4; p.y += sin(uTime * .37 + seed * 1.7) * .6; p.z += cos(uTime * .17 + seed) * 1.4;
          vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv;
          gl_PointSize = (18. + fract(seed) * 18.) / -mv.z;
          vA = (.35 + .65 * fract(seed * 7.1)) * smoothstep(60., 8., -mv.z); }`,
      fragmentShader: `uniform sampler2D uMap; uniform vec3 uColor; uniform float uI; varying float vA;
        void main(){ float a = texture2D(uMap, gl_PointCoord).a; gl_FragColor = vec4(uColor * a * vA * uI, 1.); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    });
    this.motes = new THREE.Points(g, m);
    this.motes.frustumCulled = false;
    this.stage.scene.add(this.motes);
  }

  /* ------------------------------------------------------------- journey */

  _journeyLayer() {
    this.jGroup = new THREE.Group();
    this.stage.scene.add(this.jGroup);
    this.jSprite = softSprite();
  }

  /** Points on a rising arc in front of a gateway, one per journey step. */
  journeyAnchors(id, n) {
    const M = this.monuments.find((m) => m.id === id);
    if (!M) return [];
    const out = [];
    const side = M.tangent, outward = M.dir.clone().negate();   // from gateway toward the centre
    for (let i = 0; i < n; i++) {
      const u = n === 1 ? 0.5 : i / (n - 1);
      const a = (u - 0.5) * 2.9;
      const p = M.centre.clone()
        .addScaledVector(side, Math.sin(a) * 10.5)
        .addScaledVector(outward, 2.0 + Math.cos(a) * 4.2);
      p.y = 1.4 + Math.sin(u * Math.PI) * 3.2 + u * 3.4;
      out.push(p);
    }
    return out;
  }

  setJourney(id, points, active, tone) {
    this.clearJourney();
    if (!points || !points.length) return;
    const col = new THREE.Color(tone || 0xffe600);
    const curve = new THREE.CatmullRomCurve3(points, false, "centripetal");
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 160, 0.035, 6, false),
      new THREE.MeshBasicMaterial({ color: col.clone().multiplyScalar(1.6), toneMapped: false, transparent: true, opacity: 0.8 }));
    this.jGroup.add(tube);
    this.jCurve = curve;
    this.jOrbs = points.map((p, i) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.jSprite, color: col.clone().multiplyScalar(i === active ? 3 : 1.4), blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
      s.position.copy(p); s.scale.setScalar(i === active ? 1.8 : 1.0);
      this.jGroup.add(s);
      return s;
    });
    this.jFlow = [0, 1, 2].map(() => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.jSprite, color: col.clone().multiplyScalar(3), blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
      s.scale.setScalar(0.55);
      this.jGroup.add(s);
      return s;
    });
    this.jActive = active;
    this.jCount = points.length;
  }

  setJourneyStep(active) {
    if (!this.jOrbs) return;
    this.jActive = active;
    this.jOrbs.forEach((s, i) => {
      const on = i === active, done = i < active;
      s.scale.setScalar(on ? 1.8 : done ? 1.15 : 0.85);
      s.material.opacity = on ? 1 : done ? 0.85 : 0.45;
    });
  }

  clearJourney() {
    this.jGroup.children.slice().forEach((c) => { this.jGroup.remove(c); c.geometry && c.geometry.dispose(); c.material && c.material.dispose(); });
    this.jOrbs = null; this.jFlow = null; this.jCurve = null;
  }

  /* --------------------------------------------------------------- camera */

  home(instant) {
    this.selId = null;
    this.rig.fly({ ...this.HOME }, instant);
  }

  /** Frame a gateway from inside the circle, slightly to one side, room for the panel. */
  focus(id, o = {}) {
    if (id === "__ey") return this.focusCore(o);
    const M = this.monuments.find((m) => m.id === id);
    if (!M) return;
    this.selId = id;
    const inward = M.dir.clone().negate();
    const az = Math.atan2(inward.x, inward.z) + (o.swing ?? 0.42);
    const t = M.centre.clone().addScaledVector(inward, o.forward ?? 1.2);
    t.y = o.y ?? M.H * 0.5;
    const dist = o.dist ?? 26;
    if (o.shiftPx) t.addScaledVector(new THREE.Vector3(Math.cos(az), 0, -Math.sin(az)), o.shiftPx * this._upp(dist));
    this.rig.fly({ az, el: o.el ?? 0.2, dist, target: t.toArray() });
  }

  focusCore(o = {}) {
    this.selId = "__ey";
    const t = new THREE.Vector3(0, 1.2, 0);
    const az = AXIS_AZ + Math.PI + 0.5;
    const dist = o.dist ?? 22;
    if (o.shiftPx) t.addScaledVector(new THREE.Vector3(Math.cos(az), 0, -Math.sin(az)), o.shiftPx * this._upp(dist));
    this.rig.fly({ az, el: 0.42, dist, target: t.toArray() });
  }

  /** World units per CSS pixel at a distance: for making room beside a panel. */
  _upp(dist) {
    const c = this.stage.camera;
    return (2 * dist * Math.tan(c.fov * DEG / 2)) / Math.max(1, this.stage.h);
  }

  /** Home, optionally leaving room for a panel on the right. */
  homeShift(px) {
    const H = this.HOME, t = new THREE.Vector3().fromArray(H.target);
    if (px) t.addScaledVector(new THREE.Vector3(Math.cos(H.az), 0, -Math.sin(H.az)), px * this._upp(H.dist));
    this.rig.fly({ az: H.az, el: H.el, dist: H.dist, target: t.toArray() });
  }

  pickAt(x, y) {
    const objs = this.monuments.map((m) => m.proxy).concat([this.core.proxy]);
    const hit = this.stage.pick(x, y, objs);
    return hit ? hit.object.userData.id : null;
  }

  project(v) { return this.stage.project(v); }

  labelPoints() {
    return this.monuments.map((m) => ({ id: m.id, p: m.anchor })).concat([{ id: "__ey", p: this.core.anchor }]);
  }

  setHover(id) { this.hoverId = id; }
  setSelected(id) { this.selId = id; }

  /* ---------------------------------------------------------------- frame */

  _frame(dt, t) {
    if (this.mode === "hero" && !REDUCED) {
      // a slow breath in and out along the avenue, as if on a crane
      this.rig.distT = this.HOME.dist + Math.sin(t * 0.07) * 4;
      this.rig.elT = this.HOME.el + Math.sin(t * 0.05) * 0.012;
      const sw = Math.sin(t * 0.03) * 0.16;
      this.rig.azT = this.HOME.az + sw;
    }
    this.rig.update(dt || 0.016);
    const glow = this.glow;
    const k = 1 - Math.exp(-6 * (dt || 0.016));
    for (const M of this.monuments) {
      M.hover += ((this.hoverId === M.id ? 1 : 0) - M.hover) * k;
      M.sel += ((this.selId === M.id ? 1 : 0) - M.sel) * k;
      const u = M.portal.material.uniforms;
      u.uTime.value = t;
      u.uI.value = (this.mode === "hero" ? 0.35 : 1) * (0.12 + glow * 0.5) * (1 + M.hover * 2 + M.sel * 2.5) * (this.selId && this.selId !== M.id ? 0.45 : 1);
      M.beam.material.uniforms.uI.value = M.sel * (0.55 + glow * 0.4);
      const pu = M.pool.material.uniforms;
      pu.uTime.value = t;
      pu.uI.value = (this.mode === "hero" ? 0.2 : 1) * (0.35 + glow * 0.7) * (1 + M.hover * 1.5 + M.sel * 2) * (this.selId && this.selId !== M.id ? 0.4 : 1);
      M.beam.material.uniforms.uTime.value = t;
      const th = M.thread.material.uniforms;
      th.uTime.value = t;
      th.uI.value = (this.mode === "hero" ? 0 : 1) * (0.25 + glow * 0.55) * (1 + M.sel * 1.5 + M.hover * 0.6);
    }
    const C = this.core;
    C.hover += ((this.hoverId === "__ey" ? 1 : 0) - C.hover) * k;
    C.sel += ((this.selId === "__ey" ? 1 : 0) - C.sel) * k;
    C.halo.material.uniforms.uI.value = (0.15 + glow * 0.3) * (C.hover * 1.2 + C.sel * 2 + 0.25);
    C.halo.material.uniforms.uTime.value = t;
    this.motes.material.uniforms.uTime.value = t;
    this.motes.material.uniforms.uI.value = 0.55 + glow * 0.25;

    if (this.jCurve && this.jFlow) {
      const n = this.jCount, a = Math.max(0, this.jActive - 1) / Math.max(1, n - 1), b = this.jActive / Math.max(1, n - 1);
      this.jFlow.forEach((s, i) => {
        const u = (t * 0.45 + i / 3) % 1;
        const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
        const f = this.jActive === 0 ? b * e : a + (b - a) * e;
        s.position.copy(this.jCurve.getPointAt(Math.min(1, Math.max(0, f))));
        s.material.opacity = Math.sin(u * Math.PI);
      });
      this.jOrbs.forEach((s, i) => { if (i === this.jActive) s.scale.setScalar(1.6 + Math.sin(t * 3) * 0.2); });
    }
    this._emit("frame", t);
  }
}

window.EYCIRCLE = {
  supported: webglAvailable,
  TIMES,
  mount(canvas, BIZ, opts) { return new Circle(canvas, BIZ, opts); },
};

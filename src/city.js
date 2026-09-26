// The City: the practice drawn as a digital city at night.
//
// A skyline stands on an island in a mirror-still sea under a field of stars.
// Five landmark towers are the five client engagements, each with its own
// form and its own light, because each client is a separate tenant: they are
// not joined to one another. At the centre stands EY, and from its foot a
// line of light runs out to every landmark - the one standard the practice
// brings to all of them. Around the island, a network of light is laid on the
// water; above it, traffic moves between the towers.

import * as THREE from "three";
import { Stage, Rig, REDUCED, webglAvailable } from "./engine/core.js";
import { Night, TIMES, waterMaterial } from "./engine/night.js";
import { rng } from "./engine/noise.js";

const DEG = Math.PI / 180;
const ISLAND = 86;

/** The generic skyline's facade tints: cool glass, a few warm towers. */
const TINTS = [0x2fd0ff, 0x3a7bff, 0x27e0c4, 0x7a6bff, 0x49a8ff, 0xffb45e];

function softSprite() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.3, "rgba(255,255,255,.5)"); g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * Dark glass with lit windows. The windows are computed in the shader from
 * world position, so every tower of any size gets a floor-true grid without
 * a texture, and each floor lights on its own. Instanced towers take their
 * tint from the instance colour; landmarks from a uniform.
 */
function facadeMaterial({ tint = 0x3fb8ff, instanced = false } = {}) {
  const U = {
    uTime: { value: 0 }, uLit: { value: 0.46 }, uFacade: { value: 1 }, uBoost: { value: 0 },
    uTint: { value: new THREE.Color(tint) }, uWarm: { value: new THREE.Color(0xffc98a) }, uCool: { value: new THREE.Color(0xbfe6ff) },
  };
  const mat = new THREE.MeshStandardMaterial({ color: 0x0a1422, metalness: 0.75, roughness: 0.22, envMapIntensity: 1.2, vertexColors: false });
  mat.userData.U = U;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vFWP; varying vec3 vFWN; varying vec3 vSeed; varying vec3 vITint;")
      .replace("#include <project_vertex>", `#include <project_vertex>
        vec4 fwp = vec4(transformed, 1.0);
        vec3 fn = objectNormal;
        #ifdef USE_INSTANCING
          fwp = instanceMatrix * fwp; fn = mat3(instanceMatrix) * fn;
          vSeed = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
        #else
          vSeed = vec3(modelMatrix[3][0], 0., modelMatrix[3][2]);
        #endif
        #ifdef USE_INSTANCING_COLOR
          vITint = instanceColor;
        #else
          vITint = vec3(-1.);
        #endif
        fwp = modelMatrix * fwp; vFWP = fwp.xyz;
        vFWN = normalize(mat3(modelMatrix) * fn);`);
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>
        uniform float uTime, uLit, uFacade, uBoost; uniform vec3 uTint, uWarm, uCool;
        varying vec3 vFWP; varying vec3 vFWN; varying vec3 vSeed; varying vec3 vITint;
        float fh(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }`)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
        {
          vec3 n = normalize(vFWN);
          vec3 tint = vITint.x < 0. ? uTint : vITint;
          float y = abs(vFWP.y);
          float side = 1. - smoothstep(.45, .7, abs(n.y));
          float u = abs(n.x) > abs(n.z) ? vFWP.z : vFWP.x;
          vec2 cell = vec2(u / 1.35, y / 2.1);
          vec2 id = floor(cell), f = fract(cell);
          float win = step(.12, f.x) * step(f.x, .88) * step(.2, f.y) * step(f.y, .84);
          float r = fh(id + vSeed.xz * .173);
          float lit = step(1. - uLit, r);
          float tw = .85 + .15 * sin(uTime * (.3 + r * 2.) + r * 40.);
          vec3 wc = mix(uWarm, mix(uCool, tint, .5), step(.28, fh(id.yx + vSeed.zx)));
          totalEmissiveRadiance += side * win * lit * wc * tw * (1.15 + uBoost * .25);
          // the facade glows faintly in its own colour, stronger toward the base and the crown
          float grad = .35 + .65 * (smoothstep(0., 30., y) * (1. - smoothstep(30., 160., y)) * .4 + .6);
          totalEmissiveRadiance += side * tint * (.13 + uBoost * .08) * grad * uFacade;
          // a vertical sheen, brighter near the building's edges, like curtain glass catching the city
          totalEmissiveRadiance += side * tint * .08 * pow(abs(fract(u / 9.) - .5) * 2., 6.) * uFacade;
          // bands of light every so many floors, the way a modern tower is lit
          float band = step(.93, fract(y / 26.)) * step(fh(vSeed.xz), .55);
          totalEmissiveRadiance += side * band * tint * 1.4 * uFacade;
        }`);
  };
  mat.customProgramCacheKey = () => "facade-v1" + (instanced ? "i" : "");
  return mat;
}

/** Additive light: beams, pools, and the lines of the network. */
function glowMaterial(color, kind) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uI: { value: 1 }, uTime: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: `
      uniform vec3 uColor; uniform float uI, uTime; varying vec2 vUv;
      void main(){
        float a = 0.0;
        ${kind === "beam" ? `a = pow(1. - vUv.y, 1.6) * .55 * (.75 + .25 * sin(vUv.x * 50. + uTime * .8));` : ""}
        ${kind === "pool" ? `float d = length(vUv - .5) * 2.; a = pow(max(0., 1. - d), 2.) * .7 + smoothstep(.04, .0, abs(d - .82)) * .9;` : ""}
        ${kind === "line" ? `
          float core = 1. - smoothstep(.0, .5, abs(vUv.y - .5));
          float pulse = pow(fract(vUv.x * 2. - uTime * .3), 12.) * 2.5;
          a = core * (.45 + pulse);` : ""}
        gl_FragColor = vec4(uColor * a * uI, 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
  });
}

/** An emissive colour that blooms: toneMapped off and pushed past 1. */
function neon(color, k = 2.2) {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), toneMapped: false });
}

/* ------------------------------------------------------------ landmarks */

/** Each client's tower has its own silhouette. Returns { group, H, crownY }. */
const FORMS = {
  // a slab with an aperture cut through its crown
  aperture(mat, tone) {
    const H = 118, W = 17, D = 11;
    const s = new THREE.Shape();
    s.moveTo(-W / 2, 0); s.lineTo(W / 2, 0); s.lineTo(W / 2 * 0.72, H); s.lineTo(-W / 2 * 0.72, H); s.closePath();
    const hole = new THREE.Path();
    hole.moveTo(-4.2, H - 22); hole.lineTo(4.2, H - 22); hole.lineTo(3.4, H - 8); hole.lineTo(-3.4, H - 8); hole.closePath();
    s.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(s, { depth: D, bevelEnabled: false });
    g.translate(0, 0, -D / 2);
    const grp = new THREE.Group();
    grp.add(new THREE.Mesh(g, mat));
    const ring = new THREE.Mesh(new THREE.BoxGeometry(9, 0.6, D + 0.4), neon(tone, 2.6));
    ring.position.y = H - 22.3; grp.add(ring);
    const ring2 = ring.clone(); ring2.position.y = H - 7.7; ring2.scale.x = 0.8; grp.add(ring2);
    return { group: grp, H, crown: [ring, ring2] };
  },
  // a glass tower that twists as it rises
  twist(mat, tone) {
    const H = 132, W = 15;
    const g = new THREE.BoxGeometry(W, H, W, 1, 60, 1);
    g.translate(0, H / 2, 0);
    const p = g.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const t = v.y / H, k = 1 - 0.38 * t, a = t * 1.35;
      const x = v.x * k, z = v.z * k;
      p.setXYZ(i, x * Math.cos(a) - z * Math.sin(a), v.y, x * Math.sin(a) + z * Math.cos(a));
    }
    g.computeVertexNormals();
    const grp = new THREE.Group();
    grp.add(new THREE.Mesh(g, mat));
    const crown = new THREE.Mesh(new THREE.TorusGeometry(5.2, 0.35, 8, 40), neon(tone, 2.6));
    crown.rotation.x = Math.PI / 2; crown.position.y = H + 0.5; grp.add(crown);
    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.6, 18, 8), neon(0xffffff, 1.2));
    spire.position.y = H + 9; grp.add(spire);
    return { group: grp, H: H + 18, crown: [crown] };
  },
  // a column carrying two lit spheres and a mast: the observatory
  spheres(mat, tone) {
    const H = 104;
    const grp = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.6, H, 16), mat);
    shaft.position.y = H / 2; grp.add(shaft);
    for (const a of [0, 2.09, 4.19]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.6, 36, 8), mat);
      leg.position.set(Math.cos(a) * 6, 16, Math.sin(a) * 6);
      leg.rotation.set(Math.sin(a) * 0.28, 0, -Math.cos(a) * 0.28);
      grp.add(leg);
    }
    const glass = new THREE.MeshStandardMaterial({ color: 0x0b1830, metalness: 0.4, roughness: 0.15, emissive: new THREE.Color(tone), emissiveIntensity: 0.9, envMapIntensity: 1.4 });
    const s1 = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 20), glass); s1.position.y = 36; grp.add(s1);
    const s2 = new THREE.Mesh(new THREE.SphereGeometry(6.5, 32, 20), glass); s2.position.y = 78; grp.add(s2);
    const r1 = new THREE.Mesh(new THREE.TorusGeometry(10.4, 0.3, 8, 48), neon(tone, 2.4)); r1.rotation.x = Math.PI / 2; r1.position.y = 36; grp.add(r1);
    const r2 = new THREE.Mesh(new THREE.TorusGeometry(6.8, 0.25, 8, 48), neon(tone, 2.4)); r2.rotation.x = Math.PI / 2; r2.position.y = 78; grp.add(r2);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 1.2, 26, 8), neon(0xffffff, 1.1)); mast.position.y = H + 13; grp.add(mast);
    return { group: grp, H: H + 26, crown: [r1, r2], glass };
  },
  // three stepped volumes, setting back as they rise
  stepped(mat, tone) {
    const grp = new THREE.Group();
    const parts = [[20, 46, 16], [15, 38, 12], [10, 30, 8]];
    let y = 0;
    const crown = [];
    parts.forEach(([w, h, d], i) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.y = y + h / 2; grp.add(m);
      const edge = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.5, d + 0.3), neon(tone, 2.4));
      edge.position.y = y + h; grp.add(edge); crown.push(edge);
      y += h;
    });
    return { group: grp, H: y, crown };
  },
  // a tapering triangular prism with lit fins: current rising
  prism(mat, tone) {
    const H = 112;
    const grp = new THREE.Group();
    const g = new THREE.CylinderGeometry(4.5, 11, H, 3, 24);
    g.translate(0, H / 2, 0);
    grp.add(new THREE.Mesh(g, mat));
    const crown = [];
    for (let k = 0; k < 3; k++) {
      const a = k / 3 * Math.PI * 2;
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.5, H * 0.96, 0.5), neon(tone, 2.4));
      fin.position.set(Math.sin(a) * 7.6, H * 0.49, Math.cos(a) * 7.6);
      fin.rotation.set(Math.cos(a) * -0.058, 0, Math.sin(a) * 0.058);
      grp.add(fin); crown.push(fin);
    }
    const tip = new THREE.Mesh(new THREE.ConeGeometry(4.6, 8, 3), neon(tone, 1.6)); tip.position.y = H + 4; grp.add(tip);
    return { group: grp, H: H + 8, crown };
  },
};
const FORM_ORDER = ["aperture", "twist", "spheres", "stepped", "prism"];
const FORM_BY_KIND = { courthouse: "aperture", hospital: "twist", observatory: "spheres", plant: "stepped", powerstation: "prism" };

class City {
  constructor(canvas, BIZ, opts = {}) {
    this.BIZ = BIZ;
    this.mode = opts.mode || "explore";
    const stage = new Stage(canvas, { fov: this.mode === "hero" ? 30 : 36, bloom: 0.95, bloomThreshold: 0.62, quality: opts.quality, lowBloom: true });
    this.stage = stage;
    this.quality = stage.quality;
    stage.renderer.shadowMap.enabled = false;
    this.listeners = { hover: [], select: [], frame: [] };
    this.hoverId = null; this.selId = null;
    this.clients = BIZ.city.clients;
    this.mats = [];

    this.night = new Night(stage, { quality: this.quality });
    this.city = new THREE.Group();          // everything that stands, and is reflected
    stage.scene.add(this.city);

    this.monuments = [];
    this._island();
    this._landmarks(this.clients);
    this._hub();
    this._skyline();
    this._horizon();

    // the reflection: the city again, upside down, seen through the water
    this.mirror = this.city.clone(true);
    this.mirror.scale.y = -1;
    this.mirror.traverse((o) => { if (o.userData.pick) o.visible = false; });
    stage.scene.add(this.mirror);

    this._water();
    this._network();
    this._traffic();
    this._journeyLayer();

    this.setTime(opts.time || "night");

    const fit = () => { const a = stage.w / stage.h; return Math.max(1, Math.pow(1.3 / a, 0.9)); };
    this.HOME = this.mode === "hero" ? heroHome() : { az: 0.42, el: 0.24, dist: 490, target: [0, 66, 0] };
    this.baseDist = this.HOME.dist;
    this.HOME.dist = this.baseDist * fit();
    this.rig = new Rig(stage.camera, {
      ...this.HOME, minEl: 0.02, maxEl: 1.2, minDist: 30, maxDist: 760, bounds: 140, damp: this.mode === "hero" ? 1.1 : 2.4,
    });
    stage.onResize = () => { this.HOME.dist = this.baseDist * fit(); };
    stage.onFrame((dt, t) => this._frame(dt, t));
    stage.start();
    if (REDUCED) stage.renderOnce();
  }

  on(ev, fn) { this.listeners[ev].push(fn); return this; }
  _emit(ev, a) { this.listeners[ev].forEach((f) => f(a)); }

  setTime(key) {
    const T = this.night.setTime(key);
    this.T = T;
    this.glow = key === "night" ? 1 : key === "blue" ? 0.8 : 0.6;
    for (const m of this.mats) { m.userData.U.uLit.value = T.lit; m.userData.U.uFacade.value = T.facade; }
    if (this.water) this.water.material.uniforms.uColor.value.set(T.water);
    return T;
  }

  /* ------------------------------------------------------------ island */

  _island() {
    const g = new THREE.CylinderGeometry(ISLAND, ISLAND + 1.5, 1.4, 96, 1);
    g.translate(0, 0.2, 0);
    const deck = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x0b111c, metalness: 0.5, roughness: 0.5, envMapIntensity: 0.8 }));
    this.city.add(deck);
    // the waterfront: a warm line of lamps, the brightest thing at the water's edge
    const shore = new THREE.Mesh(new THREE.TorusGeometry(ISLAND + 0.6, 0.35, 6, 160), neon(0xffc37a, 2.2));
    shore.rotation.x = Math.PI / 2; shore.position.y = 0.9;
    this.city.add(shore);
    const shore2 = new THREE.Mesh(new THREE.TorusGeometry(ISLAND - 4, 0.18, 6, 160), neon(0x5fd6ff, 1.6));
    shore2.rotation.x = Math.PI / 2; shore2.position.y = 0.95;
    this.city.add(shore2);
    // lamp posts along the promenade
    const n = this.quality === "low" ? 60 : 120;
    const lamps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.45, 8, 6), neon(0xffd29a, 2.4), n);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; m4.makeTranslation(Math.cos(a) * (ISLAND - 1.5), 2.6, Math.sin(a) * (ISLAND - 1.5)); lamps.setMatrixAt(i, m4); }
    this.city.add(lamps);
  }

  /**
   * Where the five landmarks stand: round the hub, but never directly in
   * front of it or behind it from the home view, so every one reads.
   */
  _slot(i) {
    const rel = [32, 98, 152, -148, -96][i % 5] * DEG;
    const a = 0.42 + rel, r = [44, 52, 48, 50, 46][i % 5];
    return new THREE.Vector3(Math.sin(a) * r, 0.9, Math.cos(a) * r);
  }

  _landmarks(clients) {
    clients.slice(0, 5).forEach((c, i) => {
      const pos = this._slot(i);
      const mat = facadeMaterial({ tint: c.tone });
      this.mats.push(mat);
      const form = FORMS[FORM_BY_KIND[c.kind] || FORM_ORDER[i]](mat, c.tone);
      const g = form.group;
      g.position.copy(pos);
      g.rotation.y = Math.atan2(pos.x, pos.z);
      this.city.add(g);
      // a plaza of light at its foot
      const pool = new THREE.Mesh(new THREE.CircleGeometry(15, 48), glowMaterial(c.tone, "pool"));
      pool.rotation.x = -Math.PI / 2; pool.position.set(pos.x, 1.0, pos.z); pool.renderOrder = 2;
      this.city.add(pool);
      // a beam to the sky when chosen
      const bg = new THREE.CylinderGeometry(7, 11, 520, 32, 1, true); bg.translate(0, 260, 0);
      const bm = glowMaterial(c.tone, "beam"); bm.uniforms.uI.value = 0;
      const beam = new THREE.Mesh(bg, bm); beam.position.copy(pos); beam.renderOrder = 3; beam.userData.pick = true;
      this.city.add(beam);
      // picking proxy
      const proxy = new THREE.Mesh(new THREE.CylinderGeometry(13, 13, form.H + 6, 12), new THREE.MeshBasicMaterial({ visible: false }));
      proxy.position.set(pos.x, (form.H + 6) / 2, pos.z); proxy.userData.id = c.id; proxy.userData.pick = true;
      this.city.add(proxy);
      const dir = new THREE.Vector3(pos.x, 0, pos.z).normalize();
      this.monuments.push({
        id: c.id, client: c, group: g, mat, crown: form.crown, glass: form.glass, pool, beam, proxy,
        pos, dir, H: form.H, anchor: new THREE.Vector3(pos.x, form.H + 10, pos.z), hover: 0, sel: 0,
      });
    });
  }

  /** EY at the centre: the tallest tower, crowned in EY Yellow, threaded to every landmark. */
  _hub() {
    const H = 156;
    const mat = facadeMaterial({ tint: 0xffe600 });
    this.mats.push(mat);
    const g = new THREE.Group();
    this.city.add(g);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(9.5, 12.5, H, 4, 1), mat);
    body.rotation.y = Math.PI / 4; body.position.y = H / 2 + 0.9;
    g.add(body);
    const crown = [];
    for (let k = 0; k < 4; k++) {
      const a = Math.PI / 4 + k / 4 * Math.PI * 2;
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.4, H, 0.4), neon(0xffe600, 1.3));
      const rTop = 9.5, rBot = 12.5;
      edge.position.set(Math.sin(a) * (rTop + rBot) / 2, H / 2 + 0.9, Math.cos(a) * (rTop + rBot) / 2);
      edge.rotation.set(Math.cos(a) * -0.0195, 0, Math.sin(a) * 0.0195);
      g.add(edge); crown.push(edge);
    }
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(7, 9.5, 8, 4, 1), neon(0xffe600, 1.4));
    cap.rotation.y = Math.PI / 4; cap.position.y = H + 4.9; g.add(cap); crown.push(cap);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 1.2, 30, 8), neon(0xffffff, 1.2));
    mast.position.y = H + 24; g.add(mast);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(1.1, 12, 8), neon(0xff4136, 3));
    beacon.position.y = H + 39.5; g.add(beacon);
    this.beacon = beacon;
    const pool = new THREE.Mesh(new THREE.CircleGeometry(20, 48), glowMaterial(0xffe600, "pool"));
    pool.rotation.x = -Math.PI / 2; pool.position.y = 1.0; pool.renderOrder = 2;
    this.city.add(pool);
    const proxy = new THREE.Mesh(new THREE.CylinderGeometry(14, 14, H + 10, 8), new THREE.MeshBasicMaterial({ visible: false }));
    proxy.position.y = (H + 10) / 2; proxy.userData.id = "__ey"; proxy.userData.pick = true;
    this.city.add(proxy);
    // the lines from EY to every landmark, run along the ground
    this.spokes = this.monuments.map((M) => {
      const len = M.pos.length() - 20 - 13;
      const sg = new THREE.PlaneGeometry(len, 1.6, 24, 1);
      sg.rotateX(-Math.PI / 2);
      const s = new THREE.Mesh(sg, glowMaterial(0xffe600, "line"));
      const mid = M.dir.clone().multiplyScalar(20 + len / 2);
      s.position.set(mid.x, 1.05, mid.z);
      s.rotation.y = Math.atan2(-M.dir.z, M.dir.x);
      s.renderOrder = 2;
      this.city.add(s);
      M.spoke = s;
      return s;
    });
    this.core = { group: g, mat, crown, pool, proxy, anchor: new THREE.Vector3(0, H + 14, 0), H, hover: 0, sel: 0 };
  }

  /** The rest of the skyline, instanced: towers rise toward the middle of the island. */
  _skyline() {
    const r = rng(2026);
    const boxes = [], octs = [], spires = [];
    const keep = this.monuments.map((m) => m.pos).concat([new THREE.Vector3()]);
    const step = 9.6;
    for (let gx = -ISLAND; gx <= ISLAND; gx += step) {
      for (let gz = -ISLAND; gz <= ISLAND; gz += step) {
        const x = gx + (r() - 0.5) * 2.5, z = gz + (r() - 0.5) * 2.5, d = Math.hypot(x, z);
        if (d > ISLAND - 6) continue;
        let near = false;
        for (let k = 0; k < keep.length; k++) { if (Math.hypot(x - keep[k].x, z - keep[k].z) < (k === keep.length - 1 ? 22 : 15)) { near = true; break; } }
        if (near) continue;
        if (r() < 0.12) continue;                    // a square, a street
        const peak = Math.exp(-Math.pow(d / 46, 2));
        const h = 9 + 95 * peak * Math.pow(r(), 1.05) + r() * 16 * (0.4 + peak);
        const w = 6 + r() * 4.5, dd = 6 + r() * 4.5;
        const tint = d > ISLAND - 16 && r() < 0.28 ? 0xffb45e : TINTS[Math.floor(r() * (TINTS.length - 1))];
        const rec = { x, z, h, w, d: dd, tint, rot: (r() - 0.5) * 0.3 };
        const t = r();
        if (t < 0.2 && h > 30) octs.push(rec); else boxes.push(rec);
        // a setback crown on the taller blocks
        if (t >= 0.2 && h > 38 && r() < 0.45) boxes.push({ ...rec, y: rec.h, h: rec.h * (0.18 + r() * 0.2), w: rec.w * 0.66, d: rec.d * 0.66 });
        if (h > 55 && r() < 0.35) spires.push(rec);
      }
    }
    const mk = (geo, list, fn) => {
      const mat = facadeMaterial({ instanced: true });
      this.mats.push(mat);
      const mesh = new THREE.InstancedMesh(geo, mat, list.length);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color();
      list.forEach((b, i) => {
        fn(b, p, s);
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), b.rot);
        m4.compose(p, q, s);
        mesh.setMatrixAt(i, m4);
        mesh.setColorAt(i, c.set(b.tint));
      });
      this.city.add(mesh);
      return mesh;
    };
    const box = new THREE.BoxGeometry(1, 1, 1); box.translate(0, 0.5, 0);
    mk(box, boxes, (b, p, s) => { p.set(b.x, 0.9 + (b.y || 0), b.z); s.set(b.w, b.h, b.d); });
    const oct = new THREE.CylinderGeometry(0.5, 0.5, 1, 8); oct.translate(0, 0.5, 0);
    mk(oct, octs, (b, p, s) => { p.set(b.x, 0.9, b.z); s.set(b.w * 1.2, b.h, b.w * 1.2); });
    // spires and red beacons on the tallest roofs
    const sp = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.35, 1, 6), neon(0xcfe8ff, 1), spires.length);
    const bc = new THREE.InstancedMesh(new THREE.SphereGeometry(0.45, 8, 6), neon(0xff4136, 3), spires.length);
    const m4 = new THREE.Matrix4();
    spires.forEach((b, i) => {
      const L = 6 + (b.h % 7) * 1.4;
      m4.compose(new THREE.Vector3(b.x, 0.9 + b.h + L / 2, b.z), new THREE.Quaternion(), new THREE.Vector3(1, L, 1));
      sp.setMatrixAt(i, m4);
      m4.makeTranslation(b.x, 0.9 + b.h + L, b.z);
      bc.setMatrixAt(i, m4);
    });
    this.city.add(sp, bc);
    this.beacons = bc;
  }

  /** Far shores: other cities low on the horizon, mostly lost in the haze. */
  _horizon() {
    const r = rng(77), n = this.quality === "low" ? 160 : 360;
    const mat = facadeMaterial({ instanced: true });
    mat.userData.U.uFacade.value = 0.4;
    this.mats.push(mat);
    const box = new THREE.BoxGeometry(1, 1, 1); box.translate(0, 0.5, 0);
    const mesh = new THREE.InstancedMesh(box, mat, n);
    const m4 = new THREE.Matrix4(), c = new THREE.Color();
    const arcs = [[-2.6, -1.6, 1700], [-0.9, 0.2, 2100], [1.3, 2.2, 1900], [2.8, 3.5, 1600]];
    for (let i = 0; i < n; i++) {
      const A = arcs[i % arcs.length];
      const a = A[0] + r() * (A[1] - A[0]), d = A[2] + (r() - 0.5) * 120;
      const h = 4 + Math.pow(r(), 2.4) * 34;
      m4.compose(new THREE.Vector3(Math.sin(a) * d, 0, Math.cos(a) * d), new THREE.Quaternion(), new THREE.Vector3(8 + r() * 10, h, 8 + r() * 10));
      mesh.setMatrixAt(i, m4);
      mesh.setColorAt(i, c.set(TINTS[Math.floor(r() * TINTS.length)]));
    }
    this.city.add(mesh);
  }

  _water() {
    const m = waterMaterial();
    const w = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000), m);
    w.rotation.x = -Math.PI / 2;
    w.position.y = 0;
    w.renderOrder = 1;
    this.stage.scene.add(w);
    this.water = w;
  }

  /** The network laid on the water: nodes of light round the island, joined to their neighbours. */
  _network() {
    const r = rng(404);
    const nodes = [];
    const cols = [0x6fe3ff, 0x9d7bff, 0xff6bd5, 0x5fa8ff, 0xffffff];
    const count = this.quality === "low" ? 26 : 38;
    for (let i = 0; i < count; i++) {
      const a = r() * Math.PI * 2, d = ISLAND + 18 + Math.pow(r(), 0.8) * 190;
      nodes.push({ p: new THREE.Vector3(Math.sin(a) * d * 1.25, 0.3, Math.cos(a) * d), c: cols[Math.floor(r() * cols.length)] });
    }
    // join each node to its nearest two or three, once
    const edges = new Set(), segs = [];
    nodes.forEach((n, i) => {
      const near = nodes.map((m, j) => [j, m.p.distanceTo(n.p)]).filter((x) => x[0] !== i).sort((a, b) => a[1] - b[1]).slice(0, 2 + (i % 2));
      near.forEach(([j]) => { const k = i < j ? i + "-" + j : j + "-" + i; if (!edges.has(k)) { edges.add(k); segs.push([i, j]); } });
    });
    const group = new THREE.Group();
    this.stage.scene.add(group);
    const pos = [], col = [], uvx = [];
    const c0 = new THREE.Color(), c1 = new THREE.Color();
    segs.forEach(([i, j]) => {
      const A = nodes[i].p, B = nodes[j].p;
      c0.set(nodes[i].c); c1.set(nodes[j].c);
      // a thin flat ribbon
      const dir = B.clone().sub(A), len = dir.length(); dir.normalize();
      const side = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(0.7);
      const v = [A.clone().add(side), A.clone().sub(side), B.clone().add(side), B.clone().sub(side)];
      [[0, 1, 2], [1, 3, 2]].forEach((tri) => tri.forEach((k) => {
        pos.push(v[k].x, v[k].y, v[k].z);
        const cc = k < 2 ? c0 : c1; col.push(cc.r, cc.g, cc.b);
        uvx.push(k < 2 ? 0 : len / 60, k % 2);
      }));
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uvx, 2));
    const lm = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uI: { value: 1 } },
      vertexShader: `attribute vec3 color; varying vec3 vC; varying vec2 vUv; void main(){ vC = color; vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
      fragmentShader: `uniform float uTime, uI; varying vec3 vC; varying vec2 vUv;
        void main(){ float core = 1. - abs(vUv.y - .5) * 2.; float p = pow(fract(vUv.x * 2.5 - uTime * .4), 16.) * 2.;
          gl_FragColor = vec4(vC * (core * .9 + p) * uI, 1.); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
    });
    const lines = new THREE.Mesh(g, lm);
    lines.renderOrder = 4;
    group.add(lines);
    const sprite = softSprite();
    nodes.forEach((n) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: sprite, color: new THREE.Color(n.c).multiplyScalar(2.6), blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
      s.position.copy(n.p).setY(1.2); s.scale.setScalar(4.2);
      s.renderOrder = 5;
      group.add(s);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: sprite, color: new THREE.Color(n.c).multiplyScalar(0.35), blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
      glow.position.copy(n.p).setY(0.4); glow.scale.set(16, 16, 1);
      glow.renderOrder = 5;
      group.add(glow);
    });
    this.net = { group, lines };
  }

  /** Air traffic: small lights on loops between the towers. */
  _traffic() {
    const n = this.quality === "low" ? 60 : 160;
    const r = rng(8), a = new Float32Array(n * 4);
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 4] = 20 + r() * 70; a[i * 4 + 1] = 18 + r() * 90; a[i * 4 + 2] = (r() < 0.5 ? -1 : 1) * (0.05 + r() * 0.12); a[i * 4 + 3] = r() * 6.28; }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("orbit", new THREE.BufferAttribute(a, 4));
    const m = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uMap: { value: softSprite() } },
      vertexShader: `attribute vec4 orbit; uniform float uTime; varying float vW;
        void main(){ float ang = orbit.w + uTime * orbit.z; float rr = orbit.x;
          vec3 p = vec3(sin(ang) * rr * 1.2, orbit.y + sin(uTime * .3 + orbit.w) * 3., cos(ang) * rr);
          vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv;
          gl_PointSize = clamp(900. / -mv.z, 1.5, 7.); vW = fract(orbit.w * 3.1); }`,
      fragmentShader: `uniform sampler2D uMap; varying float vW;
        void main(){ float a = texture2D(uMap, gl_PointCoord).a; vec3 c = vW < .7 ? vec3(1., .92, .8) : vec3(1., .3, .25);
          gl_FragColor = vec4(c * a * 2.2, 1.); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    });
    this.traffic = new THREE.Points(g, m);
    this.traffic.frustumCulled = false;
    this.stage.scene.add(this.traffic);
  }

  /* ------------------------------------------------------------ journey */

  _journeyLayer() {
    this.jGroup = new THREE.Group();
    this.stage.scene.add(this.jGroup);
    this.jSprite = softSprite();
  }

  /** Points spiralling up round the viewer's side of a landmark, one per journey step. */
  journeyAnchors(id, n) {
    const M = this.monuments.find((m) => m.id === id);
    if (!M) return [];
    const face = Math.atan2(M.dir.x, M.dir.z);
    const out = [];
    for (let i = 0; i < n; i++) {
      const u = n === 1 ? 0.5 : i / (n - 1);
      const a = face + (u - 0.5) * 2.2;
      out.push(new THREE.Vector3(M.pos.x + Math.sin(a) * 62, 38 + u * (M.H * 0.85), M.pos.z + Math.cos(a) * 62));
    }
    return out;
  }

  setJourney(id, points, active, tone) {
    this.clearJourney();
    if (!points || !points.length) return;
    const col = new THREE.Color(tone || 0xffe600);
    const curve = new THREE.CatmullRomCurve3(points, false, "centripetal");
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 160, 0.22, 6, false),
      new THREE.MeshBasicMaterial({ color: col.clone().multiplyScalar(2), toneMapped: false, transparent: true, opacity: 0.85 }));
    this.jGroup.add(tube);
    this.jCurve = curve;
    this.jOrbs = points.map((p, i) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.jSprite, color: col.clone().multiplyScalar(i === active ? 3 : 1.6), blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
      s.position.copy(p); s.scale.setScalar(i === active ? 9 : 5);
      this.jGroup.add(s);
      return s;
    });
    this.jFlow = [0, 1, 2].map(() => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.jSprite, color: col.clone().multiplyScalar(3), blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
      s.scale.setScalar(3);
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
      s.scale.setScalar(on ? 9 : done ? 6 : 4.5);
      s.material.opacity = on ? 1 : done ? 0.85 : 0.45;
    });
  }

  clearJourney() {
    this.jGroup.children.slice().forEach((c) => { this.jGroup.remove(c); c.geometry && c.geometry.dispose(); c.material && c.material.dispose(); });
    this.jOrbs = null; this.jFlow = null; this.jCurve = null;
  }

  /** The camera for a journey: back far enough to hold the whole spiral; wider for the closing frame. */
  focusJourney(id, wide) {
    const M = this.monuments.find((m) => m.id === id);
    if (!M) return;
    const az = Math.atan2(M.dir.x, M.dir.z);
    this.rig.fly({ az, el: wide ? 0.26 : 0.1, dist: wide ? M.H * 2.6 + 140 : M.H * 1.9 + 90, target: [M.pos.x, M.H * 0.5, M.pos.z] });
  }

  /* ------------------------------------------------------------ camera */

  home(instant) {
    this.selId = null;
    this.rig.fly({ ...this.HOME }, instant);
  }

  _right(az) { return new THREE.Vector3(Math.cos(az), 0, -Math.sin(az)); }

  _upp(dist) {
    const c = this.stage.camera;
    return (2 * dist * Math.tan(c.fov * DEG / 2)) / Math.max(1, this.stage.h);
  }

  homeShift(px) {
    const H = this.HOME, t = new THREE.Vector3().fromArray(H.target);
    if (px) t.addScaledVector(this._right(H.az), px * this._upp(H.dist));
    this.rig.fly({ az: H.az, el: H.el, dist: H.dist, target: t.toArray() });
  }

  /** Frame a landmark from the water, the rest of the skyline behind it. */
  focus(id, o = {}) {
    if (id === "__ey") return this.focusCore(o);
    const M = this.monuments.find((m) => m.id === id);
    if (!M) return;
    this.selId = id;
    const az = Math.atan2(M.dir.x, M.dir.z) + (o.swing ?? 0.32);
    const dist = o.dist ?? M.H * 1.9 + 130;
    const t = new THREE.Vector3(M.pos.x, M.H * 0.52, M.pos.z);
    if (o.shiftPx) t.addScaledVector(this._right(az), o.shiftPx * this._upp(dist));
    this.rig.fly({ az, el: o.el ?? 0.17, dist, target: t.toArray() });
  }

  focusCore(o = {}) {
    this.selId = "__ey";
    const az = this.HOME.az + 0.25, dist = o.dist ?? 250;
    const t = new THREE.Vector3(0, 82, 0);
    if (o.shiftPx) t.addScaledVector(this._right(az), o.shiftPx * this._upp(dist));
    this.rig.fly({ az, el: 0.1, dist, target: t.toArray() });
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

  /* ------------------------------------------------------------ frame */

  _frame(dt, t) {
    dt = dt || 0.016;
    if (this.mode === "hero" && !REDUCED) {
      this.rig.azT = this.HOME.az + Math.sin(t * 0.035) * 0.12;
      this.rig.distT = this.HOME.dist + Math.sin(t * 0.06) * 12;
    }
    this.rig.update(dt);
    const k = 1 - Math.exp(-6 * dt);
    for (const m of this.mats) m.userData.U.uTime.value = t;
    const any = this.selId;
    for (const M of this.monuments) {
      M.hover += ((this.hoverId === M.id ? 1 : 0) - M.hover) * k;
      M.sel += ((this.selId === M.id ? 1 : 0) - M.sel) * k;
      const dim = any && any !== M.id ? 0.55 : 1;
      M.mat.userData.U.uBoost.value = (M.hover * 0.8 + M.sel * 1.0) * dim + (dim < 1 ? -0.3 : 0);
      M.beam.material.uniforms.uI.value = M.sel * 0.45;
      M.beam.material.uniforms.uTime.value = t;
      M.pool.material.uniforms.uI.value = (0.55 + M.hover * 0.6 + M.sel * 0.8) * dim;
      if (M.spoke) { const su = M.spoke.material.uniforms; su.uTime.value = t; su.uI.value = (this.mode === "hero" ? 0.6 : 1) * (0.8 + M.sel * 1.5) * dim; }
      if (M.glass) M.glass.emissiveIntensity = (0.8 + M.hover * 0.6 + M.sel * 0.8) * dim;
    }
    const C = this.core;
    C.hover += ((this.hoverId === "__ey" ? 1 : 0) - C.hover) * k;
    C.sel += ((this.selId === "__ey" ? 1 : 0) - C.sel) * k;
    C.mat.userData.U.uBoost.value = C.hover * 0.6 + C.sel;
    C.pool.material.uniforms.uI.value = 0.6 + C.hover + C.sel * 1.4;
    if (!REDUCED) this.beacon.material.color.setRGB(1, 0.25, 0.2).multiplyScalar(Math.sin(t * 2.2) > 0.6 ? 3.2 : 0.4);
    this.water.material.uniforms.uTime.value = t;
    this.water.material.uniforms.uCam.value.copy(this.stage.camera.position);
    const fog = this.stage.scene.fog;
    this.water.material.uniforms.fogColor.value.copy(fog.color);
    this.water.material.uniforms.fogDensity.value = fog.density;
    this.net.lines.material.uniforms.uTime.value = t;
    this.traffic.material.uniforms.uTime.value = REDUCED ? 0 : t;

    if (this.jCurve && this.jFlow) {
      const n = this.jCount, a = Math.max(0, this.jActive - 1) / Math.max(1, n - 1), b = Math.min(1, this.jActive / Math.max(1, n - 1));
      this.jFlow.forEach((s, i) => {
        const u = (t * 0.45 + i / 3) % 1;
        const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
        const f = this.jActive === 0 ? b * e : a + (b - a) * e;
        s.position.copy(this.jCurve.getPointAt(Math.min(1, Math.max(0, f))));
        s.material.opacity = Math.sin(u * Math.PI);
      });
      this.jOrbs.forEach((s, i) => { if (i === this.jActive) s.scale.setScalar(8 + Math.sin(t * 3) * 1.2); });
    }
    this._emit("frame", t);
  }
}

/** The hero looks across the water at the skyline, which sits right of the title. */
function heroHome() {
  const az = 0.34;
  const right = new THREE.Vector3(Math.cos(az), 0, -Math.sin(az));
  const t = new THREE.Vector3(0, 64, 0).addScaledVector(right, -95);
  return { az, el: 0.03, dist: 470, target: t.toArray() };
}

window.EYCITY = {
  supported: webglAvailable,
  TIMES,
  mount(canvas, BIZ, opts) { return new City(canvas, BIZ, opts); },
};

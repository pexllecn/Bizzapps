// The Workbench: where the work used to be done, and where it is done now.
//
// On the left of a blackened steel bench stands a brass difference engine
// under a glass bell, feeding a paper schematic onto a drafting board: the
// machine age of service, one line, one ledger, one engineer's drawing. On the
// right, five glass cores, one per layer of the platform, each with its own
// circuitry lit in its layer colour, all cabled into one governed hub. The
// camera travels from one to the other as the page is read.

import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { Stage, Rig, REDUCED, webglAvailable } from "./engine/core.js";
import { steelMaps, schematicMap, circuitMap } from "./engine/textures.js";
import { rng } from "./engine/noise.js";

const BRASS = () => new THREE.MeshStandardMaterial({ color: 0xc8963e, metalness: 1, roughness: 0.32 });
const IRON = () => new THREE.MeshStandardMaterial({ color: 0x24211d, metalness: 0.85, roughness: 0.48 });

function gearGeometry(R, teeth, thick, hole = 0.18) {
  const s = new THREE.Shape();
  const N = teeth * 4;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2, r = (i % 4 < 2) ? R : R * 0.86;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    i ? s.lineTo(x, y) : s.moveTo(x, y);
  }
  const h = new THREE.Path();
  h.absarc(0, 0, R * hole, 0, Math.PI * 2, true);
  s.holes.push(h);
  // spokes: cut four windows
  for (let k = 0; k < 5; k++) {
    const a0 = (k / 5) * Math.PI * 2 + 0.18, a1 = a0 + Math.PI * 2 / 5 - 0.36;
    const w = new THREE.Path();
    w.absarc(0, 0, R * 0.68, a0, a1, false);
    w.absarc(0, 0, R * 0.3, a1, a0, true);
    s.holes.push(w);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: true, bevelThickness: thick * 0.15, bevelSize: thick * 0.15, bevelSegments: 2, curveSegments: 24 });
  g.translate(0, 0, -thick / 2);
  return g;
}

class Workbench {
  constructor(canvas, BIZ, opts = {}) {
    this.BIZ = BIZ;
    this.layers = BIZ.stack.layers.slice().reverse();          // foundation first, left to right
    const stage = new Stage(canvas, { fov: 30, bloom: 0.65, bloomThreshold: 1.1, quality: opts.quality, lowBloom: true });
    this.stage = stage;
    this.q = stage.quality;
    const scene = stage.scene;
    scene.background = new THREE.Color(0x07070a);
    scene.fog = new THREE.Fog(0x07070a, 16, 34);
    stage.renderer.toneMappingExposure = 1.0;
    const pm = new THREE.PMREMGenerator(stage.renderer);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.22;
    this.listeners = { hover: [], select: [], frame: [] };
    this.hoverId = null; this.selId = null;
    this.progress = 0;
    this.cores = [];
    this.spin = [];

    this._bench();
    this._engine();
    this._bridge();
    this._cores();
    this._lights();

    this.rig = new Rig(stage.camera, { az: -0.35, el: 0.34, dist: 14, target: [0, 0.9, 0], minEl: 0.12, maxEl: 0.9, minDist: 6, maxDist: 22, damp: 2.2 });
    this.setProgress(0, true);
    stage.onFrame((dt, t) => this._frame(dt, t));
    stage.start();
    if (REDUCED) stage.renderOnce();
  }

  on(ev, fn) { this.listeners[ev].push(fn); return this; }
  _emit(ev, a) { this.listeners[ev].forEach((f) => f(a)); }

  _bench() {
    const m = steelMaps(this.q === "low" ? 512 : 1024);
    const mat = new THREE.MeshStandardMaterial({ map: m.map, roughnessMap: m.roughnessMap, metalness: 0.75, roughness: 1, color: 0x9a9aa4 });
    m.map.repeat.set(3, 1.6); m.roughnessMap.repeat.set(3, 1.6);
    const top = new THREE.Mesh(new RoundedBoxGeometry(17, 0.35, 7.5, 3, 0.06), mat);
    top.position.y = -0.175;
    top.receiveShadow = true;
    this.stage.scene.add(top);
    // the floor beyond the bench, just enough to catch a little light
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: 0x0b0b0e, roughness: 0.9 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -3.4;
    this.stage.scene.add(floor);
  }

  _engine() {
    const g = new THREE.Group();
    g.position.set(-4.6, 0, -0.4);
    g.rotation.y = 0.35;
    this.stage.scene.add(g);
    const brass = BRASS(), iron = IRON();
    const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
      const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
      m.castShadow = true; m.receiveShadow = true; g.add(m); return m;
    };
    // plinth and feet
    add(new RoundedBoxGeometry(2.9, 0.42, 1.8, 3, 0.05), iron, 0, 0.36, 0);
    for (const [x, z] of [[-1.3, -0.75], [1.3, -0.75], [-1.3, 0.75], [1.3, 0.75]]) add(new THREE.CylinderGeometry(0.1, 0.14, 0.18, 16), brass, x, 0.09, z);
    add(new RoundedBoxGeometry(2.6, 0.1, 1.55, 2, 0.03), brass, 0, 0.62, 0);
    // side frames with rivets
    for (const s of [-1, 1]) {
      add(new RoundedBoxGeometry(0.12, 1.3, 1.4, 2, 0.03), iron, s * 1.25, 1.3, 0);
      const rv = new THREE.InstancedMesh(new THREE.SphereGeometry(0.03, 8, 6), brass, 12);
      const m4 = new THREE.Matrix4();
      for (let i = 0; i < 12; i++) { m4.makeTranslation(s * (1.25 + s * 0.065), 0.75 + (i % 6) * 0.22, i < 6 ? -0.6 : 0.6); rv.setMatrixAt(i, m4); }
      g.add(rv);
    }
    // the column of figure wheels, the heart of a difference engine
    const cols = 4;
    for (let c = 0; c < cols; c++) {
      const x = -0.75 + c * 0.5;
      add(new THREE.CylinderGeometry(0.025, 0.025, 1.5, 8), iron, x, 1.35, -0.25);
      for (let k = 0; k < 6; k++) {
        const w = add(new THREE.CylinderGeometry(0.17, 0.17, 0.09, 28), brass, x, 0.78 + k * 0.2, -0.25);
        w.userData.spin = (c % 2 ? 1 : -1) * (0.2 + k * 0.05);
        this.spin.push(w);
      }
    }
    // gears on the side, meshing
    const gA = add(gearGeometry(0.46, 18, 0.07), brass, 1.42, 1.25, 0.2, 0, Math.PI / 2, 0);
    const gB = add(gearGeometry(0.3, 12, 0.07), brass, 1.42, 0.62, 0.72, 0, Math.PI / 2, 0);
    gA.userData.gear = 0.35; gB.userData.gear = -0.35 * 18 / 12;
    this.spin.push(gA, gB);
    // the glass bell and the lamp inside it
    const bellMat = this.q === "low"
      ? new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, roughness: 0.05, metalness: 0 })
      : new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.04, metalness: 0, transmission: 1, thickness: 0.08, ior: 1.5, transparent: true, specularIntensity: 1 });
    const bell = add(new THREE.SphereGeometry(0.72, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.62), bellMat, 0.2, 2.05, 0.3);
    bell.castShadow = false;
    add(new THREE.CylinderGeometry(0.72, 0.78, 0.1, 48), brass, 0.2, 2.05, 0.3);
    add(new THREE.CylinderGeometry(0.06, 0.06, 0.95, 8), iron, 0.2, 2.1, 0.3);
    const fil = add(new THREE.TorusKnotGeometry(0.13, 0.018, 90, 8, 3, 7), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffa24a).multiplyScalar(6), toneMapped: false }), 0.2, 2.62, 0.3);
    fil.castShadow = false;
    this.filament = fil;
    const lamp = new THREE.PointLight(0xff9a45, 5, 7, 1.8);
    lamp.position.set(0.2, 2.62, 0.3);
    lamp.castShadow = this.q === "high";
    g.add(lamp);
    this.lamp = lamp;
    // the paper feed: a roller and the schematic curling down onto the board
    add(new THREE.CylinderGeometry(0.16, 0.16, 1.3, 24), brass, 0, 0.95, 0.95, 0, 0, Math.PI / 2);
    const paper = this._paper();
    g.add(paper);
    // the drafting board, ruler and pencil
    add(new THREE.BoxGeometry(1.8, 0.05, 2.6), new THREE.MeshStandardMaterial({ color: 0x3b3128, roughness: 0.8 }), 0, 0.025, 2.55);
    add(new THREE.BoxGeometry(0.06, 0.02, 2.4), new THREE.MeshStandardMaterial({ color: 0xb8b8b0, metalness: 0.9, roughness: 0.3 }), 0.95, 0.08, 2.55);
    add(new THREE.CylinderGeometry(0.018, 0.018, 0.9, 6), new THREE.MeshStandardMaterial({ color: 0xc9a227, roughness: 0.5 }), 0.45, 0.07, 3.3, Math.PI / 2, 0, 0.6);
    // a magnifier on its stand
    const ring = add(new THREE.TorusGeometry(0.28, 0.025, 12, 48), brass, -1.55, 0.95, 1.9, 0, 0.6, 0);
    add(new THREE.CylinderGeometry(0.02, 0.02, 0.7, 8), iron, -1.55, 0.35, 1.9);
    add(new THREE.CylinderGeometry(0.22, 0.26, 0.05, 32), iron, -1.55, 0.03, 1.9);
    const lens = add(new THREE.CircleGeometry(0.27, 40), this.q === "low" ? bellMat : new THREE.MeshPhysicalMaterial({ roughness: 0, transmission: 1, thickness: 0.2, ior: 1.6, transparent: true }), -1.55, 0.95, 1.9, 0, 0.6, 0);
    ring.castShadow = lens.castShadow = false;
    this.engine = g;
  }

  /** A sheet that leaves the roller, curls down and lies flat on the board. */
  _paper() {
    const W = 1.1, segs = 60;
    const geo = new THREE.PlaneGeometry(W, 1, 1, segs);
    const p = geo.attributes.position, uv = geo.attributes.uv;
    // a quarter ellipse off the roller, then flat along the board
    const Rz = 0.9, Hy = 1.1 - 0.065, arc = Math.PI / 2 * (Rz + Hy) / 2, flat = 2.4, total = arc + flat;
    for (let i = 0; i < p.count; i++) {
      const v = uv.getY(i);                     // 1 at the roller, 0 at the far end
      const s = (1 - v) * total;
      let y, z;
      if (s < arc) { const a = (s / arc) * Math.PI / 2; y = 0.065 + Hy * Math.cos(a); z = 0.95 + Rz * Math.sin(a); }
      else { y = 0.065; z = 0.95 + Rz + (s - arc); }
      p.setXYZ(i, p.getX(i), y, z);
    }
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ map: schematicMap(), roughness: 0.95, side: THREE.DoubleSide, color: 0xb9ad98, envMapIntensity: 0.4 });
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }

  _bridge() {
    // a white pedestal carrying one brass wheel: the part of the old way worth keeping
    const g = new THREE.Group();
    g.position.set(-1.1, 0, 0.9);
    this.stage.scene.add(g);
    const ped = new THREE.Mesh(new RoundedBoxGeometry(1.05, 0.34, 1.05, 3, 0.04), new THREE.MeshStandardMaterial({ color: 0xb4b4ba, roughness: 0.6 }));
    ped.position.y = 0.17; ped.castShadow = ped.receiveShadow = true;
    g.add(ped);
    const gear = new THREE.Mesh(gearGeometry(0.33, 16, 0.09), BRASS());
    gear.rotation.x = -Math.PI / 2; gear.position.y = 0.4;
    gear.castShadow = true;
    g.add(gear);
    gear.userData.flat = 0.12;
    this.spin.push(gear);
  }

  _cores() {
    const n = this.layers.length;
    const hub = new THREE.Group();
    hub.position.set(3.1, 0, 2.1);
    this.stage.scene.add(hub);
    const hubBody = new THREE.Mesh(new RoundedBoxGeometry(1.25, 0.22, 1.25, 3, 0.05), new THREE.MeshStandardMaterial({ color: 0x0d0d11, metalness: 0.6, roughness: 0.35 }));
    hubBody.position.y = 0.11; hubBody.castShadow = hubBody.receiveShadow = true;
    hub.add(hubBody);
    const hubTop = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 1.05), new THREE.MeshStandardMaterial({ color: 0x111116, emissive: 0xffe600, emissiveIntensity: 0.9, emissiveMap: circuitMap(512, 99), metalness: 0.4, roughness: 0.4 }));
    hubTop.rotation.x = -Math.PI / 2; hubTop.position.y = 0.225;
    hub.add(hubTop);
    const rim = new THREE.Mesh(new THREE.BoxGeometry(1.29, 0.02, 1.29), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffe600).multiplyScalar(2.2), toneMapped: false }));
    rim.position.y = 0.02;
    hub.add(rim);
    this.hub = { group: hub, top: hubTop, anchor: new THREE.Vector3(3.1, 0.8, 2.1) };

    const glass = this.q === "low"
      ? (c) => new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.16, roughness: 0.08, metalness: 0.1, envMapIntensity: 1.5 })
      : (c) => new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.06, metalness: 0, transmission: 1, thickness: 1.2, ior: 1.45, attenuationColor: new THREE.Color(c).lerp(new THREE.Color(0xffffff), 0.55), attenuationDistance: 2.4, specularIntensity: 1, clearcoat: 0.6, envMapIntensity: 1.3 });

    this.layers.forEach((L, i) => {
      const u = i / (n - 1);
      const ang = -0.95 + u * 1.9;
      const x = 3.1 + Math.sin(ang) * 3.6, z = 2.1 - Math.cos(ang) * 3.2;
      const g = new THREE.Group();
      g.position.set(x, 0, z);
      g.rotation.y = -ang * 0.6;
      this.stage.scene.add(g);
      const col = new THREE.Color(L.color);
      // plinth
      const pl = new THREE.Mesh(new RoundedBoxGeometry(1.35, 0.16, 1.35, 3, 0.04), new THREE.MeshStandardMaterial({ color: 0x141418, metalness: 0.7, roughness: 0.4 }));
      pl.position.y = 0.08; pl.castShadow = pl.receiveShadow = true;
      g.add(pl);
      const lift = new THREE.Group();
      lift.position.y = 0.16;
      g.add(lift);
      // glass cube
      const S = 1.15;
      const cube = new THREE.Mesh(new RoundedBoxGeometry(S, S, S, 4, 0.05), glass(L.color));
      cube.position.y = S / 2 + 0.02;
      cube.castShadow = false;
      lift.add(cube);
      // edge frame, lit in the layer colour
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(S * 0.985, S * 0.985, S * 0.985)), new THREE.LineBasicMaterial({ color: col.clone().multiplyScalar(1.2), transparent: true, opacity: 0.55, toneMapped: false }));
      edges.position.copy(cube.position);
      lift.add(edges);
      // circuitry inside: three boards on standoffs
      const boardMat = new THREE.MeshStandardMaterial({ color: 0x0c0d10, metalness: 0.3, roughness: 0.45, emissive: col, emissiveIntensity: 1.6, emissiveMap: circuitMap(512, i + 3) });
      const boards = [];
      for (let b = 0; b < 3; b++) {
        const bd = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.03, 0.72), boardMat);
        bd.position.set(0, 0.28 + b * 0.27, 0);
        bd.rotation.y = b * 0.4;
        bd.castShadow = true;
        lift.add(bd);
        boards.push(bd);
        const chip = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.2), new THREE.MeshStandardMaterial({ color: 0x1a1a1f, metalness: 0.8, roughness: 0.3 }));
        chip.position.set(0.1 - b * 0.08, bd.position.y + 0.035, -0.05 + b * 0.06);
        lift.add(chip);
      }
      for (const [sx, sz] of [[-0.32, -0.32], [0.32, -0.32], [-0.32, 0.32], [0.32, 0.32]]) {
        const st = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.62, 6), BRASS());
        st.position.set(sx, 0.55, sz);
        lift.add(st);
      }
      const light = new THREE.PointLight(col, 2.4, 3.2, 2);
      light.position.set(0, 1.5, 0);
      lift.add(light);
      // the cable into the hub, carrying pulses in the layer colour
      const start = new THREE.Vector3(x, 0.05, z);
      const hubP = new THREE.Vector3(3.1 + (u - 0.5) * 0.9, 0.12, 2.1 - 0.62);
      const mid = start.clone().lerp(hubP, 0.5); mid.y = 0.05;
      const curve = new THREE.CatmullRomCurve3([start, start.clone().lerp(mid, 0.5).setY(0.04), mid, hubP.clone().setY(0.06), hubP]);
      const cable = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 0.035, 8, false), this._cableMat(col, i));
      cable.castShadow = true;
      this.stage.scene.add(cable);
      // picking proxy
      const proxy = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.6, 1.4), new THREE.MeshBasicMaterial({ visible: false }));
      proxy.position.y = 0.8; proxy.userData.id = L.id;
      g.add(proxy);
      this.cores.push({ id: L.id, layer: L, group: g, lift, edges, boards, boardMat, light, cable, proxy, col,
        anchor: new THREE.Vector3(x, 1.75, z), hover: 0, sel: 0 });
    });
  }

  _cableMat(col, i) {
    const mat = new THREE.MeshStandardMaterial({ color: 0x0d0d10, roughness: 0.55, metalness: 0.1 });
    const U = { uTime: { value: 0 }, uCol: { value: col.clone() }, uI: { value: 1 }, uPhase: { value: i * 0.37 } };
    mat.userData.U = U;
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec2 vCabUv;").replace("#include <uv_vertex>", "#include <uv_vertex>\nvCabUv = uv;");
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", "#include <common>\nuniform float uTime, uI, uPhase; uniform vec3 uCol; varying vec2 vCabUv;")
        .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
          float pk = pow(fract(vCabUv.x * 4.0 + uTime * 0.45 + uPhase), 14.0);
          totalEmissiveRadiance += uCol * (0.18 + pk * 4.5) * uI;`);
    };
    mat.customProgramCacheKey = () => "cable-v1";
    return mat;
  }

  _lights() {
    const s = this.stage.scene;
    const key = new THREE.SpotLight(0xffc38a, 110, 30, 0.5, 0.7, 1.6);
    key.position.set(-7, 9, 5);
    key.target.position.set(-3.8, 0.5, 0.6);
    key.castShadow = this.stage.renderer.shadowMap.enabled;
    key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0003; key.shadow.normalBias = 0.02;
    s.add(key, key.target);
    const cool = new THREE.SpotLight(0x9fdcff, 120, 30, 0.6, 0.7, 1.6);
    cool.position.set(6, 8.5, 6);
    cool.target.position.set(3.2, 0.5, 1.2);
    cool.castShadow = this.q === "high";
    cool.shadow.mapSize.set(1024, 1024); cool.shadow.bias = -0.0003;
    s.add(cool, cool.target);
    const rim = new THREE.DirectionalLight(0x8aa0ff, 0.6);
    rim.position.set(0, 5, -10);
    s.add(rim);
    s.add(new THREE.HemisphereLight(0x303848, 0x0a0806, 0.35));
  }

  /* ---------------------------------------------------------------- API */

  /**
   * 0 is the engine, close and warm. 0.5 takes in the whole bench. 1 is the
   * platform. The page drives this from its scroll position.
   */
  setProgress(p, instant) {
    this.progress = Math.max(0, Math.min(1, p));
    const k = this.progress;
    const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    const A = { az: -0.2, el: 0.3, dist: 9.2, target: [-4.1, 1.15, 0.9] };
    const B = { az: -0.05, el: 0.42, dist: 18.5, target: [-2.2, 0.6, 1.0] };
    const C = { az: 0.3, el: 0.4, dist: 17, target: [1.5, 0.7, 1.2] };
    const lerp = (a, b, t) => a + (b - a) * t;
    const f = e < 0.5 ? e * 2 : (e - 0.5) * 2;
    const P = e < 0.5 ? [A, B] : [B, C];
    this.rig.fly({
      az: lerp(P[0].az, P[1].az, f), el: lerp(P[0].el, P[1].el, f), dist: lerp(P[0].dist, P[1].dist, f),
      target: P[0].target.map((v, j) => lerp(v, P[1].target[j], f)),
    }, instant);
  }

  pickAt(x, y) {
    const hit = this.stage.pick(x, y, this.cores.map((c) => c.proxy));
    return hit ? hit.object.userData.id : null;
  }

  setHover(id) { this.hoverId = id; }
  setSelected(id) { this.selId = id; }
  project(v) { return this.stage.project(v); }
  labelPoints() { return this.cores.map((c) => ({ id: c.id, p: c.anchor, layer: c.layer })).concat([{ id: "__hub", p: this.hub.anchor }]); }

  _frame(dt, t) {
    this.rig.update(dt || 0.016);
    const k = 1 - Math.exp(-7 * (dt || 0.016));
    const warm = 1 - THREE.MathUtils.smoothstep(this.progress, 0.3, 0.9);
    this.lamp.intensity = 2.2 + warm * 3.2 + (REDUCED ? 0 : Math.sin(t * 13) * 0.4 + Math.sin(t * 7.3) * 0.3);
    for (const m of this.spin) {
      if (REDUCED) break;
      if (m.userData.gear) m.rotation.x += m.userData.gear * (dt || 0);
      else if (m.userData.flat) m.rotation.z += m.userData.flat * (dt || 0);
      else if (m.userData.spin) m.rotation.y += m.userData.spin * (dt || 0);
    }
    const cool = THREE.MathUtils.smoothstep(this.progress, 0.2, 0.85);
    this.cores.forEach((c, i) => {
      c.hover += ((this.hoverId === c.id ? 1 : 0) - c.hover) * k;
      c.sel += ((this.selId === c.id ? 1 : 0) - c.sel) * k;
      const dim = this.selId && this.selId !== c.id ? 0.4 : 1;
      c.lift.position.y = 0.16 + c.hover * 0.12 + c.sel * 0.28 + (REDUCED ? 0 : Math.sin(t * 1.1 + i) * 0.015);
      c.boardMat.emissiveIntensity = (0.5 + cool * 1.3) * (1 + c.hover * 0.8 + c.sel * 1.2) * dim;
      c.light.intensity = (0.8 + cool * 2.2) * (1 + c.sel * 1.5) * dim;
      c.edges.material.opacity = 0.25 + cool * 0.3 + c.hover * 0.3 + c.sel * 0.4;
      c.boards.forEach((b, j) => { if (!REDUCED) b.rotation.y += (dt || 0) * 0.05 * (j % 2 ? 1 : -1) * (1 + c.sel * 3); });
      const U = c.cable.material.userData.U;
      U.uTime.value = t; U.uI.value = (0.4 + cool * 0.8) * dim * (1 + c.sel);
    });
    this.hub.top.material.emissiveIntensity = 0.35 + cool * 0.8;
    this._emit("frame", t);
  }
}

window.EYBENCH = {
  supported: webglAvailable,
  mount(canvas, BIZ, opts) { return new Workbench(canvas, BIZ, opts); },
};

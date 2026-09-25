// Open chalk downland under a physically modelled sky: the sun, the
// atmosphere it lights, a meadow that moves in the wind and tree lines on the
// horizon. The light is one of a few authored times of day.

import * as THREE from "three";
import { Sky } from "three/examples/jsm/objects/Sky.js";
import { simplex3, fbm, rng } from "./noise.js";
import { meadowMaps } from "./textures.js";

/** Authored light. Sun angles in degrees; azimuth measured from +z toward +x. */
export const TIMES = {
  golden: {
    name: "Golden hour", elev: 5.2, azim: 38,
    turbidity: 2.6, rayleigh: 2.1, mie: 0.0035, mieG: 0.84,
    sun: 0xffa862, sunI: 7.5, hemiSky: 0xa9bde8, hemiGround: 0x5a4424, hemiI: 0.5,
    fog: 0xd8b28a, fogD: 0.0012, exposure: 0.72, env: 0.75, glow: 0.7,
  },
  midday: {
    name: "Midday", elev: 48, azim: 160,
    turbidity: 3.2, rayleigh: 1.1, mie: 0.004, mieG: 0.8,
    sun: 0xfff4e6, sunI: 4.2, hemiSky: 0xcfe0ff, hemiGround: 0x4d5a36, hemiI: 0.7,
    fog: 0xbfd0e6, fogD: 0.0016, exposure: 0.42, env: 0.8, glow: 0.35,
  },
  dusk: {
    name: "Dusk", elev: -1.6, azim: 250,
    turbidity: 9, rayleigh: 3.2, mie: 0.006, mieG: 0.9,
    sun: 0xff8a5c, sunI: 0.9, hemiSky: 0x6f7fb8, hemiGround: 0x2a2230, hemiI: 0.55,
    fog: 0x5a4a66, fogD: 0.0026, exposure: 1.25, env: 0.9, glow: 2.2,
  },
};

export class Land {
  constructor(stage, { quality = "high", grassRadius, clearings = [] } = {}) {
    this.stage = stage;
    this.quality = quality;
    const scene = stage.scene;
    this.uniforms = { uTime: { value: 0 }, uWind: { value: 1 } };

    // --- sky
    const sky = new Sky();
    sky.scale.setScalar(4500);
    scene.add(sky);
    this.sky = sky;
    this.sunDir = new THREE.Vector3();

    // --- lights
    const sun = new THREE.DirectionalLight(0xffffff, 3);
    sun.castShadow = stage.renderer.shadowMap.enabled;
    const map = quality === "high" ? 4096 : quality === "mid" ? 2048 : 1024;
    sun.shadow.mapSize.set(map, map);
    const S = 48;
    Object.assign(sun.shadow.camera, { left: -S, right: S, top: S, bottom: -S, near: 1, far: 400 });
    sun.shadow.bias = -0.00025;
    sun.shadow.normalBias = 0.05;
    sun.shadow.radius = 3;
    scene.add(sun, sun.target);
    this.sun = sun;
    this.hemi = new THREE.HemisphereLight(0xbfd2ff, 0x4a4030, 0.6);
    scene.add(this.hemi);

    scene.fog = new THREE.FogExp2(0xd9b48a, 0.002);

    this.pmrem = new THREE.PMREMGenerator(stage.renderer);
    this.envScene = new THREE.Scene();
    this.envSky = new Sky();
    this.envSky.scale.setScalar(1000);
    this.envScene.add(this.envSky);

    this.ground = this._ground();
    scene.add(this.ground);
    this.clearings = clearings;
    this.grassRadius = grassRadius;
    this.trees = this._treeLines();
    scene.add(this.trees);

    stage.onFrame((dt, t) => { this.uniforms.uTime.value = t; });
  }

  /** Sow the meadow. Called once the world has registered where its stones stand. */
  plant() {
    const q = this.quality;
    const R = this.grassRadius ?? (q === "high" ? 64 : q === "mid" ? 46 : 30);
    const N = q === "high" ? 110000 : q === "mid" ? 42000 : 9000;
    this.grass = this._grass(N, R);
    this.stage.scene.add(this.grass);
  }

  /** Apply one of TIMES, rebuilding the environment light from the new sky. */
  setTime(key) {
    const T = TIMES[key] || TIMES.golden;
    this.time = key;
    this.T = T;
    const phi = THREE.MathUtils.degToRad(90 - T.elev), theta = THREE.MathUtils.degToRad(T.azim);
    this.sunDir.setFromSphericalCoords(1, phi, theta);
    for (const s of [this.sky, this.envSky]) {
      const u = s.material.uniforms;
      u.turbidity.value = T.turbidity; u.rayleigh.value = T.rayleigh;
      u.mieCoefficient.value = T.mie; u.mieDirectionalG.value = T.mieG;
      u.sunPosition.value.copy(this.sunDir);
    }
    // the shadow-casting light never goes below a few degrees: at dusk the
    // sky carries the colour and the key light is the afterglow
    const e = Math.max(T.elev, 6);
    const d = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - e), theta);
    this.sun.position.copy(d).multiplyScalar(160);
    this.sun.target.position.set(0, 0, 0);
    this.sun.color.set(T.sun); this.sun.intensity = T.sunI;
    this.hemi.color.set(T.hemiSky); this.hemi.groundColor.set(T.hemiGround); this.hemi.intensity = T.hemiI;
    this.stage.scene.fog.color.set(T.fog); this.stage.scene.fog.density = T.fogD;
    this.stage.renderer.toneMappingExposure = T.exposure;
    if (this.envRT) this.envRT.dispose();
    this.envRT = this.pmrem.fromScene(this.envScene, 0, 0.1, 2000);
    this.stage.scene.environment = this.envRT.texture;
    this.stage.scene.environmentIntensity = T.env;
    return T;
  }

  /** Rolling ground: flat where the monument stands, lifting into downs toward the horizon. */
  _ground() {
    const n = simplex3(3);
    const segs = this.quality === "low" ? 160 : 260;
    const g = new THREE.PlaneGeometry(7000, 7000, segs, segs);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position, uv = g.attributes.uv;
    const col = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z);
      const lift = THREE.MathUtils.smoothstep(r, 140, 1400);
      const h = (fbm(n, x * 0.0022, 0, z * 0.0022, 4) * 0.5 + 0.5) * 55 * lift + fbm(n, x * 0.02, 5, z * 0.02, 3) * 0.35;
      p.setY(i, h);
      uv.setXY(i, x / 23, z / 23);
      const m = fbm(n, x * 0.012, 11, z * 0.012, 3) * 0.5 + 0.5;
      const dry = THREE.MathUtils.smoothstep(m, 0.45, 0.8);
      col[i * 3] = 0.86 + dry * 0.3; col[i * 3 + 1] = 0.9 + dry * 0.08; col[i * 3 + 2] = 0.82;
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals();
    const m = meadowMaps(this.quality === "low" ? 512 : 1024);
    const mat = new THREE.MeshStandardMaterial({
      map: m.map, normalMap: m.normalMap, normalScale: new THREE.Vector2(0.6, 0.6),
      roughness: 0.96, metalness: 0, vertexColors: true, envMapIntensity: 0.6,
    });
    mat.onBeforeCompile = (sh) => {
      sh.fragmentShader = sh.fragmentShader.replace("#include <map_fragment>", `
        vec4 mA = texture2D(map, vMapUv);
        vec4 mB = texture2D(map, vMapUv * 0.173 + 0.31);
        vec4 mC = texture2D(map, vMapUv * 0.041 + 0.77);
        diffuseColor *= mix(mA, (mA + mB + mC) / 3.0, 0.6);`);
    };
    mat.customProgramCacheKey = () => "meadow-v2";
    const mesh = new THREE.Mesh(g, mat);
    mesh.receiveShadow = true;
    this.heightAt = (x, z) => {
      const r = Math.hypot(x, z), lift = THREE.MathUtils.smoothstep(r, 140, 1400);
      return (fbm(n, x * 0.0022, 0, z * 0.0022, 4) * 0.5 + 0.5) * 55 * lift + fbm(n, x * 0.02, 5, z * 0.02, 3) * 0.35;
    };
    return mesh;
  }

  /** Individually drawn blades, bent by a travelling gust. */
  _grass(count, radius) {
    const segs = 4, W = 0.055;
    const pos = [], col = [], uvs = [], idx = [];
    for (let s = 0; s <= segs; s++) {
      const t = s / segs, w = W * (1 - t * 0.92);
      const bend = t * t * 0.18;
      pos.push(-w, t, bend, w, t, bend);
      uvs.push(0, t, 1, t);
      const c0 = [0.10, 0.14, 0.035], c1 = [0.62, 0.62, 0.26];
      const k = Math.pow(t, 1.2);
      for (let j = 0; j < 2; j++) col.push(c0[0] + (c1[0] - c0[0]) * k, c0[1] + (c1[1] - c0[1]) * k, c0[2] + (c1[2] - c0[2]) * k);
      if (s < segs) { const a = s * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(idx);
    g.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0, side: THREE.DoubleSide, envMapIntensity: 0.5 });
    const U = this.uniforms;
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = U.uTime; sh.uniforms.uWind = U.uWind;
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", `#include <common>
          uniform float uTime, uWind;
          float gh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float gn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
            return mix(mix(gh(i), gh(i+vec2(1,0)), f.x), mix(gh(i+vec2(0,1)), gh(i+vec2(1,1)), f.x), f.y); }`)
        .replace("#include <beginnormal_vertex>", `vec3 objectNormal = vec3(0.0, 1.0, 0.0);
          #ifdef USE_TANGENT
            vec3 objectTangent = vec3( tangent.xyz );
          #endif`)
        .replace("#include <begin_vertex>", `vec3 transformed = vec3(position);
          vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
          float gust = gn(ip.xz * 0.045 - vec2(uTime * 0.32, uTime * 0.12));
          float flick = sin(uTime * 2.3 + ip.x * 1.7 + ip.z * 1.3) * 0.5 + 0.5;
          float bendAmt = (0.18 + gust * 0.9 + flick * 0.12) * uWind;
          float k = position.y * position.y;
          transformed.z += k * bendAmt * 0.55;
          transformed.y -= k * bendAmt * bendAmt * 0.12;`);
    };
    mat.customProgramCacheKey = () => "grass-v1";

    const mesh = new THREE.InstancedMesh(g, mat, count);
    const n = simplex3(21), r = rng(4);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
    const c = new THREE.Color();
    let placed = 0;
    for (let i = 0; placed < count && i < count * 4; i++) {
      // denser near the middle, thinning into the distance
      const a = r() * Math.PI * 2, d = Math.pow(r(), 0.62) * radius;
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      const clump = fbm(n, x * 0.09, 0, z * 0.09, 3) * 0.5 + 0.5;
      if (r() > 0.35 + clump * 0.75) continue;
      let blocked = false;
      for (const cl of this.clearings) { if (Math.hypot(x - cl[0], z - cl[1]) < cl[2]) { blocked = true; break; } }
      if (blocked) continue;
      const edge = 1 - THREE.MathUtils.smoothstep(d, radius * 0.7, radius);
      if (r() > 0.25 + edge) continue;
      const h = (0.28 + clump * 0.55 + r() * 0.25) * (0.35 + edge * 0.65);
      e.set((r() - 0.5) * 0.35, r() * Math.PI * 2, (r() - 0.5) * 0.35);
      q.setFromEuler(e);
      s.set(0.8 + r() * 0.6, h, 1);
      p.set(x, this.heightAt(x, z) - 0.02, z);
      m4.compose(p, q, s);
      mesh.setMatrixAt(placed, m4);
      const dry = THREE.MathUtils.smoothstep(fbm(n, x * 0.03, 7, z * 0.03, 2) * 0.5 + 0.5, 0.45, 0.75);
      c.setRGB(0.85 + dry * 0.35 + r() * 0.1, 0.9 + r() * 0.1 - dry * 0.05, 0.75 + r() * 0.1);
      mesh.setColorAt(placed, c);
      placed++;
    }
    mesh.count = placed;
    mesh.receiveShadow = this.quality !== "low";
    mesh.frustumCulled = false;
    return mesh;
  }

  /** Clumps of trees along the skyline, dark against the low sun. */
  _treeLines() {
    const r = rng(77), n = simplex3(78);
    const geo = new THREE.IcosahedronGeometry(1, 2);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(p, i);
      v.multiplyScalar(1 + fbm(n, v.x * 1.6, v.y * 1.6, v.z * 1.6, 3) * 0.35);
      p.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ color: 0x2e3a1c, roughness: 1, metalness: 0 });
    const count = this.quality === "low" ? 500 : 1400;
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), v = new THREE.Vector3();
    const belts = [[0.2, 0.9, 520], [1.9, 2.6, 640], [3.4, 4.1, 470], [4.6, 5.5, 720], [5.8, 6.1, 430]];
    for (let i = 0; i < count; i++) {
      const b = belts[Math.floor(r() * belts.length)];
      const a = b[0] + r() * (b[1] - b[0]), d = b[2] + (r() - 0.5) * 40;
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      const sc = 2.6 + r() * 3.4;
      s.set(sc * (0.9 + r() * 0.4), sc * (0.8 + r() * 0.5), sc * (0.9 + r() * 0.4));
      q.setFromAxisAngle(v.set(0, 1, 0), r() * 6.28);
      m4.compose(v.set(x, this.heightAt(x, z) + sc * 0.6, z), q, s);
      mesh.setMatrixAt(i, m4);
    }
    return mesh;
  }
}

// Night over open water: a graded sky, a field of stars, and a mirror-still
// sea that carries the reflection of whatever stands on it. The sky is drawn
// symmetric about the horizon, so what shows through the water below the line
// is its own reflection, and the city is mirrored in a second, inverted copy.

import * as THREE from "three";
import { rng } from "./noise.js";

/** Authored nights. Colours are linear-ish targets for the grade. */
export const TIMES = {
  night: {
    name: "Night", zenith: 0x020818, mid: 0x06214a, horizon: 0x0f4a86, glow: 0x2a7bd0,
    stars: 1, fog: 0x0b3a6e, fogD: 0.0009, exposure: 1.0, lit: 0.32, facade: 1.0, water: 0x031630, env: 0.55,
  },
  blue: {
    name: "Blue hour", zenith: 0x06204d, mid: 0x14508f, horizon: 0x3f8fd0, glow: 0x7fc0ff,
    stars: 0.35, fog: 0x2a68a6, fogD: 0.001, exposure: 0.95, lit: 0.4, facade: 0.75, water: 0x082a52, env: 0.8,
  },
  dawn: {
    name: "Dawn", zenith: 0x10214f, mid: 0x4b4e8c, horizon: 0xff9a6a, glow: 0xffc28a,
    stars: 0.12, fog: 0x6b5a82, fogD: 0.0011, exposure: 0.9, lit: 0.5, facade: 0.55, water: 0x1a2446, env: 0.9,
  },
};

const SKY_VS = `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w; }`;
const SKY_FS = `
  uniform vec3 uZenith, uMid, uHorizon, uGlow; uniform float uGlowAz;
  varying vec3 vDir;
  void main(){
    float h = abs(vDir.y);                          // symmetric: the sea shows the sky
    vec3 c = mix(uHorizon, uMid, smoothstep(0.0, 0.18, h));
    c = mix(c, uZenith, smoothstep(0.16, 0.75, h));
    // a broad glow on the horizon behind the city, the way a lit city lights its sky
    float az = atan(vDir.x, vDir.z);
    float g = exp(-pow(h / 0.09, 2.0)) * (0.55 + 0.45 * cos(az - uGlowAz));
    c += uGlow * g * 0.55;
    gl_FragColor = vec4(c, 1.0);
  }`;

export class Night {
  constructor(stage, { quality = "high" } = {}) {
    this.stage = stage;
    const scene = stage.scene;
    this.uniforms = {
      uZenith: { value: new THREE.Color() }, uMid: { value: new THREE.Color() },
      uHorizon: { value: new THREE.Color() }, uGlow: { value: new THREE.Color() }, uGlowAz: { value: 0 },
    };
    const skyMat = new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false, fog: false });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(3000, 48, 24), skyMat);
    this.sky.renderOrder = -10;
    this.sky.frustumCulled = false;
    scene.add(this.sky);

    // the same sky rendered once into the environment, so glass reflects it
    this.envScene = new THREE.Scene();
    this.envSky = new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), skyMat);
    this.envScene.add(this.envSky);
    // a band of city light low on the horizon for the glass to catch
    const band = new THREE.Mesh(new THREE.CylinderGeometry(90, 90, 6, 48, 1, true), new THREE.MeshBasicMaterial({ color: 0x3fa0ff, side: THREE.BackSide }));
    band.position.y = 2;
    this.envScene.add(band);
    this.envBand = band;
    this.pmrem = new THREE.PMREMGenerator(stage.renderer);

    this.stars = this._stars(quality === "low" ? 1400 : 3200);
    scene.add(this.stars);

    scene.fog = new THREE.FogExp2(0x06244d, 0.0011);
    this.moon = new THREE.DirectionalLight(0x9fc4ff, 0.7);
    this.moon.position.set(-200, 260, -300);
    scene.add(this.moon);
    this.hemi = new THREE.HemisphereLight(0x3a6ab0, 0x050a14, 0.35);
    scene.add(this.hemi);

    stage.onFrame((dt, t) => { this.stars.material.uniforms.uTime.value = t; });
  }

  /** Stars above the horizon and their faint doubles in the water below it. */
  _stars(n) {
    const r = rng(33), pos = new Float32Array(n * 2 * 3), seed = new Float32Array(n * 2), mir = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      const u = r(), v = Math.pow(r(), 0.8);
      const th = u * Math.PI * 2, y = 0.03 + v * 0.97, s = Math.sqrt(1 - y * y);
      const R = 2600;
      for (let m = 0; m < 2; m++) {
        const k = (i * 2 + m);
        pos[k * 3] = Math.cos(th) * s * R; pos[k * 3 + 1] = (m ? -y : y) * R; pos[k * 3 + 2] = Math.sin(th) * s * R;
        seed[k] = r() * 100 + i; mir[k] = m;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("seed", new THREE.BufferAttribute(seed, 1));
    g.setAttribute("mir", new THREE.BufferAttribute(mir, 1));
    const m = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uI: { value: 1 } },
      vertexShader: `attribute float seed; attribute float mir; uniform float uTime; varying float vA;
        void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; gl_Position.z = gl_Position.w * 0.9999;
          float big = step(0.985, fract(seed * 0.618));
          gl_PointSize = 1.2 + fract(seed * 3.7) * 1.6 + big * 2.2;
          vA = (0.35 + 0.65 * fract(seed * 7.13)) * (0.75 + 0.25 * sin(uTime * (0.6 + fract(seed) * 2.) + seed)) * (1. - mir * 0.72); }`,
      fragmentShader: `uniform float uI; varying float vA;
        void main(){ vec2 q = gl_PointCoord - .5; float d = length(q); float a = smoothstep(.5, .0, d); gl_FragColor = vec4(vec3(.85, .92, 1.) * a * vA * uI, 1.); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: false,
    });
    const p = new THREE.Points(g, m);
    p.frustumCulled = false;
    p.renderOrder = -9;
    return p;
  }

  setTime(key) {
    const T = TIMES[key] || TIMES.night;
    const u = this.uniforms;
    u.uZenith.value.set(T.zenith); u.uMid.value.set(T.mid); u.uHorizon.value.set(T.horizon); u.uGlow.value.set(T.glow);
    this.stars.material.uniforms.uI.value = T.stars;
    this.stage.scene.fog.color.set(T.fog); this.stage.scene.fog.density = T.fogD;
    this.stage.renderer.toneMappingExposure = T.exposure;
    this.envBand.material.color.set(T.glow);
    if (this.envRT) this.envRT.dispose();
    this.envRT = this.pmrem.fromScene(this.envScene, 0, 0.1, 400);
    this.stage.scene.environment = this.envRT.texture;
    this.stage.scene.environmentIntensity = T.env;
    this.T = T;
    return T;
  }
}

/**
 * The sea: a dark translucent sheet over the mirrored city. More transparent
 * looking down at it, more reflective toward the horizon, with slow
 * horizontal ripples breaking the reflection into streaks.
 */
export function waterMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(0x031630) }, uTime: { value: 0 }, uCam: { value: new THREE.Vector3() },
      fogColor: { value: new THREE.Color() }, fogDensity: { value: 0 } },
    vertexShader: `varying vec3 vWP; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vWP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `
      uniform vec3 uColor, uCam, fogColor; uniform float uTime, fogDensity; varying vec3 vWP;
      float h(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
        return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
      void main(){
        vec3 v = normalize(uCam - vWP);
        float fres = pow(1. - clamp(v.y, 0., 1.), 3.);          // grazing: more mirror
        float rip = n(vec2(vWP.x * .02, vWP.z * .35 + uTime * .25)) * .6 + n(vec2(vWP.x * .05 - uTime * .1, vWP.z * .9)) * .4;
        float a = mix(.72, .28, fres) + (rip - .5) * .22;
        float dist = length(uCam - vWP);
        float f = 1. - exp(-fogDensity * fogDensity * dist * dist);
        vec3 c = mix(uColor, fogColor, f);
        gl_FragColor = vec4(c, clamp(mix(a, 1., f), 0., 1.));
      }`,
    transparent: true, depthWrite: false,
  });
}

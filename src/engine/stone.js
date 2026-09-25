// Standing stones: hand-dressed sarsen blocks, rounded by weather and pitted
// by four thousand years of rain. Geometry is displaced per stone from a seed;
// the surface is projected from world space so no two faces tile alike and
// there are no UV seams to give the trick away.

import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { simplex3, fbm } from "./noise.js";
import { stoneMaps } from "./textures.js";

/**
 * A stone of roughly w × h × d metres, standing on y = 0.
 * opts.taper narrows the head, opts.round the edge radius, opts.rough the
 * amplitude of the weathering, opts.lintel dresses it as a horizontal lintel.
 */
export function stoneGeometry(w, h, d, seed, opts = {}) {
  const res = opts.res || 1;
  const sx = Math.max(3, Math.round(w * 3.2 * res)), sy = Math.max(4, Math.round(h * 3.2 * res)), sz = Math.max(3, Math.round(d * 3.2 * res));
  let g = new THREE.BoxGeometry(w, h, d, sx, sy, sz);
  g.deleteAttribute("normal");
  g.deleteAttribute("uv");
  g = mergeVertices(g);
  const n = simplex3(seed * 7 + 1);
  const p = g.attributes.position;
  const round = opts.round ?? Math.min(w, d) * 0.22;
  const taper = opts.taper ?? 0.14;
  const rough = opts.rough ?? 0.07;
  const hw = w / 2 - round, hh = h / 2 - round, hd = d / 2 - round;
  const v = new THREE.Vector3(), c = new THREE.Vector3(), dir = new THREE.Vector3();
  const col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    // rounded box: clamp to the inner box, then push out by the radius
    c.set(THREE.MathUtils.clamp(v.x, -hw, hw), THREE.MathUtils.clamp(v.y, -hh, hh), THREE.MathUtils.clamp(v.z, -hd, hd));
    dir.subVectors(v, c);
    const l = dir.length();
    if (l > 1e-6) v.copy(c).addScaledVector(dir, round / l);
    const t = (v.y + h / 2) / h;                         // 0 at the foot, 1 at the head
    if (!opts.lintel) { const k = 1 - taper * t * t; v.x *= k; v.z *= k; }
    // large-scale irregularity, then weathering
    const big = fbm(n, v.x * 0.22, v.y * 0.22, v.z * 0.22, 3);
    const small = fbm(n, v.x * 1.1 + 9, v.y * 1.1, v.z * 1.1, 4);
    const pit = Math.max(0, n(v.x * 3.1, v.y * 3.1, v.z * 3.1) - 0.35) * 0.9;
    dir.copy(v); dir.y *= opts.lintel ? 1 : 0.35; dir.normalize();
    const lump = fbm(n, v.x * 0.5 + 3, v.y * 0.5, v.z * 0.5, 2);
    const bigK = opts.lintel ? 0.1 : 0.22;
    const amp = big * Math.min(w, d) * bigK + lump * Math.min(w, d) * (opts.lintel ? 0.04 : 0.09) + small * rough * Math.min(w, d) * 2.4 - pit * rough * 1.4;
    v.addScaledVector(dir, amp);
    // the head of an upright is rounder and more weathered than its flanks
    if (!opts.lintel && t > 0.8) v.y -= (Math.abs(v.x) / w + Math.abs(v.z) / d) * (t - 0.8) * h * 0.22 + Math.max(0, big) * (t - 0.8) * h * 0.25;
    // every stone leans and swells a little differently along its height
    if (!opts.lintel) { v.x += Math.sin(t * 2.4 + seed) * w * 0.04; v.z += Math.cos(t * 1.9 + seed * 1.3) * d * 0.05; }
    v.y += h / 2;
    p.setXYZ(i, v.x, v.y, v.z);
    // colour: damp and green at the foot, paler and drier at the head
    const foot = 1 - THREE.MathUtils.smoothstep(t, 0, 0.16);
    col[i * 3] = 0.94 - foot * 0.35 + t * 0.06;
    col[i * 3 + 1] = 0.94 - foot * 0.2 + t * 0.05;
    col[i * 3 + 2] = 0.92 - foot * 0.42 + t * 0.03;
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  g.computeBoundingBox(); g.computeBoundingSphere();
  return g;
}

/** One material for every stone: triplanar sarsen with derivative bump. */
export function stoneMaterial(quality = "high") {
  const maps = stoneMaps(quality === "low" ? 512 : 1024);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, metalness: 0, vertexColors: true, envMapIntensity: 0.75 });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uStone = { value: maps.map };
    sh.uniforms.uStoneR = { value: maps.roughnessMap };
    sh.uniforms.uScale = { value: 0.21 };
    sh.uniforms.uBump = { value: quality === "low" ? 0.6 : 1.4 };
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vWP; varying vec3 vWN;")
      .replace("#include <worldpos_vertex>", `#include <worldpos_vertex>
        vWP = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vWN = normalize(mat3(modelMatrix) * objectNormal);`);
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>
        uniform sampler2D uStone, uStoneR; uniform float uScale, uBump;
        varying vec3 vWP; varying vec3 vWN;
        vec3 triW(){ vec3 b = pow(abs(normalize(vWN)), vec3(4.0)); return b / (b.x + b.y + b.z); }
        vec4 tri(sampler2D t){
          vec3 b = triW(); vec3 p = vWP * uScale;
          return texture2D(t, p.zy) * b.x + texture2D(t, p.xz + 0.37) * b.y + texture2D(t, p.xy + 0.71) * b.z;
        }
        vec3 bumpN(vec3 sp, vec3 sn, float hgt, float s){
          vec3 dx = dFdx(sp), dy = dFdy(sp);
          vec3 r1 = cross(dy, sn), r2 = cross(sn, dx);
          float det = dot(dx, r1);
          vec3 grad = sign(det) * (dFdx(hgt) * s * r1 + dFdy(hgt) * s * r2);
          return normalize(abs(det) * sn - grad);
        }`)
      .replace("#include <map_fragment>", `vec4 stoneC = tri(uStone); diffuseColor.rgb *= stoneC.rgb;`)
      .replace("#include <roughnessmap_fragment>", `vec4 stoneR = tri(uStoneR); float roughnessFactor = roughness * mix(0.82, 1.08, stoneR.g);`)
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
        normal = bumpN(-vViewPosition, normal, stoneR.g, uBump * 0.02);`);
  };
  mat.customProgramCacheKey = () => "stone-tri-v1";
  return mat;
}

// Kit de modelagem procedural compartilhado entre o gerador de GLB (tools/build-models.ts)
// e o fallback em runtime. 1 unidade = 1 metro, Y para cima, frente = +Z.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export type V3 = [number, number, number];

const matCache = new Map<string, THREE.MeshStandardMaterial>();
export function mat(name: string, color: number, opts: { rough?: number; metal?: number; emissive?: number; ei?: number; flat?: boolean } = {}): THREE.MeshStandardMaterial {
  const key = name;
  let m = matCache.get(key);
  if (m) return m;
  m = new THREE.MeshStandardMaterial({
    name,
    color,
    roughness: opts.rough ?? 0.55,
    metalness: opts.metal ?? 0.35,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.ei ?? (opts.emissive ? 1.6 : 0),
    flatShading: opts.flat ?? false,
  });
  matCache.set(key, m);
  return m;
}
export function resetMaterialCache() { matCache.clear(); }

// Paleta de cores por função (GDD §14.6)
export const PAL = {
  zBody: 0xe7dcc4, zBody2: 0xc9bea6, zDark: 0x2d3238, zJoint: 0x4a5058, zCyan: 0x39f0ff,
  rust: 0x8a4a2a, rust2: 0x6b3a22, copper: 0xb46a3c, steel: 0x6d747c, steelDark: 0x3c4148,
  amber: 0xffa62b, red: 0xff3b2f, yellow: 0xf2c230, hazard: 0xe8a317, olive: 0x5b6142,
  rubber: 0x1d1f22, glass: 0x1b2a33, violet: 0xa86bff, green: 0x6ee05a, white: 0xf3efe6,
};

export function rbox(w: number, h: number, d: number, r = 0.03, seg = 2): THREE.BufferGeometry {
  const rr = Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001);
  return new RoundedBoxGeometry(w, h, d, seg, Math.max(0.001, rr));
}

export function mesh(geo: THREE.BufferGeometry, m: THREE.Material, pos: V3 = [0, 0, 0], rot: V3 = [0, 0, 0], name?: string, scale?: V3): THREE.Mesh {
  const o = new THREE.Mesh(geo, m);
  o.position.set(...pos);
  o.rotation.set(rot[0], rot[1], rot[2]);
  if (scale) o.scale.set(...scale);
  o.castShadow = true;
  o.receiveShadow = true;
  if (name) o.name = name;
  return o;
}

export function node(name: string, pos: V3 = [0, 0, 0], parent?: THREE.Object3D): THREE.Object3D {
  const o = new THREE.Object3D();
  o.name = name;
  o.position.set(...pos);
  if (parent) parent.add(o);
  return o;
}

export const cyl = (rt: number, rb: number, h: number, s = 16) => new THREE.CylinderGeometry(rt, rb, h, s);
export const sph = (r: number, ws = 16, hs = 12) => new THREE.SphereGeometry(r, ws, hs);
export const cap = (r: number, l: number, s = 6) => new THREE.CapsuleGeometry(r, l, s, 12);
export const tor = (r: number, t: number, rs = 8, ts = 20, arc = Math.PI * 2) => new THREE.TorusGeometry(r, t, rs, ts, arc);
export const cone = (r: number, h: number, s = 12) => new THREE.ConeGeometry(r, h, s);

// Parafusos/rebites: pequenas esferas em linha
export function rivets(parent: THREE.Object3D, m: THREE.Material, from: V3, to: V3, n: number, r = 0.012) {
  const g = sph(r, 6, 4);
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    parent.add(mesh(g, m, [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t, from[2] + (to[2] - from[2]) * t]));
  }
}

// Mangueira/cabos: tubo ao longo de uma curva
export function hose(parent: THREE.Object3D, m: THREE.Material, pts: V3[], r = 0.02, segs = 12) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
  parent.add(mesh(new THREE.TubeGeometry(curve, segs, r, 6, false), m));
}

const D = THREE.MathUtils.DEG2RAD;

// ---------------- DSL de animação ----------------
// Pose: nome do nó -> rotação Euler em graus. Posições opcionais (offsets somados à posição de repouso).
export type Pose = Record<string, V3>;
export interface Key { t: number; r?: Pose; p?: Record<string, V3>; s?: Record<string, V3> }

export function clip(root: THREE.Object3D, name: string, duration: number, keys: Key[], loop = true): THREE.AnimationClip {
  const rotNodes = new Set<string>();
  const posNodes = new Set<string>();
  const sclNodes = new Set<string>();
  for (const k of keys) {
    Object.keys(k.r ?? {}).forEach((n) => rotNodes.add(n));
    Object.keys(k.p ?? {}).forEach((n) => posNodes.add(n));
    Object.keys(k.s ?? {}).forEach((n) => sclNodes.add(n));
  }
  const ks = [...keys].sort((a, b) => a.t - b.t);
  if (loop && ks[ks.length - 1].t < duration) ks.push({ ...ks[0], t: duration });
  const tracks: THREE.KeyframeTrack[] = [];
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  for (const n of rotNodes) {
    const obj = root.getObjectByName(n);
    if (!obj) throw new Error(`clip ${name}: nó ${n} inexistente`);
    const times: number[] = [];
    const vals: number[] = [];
    let last: V3 = [0, 0, 0];
    for (const k of ks) {
      const v = k.r?.[n] ?? last;
      last = v;
      e.set(v[0] * D, v[1] * D, v[2] * D, 'XYZ');
      q.setFromEuler(e);
      times.push(k.t);
      vals.push(q.x, q.y, q.z, q.w);
    }
    // garante continuidade de sinal dos quaternions
    for (let i = 4; i < vals.length; i += 4) {
      const dot = vals[i] * vals[i - 4] + vals[i + 1] * vals[i - 3] + vals[i + 2] * vals[i - 2] + vals[i + 3] * vals[i - 1];
      if (dot < 0) for (let j = 0; j < 4; j++) vals[i + j] *= -1;
    }
    tracks.push(new THREE.QuaternionKeyframeTrack(`${n}.quaternion`, times, vals));
  }
  for (const n of posNodes) {
    const obj = root.getObjectByName(n);
    if (!obj) throw new Error(`clip ${name}: nó ${n} inexistente`);
    const base = obj.position.clone();
    const times: number[] = [];
    const vals: number[] = [];
    let last: V3 = [0, 0, 0];
    for (const k of ks) {
      const v = k.p?.[n] ?? last;
      last = v;
      times.push(k.t);
      vals.push(base.x + v[0], base.y + v[1], base.z + v[2]);
    }
    tracks.push(new THREE.VectorKeyframeTrack(`${n}.position`, times, vals));
  }
  for (const n of sclNodes) {
    const times: number[] = [];
    const vals: number[] = [];
    let last: V3 = [1, 1, 1];
    for (const k of ks) {
      const v = k.s?.[n] ?? last;
      last = v;
      times.push(k.t);
      vals.push(...v);
    }
    tracks.push(new THREE.VectorKeyframeTrack(`${n}.scale`, times, vals));
  }
  return new THREE.AnimationClip(name, duration, tracks);
}

export interface ModelAsset { scene: THREE.Object3D; clips: THREE.AnimationClip[] }

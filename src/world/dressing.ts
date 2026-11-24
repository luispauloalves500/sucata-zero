// Ambientação do Ferro-Velho 09: decalques, detritos instanciados, mato seco, luz falsa (poças e cones),
// telhado do galpão com raios de claraboia, arena da Prensa Central, poeira e fumaça. Tudo procedural e original.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { LevelBuilder, AABB } from './builder';
import { boxGeo } from './builder';
import type { TexSet } from './textures';
import type { Physics } from '../engine/physics';
import { rng } from '../core/math';

export interface DressCtx {
  scene: THREE.Scene; B: LevelBuilder; physics: Physics; tex: TexSet;
  mats: Record<string, THREE.MeshStandardMaterial>;
  quality: { propDensity: number };
  avoid: { x: number; z: number; r: number }[];
  lamps: { x: number; y: number; z: number; color: number }[];
  animated: { obj: THREE.Object3D; fn: (o: THREE.Object3D, t: number) => void }[];
  bossCenter: THREE.Vector3; arenaRadius: number;
}
export interface Dressing { sparkSpots: THREE.Vector3[]; steamSpots: THREE.Vector3[]; setAlarm: (on: boolean) => void; timeUniform: { value: number } }

// ------------------------------------------------------------------ texturas
function cv(w: number, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')!] as const; }
function T(c: HTMLCanvasElement, srgb = true) { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
function radial(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, stops: [number, string][]) { const g = ctx.createRadialGradient(x, y, 0, x, y, r); for (const [o, col] of stops) g.addColorStop(o, col); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }

function makeDecalTextures() {
  const R = rng(501);
  // óleo: mancha irregular escura com borda iridescente
  const [oc, o] = cv(256);
  for (let i = 0; i < 14; i++) radial(o, 128 + (R() - 0.5) * 110, 128 + (R() - 0.5) * 110, 30 + R() * 50, [[0, 'rgba(12,10,9,0.85)'], [0.7, 'rgba(18,14,12,0.6)'], [1, 'rgba(20,16,14,0)']]);
  for (let i = 0; i < 6; i++) radial(o, 128 + (R() - 0.5) * 120, 128 + (R() - 0.5) * 120, 20 + R() * 25, [[0, 'rgba(60,40,90,0.18)'], [1, 'rgba(30,80,90,0)']]);
  // poça: forma suave quase preta (o reflexo vem do material)
  const [pc, p] = cv(256);
  for (let i = 0; i < 10; i++) radial(p, 128 + (R() - 0.5) * 90, 128 + (R() - 0.5) * 60, 40 + R() * 40, [[0, 'rgba(20,22,24,0.95)'], [0.75, 'rgba(25,26,28,0.85)'], [1, 'rgba(30,30,30,0)']]);
  // terra/ferrugem: manchas grandes para quebrar a repetição
  const [dc, d] = cv(256);
  for (let i = 0; i < 26; i++) { const cols = ['rgba(92,58,34,', 'rgba(60,46,34,', 'rgba(120,78,44,', 'rgba(45,36,30,']; radial(d, 128 + (R() - 0.5) * 150, 128 + (R() - 0.5) * 150, 18 + R() * 50, [[0, cols[i % 4] + '0.5)'], [1, cols[i % 4] + '0)']]); }
  // queimado / marca de impacto
  const [sc, s] = cv(256);
  radial(s, 128, 128, 120, [[0, 'rgba(10,8,6,0.95)'], [0.45, 'rgba(25,18,12,0.7)'], [1, 'rgba(30,20,10,0)']]);
  s.strokeStyle = 'rgba(8,6,5,0.8)'; s.lineWidth = 3;
  for (let k = 0; k < 12; k++) { const a = R() * Math.PI * 2; s.beginPath(); s.moveTo(128, 128); s.lineTo(128 + Math.cos(a) * (60 + R() * 60), 128 + Math.sin(a) * (60 + R() * 60)); s.stroke(); }
  // trilha de pneu (tileável no eixo V)
  const [tc, t] = cv(64, 256);
  for (const x0 of [6, 42]) { t.fillStyle = 'rgba(30,24,18,0.55)'; t.fillRect(x0, 0, 16, 256); t.fillStyle = 'rgba(20,16,12,0.5)'; for (let y = 0; y < 256; y += 12) t.fillRect(x0, y, 16, 5); }
  // seta pintada (orientação)
  const [ac, a] = cv(128);
  a.fillStyle = 'rgba(232,190,40,0.85)'; a.beginPath(); a.moveTo(64, 6); a.lineTo(118, 64); a.lineTo(84, 64); a.lineTo(84, 122); a.lineTo(44, 122); a.lineTo(44, 64); a.lineTo(10, 64); a.closePath(); a.fill();
  const id = a.getImageData(0, 0, 128, 128); for (let i = 0; i < id.data.length; i += 4) if (R() < 0.25) id.data[i + 3] *= 0.4; a.putImageData(id, 0, 0);
  // faixa amarela pintada gasta
  const [lc, l] = cv(32, 256);
  l.fillStyle = 'rgba(225,180,40,0.8)'; l.fillRect(4, 0, 24, 256);
  const il = l.getImageData(0, 0, 32, 256); for (let i = 0; i < il.data.length; i += 4) if (R() < 0.3) il.data[i + 3] *= R() * 0.5; l.putImageData(il, 0, 0);
  // poça de luz (aditiva)
  const [gc, g] = cv(128);
  radial(g, 64, 64, 64, [[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,0.45)'], [1, 'rgba(255,255,255,0)']]);
  // grelha de dreno
  const [rc, r] = cv(128);
  r.fillStyle = '#26282b'; r.fillRect(0, 0, 128, 128); r.fillStyle = '#0b0c0d'; for (let i = 10; i < 120; i += 12) r.fillRect(i, 10, 6, 108); r.strokeStyle = '#4a4e53'; r.lineWidth = 6; r.strokeRect(3, 3, 122, 122);
  // mato seco
  const [wc, w] = cv(128);
  for (let i = 0; i < 30; i++) {
    const x = 20 + R() * 88, h = 50 + R() * 70, lean = (R() - 0.5) * 40;
    w.strokeStyle = ['#6b6a3a', '#7d6d3e', '#5a5a32', '#8a7a48', '#4e5a30'][i % 5]; w.lineWidth = 2 + R() * 2;
    w.beginPath(); w.moveTo(x, 128); w.quadraticCurveTo(x + lean * 0.3, 128 - h * 0.6, x + lean, 128 - h); w.stroke();
  }
  // fumaça
  const [fc, f] = cv(64);
  radial(f, 32, 32, 32, [[0, 'rgba(255,255,255,0.9)'], [0.5, 'rgba(255,255,255,0.35)'], [1, 'rgba(255,255,255,0)']]);
  const out = { oil: T(oc), puddle: T(pc), dirt: T(dc), scorch: T(sc), track: T(tc), arrow: T(ac), line: T(lc), glow: T(gc), grate: T(rc), weed: T(wc), smoke: T(fc) };
  out.track.wrapT = THREE.RepeatWrapping; out.line.wrapT = THREE.RepeatWrapping;
  return out;
}

// ------------------------------------------------------------------ shaders de efeito
const coneVS = `varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying vec3 vCol;
#ifdef VCOL
attribute vec3 color;
#endif
void main(){ vUv=uv;
#ifdef VCOL
vCol = color;
#else
vCol = vec3(1.0);
#endif
 vec4 mv=modelViewMatrix*vec4(position,1.0); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`;
const coneFS = `uniform vec3 color; uniform float opacity; varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying vec3 vCol;
void main(){ float f = pow(abs(dot(vN,vV)), 1.6); float v = smoothstep(0.0,0.25,vUv.y) * pow(vUv.y, 0.6); gl_FragColor = vec4(color*vCol, f*v*opacity); }`;
/** lotes estáticos de efeitos aditivos (1 draw call cada) */
class AddBatch {
  geos: THREE.BufferGeometry[] = [];
  add(g: THREE.BufferGeometry, m: THREE.Matrix4, color: number, k: number) {
    const gg = (g.index ? g.toNonIndexed() : g.clone()); gg.applyMatrix4(m);
    for (const a of Object.keys(gg.attributes)) if (!['position', 'normal', 'uv'].includes(a)) gg.deleteAttribute(a);
    const c = new THREE.Color(color).multiplyScalar(k); const n = gg.attributes.position.count; const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
    gg.setAttribute('color', new THREE.BufferAttribute(arr, 3)); this.geos.push(gg);
  }
  build(scene: THREE.Scene, mat: THREE.Material, order: number) {
    if (!this.geos.length) return;
    const g = mergeGeometries(this.geos)!; g.computeBoundingSphere();
    const m = new THREE.Mesh(g, mat); m.renderOrder = order; m.matrixAutoUpdate = false; scene.add(m);
  }
}
function volMat(color: number, opacity: number, vcol = false) {
  return new THREE.ShaderMaterial({ defines: vcol ? { VCOL: 1 } : {}, vertexShader: coneVS, fragmentShader: coneFS, uniforms: { color: { value: new THREE.Color(color) }, opacity: { value: opacity } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
}

export function dressW01(c: DressCtx): Dressing {
  const { scene, B, mats, tex, quality } = c;
  const dens = quality.propDensity;
  const R = rng(4242);
  const dt = makeDecalTextures();
  const timeU = { value: 0 };
  const sparkSpots: THREE.Vector3[] = [];
  const steamSpots: THREE.Vector3[] = [];
  const obst: AABB[] = B.obstacles.filter((o) => o.minY < 1.0);
  const belts = [68, 81, 106];
  const free = (x: number, z: number, m = 0.4) => {
    if (obst.some((o) => x > o.minX - m && x < o.maxX + m && z > o.minZ - m && z < o.maxZ + m)) return false;
    if (c.avoid.some((a) => Math.hypot(a.x - x, a.z - z) < a.r)) return false;
    if (z > 58.2 && z < 120 && belts.some((b) => Math.abs(z - b) < 2.3)) return false;
    return true;
  };
  // regiões andáveis por setor (para espalhar coisas)
  const regions: { x0: number; x1: number; z0: number; z1: number; w: number }[] = [
    { x0: -11, x1: 12, z0: -13, z1: 10, w: 1 },
    { x0: -21, x1: 21, z0: 12.5, z1: 57, w: 2 },
    { x0: -23, x1: 23, z0: 59.5, z1: 119, w: 2.2 },
    { x0: -21, x1: 21, z0: 121.5, z1: 171, w: 2 },
    { x0: -3.5, x1: 3.5, z0: 172.5, z1: 179, w: 0.3 },
  ];
  const wsum = regions.reduce((a, r) => a + r.w, 0);
  const randomSpot = (m = 0.4, tries = 30): [number, number] | null => {
    for (let i = 0; i < tries; i++) {
      let k = R() * wsum, rg = regions[0];
      for (const r of regions) { k -= r.w; if (k <= 0) { rg = r; break; } }
      const x = rg.x0 + R() * (rg.x1 - rg.x0), z = rg.z0 + R() * (rg.z1 - rg.z0);
      if (free(x, z, m)) return [x, z];
    }
    return null;
  };

  // ------------------------------------------------ materiais: relevo + macro-variação do chão
  for (const k of ['c0', 'c1', 'c2', 'c3', 'c4']) { const m = mats[k]; m.bumpMap = m.map; m.bumpScale = 2.2; m.needsUpdate = true; }
  for (const k of ['rust', 'plate', 'concrete']) { const m = mats[k]; m.bumpMap = m.map; m.bumpScale = 1.4; m.needsUpdate = true; }
  const macroPatch = (m: THREE.MeshStandardMaterial, scaleA: number, scaleB: number, lo: number, hi: number) => {
    m.onBeforeCompile = (sh) => {
      sh.uniforms.macroMap = { value: tex.macro };
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vMacroW;').replace('#include <project_vertex>', '#include <project_vertex>\nvMacroW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D macroMap; varying vec3 vMacroW;')
        .replace('#include <map_fragment>', `#include <map_fragment>
          float mA = texture2D(macroMap, vMacroW.xz * ${scaleA.toFixed(4)}).r;
          float mB = texture2D(macroMap, vMacroW.xz * ${scaleB.toFixed(4)} + vec2(0.37, 0.71)).g;
          diffuseColor.rgb *= mix(${lo.toFixed(2)}, ${hi.toFixed(2)}, mA) * mix(0.88, 1.08, mB);`)
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor - (1.0 - mA) * 0.25, 0.3, 1.0);');
    };
    m.customProgramCacheKey = () => 'macro' + scaleA;
    m.needsUpdate = true;
  };
  macroPatch(mats.ground, 0.009, 0.037, 0.62, 1.22);
  mats.ground.bumpMap = mats.ground.map; mats.ground.bumpScale = 2.5;

  // ------------------------------------------------ pisos internos
  const slabM = new THREE.MeshStandardMaterial({ name: 'slab', map: tex.slab, bumpMap: tex.slab, bumpScale: 1.2, roughness: 0.82, metalness: 0.05 });
  slabM.map = tex.slab.clone(); slabM.map.repeat.set(0.125, 0.125); slabM.map.needsUpdate = true; slabM.bumpMap = slabM.map;
  macroPatch(slabM, 0.02, 0.06, 0.75, 1.12);
  slabM.polygonOffset = true; slabM.polygonOffsetFactor = -1; slabM.polygonOffsetUnits = -1;
  const slabGeo = (w: number, d: number) => { const g = new THREE.PlaneGeometry(w, d); const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w, uv.getY(i) * d); return g; };
  B.addGeo(slabGeo(44, 51), slabM, { x: 0, y: 0.012, z: 146 }, 0, -Math.PI / 2, 1, false);
  B.addGeo(slabGeo(8, 8), slabM, { x: 0, y: 0.012, z: 176 }, 0, -Math.PI / 2, 1, false);

  // ------------------------------------------------ decalques no chão
  const decal = (map: THREE.Texture, o: { rough?: number; metal?: number; color?: number; blend?: THREE.Blending; emissive?: number } = {}) => {
    const m = new THREE.MeshStandardMaterial({ map, transparent: true, depthWrite: false, roughness: o.rough ?? 0.9, metalness: o.metal ?? 0, color: o.color ?? 0xffffff, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
    if (o.emissive) { m.emissive = new THREE.Color(o.emissive); m.emissiveMap = map; }
    return m;
  };
  const dm = {
    oil: decal(dt.oil, { rough: 0.18, metal: 0.2 }), puddle: decal(dt.puddle, { rough: 0.04, metal: 0.1 }), dirt: decal(dt.dirt, { rough: 1 }), scorch: decal(dt.scorch, { rough: 1 }),
    track: decal(dt.track, { rough: 0.95 }), arrow: decal(dt.arrow, { rough: 0.7 }), line: decal(dt.line, { rough: 0.7 }), grate: decal(dt.grate, { rough: 0.5, metal: 0.8 }),
  };
  const plane = new THREE.PlaneGeometry(1, 1);
  const putDecal = (m: THREE.Material, x: number, z: number, sx: number, sz: number, rot = R() * Math.PI * 2, y = 0.02, vRep = 1) => {
    const g = plane.clone(); g.scale(sx, sz, 1);
    if (vRep !== 1) { const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * vRep); }
    B.addGeo(g, m, { x, y, z }, rot, -Math.PI / 2, 1, false);
  };
  for (let i = 0; i < Math.round(46 * dens); i++) { const p = randomSpot(0); if (p) putDecal(dm.dirt, p[0], p[1], 4 + R() * 6, 4 + R() * 6, undefined, 0.016); }
  for (let i = 0; i < Math.round(34 * dens); i++) { const p = randomSpot(0.2); if (p) { const s = 1 + R() * 2.4; putDecal(dm.oil, p[0], p[1], s, s * (0.7 + R() * 0.5)); } }
  for (let i = 0; i < Math.round(12 * dens); i++) { const p = randomSpot(0.6); if (p) { const s = 1.6 + R() * 2.6; putDecal(dm.puddle, p[0], p[1], s * 1.4, s, undefined, 0.022); } }
  for (let i = 0; i < Math.round(8 * dens); i++) { const p = randomSpot(0.4); if (p) { const s = 1.5 + R() * 2; putDecal(dm.scorch, p[0], p[1], s, s); } }
  // trilhas de pneu (pátio e galpão)
  for (const [x, z, len, rot] of [[6, 30, 30, 0.05], [-1, 44, 22, -0.08], [8, 140, 34, 0.02], [-7, 150, 24, 0.12], [14, 95, 18, Math.PI / 2], [3, 0, 16, 0.3]] as const) putDecal(dm.track, x, z, 2.2, len, rot, 0.018, len / 4);
  // setas pintadas apontando o caminho principal
  for (const [x, z, rot] of [[0, 4, 0], [0, 8.5, 0], [-0.5, 20, 0], [0, 50, 0], [0, 115, 0], [0, 127, 0], [0, 168, 0]] as const) putDecal(dm.arrow, x, z, 1.6, 1.6, rot + Math.PI, 0.021);
  // faixas de corredor no galpão (piso de oficina)
  for (const x of [-3.2, 3.2]) putDecal(dm.line, x, 146, 0.25, 50, 0, 0.022, 8);
  for (const z of [128, 140, 152, 164]) putDecal(dm.line, 0, z, 0.25, 6.4, Math.PI / 2, 0.022, 1);
  // drenos
  for (const [x, z] of [[-8, 30], [10, 50], [-14, 140], [14, 160], [0, 6]] as const) putDecal(dm.grate, x, z, 1.2, 1.2, 0, 0.024);

  // ------------------------------------------------ detritos instanciados
  const debrisMat = new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.6, vertexColors: false });
  const types: { geo: THREE.BufferGeometry; n: number; y: number; s: [number, number]; flat?: boolean }[] = [
    { geo: new THREE.CylinderGeometry(0.07, 0.07, 0.05, 6), n: 160, y: 0.025, s: [0.7, 1.6] }, // porcas
    { geo: new THREE.BoxGeometry(0.6, 0.03, 0.4), n: 130, y: 0.02, s: [0.5, 2.2] }, // chapinhas
    { geo: new THREE.CylinderGeometry(0.06, 0.06, 1.2, 8).rotateZ(Math.PI / 2), n: 60, y: 0.06, s: [0.6, 1.8] }, // canos
    { geo: new THREE.CylinderGeometry(0.11, 0.11, 0.3, 10).rotateZ(Math.PI / 2), n: 50, y: 0.11, s: [0.8, 1.3] }, // latas
    { geo: new THREE.BoxGeometry(1.6, 0.06, 0.22), n: 50, y: 0.03, s: [0.7, 1.4] }, // tábuas
    { geo: new THREE.TorusGeometry(0.38, 0.15, 8, 14).rotateX(Math.PI / 2), n: 26, y: 0.15, s: [0.8, 1.2] }, // pneus deitados
    { geo: new THREE.BoxGeometry(0.25, 0.25, 0.25), n: 80, y: 0.1, s: [0.5, 1.8] }, // blocos
  ];
  const palette = [0x8a4a2a, 0x6b3a22, 0x6d747c, 0x3c4148, 0xb46a3c, 0xd9a21b, 0x2f4f66, 0x8f2a1c, 0x1c1d1f, 0x9a9488];
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
  types.forEach((t, ti) => {
    const n = Math.round(t.n * dens);
    const im = new THREE.InstancedMesh(t.geo, debrisMat, n);
    let k = 0;
    for (let i = 0; i < n; i++) {
      const p = randomSpot(0.1, 12); if (!p) continue;
      const s = t.s[0] + R() * (t.s[1] - t.s[0]);
      e.set((R() - 0.5) * 0.25, R() * Math.PI * 2, (R() - 0.5) * 0.25); q.setFromEuler(e);
      m4.compose(v.set(p[0], t.y * s, p[1]), q, sc.set(s, s, s));
      im.setMatrixAt(k, m4);
      col.setHex(ti === 5 ? 0x1c1d1f : ti === 4 ? 0x5a4632 : palette[Math.floor(R() * palette.length)]);
      im.setColorAt(k, col); k++;
    }
    im.count = k; im.receiveShadow = true; im.castShadow = ti === 5 || ti === 4;
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.computeBoundingSphere();
    scene.add(im);
  });

  // ------------------------------------------------ mato seco (balança com o vento)
  {
    const g1 = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
    const g2 = g1.clone().rotateY(Math.PI / 2);
    const g3 = g1.clone().rotateY(Math.PI / 4);
    const wg = mergeGeometries([g1, g2, g3])!;
    const wm = new THREE.MeshStandardMaterial({ map: dt.weed, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 1, metalness: 0 });
    wm.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = timeU;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;').replace('#include <begin_vertex>', `#include <begin_vertex>
        #ifdef USE_INSTANCING
        float ph = instanceMatrix[3].x * 0.7 + instanceMatrix[3].z * 0.43;
        #else
        float ph = 0.0;
        #endif
        transformed.x += sin(uTime * 1.7 + ph) * 0.09 * uv.y; transformed.z += cos(uTime * 1.3 + ph) * 0.05 * uv.y;`);
    };
    const n = Math.round(380 * dens);
    const im = new THREE.InstancedMesh(wg, wm, n);
    let k = 0;
    for (let i = 0; i < n * 3 && k < n; i++) {
      // preferência: junto a paredes/obstáculos (onde o mato cresce)
      const o = obst[Math.floor(R() * obst.length)];
      let x: number, z: number;
      if (R() < 0.75 && o) { const side = Math.floor(R() * 4); x = side < 2 ? (side ? o.maxX + 0.25 + R() * 0.5 : o.minX - 0.25 - R() * 0.5) : o.minX + R() * (o.maxX - o.minX); z = side >= 2 ? (side === 2 ? o.maxZ + 0.25 + R() * 0.5 : o.minZ - 0.25 - R() * 0.5) : o.minZ + R() * (o.maxZ - o.minZ); }
      else { const p = randomSpot(0.2, 6); if (!p) continue; [x, z] = p; }
      if (z > 120 && z < 172.4 && Math.abs(x) < 22) continue; // galpão: piso de concreto, sem mato no meio
      if (Math.hypot(x - c.bossCenter.x, z - c.bossCenter.z) < c.arenaRadius - 0.5) continue;
      if (!free(x, z, 0.05)) continue;
      const s = 0.45 + R() * 0.75;
      e.set(0, R() * Math.PI, 0); q.setFromEuler(e);
      m4.compose(v.set(x, 0, z), q, sc.set(s * (0.8 + R() * 0.6), s, s));
      im.setMatrixAt(k, m4); col.setHSL(0.12 + R() * 0.06, 0.25 + R() * 0.2, 0.42 + R() * 0.25); im.setColorAt(k, col); k++;
    }
    im.count = k; im.receiveShadow = true; im.castShadow = false;
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.computeBoundingSphere();
    scene.add(im);
  }

  // ------------------------------------------------ luz falsa: poças de luz e cones volumétricos
  const poolBatch = new AddBatch(), volBatch = new AddBatch();
  const mtx = new THREE.Matrix4();
  const poolGeo = new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2);
  const pool = (x: number, z: number, r: number, color: number, a: number) => { poolBatch.add(poolGeo, mtx.compose(new THREE.Vector3(x, 0.03, z), new THREE.Quaternion(), new THREE.Vector3(r, 1, r)), color, a); };
  const cone = (x: number, y: number, z: number, h: number, r: number, color: number, a: number) => {
    const g = new THREE.CylinderGeometry(0.15, r, h, 20, 1, true).translate(0, -h / 2, 0);
    volBatch.add(g, mtx.makeTranslation(x, y, z), color, a);
  };
  for (const l of c.lamps) { pool(l.x, l.z, 3.2, l.color, 0.32); cone(l.x, l.y, l.z, l.y, 2.4, l.color, 0.16); }

  // ------------------------------------------------ galpão: telhado com claraboias, raios de luz, bancadas e prateleiras
  {
    const roofM = mats.c4;
    const zA = 121, zB = 171.5, gaps = [[136.5, 139.5], [152.5, 155.5]];
    let z0 = zA;
    for (const [g0, g1] of [...gaps, [zB, zB]]) {
      const len = g0 - z0;
      if (len > 0.5) for (const sx of [-1, 1]) B.addGeo(boxGeo(15.5, 0.12, len, 1 / 6), roofM, { x: sx * 7.6, y: 10.3 + 0.9, z: z0 + len / 2 }, 0, 0, 1, true);
      z0 = g1;
    }
    // cumeeira e caibros
    B.addGeo(boxGeo(0.5, 0.5, 51, 1), mats.dark, { x: 0, y: 11.35, z: 146 }, 0, 0, 1, true);
    for (const sx of [-1, 1]) for (let z = 122; z <= 170; z += 4) B.addGeo(boxGeo(0.18, 0.18, 0.2, 1).scale(1, 1, 1), mats.dark, { x: sx * 14.6, y: 10.2, z });
    for (let z = 122; z <= 170; z += 8) for (const sx of [-1, 1]) { const g = boxGeo(15.6, 0.22, 0.22, 1); B.addGeo(g, mats.bluePaint, { x: sx * 7.4, y: 10.0 + 0.6, z }, 0, 0, 1, true); }
    // faixas de chapa nas laterais (meia-parede acima dos contêineres)
    for (const sx of [-1, 1]) B.addGeo(boxGeo(0.12, 4.0, 51, 1 / 5), mats.c4, { x: sx * 15.4, y: 9.0, z: 146 }, 0, 0, 1, true);
    // raios de luz das claraboias (inclinados conforme o sol)
    for (const [g0, g1] of gaps) for (const x of [-9, -3, 3, 9]) {
      const h = 11.5;
      const g = new THREE.CylinderGeometry(1.5, 1.7, h, 14, 1, true).translate(0, -h / 2, 0);
      volBatch.add(g, mtx.compose(new THREE.Vector3(x, 11.2, (g0 + g1) / 2), new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.32, 0, 0.18)), new THREE.Vector3(1, 1, ((g1 - g0) * 0.9) / 3.2)), 0xffd9a0, 0.09);
      pool(x - 2, (g0 + g1) / 2 + 3.6, 2.4, 0xffd9a0, 0.2);
    }
    // prateleiras de peças (com colisão) e bancada lateral
    const shelf = (x: number, z: number, rotY: number) => {
      B.box(x, 1.75, z, 4.6, 3.5, 0.9, mats.dark, { rotY, uv: 0.5 });
      for (const y of [0.8, 1.7, 2.6]) B.addGeo(boxGeo(4.7, 0.08, 1.0, 1), mats.yellowPaint, { x, y, z }, rotY);
      for (let i = 0; i < 9; i++) { const yy = [0.8, 1.7, 2.6][i % 3] + 0.2; const dx = (R() - 0.5) * 3.8; const cosr = Math.cos(rotY), sinr = Math.sin(rotY); const m = [mats.rust, mats.redPaint, mats.bluePaint, mats.steel][i % 4]; B.addGeo(boxGeo(0.4 + R() * 0.4, 0.35, 0.5, 1), m, { x: x + dx * cosr, y: yy, z: z - dx * sinr }, rotY); }
    };
    shelf(20.3, 138, Math.PI / 2); shelf(20.3, 158.5, Math.PI / 2); shelf(-20.3, 146, Math.PI / 2);
    // calhas de cabos e correntes penduradas
    for (const z of [134, 150, 166]) {
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 4, 5), mats.dark); chain.position.set(-8 + (z % 7), 7.9, z); scene.add(chain);
      const hook = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.05, 6, 10, Math.PI * 1.4), mats.steel); hook.position.set(-8 + (z % 7), 5.8, z); scene.add(hook);
      c.animated.push({ obj: chain, fn: (o, t) => { o.rotation.z = Math.sin(t * 0.8 + z) * 0.04; } });
    }
    B.addGeo(boxGeo(0.4, 0.15, 50, 1), mats.dark, { x: 12.5, y: 8.4, z: 146 }, 0, 0, 1, false);
    // lâmpadas do galpão: cones âmbar
    for (const [x, z] of [[-6, 138], [6, 154], [-6, 154], [6, 138]] as const) { cone(x, 7.8, z, 7.8, 2.8, 0xffb060, 0.12); pool(x, z, 3.6, 0xffb060, 0.3); }
    sparkSpots.push(new THREE.Vector3(12.5, 8.3, 141), new THREE.Vector3(-18, 3.6, 134));
  }

  // ------------------------------------------------ arena da Prensa Central
  const alarmMats: THREE.MeshStandardMaterial[] = [];
  const alarmCones: THREE.Mesh[] = [];
  {
    const bc = c.bossCenter, AR = c.arenaRadius;
    // dreno central e marcas de esmagamento
    putDecal(dm.grate, bc.x, bc.z, 3.2, 3.2, 0, 0.03);
    const ringG = new THREE.RingGeometry(1.8, 2.2, 32); const rm = new THREE.Mesh(ringG, mats.hazard); rm.rotation.x = -Math.PI / 2; rm.position.set(bc.x, 0.035, bc.z); scene.add(rm);
    for (let i = 0; i < 9; i++) { const a = R() * Math.PI * 2, d = 4 + R() * (AR - 7); const s = 2 + R() * 3; putDecal(dm.scorch, bc.x + Math.cos(a) * d, bc.z + Math.sin(a) * d, s, s, undefined, 0.032); }
    for (let i = 0; i < 6; i++) { const a = R() * Math.PI * 2, d = 3 + R() * (AR - 5); const s = 1.4 + R() * 2; putDecal(dm.oil, bc.x + Math.cos(a) * d, bc.z + Math.sin(a) * d, s, s * 0.8, undefined, 0.033); }
    for (let i = 0; i < 3; i++) { const a = R() * Math.PI * 2, d = 6 + R() * 8; const s = 2.2 + R() * 1.5; putDecal(dm.puddle, bc.x + Math.cos(a) * d, bc.z + Math.sin(a) * d, s * 1.3, s, undefined, 0.034); }
    // carcaças achatadas na borda (sem colisão — não atrapalham a luta)
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.2; if (Math.abs(Math.sin(a)) < 0.3 && Math.cos(a) < 0) continue;
      const x = bc.x + Math.sin(a) * (AR - 1.6), z = bc.z + Math.cos(a) * (AR - 1.6);
      if (Math.abs(x) < 4.5) continue;
      B.addGeo(boxGeo(2.6, 0.35, 1.6, 0.6), [mats.redPaint, mats.bluePaint, mats.yellowPaint, mats.rust][i % 4], { x, y: 0.18, z }, a + 0.4, 0, 1, true);
      B.addGeo(boxGeo(2.2, 0.12, 1.3, 1), mats.dark, { x, y: 0.42, z }, a + 0.5, 0.05);
    }
    // giroflex sobre os contêineres do anel
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      const x = bc.x + Math.sin(a) * (AR + 1.3), z = bc.z + Math.cos(a) * (AR + 1.3);
      const g = new THREE.Group(); g.position.set(x, 5.25, z);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.4, 0.2, 12), mats.dark); g.add(base);
      const lm = new THREE.MeshStandardMaterial({ color: 0xffa62b, emissive: 0xffa62b, emissiveIntensity: 2.2, roughness: 0.3, transparent: true, opacity: 0.9 });
      alarmMats.push(lm);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), lm); dome.position.y = 0.09; g.add(dome);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 2.2, 7, 16, 1, true).translate(0, -3.5, 0).rotateZ(Math.PI / 2), volMat(0xffa62b, 0.4)); beam.position.y = 0.25; g.add(beam); alarmCones.push(beam);
      scene.add(g);
      c.animated.push({ obj: beam, fn: (o, t) => { o.rotation.y = t * 3 + i; } });
    }
    // torres de holofote
    const floodM = new THREE.MeshStandardMaterial({ name: 'floodLamp', color: 0xfff1d0, emissive: 0xfff1d0, emissiveIntensity: 3 });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const x = bc.x + Math.sin(a) * (AR + 4.2), z = bc.z + Math.cos(a) * (AR + 4.2);
      B.addGeo(boxGeo(0.5, 13, 0.5, 1), mats.dark, { x, y: 6.5, z });
      for (let k = 1; k < 6; k++) B.addGeo(boxGeo(0.9, 0.08, 0.08, 1), mats.dark, { x, y: k * 2.2, z }, a);
      B.addGeo(boxGeo(2.4, 1.0, 0.5, 1), mats.dark, { x: x - Math.sin(a) * 0.5, y: 13, z: z - Math.cos(a) * 0.5 }, a);
      for (const dx of [-0.7, 0, 0.7]) { const cx = x - Math.sin(a) * 0.78 + Math.cos(a) * dx, cz = z - Math.cos(a) * 0.78 - Math.sin(a) * dx; B.addGeo(new THREE.CircleGeometry(0.3, 12), floodM, { x: cx, y: 13, z: cz }, a + Math.PI, 0, 1, false); }
      // feixe inclinado rumo ao centro
      const tx = bc.x + Math.sin(a) * 6, tz = bc.z + Math.cos(a) * 6;
      const dx = tx - x, dz = tz - z, dy = -13, L = Math.hypot(dx, dy, dz);
      const g = new THREE.CylinderGeometry(0.4, 3.2, L, 20, 1, true).translate(0, -L / 2, 0);
      volBatch.add(g, mtx.compose(new THREE.Vector3(x - Math.sin(a) * 0.8, 13, z - Math.cos(a) * 0.8), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), new THREE.Vector3(dx, dy, dz).normalize()), new THREE.Vector3(1, 1, 1)), 0xfff1d0, 0.12);
      pool(tx, tz, 4.2, 0xfff1d0, 0.22);
    }
    // Prensa Central (máquina gigante a oeste, visível acima do anel)
    const px = bc.x - 31, pz = bc.z + 2;
    B.addGeo(boxGeo(12, 2.2, 10, 0.4), mats.dark, { x: px, y: 1.1, z: pz });
    for (const dz of [-4, 4]) { B.addGeo(boxGeo(2.2, 20, 2.2, 0.4), mats.yellowPaint, { x: px, y: 10, z: pz + dz }); B.addGeo(boxGeo(2.3, 0.6, 2.3, 1), mats.hazard, { x: px, y: 3, z: pz + dz }); }
    B.addGeo(boxGeo(5, 3, 11, 0.4), mats.yellowPaint, { x: px, y: 21, z: pz });
    B.addGeo(boxGeo(5.2, 0.6, 11.2, 1), mats.hazard, { x: px, y: 19.6, z: pz });
    for (const dz of [-2, 2]) B.addGeo(new THREE.CylinderGeometry(0.5, 0.5, 6, 12), mats.steel, { x: px, y: 17, z: pz + dz });
    const head = new THREE.Group(); head.position.set(px, 12, pz);
    const hb = new THREE.Mesh(boxGeo(7, 3.2, 7, 0.4), mats.steel); hb.castShadow = true; head.add(hb);
    const hs = new THREE.Mesh(boxGeo(7.1, 0.5, 7.1, 1), mats.hazard); hs.position.y = -1.4; head.add(hs);
    for (const dz of [-1.5, 1.5]) { const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 6, 10), mats.steel); rod.position.set(0, 4.5, dz); head.add(rod); }
    const eye = new THREE.Mesh(boxGeo(3, 0.3, 0.1, 1), mats.red); eye.position.set(3.55, 0.6, 0); eye.rotation.y = Math.PI / 2; head.add(eye);
    scene.add(head);
    c.animated.push({ obj: head, fn: (o, t) => { const k = (t % 5) / 5; o.position.y = k < 0.55 ? 6.2 + (k / 0.55) * 5.8 : k < 0.62 ? 12 - ((k - 0.55) / 0.07) * 5.8 : 6.2; } });
    steamSpots.push(new THREE.Vector3(px + 2, 6, pz), new THREE.Vector3(px, 23, pz + 3));
    // chaminé a leste com fumaça
    const sx = bc.x + 30, sz = bc.z - 8;
    B.addGeo(new THREE.CylinderGeometry(1.4, 1.9, 24, 16), mats.rust, { x: sx, y: 12, z: sz });
    for (const y of [6, 14, 22]) B.addGeo(new THREE.CylinderGeometry(1.95, 1.95, 0.5, 16), mats.hazard, { x: sx, y, z: sz });
    steamSpots.push(new THREE.Vector3(sx, 24.5, sz));
    sparkSpots.push(new THREE.Vector3(px + 3.4, 6.2, pz - 2), new THREE.Vector3(bc.x + 12, 5.2, bc.z + 14));
  }

  // ------------------------------------------------ poeira em suspensão (acompanha a câmera, 1 draw call)
  {
    const N = Math.round(700 * dens);
    const pos = new Float32Array(N * 3), seed = new Float32Array(N);
    for (let i = 0; i < N; i++) { pos[i * 3] = R() * 40; pos[i * 3 + 1] = R() * 9; pos[i * 3 + 2] = R() * 40; seed[i] = R(); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
    const m = new THREE.ShaderMaterial({
      uniforms: { uTime: timeU, uCam: { value: new THREE.Vector3() }, uScale: { value: 500 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute float seed; uniform float uTime; uniform vec3 uCam; uniform float uScale; varying float vA;
        void main(){ vec3 p = position; p.x += uTime*(0.25+seed*0.3) + sin(uTime*0.6+seed*30.0)*0.6; p.z += uTime*0.12 + cos(uTime*0.5+seed*20.0)*0.6; p.y += sin(uTime*0.4+seed*10.0)*0.4;
          p.x = mod(p.x - uCam.x + 20.0, 40.0) + uCam.x - 20.0; p.z = mod(p.z - uCam.z + 20.0, 40.0) + uCam.z - 20.0; p.y = mod(p.y, 9.0);
          vec4 mv = modelViewMatrix*vec4(p,1.0); float d = -mv.z; vA = smoothstep(0.5,3.0,d)*(1.0-smoothstep(12.0,20.0,d))*(0.35+0.65*seed);
          gl_PointSize = (0.025+seed*0.035)*uScale/max(0.5,d); gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `varying float vA; void main(){ vec2 d=gl_PointCoord-0.5; float a=smoothstep(0.5,0.0,length(d))*vA; gl_FragColor=vec4(vec3(1.0,0.88,0.7)*0.55, a); }`,
    });
    const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.renderOrder = 6; scene.add(pts);
    c.animated.push({ obj: pts, fn: () => { const cam = (scene as any).userData.camPos as THREE.Vector3 | undefined; if (cam) m.uniforms.uCam.value.copy(cam); m.uniforms.uScale.value = innerHeight * 0.9; } });
  }

  // ------------------------------------------------ colunas de fumaça ao longe (animadas na GPU)
  {
    const sources = [[-70, 60, 1.2], [80, 140, 1], [-90, 210, 1.4], [60, 20, 0.8], [-50, 260, 1], [c.bossCenter.x + 30, c.bossCenter.z - 8, 0.6]] as const;
    const per = 22; const N = sources.length * per;
    const pos = new Float32Array(N * 3), seed = new Float32Array(N), scl = new Float32Array(N);
    sources.forEach((s, si) => { for (let k = 0; k < per; k++) { const i = si * per + k; pos[i * 3] = s[0]; pos[i * 3 + 1] = si === 5 ? 24.5 : 6; pos[i * 3 + 2] = s[1]; seed[i] = k / per + R() * 0.03; scl[i] = s[2]; } });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('seed', new THREE.BufferAttribute(seed, 1)); g.setAttribute('scl', new THREE.BufferAttribute(scl, 1));
    const m = new THREE.ShaderMaterial({
      uniforms: { uTime: timeU, map: { value: dt.smoke }, uScale: { value: 500 } }, transparent: true, depthWrite: false,
      vertexShader: `attribute float seed; attribute float scl; uniform float uTime; uniform float uScale; varying float vA; varying float vK;
        void main(){ float k = fract(seed + uTime*0.035); vK = k; vec3 p = position + vec3(k*k*22.0*scl, k*38.0*scl, k*6.0*scl);
          vec4 mv = modelViewMatrix*vec4(p,1.0); vA = sin(k*3.14159)*0.55;
          gl_PointSize = (3.0+k*14.0)*scl*uScale/max(1.0,-mv.z); gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `uniform sampler2D map; varying float vA; varying float vK; void main(){ vec4 t = texture2D(map, gl_PointCoord); vec3 col = mix(vec3(0.28,0.24,0.21), vec3(0.62,0.55,0.48), vK); gl_FragColor = vec4(col, t.a*vA); }`,
    });
    const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.renderOrder = 1; scene.add(pts);
    c.animated.push({ obj: pts, fn: () => { m.uniforms.uScale.value = innerHeight * 0.9; } });
  }

  poolBatch.build(scene, new THREE.MeshBasicMaterial({ map: dt.glow, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 }), 2);
  volBatch.build(scene, volMat(0xffffff, 1, true), 3);
  c.animated.push({ obj: scene, fn: (_o, t) => { timeU.value = t; } });
  const setAlarm = (on: boolean) => {
    for (const m of alarmMats) { m.color.setHex(on ? 0xff3b2f : 0xffa62b); m.emissive.setHex(on ? 0xff3b2f : 0xffa62b); m.emissiveIntensity = on ? 3.2 : 2.2; }
    for (const b of alarmCones) (b.material as THREE.ShaderMaterial).uniforms.color.value.setHex(on ? 0xff3b2f : 0xffa62b);
  };
  return { sparkSpots, steamSpots, setAlarm, timeUniform: timeU };
}

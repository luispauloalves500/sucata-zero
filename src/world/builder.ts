// Construtor de cenário: geometria mesclada por material + colisores Rapier + grade de navegação.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Physics } from '../engine/physics';
import type RAPIER from '@dimforge/rapier3d-compat';

export interface AABB { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number }

/** caixa com UV em escala de mundo (texel = 1/uvScale m) */
export function boxGeo(w: number, h: number, d: number, uvScale = 0.5): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const n = g.attributes.normal as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) {
    const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i));
    let su = d, sv = h;
    if (nx > 0.5) { su = d; sv = h; } else if (ny > 0.5) { su = w; sv = d; } else { su = w; sv = h; }
    uv.setXY(i, uv.getX(i) * su * uvScale, uv.getY(i) * sv * uvScale);
  }
  return g;
}

export class LevelBuilder {
  private buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
  private noShadowBuckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
  obstacles: AABB[] = [];
  colliders: RAPIER.Collider[] = [];
  group = new THREE.Group();
  private m4 = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  constructor(public physics: Physics) {}

  addGeo(geo: THREE.BufferGeometry, mat: THREE.Material, pos: { x: number; y: number; z: number }, rotY = 0, rotX = 0, scale = 1, castShadow = true) {
    const g = geo.clone();
    this.q.setFromEuler(new THREE.Euler(rotX, rotY, 0, 'YXZ'));
    this.m4.compose(new THREE.Vector3(pos.x, pos.y, pos.z), this.q, new THREE.Vector3(scale, scale, scale));
    g.applyMatrix4(this.m4);
    const b = castShadow ? this.buckets : this.noShadowBuckets;
    const arr = b.get(mat) ?? [];
    arr.push(g.index ? g.toNonIndexed() : g);
    b.set(mat, arr);
  }
  /** caixa visual + colisor + obstáculo para navegação */
  box(x: number, y: number, z: number, w: number, h: number, d: number, mat: THREE.Material, opts: { rotY?: number; collide?: boolean; nav?: boolean; uv?: number; shadow?: boolean } = {}) {
    const rotY = opts.rotY ?? 0;
    this.addGeo(boxGeo(w, h, d, opts.uv ?? 0.5), mat, { x, y, z }, rotY, 0, 1, opts.shadow ?? true);
    if (opts.collide !== false) this.colliders.push(this.physics.addBox(x, y, z, w / 2, h / 2, d / 2, rotY));
    if (opts.nav !== false && opts.collide !== false) this.addObstacle(x, y, z, w, h, d, rotY);
  }
  addObstacle(x: number, y: number, z: number, w: number, h: number, d: number, rotY = 0) {
    const c = Math.abs(Math.cos(rotY)), s = Math.abs(Math.sin(rotY));
    const hx = (w * c + d * s) / 2, hz = (w * s + d * c) / 2;
    this.obstacles.push({ minX: x - hx, maxX: x + hx, minY: y - h / 2, maxY: y + h / 2, minZ: z - hz, maxZ: z + hz });
  }
  finish(scene: THREE.Object3D) {
    for (const [buckets, shadow] of [[this.buckets, true], [this.noShadowBuckets, false]] as const) {
      for (const [mat, geos] of buckets) {
        // limita tamanho de cada lote para culling por frustum continuar útil
        const chunks = new Map<string, THREE.BufferGeometry[]>();
        for (const g of geos) {
          g.computeBoundingBox();
          const c = g.boundingBox!.getCenter(new THREE.Vector3());
          // transparentes (decalques) num lote só; opacos em blocos de 40 m para o culling funcionar
          const cs = mat.transparent ? 1000 : 40;
          const key = `${Math.floor(c.x / cs)}:${Math.floor(c.z / cs)}`;
          const a = chunks.get(key) ?? []; a.push(g); chunks.set(key, a);
        }
        for (const list of chunks.values()) {
          const norm = list.map((g) => { for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); return g; });
          const merged = mergeGeometries(norm, false);
          if (!merged) continue;
          merged.computeBoundingSphere();
          const mesh = new THREE.Mesh(merged, mat);
          mesh.castShadow = shadow; mesh.receiveShadow = true;
          mesh.matrixAutoUpdate = false; mesh.updateMatrix();
          this.group.add(mesh);
        }
      }
    }
    scene.add(this.group);
  }
}

// ----------------- Grade de navegação + A* (GDD §13.3) -----------------
export class NavGrid {
  readonly cols: number; readonly rows: number;
  blocked: Uint8Array;
  constructor(public minX: number, public minZ: number, public maxX: number, public maxZ: number, public cell = 1) {
    this.cols = Math.ceil((maxX - minX) / cell); this.rows = Math.ceil((maxZ - minZ) / cell);
    this.blocked = new Uint8Array(this.cols * this.rows);
  }
  build(obstacles: AABB[], inflate = 0.45) {
    this.blocked.fill(0);
    for (const o of obstacles) {
      if (o.minY > 1.0 || o.maxY < 0.36) continue; // plataforma alta ou piso baixo: não bloqueia o chão
      this.markBox(o.minX - inflate, o.minZ - inflate, o.maxX + inflate, o.maxZ + inflate, 1);
    }
  }
  markBox(x0: number, z0: number, x1: number, z1: number, v: number) {
    const c0 = Math.max(0, Math.floor((x0 - this.minX) / this.cell)), c1 = Math.min(this.cols - 1, Math.floor((x1 - this.minX) / this.cell));
    const r0 = Math.max(0, Math.floor((z0 - this.minZ) / this.cell)), r1 = Math.min(this.rows - 1, Math.floor((z1 - this.minZ) / this.cell));
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) this.blocked[r * this.cols + c] = v;
  }
  idx(x: number, z: number) {
    const c = Math.floor((x - this.minX) / this.cell), r = Math.floor((z - this.minZ) / this.cell);
    if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) return -1;
    return r * this.cols + c;
  }
  walkable(x: number, z: number) { const i = this.idx(x, z); return i >= 0 && !this.blocked[i]; }
  center(i: number): [number, number] { const c = i % this.cols, r = Math.floor(i / this.cols); return [this.minX + (c + 0.5) * this.cell, this.minZ + (r + 0.5) * this.cell]; }
  nearestWalkable(x: number, z: number, maxR = 4): number {
    const i0 = this.idx(x, z);
    if (i0 >= 0 && !this.blocked[i0]) return i0;
    for (let rad = 1; rad <= maxR; rad++) for (let dz = -rad; dz <= rad; dz++) for (let dx = -rad; dx <= rad; dx++) {
      const i = this.idx(x + dx * this.cell, z + dz * this.cell);
      if (i >= 0 && !this.blocked[i]) return i;
    }
    return -1;
  }
  /** linha reta livre na grade (para suavizar caminho) */
  clearLine(ax: number, az: number, bx: number, bz: number) {
    const d = Math.hypot(bx - ax, bz - az); const n = Math.ceil(d / (this.cell * 0.5));
    for (let i = 0; i <= n; i++) { const t = i / Math.max(1, n); if (!this.walkable(ax + (bx - ax) * t, az + (bz - az) * t)) return false; }
    return true;
  }
  findPath(ax: number, az: number, bx: number, bz: number, maxNodes = 4000): [number, number][] | null {
    const start = this.nearestWalkable(ax, az), goal = this.nearestWalkable(bx, bz);
    if (start < 0 || goal < 0) return null;
    if (start === goal) return [[bx, bz]];
    const N = this.cols * this.rows;
    const g = new Float32Array(N).fill(Infinity);
    const came = new Int32Array(N).fill(-1);
    const closed = new Uint8Array(N);
    const open: number[] = [start]; const f = new Map<number, number>();
    const gc = this.center(goal);
    const h = (i: number) => { const c = this.center(i); const dx = Math.abs(c[0] - gc[0]), dz = Math.abs(c[1] - gc[1]); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz); };
    g[start] = 0; f.set(start, h(start));
    let expanded = 0;
    while (open.length) {
      let bi = 0; for (let i = 1; i < open.length; i++) if ((f.get(open[i]) ?? 1e9) < (f.get(open[bi]) ?? 1e9)) bi = i;
      const cur = open[bi]; open[bi] = open[open.length - 1]; open.pop();
      if (cur === goal) break;
      if (closed[cur]) continue;
      closed[cur] = 1;
      if (++expanded > maxNodes) return null;
      const cc = cur % this.cols, cr = Math.floor(cur / this.cols);
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const nc = cc + dc, nr = cr + dr;
        if (nc < 0 || nr < 0 || nc >= this.cols || nr >= this.rows) continue;
        const ni = nr * this.cols + nc;
        if (this.blocked[ni] || closed[ni]) continue;
        if (dr && dc && (this.blocked[cr * this.cols + nc] || this.blocked[nr * this.cols + cc])) continue; // sem cortar quina
        const ng = g[cur] + (dr && dc ? 1.414 : 1);
        if (ng < g[ni]) { g[ni] = ng; came[ni] = cur; f.set(ni, ng + h(ni)); open.push(ni); }
      }
    }
    if (came[goal] < 0) return null;
    const cells: number[] = [];
    for (let c = goal; c !== start && c >= 0; c = came[c]) cells.push(c);
    cells.reverse();
    // suavização por linha de visada
    const pts = cells.map((c) => this.center(c));
    pts[pts.length - 1] = [bx, bz];
    const out: [number, number][] = [];
    let ax2 = ax, az2 = az, i = 0;
    while (i < pts.length) {
      let j = pts.length - 1;
      while (j > i && !this.clearLine(ax2, az2, pts[j][0], pts[j][1])) j--;
      out.push(pts[j]); ax2 = pts[j][0]; az2 = pts[j][1]; i = j + 1;
    }
    return out;
  }
}

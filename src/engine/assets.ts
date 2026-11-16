// Carregamento de GLBs com progresso real, fallback procedural explícito e otimização de rigs.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ALL_MODELS } from '../models/index';
import type { ModelAsset } from '../models/kit';

export interface LoadedModel { scene: THREE.Object3D; clips: THREE.AnimationClip[]; fallback: boolean; bytes: number }
export interface AssetError { id: string; url: string; message: string }

export class Assets {
  models = new Map<string, LoadedModel>();
  errors: AssetError[] = [];
  private loader = new GLTFLoader();

  async loadAll(onProgress: (done: number, total: number, label: string) => void) {
    const entries = Object.entries(ALL_MODELS);
    const sizes = new Map<string, { loaded: number; total: number }>();
    let done = 0;
    const report = (label: string) => {
      let l = 0, t = 0;
      for (const v of sizes.values()) { l += v.loaded; t += v.total || 1; }
      onProgress(done + (t ? l / t : 0) * 0.0, entries.length, label);
    };
    await Promise.all(entries.map(async ([id, def]) => {
      const url = new URL(def.path, document.baseURI).href;
      try {
        const gltf = await this.loader.loadAsync(url, (e) => { sizes.set(id, { loaded: e.loaded, total: e.total }); report(id); });
        if (!gltf.animations.length && id !== 'parts') throw new Error('GLB sem clipes de animação');
        this.models.set(id, { scene: gltf.scene, clips: gltf.animations, fallback: false, bytes: sizes.get(id)?.total ?? 0 });
      } catch (e: any) {
        // erro visível + modelo de emergência gerado pelo mesmo código-fonte do GLB
        this.errors.push({ id, url, message: String(e?.message ?? e) });
        console.error(`[assets] falha ao carregar ${url}:`, e);
        const m: ModelAsset = def.build();
        this.models.set(id, { scene: m.scene, clips: m.clips, fallback: true, bytes: 0 });
      }
      done++;
      onProgress(done, entries.length, id);
    }));
    // otimiza templates uma vez (merge de malhas estáticas por nó animado e material)
    for (const [id, m] of this.models) {
      if (id === 'parts') { const root = m.scene.getObjectByName('PARTS') ?? m.scene.children[0]; for (const part of root.children) for (const sock of [...part.children]) mergeStatic(sock, new Set(), /^(eye|coreGlow)/); }
      else if (id !== 'z01') optimizeRig(m.scene, m.clips);
    }
    this.models.get('z01')!.scene.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = false; } });
  }
  get(id: string): LoadedModel { const m = this.models.get(id); if (!m) throw new Error('modelo não carregado: ' + id); return m; }
  /** clona o template (nós rígidos: clone simples preserva nomes para o AnimationMixer) */
  instance(id: string): { root: THREE.Object3D; clips: THREE.AnimationClip[] } {
    const m = this.get(id);
    const root = m.scene.clone(true);
    return { root, clips: m.clips };
  }
}

const KEEP = /^(eye|batonTip|exhaust|weak|sawHub|coreGlow|beamer|lens|torch|stub_spark|fist[LR])/;

/** junta malhas estáticas sob cada nó animado, por material — reduz draw calls ~5-10x */
export function optimizeRig(root: THREE.Object3D, clips: THREE.AnimationClip[]) {
  const animated = new Set<string>([root.name]);
  for (const c of clips) for (const t of c.tracks) animated.add(t.name.split('.')[0]);
  const targets: THREE.Object3D[] = [];
  root.traverse((o) => { if (animated.has(o.name)) targets.push(o); });
  for (const t of targets) mergeStatic(t, animated, KEEP);
}

function mergeStatic(owner: THREE.Object3D, animated: Set<string>, keep: RegExp) {
  owner.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(owner.matrixWorld).invert();
  const groups = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const toRemove: THREE.Mesh[] = [];
  const visit = (o: THREE.Object3D) => {
    for (const c of o.children) {
      if (animated.has(c.name) && c !== owner) continue; // outro nó animado: ele mesmo cuida
      const m = c as THREE.Mesh;
      if (m.isMesh && !keep.test(m.name) && !Array.isArray(m.material) && m.children.length === 0) {
        const g = m.geometry.clone();
        const mat = new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld);
        g.applyMatrix4(mat);
        for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
        if (!g.index) { /* ok */ }
        const arr = groups.get(m.material) ?? [];
        arr.push(g); groups.set(m.material, arr);
        toRemove.push(m);
      } else visit(c);
    }
  };
  visit(owner);
  if (toRemove.length < 2) return;
  for (const m of toRemove) m.parent?.remove(m);
  for (const [mat, geos] of groups) {
    const allIndexed = geos.every((g) => g.index);
    const list = allIndexed ? geos : geos.map((g) => (g.index ? g.toNonIndexed() : g));
    const merged = mergeGeometries(list, false);
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, mat);
    mesh.name = 'merged_' + (mat as THREE.Material).name;
    mesh.castShadow = true; mesh.receiveShadow = true;
    owner.add(mesh);
  }
  // remove nós vazios restantes
  const prune = (o: THREE.Object3D) => { for (const c of [...o.children]) { prune(c); if (!(c as THREE.Mesh).isMesh && c.children.length === 0 && !animated.has(c.name) && !/SOCKET|hook|radar|shield|fist|hammer|drum/.test(c.name)) o.remove(c); } };
  prune(owner);
}

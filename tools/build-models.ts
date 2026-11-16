// Gera os GLBs originais do jogo a partir dos construtores procedurais em src/models.
// Uso: npm run models
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Polyfill mínimo de FileReader para o GLTFExporter no Node
(globalThis as any).FileReader = class {
  result: any; onloadend: any; onload: any;
  readAsArrayBuffer(b: Blob) { b.arrayBuffer().then((r) => { this.result = r; this.onload?.({ target: this }); this.onloadend?.({ target: this }); }); }
  readAsDataURL(b: Blob) { b.arrayBuffer().then((r) => { this.result = 'data:application/octet-stream;base64,' + Buffer.from(r).toString('base64'); this.onload?.({ target: this }); this.onloadend?.({ target: this }); }); }
};

const { ALL_MODELS } = await import('../src/models/index');
const { resetMaterialCache } = await import('../src/models/kit');

const manifest: any[] = [];
for (const [id, def] of Object.entries(ALL_MODELS)) {
  resetMaterialCache();
  const { scene, clips } = def.build();
  scene.updateMatrixWorld(true);
  // otimização: sem UV (materiais sem textura) e vértices indexados
  const done = new Map<THREE.BufferGeometry, THREE.BufferGeometry>();
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    let g = done.get(m.geometry);
    if (!g) { const c = m.geometry.clone(); c.deleteAttribute('uv'); g = mergeVertices(c, 1e-4); done.set(m.geometry, g); }
    m.geometry = g;
  });
  let tris = 0; let meshes = 0;
  scene.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { meshes++; const g = m.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3; } });
  const exporter = new GLTFExporter();
  const glb: ArrayBuffer = await new Promise((res, rej) => exporter.parse(scene, (r) => res(r as ArrayBuffer), (e) => rej(e), { binary: true, animations: clips, onlyVisible: false }));
  const out = join('public', def.path);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, Buffer.from(glb));
  const box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3());
  manifest.push({ id, url: def.path, bytes: glb.byteLength, triangles: Math.round(tris), meshes, clips: clips.map((c) => c.name), heightMeters: +size.y.toFixed(2), facingAxis: '+Z', license: 'original (gerado por script, CC0 do projeto)' });
  console.log(`${id.padEnd(7)} ${(glb.byteLength / 1024).toFixed(0).padStart(5)} KB  ${String(Math.round(tris)).padStart(6)} tris  ${meshes} meshes  h=${size.y.toFixed(2)}m  clips=${clips.length}`);
}
writeFileSync('public/assets/manifest.json', JSON.stringify({ version: 1, generated: new Date().toISOString(), assets: manifest }, null, 2));
console.log('manifest ok');

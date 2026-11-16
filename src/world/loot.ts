// Itens no chão: peças (com feixe de luz), orbes de sucata com ímã e marcador de sucata perdida.
import * as THREE from 'three';
import type { Assets } from '../engine/assets';

export interface PartDrop { itemId: string; grantId: string; pos: THREE.Vector3; obj: THREE.Group; t: number }
export interface Orb { pos: THREE.Vector3; vel: THREE.Vector3; amount: number; mesh: THREE.Mesh; t: number; kind: 'scrap' | 'alloy' | 'cells' }

const orbGeo = new THREE.OctahedronGeometry(0.11, 0);
const orbMat = { scrap: new THREE.MeshStandardMaterial({ color: 0xffb347, emissive: 0xff8a1e, emissiveIntensity: 1.6, metalness: 0.6, roughness: 0.3 }), alloy: new THREE.MeshStandardMaterial({ color: 0x8fd3ff, emissive: 0x3aa0ff, emissiveIntensity: 1.8 }), cells: new THREE.MeshStandardMaterial({ color: 0x9cff7a, emissive: 0x4cff3a, emissiveIntensity: 1.8 }) };
const beamMat = new THREE.MeshBasicMaterial({ color: 0xffc04a, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
const ringMat = new THREE.MeshBasicMaterial({ color: 0xffc04a, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
const lostMat = new THREE.MeshBasicMaterial({ color: 0x39f0ff, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });

export class Loot {
  drops: PartDrop[] = [];
  orbs: Orb[] = [];
  lost: { obj: THREE.Group; pos: THREE.Vector3; amount: number } | null = null;
  constructor(private scene: THREE.Scene, private assets: Assets) {}

  spawnPart(itemId: string, grantId: string, pos: THREE.Vector3) {
    if (this.drops.some((d) => d.grantId === grantId)) return;
    const g = new THREE.Group(); g.position.copy(pos); g.position.y = Math.max(0, pos.y);
    const tpl = this.assets.get('parts').scene.getObjectByName(itemId);
    const holder = new THREE.Group(); holder.position.y = 0.9; g.add(holder);
    if (tpl) {
      const c = tpl.clone(true);
      // centraliza a peça (sockets estão em origem local)
      c.children.forEach((s, i) => s.position.set((i - (c.children.length - 1) / 2) * 0.35, 0, 0));
      c.position.set(0, 0, 0); c.scale.setScalar(1.25);
      c.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
      holder.add(c);
    }
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.6, 7, 16, 1, true), beamMat); beam.position.y = 3.5; g.add(beam);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.75, 32), ringMat); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; g.add(ring);
    const light = new THREE.PointLight(0xffb040, 6, 6, 2); light.position.y = 1.2; g.add(light);
    this.scene.add(g);
    this.drops.push({ itemId, grantId, pos: g.position, obj: g, t: 0 });
  }
  removeDrop(d: PartDrop) { this.scene.remove(d.obj); this.drops = this.drops.filter((x) => x !== d); }
  spawnOrbs(pos: THREE.Vector3, amount: number, kind: Orb['kind'] = 'scrap') {
    const n = kind === 'scrap' ? Math.min(8, Math.max(2, Math.round(amount / 6))) : Math.max(1, amount);
    const each = kind === 'scrap' ? Math.floor(amount / n) : 1;
    let rest = kind === 'scrap' ? amount - each * n : 0;
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(orbGeo, orbMat[kind]);
      const p = pos.clone(); p.y = Math.max(0.6, pos.y + 0.8);
      m.position.copy(p); this.scene.add(m);
      const a = Math.random() * Math.PI * 2, s = 2 + Math.random() * 2.5;
      this.orbs.push({ pos: p, vel: new THREE.Vector3(Math.cos(a) * s, 4 + Math.random() * 3, Math.sin(a) * s), amount: each + (rest-- > 0 ? 1 : 0), mesh: m, t: 0, kind });
    }
  }
  setLost(pos: THREE.Vector3 | null, amount = 0) {
    if (this.lost) { this.scene.remove(this.lost.obj); this.lost = null; }
    if (!pos || amount <= 0) return;
    const g = new THREE.Group(); g.position.copy(pos);
    const pill = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 4, 16, 1, true), lostMat); pill.position.y = 2; g.add(pill);
    const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0), orbMat.scrap); c.position.y = 1; g.add(c);
    const l = new THREE.PointLight(0x39f0ff, 5, 6, 2); l.position.y = 1.3; g.add(l);
    this.scene.add(g);
    this.lost = { obj: g, pos: g.position, amount };
  }
  clearAll() { for (const d of [...this.drops]) this.removeDrop(d); for (const o of this.orbs) this.scene.remove(o.mesh); this.orbs.length = 0; }
  /** retorna coletas do quadro */
  update(dt: number, player: THREE.Vector3, time: number, groundAt: (x: number, z: number, y: number) => number) {
    const got: { kind: Orb['kind']; amount: number }[] = [];
    for (const d of this.drops) { d.t += dt; const h = d.obj.children[0]; h.rotation.y = time * 1.4; h.position.y = 0.9 + Math.sin(time * 2.2) * 0.12; }
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const o = this.orbs[i]; o.t += dt;
      const to = new THREE.Vector3(player.x - o.pos.x, player.y + 0.9 - o.pos.y, player.z - o.pos.z);
      const d = to.length();
      if (o.t > 0.45 && d < 5) { o.vel.lerp(to.normalize().multiplyScalar(14), Math.min(1, dt * 8)); }
      else { o.vel.y -= 18 * dt; o.vel.x *= Math.exp(-2 * dt); o.vel.z *= Math.exp(-2 * dt); }
      o.pos.addScaledVector(o.vel, dt);
      const gy = groundAt(o.pos.x, o.pos.z, o.pos.y) + 0.25;
      if (o.pos.y < gy && !(o.t > 0.45 && d < 5)) { o.pos.y = gy; o.vel.y = Math.abs(o.vel.y) * 0.35; }
      o.mesh.position.copy(o.pos); o.mesh.rotation.y += dt * 4;
      if ((o.t > 0.45 && d < 0.7) || o.t > 30) { got.push({ kind: o.kind, amount: o.amount }); this.scene.remove(o.mesh); this.orbs.splice(i, 1); }
    }
    if (this.lost) { const c = this.lost.obj.children[1]; c.rotation.y = time * 2; c.position.y = 1 + Math.sin(time * 3) * 0.15; }
    return got;
  }
}

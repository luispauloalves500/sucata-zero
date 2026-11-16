// Objetos dinâmicos do cenário: portões, chapas quebráveis, esteiras, prensas, colunas, elevador.
import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import type { Physics } from '../engine/physics';
import { boxGeo } from './builder';

export class Gate {
  group = new THREE.Group();
  open = false;
  private t = 0; // 0 fechado, 1 aberto
  body: RAPIER.RigidBody; col: RAPIER.Collider;
  constructor(public id: string, physics: Physics, public x: number, public z: number, public w: number, public h: number, mats: { door: THREE.Material; frame: THREE.Material; light: THREE.MeshStandardMaterial }, public rotY = 0, private lift = true) {
    const door = new THREE.Mesh(boxGeo(w, h, 0.35, 0.5), mats.door);
    door.position.y = h / 2; door.castShadow = true; door.receiveShadow = true; door.name = 'door';
    this.group.add(door);
    for (let i = 1; i < 6; i++) { const s = new THREE.Mesh(boxGeo(w, 0.08, 0.42, 1), mats.frame); s.position.y = (h / 6) * i; door.add(s); s.position.y -= h / 2; }
    for (const sx of [-1, 1]) { const p = new THREE.Mesh(boxGeo(0.5, h + 1.2, 0.8, 1), mats.frame); p.position.set(sx * (w / 2 + 0.25), (h + 1.2) / 2, 0); p.castShadow = true; this.group.add(p); }
    const top = new THREE.Mesh(boxGeo(w + 1, 0.6, 0.8, 1), mats.frame); top.position.y = h + 0.9; this.group.add(top);
    this.lightMat = mats.light.clone();
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.1), this.lightMat); lamp.position.set(0, h + 0.9, 0.42); this.group.add(lamp);
    const lamp2 = lamp.clone(); lamp2.position.z = -0.42; this.group.add(lamp2);
    this.group.position.set(x, 0, z); this.group.rotation.y = rotY;
    const k = physics.kinematicBox(x, h / 2, z, w / 2, h / 2, 0.3);
    this.body = k.body; this.col = k.col;
    if (rotY) this.body.setNextKinematicRotation({ x: 0, y: Math.sin(rotY / 2), z: 0, w: Math.cos(rotY / 2) });
    this.setLight();
  }
  lightMat: THREE.MeshStandardMaterial;
  setLight() { const c = this.open ? 0x39ff7a : 0xff3b2f; this.lightMat.color.setHex(c); this.lightMat.emissive.setHex(c); this.lightMat.emissiveIntensity = 2.5; }
  setOpen(v: boolean, instant = false) { this.open = v; if (instant) this.t = v ? 1 : 0; this.setLight(); this.apply(); }
  update(dt: number) {
    const target = this.open ? 1 : 0;
    if (Math.abs(this.t - target) < 1e-3) return false;
    this.t += Math.sign(target - this.t) * Math.min(Math.abs(target - this.t), dt / 1.4);
    this.apply();
    return true;
  }
  private apply() {
    const door = this.group.getObjectByName('door')!;
    const e = this.t * this.t * (3 - 2 * this.t);
    door.position.y = this.h / 2 + e * (this.h - 0.4);
    this.body.setNextKinematicTranslation({ x: this.x, y: this.h / 2 + e * (this.h + 2), z: this.z });
  }
  get progress() { return this.t; }
}

export class Plate {
  mesh: THREE.Mesh; col: RAPIER.Collider | null; broken = false;
  constructor(public id: string, physics: Physics, public pos: THREE.Vector3, public w: number, public h: number, mat: THREE.Material, rotY = 0, private obstacleBox?: { x0: number; z0: number; x1: number; z1: number }) {
    this.mesh = new THREE.Mesh(boxGeo(w, h, 0.3, 1 / w), mat);
    // UV inteiro na face frontal
    this.mesh.position.set(pos.x, h / 2, pos.z); this.mesh.rotation.y = rotY; this.mesh.castShadow = true; this.mesh.receiveShadow = true;
    this.col = physics.addBox(pos.x, h / 2, pos.z, w / 2, h / 2, 0.15, rotY);
  }
  get box() { return this.obstacleBox; }
}

export class Conveyor {
  constructor(public id: string, public minX: number, public maxX: number, public minZ: number, public maxZ: number, public top: number, public push: THREE.Vector3, public tex: THREE.Texture) {}
  contains(p: THREE.Vector3) { return p.x > this.minX && p.x < this.maxX && p.z > this.minZ && p.z < this.maxZ && p.y < this.top + 0.25 && p.y > this.top - 0.4; }
}

export type PressPhase = 'up' | 'warn' | 'slam' | 'down' | 'rise';
export class Press {
  head: THREE.Group; phase: PressPhase = 'up'; t = 0; body: RAPIER.RigidBody; light: THREE.MeshStandardMaterial;
  justSlammed = false;
  constructor(public id: string, physics: Physics, public x: number, public z: number, public size: number, public offset: number, mats: { head: THREE.Material; hazard: THREE.Material; light: THREE.MeshStandardMaterial }, public baseY = 0.3) {
    this.head = new THREE.Group();
    const h = new THREE.Mesh(boxGeo(size, 1.4, size, 0.5), mats.head); h.castShadow = true; this.head.add(h);
    const band = new THREE.Mesh(boxGeo(size + 0.06, 0.25, size + 0.06, 1), mats.hazard); band.position.y = -0.55; this.head.add(band);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 6, 10), mats.head); shaft.position.y = 3.6; this.head.add(shaft);
    this.light = mats.light.clone();
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), this.light); l.position.set(size / 2 + 0.1, 0.4, 0); this.head.add(l);
    const l2 = l.clone(); l2.position.x = -size / 2 - 0.1; this.head.add(l2);
    const k = physics.kinematicBox(x, 5, z, size / 2, 0.7, size / 2);
    this.body = k.body;
    this.t = offset;
  }
  static readonly CYCLE = { up: 1.7, warn: 0.6, slam: 0.14, down: 0.55, rise: 0.6 };
  yAt(): number {
    const top = this.baseY + 4.4, bottom = this.baseY + 0.7;
    switch (this.phase) {
      case 'up': case 'warn': return top;
      case 'slam': return top + (bottom - top) * Math.min(1, this.t / Press.CYCLE.slam);
      case 'down': return bottom;
      case 'rise': return bottom + (top - bottom) * Math.min(1, this.t / Press.CYCLE.rise);
    }
  }
  update(dt: number, timeScale = 1) {
    this.justSlammed = false;
    this.t += dt;
    const C = Press.CYCLE as Record<PressPhase, number>;
    const dur = this.phase === 'up' ? C.up * timeScale : this.phase === 'warn' ? C.warn * timeScale : C[this.phase];
    if (this.t >= dur) {
      this.t -= dur;
      const order: PressPhase[] = ['up', 'warn', 'slam', 'down', 'rise'];
      this.phase = order[(order.indexOf(this.phase) + 1) % order.length];
      if (this.phase === 'down') this.justSlammed = true;
    }
    const y = this.yAt();
    this.head.position.set(this.x, y, this.z);
    this.body.setNextKinematicTranslation({ x: this.x, y, z: this.z });
    const blink = this.phase === 'warn' ? (Math.floor(this.t * 10) % 2 ? 1 : 0.2) : 1;
    const col = this.phase === 'up' ? 0x39ff7a : 0xff3b2f;
    this.light.color.setHex(col); this.light.emissive.setHex(col); this.light.emissiveIntensity = 2.6 * blink;
  }
  /** perigoso: área sob a cabeça durante a descida */
  dangerous() { return this.phase === 'slam'; }
  inside(p: THREE.Vector3) { return Math.abs(p.x - this.x) < this.size / 2 + 0.25 && Math.abs(p.z - this.z) < this.size / 2 + 0.25; }
}

export class Column {
  mesh: THREE.Group; broken = false; col: RAPIER.Collider;
  constructor(public id: string, private physics: Physics, public x: number, public z: number, mats: { body: THREE.Material; band: THREE.Material }) {
    this.mesh = new THREE.Group();
    const c = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 7, 14), mats.body); c.position.y = 3.5; c.castShadow = true; c.receiveShadow = true; this.mesh.add(c);
    for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(1.32, 1.32, 0.3, 14), mats.band); b.position.y = 1 + i * 2.3; this.mesh.add(b); }
    this.mesh.position.set(x, 0, z);
    this.col = physics.addCylinder(x, 3.5, z, 3.5, 1.2);
  }
  /** a coluna desaba ao ser atingida pela investida do chefe: vira um toco baixo */
  breakColumn() {
    if (this.broken) return;
    this.broken = true;
    this.physics.remove(this.col);
    this.col = this.physics.addCylinder(this.x, 0.6, this.z, 0.6, 1.25);
    const [body, ...bands] = this.mesh.children;
    body.scale.y = 0.17; body.position.y = 0.6;
    bands.forEach((b, i) => { b.visible = i === 0; b.position.y = 1.0; });
    // escombros
    const m = (body as THREE.Mesh).material as THREE.Material;
    for (let i = 0; i < 5; i++) {
      const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35 + Math.random() * 0.35, 0), m);
      const a = Math.random() * Math.PI * 2, d = 1.6 + Math.random() * 1.2;
      r.position.set(Math.cos(a) * d, 0.25, Math.sin(a) * d); r.rotation.set(Math.random() * 3, Math.random() * 3, 0); r.castShadow = true;
      this.mesh.add(r);
    }
  }
  /** restaura (ao reiniciar a luta) */
  restore() {
    if (!this.broken) return;
    this.broken = false;
    this.physics.remove(this.col);
    this.col = this.physics.addCylinder(this.x, 3.5, this.z, 3.5, 1.2);
    const [body, ...rest] = this.mesh.children;
    body.scale.y = 1; body.position.y = 3.5;
    rest.slice(0, 3).forEach((b, i) => { b.visible = true; b.position.y = 1 + i * 2.3; });
    for (const r of rest.slice(3)) this.mesh.remove(r);
  }
}

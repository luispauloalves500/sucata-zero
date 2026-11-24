// Câmera em terceira pessoa sobre o ombro, com colisão (GDD §4.2)
import * as THREE from 'three';
import { clamp, damp, dampAngle, wrapAngle } from '../core/math';
import type { Physics } from './physics';

export class CameraRig {
  cam: THREE.PerspectiveCamera;
  yaw = 0; // 0 = olhando para +Z
  pitch = 0.22;
  distance = 4.6;
  private curDist = 4.6;
  shoulder = 1;
  private shoulderCur = 1;
  focus = new THREE.Vector3();
  private shake = 0;
  shakeEnabled = true;
  lockTarget: THREE.Vector3 | null = null;
  override: { pos: THREE.Vector3; look: THREE.Vector3; blend: number } | null = null;
  private tmp = new THREE.Vector3();
  private lookAt = new THREE.Vector3();
  fovBase = 65;
  extraDist = 0;
  /** 0 = distância normal, 1 = câmera colada no personagem */
  closeness = 0;

  constructor(aspect: number) {
    this.cam = new THREE.PerspectiveCamera(65, aspect, 0.08, 400);
  }
  addShake(v: number) { if (this.shakeEnabled) this.shake = Math.min(1, this.shake + v); }
  applyLook(dx: number, dy: number) {
    this.yaw = wrapAngle(this.yaw - dx);
    this.pitch = clamp(this.pitch + dy, -0.55, 1.1);
  }
  snapBehind(heading: number) { this.yaw = heading; }
  update(dt: number, target: THREE.Vector3, physics: Physics | null, heading: number, moving: boolean) {
    // foco com leve antecipação
    this.focus.x = damp(this.focus.x, target.x, 14, dt);
    this.focus.y = damp(this.focus.y, target.y + 1.38, 8, dt);
    this.focus.z = damp(this.focus.z, target.z, 14, dt);
    if (this.lockTarget) {
      const dx = this.lockTarget.x - target.x, dz = this.lockTarget.z - target.z;
      const want = Math.atan2(dx, dz);
      this.yaw = dampAngle(this.yaw, want, 6, dt);
      const dy = this.lockTarget.y - (target.y + 1.2);
      const horiz = Math.hypot(dx, dz);
      const wantPitch = clamp(0.2 - Math.atan2(dy, Math.max(2, horiz)) * 0.6, -0.2, 0.7);
      this.pitch = damp(this.pitch, wantPitch, 3, dt);
    }
    this.shoulderCur = damp(this.shoulderCur, this.shoulder, 6, dt);
    const dist = this.distance + this.extraDist;
    // direção da câmera
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const back = this.tmp.set(-Math.sin(this.yaw) * cp, sp, -Math.cos(this.yaw) * cp);
    const right = new THREE.Vector3(-Math.cos(this.yaw), 0, Math.sin(this.yaw));
    const pivot = this.focus.clone().addScaledVector(right, 0.42 * this.shoulderCur);
    // oclusão: sphere cast do pivô até a posição desejada
    let want = dist;
    if (physics) {
      const hit = physics.sphereCastStatic(pivot.x, pivot.y, pivot.z, back.x, back.y, back.z, dist, 0.22);
      if (hit !== null) want = Math.max(0.6, hit - 0.05);
    }
    // aproxima rápido ao colidir, recupera devagar
    this.curDist = want < this.curDist ? damp(this.curDist, want, 30, dt) : damp(this.curDist, want, 3, dt);
    // muito perto (parede atrás): sobe a câmera por cima do ombro em vez de entrar no personagem
    this.closeness = clamp(1 - (this.curDist - 0.6) / Math.max(0.1, dist * 0.45 - 0.6), 0, 1);
    const pos = pivot.clone().addScaledVector(back, this.curDist);
    if (physics) {
      // sobe por cima do ombro (limitado pelo teto) e afasta de paredes laterais muito próximas
      const lift = this.closeness * 0.75;
      if (lift > 0.01) { const up = physics.rayStatic(pos.x, pos.y, pos.z, 0, 1, 0, lift + 0.3); pos.y += up === null ? lift : Math.max(0, up - 0.3); }
      const pad = 0.38;
      for (const sgn of [1, -1]) {
        const h = physics.rayStatic(pos.x, pos.y, pos.z, right.x * sgn, 0, right.z * sgn, pad);
        if (h !== null) pos.addScaledVector(right, -sgn * (pad - h));
      }
    }
    this.lookAt.copy(pivot).addScaledVector(back, -6);
    if (this.lockTarget) this.lookAt.lerp(this.lockTarget, 0.25);
    if (this.override) {
      const b = this.override.blend;
      pos.lerp(this.override.pos, b);
      this.lookAt.lerp(this.override.look, b);
    }
    this.cam.position.copy(pos);
    if (this.shake > 0.001) {
      const s = this.shake * this.shake * 0.18;
      this.cam.position.x += (Math.random() - 0.5) * s;
      this.cam.position.y += (Math.random() - 0.5) * s;
      this.shake = Math.max(0, this.shake - dt * 2.2);
    }
    this.cam.lookAt(this.lookAt);
    const fovWant = this.fovBase + (moving ? 2 : 0);
    this.cam.fov = damp(this.cam.fov, fovWant, 3, dt);
    this.cam.updateProjectionMatrix();
  }
  /** vetores de movimento relativos à câmera */
  forward(out: THREE.Vector3) { return out.set(Math.sin(this.yaw), 0, Math.cos(this.yaw)); }
  right(out: THREE.Vector3) { return out.set(-Math.cos(this.yaw), 0, Math.sin(this.yaw)); }
}

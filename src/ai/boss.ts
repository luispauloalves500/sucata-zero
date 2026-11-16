// B01 — O COMPACTADOR (GDD §10.1). Três fases; investida contra colunas causa atordoamento e expõe o núcleo.
import * as THREE from 'three';
import type { GameCtx, Hurtable, PlayerHit } from '../app/context';
import type { Assets } from '../engine/assets';
import { Animator } from '../engine/animator';
import { BOSS_B01 } from '../content/enemies';
import { clamp, dampAngle } from '../core/math';
import type { Column } from '../world/dynamic';

type BAtk = 'stomp' | 'swing' | 'sweep' | 'charge' | 'slam';
type BState = 'dormant' | 'intro' | 'walk' | 'windup' | 'active' | 'recover' | 'stunned' | 'dead' | 'transition';
interface AtkSpec { windup: number; active: number; recovery: number; dmg: number; stagger: number; blockable: boolean }
const SPEC: Record<BAtk, AtkSpec> = {
  stomp: { windup: 0.9, active: 0.25, recovery: 1.0, dmg: 1.4, stagger: 30, blockable: true },
  swing: { windup: 0.75, active: 0.3, recovery: 0.9, dmg: 1.2, stagger: 26, blockable: true },
  sweep: { windup: 1.1, active: 0.8, recovery: 1.2, dmg: 1.1, stagger: 30, blockable: false },
  charge: { windup: 1.2, active: 1.8, recovery: 1.4, dmg: 1.8, stagger: 50, blockable: false },
  slam: { windup: 1.0, active: 0.9, recovery: 1.6, dmg: 2.0, stagger: 60, blockable: false },
};

export class Boss implements Hurtable {
  id = 'B01'; name = BOSS_B01.name; alive = true; radius = 2.0; height = 5.2; lockable = true;
  pos: THREE.Vector3; root: THREE.Object3D; anim: Animator;
  hp = BOSS_B01.hp; maxHp = BOSS_B01.hp; stab = BOSS_B01.stability; phase = 1;
  heading = Math.PI; state: BState = 'dormant'; t = 0;
  private atk: BAtk | null = null; private hitDone = false; private atkDir = new THREE.Vector3(); private atkTarget = new THREE.Vector3(); private wave = 0;
  private cd = 0; private lastAtk: BAtk | null = null; private chargeCount = 0; private stunDur = 3.5;
  private plateNode: THREE.Object3D | null; private coreMat: THREE.MeshStandardMaterial | null = null;
  private flash = 0; private mats: THREE.MeshStandardMaterial[] = [];
  addsSpawned = false;
  onPhase: ((p: number) => void) | null = null;
  onDefeated: (() => void) | null = null;
  onSpawnAdds: (() => void) | null = null;

  constructor(private ctx: GameCtx, assets: Assets, private center: THREE.Vector3, private arenaR: number, private columns: Column[]) {
    const inst = assets.instance('b01');
    this.root = inst.root; this.anim = new Animator(this.root, inst.clips);
    this.pos = new THREE.Vector3(center.x, 0, center.z + 8);
    this.root.position.copy(this.pos); this.root.rotation.y = this.heading;
    this.plateNode = this.root.getObjectByName('plate') ?? null;
    this.root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      const mm = (m.material as THREE.MeshStandardMaterial).clone(); m.material = mm; this.mats.push(mm);
      mm.userData.baseEm = mm.emissive.clone(); mm.userData.baseI = mm.emissiveIntensity;
      if (/^coreGlow/.test(m.name)) this.coreMat = mm;
    });
    ctx.scene.add(this.root);
    this.anim.play('idle', { loop: true });
    const P = ctx.physics;
    this.body = P.world.createRigidBody(P.R.RigidBodyDesc.kinematicPositionBased().setTranslation(this.pos.x, 2.4, this.pos.z));
    P.world.createCollider(P.R.ColliderDesc.cylinder(2.4, 1.7), this.body);
  }
  body: import('@dimforge/rapier3d-compat').RigidBody | null = null;
  dispose() { if (this.body) { this.ctx.physics.world.removeRigidBody(this.body); this.body = null; } this.ctx.scene.remove(this.root); }
  lockPoint(out: THREE.Vector3) { return out.set(this.pos.x, 2.6, this.pos.z); }
  hpFrac() { return clamp(this.hp / this.maxHp, 0, 1); }
  stabFrac() { return clamp(this.stab / BOSS_B01.stability, 0, 1); }
  private setState(s: BState) { this.state = s; this.t = 0; }
  private fwd(out = new THREE.Vector3()) { return out.set(Math.sin(this.heading), 0, Math.cos(this.heading)); }
  get coreExposed() { return this.state === 'stunned' || this.phase === 3; }

  startIntro() {
    this.setState('intro'); this.anim.play('intro', { fade: 0.2 });
    this.ctx.audio.play('bossRoar'); this.ctx.shake(0.6);
  }
  receiveHit(h: PlayerHit) {
    if (!this.alive || this.state === 'dormant' || this.state === 'intro' || this.state === 'transition') { if (this.alive && this.state !== 'dormant') this.ctx.audio.play('block', 0.5); return; }
    // golpe por trás ou com núcleo exposto causa mais dano
    const f = this.fwd();
    const fromBack = f.dot(h.dir) > 0.4;
    let mul = 1;
    if (this.state === 'stunned') mul = 2.0; else if (this.phase === 3) mul = 1.3;
    if (fromBack) mul *= 1.25;
    const def = BOSS_B01.defense;
    const amount = Math.max(1, Math.round(h.amount * mul * (1 - Math.min(0.7, def / (def + 100)))));
    this.hp -= amount; this.flash = 1;
    const lp = this.lockPoint(new THREE.Vector3());
    this.ctx.damageNumber(lp, amount, h.crit || mul >= 2, mul >= 2 ? '#ffa62b' : undefined);
    this.ctx.audio.play(h.heavy ? 'hitHeavy' : 'hit');
    this.ctx.fx.burst(h.heavy ? 'heavy' : 'hit', new THREE.Vector3(this.pos.x - h.dir.x * 1.8, 2.2, this.pos.z - h.dir.z * 1.8), 14, h.dir);
    this.ctx.events.emit('DAMAGE_APPLIED', { target: 'B01', amount, crit: h.crit, blocked: false });
    if (this.state !== 'stunned') { this.stab -= h.stagger * 0.5; if (this.stab <= 0) { this.stab = BOSS_B01.stability; this.stun(2.6); } }
    if (this.hp <= 0) { this.die(); return; }
    const frac = this.hp / this.maxHp;
    if (this.phase === 1 && frac <= 0.7) this.toPhase(2);
    else if (this.phase === 2 && frac <= 0.35) this.toPhase(3);
  }
  private toPhase(p: number) {
    this.phase = p; this.atk = null;
    this.setState('transition'); this.anim.play('stomp', { fade: 0.1, restart: true, speed: 0.7 });
    this.ctx.audio.play('bossRoar'); this.ctx.shake(0.7);
    this.ctx.fx.burst('smoke', new THREE.Vector3(this.pos.x, 3, this.pos.z), 30);
    this.ctx.events.emit('BOSS_PHASE', { phase: p });
    this.onPhase?.(p);
    if (p === 3 && this.plateNode) {
      // a placa frontal se solta: núcleo fica exposto até o fim
      const wp = new THREE.Vector3(); this.plateNode.getWorldPosition(wp);
      this.plateNode.visible = false;
      this.ctx.fx.burst('debris', wp, 30); this.ctx.fx.burst('sparks', wp, 40);
      this.ctx.audio.play('break');
    }
    if (p === 2 && !this.addsSpawned) { this.addsSpawned = true; this.onSpawnAdds?.(); }
  }
  private stun(dur: number) {
    this.atk = null; this.stunDur = dur;
    this.setState('stunned'); this.anim.play('stunned', { loop: true, fade: 0.15 });
    this.ctx.fx.burst('electric', this.lockPoint(new THREE.Vector3()), 24);
    this.ctx.events.emit('TOAST', { text: 'NÚCLEO EXPOSTO — ataque agora!', kind: 'quest' });
    this.ctx.events.emit('SAY', { who: 'PÍXEL', text: 'O núcleo dele está aberto! Bate com tudo!', dur: 2.4 });
    this.ctx.attackTokens.delete(this.id);
  }
  private die() {
    this.alive = false; this.hp = 0; this.setState('dead');
    this.anim.play('death', { fade: 0.2 });
    this.ctx.audio.play('explode'); this.ctx.shake(1); this.ctx.hitstop(0.25);
    const c = new THREE.Vector3(this.pos.x, 2.5, this.pos.z);
    this.ctx.fx.burst('scrap', c, 40); this.ctx.fx.burst('sparks', c, 50); this.ctx.fx.burst('smoke', c, 30);
    let i = 0; const iv = setInterval(() => { this.ctx.fx.burst('heavy', new THREE.Vector3(this.pos.x + (Math.random() - 0.5) * 3, 1 + Math.random() * 3, this.pos.z + (Math.random() - 0.5) * 3), 14); this.ctx.audio.play('hitHeavy', 0.5); if (++i > 6) clearInterval(iv); }, 260);
    this.onDefeated?.();
  }
  private choose(dist: number): BAtk {
    const opts: BAtk[] = [];
    if (dist < 4.6) opts.push('stomp', 'swing');
    if (dist < 6.5 && this.phase >= 2) opts.push('sweep');
    if (dist > 5) opts.push('charge');
    if (this.phase === 3 && dist > 3) opts.push('slam');
    if (!opts.length) opts.push(dist > 4 ? 'charge' : 'stomp');
    // garante investidas frequentes (mecânica central)
    if (this.chargeCount === 0 && dist > 5) return 'charge';
    let pick = opts[Math.floor(Math.random() * opts.length)];
    if (pick === this.lastAtk && opts.length > 1) pick = opts[(opts.indexOf(pick) + 1) % opts.length];
    return pick;
  }
  private begin(a: BAtk) {
    this.atk = a; this.lastAtk = a; this.hitDone = false; this.wave = 0;
    if (a === 'charge') this.chargeCount++;
    const s = SPEC[a]; const p = this.ctx.player;
    const tm = this.ctx.difficultyMul.telegraph * (this.phase === 3 ? 0.85 : 1);
    this.setState('windup');
    this.anim.play(a + '_w', { fade: 0.1, restart: true, speed: this.anim.duration(a + '_w') / (s.windup * tm) });
    const tele = this.ctx.tele; const f = this.fwd();
    if (a === 'stomp') tele.circle(this.pos.x + f.x * 2.6, this.pos.z + f.z * 2.6, 3.2, s.windup * tm, 0xffa62b, true);
    if (a === 'swing') tele.rect(this.pos.x + f.x * 3, this.pos.z + f.z * 3, 7, 3.4, this.heading, s.windup * tm, 0xffa62b);
    if (a === 'sweep') tele.circle(this.pos.x, this.pos.z, 7.5, s.windup * tm + s.active, 0xff3b2f, true);
    if (a === 'charge') { const ang = Math.atan2(p.pos.x - this.pos.x, p.pos.z - this.pos.z); this.heading = ang; tele.rect(this.pos.x + Math.sin(ang) * 10, this.pos.z + Math.cos(ang) * 10, 4.4, 20, ang, s.windup * tm, 0xff3b2f); }
    if (a === 'slam') { this.atkTarget.copy(p.pos); tele.circle(p.pos.x, p.pos.z, 4.2, s.windup * tm + 0.6, 0xff3b2f, false); }
    this.ctx.audio.play(a === 'charge' || a === 'slam' || a === 'sweep' ? 'charge' : 'telegraph');
    if (a === 'sweep') this.ctx.events.emit('SAY', { who: 'PÍXEL', text: 'Onda de choque! Pule ou esquive!', dur: 1.6 });
  }
  update(dt: number) {
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt * 5);
    for (const m of this.mats) {
      if (this.flash > 0) { m.emissive.setRGB(1, 0.4 * this.flash, 0.1 * this.flash); m.emissiveIntensity = this.flash * 1.2; m.userData.fl = true; }
      else if (m.userData.fl) { m.emissive.copy(m.userData.baseEm); m.emissiveIntensity = m.userData.baseI; m.userData.fl = false; }
    }
    if (this.coreMat && !this.flash) this.coreMat.emissiveIntensity = this.coreExposed ? 4 + Math.sin(this.ctx.time * 12) * 1.5 : 1.2;
    const p = this.ctx.player;
    const dx = p.pos.x - this.pos.x, dz = p.pos.z - this.pos.z; const dist = Math.hypot(dx, dz);
    const faceP = (rate: number) => { this.heading = dampAngle(this.heading, Math.atan2(dx, dz), rate, dt); };
    const s = this.atk ? SPEC[this.atk] : null;
    const tm = this.ctx.difficultyMul.telegraph * (this.phase === 3 ? 0.85 : 1);
    switch (this.state) {
      case 'dormant': break;
      case 'intro': faceP(2); if (this.t > this.anim.duration('intro')) { this.setState('walk'); this.anim.play('walk', { loop: true }); this.cd = 1; } break;
      case 'transition': if (this.t > 1.6) { this.setState('walk'); this.anim.play('walk', { loop: true }); this.cd = 0.5; } break;
      case 'walk': {
        if (!p.alive) { this.anim.play('idle', { loop: true }); break; }
        faceP(this.phase === 3 ? 3 : 2);
        const speed = this.phase === 1 ? 1.7 : this.phase === 2 ? 2.2 : 2.8;
        if (dist > 3.6) this.move(Math.sin(this.heading) * speed * dt, Math.cos(this.heading) * speed * dt);
        this.anim.play(dist > 3.6 ? 'walk' : 'idle', { loop: true, fade: 0.3 });
        this.cd -= dt;
        if (this.cd <= 0) this.begin(this.choose(dist));
        break;
      }
      case 'windup':
        if (this.atk === 'stomp' || this.atk === 'swing') faceP(1.5);
        if (this.atk === 'charge') faceP(0.8);
        if (this.t >= s!.windup * tm) {
          this.setState('active'); this.anim.play(this.atk!, { fade: 0.05, restart: true, loop: this.atk === 'charge' });
          this.fwd(this.atkDir);
          if (this.atk === 'slam') this.atkFrom.copy(this.pos);
        }
        break;
      case 'active': this.active(dt, dist); break;
      case 'recover':
        if (this.t >= s!.recovery * (this.phase === 3 ? 0.75 : 1)) { this.atk = null; this.setState('walk'); this.anim.play('walk', { loop: true, fade: 0.3 }); this.cd = this.phase === 1 ? 1.0 : this.phase === 2 ? 0.7 : 0.45; }
        break;
      case 'stunned':
        if (Math.random() < 0.15) this.ctx.fx.burst('electric', this.lockPoint(new THREE.Vector3()), 2);
        if (this.t >= this.stunDur) { this.setState('walk'); this.anim.play('walk', { loop: true, fade: 0.3 }); this.cd = 0.6; this.chargeCount = 0; }
        break;
      case 'dead': if (this.t > 3) this.root.position.y = Math.max(-1.5, this.root.position.y - dt * 0.3); if (this.body && this.t > 1) { this.ctx.physics.world.removeRigidBody(this.body); this.body = null; } this.anim.update(dt); return;
    }
    // empurra o jogador para fora do corpo
    this.root.position.set(this.pos.x, this.root.position.y, this.pos.z);
    this.body?.setNextKinematicTranslation({ x: this.pos.x, y: this.root.position.y + 2.4, z: this.pos.z });
    this.root.rotation.y = this.heading;
    this.anim.update(dt);
  }
  private atkFrom = new THREE.Vector3();
  private move(mx: number, mz: number): 'ok' | 'wall' | Column {
    const nx = this.pos.x + mx, nz = this.pos.z + mz;
    for (const c of this.columns) {
      if (c.broken) continue;
      if (Math.hypot(nx - c.x, nz - c.z) < this.radius + 0.9) return c;
    }
    const dc = Math.hypot(nx - this.center.x, nz - this.center.z);
    if (dc > this.arenaR - this.radius - 0.5) return 'wall';
    this.pos.x = nx; this.pos.z = nz; return 'ok';
  }
  private hitPlayer(cx: number, cz: number, r: number, mult = 1, yMax = 1.6) {
    const p = this.ctx.player;
    if (Math.hypot(p.pos.x - cx, p.pos.z - cz) > r + 0.3) return false;
    if (p.pos.y > yMax) return false; // pular sobre a onda de choque
    const s = SPEC[this.atk!];
    return p.applyDamage({ amount: BOSS_B01.attack * s.dmg * mult, stagger: s.stagger, type: 'kinetic', blockable: s.blockable, from: this.pos.clone(), source: this.id });
  }
  private active(dt: number, dist: number) {
    const a = this.atk!; const s = SPEC[a]; const f = this.fwd();
    void dist;
    switch (a) {
      case 'stomp':
        if (!this.hitDone && this.t > 0.05) {
          this.hitDone = true;
          const cx = this.pos.x + f.x * 2.6, cz = this.pos.z + f.z * 2.6;
          this.hitPlayer(cx, cz, 3.2);
          this.ctx.audio.play('stomp'); this.ctx.shake(0.5); this.ctx.fx.burst('dust', new THREE.Vector3(cx, 0.2, cz), 30);
        }
        break;
      case 'swing':
        if (!this.hitDone && this.t > 0.08) {
          this.hitDone = true;
          const cx = this.pos.x + f.x * 3, cz = this.pos.z + f.z * 3;
          this.hitPlayer(cx, cz, 3.6);
          this.ctx.audio.play('whooshHeavy'); this.ctx.shake(0.3);
        }
        break;
      case 'sweep': {
        // onda de choque em anel que expande — pular ou esquivar
        const r = 2 + (this.t / s.active) * 6;
        this.wave += dt;
        if (this.wave > 0.08) { this.wave = 0; for (let i = 0; i < 10; i++) { const ang = Math.random() * Math.PI * 2; this.ctx.fx.burst('dust', new THREE.Vector3(this.pos.x + Math.sin(ang) * r, 0.2, this.pos.z + Math.cos(ang) * r), 1); } }
        if (this.t < 0.06) { this.ctx.audio.play('stomp'); this.ctx.shake(0.6); }
        const p = this.ctx.player; const pd = Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
        if (!this.hitDone && Math.abs(pd - r) < 0.9 && p.pos.y < this.pos.y + 0.7) { this.hitDone = true; this.hitPlayer(p.pos.x, p.pos.z, 1, 1, 0.7); }
        break;
      }
      case 'charge': {
        const sp = this.phase === 1 ? 10 : 12;
        const res = this.move(this.atkDir.x * sp * dt, this.atkDir.z * sp * dt);
        if (Math.random() < 0.7) this.ctx.fx.burst('dust', new THREE.Vector3(this.pos.x, 0.2, this.pos.z), 2);
        if (!this.hitDone && this.hitPlayer(this.pos.x + f.x * 1.5, this.pos.z + f.z * 1.5, this.radius + 0.2)) this.hitDone = true;
        if (res !== 'ok') {
          this.ctx.audio.play('stomp'); this.ctx.audio.play('hitHeavy'); this.ctx.shake(0.9); this.ctx.hitstop(0.12);
          this.ctx.fx.burst('debris', new THREE.Vector3(this.pos.x + f.x * 2, 2, this.pos.z + f.z * 2), 30);
          if (res !== 'wall') { res.breakColumn(); this.stun(this.phase === 3 ? 3.0 : 4.0); this.ctx.audio.play('break'); }
          else this.stun(this.phase === 1 ? 2.2 : 1.6);
          return;
        }
        if (this.t >= s.active) { this.setState('recover'); this.anim.play('idle', { loop: true, fade: 0.3 }); }
        return;
      }
      case 'slam': {
        const k = clamp(this.t / 0.7, 0, 1);
        const tx = this.atkFrom.x + (this.atkTarget.x - this.atkFrom.x) * k, tz = this.atkFrom.z + (this.atkTarget.z - this.atkFrom.z) * k;
        if (Math.hypot(tx - this.center.x, tz - this.center.z) < this.arenaR - this.radius - 0.5) { this.pos.x = tx; this.pos.z = tz; }
        this.root.position.y = Math.sin(k * Math.PI) * 3.5;
        if (k >= 1 && !this.hitDone) {
          this.hitDone = true; this.root.position.y = 0;
          this.hitPlayer(this.pos.x, this.pos.z, 4.2);
          this.ctx.audio.play('stomp'); this.ctx.audio.play('explode', 0.5); this.ctx.shake(1);
          this.ctx.fx.burst('dust', new THREE.Vector3(this.pos.x, 0.3, this.pos.z), 50); this.ctx.fx.burst('debris', new THREE.Vector3(this.pos.x, 0.5, this.pos.z), 20);
        }
        break;
      }
    }
    if (this.t >= s.active) { this.setState('recover'); this.root.position.y = 0; this.anim.play('idle', { loop: true, fade: 0.4 }); }
  }
}

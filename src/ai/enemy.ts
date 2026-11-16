// Inimigos do Mundo 1: FSM com percepção, patrulha, perseguição por A*, telegráficos legíveis e janelas de punição.
import * as THREE from 'three';
import type { GameCtx, Hurtable, PlayerHit } from '../app/context';
import type { EnemyDef, EnemyAttack } from '../content/enemies';
import type { Assets } from '../engine/assets';
import { Animator } from '../engine/animator';
import { clamp, dampAngle } from '../core/math';
import type { SpawnDef } from '../world/level-w01';

type EState = 'idle' | 'patrol' | 'alert' | 'chase' | 'hold' | 'windup' | 'attack' | 'recover' | 'hit' | 'stagger' | 'dead' | 'return';
const TELE: Record<string, number> = { amber: 0xffa62b, red: 0xff3b2f, yellow: 0xffe14a };
let uid = 0;

export class Enemy implements Hurtable {
  id: string; name: string; alive = true; pos: THREE.Vector3; radius: number; height: number; lockable = true;
  root: THREE.Object3D; anim: Animator;
  hp: number; stab: number; heading = 0;
  state: EState = 'idle'; t = 0;
  private home: THREE.Vector3; private patrolIdx = 0;
  private path: [number, number][] | null = null; private pathT = 0; private lastSeen = new THREE.Vector3();
  private cooldowns = new Map<string, number>();
  private atk: EnemyAttack | null = null; private atkDir = new THREE.Vector3(); private atkTarget = new THREE.Vector3(); private hitDone = false; private multiT = 0;
  private hover = 0; private groundY = 0; private groundT = 0;
  private flash = 0; private emissive: THREE.MeshStandardMaterial[] = [];
  deadT = 0; removed = false;
  stolen = 0;
  lastHitT = -10;
  awareness = 0;
  private strafeDir = Math.random() < 0.5 ? 1 : -1; private strafeT = 0;

  constructor(private ctx: GameCtx, assets: Assets, public def: EnemyDef, public spawn: SpawnDef, private onDeath: (e: Enemy) => void) {
    this.id = `${spawn.id}#${++uid}`;
    this.name = def.name; this.radius = def.radius; this.height = def.height;
    const inst = assets.instance(def.model);
    this.root = inst.root; this.anim = new Animator(this.root, inst.clips);
    this.pos = new THREE.Vector3(spawn.x, spawn.y ?? 0, spawn.z);
    this.home = this.pos.clone();
    this.hp = def.hp; this.stab = def.stability;
    this.heading = Math.random() * Math.PI * 2;
    this.root.position.copy(this.pos);
    // materiais próprios para piscar ao levar dano
    this.root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) { m.castShadow = true; const mm = (m.material as THREE.MeshStandardMaterial).clone(); m.material = mm; this.emissive.push(mm); }
    });
    for (const m of this.emissive) m.userData.baseEm = m.emissive.clone(), m.userData.baseI = m.emissiveIntensity;
    ctx.scene.add(this.root);
    this.anim.play('idle', { loop: true });
    this.state = spawn.patrol ? 'patrol' : 'idle';
    if (spawn.patrol) this.anim.play('walk', { loop: true });
  }
  lockPoint(out: THREE.Vector3) { return out.set(this.pos.x, this.pos.y + this.height * 0.6 + this.hover, this.pos.z); }
  hpFrac() { return clamp(this.hp / this.def.hp, 0, 1); }
  stabFrac() { return clamp(this.stab / this.def.stability, 0, 1); }
  private setState(s: EState) { this.state = s; this.t = 0; }
  private fwd(out = new THREE.Vector3()) { return out.set(Math.sin(this.heading), 0, Math.cos(this.heading)); }

  receiveHit(h: PlayerHit) {
    if (!this.alive) return;
    const d = this.def;
    let amount = h.amount * (1 - Math.min(0.7, d.defense / (d.defense + 100)));
    // flanco/traseira exposta do Carregador
    let weak = false;
    if (d.weakBack) { const f = this.fwd(); if (f.dot(h.dir) > 0.35) { amount *= 1.6; weak = true; } }
    if (this.state === 'stagger') amount *= 1.25;
    amount = Math.max(1, Math.round(amount));
    this.hp -= amount;
    this.lastHitT = this.ctx.time;
    this.flash = 1;
    this.awareness = 1;
    this.ctx.damageNumber(this.lockPoint(new THREE.Vector3()), amount, h.crit || weak, weak ? '#ffe14a' : undefined);
    this.ctx.audio.play(h.heavy ? 'hitHeavy' : 'hit'); if (h.crit) this.ctx.audio.play('crit');
    this.ctx.fx.burst(h.heavy ? 'heavy' : 'hit', this.lockPoint(new THREE.Vector3()), h.heavy ? 22 : 12, h.dir);
    this.ctx.events.emit('DAMAGE_APPLIED', { target: this.id, amount, crit: h.crit, blocked: false });
    if (this.hp <= 0) { this.die(h.dir); return; }
    // empurrão
    const kb = h.heavy ? 1.2 : 0.35;
    this.tryMove(h.dir.x * kb, h.dir.z * kb);
    this.stab -= h.stagger;
    if (this.stab <= 0) { this.stagger(); return; }
    // golpe pesado interrompe preparação; leves só interrompem inimigos leves fora de ataque
    if ((h.heavy && this.state === 'windup') || (this.state !== 'attack' && this.state !== 'windup' && d.stability < 40)) {
      this.atk = null; this.setState('hit'); this.anim.play('hit', { fade: 0.05, restart: true });
    }
  }
  stagger(dur = 1.4) {
    this.stab = this.def.stability; this.atk = null;
    this.setState('stagger'); this.staggerDur = dur;
    this.anim.play(this.anim.has('stagger') ? 'stagger' : 'hit', { fade: 0.06, restart: true });
    this.ctx.fx.burst('electric', this.lockPoint(new THREE.Vector3()), 14);
    this.ctx.events.emit('TOAST', { text: 'Atordoado!', kind: 'info' });
  }
  private staggerDur = 1.4;
  private die(dir: THREE.Vector3) {
    this.alive = false; this.setState('dead');
    this.ctx.attackTokens.delete(this.id);
    this.anim.play('death', { fade: 0.08 });
    this.ctx.audio.play('enemyDie');
    const c = this.lockPoint(new THREE.Vector3());
    this.ctx.fx.burst('scrap', c, 18, dir); this.ctx.fx.burst('sparks', c, 20); this.ctx.fx.burst('smoke', c, 8);
    this.ctx.hitstop(0.08); this.ctx.shake(0.2);
    this.onDeath(this);
  }

  /** move respeitando a grade de navegação (desliza por eixo) */
  private tryMove(dx: number, dz: number) {
    const nav = this.ctx.level.nav;
    if (this.def.flying) { this.pos.x += dx; this.pos.z += dz; if (!nav.walkable(this.pos.x, this.pos.z)) { this.pos.x -= dx; this.pos.z -= dz; } return true; }
    const nx = this.pos.x + dx, nz = this.pos.z + dz;
    if (nav.walkable(nx, nz)) { this.pos.x = nx; this.pos.z = nz; return true; }
    if (nav.walkable(nx, this.pos.z)) { this.pos.x = nx; return false; }
    if (nav.walkable(this.pos.x, nz)) { this.pos.z = nz; return false; }
    return false;
  }
  private moveToward(tx: number, tz: number, speed: number, dt: number, face = true) {
    const dx = tx - this.pos.x, dz = tz - this.pos.z; const d = Math.hypot(dx, dz);
    if (d < 0.05) return d;
    const s = Math.min(d, speed * dt);
    this.tryMove((dx / d) * s, (dz / d) * s);
    if (face) this.heading = dampAngle(this.heading, Math.atan2(dx, dz), 8, dt);
    return d;
  }
  private followPath(tx: number, tz: number, speed: number, dt: number) {
    const nav = this.ctx.level.nav;
    if (this.def.flying || nav.clearLine(this.pos.x, this.pos.z, tx, tz)) { this.path = null; return this.moveToward(tx, tz, speed, dt); }
    this.pathT -= dt;
    if (!this.path || this.pathT <= 0) { this.path = nav.findPath(this.pos.x, this.pos.z, tx, tz, 2500); this.pathT = 0.6 + Math.random() * 0.3; }
    if (!this.path || !this.path.length) return this.moveToward(tx, tz, speed * 0.5, dt);
    const [px, pz] = this.path[0];
    const d = this.moveToward(px, pz, speed, dt);
    if (d < 0.4) this.path.shift();
    return Math.hypot(tx - this.pos.x, tz - this.pos.z);
  }
  private canSee(): boolean {
    const p = this.ctx.player; if (!p.alive) return false;
    const dx = p.pos.x - this.pos.x, dz = p.pos.z - this.pos.z; const d = Math.hypot(dx, dz);
    const per = this.def.perception;
    if (d > per.range) return false;
    if (d > 3 && per.fov < 360) {
      const f = this.fwd(); const ang = Math.acos(clamp((f.x * dx + f.z * dz) / d, -1, 1)) * 180 / Math.PI;
      if (ang > per.fov / 2) return false;
    }
    if (Math.abs(p.pos.y - this.pos.y) > 3.5 && !this.def.flying) return d < 6 && this.ctx.physics.lineOfSight(this.pos.x, this.pos.y + 1.2, this.pos.z, p.pos.x, p.pos.y + 1, p.pos.z);
    return this.ctx.physics.lineOfSight(this.pos.x, this.pos.y + Math.min(1.2, this.height), this.pos.z, p.pos.x, p.pos.y + 1, p.pos.z);
  }
  alertNearby() {
    this.awareness = 1;
    if (this.state === 'idle' || this.state === 'patrol' || this.state === 'return') { this.setState('alert'); this.anim.play('alert', { fade: 0.1 }); this.ctx.audio.play('alert', 0.6); }
  }
  private chooseAttack(dist: number): EnemyAttack | null {
    const now = this.ctx.time;
    const opts = this.def.attacks.filter((a) => (this.cooldowns.get(a.id) ?? 0) <= now && dist <= a.range && (a.kind !== 'charge' || dist > 2.5));
    if (!opts.length) return null;
    // prefere o ataque com maior alcance quando distante, e corpo-a-corpo quando perto
    opts.sort((a, b) => (dist > 3 ? b.range - a.range : a.range - b.range));
    return opts[0];
  }

  update(dt: number) {
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt * 5);
    for (const m of this.emissive) {
      if (this.flash > 0) { m.emissive.setRGB(1, 0.35 * this.flash, 0.1 * this.flash); m.emissiveIntensity = this.flash * 1.5; }
      else if (m.userData.flashed) { m.emissive.copy(m.userData.baseEm); m.emissiveIntensity = m.userData.baseI; }
      m.userData.flashed = this.flash > 0;
    }
    if (this.state === 'dead') {
      this.deadT += dt;
      if (this.deadT > 2.2) this.root.position.y -= dt * 0.8;
      if (this.deadT > 4) { this.removed = true; this.ctx.scene.remove(this.root); }
      this.anim.update(dt);
      return;
    }
    const p = this.ctx.player;
    const dx = p.pos.x - this.pos.x, dz = p.pos.z - this.pos.z; const dist = Math.hypot(dx, dz);
    const def = this.def;
    const telegraphMul = this.ctx.difficultyMul.telegraph;
    switch (this.state) {
      case 'idle':
        if (this.t > 2 + Math.random() * 3) { this.heading += (Math.random() - 0.5) * 1.5; this.t = 0; }
        if (this.canSee()) this.alertNearby();
        break;
      case 'patrol': {
        const pts = this.spawn.patrol!; const [tx, tz] = pts[this.patrolIdx % pts.length];
        const d = this.followPath(tx, tz, def.walkSpeed, dt);
        if (d < 0.6) this.patrolIdx++;
        if (this.canSee()) this.alertNearby();
        break;
      }
      case 'alert':
        this.heading = dampAngle(this.heading, Math.atan2(dx, dz), 6, dt);
        if (this.t > 0.55) { this.setState('chase'); this.anim.play(this.anim.has('run') ? 'run' : 'walk', { loop: true, fade: 0.2 }); this.callFriends(); }
        break;
      case 'return': {
        const d = this.followPath(this.home.x, this.home.z, def.walkSpeed, dt);
        if (this.canSee()) this.alertNearby();
        else if (d < 0.8) { this.setState(this.spawn.patrol ? 'patrol' : 'idle'); this.anim.play(this.spawn.patrol ? 'walk' : 'idle', { loop: true }); }
        break;
      }
      case 'chase': case 'hold': {
        if (!p.alive) { this.setState('return'); this.anim.play('walk', { loop: true }); break; }
        const sees = this.canSee();
        if (sees) { this.lastSeen.copy(p.pos); this.awareness = 1; } else this.awareness -= dt * 0.15;
        if (this.awareness <= 0 || Math.hypot(this.pos.x - this.home.x, this.pos.z - this.home.z) > 32) { this.ctx.attackTokens.delete(this.id); this.setState('return'); this.anim.play('walk', { loop: true }); break; }
        const atk = sees ? this.chooseAttack(dist) : null;
        const hasToken = this.ctx.attackTokens.has(this.id) || this.ctx.attackTokens.size < 2;
        if (atk && hasToken && (dist <= atk.range)) { this.ctx.attackTokens.add(this.id); this.beginAttack(atk); break; }
        const want = hasToken ? def.preferredRange * 0.9 : Math.max(def.preferredRange + 2.2, 4.2);
        if (dist > want + 0.3) {
          if (this.state !== 'chase') { this.setState('chase'); this.anim.play(this.anim.has('run') ? 'run' : 'walk', { loop: true, fade: 0.2 }); }
          this.followPath(sees ? p.pos.x : this.lastSeen.x, sees ? p.pos.z : this.lastSeen.z, dist > 6 ? def.runSpeed : def.walkSpeed * 1.3, dt);
        } else {
          // circula em volta do jogador mantendo distância (sem token)
          if (this.state !== 'hold') { this.setState('hold'); this.anim.play('walk', { loop: true, fade: 0.2 }); }
          this.strafeT -= dt; if (this.strafeT <= 0) { this.strafeT = 1.5 + Math.random() * 2; this.strafeDir *= -1; }
          const tx = -dz / Math.max(0.01, dist) * this.strafeDir, tz = dx / Math.max(0.01, dist) * this.strafeDir;
          const back = dist < want - 0.6 ? -1 : 0;
          this.tryMove((tx + back * dx / Math.max(0.01, dist)) * def.walkSpeed * 0.6 * dt, (tz + back * dz / Math.max(0.01, dist)) * def.walkSpeed * 0.6 * dt);
          this.heading = dampAngle(this.heading, Math.atan2(dx, dz), 8, dt);
        }
        break;
      }
      case 'windup': {
        const a = this.atk!;
        if (a.kind !== 'charge' && a.kind !== 'beam') this.heading = dampAngle(this.heading, Math.atan2(dx, dz), 5, dt);
        if (a.kind === 'charge') { this.heading = dampAngle(this.heading, Math.atan2(dx, dz), 3, dt); this.fwd(this.atkDir); }
        if (this.t >= a.windup * telegraphMul) this.startActive();
        break;
      }
      case 'attack': this.updateActive(dt); break;
      case 'recover':
        if (this.t >= (this.atk?.recovery ?? 0.6) * (this.ctx.difficultyMul.extraAttacks ? 0.8 : 1)) { this.ctx.attackTokens.delete(this.id); this.atk = null; this.setState('chase'); this.anim.play(this.anim.has('run') ? 'run' : 'walk', { loop: true, fade: 0.25 }); }
        break;
      case 'hit': if (this.t > 0.35) { this.setState('chase'); this.anim.play('walk', { loop: true, fade: 0.2 }); } break;
      case 'stagger': if (this.t > this.staggerDur) { this.setState('chase'); this.anim.play('walk', { loop: true, fade: 0.2 }); } break;
    }
    // parry do jogador abre o inimigo
    if (p.parried && p.parried === this.id) { p.parried = null; this.stagger(1.8); }
    // separação
    if (dist < this.radius + 0.4 && dist > 0.001 && !this.def.flying) this.tryMove(-dx / dist * (this.radius + 0.4 - dist), -dz / dist * (this.radius + 0.4 - dist));
    // altura do chão (raio a cada 0.15 s)
    this.groundT -= dt;
    if (this.groundT <= 0) { this.groundT = 0.15; const h = this.ctx.physics.rayStatic(this.pos.x, this.pos.y + 1.5, this.pos.z, 0, -1, 0, 4); this.groundY = h === null ? 0 : this.pos.y + 1.5 - h; }
    if (!(this.state === 'attack' && this.atk?.kind === 'leap')) this.pos.y += (this.groundY - this.pos.y) * Math.min(1, dt * 12);
    if (def.flying) this.hover = 0;
    this.root.position.copy(this.pos);
    this.root.rotation.y = this.heading;
    this.root.visible = dist < 55;
    if (this.root.visible) this.anim.update(dt);
  }
  private callFriends() {
    // Patrulheiro alerta outros num raio de 12 m
    if (this.def.id !== 'E02') return;
    this.ctx.events.emit('SAY', { who: 'PÍXEL', text: 'Patrulheiro deu o alarme! Mais deles vindo.', dur: 2.2 });
    for (const t of this.ctx.targets()) if (t !== this && t instanceof Enemy && t.alive && t.pos.distanceTo(this.pos) < 12) t.alertNearby();
  }
  private beginAttack(a: EnemyAttack) {
    this.atk = a; this.hitDone = false; this.multiT = 0;
    this.cooldowns.set(a.id, this.ctx.time + a.cooldown);
    this.setState('windup');
    const p = this.ctx.player;
    this.atkTarget.copy(p.pos);
    this.anim.play(a.windupClip, { fade: 0.08, restart: true, speed: this.anim.duration(a.windupClip) / Math.max(0.1, a.windup * this.ctx.difficultyMul.telegraph) });
    const dur = a.windup * this.ctx.difficultyMul.telegraph;
    const col = TELE[a.telegraph];
    const tele = this.ctx.tele;
    if (a.kind === 'melee') { const f = this.fwd(); tele.circle(this.pos.x + f.x * a.reach * 0.8, this.pos.z + f.z * a.reach * 0.8, a.radius + 0.3, dur, col, true); }
    else if (a.kind === 'leap') tele.circle(p.pos.x, p.pos.z, a.radius + 0.4, dur + 0.2, col, true);
    else if (a.kind === 'charge') { const d = Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z); const ang = Math.atan2(p.pos.x - this.pos.x, p.pos.z - this.pos.z); const L = Math.min(12, (a.speed ?? 8) * a.active); tele.rect(this.pos.x + Math.sin(ang) * L / 2, this.pos.z + Math.cos(ang) * L / 2, a.radius * 2, L, ang, dur, col); void d; }
    else if (a.kind === 'spin') tele.circle(this.pos.x, this.pos.z, a.radius + 0.4, dur, col, true);
    else if (a.kind === 'beam') tele.circle(p.pos.x, p.pos.z, a.radius, dur + a.active, col, false);
    this.ctx.audio.play(a.telegraph === 'red' ? 'charge' : 'telegraph', 0.7);
    if (a.kind === 'spin') this.ctx.audio.play('saw', 0.6);
  }
  private startActive() {
    const a = this.atk!;
    this.setState('attack');
    this.anim.play(a.attackClip, { fade: 0.05, restart: true, loop: a.kind === 'spin' || a.kind === 'charge', speed: a.kind === 'leap' ? 1.3 : 1 });
    if (a.kind === 'leap') { const p = this.ctx.player; this.atkTarget.set(p.pos.x, p.pos.y, p.pos.z); this.leapFrom = this.pos.clone(); }
    if (a.kind === 'beam') this.ctx.audio.play('beam');
    if (a.kind === 'charge') this.fwd(this.atkDir);
  }
  private leapFrom = new THREE.Vector3();
  private updateActive(dt: number) {
    const a = this.atk!; const p = this.ctx.player;
    const hitPlayer = (cx: number, cy: number, cz: number, r: number, mult = 1) => {
      const d = Math.hypot(p.pos.x - cx, p.pos.z - cz);
      if (d > r + 0.35 || Math.abs(p.pos.y + 0.8 - cy) > 1.6) return false;
      const ok = p.applyDamage({ amount: this.def.attack * a.damage * mult, stagger: a.stagger, type: a.type, blockable: a.blockable, from: this.pos.clone(), source: this.id });
      if (ok && this.def.steals) { const s = Math.min(12, this.ctx.state.inventory.materials.scrap); if (s > 0) { this.ctx.state.inventory.materials.scrap -= s; this.stolen += s; this.ctx.audio.play('steal'); this.ctx.events.emit('TOAST', { text: `Drone roubou ${s} sucata! Derrube-o para recuperar.`, kind: 'warn' }); } }
      return true;
    };
    switch (a.kind) {
      case 'melee':
        if (!this.hitDone && this.t >= 0.02) { const f = this.fwd(); this.hitDone = true; hitPlayer(this.pos.x + f.x * a.reach, this.pos.y + 1, this.pos.z + f.z * a.reach, a.radius); this.ctx.fx.burst(a.type === 'electric' ? 'electric' : 'dust', new THREE.Vector3(this.pos.x + f.x * a.reach, this.pos.y + 0.9, this.pos.z + f.z * a.reach), 8); }
        if (this.t >= a.active) this.endActive();
        break;
      case 'leap': {
        const k = clamp(this.t / a.active, 0, 1);
        const tx = this.leapFrom.x + (this.atkTarget.x - this.leapFrom.x) * k, tz = this.leapFrom.z + (this.atkTarget.z - this.leapFrom.z) * k;
        const nav = this.ctx.level.nav;
        if (nav.walkable(tx, tz)) { this.pos.x = tx; this.pos.z = tz; }
        this.pos.y = this.groundY + Math.sin(k * Math.PI) * 1.4;
        if (!this.hitDone && k > 0.5) { if (hitPlayer(this.pos.x, this.pos.y + 0.4, this.pos.z, a.radius)) this.hitDone = true; }
        if (k >= 1) { this.ctx.fx.burst('dust', this.pos, 8); this.endActive(); }
        break;
      }
      case 'charge': {
        const sp = a.speed ?? 8;
        const moved = this.tryMove(this.atkDir.x * sp * dt, this.atkDir.z * sp * dt);
        if (Math.random() < 0.5) this.ctx.fx.burst('dust', this.pos, 1);
        if (!this.hitDone && hitPlayer(this.pos.x, this.pos.y + 1, this.pos.z, a.radius)) this.hitDone = true;
        if (!moved) { this.ctx.shake(0.15); this.ctx.audio.play('hitHeavy', 0.6); this.ctx.fx.burst('sparks', this.lockPoint(new THREE.Vector3()), 12); this.endActive(true); break; }
        if (this.t >= a.active) this.endActive();
        break;
      }
      case 'spin': {
        this.moveToward(p.pos.x, p.pos.z, a.speed ?? 2, dt, false);
        this.multiT -= dt;
        if (this.multiT <= 0) { this.multiT = 0.3; hitPlayer(this.pos.x, this.pos.y + 0.6, this.pos.z, a.radius); this.ctx.fx.burst('sparks', new THREE.Vector3(this.pos.x, this.pos.y + 0.5, this.pos.z), 5); }
        if (this.t >= a.active) this.endActive();
        break;
      }
      case 'beam': {
        this.heading = dampAngle(this.heading, Math.atan2(this.atkTarget.x - this.pos.x, this.atkTarget.z - this.pos.z), 8, dt);
        if (Math.random() < 0.6) this.ctx.fx.burst('electric', new THREE.Vector3(this.atkTarget.x, 0.2, this.atkTarget.z), 2);
        if (!this.hitDone && this.t > 0.1) { if (hitPlayer(this.atkTarget.x, p.pos.y + 0.8, this.atkTarget.z, a.radius)) this.hitDone = true; }
        if (this.t >= a.active) this.endActive();
        break;
      }
    }
  }
  private endActive(wallHit = false) {
    const a = this.atk!;
    this.setState('recover');
    if (a.recoverClip && this.anim.has(a.recoverClip)) this.anim.play(a.recoverClip, { fade: 0.1, restart: true }); else this.anim.play('idle', { loop: true, fade: 0.2 });
    if (wallHit) { this.t = -0.8; this.ctx.fx.burst('electric', this.lockPoint(new THREE.Vector3()), 10); }
  }
}

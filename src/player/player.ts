// Z-01: controlador de personagem (Rapier KCC), FSM e combate com hitboxes ligadas ao trecho ativo dos golpes.
import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import type { GameCtx, Hurtable, EnemyHit } from '../app/context';
import { Robot } from './robot';
import { ATTACKS, COMBO, HEAVY, type AttackDef } from '../content/attacks';
import { computeDamage } from '../combat/damage';
import { clamp, damp, dampAngle, wrapAngle } from '../core/math';

export type PState = 'idle' | 'move' | 'jump' | 'fall' | 'land' | 'dodge' | 'attack' | 'block' | 'parry' | 'hit' | 'stagger' | 'interact' | 'pull' | 'equip' | 'disabled' | 'cutscene';

const RADIUS = 0.32, HALF = 0.48; // cápsula total 1.6 m
const KCC_OFFSET = 0.02; // folga do controlador de personagem (a cápsula fica 2 cm acima do piso)
const GRAVITY = 24;
const WALK = 4.5, SPRINT = 7;

export class Player {
  robot: Robot;
  body: RAPIER.RigidBody; col: RAPIER.Collider; kcc: RAPIER.KinematicCharacterController;
  pos = new THREE.Vector3(); // pés
  vel = new THREE.Vector3();
  heading = 0;
  state: PState = 'idle';
  stateT = 0;
  grounded = true;
  private coyote = 0; private jumpBuffer = 0; private fallStartY = 0;
  hp = 100; en = 100; heat = 0; stab = 60;
  private enIdle = 0; private stabIdle = 0; private heatLock = 0;
  private iframes = 0; private invulnUntil = 0;
  // combate
  attack: AttackDef | null = null; private comboIdx = 0; private comboT = 0; private bufferedAttack = 0; private bufferedHeavy = 0;
  private victims = new Set<string>();
  private dodgeDir = new THREE.Vector3();
  blockHeld = false; private blockStart = -10;
  lockTarget: Hurtable | null = null;
  abilityCd = 0;
  sprinting = false;
  private stepT = 0;
  hurtFlash = 0;
  pulling: { target: THREE.Vector3; done: () => void; t: number; dur: number } | null = null;
  cable: THREE.Line;
  conveyorPush = new THREE.Vector3();
  respawnInvuln = 0;
  /** posição no passo físico anterior (interpolação de render) */
  prevPos = new THREE.Vector3();
  private visY = 0;
  private tmp = new THREE.Vector3(); private tmp2 = new THREE.Vector3();

  constructor(private ctx: GameCtx, assets: import('../engine/assets').Assets, spawn: THREE.Vector3) {
    this.robot = new Robot(assets);
    ctx.scene.add(this.robot.root);
    const P = ctx.physics;
    this.body = P.world.createRigidBody(P.R.RigidBodyDesc.kinematicPositionBased().setTranslation(spawn.x, spawn.y + HALF + RADIUS, spawn.z));
    this.col = P.world.createCollider(P.R.ColliderDesc.capsule(HALF, RADIUS), this.body);
    this.kcc = P.world.createCharacterController(KCC_OFFSET);
    this.kcc.enableAutostep(0.36, 0.25, false);
    this.kcc.enableSnapToGround(0.35);
    this.kcc.setMaxSlopeClimbAngle((52 * Math.PI) / 180);
    this.kcc.setMinSlopeSlideAngle((60 * Math.PI) / 180);
    this.kcc.setApplyImpulsesToDynamicBodies(false);
    this.pos.copy(spawn); this.prevPos.copy(spawn);
    const cg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, 1)]);
    this.cable = new THREE.Line(cg, new THREE.LineBasicMaterial({ color: 0x39f0ff }));
    this.cable.visible = false; this.cable.frustumCulled = false;
    ctx.scene.add(this.cable);
  }

  teleport(p: THREE.Vector3, heading?: number) {
    this.body.setTranslation({ x: p.x, y: p.y + HALF + RADIUS + 0.05, z: p.z }, true);
    this.body.setNextKinematicTranslation({ x: p.x, y: p.y + HALF + RADIUS + 0.05, z: p.z });
    this.pos.copy(p); this.prevPos.copy(p); this.visY = p.y; this.vel.set(0, 0, 0);
    this.fallStartY = p.y;
    if (heading !== undefined) this.heading = heading;
    this.robot.root.position.copy(p); this.robot.root.rotation.y = this.heading;
  }
  get alive() { return this.state !== 'disabled'; }
  get busy() { return ['attack', 'dodge', 'hit', 'stagger', 'interact', 'pull', 'equip', 'disabled', 'cutscene', 'parry'].includes(this.state); }
  setState(s: PState) { this.state = s; this.stateT = 0; }
  center(out = new THREE.Vector3()) { return out.set(this.pos.x, this.pos.y + 0.85, this.pos.z); }
  forward(out = new THREE.Vector3()) { return out.set(Math.sin(this.heading), 0, Math.cos(this.heading)); }

  refreshStats(full = false) {
    const st = this.ctx.stats;
    if (full) { this.hp = st.hpMax; this.en = st.enMax; }
    this.hp = Math.min(this.hp, st.hpMax); this.en = Math.min(this.en, st.enMax);
  }

  fixedUpdate(dt: number) {
    this.prevPos.copy(this.pos);
    const { input, cam, stats } = this.ctx;
    this.stateT += dt;
    this.abilityCd = Math.max(0, this.abilityCd - dt);
    this.iframes = Math.max(0, this.iframes - dt);
    this.respawnInvuln = Math.max(0, this.respawnInvuln - dt);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt * 2.5);
    this.bufferedAttack = Math.max(0, this.bufferedAttack - dt);
    this.bufferedHeavy = Math.max(0, this.bufferedHeavy - dt);
    this.comboT = Math.max(0, this.comboT - dt);
    // recursos
    this.enIdle += dt; this.stabIdle += dt;
    this.heatLock = Math.max(0, this.heatLock - dt);
    if (this.enIdle > 0.6 && !this.sprinting && !this.blockHeld) this.en = Math.min(stats.enMax, this.en + stats.enRegen * dt);
    if (this.stabIdle > 2) this.stab = Math.min(60, this.stab + 8 * dt);
    this.heat = Math.max(0, this.heat - 18 * dt);

    const disabledInput = this.state === 'disabled' || this.state === 'cutscene';
    // entrada (com buffer)
    if (!disabledInput) {
      if (input.consume('attack')) this.bufferedAttack = 0.28;
      if (input.consume('heavy')) this.bufferedHeavy = 0.28;
      if (input.consume('jump')) this.jumpBuffer = 0.12;
    }
    this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);

    // direção desejada relativa à câmera
    const f = cam.forward(this.tmp), r = cam.right(this.tmp2);
    const want = new THREE.Vector3().addScaledVector(f, input.move.y).addScaledVector(r, input.move.x);
    const mag = Math.min(1, want.length());
    if (mag > 0.01) want.normalize();
    if (disabledInput) want.set(0, 0, 0);

    // bloqueio
    const blockNow = !disabledInput && input.isHeld('block') && !this.busy && this.en > 1;
    if (blockNow && !this.blockHeld) { this.blockStart = this.ctx.time; this.robot.play('block', { loop: true, fade: 0.08 }); this.setState('block'); }
    if (!blockNow && this.blockHeld && this.state === 'block') { this.robot.release(0.12); this.setState('idle'); }
    this.blockHeld = blockNow && this.state === 'block';
    if (this.blockHeld) { this.en -= 5 * dt; this.enIdle = 0; }

    // esquiva / corrida (toque = esquiva, segurar = corrida)
    const dodgeHeld = !disabledInput && input.isHeld('dodge');
    const holdT = input.holdTime.dodge ?? 0;
    if (input.pressed('dodge') && !disabledInput) { /* decide no soltar */ }
    const releasedDodge = !dodgeHeld && this.wasDodgeHeld && this.lastDodgeHold < 0.22;
    this.lastDodgeHold = dodgeHeld ? holdT : this.lastDodgeHold;
    this.wasDodgeHeld = dodgeHeld;
    const canCancel = this.state === 'attack' && this.attack && this.stateT > this.attack.startup + this.attack.active + this.attack.recovery - this.attack.cancel;
    if (releasedDodge && (!this.busy || canCancel) && this.state !== 'dodge') this.tryDodge(want, mag);
    this.sprinting = dodgeHeld && holdT >= 0.22 && mag > 0.3 && !this.busy && this.en > 2 && this.grounded;
    if (this.sprinting) { this.en -= 10 * dt; this.enIdle = 0; }

    // ataques
    if (this.bufferedHeavy > 0 && (!this.busy || canCancel) && this.grounded) this.tryHeavy();
    else if (this.bufferedAttack > 0 && (!this.busy || canCancel) && this.state !== 'block') this.tryAttack();

    // habilidade de módulo
    if (!disabledInput && input.consume('ability') && !this.busy) this.ctx.events.emit('MODULE_ACTIVATED', { ability: 'request' });

    // ---- estados ----
    let speed = 0;
    const horiz = new THREE.Vector3(this.vel.x, 0, this.vel.z);
    switch (this.state) {
      case 'attack': this.updateAttack(dt, horiz); break;
      case 'dodge': {
        const T = 0.45; const k = this.stateT / T;
        const spd = 11 * (1 - k) * (1 - k) + 1.5;
        horiz.copy(this.dodgeDir).multiplyScalar(spd);
        if (this.stateT >= T) { this.setState('idle'); this.robot.release(0.15); }
        break;
      }
      case 'hit': horiz.multiplyScalar(Math.exp(-8 * dt)); if (this.stateT > 0.35) { this.setState('idle'); this.robot.release(); } break;
      case 'stagger': horiz.multiplyScalar(Math.exp(-6 * dt)); if (this.stateT > 0.9) { this.setState('idle'); this.robot.release(); } break;
      case 'parry': horiz.set(0, 0, 0); if (this.stateT > 0.35) { this.setState(this.blockHeld ? 'block' : 'idle'); this.robot.release(); } break;
      case 'interact': case 'equip': horiz.set(0, 0, 0); break;
      case 'pull': horiz.set(0, 0, 0); this.updatePull(dt); break;
      case 'disabled': case 'cutscene': horiz.multiplyScalar(Math.exp(-10 * dt)); break;
      case 'land': if (this.stateT > 0.18) { this.setState('idle'); this.robot.release(0.2); } // continua para mover
      // eslint-disable-next-line no-fallthrough
      default: {
        const max = (this.sprinting ? SPRINT : WALK) * stats.speedMul * (this.blockHeld ? 0.35 : 1) * (this.state === 'land' ? 0.5 : 1);
        const target = want.clone().multiplyScalar(max * mag);
        const accel = this.grounded ? (mag > 0.01 ? 22 : 26) : 8;
        horiz.x = damp(horiz.x, target.x, accel / Math.max(1, max) * 2.2, dt);
        horiz.z = damp(horiz.z, target.z, accel / Math.max(1, max) * 2.2, dt);
        if (mag > 0.01) {
          const face = this.lockTarget && this.blockHeld ? Math.atan2(this.lockTarget.pos.x - this.pos.x, this.lockTarget.pos.z - this.pos.z) : Math.atan2(want.x, want.z);
          this.heading = dampAngle(this.heading, face, this.grounded ? 12 : 5, dt);
        } else if (this.lockTarget && this.blockHeld) this.heading = dampAngle(this.heading, Math.atan2(this.lockTarget.pos.x - this.pos.x, this.lockTarget.pos.z - this.pos.z), 10, dt);
        if (this.state !== 'block' && this.state !== 'land') {
          if (!this.grounded) { if (this.vel.y < -1 && this.state !== 'fall') { this.setState('fall'); this.robot.play('fall', { loop: true, fade: 0.25 }); } }
          else this.state = horiz.lengthSq() > 0.05 ? 'move' : 'idle';
        }
      }
    }
    // salto
    if (this.grounded) this.coyote = 0.1; else this.coyote = Math.max(0, this.coyote - dt);
    if (this.jumpBuffer > 0 && this.coyote > 0 && (!this.busy || this.state === 'land') && this.state !== 'block') {
      const h = 1.25 * stats.jumpMul;
      this.vel.y = Math.sqrt(2 * GRAVITY * h);
      this.jumpBuffer = 0; this.coyote = 0; this.grounded = false;
      this.setState('jump'); this.robot.play('jump', { fade: 0.06 });
      this.ctx.audio.play('jump'); this.ctx.fx.burst('dust', this.pos, 5);
      this.fallStartY = this.pos.y;
    }
    // gravidade
    this.vel.y -= GRAVITY * dt;
    // no chão não empurramos a cápsula para baixo: o snap-to-ground do KCC cola nas descidas. Empurrar contra o
    // chão fazia o Rapier zerar o deslocamento horizontal em passos aleatórios (o "engasgo" ao andar).
    if (this.grounded && this.vel.y < 0) this.vel.y = 0;
    this.vel.x = horiz.x; this.vel.z = horiz.z;

    // esteiras
    const push = this.conveyorPush;
    // movimento com colisão
    const disp = { x: (this.vel.x + push.x) * dt, y: this.vel.y * dt, z: (this.vel.z + push.z) * dt };
    this.kcc.computeColliderMovement(this.col, disp);
    const m = this.kcc.computedMovement();
    const t = this.body.translation();
    const wasGrounded = this.grounded;
    this.grounded = this.kcc.computedGrounded();
    if (this.vel.y > 0 && m.y < disp.y * 0.5) this.vel.y = 0; // bateu a cabeça
    this.body.setNextKinematicTranslation({ x: t.x + m.x, y: t.y + m.y, z: t.z + m.z });
    this.pos.set(t.x + m.x, t.y + m.y - HALF - RADIUS, t.z + m.z);
    // aterrissagem
    if (!wasGrounded && this.grounded) {
      const fall = this.fallStartY - this.pos.y;
      if (this.state === 'fall' || this.state === 'jump') {
        this.setState('land'); this.robot.play('land', { fade: 0.05 });
        this.ctx.audio.play('land'); this.ctx.fx.burst('dust', this.pos, 8);
        if (fall > 6.5) this.applyDamage({ amount: Math.round((fall - 6.5) * 9), stagger: 20, type: 'kinetic', blockable: false, from: this.pos.clone(), source: 'queda' });
      }
    }
    if (this.grounded) this.fallStartY = this.pos.y; else if (this.vel.y > 0) this.fallStartY = Math.max(this.fallStartY, this.pos.y);
    if (this.pos.y < -20) this.ctx.events.emit('TOAST', { text: 'Fora da área jogável — retornando.', kind: 'warn' });
    // passos
    const hs = Math.hypot(this.vel.x, this.vel.z);
    if (this.grounded && hs > 1 && !this.busy) {
      this.stepT -= dt * (hs / 2.2);
      if (this.stepT <= 0) { this.stepT = 0.5; this.ctx.audio.play('step', 0.6 + hs * 0.06); if (this.sprinting) this.ctx.fx.burst('dust', this.pos, 2); }
    }
    speed = hs;
    this.lastSpeed = speed;
  }
  private wasDodgeHeld = false; private lastDodgeHold = 0; lastSpeed = 0;

  private tryDodge(want: THREE.Vector3, mag: number) {
    const cost = this.ctx.stats.dodgeCost;
    if (this.en < cost) { this.ctx.audio.play('deny'); this.ctx.events.emit('TOAST', { text: 'Energia insuficiente para esquivar', kind: 'warn' }); return; }
    this.en -= cost; this.enIdle = 0;
    if (mag > 0.1) this.dodgeDir.copy(want); else this.forward(this.dodgeDir).multiplyScalar(-1);
    this.dodgeDir.y = 0; this.dodgeDir.normalize();
    if (mag > 0.1) this.heading = Math.atan2(this.dodgeDir.x, this.dodgeDir.z);
    this.iframes = 0.24; this.invulnUntil = this.ctx.time + 0.24;
    this.attack = null;
    this.setState('dodge'); this.robot.play('dodge', { fade: 0.05, speed: 1 });
    this.ctx.audio.play('dodge'); this.ctx.fx.burst('dust', this.pos, 6);
  }
  private moveset() { return this.ctx.stats.moveset; }
  private tryAttack() {
    this.bufferedAttack = 0;
    const set = COMBO[this.moveset()];
    if (this.state !== 'attack' || this.comboT <= 0) this.comboIdx = 0;
    const def = ATTACKS[set[this.comboIdx % set.length]];
    this.comboIdx = (this.comboIdx + 1) % set.length;
    this.startAttack(def);
  }
  private tryHeavy() {
    this.bufferedHeavy = 0;
    const id = HEAVY[this.moveset()];
    if (!id) { this.ctx.audio.play('deny'); this.ctx.events.emit('TOAST', { text: 'Golpe pesado exige um braço direito de impacto', kind: 'warn' }); return; }
    if (this.heatLock > 0) { this.ctx.audio.play('deny'); this.ctx.events.emit('TOAST', { text: 'Superaquecido!', kind: 'warn' }); return; }
    const def = ATTACKS[id];
    if (this.en < def.energy) { this.ctx.audio.play('deny'); this.ctx.events.emit('TOAST', { text: 'Energia insuficiente', kind: 'warn' }); return; }
    this.en -= def.energy; this.enIdle = 0;
    this.heat += 30; if (this.heat >= 100) { this.heat = 100; this.heatLock = 3; }
    this.comboIdx = 0;
    this.startAttack(def);
  }
  private startAttack(def: AttackDef) {
    this.attack = def; this.victims.clear(); this.plateChecked = false;
    this.setState('attack');
    // assistência de mira: vira para o alvo mais próximo à frente (MIRA aumenta)
    const assist = this.ctx.stats.abilities.has('aimAssist') ? 1.08 : 1;
    const t = this.lockTarget ?? this.softTarget(3.4 * assist, 1.3 * assist);
    if (t) this.heading = Math.atan2(t.pos.x - this.pos.x, t.pos.z - this.pos.z);
    else { const mv = this.ctx.input.move; if (Math.abs(mv.x) + Math.abs(mv.y) > 0.2) { const f = this.ctx.cam.forward(this.tmp), r = this.ctx.cam.right(this.tmp2); const w = f.multiplyScalar(mv.y).add(r.multiplyScalar(mv.x)); this.heading = Math.atan2(w.x, w.z); } }
    const total = def.startup + def.active + def.recovery;
    const clip = this.robot.actions.get(def.clip)!.getClip();
    this.robot.play(def.clip, { fade: 0.06, restart: true, speed: clip.duration / total });
    this.ctx.audio.play(def.dmgMul > 1.5 ? 'whooshHeavy' : 'whoosh', 0.8);
    if (def.id === 'heavy' || def.id === 'hammerHeavy') this.ctx.audio.play('servo');
  }
  softTarget(range: number, cone: number): Hurtable | null {
    let best: Hurtable | null = null, bd = 1e9;
    const fw = this.forward(this.tmp);
    for (const h of this.ctx.targets()) {
      if (!h.alive) continue;
      const dx = h.pos.x - this.pos.x, dz = h.pos.z - this.pos.z;
      const d = Math.hypot(dx, dz) - h.radius;
      if (d > range) continue;
      const ang = Math.acos(clamp((dx * fw.x + dz * fw.z) / Math.max(0.01, Math.hypot(dx, dz)), -1, 1));
      if (ang > cone) continue;
      if (d < bd) { bd = d; best = h; }
    }
    return best;
  }
  private updateAttack(dt: number, horiz: THREE.Vector3) {
    const a = this.attack!;
    const total = a.startup + a.active + a.recovery;
    // avanço (lunge) durante a preparação e parte ativa
    if (this.stateT < a.startup + a.active * 0.5) { const f = this.forward(this.tmp); const k = a.lunge / (a.startup + a.active * 0.5); horiz.set(f.x * k, 0, f.z * k); if (this.lockTarget || this.softTarget(1.0, 1.2)) horiz.multiplyScalar(0.35); }
    else horiz.multiplyScalar(Math.exp(-14 * dt));
    if (this.stateT >= a.startup && this.stateT <= a.startup + a.active) this.resolveHits(a);
    if (this.stateT >= total) { this.attack = null; this.comboT = 0.35; this.setState('idle'); this.robot.release(0.16); }
  }
  hitCenter(a: AttackDef, out: THREE.Vector3) { const f = this.forward(this.tmp2); return out.set(this.pos.x + f.x * a.reach, this.pos.y + 0.95, this.pos.z + f.z * a.reach); }
  private resolveHits(a: AttackDef) {
    const c = this.hitCenter(a, new THREE.Vector3());
    let hitAny = false;
    for (const h of this.ctx.targets()) {
      if (!h.alive || this.victims.has(h.id) || this.victims.size >= a.maxVictims) continue;
      // esfera vs cilindro do alvo
      const dx = h.pos.x - c.x, dz = h.pos.z - c.z;
      const dh = Math.hypot(dx, dz) - h.radius;
      const dy = c.y < h.pos.y ? h.pos.y - c.y : c.y > h.pos.y + h.height ? c.y - (h.pos.y + h.height) : 0;
      if (dh > a.radius || dy > a.radius) continue;
      // não atravessa paredes
      if (!this.ctx.physics.lineOfSight(this.pos.x, this.pos.y + 1, this.pos.z, h.pos.x, h.pos.y + Math.min(1, h.height * 0.5), h.pos.z)) continue;
      this.victims.add(h.id);
      const st = this.ctx.stats;
      const dmg = computeDamage({ attackPower: st.attack, hitMul: a.dmgMul, defense: 0, critChance: st.crit, critMul: 1.35 });
      const dir = new THREE.Vector3(dx, 0, dz).normalize();
      h.receiveHit({ amount: dmg.amount, crit: dmg.crit, stagger: a.stagger + st.stagger, dir, heavy: a.dmgMul >= 1.6, from: this.pos.clone(), attackId: a.id });
      hitAny = true;
    }
    // chapas rachadas só cedem ao golpe pesado
    if (a.breaksPlates && !this.plateChecked) { this.plateChecked = true; this.ctx.heavyImpact(c); }
    if (hitAny) {
      this.ctx.hitstop(a.dmgMul >= 1.6 ? 0.09 : 0.045);
      this.ctx.shake(a.shake);
      this.ctx.input.vibrate(a.dmgMul >= 1.6 ? 120 : 50, a.dmgMul >= 1.6 ? 0.8 : 0.4);
    }
  }

  /** dano recebido; retorna se acertou */
  applyDamage(h: EnemyHit): boolean {
    if (this.state === 'disabled' || this.respawnInvuln > 0) return false;
    if (this.iframes > 0) { this.ctx.events.emit('TOAST', { text: 'Esquiva perfeita!', kind: 'info' }); return false; }
    const dm = this.ctx.difficultyMul.dmgTaken;
    let amount = h.amount;
    // bloqueio/aparo: ângulo frontal de 110°
    if (this.blockHeld && h.blockable) {
      const to = new THREE.Vector3(h.from.x - this.pos.x, 0, h.from.z - this.pos.z).normalize();
      const fw = this.forward();
      const ang = Math.acos(clamp(to.dot(fw), -1, 1));
      if (ang < (55 * Math.PI) / 180) {
        if (this.ctx.time - this.blockStart <= 0.16 && this.en >= 10) {
          this.en -= 10;
          this.setState('parry'); this.robot.play('parry', { fade: 0.03, restart: true });
          this.ctx.audio.play('parry'); this.ctx.fx.burst('sparks', this.center(), 18); this.ctx.hitstop(0.12);
          this.ctx.events.emit('TOAST', { text: 'APARADO! Contra-ataque aberto', kind: 'info' });
          this.parried = h.source;
          return false;
        }
        const red = h.type === 'electric' ? this.ctx.stats.blockReduce * 0.7 : this.ctx.stats.blockReduce;
        amount = amount * (1 - red);
        this.en -= Math.min(this.en, 6); this.enIdle = 0;
        this.ctx.audio.play('block'); this.ctx.fx.burst('sparks', this.center(), 8);
        const final = Math.max(1, Math.round(computeDamage({ attackPower: amount, hitMul: 1, defense: this.ctx.stats.defense, difficultyMul: dm }).amount));
        this.hp -= final; this.stab -= h.stagger * 0.3; this.stabIdle = 0;
        this.ctx.events.emit('DAMAGE_APPLIED', { target: 'player', amount: final, crit: false, blocked: true });
        if (this.hp <= 0) this.die();
        return true;
      }
    }
    const final = computeDamage({ attackPower: amount, hitMul: 1, defense: this.ctx.stats.defense, difficultyMul: dm }).amount;
    this.hp -= final; this.stab -= h.stagger; this.stabIdle = 0;
    this.hurtFlash = 1;
    this.ctx.events.emit('DAMAGE_APPLIED', { target: 'player', amount: final, crit: false, blocked: false });
    this.ctx.audio.play('hurt'); this.ctx.shake(0.25); this.ctx.input.vibrate(140, 0.9);
    this.ctx.fx.burst('hit', this.center(), 10);
    if (this.hp <= 0) { this.die(); return true; }
    const away = new THREE.Vector3(this.pos.x - h.from.x, 0, this.pos.z - h.from.z).normalize();
    this.attack = null;
    if (this.stab <= 0) { this.stab = 60; this.setState('stagger'); this.robot.play('hit', { fade: 0.04, restart: true, speed: 0.4 }); this.vel.x = away.x * 6; this.vel.z = away.z * 6; }
    else if (this.state !== 'pull') { this.setState('hit'); this.robot.play('hit', { fade: 0.04, restart: true }); this.vel.x = away.x * 3.5; this.vel.z = away.z * 3.5; }
    return true;
  }
  parried: string | null = null;
  private plateChecked = false;
  die() {
    this.hp = 0;
    this.attack = null; this.blockHeld = false; this.lockTarget = null;
    this.setState('disabled'); this.robot.play('death', { fade: 0.1 });
    this.ctx.audio.play('death'); this.ctx.fx.burst('sparks', this.center(), 24); this.ctx.fx.burst('smoke', this.center(), 10);
  }
  revive(at: THREE.Vector3, heading: number) {
    this.teleport(at, heading);
    this.hp = this.ctx.stats.hpMax; this.en = this.ctx.stats.enMax; this.stab = 60; this.heat = 0;
    this.respawnInvuln = 2;
    this.setState('idle'); this.robot.play('getup', { fade: 0.01 });
    setTimeout(() => { if (this.state === 'idle') this.robot.release(0.3); }, 900);
  }
  startPull(target: THREE.Vector3, dur: number, done: () => void) {
    this.pulling = { target, done, t: 0, dur };
    this.heading = Math.atan2(target.x - this.pos.x, target.z - this.pos.z);
    this.setState('pull'); this.robot.play('pull', { loop: true, fade: 0.1 });
    this.cable.visible = true;
    this.ctx.audio.play('winch');
  }
  private updatePull(dt: number) {
    const p = this.pulling; if (!p) { this.setState('idle'); return; }
    p.t += dt;
    const hook = new THREE.Vector3(); this.robot.socketWorld('elbowL', hook);
    const fw = this.forward(); hook.addScaledVector(fw, 0.3); hook.y -= 0.2;
    const arr = (this.cable.geometry as THREE.BufferGeometry).attributes.position as THREE.BufferAttribute;
    arr.setXYZ(0, hook.x, hook.y, hook.z); arr.setXYZ(1, p.target.x, p.target.y, p.target.z); arr.needsUpdate = true;
    if (Math.random() < 0.3) this.ctx.fx.burst('sparks', p.target, 1);
    if (p.t >= p.dur) { this.cable.visible = false; const d = p.done; this.pulling = null; this.setState('idle'); this.robot.release(0.2); d(); }
  }
  playInteract(dur = 0.9, clipName = 'interact') {
    this.setState('interact'); this.robot.play(clipName, { fade: 0.1, restart: true });
    setTimeout(() => { if (this.state === 'interact') { this.setState('idle'); this.robot.release(0.2); } }, dur * 1000);
  }
  playEquip() {
    this.setState('equip'); this.robot.play('equip', { fade: 0.1, restart: true });
    this.ctx.audio.play('equip');
    for (let i = 0; i < 4; i++) setTimeout(() => this.ctx.fx.burst('weld', this.center(), 8), i * 220);
    setTimeout(() => { if (this.state === 'equip') { this.setState('idle'); this.robot.release(0.25); } }, 1200);
  }
  /** visual: interpolação simples por quadro */
  /** alpha = fração do passo físico já acumulada; interpola entre os dois últimos passos para não tremer */
  render(dt: number, alpha = 1) {
    const root = this.robot.root;
    root.position.lerpVectors(this.prevPos, this.pos, Math.min(1, Math.max(0, alpha)));
    // altura visual: no chão o KCC flutua ~2 cm (offset) e tem ruído de 1–2 cm entre passos; filtra só esse ruído
    // (atraso limitado a 3 cm, para rampas e degraus continuarem colados) e assenta o robô no piso
    if (this.grounded) {
      const target = root.position.y - KCC_OFFSET;
      const k = 1 - Math.exp(-30 * dt);
      this.visY = Math.min(target + 0.03, Math.max(target - 0.03, this.visY + (target - this.visY) * k));
      root.position.y = this.visY;
    } else this.visY = root.position.y;
    root.rotation.y = this.heading;
    this.robot.update(dt, this.state === 'move' || this.state === 'idle' || this.state === 'block' ? this.lastSpeed : 0, this.grounded);
    // olhos piscam vermelhos ao levar dano
    for (const m of this.robot.eyeMats) m.emissiveIntensity = 2.2 + this.hurtFlash * 3;
  }
  get invulnerable() { return this.iframes > 0 || this.respawnInvuln > 0; }
  wrap() { this.heading = wrapAngle(this.heading); }
}

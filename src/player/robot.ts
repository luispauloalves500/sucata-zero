// RobotAssembler: monta o Z-01 (rig GLB + peças em sockets) e controla animações com blend de locomoção.
import * as THREE from 'three';
import type { Assets } from '../engine/assets';
import type { Slot } from '../content/items';
import { clamp, damp } from '../core/math';

export class Robot {
  root: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  actions = new Map<string, THREE.AnimationAction>();
  private attached = new Map<Slot, THREE.Object3D[]>();
  private loco: { idle: THREE.AnimationAction; walk: THREE.AnimationAction; run: THREE.AnimationAction; idle2: THREE.AnimationAction };
  private current: THREE.AnimationAction | null = null;
  private currentName = '';
  private actionWeight = 0;
  private actionTarget = 0;
  private idleTimer = 0;
  loadout: Record<Slot, string | null> = { head: null, armL: null, armR: null, legs: null, body: null, core: null };
  coreGlow: THREE.MeshStandardMaterial | null = null;
  eyeMats: THREE.MeshStandardMaterial[] = [];

  constructor(private assets: Assets) {
    const inst = assets.instance('z01');
    this.root = inst.root;
    this.mixer = new THREE.AnimationMixer(this.root);
    for (const c of inst.clips) {
      const a = this.mixer.clipAction(c);
      this.actions.set(c.name, a);
    }
    const need = ['idle', 'walk', 'run', 'idle2'];
    for (const n of need) if (!this.actions.has(n)) throw new Error('Z-01 sem clipe obrigatório: ' + n);
    this.loco = { idle: this.actions.get('idle')!, walk: this.actions.get('walk')!, run: this.actions.get('run')!, idle2: this.actions.get('idle2')! };
    for (const a of [this.loco.idle, this.loco.walk, this.loco.run]) { a.play(); a.setEffectiveWeight(0); }
    this.loco.idle.setEffectiveWeight(1);
    this.loco.idle2.setLoop(THREE.LoopOnce, 1); this.loco.idle2.clampWhenFinished = false;
  }

  /** Monta peças: troca somente slots alterados. Retorna slots alterados. */
  setLoadout(next: Record<Slot, string | null>): Slot[] {
    const changed: Slot[] = [];
    for (const slot of Object.keys(next) as Slot[]) {
      if (this.loadout[slot] === next[slot]) continue;
      changed.push(slot);
      for (const o of this.attached.get(slot) ?? []) o.parent?.remove(o);
      this.attached.set(slot, []);
      const id = next[slot];
      this.loadout[slot] = id;
      if (!id) continue;
      const tpl = this.assets.get('parts').scene.getObjectByName(id);
      if (!tpl) { console.error('[robot] peça sem modelo: ' + id); continue; }
      for (const sockSrc of tpl.children) {
        const sockName = sockSrc.name.split('__')[1];
        const target = sockName ? this.root.getObjectByName(sockName) : null;
        if (!target) { console.error('[robot] socket inexistente: ' + sockSrc.name); continue; }
        const c = sockSrc.clone(true);
        c.position.set(0, 0, 0); c.rotation.set(0, 0, 0);
        c.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; } });
        target.add(c);
        this.attached.get(slot)!.push(c);
      }
    }
    const stub = this.root.getObjectByName('STUB_R');
    if (stub) stub.visible = !next.armR;
    // materiais emissivos (núcleo e olhos) para efeitos
    this.eyeMats = [];
    this.root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && /^eye/.test(m.name)) this.eyeMats.push(m.material as THREE.MeshStandardMaterial);
      if (m.isMesh && /^coreGlow/.test(m.name)) this.coreGlow = m.material as THREE.MeshStandardMaterial;
    });
    return changed;
  }
  socketWorld(name: string, out: THREE.Vector3) { const o = this.root.getObjectByName(name); return o ? o.getWorldPosition(out) : out.copy(this.root.position); }

  /** Ação pontual (ataque, salto...). loop=false mantém a última pose até outra ação. */
  play(name: string, opts: { fade?: number; loop?: boolean; speed?: number; restart?: boolean } = {}) {
    const a = this.actions.get(name);
    if (!a) { console.error('[robot] clipe inexistente: ' + name); return; }
    if (this.currentName === name && !opts.restart && a.isRunning()) { a.timeScale = opts.speed ?? 1; return; }
    const fade = opts.fade ?? 0.12;
    if (this.current && this.current !== a) this.current.fadeOut(fade);
    a.reset();
    a.setLoop(opts.loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
    a.clampWhenFinished = true;
    a.timeScale = opts.speed ?? 1;
    a.setEffectiveWeight(1);
    a.fadeIn(fade).play();
    this.current = a; this.currentName = name;
    this.actionTarget = 1;
  }
  /** volta para a árvore de locomoção */
  release(fade = 0.18) {
    if (this.current) this.current.fadeOut(fade);
    this.current = null; this.currentName = '';
    this.actionTarget = 0;
  }
  get playing() { return this.currentName; }
  update(dt: number, speed: number, grounded: boolean) {
    this.actionWeight = damp(this.actionWeight, this.actionTarget, 14, dt);
    const lw = 1 - this.actionWeight;
    const wIdle = clamp(1 - speed / 1.2, 0, 1);
    const wRun = clamp((speed - 4.6) / 1.6, 0, 1);
    const wWalk = clamp(1 - wIdle - wRun, 0, 1);
    this.loco.idle.setEffectiveWeight(wIdle * lw);
    this.loco.walk.setEffectiveWeight(wWalk * lw);
    this.loco.run.setEffectiveWeight(wRun * lw);
    this.loco.walk.timeScale = clamp(speed / 2.7, 0.6, 1.9);
    this.loco.run.timeScale = clamp(speed / 6.4, 0.8, 1.3);
    // idle alternativo de vez em quando
    if (speed < 0.1 && grounded && !this.currentName) {
      this.idleTimer += dt;
      if (this.idleTimer > 9) { this.idleTimer = 0; this.play('idle2', { fade: 0.4 }); }
    } else this.idleTimer = 0;
    if (this.currentName === 'idle2' && !this.actions.get('idle2')!.isRunning()) this.release(0.5);
    this.mixer.update(dt);
    if (this.coreGlow) this.coreGlow.emissiveIntensity = 2 + Math.sin(performance.now() * 0.004) * 0.6;
  }
}

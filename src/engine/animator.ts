import * as THREE from 'three';
/** Animador simples por crossfade (inimigos, NPCs, chefe). */
export class Animator {
  mixer: THREE.AnimationMixer;
  actions = new Map<string, THREE.AnimationAction>();
  current: THREE.AnimationAction | null = null;
  name = '';
  constructor(root: THREE.Object3D, clips: THREE.AnimationClip[]) {
    this.mixer = new THREE.AnimationMixer(root);
    for (const c of clips) this.actions.set(c.name, this.mixer.clipAction(c));
  }
  has(n: string) { return this.actions.has(n); }
  duration(n: string) { return this.actions.get(n)?.getClip().duration ?? 0.5; }
  play(n: string, opts: { loop?: boolean; fade?: number; speed?: number; restart?: boolean } = {}) {
    const a = this.actions.get(n);
    if (!a) return;
    if (this.current === a && !opts.restart) { a.timeScale = opts.speed ?? 1; return; }
    const fade = opts.fade ?? 0.15;
    a.reset();
    a.setLoop(opts.loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
    a.clampWhenFinished = true;
    a.timeScale = opts.speed ?? 1;
    a.setEffectiveWeight(1);
    if (this.current && this.current !== a) { a.crossFadeFrom(this.current, fade, false); }
    a.play();
    this.current = a; this.name = n;
  }
  update(dt: number) { this.mixer.update(dt); }
}

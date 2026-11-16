// Entrada unificada: teclado/mouse, gamepad e toque (GDD §16.3)
export type Action = 'attack' | 'heavy' | 'jump' | 'dodge' | 'block' | 'ability' | 'interact' | 'lock' | 'pause' | 'shoulder';
export const ACTIONS: Action[] = ['attack', 'heavy', 'jump', 'dodge', 'block', 'ability', 'interact', 'lock', 'pause', 'shoulder'];

export const DEFAULT_KEYS: Record<Action, string[]> = {
  attack: ['Mouse0', 'KeyJ'], heavy: ['Mouse2', 'KeyK'], jump: ['Space'], dodge: ['ShiftLeft', 'ShiftRight'], block: ['KeyQ'],
  ability: ['KeyR'], interact: ['KeyE'], lock: ['Tab', 'Mouse1'], pause: ['Escape', 'KeyP'], shoulder: ['KeyV'],
};
const PAD: Record<Action, number[]> = { attack: [2], heavy: [3], jump: [0], dodge: [1], block: [4], ability: [5], interact: [2], lock: [11], pause: [9], shoulder: [10] };

export class Input {
  move = { x: 0, y: 0 }; // x direita, y frente
  look = { x: 0, y: 0 }; // delta acumulado (rad)
  private down = new Set<string>();
  private pressedQ = new Set<Action>();
  private held = new Set<Action>();
  private virtual = new Map<Action, boolean>();
  virtualMove = { x: 0, y: 0, active: false };
  keys: Record<Action, string[]> = structuredClone(DEFAULT_KEYS);
  sensitivity = 1;
  invertY = false;
  enabled = true;
  pointerLocked = false;
  lastDevice: 'kbm' | 'pad' | 'touch' = 'kbm';
  padConnected = false;
  private padPrev: boolean[] = [];
  holdTime: Partial<Record<Action, number>> = {};
  rebindCb: ((code: string) => void) | null = null;

  constructor(private canvas: HTMLElement) {
    window.addEventListener('keydown', (e) => {
      if (this.rebindCb) { e.preventDefault(); const cb = this.rebindCb; this.rebindCb = null; cb(e.code); return; }
      if (['Tab', 'Space', 'ArrowUp', 'ArrowDown'].includes(e.code) && !(e.target instanceof HTMLInputElement)) e.preventDefault();
      if (e.repeat) return;
      this.down.add(e.code);
      this.lastDevice = 'kbm';
      this.onCode(e.code, true);
    });
    window.addEventListener('keyup', (e) => { this.down.delete(e.code); this.onCode(e.code, false); });
    window.addEventListener('blur', () => { this.down.clear(); this.held.clear(); });
    canvas.addEventListener('mousedown', (e) => {
      if (this.rebindCb) { const cb = this.rebindCb; this.rebindCb = null; cb('Mouse' + e.button); return; }
      this.lastDevice = 'kbm';
      if (!this.pointerLocked && this.enabled && !matchMedia('(pointer: coarse)').matches) { canvas.requestPointerLock?.(); return; }
      this.onCode('Mouse' + e.button, true);
    });
    window.addEventListener('mouseup', (e) => this.onCode('Mouse' + e.button, false));
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('pointerlockchange', () => { this.pointerLocked = document.pointerLockElement === canvas; });
    window.addEventListener('mousemove', (e) => {
      if (!this.pointerLocked || !this.enabled) return;
      this.look.x += e.movementX * 0.0022 * this.sensitivity;
      this.look.y += e.movementY * 0.0022 * this.sensitivity * (this.invertY ? -1 : 1);
    });
    window.addEventListener('gamepadconnected', () => { this.padConnected = true; });
    window.addEventListener('gamepaddisconnected', () => { this.padConnected = false; this.held.clear(); });
  }
  private actionsFor(code: string): Action[] { return ACTIONS.filter((a) => this.keys[a].includes(code)); }
  private onCode(code: string, isDown: boolean) {
    for (const a of this.actionsFor(code)) this.setAction(a, isDown);
  }
  setAction(a: Action, isDown: boolean) {
    if (isDown) { if (!this.held.has(a)) { this.pressedQ.add(a); this.holdTime[a] = 0; } this.held.add(a); }
    else this.held.delete(a);
  }
  setVirtual(a: Action, isDown: boolean) { this.lastDevice = 'touch'; this.setAction(a, isDown); }
  addTouchLook(dx: number, dy: number) { this.lastDevice = 'touch'; this.look.x += dx * 0.0055 * this.sensitivity; this.look.y += dy * 0.0055 * this.sensitivity * (this.invertY ? -1 : 1); }
  pressed(a: Action) { return this.pressedQ.has(a); }
  consume(a: Action) { const p = this.pressedQ.has(a); this.pressedQ.delete(a); return p; }
  isHeld(a: Action) { return this.held.has(a); }
  /** chamado uma vez por quadro antes da simulação */
  poll(dt: number) {
    for (const a of this.held) this.holdTime[a] = (this.holdTime[a] ?? 0) + dt;
    let mx = 0, my = 0;
    const k = (c: string) => this.down.has(c);
    if (k('KeyW') || k('ArrowUp')) my += 1;
    if (k('KeyS') || k('ArrowDown')) my -= 1;
    if (k('KeyD') || k('ArrowRight')) mx += 1;
    if (k('KeyA') || k('ArrowLeft')) mx -= 1;
    const len = Math.hypot(mx, my);
    if (len > 1) { mx /= len; my /= len; }
    if (this.virtualMove.active) { mx = this.virtualMove.x; my = this.virtualMove.y; }
    // gamepad
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = [...pads].find((p) => p && p.connected);
    if (gp) {
      const dz = (v: number) => (Math.abs(v) < 0.18 ? 0 : (v - Math.sign(v) * 0.18) / 0.82);
      const lx = dz(gp.axes[0] ?? 0), ly = dz(gp.axes[1] ?? 0);
      if (Math.abs(lx) + Math.abs(ly) > 0) { mx = lx; my = -ly; this.lastDevice = 'pad'; }
      const rx = dz(gp.axes[2] ?? 0), ry = dz(gp.axes[3] ?? 0);
      if (rx || ry) { this.look.x += rx * 2.6 * dt * this.sensitivity; this.look.y += ry * 2.0 * dt * this.sensitivity * (this.invertY ? -1 : 1); this.lastDevice = 'pad'; }
      for (const a of ACTIONS) {
        const now = PAD[a].some((b) => gp.buttons[b]?.pressed);
        const key = a;
        const prev = this.padPrev[ACTIONS.indexOf(key)] ?? false;
        if (now !== prev) { this.setAction(a, now); this.lastDevice = 'pad'; }
        this.padPrev[ACTIONS.indexOf(key)] = now;
      }
    }
    this.move.x = mx; this.move.y = my;
    if (!this.enabled) { this.move.x = 0; this.move.y = 0; }
  }
  endFrame() { this.pressedQ.clear(); this.look.x = 0; this.look.y = 0; }
  clearAll() { this.pressedQ.clear(); this.held.clear(); this.down.clear(); this.look.x = this.look.y = 0; }
  vibrate(ms: number, strength = 0.5) {
    const gp = [...(navigator.getGamepads?.() ?? [])].find((p) => p && p.connected) as any;
    gp?.vibrationActuator?.playEffect?.('dual-rumble', { duration: ms, strongMagnitude: strength, weakMagnitude: strength * 0.6 }).catch?.(() => {});
    if (this.lastDevice === 'touch') navigator.vibrate?.(Math.min(60, ms));
  }
}

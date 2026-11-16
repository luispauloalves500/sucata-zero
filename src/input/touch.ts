// Controles de toque (paisagem): joystick esquerdo, arrasto da câmera à direita, botões de ação.
import type { Input, Action } from './input';

interface Btn { a: Action; label: string; cls: string }
const BUTTONS: Btn[] = [
  { a: 'attack', label: '✊', cls: 'tb-attack' },
  { a: 'heavy', label: '💥', cls: 'tb-heavy' },
  { a: 'jump', label: '⤒', cls: 'tb-jump' },
  { a: 'dodge', label: '»', cls: 'tb-dodge' },
  { a: 'block', label: '⛨', cls: 'tb-block' },
  { a: 'ability', label: '⚙', cls: 'tb-ability' },
  { a: 'lock', label: '◎', cls: 'tb-lock' },
];

export class TouchControls {
  root: HTMLDivElement;
  private stickId: number | null = null;
  private lookId: number | null = null;
  private origin = { x: 0, y: 0 };
  private lastLook = { x: 0, y: 0 };
  private knob: HTMLDivElement;
  private base: HTMLDivElement;
  interactBtn: HTMLButtonElement;
  abilityBtn: HTMLButtonElement | null = null;
  fixed = false;
  visible = false;

  constructor(private input: Input, parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.id = 'touch';
    this.root.innerHTML = `<div class="t-look"></div><div class="t-stickzone"><div class="t-base"><div class="t-knob"></div></div></div><div class="t-btns"></div><button class="tb tb-interact" data-a="interact">E</button><button class="tb tb-pause" data-a="pause">❚❚</button>`;
    parent.appendChild(this.root);
    this.base = this.root.querySelector('.t-base')!;
    this.knob = this.root.querySelector('.t-knob')!;
    const btns = this.root.querySelector('.t-btns')!;
    for (const b of BUTTONS) {
      const el = document.createElement('button');
      el.className = 'tb ' + b.cls; el.dataset.a = b.a; el.textContent = b.label; el.setAttribute('aria-label', b.a);
      btns.appendChild(el);
      if (b.a === 'ability') this.abilityBtn = el;
    }
    this.interactBtn = this.root.querySelector('.tb-interact')!;
    this.root.querySelectorAll<HTMLButtonElement>('.tb').forEach((el) => {
      const a = el.dataset.a as Action;
      el.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); el.classList.add('on'); this.input.setVirtual(a, true); }, { passive: false });
      const up = (e: TouchEvent) => { e.preventDefault(); el.classList.remove('on'); this.input.setVirtual(a, false); };
      el.addEventListener('touchend', up, { passive: false });
      el.addEventListener('touchcancel', up, { passive: false });
    });
    const zone = this.root.querySelector<HTMLDivElement>('.t-stickzone')!;
    zone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (this.stickId !== null) return;
      const t = e.changedTouches[0];
      this.stickId = t.identifier;
      const r = zone.getBoundingClientRect();
      this.origin = this.fixed ? { x: r.left + 110, y: r.bottom - 110 } : { x: t.clientX, y: t.clientY };
      this.base.style.left = this.origin.x - r.left - 60 + 'px';
      this.base.style.top = this.origin.y - r.top - 60 + 'px';
      this.base.classList.add('on');
      this.updateStick(t.clientX, t.clientY);
    }, { passive: false });
    const look = this.root.querySelector<HTMLDivElement>('.t-look')!;
    look.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (this.lookId !== null) return;
      const t = e.changedTouches[0];
      this.lookId = t.identifier; this.lastLook = { x: t.clientX, y: t.clientY };
    }, { passive: false });
    window.addEventListener('touchmove', (e) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === this.stickId) this.updateStick(t.clientX, t.clientY);
        if (t.identifier === this.lookId) { this.input.addTouchLook(t.clientX - this.lastLook.x, t.clientY - this.lastLook.y); this.lastLook = { x: t.clientX, y: t.clientY }; }
      }
    }, { passive: true });
    const end = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === this.stickId) { this.stickId = null; this.input.virtualMove = { x: 0, y: 0, active: false }; this.knob.style.transform = ''; this.base.classList.remove('on'); }
        if (t.identifier === this.lookId) this.lookId = null;
      }
    };
    window.addEventListener('touchend', end);
    window.addEventListener('touchcancel', end);
  }
  private updateStick(x: number, y: number) {
    let dx = x - this.origin.x, dy = y - this.origin.y;
    const len = Math.hypot(dx, dy), max = 52;
    if (len > max) { dx = (dx / len) * max; dy = (dy / len) * max; }
    this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
    const nx = dx / max, ny = -dy / max;
    const m = Math.hypot(nx, ny);
    const k = m < 0.12 ? 0 : Math.min(1, (m - 0.12) / 0.88) / (m || 1);
    this.input.virtualMove = { x: nx * k, y: ny * k, active: true };
  }
  show(v: boolean) { this.visible = v; this.root.style.display = v ? 'block' : 'none'; }
  setInteract(label: string | null) { this.interactBtn.style.display = label ? 'flex' : 'none'; if (label) this.interactBtn.textContent = label; }
  setAbility(enabled: boolean) { if (this.abilityBtn) this.abilityBtn.style.display = enabled ? 'flex' : 'none'; }
}

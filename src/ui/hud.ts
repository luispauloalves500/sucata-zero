// HUD em DOM: barras, objetivo, marcador, alvo travado, chefe, prompts, toasts, legendas, números de dano.
export interface HudFrame {
  hp: number; hpMax: number; en: number; enMax: number; heat: number; heatLock: boolean; stab: number;
  level: number; xpFrac: number; scrap: number; alloy: number; cells: number;
  objective: { title: string; text: string; side?: string } | null;
  waypoint: { x: number; y: number; on: boolean; ang: number; dist: number } | null;
  lock: { x: number; y: number; hp: number; name: string } | null;
  bars: { x: number; y: number; hp: number; key: string }[];
  boss: { name: string; frac: number; phase: number; exposed: boolean } | null;
  prompt: { key: string; label: string } | null;
  ability: { name: string; cd: number; ready: boolean } | null;
  hurt: number; lowHp: boolean; fps?: string; touch: boolean;
}
const $ = <T extends HTMLElement>(root: ParentNode, s: string) => root.querySelector(s) as T;

export class Hud {
  root: HTMLDivElement;
  private el: Record<string, HTMLElement> = {};
  private cache = new Map<string, string>();
  private barPool: HTMLDivElement[] = [];
  private dmgLayer: HTMLDivElement;
  private toastBox: HTMLDivElement;
  private sayBox: HTMLDivElement;
  private sayQueue: { who: string; text: string; dur: number }[] = [];
  private sayT = 0;
  private bannerT: number | undefined;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.id = 'hud';
    this.root.innerHTML = `
      <div class="hud-vignette"></div>
      <div class="hud-tl">
        <div class="hud-lvl"><span class="lv">1</span><div class="xp"><i></i></div></div>
        <div class="bars">
          <div class="bar hp"><i class="lag"></i><i class="fill"></i><span></span></div>
          <div class="bar en"><i class="fill"></i><span></span></div>
          <div class="mini"><div class="bar heat"><i class="fill"></i></div><div class="bar stab"><i class="fill"></i></div></div>
        </div>
      </div>
      <div class="hud-mats"><span class="m-scrap" title="Sucata">⬢ <b>0</b></span><span class="m-alloy" title="Liga">◆ <b>0</b></span><span class="m-cells" title="Células">▮ <b>0</b></span></div>
      <div class="hud-obj"><div class="t"></div><div class="x"></div><div class="s"></div></div>
      <div class="hud-way"><div class="arrow"></div><span></span></div>
      <div class="hud-lock"><div class="ret"></div><div class="nm"></div><div class="hpb"><i></i></div></div>
      <div class="hud-boss"><div class="nm"></div><div class="bb"><i class="lag"></i><i class="fill"></i><s style="left:70%"></s><s style="left:35%"></s></div><div class="ph"></div></div>
      <div class="hud-prompt"><kbd></kbd><span></span></div>
      <div class="hud-ability"><div class="ic">⚙</div><div class="cd"></div><span></span></div>
      <div class="hud-bars"></div>
      <div class="hud-dmg"></div>
      <div class="hud-toasts"></div>
      <div class="hud-say"></div>
      <div class="hud-banner"><div class="a"></div><div class="b"></div></div>
      <div class="hud-fps"></div>`;
    parent.appendChild(this.root);
    for (const k of ['hud-tl', 'hud-obj', 'hud-way', 'hud-lock', 'hud-boss', 'hud-prompt', 'hud-ability', 'hud-bars', 'hud-banner', 'hud-fps', 'hud-vignette']) this.el[k] = $(this.root, '.' + k);
    this.dmgLayer = $(this.root, '.hud-dmg'); this.toastBox = $(this.root, '.hud-toasts'); this.sayBox = $(this.root, '.hud-say');
  }
  private set(key: string, el: HTMLElement, prop: 'text' | 'width' | 'display' | 'transform' | 'cls' | 'opacity' | 'left' | 'top', v: string) {
    if (this.cache.get(key) === v) return;
    this.cache.set(key, v);
    if (prop === 'text') el.textContent = v;
    else if (prop === 'width') el.style.width = v;
    else if (prop === 'display') el.style.display = v;
    else if (prop === 'transform') el.style.transform = v;
    else if (prop === 'opacity') el.style.opacity = v;
    else if (prop === 'cls') el.className = v;
    else if (prop === 'left') el.style.left = v;
    else if (prop === 'top') el.style.top = v;
  }
  private hpLag = 1; private bossLag = 1;
  setVisible(v: boolean) { this.root.style.display = v ? '' : 'none'; }
  update(f: HudFrame, dt: number) {
    const r = this.root;
    const hpF = Math.max(0, f.hp / f.hpMax);
    this.hpLag = Math.max(hpF, this.hpLag - dt * 0.35);
    this.set('hp', $(r, '.bar.hp .fill'), 'width', (hpF * 100).toFixed(1) + '%');
    this.set('hpl', $(r, '.bar.hp .lag'), 'width', (this.hpLag * 100).toFixed(1) + '%');
    this.set('hpt', $(r, '.bar.hp span'), 'text', `${Math.ceil(Math.max(0, f.hp))} / ${f.hpMax}`);
    this.set('en', $(r, '.bar.en .fill'), 'width', ((f.en / f.enMax) * 100).toFixed(1) + '%');
    this.set('ent', $(r, '.bar.en span'), 'text', `${Math.floor(f.en)}`);
    this.set('heat', $(r, '.bar.heat .fill'), 'width', f.heat.toFixed(0) + '%');
    this.set('heatc', $(r, '.bar.heat'), 'cls', 'bar heat' + (f.heatLock ? ' lock' : ''));
    this.set('stab', $(r, '.bar.stab .fill'), 'width', ((f.stab / 60) * 100).toFixed(0) + '%');
    this.set('lv', $(r, '.hud-lvl .lv'), 'text', String(f.level));
    this.set('xp', $(r, '.hud-lvl .xp i'), 'width', (f.xpFrac * 100).toFixed(0) + '%');
    this.set('scrap', $(r, '.m-scrap b'), 'text', String(f.scrap));
    this.set('alloy', $(r, '.m-alloy b'), 'text', String(f.alloy));
    this.set('cells', $(r, '.m-cells b'), 'text', String(f.cells));
    this.set('vig', this.el['hud-vignette'], 'opacity', Math.min(1, f.hurt + (f.lowHp ? 0.35 + Math.sin(performance.now() / 300) * 0.1 : 0)).toFixed(2));
    // objetivo
    const o = this.el['hud-obj'];
    this.set('objd', o, 'display', f.objective ? '' : 'none');
    if (f.objective) { this.set('objt', $(o, '.t'), 'text', f.objective.title); this.set('objx', $(o, '.x'), 'text', f.objective.text); this.set('objs', $(o, '.s'), 'text', f.objective.side ?? ''); }
    // marcador de objetivo
    const w = this.el['hud-way'];
    this.set('wd', w, 'display', f.waypoint ? '' : 'none');
    if (f.waypoint) {
      const wp = f.waypoint;
      this.set('wt', w, 'transform', `translate(${wp.x.toFixed(0)}px, ${wp.y.toFixed(0)}px)`);
      this.set('wa', $(w, '.arrow'), 'transform', wp.on ? 'rotate(180deg)' : `rotate(${(wp.ang * 180 / Math.PI + 90).toFixed(0)}deg)`);
      this.set('wdist', $(w, 'span'), 'text', `${Math.round(wp.dist)} m`);
    }
    // trava
    const l = this.el['hud-lock'];
    this.set('ld', l, 'display', f.lock ? '' : 'none');
    if (f.lock) {
      this.set('lt', l, 'transform', `translate(${f.lock.x.toFixed(0)}px, ${f.lock.y.toFixed(0)}px)`);
      this.set('ln', $(l, '.nm'), 'text', f.lock.name);
      this.set('lh', $(l, '.hpb i'), 'width', (f.lock.hp * 100).toFixed(0) + '%');
    }
    // barras de inimigos
    const bars = this.el['hud-bars'];
    while (this.barPool.length < f.bars.length) { const d = document.createElement('div'); d.className = 'ebar'; d.innerHTML = '<i></i>'; bars.appendChild(d); this.barPool.push(d); }
    this.barPool.forEach((d, i) => {
      const b = f.bars[i];
      if (!b) { if (d.style.display !== 'none') d.style.display = 'none'; return; }
      d.style.display = ''; d.style.transform = `translate(${b.x.toFixed(0)}px, ${b.y.toFixed(0)}px)`;
      (d.firstChild as HTMLElement).style.width = (b.hp * 100).toFixed(0) + '%';
    });
    // chefe
    const bo = this.el['hud-boss'];
    this.set('bd', bo, 'display', f.boss ? '' : 'none');
    if (f.boss) {
      this.bossLag = Math.max(f.boss.frac, this.bossLag - dt * 0.15);
      this.set('bn', $(bo, '.nm'), 'text', f.boss.name);
      this.set('bf', $(bo, '.bb .fill'), 'width', (f.boss.frac * 100).toFixed(2) + '%');
      this.set('bl', $(bo, '.bb .lag'), 'width', (this.bossLag * 100).toFixed(2) + '%');
      this.set('bp', $(bo, '.ph'), 'text', ['', 'FASE 1 — INSPEÇÃO', 'FASE 2 — SOBRECARGA', 'FASE 3 — RUPTURA'][f.boss.phase] + (f.boss.exposed ? '  •  NÚCLEO EXPOSTO' : ''));
      this.set('bc', bo, 'cls', 'hud-boss' + (f.boss.exposed ? ' exposed' : ''));
    } else this.bossLag = 1;
    // prompt
    const p = this.el['hud-prompt'];
    this.set('pd', p, 'display', f.prompt ? '' : 'none');
    if (f.prompt) { this.set('pk', $(p, 'kbd'), 'text', f.prompt.key); this.set('pl', $(p, 'span'), 'text', f.prompt.label); }
    const ab = this.el['hud-ability'];
    this.set('ad', ab, 'display', f.ability && !f.touch ? '' : 'none');
    if (f.ability) { this.set('an', $(ab, 'span'), 'text', `[R] ${f.ability.name}`); this.set('acd', $(ab, '.cd'), 'transform', `scaleY(${f.ability.cd.toFixed(2)})`); this.set('ac', ab, 'cls', 'hud-ability' + (f.ability.ready ? ' ready' : '')); }
    this.set('fps', this.el['hud-fps'], 'text', f.fps ?? '');
    // legendas
    this.sayT -= dt;
    if (this.sayT <= 0) {
      const n = this.sayQueue.shift();
      if (n) { this.sayBox.innerHTML = `<b>${esc(n.who)}</b> ${esc(n.text)}`; this.sayBox.className = 'hud-say on' + (n.who === 'COMPACTADOR' ? ' boss' : n.who === 'FERRO-7' ? ' ferro' : n.who === 'SISTEMA' ? ' sys' : ''); this.sayT = n.dur; }
      else if (this.sayBox.classList.contains('on')) this.sayBox.className = 'hud-say';
    }
  }
  say(who: string, text: string, dur = 3) {
    if (this.sayQueue.length > 3) this.sayQueue.shift();
    if (this.sayQueue.some((q) => q.text === text)) return;
    this.sayQueue.push({ who, text, dur });
  }
  clearSay() { this.sayQueue.length = 0; this.sayT = 0; }
  toast(text: string, kind: 'info' | 'loot' | 'warn' | 'quest' = 'info') {
    const last = this.toastBox.lastElementChild as HTMLElement | null;
    if (last && last.dataset.text === text) { last.classList.remove('pop'); void last.offsetWidth; last.classList.add('pop'); return; }
    const d = document.createElement('div');
    d.className = 'toast ' + kind + ' pop'; d.textContent = text; d.dataset.text = text;
    this.toastBox.appendChild(d);
    while (this.toastBox.children.length > 4) this.toastBox.firstElementChild!.remove();
    setTimeout(() => d.classList.add('out'), kind === 'quest' ? 3800 : 2600);
    setTimeout(() => d.remove(), kind === 'quest' ? 4300 : 3100);
  }
  banner(a: string, b = '', dur = 3200) {
    const el = this.el['hud-banner'];
    $(el, '.a').textContent = a; $(el, '.b').textContent = b;
    el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
    clearTimeout(this.bannerT); this.bannerT = window.setTimeout(() => el.classList.remove('on'), dur);
  }
  damage(x: number, y: number, amount: number, crit: boolean, color?: string) {
    if (this.dmgLayer.childElementCount > 24) this.dmgLayer.firstElementChild!.remove();
    const d = document.createElement('div');
    d.className = 'dmg' + (crit ? ' crit' : '');
    d.textContent = String(amount);
    if (color) d.style.color = color;
    d.style.left = x + (Math.random() - 0.5) * 30 + 'px'; d.style.top = y + 'px';
    this.dmgLayer.appendChild(d);
    setTimeout(() => d.remove(), 900);
  }
}
export function esc(s: string) { return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!); }

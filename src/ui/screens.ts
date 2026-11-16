// Telas e menus (título, pausa, opções, slots, terminal, morte, final, erro). Navegáveis por mouse, toque, teclado e controle.
import type { Settings } from '../app/settings';
import { esc } from './hud';

export interface MenuItem { label: string; sub?: string; disabled?: boolean; danger?: boolean; act: () => void }
type BackFn = (() => void) | null;

export class Screens {
  root: HTMLDivElement;
  private stack: { el: HTMLElement; back: BackFn }[] = [];
  onSound: (n: 'ui' | 'uiBack' | 'deny') => void = () => {};

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.id = 'screens';
    parent.appendChild(this.root);
    window.addEventListener('keydown', (e) => {
      if (!this.top) return;
      if (e.code === 'ArrowDown' || e.code === 'KeyS') { this.navigate(1); e.preventDefault(); }
      else if (e.code === 'ArrowUp' || e.code === 'KeyW') { this.navigate(-1); e.preventDefault(); }
      else if (e.code === 'Escape' || e.code === 'Backspace') { if (this.back()) e.preventDefault(); }
    });
  }
  get top() { return this.stack[this.stack.length - 1]?.el ?? null; }
  get open() { return this.stack.length > 0; }
  private focusables(): HTMLElement[] { const t = this.top; return t ? Array.from(t.querySelectorAll<HTMLElement>('button:not([disabled]), input, select')).filter((e) => e.offsetParent !== null) : []; }
  navigate(d: number) {
    const f = this.focusables(); if (!f.length) return;
    const i = f.indexOf(document.activeElement as HTMLElement);
    const n = f[(i + d + f.length) % f.length]; n.focus(); n.scrollIntoView({ block: 'nearest' });
    this.onSound('ui');
  }
  activate() { const a = document.activeElement as HTMLElement | null; if (a && this.top?.contains(a)) a.click(); else this.focusables()[0]?.focus(); }
  back(): boolean { const t = this.stack[this.stack.length - 1]; if (t?.back) { this.onSound('uiBack'); t.back(); return true; } return false; }
  push(el: HTMLElement, back: BackFn = null) {
    this.stack.forEach((s) => s.el.classList.add('hidden'));
    this.stack.push({ el, back });
    this.root.appendChild(el);
    requestAnimationFrame(() => { el.classList.add('in'); const f = this.focusables()[0]; if (f && !matchMedia('(pointer: coarse)').matches) f.focus(); });
  }
  pop() { const s = this.stack.pop(); s?.el.remove(); const t = this.stack[this.stack.length - 1]; if (t) t.el.classList.remove('hidden'); }
  clear() { while (this.stack.length) this.pop(); }
  panel(cls: string, html: string): HTMLDivElement { const d = document.createElement('div'); d.className = 'screen ' + cls; d.innerHTML = html; return d; }
  private menu(items: MenuItem[]) {
    const ul = document.createElement('div'); ul.className = 'menu';
    for (const it of items) {
      const b = document.createElement('button');
      b.className = 'mbtn' + (it.danger ? ' danger' : '');
      b.innerHTML = `<span>${esc(it.label)}</span>${it.sub ? `<small>${esc(it.sub)}</small>` : ''}`;
      b.disabled = !!it.disabled;
      b.addEventListener('click', () => { this.onSound('ui'); it.act(); });
      ul.appendChild(b);
    }
    return ul;
  }

  loading(): { set: (p: number, label: string) => void; done: () => void; el: HTMLDivElement } {
    const el = this.panel('loading', `<div class="logo"><span>SUCATA</span><b>ZERO</b></div><div class="lbar"><i></i></div><div class="ltxt">Iniciando…</div><div class="tip">Dica: aparar (bloquear no instante do golpe) abre o inimigo para um contra-ataque.</div>`);
    this.push(el);
    return {
      el,
      set: (p, label) => { (el.querySelector('.lbar i') as HTMLElement).style.width = Math.round(p * 100) + '%'; el.querySelector('.ltxt')!.textContent = label; },
      done: () => { const i = this.stack.findIndex((s) => s.el === el); if (i >= 0) { this.stack.splice(i, 1); el.remove(); } },
    };
  }
  error(title: string, details: string, retry?: () => void) {
    const el = this.panel('error', `<h2>⚠ ${esc(title)}</h2><p>O jogo encontrou um problema. Você pode tentar de novo ou copiar os detalhes para relatar.</p><pre></pre><div class="row"></div>`);
    el.querySelector('pre')!.textContent = details;
    const row = el.querySelector('.row')!;
    const copy = document.createElement('button'); copy.className = 'mbtn'; copy.textContent = 'Copiar detalhes';
    copy.onclick = () => { navigator.clipboard?.writeText(details).then(() => (copy.textContent = 'Copiado!')).catch(() => (copy.textContent = 'Selecione o texto acima')); };
    row.appendChild(copy);
    if (retry) { const r = document.createElement('button'); r.className = 'mbtn'; r.textContent = 'Recarregar'; r.onclick = retry; row.appendChild(r); }
    this.push(el);
  }
  title(o: { hasContinue: boolean; onContinue: () => void; onNew: () => void; onLoad: () => void; onOptions: () => void; onCredits: () => void; version: string }) {
    const el = this.panel('title', `<div class="title-bg"></div><div class="logo big"><span>SUCATA</span><b>ZERO</b><em>A Última Máquina</em></div><div class="ver">${esc(o.version)} • Episódio 1: Ferro-Velho 09</div>`);
    el.appendChild(this.menu([
      ...(o.hasContinue ? [{ label: 'Continuar', act: o.onContinue }] : []),
      { label: 'Novo jogo', act: o.onNew },
      { label: 'Carregar', act: o.onLoad },
      { label: 'Opções', act: o.onOptions },
      { label: 'Créditos', act: o.onCredits },
    ]));
    this.push(el);
  }
  difficulty(pick: (d: 'explorer' | 'standard' | 'veteran') => void) {
    const el = this.panel('diff', `<h2>Escolha a dificuldade</h2><p class="muted">Pode ser alterada depois em Opções.</p>`);
    el.appendChild(this.menu([
      { label: 'Explorador', sub: 'Menos dano recebido, telegráficos mais longos. Foco na história.', act: () => pick('explorer') },
      { label: 'Padrão', sub: 'A experiência pensada para o jogo.', act: () => pick('standard') },
      { label: 'Veterano', sub: 'Inimigos agressivos, recuperação curta. Para quem gosta de apanhar.', act: () => pick('veteran') },
    ]));
    this.push(el, () => this.pop());
  }
  confirm(text: string, yes: () => void, yesLabel = 'Confirmar') {
    const el = this.panel('confirm', `<p>${esc(text)}</p>`);
    el.appendChild(this.menu([{ label: yesLabel, danger: true, act: () => { this.pop(); yes(); } }, { label: 'Cancelar', act: () => this.pop() }]));
    this.push(el, () => this.pop());
  }
  list(title: string, items: MenuItem[], cls = 'list', intro = '', onBack?: () => void, addBack = true) {
    const el = this.panel(cls, `<h2>${esc(title)}</h2>${intro}`);
    const back = onBack ?? (() => this.pop());
    el.appendChild(this.menu(addBack ? [...items, { label: 'Voltar', act: back }] : items));
    this.push(el, back);
    return el;
  }
  info(title: string, html: string, onClose?: () => void, cls = 'info') {
    const el = this.panel(cls, `<h2>${esc(title)}</h2><div class="body">${html}</div>`);
    const close = () => { this.pop(); onClose?.(); };
    el.appendChild(this.menu([{ label: 'Fechar', act: close }]));
    this.push(el, close);
    return el;
  }
  options(s: Settings, apply: (s: Settings) => void, extras: { label: string; act: () => void }[] = []) {
    const row = (label: string, ctl: string) => `<label class="opt"><span>${label}</span>${ctl}</label>`;
    const sel = (k: string, opts: [string, string][]) => `<select data-k="${k}">${opts.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>`;
    const rng = (k: string, min: number, max: number, step: number) => `<input type="range" data-k="${k}" min="${min}" max="${max}" step="${step}">`;
    const chk = (k: string) => `<input type="checkbox" data-k="${k}">`;
    const el = this.panel('options', `<h2>Opções</h2><div class="opts">
      <h3>Vídeo</h3>${row('Qualidade', sel('quality', [['auto', 'Automática'], ['low', 'Baixa'], ['medium', 'Média'], ['high', 'Alta']]))}
      ${row('Mostrar FPS', chk('showFps'))}${row('Reduzir flashes', chk('reduceFlashes'))}
      <h3>Áudio</h3>${row('Música', rng('music', 0, 1, 0.05))}${row('Efeitos', rng('sfx', 0, 1, 0.05))}${row('Silenciar tudo', chk('muted'))}
      <h3>Controles</h3>${row('Sensibilidade da câmera', rng('sensitivity', 0.2, 3, 0.1))}${row('Inverter eixo Y', chk('invertY'))}
      ${row('Câmera no ombro', sel('shoulder', [['1', 'Direito'], ['-1', 'Esquerdo']]))}${row('Tremor de câmera', chk('shake'))}
      ${row('Joystick fixo (toque)', chk('fixedJoystick'))}${row('Travar alvo automaticamente', chk('autoLock'))}
      <h3>Interface</h3>${row('Escala do HUD', rng('hudScale', 0.75, 1.5, 0.05))}${row('Tamanho das legendas', rng('subtitlesScale', 0.8, 1.6, 0.1))}
      ${row('Números de dano', chk('damageNumbers'))}${row('Alto contraste', chk('highContrast'))}
      <h3>Teclado e mouse</h3><div class="keys">
      <span><kbd>WASD</kbd> mover</span><span><kbd>Mouse</kbd> câmera</span><span><kbd>Clique E</kbd>/<kbd>J</kbd> ataque</span><span><kbd>Clique D</kbd>/<kbd>K</kbd> pesado</span>
      <span><kbd>Espaço</kbd> pular</span><span><kbd>Shift</kbd> toque: esquiva • segurar: correr</span><span><kbd>Q</kbd> bloquear/aparar</span><span><kbd>R</kbd> habilidade</span>
      <span><kbd>E</kbd> interagir</span><span><kbd>Tab</kbd>/<kbd>Botão do meio</kbd> travar alvo</span><span><kbd>V</kbd> trocar ombro</span><span><kbd>Esc</kbd> pausa</span></div>
      </div>`);
    const inputs = el.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-k]');
    inputs.forEach((i) => {
      const k = i.dataset.k as keyof Settings;
      const v = s[k] as unknown;
      if (i instanceof HTMLInputElement && i.type === 'checkbox') i.checked = !!v; else i.value = String(v);
      i.addEventListener('input', () => {
        const val = i instanceof HTMLInputElement && i.type === 'checkbox' ? i.checked : i instanceof HTMLInputElement && i.type === 'range' ? Number(i.value) : k === 'shoulder' ? Number(i.value) : i.value;
        (s as unknown as Record<string, unknown>)[k] = val;
        apply(s);
      });
    });
    el.appendChild(this.menu([...extras.map((e) => ({ label: e.label, act: e.act })), { label: 'Voltar', act: () => this.pop() }]));
    this.push(el, () => this.pop());
  }
  death(onRespawn: () => void, lost: number) {
    const el = this.panel('death', `<h1>SISTEMAS DESLIGADOS</h1><p>${lost > 0 ? `${lost} de sucata ficou no local da queda. Recupere antes de cair de novo.` : 'Nenhuma sucata perdida.'}</p>`);
    el.appendChild(this.menu([{ label: 'Reativar no último terminal', act: () => { this.pop(); onRespawn(); } }]));
    this.push(el);
  }
  ending(lines: string[], title: string, next: string, stats: string, onContinue: () => void) {
    const el = this.panel('ending', `<h1>${esc(title)}</h1>${lines.map((l, i) => `<p style="animation-delay:${0.6 + i * 1.4}s">${esc(l)}</p>`).join('')}<div class="stats" style="animation-delay:${0.6 + lines.length * 1.4}s">${stats}</div><h3 style="animation-delay:${1 + lines.length * 1.4}s">${esc(next)}</h3>`);
    el.appendChild(this.menu([{ label: 'Continuar explorando', act: () => { this.pop(); onContinue(); } }]));
    this.push(el);
  }
}

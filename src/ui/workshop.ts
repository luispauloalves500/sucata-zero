// Oficina: montar/desmontar peças por slot, comparar atributos, fabricar e melhorar (bancada completa).
import { ITEMS, SLOTS, SLOT_LABEL, type Slot } from '../content/items';
import type { GameState } from '../game/state';
import { computeStats, findPart, capacity, weightOf, upgradeCost, canAfford, REQUIRED_SLOTS, type Stats } from '../items/inventory';
import { esc } from './hud';

export interface WorkshopActions {
  equip(instanceId: string): void; unequip(slot: Slot): void; craft(itemId: string): void; upgrade(instanceId: string): void; dismantle(instanceId: string): void; close(): void;
  sound(n: 'ui' | 'uiBack' | 'deny'): void;
}
const STAT_ROWS: [keyof Stats, string, (v: number) => string][] = [
  ['hpMax', 'Integridade', (v) => String(v)], ['enMax', 'Energia', (v) => String(v)], ['attack', 'Ataque', (v) => String(v)], ['defense', 'Defesa', (v) => String(v)],
  ['stagger', 'Impacto', (v) => String(v)], ['crit', 'Crítico', (v) => Math.round(v * 100) + '%'], ['speedMul', 'Velocidade', (v) => Math.round(v * 100) + '%'],
  ['jumpMul', 'Salto', (v) => Math.round(v * 100) + '%'], ['blockReduce', 'Bloqueio', (v) => Math.round(v * 100) + '%'], ['dodgeCost', 'Custo esquiva', (v) => String(v)],
];
const ABIL: Record<string, string> = { winch: 'Guincho [R]', heavyImpact: 'Golpe pesado', aimAssist: 'Assistência de mira', revealCaches: 'Revela contêineres', scrapSense: 'Sentido de sucata', highJump: 'Salto alto', strongBlock: 'Bloqueio forte', energyRegen: 'Regeneração' };
const ICON: Record<Slot, string> = { head: '◉', armL: '⟨', armR: '⟩', legs: '╨', body: '▣', core: '✹' };

export class Workshop {
  el: HTMLDivElement;
  private slot: Slot = 'armR';
  private sel: string | null = null;
  private tab: 'parts' | 'craft' = 'parts';
  constructor(private s: GameState, private mode: 'field' | 'full', private a: WorkshopActions, private title: string) {
    this.el = document.createElement('div');
    this.el.className = 'screen workshop';
    this.el.addEventListener('click', (e) => this.onClick(e));
    // começa no primeiro slot com novidade
    const fresh = this.s.inventory.parts.find((p) => !Object.values(this.s.equipment).includes(p.instanceId) && ITEMS[p.itemId]);
    if (fresh) this.slot = ITEMS[fresh.itemId].slot;
    this.render();
  }
  refresh() { this.render(); }
  private flashT: number | undefined;
  flash(msg: string) {
    let f = this.el.querySelector<HTMLDivElement>('.wflash');
    if (!f) { f = document.createElement('div'); f.className = 'wflash'; this.el.appendChild(f); }
    f.textContent = msg; f.classList.remove('on'); void f.offsetWidth; f.classList.add('on');
    clearTimeout(this.flashT); this.flashT = window.setTimeout(() => f!.classList.remove('on'), 2400);
  }
  private onClick(e: Event) {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!t || (t as HTMLButtonElement).disabled) return;
    const act = t.dataset.act!, v = t.dataset.v ?? '';
    switch (act) {
      case 'slot': this.slot = v as Slot; this.sel = null; this.a.sound('ui'); break;
      case 'pick': this.sel = v; this.a.sound('ui'); break;
      case 'equip': this.a.equip(v); break;
      case 'unequip': this.a.unequip(v as Slot); break;
      case 'upgrade': this.a.upgrade(v); break;
      case 'dismantle': this.a.dismantle(v); this.sel = null; break;
      case 'craft': this.a.craft(v); break;
      case 'tab': this.tab = v as 'parts' | 'craft'; this.a.sound('ui'); break;
      case 'close': this.a.close(); return;
    }
    this.render();
  }
  private render() {
    const s = this.s, cur = computeStats(s);
    const parts = s.inventory.parts.filter((p) => ITEMS[p.itemId]?.slot === this.slot);
    const equippedId = s.equipment[this.slot];
    const selId = this.sel ?? equippedId ?? parts[0]?.instanceId ?? null;
    const selP = findPart(s, selId);
    const selD = selP ? ITEMS[selP.itemId] : null;
    // simulação para comparação
    let preview: Stats | null = null, previewW = weightOf(s);
    if (selP && selP.instanceId !== equippedId) {
      const clone: GameState = JSON.parse(JSON.stringify(s));
      clone.equipment[this.slot] = selP.instanceId;
      preview = computeStats(clone); previewW = weightOf(clone);
    }
    const cap = capacity(s), w = weightOf(s);
    const m = s.inventory.materials;
    const slotsHtml = SLOTS.map((sl) => {
      const p = findPart(s, s.equipment[sl]);
      const hasNew = s.inventory.parts.some((x) => ITEMS[x.itemId]?.slot === sl && !Object.values(s.equipment).includes(x.instanceId));
      return `<button class="wslot${sl === this.slot ? ' on' : ''}" data-act="slot" data-v="${sl}"><i>${ICON[sl]}</i><span><small>${SLOT_LABEL[sl]}</small>${p ? esc(ITEMS[p.itemId].name) + (p.upgrade ? ` +${p.upgrade}` : '') : '<em>vazio</em>'}</span>${hasNew ? '<b class="new">novo</b>' : ''}</button>`;
    }).join('');
    const listHtml = parts.map((p) => {
      const d = ITEMS[p.itemId];
      const eq = p.instanceId === equippedId;
      return `<button class="witem${p.instanceId === selId ? ' on' : ''}${eq ? ' eq' : ''}" data-act="pick" data-v="${p.instanceId}"><span>${esc(d.name)}${p.upgrade ? ` <b>+${p.upgrade}</b>` : ''}</span><small>${eq ? 'EQUIPADA' : `peso ${d.weight}`}</small></button>`;
    }).join('') || `<p class="muted">Nenhuma peça para este slot ainda.${this.slot === 'armR' ? ' Derrote um Patrulheiro de Trilho.' : ''}</p>`;
    const row = ([k, label, fmt]: (typeof STAT_ROWS)[number]) => {
      const a = cur[k] as number, b = preview ? (preview[k] as number) : a;
      const diff = b - a; const better = k === 'dodgeCost' ? diff < 0 : diff > 0;
      return `<div class="srow"><span>${label}</span><b>${fmt(a)}</b>${preview && Math.abs(diff) > 1e-6 ? `<em class="${better ? 'up' : 'down'}">→ ${fmt(b)}</em>` : '<em></em>'}</div>`;
    };
    let detail = '<p class="muted">Selecione uma peça.</p>';
    if (selP && selD) {
      const eq = selP.instanceId === equippedId;
      const upc = upgradeCost(selP);
      const canUp = this.mode === 'full' && upc && canAfford(s, upc);
      const required = REQUIRED_SLOTS.includes(this.slot);
      detail = `<h3>${esc(selD.name)}${selP.upgrade ? ` +${selP.upgrade}` : ''}</h3><p class="desc">${esc(selD.desc)}</p>
        <div class="tags">${selD.abilities.map((x) => `<span>${ABIL[x] ?? x}</span>`).join('')}${selD.moveset ? `<span>Combo: ${selD.moveset === 'rivet' ? 'Rebitador' : 'Martelo'}</span>` : ''}${selD.essential ? '<span class="ess">Essencial</span>' : ''}</div>
        <p class="origin">Origem: ${esc(selD.origin)} • Peso ${selD.weight}</p>
        <div class="acts">
          ${eq ? (required ? '<button class="mbtn" disabled>Equipada</button>' : `<button class="mbtn" data-act="unequip" data-v="${this.slot}">Remover</button>`) : `<button class="mbtn primary" data-act="equip" data-v="${selP.instanceId}" ${previewW > cap ? 'disabled' : ''}>${previewW > cap ? 'Carga excedida' : 'Equipar'}</button>`}
          ${this.mode === 'full' ? `<button class="mbtn" data-act="upgrade" data-v="${selP.instanceId}" ${canUp ? '' : 'disabled'}>${upc ? `Melhorar (${upc.scrap}⬢${upc.alloy ? ' ' + upc.alloy + '◆' : ''}${upc.ancient ? ' ' + upc.ancient + '✦' : ''})` : 'Melhoria máxima'}</button>
          <button class="mbtn danger" data-act="dismantle" data-v="${selP.instanceId}" ${eq || selD.essential ? 'disabled' : ''}>Desmontar</button>` : ''}
        </div>`;
    }
    const craftHtml = s.blueprints.map((id) => {
      const d = ITEMS[id]; if (!d?.craft) return '';
      const ok = canAfford(s, d.craft);
      const owned = s.inventory.parts.filter((p) => p.itemId === id).length;
      return `<div class="craft"><div><h4>${esc(d.name)} <small>${SLOT_LABEL[d.slot]}</small></h4><p>${esc(d.desc)}</p><small>${owned ? `Você tem ${owned}` : ''}</small></div><button class="mbtn ${ok ? 'primary' : ''}" data-act="craft" data-v="${id}" ${ok ? '' : 'disabled'}>${d.craft.scrap}⬢${d.craft.alloy ? ' ' + d.craft.alloy + '◆' : ''}${d.craft.cells ? ' ' + d.craft.cells + '▮' : ''}</button></div>`;
    }).join('') || '<p class="muted">Nenhum projeto desbloqueado.</p>';
    const ab = [...(preview ?? cur).abilities].map((x) => ABIL[x] ?? x).join(' • ');
    const keepFlash = this.el.querySelector('.wflash');
    this.el.innerHTML = `
      <div class="whead"><h2>${esc(this.title)}</h2><span class="mode">${this.mode === 'full' ? 'Oficina completa' : 'Bancada de campo — só troca de peças'}</span><button class="xbtn" data-act="close" aria-label="Fechar">✕</button></div>
      ${this.mode === 'full' ? `<div class="wtabs"><button class="${this.tab === 'parts' ? 'on' : ''}" data-act="tab" data-v="parts">Montagem</button><button class="${this.tab === 'craft' ? 'on' : ''}" data-act="tab" data-v="craft">Fabricar</button></div>` : ''}
      ${this.tab === 'craft' && this.mode === 'full' ? `<div class="wcraft">${craftHtml}</div>` : `
      <div class="wgrid">
        <div class="wslots">${slotsHtml}</div>
        <div class="wlist"><h4>${SLOT_LABEL[this.slot]}</h4>${listHtml}</div>
        <div class="wdetail">${detail}<div class="stats">${STAT_ROWS.map(row).join('')}</div><p class="abl">${esc(ab)}</p></div>
      </div>`}
      <div class="wfoot"><div class="cap"><span>Carga ${preview ? previewW : w} / ${cap}</span><div class="capbar"><i style="width:${Math.min(100, ((preview ? previewW : w) / cap) * 100)}%"></i></div></div>
      <div class="mats">⬢ ${m.scrap} &nbsp; ◆ ${m.alloy} &nbsp; ▮ ${m.cells} &nbsp; ✦ ${m.ancient}</div></div>`;
    if (keepFlash) this.el.appendChild(keepFlash);
  }
}

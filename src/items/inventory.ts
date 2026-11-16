// Inventário, equipamento e transações atômicas da oficina (GDD §6.2, §7.4, §12.3)
import { ITEMS, SLOTS, BASE_CAPACITY, MAX_UPGRADE, UPGRADE_COST, UPGRADE_BONUS, type Slot, type Ability } from '../content/items';
import type { GameState, PartInstance } from '../game/state';

export type TxResult = { ok: true } | { ok: false; reason: string };
const fail = (reason: string): TxResult => ({ ok: false, reason });
const OK: TxResult = { ok: true };

/** Slots que nunca podem ficar vazios (evita softlock de locomoção/estrutura) */
export const REQUIRED_SLOTS: Slot[] = ['legs', 'body', 'core'];

export function findPart(s: GameState, instanceId: string | null | undefined): PartInstance | undefined {
  if (!instanceId) return undefined;
  return s.inventory.parts.find((p) => p.instanceId === instanceId);
}
export function equippedItem(s: GameState, slot: Slot): string | null {
  const p = findPart(s, s.equipment[slot]);
  return p ? p.itemId : null;
}
export function capacity(s: GameState) { return BASE_CAPACITY + s.capacityBonus; }
export function weightOf(s: GameState, equipment = s.equipment) {
  let w = 0;
  for (const sl of SLOTS) { const p = findPart(s, equipment[sl]); if (p) w += ITEMS[p.itemId].weight; }
  return w;
}

/** Concede peça de forma idempotente: a mesma grantId nunca gera duas instâncias. */
export function grantPart(s: GameState, itemId: string, grantId: string): PartInstance | null {
  if (!ITEMS[itemId]) throw new Error('item inexistente ' + itemId);
  if (s.granted.includes(grantId)) return null;
  const inst: PartInstance = { instanceId: 'part-' + String(s.inventory.nextId++).padStart(4, '0'), itemId, upgrade: 0 };
  s.inventory.parts.push(inst);
  s.granted.push(grantId);
  return inst;
}
export function grantMaterials(s: GameState, m: Partial<GameState['inventory']['materials']>, grantId?: string): boolean {
  if (grantId) { if (s.granted.includes(grantId)) return false; s.granted.push(grantId); }
  const mm = s.inventory.materials;
  mm.scrap = Math.min(99999, mm.scrap + Math.max(0, Math.floor(m.scrap ?? 0)));
  mm.alloy = Math.min(999, mm.alloy + Math.max(0, Math.floor(m.alloy ?? 0)));
  mm.cells = Math.min(999, mm.cells + Math.max(0, Math.floor(m.cells ?? 0)));
  mm.ancient = Math.min(99, mm.ancient + Math.max(0, Math.floor(m.ancient ?? 0)));
  return true;
}

export function canEquip(s: GameState, instanceId: string): TxResult {
  const p = findPart(s, instanceId);
  if (!p) return fail('Peça não encontrada.');
  const def = ITEMS[p.itemId];
  if (!def) return fail('Definição inválida.');
  const next = { ...s.equipment, [def.slot]: instanceId };
  if (weightOf(s, next) > capacity(s)) return fail(`Carga excedida (${weightOf(s, next)}/${capacity(s)}).`);
  return OK;
}
export function equip(s: GameState, instanceId: string): TxResult {
  const r = canEquip(s, instanceId);
  if (!r.ok) return r;
  const def = ITEMS[findPart(s, instanceId)!.itemId];
  s.equipment[def.slot] = instanceId;
  return OK;
}
export function unequip(s: GameState, slot: Slot): TxResult {
  if (REQUIRED_SLOTS.includes(slot)) return fail('Este slot não pode ficar vazio.');
  if (!s.equipment[slot]) return fail('Slot já vazio.');
  s.equipment[slot] = null;
  return OK;
}
function isEquipped(s: GameState, instanceId: string) { return SLOTS.some((sl) => s.equipment[sl] === instanceId); }

export function canAfford(s: GameState, c: { scrap?: number; alloy?: number; cells?: number; ancient?: number }) {
  const m = s.inventory.materials;
  return m.scrap >= (c.scrap ?? 0) && m.alloy >= (c.alloy ?? 0) && m.cells >= (c.cells ?? 0) && m.ancient >= (c.ancient ?? 0);
}
function pay(s: GameState, c: { scrap?: number; alloy?: number; cells?: number; ancient?: number }) {
  const m = s.inventory.materials;
  m.scrap -= c.scrap ?? 0; m.alloy -= c.alloy ?? 0; m.cells -= c.cells ?? 0; m.ancient -= c.ancient ?? 0;
}
export function craft(s: GameState, itemId: string): TxResult & { instance?: PartInstance } {
  const def = ITEMS[itemId];
  if (!def?.craft) return fail('Sem receita.');
  if (!s.blueprints.includes(itemId)) return fail('Projeto não desbloqueado.');
  if (!canAfford(s, def.craft)) return fail('Materiais insuficientes.');
  pay(s, def.craft);
  const inst: PartInstance = { instanceId: 'part-' + String(s.inventory.nextId++).padStart(4, '0'), itemId, upgrade: 0 };
  s.inventory.parts.push(inst);
  return { ok: true, instance: inst };
}
export function upgradeCost(p: PartInstance) { return p.upgrade >= MAX_UPGRADE ? null : UPGRADE_COST[p.upgrade]; }
export function upgrade(s: GameState, instanceId: string): TxResult {
  const p = findPart(s, instanceId);
  if (!p) return fail('Peça não encontrada.');
  const c = upgradeCost(p);
  if (!c) return fail('Melhoria máxima.');
  if (!canAfford(s, c)) return fail('Materiais insuficientes.');
  pay(s, c);
  p.upgrade++;
  return OK;
}
/** Desmontar devolve ~40% dos comuns; itens essenciais e equipados são travados. */
export function dismantle(s: GameState, instanceId: string): TxResult & { refund?: { scrap: number } } {
  const p = findPart(s, instanceId);
  if (!p) return fail('Peça não encontrada.');
  const def = ITEMS[p.itemId];
  if (def.essential) return fail('Peça essencial: não pode ser desmontada.');
  if (isEquipped(s, instanceId)) return fail('Retire a peça antes de desmontar.');
  const base = (def.craft?.scrap ?? 120) + p.upgrade * 150;
  const refund = { scrap: Math.round(base * 0.4) };
  s.inventory.parts = s.inventory.parts.filter((x) => x.instanceId !== instanceId);
  grantMaterials(s, refund);
  return { ok: true, refund };
}

export interface Stats {
  hpMax: number; enMax: number; attack: number; defense: number; stagger: number; crit: number;
  jumpMul: number; speedMul: number; enRegen: number; dodgeCost: number; blockReduce: number;
  weight: number; capacity: number; abilities: Set<Ability>; moveset: 'none' | 'rivet' | 'hammer';
}
export function computeStats(s: GameState): Stats {
  const L = s.player.level;
  const st: Stats = {
    hpMax: 100 + 4 * (L - 1), enMax: 100 + 2 * (L - 1), attack: 6 + L, defense: 0, stagger: 0, crit: 0.05,
    jumpMul: 1, speedMul: 1, enRegen: 12, dodgeCost: 18, blockReduce: 0.35, weight: weightOf(s), capacity: capacity(s),
    abilities: new Set(), moveset: 'none',
  };
  for (const sl of SLOTS) {
    const p = findPart(s, s.equipment[sl]);
    if (!p) continue;
    const d = ITEMS[p.itemId];
    const up = 1 + p.upgrade * UPGRADE_BONUS;
    st.hpMax += Math.round((d.stats.hp ?? 0) * up);
    st.enMax += d.stats.en ?? 0;
    st.attack += Math.round((d.stats.attack ?? 0) * up);
    st.defense += Math.round((d.stats.defense ?? 0) * up);
    st.stagger += d.stats.stagger ?? 0;
    st.crit += d.stats.crit ?? 0;
    st.jumpMul += d.stats.jump ?? 0;
    st.speedMul += d.stats.speed ?? 0;
    st.enRegen *= 1 + (d.stats.enRegen ?? 0);
    st.dodgeCost += d.stats.dodgeCost ?? 0;
    if (d.stats.blockReduce) st.blockReduce = Math.max(st.blockReduce, d.stats.blockReduce);
    d.abilities.forEach((a) => st.abilities.add(a));
    if (sl === 'armR' && d.moveset) st.moveset = d.moveset;
  }
  st.crit = Math.min(0.35, st.crit);
  // sobrecarga reduz velocidade (nunca prende o jogador)
  if (st.weight > st.capacity) st.speedMul *= 0.8;
  return st;
}

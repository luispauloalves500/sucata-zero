// Saves versionados em IndexedDB (GDD §19). Validação estrita antes de carregar.
import { ITEMS, SLOTS } from '../content/items';
import { QUEST_BY_ID } from '../content/quests';
import { SCHEMA_VERSION, type GameState } from '../game/state';

export const SLOT_IDS = ['auto', 'slot1', 'slot2', 'slot3'] as const;
export type SaveSlot = (typeof SLOT_IDS)[number];
export interface SaveRecord { slot: SaveSlot; checksum: string; state: GameState; savedAt: number }

export function checksum(str: string): string {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

const isNum = (v: unknown, min = -Infinity, max = Infinity) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;

/** Migra versões antigas sem descartar progresso. */
export function migrate(raw: any): any {
  if (!raw || typeof raw !== 'object') throw new Error('save vazio');
  const s = structuredClone(raw);
  if (s.schemaVersion === 1) {
    // v1 não tinha capacityBonus/scrapSinceTerminal/circuitPoints
    s.capacityBonus = s.capacityBonus ?? 0;
    s.scrapSinceTerminal = s.scrapSinceTerminal ?? 0;
    s.lostScrap = s.lostScrap ?? null;
    s.player.circuitPoints = s.player.circuitPoints ?? 0;
    s.schemaVersion = 2;
  }
  return s;
}

export function validateState(raw: unknown): { ok: true; state: GameState } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  let s: any;
  try { s = migrate(raw); } catch (e) { return { ok: false, errors: [String(e)] }; }
  if (s.schemaVersion !== SCHEMA_VERSION) errors.push('schemaVersion desconhecida: ' + s.schemaVersion);
  if (typeof s.campaignId !== 'string' || s.campaignId.length > 64) errors.push('campaignId inválido');
  const p = s.player;
  if (!p || !isNum(p.level, 1, 30) || !isNum(p.xp, 0, 1e7) || !isNum(p.hp, 0, 10000) || !isNum(p.energy, 0, 10000)) errors.push('player inválido');
  const inv = s.inventory;
  if (!inv || !Array.isArray(inv.parts) || inv.parts.length > 150) errors.push('inventário inválido');
  else {
    const ids = new Set<string>();
    for (const part of inv.parts) {
      if (!part || typeof part.instanceId !== 'string' || !ITEMS[part.itemId] || !isNum(part.upgrade, 0, 4)) { errors.push('peça inválida'); break; }
      if (ids.has(part.instanceId)) { errors.push('instanceId duplicado ' + part.instanceId); break; }
      ids.add(part.instanceId);
    }
    const m = inv.materials;
    if (!m || !isNum(m.scrap, 0, 99999) || !isNum(m.alloy, 0, 999) || !isNum(m.cells, 0, 999) || !isNum(m.ancient, 0, 99)) errors.push('materiais inválidos');
    if (!isNum(inv.nextId, 1, 1e6)) errors.push('nextId inválido');
    if (s.equipment && typeof s.equipment === 'object') {
      const used = new Set<string>();
      for (const sl of SLOTS) {
        const id = s.equipment[sl];
        if (id === null || id === undefined) continue;
        const part = inv.parts.find((x: any) => x.instanceId === id);
        if (!part) { errors.push(`slot ${sl} referencia peça inexistente`); continue; }
        if (ITEMS[part.itemId].slot !== sl) errors.push(`peça ${part.itemId} no slot errado ${sl}`);
        if (used.has(id)) errors.push('peça equipada duas vezes');
        used.add(id);
      }
      for (const req of ['legs', 'body', 'core']) if (!s.equipment[req]) errors.push(`slot obrigatório vazio: ${req}`);
    } else errors.push('equipamento ausente');
  }
  if (!s.quests || typeof s.quests !== 'object') errors.push('quests ausentes');
  else for (const [id, q] of Object.entries<any>(s.quests)) {
    if (!QUEST_BY_ID[id]) { errors.push('missão desconhecida ' + id); continue; }
    if (!['locked', 'available', 'active', 'complete'].includes(q?.state) || !isNum(q.stage, 0, 50)) errors.push('estado de missão inválido ' + id);
  }
  for (const k of ['flags', 'bossFlags']) if (!s[k] || typeof s[k] !== 'object' || Array.isArray(s[k])) errors.push(k + ' inválido');
  for (const k of ['collectibles', 'granted', 'blueprints']) if (!Array.isArray(s[k]) || s[k].some((x: unknown) => typeof x !== 'string')) errors.push(k + ' inválido');
  if (!['explorer', 'standard', 'veteran'].includes(s.difficulty)) errors.push('dificuldade inválida');
  if (!isNum(s.playtimeSeconds, 0, 1e8)) errors.push('tempo inválido');
  if (!isNum(s.capacityBonus, 0, 30)) errors.push('capacidade inválida');
  return errors.length ? { ok: false, errors } : { ok: true, state: s as GameState };
}

/** Importação de arquivo: limites de tamanho/profundidade antes do parse completo. */
export function parseImport(text: string): ReturnType<typeof validateState> {
  if (text.length > 512 * 1024) return { ok: false, errors: ['arquivo grande demais'] };
  let depth = 0, max = 0;
  for (const c of text) { if (c === '{' || c === '[') max = Math.max(max, ++depth); else if (c === '}' || c === ']') depth--; }
  if (max > 12) return { ok: false, errors: ['estrutura profunda demais'] };
  let obj: any;
  try { obj = JSON.parse(text); } catch { return { ok: false, errors: ['JSON inválido'] }; }
  const st = obj?.state ?? obj;
  if (obj?.checksum && obj?.state && checksum(JSON.stringify(obj.state)) !== obj.checksum) return { ok: false, errors: ['checksum não confere'] };
  return validateState(st);
}

export interface SaveBackend { get(slot: string): Promise<SaveRecord | undefined>; put(rec: SaveRecord): Promise<void>; del(slot: string): Promise<void> }

export class MemoryBackend implements SaveBackend {
  map = new Map<string, SaveRecord>();
  async get(slot: string) { const r = this.map.get(slot); return r ? structuredClone(r) : undefined; }
  async put(rec: SaveRecord) { this.map.set(rec.slot, structuredClone(rec)); }
  async del(slot: string) { this.map.delete(slot); }
}

export class IDBBackend implements SaveBackend {
  private db: Promise<IDBDatabase>;
  constructor(name = 'sucata-zero') {
    this.db = new Promise((res, rej) => {
      const r = indexedDB.open(name, 1);
      r.onupgradeneeded = () => { r.result.createObjectStore('saves', { keyPath: 'slot' }); };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  private async tx(mode: IDBTransactionMode) { return (await this.db).transaction('saves', mode).objectStore('saves'); }
  async get(slot: string): Promise<SaveRecord | undefined> {
    const st = await this.tx('readonly');
    return new Promise((res, rej) => { const r = st.get(slot); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  }
  async put(rec: SaveRecord): Promise<void> {
    const db = await this.db;
    return new Promise((res, rej) => {
      const t = db.transaction('saves', 'readwrite');
      t.objectStore('saves').put(rec);
      t.oncomplete = () => res(); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
    });
  }
  async del(slot: string): Promise<void> {
    const db = await this.db;
    return new Promise((res, rej) => { const t = db.transaction('saves', 'readwrite'); t.objectStore('saves').delete(slot); t.oncomplete = () => res(); t.onerror = () => rej(t.error); });
  }
}

export class SaveStore {
  constructor(public backend: SaveBackend) {}
  static create(): SaveStore {
    try { if (typeof indexedDB !== 'undefined') return new SaveStore(new IDBBackend()); } catch { /* fallback */ }
    return new SaveStore(new MemoryBackend());
  }
  async save(slot: SaveSlot, state: GameState): Promise<void> {
    state.timestamp = Date.now();
    const json = JSON.stringify(state);
    const v = validateState(JSON.parse(json));
    if (!v.ok) throw new Error('estado inválido, save abortado: ' + v.errors.join('; '));
    // backup do save anterior do slot antes de sobrescrever
    const prev = await this.backend.get(slot);
    if (prev) await this.backend.put({ ...prev, slot: (slot + '_bak') as SaveSlot });
    await this.backend.put({ slot, checksum: checksum(json), state: JSON.parse(json), savedAt: Date.now() });
  }
  async load(slot: SaveSlot): Promise<{ ok: true; state: GameState } | { ok: false; errors: string[] }> {
    const rec = await this.backend.get(slot);
    if (!rec) return { ok: false, errors: ['vazio'] };
    if (checksum(JSON.stringify(rec.state)) !== rec.checksum) {
      const bak = await this.backend.get(slot + '_bak');
      if (bak) { const vb = validateState(bak.state); if (vb.ok) return vb; }
      return { ok: false, errors: ['checksum não confere (save danificado)'] };
    }
    return validateState(rec.state);
  }
  async meta(slot: SaveSlot) { const r = await this.backend.get(slot); return r ? { savedAt: r.savedAt, level: r.state.player.level, playtime: r.state.playtimeSeconds, checkpoint: r.state.checkpointId } : null; }
  async remove(slot: SaveSlot) { await this.backend.del(slot); await this.backend.del(slot + '_bak'); }
  exportJson(state: GameState) { const json = JSON.stringify(state); return JSON.stringify({ game: 'sucata-zero', checksum: checksum(json), state }, null, 1); }
}

import { describe, it, expect } from 'vitest';
import { computeDamage } from '../../src/combat/damage';
import { newGame } from '../../src/game/state';
import * as inv from '../../src/items/inventory';
import { ITEMS } from '../../src/content/items';
import { QUESTS } from '../../src/content/quests';
import { questEvent, applyReward } from '../../src/progression/quests';
import { addXp, xpToNext } from '../../src/progression/leveling';
import { checksum, validateState, parseImport, migrate, SaveStore, MemoryBackend } from '../../src/persistence/save';
import { NavGrid } from '../../src/world/builder';

describe('dano', () => {
  it('mínimo 1 e NaN seguro', () => {
    expect(computeDamage({ attackPower: 0, hitMul: 1, defense: 999, rand: () => 1 }).amount).toBe(1);
    expect(computeDamage({ attackPower: NaN, hitMul: NaN, defense: NaN, rand: () => 1 }).amount).toBe(1);
  });
  it('redução máxima de 70%', () => {
    expect(computeDamage({ attackPower: 100, hitMul: 1, defense: 1e9, rand: () => 1 }).amount).toBe(30);
  });
  it('crítico limitado a 35%', () => {
    expect(computeDamage({ attackPower: 100, hitMul: 1, defense: 0, critChance: 1, rand: () => 0.36 }).crit).toBe(false);
    expect(computeDamage({ attackPower: 100, hitMul: 1, defense: 0, critChance: 1, rand: () => 0.1 }).crit).toBe(true);
  });
});

describe('estado inicial', () => {
  it('começa sem braço direito e válido', () => {
    const s = newGame();
    expect(s.equipment.armR).toBeNull();
    expect(validateState(JSON.parse(JSON.stringify(s))).ok).toBe(true);
    expect(s.quests['1-1'].state).toBe('active');
  });
});

describe('inventário e oficina', () => {
  it('peça concedida uma única vez (idempotente)', () => {
    const s = newGame();
    expect(inv.grantPart(s, 'P11', 'drop:e02')).not.toBeNull();
    expect(inv.grantPart(s, 'P11', 'drop:e02')).toBeNull();
  });
  it('equipar muda o slot e os atributos', () => {
    const s = newGame();
    const before = inv.computeStats(s);
    const p = inv.grantPart(s, 'P11', 'g1')!;
    expect(inv.equip(s, p.instanceId).ok).toBe(true);
    expect(inv.equippedItem(s, 'armR')).toBe('P11');
    const after = inv.computeStats(s);
    expect(after.moveset).toBe('rivet');
    expect(after).not.toEqual(before);
  });
  it('slots obrigatórios não podem ser desmontados', () => {
    const s = newGame();
    for (const slot of inv.REQUIRED_SLOTS) expect(inv.unequip(s, slot).ok).toBe(false);
  });
  it('fabricar exige planta e materiais', () => {
    const s = newGame();
    s.inventory.materials = { scrap: 0, alloy: 0, cells: 0, ancient: 0 };
    expect(inv.craft(s, 'P08').ok).toBe(false);
    s.inventory.materials = { scrap: 9999, alloy: 999, cells: 999, ancient: 0 };
    expect(inv.craft(s, 'P08').ok).toBe(true);
  });
  it('melhoria tem limite', () => {
    const s = newGame();
    s.inventory.materials = { scrap: 99999, alloy: 9999, cells: 9999, ancient: 99 };
    const p = inv.grantPart(s, 'P11', 'g')!;
    for (let i = 0; i < 10; i++) inv.upgrade(s, p.instanceId);
    expect(inv.findPart(s, p.instanceId)!.upgrade).toBeLessThanOrEqual(4);
  });
  it('desmontar peça equipada não é permitido', () => {
    const s = newGame();
    const core = s.equipment.core!;
    expect(inv.dismantle(s, core).ok).toBe(false);
  });
  it('catálogo consistente', () => {
    for (const [id, it] of Object.entries(ITEMS)) expect(it.id).toBe(id);
  });
});

describe('missões', () => {
  it('progressão 1-1 → 1-2 e recompensa idempotente', () => {
    const s = newGame();
    questEvent(s, { type: 'reach', id: 'r_ledge' });
    questEvent(s, { type: 'interact', id: 'crate_start' });
    const u = questEvent(s, { type: 'reach', id: 'r_exit11' });
    expect(u.completed).toContain('1-1');
    expect(s.quests['1-2'].state).toBe('active');
    const scrap = s.inventory.materials.scrap;
    applyReward(s, '1-1', QUESTS[0].rewards);
    expect(s.inventory.materials.scrap).toBe(scrap);
  });
  it('evento fora de ordem é ignorado', () => {
    const s = newGame();
    questEvent(s, { type: 'interact', id: 'crate_start' });
    expect(s.quests['1-1'].stage).toBe(0);
  });
});

describe('nível', () => {
  it('xp sobe nível', () => {
    const s = newGame();
    const L = s.player.level;
    addXp(s, xpToNext(L) + 1);
    expect(s.player.level).toBe(L + 1);
  });
});

describe('salvamento', () => {
  it('checksum muda com o conteúdo', () => { expect(checksum('a')).not.toBe(checksum('b')); });
  it('rejeita JSON inválido, profundo ou adulterado', () => {
    expect(parseImport('{').ok).toBe(false);
    expect(parseImport('['.repeat(40) + ']'.repeat(40)).ok).toBe(false);
    const s = newGame();
    const blob = JSON.parse(new SaveStore(new MemoryBackend()).exportJson(s));
    blob.state.player.level = 99;
    expect(parseImport(JSON.stringify(blob)).ok).toBe(false);
  });
  it('rejeita estado com valores impossíveis', () => {
    const s: any = newGame(); s.inventory.materials.scrap = -5;
    expect(validateState(s).ok).toBe(false);
  });
  it('migra v1', () => {
    const s: any = newGame(); s.schemaVersion = 1;
    expect(migrate(s).schemaVersion).toBe(2);
  });
  it('salva, carrega e recupera do backup se danificado', async () => {
    const be = new MemoryBackend(); const st = new SaveStore(be);
    const s = newGame(); await st.save('slot1', s);
    s.player.level = 3; await st.save('slot1', s);
    const r = await st.load('slot1'); expect(r.ok && r.state.player.level).toBe(3);
    const rec = await be.get('slot1'); rec!.state.player.level = 7; await be.put(rec!); // corrompe sem atualizar checksum
    const r2 = await st.load('slot1'); expect(r2.ok && r2.state.player.level).toBe(1);
  });
});

describe('navegação', () => {
  it('A* contorna parede', () => {
    const g = new NavGrid(0, 0, 20, 20, 1);
    g.build([{ minX: 9, maxX: 10, minY: 0, maxY: 3, minZ: 0, maxZ: 15 }]);
    const p = g.findPath(2, 2, 18, 2);
    expect(p).not.toBeNull();
    for (const [x, z] of p!) expect(g.walkable(x, z)).toBe(true);
  });
});

describe('tarefas secundárias', () => {
  const unlockSides = () => {
    const s = newGame('standard');
    for (const id of ['1-1', '1-2', '1-3', '1-4']) s.quests[id] = { state: 'complete', stage: 99 } as any;
    s.quests['S01'] = { state: 'active', stage: 0 } as any; s.quests['S02'] = { state: 'active', stage: 0 } as any;
    return s;
  };
  it('S01 conta 3 ferramentas distintas (repetir não conta) e dá capacidade', () => {
    const s = unlockSides();
    const cap0 = s.capacityBonus;
    questEvent(s, { type: 'interact', id: 'tool_1' }); questEvent(s, { type: 'interact', id: 'tool_1' });
    expect(s.quests['S01'].state).toBe('active');
    questEvent(s, { type: 'interact', id: 'tool_2' });
    const u = questEvent(s, { type: 'interact', id: 'tool_3' });
    expect(s.quests['S01'].state).toBe('complete');
    expect(u.rewards?.some((r) => r.quest === 'S01')).toBe(true);
    expect(s.capacityBonus).toBe(cap0 + 10);
  });
  it('S02 libera o projeto do Martelo de Prensa (P12) uma única vez', () => {
    const s = unlockSides();
    questEvent(s, { type: 'interact', id: 'crane_lever' });
    expect(s.quests['S02'].state).toBe('complete');
    expect(s.blueprints.filter((b) => b === 'P12').length).toBe(1);
    questEvent(s, { type: 'interact', id: 'crane_lever' });
    expect(s.blueprints.filter((b) => b === 'P12').length).toBe(1);
  });
});

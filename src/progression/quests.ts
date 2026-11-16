// Máquina de missões: estágios só avançam por evento válido; recompensas idempotentes.
import { QUESTS, QUEST_BY_ID, type QuestDef, type Reward } from '../content/quests';
import type { GameState } from '../game/state';
import { grantMaterials } from '../items/inventory';
import { addXp } from './leveling';

export type QuestEvent =
  | { type: 'reach'; id: string } | { type: 'interact'; id: string } | { type: 'defeat'; tag: string }
  | { type: 'collect'; itemId: string } | { type: 'equip'; itemId: string } | { type: 'boss'; id: string } | { type: 'plate'; id: string };

export interface QuestUpdate { stageCompleted?: { quest: string; stage: string }[]; completed?: string[]; rewards?: { quest: string; reward: Reward; levels: number }[] }

export function questStage(s: GameState, id: string) {
  const q = QUEST_BY_ID[id]; const st = s.quests[id];
  if (!q || !st || st.state !== 'active') return null;
  return q.stages[st.stage] ?? null;
}
export function activeQuests(s: GameState): QuestDef[] { return QUESTS.filter((q) => s.quests[q.id]?.state === 'active'); }
export function mainQuest(s: GameState): QuestDef | null { return activeQuests(s).find((q) => q.kind === 'main') ?? null; }
export function countProgress(s: GameState, questId: string, stageId: string): number { return Number(s.flags[`q:${questId}:${stageId}`] ?? 0); }

function matches(s: GameState, q: QuestDef, ev: QuestEvent): boolean {
  const stg = q.stages[s.quests[q.id].stage];
  if (!stg) return false;
  switch (stg.type) {
    case 'reach': return ev.type === 'reach' && ev.id === stg.target;
    case 'interact': return ev.type === 'interact' && ev.id === stg.target;
    case 'defeat': return ev.type === 'defeat' && ev.tag === stg.target;
    case 'collect': return ev.type === 'collect' && ev.itemId === stg.target;
    case 'equip': return ev.type === 'equip' && ev.itemId === stg.target;
    case 'boss': return ev.type === 'boss' && ev.id === stg.target;
    case 'plate': return ev.type === 'plate' && ev.id === stg.target;
    case 'count': {
      if (ev.type !== 'interact' || !stg.ids?.includes(ev.id)) return false;
      const fk = `q:${q.id}:${stg.id}:${ev.id}`;
      if (s.flags[fk]) return false; // cada id conta uma vez
      s.flags[fk] = true;
      const ck = `q:${q.id}:${stg.id}`;
      s.flags[ck] = Number(s.flags[ck] ?? 0) + 1;
      return Number(s.flags[ck]) >= (stg.count ?? stg.ids.length);
    }
  }
}

export function applyReward(s: GameState, questId: string, r: Reward): number {
  const gid = `quest:${questId}`;
  if (s.granted.includes(gid)) return 0;
  grantMaterials(s, { scrap: r.scrap, alloy: r.alloy, cells: r.cells });
  s.granted.push(gid);
  if (r.capacity) s.capacityBonus += r.capacity;
  if (r.blueprint && !s.blueprints.includes(r.blueprint)) s.blueprints.push(r.blueprint);
  if (r.circuit) s.player.circuitPoints += r.circuit;
  return r.xp ? addXp(s, r.xp) : 0;
}

/** Processa um evento. Estágios já concluídos permanecem concluídos ao recarregar. */
export function questEvent(s: GameState, ev: QuestEvent): QuestUpdate {
  const out: QuestUpdate = { stageCompleted: [], completed: [], rewards: [] };
  for (const q of QUESTS) {
    const st = s.quests[q.id];
    if (!st || st.state !== 'active') continue;
    // um evento pode completar estágios em sequência (ex.: já tinha a peça e equipou)
    let guard = 0;
    while (st.state === 'active' && matches(s, q, ev) && guard++ < 10) {
      out.stageCompleted!.push({ quest: q.id, stage: q.stages[st.stage].id });
      st.stage++;
      if (st.stage >= q.stages.length) {
        st.state = 'complete';
        out.completed!.push(q.id);
        const levels = applyReward(s, q.id, q.rewards);
        out.rewards!.push({ quest: q.id, reward: q.rewards, levels });
        for (const u of q.unlocks) unlock(s, u);
      }
      break;
    }
  }
  return out;
}
export function unlock(s: GameState, id: string) {
  const q = QUEST_BY_ID[id];
  if (!q) return;
  const st = s.quests[id] ?? (s.quests[id] = { state: 'locked', stage: 0 });
  if (st.state !== 'locked') return;
  if (q.requires.every((r) => s.quests[r]?.state === 'complete')) st.state = 'active';
}

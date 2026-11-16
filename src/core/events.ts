// Barramento de eventos tipado (GDD §17.7)
export interface GameEvents {
  ENEMY_DEFEATED: { enemyId: string; defId: string; questTag?: string; pos: [number, number, number] };
  DAMAGE_APPLIED: { target: string; amount: number; crit: boolean; blocked: boolean };
  PART_LOOTED: { itemId: string; instanceId: string };
  ITEM_EQUIPPED: { slot: string; itemId: string | null };
  MODULE_ACTIVATED: { ability: string };
  QUEST_STAGE_COMPLETED: { questId: string; stageId: string };
  QUEST_COMPLETED: { questId: string };
  TERMINAL_UNLOCKED: { terminalId: string };
  SAVE_COMMITTED: { slot: string };
  INTERACT: { id: string; kind: string };
  REACH: { id: string };
  PLATE_BROKEN: { id: string };
  BOSS_PHASE: { phase: number };
  BOSS_DEFEATED: { bossId: string };
  LEVEL_UP: { level: number };
  TOAST: { text: string; kind?: 'info' | 'loot' | 'warn' | 'quest' };
  SAY: { who: string; text: string; dur?: number };
}
type Handler<T> = (p: T) => void;
export class EventBus {
  private map = new Map<keyof GameEvents, Set<Handler<any>>>();
  private seq = 0;
  on<K extends keyof GameEvents>(k: K, h: Handler<GameEvents[K]>): () => void {
    let s = this.map.get(k);
    if (!s) this.map.set(k, (s = new Set()));
    s.add(h);
    return () => s!.delete(h);
  }
  emit<K extends keyof GameEvents>(k: K, p: GameEvents[K]) {
    this.seq++;
    const s = this.map.get(k);
    if (s) for (const h of [...s]) h(p);
  }
  get eventCount() { return this.seq; }
  listenerCount(): number { let n = 0; for (const s of this.map.values()) n += s.size; return n; }
  clear() { this.map.clear(); }
}

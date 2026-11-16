// Estado persistente da campanha (GDD §19.1). Nada de referências ao motor aqui.
import type { Slot } from '../content/items';

export type QuestState = 'locked' | 'available' | 'active' | 'complete';
export type Difficulty = 'explorer' | 'standard' | 'veteran';
export interface PartInstance { instanceId: string; itemId: string; upgrade: number }
export interface Materials { scrap: number; alloy: number; cells: number; ancient: number }
export interface GameState {
  schemaVersion: number;
  campaignId: string;
  timestamp: number;
  regionId: string;
  checkpointId: string;
  player: { level: number; xp: number; hp: number; energy: number; circuitPoints: number };
  inventory: { parts: PartInstance[]; materials: Materials; nextId: number };
  equipment: Record<Slot, string | null>;
  blueprints: string[];
  quests: Record<string, { state: QuestState; stage: number }>;
  flags: Record<string, boolean | number>;
  bossFlags: Record<string, boolean>;
  collectibles: string[];
  granted: string[]; // ids de recompensas já concedidas (idempotência)
  difficulty: Difficulty;
  playtimeSeconds: number;
  capacityBonus: number;
  lostScrap: { amount: number; pos: [number, number, number] } | null;
  scrapSinceTerminal: number;
}

export const SCHEMA_VERSION = 2;

export function newGame(difficulty: Difficulty = 'standard'): GameState {
  const parts: PartInstance[] = [
    { instanceId: 'part-0001', itemId: 'P01', upgrade: 0 },
    { instanceId: 'part-0002', itemId: 'P06', upgrade: 0 },
    { instanceId: 'part-0003', itemId: 'P17', upgrade: 0 },
    { instanceId: 'part-0004', itemId: 'P23', upgrade: 0 },
    { instanceId: 'part-0005', itemId: 'P27', upgrade: 0 },
  ];
  return {
    schemaVersion: SCHEMA_VERSION,
    campaignId: 'local-' + Math.random().toString(36).slice(2, 8),
    timestamp: Date.now(),
    regionId: 'w01',
    checkpointId: 'cp_start',
    player: { level: 1, xp: 0, hp: 115, energy: 100, circuitPoints: 0 },
    inventory: { parts, materials: { scrap: 0, alloy: 0, cells: 0, ancient: 0 }, nextId: 6 },
    equipment: { head: 'part-0001', armL: 'part-0002', armR: null, legs: 'part-0003', body: 'part-0004', core: 'part-0005' },
    blueprints: ['P08'],
    quests: { '1-1': { state: 'active', stage: 0 }, '1-2': { state: 'locked', stage: 0 }, '1-3': { state: 'locked', stage: 0 }, '1-4': { state: 'locked', stage: 0 }, '1-5': { state: 'locked', stage: 0 }, S01: { state: 'locked', stage: 0 }, S02: { state: 'locked', stage: 0 } },
    flags: {},
    bossFlags: {},
    collectibles: [],
    granted: [],
    difficulty,
    playtimeSeconds: 0,
    capacityBonus: 0,
    lostScrap: null,
    scrapSinceTerminal: 0,
  };
}

import type { GameState } from '../game/state';
export const MAX_LEVEL = 30;
export const xpToNext = (L: number) => Math.round(100 + 45 * (L - 1) + 8 * (L - 1) ** 2);
/** adiciona XP e retorna níveis ganhos */
export function addXp(s: GameState, amount: number): number {
  if (!(amount > 0)) return 0;
  let gained = 0;
  s.player.xp += Math.floor(amount);
  while (s.player.level < MAX_LEVEL && s.player.xp >= xpToNext(s.player.level)) {
    s.player.xp -= xpToNext(s.player.level);
    s.player.level++;
    s.player.circuitPoints++;
    gained++;
  }
  if (s.player.level >= MAX_LEVEL) s.player.xp = 0;
  return gained;
}

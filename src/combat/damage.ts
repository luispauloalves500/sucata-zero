// Fórmulas de dano (GDD §5.3). Puras e testáveis.
export interface DamageInput {
  attackPower: number; hitMul: number; defense: number; penetration?: number;
  elemental?: number; critChance?: number; critMul?: number; rand?: () => number; difficultyMul?: number;
}
export interface DamageResult { amount: number; crit: boolean }
export function computeDamage(i: DamageInput): DamageResult {
  const r = i.rand ?? Math.random;
  const sane = (v: number, d: number) => (Number.isFinite(v) ? v : d);
  const atk = Math.max(0, sane(i.attackPower, 0));
  const mul = Math.max(0, sane(i.hitMul, 1));
  const crit = r() < Math.min(0.35, Math.max(0, sane(i.critChance ?? 0, 0)));
  const critMul = crit ? sane(i.critMul ?? 1.35, 1.35) : 1;
  const raw = atk * mul * critMul;
  const defEff = Math.max(0, sane(i.defense, 0) - sane(i.penetration ?? 0, 0));
  const red = Math.min(0.7, defEff / (defEff + 100));
  const el = Math.min(1.35, Math.max(0.65, sane(i.elemental ?? 1, 1)));
  const dm = Math.max(0, sane(i.difficultyMul ?? 1, 1));
  const amount = Math.max(1, Math.round(raw * (1 - red) * el * dm));
  return { amount, crit };
}
export const DIFFICULTY = {
  explorer: { dmgTaken: 0.75, telegraph: 1.3, extraAttacks: false, label: 'Explorador' },
  standard: { dmgTaken: 1.0, telegraph: 1.0, extraAttacks: false, label: 'Padrão' },
  veteran: { dmgTaken: 1.2, telegraph: 0.9, extraAttacks: true, label: 'Veterano' },
} as const;

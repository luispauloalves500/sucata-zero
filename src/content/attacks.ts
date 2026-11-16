// Definições de golpes do jogador (GDD §5.2, §22.2). Tempos em segundos.
export interface AttackDef {
  id: string;
  clip: string;
  startup: number;
  active: number;
  recovery: number;
  energy: number;
  dmgMul: number;
  stagger: number;
  /** alcance/raio da hitbox esférica posicionada à frente */
  reach: number;
  radius: number;
  maxVictims: number;
  /** janela final em que esquiva/outro golpe pode cancelar */
  cancel: number;
  lunge: number;
  breaksPlates?: boolean;
  shake: number;
}

export const ATTACKS: Record<string, AttackDef> = {
  claw: { id: 'claw', clip: 'claw', startup: 0.12, active: 0.1, recovery: 0.2, energy: 0, dmgMul: 0.7, stagger: 4, reach: 0.95, radius: 0.75, maxVictims: 2, cancel: 0.12, lunge: 1.2, shake: 0.08 },
  r1: { id: 'r1', clip: 'atk1', startup: 0.1, active: 0.08, recovery: 0.2, energy: 0, dmgMul: 1.0, stagger: 8, reach: 1.0, radius: 0.7, maxVictims: 2, cancel: 0.14, lunge: 1.6, shake: 0.1 },
  r2: { id: 'r2', clip: 'atk2', startup: 0.12, active: 0.09, recovery: 0.21, energy: 0, dmgMul: 1.05, stagger: 9, reach: 1.0, radius: 0.85, maxVictims: 3, cancel: 0.14, lunge: 1.6, shake: 0.1 },
  r3: { id: 'r3', clip: 'atk3', startup: 0.18, active: 0.1, recovery: 0.27, energy: 0, dmgMul: 1.35, stagger: 16, reach: 1.15, radius: 0.9, maxVictims: 3, cancel: 0.1, lunge: 2.2, shake: 0.2 },
  heavy: { id: 'heavy', clip: 'heavy', startup: 0.45, active: 0.15, recovery: 0.35, energy: 22, dmgMul: 1.65, stagger: 34, reach: 1.25, radius: 1.0, maxVictims: 3, cancel: 0.15, lunge: 1.4, breaksPlates: true, shake: 0.35 },
  // Martelo: mais lento e pesado
  h1: { id: 'h1', clip: 'atk1', startup: 0.16, active: 0.1, recovery: 0.26, energy: 0, dmgMul: 1.0, stagger: 14, reach: 1.15, radius: 0.85, maxVictims: 3, cancel: 0.12, lunge: 1.4, shake: 0.16 },
  h2: { id: 'h2', clip: 'atk2', startup: 0.18, active: 0.1, recovery: 0.28, energy: 0, dmgMul: 1.05, stagger: 15, reach: 1.15, radius: 0.95, maxVictims: 3, cancel: 0.12, lunge: 1.4, shake: 0.16 },
  h3: { id: 'h3', clip: 'atk3', startup: 0.26, active: 0.12, recovery: 0.34, energy: 0, dmgMul: 1.5, stagger: 28, reach: 1.3, radius: 1.1, maxVictims: 4, cancel: 0.1, lunge: 1.8, shake: 0.3 },
  hammerHeavy: { id: 'hammerHeavy', clip: 'heavy', startup: 0.5, active: 0.16, recovery: 0.4, energy: 22, dmgMul: 1.9, stagger: 50, reach: 1.4, radius: 1.25, maxVictims: 4, cancel: 0.12, lunge: 1.2, breaksPlates: true, shake: 0.45 },
};

export const COMBO: Record<string, string[]> = {
  none: ['claw', 'claw', 'claw'],
  rivet: ['r1', 'r2', 'r3'],
  hammer: ['h1', 'h2', 'h3'],
};
export const HEAVY: Record<string, string | null> = { none: null, rivet: 'heavy', hammer: 'hammerHeavy' };

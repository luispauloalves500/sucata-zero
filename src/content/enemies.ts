// Bestiário do Mundo 1 (GDD §9.2) + chefe B01 (§10.1). Valores iniciais de balanceamento.
export type EnemyAttackKind = 'melee' | 'leap' | 'charge' | 'spin' | 'beam';
export interface EnemyAttack {
  id: string;
  kind: EnemyAttackKind;
  windupClip: string;
  attackClip: string;
  windup: number; // telegráfico (s)
  active: number;
  recovery: number;
  recoverClip?: string;
  damage: number; // multiplicador sobre attack
  range: number; // distância para iniciar
  reach: number; // alcance da hitbox
  radius: number;
  speed?: number; // para investidas/saltos
  stagger: number;
  telegraph: 'amber' | 'red' | 'yellow';
  blockable: boolean;
  /** dano elemental */
  type: 'kinetic' | 'electric';
  cooldown: number;
}
export interface EnemyDef {
  id: string;
  name: string;
  model: string;
  hp: number;
  attack: number;
  defense: number;
  stability: number;
  radius: number;
  height: number;
  walkSpeed: number;
  runSpeed: number;
  perception: { range: number; fov: number };
  preferredRange: number;
  flying?: boolean;
  attacks: EnemyAttack[];
  xp: number;
  loot: { scrap: [number, number]; alloy?: number; cells?: number };
  weakBack?: boolean;
  steals?: boolean;
  role: string;
}

export const ENEMIES: Record<string, EnemyDef> = {
  E01: {
    id: 'E01', name: 'Catador Rastejante', model: 'e01', hp: 34, attack: 8, defense: 0, stability: 14, radius: 0.45, height: 0.6, walkSpeed: 2.2, runSpeed: 5.4,
    perception: { range: 13, fov: 120 }, preferredRange: 3.2, xp: 14, loot: { scrap: [6, 12] }, role: 'rápido, salta de perto',
    attacks: [{ id: 'leap', kind: 'leap', windupClip: 'windup', attackClip: 'attack', windup: 0.5, active: 0.35, recovery: 0.6, damage: 1, range: 4.2, reach: 0.6, radius: 0.7, speed: 9, stagger: 8, telegraph: 'amber', blockable: true, type: 'kinetic', cooldown: 1.6 }],
  },
  E02: {
    id: 'E02', name: 'Patrulheiro de Trilho', model: 'e02', hp: 65, attack: 10, defense: 5, stability: 30, radius: 0.45, height: 1.9, walkSpeed: 1.6, runSpeed: 3.8,
    perception: { range: 15, fov: 100 }, preferredRange: 1.8, xp: 30, loot: { scrap: [14, 22], alloy: 0.25 }, role: 'guarda trajetória, alerta outros',
    attacks: [
      { id: 'baton', kind: 'melee', windupClip: 'windup', attackClip: 'attack', windup: 0.6, active: 0.14, recovery: 0.6, recoverClip: 'recover', damage: 1.4, range: 2.0, reach: 1.4, radius: 0.8, stagger: 16, telegraph: 'amber', blockable: true, type: 'electric', cooldown: 1.2 },
      { id: 'charge', kind: 'charge', windupClip: 'charge_windup', attackClip: 'charge', windup: 0.7, active: 0.55, recovery: 0.7, recoverClip: 'recover', damage: 1.1, range: 6.5, reach: 0.9, radius: 0.8, speed: 8, stagger: 20, telegraph: 'red', blockable: true, type: 'kinetic', cooldown: 4 },
    ],
  },
  E03: {
    id: 'E03', name: 'Carregador Pesado', model: 'e03', hp: 120, attack: 14, defense: 20, stability: 60, radius: 0.95, height: 1.9, walkSpeed: 1.4, runSpeed: 2.6,
    perception: { range: 14, fov: 90 }, preferredRange: 2.2, xp: 55, loot: { scrap: [30, 45], alloy: 1 }, weakBack: true, role: 'empurra, flanco exposto',
    attacks: [
      { id: 'ram', kind: 'charge', windupClip: 'windup', attackClip: 'attack', windup: 0.9, active: 0.9, recovery: 1.6, recoverClip: 'recover', damage: 1.6, range: 9, reach: 1.2, radius: 1.2, speed: 9.5, stagger: 40, telegraph: 'red', blockable: false, type: 'kinetic', cooldown: 3.5 },
      { id: 'shove', kind: 'melee', windupClip: 'push', attackClip: 'push', windup: 0.35, active: 0.12, recovery: 0.3, damage: 1.0, range: 2.4, reach: 1.6, radius: 1.2, stagger: 25, telegraph: 'amber', blockable: true, type: 'kinetic', cooldown: 1.5 },
    ],
  },
  E04: {
    id: 'E04', name: 'Triturador Circular', model: 'e04', hp: 70, attack: 9, defense: 8, stability: 26, radius: 0.55, height: 1.3, walkSpeed: 1.8, runSpeed: 3.2,
    perception: { range: 12, fov: 110 }, preferredRange: 2.0, xp: 38, loot: { scrap: [18, 28], alloy: 0.4 }, role: 'giro com recuo longo',
    attacks: [{ id: 'spin', kind: 'spin', windupClip: 'windup', attackClip: 'attack', windup: 0.8, active: 1.5, recovery: 2.0, recoverClip: 'recover', damage: 0.55, range: 2.6, reach: 0, radius: 1.5, speed: 2.4, stagger: 6, telegraph: 'red', blockable: true, type: 'kinetic', cooldown: 2.5 }],
  },
  E05: {
    id: 'E05', name: 'Drone de Coleta', model: 'e05', hp: 40, attack: 7, defense: 2, stability: 18, radius: 0.5, height: 2.4, walkSpeed: 2.6, runSpeed: 4.2, flying: true,
    perception: { range: 16, fov: 360 }, preferredRange: 5, xp: 22, loot: { scrap: [8, 14], cells: 1 }, steals: true, role: 'voa, rouba sucata',
    attacks: [{ id: 'beam', kind: 'beam', windupClip: 'windup', attackClip: 'attack', windup: 0.9, active: 0.5, recovery: 0.8, damage: 1.1, range: 7, reach: 0, radius: 1.3, stagger: 10, telegraph: 'yellow', blockable: true, type: 'electric', cooldown: 2.4 }],
  },
};

export const BOSS_B01 = {
  id: 'B01', name: 'O COMPACTADOR', hp: 1400, attack: 16, defense: 12, stability: 220,
  phases: [
    { id: 1, name: 'Inspeção', from: 1.0, to: 0.7 },
    { id: 2, name: 'Sobrecarga', from: 0.7, to: 0.35 },
    { id: 3, name: 'Ruptura', from: 0.35, to: 0 },
  ],
  xp: 400,
};

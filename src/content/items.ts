// Catálogo de peças implementadas no Episódio 1 (Ferro-Velho 09). IDs seguem o GDD §6.3.
export type Slot = 'head' | 'armL' | 'armR' | 'legs' | 'body' | 'core';
export const SLOTS: Slot[] = ['head', 'armL', 'armR', 'legs', 'body', 'core'];
export const SLOT_LABEL: Record<Slot, string> = { head: 'Cabeça', armL: 'Braço E', armR: 'Braço D', legs: 'Locomoção', body: 'Carcaça', core: 'Núcleo' };

export type Ability = 'winch' | 'heavyImpact' | 'aimAssist' | 'revealCaches' | 'scrapSense' | 'highJump' | 'strongBlock' | 'energyRegen';

export interface ItemDef {
  id: string;
  name: string;
  slot: Slot;
  tier: number;
  weight: number;
  essential: boolean;
  desc: string;
  stats: { attack?: number; defense?: number; hp?: number; en?: number; stagger?: number; crit?: number; jump?: number; speed?: number; enRegen?: number; dodgeCost?: number; blockReduce?: number };
  abilities: Ability[];
  /** conjunto de golpes do braço direito */
  moveset?: 'rivet' | 'hammer';
  craft?: { scrap: number; alloy?: number; cells?: number };
  origin: string;
}

export const ITEMS: Record<string, ItemDef> = {
  P01: { id: 'P01', name: 'Visor de Lata', slot: 'head', tier: 1, weight: 5, essential: false, desc: 'Visor improvisado. Revela contêineres próximos.', stats: { defense: 1 }, abilities: ['revealCaches'], origin: 'inicial' },
  P02: { id: 'P02', name: 'Sensor MIRA', slot: 'head', tier: 1, weight: 7, essential: false, desc: 'Lente de mira do Patrulheiro. Assistência de alvo +8%, chance crítica +4% e marca pontos fracos.', stats: { crit: 0.04, defense: 2 }, abilities: ['aimAssist', 'revealCaches'], origin: 'Patrulheiro de Trilho (garantido)' },
  P03: { id: 'P03', name: 'Olho de Sucata', slot: 'head', tier: 1, weight: 6, essential: false, desc: 'Lentes desencontradas que detectam sucata escondida e caches.', stats: { defense: 1 }, abilities: ['scrapSense', 'revealCaches'], origin: 'segredo: passagem sob contêiner' },
  P06: { id: 'P06', name: 'Garra de Oficina', slot: 'armL', tier: 1, weight: 8, essential: false, desc: 'Garra de manutenção. Abre recipientes e dá um golpe fraco de varredura.', stats: { attack: 4, blockReduce: 0.45 }, abilities: [], origin: 'inicial' },
  P07: { id: 'P07', name: 'Braço TENSOR', slot: 'armL', tier: 1, weight: 14, essential: true, desc: 'Guincho de cabo. [R] puxa âncoras de dobradiça laranja e arrasta inimigos leves.', stats: { attack: 6, blockReduce: 0.5 }, abilities: ['winch'], origin: 'O COMPACTADOR (garantido)' },
  P08: { id: 'P08', name: 'Escudo de Porta', slot: 'armL', tier: 1, weight: 16, essential: false, desc: 'Porta de vagão adaptada. Bloqueio forte (reduz 80% do dano físico).', stats: { defense: 4, blockReduce: 0.8 }, abilities: ['strongBlock'], craft: { scrap: 180, alloy: 2 }, origin: 'fabricação' },
  P11: { id: 'P11', name: 'Punho Rebitador', slot: 'armR', tier: 1, weight: 12, essential: false, desc: 'Punho pneumático. Combo de 3 golpes e golpe pesado que rompe chapas rachadas.', stats: { attack: 12, stagger: 10 }, abilities: ['heavyImpact'], moveset: 'rivet', origin: 'Patrulheiro de Trilho (garantido)' },
  P12: { id: 'P12', name: 'Martelo de Prensa', slot: 'armR', tier: 1, weight: 24, essential: false, desc: 'Muito dano e quebra estabilidade, mas deixa a esquiva mais cara.', stats: { attack: 22, stagger: 22, dodgeCost: 4 }, abilities: ['heavyImpact'], moveset: 'hammer', craft: { scrap: 250, alloy: 3 }, origin: 'fabricação (esquema do guindaste)' },
  P17: { id: 'P17', name: 'Pés de Manutenção', slot: 'legs', tier: 1, weight: 8, essential: true, desc: 'Locomoção padrão. Corrida normal.', stats: {}, abilities: [], origin: 'inicial' },
  P18: { id: 'P18', name: 'Pernas Saltadoras', slot: 'legs', tier: 1, weight: 11, essential: false, desc: 'Molas de suspensão. Salto 35% mais alto e corrida +5%.', stats: { jump: 0.35, speed: 0.05 }, abilities: ['highJump'], origin: 'Linha de Triagem (cache de condutor)' },
  P23: { id: 'P23', name: 'Carcaça de Zinco', slot: 'body', tier: 1, weight: 12, essential: true, desc: 'Carcaça leve. Integridade +15.', stats: { hp: 15, defense: 3 }, abilities: [], origin: 'inicial' },
  P24: { id: 'P24', name: 'Blindagem de Trilho', slot: 'body', tier: 1, weight: 26, essential: false, desc: 'Trilhos rebitados. Defesa +20, mais peso.', stats: { hp: 10, defense: 20 }, abilities: [], craft: { scrap: 220, alloy: 2 }, origin: 'fabricação / segredo' },
  P27: { id: 'P27', name: 'Núcleo Faísca', slot: 'core', tier: 1, weight: 6, essential: true, desc: 'Regeneração de energia +15%.', stats: { enRegen: 0.15, en: 0 }, abilities: ['energyRegen'], origin: 'inicial' },
};

export const BASE_CAPACITY = 100;
export const MAX_UPGRADE = 4;
/** custos de melhoria (+1..+4) — GDD §7.3 */
export const UPGRADE_COST = [
  { scrap: 200, alloy: 2, ancient: 0 },
  { scrap: 400, alloy: 4, ancient: 0 },
  { scrap: 650, alloy: 0, ancient: 1 },
  { scrap: 1000, alloy: 0, ancient: 2 },
];
/** bônus por nível de melhoria (multiplicador sobre ataque/defesa/hp da peça) */
export const UPGRADE_BONUS = 0.12;

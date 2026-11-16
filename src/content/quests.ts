// Missões do Mundo 1 (GDD §8.2, §11) — dados declarativos versionados.
export type StageType = 'reach' | 'interact' | 'defeat' | 'collect' | 'equip' | 'boss' | 'plate' | 'count';
export interface StageDef { id: string; type: StageType; target: string; count?: number; ids?: string[]; text: string; waypoint?: string }
export interface Reward { scrap?: number; alloy?: number; cells?: number; xp?: number; capacity?: number; blueprint?: string; circuit?: number }
export interface QuestDef { id: string; title: string; kind: 'main' | 'side'; requires: string[]; stages: StageDef[]; rewards: Reward; unlocks: string[]; summary: string }

export const QUESTS: QuestDef[] = [
  {
    id: '1-1', title: 'Despertar sob o Ferro', kind: 'main', requires: [], summary: 'Sair da câmara de triagem e aprender a se mover.',
    stages: [
      { id: 'climb', type: 'reach', target: 'r_ledge', text: 'Suba pelas caixas até a passarela', waypoint: 'r_ledge' },
      { id: 'open', type: 'interact', target: 'crate_start', text: 'Abra o contêiner com a Garra de Oficina', waypoint: 'crate_start' },
      { id: 'exit', type: 'reach', target: 'r_exit11', text: 'Saia da câmara pelo portão norte', waypoint: 'r_exit11' },
    ],
    rewards: { scrap: 30, xp: 40 }, unlocks: ['1-2'],
  },
  {
    id: '1-2', title: 'O Primeiro Braço', kind: 'main', requires: ['1-1'], summary: 'Derrotar o Patrulheiro de Trilho e montar a peça dele.',
    stages: [
      { id: 'find', type: 'reach', target: 'r_yard', text: 'Encontre o pátio dos trilhos', waypoint: 'r_yard' },
      { id: 'fight', type: 'defeat', target: 'e02_quest', text: 'Derrote o Patrulheiro de Trilho', waypoint: 'e02_quest' },
      { id: 'loot', type: 'collect', target: 'P11', text: 'Recolha o Punho Rebitador', waypoint: 'drop' },
      { id: 'bench', type: 'interact', target: 'term_field', text: 'Use a bancada de campo', waypoint: 'term_field' },
      { id: 'equip', type: 'equip', target: 'P11', text: 'Equipe o Punho Rebitador no Braço D', waypoint: 'term_field' },
      { id: 'break', type: 'plate', target: 'plate_12', text: 'Rompa a chapa rachada com o golpe pesado', waypoint: 'plate_12' },
    ],
    rewards: { scrap: 120, xp: 80 }, unlocks: ['1-3'],
  },
  {
    id: '1-3', title: 'Linha de Triagem', kind: 'main', requires: ['1-2'], summary: 'Ligar três condutores para religar o elevador de carga.',
    stages: [
      { id: 'conductors', type: 'count', target: 'conductors', ids: ['cond_a', 'cond_b', 'cond_c'], count: 3, text: 'Ligue os condutores', waypoint: 'cond' },
      { id: 'lift', type: 'interact', target: 'lift_13', text: 'Acione o elevador de carga', waypoint: 'lift_13' },
      { id: 'through', type: 'reach', target: 'r_14', text: 'Atravesse para o galpão da oficina', waypoint: 'r_14' },
    ],
    rewards: { scrap: 150, alloy: 2, xp: 120 }, unlocks: ['1-4'],
  },
  {
    id: '1-4', title: 'Oficina Perdida', kind: 'main', requires: ['1-3'], summary: 'Resgatar FERRO-7 e reativar a oficina.',
    stages: [
      { id: 'arena', type: 'reach', target: 'arena14_clear', text: 'Sobreviva à emboscada no galpão', waypoint: 'arena14' },
      { id: 'cage', type: 'interact', target: 'cage_ferro7', text: 'Liberte FERRO-7', waypoint: 'cage_ferro7' },
      { id: 'hub', type: 'interact', target: 'bench_hub', text: 'Ative a bancada da oficina', waypoint: 'bench_hub' },
    ],
    rewards: { scrap: 200, alloy: 3, xp: 150 }, unlocks: ['1-5', 'S01', 'S02'],
  },
  {
    id: '1-5', title: 'Coração da Prensa', kind: 'main', requires: ['1-4'], summary: 'Derrotar O COMPACTADOR e abrir a passagem para a Cidade Morta.',
    stages: [
      { id: 'enter', type: 'reach', target: 'r_arena15', text: 'Entre no depósito da prensa', waypoint: 'r_arena15' },
      { id: 'boss', type: 'boss', target: 'B01', text: 'Derrote O COMPACTADOR', waypoint: 'boss' },
      { id: 'loot', type: 'collect', target: 'P07', text: 'Recolha o Braço TENSOR', waypoint: 'drop' },
      { id: 'equip', type: 'equip', target: 'P07', text: 'Equipe o Braço TENSOR na estação de troca', waypoint: 'term_arena' },
      { id: 'gate', type: 'interact', target: 'anchor_gate', text: 'Use o guincho [R] na âncora do portão', waypoint: 'anchor_gate' },
    ],
    rewards: { xp: 300, circuit: 1, alloy: 3 }, unlocks: [],
  },
  {
    id: 'S01', title: 'Ferramentas do FERRO-7', kind: 'side', requires: ['1-4'], summary: 'Recuperar três ferramentas perdidas pelo ferro-velho.',
    stages: [{ id: 'tools', type: 'count', target: 'tools', ids: ['tool_1', 'tool_2', 'tool_3'], count: 3, text: 'Recupere as ferramentas', waypoint: 'tool' }],
    rewards: { capacity: 10, scrap: 100 }, unlocks: [],
  },
  {
    id: 'S02', title: 'O Guindaste Abandonado', kind: 'side', requires: ['1-4'], summary: 'Reativar o guindaste da Linha de Triagem.',
    stages: [{ id: 'crane', type: 'interact', target: 'crane_lever', text: 'Acione a cabine do guindaste', waypoint: 'crane_lever' }],
    rewards: { blueprint: 'P12', alloy: 2 }, unlocks: [],
  },
];
export const QUEST_BY_ID = Object.fromEntries(QUESTS.map((q) => [q.id, q]));

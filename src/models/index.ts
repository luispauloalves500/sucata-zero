import { buildZ01 } from './z01';
import { buildParts } from './parts';
import { MODEL_BUILDERS } from './enemies';
import type { ModelAsset } from './kit';

/** Todos os GLBs do jogo: id -> construtor procedural (fonte dos arquivos em public/assets). */
export const ALL_MODELS: Record<string, { path: string; build: () => ModelAsset }> = {
  z01: { path: 'assets/robots/z01/z01.glb', build: buildZ01 },
  parts: { path: 'assets/modules/parts-w01.glb', build: () => ({ scene: buildParts(), clips: [] }) },
  e01: { path: 'assets/robots/enemies/e01-catador.glb', build: MODEL_BUILDERS.e01 },
  e02: { path: 'assets/robots/enemies/e02-patrulheiro.glb', build: MODEL_BUILDERS.e02 },
  e03: { path: 'assets/robots/enemies/e03-carregador.glb', build: MODEL_BUILDERS.e03 },
  e04: { path: 'assets/robots/enemies/e04-triturador.glb', build: MODEL_BUILDERS.e04 },
  e05: { path: 'assets/robots/enemies/e05-drone.glb', build: MODEL_BUILDERS.e05 },
  b01: { path: 'assets/robots/bosses/b01-compactador.glb', build: MODEL_BUILDERS.b01 },
  ferro7: { path: 'assets/robots/npc/ferro7.glb', build: MODEL_BUILDERS.ferro7 },
  pixel: { path: 'assets/robots/npc/pixel.glb', build: MODEL_BUILDERS.pixel },
};

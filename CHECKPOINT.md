# SUCATA ZERO — CHECKPOINT DE DESENVOLVIMENTO

> **Data inicial:** 16/11/2026 · **Última atualização:** 24/11/2026
> **Estado:** EPISÓDIO 1 (FERRO-VELHO 09) IMPLEMENTADO, REVISADO (QA-002), TESTADO EM CHROMIUM HEADLESS E PUBLICADO
> **Documento principal:** `docs/GDD.md` (GDD v1.0) · análise: `ANALISE.md` · revisão do Ep. 1: `docs/ANALISE-FASE1.md`
> **Repositório GitHub:** https://github.com/luispauloalves500/sucata-zero
> **Publicação:** https://luispauloalves500.github.io/sucata-zero/ (GitHub Actions → Pages)

## 1. Marco atual

**M0 + M1 + Episódio 1 completo** (região Ferro-Velho 09, missões 1-1 a 1-5, secundárias S01/S02, chefe O COMPACTADOR, Braço TENSOR com guincho).
Próximo marco: **Episódio 2 — Cidade Morta** (mundo 2 do GDD).

### Status geral

| Área | Estado | Evidência |
|---|---|---|
| GDD de campanha | ✅ especificado | `docs/GDD.md` |
| Repositório criado | ✅ | github.com/luispauloalves500/sucata-zero |
| Motor Three.js + Vite + TS | ✅ | `npm run build` sem erros (tsc strict) |
| Movimento + física (Rapier KCC) | ✅ | e2e: andar, pular, chão, teleportes sem atravessar |
| Câmera 3ª pessoa (oclusão, trava de alvo, ombro) | ✅ | e2e + screenshots |
| Modelo Z-01 + 13 peças + 5 inimigos + chefe + NPCs (GLB originais) | ✅ | `npm run models`, `npm run validate` (10 modelos) |
| IA e combate (combo, pesado, bloqueio/aparar, esquiva, estabilidade) | ✅ | e2e: dano real com golpes, chapa rompida com golpe pesado |
| Montagem de peças (corpo muda) | ✅ | e2e: clique real na UI equipa P11; braço visível |
| Oficina (equipar, fabricar, melhorar, desmontar) | ✅ | unit + e2e (fabricar Escudo de Porta) |
| Missões 1-1…1-5 + chefe | ✅ | e2e completo até a tela final |
| Secundárias S01/S02 | ✅ | e2e (3 ferramentas, guindaste, projeto P12, marcador secundário) + unit |
| Salvamento (IndexedDB, checksum, backup, migração, import/export) | ✅ | unit + e2e (recarregar página restaura estado) |
| HUD PC/celular + controles de toque | ✅ | e2e mobile 844×390: joystick, pulo, interação |
| Áudio (música generativa + SFX sintetizados) | ⚠ implementado, não ouvido em dispositivo real | — |
| Desempenho 60 FPS em hardware real | ⚠ não medido (headless usa SwiftShader/CPU) | e2e: ~470 draw calls / ~136k triângulos no fim (inclui sombra e bloom); celular usa perfil baixo sem pós |
| Ambientação / pós-processamento | ✅ | QA-002: env map, bloom+gradação, decalques, detritos, galpão com telhado, arena da Prensa — `/workspace/sucata-shots/v2/comparacao-antes-depois.jpg` |
| Publicação | ✅ | URL pública HTTP 200, carrega sem erros |

## 2. Próxima tarefa: EP2.1 — Cidade Morta

1. Testar em celular real e PC com GPU; registrar FPS e ajustar perfis de qualidade.
2. Árvore de circuitos (pontos já são acumulados no save).
3. Mundo 2: novo bioma, inimigos E06–E10, chefe 2, peças P13+.
4. Predefinições de montagem (presets) e mais slots de habilidade.

## 3. Histórico de ciclos

### 2026-11-24 — QA-002: análise crítica e polimento do Episódio 1
- Objetivo: analisar a fase 1 a fundo (bugs, navegação, visual, combate, HUD, celular, S01/S02) e corrigir/melhorar por prioridade.
- Base/repositório/commit: `main` a partir de `0ce1683`.
- Código e assets inspecionados: `src/world/*`, `src/app/game.ts`, `src/engine/*`, `src/ui/hud.ts`, `src/fx/particles.ts`, `src/models/*`, capturas `antes-*`.
- Problema e causa: ver `docs/ANALISE-FASE1.md` (câmera atravessando o Z-01; tarefas secundárias sem marcador — waypoint `tool` inexistente; chão único repetido; sem env map/pós; galpão sem telhado; arena lisa; HUD do celular sobreposto; guindaste não restaurado no load; S01/S02 fora do e2e).
- Arquivos alterados: `src/world/dressing.ts` (novo), `src/engine/env.ts` (novo), `src/fx/beacon.ts` (novo), `src/engine/renderer.ts`, `src/engine/camera.ts`, `src/world/level-w01.ts`, `src/world/textures.ts`, `src/world/builder.ts`, `src/fx/particles.ts`, `src/app/game.ts`, `src/ui/hud.ts`, `src/style.css`, `tests/browser/e2e.mjs`, `tests/browser/tour.mjs`, `tests/unit/core.test.ts`, `docs/ANALISE-FASE1.md`.
- Mudanças implementadas: ver tabela de status em `docs/ANALISE-FASE1.md` §4.
- Testes executados e resultados: `npm test` 22/22 ✔; `npm run validate` ✔; `npm run build` ✔; e2e Chromium headless desktop 1280×720 + celular 844×390: todas as verificações ✔ (inclui S01/S02, sem erros de console).
- Testes visuais / dispositivos: tour fixo antes/depois (`/workspace/sucata-shots/v2/antes-*`, `depois-*`, `comparacao-antes-depois.jpg`, `depois-mobile-*`). Dispositivos reais: **não testado**.
- Métricas reais: e2e ~470 draw calls/~136k triângulos (perfil médio, com sombra+bloom); FPS real **não medido**.
- Regressões: nenhuma conhecida.
- Deploy: sim — GitHub Pages via Actions (ver commit no histórico do git).
- Pendências: medir FPS em GPU real/celular; retrabalho de malhas/animações; reduzir bundle (Rapier); áudio em dispositivo.
- Próxima tarefa: EP2.1.

### 2026-11-16 — EP1-001: Episódio 1 jogável e publicado
- Objetivo: construir e publicar o primeiro episódio completo do GDD com o loop central funcionando.
- Base/repositório/commit: repositório novo `luispauloalves500/sucata-zero`, branch `main`.
- Código e assets inspecionados: GDD v1.0 e checkpoint DOC-001.
- Problema e causa: n/a (ciclo de criação).
- Arquivos alterados: projeto inteiro (`src/`, `tools/`, `public/assets/`, `tests/`, documentação, workflow do Pages).
- Mudanças implementadas: motor (render ACES, perfis de qualidade, escala dinâmica, contexto perdido), física Rapier, câmera, input teclado/mouse/gamepad/toque, modelos GLB por script com animações, IA com FSM + A* e limite de atacantes, combate, 13 peças em 6 slots, oficina, 7 missões, chefe em 3 fases, PÍXEL e FERRO-7, memórias, áudio generativo, saves robustos, menus/opções, tela de erro técnico copiável.
- Testes executados e resultados: `npm test` 20/20 ✔ (dano, inventário, oficina, missões, nível, saves, A*); `npm run validate` ✔; `npm run build` ✔; e2e Chromium headless desktop 1280×720 + mobile 844×390: todas as verificações ✔ (Episódio 1 do início à tela final, morte/renascimento, save/load, sem erros de console).
- Testes visuais / dispositivos: screenshots automáticos (título, combate, oficina antes/depois, chapa, triagem, emboscada, fabricação, chefe, guincho, final). Dispositivos reais: **não testado**.
- Métricas reais: carregamento até o título ~1–2 s local; GLBs 2,4 MB no total; cena ~210 draw calls / ~38k triângulos (perfil médio). FPS em hardware real: **não medido**.
- Regressões: nenhuma conhecida.
- Deploy: sim — GitHub Pages via Actions; URL acima.
- Pendências: teste em celular real, áudio em dispositivo, S01/S02 sem e2e, mundos 2–5.
- Próxima tarefa: EP2.1.

### 2026-11-16 — DOC-001: especificação inicial
- GDD v1.0 e checkpoint criados; nenhum código.

## 4. Modelo para atualização do checkpoint

```markdown
### AAAA-MM-DD — [ID e título]
- Objetivo:
- Base/repositório/commit:
- Código e assets inspecionados:
- Problema e causa:
- Arquivos alterados:
- Mudanças implementadas:
- Testes executados e resultados:
- Testes visuais / dispositivos:
- Métricas reais:
- Regressões:
- Deploy (sim/não; URL e commit, se aplicável):
- Pendências:
- Próxima tarefa:
```

## 5. Política para marcar conclusão

Não marcar como concluído por ter escrito código, gerado imagem, compilado parcialmente ou enviado arquivo não testado. Toda conclusão precisa de evidência correspondente; se ainda não houver ambiente ou acesso para testar, indicar explicitamente `não testado` e pendência.

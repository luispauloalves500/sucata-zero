# SUCATA ZERO — CHECKPOINT DE DESENVOLVIMENTO

> **Data inicial:** 16/11/2026 · **Última atualização:** 16/11/2026
> **Estado:** EPISÓDIO 1 (FERRO-VELHO 09) IMPLEMENTADO, TESTADO EM CHROMIUM HEADLESS E PUBLICADO
> **Documento principal:** `docs/GDD.md` (GDD v1.0) · análise: `ANALISE.md`
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
| Secundárias S01/S02 | ⚠ implementadas, não cobertas pelo e2e | — |
| Salvamento (IndexedDB, checksum, backup, migração, import/export) | ✅ | unit + e2e (recarregar página restaura estado) |
| HUD PC/celular + controles de toque | ✅ | e2e mobile 844×390: joystick, pulo, interação |
| Áudio (música generativa + SFX sintetizados) | ⚠ implementado, não ouvido em dispositivo real | — |
| Desempenho 60 FPS em hardware real | ⚠ não medido (headless usa SwiftShader/CPU) | ~210 draw calls, ~38k triângulos na cena |
| Publicação | ✅ | URL pública HTTP 200, carrega sem erros |

## 2. Próxima tarefa: EP2.1 — Cidade Morta

1. Testar em celular real e PC com GPU; registrar FPS e ajustar perfis de qualidade.
2. Árvore de circuitos (pontos já são acumulados no save).
3. Mundo 2: novo bioma, inimigos E06–E10, chefe 2, peças P13+.
4. Predefinições de montagem (presets) e mais slots de habilidade.

## 3. Histórico de ciclos

### 2026-11-16 — EP1-001: Episódio 1 jogável e publicado
- Objetivo: construir e publicar o primeiro episódio completo do GDD com o loop central funcionando.
- Base/repositório/commit: repositório novo `luispauloalves500/sucata-zero`, branch `main`.
- Código e assets inspecionados: GDD v1.0 e checkpoint DOC-001.
- Problema e causa: n/a (ciclo de criação).
- Arquivos alterados: projeto inteiro (`src/`, `tools/`, `public/assets/`, `tests/`, documentação, workflow do Pages).
- Mudanças implementadas: motor (render ACES, perfis de qualidade, escala dinâmica, contexto perdido), física Rapier, câmera, input teclado/mouse/gamepad/toque, modelos GLB por script com animações, IA com FSM + A* e limite de atacantes, combate, 13 peças em 6 slots, oficina, 7 missões, chefe em 3 fases, PÍXEL e FERRO-7, memórias, áudio generativo, saves robustos, menus/opções, tela de erro técnico copiável.
- Testes executados e resultados: `npm test` 20/20 ✔ (dano, inventário, oficina, missões, nível, saves, A*); `npm run validate` ✔; `npm run build` ✔; e2e Chromium headless desktop 1024×576 + mobile 844×390: todas as verificações ✔ (Episódio 1 do início à tela final, morte/renascimento, save/load, sem erros de console).
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

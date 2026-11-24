# Análise crítica — Episódio 1 (Ferro-Velho 09)

> Data: 24/11/2026 · Base analisada: commit `0ce1683` (v1.0.0 publicado) · Método: jogo rodando em Chromium headless
> (SwiftShader), tour fixo de câmera (`tests/browser/tour.mjs` → `/workspace/sucata-shots/v2/antes-*.png`),
> capturas extras (close-up do Z-01, câmera encostada em parede, arena do chefe, celular 844×390), e2e completo
> e leitura do código (`src/world`, `src/app/game.ts`, `src/engine`, `src/ui`, `src/models`).

Legenda de prioridade: **P0** quebra/impede · **P1** prejudica muito a experiência · **P2** qualidade/polimento · **P3** desejável.

## 1. Problemas encontrados (ordenados por prioridade)

| # | Prio | Área | Problema | Evidência |
|---|---|---|---|---|
| 1 | P1 | Câmera | Encostado em parede, a câmera recua até 0,6 m e entra **dentro da cabeça do Z-01** (tela tomada pelo modelo). Não há fade do personagem nem elevação da câmera. | captura `an/a-parede.png`; `CameraRig.update` (mínimo 0,6 m) |
| 2 | P1 | Navegação | **Tarefas secundárias sem marcador**: S01 usa waypoint `tool`, que não existe em `markers`; o HUD só mostra o marcador da missão principal. O jogador não tem como achar as 3 ferramentas nem a cabine do guindaste. | `quests.ts` S01/S02; `updateHud` usa só `mainQuest` |
| 3 | P1 | Cenário | Chão = **um plano único de 600 m com a mesma textura de areia repetida 120×** — repetição visível, sem variação, sem decalques (óleo, poças, trilhas de pneu, marcas). Áreas grandes e vazias (pátio, galpão, triagem). | `antes-02/04/06` |
| 4 | P1 | Iluminação/materiais | Sem *environment map*: metais (`metalness` 0,7–0,85) ficam escuros e "chapados"; o chefe vira um bloco escuro. Sem pós-processamento (bloom/vinheta/gradação). Luzes de lâmpada não iluminam nada (sem poça de luz). | `antes-08`, `12-chefe-ataque` |
| 5 | P1 | Galpão da Oficina | O "galpão" é **só um pórtico de vigas sem telhado nem paredes**; parece um pátio vazio. Faltam bancadas, prateleiras, cabos, luz de claraboia. | `antes-06-galpao.png` |
| 6 | P1 | Arena do chefe | Arena = disco de concreto liso + anel de contêineres + 3 colunas. Nada conta a história da "Prensa Central": sem máquina ao fundo, sem holofotes, sem marcas de esmagamento, sem faíscas/vapor. | `antes-07/08` |
| 7 | P2 | Celular | Legenda do PÍXEL fica no **meio-alto da tela** e cobre a ação; o marcador de objetivo preso na borda **sobrepõe as barras de vida/energia**. | `21-mobile-jogo.png` |
| 8 | P2 | Atmosfera | Sem partículas ambientes (poeira em suspensão, fumaça ao longe, faíscas de cabos), céu é um gradiente simples; névoa uniforme. | todas as capturas |
| 9 | P2 | Materiais | Texturas de contêiner/chapa sem relevo (sem bump/normal); paredes de contêiner lisas e repetitivas. | `antes-02`, `an/a-parede` |
| 10 | P2 | Bug (save) | Após concluir S02 e recarregar, o contêiner do guindaste **volta para o alto** (estado visual não restaurado em `applyWorldFlags`). | `game.ts` `applyWorldFlags` |
| 11 | P2 | Testes | S01 e S02 **não eram cobertos pelo e2e** (pendência do checkpoint). | `CHECKPOINT.md` |
| 12 | P2 | Clareza | Objetos de missão (condutores, painel, âncora) só se destacam pelo marcador do HUD; à distância, nada no mundo indica "vá ali". | jogo |
| 13 | P2 | Desempenho | Bundle JS de 5,2 MB (1,9 MB gzip) — o wasm do Rapier vai embutido em base64. Carrega, mas atrasa o primeiro quadro no celular. | `npm run build` |
| 14 | P3 | Combate | Feedback já é bom (hitstop 45–90 ms, flash emissivo, números de dano, empurrão, telegráficos no chão). Faltava brilho de impacto (sem bloom as faíscas não "acendem"). | `player.ts`, `enemy.ts` |
| 15 | P3 | Modelos/animações | Modelos procedurais são coerentes e animados (idle/walk/ataques/hit/death); com luz plana parecem de plástico. Retrabalho de malhas/novas animações fica para um ciclo dedicado. | close-up `an/a-z01.png` |
| 16 | P3 | Áudio | Música generativa e SFX existem; **não ouvidos em dispositivo real** (headless). | — |

## 2. O que está funcionando bem (manter)
- Fluxo das missões 1-1 → 1-5 completo, sem softlock no e2e; morte/renascimento, save/load e reset do chefe corretos.
- Chefe com 3 fases legíveis (telegráficos âmbar/vermelho, núcleo exposto), colunas destrutíveis.
- Troca de peças muda o corpo e libera habilidades (golpe pesado rompe chapa; guincho abre a âncora).
- HUD limpo no PC; controles de toque funcionais (joystick, pular, interação contextual).

## 3. Plano de correção (ordem de execução)
1. Câmera sem atravessar o personagem (eleva + esconde o modelo quando muito perto).
2. Marcadores para tarefas secundárias (diamante ciano) + feixes de luz no mundo sobre o objetivo.
3. Iluminação: environment map procedural, bloom + gradação + vinheta (perfis médio/alto), névoa ajustada.
4. Chão com variação em escala grande (macro-ruído em shader) + relevo; decalques (óleo, poças, trilhas, marcas, ferrugem).
5. Dispersão instanciada de detritos e mato seco; poças de luz e cones de luz sob as lâmpadas.
6. Galpão com telhado, claraboias e raios de luz, bancadas e prateleiras.
7. Arena do chefe: Prensa Central ao fundo (pistões animados + vapor), holofotes, giroflex que fica vermelho na luta, piso em placas com marcas, brasas.
8. Partículas ambientes (poeira, fumaça distante, faíscas de cabos).
9. Celular: legenda embaixo, marcador sem cobrir o HUD.
10. Bug do guindaste no load; S01/S02 no e2e.

## 4. Resultado
Ver seção "Status após o ciclo QA-002" no fim deste documento (preenchida ao final do ciclo).

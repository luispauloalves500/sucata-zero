# SUCATA ZERO: A Última Máquina — Análise antes do desenvolvimento

> Data: 16/11/2026 · Fontes lidas por completo: GDD v1.0 (1.514 linhas, seções 0–31) e CHECKPOINT.md (M0/M1).
> Autorização do usuário: desenvolver localmente com git/gh e publicar no repositório novo `sucata-zero` (GitHub Pages).

## 1. O que o jogo é

Ação/aventura 3D em terceira pessoa para navegador (desktop e celular em paisagem). Z-01, um pequeno robô de manutenção sem memória, se reconstrói com peças das máquinas que derrota, guiado pelo holograma PÍXEL, contra a IA ORDEM. Cinco regiões, 25 missões, 5 chefes, 30 peças e 3 finais é a visão completa. O próprio GDD recomenda entregar em marcos (M0 → M7) e, se faltar tempo, lançar **o Mundo 1 completo como Episódio 1**, nunca cinco mapas vazios.

### Loop central (prova do jogo, §1.5)
Mover → identificar inimigo → vencê-lo → coletar peça → equipar na oficina → **ver o corpo mudar** → usar a nova habilidade para abrir um caminho.

- 30 s: observar → posicionar → esquivar/atacar → quebrar estabilidade → neutralizar → recolher sucata.
- 5 min: setor → combate/puzzle → sucata → atalho/módulo → terminal.
- 30 min: missão → oficina → fabricar/equipar → nova rota.

### Pilares
1. O robô é o inventário vivo (peças mudam silhueta, ataques e travessia).
2. Explorar para evoluir (gates visuais por habilidade, retorno recompensado).
3. Combate legível (telegráficos, hitbox no trecho ativo do golpe, nada de dano por distância).
4. Mundo com identidade (paleta e ecossistema próprios por região).
5. Tecnologia acessível (estilizado, leve, roda em celular médio).

## 2. Requisitos P0 (primeiro protótipo — §25 e §28)
- Boot + renderer + erro controlado (tela de erro copiável, nada de tela preta).
- Controle 3D + câmera com colisão + física (sem atravessar parede/chão).
- Sistema de assets GLB validado (modelo animado em cena, nunca T-pose).
- FSM do jogador com ataques por hitbox ligada à animação (leve ×3, pesado, esquiva com i-frames, bloqueio/aparar).
- IA do E02 Patrulheiro (patrulha, suspeita, perseguição, telegráfico, ataque, morte) + loot garantido.
- Montagem modular em tempo real (visual + atributos mudam juntos).
- Oficina transacional + save sem duplicação (recompensas idempotentes).
- Controles touch mínimos (jogar o trecho inteiro sem teclado).
- Build no caminho correto do GitHub Pages, sem 404.

## 3. Stack pedida e viabilidade no meu computador (verificado agora)
| Item | Pedido no GDD | Verificação real |
|---|---|---|
| Node/npm | — | Node v24.22.1, npm 11.21.1 ✅ |
| TypeScript + Vite | TS estrito, Vite com `base` | `npm install` funcionou; `vite build --base=./` gerou bundle ✅ (Vite 8.3.8) |
| Three.js | WebGLRenderer, GLTFLoader | three 0.160.1 instalado ✅ (versão fixada) |
| Física | Rapier 3D (pacote compat) | `@dimforge/rapier3d-compat` 0.21.0: WASM inicializa no Node, character controller cinemático com autostep/snap: cápsula pousou no chão (`grounded=true`) ✅ |
| Testes | Vitest + Playwright | vitest e @playwright/test 1.65 instalados; Chrome do sistema (`/usr/bin/google-chrome`) abre com WebGL2 (SwiftShader) ✅ |
| Deploy | GitHub Actions → Pages | `gh` autenticado como luispauloalves500; repo `sucata-zero` ainda não existe ✅ |

Riscos técnicos: o Rapier-compat embute o WASM em base64 (~1,7 MB gzip do bundle total) — aceitável dentro do alvo de download inicial (≤ 8–12 MB). FPS no headless é por software (SwiftShader) e **não representa** desempenho real; FPS real fica como teste do usuário.

## 4. Assets
Não há modelos do usuário. Plano: **modelos originais gerados por script** (TypeScript → `GLTFExporter` em Node → `.glb` em `public/assets/`), carregados no jogo com `GLTFLoader`:
- `z01.glb`: rig de nós rígidos (quadril, tronco, cabeça, ombros, cotovelos, pernas) com sockets `SOCKET_HEAD/ARM_L/ARM_R/LEG/CORE` e **clipes de animação reais** exportados no GLB (idle×2, andar, correr, pular, cair, aterrissar, esquiva, bloqueio, 3 golpes leves, pesado, dano, derrota, interagir, vitória).
- `parts.glb`: uma malha por peça do catálogo usada no Mundo 1 (visor, MIRA, garra, TENSOR, punho rebitador, martelo, pés, pernas saltadoras, carcaças, núcleos).
- Inimigos E01–E05, chefe O COMPACTADOR, FERRO-7 e PÍXEL: GLBs com clipes próprios (idle, patrulha, preparação, ataque, dano, morte).
- Cenário (Ferro-Velho 09): gerado em runtime com geometria instanciada/mesclada e texturas de canvas (ferrugem, chapas, areia), céu e névoa.
- Áudio: sintetizado com Web Audio (SFX e música por estados), 100% original.

Riscos: robôs low-poly sem textura podem parecer simples → compensar com materiais PBR bem escolhidos, emissivos ciano/âmbar, chanfros, iluminação, sombras e animação caprichada. Peças grandes x animação: usar sockets e perfis em vez de esticar ossos. Se um GLB falhar, o jogo mostra erro visível e usa o modelo gerado em runtime (mesmo código) — sem fingir.

## 5. Plano de construção (escopo recomendado: Episódio 1 — Ferro-Velho 09 completo)
**Dentro:**
- M0: boot, loading com progresso real, tela de erro copiável, renderer com perfis Baixo/Médio/Alto/Auto, passo fixo de 60 Hz, pausa por perda de foco, Rapier, câmera com colisão e lock-on, input unificado (teclado/mouse, gamepad, touch).
- M1: missões **1-1 Despertar sob o Ferro** e **1-2 O Primeiro Braço** — Z-01 acorda sem braço direito; o Patrulheiro de Trilho (E02) deixa cair o **Punho Rebitador (P11)** e o **Sensor MIRA (P02)** com 100% de chance; na bancada o braço aparece no corpo, libera combo e golpe pesado, que derruba as **chapas rachadas âmbar** e abre o caminho.
- M2: **1-3 Linha de Triagem** (3 condutores, esteiras e prensas temporizadas), **1-4 Oficina Perdida** (arena, resgate de FERRO-7, oficina-hub com fabricação/melhoria), **1-5 Coração da Prensa** (chefe O COMPACTADOR em 3 fases com colunas destrutíveis) → recompensa **Braço TENSOR (P07)**: o guincho puxa o portão de dobradiças laranja rumo à Cidade Morta (fim do Episódio 1).
- Inimigos E01–E05 com FSM (patrulha, alerta, perseguição, telegráfico, ataque, recuperação, stagger, morte), A* em grade, respawn por setor.
- Sistemas: HP/EN/Calor/Estabilidade, fórmula de dano do GDD, XP/níveis, sucata/liga/células, ~12 peças do Mundo 1, oficina (equipar, comparar, fabricar, melhorar, desmontar), terminais de checkpoint e viagem, morte com perda de 20% da sucata recuperável, 3 dificuldades, saves no IndexedDB (autosave + 3 slots + exportar/importar JSON validado), opções (áudio, gráficos, sensibilidade, inverter eixo, ombro, shake, HUD 75–150%).
- Segredos e registros de memória do Mundo 1; legendas do PÍXEL.

**Fora (próximas versões):** Mundos 2–5, chefes B02–B05, árvore completa de circuitos (21 nós), presets de loadout, finais, dublagem, multiplayer, PWA offline, KTX2.

## 6. Controles celular (paisagem)
Joystick esquerdo dinâmico (zona esquerda), arrasto na metade direita para câmera, botões à direita: Ataque, Pesado, Pular, Esquiva, Escudo, Módulo, Interagir (contextual, só aparece quando há alvo), Alvo (lock-on) e Pausa no topo. Safe areas (`env(safe-area-inset-*)`), multitoque simultâneo, aviso para girar o aparelho em retrato, pixel ratio limitado, qualidade automática. Nada exige teclado.

## 7. Testes
- **Vitest (sem WebGL):** dano (sem negativo/NaN, redução ≤ 70%), XP, inventário/equipar (slots, carga ≤ 100), loot garantido e idempotente, missões (estágios só por evento válido, recompensas sem duplicar ao recarregar), oficina (custos atômicos, cancelar não altera nada), validação/migração de save, validador de conteúdo (IDs, referências), A*.
- **Playwright no Chrome headless:** abre o build, sem erros de console/404, novo jogo, movimento real por teclado, combate, coleta, oficina por cliques, quebra da chapa, missões 1-3/1-4, chefe e portão final; reload preserva progresso; viewport de celular (touch) jogável; capturas em `/workspace/sucata-shots/`.
- **Após publicar:** mesma bateria contra a URL pública do GitHub Pages (HTTP 200, assets sem 404).
- Pendente do usuário: FPS real em PC e celular, som e controle físico.

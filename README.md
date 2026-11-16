# SUCATA ZERO: A Última Máquina

Jogo de ação 3D em terceira pessoa para navegador (PC e celular na horizontal). Você é **Z-01**, um robô de triagem que desperta num ferro-velho automatizado sem o braço direito — e se reconstrói com as peças das máquinas que derrota.

**Jogar:** https://luispauloalves500.github.io/sucata-zero/

> Loop central: **derrote uma máquina → colete a peça → monte na oficina → o corpo muda de verdade → use a nova habilidade para abrir caminho.**

## Episódio 1 — Ferro-Velho 09 (completo)

| Missão | Nome | O que acontece |
|---|---|---|
| 1-1 | Despertar sob o Ferro | Tutorial de movimento, escalada e o primeiro contêiner (com a Garra de Oficina). |
| 1-2 | O Primeiro Braço | Derrote o Patrulheiro de Trilho, colete o **Punho Rebitador**, monte-o na bancada e rompa a chapa rachada com o golpe pesado. |
| 1-3 | Linha de Triagem | Esteiras, prensas sincronizadas e três condutores para liberar o elevador. |
| 1-4 | Oficina Perdida | Emboscada em duas ondas, resgate do mecânico **FERRO-7** e a oficina completa (fabricar, melhorar, desmontar). |
| 1-5 | Coração da Prensa | Chefe **O COMPACTADOR** em 3 fases (colunas, investida, placa que cai). Ele deixa o **Braço TENSOR**, cujo guincho abre o portão da âncora e encerra o episódio. |
| S01/S02 | Secundárias | Ferramentas do FERRO-7 e o Guindaste Abandonado. |

Também tem: 5 tipos de inimigo + chefe, 13 peças em 6 slots (cabeça, braços, pernas, carcaça, núcleo), peso/capacidade, níveis, 5 memórias de história, PÍXEL (drone companheiro), trava de alvo, bloqueio/aparar, esquiva, energia/calor/estabilidade, música generativa e efeitos sonoros sintetizados, 3 dificuldades, salvamento com 3 slots + automático (IndexedDB com checksum, backup e importação/exportação), menus completos e opções (qualidade, áudio, sensibilidade, inverter Y, ombro da câmera, tremor, escala do HUD).

## Controles

**PC (teclado + mouse)** — clique no jogo para capturar o mouse.

| Ação | Tecla |
|---|---|
| Mover | WASD / setas |
| Câmera | Mouse |
| Ataque / combo | Botão esquerdo ou J |
| Golpe pesado | Botão direito ou K |
| Pular | Espaço |
| Esquivar / correr | Shift |
| Bloquear (aparar no tempo certo) | Q |
| Habilidade da peça (guincho) | R |
| Interagir | E |
| Travar alvo | Tab ou botão do meio |
| Trocar ombro da câmera | V |
| Pausa | Esc ou P |

Controle (gamepad) também funciona.

**Celular (horizontal)**: joystick dinâmico no lado esquerdo, arrastar no lado direito gira a câmera; botões ✊ ataque, 💥 pesado, ⤒ pulo, » esquiva, ⛨ bloqueio, ⚙ habilidade, ◎ travar alvo; o botão de interação aparece quando há algo perto; ❚❚ pausa.

## Desenvolvimento

```bash
npm ci
npm run dev        # servidor local
npm run models     # regenera os GLB originais (tools/build-models.ts)
npm run validate   # valida referências do conteúdo
npm test           # testes unitários (Vitest)
npm run build      # tsc + vite build → dist/
npm run preview    # serve dist/ em http://localhost:4173
npm run e2e        # percorre o Episódio 1 inteiro em Chromium headless
```

Stack: TypeScript, Vite, Three.js r160, Rapier 3D (controlador de personagem cinemático). Todos os modelos 3D (Z-01, peças, inimigos, chefe, NPCs) são originais, gerados por script em GLB com animações próprias. Publicação automática no GitHub Pages via GitHub Actions (`.github/workflows/pages.yml`).

Documentos: [`docs/GDD.md`](docs/GDD.md) (design completo), [`ANALISE.md`](ANALISE.md) (análise e escopo), [`CHECKPOINT.md`](CHECKPOINT.md) (estado atual).

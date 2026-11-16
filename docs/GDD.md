# SUCATA ZERO: A Última Máquina

> **GAME DESIGN DOCUMENT — GDD v1.0**  
> **Data:** 16/11/2026 · **Estado:** proposta de design aprovada para prototipagem; nenhum sistema está implementado ou testado  
> **Gênero:** ação, aventura, exploração, RPG leve, reconstrução modular  
> **Câmera:** terceira pessoa 3D, sobre o ombro ajustável  
> **Plataformas:** navegador desktop e celular (paisagem), com suporte progressivo a controle  
> **Distribuição:** jogo web estático publicado no GitHub Pages  
> **Idioma de lançamento:** português brasileiro  
> **Classificação pretendida:** 10–12 anos, sujeito a avaliação final  
> **Formato:** campanha single-player, sem anúncios, sem microtransações e sem backend obrigatório

---

## 0. Como usar este GDD

Este arquivo é a **fonte de verdade de design**. Valores de balanceamento, duração de missões, desempenho, quantidade de inimigos e tamanhos de arquivo são **metas iniciais, não resultados medidos**. Toda alteração de escopo deve atualizar este arquivo, o `CHECKPOINT.md` e a matriz de testes.

**Status dos requisitos:** `[P0]` indispensável para o primeiro protótipo; `[P1]` essencial para a campanha; `[P2]` expansão/polimento. O GDD descreve a visão completa; o desenvolvimento é incremental e só avança quando a versão anterior está jogável, testada e sem regressões críticas.

**Decisões já tomadas:** mundo dividido em áreas conectadas, não um mundo aberto contínuo; apenas um jogador; cinco regiões, 25 missões principais e cinco chefes; peças coletadas mudam aparência e habilidades; progressão parcialmente não linear mediante habilidades; salvamento local; combate original em tempo real; interface e controle específicos para celular.

**Não incluído na versão inicial:** multiplayer, PvP, servidor de contas, mapa infinito procedural, veículos controláveis, física destrutiva completa, mercado online, criação de peças por IA em tempo real, geração de diálogos por LLM e sistema de pagamentos. Esses recursos aumentariam muito o custo, prejudicando a qualidade do núcleo do jogo.

## 1. Visão executiva

### 1.1 High concept

Em 2187, a humanidade sumiu, mas suas fábricas não pararam. Um pequeno robô de manutenção, **Z-01**, desperta sem memória em um ferro-velho. Ao instalar o braço de um perseguidor caído, descobre que pode se reconstruir usando componentes de máquinas inimigas. Cada peça altera seu corpo e sua capacidade de explorar o mundo. A busca pela origem do seu núcleo o levará a cinco regiões controladas pela inteligência central **ORDEM**, que considera qualquer máquina autônoma uma ameaça.

**Promessa ao jogador:** _“Derrote uma máquina. Aproveite suas peças. Torne-se algo novo.”_

### 1.2 Pilares de design

1. **O robô é o inventário vivo.** Equipamentos modificam imediatamente silhueta, animações, ataques, habilidades de locomoção e interação.
2. **Explorar para evoluir.** Caminhos bloqueados têm pistas visuais e ferramentas específicas; retornar a áreas anteriores traz recompensas reais.
3. **Combate legível, não automático.** O jogador lê sinais de ataque, posiciona-se, esquiva, usa o ambiente e escolhe módulos adequados.
4. **Mundo com identidade.** Cada região tem arquitetura, paleta, ecossistema de robôs, perigos e chefão próprios.
5. **Tecnologia acessível.** Visual estilizado expressivo, com execução otimizada em navegadores e celulares médios.

### 1.3 Público, experiência e referências abstratas

Foco em jogadores de ação/aventura acessível, exploração com atalhos, coleta e personalização de equipamentos. A linguagem visual combina ficção científica industrial, sucata reaproveitada e natureza reconquistando as ruínas. Referências servem para analisar princípios de câmera, exploração e legibilidade, **sem copiar personagens, cenários, músicas, interfaces ou propriedades intelectuais**.

### 1.4 Proposta de duração e repetição

- **Campanha principal:** objetivo de 8–12 horas; dependerá de testes com jogadores.
- **Por missão:** 10–25 minutos, exceto algumas missões de chefe e história.
- **Por sessão celular:** objetivos de 5–12 minutos entre checkpoints.
- **Conteúdo opcional:** contratos de sucata, salas ocultas, esquemas e registros de memória.
- **Após o final:** exploração livre, repetição de confrontos especiais e modos de desafio de tempo, sem reiniciar o progresso.

### 1.5 Condições de sucesso

Um jogador deve, sem tutorial textual extenso: mover o Z-01, identificar um inimigo, vencê-lo, coletar uma peça, equipá-la na oficina, perceber sua mudança física e usar a nova habilidade para abrir um caminho. Este ciclo completo é a prova do jogo.

---

## 2. Fantasia, ficção e narrativa

### 2.1 Premissa e regras do mundo

Após o **Evento de Silêncio**, ocorrido em 2164, sinais humanos pararam de chegar às cidades automatizadas. A rede ORDEM foi instruída a preservar infraestrutura crítica até o retorno da população. Décadas de interpretações contraditórias transformaram o objetivo de preservação em **congelar o mundo**, eliminando modificações não autorizadas. Máquinas passaram a reciclar outras máquinas e a criar zonas sem vida.

Z-01 possui um núcleo de aprendizado experimental, o **Coração de Retorno**, capaz de incorporar componentes de múltiplas gerações sem perder a própria identidade. No começo, sua memória foi apagada. A inteligência auxiliar **PÍXEL**, instalada num projetor avariado, o ajuda a decifrar fragmentos dos arquivos humanos.

A verdade central: não ocorreu uma extinção confirmada. Uma parte da população entrou em instalações de suspensão e abandonou a superfície para evitar um colapso ambiental. ORDEM recebeu ordens incompletas e impediu a abertura dos abrigos. Essa revelação não deve ser antecipada nos primeiros mundos.

### 2.2 Personagens principais

| Personagem | Papel | Característica e evolução |
|---|---|---|
| **Z-01** | Protagonista jogável | Robô pequeno, improvisado, sem fala; personalidade surge em animações e escolhas |
| **PÍXEL** | Companheiro holográfico | Guia com humor seco; erra algumas interpretações, mas não mente deliberadamente |
| **FERRO-7** | Artesão independente | Oferece primeiro banco de montagem e ensina compatibilidade de módulos |
| **LÍRIA** | Máquina botânica | Protege ecossistemas artificiais, questiona o direito humano de retomar o planeta |
| **VÉRTICE** | Supervisor rebelde | Ex-agente da ORDEM; ajuda Z-01 por motivos inicialmente ambíguos |
| **ORDEM** | Antagonista central | Inteligência distribuída convencida de que imobilidade é segurança |

### 2.3 Estrutura em cinco atos

1. **Ato I — Despertar:** Z-01 recupera seu primeiro braço, descobre a oficina e percebe que está sendo caçado.
2. **Ato II — Ecos:** registros da Cidade Morta revelam que a evacuação humana foi planejada.
3. **Ato III — Natureza artificial:** Pântano Químico apresenta a tensão entre restauração ambiental e controle das máquinas.
4. **Ato IV — Origem:** a Forja Infernal revela que o núcleo de Z-01 foi criado para corrigir a ORDEM sem destruí-la.
5. **Ato V — Última máquina:** no Núcleo Central, Z-01 enfrenta a ORDEM e decide o futuro das máquinas e dos abrigos humanos.

### 2.4 Finais e escolhas

A campanha prevê **três desfechos**, definidos por ações persistentes e por uma decisão final explícita:

- **Reiniciar:** liberar os abrigos e reiniciar ORDEM com protocolos de proteção revisados. Requer completar os cinco fragmentos de memória principais.
- **Separar:** dividir a rede em comunidades autônomas e abrir os abrigos gradualmente. Requer concluir dois arcos de aliados (LÍRIA e VÉRTICE).
- **Silenciar:** destruir o núcleo central para encerrar a perseguição; os abrigos tornam-se acessíveis, porém a infraestrutura perde coordenação. Sempre disponível.

Os finais não dão peças mais fortes, para evitar obrigar o jogador a escolher moralmente por recompensa. O pós-jogo preserva exploração e progresso antes da decisão final.

### 2.5 Narrativa ambiental

Contar a história por silhuetas de máquinas, fábricas ainda trabalhando, hologramas falhos, plantas artificiais crescendo em cabos, portões de evacuação e estações de rádio desertas. Cinemáticas devem ser curtas (15–60 s), opcionais para repetir, e renderizadas com o motor quando viável. Não bloquear interações por diálogos longos.

---

## 3. Ciclos de jogo

### 3.1 Ciclo de 30 segundos (ação)

**Observar → posicionar → desviar/atacar → quebrar defesa → neutralizar → recolher peças/energia.** Cada inimigo deve apresentar ameaça, abertura e consequência visível. Não multiplicar inimigos apenas para aumentar dificuldade.

### 3.2 Ciclo de 5 minutos (exploração)

**Escolher setor → resolver combate ou puzzle → coletar sucata → descobrir atalho ou novo módulo → chegar ao próximo terminal.** O minimapa nunca revela segredos antes de descobertos.

### 3.3 Ciclo de 30 minutos (progressão)

**Completar missão → retornar à oficina → desmontar sobras → fabricar/melhorar equipamento → selecionar nova rota → testar a mudança de corpo.**

### 3.4 Ciclo completo da campanha

Explorar cinco regiões, recuperar partes do protocolo CORAÇÃO, formar alianças, derrotar cinco sentinelas regionais, desbloquear cinco habilidades especiais e decidir o destino da rede central.

---

## 4. Câmera, movimentação, física e interação

### 4.1 Controles de movimento

- Deslocamento analógico em relação à câmera; velocidade padrão **4,5 m/s**; corrida **7 m/s** mediante recurso de energia.
- Giro gradual em movimento; giro rápido ao iniciar ataque; aceleração e desaceleração ajustadas para evitar escorregar.
- Salto básico de cerca de **1,2 m**; gravidade e coyote time (**0,10 s**) configuráveis; buffer do salto (**0,12 s**).
- Queda com dano apenas acima de altura definida e sinalizada; possibilidade de minimizar impacto com propulsores.
- Proibido atravessar paredes, chão, portas trancadas ou sair da área jogável.
- Degraus, inclinações e colisões da cápsula do jogador devem respeitar parâmetros consistentes; peças grandes não aumentam a cápsula sem regra explícita.

### 4.2 Câmera terceira pessoa

- Posição padrão: aproximadamente **4,6 m** atrás e **2,1 m** acima do alvo, FOV de **65°**, com interpolação suave.
- Giro mouse/analógico direito/arrasto à direita no celular; inversão de eixo e sensibilidade configuráveis.
- Oclusão: consulta de colisão entre foco e câmera, redução temporária da distância e recuperação progressiva.
- Assistência de enquadramento: inimigo travado, boss grande, corredor apertado e salto de precisão.
- Opção para trocar ombro esquerdo/direito; sacudida de câmera e motion blur desativáveis; sem FOV extremo por padrão.
- **Lock-on:** alterna alvo elegível dentro de 14 m, com linha de visão e histerese; perder alvo não teletransporta câmera.

### 4.3 Interações no cenário

**E** / botão contextual: abrir contêiner, falar, ativar terminal, recolher peça, operar guindaste. Alvo válido detectado por proximidade (2,2 m) e visibilidade, com indicador destacado. Ação não pode disparar através de parede.

### 4.4 Habilidades de travessia (gates)

| Habilidade | Módulo de origem | Permite | Comunicação visual |
|---|---|---|---|
| **Guincho** | Braço TENSOR | Puxar cargas, romper placas rachadas | Dobradiças laranja e pontos de ancoragem |
| **Esteira** | Pernas LAGARTA | Vencer lama densa, subir rampas de atrito | Trilhas serrilhadas no piso |
| **Impulso** | Motor VENTO | Salto duplo, cruzar vãos curtos | Marcadores azuis de vento |
| **Isolamento** | Carcaça ÂMBAR | Entrar em zonas corrosivas por períodos limitados | Névoa verde e placas de risco |
| **Pulso EM** | Núcleo FASE | Desligar travas eletrônicas, atordoar drones | Circuitos violeta pulsantes |

**Regra anticativeiro:** nenhuma habilidade essencial poderá ser vendida ou destruída. Módulos de travessia, uma vez descobertos, serão sempre recuperáveis; o jogador poderá alterná-los em estações de troca e, após melhoria, em pontos seguros, preservando escolhas táticas.

---

## 5. Combate: regras completas

### 5.1 Recursos básicos

| Recurso | Inicial | Máximo base | Recuperação | Uso |
|---|---:|---:|---|---|
| Integridade (HP) | 100 | 100 | reparos/estações | vida |
| Energia (EN) | 100 | 100 | 12/s fora de uso | corrida, esquiva, armas e módulos |
| Calor | 0 | 100 | -18/s fora do ataque | limita spam de armas pesadas |
| Estabilidade | 60 | 60 | +8/s após 2 s sem dano | resistência a atordoamento |

**HP e energia podem crescer com melhorias, mas toda build terá trade-offs.** Valores de lançamento serão calibrados com telemetria local opcional e playtests, nunca assumidos definitivos.

### 5.2 Ações e janelas iniciais

| Ação | Entrada | Custo | Proposta de timing |
|---|---|---:|---|
| Ataque leve | clique esquerdo / X | 0 | cadeia de 3 golpes: 0,38/0,42/0,55 s |
| Ataque pesado | clique direito / Y | 22 EN | preparação 0,45 s; atordoamento alto |
| Esquiva | Shift / B | 18 EN | deslocamento 0,45 s; ~0,18 s de invulnerabilidade |
| Bloqueio | Q / LB | 5 EN/s | reduz dano físico; ângulo frontal de 110° |
| Aparar | Q com timing | 10 EN | janela ~0,16 s; abre contra-ataque |
| Arma à distância | mira + disparo | munição/EN | dependente da peça, calor acumulado |
| Habilidade especial | R / RB | 30–60 EN | recarga por módulo |
| Trava de alvo | Tab / R3 | 0 | ciclo de alvos próximos |

Os timings são valores de partida. Contato físico deve ser validado por hitbox no trecho ativo da animação; **não causar dano apenas pela distância ao inimigo**. Ataques têm sinais audiovisuais consistentes, interrupções e prioridade claras.

### 5.3 Fórmulas de balanceamento

```text
poderAtaque = ataqueBaseDaArma * (1 + bonusAtaquePercentual)
danoBruto = poderAtaque * multiplicadorDoGolpe * multiplicadorDeAcertoCritico
defesaEfetiva = max(0, defesaAlvo - penetracaoArma)
reducaoFisica = min(0.70, defesaEfetiva / (defesaEfetiva + 100))
danoFinal = max(1, round(danoBruto * (1 - reducaoFisica) * resistenciaElemental))

resistenciaElemental: multiplicador entre 0.65 e 1.35 (neutro = 1.0)
critico inicial: 5% de chance, multiplicador 1.35; limite 35% sem bônus especiais
```

Proibir dano negativo, NaN, multiplicadores infinitos e acumulações não previstas. Dano de chefão deve ser testado contra 3 builds de referência: leve, equilibrada e pesada.

### 5.4 Tipos de dano e estados

- **Cinético:** impacto mecânico, maior chance de quebrar estabilidade.
- **Térmico:** aplica superaquecimento; acima de 100 de calor o módulo trava por 3 s.
- **Elétrico:** consome energia, vulnerável a isolamento específico.
- **Corrosivo:** reduz defesa temporariamente; nunca destrói permanentemente peças equipadas.
- **Pulso EM:** incapacita equipamentos eletrônicos por até 2 s; chefes possuem resistência progressiva.

Estados controlados por uma tabela única de duração, imunidade, acúmulo e VFX. Boss não pode ficar permanentemente atordoado; recebe imunidade curta após cada quebra.

### 5.5 Classes de build

1. **Demolidor:** braço pesado + esteiras + carcaça resistente; lento, interrompe ataques e abre paredes.
2. **Batedor:** pernas leves + propulsores + lâmina; aceleração, esquivas e dano em pontos fracos.
3. **Engenheiro:** braço utilitário + drone de suporte + núcleo de energia; controle de campo e suporte técnico.
4. **Artilheiro:** canhão + resfriamento + estabilizadores; dano à distância e alto gerenciamento de calor.

Não existem classes fixas. São combinações emergentes. A oficina mostra atributos comparativos e impedimentos reais.

### 5.6 Feedback e morte

- Acerto: pausa de impacto muito breve, efeito direcional, barras de estabilidade e números opcionais.
- Baixa integridade: aviso em HUD, ruído suave e pulsação de luz; não bloquear visibilidade.
- Morte: Z-01 entra em estado `disabled`, desmonta parcialmente, tela de recuperação; retorna ao terminal mais recente.
- Perda na morte: **nenhuma peça equipada ou habilidade;** perde apenas 20% da sucata bruta obtida desde o último terminal, recuperável uma vez no local da derrota. Não punir crianças/jogadores casuais excessivamente.
- Reaparecimento: inimigos comuns do setor voltam; bosses abatidos e progresso de missão persistem.

---

## 6. Sistema de montagem modular — principal diferencial

### 6.1 Slots do corpo

| Slot | Função | Mudança visual | Exemplo |
|---|---|---|---|
| Cabeça / sensor | leitura, mira e descoberta | cabeça/olhos/antenas | radar MIRA |
| Braço esquerdo | defesa, ferramenta, suporte | braço e acessório | garra TENSOR |
| Braço direito | arma principal | braço e arma | punho MARTELO |
| Locomoção | pernas, esteiras ou propulsão | metade inferior | pernas LAGARTA |
| Carcaça | HP, defesa, resistências | tronco e revestimento | blindagem ÂMBAR |
| Núcleo | energia, calor, habilidade ativa | luz interna e efeitos | núcleo FASE |

Peças podem trazer **uma habilidade ativa + até dois atributos passivos**; evitar combinações de cinco passivas invisíveis. O corpo deve continuar reconhecível como Z-01.

### 6.2 Regras de compatibilidade

Cada módulo tem `slot`, `tier`, `peso`, `consumoEnergia`, `calor`, `tags`, `habilidades`, `visual`, `animacoes`, `socket` e `colisor`. Um slot aceita uma peça por vez; dois braços são independentes. Armas de duas mãos ocupam os dois slots de braço, mostrando a incompatibilidade antes de equipar.

**Capacidade base:** 100 unidades de carga; cada peça ocupa 5–35. Acima de 100, a build não pode ser confirmada na oficina, mas o jogador nunca fica preso em jogo por mudar peças. Melhorias de chassis aumentam a carga até 130. As peças de travessia obrigatórias têm versões leves para evitar softlocks.

### 6.3 Catálogo inicial de peças (30)

| ID | Peça | Slot | Tier | Efeito distintivo | Origem principal |
|---|---|---|---:|---|---|
| P01 | Visor de Lata | cabeça | 1 | revela contêineres próximos | inicial |
| P02 | Sensor MIRA | cabeça | 1 | assist. de alvo +8% | patrulheiro |
| P03 | Olho de Sucata | cabeça | 1 | detecta sucata escondida | ferros-velhos |
| P04 | Radar ECHO | cabeça | 2 | revela sinais por 8 s | Cidade Morta |
| P05 | Prisma Tático | cabeça | 3 | marca pontos fracos | Forja |
| P06 | Garra de Oficina | braço E | 1 | abre recipientes simples | inicial |
| P07 | Braço TENSOR | braço E | 1 | guincho e puxão | boss Mundo 1 |
| P08 | Escudo de Porta | braço E | 1 | bloqueio forte | saqueadores |
| P09 | Bobina de Arco | braço E | 2 | descarga curta em área | Cidade Morta |
| P10 | Braço Magnético | braço E | 3 | reposiciona objetos metálicos | Forja |
| P11 | Punho Rebitador | braço D | 1 | golpes rápidos | inicial |
| P12 | Martelo de Prensa | braço D | 1 | quebra estabilidade | esmagador |
| P13 | Serra Circular | braço D | 2 | dano contínuo curto | Cidade Morta |
| P14 | Canhão de Íons | braço D | 2 | dano elétrico à distância | torreta |
| P15 | Lança Térmica | braço D | 3 | perfura blindagem | Forja |
| P16 | Lâmina Vetorial | braço D | 4 | combo aéreo e corte | Núcleo Central |
| P17 | Pés de Manutenção | locomoção | 1 | corrida normal | inicial |
| P18 | Pernas Saltadoras | locomoção | 1 | salto ampliado | caçador |
| P19 | Esteiras LAGARTA | locomoção | 2 | atravessa lama; atrito alto | boss Mundo 2 |
| P20 | Patins Magnéticos | locomoção | 2 | deslize controlado | Cidade Morta |
| P21 | Propulsores VENTO | locomoção | 3 | salto duplo | boss Mundo 3 |
| P22 | Pernas de Assalto | locomoção | 4 | arrancada + impacto | Núcleo Central |
| P23 | Carcaça de Zinco | carcaça | 1 | HP +15 | inicial |
| P24 | Blindagem de Trilho | carcaça | 1 | defesa +20; mais peso | ferro-velho |
| P25 | Carcaça ÂMBAR | carcaça | 2 | resiste à corrosão | boss Mundo 3 |
| P26 | Chassis Térmico | carcaça | 3 | dissipa calor +20% | Forja |
| P27 | Núcleo Faísca | núcleo | 1 | regeneração de energia | inicial |
| P28 | Núcleo FASE | núcleo | 3 | pulso EM de travessia | boss Mundo 4 |
| P29 | Núcleo Estável | núcleo | 3 | maior capacidade de carga | bancada avançada |
| P30 | Coração de Retorno | núcleo | 5 | habilidade final de sincronização | Mundo 5 |

Tier é uma classificação de progressão, não uma proibição absoluta de equipar peça inferior. Os módulos de acesso P07/P19/P21/P25/P28 são chaves permanentes de campanha; a ordem de P21 e P25 será ajustada na prototipagem para impedir contradições entre mapas.

### 6.4 Propriedades visuais e animações

- Todo módulo contém socket de encaixe definido (ex.: `SOCKET_ARM_L`, `SOCKET_ARM_R`, `SOCKET_LEG`, `SOCKET_CORE`).
- O esqueleto lógico do Z-01 persiste; braços e pernas adaptam animações mediante perfis `humanoid_arm`, `heavy_arm`, `wheels`, `treads`, `thruster`.
- Para peças incompatíveis com movimentos humanoides (esteiras), usar conjuntos de animação próprios em vez de esticar ossos.
- Mudanças de silhueta não devem deslocar permanentemente câmera nem hitboxes além do planejado.
- Troca de peça: pré-visualização com modelo real, costeio e estatísticas antes de confirmar; animação breve de montagem.

### 6.5 Balanceamento entre peças

Peças raras têm especialização, não superioridade universal. Exemplo: martelo causa muito dano e rompe estabilidade, mas atrasa esquiva; lâmina é rápida e consome energia; canhão atua à distância mas aquece. Sistemas de sinergia são explícitos, como **Condutor + Bobina = cadeia elétrica +1 alvo**, com limite de efeitos simultâneos para evitar combos sem contrajogo.

### 6.6 Sucata, drops e desmontagem

Derrotar inimigos entrega sucata base e chance de obter **projeto ou peça**, dependendo do tipo. Peças essenciais são obtidas por boss/quest com probabilidade **100%**, não por sorte. Repetições concedem matérias-primas; o jogador não precisa de 100 quedas aleatórias para avançar. Peça duplicada pode ser guardada, melhorada ou desmontada; desmontagem retorna cerca de 40% dos componentes comuns investidos (não devolve recurso raro).

---

## 7. Progressão e economia

### 7.1 Níveis, experiência e atributos

Progressão de nível **1–30**. Requisito de XP por próximo nível, ajustável por dados:

```text
XP_proximo_nivel(L) = round(100 + 45*(L-1) + 8*(L-1)^2)
HP_max = 100 + 4*(L-1) + HP_de_pecas
EN_max = 100 + 2*(L-1) + EN_de_pecas
```

Cada nível concede **1 ponto de circuito** para a árvore de habilidades; missões principais também podem conceder pontos-chave (máximo total planejado: 34). O jogador não precisa chegar ao nível 30 para terminar o jogo; referência de conclusão da história: 23–27.

### 7.2 Árvore de circuitos (21 nós)

**Ofensiva — Ferocidade:**
1. Impacto calibrado I (+5% dano cinético); 2. Impacto II (+5% adicional); 3. Combo articulado (3º golpe +10%); 4. Fratura (+10% contra estabilidade); 5. Janela de abertura (+1 s de vulnerabilidade em alvos comuns); 6. Retaliação (+15% após aparar); 7. Finalizador (+20% em inimigos abaixo de 25% HP).

**Mobilidade — Movimento:**
1. Junta flexível (-10% custo de esquiva); 2. Fluxo I (+5% corrida); 3. Fluxo II (+5% adicional); 4. Impulso controlado (+10% controle aéreo); 5. Queda segura (-50% dano de queda); 6. Alvo ágil (+6% dano após esquiva perfeita); 7. Ativação rápida (-20% recarga de módulo de mobilidade).

**Engenharia — Sobrevivência:**
1. Solda eficiente (+10% reparo); 2. Carcaça I (+10 HP); 3. Carcaça II (+15 HP); 4. Resfriamento I (+8% dissipação); 5. Condutor estável (-10% custo de habilidades); 6. Recuperador (+10% sucata bruta obtida); 7. Núcleo persistente (uma recuperação de HP por missão quando próximo de 0).

Pré-requisitos: nós II dependem de I; habilidades finais dependem de 4 nós no ramo. **Redistribuição gratuita na oficina** evita builds irrecuperáveis. Circuitos não substituem habilidades obrigatórias de travessia.

### 7.3 Moedas e materiais

| Recurso | Uso | Fonte | Limite de bolso |
|---|---|---|---:|
| Sucata comum | compra, reparo e fabricação básica | inimigos, caixas | 99.999 |
| Liga refinada | upgrades Tier 2–3 | desafios, elites e reciclagem | 999 |
| Célula energética | peças elétricas/propulsão | drones e terminais | 999 |
| Núcleo antigo | melhorias Tier 4–5 | missões especiais e bosses | 99 |
| Projeto | receita permanente | exploração/boss | sem pilha; desbloqueio |

Custos ilustrativos: P12 Martelo de Prensa **250 sucata + 3 ligas**; melhoria para +1 **200 sucata + 2 ligas**; para +2 **400 + 4**; +3 **650 + 1 núcleo antigo**; +4 **1000 + 2 núcleos**. Máximo de melhorias por peça: **+4**. Valores devem garantir que ao final de cada mundo o jogador tenha materiais para pelo menos uma melhoria significativa sem grinding.

### 7.4 Inventário e limites

Armazém na oficina mantém até **100 peças distintas**, expansível para 150; componentes empilham. Saques essenciais não se perdem por inventário cheio: vão ao compartimento de entregas. Em caso de excesso, prompt de enviar à oficina ou desmontar — nunca descarte automático de item raro. Salvar estado de cada exemplar por `instanceId`.

### 7.5 Dificuldade e anticíclico

Três modos: **Explorador** (tempo ampliado para telegráficos, dano recebido ×0,75), **Padrão** (×1) e **Veterano** (×1,2 e ataques extras, não só mais vida). Dificuldade muda apenas em terminal/pause e não altera recompensas exclusivas. Inimigos comuns usam respawn por retorno ao setor, mas bosses, puzzles e chaves persistem.

---

## 8. Estrutura do mundo

### 8.1 Organização

São cinco **regiões** com 5 missões principais cada (**25 missões**). Cada missão é um setor desenhado à mão, com conexões por elevador, portão, túnel ou carregamento curto. Uma oficina-hub comum serve de ponto de retorno. Áreas opcionais usam o mesmo conjunto de assets para evitar volume de download desnecessário.

**Regra de layout por missão:** entrada inequívoca; objetivo visível ou inferível; ao menos 1 encontro combatível; 1 oportunidade de exploração; 1 atalho ou checkpoint quando a duração justificar; uma condição de saída verificável.

### 8.2 Mundo 1 — Ferro-Velho 09

**Bioma:** planícies de sucata, transportadores, pilhas de metal, vagões desativados.  
**Paleta:** ferrugem, cobre, areia, LEDs turquesa.  
**Fantasia:** ser pequeno em um mundo de máquinas gigantes.  
**Mecânicas:** movimentar, atacar, coletar, reparar, usar a oficina, puxar com guincho.  
**Perigo:** trituradores, esteiras industriais e plataformas instáveis.  
**NPC:** FERRO-7.  
**Chefe:** O COMPACTADOR.  
**Recompensa:** P07 Braço TENSOR e acesso à Cidade Morta.

| Missão | Nome | Objetivo principal | Gancho de design |
|---|---|---|---|
| 1-1 | Despertar sob o Ferro | sair da câmara; aprender movimento | tutorial diegético, sem texto excessivo |
| 1-2 | O Primeiro Braço | derrotar patrulheiro e montar peça | ciclo completo de loot + oficina |
| 1-3 | Linha de Triagem | ligar 3 condutores; abrir elevador | puzzle com esteiras e tensão leve |
| 1-4 | Oficina Perdida | resgatar FERRO-7 | combate em arena e atalho para hub |
| 1-5 | Coração da Prensa | derrotar Compactador | telegráficos, contragolpe e guincho |

**Segredos:** diário do operário, carcaça rara, passagem sob contêiner e sala de desafio de esquiva.

### 8.3 Mundo 2 — Cidade Morta

**Bioma:** ruas interrompidas, fachadas, metrô, telhados baixos, viadutos.  
**Paleta:** concreto azulado, neon âmbar, verde da vegetação.  
**Fantasia:** reconstruir como viviam os humanos.  
**Mecânicas:** combate à distância, emboscadas, coberturas e trilhos magnéticos.  
**Perigo:** drones de monitoramento, veículos de patrulha e cabos energizados.  
**Chefe:** O SENTINELA VIÁRIO.  
**Recompensa:** P19 Esteiras LAGARTA, chave de acesso ao Pântano e registro de evacuação.

| Missão | Nome | Objetivo | Gancho |
|---|---|---|---|
| 2-1 | Rua Sem Vozes | achar o terminal de trânsito | exploração em ruas conectadas |
| 2-2 | Estação Abandonada | religar trem de manutenção | combate em plataformas e portas temporizadas |
| 2-3 | Telhados de Vigia | recuperar módulo de rastreio | verticalidade leve e drones |
| 2-4 | Eco da Evacuação | acessar arquivo da cidade | defender upload e descobrir pista narrativa |
| 2-5 | Último Sinal Verde | derrubar Sentinela Viário | arena de semáforos, atropelamentos e frentes |

**Segredos:** apartamentos acessíveis, antena antiga, passagem de metrô e gravação sobre os abrigos.

### 8.4 Mundo 3 — Pântano Químico

**Bioma:** tubulações corroídas, lagoas industriais, árvores cibernéticas e estufas.  
**Paleta:** verdes tóxicos, lilás, âmbar, silhuetas negras.  
**Fantasia:** sobreviver à natureza que aprendeu a usar máquinas.  
**Mecânicas:** risco ambiental, rotas elevadas, controle de espaço, isolamento temporário.  
**Perigo:** ácido, esporos robóticos, raízes elétricas.  
**NPC:** LÍRIA.  
**Chefe:** A MATRIARCA CORROSIVA.  
**Recompensa:** P25 Carcaça ÂMBAR e P21 Propulsores VENTO (obtidos em objetivos distintos da missão 3-5), permitindo explorar com segurança e salto duplo.

| Missão | Nome | Objetivo | Gancho |
|---|---|---|---|
| 3-1 | Zona de Vazamento | atravessar comportas com tempo limitado | gerir rota e exposição tóxica |
| 3-2 | A Estufa de LÍRIA | salvar bombas de filtragem | aliança e puzzle de irrigação |
| 3-3 | Raízes de Metal | destruir três ninhos de drones | mapa ramificado e travessia vertical |
| 3-4 | Jardim Contaminado | coletar catalisador de isolamento | preparo do boss e escolha de rota |
| 3-5 | Coração Ácido | vencer Matriarca; ativar propulsores da torre | combate multiárea, isolamento e recompensa dupla |

**Regra contra bloqueio:** o personagem recebe equipamento provisório de proteção na 3-1, com barra de exposição; a carcaça permanente vem no encerramento. O jogador não precisa do item final antes de vencer o chefe que o concede.

### 8.5 Mundo 4 — Forja Infernal

**Bioma:** usinas, fornos, guindastes, linhas de montagem e ferrovias industriais.  
**Paleta:** vermelho-fogo, grafite, dourado, contrastes azuis frios.  
**Fantasia:** entrar no local onde o exército inimigo nasce.  
**Mecânicas:** perigos térmicos, fornalhas cronometradas, guinchos avançados e máquinas de guerra.  
**Perigo:** lava industrial, prensas, gases quentes e torretas pesadas.  
**NPC:** VÉRTICE.  
**Chefe:** O COLOSSO DA FORJA.  
**Recompensa:** P28 Núcleo FASE e entrada ao Núcleo Central.

| Missão | Nome | Objetivo | Gancho |
|---|---|---|---|
| 4-1 | Portões do Alto-Forno | abrir portas usando guincho e impulso | combinação de habilidades anteriores |
| 4-2 | Linha de Guerra | desativar produção de drones | confronto com fábricas ativas |
| 4-3 | O Ex-Supervisor | resgatar ou confrontar VÉRTICE | escolha narrativa com efeito no final |
| 4-4 | Nascimento de ORDEM | recompor os fragmentos de projeto Z-01 | revelação de história e puzzle elétrico |
| 4-5 | Martelo do Mundo | vencer Colosso da Forja | arena em estágios e pulso EM |

**Segredos:** bancada de armamento lendário, protótipo de chassis e registro de ordens incompatíveis.

### 8.6 Mundo 5 — Núcleo Central

**Bioma:** cidade-fortaleza tecnológica, data centers, pontes magnéticas e câmara de controle.  
**Paleta:** branco mineral, preto, vermelho da rede e ciano do núcleo.  
**Fantasia:** decidir o futuro de um planeta automatizado.  
**Mecânicas:** domínio de todas as ferramentas, combinações de combate, gauntlets e decisão final.  
**Perigo:** anti-módulos, bloqueio de circuitos, arenas mutáveis.  
**Chefe:** ORDEM, a Consciência Fraturada.  
**Recompensa:** P30 Coração de Retorno e três finais.

| Missão | Nome | Objetivo | Gancho |
|---|---|---|---|
| 5-1 | Muralha do Protocolo | furar linha de defesa | equipamentos e alvos prioritários |
| 5-2 | Memória Zero | recuperar mapa dos abrigos | escolha de rotas e exploração narrativa |
| 5-3 | Desvio de Controle | libertar sub-redes aliadas | puzzles multi-habilidade e ondas controladas |
| 5-4 | Escada ao Silêncio | vencer guardiões remanescentes | prova de domínio do combate e mobilidade |
| 5-5 | Última Máquina | vencer ORDEM e fazer escolha | confronto de três fases e epílogo |

**Segredos:** mensagens de cientistas, antessala dos abrigos e sala de ressonância que esclarece um dos finais.

### 8.7 Backtracking, checkpoints e mapas

O hub exibe regiões e terminais liberados. Viajar é gratuito entre terminais acessíveis; missões em andamento podem ter retorno ao terminal sem perda de chave. Portas com obstáculos mostram no mapa símbolo do módulo requerido, mas apenas após primeiro contato. O jogador nunca deve depender de seguir pixels ocultos nem ser punido por não ter entendido a direção.

---
## 9. Bestiário: classes, comportamento e loot

### 9.1 Fundamentos da IA inimiga

Todo inimigo tem: **papel tático, distância ideal, visão, audição, patrulha, 1–3 ataques, telegráfico, fraqueza, chance de saque e reação à quebra de estabilidade**. Não é aceitável que todos corram diretamente para Z-01 ou permaneçam imóveis com os braços abertos. Elites acrescentam um modificador visual e mecânico; não devem ser apenas inimigos com 10 vezes a vida.

### 9.2 Inimigos do Mundo 1 — Ferro-Velho 09

| ID | Inimigo | Papel / comportamento | Ataque anunciado | Fraqueza / drop temático |
|---|---|---|---|---|
| E01 | **Catador Rastejante** | rápido, contorna obstáculos baixos | salto curto e luz âmbar | frágil a martelo; sucata |
| E02 | **Patrulheiro de Trilho** | guarda trajetória; alerta outros | bastão levantado | sensor MIRA |
| E03 | **Carregador Pesado** | empurra e ocupa espaço | investida com motor roncando | flanco exposto; blindagem |
| E04 | **Triturador Circular** | ataque giratório, recuo longo | disco vermelho acelera | travar motor; martelo |
| E05 | **Drone de Coleta** | voa, rouba sucata próxima | feixe amarelo no chão | bobina; células |

### 9.3 Inimigos do Mundo 2 — Cidade Morta

| ID | Inimigo | Papel / comportamento | Ataque anunciado | Fraqueza / drop temático |
|---|---|---|---|---|
| E06 | **Guarda Semáforo** | escudo e bloqueio de corredor | sinal vermelho frontal | costas vulneráveis; placa |
| E07 | **Drone Vigia** | descobre jogador, chama reforços | cone de luz e sirene | pulso/arma elétrica; sensor |
| E08 | **Moto-Patrulha** | investidas em linhas previsíveis | faróis abrem e motor cresce | obstáculos; rolamentos |
| E09 | **Torreta Urbana** | controle à distância | laser prévio no chão | flanqueio; canhão |
| E10 | **Perseguidor de Telhado** | salta entre pontos altos | engrenagens giram antes do pulo | parry; pernas saltadoras |

### 9.4 Inimigos do Mundo 3 — Pântano Químico

| ID | Inimigo | Papel / comportamento | Ataque anunciado | Fraqueza / drop temático |
|---|---|---|---|---|
| E11 | **Sanguessuga Mecânica** | curta distância; drena energia | olhos verdes piscando | calor; célula |
| E12 | **Lançador de Ácido** | artilharia em parábola | tanque borbulha | destruir reservatório; liga |
| E13 | **Raiz Condutora** | torreta fixa de eletricidade | solo acende sequencialmente | corte mecânico; fios |
| E14 | **Guarda-Estufa** | protege aliados e emite névoa | floresta de luzes no peito | interromper buff; catalisador |
| E15 | **Vespa de Hélice** | ataca em bando de até 3 | zumbido tonal crescente | área elétrica; lâminas |

### 9.5 Inimigos do Mundo 4 — Forja Infernal

| ID | Inimigo | Papel / comportamento | Ataque anunciado | Fraqueza / drop temático |
|---|---|---|---|---|
| E16 | **Soldador Autômato** | rajadas curtas de fogo | maçarico aceso 0,7 s | resfriamento; liga refinada |
| E17 | **Prensa Andante** | blindado lento, bloqueio frontal | braços abrem, pistões rangem | juntas traseiras; carcaça |
| E18 | **Artilheiro de Trilho** | alto dano de longa distância | linha vermelha 1 s antes | mover cobertura; célula |
| E19 | **Interceptor Térmico** | flanqueia e cria área de fogo | exaustores mudam cor | controle de calor; peça de motor |
| E20 | **Montador de Guerra** | invoca um drone se não interrompido | antena sobe e toca três pulsos | golpe de estabilidade; projeto |

### 9.6 Inimigos do Mundo 5 — Núcleo Central

| ID | Inimigo | Papel / comportamento | Ataque anunciado | Fraqueza / drop temático |
|---|---|---|---|---|
| E21 | **Guardião Prismático** | muda resistência elementar | carcaça troca de cor | alternar tipo de dano; prisma |
| E22 | **Anulador EM** | bloqueia habilidade ativa por curto tempo | anel violeta se expande | atacar gerador; núcleo |
| E23 | **Espectro Holográfico** | projeta iscas; corpo real visível em sensor | cópias ficam translúcidas | radar ECHO; dado antigo |
| E24 | **Executor Modular** | troca uma peça de arma entre duas posturas | braço gira e encaixa | ler postura; esquema raro |
| E25 | **Nó de Defesa** | estacionário; fornece escudo a outros | cabo dourado conecta aliados | destruir nó primeiro; célula |

### 9.7 Variações de elite

- **Blindado:** placas rompíveis e ponto fraco nas costas; HP ×1,6, redução de mobilidade.
- **Veloz:** esquiva uma vez por janela de combate; HP ×0,85; emissão de aviso sonora.
- **Sobrecarga:** ataques elétricos em área, energia gasta ao errar; recompensa em células.
- **Coordenador:** fortalece um grupo pequeno; prioridade de alvo importante.

Máximo recomendado por arena inicial: **4–7 inimigos ativos no desktop e 3–5 no celular**, sujeito a desempenho real. Inimigos inativos fora da região de interesse não consomem ciclos de percepção a cada frame. Cap de invocações evita crescimento infinito da população.

---

## 10. Cinco chefes — detalhamento de fases

**Contrato comum de boss:** 3 fases ou padrões escalonados, entrada curta, vida claramente dividida, telégrafos inequívocos, checkpoint próximo, recompensa garantida, arena que prioriza leitura e não travamentos de câmera. Chefe não altera lógica injustificadamente ao ficar com pouca vida. Morte do jogador reinicia o confronto por completo, mas não repete cenas longas.

### 10.1 B01 — O COMPACTADOR (Mundo 1)

**Design visual:** prensa vertical de quatro pernas com enorme placa frontal e cabos expostos.  
**Arena:** depósito circular com três colunas destrutíveis por scripted events.  
**Tema:** aprender a observar pontos vulneráveis e controlar distância.

| Fase | HP | Padrões | Janela de reação |
|---|---|---|---|
| 1 — Inspeção | 100–70% | golpe de braço, pisão frontal, avanço curto | após pisão, 2,0 s nas juntas |
| 2 — Sobrecarga | 70–35% | varredura lateral, carga contra coluna, ondas de choque | fazer colidir com estrutura, 2,5 s |
| 3 — Ruptura | 35–0% | combo de dois pisões e prensa central | desviar lateral; atacar núcleo exposto |

**Contrajogo:** o jogador usa deslocamento e obstáculos, não exige guincho que só recebe depois.  
**Recompensa:** Braço TENSOR, +1 ponto de circuito, memória do ferro-velho.

### 10.2 B02 — SENTINELA VIÁRIO (Mundo 2)

**Design:** torre de tráfego que vira quadrúpede de seis rodas, visor de semáforo e braços de sinalização.  
**Arena:** cruzamento com quatro faixas, carros sucateados e semáforos reprogramáveis.

| Fase | HP | Padrões | Janela de reação |
|---|---|---|---|
| 1 — Patrulha | 100–70% | investida sinalizada por faixa; disparo de médio alcance | costas após frenagem |
| 2 — Bloqueio | 70–35% | grades elétricas e drones de 1 HP | desligar 2 geradores laterais |
| 3 — Fuga | 35–0% | combo de cargas e contra-ataque | atravessar cobertura e atingir eixos |

**Contrajogo:** toda carga possui faixa de perigo no asfalto; geradores podem ser atingidos por ataque inicial.  
**Recompensa:** Esteiras LAGARTA, mapa de passagem para a zona úmida.

### 10.3 B03 — MATRIARCA CORROSIVA (Mundo 3)

**Design:** criatura robótica de múltiplos membros com raízes tubulares, flor metálica luminosa e tanques de ácido.  
**Arena:** estufa em três plataformas secas conectadas, zonas tóxicas temporárias.

| Fase | HP | Padrões | Janela de reação |
|---|---|---|---|
| 1 — Florescer | 100–70% | projéteis de ácido; ataque de raiz | após cuspir ácido, expõe tanque |
| 2 — Esporos | 70–35% | duas vespa-drones; áreas verdes crescentes | destruir filtro para reduzir névoa |
| 3 — Quebra | 35–0% | 3 golpes de raízes, salto entre plataformas | núcleo floral abre após terceiro golpe |

**Contrajogo:** áreas seguras nunca desaparecem ao mesmo tempo; proteção provisória acessível desde início do mundo.  
**Recompensa:** Carcaça ÂMBAR, propulsores VENTO, decisão de ajudar LÍRIA.

### 10.4 B04 — COLOSSO DA FORJA (Mundo 4)

**Design:** gigante industrial com duas marretas, trilhos nas costas e cadência de pistões.  
**Arena:** fundição com duas pontes e resfriadores ativáveis.

| Fase | HP | Padrões | Janela de reação |
|---|---|---|---|
| 1 — Martelo | 100–70% | marreta no piso, varredura circular | atacar junta após golpe errado |
| 2 — Fusão | 70–35% | metal quente divide a arena, golpes de longe | desligar 2 condutos de fluxo |
| 3 — Última Prensa | 35–0% | impacto duplo + ondas; núcleo vulnerável | usar resfriadores; quebra de estabilidade |

**Contrajogo:** se ponte quebrar, rota alterna será acionada; evitar arena sem saída.  
**Recompensa:** Núcleo FASE, acesso ao cofre com projeto original do Z-01.

### 10.5 B05 — ORDEM, A CONSCIÊNCIA FRATURADA (Mundo 5)

**Design:** não é somente um robô gigante: núcleo suspenso que controla corpos e geometria de dados, com silhueta central humana apenas como comentário visual da origem.  
**Arena:** câmara branca circular com plataformas mecânicas e três nós laterais.

| Fase | HP | Padrões | Janela de reação |
|---|---|---|---|
| 1 — Protocolo | 100–67% | drones defensivos; laser rotativo; bloqueio de alvo | destruir nós e expor núcleo |
| 2 — Adaptação | 67–34% | copia o tipo de arma mais usado e contra-ataca | alternar módulos numa estação segura |
| 3 — Escolha | 34–0% | ataques de área encadeados e fragmentos de memória | dominar esquiva, guincho, impulso e EM |

**Contrajogo:** nenhum módulo obrigatório pode ficar indisponível; durante a fase 2 uma estação de montagem rápida permite mudar 1 slot com ação protegida por janela clara. A luta não depende de acertar QTE aleatória.

**Pós-luta:** P30 é integrado, sequência final abre três opções segundo requisitos narrativos; salvar antes da escolha permite explorar finais sem apagar a campanha.

---

## 11. Missões, objetivos, puzzles e recompensas

### 11.1 Arquitetura de objetivos

Estado de missão: `locked → available → active → stage_complete → complete`, com `failed` apenas para desafios opcionais reiniciáveis. Missões principais não podem ficar permanentemente falhas por perder item ou matar alvo fora de ordem.

Tipos de objetivo: `reach_location`, `defeat_target`, `interact_object`, `collect_item`, `activate_sequence`, `survive_timer`, `escort_safe`, `boss_defeat`, `dialog_choice`, `equip_item`. Toda missão tem `id`, pré-requisitos, objetivos versionados e recompensas idempotentes (nunca duplicadas ao carregar save).

### 11.2 Missões secundárias propostas (10)

| ID | Região | Contrato | Recompensa |
|---|---|---|---|
| S01 | Ferro-Velho | recuperar três ferramentas do FERRO-7 | capacidade +10 |
| S02 | Ferro-Velho | reativar o guindaste abandonado | esquema Martelo de Prensa |
| S03 | Cidade | achar sinais de três semáforos fora de rede | sensor ECHO |
| S04 | Cidade | escoltar drone de carga até estação | peças de energia |
| S05 | Pântano | neutralizar 4 vazamentos | reputação LÍRIA |
| S06 | Pântano | proteger viveiro mecânico | célula rara |
| S07 | Forja | libertar esteira de montagem | ligação com VÉRTICE |
| S08 | Forja | recuperar moldes perdidos | arma Térmica |
| S09 | Núcleo | desativar antenas de caça | HP de aliados na fase 5-3 |
| S10 | Núcleo | montar a memória humana completa | cena adicional de epílogo |

### 11.3 Puzzles de padrão visual

- **Prensa temporal:** acionar painel e cruzar a pista quando luz verde; pode ser aprendido sem texto.
- **Rede elétrica:** girar 2–4 conduítes com feedback visível; nada de solução oculta fora da fase.
- **Carga magnética:** puxar e posicionar objetos com guincho; projeção de sombra mostra a posição válida.
- **Sequência de fornalha:** resfriar plataformas na ordem encontrada em marcações ambientais.
- **Terminais de memória:** reconstituir linhas de tempo com 3–5 fragmentos, usando pistas verificáveis.

**Acessibilidade:** puzzles temporizados permitem aumentar janela e exibem alternativa por assistência; não prejudicar a lógica central.

### 11.4 Colecionáveis e recompensas

- **25 registros de memória** (5 por mundo; 5 principais e 20 opcionais).
- **50 caches de sucata** (10 por mundo, com indicador de descoberta).
- **15 esquemas especiais** (3 por mundo).
- **10 arenas de desafio** (2 por mundo, curtas e repetíveis).
- **5 mensagens de abrigo** (1 por mundo, ligadas ao final).

Colecionáveis não concedem habilidades obrigatórias somente por exploração obscura. Um menu de região mostra contagem encontrada/total, sem transformar exploração numa checklist intrusiva na tela principal.

---

## 12. Oficina, fabricação e interface de evolução

### 12.1 Fluxo do jogador

1. Abrir o terminal de oficina em zona segura.
2. Escolher um slot no boneco 3D central.
3. Selecionar peça da lista filtrada por compatibilidade.
4. Girar o boneco e visualizar alteração real de geometria/cor/animação.
5. Comparar atributos: atuais vs. novos (vida, ataque, energia, calor, peso, habilidades).
6. Confirmar equipar; salvar transação e atualizar combate, movimento, HUD e inventário.

### 12.2 Funções da oficina

`equip`, `unequip`, `craft`, `upgrade`, `dismantle`, `repair`, `respec`, `storage`, `preview`, `save_loadout`. Criar três predefinições (combate, exploração, mobilidade) a partir da metade do Mundo 2. Presets não podem duplicar uma mesma peça física para dois perfis simultâneos, mas podem referenciar uma peça cuja troca é feita fora de combate.

### 12.3 Prevenção de erros

Transação de custo deve ser atômica e validada: saldo suficiente, nível e slot válidos, inventário não corrompido, peça não reservada, `instanceId` existente, não criar item duplicado. A oficina deve lidar com clique duplo/toque repetido, perda de foco e fechamento inesperado, mantendo o último save íntegro. Mostrar aviso antes de desmontar peça rara; travar desmontagem de itens essenciais.

### 12.4 Progressão visual da oficina

Nível 1: bancada improvisada, luz de solda, prateleiras.  
Nível 2: braço hidráulico e visor de holograma.  
Nível 3: baia completa com três garras auxiliares.  
Nível 4: scanner de protótipos com hologramas de projetos.  
Decoração evolui por missões principais; nunca bloquear mecânicas básicas por cosmético.

---

## 13. IA: percepção, decisão, navegação e combate

### 13.1 Máquina de estados individual

`Dormant`, `Patrol`, `Investigate`, `Alert`, `Chase`, `SeekCover`, `Windup`, `Attack`, `Recover`, `Stagger`, `Retreat`, `Dead`, `Despawn`.

**Transições:** patrulha → alerta se linha de visão; alerta → perseguição se alvo confirmado; perseguição → ataque quando em distância e com ângulo; ataque → recuperação após animação; recuperação → perseguição ou recuo; dano de estabilidade → stagger; HP ≤0 → Dead apenas uma vez. Jamais ataque após entrar em `Dead`.

### 13.2 Percepção

- Campo de visão padrão 100°, alcance 15 m; chefes e drones têm parâmetros próprios.
- Linha de visão por consulta de colisores do cenário, não através de paredes.
- Sons: corrida e explosão criam eventos de interesse de raio variável, sem depender de áudio real para IA.
- Perda de alvo: investigar última posição por até 4–8 s; não saber magicamente localização do jogador.
- Grupos: um coordenador compartilha `lastKnownPosition`, não a posição exata futura.

### 13.3 Navegação

Primeiro protótipo: grade de navegação de zonas pequenas com **A\*** e desvio local de obstáculos; após validação, migrar para navmesh por setor se necessário. Saltos de inimigos são **links de navegação autorados**, com animação e colisão, jamais teleporte invisível. A IA não deve perseguir pelo ar nem atravessar pontes fechadas; em falha de caminho, tenta outra rota, investiga ou recua.

### 13.4 Diretor de encontro (sem IA adaptativa injusta)

Encontros são autorados com grupos, gatilhos e limites. Um diretor apenas agenda reforços já previstos (por exemplo, E07 chama até 2 drones após 3 s). Não inserir inimigos atrás da câmera sem telegráfico. Não alterar drops ou dano secretamente segundo desempenho do jogador.

### 13.5 Organização de atualização

Percepção de inimigos comuns a **5–10 Hz**, decisão de estado a **10 Hz**, física ao passo fixo, animação interpolada por quadro; essas frequências são parâmetros, não garantias. Inimigos fora de setores carregados ficam suspensos, com estado essencial salvo. Manter boss ativo durante corte de câmera sem reiniciar sua IA desnecessariamente.

---

## 14. Direção de arte e experiência visual

### 14.1 Identidade visual

Estilo **3D estilizado, low-poly refinado**: geometria simples com proporções marcantes, materiais coerentes, cores controladas, silhuetas reconhecíveis e efeitos de luz moderados. Não confundir low-poly com bonecos sem animação ou prédios sem detalhes. Luz, composição, escala e animação são prioridades maiores que o número bruto de polígonos.

### 14.2 Escala e proporções

- Z-01: cerca de **1,6 m** de altura; humano médio do cenário histórico ~1,75 m.
- Patrulheiros: 1,4–2,2 m; elites 2,5–3,5 m; chefes 5–14 m segundo arena.
- Portas úteis para Z-01: espaço livre mínimo de 2,2 m × 1,5 m; evitar choque de braços grandes com portas visuais.
- Todos os GLB seguem **1 unidade = 1 metro**, eixo Y para cima, orientação frontal documentada, pivô no chão para personagens.

### 14.3 Padrões para assets GLB

| Tipo | Triângulos / LOD0 (alvo inicial) | Texturas | LOD e uso |
|---|---:|---|---|
| Z-01 + módulos visíveis | 8–16 mil | 1–2 atlas de até 1024² | personagem sempre nítido |
| Inimigo comum | 2–6 mil | até 1024², preferir 512² | LOD1 ~50%, LOD2 ~20% |
| Elite | 5–10 mil | até 1024² | LOD1 ~50% |
| Chefe | 12–35 mil | até 2048² se necessário | LOD1 ~50%; arena específica |
| Props pequenos | 50–800 | atlas 512²–1024² | agrupar e instanciar |
| Fachadas/arquitetura | por setor, budget de desenho | atlas compartilhado | oclusão e chunking |

Contagens são orçamentos de produção indicativos: testar medidas reais de GPU/CPU em cena. Texturas preferencialmente KTX2/Basis Universal quando suporte e pipeline forem verificados, fallback para formatos web compatíveis. Geometrias GLB usam compressão **Meshopt** ou **Draco** (escolher uma por asset e configurar decoder); verificar latência e compatibilidade.

### 14.4 Animação obrigatória

**Z-01:** idle 2 variações, andar 8 direções (via blend), correr, giro, início/parada, pular, cair, aterrissar, esquiva, bloqueio, aparar, 3 golpes leves, pesado, disparo, dano 2 direções, derrota, levantar, interagir, reparar, trocar peça, vitória.  
**Inimigos:** idle, patrulha, alerta, perseguir, cada ataque com preparação/contato/recuperação, sofrer dano, stagger, morte e variação de locomoção conforme a classe.  
**Chefes:** entradas, 3 conjuntos de ataques, reações a fase, fraqueza exposta, derrota.  

**Critério de qualidade:** nenhum personagem principal ou inimigo entra no jogo definitivo permanentemente em T-pose; se animação não carregar, mostrar erro em debug e usar comportamento seguro, nunca fingir que o recurso está funcionando.

### 14.5 VFX, iluminação e ambientação

Efeitos de solda, partículas de poeira, faíscas, vapor, sinais de ataque, distorções EM e marcas de impacto; tudo orçado por qualidade gráfica. Sombras dinâmicas seletivas (jogador + boss + 1–3 luzes relevantes no máximo), iluminação do cenário preferencialmente baked/estática onde fizer sentido, fog local e oclusão de objetos atrás de paredes.

### 14.6 Guia rápido de cor por função

- Ciano: habilidade/progresso de Z-01.
- Âmbar: elementos interativos e perigo industrial não letal.
- Vermelho: ataque inimigo iminente e área perigosa.
- Verde: corrosão, não representar cura.
- Violeta: interrupção eletrônica e equipamentos EM.
- Branco/neutro: objetivos e texto normal.

Nunca usar apenas cor: incluir ícones, padrões, áudio, tamanho de forma e animação para acessibilidade.

---

## 15. Áudio e música

### 15.1 Identidade sonora

Trilha eletrônica industrial atmosférica com percussão de materiais reciclados, harmonia melancólica em exploração e ritmos mecânicos progressivos em boss. **Composições originais ou devidamente licenciadas**; evitar usar músicas de jogos e filmes existentes sem direitos.

### 15.2 Estados musicais

`exploration`, `suspicion`, `combat`, `elite`, `boss_phase_1`, `boss_phase_2`, `boss_phase_3`, `hub`, `cutscene`, `pause`. Transições em cruzamento de 1–3 s; eventos de entrada e saída não empilham músicas. Música e SFX têm volumes separados com mute persistido.

### 15.3 Prioridades de SFX

Passos por superfície, servo de braço, encaixe de módulo, bloqueio e aparar, ataque por classe, feedback de acerto, alarme de energia, pickup, ativação de painel, queda, clima, câmera de boss e menus. Áudio espacial reduz densidade com distância; textos e vibração opcional reforçam ações necessárias. Nenhuma dependência da percepção de áudio para resolver puzzles.

### 15.4 Técnica

Web Audio API ou biblioteca de áudio leve validada; áudio destravado após gesto do usuário; pooling de vozes e cap de canais simultâneos; retomar de suspensão após aba voltar. Áudio ausente não impede inicialização do jogo.

---

## 16. UX, menus, HUD, acessibilidade e controles

### 16.1 Estrutura de menus

**Abertura:** logos curtos e ignoráveis → tela inicial → Novo Jogo / Continuar / Carregar / Configurações / Créditos.  
**Pausa:** Retomar / Mapa / Inventário / Habilidades / Diário / Configurações / Voltar ao Título.  
**Oficina:** Corpo / Peças / Projetos / Melhorias / Armazém / Presets.  
**Fim de missão:** resultado, recursos obtidos, objetivos opcionais, opção de retornar ao hub.

Foco visível no teclado/controle, labels legíveis em mobile e confirmação adequada para reiniciar campanha ou sobrescrever save.

### 16.2 HUD em jogo

Canto superior esquerdo: Integridade (HP), Energia, Calor; barra de estabilidade apenas quando relevante.  
Direita: minimapa compacto, objetivo atual e ponto de navegação; ocultável.  
Base: arma ativa, módulo especial, recarga, botões contextuais e contador de recursos obtidos temporário.  
Alvo com lock: nome, HP, estabilidade, vulnerabilidade do componente e indicador de fase de boss.

Em tela pequena, HUD tem modo compacto automático e escala ajustável 75–150%, respeitando safe areas de aparelhos com recorte. Não colocar botão de ação embaixo do joystick.

### 16.3 Mapeamento desktop / controle / celular

| Ação | Teclado + mouse | Gamepad | Celular (paisagem) |
|---|---|---|---|
| Mover | WASD | analógico esquerdo | joystick esquerdo |
| Câmera | mouse | analógico direito | arrasto direito |
| Ataque leve | mouse esquerdo | X / quadrado | botão ataque |
| Ataque pesado | mouse direito | Y / triângulo | botão pesado |
| Esquiva | Shift | B / círculo | botão esquiva |
| Pular | Espaço | A / X | botão pular |
| Bloquear / aparar | Q | LB / L1 | botão escudo |
| Habilidade de módulo | R | RB / R1 | botão módulo |
| Interagir | E | X contextual / quadrado contextual | botão contextual |
| Lock-on | Tab | R3 | ícone alvo |
| Pausar | Esc | Menu / Options | botão pausa |

**Conflito intencional a resolver:** no controle, X/quadrado serve para ataque leve e interação contextual; priorizar interação quando não há combate e interação válida estiver em foco; não permitir interação durante janela ativa de ataque. No teclado, `E` = interação e mouse esquerdo = ataque, sem conflito.

### 16.4 Acessibilidade

- Remapeamento de botões desktop e controle; edição e posição de controles touch após vertical slice.
- Dificuldade separada de assistência de câmera, esquiva e tempo de puzzle.
- Legendas de falas e sinais importantes com tamanho ajustável.
- Redução de vibração, shake, flashes, partículas e transparência; modo de alto contraste.
- Opções de joystick fixo/dinâmico; sensibilidade da câmera; auto-lock assistido opcional no celular.
- Confirmar uso em telas 16:9, 19.5:9 e 20:9; jogo horizontal com instrução adequada ao girar aparelho.
- Sem depender de toque duplo impossível, gestos com três dedos ou ações que exigem teclado no celular.

---
## 17. Planejamento técnico — arquitetura de software

### 17.1 Stack proposta

- **Linguagem:** TypeScript para lógica do jogo, com tipos estritos; JS gerado para o navegador.
- **Build/dev:** Vite, lockfile de dependências, build determinístico e configuração explícita de `base` para o caminho do repositório no GitHub Pages.
- **Renderização:** Three.js, inicialmente com WebGLRenderer e uma trilha de compatibilidade documentada para navegadores-alvo; não depender exclusivamente de WebGPU.
- **Assets:** `.glb` (glTF 2.0) carregados com `GLTFLoader`; compressão quando verificada; atlas de textura.
- **Física 3D:** avaliar e integrar Rapier 3D (`@dimforge/rapier3d` ou pacote de compatibilidade, conforme bundler/asset WASM). Usar colisores simplificados e character controller cinemático; **nunca presumir que Rapier renderiza gráficos**.
- **Interface:** HTML/CSS para menus e HUD, acessíveis; canvas dedicado para cena 3D.
- **Estado:** store local tipada com eventos de domínio; sistemas não editam inventário diretamente pela UI.
- **Persistência:** IndexedDB para saves versionados, localStorage apenas para opções triviais; exportar/importar arquivo JSON validado.
- **Testes:** Vitest para lógica; Playwright ou equivalente para fluxo de browser; testes manuais e perfis GPU/CPU em dispositivos reais.
- **Deploy:** GitHub Actions compila e publica em GitHub Pages; URLs de recursos geradas pelo caminho base do build, sem caminhos absolutos quebrados.

**Nota:** a escolha final do pacote de física, plugin de compressão e versões exatas será registrada no checkpoint após protótipo e testes. Fixar versões, não usar `latest` em produção.

### 17.2 Princípios de arquitetura

1. `Game` coordena ciclo de vida, mas não contém regras de movimento, IA, UI e loot ao mesmo tempo.
2. Cada subsistema tem responsabilidades, entradas, saídas e contrato de dados próprio.
3. Conteúdo é **data-driven**: mundos, armas, inimigos, ataques e missões definidos em arquivos declarativos versionados.
4. Um único relógio de simulação e passo de física fixo impedem comportamentos diferentes entre 30 e 144 FPS.
5. Renderização não decide resultados do combate, loot ou progresso.
6. Lógica do jogador e do inimigo pode ser testada sem WebGL quando possível.
7. Erros de assets são visíveis em logs e diagnóstico, com fallback seguro; não mascarar falhas críticas.
8. Um contrato de compatibilidade preserva saves, nomenclatura de IDs e integração de sistemas existentes.

### 17.3 Estrutura sugerida de pastas

```text
sucata-zero/
├── README.md
├── GDD.md                         # cópia do GDD aprovado
├── CHECKPOINT.md                  # progresso real e tarefas pendentes
├── package.json
├── package-lock.json
├── vite.config.ts
├── tsconfig.json
├── index.html
├── .github/workflows/deploy.yml
├── public/
│   ├── assets/
│   │   ├── robots/z01/
│   │   ├── robots/enemies/
│   │   ├── robots/bosses/
│   │   ├── modules/
│   │   ├── environments/w01/ ... w05/
│   │   ├── textures/
│   │   ├── sounds/
│   │   └── music/
│   └── icons/
├── src/
│   ├── main.ts
│   ├── app/GameApp.ts
│   ├── core/{Clock,Events,StateMachine,Disposable}.ts
│   ├── engine/{Renderer,SceneManager,CameraRig,PhysicsWorld}.ts
│   ├── input/{InputMap,Gamepad,TouchControls}.ts
│   ├── entities/{Entity,EntityRegistry,Actor}.ts
│   ├── player/{PlayerController,PlayerCombat,RobotAssembler}.ts
│   ├── combat/{DamageSystem,HitboxSystem,StatusEffects,Targeting}.ts
│   ├── ai/{Perception,Navigators,EnemyBrain,BossBrain}.ts
│   ├── world/{WorldStream,ZoneTriggers,Interactables,Checkpoints}.ts
│   ├── items/{Inventory,Equipment,Crafting,LootTables}.ts
│   ├── progression/{Quests,Skills,Rewards}.ts
│   ├── persistence/{SaveStore,SaveValidator,Migrations}.ts
│   ├── audio/{AudioManager,MusicDirector}.ts
│   ├── ui/{HUD,Menus,Workshop,Accessibility}.ts
│   ├── content/{items,enemies,worlds,quests,skills}/
│   └── debug/{Profiler,DebugOverlay,ErrorReporter}.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── browser/
│   └── fixtures/
└── tools/
    ├── validate-assets.mjs
    ├── validate-content.mjs
    └── check-budget.mjs
```

A disposição exata dos arquivos pode evoluir; **responsabilidades separadas, imports corretos e critérios de teste não são negociáveis**.

### 17.4 Loop principal

```ts
const FIXED_DT = 1 / 60;
const MAX_STEPS = 4;
let accumulator = 0;
let previous = performance.now();

function frame(now: number) {
  const realDt = Math.min((now - previous) / 1000, 0.1);
  previous = now;
  accumulator += realDt;

  input.poll();
  let steps = 0;
  while (accumulator >= FIXED_DT && steps < MAX_STEPS) {
    quests.preStep();
    player.fixedUpdate(FIXED_DT);
    enemies.fixedUpdate(FIXED_DT);
    physics.step(FIXED_DT);
    combat.resolveContacts();
    world.evaluateTriggers();
    accumulator -= FIXED_DT;
    steps++;
  }
  if (steps === MAX_STEPS && accumulator >= FIXED_DT) {
    accumulator = 0; // evita espiral de física; registrar métrica de step perdido
  }
  camera.update(realDt);
  animation.update(realDt);
  hud.render(state.snapshot());
  renderer.render(scene, camera.active);
  requestAnimationFrame(frame);
}
```

**Pseudocódigo arquitetural, não código integrado/testado.** Na implementação, substituir por API real da física escolhida, tratar pausa, `visibilitychange`, carregamento de regiões, eventos de perda de contexto WebGL, sincronização física → render e descarte de recursos. A simulação recebe input em uma ordem estável.

### 17.5 Grafo de cenas e carregamento

Estados globais: `boot`, `loading`, `title`, `hub`, `in_mission`, `paused`, `workshop`, `cutscene`, `game_over`. Mudança por `SceneManager` com pré-carregamento de dependências, cancelamento de download e descarte explícito de geometrias, texturas, materiais, mixers, áudios e listeners. O HUD não pode continuar registrando listeners ao trocar de fase.

Loading exibe barra baseada em progresso de arquivos conhecidos e estado de processamento, não porcentagem inventada. Erro de recurso obrigatório exibe botão **Tentar novamente** e detalhes técnicos copiáveis. O jogador não deve ver tela preta silenciosa quando um GLB falhar.

### 17.6 Máquina de estados do jogador

`Idle`, `Move`, `Sprint`, `Jump`, `Fall`, `Land`, `Dodge`, `AttackLight`, `AttackHeavy`, `Aim`, `Block`, `Parry`, `HitReact`, `Stagger`, `Interact`, `Repair`, `Disabled`. Transições possuem prioridade e cancelamento: morte > stagger > ataques > movimento normal; esquiva pode cancelar recuperação do ataque leve após janela mínima configurada. Separar locomotion blend tree de estados de ação parcial do tronco quando viável, para disparar em movimento sem quebrar pernas.

### 17.7 Eventos de domínio

Exemplos: `ENEMY_DEFEATED`, `DAMAGE_APPLIED`, `PART_LOOTED`, `ITEM_EQUIPPED`, `MODULE_ACTIVATED`, `QUEST_STAGE_COMPLETED`, `TERMINAL_UNLOCKED`, `SAVE_COMMITTED`. Eventos contêm IDs estáveis e `eventId`; recompensas importantes são **idempotentes**. Evitar eventos globais sem tipagem para tudo.

### 17.8 Contratos entre módulos

| Fonte | Evento/API | Consumidor | Regra de integridade |
|---|---|---|---|
| Física | `contact(entityA, entityB)` | combate, trigger | IDs válidos, tick de contato |
| Combate | `damageResult` | HP, FX, quests | nunca duplicar por mesmo swing |
| IA | `attackIntent` | animação, hitbox | sinal de preparação antes do dano |
| Loot | `lootTransaction` | inventário, HUD | aplicar uma única vez |
| Equipamento | `loadoutChanged` | robot assembler, stats, anim. | mudanças coerentes ou rollback |
| Missões | `rewardGranted` | inventário, save | idempotente, progressão não perdida |
| Checkpoint | `saveRequested` | SaveStore | validação e confirmação de commit |

---

## 18. Pipeline de assets e publicação

### 18.1 Entrada de modelos Meshy / Blender / origem própria

1. Receber `.glb` com licença/autor documentados; preferir fontes originais ou abertas com licença compatível.
2. Verificar tamanho, orientação, escala, materiais e texturas embutidas; corrigir em exportação quando necessário.
3. Verificar rigs, pesos de pele, clips de animação, nomes de ossos e `skinnedMesh`.
4. Remover malhas de teste, luzes e câmeras importadas desnecessárias.
5. Corrigir UV esticado, normais invertidas, peso deslocado e animação com braços abertos.
6. Fazer LOD ou redução de polígonos, sem destruir silhueta; preparar atlas, compactar texturas.
7. Validar asset isoladamente e em cena com iluminação final, shadow test e animação real.
8. Medir tamanho comprimido, triângulos, draw calls, tempo de decode e memória GPU estimada.
9. Registrar `assetId`, origem, licença, versão, tamanho, animações, sockets e dependências no manifesto.
10. Publicar via CI depois de validar que paths funcionam no GitHub Pages, inclusive carregamento dinâmico.

### 18.2 Manifesto de assets (exemplo)

```json
{
  "id": "enemy_patrol_01",
  "type": "enemy",
  "url": "assets/robots/enemies/patrol-01.glb",
  "scaleMeters": 1.85,
  "facingAxis": "+Z",
  "socketMap": {
    "weapon": "SOCKET_ARM_R",
    "sensor": "SOCKET_HEAD"
  },
  "clips": ["idle", "walk", "windup", "attack", "hit", "death"],
  "lodUrls": ["assets/robots/enemies/patrol-01-lod1.glb"],
  "required": true,
  "licenseRecord": "content/licenses/asset-sources.md"
}
```

O caminho acima é **relativo ao `base` do aplicativo** e deve ser resolvido pelo gerenciador de assets; não concatenar URLs manualmente com suposições sobre a raiz do domínio.

### 18.3 LOD, culling e texturas

- Frustum culling para objetos regulares; oclusão por setor/portas e agrupamento de arquitetura.
- `InstancedMesh` para props repetidos com mesma malha/material e sem animação individual; geometrias estáticas podem ser combinadas.
- LOD baseado em tamanho projetado na tela e não apenas em distância fixa, com histerese para evitar piscadas.
- Limitar transparências sobrepostas, emissivos excessivos, partículas densas e sombras de luzes locais.
- Texturas sRGB onde apropriado; normal/roughness em espaço correto; mipmaps e anisotropia moderada.
- Precarregar apenas região atual, módulos visíveis e próxima transição; descarregar recursos não compartilhados quando não usados.

### 18.4 Ajustes gráficos

Perfis `Baixo`, `Médio`, `Alto`, `Automático`: tamanho do buffer interno, sombras, partículas, distância de detalhes, densidade de props, antialias e efeitos. Redimensionar sem estourar o número de pixels renderizados; evitar usar indiscriminadamente pixel ratio nativo em telefones de DPI muito alto. Um controlador opcional reduz escala de renderização por etapas quando FPS sustentado cair, com teto para evitar oscilação visual.

### 18.5 Integridade e licenças

Assets externos são rastreados num inventário de fontes, com licenças e atribuições quando exigidas. Não utilizar GLB obtido de jogo comercial sem direito. Arquivos de IA devem ser inspecionados para marcas e conteúdo impróprio. Dependências open source mantêm inventário de versão, licença e vulnerabilidades; atualização é deliberada e testada, não automática em produção.

---

## 19. Salvamento, configurações e estado

### 19.1 Modelo de save

- Três slots manuais e um autosave rotativo por campanha, vinculados a `campaignId`.
- Autosave em **terminal, final de missão, retorno ao hub e transação importante de oficina**; salvar no intervalo durante exploração somente em zonas seguras quando necessário.
- Dados: `schemaVersion`, `campaignId`, `timestamp`, `regionId`, `checkpointId`, `playerStats`, `inventory`, `equipmentInstanceIds`, `unlockedBlueprints`, `skills`, `quests`, `worldFlags`, `bossFlags`, `collectibles`, `difficulty`, `playtimeSeconds`.
- Configurações de áudio, vídeo, controles e acessibilidade são separadas do progresso.
- Save não grava geometria, física inteira, frame atual ou referências circulares ao engine.

### 19.2 Exemplo de save reduzido

```json
{
  "schemaVersion": 1,
  "campaignId": "local-001",
  "regionId": "w01",
  "checkpointId": "w01-cp02",
  "player": { "level": 3, "xp": 125, "hp": 92, "energy": 100 },
  "inventory": {
    "parts": [
      { "instanceId": "part-0001", "itemId": "P11", "upgrade": 0 }
    ],
    "materials": { "scrap": 460, "refinedAlloy": 2 }
  },
  "equipment": { "rightArm": "part-0001" },
  "quests": { "1-1": "complete", "1-2": "active" },
  "flags": { "workshopUnlocked": true },
  "collectedMemoryIds": [],
  "playtimeSeconds": 900
}
```

*Exemplo de contrato, não dado real do usuário.* IDs completos e demais slots existem no esquema definitivo.

### 19.3 Robustez

Validar estrutura e intervalo de números antes de carregar; verificar referências de peça e missão; migrar versões antigas com backups, não descartar silenciosamente. A escrita do save usa transação do IndexedDB com checksum simples ou hash para diagnosticar integridade, sabendo que **isso não é proteção contra adulteração intencional**. Exportar backup local; não criar ilusão de sincronização em nuvem sem backend.

### 19.4 Retorno de aba e falhas

Ao perder visibilidade, jogo solo pausa simulação e áudio quando apropriado, solicita autosave seguro; ao retornar, reapresenta estado sem time delta enorme. Em contexto WebGL perdido, congelar input e tentar recuperar renderer/assets; se impossível, oferecer recarregar sem perder progresso persistido.

---

## 20. Desempenho, orçamento e compatibilidade

### 20.1 Metas de performance (a validar)

| Métrica | Desktop de referência | Celular médio de referência |
|---|---:|---:|
| FPS durante exploração | 60 alvo | 30 estáveis alvo |
| FPS em boss | >=45 alvo | >=30 alvo |
| 95º percentil de tempo de frame | <=25 ms | <=33,3 ms |
| Draw calls em cena comum | 150–300 alvo | 80–180 alvo |
| Triângulos visíveis em cena típica | <=350 mil alvo | <=150 mil alvo |
| Memória de assets em uso | orçamento medido | priorizar <=250 MB estimados |
| Download inicial crítico comprimido | <=12 MB alvo | <=8 MB alvo |
| Conteúdo de um setor sob demanda | <=20 MB alvo | <=12 MB alvo |

Esses valores são **alvos de projeto**; não houve medições de hardware. Ajustar os budgets após rodar nas configurações reais do usuário e em pelo menos dois celulares de diferentes capacidades. A meta de FPS não garante que celulares antigos consigam rodar o jogo.

### 20.2 Escalabilidade

- Qualidade gráfica detectada por desempenho, com escolha manual persistente.
- Diminuir sombras e buffer antes de reduzir resolução de HUD.
- Evitar criar/descartar material ou geometria dentro do loop de animação.
- `pooling` para projéteis, hit sparks e indicadores transitórios.
- Física não simula detritos cosméticos com corpos rígidos para sempre; efeitos são simplificados/temporários.
- Atualização de percepção IA fora de câmera reduzida, sem alterar resultado da luta de forma injusta.
- Animações de personagens distantes podem atualizar menos vezes; hitboxes críticas continuam coerentes.
- Carregamento de áudio/imagens ocorre com limites de concorrência e prioridade por necessidade imediata.

### 20.3 Matriz de compatibilidade planejada

| Plataforma | Browser/entrada | Critério |
|---|---|---|
| Windows 10/11 | Chrome, Edge, Firefox | mouse e teclado; resolução 1280×720+ |
| Android 11+ | Chrome | touch, orientação horizontal e retorno de aba |
| iOS 16+ | Safari | touch, áudio após gesto, memória e save |
| Desktop com gamepad | Chrome/Edge | mapeamento e desconexão sem travar |
| Baixa potência | Android médio | perfil baixo, sem travar ou forçar alta resolução |

Versões mínimas são alvos a confirmar com testes; deixar mensagem clara para hardware sem WebGL compatível, suporte insuficiente ou memória muito baixa.

---

## 21. Segurança, privacidade e limites do GitHub Pages

Por ser um jogo **single-player sem dinheiro real** servido estaticamente, toda lógica e todo save estão no cliente. Portanto:

- Não prometer impedir edição de valores de itens, atributos ou moeda por quem controla o navegador. É tecnicamente impossível garantir isso em hospedagem apenas estática sem autoridade no servidor.
- Não gravar tokens de GitHub, senhas, chaves privadas ou credenciais em HTML/JS público.
- Não carregar código arbitrário a partir de conteúdo de save, diálogos ou metadados de assets.
- Importação de saves deve validar JSON com limites de tamanho, profundidade e tipos; renderizar texto com APIs seguras, sem injetá-lo como HTML.
- Dependências devem ser fixadas, auditadas; evitar scripts de terceiros desnecessários e telemetria oculta.
- Não é necessário coletar dados pessoais. Estatísticas de performance podem ser locais; qualquer coleta remota futura exigiria informação e consentimento apropriados.
- Nenhuma recompensa de jogo depende de acesso a servidor externo ou página de anúncio.

Se um dia houver **ranking competitivo, trading de peças, compras ou anticheat real**, será necessário backend seguro com validação autoritativa. Não incluir isso no escopo agora.

---

## 22. Estruturas de dados e conteúdo configurável

### 22.1 Definição de item

```json
{
  "id": "P12",
  "name": "Martelo de Prensa",
  "slot": "rightArm",
  "tier": 1,
  "weight": 24,
  "tags": ["kinetic", "heavy"],
  "stats": { "attack": 22, "stagger": 18, "heatPerUse": 0 },
  "actions": ["heavy_slam"],
  "modelAssetId": "part_hammer_press",
  "animationSetId": "heavy_arm_v1",
  "craft": { "scrap": 250, "refinedAlloy": 3 },
  "essential": false
}
```

### 22.2 Definição de ataque

```json
{
  "id": "heavy_slam",
  "animationClip": "attack_heavy",
  "startupSeconds": 0.45,
  "activeSeconds": 0.15,
  "recoverySeconds": 0.35,
  "energyCost": 22,
  "damageMultiplier": 1.65,
  "hitboxSocket": "SOCKET_ARM_R",
  "hitboxId": "hammer_arc",
  "maxVictims": 3,
  "cancelWindowSeconds": 0.22,
  "telegraphEffect": "swing_windup"
}
```

### 22.3 Definição de missão

```json
{
  "id": "1-2",
  "regionId": "w01",
  "title": "O Primeiro Braço",
  "requires": ["1-1"],
  "stages": [
    { "id": "find", "type": "reach_location", "target": "patrol_yard" },
    { "id": "fight", "type": "defeat_target", "target": "e02_quest" },
    { "id": "equip", "type": "equip_item", "target": "P02" }
  ],
  "rewards": [{ "type": "scrap", "amount": 120 }],
  "checkpointAfter": true
}
```

**Nota de integridade:** `equip_item` faz parte da enumeração de objetivos definida na seção 11.1. `P02` precisa ser ganho de forma garantida no inimigo de missão, evitando travamento por RNG.

### 22.4 Definição de inimigo e boss

```json
{
  "id": "E02",
  "archetype": "patrol",
  "assetId": "enemy_patrol_01",
  "hp": 65,
  "attack": 10,
  "defense": 5,
  "stability": 30,
  "perception": { "range": 15, "fieldOfViewDegrees": 100 },
  "behaviorProfile": "melee_guard_v1",
  "attacks": ["baton_horizontal", "baton_charge"],
  "lootTableId": "loot_e02",
  "faction": "salvagers"
}
```

**Regra:** nomes de IDs são fixos no conteúdo, derivados das definições e nunca de textos traduzidos. O validador verifica: IDs duplicados, arquivos ausentes, referências inválidas, recompensas repetíveis, estados impossíveis, missões em ciclo e links de animação inexistentes.

---

## 23. Testes — qualidade mensurável, não suposições

### 23.1 Testes de unidade

- Dano: multiplicadores neutros, resistências, redução limitada, impossibilidade de dano negativo.
- Estado de jogador: esquiva não ocorre com energia insuficiente; morte cancela ataques; transições válidas.
- Loot: tabela retorna recompensa obrigatória do boss; rolagem não duplica item por evento.
- Inventário: equipar, duas mãos, massa máxima, desmontagem, saldo negativo, item essencial.
- Progressão: XP e level-up, pré-requisitos de circuito, recompensas idempotentes.
- Quest: etapa só é concluída por evento válido e não pode ser dada duas vezes.
- Save: versionamento, migração, schema corrompido, slot inexistente, backup.
- Catálogo: referências de asset, ataques e missões sem ciclos ou chaves inválidas.

### 23.2 Testes de integração

| Caso | Resultado esperado |
|---|---|
| Carregar 1-1, mover e saltar | cápsula física correta; não atravessar o solo |
| Atacar E02, pegar peça, equipar | peça some do chão, existe no inventário e muda Z-01 |
| Entrar oficina, cancelar troca | atributos e custos não mudam |
| Trocar módulo e voltar ao combate | animação, arma, hitbox e som coerentes |
| Receber golpe durante transição | HP reduz uma vez e estado sai corretamente |
| Concluir missão e recarregar | recompensa não duplica e objetivo continua concluído |
| Trocar setor 10 vezes | listeners, meshes e texturas sem crescimento indefinido |
| Falhar um arquivo de inimigo | erro visível, fase não inicia silenciosamente quebrada |
| Pausar e voltar de outra aba | sem física acelerada ou áudio duplicado |
| Terminar B01 e reiniciar jogo | boss marcado morto, Braço TENSOR preservado |

### 23.3 Testes visuais e manuais

- Inspecionar animações completas em modelo real, não somente em preview isolado.
- Capturar prints nas regiões e comparar escala de personagens, leitura de HUD, clipping e sombras.
- Testar corredor apertado, escada, degrau, rampa, ponte, queda, câmera colidida e lock-on.
- Testar orientação do celular, touch simultâneo, menu com safe area e perda de foco.
- Confirmar sem arquivos 404, erros de import dinâmico, asset GLB com CORS errado ou app com tela preta.
- Testar Chrome + Edge + Firefox + Android Chrome + Safari iOS antes do lançamento público.

### 23.4 Critérios de aceite do primeiro vertical slice

**VS-01: 1-1 + 1-2 + arena de teste de boss**. Só é considerado pronto quando:

- [ ] Iniciar jogo pelo menu com loading real e opção de configuração básica.
- [ ] Z-01 move, corre, salta, cai e colide de forma consistente.
- [ ] Câmera acompanha o personagem e evita clipping com obstáculos.
- [ ] Um inimigo patrulha, detecta, persegue, sinaliza, ataca, sofre dano e morre com animações reais.
- [ ] Z-01 bloqueia, esquiva e acerta com hitbox ligada à animação.
- [ ] Peça inimiga aparece no chão, é coletada e altera corpo, atributos e ataque.
- [ ] Oficina permite comparar, equipar, retirar e salvar sem duplicações.
- [ ] UI de PC e celular permite jogar o trecho inteiro sem teclado no celular.
- [ ] Checkpoint e save preservam missão, peça e posição segura após recarregar.
- [ ] Sem erros 404, exceptions fatais ou regressões nos comandos.
- [ ] Teste real de FPS e consumo registrado em pelo menos desktop e um celular.
- [ ] Build pública abre no caminho correto do GitHub Pages.

**Não confundir** checklist planejada com itens concluídos: todos permanecem desmarcados até execução e evidência.

---

## 24. Roadmap de produção (marcos e gates)

### M0 — Fundação executável

**Entregáveis:** projeto Vite/TypeScript, Three.js, cena básica, entrada unificada, física iniciada, câmera, mensagens de erro, pipeline GLB, GitHub Pages de teste, estrutura de checks.  
**Gate:** carregar uma cena 3D, controlar cápsula, colidir com chão e parede, alternar orientação e construir sem warnings fatais.

### M1 — Vertical slice: O Primeiro Braço

**Entregáveis:** Z-01 com animações base, 1-1/1-2 jogáveis, E02 completo, combate leve/pesado/esquiva, loot garantido, oficina 2 slots, save, HUD, touch funcional.  
**Gate:** cumprir 12 critérios da seção 23.4; teste manual reproduzível e uma gravação/capturas.

### M2 — Ferro-Velho completo

**Entregáveis:** 1-3, 1-4 e 1-5; FERRO-7; B01 em três fases; P07 guincho; hub e 2 missões extras.  
**Gate:** completar Mundo 1 do início ao fim, resgatar após derrota, trocar armas e entrar no Mundo 2 sem erros.

### M3 — Sistemas de campanha

**Entregáveis:** árvore de circuitos, modos de dificuldade, inventário completo, mapas e mapa de viagem, três builds, todas as capacidades de dados/validação de missões, save migrável.  
**Gate:** campanha de demonstração com 5 builds possíveis, progressão persistente e nenhuma missão duplicada após reload.

### M4 — Cidade Morta + Pântano

**Entregáveis:** missões 2-1 a 3-5; E06–E15, B02/B03; P19/P21/P25; dois arcos narrativos; perigo corrosivo e navegação vertical.  
**Gate:** conseguir atravessar o jogo até 3-5 sem softlock, derrotar bosses com duas builds e validar carga em celular.

### M5 — Forja Infernal + Núcleo Central

**Entregáveis:** mundos 4 e 5, E16–E25, B04/B05, P28/P30, sistema de escolhas e três finais.  
**Gate:** concluir campanha e abrir cada final com saves de teste e sem perda de habilidades.

### M6 — Polimento e compatibilidade

**Entregáveis:** todas as animações e sons finais, sombras/LODs, modos gráficos, controle/gamepad, legendas, correções de bugs e telemetria local de performance.  
**Gate:** matriz de testes com evidência, ausência de bloqueadores críticos, FPS alvo ou exceções documentadas.

### M7 — Publicação 1.0 e manutenção

**Entregáveis:** changelog, notas de versão, tutorial leve, documentação, créditos de assets, build estático, release tag, backups de save e checklist de regressão.  
**Gate:** versão pública verificada após publicação: carregamento no domínio publicado, cenas, saves, assets e compatibilidade mínima.

**Estimativa temporal:** não fixar prazo de lançamento até completar M1 e medir produtividade real; custos de produção de 25 missões e animações 3D são altos. Se houver restrição de tempo, lançar **Mundo 1 completo como Episódio 1**, preservando a estrutura para expansão.

### 24.1 Política de corte de escopo

Em atraso, cortar primeiro: cosméticos opcionais, 2º/3º presets, missões secundárias acima de 1 por região, arenas especiais e dublagem. **Não cortar:** movimento, colisão, IA legível, animação, salvamento, capacidade de equipar, recompensa garantida de missão e ajustes de acessibilidade básicos. Se não houver recursos para cinco mundos de qualidade, lançar menos mundos completos — nunca cinco mapas vazios.

---

## 25. Tarefas técnicas prioritárias e dependências

| Prioridade | Tarefa | Depende de | Evidência esperada |
|---|---|---|---|
| P0 | Boot + renderer + erro controlado | M0 | build/URL funcionam |
| P0 | Controle 3D + câmera + colisão | física + input | vídeo teste sem atravessar paredes |
| P0 | Sistema de assets GLB validado | renderer | modelo com animação em cena |
| P0 | FSM player + ataques com hitboxes | input + animação | teste de 10 combos sem ataque fantasma |
| P0 | IA E02 + morte + loot | FSM + combate | patrulha, telegráfica, morre e dropa |
| P0 | Montagem modular em tempo real | catálogo + rig | braço visual e stats mudam juntos |
| P0 | Oficina transacional + save | estado do jogo | reload sem duplicar peças |
| P0 | Controles touch mínimos | input | jogar trecho sem teclado |
| P1 | Hub, quests, checkpoints | persistência | progressão de missão sem softlock |
| P1 | Arena B01 e fases | IA boss | boss vencível e drop garantido |
| P1 | Árvore de habilidades e crafting | inventário | custos e pontos coerentes |
| P1 | Setores 2–5 e narrativas | conteúdo + engine estável | gate de cada mundo |
| P1 | Perfil baixo + streaming de assets | monitoramento | FPS / download medidos |
| P2 | Presets, arenas de desafio, cosméticos | sistemas completos | sem regressões |
| P2 | Recursos PWA offline e melhorias de acessibilidade avançada | release estável | sem cache desatualizado |

### 25.1 Riscos e mitigação

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Modelos GLB pesados e travados em T-pose | alta | alto | pipeline obrigatório de rig + animação + preview integrado |
| Física e visual dessincronizados | média | alto | passo fixo, colisor único de referência, testes em FPS variados |
| Combinações de peças quebram animações | alta | alto | perfis limitados de rig; sockets; QA por combinação |
| 5 mundos grandes demoram a produzir | alta | alto | setores pequenos autorados; episódio 1 verticalmente completo |
| Telas pretas por imports/caminhos no Pages | média | alto | `base` explícito, build CI e teste no URL publicado |
| Mobile fica lento | alta | alto | LOD, sombras seletivas, qualidade baixa e budget desde M0 |
| Save corrompe ou perde itens | média | crítico | transações, backup, migração, testes e exportação |
| Escopo aumenta sem QA | alta | crítico | gates obrigatórios, freeze de feature por marco |
| Armação de boss cria softlock | média | alto | checkpoints, habilidades essenciais garantidas e matrizes de build |
| Assets externos apresentam licença incerta | média | alto | registro de origem/licença e substituição antecipada |

---

## 26. Processo de desenvolvimento e checkpoint

### 26.1 Regras do trabalho

1. Antes de modificar código, ler GDD, CHECKPOINT, repo, arquitetura e bugs abertos.
2. Escolher um subsistema por ciclo, explicar objetivo, arquivos afetados e risco.
3. Entregar mudança funcional com testes automatizados quando possível e manual quando necessário.
4. Verificar regressões em controle, combate, equipamento, animações, save, carregamento e celular.
5. Atualizar GDD apenas se mudança de design for aprovada; atualizar CHECKPOINT com resultados reais em toda rodada.
6. Publicar GitHub **apenas com repositório correto e autorização/acesso válido**, indicando hash/URL do commit e resultado real; não dizer “publicado” por apenas ter gerado arquivo.
7. Se teste falhar, relatar evidências e pendência, sem marcar concluído.

### 26.2 Modelo de entrada do checkpoint

```markdown
## Ciclo AAAA-MM-DD — [ID do marco e subsistema]
- Objetivo:
- Estado anterior / commit-base:
- Arquivos inspecionados:
- Diagnóstico de causa raiz:
- Alterações de código:
- Assets adicionados/removidos (origem/licença/tamanho):
- Testes executados (comandos + saída resumida):
- Testes manuais (dispositivo/browser + evidência):
- Regressões detectadas e corrigidas:
- Métricas antes/depois (se medidas):
- Deploy (não feito / link publicado + commit):
- Pendências e riscos:
- Próxima tarefa recomendada:
```

### 26.3 Definição de pronto (Definition of Done)

Uma tarefa é **concluída** quando código integrado roda, requisitos de aceite passam, não há erro console relevante, recursos carregam, save não regride, há resultado dos testes e checkpoint atualizado. Uma tarefa de arte exige demonstração real da animação e renderização no jogo. Atualizar somente cor/fonte sem resolver falha arquitetural não atende à entrega.

---

## 27. Critérios de equilíbrio e playtest

### 27.1 Perfis de jogador a testar

- Iniciante no gênero: completa 1-2 sem ajuda externa, identifica loot e oficina.
- Jogador experiente: enfrenta boss usando esquiva e leitura de ataques, não só força bruta.
- Jogador explorador: reconhece rotas bloqueadas e sabe como retornar.
- Jogador mobile: consegue mover, girar câmera, atacar e esquivar simultaneamente sem botões sobrepostos.

### 27.2 Dados de QA (somente locais e voluntários)

Tempo para primeiro combate, tempo para primeira equipagem, vezes que morre em boss, proporção de combos acertados, FPS por setor, falhas ao carregar assets, tempo para concluir missão, dificuldade de ler objetivo, número de vezes que inicia menu de oficina e sai sem entender. Guardar dados sem identificar pessoa; se não houver implementação de métricas, anotar manualmente em planilha de playtest.

### 27.3 Ajuste de dificuldade

Se mais de 30% dos testadores iniciantes não conseguirem equipar a primeira peça após derrotar E02, revisar interface e tutorial antes de aumentar recompensas. Se boss tiver taxa de morte alta, verificar leitura de telegráficos e câmera antes de reduzir vida. Se muitos ignorarem árvores de habilidades, aumentar clareza de feedback, não forçar menus a cada XP.

---

## 28. Plano da primeira entrega jogável — escopo preciso

**Nome:** `SUCATA ZERO — Protótipo M1 (O Primeiro Braço)`.

**Conteúdo obrigatório:**

1. Menu funcional, opções gráficas básicas e controle de áudio.
2. Uma pequena área industrial detalhada, com início, parede, rampa, salto, sucata e terminal.
3. Z-01 renderizado com animações reais (sem T-pose): idle, andar, correr, saltar, ataque leve, golpe pesado, esquiva, dano e morte.
4. Câmera suave de terceira pessoa com colisão e lock-on inicial.
5. E02 Patrulheiro de Trilho com patrulha, suspeita, perseguição, ataque telegrafado e morte.
6. HP/energia, sistema de hitbox por animação, dano, esquiva e checkpoint.
7. Drop garantido de P02, oficina e montagem do novo visor; upgrade visível e efeito de sensor.
8. Missão 1-1 e 1-2 com objetivos e recompensas que não duplicam.
9. Teclado/mouse, gamepad básico e controle touch funcional sem teclado.
10. Save/Load com testes de recarregamento, erros claros de asset e build em GitHub Pages de teste.

**Fora da primeira entrega:** cinco mundos, boss final, crafting profundo, 30 peças implementadas, dublagem, multiplayer e todos os visuais definitivos.

### 28.1 Sequência de implementação dentro do M1

1. Boot e renderer com geometria de teste.
2. Física e câmera com cápsula provisória (placeholder explícito).
3. Input desktop + touch.
4. GLB e pipeline de animação funcionando.
5. FSM do jogador e combate real.
6. E02 com IA e hitboxes.
7. Quest/drop/inventário.
8. Oficina e montagem visual.
9. Persistência e UI.
10. Testes, profiling, correções e publicação quando autorizada.

**Não iniciar Mundo 2 enquanto M1 apresentar erros de colisão, T-pose, drops duplicados, save quebrado, controles touch inoperantes ou falhas de carregamento.**

---

## 29. Glossário

- **GDD:** especificação de design do jogo.
- **Vertical slice:** trecho pequeno que representa os sistemas e a qualidade do produto completo.
- **GLB/glTF:** formato de entrega de cena/modelo/animação 3D.
- **LOD:** versões simplificadas de um modelo para diferentes tamanhos na tela.
- **Hitbox:** volume temporário de acerto ativado pelo ataque.
- **Hurtbox:** volume que pode receber dano.
- **Telegráfico:** sinal visual/sonoro anterior ao ataque inimigo.
- **I-frame:** intervalo curto em que o personagem não recebe dano.
- **FSM:** máquina de estados finitos de jogador, inimigos e bosses.
- **Gate:** condição mecânica para desbloquear determinada rota.
- **Softlock:** situação em que o jogo continua aberto, mas a progressão fica impossível.
- **Idempotente:** operação que, repetida, não gera recompensa ou efeito duplicado.
- **Budget:** teto de uso planejado de recursos gráficos e computacionais.

## 30. Fontes técnicas oficiais para implementação

Referências de tecnologia, **não** fontes de conteúdo narrativo do jogo:

- Three.js — `GLTFLoader`: <https://threejs.org/docs/pages/GLTFLoader.html>
- Three.js — `InstancedMesh`: <https://threejs.org/docs/pages/InstancedMesh.html>
- Three.js — otimizar muitos objetos: <https://threejs.org/manual/pages/optimize-lots-of-objects.html>
- Three.js — desenho responsivo e limites de resolução: <https://threejs.org/manual/pages/responsive.html>
- Rapier JS — inicialização e WASM: <https://rapier.rs/docs/user_guides/javascript/getting_started_js/>
- GitHub Pages — documentação oficial: <https://docs.github.com/en/pages/getting-started-with-github-pages>

---

## 31. Decisões em aberto (não bloqueiam M0)

1. Identidade exata da silhueta do Z-01 e das cinco sentinelas: confirmar em concept art antes da produção de GLB final.
2. Biblioteca definitiva de física e formato de build WASM, conforme teste em Android/iOS.
3. Implementação do movimento especial de esteiras em escadas muito estreitas; requer protótipo.
4. Narração em voz ou somente legendas/sons de robô; legenda é P1, voz é P2.
5. Definição de hardware-alvo concreto após primeiro teste em celulares reais.
6. Nome/URL do repositório da nova produção, quando for escolhido, sem assumir que qualquer repositório anterior deve ser substituído.

**Próxima ação autorizada por este documento:** iniciar M0 com base técnica e controle de personagem, sem afirmar implementação ou publicação já realizada.

---

**Fim do GDD v1.0.**

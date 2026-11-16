// Textos narrativos do Episódio 1 (PT-BR). Falas curtas, legíveis em tela pequena.
export interface Line { who: 'PÍXEL' | 'FERRO-7' | 'Z-01' | 'SISTEMA' | 'COMPACTADOR'; text: string; dur?: number }

export const INTRO: Line[] = [
  { who: 'SISTEMA', text: 'REINICIALIZAÇÃO... unidade Z-01 — integridade 31%.', dur: 3 },
  { who: 'PÍXEL', text: 'Ei! Ei! Você ligou! Achei que era só mais uma lata fria.', dur: 3.4 },
  { who: 'PÍXEL', text: 'Sou PÍXEL. Você tá no Ferro-Velho 09... e sem o braço direito, foi mal.', dur: 3.8 },
  { who: 'PÍXEL', text: 'A Prensa recicla tudo que fica parado. Bora sair daqui. Suba pelas caixas!', dur: 3.8 },
];

export const MEMORIES: Record<string, { title: string; lines: string[] }> = {
  m1: { title: 'Registro 01 — Ordem de serviço', lines: ['UNIDADE Z-01 // classe: manutenção autônoma.', 'Tarefa: inspecionar a Prensa Central do Setor 09.', 'Observação do técnico: "Ela anda ouvindo coisas que não deveria."'] },
  m2: { title: 'Registro 02 — Diário de turno', lines: ['As linhas de triagem foram travadas por ordem superior.', 'Os patrulheiros agora carregam bastões de descarga.', 'Ninguém mais desce ao pátio depois do apito.'] },
  m3: { title: 'Registro 03 — Alarme', lines: ['ALERTA: Núcleo-Mãe solicitou reciclagem total do setor.', 'Unidades com consciência ativa: marcar para compactação.', 'Z-01... marcado.'] },
  m4: { title: 'Registro 04 — Mensagem gravada', lines: ['"Se alguém ouvir isto: escondi o esquema do martelo no guindaste."', '"FERRO-7 sabe consertar qualquer coisa. Encontre-o."', '— assinatura ilegível'] },
  m5: { title: 'Registro 05 — Coordenadas', lines: ['Rota de evacuação: Cidade Morta, plataforma norte.', 'Sinal de rádio fraco... alguém ainda transmite de lá.', 'Fim do registro.'] },
};

export const LINES = {
  firstMove: { who: 'PÍXEL', text: 'Isso! Agora as caixas — Espaço/⤒ pra pular.', dur: 3 } as Line,
  crate: { who: 'PÍXEL', text: 'Sucata! É a moeda daqui. Guarde bem: perder tudo dói.', dur: 3.2 } as Line,
  yard: { who: 'PÍXEL', text: 'Olha lá: um Patrulheiro. O braço dele parece do seu tamanho...', dur: 3.4 } as Line,
  yardTip: { who: 'PÍXEL', text: 'Quando o bastão brilhar âmbar, esquiva! Depois bata.', dur: 3.2 } as Line,
  drop: { who: 'PÍXEL', text: 'Um Punho Rebitador! Leva até a bancada e monta em você.', dur: 3.4 } as Line,
  equipped: { who: 'PÍXEL', text: 'Olha esse braço! Agora você tem combo e golpe PESADO.', dur: 3.4 } as Line,
  plateHint: { who: 'PÍXEL', text: 'Aquela chapa âmbar está rachada. Um golpe pesado resolve.', dur: 3.4 } as Line,
  triage: { who: 'PÍXEL', text: 'A Linha de Triagem! Três condutores ligam o elevador. Cuidado com as prensas.', dur: 4 } as Line,
  conductor: { who: 'PÍXEL', text: 'Um a menos!', dur: 1.6 } as Line,
  lift: { who: 'PÍXEL', text: 'Elevador destravado! O galpão da oficina fica logo depois.', dur: 3.2 } as Line,
  ambush: { who: 'PÍXEL', text: 'Emboscada! Mantenha distância e trave a mira [Tab/◎].', dur: 3.2 } as Line,
  ambush2: { who: 'PÍXEL', text: 'Segunda leva — o Carregador tem as costas expostas!', dur: 3.2 } as Line,
  cleared: { who: 'PÍXEL', text: 'Limpo! Tem alguém naquela jaula...', dur: 2.8 } as Line,
  ferroFree: { who: 'FERRO-7', text: 'Hm. Faz tempo que ninguém me tira de uma gaiola. Obrigado, latinha.', dur: 3.8 } as Line,
  ferroHub: { who: 'FERRO-7', text: 'Essa bancada é sua agora. Monto, conserto e fabrico — se tiver sucata.', dur: 3.8 } as Line,
  ferroTools: { who: 'FERRO-7', text: 'Perdi três ferramentas pelo ferro-velho. Ache-as e eu reforço sua carcaça.', dur: 4 } as Line,
  bossDoor: { who: 'PÍXEL', text: 'Depois desse portão fica O COMPACTADOR. Salve no terminal antes.', dur: 3.6 } as Line,
  bossIntro: { who: 'COMPACTADOR', text: 'UNIDADE Z-01. MARCADA PARA COMPACTAÇÃO.', dur: 3 } as Line,
  bossTip: { who: 'PÍXEL', text: 'Ele é lento pra virar. Faça ele investir contra as colunas!', dur: 3.6 } as Line,
  boss2: { who: 'COMPACTADOR', text: 'SOBRECARGA. ELIMINAR.', dur: 2.4 } as Line,
  boss3: { who: 'PÍXEL', text: 'A placa caiu! O núcleo está exposto de vez!', dur: 3 } as Line,
  bossDown: { who: 'PÍXEL', text: 'VOCÊ CONSEGUIU! E olha — ele tinha um braço de guincho!', dur: 3.6 } as Line,
  tensor: { who: 'PÍXEL', text: 'Equipe o TENSOR na estação e puxe aquela âncora com [R].', dur: 3.6 } as Line,
  anchor: { who: 'PÍXEL', text: 'Puxa! PUXA! ...Abriu! A Cidade Morta está logo ali.', dur: 3.4 } as Line,
  death: { who: 'PÍXEL', text: 'Te remontei no último terminal. Sua sucata perdida ficou marcada.', dur: 3.6 } as Line,
  noArm: { who: 'PÍXEL', text: 'Sem braço direito só dá pra arranhar. Precisamos de uma peça!', dur: 3.2 } as Line,
  scrapSense: { who: 'PÍXEL', text: 'O Olho de Sucata mostra caches escondidos — procure o brilho âmbar.', dur: 3.6 } as Line,
};

export const ENDING = {
  title: 'EPISÓDIO 1 CONCLUÍDO',
  lines: [
    'O portão da Prensa range e se abre para a noite.',
    'Ao norte, as luzes trêmulas da Cidade Morta.',
    'Z-01 olha para o próprio braço — remendado, emprestado, seu.',
    '"Ainda não estou inteiro", ele pensa. "Mas estou funcionando."',
  ],
  next: 'Próximo: MUNDO 2 — CIDADE MORTA (em desenvolvimento)',
};

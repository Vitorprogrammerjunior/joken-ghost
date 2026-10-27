// Fases da campanha, com história, cenário e ondas de inimigos.
// `ending` mostra um texto de ENDINGS ao vencer; `bonus` marca a fase extra liberada por `reward`.
// `coinScale` multiplica as moedas da fase (as mais difíceis pagam mais).

export const LEVELS = [
  {
    id: 1,
    coinScale: 0.8,
    name: 'Floresta Maldita',
    scenery: 'floresta',
    location: 'tile/loc_floresta',
    intro: [
      '1ª Fase — A Mansão na Colina',
      '',
      'O caçador recebe uma carta misteriosa sobre',
      'estranhos acontecimentos em uma antiga mansão.',
      '',
      'Ele segue pela floresta à noite, armado com',
      'suas três armas espirituais:',
      'Estaca, Aspirador e Cruz,',
      '',
      'determinado a investigar os relatos...',
    ],
    dialogue: [
      { who: 'hunter', text: '...Que floresta mais estranha.\nSinto calafrios só de caminhar por aqui.' },
      { who: 'hunter', text: 'Espera — sinto uma presença!\nIsso é energia sobrenatural!' },
      { who: 'hunter', text: 'São fantasmas. SÃO FANTASMAS!\nComo fui parar nessa maldita floresta?!' },
      { who: 'hunter', text: 'Respira fundo... você treinou pra isso.\nEstaca vence Maldição, Aspirador vence\nPossessão e Cruz vence Assombração.' },
      { who: 'hunter', text: 'Muito bem, seus malditos espíritos —\nquem vai ser o primeiro?!' },
    ],
    waves: [['fantasma'], ['fantasma', 'fogo_fatuo']],
  },
  {
    id: 2,
    coinScale: 0.9,
    name: 'Pátio da Mansão',
    scenery: 'patio',
    location: 'tile/loc_patio',
    intro: [
      '2ª Fase — Os Portões de Ferro',
      '',
      'Ao sair da floresta, o caçador encontra',
      'os portões enferrujados da mansão.',
      '',
      'Morcegos rondam as janelas acesas',
      'e as estátuas do jardim parecem...',
      '',
      '...observar cada um de seus passos.',
    ],
    dialogue: [
      { who: 'hunter', text: 'Então essa é a mansão da carta.\nAlguém deixou as luzes acesas...' },
      { who: 'hunter', text: 'Essas gárgulas... eu podia jurar\nque aquela ali estava virada pro outro lado.' },
      { who: 'hunter', text: 'Dica de caçador: abra o Monstruário.\nCada criatura tem uma fraqueza!' },
    ],
    waves: [['morcego', 'morcego'], ['gargula', 'morcego']],
  },
  {
    id: 3,
    coinScale: 1,
    name: 'Interior da Mansão',
    scenery: 'mansao',
    location: 'tile/loc_mansao',
    intro: [
      '3ª Fase — O Salão Principal',
      '',
      'A porta range e se fecha sozinha.',
      '',
      'Lá dentro, velas se acendem por conta própria,',
      'retratos acompanham o caçador com o olhar',
      'e um brinquedo antigo começa a cantar.',
      '',
      'Não há mais volta.',
    ],
    dialogue: [
      { who: 'hunter', text: 'Que lugar... esses retratos\nestão me encarando?' },
      { who: 'hunter', text: 'Uma boneca? Aqui?\nEla... ela está sorrindo pra mim.' },
      { who: 'hunter', text: 'E essa armadura se mexeu.\nPerfeito. Simplesmente perfeito.' },
    ],
    waves: [['boneca', 'fantasma'], ['armadura', 'boneca']],
  },
  {
    id: 4,
    coinScale: 1.1,
    name: 'Câmara do Mal',
    scenery: 'camara',
    location: 'tile/loc_camara',
    intro: [
      '4ª Fase — A Câmara do Mal',
      '',
      'No porão da mansão, um círculo de runas',
      'brilha em vermelho sob tochas tremulantes.',
      '',
      'Uma risada ecoa pelas paredes de pedra.',
      '',
      'O dono da mansão finalmente se revela...',
    ],
    dialogue: [
      { who: 'hunter', text: 'Então é aqui que tudo começa.\nEsse círculo é a fonte dos fantasmas!' },
      { who: 'kastle', text: 'HA HA HA! Um visitante!\nBem-vindo ao meu humilde espetáculo!' },
      { who: 'kastle', text: 'Eu sou KASTLE, o Bobo da Corte!\nVamos brincar de pedra, papel... e MORTE!' },
      { who: 'hunter', text: 'Brincadeira acabou, palhaço.\nSeu show termina hoje!' },
    ],
    waves: [['morcego', 'fantasma', 'fogo_fatuo'], ['kastle']],
    ending: 'ato1',
  },

  // ═══════════════ Ato II — O Reino das Sombras ═══════════════
  {
    id: 5,
    coinScale: 1.2,
    name: 'Cemitério Esquecido',
    scenery: 'cemiterio',
    location: 'tile/loc_cemiterio',
    music: 'sombras',
    intro: [
      '5ª Fase — O Cemitério Esquecido',
      '',
      'Atrás da mansão, um portão enferrujado',
      'leva a um cemitério que não aparece em mapa nenhum.',
      '',
      'A terra das covas está remexida.',
      'Algo saiu delas... e não foi para descansar.',
    ],
    dialogue: [
      { who: 'hunter', text: 'Então a risada do Kastle veio daqui.\nQue cheiro de terra molhada...' },
      { who: 'hunter', text: 'As covas estão vazias!\nOs mortos estão andando por aí.' },
      { who: 'hunter', text: 'Fiquem de olho nas pistas: um zumbi\nque perde costuma trocar de golpe.' },
    ],
    waves: [['zumbi', 'corvo'], ['zumbi', 'corvo', 'zumbi']],
  },
  {
    id: 6,
    coinScale: 1.3,
    name: 'Catacumbas',
    scenery: 'catacumbas',
    location: 'tile/loc_catacumbas',
    music: 'sombras',
    intro: [
      '6ª Fase — As Catacumbas',
      '',
      'Uma escada sob a capela desce',
      'até túneis forrados de ossos.',
      '',
      'Lá no fundo, alguém cava sem parar,',
      'cantarolando uma música de ninar.',
    ],
    dialogue: [
      { who: 'hunter', text: 'Paredes de crânios. Que decoração\nencantadora...' },
      { who: 'coveiro', text: 'Mais um visitante? Que bom!\nEu ADORO cavar covas novas.' },
      { who: 'coveiro', text: 'Meus ajudantes vão te mostrar\no caminho... para baixo da terra!' },
      { who: 'hunter', text: 'Se você chamar ajuda, eu derrubo\num por um. Pode vir!' },
    ],
    waves: [['esqueleto', 'mumia'], ['coveiro']],
  },
  {
    id: 7,
    coinScale: 1.4,
    name: 'Torre do Relógio',
    scenery: 'torre',
    location: 'tile/loc_torre',
    music: 'sombras',
    intro: [
      '7ª Fase — A Torre do Relógio',
      '',
      'As catacumbas terminam numa torre',
      'onde o tempo anda para os dois lados.',
      '',
      'A lua ficou vermelha.',
      'E alguém lá em cima está uivando.',
    ],
    dialogue: [
      { who: 'hunter', text: 'Engrenagens, sinos e... pegadas de lobo?' },
      { who: 'relojoeiro', text: 'TIC. TAC. Você chegou cedo.\nOu atrasado? Para mim, tanto faz.' },
      { who: 'relojoeiro', text: 'Eu sempre ataco duas vezes:\numa no tempo certo e outra fora dele!' },
      { who: 'hunter', text: 'Então eu vou ter que acertar\nantes que o seu relógio bata.' },
    ],
    waves: [['lobisomem', 'banshee'], ['relojoeiro']],
  },
  {
    id: 8,
    coinScale: 1.5,
    name: 'Portal das Sombras',
    scenery: 'portal',
    location: 'tile/loc_portal',
    music: 'sombras',
    intro: [
      '8ª Fase — O Portal das Sombras',
      '',
      'No alto da torre gira um portal roxo.',
      'Do outro lado, um trono feito de lamentos.',
      '',
      'É ali que mora quem puxava as cordas',
      'do Bobo da Corte desde o começo.',
    ],
    dialogue: [
      { who: 'morgana', text: 'Então você é o caçador que\ncalou o meu bobo...' },
      { who: 'morgana', text: 'Eu sou MORGANA, a Rainha Banshee.\nCada grito meu é uma mentira.' },
      { who: 'hunter', text: 'Então eu vou parar de ouvir\ne começar a ler os seus golpes.' },
      { who: 'morgana', text: 'Leia, se conseguir!\nHA... HAAAAAAA!' },
    ],
    waves: [['banshee', 'corvo'], ['morgana']],
    ending: 'final',
  },

  // ═══════════════ Fase bônus ═══════════════
  {
    id: 9,
    coinScale: 2,
    name: 'Cripta Secreta',
    scenery: 'cripta',
    location: 'tile/loc_cripta',
    music: 'sombras',
    bonus: true,
    reward: 'cripta',
    mods: [{ mult: { enemyHpMult: 1.15 } }],
    intro: [
      'Fase Bônus — A Cripta Secreta',
      '',
      'Uma passagem escondida atrás de um retrato',
      'leva a uma cripta cheia de troféus de caça.',
      '',
      'Os piores monstros da mansão estão aqui,',
      'mais fortes e mais ricos do que nunca.',
    ],
    dialogue: [
      { who: 'hunter', text: 'Um desafio de verdade, finalmente.\nAs moedas aqui valem o dobro!' },
      { who: 'kastle', text: 'Sentiu saudade, caçador?\nEu voltei só para esta festa!' },
    ],
    waves: [['armadura', 'lobisomem', 'mumia'], ['gargula', 'banshee', 'boneca'], ['kastle']],
  },
];

/** Depois de Kastle: a história continua no Ato II. */
const ACT_ONE = [
  'Com um último grito, Kastle se desfaz em fumaça.',
  '',
  'Mas a risada dele continua ecoando...',
  'e vem de fora da mansão.',
  '',
  '"Você acha que eu era o dono desta casa?',
  ' Eu era só o BOBO da corte, caçador..."',
  '',
  'Atrás da mansão, um portão se abre sozinho.',
  '',
  'FIM DO ATO I',
];

const FINAL = [
  'O grito de Morgana se transforma em silêncio.',
  '',
  'O portal se fecha e, um a um,',
  'os espíritos da mansão finalmente descansam.',
  '',
  'O caçador sai pelos portões ao amanhecer,',
  'com a mochila vazia e o coração cheio.',
  '',
  'FIM... ou será que alguém ainda caça à noite?',
];

/** Textos mostrados depois de certas fases. `focus` é a fase destacada ao voltar ao mapa. */
export const ENDINGS = {
  ato1: { lines: ACT_ONE, scenery: 'cemiterio', music: 'sombras', focus: 5, button: 'CONTINUAR' },
  final: { lines: FINAL, scenery: 'floresta', music: 'vitoria', focus: 8, button: 'VER FINAL' },
};

export const levelById = (id) => LEVELS.find(l => l.id === id);

/** Fases da história (sem a fase bônus): vencer a última mostra o final. */
export const MAIN_LEVELS = LEVELS.filter(l => !l.bonus);

/** Páginas do mapa. */
export const ACTS = [
  { id: 1, name: 'ATO I — A MANSÃO', levels: [1, 2, 3, 4] },
  { id: 2, name: 'ATO II — O REINO DAS SOMBRAS', levels: [5, 6, 7, 8, 9] },
];

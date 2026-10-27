# Como ajudar a criar inimigos e personagens do JokenGhost

Este arquivo tem um **prompt pronto** para colar em qualquer IA (Claude, ChatGPT, Gemini...) ou para seguir
à mão. Ele explica o formato exato que as sprites do jogo usam, para que tudo que vocês criarem
encaixe direto no projeto.

**Como usar:**
1. Copie o bloco **PROMPT** inteiro (de "INÍCIO DO PROMPT" até "FIM DO PROMPT").
2. No fim dele, preencha a **ficha** do que você quer criar (inimigo ou personagem).
3. Mande para a IA e me envie o resultado: o arquivo `.mjs` gerado e a ficha preenchida.

---

## PROMPT

````text
═══════════════════════ INÍCIO DO PROMPT ═══════════════════════

Você vai criar sprites em pixel art para o JokenGhost, um RPG de pedra-papel-tesoura com tema de caça
a fantasmas. As sprites NÃO são imagens: são código JavaScript que desenha pixel por pixel numa grade.
Siga TODAS as regras abaixo. O resultado precisa funcionar sem ajustes.

──────────────── 1. O FORMATO ────────────────
O jogo tem DOIS estilos, cada um com a sua ferramenta:
- INIMIGOS (e ícones): "estilo de volume". Você desenha numa grade de 32x32 montando PEÇAS
  (cabeça, corpo, braço...), cada uma com um material e uma forma; o motor pinta a luz em faixas,
  as linhas internas e o contorno sozinho, e amplia para 64x64. Veja a seção 4B.
- PERSONAGENS (caçadores jogáveis): desenho livre numa grade de 64x64 com a classe Grid (seção 4).
Para os dois:
- Cada frame vira uma grade de 64x64 pixels no fim. (0,0) é o canto de cima à esquerda.
- O fundo é transparente: só pinte o que faz parte do personagem.
- Cores: SÓ as chaves da paleta (seção 3), escritas como texto: 'k', 'r3', 'v4'... Nunca use hex direto.
- Uma animação é uma "folha": vários frames 64x64 lado a lado, montada com sheet([frame1, frame2, ...]).
- O jogo amplia as sprites 2x a 3x sem borrar (chefes 3x). Pense em pixels grandes e legíveis.

──────────────── 2. REGRAS DE ESTILO ────────────────
- Contorno preto de 1px em volta de tudo: chame g.outline('k') no FIM de cada frame.
- Volume: desenhe cada parte (cabeça, corpo, braço...) numa Grid separada, chame .shade() nela
  (clareia em cima/esquerda e escurece embaixo/direita) e cole com g.blit(parte). Luz vem de cima à esquerda.
- Poucas cores por parte (2 a 4 tons da mesma rampa). Olhos e detalhes com cores fortes (r3, y3, c4...).
- INIMIGOS olham para a ESQUERDA (o Caçador fica à esquerda da tela).
- Inimigo (grade 32x32): quem anda encosta os pés em y = 29; quem voa fica perto de y = 16.
  Ocupa uns 20 a 28 pixels de altura e deixa 1px livre nas bordas (o contorno usa esse pixel).
- Personagem (grade 64x64): o ponto mais baixo encosta em y = 59; ocupa uns 40 a 56 pixels de altura.
- Entre frames da mesma animação, mude pouco: deslocar 1-4px, mexer um braço, abrir a boca.
  Use os MESMOS parâmetros de posição em todos os frames, para não "tremer".
- Desenho determinístico: nada de Math.random() (a sprite tem que sair igual em todo build).
  Se precisar de "ruído", use rng(seed) importado de '../lib/grid.mjs'.

──────────────── 3. PALETA (únicas cores permitidas) ────────────────
Cada linha é uma rampa, do mais escuro ao mais claro (o .shade() anda nessas rampas):
- contorno/cinzas: k=#0e0b16 k2=#1c1729 g1=#2f2a3d g2=#4a4559 g3=#6e6a80 g4=#9b98ab g5=#c9c7d4 w=#f4f2fa
- fantasma (azul pálido): gh1=#3d4f86 gh2=#6f88c4 gh3=#a9c1ec gh4=#dbe8ff gh5=#f7fbff
- vermelhos: r1=#4a0e1e r2=#8e1a2e r3=#d23a3a r4=#ff7563 r5=#ffb3a0
- laranja/fogo: o1=#7a2e14 o2=#c45a1e o3=#f08c2a o4=#ffc04d
- amarelo/ouro: y1=#8a5a12 y2=#cf9a22 y3=#f6d548 y4=#fff3a6
- verdes: v1=#0f2c22 v2=#1b4a30 v3=#2f7a3e v4=#5fb24a v5=#a8e070 v6=#e2ffb0
- ciano espiritual: c1=#0d3340 c2=#16697a c3=#2fb5b5 c4=#7cf0dc c5=#d4fff5
- azuis: b1=#141a3c b2=#22327a b3=#3a5cc4 b4=#6f96f0 b5=#b8d0ff
- roxos: p1=#1e0f33 p2=#3c1d63 p3=#6a34a3 p4=#a35fd9 p5=#d9a8ff
- marrom/madeira: m1=#22140f m2=#43271a m3=#6b4029 m4=#9a6438 m5=#c99358 m6=#ecc58a
- pele: s1=#3b2116 s2=#6a3d26 s3=#9a6038 s4=#c98a58 s5=#f0bd8c
- porcelana/pele pálida: q1=#8a7a8e q2=#c4b4c4 q3=#eadde6 q4=#fff6fa
- pedra/metal: t1=#262833 t2=#3c3f4f t3=#5a5e70 t4=#7f8496 t5=#aab0c0
Transparência (fantasmas, brilhos): escreva a cor com alfa em %, ex.: 'gh3@50'.

──────────────── 4. FERRAMENTAS DA GRADE (API da classe Grid) ────────────────
import { Grid, sheet, rng } from '../lib/grid.mjs';
const g = new Grid();                       // 64x64 transparente
g.set(x, y, c)                              // 1 pixel (c = null apaga)
g.px([[x, y], [x, y], ...], c)              // vários pixels
g.rect(x, y, w, h, c)                       // retângulo cheio
g.frame(x, y, w, h, c)                      // só a borda do retângulo
g.line(x0, y0, x1, y1, c)                   // linha de 1px
g.stroke(x0, y0, x1, y1, espessura, c)      // linha grossa (braços, cabos, caudas)
g.ellipse(cx, cy, rx, ry, c)                // elipse cheia
g.circle(cx, cy, r, c)                      // círculo cheio
g.ring(cx, cy, r, espessura, c)             // anel
g.poly([[x, y], [x, y], ...], c)            // polígono cheio
g.fill(x, y, c)                             // balde
g.recolor({ r3: 'b3' })                     // troca cores
g.erase((x, y) => condição)                 // apaga onde a condição for verdadeira
g.blit(outra, dx, dy, { flipX, flipY })     // cola outra grade por cima
g.mirrorX()                                 // copia a metade esquerda para a direita (simetria)
g.shade({ depth: 1 })                       // sombreamento automático (depth 2 = sombra mais grossa)
g.outline('k')                              // contorno externo de 1px
g.innerLine(['v3', 'v4'], 'k')              // linha escura separando essas cores das vizinhas
sheet([g1, g2, g3])                         // folha horizontal de frames
Todos os métodos de desenho devolvem a própria grade, então dá para encadear: g.rect(...).line(...).

──────────────── 4B. MOTOR DE VOLUME (inimigos e ícones) ────────────────
import { Model, mat } from '../lib/volume.mjs';
import { folhas } from './enemies.mjs';                  // monta idle/attack/hurt a partir das poses
import { MADEIRA, VERMELHO, ... } from './materiais.mjs';
const m = new Model();                                   // grade 32x32
m.part(MATERIAL, FORMA, (p) => { ...desenha a silhueta em p com a API da seção 4, cor 'x'... }, opções)
   FORMA (de onde vem a luz):
     'cylinder'  — faixas verticais, brilho perto da esquerda (corpos, pernas, troncos, copos)
     'hcylinder' — faixas horizontais (chapéus, cintos, bordas, tampas)
     'sphere'    — brilho num ponto em cima à esquerda (cabeças, fantasmas, olhos grandes, frutas)
     'flat'      — chapado com borda clara em cima (asas finas, placas)
   opções: { edge: false } tira a linha interna da peça; { light: 1 } (ou -1) clareia/escurece a peça.
   A ORDEM importa: peças desenhadas depois ficam NA FRENTE (e ganham a linha interna onde cobrem as de trás).
m.paint((g) => ...)      // detalhes sem volume por cima: olhos, boca, botões, rachaduras (cores da paleta)
m.cut((p) => ...)        // abre buracos no que já foi desenhado
m.backdrop((g) => ...)   // atrás de tudo e sem contorno (auras, brilho de lanterna)
m.overlay((g) => ...)    // por cima do contorno e sem contorno (faíscas, gotas soltas)
m.render()               // devolve o frame 64x64 pronto
MATERIAIS prontos (materiais.mjs): OURO, PRATA, METAL, FERRO, MADEIRA, MADEIRA_CLARA, PERGAMINHO, OSSO, BRANCO,
  VIDRO, ECTO (fantasma), VERMELHO, LARANJA, AMARELO, VERDE, VERDE_ESCURO, CIANO, AZUL, ROXO, LILAS, PELE,
  PELE_ESCURA, CINZA, CINZA_ESCURO, PEDRA, SOMBRA.
Material próprio: mat('r3', { line: 'r1' }) — 5 tons andando na rampa a partir do meio-tom, e a cor da linha interna.

──────────────── 5. O QUE ENTREGAR ────────────────
Um arquivo .mjs (módulo ES) que exporta UMA função sem parâmetros que devolve as folhas.

▸ INIMIGO (comum ou chefe): 3 animações obrigatórias, com estes nomes e quantidades de frames:
  idle   — 4 frames  (parado respirando/flutuando, em loop)
  attack — 4 frames  (preparo, golpe, golpe no máximo, volta)
  hurt   — 2 frames  (recuando para a DIREITA, cara de dor)
  Formato de saída (motor de volume, seção 4B):
    export const minhasSprites = () => ({
      idDoInimigo: folhas(frame, { idle: [4 poses], attack: [4 poses], hurt: [2 poses] }),
    });
  O id é em minúsculas, sem acento nem espaço (ex.: 'espantalho', 'sereia_morta').

▸ PERSONAGEM (caçador jogável), opção A — só paleta nova (mais fácil e mais consistente):
  Todos os caçadores usam o mesmo desenho; muda só esta paleta. Entregue um objeto assim:
    meuId: {
      jacket: 'p3',          // jaqueta
      shirt: 'w',            // camisa / gola
      emblem: 'raio',        // 'raio' | 'cruz' | 'none' (desenho no peito)
      emblemC: ['y3', 'y2'], // cores do emblema (só se emblem não for 'none')
      belt: 'm2', strap: 'm3',          // cinto e alças da mochila
      hair: 'k2', hairHi: 'g2',         // cabelo (black power) e brilho do cabelo
      skin: 's3',                       // pele: s1..s5 ou q2 (pálida)
      pants: 'b3', shoes: 'r3',
      pack: 'g3',                       // mochila-aspirador
      glow: ['v4', 'v5', 'v6', 'v2'],   // luz da mochila: [normal, forte, máxima, apagada]
    }

▸ PERSONAGEM, opção B — corpo totalmente novo (dá mais trabalho):
  Três vistas, cada uma com estas animações (frames entre parênteses):
  side     — de lado, olhando para a DIREITA: idle(4) attack(4) hurt(2) win(2) ko(1)
  back     — de costas, estilo Pokémon (o jogador em primeiro plano), mirando para cima/direita:
             idle(4) attack(4) hurt(2) win(2) ko(1)
  portrait — rosto de frente, cabeça e ombros, para o avatar do perfil: idle(10), sendo 9 frames iguais
             de olhos abertos e o último piscando
  Formato: export function meuPersonagem() { return { meuId: { side: {...}, back: {...}, portrait: {...} } }; }
  Mochila-aspirador nas costas e um bocal de aspirador na mão fazem parte da identidade dos caçadores.

▸ Junto do código, escreva a FICHA preenchida (seção 7).

──────────────── 6. EXEMPLO COMPLETO (inimigo simples, estilo de volume) ────────────────
import { Model, mat } from '../lib/volume.mjs';
import { folhas } from './enemies.mjs';
import { MADEIRA, MADEIRA_CLARA, VERMELHO, AMARELO } from './materiais.mjs';

/** Um frame do Espantalho (grade 32x32). Olha para a ESQUERDA; a estaca encosta no chão em y = 29. */
function espantalho({ dy = 0, lean = 0, arm = 0, mood = 'idle' } = {}) {
  const m = new Model();
  const X = 16 + lean, Y = dy;

  // estaca de madeira (o "pé" dele)
  m.part(MADEIRA, 'cylinder', (p) => p.rect(15, 20, 2, 10, 'x'));
  // camisa: cilindro (faixas de luz verticais)
  m.part(VERMELHO, 'cylinder', (p) => p.poly([[X - 5, 13 + Y], [X + 5, 13 + Y], [X + 4, 22 + Y], [X - 4, 22 + Y]], 'x'));
  // braço de palha: estica para a esquerda no ataque
  m.part(AMARELO, 'cylinder', (p) => p.stroke(X - 4, 15 + Y, X - 10 - arm * 3, 15 + Y - arm, 2, 'x'));
  // cabeça de saco: esfera (brilho em cima à esquerda)
  m.part(MADEIRA_CLARA, 'sphere', (p) => p.ellipse(X, 9 + Y, 5, 5, 'x'));
  // chapéu
  m.part(mat('m2', { line: 'm1' }), 'hcylinder', (p) => { p.rect(X - 6, 5 + Y, 13, 2, 'x'); p.rect(X - 3, 1 + Y, 7, 4, 'x'); });

  // detalhes sem volume: olho, boca
  m.paint((g) => {
    if (mood === 'hurt') g.rect(X - 4, 8 + Y, 2, 1, 'k');
    else { g.rect(X - 4, 7 + Y, 2, 2, 'k'); g.set(X - 4, 7 + Y, 'o4'); }
    g.rect(X - 4, 11 + Y, 4, mood === 'attack' ? 2 : 1, 'k');
  });
  return m.render();   // contorno, linhas internas e ampliação para 64x64 saem sozinhos
}

export const espantalhoSheets = () => ({
  espantalho: folhas(espantalho, {
    idle: [{}, { dy: 1 }, { dy: 1, lean: -1 }, { lean: -1 }],
    attack: [{ lean: 1 }, { lean: -1, arm: 1, mood: 'attack' }, { lean: -2, arm: 1.5, mood: 'attack' }, { lean: -1 }],
    hurt: [{ lean: 2, mood: 'hurt' }, { lean: 1, mood: 'hurt' }],
  }),
});

O padrão que vale copiar: UMA função de frame com parâmetros de pose (dx, dy, lean, braço, humor) e
as animações como listas dessas poses. O exemplo é simples de propósito: faça o seu mais caprichado
(mais partes, sombreamento, detalhes no rosto), mas no mesmo formato.

──────────────── 7. FICHA (preencha o que for criar) ────────────────
INIMIGO
- id:                      (minúsculas, sem acento, ex.: espantalho)
- nome:                    (como aparece no jogo, ex.: Espantalho Maldito)
- comum ou chefe:          (chefe = mais vida, aparece maior e tem música/mecânica própria)
- voa?                     (sim/não)
- vida / dano:             (comuns: vida 50–90, dano 12–18 · chefes: vida 200–260, dano 18–24)
- fraqueza / resistência:  (armas do Caçador: estaca, aspirador ou cruz; as duas precisam ser diferentes)
- jeito de jogar (IA), escolha um:
    random    — aleatório, pode preferir um golpe
    cycle     — repete uma sequência de golpes
    sticky    — teimoso, repete o último golpe
    mimic     — imita a última jogada do Caçador
    learner   — aprende a arma que o Caçador mais usa e joga contra ela
    trickster — tenta vencer a última jogada do Caçador
    vengeful  — repete o golpe que já venceu o Caçador
    coward    — depois de levar dano, muda de golpe
- pistas: chance de dar pista (0 a 1) e se mente às vezes (0 a 1)
- só para chefes (opcional): troca de fraqueza por fase / chama ajudantes a cada N turnos / ataca duas vezes
- descrição (1 frase, tom de bestiário):
- comportamento (1 frase explicando a IA para o jogador):

PERSONAGEM
- id e nome:               (ex.: rosa · Irmã Rosa)
- título:                  (ex.: Freira do convento em chamas)
- arma preferida:          (estaca, aspirador, cruz ou nenhuma)
- passiva:                 (ex.: Cruz causa +5 de dano.)
- troféus para liberar:
- opção A (paleta) ou B (corpo novo):

──────────────── 8. CONFIRA ANTES DE ENTREGAR ────────────────
[ ] Só chaves da paleta (nenhum hex, nenhuma cor inventada)
[ ] Inimigo: peças com m.part() numa grade 32x32 e frame com m.render(); personagem: Grid 64x64
[ ] Nomes e quantidades das animações exatamente como na seção 5
[ ] Inimigo olha para a esquerda; pés em y = 29 da grade 32x32 (ou flutua perto de y = 16)
[ ] Personagem: g.outline('k') no fim de cada frame e partes com .shade()
[ ] Sem Math.random(); só importa de '../lib/grid.mjs', '../lib/volume.mjs', './materiais.mjs' e './enemies.mjs'
[ ] Ficha preenchida

═══════════════════════ MINHA FICHA ═══════════════════════
(preencha aqui)

═══════════════════════ FIM DO PROMPT ═══════════════════════
````

---

## Se a IA não souber escrever código

Algumas IAs (ou quem prefere desenhar à mão) podem entregar o desenho como **texto**: 64 linhas de
64 caracteres por frame, um caractere por pixel, mais uma legenda ligando cada caractere a uma chave
da paleta. O ponto (`.`) é transparente. O jogo tem a função `stamp()` que lê esse formato. Exemplo
de legenda e começo de frame:

```text
legenda: . = transparente, K = k, R = r3, r = r2, Y = y3
frame idle 1:
................................................................
..........................KKKKKKKK..............................
........................KKrrrrrrrrKK............................
........................KrRRRRRRRRrK............................
(... 64 linhas no total, cada uma com 64 caracteres ...)
```

Também vale desenhar num editor de pixel art (Aseprite, Piskel, LibreSprite) seguindo as mesmas
regras: frames lado a lado numa folha por animação, fundo transparente, só as cores da paleta e
contorno preto de 1px. Mande o PNG que ele é convertido para o formato do projeto.

Para **inimigos**, desenhe em **32x32** (pixels grossos, sombra em faixas de 4–5 tons com luz vindo de
cima à esquerda, linhas escuras separando as peças), que é o estilo de volume. Para **personagens**,
use 64x64 como no texto acima.

---

## Para quem for integrar no projeto

1. Salve o módulo em `tools/sprites/art/` (ex.: `tools/sprites/art/espantalho.mjs`).
2. Veja a prévia ampliada antes de qualquer coisa: o `tools/sprites/preview-enemies.mjs` gera PNGs dos
   inimigos de `enemies.mjs`; troque o import dele pelo módulo novo e rode
   `node preview-enemies.mjs <pasta-de-saída>` dentro de `tools/sprites`.
3. Registre em `tools/sprites/build.mjs` (importe a função e some no laço dos inimigos,
   `{ ...enemySheets(), ...enemySheets2(), ...espantalhoSheets() }`; paleta de caçador
   vai em `CHARACTERS` de `tools/sprites/art/hunter.mjs`) e gere tudo com `node tools/sprites/build.mjs`.
4. Inimigo: crie a entrada em `src/config/enemies.js` com a ficha (`sprite: 'enemy/<id>'`) e coloque-o
   numa onda em `src/config/levels.js`.
5. Personagem: crie a entrada em `src/config/characters.js` **e** em `server/src/catalog.js`
   (o servidor é quem decide desbloqueios e passivas).
6. Rode os testes (`npm test` e `cd server && npm test`) e jogue a fase para ver em movimento.

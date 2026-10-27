# JokenGhost — Caçada em Turnos 👻

RPG por turnos em pixel art onde cada golpe é decidido no **pedra, papel e tesoura**.
Você é o Caçador: atravesse a Floresta Maldita, invada a mansão, derrote **Kastle** e depois enfrente o
Reino das Sombras até **Morgana**, a Rainha Banshee.

**Campanha**
- Batalhas em perspectiva estilo Pokémon: você de costas em primeiro plano, os monstros na plataforma ao fundo
- 2 atos, 8 fases e 1 fase bônus, com história, diálogos e ondas de monstros
- 16 monstros, cada um com fraqueza, resistência, um jeito de jogar e **pistas** (alguns mentem), tudo no **Monstruário**
- Todos os monstros da onda jogam: você troca golpes com o alvo e os outros acertam meio golpe se vencerem a sua arma
- Chefes com mecânicas: mudar de fraqueza, chamar ajudantes, atacar duas vezes
- Loja com bolsa limitada por onda (monstros às vezes deixam cair +1 item), **Oficina** de melhorias permanentes,
  **modo Pesadelo**, visuais e fase bônus liberados por estrelas, e 3 arquivos de save

**Corridas**
- **Noite Sem Fim:** ondas infinitas e cada vez mais fortes, chefe a cada 5 ondas, 1 de 3 relíquias depois de cada onda
- **Desafio do Dia:** a mesma corrida para todo mundo, com ranking diário conferido pelo servidor

**Arena dos Caçadores** (multiplayer online)
- Ranqueada (troféus), Casual, 2x2, Chefe Cooperativo, Torneio Relâmpago (8 caçadores) e Rei da Arena
- Bots entram quando falta gente; dá para assistir as partidas de quem está online
- Deck de 8 cartas (16 cartas, limite por raridade), 6 caçadores, histórico das armas do adversário
- Missões diárias, Ecto, loja de molduras e expressões, temporadas mensais com recompensas

- Trilha sonora composta em partituras [Scrimshaw](https://tools.simonwillison.net/scrimshaw-jukebox), tocada ao vivo
- Funciona no navegador, no desktop e no celular

## Como rodar

O jogo é estático (HTML + ES modules, sem build). Basta servir a pasta:

```bash
npm run dev
```

Depois abra `http://localhost:5173`. (O `tools/devserver.py` desativa o cache para você ver as mudanças na hora.)

Testes das regras do jogo:

```bash
npm test
```

Multiplayer local: veja [server/README.md](server/README.md).

## Controles

| Tecla | Ação |
|-------|------|
| `1` `2` `3` | Estaca, Aspirador, Cruz |
| `A` / `S` / `B` | Armas / Loja / Monstruário |
| `Tab` ou toque no monstro | Trocar de alvo |
| `Esc` | Pausar / fechar |

## Arquitetura

```
index.html          telas (DOM) por cima do canvas 1280x720
styles/             CSS por área (base, componentes, telas, batalha, multiplayer)
src/
  main.js           monta serviços, interface e cenas
  config/           dados do jogo: armas, monstros, itens, fases, balanceamento
  domain/           regras puras e testáveis (batalha, IA, atributos, campanha, corridas, saves, monstruário)
  core/             motor: loop e cenas, renderizador pixel-perfect, tweens, partículas, áudio, música
  world/            personagens animados, efeitos, cenários laterais e palco de batalha em perspectiva
  scenes/           Menu, Mapa, História, Diálogo, Batalha (campanha e corridas), Resultado,
                    Arena (lobby), Duelo (1x1/2x2/espectador) e Chefe Cooperativo
  ui/               HUD da batalha, cartas, modais (saves, opções, monstruário, oficina, relíquias,
                    desafio do dia, deck, missões, loja, arena), toasts
  net/              cliente Socket.io do multiplayer
  vendor/scrimshaw/ motor de partituras Scrimshaw (Apache 2.0)
assets/
  sprites/          SVGs 64x64 gerados (personagens, inimigos, ícones, efeitos, UI, tiles)
  fonts/            fonte pixel JokenPixel (gerada)
  music/            trilha sonora em partituras .scrim
  audio/            efeito de impacto
tools/
  sprites/          gerador das sprites (pixel art desenhada em código)
  font/             gerador da fonte JokenPixel
  music/            verificador das partituras (node tools/music/check.mjs)
server/             servidor multiplayer (Node + Socket.io, deploy no Render)
tests/              testes do domínio (node --test)
legacy/pygame/      versão original em Python/Pygame
```

A regra principal: `domain/` não conhece tela nenhuma. A batalha (`domain/battle.js`) decide o que acontece
e devolve um resultado; a cena (`scenes/BattleScene.js`) só anima esse resultado. O "modo" da batalha
(`scenes/battleModes.js`) diz se é uma fase da campanha ou uma corrida, sem a cena precisar saber.

Melhorias, relíquias e dificuldade são **modificadores** (`domain/loadout.js`) que viram um único objeto de
atributos lido pela batalha. As corridas (`domain/run.js`) usam geradores com semente e registram cada jogada,
então o servidor refaz a corrida do Desafio do Dia com o mesmo código (`server/src/shared.js`).

## Sprites e fonte

Todas as sprites seguem o padrão **64x64 px** (animações são folhas horizontais de frames 64x64) e são
desenhadas em código com uma paleta única, então o jogo inteiro tem o mesmo estilo. Para alterar ou criar arte:

1. Edite os desenhos em `tools/sprites/art/` (`hunter.mjs`, `enemies.mjs`, `icons.mjs`, `fx.mjs`, `ui.mjs`, `tiles.mjs`)
2. Rode `npm run assets` (gera os SVGs, o `bundle.json` e o manifesto `src/config/sprites.generated.js`)

A fonte JokenPixel (com acentos do português) é desenhada em `tools/font/glyphs.mjs`.
Use tamanhos múltiplos de 8px (16, 24, 32...) para ela ficar nítida.

## Trilha sonora

Cada música é um texto em `assets/music/*.scrim` (formato Scrimshaw: vozes, padrões e `play`/`loop`).
O jogo compila a partitura e toca com os instrumentos sintetizados do Scrimshaw, então as músicas
pesam poucos KB. Para compor ou testar, cole o arquivo no editor do
[Scrimshaw Jukebox](https://tools.simonwillison.net/scrimshaw-jukebox) e confira com
`node tools/music/check.mjs`.

| Arquivo | Onde toca |
|---------|-----------|
| `menu` | menu principal |
| `mapa` | mapa, cartas e diálogos |
| `batalha` | batalhas do Ato I e o começo das corridas |
| `sombras` | batalhas do Ato II |
| `chefe` | chefes |
| `rainha` | Morgana |
| `lobby` / `duelo` | Arena e duelos online |
| `vitoria` / `derrota` | vinhetas de resultado |

## Deploy

- **Jogo:** Vercel, como site estático (`vercel.json`). `legacy/`, `tools/`, `tests/` e `server/` ficam fora do deploy.
- **Multiplayer:** Render (plano grátis) com banco Postgres no Neon, pasta `server/` como raiz.
  O endereço fica em `src/config/multiplayer.js`. Detalhes em [server/README.md](server/README.md).

## Licença

MIT — veja [LICENSE](LICENSE).

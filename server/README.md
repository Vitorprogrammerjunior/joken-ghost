# JokenGhost — Servidor Multiplayer (Arena dos Caçadores)

Node.js + Socket.io. Toda a regra roda aqui (o cliente só manda escolhas):

- Duelos 1x1 e 2x2 com cartas de perk e deck (`src/duel.js`), troféus e ranking global
- Ranqueada, Casual, 2x2, Chefe Cooperativo (`src/raid.js`), Torneio e Rei da Arena (`src/modes/`)
- Espectadores e expressões (`src/match/`)
- Adversários automáticos na Ranqueada quando falta gente (`src/bots/`)
- Missões diárias, Ecto, cosméticos e temporadas mensais (`missions.js`, `cosmetics.js`, `seasons.js`)
- Ranking do Desafio do Dia, conferido refazendo a corrida (`src/daily.js`)

O servidor usa as mesmas regras do jogo para a IA do chefe cooperativo e para o Desafio do Dia
(`src/shared.js` importa `../src/domain` e `../src/config`). Por isso ele precisa do repositório inteiro,
não só da pasta `server/` (no Render isso já acontece: ele clona tudo e só roda os comandos em `server/`).

## Rodar localmente

```bash
cd server
npm install
npm start
```

Servidor em `http://localhost:3001`. Sem `DATABASE_URL`, os jogadores ficam em `server/data/players.json`.

Testes (regras, troféus, banco e uma partida de verdade com dois clientes):

```bash
npm test
```

## Deploy (Render + Neon, ambos gratuitos)

Em produção: `https://joken-ghost.onrender.com`.

1. **Banco:** crie um projeto no [Neon](https://neon.com) (região AWS US East 2 / Ohio) e copie a
   connection string (`postgresql://...?sslmode=require`). O servidor cria as tabelas (`players`, `daily_scores`, `meta`) e as colunas novas sozinho.
2. **Servidor:** no [Render](https://render.com), **New → Web Service** ligado a este repositório:
   - Language **Node**, Branch `web-game`, Region **Ohio**, Root Directory `server`
   - Build `npm ci --omit=dev`, Start `npm start`, Instance **Free**
   - Variáveis: `DATABASE_URL` (do Neon) e `CORS_ORIGIN` (`*` ou a URL da Vercel)
   - Health Check Path: `/health`
3. Cada push no branch faz um deploy novo automaticamente.

No plano grátis o Render dorme depois de 15 minutos sem ninguém e leva cerca de 1 minuto para acordar.
O jogo chama `/health` antes de conectar e mostra "Acordando o servidor..." enquanto isso.
Para ele não dormir, dá para usar um monitor gratuito (ex.: UptimeRobot) chamando `/health` a cada 10 minutos.

Sem `DATABASE_URL`, o servidor usa um arquivo JSON (`DATA_FILE`); no Render grátis esse arquivo
se perde a cada reinício, então use o Neon.

## Endpoints HTTP

| Rota | O que devolve |
|------|---------------|
| `GET /health` | `{ ok: true }` |
| `GET /api/ranking` | top 50 por troféus |
| `GET /api/catalog` | cartas, caçadores e ligas (usado pela wiki) |
| `GET /api/daily?day=AAAA-MM-DD` | top 20 do Desafio do Dia |
| `POST /api/daily` | envia as jogadas de uma corrida do dia (o servidor refaz e confere) |
| `POST /api/daily/me` | minha posição no dia (código da conta no corpo, nunca na URL) |

## Protocolo Socket.io

Cliente → servidor: `hello {token?, nickname?}`, `set_nickname`, `select_character {id}`, `set_deck {cards}`,
`ranking`, `missions_claim {id}`, `shop_buy {id}`, `equip_frame {id}`,
`queue_join {mode: ranked|casual|duo|raid}`, `queue_leave`, `tournament_join`, `tournament_leave`,
`king_join`, `king_leave`, `challenge {targetId}`, `challenge_answer {fromId, accept}`,
`room_create`, `room_join {code}`, `room_leave`, `spectate {playerId}`, `spectate_leave`,
`pick_card {cardId|null}`, `pick_weapon {weapon}`, `forfeit`, `emote {id}`.

Servidor → cliente: `welcome {token, profile, catalog}`, `profile`, `lobby`, `ranking`, `queue_state`,
`season_reward`, `challenge_received`, `challenge_sent`, `challenge_declined`, `room_created`,
`tournament_state`, `king_state`, `match_start` (também para espectadores, com `you: null`), `match_resume`,
`card_phase`, `weapon_phase`, `card_locked`, `weapon_locked`, `seat_ready`, `vision`, `seat_status`,
`spectators`, `emote`, `round_result`, `raid_phase`, `raid_result`, `match_end`, `error_msg`.

## Regras principais (`src/catalog.js`)

- Rodada: escolhe uma carta da mão (10s, opcional) → as cartas são reveladas → escolhe a arma (10s;
  quem enfrenta a Visão tem 5s). Tempo esgotado repete a arma da rodada anterior.
- Vencer o jokenpô causa 20 de dano (+5 com a arma preferida do personagem). Da rodada 12 em diante o dano dobra.
- Deck de até 8 cartas, no máximo 1 lendária e 2 épicas. Cada carta só pode ser usada uma vez por partida.
- 2x2: duas pistas (cada um contra o adversário da frente) e vida somada da dupla (75%).
- Troféus só na Ranqueada: vencedor ganha 10–40 (mais contra quem tem mais troféus), perdedor perde um pouco menos.
  O mesmo par só vale troféus 3 vezes por hora. Desbloqueios usam a melhor marca, então perder troféus não tira nada.
- Casual, 2x2 e Chefe Cooperativo esperam os caçadores de que precisam (2, 4 e 2).
- Ranqueada: se o jogador está sozinho na fila, depois de 18–30s (6–10s nas 3 primeiras partidas da conta)
  um adversário automático completa a partida. Só até 1600 troféus e no máximo 5 por hora por jogador.
  Ele não é anunciado: nome genérico novo a cada partida, troféus, caçador, deck e avatar do mesmo nível,
  tempo de pensar de gente; não é salvo, não aparece no ranking nem na lista de online. Vale troféus.
  A dificuldade (`src/bots/policy.js`) sobe com os troféus e acompanha a fase do jogador (alivia em
  sequência de derrotas, aperta em sequência de vitórias). O bot lê os padrões do jogador
  (`src/bots/BotBrain.js`), mas só aproveita parte das rodadas, então dá para vencê-lo.
- Torneio: começa com 8 inscritos ou, 45s depois do 1º, com pelo menos 4 (com 5 a 7, alguns passam direto da 1ª fase).
- Quem cair tem 15s para reconectar antes de perder por abandono. No 2x2 o parceiro segue: o lugar de quem caiu
  fica parado (sem carta, repetindo a última arma) e o time só perde por abandono se os dois saírem.
- Temporada: todo dia 1º (Brasília), troféus acima de 1000 perdem metade do excedente e cada jogador
  ganha Ecto (e uma moldura a partir da Prata) pela melhor liga da temporada.

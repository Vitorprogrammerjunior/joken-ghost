# JokenGhost — Servidor Multiplayer (Arena dos Caçadores)

Node.js + Socket.io. Duelos 1x1 entre caçadores com cartas de perk, troféus, ranking global
e desbloqueio de personagens e cartas. Toda a regra roda aqui (o cliente só manda escolhas).

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
   connection string (`postgresql://...?sslmode=require`). O servidor cria a tabela `players` sozinho.
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

## Protocolo Socket.io

Cliente → servidor: `hello {token?, nickname?}`, `set_nickname`, `select_character {id}`, `ranking`,
`queue_join`, `queue_leave`, `challenge {targetId}`, `challenge_answer {fromId, accept}`,
`room_create`, `room_join {code}`, `room_leave`, `pick_card {cardId|null}`, `pick_weapon {weapon}`, `forfeit`.

Servidor → cliente: `welcome {token, profile, catalog}`, `profile`, `lobby`, `ranking`, `queue_state`,
`challenge_received`, `challenge_sent`, `challenge_declined`, `room_created`, `match_start`, `match_resume`,
`card_phase`, `weapon_phase`, `opponent_ready`, `opponent_weapon` (carta Visão), `opponent_status`,
`round_result`, `match_end`, `error_msg`.

## Regras principais (`src/catalog.js`)

- Rodada: escolhe uma carta da mão (10s, opcional) → as cartas são reveladas → escolhe a arma (10s).
- Vencer o jokenpô causa 20 de dano (+5 com a arma preferida do personagem). Da rodada 12 em diante o dano dobra.
- Cada carta só pode ser usada uma vez por partida.
- Troféus: vencedor ganha 10–40 (mais contra quem tem mais troféus), perdedor perde um pouco menos.
  O mesmo par só vale troféus 3 vezes por hora.
- Desbloqueios usam a melhor marca de troféus, então perder troféus não tira o que já foi liberado.
- Quem cair tem 15s para reconectar antes de perder por abandono.

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

## Deploy no Railway

1. No projeto do Railway que já existe, clique em **New → Database → PostgreSQL**.
   O Railway cria a variável `DATABASE_URL`; em **Variables** do serviço do jogo, adicione uma referência a ela.
2. **Root Directory** continua `server`.
3. Variáveis:
   - `DATABASE_URL` — do Postgres (o servidor cria a tabela `players` sozinho)
   - `CORS_ORIGIN` — `*` ou a URL da Vercel
   - `PORT` — o Railway define
4. Deploy.

Sem Postgres também funciona com arquivo: crie um **Volume** montado em `/data` e defina
`DATA_FILE=/data/players.json`. Sem volume, o ranking zera a cada deploy.

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

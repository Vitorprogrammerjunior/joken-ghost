# JokenGhost — Servidor Multiplayer (Arena dos Caçadores)

Node.js + Socket.io. Toda a regra roda aqui (o cliente só manda escolhas):

- Duelos 1x1 e 2x2 com cartas de perk e builds montadas (`src/duel.js`), troféus e ranking global
- Ranqueada, Casual, 2x2, Chefe Cooperativo (`src/raid.js`), Torneio e Rei da Arena (`src/modes/`)
- Espectadores e expressões (`src/match/`)
- Adversários automáticos na Ranqueada quando falta gente (`src/bots/`)
- Missões diárias, Ecto, cosméticos e temporadas mensais (`missions.js`, `cosmetics.js`, `seasons.js`)
- Ranking do Desafio do Dia, conferido refazendo a corrida (`src/daily.js`)
- Login com Google e Discord, mantendo o convidado (`src/auth/`), e campanha na nuvem (`src/saves.js`)

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

Para testar o login sem Google/Discord, ligue o login de teste (só funciona fora de produção):
`AUTH_DEV_LOGIN=1 npm start`. A janela CONTA do jogo mostra "ENTRAR COM TESTE LOCAL", que abre uma
página do próprio servidor no lugar da tela do Google.

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
   - Variáveis: `DATABASE_URL` (do Neon), `CORS_ORIGIN` (`*` ou a URL da Vercel) e as do login (abaixo)
   - Health Check Path: `/health`
3. Cada push no branch faz um deploy novo automaticamente.

No plano grátis o Render dorme depois de 15 minutos sem ninguém e leva cerca de 1 minuto para acordar.
O jogo chama `/health` antes de conectar e mostra "Acordando o servidor..." enquanto isso.
Para ele não dormir, dá para usar um monitor gratuito (ex.: UptimeRobot) chamando `/health` a cada 10 minutos.

Sem `DATABASE_URL`, o servidor usa um arquivo JSON (`DATA_FILE`); no Render grátis esse arquivo
se perde a cada reinício, então use o Neon.

## Login com Google e Discord

Quem não entra continua jogando como **convidado** (como sempre foi). Ao entrar, o convidado deste
aparelho é **ligado** à conta: troféus, Ecto, deck, avatar e missões continuam. Se aquele Google/Discord
já tinha conta, o jogo entra nela (as duas não se juntam). Dá para ligar Google e Discord na mesma conta.
Cada aparelho ganha a sua sessão; o "código da conta" de convidado deixa de valer ao entrar.
Do Google e do Discord guardamos só o id da pessoa (nada de e-mail, nome ou foto). "Apagar minha conta"
apaga o jogador e tudo dele (logins, sessões, saves, Desafio do Dia).

Com login, os arquivos da campanha (3 slots) também ficam na nuvem: o jogo sincroniza ao abrir, ao abrir
ARQUIVOS e alguns segundos depois de cada save; em cada slot fica o salvo por último. Na primeira vez de
uma conta num aparelho, a nuvem ganha e os slots vazios recebem os arquivos do aparelho. Ao sair, os
arquivos saem do aparelho (estão na nuvem).

### Configurar (uma vez)

As chaves secretas vão **só nas variáveis do Render**, nunca no código.

**Google** ([console.cloud.google.com](https://console.cloud.google.com)):
1. Crie um projeto (ex.: JokenGhost).
2. **Google Auth Platform → Branding**: nome do app, e-mail de suporte. Público **Externo**.
3. **Clients → Create client → Web application**. Em **Authorized redirect URIs** coloque
   `https://joken-ghost.onrender.com/api/auth/callback/google`.
4. Copie o **Client ID** e o **Client secret**.
5. **Audience → Publish app** (em "Testing" só os usuários de teste conseguem entrar). Como o jogo
   pede só `openid`, não precisa de verificação do Google.

**Discord** ([discord.com/developers/applications](https://discord.com/developers/applications)):
1. **New Application** (ex.: JokenGhost).
2. **OAuth2**: copie o **Client ID**, clique em **Reset Secret** e copie o **Client Secret**.
3. Em **Redirects** adicione `https://joken-ghost.onrender.com/api/auth/callback/discord` e salve.

**Render → Environment** (o serviço reinicia sozinho):

| Variável | Valor |
|----------|-------|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | do Google |
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` | do Discord |
| `CLIENT_ORIGINS` | endereço do jogo, ex. `https://seu-jogo.vercel.app` (vários separados por vírgula). O login só volta para esses endereços. |
| `NODE_ENV` | `production` (garante que o login de teste nunca liga) |

`PUBLIC_URL` é opcional: o Render já informa o próprio endereço (`RENDER_EXTERNAL_URL`), que é o usado
nos redirects. Um provedor sem as duas variáveis simplesmente não aparece no jogo.

## Endpoints HTTP

| Rota | O que devolve |
|------|---------------|
| `GET /health` | `{ ok: true }` |
| `GET /api/ranking` | top 50 por troféus |
| `GET /api/catalog` | cartas, caçadores e ligas (usado pela wiki) |
| `GET /api/daily?day=AAAA-MM-DD` | top 20 do Desafio do Dia |
| `POST /api/daily` | envia as jogadas de uma corrida do dia (o servidor refaz e confere) |
| `POST /api/daily/me` | minha posição no dia (código da conta no corpo, nunca na URL) |
| `GET /api/auth/providers` | logins ligados neste servidor |
| `POST /api/auth/intent` | começa um login `{provider, token?, nickname?, returnTo}` → `{url}` para abrir |
| `GET /api/auth/start`, `GET /api/auth/callback/:provider` | ida e volta do Google/Discord (o navegador passa por aqui) |
| `POST /api/auth/finish` | troca o código de uso único da volta (`#auth=...`) pelo token da sessão |
| `POST /api/auth/me`, `/logout`, `/delete` | dono do token, sair neste aparelho, apagar a conta |
| `POST /api/saves`, `POST /api/saves/put` | arquivos da campanha na nuvem (só com login) |

## Protocolo Socket.io

Cliente → servidor: `hello {token?, nickname?}`, `set_nickname`, `select_character {id}`, `set_deck {cards}`,
`save_build {slot, name, character, cards}`, `use_build {slot}`, `delete_build {slot}`,
`ranking`, `missions_claim {id}`, `shop_buy {id}`, `equip_frame {id}`,
`queue_join {mode: ranked|casual|duo|raid}`, `queue_leave`, `tournament_join`, `tournament_leave`,
`king_join`, `king_leave`, `challenge {targetId}`, `challenge_answer {fromId, accept}`,
`room_create`, `room_join {code}`, `room_leave`, `spectate {playerId}`, `spectate_leave`,
`ban_card {cardId}`, `pick_card {cardId|null}`, `pick_weapon {weapon}`, `forfeit`, `emote {id}`.

Servidor → cliente: `welcome {token, tokenRejected, account, profile, catalog}`, `profile`, `lobby`, `ranking`, `queue_state`,
`season_reward`, `challenge_received`, `challenge_sent`, `challenge_declined`, `room_created`,
`tournament_state`, `king_state`, `match_start` (também para espectadores, com `you: null`), `match_resume`,
`ban_phase {endsIn, deck}`, `ban_locked`, `bans {banned}`, `round_intro {round, sudden, final, extra}`, `card_phase`, `cards_reveal {cards, special, endsIn, forbidden}`, `weapon_phase`, `card_locked`, `weapon_locked`, `seat_ready`, `vision`, `seat_status`,
`spectators`, `emote`, `round_result`, `raid_phase`, `raid_result`, `match_end`, `error_msg`.

## Regras principais (`src/catalog.js`)

- Todas as cartas e caçadores são abertos para todo mundo. Build: 1 caçador + até 6 cartas diferentes que somam
  no máximo 10 pontos (`cost` de cada carta: comum 1, rara 2, épica 3, lendária 4). Cada jogador guarda 5 builds;
  a salva (ou escolhida) por último é a que vai para as partidas. Builds antigas que não cabem usam a padrão.
- 1x1 (Ranqueada, Casual, sala e desafio): antes da 1ª rodada cada um vê a build do outro e bane 1 carta dela (15s;
  sem escolher, sai a mais cara).
- Rodada: escolhe uma carta da mão (7s, opcional) → as cartas são reveladas → escolhe a arma (7s;
  quem enfrenta a Visão tem 3,5s). Tempo esgotado repete a arma da rodada anterior.
- Vencer o jokenpô causa 20 de dano (+5 com a arma preferida do personagem). Da rodada 8 em diante o dano dobra.
  Depois da rodada 15 vence quem tiver mais vida (empatados, segue até alguém passar na frente).
- Cada carta só pode ser usada uma vez por partida. Sem sorteio de dano: Trevo da Sorte é fixo e a Sombra desvia
  só do primeiro golpe.
- 2x2: duas pistas (cada um contra o adversário da frente) e vida somada da dupla (75%).
- Troféus só na Ranqueada: vencedor ganha 10–40 (mais contra quem tem mais troféus), perdedor perde um pouco menos.
  O mesmo par só vale troféus 3 vezes por hora.
- Casual, 2x2 e Chefe Cooperativo esperam os caçadores de que precisam (2, 4 e 2).
- Ranqueada: se o jogador está sozinho na fila, depois de 18–30s (6–10s nas 3 primeiras partidas da conta)
  um adversário automático completa a partida. Se outra pessoa estiver na fila, a partida é com ela.
  Por enquanto sem limites (`maxTrophies` e `perHour` em `null`); dá para ligar um teto de troféus e um máximo por hora.
  Ele não é anunciado: nome genérico novo a cada partida, troféus, caçador, uma build pronta e avatar do mesmo nível,
  tempo de pensar de gente; não é salvo, não aparece no ranking nem na lista de online. Vale troféus.
  A dificuldade (`src/bots/policy.js`) sobe com os troféus e acompanha a fase do jogador (alivia em
  sequência de derrotas, aperta em sequência de vitórias). O bot lê os padrões do jogador
  (`src/bots/BotBrain.js`), mas só aproveita parte das rodadas, então dá para vencê-lo.
- Torneio: começa com 8 inscritos ou, 45s depois do 1º, com pelo menos 4 (com 5 a 7, alguns passam direto da 1ª fase).
- Quem cair tem 15s para reconectar antes de perder por abandono. No 2x2 o parceiro segue: o lugar de quem caiu
  fica parado (sem carta, repetindo a última arma) e o time só perde por abandono se os dois saírem.
- Temporada: todo dia 1º (Brasília), troféus acima de 1000 perdem metade do excedente e cada jogador
  ganha Ecto (e uma moldura a partir da Prata) pela melhor liga da temporada.

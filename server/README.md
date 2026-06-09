# JokenGhost — Servidor Multiplayer (Fase 1)

Backend Node.js + Socket.io para salas privadas 1v1 (Caçador vs Monstro).

## Rodar localmente

```bash
cd server
npm install
npm start
```

Servidor em `http://localhost:3001`.

## Deploy no Railway

1. Crie um projeto no [Railway](https://railway.app)
2. Conecte este repositório
3. Defina **Root Directory** = `server`
4. Variáveis de ambiente:
   - `PORT` — Railway define automaticamente
   - `CORS_ORIGIN` — `*` (prototipo) ou URL da Vercel, ex: `https://seu-app.vercel.app`
5. Deploy → copie a URL publica (ex: `https://jokenghost-mp.up.railway.app`)

## Configurar o frontend (Vercel)

Edite `multiplayer-config.js` na raiz do projeto:

```js
return 'https://SUA-URL.up.railway.app';
```

Ou passe na URL: `?server=https://SUA-URL.up.railway.app`

## Eventos Socket.io

| Cliente → Servidor | Payload |
|--------------------|---------|
| `create_room` | `{ nickname }` |
| `join_room` | `{ code, nickname }` |
| `pick_perk` | `{ perkId }` |
| `pick_attack` | `{ choice: 'pedra' \| 'papel' \| 'tesoura' }` |
| `leave_room` | — |

| Servidor → Cliente | Descrição |
|--------------------|-----------|
| `room_created` | Sala criada (host = Caçador) |
| `room_joined` | Entrou na sala (guest = Monstro) |
| `match_start` | Partida iniciou |
| `perk_phase` | Escolha de perk (12s) |
| `attack_phase` | Escolha de ataque (8s) |
| `round_result` | Resultado da rodada |
| `match_end` | Fim da partida (melhor de 3) |

## Testar com 2 abas

1. `npm start` no `server/`
2. Abra `index.html` via servidor local (ex: `npx serve .` na raiz)
3. Aba 1: Multiplayer → Criar sala
4. Aba 2: Multiplayer → Entrar com codigo `JGH-XXXX`

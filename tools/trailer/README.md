# Comercial do JokenGhost (9:16)

Vídeo de 30 segundos em 1080x1920 para Reels, TikTok e Shorts, feito com a arte e o som do próprio jogo.
Tudo é código: as cenas desenham cada quadro em função do tempo, então mudar um texto ou um tempo
e renderizar de novo gera o vídeo atualizado.

## Gerar o vídeo

```bash
npm run dev
```

Em outro terminal:

```bash
python tools/trailer/render.py
```

O vídeo sai em `tools/trailer/out/jokenghost-comercial.mp4` (H.264 + AAC, 30 fps) e a capa em
`tools/trailer/out/capa.png`. Precisa de Chrome ou Edge instalado e do pacote Python `imageio-ffmpeg`
(`pip install imageio-ffmpeg`), que traz o ffmpeg.

Para ver e ajustar antes, abra `http://localhost:5173/tools/trailer/` e use PRÉVIA (com som) e a
linha do tempo.

## Onde mexer

| Arquivo | O que tem |
|---------|-----------|
| `src/scenes.js` | roteiro: as 7 cenas, os textos (`CTA` no topo), os tempos e os efeitos sonoros (`CUES`) |
| `trailer.scrim` | trilha (Scrimshaw, 120 BPM: cada compasso dura 2s e casa com uma cena) |
| `src/stage.js` | ferramentas de desenho: cenários do jogo recortados em pé, sprites, texto pixelado, transições |
| `src/motion.js` | curvas de animação |
| `src/sound.js` | mixagem da trilha com os efeitos do jogo |
| `capture.py` / `render.py` | recebem os quadros e montam o MP4 |

Roteiro: floresta à meia-noite (0–4s), logo (4–8s), as três armas (8–12s), batalha com pista e golpe
super efetivo (12–18s), os 16 monstros (18–22s), Arena online (22–26s) e a chamada de acesso antecipado
(26–30s).

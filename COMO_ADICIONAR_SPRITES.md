# 🎨 Como Adicionar Sprites no JokenGhost

## 📁 Estrutura de Pastas
```
JokenGhost Caçada em Turnos/
└── Assests/
    └── Sprites_skeleton/
        ├── ghost_skeleton_stopped.png  (JOGADOR - já existe)
        └── [SEGUNDA_SPRITE].png        (INIMIGO - adicione aqui)
```

## 🚀 Sistema Automático
O jogo detecta automaticamente:
1. **Primeiro sprite** = JOGADOR
2. **Segundo sprite** = INIMIGO
3. Se só há um sprite, usa o mesmo para ambos

## 📋 Formatos Suportados
- `.png` (recomendado)
- `.jpg` / `.jpeg`
- `.bmp`

## 🎬 Tipos de Sprite Sheet Suportados

### Horizontal (Recomendado)
```
[Frame1][Frame2][Frame3][Frame4][Frame5]
```

### Vertical
```
[Frame1]
[Frame2]
[Frame3]
[Frame4]
[Frame5]
```

### Sprite Único
```
[UmFrame]
```

## ⚙️ O que acontece automaticamente:
- **Detecção**: Identifica se é sprite sheet ou sprite único
- **Recorte**: Extrai frames automaticamente
- **Animação**: Aplica animação fluída (100ms por frame)
- **Escala**: Ajusta ao tamanho correto na tela
- **Espelhamento**: Jogador olha para a direita

## 🎯 Tamanhos Atuais:
- **Jogador**: 160x180 pixels (primeiro plano)
- **Inimigo**: 120x140 pixels (fundo, mais distante)

## 📝 Para adicionar nova sprite:
1. Coloque o arquivo na pasta `Assests/Sprites_skeleton/`
2. Execute o jogo
3. O sistema carregará automaticamente!

### 💡 Exemplo de saída no console:
```
✅ Sprite JOGADOR carregado: skeleton_player.png (896x115, 7 frames)
✅ Sprite INIMIGO carregado: demon_enemy.png (512x64, 8 frames)
```

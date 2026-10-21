# 🎮 Sistema de Sprites Organizado - JokenGhost

## 📁 Nova Estrutura de Pastas
```
JokenGhost Caçada em Turnos/
└── Assests/
    └── Sprites/
        ├── Skeleton/
        │   ├── skeleton_idle.png      (animação parada)
        │   └── skeleton_attack.png    (animação ataque) [adicione aqui]
        └── Kastle/
            ├── kastle_idle.png        (animação parada) ✅
            └── kastle_attack.png      (animação ataque) [adicione aqui]
```

## 🎯 Como Adicionar Novos Personagens

### 1. Crie a pasta do personagem:
```
Assests/Sprites/[NOME_DO_PERSONAGEM]/
```

### 2. Adicione as sprites com nomes específicos:
- **`[nome]_idle.png`** - Animação parada
- **`[nome]_attack.png`** - Animação de ataque  
- **`[nome]_defend.png`** - Animação de defesa (futuro)

## ⚡ Sistema de Animação de Ataque

### 🎬 Quando acontece:
- **Inimigo vence a rodada** → Executa animação de ataque
- **Duração**: 1 segundo (1000ms)
- **Velocidade**: 100ms por frame (animação rápida)

### 🎮 Funcionamento:
1. Jogador escolhe: Pedra, Papel ou Tesoura
2. Inimigo escolhe aleatoriamente
3. **Se inimigo vence**: 
   - Executa `kastle_attack.png` UMA VEZ
   - Volta para `kastle_idle.png`
4. **Se jogador vence**: Continua animação idle

## 📋 Checklist para Adicionar Sprite de Ataque do Kastle:

1. ✅ Pasta criada: `Assests/Sprites/Kastle/`
2. ✅ Idle sprite: `kastle_idle.png` 
3. ❌ **Falta**: `kastle_attack.png` ← **ADICIONE AQUI**

## 🎨 Formatos Suportados:
- **Sprite sheet horizontal**: Múltiplos frames lado a lado
- **Sprite único**: Uma imagem só
- **Detecção automática**: Sistema detecta automaticamente

## 🎯 Resultado Esperado:
Quando o Kastle (inimigo) ganhar uma rodada, ele executará a animação de ataque uma vez, depois volta para idle!

---
**Para testar**: Adicione `kastle_attack.png` na pasta Kastle e jogue! 🚀

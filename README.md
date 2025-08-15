# JokenGhost - Caçada em Turnos 👻🎮

Um jogo de RPG estilo Pokémon com mecânicas de pedra-papel-tesoura, desenvolvido em Python com Pygame.

## 🎮 Como Jogar

- **Tecla 1**: Pedra 🪨
- **Tecla 2**: Papel 📄
- **Tecla 3**: Tesoura ✂️
- **ESC**: Sair do jogo

## 🚀 Características

- **Personagens Animados**: Skeleton (Jogador) vs Kastle (Inimigo)
- **Sistema de Sprite Sheets**: Suporte para animações idle e de ataque
- **Combate Estratégico**: Clássico pedra-papel-tesoura
- **Animações Dinâmicas**: Personagens reagem aos resultados das batalhas
- **Sistema de Vida**: Barras de HP visuais para ambos os lutadores

## 📋 Pré-requisitos

- Python 3.8+
- Pygame

## 🔧 Instalação

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/jokenghost-cacada-em-turnos.git
cd jokenghost-cacada-em-turnos
```

2. Instale as dependências:
```bash
pip install pygame
```

3. Execute o jogo:
```bash
python jokenghost.py
```

## 📁 Estrutura de Arquivos

```
JokenGhost Caçada em Turnos/
├── jokenghost.py           # Arquivo principal do jogo
├── Assests/
│   └── Sprites/
│       ├── Skeleton/       # Sprites do jogador
│       │   ├── skeleton_idle.png
│       │   └── skeleton_attack.png
│       └── Kastle/         # Sprites do inimigo
│           ├── kastle_idle.png
│           └── kast_basic_atack-Sheet.png
├── README.md
├── requirements.txt
└── .gitignore
```

## 🎨 Adicionando Novos Personagens

Para adicionar um novo personagem:

1. Crie uma pasta em `Assests/Sprites/[NOME_DO_PERSONAGEM]/`
2. Adicione os sprites:
   - `[nome]_idle.png` - Animação idle
   - `[nome]_attack.png` ou `[nome]_atack.png` - Animação de ataque
3. O jogo detectará automaticamente os novos sprites!

## 🛠️ Tecnologias Utilizadas

- **Python 3.11+**
- **Pygame** - Engine de jogos
- **Sistema modular** de sprites e animações

## 🎯 Mecânicas de Jogo

### Sistema de Combate
- **Pedra** vence **Tesoura**
- **Papel** vence **Pedra**
- **Tesoura** vence **Papel**

### Sistema de Animação
- Animações idle contínuas
- Animações de ataque quando o inimigo vence
- Detecção automática de sprite sheets

## 🔮 Próximas Atualizações

- [ ] Sistema de níveis
- [ ] Mais personagens
- [ ] Efeitos sonoros
- [ ] Sistema de pontuação
- [ ] Multiplayer local

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 👨‍💻 Desenvolvedor

Criado com ❤️ para diversão e aprendizado!

---

🎮 **Divirta-se jogando JokenGhost!** 👻

### Sistema de Batalha
- O jogo funciona como uma batalha estilo Pokémon
- Você (bloco azul) vs Ghost (bloco vermelho)
- Cada um tem 100 pontos de vida

### Mecânica do Jogo
1. **Escolha sua jogada**: Clique em PEDRA, PAPEL ou TESOURA
2. **O Ghost escolhe automaticamente** (aleatório)
3. **Resultados**:
   - ✅ **Você ganha a rodada**: Ghost perde 20 de vida
   - ❌ **Você perde a rodada**: Você perde 20 de vida  
   - 🤝 **Empate**: Ninguém perde vida

### Regras do Joken (Pedra, Papel, Tesoura)
- 🗿 **Pedra** vence ✂️ **Tesoura**
- 📄 **Papel** vence 🗿 **Pedra** 
- ✂️ **Tesoura** vence 📄 **Papel**

### Interface
- **Barras de vida** no topo da tela
- **Suas escolhas e do inimigo** são mostradas na parte inferior
- **Resultado da rodada** aparece no centro da tela
- Após 3 segundos, você pode fazer uma nova jogada

### Vitória/Derrota
- **Vitória**: Reduza a vida do Ghost para 0
- **Derrota**: Sua vida chega a 0
- Clique em "NOVO JOGO" para recomeçar

## Controles
- **Mouse**: Clique nos botões para interagir
- **ESC ou fechar janela**: Sair do jogo

## Características Técnicas
- **Linguagem**: Python 3.11+
- **Biblioteca**: Pygame
- **Resolução**: 800x600 pixels
- **FPS**: 60

## Executar o Jogo
```bash
python jokenghost.py
```

## Estrutura do Código
- **Estados do jogo**: Menu, Transição, Batalha, Resultado
- **Classes organizadas**: EstadoJogo, Escolha, JokenGhost
- **Sistema modular**: Fácil de expandir e modificar
- **Sintaxe limpa**: Código bem comentado e organizado

## Próximas Melhorias
- [ ] Substituir blocos por sprites
- [ ] Adicionar efeitos sonoros
- [ ] Animações de ataque
- [ ] Múltiplos inimigos
- [ ] Sistema de experiência
- [ ] Itens e power-ups

---
**Divirta-se caçando ghosts!** 👻🎮

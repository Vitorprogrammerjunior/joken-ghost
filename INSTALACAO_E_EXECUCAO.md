# 🎮 JokenGhost - Guia Completo de Instalação e Execução

Um jogo de RPG estilo Pokémon com mecânicas de pedra-papel-tesoura, desenvolvido em Python com Pygame.

## 📋 Índice
- [Pré-requisitos](#-pré-requisitos)
- [Instalação Passo a Passo](#-instalação-passo-a-passo)
- [Como Executar](#-como-executar)
- [Como Jogar](#-como-jogar)
- [Resolução de Problemas](#-resolução-de-problemas)
- [Estrutura do Projeto](#-estrutura-do-projeto)

## 🖥️ Pré-requisitos

### Sistema Operacional
- ✅ Windows 10/11
- ✅ macOS 10.15+
- ✅ Linux (Ubuntu 18.04+)

### Software Necessário
- **Python 3.8 ou superior** (recomendado: Python 3.9+)
- **pip** (gerenciador de pacotes do Python)
- **Git** (para clonar o repositório)

## 🚀 Instalação Passo a Passo

### Passo 1: Verificar Python
```bash
# Windows (PowerShell/CMD)
python --version

# macOS/Linux
python3 --version
```
**Resultado esperado:** `Python 3.x.x` (onde x.x é 8.0 ou superior)

### Passo 2: Clonar o Repositório
```bash
# Via HTTPS
git clone https://github.com/Vitorprogrammerjunior/joken-ghost.git

# Via SSH (se configurado)
git clone git@github.com:Vitorprogrammerjunior/joken-ghost.git

# Entrar na pasta do projeto
cd joken-ghost
```

### Passo 3: Criar Ambiente Virtual (Recomendado)
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

### Passo 4: Instalar Dependências
```bash
# Instalar pygame
pip install pygame

# OU instalar via requirements.txt
pip install -r requirements.txt
```

### Passo 5: Verificar Instalação
```bash
# Testar se pygame foi instalado corretamente
python -c "import pygame; print('Pygame versão:', pygame.version.ver)"
```
**Resultado esperado:** Mensagem mostrando a versão do pygame

## ▶️ Como Executar

### Método 1: Execução Direta
```bash
python jokenghost.py
```

### Método 2: Via Arquivo Batch (Windows)
```bash
# Execute o arquivo run_game.bat
./run_game.bat
```

### Método 3: Via Setup (Instalação Global)
```bash
pip install -e .
jokenghost
```

## 🎮 Como Jogar

### Controles
- **Tecla 1**: Escolher Pedra 🪨
- **Tecla 2**: Escolher Papel 📄
- **Tecla 3**: Escolher Tesoura ✂️
- **ESC**: Sair do jogo

### Mecânicas
- **Pedra** vence **Tesoura**
- **Papel** vence **Pedra**
- **Tesoura** vence **Papel**

### Objetivo
Derrotar o inimigo Kastle usando estratégia no clássico jogo de pedra-papel-tesoura!

## 🔧 Resolução de Problemas

### Erro: "ModuleNotFoundError: No module named 'pygame'"
```bash
# Solução 1: Reinstalar pygame
pip uninstall pygame
pip install pygame

# Solução 2: Verificar ambiente virtual
# Certifique-se de que o ambiente virtual está ativado
```

### Erro: "python: command not found"
- **Windows**: Adicione Python ao PATH do sistema
- **macOS/Linux**: Use `python3` em vez de `python`

### Erro de Permissão (Linux/macOS)
```bash
# Dar permissão de execução
chmod +x jokenghost.py
```

### Problema com Sprites/Imagens
- Verifique se a pasta `Assests/Sprites/` existe
- Confirme se todas as imagens PNG estão presentes:
  - `Assests/Sprites/Kastle/kast_basic_atack-Sheet.png`
  - `Assests/Sprites/Kastle/kastle_idle.png`
  - `Assests/Sprites/Skeleton/skeleton_idle.png`

### Performance/Lag
- Feche outros programas que consomem muita GPU
- Verifique se os drivers gráficos estão atualizados

## 📁 Estrutura do Projeto

```
joken-ghost/
├── jokenghost.py                    # 🎮 Arquivo principal do jogo
├── requirements.txt                 # 📦 Dependências do projeto
├── setup.py                        # ⚙️ Script de instalação
├── run_game.bat                    # 🏃 Script para Windows
├── README.md                       # 📖 Documentação original
├── INSTALACAO_E_EXECUCAO.md       # 📋 Este guia
├── LICENSE                         # ⚖️ Licença do projeto
├── GITHUB_GUIDE.md                # 🐙 Guia do GitHub
├── SISTEMA_SPRITES_ORGANIZADO.md  # 🎨 Documentação de sprites
├── COMO_ADICIONAR_SPRITES.md      # ➕ Como adicionar novos sprites
├── criar_sprite_ghost.py          # 🔧 Utilitário para sprites
└── Assests/                       # 🎨 Recursos do jogo
    └── Sprites/
        ├── Kastle/                # 👹 Sprites do inimigo
        │   ├── kast_basic_atack-Sheet.png
        │   └── kastle_idle.png
        ├── Skeleton/              # 💀 Sprites do jogador
        │   └── skeleton_idle.png
        └── Sprites_skeleton/      # 👻 Sprites extras
            └── ghost_enemy.png
```

## 🔍 Informações Técnicas

### Dependências
- **pygame**: 2.5.2+ (Biblioteca para jogos 2D)
- **Python**: 3.8+ (Linguagem de programação)

### Especificações do Jogo
- **Resolução**: Adaptável
- **FPS**: 60 quadros por segundo
- **Estilo**: 2D com sprites animados
- **Gênero**: RPG de turnos com mecânicas arcade

## 📞 Suporte

Se encontrar problemas:

1. **Verifique se seguiu todos os passos** deste guia
2. **Consulte a seção de resolução de problemas** acima
3. **Abra uma issue** no repositório GitHub
4. **Verifique se seu sistema atende os pré-requisitos**

## 🏆 Sucesso!

Se tudo correu bem, você deve ver:
- Uma janela do jogo abrindo
- Sprites dos personagens carregando
- Interface de combate funcionando
- Controles responsivos

**Divirta-se jogando JokenGhost! 🎮👻**

---

*Desenvolvido com ❤️ usando Python e Pygame*

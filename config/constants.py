"""
Arquivo de constantes e configurações do jogo JokenGhost.
Centraliza todas as configurações de cores, dimensões e valores do jogo.
"""

# ===== CONFIGURAÇÕES DE TELA =====
LARGURA = 800
ALTURA = 600
FPS = 60

# ===== CORES DO JOGO =====
PRETO = (0, 0, 0)
BRANCO = (255, 255, 255)
AZUL = (0, 100, 200)
VERDE = (0, 200, 0)
VERMELHO = (200, 0, 0)
AMARELO = (255, 255, 0)
DOURADO = (255, 215, 0)
CINZA = (128, 128, 128)
CINZA_CLARO = (200, 200, 200)
MARROM_LOJA = (139, 104, 75)  # Cor marrom similar à Loja-Sheet
MARROM_LOJA_CLARO = (160, 120, 90)  # Versão mais clara para hover

# Cores específicas do sistema (mantidas para compatibilidade)
ROXO = (128, 0, 128)
AZUL_ESCURO = (0, 0, 139)
ROXO_ESCURO = (75, 0, 130)

# ===== CONFIGURAÇÕES DE JOGO =====
VIDA_INICIAL_JOGADOR = 100
VIDA_INICIAL_INIMIGO = 100

# Sistema de dano
DANO_JOGADOR = 25
DANO_INIMIGO = 20

# Sistema de recompensas
RECOMPENSA_PEDRA = 25  # Aspirador Espiritual (efetivo vs fantasmas)
RECOMPENSA_PADRAO = 15  # Cruz e Estaca
RECOMPENSA_VITORIA_BASE = 60

# ===== CONFIGURAÇÕES DE ANIMAÇÃO =====
VELOCIDADE_ENTRADA = 8
VELOCIDADE_MENU = 15
VELOCIDADE_ANIMACAO_BOTOES = 8
DURACAO_SHAKE = 500  # 0.5 segundos
DURACAO_ESPERA_ROTACAO = 800  # 0.8 segundos
DURACAO_TOAST = 3000  # 3 segundos

# Animações de sprites
INTERVALO_FRAME = 150  # Milissegundos entre frames
DURACAO_ANIMACAO_ATAQUE = 0.6  # Segundos

# ===== CONFIGURAÇÕES DE INTERFACE =====
# Posições dos botões principais
BOTOES_Y_ORIGINAL = ALTURA - 130
BOTOES_Y_ESCONDIDO = ALTURA + 50

# Configurações do monstruário
MONSTRUARIO_LARGURA = 600
MONSTRUARIO_ALTURA = 400

# ===== CONFIGURAÇÕES DE FONTES =====
FONTE_TITULO_TAMANHO = 48
FONTE_TEXTO_TAMANHO = 18
FONTE_PEQUENA_TAMANHO = 10
FONTE_BOLD_TAMANHO = 20

# ===== CONFIGURAÇÕES DE SPRITES =====
SPRITE_JOGADOR_LARGURA = 120
SPRITE_JOGADOR_ALTURA = 140
SPRITE_INIMIGO_LARGURA_BASE = 120
SPRITE_INIMIGO_ALTURA_BASE = 140

# ===== CONFIGURAÇÕES DE AUDIO =====
# (Preparado para futuras implementações de som)
VOLUME_MASTER = 0.7
VOLUME_SFX = 0.8
VOLUME_MUSIC = 0.6

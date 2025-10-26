"""
Arquivo de constantes e configurações do jogo JokenGhost.
Centraliza todas as configurações de cores, dimensões e valores do jogo.
"""

# ===== CONFIGURAÇÕES DE TELA =====
LARGURA = 1280
ALTURA = 720
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

# ===== TAMANHOS E POSIÇÕES DOS PERSONAGENS (LAYOUT VERTICAL) =====

# --- TAMANHOS (Mantidos como antes) ---
JOGADOR_ALTURA = int(ALTURA * 0.25)
JOGADOR_LARGURA = int(JOGADOR_ALTURA * 0.8) 
INIMIGO_ALTURA_PADRAO = int(ALTURA * 0.20) # Tamanho padrão para inimigos
INIMIGO_LARGURA_PADRAO = int(INIMIGO_ALTURA_PADRAO * 0.9) 

# --- POSIÇÃO DO JOGADOR (Embaixo e Centralizado) ---
JOGADOR_POS_X = (LARGURA // 3.8) - (JOGADOR_LARGURA // 3.8) #  horizontalmente
JOGADOR_POS_Y = int(ALTURA * 0.8) - JOGADOR_ALTURA # Perto da base (80% para baixo)

# --- POSIÇÕES DOS INIMIGOS (Em cima, alinhados horizontalmente) ---
# Linha Y onde os inimigos ficarão (perto do topo)
INIMIGO_POS_Y = int(ALTURA * 0.25) 

# Calcular espaçamento e X inicial para centralizar o bloco de inimigos
NUM_SLOTS_INIMIGOS = 3
ESPACO_ENTRE_INIMIGOS = int(LARGURA * 0.05) # 5% da largura da tela
LARGURA_TOTAL_INIMIGOS = (INIMIGO_LARGURA_PADRAO * NUM_SLOTS_INIMIGOS) + (ESPACO_ENTRE_INIMIGOS * (NUM_SLOTS_INIMIGOS - 1))
INIMIGO_X_INICIAL = (LARGURA - LARGURA_TOTAL_INIMIGOS) // 1.3

# Posições X para cada slot (linearmente)
INIMIGO_POS_1_X = INIMIGO_X_INICIAL
INIMIGO_POS_2_X = INIMIGO_X_INICIAL + INIMIGO_LARGURA_PADRAO + ESPACO_ENTRE_INIMIGOS
INIMIGO_POS_3_X = INIMIGO_X_INICIAL + (INIMIGO_LARGURA_PADRAO + ESPACO_ENTRE_INIMIGOS) * 2

# --- Constantes para EnemyManager (Manter compatibilidade com a rotação) ---
INIMIGO_FRENTE_X = INIMIGO_POS_2_X # O do meio será o "frente" inicial
INIMIGO_FRENTE_Y = INIMIGO_POS_Y
INIMIGO_FRENTE_LARGURA = INIMIGO_LARGURA_PADRAO
INIMIGO_FRENTE_ALTURA = INIMIGO_ALTURA_PADRAO

INIMIGO_MEIO_X = INIMIGO_POS_1_X # O da esquerda será o "meio"
INIMIGO_MEIO_Y = INIMIGO_POS_Y
INIMIGO_MEIO_LARGURA = INIMIGO_LARGURA_PADRAO
INIMIGO_MEIO_ALTURA = INIMIGO_ALTURA_PADRAO

INIMIGO_ATRAS_X = INIMIGO_POS_3_X # O da direita será o "atrás"
INIMIGO_ATRAS_Y = INIMIGO_POS_Y
INIMIGO_ATRAS_LARGURA = INIMIGO_LARGURA_PADRAO
INIMIGO_ATRAS_ALTURA = INIMIGO_ALTURA_PADRAO

# ===== CONFIGURAÇÃO GLOBAL DE SPRITES (SEMPRE FUNCIONARÁ) =====
# Configuração garantida para sprite do Ghost - primeira fase
GHOST_SPRITE_PATH = "Assests/Sprites/Ghost/Sprite_fantasma.idle (1).png"
GHOST_SPRITE_CONFIG = {
    'arquivo': 'Sprite_fantasma.idle (1).png',
    'pasta': 'Ghost',
    'tipo': 'horizontal',  # sprite sheet horizontal
    'frames': 12,  # 12 frames detectados automaticamente
    'frame_width': 640,  # largura detectada automaticamente
    'frame_height': 640,  # altura detectada automaticamente
    'velocidade_animacao': 150,  # ms entre frames
    'loop': True  # animação em loop contínuo
}

# Configuração de fallback caso sprite não seja encontrada
SPRITE_FALLBACK_CONFIG = {
    'cor': VERMELHO,
    'largura': 80,
    'altura': 100,
    'forma': 'retangulo'
}

# ===== CONFIGURAÇÕES DE AUDIO =====
# (Preparado para futuras implementações de som)
VOLUME_MASTER = 0.7
VOLUME_SFX = 0.8
VOLUME_MUSIC = 0.6

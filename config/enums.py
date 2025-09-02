"""
Enumerações e classes de estado do jogo JokenGhost.
Define os estados, tipos e escolhas usados em todo o jogo.
"""

from enum import Enum

class EstadoAnimacao(Enum):
    """Estados de animação dos personagens."""
    IDLE = 1
    ATAQUE = 2

class EstadoJogo(Enum):
    """Estados principais do jogo."""
    MENU_PRINCIPAL = 1
    INTRODUCAO = 2
    TRANSICAO = 3
    JOGANDO = 4
    GAME_OVER = 5
    VITORIA = 6

class TipoMenu(Enum):
    """Tipos de menu de seleção."""
    ATAQUES = 1
    LOJA = 2
    MONSTRUARIO = 3

class Escolha(Enum):
    """Escolhas de ataque disponíveis no jogo."""
    PEDRA = 1    # Aspirador Espiritual
    PAPEL = 2    # Cruz Sagrada
    TESOURA = 3  # Estaca de Madeira

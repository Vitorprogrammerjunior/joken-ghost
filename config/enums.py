"""
Enumerações e classes de estado do jogo JokenGhost.
Define os estados, tipos e escolhas usados em todo o jogo.
"""

from enum import Enum

class EstadoAnimacao(Enum):
    """Estados de animação dos personagens."""
    IDLE = 1
    ATAQUE = 2
    DEFENDENDO = 3

class EstadoJogo(Enum):
    """Estados principais do jogo."""
    MENU = 1
    INTRO = 2
    TRANSICAO = 3
    BATALHA = 4
    RESULTADO = 5
    MENU_SELECAO = 6  # Novo estado para menu de seleção

class TipoMenu(Enum):
    """Tipos de menu de seleção."""
    ATAQUES = 1
    LOJA = 2
    MONSTRUARIO = 3

class Escolha(Enum):
    """Escolhas de ataque disponíveis no jogo."""
    PEDRA = 1    # Estaca de Madeira
    PAPEL = 2    # Aspirador Espiritual  
    TESOURA = 3  # Cruz Sagrada

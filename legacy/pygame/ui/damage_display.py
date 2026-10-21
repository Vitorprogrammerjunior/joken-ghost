"""
Sistema de exibição de dano visual estilo RPG.
Responsável por mostrar números de dano flutuantes na tela.
"""

import pygame
import math
from config.constants import *

class DamageText:
    """Representa um texto de dano flutuante."""
    
    def __init__(self, x, y, dano, tipo_dano="normal", fonte=None):
        """
        Inicializa um texto de dano.
        
        Args:
            x, y: Posição inicial
            dano: Valor do dano
            tipo_dano: "normal", "critico", "cura", "miss"
            fonte: Fonte pygame para renderizar
        """
        self.x_inicial = x
        self.y_inicial = y
        self.x = x
        self.y = y
        self.dano = dano
        self.tipo_dano = tipo_dano
        self.tempo_vida = 0
        self.duracao = 2000  # 2 segundos
        self.ativo = True
        
        # Configuração visual baseada no tipo
        self.configurar_visual(tipo_dano)
        
        # Fonte
        self.fonte = fonte or pygame.font.Font(None, 32)
        
        # Velocidade de movimento
        self.vel_y = -2  # Move para cima
        self.vel_x = 0
        
        # Efeito de fade
        self.alpha = 255
        
    def configurar_visual(self, tipo_dano):
        """Configura cores e efeitos baseados no tipo de dano."""
        if tipo_dano == "critico":
            self.cor = (255, 100, 100)  # Vermelho crítico
            self.escala = 1.5
            self.vel_y = -3
        elif tipo_dano == "cura":
            self.cor = (100, 255, 100)  # Verde cura
            self.escala = 1.2
            self.vel_y = -1.5
        elif tipo_dano == "miss":
            self.cor = (200, 200, 200)  # Cinza miss
            self.escala = 1.0
            self.vel_y = -1
        else:  # normal
            self.cor = (255, 255, 100)  # Amarelo normal
            self.escala = 1.0
            self.vel_y = -2
    
    def atualizar(self, delta_time):
        """Atualiza a animação do texto."""
        if not self.ativo:
            return
            
        self.tempo_vida += delta_time
        
        # Movimento
        self.y += self.vel_y
        self.x += self.vel_x
        
        # Diminui velocidade gradualmente
        self.vel_y *= 0.98
        
        # Fade out nos últimos 500ms
        if self.tempo_vida > self.duracao - 500:
            fade_progress = (self.tempo_vida - (self.duracao - 500)) / 500
            self.alpha = int(255 * (1 - fade_progress))
        
        # Remove quando tempo acabar
        if self.tempo_vida >= self.duracao:
            self.ativo = False
    
    def desenhar(self, tela):
        """Desenha o texto na tela."""
        if not self.ativo:
            return
            
        # Texto do dano
        if self.tipo_dano == "miss":
            texto = "MISS!"
        elif self.tipo_dano == "critico":
            texto = f"CRÍTICO! {self.dano}"
        elif self.tipo_dano == "cura":
            texto = f"+{self.dano}"
        else:
            texto = str(self.dano)
        
        # Renderiza com alpha
        surface_texto = self.fonte.render(texto, True, self.cor)
        
        # Aplica transparência
        if self.alpha < 255:
            surface_texto.set_alpha(self.alpha)
        
        # Calcula posição com escala
        rect = surface_texto.get_rect()
        rect.centerx = int(self.x)
        rect.centery = int(self.y)
        
        # Desenha sombra
        surface_sombra = self.fonte.render(texto, True, (0, 0, 0))
        if self.alpha < 255:
            surface_sombra.set_alpha(self.alpha // 2)
        
        rect_sombra = rect.copy()
        rect_sombra.x += 2
        rect_sombra.y += 2
        tela.blit(surface_sombra, rect_sombra)
        
        # Desenha texto principal
        tela.blit(surface_texto, rect)


class DamageDisplayManager:
    """Gerenciador de todos os textos de dano na tela."""
    
    def __init__(self):
        """Inicializa o gerenciador."""
        self.textos_dano = []
        
        # Carrega fontes
        try:
            self.fonte_normal = pygame.font.Font(None, 28)
            self.fonte_critico = pygame.font.Font(None, 36)
        except:
            self.fonte_normal = pygame.font.Font(None, 24)
            self.fonte_critico = pygame.font.Font(None, 32)
    
    def adicionar_dano(self, x, y, dano, tipo_dano="normal"):
        """
        Adiciona um novo texto de dano.
        
        Args:
            x, y: Posição onde mostrar o dano
            dano: Valor do dano
            tipo_dano: "normal", "critico", "cura", "miss"
        """
        # Adiciona variação na posição para evitar sobreposição
        offset_x = len(self.textos_dano) * 10 - 20
        offset_y = len(self.textos_dano) * 5
        
        fonte = self.fonte_critico if tipo_dano == "critico" else self.fonte_normal
        
        texto_dano = DamageText(
            x + offset_x, 
            y + offset_y, 
            dano, 
            tipo_dano, 
            fonte
        )
        
        self.textos_dano.append(texto_dano)
    
    def adicionar_dano_jogador(self, dano):
        """Adiciona dano recebido pelo jogador (lado esquerdo)."""
        self.adicionar_dano(100, ALTURA // 2, dano, "normal")
    
    def adicionar_dano_inimigo(self, inimigo, dano, tipo_dano="normal"):
        """
        Adiciona dano recebido por um inimigo.
        
        Args:
            inimigo: Dicionário do inimigo
            dano: Valor do dano
            tipo_dano: Tipo do dano
        """
        if isinstance(inimigo, dict):
            x = inimigo.get('pos_x', 0) + inimigo.get('largura', 0) // 2
            y = inimigo.get('pos_y', 0)
            self.adicionar_dano(x, y, dano, tipo_dano)
    
    def adicionar_miss(self, x, y):
        """Adiciona indicador de miss."""
        self.adicionar_dano(x, y, 0, "miss")
    
    def adicionar_cura(self, x, y, valor):
        """Adiciona indicador de cura."""
        self.adicionar_dano(x, y, valor, "cura")
    
    def atualizar(self, delta_time):
        """Atualiza todos os textos de dano."""
        # Contar textos antes da limpeza
        textos_antes = len(self.textos_dano)
        
        # Remove textos inativos
        self.textos_dano = [t for t in self.textos_dano if t.ativo]
        
        # Contar textos depois da limpeza
        textos_depois = len(self.textos_dano)
        
        # Debug: mostrar limpeza se houve mudança
        if textos_antes != textos_depois:
            removidos = textos_antes - textos_depois
            print(f"🧹 DamageDisplay: {removidos} números de dano removidos ({textos_antes}→{textos_depois})")
        
        # Atualiza textos ativos
        for texto in self.textos_dano:
            texto.atualizar(delta_time)
    
    def desenhar(self, tela):
        """Desenha todos os textos de dano."""
        for texto in self.textos_dano:
            texto.desenhar(tela)
    
    def limpar_todos(self):
        """Remove todos os textos de dano."""
        textos_removidos = len(self.textos_dano)
        self.textos_dano.clear()
        if textos_removidos > 0:
            print(f"🧹 DamageDisplay: LIMPEZA TOTAL - {textos_removidos} números removidos")

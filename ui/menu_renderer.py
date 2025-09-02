"""
Sistema de renderização de menus específicos do jogo.
Responsável por desenhar menus de ataques, loja e monstruário.
"""

import pygame
from config.constants import *
from config.enums import *

class MenuRenderer:
    """Renderizador de menus específicos."""
    
    def __init__(self, resource_manager):
        """Inicializa o renderizador de menus."""
        self.resource_manager = resource_manager
        
    def desenhar_menu_ataques(self, tela, ui_manager, mouse_pos):
        """Desenha o menu de seleção de ataques."""
        if ui_manager.menu_altura <= 0:
            return
            
        # Superfície do menu
        menu_surface = pygame.Surface((650, ui_manager.menu_altura))
        menu_surface.set_alpha(230)
        menu_surface.fill(AZUL_ESCURO)
        
        menu_x = (LARGURA - 650) // 2
        menu_y = ALTURA - ui_manager.menu_altura - 140
        
        # Desenha a superfície do menu
        tela.blit(menu_surface, (menu_x, menu_y))
        
        # Borda do menu
        pygame.draw.rect(tela, BRANCO, (menu_x, menu_y, 650, ui_manager.menu_altura), 3)
        
        # Título
        fonte_texto = self.resource_manager.obter_fonte('texto')
        titulo = fonte_texto.render("ESCOLHA SEU ATAQUE", True, BRANCO)
        titulo_rect = titulo.get_rect(center=(menu_x + 325, menu_y + 40))
        tela.blit(titulo, titulo_rect)
        
        # Botões de ataque
        if ui_manager.menu_altura >= 150:
            # Atualiza posições dos botões de ataque
            botoes_y = menu_y + 80
            ui_manager.botoes['pedra']['rect'].y = botoes_y
            ui_manager.botoes['papel']['rect'].y = botoes_y
            ui_manager.botoes['tesoura']['rect'].y = botoes_y
            
            # Ajusta posições X dos botões
            ui_manager.botoes['pedra']['rect'].x = menu_x + 50
            ui_manager.botoes['papel']['rect'].x = menu_x + 250
            ui_manager.botoes['tesoura']['rect'].x = menu_x + 450
            
            # Desenha os botões
            ui_manager.desenhar_botao(tela, 'pedra', mouse_pos)
            ui_manager.desenhar_botao(tela, 'papel', mouse_pos)
            ui_manager.desenhar_botao(tela, 'tesoura', mouse_pos)
            
            # Informações dos ataques
            if ui_manager.menu_altura >= 250:
                fonte_pequena = self.resource_manager.obter_fonte('pequena')
                
                info_y = botoes_y + 90
                
                # Info PEDRA
                texto_pedra = fonte_pequena.render("Efetivo contra TESOURA", True, VERDE)
                texto_rect = texto_pedra.get_rect(center=(menu_x + 140, info_y))
                tela.blit(texto_pedra, texto_rect)
                
                # Info PAPEL
                texto_papel = fonte_pequena.render("Efetivo contra PEDRA", True, VERDE)
                texto_rect = texto_papel.get_rect(center=(menu_x + 340, info_y))
                tela.blit(texto_papel, texto_rect)
                
                # Info TESOURA
                texto_tesoura = fonte_pequena.render("Efetivo contra PAPEL", True, VERDE)
                texto_rect = texto_tesoura.get_rect(center=(menu_x + 540, info_y))
                tela.blit(texto_tesoura, texto_rect)
                
    def desenhar_menu_loja(self, tela, ui_manager, mouse_pos, loja_manager):
        """Desenha o menu da loja."""
        if ui_manager.menu_altura <= 0:
            return
            
        # Superfície do menu
        menu_surface = pygame.Surface((650, ui_manager.menu_altura))
        menu_surface.set_alpha(230)
        menu_surface.fill(MARROM_LOJA)
        
        menu_x = (LARGURA - 650) // 2
        menu_y = ALTURA - ui_manager.menu_altura - 140
        
        # Desenha a superfície do menu
        tela.blit(menu_surface, (menu_x, menu_y))
        
        # Borda do menu
        pygame.draw.rect(tela, DOURADO, (menu_x, menu_y, 650, ui_manager.menu_altura), 3)
        
        # Título
        fonte_texto = self.resource_manager.obter_fonte('texto')
        titulo = fonte_texto.render("LOJA DO CAÇADOR", True, DOURADO)
        titulo_rect = titulo.get_rect(center=(menu_x + 325, menu_y + 40))
        tela.blit(titulo, titulo_rect)
        
        # Desenha itens da loja se o menu estiver aberto o suficiente
        if ui_manager.menu_altura >= 200:
            loja_manager.desenhar_itens(tela, menu_x, menu_y + 70, mouse_pos)
            
    def desenhar_menu_monstruario(self, tela, ui_manager, mouse_pos, monstruario_manager):
        """Desenha o menu do monstruário."""
        if ui_manager.menu_altura <= 0:
            return
            
        # Superfície do menu
        menu_surface = pygame.Surface((650, ui_manager.menu_altura))
        menu_surface.set_alpha(230)
        menu_surface.fill(ROXO_ESCURO)
        
        menu_x = (LARGURA - 650) // 2
        menu_y = ALTURA - ui_manager.menu_altura - 140
        
        # Desenha a superfície do menu
        tela.blit(menu_surface, (menu_x, menu_y))
        
        # Borda do menu
        pygame.draw.rect(tela, ROXO, (menu_x, menu_y, 650, ui_manager.menu_altura), 3)
        
        # Título
        fonte_texto = self.resource_manager.obter_fonte('texto')
        titulo = fonte_texto.render("MONSTRUÁRIO", True, ROXO)
        titulo_rect = titulo.get_rect(center=(menu_x + 325, menu_y + 40))
        tela.blit(titulo, titulo_rect)
        
        # Desenha o monstruário se o menu estiver aberto o suficiente
        if ui_manager.menu_altura >= 200:
            monstruario_manager.desenhar_monstruario(tela, menu_x, menu_y + 70, mouse_pos)
            
    def desenhar_game_over(self, tela, ui_manager, mouse_pos):
        """Desenha a tela de game over."""
        tela.fill(PRETO)
        
        # Título
        fonte_titulo = self.resource_manager.obter_fonte('titulo')
        titulo = fonte_titulo.render("GAME OVER", True, VERMELHO)
        titulo_rect = titulo.get_rect(center=(LARGURA//2, ALTURA//2 - 50))
        tela.blit(titulo, titulo_rect)
        
        # Botão de reiniciar
        ui_manager.desenhar_botao(tela, 'reiniciar', mouse_pos)
        
    def desenhar_vitoria(self, tela, ui_manager, mouse_pos, pontos, inimigos_derrotados):
        """Desenha a tela de vitória."""
        tela.fill(AZUL_ESCURO)
        
        # Título
        fonte_titulo = self.resource_manager.obter_fonte('titulo')
        titulo = fonte_titulo.render("VITÓRIA!", True, DOURADO)
        titulo_rect = titulo.get_rect(center=(LARGURA//2, ALTURA//2 - 100))
        tela.blit(titulo, titulo_rect)
        
        # Estatísticas
        fonte_texto = self.resource_manager.obter_fonte('texto')
        stats_texto = fonte_texto.render(f"Pontos: {pontos}", True, BRANCO)
        stats_rect = stats_texto.get_rect(center=(LARGURA//2, ALTURA//2 - 30))
        tela.blit(stats_texto, stats_rect)
        
        inimigos_texto = fonte_texto.render(f"Inimigos Derrotados: {inimigos_derrotados}", True, BRANCO)
        inimigos_rect = inimigos_texto.get_rect(center=(LARGURA//2, ALTURA//2 + 10))
        tela.blit(inimigos_texto, inimigos_rect)
        
        # Botão de reiniciar
        ui_manager.desenhar_botao(tela, 'reiniciar', mouse_pos)
        
    def desenhar_resultado_combate(self, tela, resultado_texto, cor_resultado, fade_alpha):
        """Desenha o resultado do combate com fade."""
        if fade_alpha > 0:
            fonte_titulo = self.resource_manager.obter_fonte('titulo')
            resultado_surface = fonte_titulo.render(resultado_texto, True, cor_resultado)
            resultado_surface.set_alpha(fade_alpha)
            resultado_rect = resultado_surface.get_rect(center=(LARGURA//2, ALTURA//2))
            tela.blit(resultado_surface, resultado_rect)
            
    def desenhar_tooltip(self, tela, ui_manager):
        """Desenha tooltip quando ativo."""
        if not ui_manager.tooltip_ativo:
            return
            
        fonte_pequena = self.resource_manager.obter_fonte('pequena')
        texto_surface = fonte_pequena.render(ui_manager.tooltip_texto, True, BRANCO)
        
        # Fundo do tooltip
        padding = 10
        tooltip_rect = pygame.Rect(
            ui_manager.tooltip_pos[0] - padding,
            ui_manager.tooltip_pos[1] - texto_surface.get_height() - padding,
            texto_surface.get_width() + padding * 2,
            texto_surface.get_height() + padding * 2
        )
        
        # Ajusta posição se sair da tela
        if tooltip_rect.right > LARGURA:
            tooltip_rect.x = LARGURA - tooltip_rect.width
        if tooltip_rect.top < 0:
            tooltip_rect.y = ui_manager.tooltip_pos[1] + 20
            
        pygame.draw.rect(tela, PRETO, tooltip_rect)
        pygame.draw.rect(tela, BRANCO, tooltip_rect, 2)
        
        # Desenha o texto
        texto_pos = (tooltip_rect.x + padding, tooltip_rect.y + padding)
        tela.blit(texto_surface, texto_pos)
        
    def mostrar_tooltip(self, ui_manager, texto, pos):
        """Mostra um tooltip na posição especificada."""
        ui_manager.tooltip_ativo = True
        ui_manager.tooltip_texto = texto
        ui_manager.tooltip_pos = pos
        
    def esconder_tooltip(self, ui_manager):
        """Esconde o tooltip."""
        ui_manager.tooltip_ativo = False

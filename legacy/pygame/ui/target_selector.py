"""
Sistema de Seleção de Alvos - JokenGhost
Gerencia a interface para seleção de inimigos
"""

import pygame
import math
from config.constants import *
from config.enums import *

class TargetSelector:
    """Gerencia a seleção visual de alvos na tela."""
    
    def __init__(self):
        self.modo_selecao_ativo = False
        self.alvo_destacado = None
        self.tempo_highlight = 0
        self.cor_highlight = AMARELO
        self.callback_selecao = None
        self.inimigos_referencia = []  # Armazena referência dos inimigos para desenho
        
    def ativar_modo_selecao(self, callback_selecao):
        """
        Ativa o modo de seleção de alvos.
        
        Args:
            callback_selecao: Função chamada quando alvo é selecionado
        """
        self.modo_selecao_ativo = True
        self.callback_selecao = callback_selecao
        self.alvo_destacado = None
        self.inimigos_referencia = []
        print("🎯 Modo de seleção ativo - Clique em um inimigo!")
        
    def definir_inimigos_referencia(self, inimigos):
        """Define a lista de inimigos para desenho."""
        self.inimigos_referencia = inimigos
        
    def ativar_modo_selecao(self, callback_funcao):
        """
        Ativa o modo de seleção de alvos.
        
        Args:
            callback_funcao: Função a ser chamada quando um alvo for selecionado
        """
        self.modo_selecao_ativo = True
        self.callback_selecao = callback_funcao
        self.alvo_destacado = None
        print("🎯 Modo de seleção ativo - Clique em um inimigo!")
        
    def desativar_modo_selecao(self):
        """Desativa o modo de seleção."""
        self.modo_selecao_ativo = False
        self.alvo_destacado = None
        self.callback_selecao = None
        
    def processar_clique(self, mouse_pos, inimigos):
        """
        Processa clique do mouse para seleção de alvo.
        
        Args:
            mouse_pos: Posição do mouse (x, y)
            inimigos: Lista de inimigos
            
        Returns:
            int or None: Índice do inimigo selecionado ou None
        """
        if not self.modo_selecao_ativo:
            return None
            
        for i, inimigo in enumerate(inimigos):
            # Verifica se o inimigo é um dicionário válido
            if not isinstance(inimigo, dict):
                continue
            if not inimigo.get('ativo', False) or inimigo.get('vida_atual', 0) <= 0:
                continue
                
            # Verifica se o clique está dentro da área do inimigo
            rect_inimigo = pygame.Rect(
                inimigo['pos_x'], 
                inimigo['pos_y'], 
                inimigo['largura'], 
                inimigo['altura']
            )
            
            if rect_inimigo.collidepoint(mouse_pos):
                # Alvo selecionado!
                if self.callback_selecao:
                    self.callback_selecao(i)
                self.desativar_modo_selecao()
                return i
                
        return None
    
    def atualizar_highlight(self, mouse_pos, inimigos):
        """
        Atualiza o destaque visual do inimigo sob o mouse.
        
        Args:
            mouse_pos: Posição atual do mouse
            inimigos: Lista de inimigos
        """
        if not self.modo_selecao_ativo:
            self.alvo_destacado = None
            return
            
        self.alvo_destacado = None
        
        for i, inimigo in enumerate(inimigos):
            # Verifica se o inimigo é um dicionário válido
            if not isinstance(inimigo, dict):
                continue
            if not inimigo.get('ativo', False) or inimigo.get('vida_atual', 0) <= 0:
                continue
                
            rect_inimigo = pygame.Rect(
                inimigo['pos_x'], 
                inimigo['pos_y'], 
                inimigo['largura'], 
                inimigo['altura']
            )
            
            if rect_inimigo.collidepoint(mouse_pos):
                self.alvo_destacado = i
                break
    
    def desenhar_indicadores(self, tela, inimigos):
        """
        Desenha indicadores visuais de seleção.
        
        Args:
            tela: Surface do pygame para desenhar
            inimigos: Lista de inimigos
        """
        if not self.modo_selecao_ativo:
            return
            
        # Atualiza tempo para animação
        self.tempo_highlight += 16  # ~60 FPS
        
        # Cores melhoradas
        intensidade = abs(math.sin(self.tempo_highlight * 0.008)) * 80 + 175
        cor_pulsante = (intensidade, intensidade, 0)  # Amarelo pulsante
        cor_hover = (0, 255, 100)  # Verde para hover
        
        # === NOVO: Desenha hitbox de todos os inimigos válidos ===
        for i, inimigo in enumerate(inimigos):
            if not isinstance(inimigo, dict):
                continue
            if not inimigo.get('ativo', False) or inimigo.get('vida_atual', 0) <= 0:
                continue
                
            # Hitbox sutil para todos os inimigos
            if i == self.alvo_destacado:
                # Hitbox destacada para hover
                pygame.draw.rect(tela, (0, 255, 150, 120), 
                               (inimigo['pos_x'] - 3, 
                                inimigo['pos_y'] - 3, 
                                inimigo['largura'] + 6, 
                                inimigo['altura'] + 6), 0)
            else:
                # Hitbox sutil para os outros
                pygame.draw.rect(tela, (100, 100, 100), 
                               (inimigo['pos_x'] - 1, 
                                inimigo['pos_y'] - 1, 
                                inimigo['largura'] + 2, 
                                inimigo['altura'] + 2), 1)
        
        # Desenha borda destacada no inimigo sob o mouse
        if (self.alvo_destacado is not None and 
            self.alvo_destacado < len(inimigos) and 
            isinstance(inimigos[self.alvo_destacado], dict)):
            
            inimigo = inimigos[self.alvo_destacado]
            
            # Borda pulsante maior e mais visível
            pygame.draw.rect(tela, cor_pulsante, 
                           (inimigo['pos_x'] - 5, 
                            inimigo['pos_y'] - 5, 
                            inimigo['largura'] + 10, 
                            inimigo['altura'] + 10), 4)
            
            # Indicador de mira (cruz)
            centro_x = inimigo['pos_x'] + inimigo['largura'] // 2
            centro_y = inimigo['pos_y'] + inimigo['altura'] // 2
            
            # Cruz de mira maior
            pygame.draw.line(tela, cor_pulsante, 
                           (centro_x - 20, centro_y), 
                           (centro_x + 20, centro_y), 4)
            pygame.draw.line(tela, cor_pulsante, 
                           (centro_x, centro_y - 20), 
                           (centro_x, centro_y + 20), 4)
    
    def desenhar_instrucoes(self, tela, fonte):
        """
        Desenha instruções na tela durante seleção.
        
        Args:
            tela: Surface do pygame
            fonte: Fonte para o texto
        """
        if not self.modo_selecao_ativo:
            return
            
        texto = "🎯 Selecione um inimigo para atacar"
        surface_texto = fonte.render(texto, True, BRANCO)
        
        # Fundo semi-transparente
        rect_fundo = pygame.Rect(10, 10, surface_texto.get_width() + 20, surface_texto.get_height() + 10)
        fundo = pygame.Surface((rect_fundo.width, rect_fundo.height))
        fundo.fill(PRETO)
        fundo.set_alpha(180)
        tela.blit(fundo, rect_fundo)
        
        # Texto
        tela.blit(surface_texto, (20, 15))
        
        # Botão de cancelar
        texto_cancelar = "ESC para cancelar"
        surface_cancelar = fonte.render(texto_cancelar, True, CINZA_CLARO)
        tela.blit(surface_cancelar, (20, 35))
    
    def tem_modo_ativo(self):
        """Verifica se o modo de seleção está ativo."""
        return self.modo_selecao_ativo

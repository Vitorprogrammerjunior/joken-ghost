"""
Sistema de texto flutuante para feedback visual.
Responsável por mostrar "+15", dano, etc. como no jogo original.
"""

import pygame
from config.constants import *

class TextoFlutuante:
    """Texto que aparece e sobe fadendo."""
    
    def __init__(self, x, y, texto, cor, fonte, duracao=3.5, velocidade_y=-30):
        """Inicializa texto flutuante."""
        self.x = x
        self.y = y
        self.texto = texto
        self.cor = cor
        self.fonte = fonte
        self.duracao = duracao
        self.tempo_vida = 0.0
        self.velocidade_y = velocidade_y
        self.alpha = 255
        self.ativo = True
        
    def atualizar(self, delta_time):
        """Atualiza posição e alpha do texto."""
        if not self.ativo:
            return
            
        self.tempo_vida += delta_time
        self.y += self.velocidade_y * delta_time
        
        # Fade out
        progress = self.tempo_vida / self.duracao
        if progress >= 1.0:
            self.ativo = False
        else:
            self.alpha = int(255 * (1.0 - progress))
            
    def desenhar(self, tela):
        """Desenha o texto na tela."""
        if not self.ativo:
            return
            
        # Renderiza texto com alpha
        superficie_texto = self.fonte.render(self.texto, True, self.cor)
        superficie_texto.set_alpha(self.alpha)
        
        # Centraliza o texto
        rect = superficie_texto.get_rect(center=(self.x, self.y))
        tela.blit(superficie_texto, rect)

class SistemaTextoFlutuante:
    """Gerenciador de textos flutuantes."""
    
    def __init__(self, resource_manager):
        """Inicializa o sistema."""
        self.resource_manager = resource_manager
        self.textos = []
        
    def adicionar_texto(self, x, y, texto, cor=VERDE, tipo_fonte='bold', duracao=2.0, velocidade_y=-50):
        """Adiciona um novo texto flutuante."""
        fonte = self.resource_manager.obter_fonte(tipo_fonte)
        texto_obj = TextoFlutuante(x, y, texto, cor, fonte, duracao, velocidade_y)
        self.textos.append(texto_obj)
        
    def adicionar_dinheiro(self, x, y, valor):
        """Adiciona texto de "+$X" dourado/amarelo brilhante."""
        cor_dourada = (255, 215, 0)  # Cor dourada mais chamativa
        self.adicionar_texto(x, y, f"+${valor}", cor_dourada, 'titulo', 3.0, -25)
        
    def adicionar_dano(self, x, y, valor):
        """Adiciona texto de "-X" vermelho brilhante."""
        cor_vermelha = (255, 50, 50)  # Vermelho mais brilhante
        self.adicionar_texto(x, y, f"-{valor}", cor_vermelha, 'bold', 2.5, -35)
        
    def atualizar(self, delta_time):
        """Atualiza todos os textos."""
        # Atualiza textos ativos
        for texto in self.textos[:]:
            texto.atualizar(delta_time)
            if not texto.ativo:
                self.textos.remove(texto)
                
    def desenhar(self, tela):
        """Desenha todos os textos ativos."""
        for texto in self.textos:
            texto.desenhar(tela)
            
    def limpar(self):
        """Remove todos os textos."""
        self.textos.clear()

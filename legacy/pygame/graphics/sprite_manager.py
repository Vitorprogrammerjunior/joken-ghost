"""
Sistema de animação e sprites do jogo.
Responsável por gerenciar sprites animados, frames e transições visuais.
"""

import pygame
import math
from config.constants import *
from config.enums import EstadoAnimacao

class SpriteManager:
    """Gerenciador de sprites e animações."""
    
    def __init__(self, resource_manager):
        """Inicializa o gerenciador de sprites."""
        self.resource_manager = resource_manager
        
        # Estado das animações
        self.frame_atual_jogador = 0
        self.frame_atual_inimigo = 0
        self.tempo_ultimo_frame = 0
        
        # Controle de batalha
        self.jogador_atacando = False
        self.inimigo_atacando = False
        self.tempo_ataque = 0
        
        # Efeitos visuais
        self.shake_intensidade = 0
        self.shake_duracao = 0
        
    def atualizar_animacoes(self, delta_time):
        """Atualiza todas as animações baseadas no tempo."""
        # Atualiza timer de frames
        self.tempo_ultimo_frame += delta_time
        
        # Atualiza frames dos sprites a cada INTERVALO_FRAME
        if self.tempo_ultimo_frame >= INTERVALO_FRAME:
            self.avancar_frame_jogador()
            self.avancar_frame_inimigo()
            self.tempo_ultimo_frame = 0
            
        # Atualiza animações de ataque
        self.atualizar_animacoes_ataque(delta_time)
        
        # Atualiza efeitos visuais
        self.atualizar_shake(delta_time)
        
    def avancar_frame_jogador(self):
        """Avança o frame da animação do jogador."""
        total_frames = self.resource_manager.obter_total_frames_jogador()
        if total_frames > 1:
            self.frame_atual_jogador = (self.frame_atual_jogador + 1) % total_frames
            
    def avancar_frame_inimigo(self):
        """Avança o frame da animação do inimigo."""
        total_frames = self.resource_manager.obter_total_frames_inimigo()
        if total_frames > 1:
            self.frame_atual_inimigo = (self.frame_atual_inimigo + 1) % total_frames
            
    def iniciar_ataque_jogador(self):
        """Inicia animação de ataque do jogador."""
        self.jogador_atacando = True
        self.tempo_ataque = 0
        
    def iniciar_ataque_inimigo(self):
        """Inicia animação de ataque do inimigo."""
        self.inimigo_atacando = True
        self.tempo_ataque = 0
        
    def atualizar_animacoes_ataque(self, delta_time):
        """Atualiza as animações de ataque."""
        if self.jogador_atacando or self.inimigo_atacando:
            self.tempo_ataque += delta_time
            
            # Termina animação após duração
            if self.tempo_ataque >= DURACAO_ANIMACAO_ATAQUE:
                self.jogador_atacando = False
                self.inimigo_atacando = False
                self.tempo_ataque = 0
                
    def iniciar_shake(self, intensidade=10, duracao=0.3):
        """Inicia efeito de shake da tela."""
        self.shake_intensidade = intensidade
        self.shake_duracao = duracao
        
    def atualizar_shake(self, delta_time):
        """Atualiza o efeito de shake."""
        if self.shake_duracao > 0:
            self.shake_duracao -= delta_time
            if self.shake_duracao <= 0:
                self.shake_intensidade = 0
                
    def obter_offset_shake(self):
        """Retorna o offset do shake para aplicar na renderização."""
        if self.shake_intensidade > 0:
            import random
            x_offset = random.randint(-self.shake_intensidade, self.shake_intensidade)
            y_offset = random.randint(-self.shake_intensidade, self.shake_intensidade)
            return (x_offset, y_offset)
        return (0, 0)
        
    def desenhar_sprite_jogador(self, tela, x, y):
        """Desenha o sprite do jogador na posição especificada."""
        sprite = self.resource_manager.obter_frame_jogador(self.frame_atual_jogador)
        if sprite:
            # Aplicar efeito de ataque se ativo
            if self.jogador_atacando:
                # Efeito de movimento durante ataque
                ataque_progress = self.tempo_ataque / DURACAO_ANIMACAO_ATAQUE
                if ataque_progress < 0.5:
                    # Movimento para frente
                    x += int(20 * (ataque_progress * 2))
                else:
                    # Movimento de volta
                    x += int(20 * (2 - ataque_progress * 2))
                    
            tela.blit(sprite, (x, y))
        return sprite.get_size() if sprite else (0, 0)
        
    def desenhar_sprite_inimigo(self, tela, x, y):
        """Desenha o sprite do inimigo na posição especificada."""
        sprite = self.resource_manager.obter_frame_inimigo(self.frame_atual_inimigo)
        if sprite:
            # Aplicar efeito de ataque se ativo
            if self.inimigo_atacando:
                # Efeito de movimento durante ataque
                ataque_progress = self.tempo_ataque / DURACAO_ANIMACAO_ATAQUE
                if ataque_progress < 0.5:
                    # Movimento para frente
                    x -= int(20 * (ataque_progress * 2))
                else:
                    # Movimento de volta
                    x -= int(20 * (2 - ataque_progress * 2))
                    
            tela.blit(sprite, (x, y))
        return sprite.get_size() if sprite else (0, 0)
        
    def desenhar_fantasma_descoberto(self, tela, x, y, scale=1.0):
        """Desenha um fantasma descoberto no monstruário."""
        sprite_fantasma = self.resource_manager.obter_sprite_fantasma()
        if sprite_fantasma:
            if scale != 1.0:
                nova_largura = int(sprite_fantasma.get_width() * scale)
                nova_altura = int(sprite_fantasma.get_height() * scale)
                sprite_escalado = pygame.transform.scale(sprite_fantasma, (nova_largura, nova_altura))
                tela.blit(sprite_escalado, (x, y))
            else:
                tela.blit(sprite_fantasma, (x, y))
                
    def desenhar_fantasma_nao_descoberto(self, tela, x, y, scale=1.0):
        """Desenha uma silhueta de fantasma não descoberto."""
        sprite_fantasma = self.resource_manager.obter_sprite_fantasma()
        if sprite_fantasma:
            # Cria uma silhueta escura
            silhueta = sprite_fantasma.copy()
            silhueta.fill((50, 50, 50))  # Cor escura
            
            if scale != 1.0:
                nova_largura = int(silhueta.get_width() * scale)
                nova_altura = int(silhueta.get_height() * scale)
                silhueta = pygame.transform.scale(silhueta, (nova_largura, nova_altura))
                
            tela.blit(silhueta, (x, y))
            
            # Desenha um ponto de interrogação
            fonte_pequena = self.resource_manager.obter_fonte('pequena')
            texto_interrogacao = fonte_pequena.render("?", True, BRANCO)
            texto_rect = texto_interrogacao.get_rect(center=(x + silhueta.get_width()//2, y + silhueta.get_height()//2))
            tela.blit(texto_interrogacao, texto_rect)


class AnimationController:
    """Controlador de animações específicas."""
    
    def __init__(self):
        """Inicializa o controlador de animações."""
        self.animacoes_ativas = {}
        
    def criar_animacao_fade(self, nome, duracao, valor_inicial=0, valor_final=255):
        """Cria uma animação de fade."""
        self.animacoes_ativas[nome] = {
            'tipo': 'fade',
            'duracao': duracao,
            'tempo_decorrido': 0,
            'valor_inicial': valor_inicial,
            'valor_final': valor_final,
            'valor_atual': valor_inicial
        }
        
    def criar_animacao_movimento(self, nome, duracao, pos_inicial, pos_final):
        """Cria uma animação de movimento."""
        self.animacoes_ativas[nome] = {
            'tipo': 'movimento',
            'duracao': duracao,
            'tempo_decorrido': 0,
            'pos_inicial': pos_inicial,
            'pos_final': pos_final,
            'pos_atual': pos_inicial
        }
        
    def atualizar_animacoes(self, delta_time):
        """Atualiza todas as animações ativas."""
        animacoes_terminadas = []
        
        for nome, animacao in self.animacoes_ativas.items():
            animacao['tempo_decorrido'] += delta_time
            progresso = min(animacao['tempo_decorrido'] / animacao['duracao'], 1.0)
            
            if animacao['tipo'] == 'fade':
                # Interpolação linear para fade
                diferenca = animacao['valor_final'] - animacao['valor_inicial']
                animacao['valor_atual'] = animacao['valor_inicial'] + (diferenca * progresso)
                
            elif animacao['tipo'] == 'movimento':
                # Interpolação linear para movimento
                x_inicial, y_inicial = animacao['pos_inicial']
                x_final, y_final = animacao['pos_final']
                
                x_atual = x_inicial + ((x_final - x_inicial) * progresso)
                y_atual = y_inicial + ((y_final - y_inicial) * progresso)
                animacao['pos_atual'] = (x_atual, y_atual)
                
            # Marca animação como terminada se completou
            if progresso >= 1.0:
                animacoes_terminadas.append(nome)
                
        # Remove animações terminadas
        for nome in animacoes_terminadas:
            del self.animacoes_ativas[nome]
            
    def obter_valor_animacao(self, nome):
        """Obtém o valor atual de uma animação."""
        if nome in self.animacoes_ativas:
            animacao = self.animacoes_ativas[nome]
            if animacao['tipo'] == 'fade':
                return int(animacao['valor_atual'])
            elif animacao['tipo'] == 'movimento':
                return animacao['pos_atual']
        return None
        
    def animacao_ativa(self, nome):
        """Verifica se uma animação está ativa."""
        return nome in self.animacoes_ativas
        
    def parar_animacao(self, nome):
        """Para uma animação específica."""
        if nome in self.animacoes_ativas:
            del self.animacoes_ativas[nome]
            
    def parar_todas_animacoes(self):
        """Para todas as animações ativas."""
        self.animacoes_ativas.clear()

"""
Sistema de Animações de Interface - JokenGhost
Responsável por animações de entrada e saída de elementos UI
"""

import pygame
import math
from config.constants import *

class UIAnimationManager:
    """Gerencia animações de elementos da interface."""
    
    def __init__(self):
        """Inicializa o gerenciador de animações UI."""
        self.animacoes_ativas = {}
        
    def iniciar_animacao_entrada(self, elemento_id, tipo='slide_down', duracao=0.5):
        """
        Inicia animação de entrada de um elemento.
        
        Args:
            elemento_id: ID único do elemento
            tipo: Tipo de animação ('slide_down', 'fade_in', 'scale_up', 'slide_left')
            duracao: Duração em segundos
        """
        self.animacoes_ativas[elemento_id] = {
            'tipo': tipo,
            'fase': 'entrada',
            'duracao': duracao,
            'tempo_decorrido': 0,
            'ativo': True,
            'completada': False
        }
        
    def iniciar_animacao_saida(self, elemento_id, tipo='slide_up', duracao=0.3):
        """
        Inicia animação de saída de um elemento.
        
        Args:
            elemento_id: ID único do elemento
            tipo: Tipo de animação ('slide_up', 'fade_out', 'scale_down', 'slide_right')
            duracao: Duração em segundos
        """
        self.animacoes_ativas[elemento_id] = {
            'tipo': tipo,
            'fase': 'saida',
            'duracao': duracao,
            'tempo_decorrido': 0,
            'ativo': True,
            'completada': False
        }
        
    def atualizar(self, delta_time):
        """
        Atualiza todas as animações.
        
        Args:
            delta_time: Tempo em milissegundos
        """
        delta_seconds = delta_time / 1000.0
        elementos_para_remover = []
        
        for elemento_id, animacao in self.animacoes_ativas.items():
            if not animacao['ativo']:
                continue
                
            animacao['tempo_decorrido'] += delta_seconds
            
            if animacao['tempo_decorrido'] >= animacao['duracao']:
                animacao['completada'] = True
                animacao['ativo'] = False
                elementos_para_remover.append(elemento_id)
        
        # Limpar animações completadas
        for elemento_id in elementos_para_remover:
            del self.animacoes_ativas[elemento_id]
            
    def obter_transformacao(self, elemento_id, rect_original):
        """
        Obtém a transformação atual de um elemento.
        
        Args:
            elemento_id: ID do elemento
            rect_original: Rect original do elemento
            
        Returns:
            dict: Transformações a aplicar
        """
        if elemento_id not in self.animacoes_ativas:
            return {'offset_x': 0, 'offset_y': 0, 'scale': 1.0, 'alpha': 255}
            
        animacao = self.animacoes_ativas[elemento_id]
        if not animacao['ativo']:
            return {'offset_x': 0, 'offset_y': 0, 'scale': 1.0, 'alpha': 255}
        
        # Calcular progresso (0.0 a 1.0)
        progresso = animacao['tempo_decorrido'] / animacao['duracao']
        progresso = min(1.0, progresso)
        
        # Aplicar easing (suavização)
        progresso_suave = self._ease_out_quart(progresso)
        
        return self._calcular_transformacao(animacao, progresso_suave, rect_original)
        
    def _calcular_transformacao(self, animacao, progresso, rect_original):
        """Calcula a transformação baseada no tipo de animação."""
        tipo = animacao['tipo']
        fase = animacao['fase']
        
        # Ajustar progresso para saída (inverter)
        if fase == 'saida':
            progresso = 1.0 - progresso
            
        transformacao = {'offset_x': 0, 'offset_y': 0, 'scale': 1.0, 'alpha': 255}
        
        if tipo == 'slide_down':
            # Desliza de cima para baixo
            offset_inicial = -rect_original.height - 20
            transformacao['offset_y'] = int(offset_inicial * (1.0 - progresso))
            
        elif tipo == 'slide_up':
            # Desliza para cima
            offset_final = -rect_original.height - 20
            transformacao['offset_y'] = int(offset_final * progresso)
            
        elif tipo == 'slide_left':
            # Desliza da direita para esquerda
            offset_inicial = LARGURA + 20
            transformacao['offset_x'] = int(offset_inicial * (1.0 - progresso))
            
        elif tipo == 'slide_right':
            # Desliza para direita
            offset_final = LARGURA + 20
            transformacao['offset_x'] = int(offset_final * progresso)
            
        elif tipo == 'fade_in':
            # Fade in
            transformacao['alpha'] = int(255 * progresso)
            
        elif tipo == 'fade_out':
            # Fade out
            transformacao['alpha'] = int(255 * (1.0 - progresso))
            
        elif tipo == 'scale_up':
            # Escala de pequeno para normal
            escala_inicial = 0.1
            transformacao['scale'] = escala_inicial + (1.0 - escala_inicial) * progresso
            
        elif tipo == 'scale_down':
            # Escala de normal para pequeno
            transformacao['scale'] = 1.0 - (0.9 * progresso)
            
        elif tipo == 'bounce_in':
            # Efeito bounce
            if progresso < 0.5:
                transformacao['scale'] = 0.1 + (1.4 * progresso * 2)
            else:
                bounce = 1.4 - (0.4 * (progresso - 0.5) * 2)
                transformacao['scale'] = bounce
                
        return transformacao
        
    def _ease_out_quart(self, t):
        """Função de easing suave."""
        return 1 - pow(1 - t, 4)
        
    def esta_animando(self, elemento_id):
        """Verifica se um elemento está sendo animado."""
        return (elemento_id in self.animacoes_ativas and 
                self.animacoes_ativas[elemento_id]['ativo'])
                
    def animacao_completada(self, elemento_id):
        """Verifica se uma animação foi completada."""
        return (elemento_id in self.animacoes_ativas and 
                self.animacoes_ativas[elemento_id]['completada'])
                
    def limpar_animacao(self, elemento_id):
        """Remove uma animação específica."""
        if elemento_id in self.animacoes_ativas:
            del self.animacoes_ativas[elemento_id]
            
    def limpar_todas_animacoes(self):
        """Limpa todas as animações."""
        self.animacoes_ativas.clear()


class AnimatedWidget:
    """Widget base com suporte a animações."""
    
    def __init__(self, widget_id, animation_manager):
        """
        Inicializa widget animado.
        
        Args:
            widget_id: ID único do widget
            animation_manager: Gerenciador de animações
        """
        self.widget_id = widget_id
        self.animation_manager = animation_manager
        self.rect_original = None
        self.visivel = True
        
    def mostrar_com_animacao(self, rect, tipo_animacao='slide_down'):
        """Mostra o widget com animação."""
        self.rect_original = rect
        self.visivel = True
        self.animation_manager.iniciar_animacao_entrada(self.widget_id, tipo_animacao)
        
    def esconder_com_animacao(self, tipo_animacao='slide_up'):
        """Esconde o widget com animação."""
        self.visivel = False
        self.animation_manager.iniciar_animacao_saida(self.widget_id, tipo_animacao)
        
    def desenhar(self, tela, surface_widget):
        """
        Desenha o widget com transformações.
        
        Args:
            tela: Surface do pygame
            surface_widget: Surface do widget renderizado
        """
        if not self.visivel or not self.rect_original:
            return
            
        # Obter transformações
        transformacao = self.animation_manager.obter_transformacao(
            self.widget_id, self.rect_original
        )
        
        # Aplicar alpha
        if transformacao['alpha'] < 255:
            surface_widget.set_alpha(transformacao['alpha'])
            
        # Calcular posição final
        pos_x = self.rect_original.x + transformacao['offset_x']
        pos_y = self.rect_original.y + transformacao['offset_y']
        
        # Aplicar escala se necessário
        if transformacao['scale'] != 1.0:
            largura_nova = int(surface_widget.get_width() * transformacao['scale'])
            altura_nova = int(surface_widget.get_height() * transformacao['scale'])
            
            if largura_nova > 0 and altura_nova > 0:
                surface_widget = pygame.transform.scale(surface_widget, (largura_nova, altura_nova))
                
                # Centralizar elemento escalado
                pos_x += (self.rect_original.width - largura_nova) // 2
                pos_y += (self.rect_original.height - altura_nova) // 2
        
        # Desenhar
        tela.blit(surface_widget, (pos_x, pos_y))
        
    def esta_animando(self):
        """Verifica se está sendo animado."""
        return self.animation_manager.esta_animando(self.widget_id)

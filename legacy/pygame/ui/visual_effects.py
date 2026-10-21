"""
Sistema de Efeitos Visuais - JokenGhost
Responsável por shake, tremidas e efeitos de dano visual
"""

import pygame
import random
import math
from config.constants import *

class VisualEffectsManager:
    """Gerencia efeitos visuais como shake, tremidas e animações."""
    
    def __init__(self):
        """Inicializa o gerenciador de efeitos visuais."""
        # Sistema de shake/tremida
        self.shake_ativo = False
        self.shake_intensidade = 0
        self.shake_duracao = 0
        self.shake_tempo_restante = 0
        self.shake_offset_x = 0
        self.shake_offset_y = 0
        
        # Shake específico para entidades
        self.shake_jogador = {'ativo': False, 'intensidade': 0, 'tempo': 0, 'offset_x': 0, 'offset_y': 0}
        self.shakes_inimigos = {}  # Por índice do inimigo
        
    def iniciar_shake_tela(self, intensidade=15, duracao=0.3):
        """
        Inicia shake da tela inteira.
        
        Args:
            intensidade: Força do shake (pixels)
            duracao: Duração em segundos
        """
        self.shake_ativo = True
        self.shake_intensidade = intensidade
        self.shake_duracao = duracao
        self.shake_tempo_restante = duracao
        
    def iniciar_shake_jogador(self, intensidade=10, duracao=0.4):
        """
        Inicia shake específico do jogador.
        
        Args:
            intensidade: Força do shake
            duracao: Duração em segundos
        """
        self.shake_jogador = {
            'ativo': True,
            'intensidade': intensidade,
            'tempo': duracao,
            'offset_x': 0,
            'offset_y': 0
        }
        print(f"💥 Shake do jogador iniciado: {intensidade} por {duracao}s")
        
    def iniciar_shake_inimigo(self, indice_inimigo, intensidade=8, duracao=0.3):
        """
        Inicia shake específico de um inimigo.
        
        Args:
            indice_inimigo: Índice do inimigo na lista
            intensidade: Força do shake
            duracao: Duração em segundos
        """
        self.shakes_inimigos[indice_inimigo] = {
            'ativo': True,
            'intensidade': intensidade,
            'tempo': duracao,
            'offset_x': 0,
            'offset_y': 0
        }
        print(f"💥 Shake do inimigo {indice_inimigo} iniciado: {intensidade} por {duracao}s")
        
    def atualizar(self, delta_time):
        """
        Atualiza todos os efeitos visuais.
        
        Args:
            delta_time: Tempo em milissegundos desde última atualização
        """
        delta_seconds = delta_time / 1000.0
        
        # Atualizar shake da tela
        self._atualizar_shake_tela(delta_seconds)
        
        # Atualizar shake do jogador
        self._atualizar_shake_jogador(delta_seconds)
        
        # Atualizar shakes dos inimigos
        self._atualizar_shakes_inimigos(delta_seconds)
        
    def _atualizar_shake_tela(self, delta_seconds):
        """Atualiza o shake da tela."""
        if not self.shake_ativo:
            return
            
        self.shake_tempo_restante -= delta_seconds
        
        if self.shake_tempo_restante <= 0:
            # Shake terminou
            self.shake_ativo = False
            self.shake_offset_x = 0
            self.shake_offset_y = 0
            return
            
        # Calcular intensidade atual (diminui com o tempo)
        progresso = 1.0 - (self.shake_tempo_restante / self.shake_duracao)
        intensidade_atual = self.shake_intensidade * (1.0 - progresso)
        
        # Gerar offset aleatório
        self.shake_offset_x = random.randint(-int(intensidade_atual), int(intensidade_atual))
        self.shake_offset_y = random.randint(-int(intensidade_atual), int(intensidade_atual))
        
    def _atualizar_shake_jogador(self, delta_seconds):
        """Atualiza o shake do jogador."""
        if not self.shake_jogador['ativo']:
            return
            
        self.shake_jogador['tempo'] -= delta_seconds
        
        if self.shake_jogador['tempo'] <= 0:
            # Shake terminou
            self.shake_jogador['ativo'] = False
            self.shake_jogador['offset_x'] = 0
            self.shake_jogador['offset_y'] = 0
            return
            
        # Calcular offset
        intensidade = self.shake_jogador['intensidade']
        self.shake_jogador['offset_x'] = random.randint(-intensidade, intensidade)
        self.shake_jogador['offset_y'] = random.randint(-intensidade, intensidade)
        
    def _atualizar_shakes_inimigos(self, delta_seconds):
        """Atualiza shakes de todos os inimigos."""
        inimigos_para_remover = []
        
        for indice, shake_data in self.shakes_inimigos.items():
            if not shake_data['ativo']:
                continue
                
            shake_data['tempo'] -= delta_seconds
            
            if shake_data['tempo'] <= 0:
                # Shake terminou
                shake_data['ativo'] = False
                shake_data['offset_x'] = 0
                shake_data['offset_y'] = 0
                inimigos_para_remover.append(indice)
            else:
                # Calcular offset
                intensidade = shake_data['intensidade']
                shake_data['offset_x'] = random.randint(-intensidade, intensidade)
                shake_data['offset_y'] = random.randint(-intensidade, intensidade)
        
        # Limpar shakes terminados
        for indice in inimigos_para_remover:
            del self.shakes_inimigos[indice]
            
    def obter_offset_tela(self):
        """
        Retorna o offset atual da tela para shake.
        
        Returns:
            tuple: (offset_x, offset_y)
        """
        if self.shake_ativo:
            return (self.shake_offset_x, self.shake_offset_y)
        return (0, 0)
        
    def obter_offset_jogador(self):
        """
        Retorna o offset atual do jogador.
        
        Returns:
            tuple: (offset_x, offset_y)
        """
        if self.shake_jogador['ativo']:
            return (self.shake_jogador['offset_x'], self.shake_jogador['offset_y'])
        return (0, 0)
        
    # === ALIASES PARA COMPATIBILIDADE ===
    def obter_offset_shake_jogador(self):
        """Alias para obter_offset_jogador (compatibilidade)."""
        return self.obter_offset_jogador()
        
    def obter_offset_shake_inimigo(self, indice_inimigo):
        """Alias para obter_offset_inimigo (compatibilidade)."""
        return self.obter_offset_inimigo(indice_inimigo)
        
    def obter_offset_inimigo(self, indice_inimigo):
        """
        Retorna o offset atual de um inimigo específico.
        
        Args:
            indice_inimigo: Índice do inimigo
            
        Returns:
            tuple: (offset_x, offset_y)
        """
        if indice_inimigo in self.shakes_inimigos:
            shake_data = self.shakes_inimigos[indice_inimigo]
            if shake_data['ativo']:
                return (shake_data['offset_x'], shake_data['offset_y'])
        return (0, 0)
        
    def limpar_todos_shakes(self):
        """Limpa todos os efeitos de shake."""
        # Parar shake da tela
        self.shake_ativo = False
        self.shake_offset_x = 0
        self.shake_offset_y = 0
        
        # Parar shake do jogador
        self.shake_jogador['ativo'] = False
        self.shake_jogador['offset_x'] = 0
        self.shake_jogador['offset_y'] = 0
        
        # Parar todos os shakes de inimigos
        for shake_data in self.shakes_inimigos.values():
            shake_data['ativo'] = False
            shake_data['offset_x'] = 0
            shake_data['offset_y'] = 0
        self.shakes_inimigos.clear()
        
        print("🛑 Todos os shakes foram limpos e parados")


class EnemyAttackAnimationManager:
    """Gerencia animações de ataque dos inimigos."""
    
    def __init__(self):
        """Inicializa o gerenciador de animações de ataque."""
        self.animacoes_ativas = {}  # Por índice do inimigo
        
    def iniciar_animacao_ataque(self, indice_inimigo, inimigo_data):
        """
        Inicia animação de ataque de um inimigo.
        
        Args:
            indice_inimigo: Índice do inimigo
            inimigo_data: Dados do inimigo (para posição original)
        """
        self.animacoes_ativas[indice_inimigo] = {
            'ativo': True,
            'tempo_total': 1.0,  # 1 segundo total
            'tempo_restante': 1.0,
            'pos_original_x': inimigo_data['pos_x'],
            'pos_original_y': inimigo_data['pos_y'],
            'fase': 'avanco',  # 'avanco' ou 'retorno'
            'distancia_movimento': 80  # Pixels para se mover
        }
        print(f"⚔️ Animação de ataque iniciada para inimigo {indice_inimigo}")
        
    def atualizar(self, delta_time):
        """
        Atualiza todas as animações de ataque.
        
        Args:
            delta_time: Tempo em milissegundos
        """
        delta_seconds = delta_time / 1000.0
        animacoes_para_remover = []
        
        for indice, animacao in self.animacoes_ativas.items():
            if not animacao['ativo']:
                continue
                
            animacao['tempo_restante'] -= delta_seconds
            
            if animacao['tempo_restante'] <= 0:
                # Animação terminou
                animacao['ativo'] = False
                animacoes_para_remover.append(indice)
                continue
        
        # Limpar animações terminadas
        for indice in animacoes_para_remover:
            del self.animacoes_ativas[indice]
            
    def obter_offset_movimento(self, indice_inimigo):
        """
        Retorna o offset de movimento para um inimigo em animação.
        
        Args:
            indice_inimigo: Índice do inimigo
            
        Returns:
            tuple: (offset_x, offset_y)
        """
        if indice_inimigo not in self.animacoes_ativas:
            return (0, 0)
            
        animacao = self.animacoes_ativas[indice_inimigo]
        if not animacao['ativo']:
            return (0, 0)
        
        # Calcular progresso da animação (0.0 a 1.0)
        progresso_total = 1.0 - (animacao['tempo_restante'] / animacao['tempo_total'])
        
        # Primeira metade: avança, segunda metade: retorna
        if progresso_total <= 0.5:
            # Fase de avanço (0 a 0.5)
            progresso_fase = progresso_total * 2  # 0 a 1
            offset_x = -int(animacao['distancia_movimento'] * progresso_fase)
        else:
            # Fase de retorno (0.5 a 1.0)
            progresso_fase = (progresso_total - 0.5) * 2  # 0 a 1
            offset_x = -int(animacao['distancia_movimento'] * (1.0 - progresso_fase))
            
        return (offset_x, 0)
        
    # === ALIAS PARA COMPATIBILIDADE ===
    def obter_offset_animacao(self, indice_inimigo):
        """Alias para obter_offset_movimento (compatibilidade)."""
        return self.obter_offset_movimento(indice_inimigo)
        
    def limpar_todas_animacoes(self):
        """Limpa todas as animações de ataque."""
        self.animacoes_ativas.clear()
        print("🗑️ Todas as animações de ataque foram limpas")
    def esta_atacando(self, indice_inimigo):
        """Verifica se um inimigo está em animação de ataque."""
        return (indice_inimigo in self.animacoes_ativas and 
                self.animacoes_ativas[indice_inimigo]['ativo'])
                
    def limpar_todas_animacoes(self):
        """Limpa todas as animações de ataque."""
        self.animacoes_ativas.clear()

"""
Sistema simples e confiável de números de dano flutuantes.
Substitui tanto damage_display quanto sistema_texto_flutuante.
"""

import pygame
from config.constants import *

class SimpleDamageDisplay:
    """Sistema simples para mostrar números de dano que desaparecem automaticamente."""
    
    def __init__(self, resource_manager):
        """Inicializa o sistema de números de dano."""
        self.resource_manager = resource_manager
        self.numeros_ativos = []
        
    def adicionar_dinheiro(self, valor, x, y):
        """
        Adiciona um texto de dinheiro na posição especificada.
        
        Args:
            valor: Valor do dinheiro (int)
            x, y: Posição inicial (int)
        """
        numero = {
            'valor': f"+${valor}",
            'x': float(x),
            'y': float(y),
            'cor': (255, 215, 0),  # Dourado
            'tempo_vida': 0.0,
            'duracao_total': 2.0,  # 2 segundos
            'velocidade_y': -25.0,  # Move para cima um pouco mais devagar
            'alpha': 255
        }
        self.numeros_ativos.append(numero)
        print(f"💰 DINHEIRO ADICIONADO: +${valor} em ({x}, {y})")
        
    def adicionar_dano(self, valor, x, y, cor=(255, 100, 100)):
        """
        Adiciona um número de dano na posição especificada.
        
        Args:
            valor: Valor do dano (int)
            x, y: Posição inicial (int)
            cor: Cor RGB do texto (tuple)
        """
        numero = {
            'valor': str(valor),
            'x': float(x),
            'y': float(y),
            'cor': cor,
            'tempo_vida': 0.0,
            'duracao_total': 2.0,  # 2 segundos
            'velocidade_y': -30.0,  # Move para cima
            'alpha': 255
        }
        self.numeros_ativos.append(numero)
        print(f"➕ DANO ADICIONADO: {valor} em ({x}, {y})")
        
    def atualizar(self, delta_time):
        """Atualiza todos os números de dano."""
        if not self.numeros_ativos:
            return
            
        numeros_para_remover = []
        
        for numero in self.numeros_ativos:
            # Atualizar tempo de vida
            numero['tempo_vida'] += delta_time
            
            # Mover para cima
            numero['y'] += numero['velocidade_y'] * delta_time
            
            # Fade out nos últimos 0.5 segundos
            if numero['tempo_vida'] > numero['duracao_total'] - 0.5:
                fade_progress = (numero['tempo_vida'] - (numero['duracao_total'] - 0.5)) / 0.5
                numero['alpha'] = int(255 * (1 - fade_progress))
            
            # Marcar para remoção se tempo acabou
            if numero['tempo_vida'] >= numero['duracao_total']:
                numeros_para_remover.append(numero)
                print(f"🗑️ DANO REMOVIDO: {numero['valor']} após {numero['tempo_vida']:.1f}s")
        
        # Remover números expirados
        for numero in numeros_para_remover:
            self.numeros_ativos.remove(numero)
            
    def desenhar(self, tela):
        """Desenha todos os números de dano na tela."""
        if not self.numeros_ativos:
            return
            
        fonte = self.resource_manager.obter_fonte('normal')
        
        for numero in self.numeros_ativos:
            # Renderizar texto (dinheiro já tem + no valor, dano precisa de -)
            if numero['valor'].startswith('+$'):
                texto = numero['valor']  # Dinheiro: "+$15"
            else:
                texto = f"-{numero['valor']}"  # Dano: "-25"
                
            surface = fonte.render(texto, True, numero['cor'])
            
            # Aplicar alpha
            if numero['alpha'] < 255:
                surface.set_alpha(numero['alpha'])
            
            # Desenhar na posição atual
            pos_x = int(numero['x'] - surface.get_width() // 2)
            pos_y = int(numero['y'])
            tela.blit(surface, (pos_x, pos_y))
    
    def limpar_todos(self):
        """Remove todos os números de dano da tela imediatamente."""
        count = len(self.numeros_ativos)
        self.numeros_ativos.clear()
        if count > 0:
            print(f"🧹 LIMPEZA FORÇADA: {count} números removidos")
    
    def tem_numeros_ativos(self):
        """Retorna True se há números sendo exibidos."""
        return len(self.numeros_ativos) > 0
    
    def get_debug_info(self):
        """Retorna informações de debug."""
        return f"SimpleDamageDisplay: {len(self.numeros_ativos)} números ativos"

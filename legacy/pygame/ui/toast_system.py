"""
Sistema de notificações toast do jogo.
Responsável por exibir mensagens temporárias na tela.
"""

import pygame
from config.constants import *

class ToastManager:
    """Gerenciador de notificações toast."""
    
    def __init__(self, resource_manager):
        """Inicializa o gerenciador de toasts."""
        self.resource_manager = resource_manager
        self.toasts_ativos = []
        
    def adicionar_toast(self, mensagem, duracao=DURACAO_TOAST, cor=VERDE):
        """Adiciona um novo toast à lista."""
        toast = {
            'mensagem': mensagem,
            'duracao': duracao,
            'tempo_restante': duracao,
            'cor': cor,
            'alpha': 255,
            'y_offset': 0,
            'target_y': len(self.toasts_ativos) * 40
        }
        self.toasts_ativos.append(toast)
        print(f"🍞 Toast adicionado: {mensagem}")
        
    def atualizar_toasts(self, delta_time_ms):
        """Atualiza todos os toasts ativos."""
        toasts_para_remover = []
        
        for i, toast in enumerate(self.toasts_ativos):
            # Atualiza tempo
            toast['tempo_restante'] -= delta_time_ms
            
            # Atualiza posição Y (animação suave)
            target_y = i * 40
            if toast['y_offset'] < target_y:
                toast['y_offset'] = min(target_y, toast['y_offset'] + delta_time_ms * 0.2)
            elif toast['y_offset'] > target_y:
                toast['y_offset'] = max(target_y, toast['y_offset'] - delta_time_ms * 0.2)
            
            # Calcula fade out nos últimos 1000ms
            if toast['tempo_restante'] <= 1000:
                toast['alpha'] = max(0, int(255 * (toast['tempo_restante'] / 1000)))
            
            # Marca para remoção se expirou
            if toast['tempo_restante'] <= 0:
                toasts_para_remover.append(toast)
                
        # Remove toasts expirados
        for toast in toasts_para_remover:
            self.toasts_ativos.remove(toast)
            
    def desenhar_toasts(self, tela):
        """Desenha todos os toasts ativos na tela."""
        base_x = 20
        base_y = 100
        
        for toast in self.toasts_ativos:
            if toast['alpha'] > 0:
                # Cria superfície para o toast
                fonte_pequena = self.resource_manager.obter_fonte('pequena')
                texto_surface = fonte_pequena.render(toast['mensagem'], True, toast['cor'])
                
                # Calcula posição
                y_pos = base_y + toast['y_offset']
                
                # Fundo do toast
                padding = 10
                bg_rect = pygame.Rect(
                    base_x - padding,
                    y_pos - padding,
                    texto_surface.get_width() + padding * 2,
                    texto_surface.get_height() + padding * 2
                )
                
                # Cria superfície com alpha
                bg_surface = pygame.Surface((bg_rect.width, bg_rect.height))
                bg_surface.set_alpha(min(200, toast['alpha']))
                bg_surface.fill(PRETO)
                
                # Desenha fundo
                tela.blit(bg_surface, bg_rect)
                
                # Borda
                if toast['alpha'] > 100:
                    pygame.draw.rect(tela, toast['cor'], bg_rect, 2)
                
                # Desenha texto
                texto_surface.set_alpha(toast['alpha'])
                tela.blit(texto_surface, (base_x, y_pos))
                
    def limpar_toasts(self):
        """Remove todos os toasts ativos."""
        self.toasts_ativos.clear()
        
    def tem_toasts_ativos(self):
        """Verifica se há toasts ativos."""
        return len(self.toasts_ativos) > 0
        
    def obter_quantidade_toasts(self):
        """Retorna a quantidade de toasts ativos."""
        return len(self.toasts_ativos)


class NotificationSystem:
    """Sistema de notificações completo."""
    
    def __init__(self, toast_manager):
        """Inicializa o sistema de notificações."""
        self.toast_manager = toast_manager
        
    def notificar_descoberta_fantasma(self, nome_fantasma):
        """Notifica sobre descoberta de um novo fantasma."""
        mensagem = f"Novo fantasma descoberto: {nome_fantasma}!"
        self.toast_manager.adicionar_toast(mensagem, cor=ROXO)
        
    def notificar_vitoria(self):
        """Notifica sobre vitória em combate."""
        self.toast_manager.adicionar_toast("Fantasma derrotado!", cor=VERDE)
        
    def notificar_derrota(self):
        """Notifica sobre derrota em combate."""
        self.toast_manager.adicionar_toast("Você foi derrotado!", cor=VERMELHO)
        
    def notificar_recompensa(self, quantidade):
        """Notifica sobre recompensa recebida."""
        mensagem = f"Você ganhou ${quantidade}!"
        self.toast_manager.adicionar_toast(mensagem, cor=DOURADO)
        
    def notificar_compra(self, item, preco):
        """Notifica sobre compra realizada."""
        mensagem = f"{item} comprado por ${preco}!"
        self.toast_manager.adicionar_toast(mensagem, cor=AZUL)
        
    def notificar_erro(self, mensagem):
        """Notifica sobre erro ou problema."""
        self.toast_manager.adicionar_toast(mensagem, cor=VERMELHO)
        
    def notificar_info(self, mensagem):
        """Notifica informação geral."""
        self.toast_manager.adicionar_toast(mensagem, cor=BRANCO)
        
    def notificar_dinheiro_insuficiente(self):
        """Notifica sobre dinheiro insuficiente."""
        self.notificar_erro("Dinheiro insuficiente!")

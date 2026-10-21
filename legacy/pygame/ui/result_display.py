"""
Sistema de resultados de combate estilo RPG.
Responsável por mostrar quem venceu cada turno e resultados de batalha.
"""

import pygame
import math
from config.constants import *
from config.enums import Escolha

class ResultDisplay:
    """Exibe resultados de combate de forma visual."""
    
    def __init__(self):
        """Inicializa o sistema de resultados."""
        self.resultado_ativo = False
        self.resultado_concluido = False  # NOVO: Flag para indicar conclusão
        self.tempo_resultado = 0
        self.duracao_resultado = 3000  # 3 segundos - tempo normal
        
        # Dados do resultado atual
        self.escolha_jogador = None
        self.escolha_inimigo = None
        self.resultado_texto = ""
        self.cor_resultado = BRANCO
        
        # Animação
        self.escala_animacao = 1.0
        self.alpha_animacao = 255
        
        # Fontes
        try:
            self.fonte_titulo = pygame.font.Font(None, 48)
            self.fonte_escolhas = pygame.font.Font(None, 32)
            self.fonte_resultado = pygame.font.Font(None, 36)
        except:
            self.fonte_titulo = pygame.font.Font(None, 36)
            self.fonte_escolhas = pygame.font.Font(None, 24)
            self.fonte_resultado = pygame.font.Font(None, 28)
    
    def mostrar_resultado(self, escolha_jogador, escolha_inimigo, resultado, detalhes_combate=None):
        """
        Mostra o resultado de um turno.
        
        Args:
            escolha_jogador: Escolha.PEDRA, PAPEL ou TESOURA
            escolha_inimigo: Escolha.PEDRA, PAPEL ou TESOURA  
            resultado: "vitoria", "derrota", "empate"
            detalhes_combate: Dict com detalhes do combate (inimigos afetados, danos, etc.)
        """
        self.resultado_ativo = True
        self.resultado_concluido = False  # NOVO: Reset do flag
        self.tempo_resultado = 0  # Reset do tempo
        self.tempo_resultado = 0
        self.escolha_jogador = escolha_jogador
        self.escolha_inimigo = escolha_inimigo
        self.detalhes_combate = detalhes_combate or {}
        
        # Configura texto e cor baseado no resultado
        if resultado == "vitoria":
            self.resultado_texto = "🎉 VOCÊ VENCEU!"
            self.cor_resultado = (100, 255, 100)  # Verde
        elif resultado == "derrota":
            self.resultado_texto = "💀 VOCÊ PERDEU!"
            self.cor_resultado = (255, 100, 100)  # Vermelho
        else:  # empate
            self.resultado_texto = "🤝 EMPATE!"
            self.cor_resultado = (255, 255, 100)  # Amarelo
        
        # Reset animação
        self.escala_animacao = 1.5  # Começa maior
        self.alpha_animacao = 255
    
    def atualizar(self, delta_time):
        """Atualiza a animação do resultado."""
        if not self.resultado_ativo:
            return
            
        # CORRIGIDO: Converter delta_time de segundos para milissegundos
        delta_time_ms = delta_time * 1000 if delta_time < 100 else delta_time
        self.tempo_resultado += delta_time_ms
        
        # Animação de escala (efeito de "pop")
        if self.tempo_resultado < 300:  # Primeiros 300ms
            progress = self.tempo_resultado / 300
            self.escala_animacao = 1.5 - (0.5 * progress)  # De 1.5 para 1.0
        else:
            self.escala_animacao = 1.0
        
        # Fade out nos últimos 300ms (mais rápido)
        if self.tempo_resultado > self.duracao_resultado - 300:
            fade_progress = (self.tempo_resultado - (self.duracao_resultado - 300)) / 300
            self.alpha_animacao = int(255 * (1 - fade_progress))
        
        # Desativa quando tempo acabar
        if self.tempo_resultado >= self.duracao_resultado:
            self.resultado_ativo = False
            self.resultado_concluido = True  # NOVO: Marca como concluído
            
    def limpar_resultado(self):
        """Limpa completamente o resultado e para todos os efeitos."""
        self.resultado_ativo = False
        self.resultado_concluido = False
        self.tempo_resultado = 0
        self.escala_animacao = 1.0
        self.alpha_animacao = 255
    
    def desenhar(self, tela):
        """Desenha o resultado na tela."""
        if not self.resultado_ativo:
            return
            
        centro_x = LARGURA // 2
        centro_y = ALTURA // 3
        
        # === Fundo semitransparente ===
        overlay = pygame.Surface((LARGURA, 200))
        overlay.set_alpha(120)
        overlay.fill((0, 0, 0))
        tela.blit(overlay, (0, centro_y - 100))
        
        # === Desenha escolhas dos combatentes ===
        self._desenhar_escolhas(tela, centro_x, centro_y - 60)
        
        # === Desenha resultado principal ===
        self._desenhar_resultado_principal(tela, centro_x, centro_y)
        
        # === Desenha dicas visuais ===
        self._desenhar_dicas(tela, centro_x, centro_y + 50)
        
        # === NOVO: Desenha detalhes dos inimigos afetados ===
        self._desenhar_detalhes_inimigos(tela, centro_x, centro_y + 80)
    
    def _desenhar_escolhas(self, tela, centro_x, y):
        """Desenha as escolhas de ambos os combatentes."""
        if not self.escolha_jogador or not self.escolha_inimigo:
            return
            
        # Conversão de enum para emoji
        emoji_map = {
            Escolha.PEDRA: "🗿",
            Escolha.PAPEL: "📄", 
            Escolha.TESOURA: "✂️"
        }
        
        jogador_emoji = emoji_map.get(self.escolha_jogador, "❓")
        inimigo_emoji = emoji_map.get(self.escolha_inimigo, "❓")
        
        # Texto das escolhas
        texto_jogador = f"Você: {jogador_emoji}"
        texto_inimigo = f"Inimigo: {inimigo_emoji}"
        
        # Renderiza
        surface_jogador = self.fonte_escolhas.render(texto_jogador, True, BRANCO)
        surface_inimigo = self.fonte_escolhas.render(texto_inimigo, True, BRANCO)
        
        # Aplica transparência
        if self.alpha_animacao < 255:
            surface_jogador.set_alpha(self.alpha_animacao)
            surface_inimigo.set_alpha(self.alpha_animacao)
        
        # Posiciona
        rect_jogador = surface_jogador.get_rect()
        rect_jogador.centerx = centro_x - 100
        rect_jogador.centery = y
        
        rect_inimigo = surface_inimigo.get_rect()
        rect_inimigo.centerx = centro_x + 100
        rect_inimigo.centery = y
        
        tela.blit(surface_jogador, rect_jogador)
        tela.blit(surface_inimigo, rect_inimigo)
        
        # VS no centro
        surface_vs = self.fonte_escolhas.render("VS", True, (255, 255, 0))
        if self.alpha_animacao < 255:
            surface_vs.set_alpha(self.alpha_animacao)
        rect_vs = surface_vs.get_rect(center=(centro_x, y))
        tela.blit(surface_vs, rect_vs)
    
    def _desenhar_resultado_principal(self, tela, centro_x, y):
        """Desenha o resultado principal com animação."""
        surface_resultado = self.fonte_resultado.render(
            self.resultado_texto, True, self.cor_resultado
        )
        
        # Aplica escala
        if self.escala_animacao != 1.0:
            largura_original = surface_resultado.get_width()
            altura_original = surface_resultado.get_height()
            nova_largura = int(largura_original * self.escala_animacao)
            nova_altura = int(altura_original * self.escala_animacao)
            surface_resultado = pygame.transform.scale(
                surface_resultado, (nova_largura, nova_altura)
            )
        
        # Aplica transparência
        if self.alpha_animacao < 255:
            surface_resultado.set_alpha(self.alpha_animacao)
        
        # Posiciona
        rect_resultado = surface_resultado.get_rect(center=(centro_x, y))
        
        # Desenha sombra
        surface_sombra = self.fonte_resultado.render(
            self.resultado_texto, True, (0, 0, 0)
        )
        if self.escala_animacao != 1.0:
            largura_original = surface_sombra.get_width()
            altura_original = surface_sombra.get_height()
            nova_largura = int(largura_original * self.escala_animacao)
            nova_altura = int(altura_original * self.escala_animacao)
            surface_sombra = pygame.transform.scale(
                surface_sombra, (nova_largura, nova_altura)
            )
        
        if self.alpha_animacao < 255:
            surface_sombra.set_alpha(self.alpha_animacao // 2)
        
        rect_sombra = rect_resultado.copy()
        rect_sombra.x += 3
        rect_sombra.y += 3
        tela.blit(surface_sombra, rect_sombra)
        
        # Desenha resultado
        tela.blit(surface_resultado, rect_resultado)
    
    def _desenhar_dicas(self, tela, centro_x, y):
        """Desenha dicas de jogo."""
        if self.tempo_resultado < 1000:  # Só mostra após 1 segundo
            return
            
        dica = "Pressione qualquer tecla para continuar..."
        surface_dica = self.fonte_escolhas.render(dica, True, (200, 200, 200))
        
        # Efeito de piscar
        if int(self.tempo_resultado / 300) % 2 == 0:
            if self.alpha_animacao < 255:
                surface_dica.set_alpha(self.alpha_animacao)
            rect_dica = surface_dica.get_rect(center=(centro_x, y))
            tela.blit(surface_dica, rect_dica)
    
    def _desenhar_detalhes_inimigos(self, tela, centro_x, y_inicial):
        """Desenha detalhes dos inimigos afetados no combate."""
        if not hasattr(self, 'detalhes_combate') or not self.detalhes_combate:
            return
            
        detalhes = self.detalhes_combate
        y_atual = y_inicial
        
        # Inimigo principal
        if 'alvo_principal' in detalhes and detalhes['alvo_principal']:
            alvo = detalhes['alvo_principal']
            texto = f"🎯 {alvo['nome']}: -{alvo['dano_real']} HP"
            if alvo['morreu']:
                texto += " 💀"
            
            surface = self.fonte_escolhas.render(texto, True, (255, 255, 150))
            if self.alpha_animacao < 255:
                surface.set_alpha(self.alpha_animacao)
            rect = surface.get_rect(center=(centro_x, y_atual))
            tela.blit(surface, rect)
            y_atual += 25
        
        # Inimigos secundários (dano em área)
        if 'inimigos_secundarios' in detalhes:
            for inimigo_sec in detalhes['inimigos_secundarios']:
                texto = f"💥 {inimigo_sec['nome']}: -{inimigo_sec['dano_real']} HP"
                if inimigo_sec['morreu']:
                    texto += " 💀"
                
                surface = self.fonte_escolhas.render(texto, True, (255, 200, 100))
                if self.alpha_animacao < 255:
                    surface.set_alpha(self.alpha_animacao)
                rect = surface.get_rect(center=(centro_x, y_atual))
                tela.blit(surface, rect)
                y_atual += 25
        
        # Dano ao jogador
        if 'dano_ao_jogador' in detalhes and detalhes['dano_ao_jogador'] > 0:
            texto = f"💔 Você: -{detalhes['dano_ao_jogador']} HP"
            surface = self.fonte_escolhas.render(texto, True, (255, 150, 150))
            if self.alpha_animacao < 255:
                surface.set_alpha(self.alpha_animacao)
            rect = surface.get_rect(center=(centro_x, y_atual))
            tela.blit(surface, rect)
            y_atual += 25
        
        # Recompensa em dinheiro
        if 'recompensa_dinheiro' in detalhes and detalhes['recompensa_dinheiro'] > 0:
            recompensa = detalhes['recompensa_dinheiro']
            efetividade = detalhes.get('efetividade_texto', '')
            texto = f"💰 +${recompensa} {efetividade}"
            surface = self.fonte_escolhas.render(texto, True, (100, 255, 100))
            if self.alpha_animacao < 255:
                surface.set_alpha(self.alpha_animacao)
            rect = surface.get_rect(center=(centro_x, y_atual))
            tela.blit(surface, rect)
    
    def esta_ativo(self):
        """Verifica se está mostrando resultado."""
        return self.resultado_ativo
    
    def parar_resultado(self):
        """Para de mostrar o resultado."""
        self.resultado_ativo = False

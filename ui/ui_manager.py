"""
Sistema de interface do usuário.
Responsável por desenhar e gerenciar todos os elementos de UI do jogo.
"""

import pygame
from config.constants import *
from config.enums import *

class UIManager:
    """Gerenciador de interface do usuário."""
    
    def __init__(self, resource_manager):
        """Inicializa o gerenciador de UI."""
        self.resource_manager = resource_manager
        self.botoes = {}
        self.menu_selecao_ativo = False
        self.tipo_menu_atual = TipoMenu.ATAQUES
        self.menu_altura = 0
        self.menu_altura_alvo = 300
        self.tooltip_ativo = False
        self.tooltip_texto = ""
        self.tooltip_pos = (0, 0)
        
        # Animação dos botões
        self.botoes_animacao_ativa = False
        self.botoes_pos_y_original = BOTOES_Y_ORIGINAL
        self.botoes_pos_y_atual = self.botoes_pos_y_original
        self.botoes_pos_y_escondido = BOTOES_Y_ESCONDIDO
        self.animacao_escondendo = False
        
        self.criar_botoes()
        
    def criar_botoes(self):
        """Cria todos os botões do jogo."""
        # Botão jogar no menu
        self.botoes['jogar'] = {
            'rect': pygame.Rect(LARGURA//2 - 100, ALTURA//2 + 50, 200, 60),
            'texto': 'JOGAR',
            'ativo': True
        }
        
        # Botões de Menu Principal - Molduras maiores
        self.botoes['ataques'] = {
            'rect': pygame.Rect(80, ALTURA - 130, 240, 90),
            'texto': 'ATAQUES',
            'ativo': True
        }
        self.botoes['loja_menu'] = {
            'rect': pygame.Rect(340, ALTURA - 130, 240, 90),
            'texto': 'LOJA',
            'ativo': True
        }
        self.botoes['status'] = {
            'rect': pygame.Rect(600, ALTURA - 130, 160, 90),
            'texto': 'MONSTRUÁRIO',
            'ativo': True
        }
        
        # Botões de escolha de ataque
        self.botoes['pedra'] = {
            'rect': pygame.Rect(50, 0, 180, 70),
            'texto': 'PEDRA',
            'ativo': True
        }
        self.botoes['papel'] = {
            'rect': pygame.Rect(250, 0, 180, 70),
            'texto': 'PAPEL',
            'ativo': True
        }
        self.botoes['tesoura'] = {
            'rect': pygame.Rect(450, 0, 180, 70),
            'texto': 'TESOURA',
            'ativo': True
        }
        
        # Botão reiniciar
        self.botoes['reiniciar'] = {
            'rect': pygame.Rect(LARGURA//2 - 100, ALTURA//2 + 100, 200, 60),
            'texto': 'NOVO JOGO',
            'ativo': True
        }
        
    def desenhar_botao(self, tela, botao_key, mouse_pos):
        """Desenha um botão específico."""
        botao = self.botoes[botao_key]
        if not botao['ativo']:
            return
            
        # Verifica se o mouse está sobre o botão
        hover = botao['rect'].collidepoint(mouse_pos)
        
        # Usa moldura personalizada se disponível
        moldura_itens = self.resource_manager.obter_moldura('itens')
        if moldura_itens:
            # Escala a moldura para o tamanho do botão
            moldura_escalada = pygame.transform.scale(moldura_itens, (botao['rect'].width, botao['rect'].height))
            
            # Aplica um filtro de cor se hover
            if hover:
                overlay = pygame.Surface((botao['rect'].width, botao['rect'].height))
                overlay.fill((255, 255, 255))
                overlay.set_alpha(30)
                moldura_escalada.blit(overlay, (0, 0), special_flags=pygame.BLEND_ALPHA_SDL2)
            
            # Desenha a moldura
            tela.blit(moldura_escalada, botao['rect'])
        else:
            # Fallback para moldura desenhada
            cor = MARROM_LOJA_CLARO if hover else MARROM_LOJA
            pygame.draw.rect(tela, cor, botao['rect'])
            pygame.draw.rect(tela, PRETO, botao['rect'], 3)
        
        # Desenha o texto
        fonte_texto = self.resource_manager.obter_fonte('texto')
        texto = fonte_texto.render(botao['texto'], True, BRANCO)
        texto_rect = texto.get_rect(center=botao['rect'].center)
        tela.blit(texto, texto_rect)
        
    def verificar_clique_botao(self, pos):
        """Verifica se algum botão foi clicado."""
        for key, botao in self.botoes.items():
            if botao['ativo'] and botao['rect'].collidepoint(pos):
                return key
        return None
        
    def desenhar_menu_principal(self, tela):
        """Desenha o menu principal."""
        tela.fill(AZUL)
        
        # Título
        fonte_titulo = self.resource_manager.obter_fonte('titulo')
        titulo = fonte_titulo.render("JOKENGHOST", True, BRANCO)
        titulo_rect = titulo.get_rect(center=(LARGURA//2, ALTURA//3))
        tela.blit(titulo, titulo_rect)
        
        # Subtítulo
        fonte_texto = self.resource_manager.obter_fonte('texto')
        subtitulo = fonte_texto.render("Caçada em Turnos", True, BRANCO)
        subtitulo_rect = subtitulo.get_rect(center=(LARGURA//2, ALTURA//3 + 80))
        tela.blit(subtitulo, subtitulo_rect)
        
        # Botão jogar
        mouse_pos = pygame.mouse.get_pos()
        self.desenhar_botao(tela, 'jogar', mouse_pos)
        
    def desenhar_transicao(self, tela, transicao_alpha):
        """Desenha a tela de transição."""
        tela.fill(PRETO)
        
        # Efeito de fade
        superficie_fade = pygame.Surface((LARGURA, ALTURA))
        superficie_fade.fill(BRANCO)
        superficie_fade.set_alpha(transicao_alpha)
        tela.blit(superficie_fade, (0, 0))
        
        # Texto de transição
        if transicao_alpha > 128:
            fonte_titulo = self.resource_manager.obter_fonte('titulo')
            texto = fonte_titulo.render("UM GHOST APARECEU!", True, PRETO)
            texto_rect = texto.get_rect(center=(LARGURA//2, ALTURA//2))
            tela.blit(texto, texto_rect)
            
    def desenhar_intro(self, tela, textos_intro):
        """Desenha a tela de introdução."""
        tela.fill(PRETO)
        
        # Desenha a carta se disponível
        carta_imagem = self.resource_manager.obter_imagem('carta_intro')
        if carta_imagem:
            carta_redimensionada = pygame.transform.scale(carta_imagem, (300, 200))
            carta_rect = carta_redimensionada.get_rect()
            carta_x = (LARGURA - carta_rect.width) // 2
            carta_y = 30
            tela.blit(carta_redimensionada, (carta_x, carta_y))
            texto_y_inicio = 280
        else:
            texto_y_inicio = 200
            
        linha_altura = 22
        fonte_pequena = self.resource_manager.obter_fonte('pequena')
        
        # Renderiza o texto da história
        for i, linha in enumerate(textos_intro):
            if linha:
                superficie_texto = fonte_pequena.render(linha, True, BRANCO)
                texto_rect = superficie_texto.get_rect()
                texto_rect.centerx = LARGURA // 2
                texto_rect.y = texto_y_inicio + (i * linha_altura)
                
                if texto_rect.bottom < ALTURA - 60:
                    tela.blit(superficie_texto, texto_rect)
        
        # Seta de continuação
        seta_texto = fonte_pequena.render("▼ Pressione ESPAÇO para continuar", True, AMARELO)
        seta_rect = seta_texto.get_rect(center=(LARGURA//2, ALTURA - 30))
        tela.blit(seta_texto, seta_rect)
        
    def desenhar_barra_vida(self, tela, x, y, vida_atual, vida_maxima, cor, largura=200):
        """Desenha uma barra de vida."""
        # Fundo da barra
        pygame.draw.rect(tela, PRETO, (x-2, y-2, largura+4, 24))
        pygame.draw.rect(tela, CINZA, (x, y, largura, 20))
        
        # Barra de vida
        vida_porcentagem = vida_atual / vida_maxima
        largura_vida = int(largura * vida_porcentagem)
        pygame.draw.rect(tela, cor, (x, y, largura_vida, 20))
        
        # Texto da vida
        fonte_pequena = self.resource_manager.obter_fonte('pequena')
        texto_vida = fonte_pequena.render(f"{vida_atual}/{vida_maxima}", True, BRANCO)
        tela.blit(texto_vida, (x + largura//2 - texto_vida.get_width()//2, y - 25))
        
    def desenhar_barra_vida_automatica(self, tela, sprite_x, sprite_y, sprite_largura, sprite_altura, 
                                      vida_atual, vida_max, nome, largura_barra=120, mostrar_numeros=True):
        """Desenha barra de vida automaticamente posicionada acima do sprite."""
        # Calcula posição centralizada acima do sprite
        barra_x = sprite_x + (sprite_largura - largura_barra) // 2
        barra_y = sprite_y - 40  # 40px acima do sprite
        
        # Desenha a barra de vida
        self.desenhar_barra_vida(tela, barra_x, barra_y, vida_atual, vida_max, VERMELHO, largura_barra)
        
        # Desenha o nome do personagem
        fonte_pequena = self.resource_manager.obter_fonte('pequena')
        if mostrar_numeros:
            texto_nome = fonte_pequena.render(f"{nome} ({int(vida_atual)}/{vida_max})", True, BRANCO)
        else:
            texto_nome = fonte_pequena.render(nome, True, BRANCO)
        nome_x = sprite_x + (sprite_largura - texto_nome.get_width()) // 2
        tela.blit(texto_nome, (nome_x, barra_y - 20))
        
    def desenhar_hud_dinheiro(self, tela, dinheiro):
        """Desenha o HUD de dinheiro."""
        moldura_dinheiro = self.resource_manager.obter_moldura('dinheiro')
        
        if moldura_dinheiro:
            # Posição no canto superior direito
            pos_x = LARGURA - 140
            pos_y = 20
            
            # Desenha a moldura
            tela.blit(moldura_dinheiro, (pos_x, pos_y))
            
            # Desenha o texto do dinheiro centralizado na moldura
            fonte_pequena = self.resource_manager.obter_fonte('pequena')
            texto_dinheiro = fonte_pequena.render(f"${dinheiro}", True, DOURADO)
            texto_rect = texto_dinheiro.get_rect(center=(pos_x + 60, pos_y + 20))
            tela.blit(texto_dinheiro, texto_rect)
        else:
            # Fallback sem moldura
            pos_x = LARGURA - 120
            pos_y = 20
            pygame.draw.rect(tela, MARROM_LOJA, (pos_x, pos_y, 100, 30), border_radius=5)
            pygame.draw.rect(tela, PRETO, (pos_x, pos_y, 100, 30), 2, border_radius=5)
            
            fonte_pequena = self.resource_manager.obter_fonte('pequena')
            texto_dinheiro = fonte_pequena.render(f"${dinheiro}", True, DOURADO)
            texto_rect = texto_dinheiro.get_rect(center=(pos_x + 50, pos_y + 15))
            tela.blit(texto_dinheiro, texto_rect)
            
    def abrir_menu_selecao(self, tipo_menu):
        """Abre o menu de seleção com animação."""
        self.menu_selecao_ativo = True
        self.tipo_menu_atual = tipo_menu
        self.menu_altura = 0
        print(f"📋 Abrindo menu: {tipo_menu.name}")
        
    def fechar_menu_selecao(self):
        """Fecha o menu de seleção."""
        self.menu_selecao_ativo = False
        self.menu_altura = 0
        print("📋 Fechando menu de seleção")
        
    def atualizar_animacao_menu(self):
        """Atualiza a animação do menu de seleção."""
        if self.menu_selecao_ativo and self.menu_altura < self.menu_altura_alvo:
            self.menu_altura += VELOCIDADE_MENU
            if self.menu_altura > self.menu_altura_alvo:
                self.menu_altura = self.menu_altura_alvo
        elif not self.menu_selecao_ativo and self.menu_altura > 0:
            self.menu_altura -= VELOCIDADE_MENU
            if self.menu_altura < 0:
                self.menu_altura = 0
                
    def esconder_botoes_ataque(self):
        """Inicia animação para esconder os botões de ataque."""
        self.botoes_animacao_ativa = True
        self.animacao_escondendo = True
        print("🔽 Escondendo botões de ataque...")
        
    def mostrar_botoes_ataque(self):
        """Inicia animação para mostrar os botões de ataque."""
        self.botoes_animacao_ativa = True
        self.animacao_escondendo = False
        print("🔼 Mostrando botões de ataque...")
        
    def atualizar_animacao_botoes(self):
        """Atualiza a animação dos botões de ataque."""
        if not self.botoes_animacao_ativa:
            return
            
        if self.animacao_escondendo:
            # Escondendo botões
            self.botoes_pos_y_atual += VELOCIDADE_ANIMACAO_BOTOES
            if self.botoes_pos_y_atual >= self.botoes_pos_y_escondido:
                self.botoes_pos_y_atual = self.botoes_pos_y_escondido
                self.botoes_animacao_ativa = False
        else:
            # Mostrando botões
            self.botoes_pos_y_atual -= VELOCIDADE_ANIMACAO_BOTOES
            if self.botoes_pos_y_atual <= self.botoes_pos_y_original:
                self.botoes_pos_y_atual = self.botoes_pos_y_original
                self.botoes_animacao_ativa = False
                
        # Atualiza posições dos botões
        self.atualizar_posicoes_botoes()
        
    def atualizar_posicoes_botoes(self):
        """Atualiza as posições Y dos botões de ataque baseado na animação."""
        botoes_principais = ['ataques', 'loja_menu', 'status']
        for botao_key in botoes_principais:
            if botao_key in self.botoes:
                rect_original = self.botoes[botao_key]['rect']
                novo_y = self.botoes_pos_y_atual
                self.botoes[botao_key]['rect'] = pygame.Rect(
                    rect_original.x, 
                    novo_y, 
                    rect_original.width, 
                    rect_original.height
                )

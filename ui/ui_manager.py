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
        print("--- ESTOU EXECUTANDO O CÓDIGO NOVO! ---")
        """Cria todos os botões do jogo de forma responsiva e centralizada."""
        
        # === 1. BOTÕES DO MENU PRINCIPAL (Ataques, Loja, Monstruário) ===
        # Vistos em: image_238265.jpg
        
        # --- Definição de Tamanho Padrão (Baseado na Resolução) ---
        # Você pode ajustar essas porcentagens para deixar os botões maiores ou menores
        BOTAO_LARGURA_MAIN = int(LARGURA * 0.28)  # 28% da largura da tela
        BOTAO_ALTURA_MAIN = int(ALTURA * 0.11)   # 11% da altura da tela
        
        # --- Cálculo de Espaçamento e Posição Inicial ---
        NUM_BOTOES_MAIN = 3
        # Espaçamento de 4% da largura da tela entre os botões
        ESPACO_ENTRE_BOTOES_MAIN = int(LARGURA * 0.04)
        
        # Largura total que o *bloco* de botões vai ocupar
        LARGURA_TOTAL_BOTOES_MAIN = (BOTAO_LARGURA_MAIN * NUM_BOTOES_MAIN) + (ESPACO_ENTRE_BOTOES_MAIN * (NUM_BOTOES_MAIN - 1))
        
        # Posição X do PRIMEIRO botão para centralizar o bloco
        X_INICIAL_MAIN = (LARGURA - LARGURA_TOTAL_BOTOES_MAIN) // 2
        
        # Posição Y (usando a constante que você já tem no __init__)
        Y_BOTOES_MAIN = self.botoes_pos_y_original 
        
        # --- Criação dos Botões ---
        
        x_atual = X_INICIAL_MAIN
        
        self.botoes['ataques'] = {
            'rect': pygame.Rect(x_atual, Y_BOTOES_MAIN, BOTAO_LARGURA_MAIN, BOTAO_ALTURA_MAIN),
            'texto': 'ATAQUES',
            'ativo': True
        }
        
        x_atual += BOTAO_LARGURA_MAIN + ESPACO_ENTRE_BOTOES_MAIN
        
        self.botoes['loja_menu'] = {
            'rect': pygame.Rect(x_atual, Y_BOTOES_MAIN, BOTAO_LARGURA_MAIN, BOTAO_ALTURA_MAIN),
            'texto': 'LOJA',
            'ativo': True
        }
        
        x_atual += BOTAO_LARGURA_MAIN + ESPACO_ENTRE_BOTOES_MAIN
        
        self.botoes['status'] = {
            'rect': pygame.Rect(x_atual, Y_BOTOES_MAIN, BOTAO_LARGURA_MAIN, BOTAO_ALTURA_MAIN),
            'texto': 'MONSTRUÁRIO',
            'ativo': True
        }
        
        # === 2. BOTÕES DE ATAQUE (Pedra, Papel, Tesoura) ===
        # Vistos em: image_238283.jpg
        
        # Mesma lógica, mas com tamanhos um pouco menores para o menu
        BOTAO_LARGURA_ATK = int(LARGURA * 0.22)  # 22% da largura da tela
        BOTAO_ALTURA_ATK = int(ALTURA * 0.10)   # 10% da altura da tela
        
        NUM_BOTOES_ATK = 3
        ESPACO_ENTRE_BOTOES_ATK = int(LARGURA * 0.03)
        
        LARGURA_TOTAL_BOTOES_ATK = (BOTAO_LARGURA_ATK * NUM_BOTOES_ATK) + (ESPACO_ENTRE_BOTOES_ATK * (NUM_BOTOES_ATK - 1))
        
        # X inicial para centralizar o bloco
        X_INICIAL_ATK = (LARGURA - LARGURA_TOTAL_BOTOES_ATK) // 2
        
        # O Y é 0 porque ele será definido dinamicamente pelo menu que sobe
        # (no seu arquivo menu_renderer.py)
        Y_BOTOES_ATK = 0 
        
        x_atual_atk = X_INICIAL_ATK
        
        self.botoes['pedra'] = {
            'rect': pygame.Rect(x_atual_atk, Y_BOTOES_ATK, BOTAO_LARGURA_ATK, BOTAO_ALTURA_ATK),
            'texto': 'PEDRA',
            'ativo': True
        }
        
        x_atual_atk += BOTAO_LARGURA_ATK + ESPACO_ENTRE_BOTOES_ATK
        
        self.botoes['papel'] = {
            'rect': pygame.Rect(x_atual_atk, Y_BOTOES_ATK, BOTAO_LARGURA_ATK, BOTAO_ALTURA_ATK),
            'texto': 'PAPEL',
            'ativo': True
        }
        
        x_atual_atk += BOTAO_LARGURA_ATK + ESPACO_ENTRE_BOTOES_ATK
        
        self.botoes['tesoura'] = {
            'rect': pygame.Rect(x_atual_atk, Y_BOTOES_ATK, BOTAO_LARGURA_ATK, BOTAO_ALTURA_ATK),
            'texto': 'TESOURA',
            'ativo': True
        }
        
        # === 3. OUTROS BOTÕES (Jogar, Reiniciar) ===
        # Vamos padronizar e centralizar eles também
        
        BOTAO_MENU_LARGURA = int(LARGURA * 0.25) # 25% da tela
        BOTAO_MENU_ALTURA = int(ALTURA * 0.08)  # 8% da tela
        
        # Posição Y relativa (ex: 55% e 65% da altura da tela)
        Y_JOGAR = int(ALTURA * 0.55)
        Y_REINICIAR = int(ALTURA * 0.65)
        
        self.botoes['jogar'] = {
            'rect': pygame.Rect((LARGURA - BOTAO_MENU_LARGURA) // 2, Y_JOGAR, BOTAO_MENU_LARGURA, BOTAO_MENU_ALTURA),
            'texto': 'JOGAR',
            'ativo': True
        }
        
        self.botoes['reiniciar'] = {
            'rect': pygame.Rect((LARGURA - BOTAO_MENU_LARGURA) // 2, Y_REINICIAR, BOTAO_MENU_LARGURA, BOTAO_MENU_ALTURA),
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
        fundo_menu = self.resource_manager.obter_imagem('menu_background')
        if fundo_menu:
                       # Redimensiona a imagem para preencher a tela
            fundo_redimensionado = pygame.transform.scale(fundo_menu, (LARGURA, ALTURA))
            tela.blit(fundo_redimensionado, (0, 0))
        else:
                       # Fallback se a imagem não carregar (volta para o azul)
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
        """Desenha o HUD de dinheiro (IDÊNTICO AO ORIGINAL)."""
        # Posição da moldura/dinheiro (canto superior direito)
        x = LARGURA - 130
        y = 10
        
        # Desenha a moldura se disponível
        moldura_dinheiro = self.resource_manager.obter_moldura('dinheiro')
        if moldura_dinheiro:
            tela.blit(moldura_dinheiro, (x, y))
        else:
            # Fallback para moldura desenhada
            caixa = pygame.Rect(x, y, 120, 40)
            pygame.draw.rect(tela, MARROM_LOJA, caixa, border_radius=8)
            pygame.draw.rect(tela, PRETO, caixa, 2, border_radius=8)
        
        # Texto apenas com o valor (sem "Dinheiro:")
        fonte_pequena = self.resource_manager.obter_fonte('pequena')
        txt = fonte_pequena.render(f"${dinheiro}", True, BRANCO)
        # Centraliza o texto na moldura
        text_rect = txt.get_rect(center=(x + 60, y + 20))
        tela.blit(txt, text_rect)
            
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

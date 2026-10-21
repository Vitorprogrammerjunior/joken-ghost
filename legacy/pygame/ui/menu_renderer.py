"""
Sistema de renderização de menus específicos do jogo.
Responsável por desenhar menus de ataques, loja e monstruário.
"""

import pygame
from config.constants import *
from config.enums import *

class MenuRenderer:
    """Renderizador de menus específicos."""
    
    def __init__(self, resource_manager):
        """Inicializa o renderizador de menus."""
        self.resource_manager = resource_manager
        
    def desenhar_menu_ataques(self, tela, ui_manager, mouse_pos):
        """Desenha o menu de seleção de ataques (IDÊNTICO AO ORIGINAL)."""
        if ui_manager.menu_altura <= 0:
            return
            
        # Menu ocupa toda a largura da tela como no original
        menu_largura = LARGURA
        menu_altura = ui_manager.menu_altura
        menu_x = 0
        menu_y = ALTURA - menu_altura
        
        # Apenas fundo marrom (sem azul)
        menu_rect = pygame.Rect(menu_x, menu_y, menu_largura, menu_altura)
        pygame.draw.rect(tela, MARROM_LOJA, menu_rect, border_radius=20)
        pygame.draw.rect(tela, PRETO, menu_rect, 3, border_radius=20)
        
        if menu_altura > 50:  # Só desenha conteúdo quando menu está aberto
            # Título centralizado
            fonte_titulo = self.resource_manager.obter_fonte('titulo')
            titulo = fonte_titulo.render("ESCOLHA SEU ATAQUE", True, BRANCO)
            titulo_rect = titulo.get_rect(center=(LARGURA//2, menu_y + 40))
            tela.blit(titulo, titulo_rect)
            
            # Botão fechar (X) - círculo vermelho como no original
            botao_size = 50
            botao_x = LARGURA - botao_size - 20
            botao_y = menu_y + 15
            botao_center = (botao_x + botao_size//2, botao_y + botao_size//2)
            
            # Círculo vermelho com borda branca
            pygame.draw.circle(tela, VERMELHO, botao_center, botao_size//2)
            pygame.draw.circle(tela, BRANCO, botao_center, botao_size//2, 3)
            
            # X branco no centro
            fonte_x = self.resource_manager.obter_fonte('titulo')
            texto_x = fonte_x.render("×", True, BRANCO)
            x_rect = texto_x.get_rect(center=botao_center)
            tela.blit(texto_x, x_rect)
            
            # Salvar área do botão para cliques
            ui_manager._botao_fechar_rect = pygame.Rect(botao_x, botao_y, botao_size, botao_size)
            
            # Botões de ataque - AGORA CENTRALIZADOS
            if menu_altura >= 150:
                botoes_y = menu_y + 90  # Posição Y dos botões
                
                # ATUALIZA APENAS A POSIÇÃO Y
                # O X já foi calculado corretamente no ui_manager.py
                ui_manager.botoes['pedra']['rect'].y = botoes_y
                ui_manager.botoes['papel']['rect'].y = botoes_y
                ui_manager.botoes['tesoura']['rect'].y = botoes_y
                
                # Desenha os botões (eles usarão o X e Largura corretos)
                ui_manager.desenhar_botao(tela, 'pedra', mouse_pos)
                ui_manager.desenhar_botao(tela, 'papel', mouse_pos)
                ui_manager.desenhar_botao(tela, 'tesoura', mouse_pos)
                        
    def desenhar_menu_loja(self, tela, ui_manager, mouse_pos, loja_manager, dinheiro_jogador=100):
        """Desenha o menu da loja (IDÊNTICO AO ORIGINAL)."""
        if ui_manager.menu_altura <= 0:
            return
            
        # Menu centralizado como no original
        menu_largura = 700  # Ligeiramente maior para a loja
        menu_altura = ui_manager.menu_altura
        menu_x = (LARGURA - menu_largura) // 2
        menu_y = ALTURA - menu_altura - 50
        
        # Fundo marrom como no original
        menu_rect = pygame.Rect(menu_x, menu_y, menu_largura, menu_altura)
        pygame.draw.rect(tela, MARROM_LOJA, menu_rect, border_radius=20)
        pygame.draw.rect(tela, BRANCO, menu_rect, 3, border_radius=20)  # Borda branca (não dourada)
        
        if menu_altura > 50:
            # Título branco (não dourado)
            fonte_titulo = self.resource_manager.obter_fonte('titulo')
            titulo = fonte_titulo.render("LOJA DO CAÇADOR", True, BRANCO)
            titulo_rect = titulo.get_rect(center=(menu_x + menu_largura//2, menu_y + 40))
            tela.blit(titulo, titulo_rect)
            
            # Botão fechar (X) no canto superior direito
            botao_fechar = pygame.Rect(menu_x + menu_largura - 60, menu_y + 10, 50, 50)
            pygame.draw.circle(tela, VERMELHO, botao_fechar.center, 25)
            pygame.draw.circle(tela, BRANCO, botao_fechar.center, 25, 3)
            
            fonte_x = self.resource_manager.obter_fonte('titulo')
            texto_x = fonte_x.render("×", True, BRANCO)
            x_rect = texto_x.get_rect(center=botao_fechar.center)
            tela.blit(texto_x, x_rect)
            
            # Salvar área do botão para cliques
            ui_manager._botao_fechar_rect = botao_fechar
            
            # Itens da loja com molduras iguais aos botões de ataque
            if menu_altura >= 200:
                fonte_texto = self.resource_manager.obter_fonte('texto')
                fonte_pequena = self.resource_manager.obter_fonte('pequena')
                
                itens_y = menu_y + 80
                itens_loja = loja_manager.obter_itens_disponiveis()
                
                # Limpar retângulos anteriores
                ui_manager._itens_loja_rects = []
                
                for i, item in enumerate(itens_loja[:4]):  # Máximo 4 itens por linha
                    item_x = menu_x + 50 + (i * 150)
                    item_rect = pygame.Rect(item_x, itens_y, 140, 120)
                    
                    # Verifica se tem dinheiro suficiente para o item
                    pode_comprar = dinheiro_jogador >= item.preco
                    
                    # Salvar retângulo do item para detecção de clique
                    ui_manager._itens_loja_rects.append({
                        'rect': item_rect,
                        'item': item,
                        'pode_comprar': pode_comprar,
                        'indice': i
                    })
                    
                    # Usar a mesma moldura dos botões de ataque (hud_botao.png)
                    moldura_item = self.resource_manager.obter_moldura('itens')
                    if moldura_item:
                        # Redimensiona a moldura para o tamanho do item
                        moldura_redimensionada = pygame.transform.scale(moldura_item, (140, 120))
                        tela.blit(moldura_redimensionada, (item_x, itens_y))
                    else:
                        # Fallback: desenhar retângulo similar aos botões de ataque
                        pygame.draw.rect(tela, VERMELHO, item_rect, border_radius=10)
                        pygame.draw.rect(tela, BRANCO, item_rect, 3, border_radius=10)
                    
                    # Efeito visual de hover/clique
                    hover = item_rect.collidepoint(mouse_pos)
                    if hover and pode_comprar:
                        # Sobreposição verde quando pode comprar e está hovering
                        overlay = pygame.Surface((140, 120))
                        overlay.set_alpha(30)
                        overlay.fill(VERDE)
                        tela.blit(overlay, (item_x, itens_y))
                    elif not pode_comprar:
                        # Sobreposição vermelha quando não pode comprar
                        overlay = pygame.Surface((140, 120))
                        overlay.set_alpha(60)
                        overlay.fill(VERMELHO)
                        tela.blit(overlay, (item_x, itens_y))
                    
                    # === NOVO: Adiciona fundo escuro para contraste do texto ===
                    text_bg_height = 60 # Altura da área de texto (ajuste conforme necessário)
                    text_bg_y = itens_y + 40 # Posição Y da área de texto (ajuste)
                    
                    # Cria a superfície semi-transparente
                    text_bg_surface = pygame.Surface((120, text_bg_height)) # Largura um pouco menor que o cartão
                    text_bg_surface.set_alpha(150) # Ajuste a transparência (0-255)
                    text_bg_surface.fill(PRETO) # Cor preta
                    
                    # Calcula a posição X para centralizar o fundo do texto
                    text_bg_x = item_x + (item_rect.width - 120) // 2 
                    
                    # Desenha o fundo do texto na tela
                    tela.blit(text_bg_surface, (text_bg_x, text_bg_y))
                    # === FIM DO NOVO CÓDIGO ===

                    # Nome do item (centralizado) 
                    # (O código para desenhar nome, preço e descrição continua aqui)
                    nome_texto = fonte_pequena.render(item.nome, True, BRANCO)
                    nome_rect = nome_texto.get_rect(center=(item_x + 70, text_bg_y + 15)) # Ajuste Y para ficar sobre o fundo
                    tela.blit(nome_texto, nome_rect)
                    
                    # Preço com cor baseada no dinheiro disponível
                    cor_preco = VERDE if pode_comprar else VERMELHO
                    preco_texto = fonte_texto.render(f"${item.preco}", True, cor_preco)
                    preco_rect = preco_texto.get_rect(center=(item_x + 70, text_bg_y + 45)) # Ajuste Y
                    tela.blit(preco_texto, preco_rect)

                    # Efeito do item (se houver)
                    if hasattr(item, 'descricao') and item.descricao:
                        desc_texto = fonte_pequena.render(item.descricao[:15] + "...", True, CINZA_CLARO)
                        desc_rect = desc_texto.get_rect(center=(item_x + 70, itens_y + 60))
                        tela.blit(desc_texto, desc_rect)
            
    def desenhar_menu_monstruario(self, tela, ui_manager, mouse_pos, monstruario_manager):
        """Desenha o menu do monstruário (IDÊNTICO AO ORIGINAL)."""
        if ui_manager.menu_altura <= 0:
            return
            
        # Menu centralizado como no original
        menu_largura = 650
        menu_altura = ui_manager.menu_altura
        menu_x = (LARGURA - menu_largura) // 2
        menu_y = ALTURA - menu_altura - 50
        
        # Fundo roxo como no original
        menu_rect = pygame.Rect(menu_x, menu_y, menu_largura, menu_altura)
        pygame.draw.rect(tela, ROXO_ESCURO, menu_rect, border_radius=20)
        pygame.draw.rect(tela, ROXO, menu_rect, 3, border_radius=20)  # Borda roxa
        
        if menu_altura > 50:
            # Título
            fonte_titulo = self.resource_manager.obter_fonte('titulo')
            titulo = fonte_titulo.render("MONSTRUÁRIO", True, AMARELO)
            titulo_rect = titulo.get_rect(center=(menu_x + menu_largura//2, menu_y + 40))
            tela.blit(titulo, titulo_rect)
            
            # Botão fechar (X) no canto superior direito
            botao_fechar = pygame.Rect(menu_x + menu_largura - 60, menu_y + 10, 50, 50)
            pygame.draw.rect(tela, VERMELHO, botao_fechar, border_radius=20)
            pygame.draw.rect(tela, PRETO, botao_fechar, 2, border_radius=20)
            
            texto_x = fonte_titulo.render("×", True, BRANCO)
            x_rect = texto_x.get_rect(center=botao_fechar.center)
            tela.blit(texto_x, x_rect)
            
            # Conteúdo do monstruário
            if menu_altura >= 200:
                fonte_texto = self.resource_manager.obter_fonte('texto')
                
                # Texto explicativo
                texto_info = "Derrote inimigos para descobrir suas fraquezas!"
                info_render = fonte_texto.render(texto_info, True, BRANCO)
                info_rect = info_render.get_rect(center=(menu_x + menu_largura//2, menu_y + 120))
                tela.blit(info_render, info_rect)
                
                # Aqui seria onde o monstruario_manager desenha o conteúdo
                if hasattr(monstruario_manager, 'desenhar_conteudo'):
                    monstruario_manager.desenhar_conteudo(tela, menu_x + 50, menu_y + 150, mouse_pos)
            
    def desenhar_game_over(self, tela, ui_manager, mouse_pos):
        """Desenha a tela de game over."""
        tela.fill(PRETO)
        
        # Título
        fonte_titulo = self.resource_manager.obter_fonte('titulo')
        titulo = fonte_titulo.render("GAME OVER", True, VERMELHO)
        titulo_rect = titulo.get_rect(center=(LARGURA//2, ALTURA//2 - 50))
        tela.blit(titulo, titulo_rect)
        
        # Botão de reiniciar
        ui_manager.desenhar_botao(tela, 'reiniciar', mouse_pos)
        
    def desenhar_vitoria(self, tela, ui_manager, mouse_pos, pontos, inimigos_derrotados):
        """Desenha a tela de vitória."""
        tela.fill(AZUL_ESCURO)
        
        # Título
        fonte_titulo = self.resource_manager.obter_fonte('titulo')
        titulo = fonte_titulo.render("VITÓRIA!", True, DOURADO)
        titulo_rect = titulo.get_rect(center=(LARGURA//2, ALTURA//2 - 100))
        tela.blit(titulo, titulo_rect)
        
        # Estatísticas
        fonte_texto = self.resource_manager.obter_fonte('texto')
        stats_texto = fonte_texto.render(f"Pontos: {pontos}", True, BRANCO)
        stats_rect = stats_texto.get_rect(center=(LARGURA//2, ALTURA//2 - 30))
        tela.blit(stats_texto, stats_rect)
        
        inimigos_texto = fonte_texto.render(f"Inimigos Derrotados: {inimigos_derrotados}", True, BRANCO)
        inimigos_rect = inimigos_texto.get_rect(center=(LARGURA//2, ALTURA//2 + 10))
        tela.blit(inimigos_texto, inimigos_rect)
        
        # Botão de reiniciar
        ui_manager.desenhar_botao(tela, 'reiniciar', mouse_pos)
        
    def desenhar_resultado_combate(self, tela, resultado_texto, cor_resultado, fade_alpha):
        """Desenha o resultado do combate com fade."""
        if fade_alpha > 0:
            fonte_titulo = self.resource_manager.obter_fonte('titulo')
            resultado_surface = fonte_titulo.render(resultado_texto, True, cor_resultado)
            resultado_surface.set_alpha(fade_alpha)
            resultado_rect = resultado_surface.get_rect(center=(LARGURA//2, ALTURA//2))
            tela.blit(resultado_surface, resultado_rect)
            
    def desenhar_tooltip(self, tela, ui_manager):
        """Desenha tooltip quando ativo."""
        if not ui_manager.tooltip_ativo:
            return
            
        fonte_pequena = self.resource_manager.obter_fonte('pequena')
        texto_surface = fonte_pequena.render(ui_manager.tooltip_texto, True, BRANCO)
        
        # Fundo do tooltip
        padding = 10
        tooltip_rect = pygame.Rect(
            ui_manager.tooltip_pos[0] - padding,
            ui_manager.tooltip_pos[1] - texto_surface.get_height() - padding,
            texto_surface.get_width() + padding * 2,
            texto_surface.get_height() + padding * 2
        )
        
        # Ajusta posição se sair da tela
        if tooltip_rect.right > LARGURA:
            tooltip_rect.x = LARGURA - tooltip_rect.width
        if tooltip_rect.top < 0:
            tooltip_rect.y = ui_manager.tooltip_pos[1] + 20
            
        pygame.draw.rect(tela, PRETO, tooltip_rect)
        pygame.draw.rect(tela, BRANCO, tooltip_rect, 2)
        
        # Desenha o texto
        texto_pos = (tooltip_rect.x + padding, tooltip_rect.y + padding)
        tela.blit(texto_surface, texto_pos)
        
    def mostrar_tooltip(self, ui_manager, texto, pos):
        """Mostra um tooltip na posição especificada."""
        ui_manager.tooltip_ativo = True
        ui_manager.tooltip_texto = texto
        ui_manager.tooltip_pos = pos
        
    def esconder_tooltip(self, ui_manager):
        """Esconde o tooltip."""
        ui_manager.tooltip_ativo = False

"""
Sistema da loja do jogo.
Responsável por gerenciar itens, compras e vendas.
"""

import pygame
from config.constants import *
from config.enums import *

class LojaItem:
    """Representa um item da loja."""
    
    def __init__(self, nome, preco, descricao, tipo_buff=None, valor_buff=0):
        """Inicializa um item da loja."""
        self.nome = nome
        self.preco = preco
        self.descricao = descricao
        self.tipo_buff = tipo_buff
        self.valor_buff = valor_buff
        self.comprado = False
        
    def pode_comprar(self, dinheiro):
        """Verifica se o item pode ser comprado."""
        return dinheiro >= self.preco and not self.comprado
        
    def comprar(self):
        """Marca o item como comprado."""
        self.comprado = True
        
    def obter_cor_texto(self):
        """Retorna a cor apropriada para o texto do item."""
        if self.comprado:
            return CINZA
        else:
            return BRANCO

class LojaManager:
    """Gerenciador da loja."""
    
    def __init__(self, resource_manager):
        """Inicializa o gerenciador da loja."""
        self.resource_manager = resource_manager
        self.itens = []
        self.item_selecionado = None
        self.criar_itens_loja()
        
    def criar_itens_loja(self):
        """Cria todos os itens disponíveis na loja."""
        self.itens = [
            LojaItem(
                nome="Poção de Vida",
                preco=50,
                descricao="Restaura 50 pontos de vida",
                tipo_buff="vida",
                valor_buff=50
            ),
            LojaItem(
                nome="Amuleto da Força",
                preco=100,
                descricao="Aumenta dano em 10 pontos",
                tipo_buff="dano",
                valor_buff=10
            ),
            LojaItem(
                nome="Escudo Místico",
                preco=80,
                descricao="Reduz dano recebido em 5 pontos",
                tipo_buff="defesa",
                valor_buff=5
            ),
            LojaItem(
                nome="Elixir da Sorte",
                preco=150,
                descricao="Aumenta recompensas em 25%",
                tipo_buff="sorte",
                valor_buff=25
            )
        ]
        
    def desenhar_itens(self, tela, base_x, base_y, mouse_pos):
        """Desenha os itens da loja."""
        item_largura = 140
        item_altura = 100
        espaco_entre_itens = 20
        
        for i, item in enumerate(self.itens):
            # Calcula posição do item
            coluna = i % 4
            linha = i // 4
            
            item_x = base_x + 20 + (coluna * (item_largura + espaco_entre_itens))
            item_y = base_y + 20 + (linha * (item_altura + espaco_entre_itens))
            
            # Área do item
            item_rect = pygame.Rect(item_x, item_y, item_largura, item_altura)
            
            # Verifica hover
            hover = item_rect.collidepoint(mouse_pos)
            
            # Desenha moldura do item
            moldura_itens = self.resource_manager.obter_moldura('itens')
            if moldura_itens:
                moldura_escalada = pygame.transform.scale(moldura_itens, (item_largura, item_altura))
                
                # Efeito visual baseado no estado
                if item.comprado:
                    # Item comprado - mais escuro
                    overlay = pygame.Surface((item_largura, item_altura))
                    overlay.fill(PRETO)
                    overlay.set_alpha(100)
                    moldura_escalada.blit(overlay, (0, 0))
                elif hover:
                    # Hover - mais claro
                    overlay = pygame.Surface((item_largura, item_altura))
                    overlay.fill(BRANCO)
                    overlay.set_alpha(30)
                    moldura_escalada.blit(overlay, (0, 0))
                    
                tela.blit(moldura_escalada, item_rect)
            else:
                # Fallback sem moldura
                cor_fundo = MARROM_LOJA_CLARO if hover else MARROM_LOJA
                if item.comprado:
                    cor_fundo = CINZA
                pygame.draw.rect(tela, cor_fundo, item_rect)
                pygame.draw.rect(tela, DOURADO, item_rect, 2)
            
            # Desenha informações do item
            self.desenhar_info_item(tela, item, item_rect)
            
            # Armazena rect para detecção de clique
            item.rect = item_rect
            
    def desenhar_info_item(self, tela, item, rect):
        """Desenha as informações de um item."""
        fonte_pequena = self.resource_manager.obter_fonte('pequena')
        
        # Nome do item
        cor_texto = item.obter_cor_texto()
        nome_surface = fonte_pequena.render(item.nome, True, cor_texto)
        nome_rect = nome_surface.get_rect(centerx=rect.centerx, y=rect.y + 5)
        tela.blit(nome_surface, nome_rect)
        
        # Preço
        if item.comprado:
            preco_texto = "COMPRADO"
            cor_preco = VERDE
        else:
            preco_texto = f"${item.preco}"
            cor_preco = DOURADO
            
        preco_surface = fonte_pequena.render(preco_texto, True, cor_preco)
        preco_rect = preco_surface.get_rect(centerx=rect.centerx, y=rect.y + 25)
        tela.blit(preco_surface, preco_rect)
        
        # Descrição (texto menor e quebrado em linhas)
        self.desenhar_descricao_quebrada(tela, item.descricao, rect, cor_texto)
        
    def desenhar_descricao_quebrada(self, tela, descricao, rect, cor):
        """Desenha uma descrição quebrada em múltiplas linhas."""
        fonte_muito_pequena = self.resource_manager.obter_fonte('muito_pequena')
        if not fonte_muito_pequena:
            fonte_muito_pequena = self.resource_manager.obter_fonte('pequena')
            
        palavras = descricao.split()
        linhas = []
        linha_atual = ""
        
        # Quebra o texto em linhas que cabem na largura
        for palavra in palavras:
            teste_linha = linha_atual + (" " if linha_atual else "") + palavra
            if fonte_muito_pequena.size(teste_linha)[0] <= rect.width - 10:
                linha_atual = teste_linha
            else:
                if linha_atual:
                    linhas.append(linha_atual)
                linha_atual = palavra
                
        if linha_atual:
            linhas.append(linha_atual)
            
        # Desenha as linhas
        y_offset = rect.y + 45
        for linha in linhas:
            if y_offset + 12 < rect.bottom:  # Verifica se cabe
                linha_surface = fonte_muito_pequena.render(linha, True, cor)
                linha_rect = linha_surface.get_rect(centerx=rect.centerx, y=y_offset)
                tela.blit(linha_surface, linha_rect)
                y_offset += 12
                
    def verificar_clique_item(self, pos):
        """Verifica se algum item foi clicado."""
        for item in self.itens:
            if hasattr(item, 'rect') and item.rect.collidepoint(pos):
                return item
        return None
        
    def comprar_item(self, item, jogador_dinheiro):
        """Tenta comprar um item."""
        if item.pode_comprar(jogador_dinheiro):
            item.comprar()
            return True, item.preco
        return False, 0
        
    def aplicar_buff_item(self, item, stats_jogador):
        """Aplica o buff de um item aos stats do jogador."""
        if not item.comprado:
            return False
            
        if item.tipo_buff == "vida":
            stats_jogador['vida_atual'] = min(
                stats_jogador['vida_maxima'],
                stats_jogador['vida_atual'] + item.valor_buff
            )
            return True
            
        elif item.tipo_buff == "dano":
            stats_jogador['dano'] += item.valor_buff
            return True
            
        elif item.tipo_buff == "defesa":
            stats_jogador['defesa'] += item.valor_buff
            return True
            
        elif item.tipo_buff == "sorte":
            stats_jogador['multiplicador_recompensa'] += item.valor_buff / 100
            return True
            
        return False
        
    def resetar_loja(self):
        """Reseta todos os itens da loja."""
        for item in self.itens:
            item.comprado = False
            
    def obter_itens_disponiveis(self):
        """Retorna lista de itens disponíveis para compra."""
        return [item for item in self.itens if not item.comprado]
        
    def obter_itens_comprados(self):
        """Retorna lista de itens já comprados."""
        return [item for item in self.itens if item.comprado]
        
    def obter_valor_total_gasto(self):
        """Retorna o valor total gasto na loja."""
        return sum(item.preco for item in self.itens if item.comprado)

"""
Sistema da loja do jogo - IDÊNTICO AO ORIGINAL.
Responsável por gerenciar itens, compras exatamente como no jogo de 2000 linhas.
"""

import pygame
from config.constants import *

class LojaItem:
    """Item da loja exatamente como no original."""
    
    def __init__(self, nome, preco, efeito):
        """Inicializa um item da loja."""
        self.nome = nome
        self.preco = preco
        self.efeito = efeito

class LojaManager:
    """Gerenciador da loja idêntico ao original."""
    
    def __init__(self, resource_manager):
        """Inicializa o gerenciador da loja."""
        self.resource_manager = resource_manager
        
        # Itens IDÊNTICOS ao jogo original
        self.itens_loja = [
            {"nome": "Poção de Cura",   "preco": 30, "efeito": "cura_pequena"},
            {"nome": "Buff Ofensivo",   "preco": 50, "efeito": "buff_ofensivo"},
            {"nome": "Poção Grande",    "preco": 80, "efeito": "cura_grande"},
        ]
        
    def obter_itens_disponiveis(self):
        """Retorna os itens disponíveis convertidos para LojaItem."""
        itens = []
        for item_dict in self.itens_loja:
            item = LojaItem(item_dict["nome"], item_dict["preco"], item_dict["efeito"])
            itens.append(item)
        return itens
        
    def verificar_clique_item(self, pos):
        """Verifica se algum item foi clicado."""
        # Esta função é necessária para compatibilidade mas não faz nada no sistema refatorado
        # Os cliques são tratados pelo menu_renderer
        return None
        
    def comprar_item(self, item, dinheiro_jogador):
        """Compra um item se o jogador tiver dinheiro suficiente."""
        if dinheiro_jogador >= item.preco:
            return True, item.preco
        else:
            return False, 0
            
    def aplicar_efeito_item(self, item, jogador_stats):
        """Aplica o efeito do item no jogador."""
        if item.efeito == "cura_pequena":
            jogador_stats['vida'] = min(100, jogador_stats['vida'] + 30)
            return "Você recuperou 30 HP!"
        elif item.efeito == "cura_grande":
            jogador_stats['vida'] = min(100, jogador_stats['vida'] + 60)
            return "Você recuperou 60 HP!"
        elif item.efeito == "buff_ofensivo":
            return "Você causou 15 de dano no inimigo!"
        else:
            return "Item usado!"

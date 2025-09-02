

"""
Sistema de Loja - Módulo Auxiliar
=================================
Extraído diretamente do jokenghost.py para organização
"""

class LojaHelper:
    """
    Classe auxiliar para o sistema de loja.
    Mantém exatamente a mesma funcionalidade, apenas organizada.
    """
    
    @staticmethod
    def inicializar_itens_loja():
        """Retorna a lista de itens da loja - CÓDIGO ORIGINAL"""
        return [
            {"nome": "Poção de Cura",   "preco": 30, "efeito": "cura_pequena"},
            {"nome": "Buff Ofensivo",   "preco": 50, "efeito": "buff_ofensivo"},
            {"nome": "Poção Grande",    "preco": 80, "efeito": "cura_grande"},
        ]
    
    @staticmethod
    def processar_compra_item(jogo, item):
        """
        Processa a compra de um item - CÓDIGO ORIGINAL
        Args:
            jogo: instância da classe JokenGhost
            item: dicionário do item sendo comprado
        Returns:
            string: mensagem do resultado da compra
        """
        if jogo.dinheiro >= item['preco']:
            jogo.dinheiro -= item['preco']
            
            if item['efeito'] == "cura_pequena":
                jogo.vida_jogador = min(100, jogo.vida_jogador + 30)
                return f"Curou 30 HP! (${item['preco']})"
            elif item['efeito'] == "cura_grande":
                jogo.vida_jogador = min(100, jogo.vida_jogador + 60)
                return f"Curou 60 HP! (${item['preco']})"
            elif item['efeito'] == "buff_ofensivo":
                if hasattr(jogo, 'inimigos') and jogo.inimigos:
                    inimigo_ativo = jogo.get_inimigo_na_frente()
                    if inimigo_ativo:
                        inimigo_ativo['vida'] = max(0, inimigo_ativo['vida'] - 15)
                        return f"Causou 15 dano! (${item['preco']})"
                    else:
                        return f"Nenhum inimigo ativo! (${item['preco']})"
                else:
                    return f"Buff aplicado! (${item['preco']})"
        else:
            return "Dinheiro insuficiente!"
    
    @staticmethod
    def get_efeito_display(efeito):
        """Retorna o texto de exibição do efeito - CÓDIGO ORIGINAL"""
        efeito_map = {
            "cura_pequena": "+30 HP",
            "cura_grande": "+60 HP", 
            "buff_ofensivo": "-15 HP inimigo"
        }
        return efeito_map.get(efeito, "?")

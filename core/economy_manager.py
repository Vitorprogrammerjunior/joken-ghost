"""
Sistema de Economia e Recompensas - JokenGhost
Responsável por calcular dinheiro baseado na efetividade contra fantasmas
"""

from config.enums import Escolha
import random

class EconomyManager:
    """Gerencia o sistema de dinheiro e recompensas."""
    
    def __init__(self):
        """Inicializa o gerenciador de economia."""
        # Tabela de efetividade contra fantasmas
        self.efetividade_fantasmas = {
            Escolha.PEDRA: {
                'nome': 'Pedra',
                'efetividade': 0.7,  # 70% efetivo contra fantasmas
                'bonus_base': 15,
                'descricao': 'Moderadamente efetivo'
            },
            Escolha.PAPEL: {
                'nome': 'Papel',
                'efetividade': 1.0,  # 100% efetivo contra fantasmas
                'bonus_base': 25,
                'descricao': 'Muito efetivo'
            },
            Escolha.TESOURA: {
                'nome': 'Tesoura',
                'efetividade': 0.5,  # 50% efetivo contra fantasmas
                'bonus_base': 10,
                'descricao': 'Pouco efetivo'
            }
        }
        
    def calcular_recompensa_vitoria(self, escolha_jogador, inimigo_tipo='fantasma', dano_causado=25):
        """
        Calcula a recompensa em dinheiro por vitória.
        
        Args:
            escolha_jogador: Escolha do jogador (Pedra/Papel/Tesoura)
            inimigo_tipo: Tipo do inimigo ('fantasma', 'castelo', etc.)
            dano_causado: Dano real causado
            
        Returns:
            dict: Informações sobre a recompensa
        """
        if inimigo_tipo == 'fantasma':
            efetividade_data = self.efetividade_fantasmas[escolha_jogador]
            
            # Cálculo base
            recompensa_base = efetividade_data['bonus_base']
            
            # Multiplicador de efetividade
            multiplicador = efetividade_data['efetividade']
            
            # Bonus por dano alto
            bonus_dano = max(0, (dano_causado - 20) * 0.5)
            
            # Variação aleatória pequena (±10%)
            variacao = random.uniform(0.9, 1.1)
            
            # Cálculo final
            recompensa_final = int((recompensa_base + bonus_dano) * multiplicador * variacao)
            
            return {
                'recompensa': recompensa_final,
                'efetividade': efetividade_data['efetividade'],
                'descricao': efetividade_data['descricao'],
                'escolha_nome': efetividade_data['nome'],
                'detalhes': {
                    'base': recompensa_base,
                    'multiplicador': multiplicador,
                    'bonus_dano': bonus_dano,
                    'variacao': variacao
                }
            }
        else:
            # Para outros tipos de inimigos (implementar futuramente)
            return {
                'recompensa': 15,
                'efetividade': 1.0,
                'descricao': 'Efetividade padrão',
                'escolha_nome': 'Ataque',
                'detalhes': {}
            }
            
    def calcular_recompensa_area_effect(self, escolha_jogador, inimigos_afetados):
        """
        Calcula recompensa adicional por dano em área.
        
        Args:
            escolha_jogador: Escolha do jogador
            inimigos_afetados: Lista de inimigos atingidos por área
            
        Returns:
            int: Bonus em dinheiro
        """
        if not inimigos_afetados:
            return 0
            
        # Bonus base por inimigo atingido em área
        bonus_por_inimigo = 5
        
        # Multiplicador baseado na efetividade
        efetividade = self.efetividade_fantasmas[escolha_jogador]['efetividade']
        
        bonus_total = len(inimigos_afetados) * bonus_por_inimigo * efetividade
        
        return int(bonus_total)
        
    def obter_texto_efetividade(self, escolha_jogador):
        """
        Retorna texto explicativo sobre efetividade.
        
        Args:
            escolha_jogador: Escolha do jogador
            
        Returns:
            str: Texto explicativo
        """
        data = self.efetividade_fantasmas[escolha_jogador]
        efetividade_pct = int(data['efetividade'] * 100)
        
        return f"{data['nome']}: {efetividade_pct}% efetivo vs Fantasmas"
        
    def obter_preview_recompensa(self, escolha_jogador):
        """
        Mostra prévia da recompensa potencial.
        
        Args:
            escolha_jogador: Escolha do jogador
            
        Returns:
            str: Texto de prévia
        """
        data = self.efetividade_fantasmas[escolha_jogador]
        recompensa_estimada = data['bonus_base']
        
        return f"Recompensa estimada: ${recompensa_estimada} ({data['descricao']})"

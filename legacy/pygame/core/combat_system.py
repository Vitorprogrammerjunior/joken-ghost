"""
Sistema de Combate RPG - JokenGhost
Gerencia a lógica de combate com seleção de alvos e dano em área
"""

import random
from enum import Enum
from config.constants import *
from config.enums import Escolha

class TipoCombate(Enum):
    SINGLE_TARGET = "single"  # Ataque direto ao alvo
    AREA_EFFECT = "area"      # Pode afetar múltiplos inimigos
    
class ResultadoCombate(Enum):
    VITORIA = "vitoria"
    DERROTA = "derrota" 
    EMPATE = "empate"

class CombatSystem:
    """Sistema de combate com seleção de alvos e efeitos em área."""
    
    def __init__(self):
        self.alvo_selecionado = None
        self.resultado_ultimo_ataque = None
        self.dano_causado = 0
        self.inimigos_afetados = []
        
    def selecionar_alvo(self, inimigos, indice_alvo):
        """
        Seleciona um inimigo específico como alvo principal.
        
        Args:
            inimigos: Lista de inimigos disponíveis
            indice_alvo: Índice do inimigo a ser selecionado
            
        Returns:
            bool: True se seleção foi bem-sucedida
        """
        if not inimigos or indice_alvo < 0 or indice_alvo >= len(inimigos):
            return False
            
        inimigos_vivos = [i for i, inimigo in enumerate(inimigos) 
                         if inimigo['ativo'] and inimigo['vida_atual'] > 0]
        
        if indice_alvo not in inimigos_vivos:
            return False
            
        self.alvo_selecionado = indice_alvo
        return True
    
    def calcular_dano_base(self, escolha_jogador, escolha_inimigo):
        """
        Calcula dano base do jogo original.
        
        Returns:
            tuple: (resultado_combate, dano)
        """
        if escolha_jogador == escolha_inimigo:
            return ResultadoCombate.EMPATE, 0
        elif ((escolha_jogador == Escolha.PEDRA and escolha_inimigo == Escolha.TESOURA) or
              (escolha_jogador == Escolha.PAPEL and escolha_inimigo == Escolha.PEDRA) or
              (escolha_jogador == Escolha.TESOURA and escolha_inimigo == Escolha.PAPEL)):
            return ResultadoCombate.VITORIA, 25
        else:
            return ResultadoCombate.DERROTA, 20  # Jogador toma dano
    
    def calcular_chance_area_effect(self, poder_ataque):
        """
        Calcula a chance de outros inimigos serem afetados.
        
        Args:
            poder_ataque: Força do ataque (0-100)
            
        Returns:
            float: Chance de afetar outros inimigos (0.0 - 1.0)
        """
        # Quanto mais forte o ataque, maior a chance de afetar outros
        base_chance = 0.3  # 30% chance base
        bonus_chance = (poder_ataque / 100) * 0.4  # Até 40% extra
        return min(base_chance + bonus_chance, 0.7)  # Máximo 70%
    
    def aplicar_dano_principal(self, inimigo_alvo, dano):
        """
        Aplica dano ao inimigo selecionado.
        
        Args:
            inimigo_alvo: Dicionário do inimigo alvo
            dano: Quantidade de dano a aplicar
            
        Returns:
            dict: Informações sobre o dano aplicado
        """
        vida_antes = inimigo_alvo['vida_atual']
        inimigo_alvo['vida_atual'] = max(0, vida_antes - dano)
        vida_depois = inimigo_alvo['vida_atual']
        
        return {
            'nome': inimigo_alvo['nome'],
            'vida_antes': vida_antes,
            'vida_depois': vida_depois,
            'dano_real': vida_antes - vida_depois,
            'morreu': vida_depois <= 0,
            'inimigo_ref': inimigo_alvo  # NOVO: Referência ao dicionário do inimigo
        }
    
    def calcular_dano_secundario(self, dano_principal):
        """
        Calcula dano para inimigos secundários (reduzido).
        
        Args:
            dano_principal: Dano aplicado ao alvo principal
            
        Returns:
            int: Dano para inimigos secundários
        """
        # Dano secundário é 30-60% do dano principal
        multiplicador = random.uniform(0.3, 0.6)
        return max(1, int(dano_principal * multiplicador))
    
    def processar_combate_completo(self, inimigos, escolha_jogador):
        """
        Processa um turno completo de combate.
        
        Args:
            inimigos: Lista de todos os inimigos
            escolha_jogador: Escolha do jogador (Pedra/Papel/Tesoura)
            
        Returns:
            dict: Resultado completo do combate
        """
        if self.alvo_selecionado is None:
            return {"erro": "Nenhum alvo selecionado"}
        
        alvo_principal = inimigos[self.alvo_selecionado]
        
        # Gera escolha do inimigo alvo
        escolha_inimigo = random.choice([Escolha.PEDRA, Escolha.PAPEL, Escolha.TESOURA])
        
        # Calcula resultado do combate
        resultado, dano_base = self.calcular_dano_base(escolha_jogador, escolha_inimigo)
        
        resultados = {
            'resultado_principal': resultado,
            'escolha_inimigo': escolha_inimigo,  # NOVO: Incluir escolha do inimigo
            'alvo_principal': None,
            'inimigos_secundarios': [],
            'dano_ao_jogador': 0
        }
        
        if resultado == ResultadoCombate.VITORIA:
            # Aplica dano ao alvo principal
            info_dano = self.aplicar_dano_principal(alvo_principal, dano_base)
            resultados['alvo_principal'] = info_dano
            
            # Calcula chance de afetar outros inimigos
            chance_area = self.calcular_chance_area_effect(dano_base)
            dano_secundario = self.calcular_dano_secundario(dano_base)
            
            # Processa outros inimigos
            for i, inimigo in enumerate(inimigos):
                if (i != self.alvo_selecionado and 
                    inimigo['ativo'] and 
                    inimigo['vida_atual'] > 0):
                    
                    if random.random() < chance_area:
                        info_secundario = self.aplicar_dano_principal(inimigo, dano_secundario)
                        resultados['inimigos_secundarios'].append(info_secundario)
                        
        elif resultado == ResultadoCombate.DERROTA:
            resultados['dano_ao_jogador'] = dano_base
        
        # Reset seleção para próximo turno
        self.alvo_selecionado = None
        
        return resultados
    
    def obter_inimigos_vivos(self, inimigos):
        """
        Retorna lista de inimigos que ainda estão vivos.
        
        Args:
            inimigos: Lista de todos os inimigos
            
        Returns:
            list: Lista de índices dos inimigos vivos
        """
        return [i for i, inimigo in enumerate(inimigos) 
                if inimigo['ativo'] and inimigo['vida_atual'] > 0]
    
    def tem_alvo_selecionado(self):
        """Verifica se há um alvo selecionado."""
        return self.alvo_selecionado is not None
    
    def limpar_selecao(self):
        """Limpa a seleção atual."""
        self.alvo_selecionado = None

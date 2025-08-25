#!/usr/bin/env python3
"""
Teste das Funcionalidades do JokenGhost
=======================================

Este script testa programaticamente as principais funcionalidades
implementadas no sistema de combate inspirado em Pokémon.
"""

import sys
import os

# Adiciona o diretório do jogo ao path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from jokenghost import JokenGhost, Escolha

def test_recompensas():
    """Testa o sistema de recompensas baseado em tipo"""
    print("🧪 Testando Sistema de Recompensas...")
    
    jogo = JokenGhost()
    
    # Testa recompensas por tipo
    recompensa_pedra = jogo.calcular_recompensa(Escolha.PEDRA, True)
    recompensa_papel = jogo.calcular_recompensa(Escolha.PAPEL, True)
    recompensa_tesoura = jogo.calcular_recompensa(Escolha.TESOURA, True)
    
    print(f"  💎 Pedra vs Ghost: {recompensa_pedra} moedas")
    print(f"  📄 Papel vs Ghost: {recompensa_papel} moedas")
    print(f"  ✂️ Tesoura vs Ghost: {recompensa_tesoura} moedas")
    
    # Verifica se PEDRA tem a maior recompensa (60)
    assert recompensa_pedra == 60, f"Pedra deveria dar 60 moedas, mas deu {recompensa_pedra}"
    assert recompensa_pedra > recompensa_papel, "Pedra deveria dar mais que Papel"
    assert recompensa_pedra > recompensa_tesoura, "Pedra deveria dar mais que Tesoura"
    
    print("  ✅ Sistema de recompensas funcionando corretamente!")

def test_loja():
    """Testa o sistema de loja"""
    print("\n🏪 Testando Sistema de Loja...")
    
    jogo = JokenGhost()
    jogo.dinheiro_jogador = 100  # Dá dinheiro inicial
    jogo.vida_jogador = 50  # Reduz vida para testar cura
    jogo.vida_inimigo = 80  # Reduz vida do inimigo para testar buff
    
    # Testa poção pequena
    item_pocao = {"nome": "Poção de Cura", "preco": 30, "efeito": "cura_pequena"}
    vida_antes = jogo.vida_jogador
    dinheiro_antes = jogo.dinheiro_jogador
    
    jogo.comprar_item(item_pocao)
    
    print(f"  🧪 Poção Pequena: {vida_antes} → {jogo.vida_jogador} HP")
    print(f"  💰 Dinheiro: ${dinheiro_antes} → ${jogo.dinheiro_jogador}")
    
    assert jogo.vida_jogador > vida_antes, "Poção deveria curar o jogador"
    assert jogo.dinheiro_jogador < dinheiro_antes, "Dinheiro deveria diminuir"
    
    # Testa buff ofensivo
    vida_inimigo_antes = jogo.vida_inimigo
    item_buff = {"nome": "Buff Ofensivo", "preco": 50, "efeito": "buff_ofensivo"}
    
    jogo.comprar_item(item_buff)
    
    print(f"  ⚔️ Buff Ofensivo: Inimigo {vida_inimigo_antes} → {jogo.vida_inimigo} HP")
    
    assert jogo.vida_inimigo < vida_inimigo_antes, "Buff deveria danificar o inimigo"
    
    print("  ✅ Sistema de loja funcionando corretamente!")

def test_animacoes():
    """Testa as configurações de animação"""
    print("\n🎬 Testando Sistema de Animações...")
    
    jogo = JokenGhost()
    
    # Testa animação de entrada
    jogo.iniciar_animacao_entrada()
    
    print(f"  🎭 Animação ativa: {jogo.animacao_entrada_ativa}")
    print(f"  👤 Posição inicial jogador: {jogo.jogador_pos_x}")
    print(f"  👻 Posição inicial inimigo: {jogo.inimigo_pos_x}")
    
    assert jogo.animacao_entrada_ativa == True, "Animação deveria estar ativa"
    assert jogo.jogador_pos_x == -200, "Jogador deveria começar fora da tela (esquerda)"
    assert jogo.inimigo_pos_x == 1000, "Inimigo deveria começar fora da tela (direita)"
    
    print("  ✅ Sistema de animações configurado corretamente!")

def test_carregamento_assets():
    """Testa o carregamento de assets"""
    print("\n📁 Testando Carregamento de Assets...")
    
    jogo = JokenGhost()
    
    # Verifica se o fundo foi carregado
    if jogo.fundo_batalha:
        print(f"  🌲 Fundo de batalha carregado: {jogo.fundo_batalha.get_size()}")
    else:
        print("  ⚠️ Fundo de batalha não encontrado (usando fallback)")
    
    # Verifica sprites
    if hasattr(jogo, 'sprites_jogador'):
        print(f"  👤 Sprites do jogador carregados: {list(jogo.sprites_jogador.keys())}")
    else:
        print("  ⚠️ Sprites do jogador não encontrados")
    
    if hasattr(jogo, 'sprites_inimigo'):
        print(f"  👻 Sprites do inimigo carregados: {list(jogo.sprites_inimigo.keys())}")
    else:
        print("  ⚠️ Sprites do inimigo não encontrados")
    
    print("  ✅ Carregamento de assets verificado!")

def main():
    """Executa todos os testes"""
    print("🎮 JokenGhost - Teste de Funcionalidades")
    print("=" * 50)
    
    try:
        test_recompensas()
        test_loja()
        test_animacoes()
        test_carregamento_assets()
        
        print("\n" + "=" * 50)
        print("🎉 Todos os testes passaram com sucesso!")
        print("🎯 O sistema de combate inspirado em Pokémon está funcionando perfeitamente!")
        
    except Exception as e:
        print(f"\n❌ Erro durante os testes: {e}")
        return False
    
    return True

if __name__ == "__main__":
    sucesso = main()
    input("\nPressione Enter para sair...")
    sys.exit(0 if sucesso else 1)

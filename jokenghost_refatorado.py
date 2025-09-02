"""
Classe principal do jogo JokenGhost refatorada.
Integra todos os sistemas modulares criados.
"""

import pygame
import sys
import random
import time

# Importações dos módulos
from config.constants import *
from config.enums import *
from core.resource_manager import ResourceManager
from core.enemy_manager import EnemyManager
from ui.ui_manager import UIManager
from ui.menu_renderer import MenuRenderer
from ui.toast_system import ToastManager, NotificationSystem
from graphics.sprite_manager import SpriteManager, AnimationController
from game.loja_manager import LojaManager
from game.monstruario_manager import MonstruarioManager

class JokenGhostGame:
    """Classe principal do jogo JokenGhost."""
    
    def __init__(self):
        """Inicializa o jogo e todos os sistemas."""
        print("🎮 Inicializando JokenGhost...")
        
        # Inicialização do Pygame
        pygame.init()
        pygame.mixer.init()
        
        # Configuração da tela
        self.tela = pygame.display.set_mode((LARGURA, ALTURA))
        pygame.display.set_caption("JokenGhost - Caçada em Turnos")
        self.clock = pygame.time.Clock()
        
        # Estado do jogo
        self.estado_jogo = EstadoJogo.MENU_PRINCIPAL
        self.rodando = True
        
        # Sistemas principais
        self.resource_manager = ResourceManager()
        self.enemy_manager = EnemyManager()
        self.ui_manager = UIManager(self.resource_manager)
        self.menu_renderer = MenuRenderer(self.resource_manager)
        self.sprite_manager = SpriteManager(self.resource_manager)
        self.animation_controller = AnimationController()
        
        # Sistemas de notificação
        self.toast_manager = ToastManager(self.resource_manager)
        self.notification_system = NotificationSystem(self.toast_manager)
        
        # Sistemas de jogo
        self.loja_manager = LojaManager(self.resource_manager)
        self.monstruario_manager = MonstruarioManager(self.resource_manager)
        
        # Carregar recursos
        self.carregar_recursos()
        
        # Estado do jogador
        self.inicializar_jogador()
        
        # Estado do jogo
        self.inicializar_estado_jogo()
        
        print("✅ JokenGhost inicializado com sucesso!")
        
    def carregar_recursos(self):
        """Carrega todos os recursos do jogo."""
        print("📦 Carregando recursos...")
        
        # Carregar todos os recursos através do método principal
        self.resource_manager.carregar_todos_recursos()
        
        print("✅ Recursos carregados!")
        
    def inicializar_jogador(self):
        """Inicializa o estado do jogador."""
        self.stats_jogador = {
            'vida_atual': VIDA_INICIAL_JOGADOR,
            'vida_maxima': VIDA_INICIAL_JOGADOR,
            'dano': DANO_JOGADOR,
            'defesa': 0,
            'multiplicador_recompensa': 1.0
        }
        self.dinheiro = 100
        self.pontos = 0
        self.inimigos_derrotados = 0
        
    def inicializar_estado_jogo(self):
        """Inicializa o estado específico do jogo."""
        # Controle de batalha
        self.escolha_jogador = None
        self.escolha_inimigo = None
        self.resultado_combate = ""
        self.cor_resultado = BRANCO
        
        # Animações e timers
        self.tempo_resultado = 0
        self.fade_alpha = 0
        self.transicao_alpha = 0
        self.tempo_transicao = 0
        
        # Estados específicos
        self.esperando_rotacao = False
        self.tempo_espera_rotacao = 0
        self.introducao_ativa = True
        self.texto_introducao_index = 0
        
        # Sistema de múltiplos inimigos (idêntico ao original)
        self.inimigos = []
        self.inimigo_atual_index = 0  # Para sistema de rotação
        self.aguardando_proximo_inimigo = False
        self.tempo_espera_inimigo = 0
        self.duracao_espera = 800  # 0.8 segundos para rotação (mais rápido)
        
        # Animação de rotação
        self.animacao_rotacao_ativa = False
        self.progresso_rotacao = 0.0  # Para interpolação suave das posições
        
        # Textos da introdução
        self.textos_intro = [
            "Em uma pequena cidade assombrada,",
            "você é um caçador de fantasmas novato.",
            "",
            "Armado apenas com conhecimento sobre",
            "PEDRA, PAPEL e TESOURA,",
            "você deve enfrentar os espíritos",
            "que atormentam a região.",
            "",
            "Cada fantasma tem suas fraquezas...",
            "Descubra-as e torne-se um mestre caçador!",
            "",
            "Boa sorte, jovem caçador!"
        ]
        
        # Gerar múltiplos inimigos como no original
        self.gerar_inimigos_aleatorios()
        
        # Sprites do sistema original
        self.sprites_jogador = None
        self.sprites_inimigo = None
        self.frame_atual_jogador = 0
        self.frame_atual_inimigo = 0
        self.carregar_sprites_sistema_original()
        
    def gerar_inimigos_aleatorios(self):
        """Gera de 1 a 3 inimigos aleatoriamente (idêntico ao original)."""
        sprites_inimigo = self.resource_manager.obter_sprite_fantasma()
        num_inimigos = self.enemy_manager.gerar_inimigos_aleatorios(sprites_inimigo)
        self.inimigos = self.enemy_manager.inimigos
        self.inimigo_atual_index = self.enemy_manager.inimigo_atual_index
        print(f"🎲 Spawned {num_inimigos} inimigo(s) no modo múltiplos inimigos!")
        
    def obter_inimigo_atual(self):
        """Retorna o inimigo atual da lista de inimigos."""
        if not self.inimigos or self.inimigo_atual_index >= len(self.inimigos):
            return None
        return self.inimigos[self.inimigo_atual_index]
        
    def processar_eventos(self):
        """Processa todos os eventos do jogo."""
        for evento in pygame.event.get():
            if evento.type == pygame.QUIT:
                self.rodando = False
                
            elif evento.type == pygame.KEYDOWN:
                self.processar_tecla(evento.key)
                
            elif evento.type == pygame.MOUSEBUTTONDOWN:
                if evento.button == 1:  # Clique esquerdo
                    self.processar_clique(evento.pos)
                    
    def processar_tecla(self, tecla):
        """Processa entrada de teclado."""
        if self.estado_jogo == EstadoJogo.INTRODUCAO:
            if tecla == pygame.K_SPACE:
                self.estado_jogo = EstadoJogo.TRANSICAO
                self.tempo_transicao = 0
                self.transicao_alpha = 0
                
        elif self.estado_jogo == EstadoJogo.JOGANDO:
            # Teclas de atalho para ataques
            if tecla == pygame.K_1:
                self.processar_escolha_ataque(Escolha.PEDRA)
            elif tecla == pygame.K_2:
                self.processar_escolha_ataque(Escolha.PAPEL)
            elif tecla == pygame.K_3:
                self.processar_escolha_ataque(Escolha.TESOURA)
                
    def processar_clique(self, pos):
        """Processa cliques do mouse."""
        if self.estado_jogo == EstadoJogo.MENU_PRINCIPAL:
            self.processar_clique_menu_principal(pos)
            
        elif self.estado_jogo == EstadoJogo.JOGANDO:
            self.processar_clique_jogo(pos)
            
        elif self.estado_jogo == EstadoJogo.GAME_OVER or self.estado_jogo == EstadoJogo.VITORIA:
            botao_clicado = self.ui_manager.verificar_clique_botao(pos)
            if botao_clicado == 'reiniciar':
                self.reiniciar_jogo()
                
    def processar_clique_menu_principal(self, pos):
        """Processa cliques no menu principal."""
        botao_clicado = self.ui_manager.verificar_clique_botao(pos)
        if botao_clicado == 'jogar':
            self.estado_jogo = EstadoJogo.INTRODUCAO
            
    def processar_clique_jogo(self, pos):
        """Processa cliques durante o jogo."""
        # Verifica se há menu aberto
        if self.ui_manager.menu_selecao_ativo:
            self.processar_clique_menu_aberto(pos)
        else:
            self.processar_clique_botoes_principais(pos)
            
    def processar_clique_menu_aberto(self, pos):
        """Processa cliques quando há um menu aberto."""
        if self.ui_manager.tipo_menu_atual == TipoMenu.ATAQUES:
            botao_clicado = self.ui_manager.verificar_clique_botao(pos)
            if botao_clicado in ['pedra', 'papel', 'tesoura']:
                escolha_map = {
                    'pedra': Escolha.PEDRA,
                    'papel': Escolha.PAPEL,
                    'tesoura': Escolha.TESOURA
                }
                self.processar_escolha_ataque(escolha_map[botao_clicado])
                
        elif self.ui_manager.tipo_menu_atual == TipoMenu.LOJA:
            item_clicado = self.loja_manager.verificar_clique_item(pos)
            if item_clicado:
                self.processar_compra_item(item_clicado)
                
        elif self.ui_manager.tipo_menu_atual == TipoMenu.MONSTRUARIO:
            # Controles de página do monstruário
            # Implementar se necessário
            pass
            
    def processar_clique_botoes_principais(self, pos):
        """Processa cliques nos botões principais."""
        botao_clicado = self.ui_manager.verificar_clique_botao(pos)
        
        if botao_clicado == 'ataques':
            self.abrir_menu_ataques()
        elif botao_clicado == 'loja_menu':
            self.abrir_menu_loja()
        elif botao_clicado == 'status':
            self.abrir_menu_monstruario()
            
    def abrir_menu_ataques(self):
        """Abre o menu de ataques."""
        if not self.esperando_rotacao:
            self.ui_manager.abrir_menu_selecao(TipoMenu.ATAQUES)
            
    def abrir_menu_loja(self):
        """Abre o menu da loja."""
        self.ui_manager.abrir_menu_selecao(TipoMenu.LOJA)
        
    def abrir_menu_monstruario(self):
        """Abre o menu do monstruário."""
        self.ui_manager.abrir_menu_selecao(TipoMenu.MONSTRUARIO)
        
    def processar_escolha_ataque(self, escolha):
        """Processa a escolha de ataque do jogador."""
        if self.esperando_rotacao:
            return
            
        self.escolha_jogador = escolha
        self.ui_manager.fechar_menu_selecao()
        
        # Gerar escolha do inimigo
        self.escolha_inimigo = random.choice([Escolha.PEDRA, Escolha.PAPEL, Escolha.TESOURA])
        
        # Iniciar animações de ataque
        self.sprite_manager.iniciar_ataque_jogador()
        self.sprite_manager.iniciar_ataque_inimigo()
        
        # Calcular resultado
        self.calcular_resultado_combate()
        
        # Iniciar espera para próxima rodada
        self.iniciar_espera_rotacao()
        
    def processar_compra_item(self, item):
        """Processa a compra de um item da loja."""
        sucesso, preco = self.loja_manager.comprar_item(item, self.dinheiro)
        
        if sucesso:
            self.dinheiro -= preco
            self.loja_manager.aplicar_buff_item(item, self.stats_jogador)
            self.notification_system.notificar_compra(item.nome, preco)
        else:
            self.notification_system.notificar_dinheiro_insuficiente()
            
    def calcular_resultado_combate(self):
        """Calcula o resultado do combate."""
        # Determina vencedor
        if self.escolha_jogador == self.escolha_inimigo:
            self.resultado_combate = "EMPATE!"
            self.cor_resultado = AMARELO
        elif ((self.escolha_jogador == Escolha.PEDRA and self.escolha_inimigo == Escolha.TESOURA) or
              (self.escolha_jogador == Escolha.PAPEL and self.escolha_inimigo == Escolha.PEDRA) or
              (self.escolha_jogador == Escolha.TESOURA and self.escolha_inimigo == Escolha.PAPEL)):
            self.processar_vitoria_jogador()
        else:
            self.processar_derrota_jogador()
            
        # Iniciar fade do resultado
        self.animation_controller.criar_animacao_fade('resultado', 2.0, 255, 0)
        
    def processar_vitoria_jogador(self):
        """Processa vitória do jogador."""
        self.resultado_combate = "VITÓRIA!"
        self.cor_resultado = VERDE
        
        inimigo_atual = self.obter_inimigo_atual()
        if not inimigo_atual:
            return
        
        # Aplicar dano fixo ao inimigo (idêntico ao original)
        dano = DANO_JOGADOR  # 25 de dano fixo
        inimigo_atual['vida_atual'] -= dano
        
        # Sistema de recompensa por acerto (idêntico ao original)
        if self.escolha_jogador == Escolha.PEDRA:
            recompensa_acerto = RECOMPENSA_PEDRA  # 25 - Aspirador é efetivo contra fantasmas
        else:
            recompensa_acerto = RECOMPENSA_PADRAO  # 15 - Recompensa padrão para outras armas
        
        self.dinheiro += recompensa_acerto
        print(f"💰 Acertou! +{recompensa_acerto} moedas. Total: ${self.dinheiro}")
        
        # Efeito visual
        self.sprite_manager.iniciar_shake(15, 0.5)
        
        # Verificar se inimigo morreu
        if inimigo_atual['vida_atual'] <= 0:
            self.processar_morte_inimigo()
        else:
            print(f"👹 Inimigo recebeu {dano} de dano! Vida: {inimigo_atual['vida_atual']}")
            
    def processar_derrota_jogador(self):
        """Processa derrota do jogador."""
        self.resultado_combate = "DERROTA!"
        self.cor_resultado = VERMELHO
        
        # Aplicar dano fixo ao jogador (idêntico ao original)
        dano = DANO_INIMIGO  # 20 de dano fixo
        self.stats_jogador['vida_atual'] -= dano
        
        # Efeito visual
        self.sprite_manager.iniciar_shake(10, 0.3)
        
        print(f"💔 Jogador recebeu {dano} de dano! Vida: {self.stats_jogador['vida_atual']}")
        
        # Verificar game over
        if self.stats_jogador['vida_atual'] <= 0:
            self.estado_jogo = EstadoJogo.GAME_OVER
            self.notification_system.notificar_derrota()
            
    def processar_morte_inimigo(self):
        """Processa a morte de um inimigo."""
        inimigo_atual = self.obter_inimigo_atual()
        if not inimigo_atual:
            return
            
        # Registrar vitória no monstruário
        self.monstruario_manager.registrar_vitoria(inimigo_atual['nome'])
        
        # Sistema de recompensa idêntico ao original
        if self.escolha_jogador == Escolha.PEDRA:
            recompensa_acerto = RECOMPENSA_PEDRA  # 25 - Aspirador é efetivo contra fantasmas
        else:
            recompensa_acerto = RECOMPENSA_PADRAO  # 15 - Recompensa padrão para outras armas
        
        # Dar recompensa (sem multiplicadores para manter idêntico ao original)
        self.dinheiro += recompensa_acerto
        self.pontos += recompensa_acerto
        self.inimigos_derrotados += 1
        
        # Marcar inimigo como inativo
        inimigo_atual['ativo'] = False
        inimigo_atual['vida_atual'] = 0
        
        # Verificar se há inimigos restantes
        inimigos_restantes = [i for i in self.inimigos if i['ativo'] and i['vida_atual'] > 0]
        if len(inimigos_restantes) > 0:
            # Define o primeiro inimigo restante como atual
            self.inimigo_atual_index = self.inimigos.index(inimigos_restantes[0])
            print(f"👁️ Novo inimigo da frente: {inimigos_restantes[0]['nome']}")
        else:
            # Todos inimigos derrotados - vitória total
            recompensa_vitoria = len(self.inimigos) * RECOMPENSA_VITORIA_BASE
            self.dinheiro += recompensa_vitoria
            print(f"🏆 Vitória total! +{recompensa_vitoria} moedas de bônus!")
            self.gerar_inimigos_aleatorios()  # Gerar nova batalha
        
        # Notificações
        self.notification_system.notificar_vitoria()
        self.notification_system.notificar_recompensa(recompensa_acerto)
        
        print(f"💰 Inimigo derrotado! Recompensa: ${recompensa_acerto}")
        
    def extrair_sprite(self, sprite_data, frame_index):
        """Extrai um frame específico do sprite sheet (IDÊNTICO AO ORIGINAL)"""
        if not sprite_data:
            return None
            
        sprite_sheet = sprite_data['sheet']
        frame_width = sprite_data['frame_width']
        frame_height = sprite_data['frame_height']
        total_frames = sprite_data['total_frames']
        
        # Garante que o frame_index está dentro dos limites
        frame_index = frame_index % total_frames
        
        # Calcula a posição do frame
        sheet_width = sprite_sheet.get_width()
        sheet_height = sprite_sheet.get_height()
        
        if sheet_width > sheet_height:
            # Sprite sheet horizontal
            x = frame_index * frame_width
            y = 0
        else:
            # Sprite sheet vertical ou único
            x = 0
            y = frame_index * frame_height
        
        # Cria uma nova superfície para o frame
        frame_surface = pygame.Surface((frame_width, frame_height), pygame.SRCALPHA)
        frame_surface.blit(sprite_sheet, (0, 0), (x, y, frame_width, frame_height))
        
        return frame_surface
        
    def desenhar_personagem(self, x, y, largura, altura, cor, nome, sprites_personagem=None, animacao="idle", frame=0, espelhar=False, shake_data=None):
        """Desenha um personagem com sprites (IDÊNTICO AO ORIGINAL)"""
        # === NOVO === Aplica shake effect se ativo
        final_x = x
        final_y = y
        if shake_data and shake_data['ativo']:
            final_x += shake_data['offset_x']
            final_y += shake_data['offset_y']
        
        if sprites_personagem and animacao in sprites_personagem:
            # Usa a animação específica
            sprite_data = sprites_personagem[animacao]
            sprite_frame = self.extrair_sprite(sprite_data, frame)
            
            if sprite_frame:
                # Escala o sprite para o tamanho desejado
                sprite_escalado = pygame.transform.scale(sprite_frame, (largura, altura))
                
                # Espelha o sprite se necessário
                if espelhar:
                    sprite_escalado = pygame.transform.flip(sprite_escalado, True, False)
                
                self.tela.blit(sprite_escalado, (final_x, final_y))
            else:
                # Fallback para bloco se der erro
                pygame.draw.rect(self.tela, cor, (final_x, final_y, largura, altura))
                pygame.draw.rect(self.tela, PRETO, (final_x, final_y, largura, altura), 3)
        else:
            # Desenha o personagem (bloco por enquanto)
            pygame.draw.rect(self.tela, cor, (final_x, final_y, largura, altura))
            pygame.draw.rect(self.tela, PRETO, (final_x, final_y, largura, altura), 3)
        
        # Nome do personagem (se fornecido)
        if nome:
            texto_nome = self.fonte_texto.render(nome, True, PRETO)
            nome_rect = texto_nome.get_rect(center=(final_x + largura//2, final_y + altura + 20))
            self.tela.blit(texto_nome, nome_rect)
        
        # === NOVO === Retorna as coordenadas finais para posicionamento da barra de vida
        return (final_x, final_y, largura, altura)
        
    def carregar_sprites_sistema_original(self):
        """Carrega os sprites usando o sistema do ResourceManager para ser compatível com o original"""
        # Por enquanto usamos os sprites disponíveis - depois vamos implementar o sistema completo
        # Este é um placeholder para o sistema ser funcional
        if hasattr(self.resource_manager, 'sprites_jogador'):
            self.sprites_jogador = self.resource_manager.sprites_jogador  
        else:
            self.sprites_jogador = None
        if hasattr(self.resource_manager, 'sprites_inimigo'):
            self.sprites_inimigo = self.resource_manager.sprites_inimigo
        else:
            self.sprites_inimigo = None
        
        # Atualizar sprites nos inimigos para usar o sistema original
        for inimigo in self.inimigos:
            inimigo['sprites'] = self.sprites_inimigo
            
        print("✅ Sprites carregados no sistema original!")
        
    def get_inimigo_na_frente(self):
        """Retorna o inimigo que está na frente (z_order = 3)"""
        for inimigo in self.inimigos:
            if inimigo['ativo'] and inimigo['vida_atual'] > 0 and inimigo['z_order'] == 3:
                return inimigo
        return None
        
    def desenhar_barra_vida_automatica(self, sprite_x, sprite_y, sprite_largura, sprite_altura, vida_atual, vida_maxima, nome, largura_barra=150, mostrar_numeros=True):
        """Desenha barra de vida acima do sprite automaticamente"""
        # Posição da barra (centralizada acima do sprite)
        barra_x = sprite_x + (sprite_largura - largura_barra) // 2
        barra_y = sprite_y - 25  # 25 pixels acima do sprite
        
        # Desenha a barra de vida
        self.desenhar_barra_vida_pokemon(barra_x, barra_y, vida_atual, vida_maxima, VERDE, nome, largura_barra, mostrar_numeros)
        
    def desenhar_barra_vida_pokemon(self, x, y, vida_atual, vida_maxima, cor, nome, largura=200, mostrar_numeros=True):
        """Desenha barra de vida estilo Pokémon"""
        altura_barra = 8
        borda_espessura = 2
        
        # Fundo da barra (cinza escuro)
        fundo_rect = pygame.Rect(x - borda_espessura, y - borda_espessura, 
                                largura + 2*borda_espessura, altura_barra + 2*borda_espessura)
        pygame.draw.rect(self.tela, PRETO, fundo_rect, border_radius=3)
        
        # Barra de fundo (cinza claro)
        barra_fundo = pygame.Rect(x, y, largura, altura_barra)
        pygame.draw.rect(self.tela, CINZA_CLARO, barra_fundo, border_radius=2)
        
        # Barra de vida (verde/amarelo/vermelho baseado na porcentagem)
        if vida_maxima > 0:
            vida_porcentagem = vida_atual / vida_maxima
            barra_largura = int(largura * vida_porcentagem)
            
            # Cor baseada na porcentagem de vida
            if vida_porcentagem > 0.6:
                cor_vida = VERDE
            elif vida_porcentagem > 0.3:
                cor_vida = AMARELO
            else:
                cor_vida = VERMELHO
                
            if barra_largura > 0:
                barra_vida = pygame.Rect(x, y, barra_largura, altura_barra)
                pygame.draw.rect(self.tela, cor_vida, barra_vida, border_radius=2)
        
        # Nome acima da barra
        if nome:
            nome_surface = self.resource_manager.obter_fonte('pequena').render(nome, True, BRANCO)
            nome_x = x + (largura - nome_surface.get_width()) // 2
            nome_y = y - 18
            self.tela.blit(nome_surface, (nome_x, nome_y))
        
        # Números de vida (opcional)
        if mostrar_numeros:
            vida_texto = f"{int(vida_atual)}/{int(vida_maxima)}"
            vida_surface = self.resource_manager.obter_fonte('pequena').render(vida_texto, True, BRANCO)
            vida_x = x + (largura - vida_surface.get_width()) // 2
            vida_y = y + altura_barra + 2
            self.tela.blit(vida_surface, (vida_x, vida_y))
        
    def iniciar_espera_rotacao(self):
        """Inicia período de espera para próxima ação."""
        self.esperando_rotacao = True
        self.tempo_espera_rotacao = 0
        self.ui_manager.esconder_botoes_ataque()
        
    def atualizar(self):
        """Atualiza o estado do jogo."""
        delta_time = self.clock.get_time()
        delta_time_seconds = delta_time / 1000.0
        
        # Atualizar sistemas
        self.sprite_manager.atualizar_animacoes(delta_time_seconds)
        self.animation_controller.atualizar_animacoes(delta_time_seconds)
        self.ui_manager.atualizar_animacao_menu()
        self.ui_manager.atualizar_animacao_botoes()
        self.toast_manager.atualizar_toasts(delta_time)
        
        # Atualizar estados específicos
        if self.estado_jogo == EstadoJogo.TRANSICAO:
            self.atualizar_transicao(delta_time)
        elif self.estado_jogo == EstadoJogo.JOGANDO:
            self.atualizar_jogo(delta_time)
            
    def atualizar_transicao(self, delta_time):
        """Atualiza a tela de transição."""
        self.tempo_transicao += delta_time
        
        # Fade in e out
        if self.tempo_transicao < 1500:
            self.transicao_alpha = min(255, (self.tempo_transicao / 1500) * 255)
        elif self.tempo_transicao < 3000:
            self.transicao_alpha = 255
        else:
            fade_progress = (self.tempo_transicao - 3000) / 1500
            self.transicao_alpha = max(0, 255 - (fade_progress * 255))
            
            if self.transicao_alpha <= 0:
                self.iniciar_jogo()
                
    def atualizar_jogo(self, delta_time):
        """Atualiza o estado do jogo principal."""
        # Atualizar espera de rotação
        if self.esperando_rotacao:
            self.tempo_espera_rotacao += delta_time
            if self.tempo_espera_rotacao >= DURACAO_ESPERA_ROTACAO:
                self.esperando_rotacao = False
                self.ui_manager.mostrar_botoes_ataque()
                
    def iniciar_jogo(self):
        """Inicia o jogo principal."""
        self.estado_jogo = EstadoJogo.JOGANDO
        # Verificar se já temos inimigos ou gerar novos
        if not self.inimigos:
            self.gerar_inimigos_aleatorios()
        
    def reiniciar_jogo(self):
        """Reinicia o jogo."""
        self.inicializar_jogador()
        self.inicializar_estado_jogo()
        self.loja_manager.resetar_loja()
        self.monstruario_manager.resetar_monstruario()
        self.toast_manager.limpar_toasts()
        self.animation_controller.parar_todas_animacoes()
        self.estado_jogo = EstadoJogo.MENU_PRINCIPAL
        print("🔄 Jogo reiniciado!")
        
    def renderizar(self):
        """Renderiza todos os elementos na tela."""
        # Aplicar shake se ativo
        shake_offset = self.sprite_manager.obter_offset_shake()
        
        if self.estado_jogo == EstadoJogo.MENU_PRINCIPAL:
            self.renderizar_menu_principal()
        elif self.estado_jogo == EstadoJogo.INTRODUCAO:
            self.renderizar_introducao()
        elif self.estado_jogo == EstadoJogo.TRANSICAO:
            self.renderizar_transicao()
        elif self.estado_jogo == EstadoJogo.JOGANDO:
            self.renderizar_jogo(shake_offset)
        elif self.estado_jogo == EstadoJogo.GAME_OVER:
            self.renderizar_game_over()
        elif self.estado_jogo == EstadoJogo.VITORIA:
            self.renderizar_vitoria()
            
        # Renderizar toasts sempre por último
        self.toast_manager.desenhar_toasts(self.tela)
        
        pygame.display.flip()
        
    def renderizar_menu_principal(self):
        """Renderiza o menu principal."""
        mouse_pos = pygame.mouse.get_pos()
        self.ui_manager.desenhar_menu_principal(self.tela)
        
    def renderizar_introducao(self):
        """Renderiza a tela de introdução."""
        self.ui_manager.desenhar_intro(self.tela, self.textos_intro)
        
    def renderizar_transicao(self):
        """Renderiza a tela de transição."""
        self.ui_manager.desenhar_transicao(self.tela, self.transicao_alpha)
        
    def renderizar_jogo(self, shake_offset):
        """Renderiza o jogo principal (IDÊNTICO AO ORIGINAL)."""
        mouse_pos = pygame.mouse.get_pos()
        
        # Fundo de Batalha da pasta Scenes
        fundo_batalha = self.resource_manager.obter_imagem('cenario')
        if fundo_batalha:
            self.tela.blit(fundo_batalha, (0, 0))
        else:
            # Fallback para fundo padrão
            self.tela.fill(VERDE)
            # Desenha o chão com perspectiva
            pygame.draw.rect(self.tela, (34, 139, 34), (0, ALTURA - 150, LARGURA, 150))
        
        # Posição do jogador (fixa como no original)
        jogador_pos_x = 80
        jogador_pos_y = ALTURA - 280
        
        # === NOVO === Personagem Jogador (idêntico ao original)
        animacao_jogador = "idle"  # Por enquanto sempre idle
        shake_jogador = {'ativo': False, 'offset_x': 0, 'offset_y': 0}  # Shake system placeholder
        
        coordenadas_jogador = self.desenhar_personagem(jogador_pos_x, jogador_pos_y, 120, 140, AZUL, "", 
                                                      sprites_personagem=self.sprites_jogador, animacao=animacao_jogador, 
                                                      frame=self.frame_atual_jogador, espelhar=False, shake_data=shake_jogador)
        
        # === NOVO === Todos os inimigos visíveis (ordenados por profundidade) - IDÊNTICO AO ORIGINAL
        inimigos_ativos = [inimigo for inimigo in self.inimigos if inimigo['ativo']]
        
        # Ordena por z_order (menor primeiro = mais atrás)
        inimigos_ativos.sort(key=lambda x: x['z_order'])
        
        coordenadas_inimigos = []
        for inimigo in inimigos_ativos:
            if inimigo['vida_atual'] > 0:  # Só desenha se estiver vivo
                animacao_inimigo = "idle"
                
                coordenadas_inimigo = self.desenhar_personagem(
                    inimigo['pos_x'], inimigo['pos_y'], inimigo['largura'], inimigo['altura'], 
                    VERMELHO, "", sprites_personagem=inimigo['sprites'], 
                    animacao=animacao_inimigo, frame=inimigo['frame_atual'], shake_data=inimigo['shake']
                )
                
                # Adiciona barra de vida automática
                if coordenadas_inimigo:
                    coordenadas_inimigos.append((inimigo, coordenadas_inimigo))
        
        # Desenha barras de vida para todos os inimigos visíveis
        for inimigo, coords in coordenadas_inimigos:
            sprite_x, sprite_y, sprite_largura, sprite_altura = coords
            
            # Tamanho da barra baseado no tamanho do inimigo
            largura_barra = max(80, int(sprite_largura * 0.8))
            
            # === NOVO === Apenas nome para inimigos (sem números de vida)
            self.desenhar_barra_vida_automatica(sprite_x, sprite_y, sprite_largura, sprite_altura, 
                                               inimigo['vida_visual'], inimigo['vida_max'], 
                                               inimigo['nome'], largura_barra, 
                                               mostrar_numeros=False)  # Novo parâmetro
        
        # === Barra de Vida do Jogador ===
        if coordenadas_jogador:
            sprite_x, sprite_y, sprite_largura, sprite_altura = coordenadas_jogador
            self.desenhar_barra_vida_automatica(sprite_x, sprite_y, sprite_largura, sprite_altura, 
                                               self.stats_jogador['vida_atual'], self.stats_jogador['vida_maxima'], "VOCÊ")
        
        # Texto de informação sobre inimigos ativos (idêntico ao original)
        inimigos_vivos = sum(1 for inimigo in self.inimigos if inimigo['ativo'] and inimigo['vida_atual'] > 0)
        inimigo_frente = self.get_inimigo_na_frente()
        inimigo_frente_nome = inimigo_frente['nome'] if inimigo_frente else "Nenhum"
        texto_info = self.resource_manager.obter_fonte('pequena').render(f"Inimigo da frente: {inimigo_frente_nome} | Total: {inimigos_vivos} | Pressione R para gerar novos", True, BRANCO)
        fundo_texto = pygame.Rect(10, ALTURA - 40, texto_info.get_width() + 10, 30)
        pygame.draw.rect(self.tela, MARROM_LOJA, fundo_texto, border_radius=5)
        pygame.draw.rect(self.tela, PRETO, fundo_texto, 2, border_radius=5)
        self.tela.blit(texto_info, (15, ALTURA - 35))
        
        # UI do jogo
        self.ui_manager.desenhar_ui_jogo(self.tela, self.stats_jogador, self.dinheiro, mouse_pos)
        
        # Resultado do combate
        if hasattr(self, 'resultado_combate') and self.resultado_combate:
            resultado_surface = self.resource_manager.obter_fonte('titulo').render(self.resultado_combate, True, getattr(self, 'cor_resultado', BRANCO))
            resultado_rect = resultado_surface.get_rect(center=(LARGURA//2, 100))
            self.tela.blit(resultado_surface, resultado_rect)
            
    def renderizar_game_over(self):
        """Renderiza a tela de game over."""
        mouse_pos = pygame.mouse.get_pos()
        self.menu_renderer.desenhar_game_over(self.tela, self.ui_manager, mouse_pos)
        
    def renderizar_vitoria(self):
        """Renderiza a tela de vitória."""
        mouse_pos = pygame.mouse.get_pos()
        self.menu_renderer.desenhar_vitoria(self.tela, self.ui_manager, mouse_pos, self.pontos, self.inimigos_derrotados)
        
    def executar(self):
        """Loop principal do jogo."""
        print("🚀 Iniciando loop principal do jogo...")
        
        while self.rodando:
            self.processar_eventos()
            self.atualizar()
            self.renderizar()
            self.clock.tick(FPS)
            
        # Cleanup
        pygame.quit()
        print("👋 JokenGhost encerrado!")


def main():
    """Função principal."""
    try:
        jogo = JokenGhostGame()
        jogo.executar()
    except Exception as e:
        print(f"❌ Erro fatal: {e}")
        import traceback
        traceback.print_exc()
        pygame.quit()
        sys.exit(1)


if __name__ == "__main__":
    main()

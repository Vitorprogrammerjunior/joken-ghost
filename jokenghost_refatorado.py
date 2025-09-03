"""
Classe principal do jogo JokenGhost refatorada.
Integra todos os sistemas modulares criados.
"""

import pygame
import sys
import random
import time
import math

# Importações dos módulos
from config.constants import *
from config.enums import *
from core.resource_manager import ResourceManager
from core.enemy_manager import EnemyManager
from core.combat_system import CombatSystem
from ui.ui_manager import UIManager
from ui.menu_renderer import MenuRenderer
from ui.toast_system import ToastManager, NotificationSystem
from ui.target_selector import TargetSelector
from ui.simple_damage_display import SimpleDamageDisplay
from ui.result_display import ResultDisplay
from ui.visual_effects import VisualEffectsManager, EnemyAttackAnimationManager
from ui.ui_animations import UIAnimationManager, AnimatedWidget
from core.economy_manager import EconomyManager
from graphics.sprite_manager import SpriteManager, AnimationController
from game.loja_manager import LojaManager
from ui.monstruario_original import MonstruarioOriginal
# REMOVIDO: from ui.texto_flutuante import SistemaTextoFlutuante

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
        self.estado_jogo = EstadoJogo.MENU
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
        self.monstruario_manager = MonstruarioOriginal(self.resource_manager)
        
        # === NOVOS SISTEMAS DE COMBATE RPG ===
        self.combat_system = CombatSystem()
        self.target_selector = TargetSelector()
        self.simple_damage = SimpleDamageDisplay(self.resource_manager)
        self.result_display = ResultDisplay()
        
        # === NOVOS SISTEMAS VISUAIS ===
        self.visual_effects = VisualEffectsManager()
        self.enemy_attack_animations = EnemyAttackAnimationManager()
        self.ui_animations = UIAnimationManager()
        self.economy_manager = EconomyManager()
        
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
        # Sistema de texto flutuante
        # REMOVIDO: sistema_texto_flutuante - usando SimpleDamageDisplay
        
        # === LIMPEZA PARA EVITAR NÚMEROS PERSISTENTES ===
        # Limpar todos os sistemas de dano
        self.simple_damage.limpar_todos()
        
        # Sistema de dinheiro (IDÊNTICO AO ORIGINAL)
        self.dinheiro = 0  # Começa sem dinheiro, ganha através de batalhas
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
        self.transicao_direcao = 1
        self.tempo_transicao = 0
        
        # Estados específicos
        self.esperando_rotacao = False
        self.tempo_espera_rotacao = 0
        self.introducao_ativa = True
        self.texto_introducao_index = 0
        self.mostrar_monstruario = False  # Controla se o monstruário está visível
        
        # Sistema de múltiplos inimigos (idêntico ao original)
        self.inimigos = []
        self.inimigo_atual_index = 0  # Para sistema de rotação
        self.aguardando_proximo_inimigo = False
        self.tempo_espera_inimigo = 0
        self.duracao_espera = 800  # 0.8 segundos para rotação (mais rápido)
        
        # Animação de rotação
        self.animacao_rotacao_ativa = False
        
        # Animação de entrada estilo Pokémon
        self.animacao_entrada_ativa = False
        self.jogador_pos_x = -200
        self.inimigo_pos_x = LARGURA + 200
        self.jogador_pos_final = 80
        self.inimigo_pos_final = 540
        self.velocidade_entrada = 8
        self.progresso_rotacao = 0.0  # Para interpolação suave das posições
        
        # === NOVO: Sistema de mensagens de turno ===
        self.mostrar_resultado_turno = False
        self.tempo_resultado_turno = 0
        self.mensagem_turno = ""
        self.mensagem_resultado = ""
        
        # === NOVO: Sistema de tremor ===
        self.shake_jogador = {'ativo': False, 'intensidade': 0, 'duracao': 0, 'tempo_inicio': 0, 'offset_x': 0, 'offset_y': 0}
        self.shake_inimigo = {'ativo': False, 'intensidade': 0, 'duracao': 0, 'tempo_inicio': 0, 'offset_x': 0, 'offset_y': 0}
        
        # === NOVO: Sistema de animação do personagem ===
        self.frame_personagem = 0
        self.tempo_ultima_animacao = 0
        self.velocidade_animacao = 80  # ms entre frames (mais rápido = mais fluido)
        
        # === NOVO: Sistema de alternância de inimigos ===
        self.alternancia_ativa = False
        self.tempo_alternancia = 0
        self.velocidade_alternancia = 300  # ms para completar movimento
        
        # === NOVO: Sistema de rotação de inimigos ===
        self.rotacao_ativa = False
        self.tempo_rotacao = 0
        self.velocidade_rotacao = 800  # ms para completar rotação
        
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
        
        # CORREÇÃO: Garante que todos os inimigos tenham propriedades de animação inicializadas
        for inimigo in self.inimigos:
            if 'frame_atual' not in inimigo:
                inimigo['frame_atual'] = 0
            if 'tempo_animacao' not in inimigo:
                inimigo['tempo_animacao'] = 0.0
            if 'sprites' not in inimigo or inimigo['sprites'] is None:
                inimigo['sprites'] = sprites_inimigo
                
        print(f"🎲 Spawned {num_inimigos} inimigo(s) no modo múltiplos inimigos!")
        
    def obter_inimigo_atual(self):
        """Retorna o inimigo atual da lista de inimigos."""
        if not self.inimigos or self.inimigo_atual_index >= len(self.inimigos):
            return None
        return self.inimigos[self.inimigo_atual_index]
    
    def aplicar_shake_jogador(self, intensidade=5, duracao=300):
        """Aplica efeito de tremor ao jogador."""
        self.shake_jogador = {
            'ativo': True,
            'intensidade': intensidade,
            'duracao': duracao,
            'tempo_inicio': pygame.time.get_ticks(),
            'offset_x': 0,
            'offset_y': 0
        }
    
    def aplicar_shake_inimigo(self, inimigo, intensidade=5, duracao=300):
        """Aplica efeito de tremor ao inimigo específico."""
        if inimigo:
            inimigo['shake'] = {
                'ativo': True,
                'intensidade': intensidade,
                'duracao': duracao,
                'tempo_inicio': pygame.time.get_ticks(),
                'offset_x': 0,
                'offset_y': 0
            }
    
    def atualizar_shake(self):
        """Atualiza efeitos de tremor."""
        tempo_atual = pygame.time.get_ticks()
        
        # Shake do jogador
        if self.shake_jogador['ativo']:
            tempo_decorrido = tempo_atual - self.shake_jogador['tempo_inicio']
            if tempo_decorrido < self.shake_jogador['duracao']:
                intensidade = self.shake_jogador['intensidade']
                self.shake_jogador['offset_x'] = random.randint(-intensidade, intensidade)
                self.shake_jogador['offset_y'] = random.randint(-intensidade, intensidade)
            else:
                self.shake_jogador = {'ativo': False, 'intensidade': 0, 'duracao': 0, 'tempo_inicio': 0, 'offset_x': 0, 'offset_y': 0}
        
        # Shake dos inimigos
        for inimigo in self.inimigos:
            if 'shake' in inimigo and inimigo['shake']['ativo']:
                tempo_decorrido = tempo_atual - inimigo['shake']['tempo_inicio']
                if tempo_decorrido < inimigo['shake']['duracao']:
                    intensidade = inimigo['shake']['intensidade']
                    inimigo['shake']['offset_x'] = random.randint(-intensidade, intensidade)
                    inimigo['shake']['offset_y'] = random.randint(-intensidade, intensidade)
                else:
                    inimigo['shake'] = {'ativo': False, 'intensidade': 0, 'duracao': 0, 'tempo_inicio': 0, 'offset_x': 0, 'offset_y': 0}
    
    def atualizar_animacao_personagem(self):
        """Atualiza animação do personagem."""
        tempo_atual = pygame.time.get_ticks()
        if tempo_atual - self.tempo_ultima_animacao > self.velocidade_animacao:
            self.frame_personagem = (self.frame_personagem + 1) % 12  # 12 frames de animação
            self.tempo_ultima_animacao = tempo_atual
    
    def iniciar_alternancia_inimigos(self):
        """Inicia o sistema de alternância de inimigos estilo original."""
        # Mover inimigos que estão na frente para trás
        inimigos_ativos = [inimigo for inimigo in self.inimigos if inimigo['ativo']]
        
        if len(inimigos_ativos) > 1:
            # Criar animação de slide dos inimigos
            for i, inimigo in enumerate(inimigos_ativos):
                inimigo['pos_x_inicial'] = inimigo['pos_x']  # Salvar posição inicial
                
                if i == 0:  # Primeiro inimigo (morto) sai pela direita
                    inimigo['pos_x_destino'] = LARGURA + 200
                    inimigo['animando_saida'] = True
                else:  # Outros inimigos avançam
                    # Calcular nova posição baseada na ordem
                    nova_pos_x = self.inimigo_pos_final + (i - 1) * 80
                    inimigo['pos_x_destino'] = nova_pos_x
                    inimigo['animando_entrada'] = True
            
            # Marcar que uma alternância está acontecendo
            self.alternancia_ativa = True
            self.tempo_alternancia = pygame.time.get_ticks()
            print("🔄 Iniciando alternância de inimigos!")
        else:
            # Se só resta um inimigo ou menos, gerar novos
            self.gerar_novos_inimigos()
    
    def atualizar_alternancia_inimigos(self):
        """Atualiza a animação de alternância de inimigos."""
        if not self.alternancia_ativa:
            return
        
        tempo_atual = pygame.time.get_ticks()
        tempo_decorrido = tempo_atual - self.tempo_alternancia
        
        if tempo_decorrido < self.velocidade_alternancia:
            # Animação em progresso
            progresso = tempo_decorrido / self.velocidade_alternancia  # 0.0 a 1.0
            
            for inimigo in self.inimigos:
                if inimigo.get('animando_saida') or inimigo.get('animando_entrada'):
                    pos_inicial = inimigo.get('pos_x_inicial', inimigo['pos_x'])
                    pos_destino = inimigo.get('pos_x_destino', inimigo['pos_x'])
                    
                    # Interpolação suave
                    nova_pos = pos_inicial + (pos_destino - pos_inicial) * progresso
                    inimigo['pos_x'] = nova_pos
        else:
            # Animação completa
            for inimigo in self.inimigos:
                if inimigo.get('pos_x_destino'):
                    inimigo['pos_x'] = inimigo['pos_x_destino']
                inimigo.pop('animando_saida', None)
                inimigo.pop('animando_entrada', None)
                inimigo.pop('pos_x_destino', None)
                inimigo.pop('pos_x_inicial', None)
            
            # Remover inimigos inativos que saíram da tela
            self.inimigos = [inimigo for inimigo in self.inimigos 
                           if inimigo['ativo'] or inimigo['pos_x'] < LARGURA]
            
            self.alternancia_ativa = False
            print("✅ Alternância de inimigos completa!")
    
    def iniciar_rotacao_inimigos(self):
        """Sistema de rotação de inimigos a cada turno (como no original)."""
        inimigos_ativos = [inimigo for inimigo in self.inimigos if inimigo['ativo']]
        
        if len(inimigos_ativos) <= 1:
            return  # Não há o que rotar
        
        print(f"🔄 Iniciando rotação de {len(inimigos_ativos)} inimigos...")
        
        # === Rotação circular: primeiro vai para trás, todos avançam uma posição ===
        # Salvar posições atuais
        for inimigo in inimigos_ativos:
            inimigo['pos_x_inicial'] = inimigo['pos_x']
        
        # Reorganizar posições (rotação circular)
        for i, inimigo in enumerate(inimigos_ativos):
            nova_posicao = (i + 1) % len(inimigos_ativos)  # Rotação circular
            
            # Calcular nova posição X baseada na nova ordem
            if nova_posicao == 0:  # Vai para frente
                nova_pos_x = self.inimigo_pos_final
            else:  # Vai para trás
                nova_pos_x = self.inimigo_pos_final + nova_posicao * 80
            
            inimigo['pos_x_destino'] = nova_pos_x
            inimigo['animando_rotacao'] = True
        
        # Marcar rotação ativa
        self.rotacao_ativa = True
        self.tempo_rotacao = pygame.time.get_ticks()
        self.velocidade_rotacao = 800  # ms para completar rotação
        
        # Atualizar índice do inimigo atual
        if len(inimigos_ativos) > 1:
            self.inimigo_atual_index = (self.inimigo_atual_index + 1) % len(self.inimigos)
            print(f"👁️ Novo inimigo da frente: {inimigos_ativos[1]['nome'] if len(inimigos_ativos) > 1 else 'Último'}")
    
    def atualizar_rotacao_inimigos(self):
        """Atualiza a animação de rotação de inimigos."""
        if not self.rotacao_ativa:
            return
        
        tempo_atual = pygame.time.get_ticks()
        tempo_decorrido = tempo_atual - self.tempo_rotacao
        
        if tempo_decorrido < self.velocidade_rotacao:
            # Animação em progresso
            progresso = tempo_decorrido / self.velocidade_rotacao  # 0.0 a 1.0
            
            # Usar função de ease-in-out para animação mais suave
            progresso_suave = 0.5 * (1 - math.cos(progresso * math.pi))
            
            for inimigo in self.inimigos:
                if inimigo.get('animando_rotacao'):
                    pos_inicial = inimigo.get('pos_x_inicial', inimigo['pos_x'])
                    pos_destino = inimigo.get('pos_x_destino', inimigo['pos_x'])
                    
                    # Interpolação suave
                    nova_pos = pos_inicial + (pos_destino - pos_inicial) * progresso_suave
                    inimigo['pos_x'] = nova_pos
        else:
            # Animação completa
            for inimigo in self.inimigos:
                if inimigo.get('pos_x_destino'):
                    inimigo['pos_x'] = inimigo['pos_x_destino']
                inimigo.pop('animando_rotacao', None)
                inimigo.pop('pos_x_destino', None)
                inimigo.pop('pos_x_inicial', None)
            
            self.rotacao_ativa = False
            print("✅ Rotação de inimigos completa!")
        
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
        """Processa entrada de teclado (IDÊNTICO AO ORIGINAL)."""
        # Primeiro, verifica se o monstruário deve processar a tecla
        if self.monstruario_manager.processar_tecla(pygame.event.Event(pygame.KEYDOWN, key=tecla)):
            return
                
        if self.estado_jogo == EstadoJogo.INTRO:
            if tecla == pygame.K_SPACE:
                self.estado_jogo = EstadoJogo.TRANSICAO
                self.tempo_transicao = 0
                self.transicao_alpha = 0
                
        elif self.estado_jogo == EstadoJogo.BATALHA:
            # NOVA LÓGICA: ESC para cancelar seleção de alvo
            if tecla == pygame.K_ESCAPE and self.target_selector.modo_selecao_ativo:
                self.target_selector.desativar_modo_selecao()
                print("❌ Seleção de alvo cancelada")
                return
                
            # Tecla R para gerar novos inimigos
            if tecla == pygame.K_r and not self.ui_manager.menu_selecao_ativo:
                self.gerar_inimigos_aleatorios()
                self.escolha_jogador = None
                self.escolha_inimigo = None
                self.resultado_combate = ""
                self.combat_system.limpar_selecao()  # Limpa seleção de combate
                print("🔄 Novos inimigos gerados!")
                
            # Teclas de atalho para ataques (1, 2, 3)
            if tecla == pygame.K_1:
                self.processar_escolha_ataque(Escolha.PEDRA)
            elif tecla == pygame.K_2:
                self.processar_escolha_ataque(Escolha.PAPEL)
            elif tecla == pygame.K_3:
                self.processar_escolha_ataque(Escolha.TESOURA)
                
    def processar_clique(self, pos):
        """Processa cliques do mouse."""
        if self.estado_jogo == EstadoJogo.MENU:
            self.processar_clique_menu_principal(pos)
            
        elif self.estado_jogo == EstadoJogo.BATALHA:
            self.processar_clique_jogo(pos)
            
        elif self.estado_jogo == EstadoJogo.RESULTADO:
            botao_clicado = self.ui_manager.verificar_clique_botao(pos)
            if botao_clicado == 'reiniciar':
                self.reiniciar_jogo()
                
    def processar_clique_menu_principal(self, pos):
        """Processa cliques no menu principal."""
        botao_clicado = self.ui_manager.verificar_clique_botao(pos)
        if botao_clicado == 'jogar':
            self.estado_jogo = EstadoJogo.INTRO
            
    def processar_clique_jogo(self, pos):
        """Processa cliques durante o jogo."""
        # NOVA LÓGICA: Primeiro verifica se estamos no modo de seleção de alvo
        if self.target_selector.modo_selecao_ativo:
            alvo_selecionado = self.target_selector.processar_clique(pos, self.inimigos)
            if alvo_selecionado is not None:
                print(f"🎯 Alvo selecionado: {self.inimigos[alvo_selecionado]['nome']}")
            return
            
        # Verifica se há menu aberto
        if self.ui_manager.menu_selecao_ativo:
            self.processar_clique_menu_aberto(pos)
        else:
            # NOVO: Primeiro tenta detectar clique em inimigo
            inimigo_clicado = self.detectar_clique_inimigo(pos)
            if inimigo_clicado is not None:
                self.processar_clique_inimigo(inimigo_clicado)
            else:
                # Se não clicou em inimigo, processa botões principais
                self.processar_clique_botoes_principais(pos)
                
    def detectar_clique_inimigo(self, pos):
        """
        Detecta se o clique foi em um inimigo.
        
        Args:
            pos: Posição do clique (x, y)
            
        Returns:
            int ou None: Índice do inimigo clicado ou None se não clicou em nenhum
        """
        mouse_x, mouse_y = pos
        
        for i, inimigo in enumerate(self.inimigos):
            if not inimigo['ativo'] or inimigo['vida_atual'] <= 0:
                continue
                
            # Usar posição visual se disponível, senão posição normal
            if 'pos_visual' in inimigo:
                inimigo_x, inimigo_y = inimigo['pos_visual']
            else:
                inimigo_x = inimigo.get('pos_x', 400)
                inimigo_y = inimigo.get('pos_y', 200)
                
            # Área clicável do inimigo (baseada no tamanho)
            largura = inimigo.get('largura', 80)
            altura = inimigo.get('altura', 100)
            
            # Criar retângulo de detecção (um pouco maior para facilitar o clique)
            margem = 10
            inimigo_rect = pygame.Rect(
                inimigo_x - margem, 
                inimigo_y - margem,
                largura + 2 * margem,
                altura + 2 * margem
            )
            
            # Verificar se o clique está dentro do retângulo
            if inimigo_rect.collidepoint(mouse_x, mouse_y):
                print(f"🎯 Clique detectado no inimigo {i}: {inimigo['nome']} em ({inimigo_x}, {inimigo_y})")
                return i
                
        return None
            
    def processar_clique_menu_aberto(self, pos):
        """Processa cliques quando há um menu aberto."""
        # Verifica clique no botão X de fechar (disponível em todos os menus)
        if hasattr(self.ui_manager, '_botao_fechar_rect') and self.ui_manager._botao_fechar_rect:
            if self.ui_manager._botao_fechar_rect.collidepoint(pos):
                self.ui_manager.fechar_menu_selecao()
                return
        
        if self.ui_manager.tipo_menu_atual == TipoMenu.ATAQUES:
            botao_clicado = self.ui_manager.verificar_clique_botao(pos)
            if botao_clicado in ['pedra', 'papel', 'tesoura']:
                escolha_map = {
                    'pedra': Escolha.PEDRA,
                    'papel': Escolha.PAPEL,
                    'tesoura': Escolha.TESOURA
                }
                # NOVO: Usar o novo fluxo se há alvo selecionado
                if hasattr(self, 'alvo_selecionado') and self.alvo_selecionado is not None:
                    self.processar_escolha_ataque_com_alvo(escolha_map[botao_clicado])
                else:
                    # Fluxo antigo (escolha ataque, depois alvo)
                    self.processar_escolha_ataque(escolha_map[botao_clicado])
                
        elif self.ui_manager.tipo_menu_atual == TipoMenu.LOJA:
            item_clicado = self.loja_manager.verificar_clique_item(pos, self.ui_manager)
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
        """Abre/fecha o monstruário (IDÊNTICO AO ORIGINAL)."""
        self.monstruario_manager.ativo = not self.monstruario_manager.ativo
        print(f"📖 Monstruário {'aberto' if self.monstruario_manager.ativo else 'fechado'}")
        
    def descobrir_fraqueza(self, tipo_inimigo, ataque_usado):
        """Sistema de descoberta de fraquezas através do jogo (IDÊNTICO AO ORIGINAL)."""
        # Mapeia os ataques do jogo para as armas
        mapa_ataques = {
            'pedra': 'Estaca',     # Pedra = Estaca
            'papel': 'aspirador',  # Papel = Aspirador  
            'tesoura': 'Cruz'      # Tesoura = Cruz
        }
        
        # Converte o ataque para o nome da arma
        arma_usada = mapa_ataques.get(ataque_usado, ataque_usado)
        
        # Verifica se o ataque é efetivo E se é a descoberta inicial correta
        fraquezas_reais = {
            'ghost': ['aspirador', 'Cruz', 'Estaca'],
            'kastle': ['Cruz', 'Estaca'],
            'esqueleto': ['Cruz', 'Estaca'],
            'vampiro': ['Cruz', 'aspirador'],
            'demonio': ['Cruz'],
            'zumbi': ['Estaca', 'aspirador']
        }
        
        # SISTEMA ESPECIAL: Ghost só é descoberto com Estaca (pedra)
        descoberta_permitida = True
        if tipo_inimigo.lower() == 'ghost':
            # Se o ghost ainda não foi descoberto, só permite descoberta com Estaca
            if tipo_inimigo.lower() not in self.monstruario_manager.monstruario_descoberto:
                descoberta_permitida = (arma_usada == 'Estaca')
                if not descoberta_permitida:
                    print(f"⚠️ {tipo_inimigo.title()} só pode ser descoberto com Estaca (pedra)!")
                    return
        
        tipo_lower = tipo_inimigo.lower()
        if (tipo_lower in fraquezas_reais and arma_usada in fraquezas_reais[tipo_lower] and descoberta_permitida):
            self.monstruario_manager.descobrir_inimigo(tipo_lower, arma_usada)
            print(f"🔍 Fraqueza descoberta para {tipo_inimigo}: {arma_usada}")
        
    def registrar_encontro_inimigo(self, tipo_inimigo):
        """Registra encontro com inimigo."""
        self.monstruario_manager.registrar_encontro(tipo_inimigo.lower())
        
    def registrar_derrota_inimigo(self, tipo_inimigo):
        """Registra derrota de inimigo."""
        self.monstruario_manager.registrar_derrota(tipo_inimigo.lower())
        
    def processar_clique_inimigo(self, indice_inimigo):
        """
        NOVO FLUXO: Processa clique em um inimigo para selecioná-lo como alvo.
        """
        if self.esperando_rotacao:
            print("⏳ Aguardando rotação, ignorando seleção...")
            return
            
        print(f"🎯 Inimigo {indice_inimigo} selecionado como alvo!")
        
        # Guardar o alvo selecionado
        self.alvo_selecionado = indice_inimigo
        
        # Verificar se o inimigo é válido
        if indice_inimigo >= len(self.inimigos) or not self.inimigos[indice_inimigo]['ativo'] or self.inimigos[indice_inimigo]['vida_atual'] <= 0:
            print("❌ Inimigo inválido!")
            return
            
        nome_inimigo = self.inimigos[indice_inimigo]['nome']
        print(f"✅ Alvo confirmado: {nome_inimigo}")
        
        # Mostrar menu de ataques
        print("📋 Abrindo menu de ataques para alvo selecionado...")
        self.ui_manager.abrir_menu_selecao(TipoMenu.ATAQUES)
        
    def processar_escolha_ataque_com_alvo(self, escolha):
        """
        NOVO FLUXO: Processa escolha de ataque quando já há um alvo selecionado.
        """
        if not hasattr(self, 'alvo_selecionado') or self.alvo_selecionado is None:
            print("❌ Nenhum alvo selecionado!")
            return
            
        if self.esperando_rotacao:
            print("⏳ Aguardando rotação, ignorando ataque...")
            return
            
        print(f"⚔️ Atacando com {escolha} → Inimigo {self.alvo_selecionado}")
        
        # Fechar menu de ataques
        self.ui_manager.fechar_menu_selecao()
        
        # Guardar escolha do jogador
        self.escolha_jogador = escolha
        
        # Selecionar o alvo no sistema de combate
        if self.combat_system.selecionar_alvo(self.inimigos, self.alvo_selecionado):
            print("✅ Alvo confirmado no sistema de combate, executando...")
            self.executar_combate_rpg()
            
            # Limpar alvo após combate
            self.alvo_selecionado = None
        else:
            print("❌ Erro ao selecionar alvo no sistema de combate!")
            self.alvo_selecionado = None
        
    def processar_escolha_ataque(self, escolha):
        """
        SISTEMA ANTIGO: Processa escolha de ataque com seleção de alvo depois.
        Mantido para compatibilidade, mas agora usa o novo fluxo.
        """
        # Se já há um alvo selecionado, usar o novo fluxo
        if hasattr(self, 'alvo_selecionado') and self.alvo_selecionado is not None:
            self.processar_escolha_ataque_com_alvo(escolha)
            return
            
        if self.esperando_rotacao:
            print("⏳ Aguardando rotação, ignorando ataque...")
            return
            
        print(f"⚔️ Processando ataque: {escolha}")
        
        # Fechar menu de ataques
        self.ui_manager.fechar_menu_selecao()
        
        # Guardar escolha do jogador
        self.escolha_jogador = escolha
        
        # Ativar modo de seleção de alvo
        def callback_alvo_selecionado(indice_alvo):
            """Callback chamado quando alvo é selecionado."""
            print(f"🎯 Callback alvo selecionado: {indice_alvo}")
            if self.combat_system.selecionar_alvo(self.inimigos, indice_alvo):
                print("✅ Alvo válido, executando combate...")
                self.executar_combate_rpg()
            else:
                print("❌ Alvo inválido!")
                
        # Verificar se há inimigos vivos
        inimigos_vivos = self.combat_system.obter_inimigos_vivos(self.inimigos)
        print(f"👹 Inimigos vivos encontrados: {inimigos_vivos}")
        
        if not inimigos_vivos:
            print("❌ Não há inimigos para atacar!")
            return
            
        # Se há apenas um inimigo, ataca diretamente
        if len(inimigos_vivos) == 1:
            print(f"🎯 Apenas um inimigo, atacando diretamente: {inimigos_vivos[0]}")
            callback_alvo_selecionado(inimigos_vivos[0])
        else:
            print(f"🎯 Múltiplos inimigos ({len(inimigos_vivos)}), ativando seleção...")
            # Múltiplos inimigos - ativar seleção
            self.target_selector.ativar_modo_selecao(callback_alvo_selecionado)
    
    def executar_combate_rpg(self):
        """Executa o combate com o novo sistema RPG."""
        print("🔥 EXECUTANDO COMBATE RPG!")
        print(f"⚔️ Escolha do jogador: {self.escolha_jogador}")
        
        # Processar combate completo
        resultado_combate = self.combat_system.processar_combate_completo(
            self.inimigos, self.escolha_jogador
        )
        
        print(f"📊 Resultado do combate: {resultado_combate.get('resultado_principal', 'ERRO')}")
        
        if "erro" in resultado_combate:
            print(f"❌ Erro no combate: {resultado_combate['erro']}")
            return
            
        # Aplicar resultados
        print("🎬 Aplicando resultados do combate...")
        self.aplicar_resultados_combate_rpg(resultado_combate)
        
        # Iniciar animações
        print("🎭 Iniciando animações do jogador...")
        self.sprite_manager.iniciar_ataque_jogador()
        
        # Iniciar espera para próxima rodada
        print("⏳ Iniciando espera para próxima rodada...")
        self.iniciar_espera_rotacao()
    
    def aplicar_resultados_combate_rpg(self, resultado):
        """Aplica os resultados do novo sistema de combate."""
        from core.combat_system import ResultadoCombate
        
        # === NOVO: Mostrar resultado visual ===
        escolha_inimigo = resultado.get('escolha_inimigo', None)
        detalhes_combate = {}
        
        if resultado['resultado_principal'] == ResultadoCombate.VITORIA:
            # === Calcular recompensa baseada em efetividade ===
            recompensa_data = self.economy_manager.calcular_recompensa_vitoria(
                self.escolha_jogador, 'fantasma', 25
            )
            
            # Vitória - aplicar dano aos inimigos
            alvo_principal = resultado['alvo_principal']
            total_recompensa = 0
            
            if alvo_principal:
                total_recompensa += recompensa_data['recompensa']
                
                print(f"💰 {recompensa_data['descricao']}! +${recompensa_data['recompensa']} moedas.")
                print(f"👹 Inimigo {alvo_principal['nome']} - Vida antes: {alvo_principal['vida_antes']}, depois: {alvo_principal['vida_depois']}")
                print(f"👹 Inimigo recebeu {alvo_principal['dano_real']} de dano! Vida: {alvo_principal['vida_depois']}")
                
                # === ADICIONAR NÚMERO DE DANO VISUAL ===
                inimigo_dict = alvo_principal.get('inimigo_ref')
                if inimigo_dict:
                    # Calcular posição do inimigo
                    indice_inimigo = next((i for i, inimigo in enumerate(self.inimigos) if inimigo == inimigo_dict), 0)
                    inimigo_x = 480 + (indice_inimigo % 3) * 100
                    inimigo_y = 200 + (indice_inimigo // 3) * 100
                    # Adicionar número de dano vermelho
                    self.simple_damage.adicionar_dano(alvo_principal['dano_real'], inimigo_x, inimigo_y, (255, 100, 100))
                
                # === NOVO: Shake no inimigo principal ===
                inimigo_dict = alvo_principal.get('inimigo_ref')
                if inimigo_dict:
                    # Encontrar índice do inimigo
                    for i, inimigo in enumerate(self.inimigos):
                        if inimigo is inimigo_dict:
                            # Shake mais suave: intensidade 6, duração 0.3s
                            self.visual_effects.iniciar_shake_inimigo(i, 6, 0.3)
                            break
                    
                    # REMOVIDO: damage_display antigo - usando SimpleDamageDisplay
                
                # Verificar se morreu
                if alvo_principal['morreu']:
                    print(f"💀 {alvo_principal['nome']} foi derrotado!")
                    
            # Dano em inimigos secundários + bonus
            bonus_area = self.economy_manager.calcular_recompensa_area_effect(
                self.escolha_jogador, resultado['inimigos_secundarios']
            )
            total_recompensa += bonus_area
            
            for inimigo_sec in resultado['inimigos_secundarios']:
                print(f"💥 {inimigo_sec['nome']} foi atingido por dano secundário: {inimigo_sec['dano_real']}")
                
                # === ADICIONAR NÚMERO DE DANO VISUAL SECUNDÁRIO ===
                inimigo_dict = inimigo_sec.get('inimigo_ref')
                if inimigo_dict:
                    # Encontrar índice do inimigo
                    indice_inimigo = next((i for i, inimigo in enumerate(self.inimigos) if inimigo == inimigo_dict), 0)
                    inimigo_x = 480 + (indice_inimigo % 3) * 100
                    inimigo_y = 200 + (indice_inimigo // 3) * 100
                    # Adicionar número de dano laranja para secundário
                    self.simple_damage.adicionar_dano(inimigo_sec['dano_real'], inimigo_x, inimigo_y, (255, 150, 50))
                    
                    # Shake nos inimigos secundários
                    self.visual_effects.iniciar_shake_inimigo(indice_inimigo, 4, 0.25)
                
                if inimigo_sec['morreu']:
                    print(f"💀 {inimigo_sec['nome']} foi derrotado por dano em área!")
                    
            # Aplicar recompensa total
            self.dinheiro += total_recompensa
            print(f"💰 Total ganho: ${total_recompensa}. Saldo: ${self.dinheiro}")
            
            # Preparar detalhes para o resultado visual
            detalhes_combate = {
                'alvo_principal': alvo_principal,
                'inimigos_secundarios': resultado['inimigos_secundarios'],
                'recompensa_dinheiro': total_recompensa,
                'efetividade_texto': f"({recompensa_data['descricao']})"
            }
            
            # === Mostrar resultado de vitória ===
            self.result_display.mostrar_resultado(
                self.escolha_jogador, escolha_inimigo, "vitoria", detalhes_combate
            )
                    
        elif resultado['resultado_principal'] == ResultadoCombate.DERROTA:
            # === Mostrar resultado de derrota ===
            
            # Derrota - jogador toma dano
            dano = resultado['dano_ao_jogador']
            self.stats_jogador['vida_atual'] = max(0, self.stats_jogador['vida_atual'] - dano)
            print(f"💔 Jogador recebeu {dano} de dano! Vida: {self.stats_jogador['vida_atual']}")
            
            # === ADICIONAR NÚMERO DE DANO VISUAL NO JOGADOR ===
            self.simple_damage.adicionar_dano(dano, 200, 400, (255, 100, 150))  # Rosa para dano do jogador
            
            # === NOVO: Shake no jogador ===
            # Shake mais suave: intensidade 8, duração 0.4s
            self.visual_effects.iniciar_shake_jogador(8, 0.4)
            
            # === NOVO: Animação de ataque dos inimigos ===
            for i, inimigo in enumerate(self.inimigos):
                if inimigo['ativo'] and inimigo['vida_atual'] > 0:
                    self.enemy_attack_animations.iniciar_animacao_ataque(i, inimigo)
            
            # === Mostrar dano visual no jogador ===
            # REMOVIDO: damage_display antigo - usando SimpleDamageDisplay
            
            # Preparar detalhes
            detalhes_combate = {
                'dano_ao_jogador': dano
            }
            
            self.result_display.mostrar_resultado(
                self.escolha_jogador, escolha_inimigo, "derrota", detalhes_combate
            )
            
            # === NOVO: Contra-ataque de outros inimigos ===
            self._processar_contra_ataques_inimigos()
            
        elif resultado['resultado_principal'] == ResultadoCombate.EMPATE:
            # === Mostrar resultado de empate ===
            self.result_display.mostrar_resultado(
                self.escolha_jogador, escolha_inimigo, "empate", detalhes_combate
            )
            print("🤝 Empate! Ninguém sofreu dano.")
            
            # === NOVO: Contra-ataque de outros inimigos no empate também ===
            self._processar_contra_ataques_inimigos()
        
    def processar_compra_item(self, item):
        """Processa a compra de um item da loja."""
        sucesso, preco = self.loja_manager.comprar_item(item, self.dinheiro)
        
        if sucesso:
            self.dinheiro -= preco
            # Corrigido: usar aplicar_efeito_item em vez de aplicar_buff_item
            resultado = self.loja_manager.aplicar_efeito_item(item, self.stats_jogador)
            self.notification_system.notificar_compra(item.nome, preco)
            print(f"✅ {resultado}")
        else:
            self.notification_system.notificar_dinheiro_insuficiente()
            print("❌ Dinheiro insuficiente!")
            
    def calcular_resultado_combate(self):
        """Calcula o resultado do combate."""
        # Armazena as escolhas para exibir na mensagem
        escolha_jogador_str = {Escolha.PEDRA: "PEDRA", Escolha.PAPEL: "PAPEL", Escolha.TESOURA: "TESOURA"}
        escolha_inimigo_str = {Escolha.PEDRA: "PEDRA", Escolha.PAPEL: "PAPEL", Escolha.TESOURA: "TESOURA"}
        
        jogador_escolha = escolha_jogador_str.get(self.escolha_jogador, "?")
        inimigo_escolha = escolha_inimigo_str.get(self.escolha_inimigo, "?")
        
        # Mensagem das escolhas
        self.mensagem_turno = f"VOCÊ: {jogador_escolha} | INIMIGO: {inimigo_escolha}"
        
        # Determina vencedor
        if self.escolha_jogador == self.escolha_inimigo:
            self.resultado_combate = "EMPATE!"
            self.cor_resultado = AMARELO
            self.mensagem_resultado = "NINGUÉM VENCEU ESTA RODADA!"
        elif ((self.escolha_jogador == Escolha.PEDRA and self.escolha_inimigo == Escolha.TESOURA) or
              (self.escolha_jogador == Escolha.PAPEL and self.escolha_inimigo == Escolha.PEDRA) or
              (self.escolha_jogador == Escolha.TESOURA and self.escolha_inimigo == Escolha.PAPEL)):
            self.processar_vitoria_jogador()
        else:
            self.processar_derrota_jogador()
            
        # Iniciar fade do resultado com tempo maior
        self.animation_controller.criar_animacao_fade('resultado', 3.0, 255, 0)  # 3 segundos
        self.mostrar_resultado_turno = True
        self.tempo_resultado_turno = pygame.time.get_ticks()
        
        # === NOVO: Rotação de inimigos a cada turno (como no original) ===
        self.iniciar_rotacao_inimigos()
        
    def processar_vitoria_jogador(self):
        """Processa vitória do jogador."""
        self.resultado_combate = "VITÓRIA!"
        self.cor_resultado = VERDE
        self.mensagem_resultado = "VOCÊ VENCEU ESTA RODADA!"
        
        inimigo_atual = self.obter_inimigo_atual()
        if not inimigo_atual:
            return
            
        # Registra encontro com inimigo para o monstruário
        tipo_inimigo = inimigo_atual.get('tipo', 'ghost')
        self.registrar_encontro_inimigo(tipo_inimigo)
        
        # === SISTEMA DE TREMOR PARA INIMIGO ===
        self.aplicar_shake_inimigo(inimigo_atual, intensidade=8, duracao=500)
        
        # Sistema de descoberta de fraquezas (IDÊNTICO AO ORIGINAL)
        escolha_str = {
            Escolha.PEDRA: 'pedra',
            Escolha.PAPEL: 'papel', 
            Escolha.TESOURA: 'tesoura'
        }.get(self.escolha_jogador, 'pedra')
        
        self.descobrir_fraqueza(tipo_inimigo, escolha_str)
        
        # Aplicar dano fixo ao inimigo (idêntico ao original)
        dano = DANO_JOGADOR  # 25 de dano fixo
        inimigo_atual['vida_atual'] -= dano
        
        # === REMOVIDO: sistema_texto_flutuante para evitar números duplicados ===
        # O damage_display já está mostrando os números adequadamente
        
        # Sistema de recompensa por acerto (idêntico ao original)
        if self.escolha_jogador == Escolha.PEDRA:
            recompensa_acerto = RECOMPENSA_PEDRA  # 25 - Aspirador é efetivo contra fantasmas
        else:
            recompensa_acerto = RECOMPENSA_PADRAO  # 15 - Recompensa padrão para outras armas
        
        self.dinheiro += recompensa_acerto
        print(f"💰 Acertou! +{recompensa_acerto} moedas. Total: ${self.dinheiro}")
        
        # Mostrar "+$X" em cima do inimigo (COMO NO ORIGINAL)
        inimigo_centro_x = inimigo_atual['pos_x'] + inimigo_atual['largura'] // 2
        inimigo_centro_y = inimigo_atual['pos_y'] + 20  # Um pouco acima do inimigo
        self.simple_damage.adicionar_dinheiro(recompensa_acerto, inimigo_centro_x, inimigo_centro_y)
        
        # === REMOVIDO: shake duplicado, agora usa apenas o visual_effects ===
        
        # Verificar se inimigo morreu
        print(f"👹 Inimigo {inimigo_atual['nome']} - Vida antes: {inimigo_atual['vida_atual'] + dano}, depois: {inimigo_atual['vida_atual']}")
        if inimigo_atual['vida_atual'] <= 0:
            print(f"💀 Inimigo {inimigo_atual['nome']} foi derrotado!")
            self.processar_morte_inimigo()
        else:
            print(f"👹 Inimigo recebeu {dano} de dano! Vida: {inimigo_atual['vida_atual']}")
            
    def processar_derrota_jogador(self):
        """Processa derrota do jogador."""
        self.resultado_combate = "DERROTA!"
        self.cor_resultado = VERMELHO
        self.mensagem_resultado = "VOCÊ PERDEU ESTA RODADA!"
        
        # Aplicar dano fixo ao jogador (idêntico ao original)
        dano = DANO_INIMIGO  # 20 de dano fixo
        self.stats_jogador['vida_atual'] -= dano
        
        # === SISTEMA DE TREMOR PARA JOGADOR ===
        self.aplicar_shake_jogador(intensidade=8, duracao=500)
        
        # === REMOVIDO: sistema_texto_flutuante para evitar números duplicados ===
        # O damage_display já está mostrando os números adequadamente
        
        print(f"💔 Jogador recebeu {dano} de dano! Vida: {self.stats_jogador['vida_atual']}")
        
        # Verificar game over
        if self.stats_jogador['vida_atual'] <= 0:
            print("💀 GAME OVER DETECTADO! Mudando estado para RESULTADO")
            self.estado_jogo = EstadoJogo.RESULTADO
            self.notification_system.notificar_derrota()
            # === LIMPEZA AGRESSIVA DE TODOS OS SISTEMAS VISUAIS ===
            self.simple_damage.limpar_todos()
            self.result_display.limpar_resultado()
            self.visual_effects.limpar_todos_shakes()
            print(f"🏴 Estado atual do jogo: {self.estado_jogo}")
            print(f"💔 Vida do jogador: {self.stats_jogador['vida_atual']}")
            print("🧹 Todos os sistemas visuais foram limpos para Game Over")
            
    def processar_morte_inimigo(self):
        """Processa a morte de um inimigo."""
        inimigo_atual = self.obter_inimigo_atual()
        if not inimigo_atual:
            return
            
        # Registrar derrota do inimigo no monstruário
        tipo_inimigo = inimigo_atual.get('tipo', 'ghost')
        self.registrar_derrota_inimigo(tipo_inimigo)
        
        # Sistema de recompensa idêntico ao original
        if self.escolha_jogador == Escolha.PEDRA:
            recompensa_acerto = RECOMPENSA_PEDRA  # 25 - Aspirador é efetivo contra fantasmas
        else:
            recompensa_acerto = RECOMPENSA_PADRAO  # 15 - Recompensa padrão para outras armas
        
        # Dar recompensa (sem multiplicadores para manter idêntico ao original)
        self.dinheiro += recompensa_acerto
        self.pontos += recompensa_acerto
        self.inimigos_derrotados += 1
        
        # === NOVO: Animação de morte do inimigo ===
        self.aplicar_shake_inimigo(inimigo_atual, intensidade=15, duracao=800)
        
        # Marcar inimigo como inativo
        inimigo_atual['ativo'] = False
        inimigo_atual['vida_atual'] = 0
        
        # === NOVO: Sistema de alternância de inimigos estilo original ===
        self.iniciar_alternancia_inimigos()
        
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
            
        # CORREÇÃO: Verifica ambas as chaves possíveis
        sprite_sheet = sprite_data.get('sheet') or sprite_data.get('sprite_sheet')
        if not sprite_sheet:
            print(f"❌ Erro: sprite_sheet não encontrado nas chaves: {list(sprite_data.keys())}")
            return None
            
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
        
        if sprites_personagem and isinstance(sprites_personagem, dict):
            # CORREÇÃO: Verifica se é estrutura de animação ou sprite direta
            sprite_data = None
            sprite_frame = None
            
            if animacao in sprites_personagem:
                # Estrutura com animações (ex: sprites_personagem['idle'])
                sprite_data = sprites_personagem[animacao]
                sprite_frame = self.extrair_sprite(sprite_data, frame)
            elif 'sheet' in sprites_personagem or 'sprite_sheet' in sprites_personagem:
                # Sprite direta (ex: sprites_personagem já é a sprite)
                sprite_data = sprites_personagem
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
        """Desenha barras de vida no estilo Pokémon (IDÊNTICO AO ORIGINAL)"""
        # Caixa principal da barra (reduzida de 60 para 50)
        caixa = pygame.Rect(x, y, largura, 50)
        pygame.draw.rect(self.tela, BRANCO, caixa, border_radius=10)
        pygame.draw.rect(self.tela, PRETO, caixa, 3, border_radius=10)
        
        # Nome do personagem (fonte menor)
        texto_nome = self.resource_manager.obter_fonte('pequena').render(nome, True, PRETO)
        self.tela.blit(texto_nome, (x + 10, y + 5))
        
        # Barra de vida
        barra_x = x + 10
        barra_y = y + 25  # Ajustado para nova altura
        barra_largura = largura - 20
        barra_altura = 18
        
        # Fundo da barra
        pygame.draw.rect(self.tela, CINZA, (barra_x, barra_y, barra_largura, barra_altura), border_radius=5)
        
        # Vida atual
        vida_porcentagem = vida_atual / vida_maxima if vida_maxima > 0 else 0
        largura_vida = int(barra_largura * vida_porcentagem)
        
        # Cor baseada na porcentagem de vida
        if vida_porcentagem > 0.6:
            cor_vida = VERDE
        elif vida_porcentagem > 0.3:
            cor_vida = AMARELO
        else:
            cor_vida = VERMELHO
            
        if largura_vida > 0:
            pygame.draw.rect(self.tela, cor_vida, (barra_x, barra_y, largura_vida, barra_altura), border_radius=5)
        
        # Números de vida (se solicitado)
        if mostrar_numeros:
            vida_texto = f"{int(vida_atual)}/{int(vida_maxima)}"
            texto_vida = self.resource_manager.obter_fonte('pequena').render(vida_texto, True, PRETO)
            # Centraliza o texto na barra
            texto_x = barra_x + (barra_largura - texto_vida.get_width()) // 2
            texto_y = barra_y + (barra_altura - texto_vida.get_height()) // 2
            self.tela.blit(texto_vida, (texto_x, texto_y))
        
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
        self.toast_manager.atualizar_toasts(delta_time)  # Mantém milissegundos para toast_manager
        # REMOVIDO: sistema antigo texto flutuante
        
        # === NOVOS SISTEMAS RPG ===
        self.simple_damage.atualizar(delta_time_seconds)
        self.result_display.atualizar(delta_time_seconds)
        
        # === NOVO: Verificar se resultado terminou para parar shake ===
        if hasattr(self.result_display, 'resultado_concluido') and self.result_display.resultado_concluido:
            # Parar todos os shakes quando resultado termina
            self.visual_effects.limpar_todos_shakes()
            self.result_display.limpar_resultado()  # Limpa completamente
            print("🛑 Resultado terminou - todos os shakes foram parados")
        
        # === NOVOS SISTEMAS VISUAIS ===
        self.visual_effects.atualizar(delta_time_seconds)
        self.enemy_attack_animations.atualizar(delta_time_seconds)
        self.ui_animations.atualizar(delta_time_seconds)
        
        # === NOVO: Atualizar posições com shake e animações ===
        self._atualizar_posicoes_com_shake()
        
        # === NOVO: Atualizar sistemas de turno ===
        self.atualizar_shake()
        self.atualizar_animacao_personagem()
        self.atualizar_alternancia_inimigos()
        self.atualizar_rotacao_inimigos()
        
        # === NOVO: Atualizar sistema de seleção de alvos ===
        if self.target_selector.modo_selecao_ativo:
            mouse_pos = pygame.mouse.get_pos()
            # Passar inimigos atuais para o target_selector
            self.target_selector.definir_inimigos_referencia(self.inimigos)
            self.target_selector.atualizar_highlight(mouse_pos, self.inimigos)
        
        # Atualizar animação dos inimigos
        self.atualizar_animacao_inimigos(delta_time_seconds)
        
        # Atualizar estados específicos
        if self.estado_jogo == EstadoJogo.TRANSICAO:
            self.atualizar_transicao(delta_time)
        elif self.estado_jogo == EstadoJogo.BATALHA:
            self.atualizar_jogo(delta_time)
            
    def _atualizar_posicoes_com_shake(self):
        """Aplica os efeitos de shake nas posições dos elementos."""
        # Aplicar shake no jogador
        shake_jogador = self.visual_effects.obter_offset_shake_jogador()
        if hasattr(self, 'jogador_pos_x') and hasattr(self, 'jogador_pos_y'):
            self.jogador_pos_visual = (
                self.jogador_pos_x + shake_jogador[0],
                self.jogador_pos_y + shake_jogador[1]
            )
        
        # Aplicar shake nos inimigos e animações de ataque
        for i, inimigo in enumerate(self.inimigos):
            # Shake individual do inimigo
            shake_inimigo = self.visual_effects.obter_offset_shake_inimigo(i)
            
            # Offset de animação de ataque
            offset_ataque = self.enemy_attack_animations.obter_offset_animacao(i)
            
            # Posição base - usar sempre pos_x e pos_y do inimigo
            pos_base_x = inimigo.get('pos_x', 400)
            pos_base_y = inimigo.get('pos_y', 200)
            
            # Aplicar todos os offsets e salvar em pos_visual
            inimigo['pos_visual'] = (
                pos_base_x + shake_inimigo[0] + offset_ataque[0],
                pos_base_y + shake_inimigo[1] + offset_ataque[1]
            )
            
            # Garantir que a posição original esteja salva
            if 'pos_original' not in inimigo:
                inimigo['pos_original'] = (pos_base_x, pos_base_y)
                
    def _processar_contra_ataques_inimigos(self):
        """
        Processa contra-ataques de outros inimigos baseado no ataque do jogador.
        """
        if not hasattr(self, 'escolha_jogador') or not self.escolha_jogador:
            return
            
        print(f"🎯 Processando contra-ataques baseados na escolha do jogador: {self.escolha_jogador}")
        
        # Obter inimigos vivos (exceto o alvo principal se ainda existir)
        inimigos_para_contra_ataque = []
        for i, inimigo in enumerate(self.inimigos):
            if inimigo['ativo'] and inimigo['vida_atual'] > 0:
                # Se não é o alvo selecionado, pode contra-atacar
                if not hasattr(self, 'alvo_selecionado') or i != self.alvo_selecionado:
                    inimigos_para_contra_ataque.append((i, inimigo))
        
        if not inimigos_para_contra_ataque:
            print("👻 Nenhum inimigo disponível para contra-ataque")
            return
            
        # Simular ataque dos inimigos contra o jogador
        for i, inimigo in inimigos_para_contra_ataque:
            # Inimigos fantasmas sempre usam uma escolha aleatória
            escolhas_inimigo = [Escolha.PEDRA, Escolha.PAPEL, Escolha.TESOURA]
            escolha_inimigo = random.choice(escolhas_inimigo)
            
            print(f"👻 {inimigo['nome']} contra-ataca com {escolha_inimigo}")
            
            # Determinar resultado do contra-ataque
            resultado_contra_ataque = self._determinar_resultado_contra_ataque(
                self.escolha_jogador, escolha_inimigo
            )
            
            if resultado_contra_ataque == "inimigo_vence":
                # Inimigo acerta o jogador
                dano_contra_ataque = random.randint(8, 15)
                self.stats_jogador['vida_atual'] = max(0, self.stats_jogador['vida_atual'] - dano_contra_ataque)
                
                print(f"💔 {inimigo['nome']} acertou! Jogador recebeu {dano_contra_ataque} de dano! Vida: {self.stats_jogador['vida_atual']}")
                
                # === ADICIONAR NÚMERO DE DANO VISUAL NO JOGADOR (contra-ataque) ===
                self.simple_damage.adicionar_dano(dano_contra_ataque, 200, 400, (255, 50, 50))  # Vermelho intenso para contra-ataque
                
                # Efeitos visuais do contra-ataque
                self.visual_effects.iniciar_shake_jogador(6, 0.3)
                self.enemy_attack_animations.iniciar_animacao_ataque(i, inimigo)
                # REMOVIDO: damage_display antigo - usando SimpleDamageDisplay
                
            elif resultado_contra_ataque == "jogador_vence":
                # Jogador "defende" o contra-ataque
                print(f"🛡️ Você defendeu o contra-ataque de {inimigo['nome']}!")
                
            else:
                # Empate no contra-ataque
                print(f"🤝 Contra-ataque de {inimigo['nome']} foi neutro")
    
    def _determinar_resultado_contra_ataque(self, escolha_jogador, escolha_inimigo):
        """
        Determina o resultado de um contra-ataque.
        
        Args:
            escolha_jogador: Escolha que o jogador fez
            escolha_inimigo: Escolha do inimigo no contra-ataque
            
        Returns:
            str: "jogador_vence", "inimigo_vence", ou "empate"
        """
        if escolha_jogador == escolha_inimigo:
            return "empate"
        elif (
            (escolha_jogador == Escolha.PEDRA and escolha_inimigo == Escolha.TESOURA) or
            (escolha_jogador == Escolha.PAPEL and escolha_inimigo == Escolha.PEDRA) or
            (escolha_jogador == Escolha.TESOURA and escolha_inimigo == Escolha.PAPEL)
        ):
            return "jogador_vence"
        else:
            return "inimigo_vence"
                
            # DEBUG: Imprimir informações de shake quando ativo
            if shake_inimigo != (0, 0):
                print(f"💥 Inimigo {i} com shake: {shake_inimigo} | Pos final: {inimigo['pos_visual']}")
            if offset_ataque != (0, 0):
                print(f"⚔️ Inimigo {i} com animação ataque: {offset_ataque}")
            
    def atualizar_animacao_inimigos(self, delta_time):
        """Atualiza animação dos sprites dos inimigos."""
        for inimigo in self.inimigos:
            if not inimigo.get('ativo', True):
                continue
                
            # CORREÇÃO: Garante que as propriedades de animação existam
            if 'tempo_animacao' not in inimigo:
                inimigo['tempo_animacao'] = 0.0
            if 'frame_atual' not in inimigo:
                inimigo['frame_atual'] = 0
                
            # Atualiza tempo de animação
            inimigo['tempo_animacao'] += delta_time
            
            # Troca frame a cada 0.1 segundos (10 FPS - mais fluido)
            if inimigo['tempo_animacao'] >= 0.1:
                inimigo['tempo_animacao'] = 0
                
                # CORREÇÃO: Usa sprite específico do inimigo baseado no tipo
                total_frames = 12  # Default para Ghost
                
                if inimigo.get('sprite_tipo') == 'ghost':
                    total_frames = 12  # Ghost tem 12 frames
                elif inimigo.get('sprite_tipo') == 'kastle':
                    total_frames = self.resource_manager.obter_total_frames_inimigo()
                elif inimigo.get('sprite_tipo') == 'ballons':
                    total_frames = 1  # Balloons são estáticos
                
                if total_frames > 1:
                    inimigo['frame_atual'] = (inimigo['frame_atual'] + 1) % total_frames
                    
    def atualizar_transicao(self, delta_time):
        """Atualiza a tela de transição (IDÊNTICO AO ORIGINAL)."""
        # Usa sistema de frames como o original
        self.transicao_alpha += self.transicao_direcao * 8
        if self.transicao_alpha >= 255:
            self.transicao_alpha = 255
            self.transicao_direcao = -1
        elif self.transicao_alpha <= 0 and self.transicao_direcao == -1:
            self.iniciar_jogo()
            # Inicia animação de entrada (se necessário)
            self.iniciar_animacao_entrada()
            
    def iniciar_animacao_entrada(self):
        """Inicia a animação de entrada estilo Pokémon (IDÊNTICO AO ORIGINAL)"""
        self.animacao_entrada_ativa = True
        self.jogador_pos_x = -200
        self.inimigo_pos_x = LARGURA + 200
                
    def atualizar_jogo(self, delta_time):
        """Atualiza o estado do jogo principal."""
        # === NOVO === Processa animação de entrada (IDÊNTICO AO ORIGINAL)
        if self.animacao_entrada_ativa:
            # Move jogador da esquerda para posição final
            if self.jogador_pos_x < self.jogador_pos_final:
                self.jogador_pos_x += self.velocidade_entrada
                if self.jogador_pos_x > self.jogador_pos_final:
                    self.jogador_pos_x = self.jogador_pos_final
            
            # Move inimigo da direita para posição final
            if self.inimigo_pos_x > self.inimigo_pos_final:
                self.inimigo_pos_x -= self.velocidade_entrada
                if self.inimigo_pos_x < self.inimigo_pos_final:
                    self.inimigo_pos_x = self.inimigo_pos_final
            
            # Termina animação quando ambos chegaram
            if (self.jogador_pos_x >= self.jogador_pos_final and 
                self.inimigo_pos_x <= self.inimigo_pos_final):
                self.animacao_entrada_ativa = False
                print("🎬 Animação de entrada finalizada!")
        
        # Atualizar espera de rotação
        if self.esperando_rotacao:
            self.tempo_espera_rotacao += delta_time
            if self.tempo_espera_rotacao >= DURACAO_ESPERA_ROTACAO:
                self.esperando_rotacao = False
                self.ui_manager.mostrar_botoes_ataque()
                
    def iniciar_jogo(self):
        """Inicia o jogo principal."""
        self.estado_jogo = EstadoJogo.BATALHA
        # Verificar se já temos inimigos ou gerar novos
        if not self.inimigos:
            self.gerar_inimigos_aleatorios()
            
        # === NOVO === Ativar animação de entrada (IDÊNTICO AO ORIGINAL)
        self.animacao_entrada_ativa = True
        self.jogador_pos_x = -200
        self.inimigo_pos_x = LARGURA + 200
        print("🎬 Iniciando animação de entrada!")
        
    def reiniciar_jogo(self):
        """Reinicia o jogo."""
        self.inicializar_jogador()
        self.inicializar_estado_jogo()
        self.loja_manager.resetar_loja()
        self.monstruario_manager.resetar_monstruario()
        self.toast_manager.limpar_toasts()
        self.animation_controller.parar_todas_animacoes()
        
        # Limpar sistemas de dano e texto flutuante
        self.simple_damage.limpar_todos()
        self.visual_effects_manager.limpar_todos_shakes()
        
        self.estado_jogo = EstadoJogo.MENU
        print("🔄 Jogo reiniciado!")
        print("🧹 Todos os sistemas de dano e efeitos visuais foram limpos")
        
    def renderizar(self):
        """Renderiza todos os elementos na tela."""
        # Aplicar shake se ativo
        shake_offset = self.sprite_manager.obter_offset_shake()
        
        if self.estado_jogo == EstadoJogo.MENU:
            self.renderizar_menu_principal()
        elif self.estado_jogo == EstadoJogo.INTRO:
            self.renderizar_introducao()
        elif self.estado_jogo == EstadoJogo.TRANSICAO:
            self.renderizar_transicao()
        elif self.estado_jogo == EstadoJogo.BATALHA:
            self.renderizar_jogo(shake_offset)
        elif self.estado_jogo == EstadoJogo.RESULTADO:
            self.renderizar_resultado()
            
        # Renderizar toasts sempre por último
        self.toast_manager.desenhar_toasts(self.tela)
        
        # Renderizar monstruário se ativo (sempre por último)
        if self.monstruario_manager.ativo:
            mouse_pos = pygame.mouse.get_pos()
            self.monstruario_manager.desenhar_monstruario(self.tela)
        
        # Renderizar target selector se ativo (sempre por último)
        if hasattr(self, 'target_selector') and self.target_selector.modo_selecao_ativo:
            mouse_pos = pygame.mouse.get_pos()
            # Garante que os inimigos estão atualizados no target_selector
            self.target_selector.definir_inimigos_referencia(self.inimigos)
            self.target_selector.desenhar_indicadores(self.tela, mouse_pos)
        
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
        
        # Posição do jogador (animada durante entrada)
        jogador_pos_x = self.jogador_pos_x if self.animacao_entrada_ativa else 80
        jogador_pos_y = ALTURA - 280
        
        # === NOVO: Aplicar shake no jogador ===
        if hasattr(self, 'jogador_pos_visual'):
            jogador_pos_x, jogador_pos_y = self.jogador_pos_visual
        else:
            # Posição padrão se não houver shake
            pass
        
        # === NOVO === Personagem Jogador (idêntico ao original)
        animacao_jogador = "idle"  # Por enquanto sempre idle
        shake_jogador = {'ativo': False, 'offset_x': 0, 'offset_y': 0}  # Shake system placeholder
        
        coordenadas_jogador = self.desenhar_personagem(jogador_pos_x, jogador_pos_y, 120, 140, AZUL, "", 
                                                      sprites_personagem=self.sprites_jogador, animacao="idle", 
                                                      frame=self.frame_personagem, espelhar=False, shake_data=self.shake_jogador)
        
        # === NOVO === Todos os inimigos visíveis (ordenados por profundidade) - IDÊNTICO AO ORIGINAL
        inimigos_ativos = [inimigo for inimigo in self.inimigos if inimigo['ativo']]
        
        # Ordena por z_order (menor primeiro = mais atrás)
        inimigos_ativos.sort(key=lambda x: x['z_order'])
        
        coordenadas_inimigos = []
        for inimigo in inimigos_ativos:
            if inimigo['vida_atual'] > 0:  # Só desenha se estiver vivo
                animacao_inimigo = "idle"
                
                # === NOVO: Carregar sprites dinamicamente baseado no tipo ===
                sprites_inimigo = None
                if 'sprite_tipo' in inimigo:
                    sprites_inimigo = self.resource_manager.sprites.get(inimigo['sprite_tipo'])
                else:
                    # Fallback para determinar sprite baseado no nome
                    nome_sprite = inimigo['nome'].lower()
                    if nome_sprite == 'ghost':
                        sprites_inimigo = self.resource_manager.sprites.get('ghost')
                    elif nome_sprite == 'kastle':
                        sprites_inimigo = self.resource_manager.sprites.get('kastle')
                    elif nome_sprite.startswith('balloon'):
                        sprites_inimigo = self.resource_manager.sprites.get('ballons')
                    else:
                        sprites_inimigo = self.resource_manager.sprites.get('ghost')
                
                # Durante animação de entrada, use posição animada para o inimigo principal
                pos_x_inimigo = inimigo['pos_x']
                pos_y_inimigo = inimigo['pos_y']
                
                # === NOVO: Usar posição visual com shake e animação de ataque ===
                if 'pos_visual' in inimigo:
                    pos_x_inimigo, pos_y_inimigo = inimigo['pos_visual']
                elif self.animacao_entrada_ativa and inimigos_ativos.index(inimigo) == 0:
                    pos_x_inimigo = self.inimigo_pos_x
                
                coordenadas_inimigo = self.desenhar_personagem(
                    pos_x_inimigo, pos_y_inimigo, inimigo['largura'], inimigo['altura'], 
                    VERMELHO, "", sprites_personagem=sprites_inimigo, 
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
                                               inimigo['vida_atual'], inimigo['vida_max'], 
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
        
        # Botões Principais (sempre aparecem exceto quando animacao_entrada_ativa ou menu ativo)
        if not self.animacao_entrada_ativa and not self.ui_manager.menu_selecao_ativo:
            self.ui_manager.desenhar_botao(self.tela, 'ataques', mouse_pos)
            self.ui_manager.desenhar_botao(self.tela, 'loja_menu', mouse_pos)
            self.ui_manager.desenhar_botao(self.tela, 'status', mouse_pos)
        
        # HUD Dinheiro
        self.ui_manager.desenhar_hud_dinheiro(self.tela, self.dinheiro)
        
        # REMOVIDO: Sistema antigo de texto flutuante
        # Usando apenas SimpleDamageDisplay para tudo
        
        # === NOVOS SISTEMAS RPG ===
        # Sistema de dano visual (números flutuantes)
        self.simple_damage.desenhar(self.tela)
        
        # Sistema de resultados de combate
        self.result_display.desenhar(self.tela)
        
        # === NOVO: Feedback visual do alvo selecionado ===
        self.desenhar_feedback_alvo_selecionado()
        
        # Menu de seleção se ativo
        if self.ui_manager.menu_selecao_ativo:
            if self.ui_manager.tipo_menu_atual == TipoMenu.ATAQUES:
                # NOVO: Mostrar informações do alvo se selecionado
                if hasattr(self, 'alvo_selecionado') and self.alvo_selecionado is not None:
                    self.desenhar_info_alvo_selecionado()
                self.menu_renderer.desenhar_menu_ataques(self.tela, self.ui_manager, mouse_pos)
            elif self.ui_manager.tipo_menu_atual == TipoMenu.LOJA:
                self.menu_renderer.desenhar_menu_loja(self.tela, self.ui_manager, mouse_pos, self.loja_manager, self.dinheiro)
            elif self.ui_manager.tipo_menu_atual == TipoMenu.MONSTRUARIO:
                self.menu_renderer.desenhar_menu_monstruario(self.tela, self.ui_manager, mouse_pos, self.monstruario_manager)
        
        # Resultado do combate
        if hasattr(self, 'resultado_combate') and self.resultado_combate:
            resultado_surface = self.resource_manager.obter_fonte('titulo').render(self.resultado_combate, True, getattr(self, 'cor_resultado', BRANCO))
            resultado_rect = resultado_surface.get_rect(center=(LARGURA//2, 100))
            self.tela.blit(resultado_surface, resultado_rect)
        
        # === NOVO: Desenhar mensagens de turno estilo original ===
        if hasattr(self, 'mostrar_resultado_turno') and self.mostrar_resultado_turno:
            tempo_atual = pygame.time.get_ticks()
            # Mostrar por 4 segundos
            if tempo_atual - self.tempo_resultado_turno < 4000:
                # Mensagem das escolhas
                if hasattr(self, 'mensagem_turno') and self.mensagem_turno:
                    turno_surface = self.resource_manager.obter_fonte('normal').render(self.mensagem_turno, True, BRANCO)
                    turno_rect = turno_surface.get_rect(center=(LARGURA//2, 150))
                    self.tela.blit(turno_surface, turno_rect)
                
                # Mensagem do resultado
                if hasattr(self, 'mensagem_resultado') and self.mensagem_resultado:
                    resultado_surface = self.resource_manager.obter_fonte('normal').render(self.mensagem_resultado, True, getattr(self, 'cor_resultado', BRANCO))
                    resultado_rect = resultado_surface.get_rect(center=(LARGURA//2, 180))
                    self.tela.blit(resultado_surface, resultado_rect)
                else:
                    self.mostrar_resultado_turno = False
                    
    def desenhar_feedback_alvo_selecionado(self):
        """Desenha feedback visual para o alvo selecionado."""
        if not hasattr(self, 'alvo_selecionado') or self.alvo_selecionado is None:
            return
            
        if self.alvo_selecionado >= len(self.inimigos):
            return
            
        inimigo = self.inimigos[self.alvo_selecionado]
        if not inimigo['ativo'] or inimigo['vida_atual'] <= 0:
            return
            
        # Obter posição do inimigo
        if 'pos_visual' in inimigo:
            inimigo_x, inimigo_y = inimigo['pos_visual']
        else:
            inimigo_x = inimigo.get('pos_x', 400)
            inimigo_y = inimigo.get('pos_y', 200)
            
        largura = inimigo.get('largura', 80)
        altura = inimigo.get('altura', 100)
        
        # Desenhar contorno animado pulsante
        tempo_atual = pygame.time.get_ticks()
        pulso = abs(math.sin(tempo_atual * 0.01)) * 0.5 + 0.5  # 0.5 a 1.0
        
        # Cor do contorno (amarelo brilhante)
        cor_contorno = (255, 255, 0, int(255 * pulso))
        
        # Desenhar múltiplos contornos para efeito de brilho
        for i in range(3):
            espessura = 3 + i
            margem = 5 + i * 2
            
            contorno_rect = pygame.Rect(
                inimigo_x - margem,
                inimigo_y - margem,
                largura + 2 * margem,
                altura + 2 * margem
            )
            
            pygame.draw.rect(self.tela, cor_contorno[:3], contorno_rect, espessura)
            
        # Desenhar seta apontando para o alvo
        seta_x = inimigo_x + largura // 2
        seta_y = inimigo_y - 30
        
        pontos_seta = [
            (seta_x, seta_y),
            (seta_x - 10, seta_y - 15),
            (seta_x + 10, seta_y - 15)
        ]
        
        pygame.draw.polygon(self.tela, (255, 255, 0), pontos_seta)
        
        # Texto "ALVO SELECIONADO"
        fonte_pequena = self.resource_manager.obter_fonte('pequena')
        texto_alvo = fonte_pequena.render("ALVO SELECIONADO", True, (255, 255, 0))
        texto_rect = texto_alvo.get_rect(center=(seta_x, seta_y - 25))
        self.tela.blit(texto_alvo, texto_rect)
        
    def desenhar_info_alvo_selecionado(self):
        """Desenha informações do alvo selecionado no menu de ataques."""
        if not hasattr(self, 'alvo_selecionado') or self.alvo_selecionado is None:
            return
            
        if self.alvo_selecionado >= len(self.inimigos):
            return
            
        inimigo = self.inimigos[self.alvo_selecionado]
        if not inimigo['ativo'] or inimigo['vida_atual'] <= 0:
            return
            
        # Posição do texto (acima do menu de ataques)
        texto_x = LARGURA // 2
        texto_y = 50
        
        # Informações do alvo
        nome = inimigo['nome']
        vida_atual = inimigo['vida_atual']
        vida_max = inimigo['vida_max']
        
        fonte_normal = self.resource_manager.obter_fonte('normal')
        
        # Texto principal
        texto_principal = f"Atacando: {nome} ({vida_atual}/{vida_max} HP)"
        surface_principal = fonte_normal.render(texto_principal, True, (255, 255, 0))
        rect_principal = surface_principal.get_rect(center=(texto_x, texto_y))
        
        # Fundo semi-transparente
        fundo_rect = rect_principal.inflate(20, 10)
        fundo_surface = pygame.Surface((fundo_rect.width, fundo_rect.height))
        fundo_surface.set_alpha(180)
        fundo_surface.fill((0, 0, 0))
        self.tela.blit(fundo_surface, fundo_rect.topleft)
        
        # Texto
        self.tela.blit(surface_principal, rect_principal)
        
        # Dica
        fonte_pequena = self.resource_manager.obter_fonte('pequena')
        texto_dica = "Escolha seu ataque para este inimigo"
        surface_dica = fonte_pequena.render(texto_dica, True, (200, 200, 200))
        rect_dica = surface_dica.get_rect(center=(texto_x, texto_y + 25))
        self.tela.blit(surface_dica, rect_dica)
        
    def renderizar_resultado(self):
        """Renderiza a tela de resultado (game over ou vitória)."""
        mouse_pos = pygame.mouse.get_pos()
        if self.stats_jogador['vida_atual'] <= 0:
            self.menu_renderer.desenhar_game_over(self.tela, self.ui_manager, mouse_pos)
        else:
            self.menu_renderer.desenhar_vitoria(self.tela, self.ui_manager, mouse_pos, self.pontos, self.inimigos_derrotados)
        
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

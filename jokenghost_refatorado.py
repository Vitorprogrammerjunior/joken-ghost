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
from ui.ui_manager import UIManager
from ui.menu_renderer import MenuRenderer
from ui.toast_system import ToastManager, NotificationSystem
from graphics.sprite_manager import SpriteManager, AnimationController
from game.loja_manager import LojaManager
from ui.monstruario_original import MonstruarioOriginal
from ui.texto_flutuante import SistemaTextoFlutuante

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
        self.sistema_texto_flutuante = SistemaTextoFlutuante(self.resource_manager)
        
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
        self.velocidade_animacao = 150  # ms entre frames
        
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
            # Tecla R para gerar novos inimigos
            if tecla == pygame.K_r and not self.ui_manager.menu_selecao_ativo:
                self.gerar_inimigos_aleatorios()
                self.escolha_jogador = None
                self.escolha_inimigo = None
                self.resultado_combate = ""
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
        # Verifica se há menu aberto
        if self.ui_manager.menu_selecao_ativo:
            self.processar_clique_menu_aberto(pos)
        else:
            self.processar_clique_botoes_principais(pos)
            
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
        
        # Mostrar dano em cima do inimigo
        inimigo_centro_x = inimigo_atual['pos_x'] + inimigo_atual['largura'] // 2
        inimigo_centro_y = inimigo_atual['pos_y'] + 40  # Um pouco acima do inimigo
        self.sistema_texto_flutuante.adicionar_dano(inimigo_centro_x, inimigo_centro_y, dano)
        
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
        self.sistema_texto_flutuante.adicionar_dinheiro(inimigo_centro_x, inimigo_centro_y, recompensa_acerto)
        
        # Efeito visual
        self.sprite_manager.iniciar_shake(15, 0.5)
        
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
        
        # === TEXTO FLUTUANTE DE DANO ===
        self.sistema_texto_flutuante.adicionar_dano(300, 400, dano)  # Posição próxima ao jogador
        
        print(f"💔 Jogador recebeu {dano} de dano! Vida: {self.stats_jogador['vida_atual']}")
        
        # Verificar game over
        if self.stats_jogador['vida_atual'] <= 0:
            self.estado_jogo = EstadoJogo.RESULTADO
            self.notification_system.notificar_derrota()
            
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
        
        if sprites_personagem and isinstance(sprites_personagem, dict) and animacao in sprites_personagem:
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
        self.toast_manager.atualizar_toasts(delta_time)
        self.sistema_texto_flutuante.atualizar(delta_time_seconds)
        
        # === NOVO: Atualizar sistemas de turno ===
        self.atualizar_shake()
        self.atualizar_animacao_personagem()
        self.atualizar_alternancia_inimigos()
        self.atualizar_rotacao_inimigos()
        
        # Atualizar animação dos inimigos
        self.atualizar_animacao_inimigos(delta_time_seconds)
        
        # Atualizar estados específicos
        if self.estado_jogo == EstadoJogo.TRANSICAO:
            self.atualizar_transicao(delta_time)
        elif self.estado_jogo == EstadoJogo.BATALHA:
            self.atualizar_jogo(delta_time)
            
    def atualizar_animacao_inimigos(self, delta_time):
        """Atualiza animação dos sprites dos inimigos."""
        for inimigo in self.inimigos:
            if inimigo['ativo'] and inimigo['sprites']:
                # Atualiza tempo de animação
                inimigo['tempo_animacao'] += delta_time
                
                # Troca frame a cada 0.2 segundos (5 FPS)
                if inimigo['tempo_animacao'] >= 0.2:
                    inimigo['tempo_animacao'] = 0
                    
                    # Obtém total de frames do sprite do inimigo
                    total_frames = self.resource_manager.obter_total_frames_inimigo()
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
        self.estado_jogo = EstadoJogo.MENU
        print("🔄 Jogo reiniciado!")
        
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
                    sprites_inimigo = self.gerenciador_recursos.sprites.get(inimigo['sprite_tipo'])
                else:
                    # Fallback para determinar sprite baseado no nome
                    nome_sprite = inimigo['nome'].lower()
                    if nome_sprite == 'ghost':
                        sprites_inimigo = self.gerenciador_recursos.sprites.get('ghost')
                    elif nome_sprite == 'kastle':
                        sprites_inimigo = self.gerenciador_recursos.sprites.get('kastle')
                    elif nome_sprite.startswith('balloon'):
                        sprites_inimigo = self.gerenciador_recursos.sprites.get('ballons')
                    else:
                        sprites_inimigo = self.gerenciador_recursos.sprites.get('ghost')
                
                # Durante animação de entrada, use posição animada para o inimigo principal
                pos_x_inimigo = inimigo['pos_x']
                if self.animacao_entrada_ativa and inimigos_ativos.index(inimigo) == 0:
                    pos_x_inimigo = self.inimigo_pos_x
                
                coordenadas_inimigo = self.desenhar_personagem(
                    pos_x_inimigo, inimigo['pos_y'], inimigo['largura'], inimigo['altura'], 
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
        
        # Sistema de texto flutuante ("+15", dano, etc.)
        self.sistema_texto_flutuante.desenhar(self.tela)
        
        # Menu de seleção se ativo
        if self.ui_manager.menu_selecao_ativo:
            if self.ui_manager.tipo_menu_atual == TipoMenu.ATAQUES:
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

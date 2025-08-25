"""
JokenGhost - Caçada em Turnos
============================

Um jogo de RPG estilo Pokémon com mecânicas de pedra-papel-tesoura.

Características:
- Personagens animados com sprite sheets
- Sistema de combate estratégico
- Animações dinâmicas baseadas em resultados
- Interface intuitiva e responsiva

Controles:
- Tecla 1: Pedra
- Tecla 2: Papel  
- Tecla 3: Tesoura
- ESC: Sair

Autor: Desenvolvido para diversão e aprendizado
Tecnologia: Python + Pygame
"""

import pygame
import random
import sys
import os
from enum import Enum

# Inicialização do Pygame
pygame.init()

# Configurações da tela
LARGURA = 800
ALTURA = 600
FPS = 60

# Cores
PRETO = (0, 0, 0)
BRANCO = (255, 255, 255)
AZUL = (0, 100, 200)
VERDE = (0, 200, 0)
VERMELHO = (200, 0, 0)
AMARELO = (255, 255, 0)
CINZA = (128, 128, 128)
CINZA_CLARO = (200, 200, 200)

class EstadoAnimacao(Enum):
    IDLE = 1
    ATAQUE = 2
    DEFENDENDO = 3

class EstadoJogo(Enum):
    MENU = 1
    TRANSICAO = 2
    BATALHA = 3
    RESULTADO = 4
    MENU_SELECAO = 5  # Novo estado para menu de seleção

class TipoMenu(Enum):
    ATAQUES = 1
    LOJA = 2

class Escolha(Enum):
    PEDRA = 1
    PAPEL = 2
    TESOURA = 3

class JokenGhost:
    def __init__(self):
        self.tela = pygame.display.set_mode((LARGURA, ALTURA))
        pygame.display.set_caption("JokenGhost - Caçada em Turnos")
        self.relogio = pygame.time.Clock()
        
        # Configuração de fontes - tentando usar fontes pixeladas
        try:
            # Tenta carregar fontes pixeladas do sistema
            self.fonte_titulo = pygame.font.SysFont("courier", 72)      # Courier é monospace/pixelada
            self.fonte_texto = pygame.font.SysFont("courier", 36)
            self.fonte_pequena = pygame.font.SysFont("courier", 24)
            print("✅ Fontes Courier (pixeladas) carregadas com sucesso!")
        except:
            # Fallback para fontes padrão
            self.fonte_titulo = pygame.font.Font(None, 72)
            self.fonte_texto = pygame.font.Font(None, 36)
            self.fonte_pequena = pygame.font.Font(None, 24)
            print("⚠️ Usando fontes padrão - Para fontes pixeladas personalizadas, adicione um arquivo .ttf na pasta do jogo")
        
        self.estado = EstadoJogo.MENU
        self.transicao_alpha = 0
        self.transicao_direcao = 1
        
        # Stats dos personagens
        self.vida_jogador = 100
        self.vida_inimigo = 100
        self.vida_max_jogador = 100
        self.vida_max_inimigo = 100
        
        # === NOVO === Dinheiro e Sistema de Recompensas
        self.dinheiro = 0  # Variável unificada para dinheiro
        self.dinheiro_jogador = 0  # Mantém por compatibilidade temporária
        self.recompensa_paga = False  # evita pagar duas vezes na mesma batalha
        self.loja_aberta = False
        self.itens_loja = [
            {"nome": "Poção de Cura",   "preco": 30, "efeito": "cura_pequena"},
            {"nome": "Buff Ofensivo",   "preco": 50, "efeito": "buff_ofensivo"},
            {"nome": "Poção Grande",    "preco": 80, "efeito": "cura_grande"},
        ]
        self.mensagem_loja = ""  # feedback textual simples dentro da loja
        
        # === NOVO === Animações de Entrada Estilo Pokémon
        self.animacao_entrada_ativa = False
        self.jogador_pos_x = -200  # Começa fora da tela
        self.inimigo_pos_x = LARGURA + 200  # Começa fora da tela
        self.jogador_pos_final = 80
        self.inimigo_pos_final = 540
        self.velocidade_entrada = 8
        
        # === NOVO === Sistema de Menu de Seleção
        self.menu_selecao_ativo = False
        self.tipo_menu_atual = TipoMenu.ATAQUES
        self.menu_altura = 0
        self.menu_altura_alvo = 300
        self.velocidade_menu = 15
        
        # === NOVO === Sistema para Múltiplos Inimigos
        self.inimigos = []
        self.inimigo_atual_index = 0  # Para sistema de rotação
        self.aguardando_proximo_inimigo = False
        self.tempo_espera_inimigo = 0
        self.duracao_espera = 1500  # 1.5 segundos para rotação
        self.animacao_rotacao_ativa = False
        self.progresso_rotacao = 0.0  # Para interpolação suave das posições
        
        # === NOVO === Sistema de Posições em Profundidade
        self.posicoes_profundidade = [
            # [x, y, largura, altura, z_order] - z_order maior = mais na frente
            [580, ALTURA - 400, 120, 140, 3],  # Posição principal (frente)
            [480, ALTURA - 350, 80, 100, 2],   # Posição secundária (meio)
            [680, ALTURA - 350, 80, 100, 1],   # Posição terciária (atrás)
        ]
        
        # === NOVO === Sistema de Dano Visual
        self.shake_jogador = {'ativo': False, 'intensidade': 0, 'tempo': 0, 'offset_x': 0, 'offset_y': 0}
        self.shake_inimigo = {'ativo': False, 'intensidade': 0, 'tempo': 0, 'offset_x': 0, 'offset_y': 0}
        self.shake_duracao = 500  # 0.5 segundos
        
        # === NOVO === Animação de Barras de Vida
        self.vida_jogador_visual = 100  # Para animação suave
        self.vida_inimigo_visual = 100
        self.velocidade_vida = 2
        
        # === NOVO === Modo Demonstração
        self.modo_demonstracao = False
        
        # === NOVO === Sistema de animação de moedas flutuantes
        self.moedas_flutuantes = []  # Lista de moedas animadas
        
        # Batalha
        self.escolha_jogador = None
        self.escolha_inimigo = None
        self.resultado_batalha = ""
        self.tempo_resultado = 0
        
        # === NOVO === Sistema de controle de turnos
        self.turno_em_andamento = False  # Bloqueia ações durante processamento
        
        # === NOVO === Carregamento do Fundo de Batalha
        self.fundo_batalha = None
        self.carregar_fundo_batalha()
        
        # === NOVO === Carregamento da Moldura de Dinheiro
        self.moldura_dinheiro = None
        self.carregar_moldura_dinheiro()
        
        # === NOVO === Carregamento da Moldura de Itens (botões e menus)
        self.moldura_itens = None
        self.carregar_moldura_itens()
        
        # Botões
        self.botoes = {}
        self.criar_botoes()
        
        # Sprites e animações
        self.carregar_sprites()
        self.frame_atual_jogador = 0
        self.frame_atual_inimigo = 0
        self.tempo_animacao_jogador = 0
        self.tempo_animacao_inimigo = 0
        
        # Estados de animação
        self.estado_animacao_jogador = EstadoAnimacao.IDLE
        self.estado_animacao_inimigo = EstadoAnimacao.IDLE
        self.animacao_ataque_inimigo_ativa = False
        self.tempo_inicio_ataque = 0
        self.duracao_ataque = 1000  # 1 segundo de animação de ataque
        
        # === NOVO === Spawn de Inimigos após todas as inicializações
        self.gerar_inimigos_aleatorios()
    
    def gerar_inimigos_aleatorios(self):
        """Gera de 1 a 3 inimigos aleatoriamente com as probabilidades especificadas"""
        import random
        
        # Probabilidades: 25% um, 50% dois, 25% três
        rand = random.random()
        if rand < 0.25:
            num_inimigos = 1
        elif rand < 0.75:
            num_inimigos = 2
        else:
            num_inimigos = 3
        
        self.inimigos = []
        
        for i in range(num_inimigos):
            # Atribui posição baseada no índice (posições rotacionais)
            pos_index = i % len(self.posicoes_profundidade)
            pos_config = self.posicoes_profundidade[pos_index]
            
            inimigo = {
                'nome': f'GHOST {i+1}',
                'pos_x': pos_config[0],
                'pos_y': pos_config[1], 
                'largura': pos_config[2],
                'altura': pos_config[3],
                'z_order': pos_config[4],
                'pos_original': pos_index,  # Posição original na formação
                'pos_atual': pos_index,     # Posição atual (muda durante rotação)
                'vida_atual': 100,
                'vida_max': 100,
                'vida_visual': 100.0,
                'sprites': None,
                'ativo': True,
                'frame_atual': 0,
                'tempo_animacao': 0,
                'shake': {'ativo': False, 'intensidade': 0, 'tempo': 0, 'offset_x': 0, 'offset_y': 0}
            }
            self.inimigos.append(inimigo)
        
        # Atribui sprites do ghost para todos os inimigos
        if hasattr(self, 'sprites_inimigo'):
            for inimigo in self.inimigos:
                inimigo['sprites'] = self.sprites_inimigo
        
        # Define o primeiro inimigo como ativo (na frente)
        self.inimigo_atual_index = 0
        self.animacao_rotacao_ativa = False
        self.progresso_rotacao = 0.0
        
        print(f"🎲 Spawned {num_inimigos} inimigo(s) aleatoriamente!")
        print(f"👁️ Inimigo da frente: {self.inimigos[0]['nome'] if self.inimigos else 'Nenhum'}")
        return num_inimigos
    
    def iniciar_rotacao_inimigo(self):
        """Inicia a animação de rotação de posições dos inimigos"""
        if not self.inimigos or len(self.inimigos) <= 1:
            return
        
        self.animacao_rotacao_ativa = True
        self.tempo_espera_inimigo = pygame.time.get_ticks()
        self.progresso_rotacao = 0.0
        print(f"🔄 Iniciando rotação de posições...")
    
    def atualizar_rotacao_inimigo(self):
        """Atualiza a animação de rotação entre posições dos inimigos"""
        if not self.animacao_rotacao_ativa:
            return
        
        tempo_atual = pygame.time.get_ticks()
        tempo_decorrido = tempo_atual - self.tempo_espera_inimigo
        
        # Calcula progresso da animação (0.0 a 1.0)
        self.progresso_rotacao = min(tempo_decorrido / self.duracao_espera, 1.0)
        
        # Aplicar interpolação suave (easing)
        progress_smooth = self.ease_in_out(self.progresso_rotacao)
        
        # Interpola posições de todos os inimigos ativos
        for i, inimigo in enumerate(self.inimigos):
            if not inimigo['ativo'] or inimigo['vida_atual'] <= 0:
                continue
                
            pos_atual = inimigo['pos_atual']
            pos_destino = (pos_atual + 1) % len(self.posicoes_profundidade)
            
            # Se há apenas 2 inimigos, usar apenas as 2 primeiras posições
            if len([i for i in self.inimigos if i['ativo'] and i['vida_atual'] > 0]) == 2:
                pos_destino = (pos_atual + 1) % 2
            
            # Interpolação entre posição atual e destino
            config_atual = self.posicoes_profundidade[pos_atual]
            config_destino = self.posicoes_profundidade[pos_destino]
            
            inimigo['pos_x'] = self.lerp(config_atual[0], config_destino[0], progress_smooth)
            inimigo['pos_y'] = self.lerp(config_atual[1], config_destino[1], progress_smooth)
            inimigo['largura'] = int(self.lerp(config_atual[2], config_destino[2], progress_smooth))
            inimigo['altura'] = int(self.lerp(config_atual[3], config_destino[3], progress_smooth))
            inimigo['z_order'] = config_destino[4] if progress_smooth > 0.5 else config_atual[4]
        
        # Finaliza a rotação
        if self.progresso_rotacao >= 1.0:
            self.finalizar_rotacao()
    
    def finalizar_rotacao(self):
        """Finaliza a rotação, atualizando as posições finais"""
        self.animacao_rotacao_ativa = False
        self.progresso_rotacao = 0.0
        
        # Atualiza índices de posição
        for inimigo in self.inimigos:
            if inimigo['ativo'] and inimigo['vida_atual'] > 0:
                inimigo['pos_atual'] = (inimigo['pos_atual'] + 1) % len(self.posicoes_profundidade)
                
                # Se há apenas 2 inimigos, usar apenas as 2 primeiras posições
                inimigos_vivos = len([i for i in self.inimigos if i['ativo'] and i['vida_atual'] > 0])
                if inimigos_vivos == 2:
                    inimigo['pos_atual'] = (inimigo['pos_atual'] + 1) % 2
        
        # Atualiza o índice do inimigo atual (o que está na frente)
        self.atualizar_inimigo_atual()
        
        inimigo_frente = self.get_inimigo_na_frente()
        nome_frente = inimigo_frente['nome'] if inimigo_frente else "Nenhum"
        print(f"✅ Rotação finalizada. Inimigo da frente: {nome_frente}")
    
    def lerp(self, start, end, t):
        """Interpolação linear entre dois valores"""
        return start + (end - start) * t
    
    def ease_in_out(self, t):
        """Função de easing para animação mais suave"""
        return t * t * (3.0 - 2.0 * t)
    
    def get_inimigo_na_frente(self):
        """Retorna o inimigo que está na posição da frente"""
        for inimigo in self.inimigos:
            if inimigo['ativo'] and inimigo['vida_atual'] > 0 and inimigo['z_order'] == 3:
                return inimigo
        return None
    
    def atualizar_inimigo_atual(self):
        """Atualiza qual inimigo está atualmente na frente"""
        inimigo_frente = self.get_inimigo_na_frente()
        if inimigo_frente:
            self.inimigo_atual_index = self.inimigos.index(inimigo_frente)
    
    def carregar_fundo_batalha(self):
        """Carrega o fundo de batalha da pasta Scenes"""
        try:
            fundo_path = os.path.join("Assests", "Sprites", "Scenes", "Caminho Encantado na Floresta.png")
            if os.path.exists(fundo_path):
                self.fundo_batalha = pygame.image.load(fundo_path).convert()
                # Escala para o tamanho da tela
                self.fundo_batalha = pygame.transform.scale(self.fundo_batalha, (LARGURA, ALTURA))
                print("✅ Fundo de batalha carregado com sucesso!")
            else:
                print("⚠️ Fundo de batalha não encontrado, usando fundo padrão")
        except Exception as e:
            print(f"❌ Erro ao carregar fundo de batalha: {e}")
    
    def carregar_moldura_dinheiro(self):
        """Carrega a moldura de dinheiro da pasta molders"""
        try:
            moldura_path = os.path.join("Assests", "Sprites", "molders", "ChatGPT_Image_25_de_ago._de_2025__11_02_49-removebg-preview.png")
            if os.path.exists(moldura_path):
                self.moldura_dinheiro = pygame.image.load(moldura_path).convert_alpha()
                # Escala para um tamanho adequado (aproximadamente 120x40 pixels)
                self.moldura_dinheiro = pygame.transform.scale(self.moldura_dinheiro, (120, 40))
                print("✅ Moldura de dinheiro carregada com sucesso!")
            else:
                print("⚠️ Moldura de dinheiro não encontrada")
        except Exception as e:
            print(f"❌ Erro ao carregar moldura de dinheiro: {e}")
    
    def carregar_moldura_itens(self):
        """Carrega a moldura de itens/botões da pasta molders"""
        try:
            moldura_path = os.path.join("Assests", "Sprites", "molders", "molders_itens.png")
            if os.path.exists(moldura_path):
                self.moldura_itens = pygame.image.load(moldura_path).convert_alpha()
                print("✅ Moldura de itens carregada com sucesso!")
            else:
                print("⚠️ Moldura de itens não encontrada")
        except Exception as e:
            print(f"❌ Erro ao carregar moldura de itens: {e}")
    
    def iniciar_animacao_entrada(self):
        """Inicia a animação de entrada estilo Pokémon"""
        self.animacao_entrada_ativa = True
        self.jogador_pos_x = -200
        self.inimigo_pos_x = LARGURA + 200
    
    def iniciar_shake_personagem(self, eh_jogador=True, intensidade=10):
        """Inicia efeito de shake quando personagem toma dano"""
        shake_data = self.shake_jogador if eh_jogador else self.shake_inimigo
        shake_data['ativo'] = True
        shake_data['intensidade'] = intensidade
        shake_data['tempo'] = pygame.time.get_ticks()
        shake_data['offset_x'] = 0
        shake_data['offset_y'] = 0
        print(f"🎬 Shake iniciado para {'jogador' if eh_jogador else 'inimigo'} (intensidade: {intensidade})")
    
    def atualizar_shake(self, shake_data):
        """Atualiza o efeito de shake"""
        if not shake_data['ativo']:
            return
        
        tempo_atual = pygame.time.get_ticks()
        tempo_decorrido = tempo_atual - shake_data['tempo']
        
        if tempo_decorrido >= self.shake_duracao:
            # Termina o shake
            shake_data['ativo'] = False
            shake_data['offset_x'] = 0
            shake_data['offset_y'] = 0
        else:
            # Calcula intensidade decrescente
            progresso = tempo_decorrido / self.shake_duracao
            intensidade_atual = shake_data['intensidade'] * (1 - progresso)
            
            # Gera offsets aleatórios
            import random
            shake_data['offset_x'] = random.randint(-int(intensidade_atual), int(intensidade_atual))
            shake_data['offset_y'] = random.randint(-int(intensidade_atual//2), int(intensidade_atual//2))
    
    def criar_moeda_flutuante(self, valor, x, y):
        """Cria uma moeda flutuante que sobe e desaparece"""
        moeda = {
            'valor': valor,
            'x': x,
            'y': y,
            'y_inicial': y,
            'tempo_inicio': pygame.time.get_ticks(),
            'duracao': 2000,  # 2 segundos
            'ativo': True
        }
        self.moedas_flutuantes.append(moeda)
        print(f"💰 Criada moeda flutuante: +{valor} na posição ({x}, {y})")
    
    def atualizar_moedas_flutuantes(self):
        """Atualiza a posição e transparência das moedas flutuantes"""
        tempo_atual = pygame.time.get_ticks()
        moedas_para_remover = []
        
        for moeda in self.moedas_flutuantes:
            if not moeda['ativo']:
                continue
                
            tempo_decorrido = tempo_atual - moeda['tempo_inicio']
            
            if tempo_decorrido >= moeda['duracao']:
                moeda['ativo'] = False
                moedas_para_remover.append(moeda)
            else:
                # Movimento para cima
                progresso = tempo_decorrido / moeda['duracao']
                moeda['y'] = moeda['y_inicial'] - (progresso * 80)  # Sobe 80 pixels
        
        # Remove moedas inativas
        for moeda in moedas_para_remover:
            self.moedas_flutuantes.remove(moeda)
    
    def desenhar_moedas_flutuantes(self):
        """Desenha as moedas flutuantes na tela"""
        tempo_atual = pygame.time.get_ticks()
        
        for moeda in self.moedas_flutuantes:
            if not moeda['ativo']:
                continue
                
            tempo_decorrido = tempo_atual - moeda['tempo_inicio']
            progresso = tempo_decorrido / moeda['duracao']
            
            # Calcula transparência (fade-out)
            alpha = max(0, int(255 * (1 - progresso)))
            
            # Cria texto com transparência
            texto = self.fonte_pequena.render(f"+{moeda['valor']}", True, (255, 215, 0))  # Cor dourada
            
            # Aplica transparência
            if alpha < 255:
                texto.set_alpha(alpha)
            
            # Desenha o texto
            self.tela.blit(texto, (moeda['x'], moeda['y']))
    
    def desenhar_multiplos_inimigos_exemplo(self):
        """Função de demonstração para mostrar como o sistema automático funciona com múltiplos inimigos"""
        # Exemplo de múltiplos inimigos em posições diferentes
        inimigos_exemplo = [
            {'x': 500, 'y': ALTURA - 350, 'w': 80, 'h': 100, 'vida': 75, 'max': 100, 'nome': 'Ghost 1'},
            {'x': 600, 'y': ALTURA - 300, 'w': 90, 'h': 110, 'vida': 45, 'max': 100, 'nome': 'Ghost 2'},
            {'x': 450, 'y': ALTURA - 250, 'w': 70, 'h': 90, 'vida': 90, 'max': 100, 'nome': 'Ghost 3'},
        ]
        
        for inimigo in inimigos_exemplo:
            # Desenha o inimigo (usando bloco para demonstração)
            pygame.draw.rect(self.tela, VERMELHO, (inimigo['x'], inimigo['y'], inimigo['w'], inimigo['h']))
            pygame.draw.rect(self.tela, PRETO, (inimigo['x'], inimigo['y'], inimigo['w'], inimigo['h']), 2)
            
            # Barra de vida automática (40px acima e centralizada)
            self.desenhar_barra_vida_automatica(
                inimigo['x'], inimigo['y'], inimigo['w'], inimigo['h'],
                inimigo['vida'], inimigo['max'], inimigo['nome'], largura_barra=120
            )
    
    def ativar_modo_demonstracao(self):
        """Ativa modo de demonstração com múltiplos inimigos"""
        # Pode ser chamada pressionando uma tecla específica
        print("🎮 Modo demonstração: Múltiplos inimigos com barras automáticas!")
        return True
    
    def abrir_menu_selecao(self, tipo_menu):
        """Abre o menu de seleção com animação"""
        self.menu_selecao_ativo = True
        self.tipo_menu_atual = tipo_menu
        self.menu_altura = 0  # Começa fechado
        print(f"📋 Abrindo menu: {tipo_menu.name}")
    
    def fechar_menu_selecao(self):
        """Fecha o menu de seleção"""
        self.menu_selecao_ativo = False
        self.menu_altura = 0
        print("📋 Fechando menu de seleção")
        
    def carregar_sprites(self):
        """Carrega sprites organizadas por personagem"""
        try:
            # Nova estrutura: Assests/Sprites/[PERSONAGEM]/[sprites]
            sprites_path = os.path.join("Assests", "Sprites")
            
            # Inicializa dicionários de sprites
            self.sprites_personagens = {}
            
            if os.path.exists(sprites_path):
                # Lista todas as pastas de personagens
                personagens = [d for d in os.listdir(sprites_path) 
                              if os.path.isdir(os.path.join(sprites_path, d))]
                
                for personagem in personagens:
                    personagem_path = os.path.join(sprites_path, personagem)
                    sprites_personagem = {}
                    
                    print(f"📁 Carregando sprites de {personagem}...")
                    
                    # Carrega todas as sprites do personagem
                    for arquivo in os.listdir(personagem_path):
                        nome, extensao = os.path.splitext(arquivo)
                        if extensao.lower() in [".png", ".jpg", ".jpeg", ".bmp"]:
                            try:
                                sprite_path = os.path.join(personagem_path, arquivo)
                                sprite_sheet = pygame.image.load(sprite_path).convert_alpha()
                                
                                # === NOVO === Detecção Inteligente de Frames
                                sheet_width = sprite_sheet.get_width()
                                sheet_height = sprite_sheet.get_height()
                                
                                # Detecta se é sprite sheet horizontal, vertical ou única
                                if sheet_width > sheet_height:
                                    # Sprite sheet horizontal - detecta frames quadrados
                                    if sheet_width >= sheet_height * 2:
                                        frame_height = sheet_height
                                        frame_width = frame_height  # Frames quadrados
                                        total_frames = sheet_width // frame_width
                                        print(f"    🎬 Sprite horizontal: {total_frames} frames de {frame_width}x{frame_height}")
                                    else:
                                        # Apenas 2 frames lado a lado
                                        frame_width = sheet_width // 2
                                        frame_height = sheet_height
                                        total_frames = 2
                                        print(f"    🎬 Sprite dupla: {total_frames} frames de {frame_width}x{frame_height}")
                                elif sheet_height > sheet_width:
                                    # Sprite sheet vertical
                                    if sheet_height >= sheet_width * 2:
                                        frame_width = sheet_width
                                        frame_height = frame_width  # Frames quadrados
                                        total_frames = sheet_height // frame_height
                                        print(f"    🎬 Sprite vertical: {total_frames} frames de {frame_width}x{frame_height}")
                                    else:
                                        # Apenas 2 frames empilhados
                                        frame_width = sheet_width
                                        frame_height = sheet_height // 2
                                        total_frames = 2
                                        print(f"    🎬 Sprite dupla vertical: {total_frames} frames de {frame_width}x{frame_height}")
                                else:
                                    # Sprite única (quadrada)
                                    frame_width = sheet_width
                                    frame_height = sheet_height
                                    total_frames = 1
                                    print(f"    🎬 Sprite única: {frame_width}x{frame_height}")
                                
                                # === NOVO === Detecção automática baseada em proporções padrão
                                # Se a largura é múltiplo exato da altura, pode ser múltiplos frames
                                if total_frames == 1 and sheet_width > sheet_height:
                                    # Tenta detectar múltiplos frames baseado em proporções comuns
                                    proporcoes_comuns = [2, 3, 4, 5, 6, 8, 10, 12]
                                    for frames in proporcoes_comuns:
                                        if sheet_width % frames == 0:
                                            test_frame_width = sheet_width // frames
                                            if abs(test_frame_width - sheet_height) <= 5:  # Tolerância para frames quase quadrados
                                                frame_width = test_frame_width
                                                frame_height = sheet_height
                                                total_frames = frames
                                                print(f"    🎯 Auto-detectado: {total_frames} frames de {frame_width}x{frame_height}")
                                                break
                                
                                sprite_data = {
                                    'sheet': sprite_sheet,
                                    'frame_width': frame_width,
                                    'frame_height': frame_height,
                                    'total_frames': total_frames
                                }
                                
                                # Determina o tipo de animação pelo nome
                                nome_limpo = nome.lower().replace('_sheet', '').replace('-sheet', '')
                                if 'idle' in nome_limpo or 'stopped' in nome_limpo:
                                    sprites_personagem['idle'] = sprite_data
                                elif 'attack' in nome_limpo or 'ataque' in nome_limpo or 'atack' in nome_limpo:
                                    sprites_personagem['ataque'] = sprite_data
                                elif 'defend' in nome_limpo or 'defesa' in nome_limpo:
                                    sprites_personagem['defesa'] = sprite_data
                                else:
                                    # Se não identifica, assume como idle
                                    sprites_personagem['idle'] = sprite_data
                                
                            except Exception as e:
                                print(f"  ⚠️ Erro ao carregar {arquivo}: {e}")
                    
                    if sprites_personagem:
                        self.sprites_personagens[personagem.lower()] = sprites_personagem
                
                # Atribui sprites aos jogadores (Skeleton = Jogador, Kastle = Inimigo)
                personagens_carregados = list(self.sprites_personagens.keys())
                personagens_carregados.sort()  # Garante ordem: Kastle, Skeleton
                
                # Encontra Skeleton, Kastle e Ghost especificamente
                skeleton_encontrado = None
                kastle_encontrado = None
                ghost_encontrado = None
                personagem_encontrado = None
                
                for personagem in personagens_carregados:
                    if 'skeleton' in personagem.lower():
                        skeleton_encontrado = personagem
                    elif 'kastle' in personagem.lower():
                        kastle_encontrado = personagem
                    elif 'ghost' in personagem.lower():
                        ghost_encontrado = personagem
                    elif 'personagem' in personagem.lower():
                        personagem_encontrado = personagem
                
                # Prioridade: personagem > skeleton para o jogador
                # Ghost como inimigo principal
                if personagem_encontrado:
                    self.sprites_jogador = self.sprites_personagens[personagem_encontrado]
                elif skeleton_encontrado:
                    self.sprites_jogador = self.sprites_personagens[skeleton_encontrado]
                
                if ghost_encontrado:
                    self.sprites_inimigo = self.sprites_personagens[ghost_encontrado]
                elif kastle_encontrado:
                    self.sprites_inimigo = self.sprites_personagens[kastle_encontrado]
                
                # === NOVO === Atribui sprites aos inimigos após carregamento
                if hasattr(self, 'sprites_inimigo'):
                    for inimigo in self.inimigos:
                        inimigo['sprites'] = self.sprites_inimigo
                
                # Fallback se não encontrar os específicos
                if not hasattr(self, 'sprites_jogador') and len(personagens_carregados) >= 1:
                    self.sprites_jogador = self.sprites_personagens[personagens_carregados[0]]
                
                if not hasattr(self, 'sprites_inimigo') and len(personagens_carregados) >= 2:
                    self.sprites_inimigo = self.sprites_personagens[personagens_carregados[1]]
                elif not hasattr(self, 'sprites_inimigo') and hasattr(self, 'sprites_jogador'):
                    self.sprites_inimigo = self.sprites_jogador
            
            # Fallback para estrutura antiga se não encontrar a nova
            if not hasattr(self, 'sprites_jogador'):
                self.carregar_sprites_legado()
                
        except Exception as e:
            print(f"❌ Erro ao carregar sprites: {e}")
            self.carregar_sprites_legado()
    
    def carregar_sprites_legado(self):
        """Sistema antigo de carregamento para compatibilidade"""
        print("🔄 Usando sistema legado de sprites...")
        # Código do sistema antigo aqui se necessário
    
    def extrair_sprite(self, sprite_data, frame_index):
        """Extrai um frame específico do sprite sheet"""
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
        
    def criar_botoes(self):
        # Botão jogar no menu
        self.botoes['jogar'] = {
            'rect': pygame.Rect(LARGURA//2 - 100, ALTURA//2 + 50, 200, 60),
            'texto': 'JOGAR',
            'ativo': True
        }
        
        # === NOVO === Botões de Menu Principal (substituem os antigos) - Molduras maiores
        self.botoes['ataques'] = {
            'rect': pygame.Rect(80, ALTURA - 130, 240, 90),  # Aumentado: 200->240, 80->90
            'texto': 'ATAQUES',
            'ativo': True
        }
        self.botoes['loja_menu'] = {
            'rect': pygame.Rect(340, ALTURA - 130, 240, 90),  # Aumentado: 200->240, 80->90
            'texto': 'LOJA',
            'ativo': True
        }
        self.botoes['status'] = {
            'rect': pygame.Rect(600, ALTURA - 130, 160, 90),  # Aumentado: 120->160, 80->90
            'texto': 'STATUS',
            'ativo': True
        }
        
        # Botões de escolha de ataque (aparecem no menu de seleção) - Molduras maiores
        self.botoes['pedra'] = {
            'rect': pygame.Rect(50, 0, 180, 70),  # Aumentado: 150->180, 60->70
            'texto': 'PEDRA',
            'ativo': True
        }
        self.botoes['papel'] = {
            'rect': pygame.Rect(250, 0, 180, 70),  # Aumentado: 150->180, 60->70
            'texto': 'PAPEL',
            'ativo': True
        }
        self.botoes['tesoura'] = {
            'rect': pygame.Rect(450, 0, 180, 70),  # Aumentado: 150->180, 60->70
            'texto': 'TESOURA',
            'ativo': True
        }
        
        # Botão reiniciar
        self.botoes['reiniciar'] = {
            'rect': pygame.Rect(LARGURA//2 - 100, ALTURA//2 + 100, 200, 60),
            'texto': 'NOVO JOGO',
            'ativo': True
        }
    
    def desenhar_botao(self, botao_key, mouse_pos):
        botao = self.botoes[botao_key]
        if not botao['ativo']:
            return
            
        # Verifica se o mouse está sobre o botão
        hover = botao['rect'].collidepoint(mouse_pos)
        
        # Usa moldura personalizada se disponível
        if self.moldura_itens:
            # Escala a moldura para o tamanho do botão
            moldura_escalada = pygame.transform.scale(self.moldura_itens, (botao['rect'].width, botao['rect'].height))
            
            # Aplica um filtro de cor se hover
            if hover:
                # Cria uma superfície com transparência para o efeito hover
                overlay = pygame.Surface((botao['rect'].width, botao['rect'].height))
                overlay.fill((255, 255, 255))
                overlay.set_alpha(30)  # Transparência leve
                moldura_escalada.blit(overlay, (0, 0), special_flags=pygame.BLEND_ALPHA_SDL2)
            
            # Desenha a moldura
            self.tela.blit(moldura_escalada, botao['rect'])
        else:
            # Fallback para moldura desenhada
            cor = CINZA_CLARO if hover else CINZA
            pygame.draw.rect(self.tela, cor, botao['rect'])
            pygame.draw.rect(self.tela, PRETO, botao['rect'], 3)
        
        # Desenha o texto
        texto = self.fonte_texto.render(botao['texto'], True, BRANCO)  # Alterado: PRETO -> BRANCO
        texto_rect = texto.get_rect(center=botao['rect'].center)
        self.tela.blit(texto, texto_rect)
    
    def verificar_clique_botao(self, pos):
        for key, botao in self.botoes.items():
            if botao['ativo'] and botao['rect'].collidepoint(pos):
                return key
        return None
    
    def desenhar_menu(self):
        self.tela.fill(AZUL)
        
        # Título
        titulo = self.fonte_titulo.render("JOKENGHOST", True, BRANCO)
        titulo_rect = titulo.get_rect(center=(LARGURA//2, ALTURA//3))
        self.tela.blit(titulo, titulo_rect)
        
        # Subtítulo
        subtitulo = self.fonte_texto.render("Caçada em Turnos", True, BRANCO)
        subtitulo_rect = subtitulo.get_rect(center=(LARGURA//2, ALTURA//3 + 80))
        self.tela.blit(subtitulo, subtitulo_rect)
        
        # Botão jogar
        mouse_pos = pygame.mouse.get_pos()
        self.desenhar_botao('jogar', mouse_pos)

        # === NOVO === HUD Dinheiro
        self.desenhar_hud_dinheiro()
    
    def desenhar_transicao(self):
        self.tela.fill(PRETO)
        
        # Efeito de fade
        superficie_fade = pygame.Surface((LARGURA, ALTURA))
        superficie_fade.fill(BRANCO)
        superficie_fade.set_alpha(self.transicao_alpha)
        self.tela.blit(superficie_fade, (0, 0))
        
        # Texto de transição
        if self.transicao_alpha > 128:
            texto = self.fonte_titulo.render("UM GHOST APARECEU!", True, PRETO)
            texto_rect = texto.get_rect(center=(LARGURA//2, ALTURA//2))
            self.tela.blit(texto, texto_rect)

        # === NOVO === HUD Dinheiro
        self.desenhar_hud_dinheiro()
    
    def desenhar_barra_vida(self, x, y, vida_atual, vida_maxima, cor, largura=200):
        # Fundo da barra
        pygame.draw.rect(self.tela, PRETO, (x-2, y-2, largura+4, 24))
        pygame.draw.rect(self.tela, CINZA, (x, y, largura, 20))
        
        # Barra de vida
        vida_porcentagem = vida_atual / vida_maxima
        largura_vida = int(largura * vida_porcentagem)
        pygame.draw.rect(self.tela, cor, (x, y, largura_vida, 20))
        
        # Texto da vida
        texto_vida = self.fonte_pequena.render(f"{vida_atual}/{vida_maxima}", True, BRANCO)
        self.tela.blit(texto_vida, (x + largura//2 - texto_vida.get_width()//2, y - 25))
    
    def desenhar_personagem(self, x, y, largura, altura, cor, nome, sprites_personagem=None, animacao="idle", frame=0, espelhar=False, shake_data=None):
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
    
    def desenhar_batalha(self):
        # === NOVO === Fundo de Batalha da pasta Scenes
        if self.fundo_batalha:
            self.tela.blit(self.fundo_batalha, (0, 0))
        else:
            # Fallback para fundo padrão
            self.tela.fill(VERDE)
            # Desenha o chão com perspectiva
            pygame.draw.rect(self.tela, (34, 139, 34), (0, ALTURA - 150, LARGURA, 150))
        
        # === NOVO === Personagem Jogador
        animacao_jogador = "idle" if self.estado_animacao_jogador == EstadoAnimacao.IDLE else "ataque"
        coordenadas_jogador = self.desenhar_personagem(self.jogador_pos_x, ALTURA - 280, 120, 140, AZUL, "", 
                                                      sprites_personagem=self.sprites_jogador, animacao=animacao_jogador, 
                                                      frame=self.frame_atual_jogador, espelhar=False, shake_data=self.shake_jogador)
        
        # === NOVO === Todos os inimigos visíveis (ordenados por profundidade)
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
                                               self.vida_jogador_visual, self.vida_max_jogador, "VOCÊ")
        
        # Texto de informação sobre inimigos ativos
        inimigos_vivos = sum(1 for inimigo in self.inimigos if inimigo['ativo'] and inimigo['vida_atual'] > 0)
        inimigo_frente = self.get_inimigo_na_frente()
        inimigo_frente_nome = inimigo_frente['nome'] if inimigo_frente else "Nenhum"
        texto_info = self.fonte_pequena.render(f"Inimigo da frente: {inimigo_frente_nome} | Total: {inimigos_vivos} | Pressione R para gerar novos", True, BRANCO)
        fundo_texto = pygame.Rect(10, ALTURA - 40, texto_info.get_width() + 10, 30)
        pygame.draw.rect(self.tela, PRETO, fundo_texto, border_radius=5)
        self.tela.blit(texto_info, (15, ALTURA - 35))
        
        # === NOVO === Botões Principais (só aparecem se não está na animação de entrada e menu não está ativo)
        if not self.animacao_entrada_ativa and not self.menu_selecao_ativo:
            mouse_pos = pygame.mouse.get_pos()
            self.desenhar_botao('ataques', mouse_pos)
            self.desenhar_botao('loja_menu', mouse_pos)
            self.desenhar_botao('status', mouse_pos)
        
        # === NOVO === Menu de Seleção Animado
        if self.menu_selecao_ativo:
            self.desenhar_menu_selecao()
        
        # Mostra as escolhas se houver
        if self.escolha_jogador and self.escolha_inimigo and not self.animacao_entrada_ativa:
            escolha_jogador_texto = self.escolha_jogador.name
            escolha_inimigo_texto = self.escolha_inimigo.name
            
            # Mostra qual inimigo está atacando (o da frente)
            inimigo_frente = self.get_inimigo_na_frente()
            nome_inimigo = inimigo_frente['nome'] if inimigo_frente else "Ghost"
            
            # Caixa de texto estilo Pokémon
            caixa_texto = pygame.Rect(50, ALTURA - 200, LARGURA - 100, 80)
            pygame.draw.rect(self.tela, BRANCO, caixa_texto, border_radius=10)
            pygame.draw.rect(self.tela, PRETO, caixa_texto, 3, border_radius=10)
            
            texto_jogador = self.fonte_texto.render(f"Você usou: {escolha_jogador_texto}", True, PRETO)
            texto_inimigo = self.fonte_texto.render(f"{nome_inimigo} usou: {escolha_inimigo_texto}", True, PRETO)
            
            self.tela.blit(texto_jogador, (caixa_texto.x + 10, caixa_texto.y + 10))
            self.tela.blit(texto_inimigo, (caixa_texto.x + 10, caixa_texto.y + 40))
            
            # Resultado da batalha
            if self.resultado_batalha:
                cor_resultado = VERDE if "Você ganhou" in self.resultado_batalha else VERMELHO if "perdeu" in self.resultado_batalha else AMARELO
                texto_resultado = self.fonte_titulo.render(self.resultado_batalha, True, cor_resultado)
                resultado_rect = texto_resultado.get_rect(center=(LARGURA//2, ALTURA//2))
                
                # Fundo para o texto do resultado
                fundo_resultado = pygame.Rect(resultado_rect.x - 20, resultado_rect.y - 10, 
                                            resultado_rect.width + 40, resultado_rect.height + 20)
                pygame.draw.rect(self.tela, BRANCO, fundo_resultado, border_radius=15)
                pygame.draw.rect(self.tela, PRETO, fundo_resultado, 3, border_radius=15)
                
                self.tela.blit(texto_resultado, resultado_rect)

        # === NOVO === Moedas Flutuantes
        self.desenhar_moedas_flutuantes()

        # HUD Dinheiro
        self.desenhar_hud_dinheiro()
    
    def desenhar_menu_selecao(self):
        """Desenha o menu de seleção animado"""
        # Posição do menu (desliza de baixo para cima)
        menu_y = ALTURA - self.menu_altura
        menu_rect = pygame.Rect(0, menu_y, LARGURA, self.menu_altura)
        
        # Fundo do menu
        pygame.draw.rect(self.tela, (240, 240, 250), menu_rect, border_radius=20)
        pygame.draw.rect(self.tela, PRETO, menu_rect, 3, border_radius=20)
        
        if self.menu_altura > 50:  # Só desenha conteúdo quando menu está suficientemente aberto
            # Título do menu
            titulo = ""
            if self.tipo_menu_atual == TipoMenu.ATAQUES:
                titulo = "ESCOLHA SEU ATAQUE"
                self.desenhar_menu_ataques(menu_y)
            elif self.tipo_menu_atual == TipoMenu.LOJA:
                titulo = "LOJA - COMPRAR ITENS"
                self.desenhar_menu_loja(menu_y)
            
            # Desenha título
            if titulo:
                texto_titulo = self.fonte_titulo.render(titulo, True, BRANCO)  # Alterado: PRETO -> BRANCO
                titulo_x = (LARGURA - texto_titulo.get_width()) // 2
                self.tela.blit(texto_titulo, (titulo_x, menu_y + 20))
            
            # Botão fechar (X no canto superior direito) - Moldura maior
            botao_fechar = pygame.Rect(LARGURA - 70, menu_y + 10, 50, 50)  # Aumentado: 60->70, 40->50
            
            # Usa moldura personalizada para o botão fechar se disponível
            if self.moldura_itens:
                moldura_fechar = pygame.transform.scale(self.moldura_itens, (50, 50))  # Aumentado: 40->50
                # Aplica um filtro vermelho para indicar fechar
                overlay = pygame.Surface((50, 50))  # Aumentado: 40->50
                overlay.fill((255, 0, 0))
                overlay.set_alpha(60)
                moldura_fechar.blit(overlay, (0, 0), special_flags=pygame.BLEND_ALPHA_SDL2)
                self.tela.blit(moldura_fechar, botao_fechar)
            else:
                # Fallback para botão desenhado
                pygame.draw.rect(self.tela, VERMELHO, botao_fechar, border_radius=20)
                pygame.draw.rect(self.tela, PRETO, botao_fechar, 2, border_radius=20)
            
            texto_x = self.fonte_titulo.render("×", True, BRANCO)
            x_rect = texto_x.get_rect(center=botao_fechar.center)
            self.tela.blit(texto_x, x_rect)
            # Texto "X" no botão fechar
            texto_x = self.fonte_texto.render("X", True, BRANCO)
            texto_x_rect = texto_x.get_rect(center=botao_fechar.center)
            self.tela.blit(texto_x, texto_x_rect)
            
            self._botao_fechar_menu = botao_fechar
    
    def desenhar_menu_ataques(self, menu_y):
        """Desenha os botões de ataque dentro do menu"""
        mouse_pos = pygame.mouse.get_pos()
        base_y = menu_y + 80
        
        # Atualiza posições Y dos botões de ataque
        for i, key in enumerate(['pedra', 'papel', 'tesoura']):
            self.botoes[key]['rect'].y = base_y + 20
            self.desenhar_botao(key, mouse_pos)
        
        # Informações sobre cada ataque
        info_y = base_y + 100
        infos = [
            ("PEDRA: Efetivo vs Ghost (+60 moedas)", VERDE),
            ("PAPEL: Médio vs Ghost (+25 moedas)", AMARELO),
            ("TESOURA: Bom vs Ghost (+35 moedas)", (255, 140, 0))
        ]
        
        for i, (info, cor) in enumerate(infos):
            texto = self.fonte_pequena.render(info, True, cor)
            self.tela.blit(texto, (50 + i * 180, info_y))
    
    def desenhar_menu_loja(self, menu_y):
        """Desenha os itens da loja dentro do menu"""
        mouse_pos = pygame.mouse.get_pos()
        base_y = menu_y + 80
        
        self._botoes_itens_menu = []  # Lista para cliques
        
        for i, item in enumerate(self.itens_loja):
            item_rect = pygame.Rect(50 + i * 220, base_y, 200, 140)  # Aumentado: 180->200, 120->140
            hover = item_rect.collidepoint(mouse_pos)
            
            # Verifica se tem dinheiro suficiente
            pode_comprar = self.dinheiro >= item['preco']  # Corrigido: usar self.dinheiro
            
            # Usa moldura personalizada se disponível
            if self.moldura_itens:
                # Escala a moldura para o tamanho do item
                moldura_escalada = pygame.transform.scale(self.moldura_itens, (item_rect.width, item_rect.height))
                
                # Aplica filtros baseado no estado
                if hover and pode_comprar:
                    # Efeito hover (mais brilhante)
                    overlay = pygame.Surface((item_rect.width, item_rect.height))
                    overlay.fill((255, 255, 255))
                    overlay.set_alpha(40)
                    moldura_escalada.blit(overlay, (0, 0), special_flags=pygame.BLEND_ALPHA_SDL2)
                elif not pode_comprar:
                    # Efeito desabilitado (mais escuro)
                    overlay = pygame.Surface((item_rect.width, item_rect.height))
                    overlay.fill((0, 0, 0))
                    overlay.set_alpha(100)
                    moldura_escalada.blit(overlay, (0, 0), special_flags=pygame.BLEND_ALPHA_SDL2)
                
                # Desenha a moldura
                self.tela.blit(moldura_escalada, item_rect)
            else:
                # Fallback para moldura desenhada
                cor_fundo = CINZA_CLARO if hover and pode_comprar else CINZA if pode_comprar else (100, 100, 100)
                pygame.draw.rect(self.tela, cor_fundo, item_rect, border_radius=10)
                pygame.draw.rect(self.tela, PRETO, item_rect, 3, border_radius=10)
            
            # Nome do item
            nome_texto = self.fonte_texto.render(item['nome'], True, BRANCO)  # Alterado: PRETO -> BRANCO
            nome_rect = nome_texto.get_rect(center=(item_rect.centerx, item_rect.y + 25))
            self.tela.blit(nome_texto, nome_rect)
            
            # Preço
            preco_texto = self.fonte_titulo.render(f"${item['preco']}", True, VERDE if pode_comprar else VERMELHO)
            preco_rect = preco_texto.get_rect(center=(item_rect.centerx, item_rect.y + 60))
            self.tela.blit(preco_texto, preco_rect)
            
            # Descrição do efeito
            efeito_map = {
                "cura_pequena": "+30 HP",
                "cura_grande": "+60 HP", 
                "buff_ofensivo": "-15 HP inimigo"
            }
            efeito_texto = self.fonte_pequena.render(efeito_map.get(item['efeito'], "?"), True, BRANCO)  # Alterado: PRETO -> BRANCO
            efeito_rect = efeito_texto.get_rect(center=(item_rect.centerx, item_rect.y + 90))
            self.tela.blit(efeito_texto, efeito_rect)
            
            self._botoes_itens_menu.append((item_rect, item, pode_comprar))
    
    def desenhar_barra_vida_automatica(self, sprite_x, sprite_y, sprite_largura, sprite_altura, vida_atual, vida_maxima, nome, largura_barra=150, mostrar_numeros=True):
        """Desenha barra de vida automaticamente posicionada 40px acima da sprite e centralizada"""
        # Calcula posição da barra (40px acima da sprite e centralizada)
        barra_x = sprite_x + (sprite_largura - largura_barra) // 2  # Centraliza horizontalmente
        barra_y = sprite_y - 40 - 50  # 40px acima + altura da própria barra (50px ao invés de 60px)
        
        # Garante que a barra não saia da tela
        if barra_x < 10:
            barra_x = 10
        elif barra_x + largura_barra > LARGURA - 10:
            barra_x = LARGURA - largura_barra - 10
        
        if barra_y < 10:
            barra_y = 10
        
        # Desenha a barra com o novo sistema automático
        self.desenhar_barra_vida_pokemon(barra_x, barra_y, vida_atual, vida_maxima, VERDE, nome, largura_barra, mostrar_numeros)
    
    def desenhar_barra_vida_pokemon(self, x, y, vida_atual, vida_maxima, cor, nome, largura=200, mostrar_numeros=True):
        """Desenha barras de vida no estilo Pokémon"""
        # Caixa principal da barra (reduzida de 60 para 50)
        caixa = pygame.Rect(x, y, largura, 50)
        pygame.draw.rect(self.tela, BRANCO, caixa, border_radius=10)
        pygame.draw.rect(self.tela, PRETO, caixa, 3, border_radius=10)
        
        # Nome do personagem (fonte menor)
        texto_nome = self.fonte_pequena.render(nome, True, PRETO)
        self.tela.blit(texto_nome, (x + 10, y + 5))
        
        # Barra de vida
        barra_x = x + 10
        barra_y = y + 25  # Ajustado para nova altura
        barra_largura = largura - 20
        barra_altura = 18
        
        # Fundo da barra
        pygame.draw.rect(self.tela, CINZA, (barra_x, barra_y, barra_largura, barra_altura), border_radius=5)
        
        # Vida atual
        vida_porcentagem = vida_atual / vida_maxima
        largura_vida = int(barra_largura * vida_porcentagem)
        
        # Cor baseada na porcentagem de vida
        if vida_porcentagem > 0.6:
            cor_vida = VERDE
        elif vida_porcentagem > 0.3:
            cor_vida = AMARELO
        else:
            cor_vida = VERMELHO
            
        pygame.draw.rect(self.tela, cor_vida, (barra_x, barra_y, largura_vida, barra_altura), border_radius=5)
        
        # === NOVO === Texto da vida só para o jogador
        if mostrar_numeros:
            texto_vida = self.fonte_pequena.render(f"{vida_atual:.0f}/{vida_maxima}", True, PRETO)
            self.tela.blit(texto_vida, (barra_x + barra_largura - texto_vida.get_width(), y + 5))
    
    def desenhar_resultado(self):
        self.tela.fill(PRETO)
        
        if self.vida_jogador <= 0:
            texto_principal = "VOCÊ FOI DERROTADO!"
            cor_texto = VERMELHO
        else:
            texto_principal = "VOCÊ VENCEU!"
            cor_texto = VERDE
        
        texto = self.fonte_titulo.render(texto_principal, True, cor_texto)
        texto_rect = texto.get_rect(center=(LARGURA//2, ALTURA//2 - 50))
        self.tela.blit(texto, texto_rect)
        
        # Botão reiniciar
        mouse_pos = pygame.mouse.get_pos()
        self.desenhar_botao('reiniciar', mouse_pos)

        # === NOVO === HUD Dinheiro
        self.desenhar_hud_dinheiro()
    
    def determinar_vencedor(self, jogador, inimigo):
        if jogador == inimigo:
            return "Empate!"
        
        vitorias = {
            (Escolha.PEDRA, Escolha.TESOURA): True,
            (Escolha.PAPEL, Escolha.PEDRA): True,
            (Escolha.TESOURA, Escolha.PAPEL): True
        }
        
        if (jogador, inimigo) in vitorias:
            self.vida_inimigo -= 20
            # === NOVO === Shake no inimigo quando toma dano
            self.iniciar_shake_personagem(eh_jogador=False, intensidade=15)
            return "Você ganhou a rodada!"
        else:
            self.vida_jogador -= 20
            # === NOVO === Shake no jogador quando toma dano
            self.iniciar_shake_personagem(eh_jogador=True, intensidade=15)
            # Ativa animação de ataque do inimigo quando ele vence
            self.iniciar_animacao_ataque_inimigo()
            return "Você perdeu a rodada!"
    
    def calcular_recompensa(self, escolha_jogador, vitoria):
        """Calcula recompensa baseada no tipo de ataque e se ganhou"""
        if not vitoria:
            return 0
            
        # Sistema de recompensas baseado no tipo contra o Ghost
        recompensas = {
            Escolha.PEDRA: 60,    # Máxima efetividade contra Ghost
            Escolha.PAPEL: 25,    # Efetividade média
            Escolha.TESOURA: 35   # Efetividade boa
        }
        
        return recompensas.get(escolha_jogador, 30)  # Fallback
    
    # === NOVO === Aplicar recompensas de vitória ao fim da batalha
    def pagar_recompensa_se_preciso(self):
        """Função legada - não mais utilizada com o sistema de múltiplos inimigos"""
        pass
    
    def iniciar_animacao_ataque_inimigo(self):
        """Inicia a animação de ataque do inimigo"""
        if hasattr(self, 'sprites_inimigo') and 'ataque' in self.sprites_inimigo:
            self.estado_animacao_inimigo = EstadoAnimacao.ATAQUE
            self.animacao_ataque_inimigo_ativa = True
            self.tempo_inicio_ataque = pygame.time.get_ticks()
            self.frame_atual_inimigo = 0
            print("🎬 Iniciando animação de ataque do inimigo!")
        else:
            print("⚠️ Sprite de ataque não encontrada para o inimigo")
    
    def processar_turno(self, escolha_jogador):
        """Processa o turno com sistema de rotação visual de inimigos"""
        # Bloqueia outras ações durante o turno
        self.turno_em_andamento = True
        
        self.escolha_jogador = escolha_jogador
        
        # Verifica se há inimigos vivos
        inimigos_vivos = [inimigo for inimigo in self.inimigos if inimigo['ativo'] and inimigo['vida_atual'] > 0]
        
        if not inimigos_vivos:
            # Sem inimigos vivos - jogador venceu
            recompensa = len(self.inimigos) * 60
            self.resultado_batalha = f"Vitória total! +{recompensa} moedas!"
            self.dinheiro += recompensa  # Corrigido: usar self.dinheiro
            print(f"💰 Vitória total! Ganhou {recompensa} moedas! Total: {self.dinheiro}")
            pygame.time.set_timer(pygame.USEREVENT + 1, 2000)
            return
        
        # Encontra o inimigo que está na frente (z_order = 3)
        inimigo_atual = self.get_inimigo_na_frente()
        
        if not inimigo_atual:
            # Se não há inimigo na frente, pega o primeiro vivo
            inimigo_atual = inimigos_vivos[0]
        
        self.escolha_inimigo = random.choice(list(Escolha))
        
        # Determina resultado do combate
        if self.escolha_jogador == self.escolha_inimigo:
            resultado = "empate"
        else:
            vitorias = {
                (Escolha.PEDRA, Escolha.TESOURA): True,
                (Escolha.PAPEL, Escolha.PEDRA): True,
                (Escolha.TESOURA, Escolha.PAPEL): True
            }
            resultado = "jogador" if (self.escolha_jogador, self.escolha_inimigo) in vitorias else "inimigo"
        
        # Aplica dano baseado no resultado
        if resultado == "jogador":
            dano = 25
            inimigo_atual['vida_atual'] -= dano
            
            # Adiciona dinheiro por acerto
            recompensa_acerto = 15
            self.dinheiro += recompensa_acerto
            
            # Cria moeda flutuante na posição do inimigo
            self.criar_moeda_flutuante(recompensa_acerto, inimigo_atual['pos_x'] + 50, inimigo_atual['pos_y'] - 30)
            
            if inimigo_atual['vida_atual'] <= 0:
                inimigo_atual['vida_atual'] = 0
                inimigo_atual['ativo'] = False
                self.resultado_batalha = f"{inimigo_atual['nome']} derrotado! +{recompensa_acerto} moedas!"
                
                # Verifica se há inimigos restantes e define novo atual
                inimigos_restantes = [i for i in self.inimigos if i['ativo'] and i['vida_atual'] > 0]
                if len(inimigos_restantes) > 0:
                    # Define o primeiro inimigo restante como atual
                    self.inimigo_atual_index = self.inimigos.index(inimigos_restantes[0])
                    print(f"👁️ Novo inimigo da frente: {inimigos_restantes[0]['nome']}")
            else:
                self.resultado_batalha = f"Acertou {inimigo_atual['nome']}! +{recompensa_acerto} moedas!"
            
            # Shake no inimigo (usando função adequada)
            self.iniciar_shake_personagem(eh_jogador=False, intensidade=12)
            
        elif resultado == "inimigo":
            dano = 20
            self.vida_jogador -= dano
            if self.vida_jogador <= 0:
                self.vida_jogador = 0
            
            # Shake no jogador (usando função adequada)
            self.iniciar_shake_personagem(eh_jogador=True, intensidade=15)
            
            self.resultado_batalha = f"{inimigo_atual['nome']} te acertou!"
        else:
            self.resultado_batalha = "Empate!"
        
        self.tempo_resultado = pygame.time.get_ticks()
        
        # Verifica condições de fim de jogo
        if self.vida_jogador <= 0:
            self.resultado_batalha = "Você perdeu! (Clique para nova batalha)"
            pygame.time.set_timer(pygame.USEREVENT + 1, 2000)
            return
        
        # Verifica se todos os inimigos morreram
        inimigos_restantes = [i for i in self.inimigos if i['ativo'] and i['vida_atual'] > 0]
        if len(inimigos_restantes) == 0:
            recompensa = len(self.inimigos) * 60
            self.resultado_batalha = f"Vitória! +{recompensa} moedas!"
            self.dinheiro += recompensa  # Corrigido: usar self.dinheiro ao invés de self.dinheiro_jogador
            print(f"💰 Vitória! Ganhou {recompensa} moedas! Total: {self.dinheiro}")
            pygame.time.set_timer(pygame.USEREVENT + 1, 2000)
            return
        
        # Não inicia rotação imediatamente - será feito quando a mensagem desaparecer
    
    def reiniciar_jogo(self):
        """Reinicia o jogo gerando novos inimigos aleatórios"""
        self.vida_jogador = self.vida_max_jogador
        self.vida_jogador_visual = self.vida_max_jogador
        
        # Gera novos inimigos aleatórios
        self.gerar_inimigos_aleatorios()
        
        self.escolha_jogador = None
        self.escolha_inimigo = None
        self.resultado_batalha = ""
        self.tempo_resultado = 0
        
        # Reset sistema de rotação
        self.aguardando_proximo_inimigo = False
        self.animacao_rotacao_ativa = False
        self.progresso_rotacao = 0.0
        
        # Reset animações
        self.animacao_entrada_ativa = False
        self.estado_animacao_jogador = EstadoAnimacao.IDLE
        
        # Reset shake effects
        self.shake_jogador = {'ativo': False, 'x': 0, 'y': 0, 'tempo': 0}
        
        inimigos_count = len([i for i in self.inimigos if i['ativo']])
        print(f"🔄 Jogo reiniciado! Novos inimigos: {inimigos_count}")
        self.tempo_resultado = 0
        self.estado = EstadoJogo.MENU
        # === NOVO === reset de recompensa/loja e animações
        self.recompensa_paga = False
        self.loja_aberta = False
        self.mensagem_loja = ""
        self.animacao_entrada_ativa = False
        self.jogador_pos_x = self.jogador_pos_final
        self.inimigo_pos_x = self.inimigo_pos_final
        # === NOVO === reset do sistema de menu e animações visuais
        self.menu_selecao_ativo = False
        self.menu_altura = 0
        self.shake_jogador = {'ativo': False, 'intensidade': 0, 'tempo': 0, 'offset_x': 0, 'offset_y': 0}
        self.shake_inimigo = {'ativo': False, 'intensidade': 0, 'tempo': 0, 'offset_x': 0, 'offset_y': 0}
        self.vida_jogador_visual = self.vida_max_jogador
        self.vida_inimigo_visual = self.vida_max_inimigo
        self.modo_demonstracao = False
    
    # === NOVO === HUD Dinheiro com Moldura
    def desenhar_hud_dinheiro(self):
        # Posição da moldura/dinheiro (canto superior direito)
        x = LARGURA - 130
        y = 10
        
        # Desenha a moldura se disponível
        if self.moldura_dinheiro:
            self.tela.blit(self.moldura_dinheiro, (x, y))
        else:
            # Fallback para moldura desenhada
            caixa = pygame.Rect(x, y, 120, 40)
            pygame.draw.rect(self.tela, PRETO, caixa, border_radius=8)
            pygame.draw.rect(self.tela, CINZA, caixa, 2, border_radius=8)
        
        # Texto apenas com o valor (sem "Dinheiro:")
        txt = self.fonte_pequena.render(f"${self.dinheiro}", True, BRANCO)
        # Centraliza o texto na moldura
        text_rect = txt.get_rect(center=(x + 60, y + 20))
        self.tela.blit(txt, text_rect)

    # === NOVO === Comprar item (efeito consumível imediato)
    def comprar_item(self, item):
        if self.dinheiro < item['preco']:  # Corrigido: usar self.dinheiro
            self.mensagem_loja = "Dinheiro insuficiente!"
            print(self.mensagem_loja)
            return
        
        self.dinheiro -= item['preco']  # Corrigido: usar self.dinheiro
        efeito = item['efeito']
        
        if efeito == "cura_pequena":
            cura = min(30, self.vida_max_jogador - self.vida_jogador)
            self.vida_jogador = min(self.vida_max_jogador, self.vida_jogador + 30)
            self.mensagem_loja = f"Poção usada! +{cura} HP."
        elif efeito == "cura_grande":
            cura = min(60, self.vida_max_jogador - self.vida_jogador)
            self.vida_jogador = min(self.vida_max_jogador, self.vida_jogador + 60)
            self.mensagem_loja = f"Poção Grande usada! +{cura} HP."
        elif efeito == "buff_ofensivo":
            dano = min(15, self.vida_inimigo)
            self.vida_inimigo = max(0, self.vida_inimigo - 15)
            self.mensagem_loja = f"Buff aplicado! -{dano} HP no inimigo."
        else:
            self.mensagem_loja = "Item usado."
            
        print(f"Comprou: {item['nome']} | {self.mensagem_loja}")

    def processar_eventos(self):
        for evento in pygame.event.get():
            if evento.type == pygame.QUIT:
                return False
            
            elif evento.type == pygame.USEREVENT + 1:  # Timer para transição para resultado
                # === NOVO === pagar recompensa quando entra no resultado, se for vitória
                self.pagar_recompensa_se_preciso()
                self.estado = EstadoJogo.RESULTADO
                pygame.time.set_timer(pygame.USEREVENT + 1, 0)  # Cancela o timer
            
            # === NOVO === Eventos de Teclado
            elif evento.type == pygame.KEYDOWN:
                if evento.key == pygame.K_r and self.estado == EstadoJogo.BATALHA:
                    # Gera novos inimigos aleatórios
                    if not self.menu_selecao_ativo:  # Só se não tem menu ativo
                        self.gerar_inimigos_aleatorios()
                        self.escolha_jogador = None
                        self.escolha_inimigo = None
                        self.resultado_batalha = ""
                        # Reset vida do jogador para nova batalha
                        self.vida_jogador = self.vida_max_jogador
                        self.vida_jogador_visual = self.vida_max_jogador
                        # Reset sistema de rotação
                        self.aguardando_proximo_inimigo = False
                        self.animacao_rotacao_ativa = False
                        self.progresso_rotacao = 0.0
                        inimigos_count = len([i for i in self.inimigos if i['ativo']])
                        print(f"🔄 Novos inimigos gerados: {inimigos_count} inimigos!")
            
            elif evento.type == pygame.MOUSEBUTTONDOWN:
                if evento.button == 1:  # Clique esquerdo
                    botao_clicado = self.verificar_clique_botao(evento.pos)
                    
                    if self.estado == EstadoJogo.MENU and botao_clicado == 'jogar':
                        self.estado = EstadoJogo.TRANSICAO
                        self.transicao_alpha = 0
                    
                    elif self.estado == EstadoJogo.BATALHA:
                        # === NOVO === Prioridade para menus ativos
                        if self.menu_selecao_ativo:
                            # Verifica clique no botão fechar
                            if hasattr(self, '_botao_fechar_menu') and self._botao_fechar_menu.collidepoint(evento.pos):
                                self.fechar_menu_selecao()
                                return True
                            
                            # Verifica cliques nos itens do menu
                            if self.tipo_menu_atual == TipoMenu.ATAQUES:
                                # Cliques nos botões de ataque
                                if botao_clicado in ['pedra', 'papel', 'tesoura']:
                                    if not self.escolha_jogador:  # Só processa se ainda não escolheu
                                        escolha_map = {
                                            'pedra': Escolha.PEDRA,
                                            'papel': Escolha.PAPEL,
                                            'tesoura': Escolha.TESOURA
                                        }
                                        self.processar_turno(escolha_map[botao_clicado])
                                        self.fechar_menu_selecao()
                            
                            elif self.tipo_menu_atual == TipoMenu.LOJA:
                                # Cliques nos itens da loja
                                for rect, item, pode_comprar in getattr(self, '_botoes_itens_menu', []):
                                    if rect.collidepoint(evento.pos) and pode_comprar:
                                        self.comprar_item(item)
                                        return True
                            
                            return True  # Bloqueia outros cliques quando menu está ativo
                        
                        # Só processa botões principais se não está na animação de entrada, menu não está ativo E turno não está em andamento
                        elif not self.animacao_entrada_ativa and not self.turno_em_andamento:
                            if botao_clicado == 'ataques':
                                self.abrir_menu_selecao(TipoMenu.ATAQUES)
                            elif botao_clicado == 'loja_menu':
                                self.abrir_menu_selecao(TipoMenu.LOJA)
                            elif botao_clicado == 'status':
                                # Mostra informações de status (pode implementar depois)
                                print(f"📊 Status - Vida: {self.vida_jogador}/{self.vida_max_jogador} | Dinheiro: ${self.dinheiro}")
                                # Por enquanto, só fecha qualquer menu aberto
                                if self.menu_selecao_ativo:
                                    self.fechar_menu_selecao()
                        elif self.turno_em_andamento:
                            print("⏳ Aguarde o turno terminar antes de realizar outra ação!")

                    elif self.estado == EstadoJogo.RESULTADO and botao_clicado == 'reiniciar':
                        self.reiniciar_jogo()
        
        return True
    
    def atualizar(self):
        if self.estado == EstadoJogo.TRANSICAO:
            self.transicao_alpha += self.transicao_direcao * 8
            if self.transicao_alpha >= 255:
                self.transicao_alpha = 255
                self.transicao_direcao = -1
            elif self.transicao_alpha <= 0 and self.transicao_direcao == -1:
                self.estado = EstadoJogo.BATALHA
                # === NOVO === Inicia animação de entrada
                self.iniciar_animacao_entrada()
        
        elif self.estado == EstadoJogo.BATALHA:
            tempo_atual = pygame.time.get_ticks()
            
            # === NOVO === Processa animação de entrada
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
            
            # === NOVO === Atualiza animação do menu
            if self.menu_selecao_ativo:
                if self.menu_altura < self.menu_altura_alvo:
                    self.menu_altura += self.velocidade_menu
                    if self.menu_altura > self.menu_altura_alvo:
                        self.menu_altura = self.menu_altura_alvo
            else:
                if self.menu_altura > 0:
                    self.menu_altura -= self.velocidade_menu
                    if self.menu_altura < 0:
                        self.menu_altura = 0
            
            # === NOVO === Atualiza shake effects
            self.atualizar_shake(self.shake_jogador)
            self.atualizar_shake(self.shake_inimigo)
            
            # === NOVO === Atualiza moedas flutuantes
            self.atualizar_moedas_flutuantes()
            
            # === NOVO === Atualiza sistema de rotação de inimigos
            self.atualizar_rotacao_inimigo()
            
            # === NOVO === Gerencia espera para próximo inimigo
            if self.aguardando_proximo_inimigo:
                if tempo_atual - self.tempo_espera_inimigo > 1000:  # 1 segundo de delay
                    self.aguardando_proximo_inimigo = False
                    self.iniciar_rotacao_inimigo()
            
            # === NOVO === Atualiza animação suave das barras de vida
            if self.vida_jogador_visual > self.vida_jogador:
                self.vida_jogador_visual -= self.velocidade_vida
                if self.vida_jogador_visual < self.vida_jogador:
                    self.vida_jogador_visual = self.vida_jogador
            elif self.vida_jogador_visual < self.vida_jogador:
                self.vida_jogador_visual += self.velocidade_vida
                if self.vida_jogador_visual > self.vida_jogador:
                    self.vida_jogador_visual = self.vida_jogador
            
            # === NOVO === Atualiza vida visual dos inimigos (todos os inimigos)
            for inimigo in self.inimigos:
                if inimigo['ativo']:
                    if inimigo['vida_visual'] > inimigo['vida_atual']:
                        inimigo['vida_visual'] -= self.velocidade_vida
                        if inimigo['vida_visual'] < inimigo['vida_atual']:
                            inimigo['vida_visual'] = inimigo['vida_atual']
                    elif inimigo['vida_visual'] < inimigo['vida_atual']:
                        inimigo['vida_visual'] += self.velocidade_vida
                        if inimigo['vida_visual'] > inimigo['vida_atual']:
                            inimigo['vida_visual'] = inimigo['vida_atual']
            
            # Gerencia animação de ataque do inimigo
            if self.animacao_ataque_inimigo_ativa:
                if tempo_atual - self.tempo_inicio_ataque >= self.duracao_ataque:
                    # Termina animação de ataque
                    self.animacao_ataque_inimigo_ativa = False
                    self.estado_animacao_inimigo = EstadoAnimacao.IDLE
                    self.frame_atual_inimigo = 0
                    print("🎬 Animação de ataque finalizada")
            
            # Anima jogador (sempre idle por enquanto)
            if hasattr(self, 'sprites_jogador') and 'idle' in self.sprites_jogador:
                if tempo_atual - self.tempo_animacao_jogador > 150:
                    sprite_data = self.sprites_jogador['idle']
                    max_frames = sprite_data['total_frames']  # Usa todos os frames detectados
                    self.frame_atual_jogador = (self.frame_atual_jogador + 1) % max_frames
                    self.tempo_animacao_jogador = tempo_atual
            
            # === NOVO === Anima todos os inimigos individuais
            for inimigo in self.inimigos:
                if inimigo['ativo'] and inimigo['sprites']:
                    if 'idle' in inimigo['sprites']:
                        sprite_data = inimigo['sprites']['idle']
                        total_frames = sprite_data['total_frames']
                        
                        # Velocidade baseada no número de frames
                        if total_frames <= 2:
                            velocidade = 800
                        elif total_frames <= 4:
                            velocidade = 400
                        else:
                            velocidade = 200
                        
                        if tempo_atual - inimigo['tempo_animacao'] > velocidade:
                            inimigo['frame_atual'] = (inimigo['frame_atual'] + 1) % total_frames
                            inimigo['tempo_animacao'] = tempo_atual
            
            # Limpa escolhas após 3 segundos (só se não está na animação de entrada)
            if (not self.animacao_entrada_ativa and self.tempo_resultado > 0 and 
                pygame.time.get_ticks() - self.tempo_resultado > 3000):
                if self.vida_jogador > 0:
                    # Verifica se há inimigos restantes para rotação
                    inimigos_restantes = [i for i in self.inimigos if i['ativo'] and i['vida_atual'] > 0]
                    
                    # Se há mais de 1 inimigo, inicia rotação
                    if len(inimigos_restantes) > 1 and not self.animacao_rotacao_ativa:
                        self.aguardando_proximo_inimigo = True
                        self.tempo_espera_inimigo = pygame.time.get_ticks()
                        print(f"⏳ Iniciando rotação após mensagem... ({len(inimigos_restantes)} restantes)")
                    
                    self.escolha_jogador = None
                    self.escolha_inimigo = None
                    self.resultado_batalha = ""
                    self.tempo_resultado = 0
                    
                    # Desbloqueia ações após o turno terminar
                    self.turno_em_andamento = False
    
    def desenhar(self):
        if self.estado == EstadoJogo.MENU:
            self.desenhar_menu()
        elif self.estado == EstadoJogo.TRANSICAO:
            self.desenhar_transicao()
        elif self.estado == EstadoJogo.BATALHA:
            self.desenhar_batalha()
        elif self.estado == EstadoJogo.RESULTADO:
            self.desenhar_resultado()
        
        pygame.display.flip()
    
    def executar(self):
        executando = True
        while executando:
            executando = self.processar_eventos()
            self.atualizar()
            self.desenhar()
            self.relogio.tick(FPS)
        
        pygame.quit()
        sys.exit()

def main():
    """Função principal para execução do jogo"""
    try:
        jogo = JokenGhost()
        jogo.executar()
    except Exception as e:
        import traceback
        print(f"❌ Erro ao executar o jogo: {e}")
        print("\nTraceback completo:")
        traceback.print_exc()
        input("Pressione Enter para sair...")
        sys.exit(1)

if __name__ == "__main__":
    main()

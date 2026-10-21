"""
Gerenciador de recursos centralizado para o jogo JokenGhost.
Responsável por carregar e gerenciar sprites, fontes, imagens e molduras.
"""

import pygame
import os
from config.constants import *

class ResourceManager:
    """Gerenciador centralizado de recursos do jogo."""
    
    def __init__(self):
        """Inicializa o gerenciador de recursos."""
        self.fontes = {}
        self.imagens = {}
        self.molduras = {}
        self.sprites = {}
        
    def carregar_todos_recursos(self):
        """Carrega todos os recursos do jogo."""
        self.carregar_fontes()
        self.carregar_imagens()
        self.carregar_molduras()
        self.carregar_sprites()
        
    def carregar_fontes(self):
        """Carrega e configura as fontes do jogo."""
        try:
            # Tentar carregar fontes Dogica
            fonte_base = os.path.join("dogica", "TTF", "dogicapixel.ttf")
            fonte_bold = os.path.join("dogica", "TTF", "dogicapixelbold.ttf")
            
            if os.path.exists(fonte_base):
                self.fontes['titulo'] = pygame.font.Font(fonte_base, FONTE_TITULO_TAMANHO)
                self.fontes['texto'] = pygame.font.Font(fonte_base, FONTE_TEXTO_TAMANHO)
                self.fontes['pequena'] = pygame.font.Font(fonte_base, FONTE_PEQUENA_TAMANHO)
                print("✅ Fontes Dogica carregadas!")
            else:
                raise FileNotFoundError("Fontes Dogica não encontradas")
                
            if os.path.exists(fonte_bold):
                self.fontes['bold'] = pygame.font.Font(fonte_bold, FONTE_BOLD_TAMANHO)
            else:
                self.fontes['bold'] = self.fontes['texto']
                
            # Fonte muito pequena
            self.fontes['muito_pequena'] = pygame.font.Font(fonte_base, 12) if os.path.exists(fonte_base) else pygame.font.Font(None, 12)
            
        except Exception as e:
            # Fallback para fontes do sistema
            print(f"⚠️ Erro ao carregar fontes Dogica: {e}")
            print("🔄 Usando fontes do sistema...")
            self.fontes['titulo'] = pygame.font.Font(None, FONTE_TITULO_TAMANHO)
            self.fontes['texto'] = pygame.font.Font(None, FONTE_TEXTO_TAMANHO)
            self.fontes['pequena'] = pygame.font.Font(None, FONTE_PEQUENA_TAMANHO)
            self.fontes['bold'] = pygame.font.Font(None, FONTE_BOLD_TAMANHO)
            self.fontes['muito_pequena'] = pygame.font.Font(None, 12)
            
    def carregar_imagens(self):
        """Carrega imagens principais do jogo."""
        try:
            # Fundo de batalha
            fundo_path = os.path.join("Assests", "Sprites", "Scenes", "Caminho Encantado na Floresta.png")
            if os.path.exists(fundo_path):
                fundo = pygame.image.load(fundo_path).convert()
                self.imagens['cenario'] = pygame.transform.scale(fundo, (LARGURA, ALTURA))
                print("✅ Cenário de batalha carregado!")
                
            # Carta da intro
            carta_path = os.path.join("Assests", "Sprites", "Scenes", "card_inicial.png")
            if os.path.exists(carta_path):
                self.imagens['carta_intro'] = pygame.image.load(carta_path).convert_alpha()
                print("✅ Carta da intro carregada!")
            menu_bg_path = os.path.join("Assests", "Sprites", "Scenes", "menu_background.png") # <<< ADICIONADO (Verifique o nome do arquivo)
            if os.path.exists(menu_bg_path): # <<< ADICIONADO
                          self.imagens['menu_background'] = pygame.image.load(menu_bg_path).convert_alpha() # <<< ADICIONADO
                          print("✅ Fundo do menu principal carregado!") # <<< ADICIONADO
            else: # <<< ADICIONADO
                          print("⚠️ Fundo do menu (menu_background.png) não encontrado na pasta Scenes") # <<< ADICIONADO
                 # --- FIM DO NOVO CÓDIGO --- # <<< ADICIONADO
            # Monstruário (NOVO)
            monstruario_path = os.path.join("Assests", "Sprites", "molders", "Monstruario.png")
            if os.path.exists(monstruario_path):
                self.imagens['monstruario'] = pygame.image.load(monstruario_path).convert_alpha()
                print("✅ Sprite do monstruário carregada!")
                
        except Exception as e:
            print(f"⚠️ Erro ao carregar imagens: {e}")
            
    def carregar_molduras(self):
        """Carrega as molduras para interface."""
        try:
            # Moldura de itens/botões
            moldura_path = os.path.join("Assests", "Sprites", "molders", "hud_botao.png")
            if os.path.exists(moldura_path):
                self.molduras['itens'] = pygame.image.load(moldura_path).convert_alpha()
                print("✅ Moldura de itens carregada!")
                
            # Moldura da loja
            loja_path = os.path.join("Assests", "Sprites", "molders", "Loja-Sheet.png")
            if os.path.exists(loja_path):
                self.molduras['loja'] = pygame.image.load(loja_path).convert_alpha()
                print("✅ Moldura da loja carregada!")
                
            # Moldura de dinheiro (coin molder específica)
            moldura_dinheiro_path = os.path.join("Assests", "Sprites", "molders", "coin_molder.png")
            if os.path.exists(moldura_dinheiro_path):
                self.molduras['dinheiro'] = pygame.image.load(moldura_dinheiro_path).convert_alpha()
                # Escala para um tamanho adequado (aproximadamente 120x40 pixels)
                self.molduras['dinheiro'] = pygame.transform.scale(self.molduras['dinheiro'], (120, 40))
                print("✅ Moldura de dinheiro (coin molder) carregada!")
            else:
                # Fallback para moldura de itens
                self.molduras['dinheiro'] = self.molduras.get('itens')
                print("⚠️ Moldura de dinheiro não encontrada, usando fallback")
            
        except Exception as e:
            print(f"⚠️ Erro ao carregar molduras: {e}")
            
    def carregar_sprites(self):
        """Carrega sprites organizadas por personagem - sistema baseado no original"""
        try:
            # PRIMEIRO: Configuração garantida para Ghost
            print("👻 Iniciando configuração garantida do Ghost...")
            self.carregar_ghost_sprite_garantido()
            
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
                
                print(f"✅ Sprites carregados: {list(self.sprites_personagens.keys())}")
                
                # Compatibilidade com sistema antigo
                self._carregar_sprites_compatibilidade()
                
            else:
                print("❌ Pasta de sprites não encontrada")
                
        except Exception as e:
            print(f"❌ Erro ao carregar sprites: {e}")
            
    def _carregar_sprites_compatibilidade(self):
        """Carrega sprites no formato antigo para compatibilidade."""
        # Sprites para compatibilidade
        if hasattr(self, 'sprites_jogador') and self.sprites_jogador:
            idle_data = self.sprites_jogador.get('idle', {})
            if idle_data:
                # Converte para formato antigo
                self.sprites['personagem'] = {
                    'sprite_sheet': idle_data.get('sheet'),
                    'frame_width': idle_data.get('frame_width', 64),
                    'frame_height': idle_data.get('frame_height', 64),
                    'total_frames': idle_data.get('total_frames', 1)
                }
        
        if hasattr(self, 'sprites_inimigo') and self.sprites_inimigo:
            idle_data = self.sprites_inimigo.get('idle', {})
            if idle_data:
                # Converte para formato antigo
                sprite_compatibilidade = {
                    'sprite_sheet': idle_data.get('sheet'),
                    'frame_width': idle_data.get('frame_width', 64),
                    'frame_height': idle_data.get('frame_height', 64),
                    'total_frames': idle_data.get('total_frames', 1)
                }
                self.sprites['kastle'] = sprite_compatibilidade
                self.sprites['fantasma'] = sprite_compatibilidade
                self.sprites['ghost'] = sprite_compatibilidade  # Adiciona ghost
                
        # Adiciona sprites para ballons se existir
        if 'ballons' in self.sprites_personagens:
            ballons_data = self.sprites_personagens['ballons'].get('idle', {})
            if ballons_data:
                self.sprites['ballons'] = {
                    'sprite_sheet': ballons_data.get('sheet'),
                    'frame_width': ballons_data.get('frame_width', 64),
                    'frame_height': ballons_data.get('frame_height', 64),
                    'total_frames': ballons_data.get('total_frames', 1)
                }
                
    def _processar_sprite_sheet(self, sprite_sheet, nome):
        """Processa uma sprite sheet e determina frames."""
        largura = sprite_sheet.get_width()
        altura = sprite_sheet.get_height()
        
        # Detectar se é sprite sheet ou sprite único
        if largura > altura:
            # Sprite sheet horizontal - múltiplos frames lado a lado
            frame_height = altura
            frame_width = altura  # Assumir frames quadrados
            total_frames = largura // frame_width
        elif altura > largura:
            # Sprite sheet vertical - frames empilhados
            frame_width = largura
            frame_height = largura  # Assumir frames quadrados
            total_frames = altura // frame_height
        else:
            # Sprite único ou quadrado
            frame_width = largura
            frame_height = altura
            total_frames = 1
            
        return {
            'sprite_sheet': sprite_sheet,
            'frame_width': frame_width,
            'frame_height': frame_height,
            'total_frames': max(1, total_frames)
        }
        
    def extrair_sprite(self, sprite_data, frame_index):
        """Extrai um frame específico de uma sprite sheet."""
        if not sprite_data:
            return None
            
        sprite_sheet = sprite_data.get('sheet') or sprite_data.get('sprite_sheet')
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
        
    def obter_fonte(self, tipo):
        """Retorna uma fonte específica."""
        return self.fontes.get(tipo, self.fontes.get('texto'))
        
    def obter_imagem(self, nome):
        """Retorna uma imagem específica."""
        return self.imagens.get(nome, None)
        
    def obter_moldura(self, tipo):
        """Retorna uma moldura específica."""
        return self.molduras.get(tipo, None)
        
    # Métodos de compatibilidade para sprites
    def obter_frame_jogador(self, frame_index):
        """Retorna frame específico do jogador."""
        if 'personagem' in self.sprites:
            return self.extrair_sprite(self.sprites['personagem'], frame_index)
        return None
        
    def obter_frame_inimigo(self, frame_index):
        """Retorna frame específico do inimigo."""
        if 'kastle' in self.sprites:
            return self.extrair_sprite(self.sprites['kastle'], frame_index)
        return None
        
    def obter_sprite_fantasma(self):
        """Retorna sprite do fantasma - CONFIGURAÇÃO GARANTIDA."""
        # Primeira tentativa: chave 'fantasma' (compatibilidade)
        if 'fantasma' in self.sprites:
            return self.extrair_sprite(self.sprites['fantasma'], 0)
        
        # Segunda tentativa: chave 'ghost' (nova configuração)
        if 'ghost' in self.sprites:
            return self.extrair_sprite(self.sprites['ghost'], 0)
        
        # Terceira tentativa: recarregar Ghost se necessário
        print("⚠️ Ghost sprite não encontrada, recarregando...")
        if self.carregar_ghost_sprite_garantido():
            if 'ghost' in self.sprites:
                return self.extrair_sprite(self.sprites['ghost'], 0)
        
        print("❌ ERRO: Não foi possível carregar sprite do Ghost!")
        return None
        
    def obter_total_frames_jogador(self):
        """Retorna total de frames do jogador."""
        if 'personagem' in self.sprites:
            return self.sprites['personagem']['total_frames']
        return 1
        
    def obter_total_frames_inimigo(self):
        """Retorna total de frames do inimigo."""
        if 'kastle' in self.sprites:
            return self.sprites['kastle']['total_frames']
        return 1
    
    def carregar_ghost_sprite_garantido(self):
        """
        CONFIGURAÇÃO GLOBAL: Sempre carrega a sprite do Ghost corretamente
        Esta função garante que a sprite do Ghost sempre funcione em qualquer dispositivo
        """
        print("👻 Carregando sprite do Ghost (configuração garantida)...")
        
        # Usa configuração global definida em constants.py
        ghost_path = os.path.join("Assests", "Sprites", "Ghost", GHOST_SPRITE_CONFIG['arquivo'])
        
        try:
            if os.path.exists(ghost_path):
                # Carrega a sprite sheet
                sprite_sheet = pygame.image.load(ghost_path).convert_alpha()
                print(f"✅ Ghost sprite carregada: {ghost_path}")
                
                # Usa configuração pré-definida para garantir funcionamento
                ghost_config = GHOST_SPRITE_CONFIG.copy()
                ghost_config['sheet'] = sprite_sheet
                
                # Detecta automaticamente se a configuração está correta
                sheet_width = sprite_sheet.get_width()
                sheet_height = sprite_sheet.get_height()
                
                # Calcula frame automaticamente baseado na largura total
                if sheet_width > sheet_height:
                    frame_width = sheet_width // ghost_config['frames']
                    frame_height = sheet_height
                    print(f"👻 Ghost detectado: {ghost_config['frames']} frames de {frame_width}x{frame_height}")
                else:
                    # Fallback para sprite única
                    frame_width = sheet_width
                    frame_height = sheet_height
                    ghost_config['frames'] = 1
                    print(f"👻 Ghost detectado: sprite única {frame_width}x{frame_height}")
                
                # Atualiza configuração com valores detectados
                ghost_config['frame_width'] = frame_width
                ghost_config['frame_height'] = frame_height
                
                # Garante que sempre haverá uma sprite do Ghost disponível
                self.sprites['ghost'] = ghost_config
                self.sprites['fantasma'] = ghost_config  # Compatibilidade
                
                print("✅ Ghost sprite configurada globalmente com sucesso!")
                return True
                
            else:
                print(f"⚠️ Ghost sprite não encontrada: {ghost_path}")
                return self._criar_ghost_fallback()
                
        except Exception as e:
            print(f"❌ Erro ao carregar Ghost sprite: {e}")
            return self._criar_ghost_fallback()
    
    def _criar_ghost_fallback(self):
        """Cria sprite de fallback para o Ghost caso não encontre a original"""
        print("🔄 Criando Ghost fallback...")
        
        # Cria uma sprite simples de fallback
        fallback_surface = pygame.Surface((SPRITE_FALLBACK_CONFIG['largura'], 
                                         SPRITE_FALLBACK_CONFIG['altura']), 
                                        pygame.SRCALPHA)
        fallback_surface.fill(SPRITE_FALLBACK_CONFIG['cor'])
        
        # Configuração mínima de fallback
        fallback_config = {
            'sheet': fallback_surface,
            'frame_width': SPRITE_FALLBACK_CONFIG['largura'],
            'frame_height': SPRITE_FALLBACK_CONFIG['altura'],
            'total_frames': 1,
            'frames': 1
        }
        
        self.sprites['ghost'] = fallback_config
        self.sprites['fantasma'] = fallback_config
        
        print("✅ Ghost fallback criado com sucesso!")
        return True

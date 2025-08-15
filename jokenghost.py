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

class Escolha(Enum):
    PEDRA = 1
    PAPEL = 2
    TESOURA = 3

class JokenGhost:
    def __init__(self):
        self.tela = pygame.display.set_mode((LARGURA, ALTURA))
        pygame.display.set_caption("JokenGhost - Caçada em Turnos")
        self.relogio = pygame.time.Clock()
        self.fonte_titulo = pygame.font.Font(None, 72)
        self.fonte_texto = pygame.font.Font(None, 36)
        self.fonte_pequena = pygame.font.Font(None, 24)
        
        self.estado = EstadoJogo.MENU
        self.transicao_alpha = 0
        self.transicao_direcao = 1
        
        # Stats dos personagens
        self.vida_jogador = 100
        self.vida_inimigo = 100
        self.vida_max_jogador = 100
        self.vida_max_inimigo = 100
        
        # Batalha
        self.escolha_jogador = None
        self.escolha_inimigo = None
        self.resultado_batalha = ""
        self.tempo_resultado = 0
        
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
                                
                                # Detecta sprite sheet
                                sheet_width = sprite_sheet.get_width()
                                sheet_height = sprite_sheet.get_height()
                                
                                if sheet_width > sheet_height:
                                    if sheet_width >= sheet_height * 2:
                                        frame_height = sheet_height
                                        frame_width = frame_height
                                        total_frames = sheet_width // frame_width
                                    else:
                                        frame_width = sheet_width // 2
                                        frame_height = sheet_height
                                        total_frames = 2
                                else:
                                    frame_width = sheet_width
                                    frame_height = sheet_height
                                    total_frames = 1
                                
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
                
                # Encontra Skeleton e Kastle especificamente
                skeleton_encontrado = None
                kastle_encontrado = None
                
                for personagem in personagens_carregados:
                    if 'skeleton' in personagem.lower():
                        skeleton_encontrado = personagem
                    elif 'kastle' in personagem.lower():
                        kastle_encontrado = personagem
                
                # Atribui corretamente: Skeleton = Jogador, Kastle = Inimigo
                if skeleton_encontrado:
                    self.sprites_jogador = self.sprites_personagens[skeleton_encontrado]
                
                if kastle_encontrado:
                    self.sprites_inimigo = self.sprites_personagens[kastle_encontrado]
                
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
        
        # Botões de escolha na batalha
        self.botoes['pedra'] = {
            'rect': pygame.Rect(100, ALTURA - 120, 120, 80),
            'texto': 'PEDRA',
            'ativo': True
        }
        self.botoes['papel'] = {
            'rect': pygame.Rect(240, ALTURA - 120, 120, 80),
            'texto': 'PAPEL',
            'ativo': True
        }
        self.botoes['tesoura'] = {
            'rect': pygame.Rect(380, ALTURA - 120, 120, 80),
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
        cor = CINZA_CLARO if hover else CINZA
        
        # Desenha o botão
        pygame.draw.rect(self.tela, cor, botao['rect'])
        pygame.draw.rect(self.tela, PRETO, botao['rect'], 3)
        
        # Desenha o texto
        texto = self.fonte_texto.render(botao['texto'], True, PRETO)
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
    
    def desenhar_personagem(self, x, y, largura, altura, cor, nome, sprites_personagem=None, animacao="idle", frame=0, espelhar=False):
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
                
                self.tela.blit(sprite_escalado, (x, y))
            else:
                # Fallback para bloco se der erro
                pygame.draw.rect(self.tela, cor, (x, y, largura, altura))
                pygame.draw.rect(self.tela, PRETO, (x, y, largura, altura), 3)
        else:
            # Desenha o personagem (bloco por enquanto)
            pygame.draw.rect(self.tela, cor, (x, y, largura, altura))
            pygame.draw.rect(self.tela, PRETO, (x, y, largura, altura), 3)
        
        # Nome do personagem
        texto_nome = self.fonte_texto.render(nome, True, PRETO)
        nome_rect = texto_nome.get_rect(center=(x + largura//2, y + altura + 20))
        self.tela.blit(texto_nome, nome_rect)
    
    def desenhar_batalha(self):
        # Fundo da batalha
        self.tela.fill(VERDE)
        
        # Desenha o chão com perspectiva
        pygame.draw.rect(self.tela, (34, 139, 34), (0, ALTURA - 150, LARGURA, 150))
        
        # Personagem do jogador (primeiro plano - maior e mais à frente, espelhado)
        animacao_jogador = "idle" if self.estado_animacao_jogador == EstadoAnimacao.IDLE else "ataque"
        self.desenhar_personagem(80, ALTURA - 320, 160, 180, AZUL, "SKELETON", 
                                sprites_personagem=self.sprites_jogador, animacao=animacao_jogador, 
                                frame=self.frame_atual_jogador, espelhar=True)
        self.desenhar_barra_vida(50, 50, self.vida_jogador, self.vida_max_jogador, VERDE)
        
        # Inimigo (fundo - maior e mais imponente, como no Pokémon)
        animacao_inimigo = "ataque" if self.estado_animacao_inimigo == EstadoAnimacao.ATAQUE else "idle"
        self.desenhar_personagem(540, ALTURA - 260, 120, 140, VERMELHO, "KASTLE",
                                sprites_personagem=self.sprites_inimigo, animacao=animacao_inimigo,
                                frame=self.frame_atual_inimigo)
        self.desenhar_barra_vida(550, 50, self.vida_inimigo, self.vida_max_inimigo, VERDE)
        
        # Botões de escolha
        mouse_pos = pygame.mouse.get_pos()
        self.desenhar_botao('pedra', mouse_pos)
        self.desenhar_botao('papel', mouse_pos)
        self.desenhar_botao('tesoura', mouse_pos)
        
        # Mostra as escolhas se houver
        if self.escolha_jogador and self.escolha_inimigo:
            escolha_jogador_texto = self.escolha_jogador.name
            escolha_inimigo_texto = self.escolha_inimigo.name
            
            texto_jogador = self.fonte_texto.render(f"Você: {escolha_jogador_texto}", True, PRETO)
            texto_inimigo = self.fonte_texto.render(f"Ghost: {escolha_inimigo_texto}", True, PRETO)
            
            self.tela.blit(texto_jogador, (50, ALTURA - 200))
            self.tela.blit(texto_inimigo, (450, ALTURA - 200))
            
            # Resultado da batalha
            if self.resultado_batalha:
                cor_resultado = VERDE if "Você ganhou" in self.resultado_batalha else VERMELHO if "perdeu" in self.resultado_batalha else AMARELO
                texto_resultado = self.fonte_texto.render(self.resultado_batalha, True, cor_resultado)
                resultado_rect = texto_resultado.get_rect(center=(LARGURA//2, ALTURA//2))
                self.tela.blit(texto_resultado, resultado_rect)
    
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
            return "Você ganhou a rodada!"
        else:
            self.vida_jogador -= 20
            # Ativa animação de ataque do inimigo quando ele vence
            self.iniciar_animacao_ataque_inimigo()
            return "Você perdeu a rodada!"
    
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
        self.escolha_jogador = escolha_jogador
        self.escolha_inimigo = random.choice(list(Escolha))
        
        self.resultado_batalha = self.determinar_vencedor(self.escolha_jogador, self.escolha_inimigo)
        self.tempo_resultado = pygame.time.get_ticks()
        
        # Verifica se alguém morreu
        if self.vida_jogador <= 0 or self.vida_inimigo <= 0:
            pygame.time.set_timer(pygame.USEREVENT + 1, 2000)  # 2 segundos para mostrar resultado
    
    def reiniciar_jogo(self):
        self.vida_jogador = self.vida_max_jogador
        self.vida_inimigo = self.vida_max_inimigo
        self.escolha_jogador = None
        self.escolha_inimigo = None
        self.resultado_batalha = ""
        self.tempo_resultado = 0
        self.estado = EstadoJogo.MENU
    
    def processar_eventos(self):
        for evento in pygame.event.get():
            if evento.type == pygame.QUIT:
                return False
            
            elif evento.type == pygame.USEREVENT + 1:  # Timer para transição para resultado
                self.estado = EstadoJogo.RESULTADO
                pygame.time.set_timer(pygame.USEREVENT + 1, 0)  # Cancela o timer
            
            elif evento.type == pygame.MOUSEBUTTONDOWN:
                if evento.button == 1:  # Clique esquerdo
                    botao_clicado = self.verificar_clique_botao(evento.pos)
                    
                    if self.estado == EstadoJogo.MENU and botao_clicado == 'jogar':
                        self.estado = EstadoJogo.TRANSICAO
                        self.transicao_alpha = 0
                    
                    elif self.estado == EstadoJogo.BATALHA and botao_clicado in ['pedra', 'papel', 'tesoura']:
                        if not self.escolha_jogador:  # Só processa se ainda não escolheu
                            escolha_map = {
                                'pedra': Escolha.PEDRA,
                                'papel': Escolha.PAPEL,
                                'tesoura': Escolha.TESOURA
                            }
                            self.processar_turno(escolha_map[botao_clicado])
                    
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
        
        elif self.estado == EstadoJogo.BATALHA:
            tempo_atual = pygame.time.get_ticks()
            
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
                    max_frames = min(6, sprite_data['total_frames'])
                    self.frame_atual_jogador = (self.frame_atual_jogador + 1) % max_frames
                    self.tempo_animacao_jogador = tempo_atual
            
            # Anima inimigo (idle ou ataque)
            if hasattr(self, 'sprites_inimigo'):
                animacao_atual = 'ataque' if self.estado_animacao_inimigo == EstadoAnimacao.ATAQUE else 'idle'
                
                if animacao_atual in self.sprites_inimigo:
                    sprite_data = self.sprites_inimigo[animacao_atual]
                    total_frames = sprite_data['total_frames']
                    
                    # Velocidade baseada no tipo de animação
                    if self.estado_animacao_inimigo == EstadoAnimacao.ATAQUE:
                        velocidade = 100  # Ataque rápido
                    else:
                        # Velocidade idle baseada no número de frames
                        if total_frames <= 2:
                            velocidade = 800
                        elif total_frames <= 4:
                            velocidade = 400
                        else:
                            velocidade = 200
                    
                    if tempo_atual - self.tempo_animacao_inimigo > velocidade:
                        if self.estado_animacao_inimigo == EstadoAnimacao.ATAQUE:
                            # Animação de ataque executa uma vez
                            if self.frame_atual_inimigo < total_frames - 1:
                                self.frame_atual_inimigo += 1
                        else:
                            # Animação idle loop normal
                            self.frame_atual_inimigo = (self.frame_atual_inimigo + 1) % total_frames
                        
                        self.tempo_animacao_inimigo = tempo_atual
            
            # Limpa escolhas após 3 segundos
            if self.tempo_resultado > 0 and pygame.time.get_ticks() - self.tempo_resultado > 3000:
                if self.vida_jogador > 0 and self.vida_inimigo > 0:
                    self.escolha_jogador = None
                    self.escolha_inimigo = None
                    self.resultado_batalha = ""
                    self.tempo_resultado = 0
    
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
        print(f"❌ Erro ao executar o jogo: {e}")
        input("Pressione Enter para sair...")
        sys.exit(1)

if __name__ == "__main__":
    main()

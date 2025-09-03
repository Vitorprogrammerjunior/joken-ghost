"""
Monstruário original do JokenGhost - Sistema idêntico ao jogo de 2000 linhas
"""

import pygame
import os
from config.constants import *

class MonstruarioOriginal:
    """Monstruário idêntico ao jogo original."""
    
    def __init__(self, resource_manager):
        """Inicializa o monstruário original."""
        self.resource_manager = resource_manager
        self.ativo = False
        self.pagina_atual = 0
        self.monstruario_descoberto = {}  # {tipo_inimigo: {"fraquezas": [], "nome": str, etc}}
        self.sprite_monstruario = None
        self.carregar_sprite_monstruario()
        
    def carregar_sprite_monstruario(self):
        """Carrega a sprite do monstruário."""
        try:
            monstruario_path = os.path.join("Assests", "Sprites", "molders", "Monstruario.png")
            if os.path.exists(monstruario_path):
                self.sprite_monstruario = pygame.image.load(monstruario_path).convert_alpha()
                print("✅ Sprite do monstruário carregada!")
            else:
                print("⚠️ Sprite do monstruário não encontrada")
        except Exception as e:
            print(f"❌ Erro ao carregar sprite do monstruário: {e}")
    
    def abrir(self):
        """Abre o monstruário."""
        self.ativo = True
        
    def fechar(self):
        """Fecha o monstruário."""
        self.ativo = False
        
    def descobrir_inimigo(self, tipo_inimigo, fraqueza_descoberta=None):
        """Descobre um novo inimigo no monstruário."""
        if tipo_inimigo not in self.monstruario_descoberto:
            self.monstruario_descoberto[tipo_inimigo] = {
                'nome': tipo_inimigo.upper(),
                'descricao': f"Um fantasma do tipo {tipo_inimigo}. Muito perigoso!",
                'fraquezas': [],
                'resistencias': [],
                'encontros': 0,
                'derrotas': 0
            }
            print(f"👻 Novo fantasma descoberto: {tipo_inimigo}")
            
        # Adiciona fraqueza se descoberta
        if fraqueza_descoberta and fraqueza_descoberta not in self.monstruario_descoberto[tipo_inimigo]['fraquezas']:
            self.monstruario_descoberto[tipo_inimigo]['fraquezas'].append(fraqueza_descoberta)
            print(f"🔍 Fraqueza descoberta para {tipo_inimigo}: {fraqueza_descoberta}")
    
    def registrar_encontro(self, tipo_inimigo):
        """Registra um encontro com o inimigo."""
        if tipo_inimigo in self.monstruario_descoberto:
            self.monstruario_descoberto[tipo_inimigo]['encontros'] += 1
            
    def registrar_derrota(self, tipo_inimigo):
        """Registra uma derrota do inimigo."""
        if tipo_inimigo in self.monstruario_descoberto:
            self.monstruario_descoberto[tipo_inimigo]['derrotas'] += 1
    
    def desenhar_monstruario(self, tela, base_x=None, base_y=None, mouse_pos=None):
        """Desenha a interface do Monstruário em tela cheia (IDÊNTICO AO ORIGINAL)"""
        if not self.ativo:
            return
        
        # Fundo semi-transparente
        overlay = pygame.Surface((LARGURA, ALTURA))
        overlay.set_alpha(230)
        overlay.fill((20, 15, 10))  # Marrom muito escuro
        tela.blit(overlay, (0, 0))
        
        # Livro central
        livro_largura = 700
        livro_altura = 500
        livro_x = (LARGURA - livro_largura) // 2
        livro_y = (ALTURA - livro_altura) // 2
        
        # Sprite do monstruário como fundo do livro
        if self.sprite_monstruario:
            sprite_redimensionada = pygame.transform.scale(self.sprite_monstruario, (livro_largura, livro_altura))
            tela.blit(sprite_redimensionada, (livro_x, livro_y))
        else:
            # Fallback se não houver sprite
            pygame.draw.rect(tela, (101, 67, 33), (livro_x, livro_y, livro_largura, livro_altura), border_radius=15)
            pygame.draw.rect(tela, DOURADO, (livro_x, livro_y, livro_largura, livro_altura), 5, border_radius=15)
        
        # Lista de monstros descobertos
        tipos_descobertos = list(self.monstruario_descoberto.keys())
        total_paginas = max(1, len(tipos_descobertos))
        
        # Garante que a página atual está dentro dos limites
        if self.pagina_atual >= total_paginas:
            self.pagina_atual = 0
        
        # Título (posicionado acima do livro)
        fonte_titulo = self.resource_manager.obter_fonte('titulo')
        titulo = fonte_titulo.render("MONSTRUÁRIO", True, DOURADO)
        titulo_x = livro_x + (livro_largura - titulo.get_width()) // 2
        tela.blit(titulo, (titulo_x, livro_y - 50))  # 50px acima do livro
        
        # Contador de páginas (abaixo do título)
        if tipos_descobertos:
            fonte_pequena = self.resource_manager.obter_fonte('pequena')
            contador = fonte_pequena.render(f"Página {self.pagina_atual + 1} de {total_paginas}", True, CINZA_CLARO)
            contador_x = livro_x + (livro_largura - contador.get_width()) // 2
            tela.blit(contador, (contador_x, livro_y + 25))  # 25px abaixo do topo do livro
        
        # Conteúdo da página
        if not tipos_descobertos:
            # Nenhum monstro descoberto
            fonte_texto = self.resource_manager.obter_fonte('texto')
            texto_vazio = fonte_texto.render("Derrote inimigos para descobrir suas fraquezas!", True, BRANCO)
            texto_x = livro_x + (livro_largura - texto_vazio.get_width()) // 2
            tela.blit(texto_vazio, (texto_x, livro_y + 200))
        else:
            # Mostra o monstro da página atual
            tipo_atual = tipos_descobertos[self.pagina_atual]
            info = self.monstruario_descoberto[tipo_atual]
            
            # Sprite posicionado à esquerda
            sprite_x = livro_x + 200  # À esquerda
            sprite_y = livro_y + 100  # Um pouco mais acima
            
            # Desenha sprite do fantasma (cortando um frame da sprite sheet)
            try:
                # Carrega o sprite sheet do fantasma
                caminho_fantasma = os.path.join("Assests", "Sprites", "Ghost", "Sprite_fantasma.idle (1).png")
                if os.path.exists(caminho_fantasma):
                    sprite_sheet = pygame.image.load(caminho_fantasma).convert_alpha()
                    
                    # Sprite sheet tem 12 frames horizontais de 640x640
                    largura_frame = sprite_sheet.get_width() // 12
                    altura_frame = sprite_sheet.get_height()
                    
                    # Corta o primeiro frame
                    frame_rect = pygame.Rect(0, 0, largura_frame, altura_frame)
                    sprite_fantasma = sprite_sheet.subsurface(frame_rect)
                    
                    # Redimensiona para tamanho adequado no livro
                    sprite_scaled = pygame.transform.scale(sprite_fantasma, (80, 80))
                    tela.blit(sprite_scaled, (sprite_x, sprite_y))
                else:
                    # Fallback sprite
                    self.desenhar_sprite_fallback(tela, sprite_x, sprite_y)
            except Exception as e:
                # Fallback sprite
                self.desenhar_sprite_fallback(tela, sprite_x, sprite_y)
            
            # Textos do monstruário
            fonte_texto = self.resource_manager.obter_fonte('texto')
            fonte_pequena = self.resource_manager.obter_fonte('pequena')
            
            # Nome do monstro (menor e à esquerda)
            nome_y = sprite_y + 85  # Logo abaixo do sprite
            nome_surface = fonte_texto.render(info['nome'], True, CINZA)
            nome_x = livro_x + 185  # Posicionado à esquerda
            tela.blit(nome_surface, (nome_x, nome_y))
            
            # Descrição do monstro
            desc_y = nome_y + 25
            desc_surface = fonte_pequena.render(info['descricao'][:50] + "...", True, BRANCO)
            desc_x = livro_x + 185
            tela.blit(desc_surface, (desc_x, desc_y))
            
            # Fraquezas descobertas
            fraq_y = desc_y + 35
            if info['fraquezas']:
                fraquezas_text = "Fraquezas: " + ", ".join(info['fraquezas'])
                fraq_surface = fonte_pequena.render(fraquezas_text, True, VERDE)
                tela.blit(fraq_surface, (livro_x + 185, fraq_y))
            else:
                fraq_surface = fonte_pequena.render("Fraquezas: Desconhecidas", True, VERMELHO)
                tela.blit(fraq_surface, (livro_x + 185, fraq_y))
            
            # Estatísticas de encontros
            stats_y = fraq_y + 30
            encontros_text = f"Encontros: {info['encontros']}"
            stats_surface = fonte_pequena.render(encontros_text, True, BRANCO)
            tela.blit(stats_surface, (livro_x + 185, stats_y))
            
            derrotas_y = stats_y + 15
            derrotas_text = f"Derrotas: {info['derrotas']}"
            derrotas_surface = fonte_pequena.render(derrotas_text, True, BRANCO)
            tela.blit(derrotas_surface, (livro_x + 185, derrotas_y))
            
            # Taxa de vitória
            if info['encontros'] > 0:
                taxa_vitoria = (info['derrotas'] / info['encontros']) * 100
                taxa_y = derrotas_y + 15
                taxa_text = f"Taxa de Vitória: {taxa_vitoria:.1f}%"
                taxa_surface = fonte_pequena.render(taxa_text, True, AMARELO)
                tela.blit(taxa_surface, (livro_x + 185, taxa_y))
        
        # Instruções de navegação na parte inferior
        fonte_pequena = self.resource_manager.obter_fonte('pequena')
        if len(tipos_descobertos) > 1:
            nav_text = "Use SETAS para navegar | ESC para fechar"
        else:
            nav_text = "ESC para fechar"
        nav_surface = fonte_pequena.render(nav_text, True, CINZA_CLARO)
        nav_x = livro_x + (livro_largura - nav_surface.get_width()) // 2
        tela.blit(nav_surface, (nav_x, livro_y + livro_altura + 20))
    
    def desenhar_sprite_fallback(self, tela, x, y):
        """Desenha sprite fallback quando não consegue carregar o original."""
        # Círculo cinza como fallback
        pygame.draw.circle(tela, CINZA, (x + 40, y + 40), 40)
        pygame.draw.circle(tela, PRETO, (x + 40, y + 40), 40, 3)
        
        # Olhos simples
        pygame.draw.circle(tela, BRANCO, (x + 30, y + 30), 8)
        pygame.draw.circle(tela, BRANCO, (x + 50, y + 30), 8)
        pygame.draw.circle(tela, PRETO, (x + 30, y + 30), 4)
        pygame.draw.circle(tela, PRETO, (x + 50, y + 30), 4)
    
    def processar_tecla(self, evento):
        """Processa teclas do monstruário."""
        if not self.ativo:
            return False
            
        if evento.type == pygame.KEYDOWN:
            if evento.key == pygame.K_ESCAPE:
                self.fechar()
                return True
            elif evento.key == pygame.K_LEFT:
                self.pagina_anterior()
                return True
            elif evento.key == pygame.K_RIGHT:
                self.proxima_pagina()
                return True
        return False
    
    def pagina_anterior(self):
        """Vai para a página anterior."""
        tipos_descobertos = list(self.monstruario_descoberto.keys())
        if len(tipos_descobertos) > 1 and self.pagina_atual > 0:
            self.pagina_atual -= 1
    
    def proxima_pagina(self):
        """Vai para a próxima página."""
        tipos_descobertos = list(self.monstruario_descoberto.keys())
        if len(tipos_descobertos) > 1 and self.pagina_atual < len(tipos_descobertos) - 1:
            self.pagina_atual += 1

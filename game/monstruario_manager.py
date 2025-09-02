"""
Sistema do monstruário do jogo.
Responsável por rastrear fantasmas descobertos e exibir informações.
"""

import pygame
from config.constants import *
from config.enums import *

class FantasmaInfo:
    """Informações sobre um tipo de fantasma."""
    
    def __init__(self, nome, descricao, fraqueza, resistencia, recompensa):
        """Inicializa informações do fantasma."""
        self.nome = nome
        self.descricao = descricao
        self.fraqueza = fraqueza
        self.resistencia = resistencia
        self.recompensa = recompensa
        self.descoberto = False
        self.vezes_encontrado = 0
        self.vezes_derrotado = 0
        
    def descobrir(self):
        """Marca o fantasma como descoberto."""
        if not self.descoberto:
            self.descoberto = True
            print(f"👻 Fantasma descoberto: {self.nome}")
            
    def encontrar(self):
        """Incrementa contador de encontros."""
        self.vezes_encontrado += 1
        
    def derrotar(self):
        """Incrementa contador de derrotas."""
        self.vezes_derrotado += 1
        
    def obter_taxa_vitoria(self):
        """Calcula taxa de vitória contra este fantasma."""
        if self.vezes_encontrado == 0:
            return 0
        return (self.vezes_derrotado / self.vezes_encontrado) * 100

class MonstruarioManager:
    """Gerenciador do monstruário."""
    
    def __init__(self, resource_manager):
        """Inicializa o gerenciador do monstruário."""
        self.resource_manager = resource_manager
        self.fantasmas = {}
        self.pagina_atual = 0
        self.fantasmas_por_pagina = 6
        self.criar_fantasmas_base()
        
    def criar_fantasmas_base(self):
        """Cria a base de dados de fantasmas."""
        self.fantasmas = {
            "Espírito Sombrio": FantasmaInfo(
                nome="Espírito Sombrio",
                descricao="Um fantasma comum encontrado em cemitérios abandonados.",
                fraqueza="PEDRA",
                resistencia="PAPEL",
                recompensa=15
            ),
            "Alma Penada": FantasmaInfo(
                nome="Alma Penada",
                descricao="Espírito errante em busca de paz eterna.",
                fraqueza="PAPEL",
                resistencia="TESOURA",
                recompensa=20
            ),
            "Poltergeist": FantasmaInfo(
                nome="Poltergeist",
                descricao="Fantasma travesso que move objetos.",
                fraqueza="TESOURA",
                resistencia="PEDRA",
                recompensa=25
            ),
            "Banshee": FantasmaInfo(
                nome="Banshee",
                descricao="Espírito feminino de lamento mortal.",
                fraqueza="PEDRA",
                resistencia="PAPEL",
                recompensa=30
            ),
            "Wraith": FantasmaInfo(
                nome="Wraith",
                descricao="Fantasma vingativo de grande poder.",
                fraqueza="PAPEL",
                resistencia="TESOURA",
                recompensa=35
            ),
            "Phantom": FantasmaInfo(
                nome="Phantom",
                descricao="Aparição misteriosa e elusiva.",
                fraqueza="TESOURA",
                resistencia="PEDRA",
                recompensa=40
            )
        }
        
    def descobrir_fantasma(self, nome_fantasma):
        """Descobre um novo fantasma."""
        if nome_fantasma in self.fantasmas:
            fantasma = self.fantasmas[nome_fantasma]
            if not fantasma.descoberto:
                fantasma.descobrir()
                return True
        return False
        
    def registrar_encontro(self, nome_fantasma):
        """Registra um encontro com um fantasma."""
        if nome_fantasma in self.fantasmas:
            self.fantasmas[nome_fantasma].encontrar()
            self.descobrir_fantasma(nome_fantasma)
            
    def registrar_vitoria(self, nome_fantasma):
        """Registra uma vitória contra um fantasma."""
        if nome_fantasma in self.fantasmas:
            self.fantasmas[nome_fantasma].derrotar()
            
    def obter_fantasmas_descobertos(self):
        """Retorna lista de fantasmas descobertos."""
        return [f for f in self.fantasmas.values() if f.descoberto]
        
    def obter_total_descobertos(self):
        """Retorna número total de fantasmas descobertos."""
        return len(self.obter_fantasmas_descobertos())
        
    def obter_total_fantasmas(self):
        """Retorna número total de fantasmas."""
        return len(self.fantasmas)
        
    def obter_porcentagem_descoberta(self):
        """Retorna porcentagem de descoberta do monstruário."""
        total = self.obter_total_fantasmas()
        descobertos = self.obter_total_descobertos()
        return (descobertos / total) * 100 if total > 0 else 0
        
    def desenhar_monstruario(self, tela, base_x, base_y, mouse_pos):
        """Desenha o monstruário na tela."""
        # Área do monstruário
        monstruario_rect = pygame.Rect(base_x, base_y, MONSTRUARIO_LARGURA, MONSTRUARIO_ALTURA)
        
        # Cabeçalho com estatísticas
        self.desenhar_cabecalho(tela, base_x, base_y)
        
        # Grade de fantasmas
        self.desenhar_grade_fantasmas(tela, base_x, base_y + 50, mouse_pos)
        
        # Controles de página
        self.desenhar_controles_pagina(tela, base_x, base_y + MONSTRUARIO_ALTURA - 30)
        
    def desenhar_cabecalho(self, tela, x, y):
        """Desenha o cabeçalho do monstruário."""
        fonte_pequena = self.resource_manager.obter_fonte('pequena')
        
        descobertos = self.obter_total_descobertos()
        total = self.obter_total_fantasmas()
        porcentagem = self.obter_porcentagem_descoberta()
        
        # Texto de progresso
        texto_progresso = f"Descobertos: {descobertos}/{total} ({porcentagem:.1f}%)"
        progresso_surface = fonte_pequena.render(texto_progresso, True, ROXO)
        progresso_rect = progresso_surface.get_rect(centerx=x + MONSTRUARIO_LARGURA//2, y=y + 5)
        tela.blit(progresso_surface, progresso_rect)
        
        # Barra de progresso
        barra_largura = 400
        barra_altura = 20
        barra_x = x + (MONSTRUARIO_LARGURA - barra_largura) // 2
        barra_y = y + 25
        
        # Fundo da barra
        pygame.draw.rect(tela, CINZA, (barra_x, barra_y, barra_largura, barra_altura))
        
        # Progresso
        progresso_largura = int(barra_largura * (porcentagem / 100))
        pygame.draw.rect(tela, ROXO, (barra_x, barra_y, progresso_largura, barra_altura))
        
        # Borda
        pygame.draw.rect(tela, BRANCO, (barra_x, barra_y, barra_largura, barra_altura), 2)
        
    def desenhar_grade_fantasmas(self, tela, base_x, base_y, mouse_pos):
        """Desenha a grade de fantasmas."""
        fantasmas_lista = list(self.fantasmas.values())
        inicio = self.pagina_atual * self.fantasmas_por_pagina
        fim = min(inicio + self.fantasmas_por_pagina, len(fantasmas_lista))
        
        colunas = 3
        linhas = 2
        slot_largura = 180
        slot_altura = 120
        espaco_x = 20
        espaco_y = 20
        
        for i in range(inicio, fim):
            fantasma = fantasmas_lista[i]
            slot_index = i - inicio
            
            # Calcula posição do slot
            coluna = slot_index % colunas
            linha = slot_index // colunas
            
            slot_x = base_x + 20 + (coluna * (slot_largura + espaco_x))
            slot_y = base_y + (linha * (slot_altura + espaco_y))
            
            # Desenha o slot do fantasma
            self.desenhar_slot_fantasma(tela, fantasma, slot_x, slot_y, slot_largura, slot_altura, mouse_pos)
            
    def desenhar_slot_fantasma(self, tela, fantasma, x, y, largura, altura, mouse_pos):
        """Desenha um slot individual de fantasma."""
        slot_rect = pygame.Rect(x, y, largura, altura)
        hover = slot_rect.collidepoint(mouse_pos)
        
        # Moldura do slot
        moldura_itens = self.resource_manager.obter_moldura('itens')
        if moldura_itens:
            moldura_escalada = pygame.transform.scale(moldura_itens, (largura, altura))
            
            if hover and fantasma.descoberto:
                # Efeito de hover apenas para fantasmas descobertos
                overlay = pygame.Surface((largura, altura))
                overlay.fill(BRANCO)
                overlay.set_alpha(30)
                moldura_escalada.blit(overlay, (0, 0))
                
            tela.blit(moldura_escalada, slot_rect)
        else:
            # Fallback
            cor_fundo = ROXO_ESCURO if fantasma.descoberto else PRETO
            pygame.draw.rect(tela, cor_fundo, slot_rect)
            pygame.draw.rect(tela, ROXO, slot_rect, 2)
        
        # Conteúdo do slot
        if fantasma.descoberto:
            self.desenhar_fantasma_descoberto(tela, fantasma, slot_rect)
        else:
            self.desenhar_fantasma_misterioso(tela, slot_rect)
            
        # Tooltip no hover
        if hover and fantasma.descoberto:
            self.mostrar_tooltip_fantasma(tela, fantasma, mouse_pos)
            
    def desenhar_fantasma_descoberto(self, tela, fantasma, rect):
        """Desenha um fantasma descoberto."""
        fonte_muito_pequena = self.resource_manager.obter_fonte('muito_pequena')
        if not fonte_muito_pequena:
            fonte_muito_pequena = self.resource_manager.obter_fonte('pequena')
            
        # Sprite do fantasma (pequeno)
        sprite_y = rect.y + 10
        sprite_x = rect.centerx - 30
        # Aqui você pode desenhar o sprite real do fantasma
        # self.sprite_manager.desenhar_fantasma_descoberto(tela, sprite_x, sprite_y, scale=0.5)
        
        # Por enquanto, desenha um retângulo representativo
        pygame.draw.rect(tela, BRANCO, (sprite_x, sprite_y, 60, 40))
        
        # Nome
        nome_surface = fonte_muito_pequena.render(fantasma.nome, True, BRANCO)
        nome_rect = nome_surface.get_rect(centerx=rect.centerx, y=rect.y + 60)
        tela.blit(nome_surface, nome_rect)
        
        # Estatísticas básicas
        stats_text = f"Encontros: {fantasma.vezes_encontrado}"
        stats_surface = fonte_muito_pequena.render(stats_text, True, CINZA)
        stats_rect = stats_surface.get_rect(centerx=rect.centerx, y=rect.y + 75)
        tela.blit(stats_surface, stats_rect)
        
        vitorias_text = f"Vitórias: {fantasma.vezes_derrotado}"
        vitorias_surface = fonte_muito_pequena.render(vitorias_text, True, VERDE)
        vitorias_rect = vitorias_surface.get_rect(centerx=rect.centerx, y=rect.y + 90)
        tela.blit(vitorias_surface, vitorias_rect)
        
    def desenhar_fantasma_misterioso(self, tela, rect):
        """Desenha um slot de fantasma não descoberto."""
        fonte_texto = self.resource_manager.obter_fonte('texto')
        
        # Silhueta
        silhueta_rect = pygame.Rect(rect.centerx - 30, rect.y + 20, 60, 40)
        pygame.draw.rect(tela, (50, 50, 50), silhueta_rect)
        
        # Ponto de interrogação
        interrogacao = fonte_texto.render("?", True, BRANCO)
        interrogacao_rect = interrogacao.get_rect(center=silhueta_rect.center)
        tela.blit(interrogacao, interrogacao_rect)
        
        # Texto
        fonte_pequena = self.resource_manager.obter_fonte('pequena')
        texto = fonte_pequena.render("???", True, CINZA)
        texto_rect = texto.get_rect(centerx=rect.centerx, y=rect.y + 80)
        tela.blit(texto, texto_rect)
        
    def mostrar_tooltip_fantasma(self, tela, fantasma, mouse_pos):
        """Mostra tooltip detalhado de um fantasma."""
        fonte_pequena = self.resource_manager.obter_fonte('pequena')
        
        # Informações do tooltip
        linhas = [
            fantasma.nome,
            fantasma.descricao,
            f"Fraqueza: {fantasma.fraqueza}",
            f"Resistência: {fantasma.resistencia}",
            f"Recompensa: ${fantasma.recompensa}",
            f"Taxa de vitória: {fantasma.obter_taxa_vitoria():.1f}%"
        ]
        
        # Calcula tamanho do tooltip
        largura_max = 0
        altura_total = 0
        linha_altura = 18
        
        for linha in linhas:
            texto_size = fonte_pequena.size(linha)
            largura_max = max(largura_max, texto_size[0])
            altura_total += linha_altura
            
        # Posição do tooltip
        padding = 10
        tooltip_largura = largura_max + padding * 2
        tooltip_altura = altura_total + padding * 2
        
        tooltip_x = mouse_pos[0] + 20
        tooltip_y = mouse_pos[1] - tooltip_altura - 20
        
        # Ajusta posição se sair da tela
        if tooltip_x + tooltip_largura > LARGURA:
            tooltip_x = mouse_pos[0] - tooltip_largura - 20
        if tooltip_y < 0:
            tooltip_y = mouse_pos[1] + 20
            
        # Desenha fundo do tooltip
        tooltip_rect = pygame.Rect(tooltip_x, tooltip_y, tooltip_largura, tooltip_altura)
        pygame.draw.rect(tela, PRETO, tooltip_rect)
        pygame.draw.rect(tela, ROXO, tooltip_rect, 2)
        
        # Desenha as linhas
        y_atual = tooltip_y + padding
        for i, linha in enumerate(linhas):
            cor = BRANCO
            if i == 0:  # Nome
                cor = ROXO
            elif "Fraqueza" in linha:
                cor = VERDE
            elif "Resistência" in linha:
                cor = VERMELHO
            elif "Recompensa" in linha:
                cor = DOURADO
                
            linha_surface = fonte_pequena.render(linha, True, cor)
            tela.blit(linha_surface, (tooltip_x + padding, y_atual))
            y_atual += linha_altura
            
    def desenhar_controles_pagina(self, tela, x, y):
        """Desenha os controles de página."""
        fonte_pequena = self.resource_manager.obter_fonte('pequena')
        
        total_paginas = (len(self.fantasmas) + self.fantasmas_por_pagina - 1) // self.fantasmas_por_pagina
        
        if total_paginas > 1:
            # Seta anterior
            if self.pagina_atual > 0:
                seta_esq = fonte_pequena.render("◀", True, BRANCO)
                tela.blit(seta_esq, (x + 50, y))
                
            # Número da página
            pagina_texto = f"Página {self.pagina_atual + 1} de {total_paginas}"
            pagina_surface = fonte_pequena.render(pagina_texto, True, BRANCO)
            pagina_rect = pagina_surface.get_rect(centerx=x + MONSTRUARIO_LARGURA//2, y=y)
            tela.blit(pagina_surface, pagina_rect)
            
            # Seta próxima
            if self.pagina_atual < total_paginas - 1:
                seta_dir = fonte_pequena.render("▶", True, BRANCO)
                tela.blit(seta_dir, (x + MONSTRUARIO_LARGURA - 70, y))
                
    def avancar_pagina(self):
        """Avança para a próxima página."""
        total_paginas = (len(self.fantasmas) + self.fantasmas_por_pagina - 1) // self.fantasmas_por_pagina
        if self.pagina_atual < total_paginas - 1:
            self.pagina_atual += 1
            
    def voltar_pagina(self):
        """Volta para a página anterior."""
        if self.pagina_atual > 0:
            self.pagina_atual -= 1
            
    def resetar_monstruario(self):
        """Reseta todo o progresso do monstruário."""
        for fantasma in self.fantasmas.values():
            fantasma.descoberto = False
            fantasma.vezes_encontrado = 0
            fantasma.vezes_derrotado = 0
        self.pagina_atual = 0

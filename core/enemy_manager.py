"""
Sistema de gerenciamento de inimigos.
Responsável por criar, posicionar e controlar múltiplos inimigos.
"""

import random
from config.constants import * # <--- 1. IMPORTAÇÃO ADICIONADA

class Enemy:
    """Classe simples de inimigo para compatibilidade."""
    
    # --- 2. CLASSE ENEMY CORRIGIDA ---
    def __init__(self, data_dict):
        """Inicializa um inimigo a partir de um dicionário."""
        self.nome = data_dict.get('nome', 'Unknown')
        self.vida = data_dict.get('vida_atual', 100)
        self.vida_maxima = data_dict.get('vida_maxima', 100)
        self.recompensa = data_dict.get('recompensa', 15)
        self.data = data_dict  # Mantém referência ao dicionário original
        
    def receber_dano(self, dano):
        """Aplica dano ao inimigo."""
        self.vida -= dano
        self.data['vida_atual'] = self.vida
        if self.vida <= 0:
            self.vida = 0
            self.data['vida_atual'] = 0
            self.data['ativo'] = False

class EnemyManager:
    """Gerenciador de inimigos do jogo."""
    
    # --- 3. __INIT__ CORRIGIDO PARA USAR CONSTANTES ---
    def __init__(self):
        """Inicializa o gerenciador de inimigos."""
        self.inimigos = []
        self.inimigo_atual_index = 0
        self.animacao_rotacao_ativa = False
        self.progresso_rotacao = 0.0
        self.tempo_espera_inimigo = 0
        
        # Posições em profundidade para múltiplos inimigos
        # Agora lendo as constantes de constants.py
        self.posicoes_profundidade = [
                # [x, y, largura, altura, z_order] - z_order maior = mais na frente
                [INIMIGO_FRENTE_X, INIMIGO_FRENTE_Y, INIMIGO_FRENTE_LARGURA, INIMIGO_FRENTE_ALTURA, 3], # Posição principal (frente)
                [INIMIGO_MEIO_X, INIMIGO_MEIO_Y, INIMIGO_MEIO_LARGURA, INIMIGO_MEIO_ALTURA, 2],     # Posição secundária (meio)
                [INIMIGO_ATRAS_X, INIMIGO_ATRAS_Y, INIMIGO_ATRAS_LARGURA, INIMIGO_ATRAS_ALTURA, 1],   # Posição terciária (atrás)
        ]
        
    # --- O RESTO DO SEU CÓDIGO (ESTAVA CORRETO) ---
        
    def gerar_inimigos_aleatorios(self, sprites_inimigo=None):
        """Gera de 1 a 3 inimigos aleatoriamente."""
        # Probabilidades: 25% um, 50% dois, 25% três
        rand = random.random()
        if rand < 0.25:
            num_inimigos = 1
        elif rand < 0.75:
            num_inimigos = 2
        else:
            num_inimigos = 3
        
        # === PRIMEIRA FASE === Apenas GHOST para teste (configuração garantida)
        tipos_inimigos = [
            {'nome': 'GHOST', 'tipo': 'fantasma', 'vida': 80},     # Fantasma fraco
            {'nome': 'GHOST', 'tipo': 'fantasma', 'vida': 100},    # Fantasma normal
            {'nome': 'GHOST', 'tipo': 'fantasma', 'vida': 120},    # Fantasma forte
        ]
        
        # REMOVIDO temporariamente para testar apenas Ghost:
        # {'nome': 'KASTLE', 'tipo': 'castelo', 'vida': 150},     # Castelo resistente
        # {'nome': 'KASTLE', 'tipo': 'castelo', 'vida': 120},     # Castelo normal
        # {'nome': 'BALLOON_RED', 'tipo': 'balao', 'vida': 60},  # Balão fraco
        # {'nome': 'BALLOON_BLUE', 'tipo': 'balao', 'vida': 80}, # Balão normal
        
        self.inimigos = []
        
        for i in range(num_inimigos):
            # Atribui posição baseada no índice
            pos_index = i % len(self.posicoes_profundidade)
            pos_config = self.posicoes_profundidade[pos_index]
            
            # Escolhe tipo aleatório
            tipo_escolhido = random.choice(tipos_inimigos)
            
            # === NOVO: Sistema de sprites específicos por tipo ===
            sprites_inimigo_tipo = None
            if tipo_escolhido['nome'] == 'GHOST':
                sprites_inimigo_tipo = 'ghost'  # Nome da pasta de sprites
            elif tipo_escolhido['nome'] == 'KASTLE':
                sprites_inimigo_tipo = 'kastle'
            elif tipo_escolhido['nome'].startswith('BALLOON'):
                sprites_inimigo_tipo = 'ballons'
            else:
                sprites_inimigo_tipo = 'ghost'  # Default
            
            inimigo = {
                'nome': tipo_escolhido['nome'],
                'tipo': tipo_escolhido['tipo'],
                'sprite_tipo': sprites_inimigo_tipo,  # Novo campo
                'pos_x': pos_config[0],
                'pos_y': pos_config[1], 
                'largura': pos_config[2],
                'altura': pos_config[3],
                'z_order': pos_config[4],
                'pos_original': pos_index,
                'pos_atual': pos_index,
                'vida_atual': tipo_escolhido['vida'],
                'vida_max': tipo_escolhido['vida'],
                'vida_visual': float(tipo_escolhido['vida']),
                'sprites': None,  # Será carregado dinamicamente
                'ativo': True,
                'frame_atual': 0,
                'tempo_animacao': 0,
                'shake': {'ativo': False, 'intensidade': 0, 'tempo': 0, 'offset_x': 0, 'offset_y': 0}
            }
            self.inimigos.append(inimigo)
        
        # Define o primeiro inimigo como ativo (na frente)
        self.inimigo_atual_index = 0
        self.animacao_rotacao_ativa = False
        self.progresso_rotacao = 0.0
        
        print(f"🎲 Spawned {num_inimigos} inimigo(s) aleatoriamente!")
        print(f"👁️ Inimigo da frente: {self.inimigos[0]['nome'] if self.inimigos else 'Nenhum'}")
        return num_inimigos
        
    def iniciar_rotacao_inimigo(self):
        """Inicia a animação de rotação de posições dos inimigos."""
        if not self.inimigos or len(self.inimigos) <= 1:
            return
        
        import pygame
        self.animacao_rotacao_ativa = True
        self.tempo_espera_inimigo = pygame.time.get_ticks()
        self.progresso_rotacao = 0.0
        print("🔄 Iniciando rotação de posições...")
        
    def atualizar_rotacao_inimigo(self):
        """Atualiza a animação de rotação entre posições dos inimigos."""
        if not self.animacao_rotacao_ativa:
            return
        
        import pygame
        tempo_atual = pygame.time.get_ticks()
        tempo_decorrido = tempo_atual - self.tempo_espera_inimigo
        
        # Calcula progresso da animação
        self.progresso_rotacao = min(tempo_decorrido / DURACAO_ESPERA_ROTACAO, 1.0)
        
        # Aplicar interpolação suave
        progress_smooth = self._ease_in_out(self.progresso_rotacao)
        
        # Interpola posições de todos os inimigos ativos
        for inimigo in self.inimigos:
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
            
            inimigo['pos_x'] = self._lerp(config_atual[0], config_destino[0], progress_smooth)
            inimigo['pos_y'] = self._lerp(config_atual[1], config_destino[1], progress_smooth)
            inimigo['largura'] = int(self._lerp(config_atual[2], config_destino[2], progress_smooth))
            inimigo['altura'] = int(self._lerp(config_atual[3], config_destino[3], progress_smooth))
            inimigo['z_order'] = config_destino[4] if progress_smooth > 0.5 else config_atual[4]
        
        # Finaliza a rotação
        if self.progresso_rotacao >= 1.0:
            self.finalizar_rotacao()
            
    def finalizar_rotacao(self):
        """Finaliza a rotação, atualizando as posições finais."""
        self.animacao_rotacao_ativa = False
        self.progresso_rotacao = 0.0
        
        # Conta inimigos vivos
        inimigos_vivos = [i for i in self.inimigos if i['ativo'] and i['vida_atual'] > 0]
        
        # Atualiza índices de posição e configurações
        for inimigo in inimigos_vivos:
            # Calcula nova posição
            if len(inimigos_vivos) == 2:
                inimigo['pos_atual'] = (inimigo['pos_atual'] + 1) % 2
            else:
                inimigo['pos_atual'] = (inimigo['pos_atual'] + 1) % len(self.posicoes_profundidade)
            
            # Aplica a nova configuração
            config = self.posicoes_profundidade[inimigo['pos_atual']]
            inimigo['pos_x'] = config[0]
            inimigo['pos_y'] = config[1]
            inimigo['largura'] = config[2]
            inimigo['altura'] = config[3]
            inimigo['z_order'] = config[4]
        
        # Atualiza o índice do inimigo atual
        self.atualizar_inimigo_atual()
        
        inimigo_frente = self.get_inimigo_na_frente()
        nome_frente = inimigo_frente['nome'] if inimigo_frente else "Nenhum"
        print(f"✅ Rotação finalizada. Inimigo da frente: {nome_frente}")
        
    def get_inimigo_na_frente(self):
        """Retorna o inimigo que está na posição da frente."""
        for inimigo in self.inimigos:
            if inimigo['ativo'] and inimigo['vida_atual'] > 0 and inimigo['z_order'] == 3:
                return inimigo
        return None
        
    def atualizar_inimigo_atual(self):
        """Atualiza qual inimigo está atualmente na frente."""
        inimigo_frente = self.get_inimigo_na_frente()
        if inimigo_frente:
            self.inimigo_atual_index = self.inimigos.index(inimigo_frente)
            
    def obter_inimigos_ativos(self):
        """Retorna lista de inimigos ativos."""
        return [inimigo for inimigo in self.inimigos if inimigo['ativo']]
        
    def obter_inimigos_vivos(self):
        """Retorna lista de inimigos vivos."""
        return [inimigo for inimigo in self.inimigos if inimigo['ativo'] and inimigo['vida_atual'] > 0]
        
    def aplicar_dano_inimigo_atual(self, dano):
        """Aplica dano ao inimigo da frente."""
        inimigo_atual = self.get_inimigo_na_frente()
        if inimigo_atual:
            inimigo_atual['vida_atual'] -= dano
            if inimigo_atual['vida_atual'] <= 0:
                inimigo_atual['vida_atual'] = 0
                inimigo_atual['ativo'] = False
                
                # Verifica se há inimigos restantes
                inimigos_restantes = self.obter_inimigos_vivos()
                if len(inimigos_restantes) > 0:
                    self.inimigo_atual_index = self.inimigos.index(inimigos_restantes[0])
                    print(f"👁️ Novo inimigo da frente: {inimigos_restantes[0]['nome']}")
            return inimigo_atual
        return None
        
    def todos_derrotados(self):
        """Verifica se todos os inimigos foram derrotados."""
        return len(self.obter_inimigos_vivos()) == 0
        
    def atualizar_sprites(self, sprites_inimigo):
        """Atualiza os sprites de todos os inimigos."""
        for inimigo in self.inimigos:
            inimigo['sprites'] = sprites_inimigo
            
    def _lerp(self, start, end, t):
        """Interpolação linear entre dois valores."""
        return start + (end - start) * t
    
    def _ease_in_out(self, t):
        """Função de easing para animação mais suave."""
        return t * t * (3.0 - 2.0 * t)
        
    def gerar_inimigo_aleatorio(self):
        """Gera um único inimigo aleatório."""
        self.gerar_inimigos_aleatorios()
        inimigo_data = self.get_inimigo_na_frente()
        if inimigo_data:
            return Enemy(inimigo_data)
        return None
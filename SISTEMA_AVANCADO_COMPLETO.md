# 🎮 JokenGhost - Sistema Avançado de Combate

## 🚀 Novas Funcionalidades Implementadas

### 🔍 1. Detecção Inteligente de Frames de Sprite
**Sistema Automático de Análise:**
- **Detecção por Proporção**: Analisa dimensões da sprite sheet automaticamente
- **Suporte Múltiplos Formatos**: Horizontal, vertical, e sprites únicas
- **Auto-detecção Avançada**: Testa proporções comuns (2, 3, 4, 5, 6, 8, 10, 12 frames)
- **Feedback Detalhado**: Mostra quantos frames foram detectados no console

**Exemplos de Saída:**
```
📁 Carregando sprites de Ghost...
    🎬 Sprite horizontal: 12 frames de 640x640
📁 Carregando sprites de Skeleton...
    🎬 Sprite horizontal: 7 frames de 115x115
```

### 📋 2. Sistema de Menu de Seleção Organizados

**Menu Principal com 3 Botões:**
- **ATAQUES** 🗡️: Abre menu de seleção de ataques
- **LOJA** 🏪: Abre menu de compras
- **STATUS** 📊: Mostra informações do jogador

**Animação Suave:**
- Menu desliza de baixo para cima
- Velocidade controlada (15 pixels por frame)
- Altura alvo de 300 pixels
- Botão X vermelho para fechar

### ⚔️ 3. Menu de Ataques Redesenhado

**Interface Melhorada:**
- **Título**: "ESCOLHA SEU ATAQUE"
- **Botões Centralizados**: Pedra, Papel, Tesoura
- **Informações Detalhadas**:
  - PEDRA: Efetivo vs Ghost (+60 moedas) 🟢
  - PAPEL: Médio vs Ghost (+25 moedas) 🟡
  - TESOURA: Bom vs Ghost (+35 moedas) 🟠

**Funcionamento:**
- Clica no ataque → Executa → Fecha menu automaticamente
- Visual claro sobre efetividade

### 🏪 4. Sistema de Loja Aprimorado

**Layout em Cards:**
- **3 itens lado a lado** em formato de cartões
- **Informações Completas**: Nome, preço, efeito
- **Indicadores Visuais**: Verde = pode comprar, Cinza = sem dinheiro
- **Efeitos Claros**: "+30 HP", "+60 HP", "-15 HP inimigo"

**Itens Disponíveis:**
1. **Poção de Cura** - $30 - +30 HP
2. **Buff Ofensivo** - $50 - -15 HP no inimigo  
3. **Poção Grande** - $80 - +60 HP

### 💥 5. Efeito de "Balançada" ao Tomar Dano

**Sistema de Shake Effect:**
- **Intensidade**: 15 pixels para personagens
- **Duração**: 500ms (0.5 segundos)
- **Decaimento**: Intensidade diminui progressivamente
- **Movimento**: X + Y aleatórios, Y com metade da intensidade

**Implementação:**
- Jogador balança quando perde
- Inimigo balança quando perde
- Sincronizado com mudança de vida

### 📊 6. Visualização Melhorada da Vida

**Animação Suave das Barras:**
- **Transição Gradual**: Vida diminui/aumenta suavemente
- **Velocidade**: 2 pontos por frame
- **Sincronização**: Visual acompanha o valor real
- **Variáveis Separadas**: `vida_jogador_visual` e `vida_inimigo_visual`

**Barras Estilo Pokémon:**
- **Cores Dinâmicas**: 
  - Verde (>60% vida)
  - Amarelo (30-60% vida)  
  - Vermelho (<30% vida)
- **Posicionamento**: Canto inferior esquerdo (jogador), superior direito (inimigo)

### 🎬 7. Sistema de Animações Completo

**Detecção Automática de Frames:**
```python
# Usa TODOS os frames detectados automaticamente
max_frames = sprite_data['total_frames']  # Não mais limitado a 6
self.frame_atual_jogador = (self.frame_atual_jogador + 1) % max_frames
```

**Velocidades Adaptáveis:**
- **2 frames**: 800ms por frame (lento)
- **3-4 frames**: 400ms por frame (médio)
- **5+ frames**: 200ms por frame (rápido)
- **Ataques**: 100ms por frame (muito rápido)

### 🎯 8. Controles e Interação

**Hierarquia de Prioridades:**
1. **Menu Ativo**: Bloqueia outros cliques
2. **Animação de Entrada**: Desabilita botões principais
3. **Botões Principais**: Ataques, Loja, Status
4. **Cliques nos Menus**: Processos específicos

**Fluxo de Interação:**
```
Clica ATAQUES → Menu abre → Clica PEDRA → Ataca → Menu fecha
Clica LOJA → Menu abre → Clica item → Compra → Menu permanece aberto
Clica STATUS → Mostra info no console
```

### 🔧 9. Melhorias Técnicas

**Estados de Jogo Expandidos:**
```python
class EstadoJogo(Enum):
    MENU = 1
    TRANSICAO = 2
    BATALHA = 3
    RESULTADO = 4
    MENU_SELECAO = 5  # NOVO
```

**Tipos de Menu:**
```python
class TipoMenu(Enum):
    ATAQUES = 1
    LOJA = 2
```

**Variáveis de Controle:**
- `menu_selecao_ativo`: Boolean para controle do menu
- `tipo_menu_atual`: Qual menu está aberto
- `menu_altura`: Altura atual da animação
- `shake_jogador/inimigo`: Estados do shake effect

### 📈 10. Feedback Visual e Console

**Mensagens Informativas:**
```
🎬 Animação de entrada finalizada!
📋 Abrindo menu: ATAQUES
🎬 Shake iniciado para jogador (intensidade: 15)
💰 Rodada vencida! +$60 (Total: $60)
📊 Status - Vida: 80/100 | Dinheiro: $95
```

**Logs de Sprite Detection:**
```
📁 Carregando sprites de Ghost...
    🎬 Sprite horizontal: 12 frames de 640x640
    🎯 Auto-detectado: 12 frames de 640x640
```

## 🎮 Como Usar

### Controles Principais:
1. **Clicar "ATAQUES"** → Abre menu de ataques
2. **Escolher ataque** → Pedra/Papel/Tesoura
3. **Clicar "LOJA"** → Abre menu de compras
4. **Comprar itens** → Clica no card do item
5. **Clicar "STATUS"** → Mostra informações
6. **Botão X vermelho** → Fecha qualquer menu

### Animações Visuais:
- ✅ **Entrada**: Personagens deslizam para posições
- ✅ **Dano**: Personagens balançam ao tomar dano
- ✅ **Vida**: Barras diminuem/aumentam suavemente
- ✅ **Menu**: Desliza de baixo para cima
- ✅ **Sprites**: Animações automáticas baseadas nos frames

### Sistema de Recompensas:
- **PEDRA**: +60 moedas por rodada vencida
- **TESOURA**: +35 moedas por rodada vencida
- **PAPEL**: +25 moedas por rodada vencida
- **Vitória final**: Bonus 2x da última jogada

## 🏆 Resultado Final

O jogo agora oferece:
- 🎯 **Detecção automática** de frames de qualquer sprite sheet
- 📋 **Menus organizados** com animações suaves
- 💥 **Efeitos visuais** realistas (shake, barras animadas)
- 🎮 **Interface intuitiva** estilo Pokémon moderno
- 🔄 **Feedback completo** visual e textual

### Exemplos de Sprites Suportados:
- ✅ `ghost_12frames_640x640.png` → 12 frames detectados
- ✅ `skeleton_7frames_115x115.png` → 7 frames detectados  
- ✅ `personagem_12frames_64x64.png` → 12 frames detectados
- ✅ `kastle_2frames_48x48.png` → 2 frames detectados

**Sistema totalmente adaptável a qualquer sprite sheet!** 🚀

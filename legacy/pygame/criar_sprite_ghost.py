import pygame
import sys
import os

# Script para salvar a sprite do ghost que você enviou
# Esta é uma versão temporária - você deve substituir pela sua imagem real

def criar_sprite_ghost_exemplo():
    """Cria um sprite de exemplo do ghost com 2 frames"""
    
    # Inicializa o pygame para poder criar superfícies
    pygame.init()
    
    # Cria uma superfície para o sprite sheet (2 frames de 64x64 cada)
    sprite_width = 128  # 2 frames de 64x64
    sprite_height = 64
    sprite_sheet = pygame.Surface((sprite_width, sprite_height), pygame.SRCALPHA)
    
    # Cores para o ghost
    ghost_body = (100, 50, 150)  # Roxo para o corpo
    ghost_fire = (255, 150, 0)   # Laranja para o fogo
    ghost_eyes = (255, 0, 0)     # Vermelho para os olhos
    
    # Frame 1 (posição normal)
    frame1_rect = pygame.Rect(0, 0, 64, 64)
    pygame.draw.rect(sprite_sheet, ghost_body, (0, 10, 64, 40))  # Corpo
    pygame.draw.rect(sprite_sheet, ghost_fire, (10, 45, 44, 15))  # Fogo base
    pygame.draw.circle(sprite_sheet, ghost_eyes, (20, 25), 3)     # Olho esquerdo
    pygame.draw.circle(sprite_sheet, ghost_eyes, (44, 25), 3)     # Olho direito
    
    # Frame 2 (ligeiramente diferente para animação)
    frame2_rect = pygame.Rect(64, 0, 64, 64)
    pygame.draw.rect(sprite_sheet, ghost_body, (64, 12, 64, 38))  # Corpo ligeiramente deslocado
    pygame.draw.rect(sprite_sheet, ghost_fire, (74, 47, 44, 13))  # Fogo ligeiramente diferente
    pygame.draw.circle(sprite_sheet, ghost_eyes, (84, 27), 3)     # Olho esquerdo
    pygame.draw.circle(sprite_sheet, ghost_eyes, (108, 27), 3)    # Olho direito
    
    return sprite_sheet

def main():
    # Cria o sprite de exemplo
    sprite_ghost = criar_sprite_ghost_exemplo()
    
    # Caminho para salvar
    save_path = os.path.join("Assests", "Sprites_skeleton", "ghost_enemy_temp.png")
    
    # Cria a pasta se não existir
    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    
    # Salva o sprite
    pygame.image.save(sprite_ghost, save_path)
    
    print(f"✅ Sprite de exemplo criado em: {save_path}")
    print("📝 IMPORTANTE: Substitua este arquivo pela sua sprite real do ghost!")
    print("📏 Formato esperado: 2 frames lado a lado, cada frame deve ser quadrado ou retangular")
    
    pygame.quit()

if __name__ == "__main__":
    main()

import os
import sys

# Must be set BEFORE pygame.init() — tells SDL to use bicubic/anisotropic
# interpolation when scaling the 800×600 logical canvas to the screen.
# '0' = nearest-neighbour (pixelated default)
# '1' = linear (smooth)
# '2' = best / anisotropic (highest quality)
os.environ['SDL_RENDER_SCALE_QUALITY'] = '2'

import pygame
from eta.states.menu_state import MenuState

SCREEN_WIDTH  = 800
SCREEN_HEIGHT = 600
FPS           = 60


def main():
    pygame.init()
    pygame.mixer.init()

    screen = pygame.display.set_mode(
        (SCREEN_WIDTH, SCREEN_HEIGHT),
        pygame.FULLSCREEN | pygame.SCALED,
    )
    pygame.display.set_caption('Controle de Tráfego Aéreo')
    clock = pygame.time.Clock()

    state             = MenuState()
    mouse_just_pressed = False

    while True:
        dt = clock.tick(FPS) / 1000.0
        mouse_just_pressed = False

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()
            if event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE:
                pygame.quit()
                sys.exit()
            if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
                mouse_just_pressed = True
            state.handle_event(event)

        mouse_pos  = pygame.mouse.get_pos()
        mouse_down = pygame.mouse.get_pressed()[0]

        new_state = state.update(dt, mouse_pos, mouse_down, mouse_just_pressed)
        if new_state is not state:
            state = new_state

        state.draw(screen)
        pygame.display.flip()


if __name__ == '__main__':
    main()

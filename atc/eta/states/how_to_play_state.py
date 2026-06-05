import os
import sys
import pygame
from eta.eta_style import (
    draw_dark_bg, draw_glass, draw_hub_button, draw_back_button,
    BACK_RECT, TEXT, MUTED, BLUE_1, BLUE_2, GOLD,
)

ASSETS = os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'img')

BACK_TO_MENU_RECT = pygame.Rect(220, 490, 360, 62)

STEPS = [
    (BLUE_1, '1', 'Selecione um avião',   'Clique sobre ele para selecioná-lo'),
    (BLUE_2, '2', 'Trace o caminho',       'Segure e arraste o mouse até a pista de pouso'),
    (GOLD,   '3', 'Evite colisões',        'O jogo termina na primeira batida entre aviões'),
]

TYPES = [
    ('Pequeno',  '10 pts',  'Lento, gira na hora',       BLUE_1),
    ('Médio',    '50 pts',  'Velocidade moderada',        BLUE_2),
    ('Pesado',   '100 pts', 'Rápido, raio de curva alto', GOLD),
]


class HowToPlayState:
    _fonts = None

    def __init__(self):
        try:
            raw = pygame.image.load(os.path.join(ASSETS, 'background.png')).convert()
            self._bg_img = pygame.transform.scale(raw, (800, 600))
        except Exception:
            self._bg_img = None

    @classmethod
    def _get_fonts(cls):
        if cls._fonts is None:
            cls._fonts = {
                'title':  pygame.font.SysFont('Verdana', 32, bold=True),
                'sub':    pygame.font.SysFont('Verdana', 12),
                'step_n': pygame.font.SysFont('Verdana', 15, bold=True),
                'step_t': pygame.font.SysFont('Verdana', 12, bold=True),
                'step_s': pygame.font.SysFont('Verdana', 10),
                'btn_t':  pygame.font.SysFont('Verdana', 13, bold=True),
                'btn_s':  pygame.font.SysFont('Verdana', 10),
                'back':   pygame.font.SysFont('Verdana', 13, bold=True),
                'pts':    pygame.font.SysFont('Verdana', 11, bold=True),
                'nm':     pygame.font.SysFont('Verdana', 10),
            }
        return cls._fonts

    def handle_event(self, event):
        pass

    def update(self, dt, mouse_pos, mouse_down, mouse_just_pressed):
        if mouse_just_pressed:
            x, y = mouse_pos
            if BACK_RECT.collidepoint(x, y):
                pygame.quit()
                sys.exit()
            if BACK_TO_MENU_RECT.collidepoint(x, y):
                from eta.states.menu_state import MenuState
                return MenuState()
        return self

    def draw(self, surface):
        f      = self._get_fonts()
        mx, my = pygame.mouse.get_pos()

        # Background
        draw_dark_bg(surface)
        if self._bg_img:
            tint = pygame.Surface((800, 600), pygame.SRCALPHA)
            tint.fill((6, 18, 31, 205))
            surface.blit(self._bg_img, (0, 0))
            surface.blit(tint, (0, 0))

        # Title
        title = f['title'].render('Como Jogar', True, TEXT)
        surface.blit(title, title.get_rect(center=(400, 58)))
        sub = f['sub'].render('ETA ATC — Guia rápido', True, MUTED)
        surface.blit(sub, sub.get_rect(center=(400, 90)))

        # Steps card
        steps_card = pygame.Rect(80, 112, 620, 172)
        draw_glass(surface, steps_card, border_radius=20, alpha=8)

        for i, (color, num, step_t, step_s) in enumerate(STEPS):
            row_cy = steps_card.y + 30 + i * 50
            cx = steps_card.x + 34

            circ = pygame.Surface((34, 34), pygame.SRCALPHA)
            pygame.draw.circle(circ, (*color, 200), (17, 17), 17)
            surface.blit(circ, (cx - 17, row_cy - 17))
            n_s = f['step_n'].render(num, True, (8, 18, 36))
            surface.blit(n_s, n_s.get_rect(center=(cx, row_cy)))

            surface.blit(f['step_t'].render(step_t, True, TEXT),
                         (cx + 26, row_cy - 12))
            surface.blit(f['step_s'].render(step_s, True, MUTED),
                         (cx + 26, row_cy + 5))

        # Plane types row
        types_card = pygame.Rect(80, 300, 620, 86)
        draw_glass(surface, types_card, border_radius=18, alpha=8)

        chip_w   = 160
        chip_gap = (types_card.w - 3 * chip_w) // 4
        for i, (name, pts, desc, color) in enumerate(TYPES):
            x0 = types_card.x + chip_gap + i * (chip_w + chip_gap)
            cy = types_card.centery
            acc = pygame.Surface((chip_w - 16, 2), pygame.SRCALPHA)
            acc.fill((*color, 160))
            surface.blit(acc, (x0 + 8, types_card.y + 10))
            surface.blit(f['pts'].render(pts,  True, color),
                         f['pts'].render(pts, True, color).get_rect(
                             center=(x0 + chip_w // 2, cy - 12)))
            surface.blit(f['nm'].render(name, True, TEXT),
                         f['nm'].render(name, True, TEXT).get_rect(
                             center=(x0 + chip_w // 2, cy + 4)))
            surface.blit(f['nm'].render(desc, True, MUTED),
                         f['nm'].render(desc, True, MUTED).get_rect(
                             center=(x0 + chip_w // 2, cy + 18)))

        # Tip
        tip_card = pygame.Rect(80, 402, 620, 58)
        draw_glass(surface, tip_card, border_radius=14, alpha=6, border_alpha=14)
        tip = f['step_s'].render(
            'Dica: para o avião pesado, trace o caminho com bastante antecedência — ele tem raio de curva alto!',
            True, MUTED)
        surface.blit(tip, tip.get_rect(midleft=(tip_card.x + 14, tip_card.centery)))

        # Back to menu button
        hov = BACK_TO_MENU_RECT.collidepoint(mx, my)
        draw_hub_button(surface, BACK_TO_MENU_RECT,
                        f['btn_t'].render('VOLTAR AO MENU', True, TEXT),
                        f['btn_s'].render('Retornar ao menu principal', True, MUTED),
                        hover=hov)

        draw_back_button(surface, f['back'], hover=BACK_RECT.collidepoint(mx, my))

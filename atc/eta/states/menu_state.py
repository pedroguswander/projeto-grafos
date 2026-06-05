import os
import sys
import pygame

ASSETS = os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'img')

# ── Hit regions — calibrated by pixel scanning menu_v4.png (900×620 → 800×600)
# Set True to see coloured overlays for fine-tuning
DEBUG_BUTTONS = False

PLAY_RECT = pygame.Rect(272, 318, 258, 80)    # ► JOGAR
RANK_RECT = pygame.Rect(258, 432, 288, 60)    # 🏆 RANKING  (desceu 20px)
BACK_RECT = pygame.Rect(668,  29, 101, 50)    # < Voltar   (correto)


class MenuState:
    _bg   = None   # smoothscale'd menu_v4.png — loaded once
    _ready = False

    def __init__(self):
        pass

    @classmethod
    def _load(cls):
        if cls._ready:
            return
        cls._ready = True
        try:
            raw    = pygame.image.load(os.path.join(ASSETS, 'menu_v4.png')).convert()
            # smoothscale = bilinear interpolation → crisp quality
            cls._bg = pygame.transform.smoothscale(raw, (800, 600))
        except Exception as e:
            print(f'[Menu] menu_v4.png: {e}')
            cls._bg = None

    def handle_event(self, event):
        pass

    def update(self, dt, mouse_pos, mouse_down, mouse_just_pressed):
        if mouse_just_pressed:
            mx, my = mouse_pos
            if BACK_RECT.collidepoint(mx, my):
                pygame.quit()
                sys.exit()
            if PLAY_RECT.collidepoint(mx, my):
                from eta.states.playing_state import PlayingState
                return PlayingState()
            if RANK_RECT.collidepoint(mx, my):
                from eta.states.ranking_state import RankingState
                return RankingState()
        return self

    def draw(self, surface):
        self._load()

        # ── PNG background (high-quality scaled) ──────────────────
        if self._bg:
            surface.blit(self._bg, (0, 0))
        else:
            surface.fill((3, 13, 26))

        # ── Debug overlay — set DEBUG_BUTTONS=True to calibrate ───
        if DEBUG_BUTTONS:
            for rect, col, lbl in [
                (PLAY_RECT, (  0, 255,   0), 'PLAY'),
                (RANK_RECT, (  0, 200, 255), 'RANK'),
                (BACK_RECT, (255, 100, 100), 'BACK'),
            ]:
                dbg = pygame.Surface((rect.w, rect.h), pygame.SRCALPHA)
                dbg.fill((*col, 55))
                pygame.draw.rect(dbg, (*col, 200), (0, 0, rect.w, rect.h), 2)
                surface.blit(dbg, rect.topleft)
                font = pygame.font.SysFont('Verdana', 11, bold=True)
                surface.blit(font.render(lbl, True, col), (rect.x+4, rect.y+4))

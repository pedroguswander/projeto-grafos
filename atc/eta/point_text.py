import pygame
from engine.vector import Vector


class PointText:
    FONT = None

    def __init__(self, text, position):
        self.text = text
        self.position = position.clone()
        self.alpha = 255
        self.finished = False
        self._vel_y = -40.0  # pixels per second upward

    @classmethod
    def _get_font(cls):
        if cls.FONT is None:
            cls.FONT = pygame.font.SysFont('Arial', 30, bold=True)
        return cls.FONT

    def update(self, dt):
        if self.finished:
            return
        self.position.y += self._vel_y * dt
        self.alpha -= 255 * 0.002 * (dt * 1000)
        if self.alpha <= 0:
            self.alpha = 0
            self.finished = True

    def draw(self, surface):
        font = self._get_font()
        text_surf = font.render(self.text, True, (246, 197, 111))
        text_surf.set_alpha(max(0, int(self.alpha)))
        rect = text_surf.get_rect(center=(int(self.position.x), int(self.position.y)))
        surface.blit(text_surf, rect)

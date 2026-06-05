import os
import pygame
from engine.vector import Vector
from engine.rectangle import Rectangle
from eta.airplane.airplane import Airplane

ASSETS = os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'img')


class HeavyAirplane(Airplane):
    def __init__(self):
        super().__init__()
        self._velocity   = Vector().set_polar(Vector.random_angle(), 110.0)
        self._turn_speed = 1.5
        self._hitbox     = Rectangle(18, 18)
        self.score       = 100
        try:
            img = pygame.image.load(os.path.join(ASSETS, 'heavy.png')).convert_alpha()
            w, h = img.get_width(), img.get_height()
            self._image = pygame.transform.scale(img, (max(1, round(w * 0.72)),
                                                       max(1, round(h * 0.72))))
        except Exception:
            self._image = None

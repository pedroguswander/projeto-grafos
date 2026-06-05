import os
import pygame
from engine.vector import Vector
from engine.rectangle import Rectangle

ASSETS = os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'img')

SCALE = 0.52   # visual scale — airport1.png (112×200) → ~58×104 px

# Landing strip proportional to SCALE
# Original geometry: 70px wide, 200px tall, offset (-20, 0)
LANDING_REL    = Rectangle(round(70 * SCALE), round(200 * SCALE),
                            Vector(round(-20 * SCALE), 0))
LANDING_ANGLE     = Vector(0, 1)
LANDING_THRESHOLD = 0.22   # |sin(θ)| < 0.22 → within ~12.7° of vertical


class Airport:
    def __init__(self, position):
        self._position = position.clone()
        try:
            raw = pygame.image.load(os.path.join(ASSETS, 'airport1.png')).convert_alpha()
            w   = max(1, round(raw.get_width()  * SCALE))
            h   = max(1, round(raw.get_height() * SCALE))
            self._image = pygame.transform.scale(raw, (w, h))
        except Exception:
            self._image = None

    def in_landing_area(self, airplane):
        """
        Scores when the plane crosses the runway from TOP or BOTTOM:
          - Plane center X must be inside the runway strip (not beside the building)
          - Plane hitbox must overlap the strip vertically (touching top or bottom)
          - Plane must be flying mostly vertically (not approaching from the side)
        """
        area = LANDING_REL.clone()
        area.position.add(self._position)

        hb    = airplane.get_hitbox()
        hb_cx = hb.position.x + hb.width / 2

        # 1. Centre of plane must be within the runway's X bounds
        if not (area.position.x <= hb_cx <= area.position.x + area.width):
            return False

        # 2. Plane's hitbox must overlap the strip (touching from top or bottom)
        if not hb.collides_with(area):
            return False

        # 3. Must be flying mostly vertically (top/bottom approach)
        vel     = airplane.get_velocity()
        vel_len = vel.get_length()
        if vel_len == 0:
            return False

        vel_norm = Vector(vel.x / vel_len, vel.y / vel_len)
        # cross((0,1), vel_norm) = -vel_norm.x
        return abs(LANDING_ANGLE.cross(vel_norm)) < LANDING_THRESHOLD

    def draw(self, surface):
        if self._image:
            surface.blit(self._image, (int(self._position.x), int(self._position.y)))
        else:
            pygame.draw.rect(surface, (60, 120, 200),
                             (int(self._position.x), int(self._position.y), 30, 54))

import math
import pygame
from engine.vector import Vector
from engine.rectangle import Rectangle

ROAMING_AREA = Rectangle(800, 570, Vector(0, 30))
PATH_GAP_SIZE2 = 100  # minimum 10px between waypoints squared


class Airplane:
    def __init__(self):
        self._position = Vector()
        self._velocity = Vector().set_polar(Vector.random_angle(), 80.0)
        self._turn_speed = 1.5  # rad/s
        self._hitbox = Rectangle(25, 25)
        self._path = []
        self.crashed = False
        self.score = 0
        self._image = None

    def set_position(self, position):
        self._position = position.clone()
        self._hitbox.center_on(self._position)
        return self

    def get_position(self):
        return self._position.clone()

    def get_velocity(self):
        return self._velocity.clone()

    def get_hitbox(self):
        return self._hitbox.clone()

    def clear_path(self):
        self._path = []

    def add_target(self, x, y):
        roam_min = ROAMING_AREA.get_min()
        roam_max = ROAMING_AREA.get_max()
        if not (roam_min.x < x < roam_max.x and roam_min.y < y < roam_max.y):
            return
        target = Vector(x, y)
        last = self._path[-1] if self._path else None
        if last is None or Vector.distance_between2(last, target) > PATH_GAP_SIZE2:
            self._path.append(target)

    def update(self, dt):
        if self.crashed:
            return

        pos = self._position
        vel = self._velocity
        roam_min = ROAMING_AREA.get_min()
        roam_max = ROAMING_AREA.get_max()

        if not self._hitbox.is_inside(ROAMING_AREA):
            if (pos.x < roam_min.x and vel.x < 0) or (pos.x > roam_max.x and vel.x > 0):
                vel.x *= -1
            if (pos.y < roam_min.y and vel.y < 0) or (pos.y > roam_max.y and vel.y > 0):
                vel.y *= -1

        if self._path:
            target = self._path[0]
            reach2 = (self._hitbox.width) ** 2
            if Vector.distance_between2(pos, target) < reach2:
                self._path.pop(0)
            else:
                dx = target.x - pos.x
                dy = target.y - pos.y
                path_len = math.sqrt(dx * dx + dy * dy)
                vel_len = vel.get_length()
                if vel_len > 0 and path_len > 0:
                    vel_norm = Vector(vel.x / vel_len, vel.y / vel_len)
                    path_norm = Vector(dx / path_len, dy / path_len)
                    cross = vel_norm.cross(path_norm)
                    dot = vel_norm.dot(path_norm)
                    if abs(cross) > 0.05:
                        direction = 1 if cross > 0 else -1
                        self._velocity.rotate(self._turn_speed * dt * direction)
                    elif dot < 0:
                        # target nearly behind — break symmetry with constant turn
                        self._velocity.rotate(self._turn_speed * dt)

        self._position.x += vel.x * dt
        self._position.y += vel.y * dt
        self._hitbox.center_on(self._position)

    def draw(self, surface):
        if self._path:
            points = [(int(self._position.x), int(self._position.y))]
            for p in self._path:
                points.append((int(p.x), int(p.y)))
            if len(points) >= 2:
                pygame.draw.lines(surface, (77, 163, 255), False, points, 2)

        if self._image:
            angle_deg = -math.degrees(self._velocity.get_angle())
            rotated = pygame.transform.rotate(self._image, angle_deg)
            rect = rotated.get_rect(center=(int(self._position.x), int(self._position.y)))
            surface.blit(rotated, rect)

    def draw_glow(self, surface, glow_image):
        if glow_image:
            x = int(self._position.x) - glow_image.get_width() // 2
            y = int(self._position.y) - glow_image.get_height() // 2
            surface.blit(glow_image, (x, y))

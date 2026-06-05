import math
import random


class Vector:
    def __init__(self, x=0.0, y=0.0):
        self.x = float(x)
        self.y = float(y)

    @staticmethod
    def distance_between2(a, b):
        dx = a.x - b.x
        dy = a.y - b.y
        return dx * dx + dy * dy

    @staticmethod
    def random_angle():
        return random.uniform(0, 2 * math.pi)

    def set_polar(self, angle, length):
        self.x = length * math.cos(angle)
        self.y = length * math.sin(angle)
        return self

    def add(self, other):
        self.x += other.x
        self.y += other.y
        return self

    def get_angle(self):
        return math.atan2(self.y, self.x)

    def get_length(self):
        return math.sqrt(self.x * self.x + self.y * self.y)

    def get_length2(self):
        return self.x * self.x + self.y * self.y

    def scale(self, factor):
        self.x *= factor
        self.y *= factor
        return self

    def cross(self, other):
        return self.x * other.y - self.y * other.x

    def dot(self, other):
        return self.x * other.x + self.y * other.y

    def rotate(self, angle):
        new_angle = self.get_angle() + angle
        length = self.get_length()
        self.x = length * math.cos(new_angle)
        self.y = length * math.sin(new_angle)
        return self

    def clone(self):
        return Vector(self.x, self.y)

    def reverse(self):
        self.x *= -1
        self.y *= -1
        return self

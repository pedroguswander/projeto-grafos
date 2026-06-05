from engine.vector import Vector


class Rectangle:
    def __init__(self, width, height, position=None):
        self.width = float(width)
        self.height = float(height)
        self.position = position.clone() if position else Vector()

    def clone(self):
        return Rectangle(self.width, self.height, self.position.clone())

    def get_min(self):
        return self.position.clone()

    def get_max(self):
        return Vector(self.position.x + self.width, self.position.y + self.height)

    def center_on(self, pos):
        self.position = Vector(pos.x - self.width / 2, pos.y - self.height / 2)
        return self

    def collides_with(self, other):
        max_a = self.get_max()
        min_a = self.get_min()
        max_b = other.get_max()
        min_b = other.get_min()
        return (max_a.x > min_b.x and max_a.y > min_b.y and
                max_b.x > min_a.x and max_b.y > min_a.y)

    def is_inside(self, other):
        max_a = self.get_max()
        min_a = self.get_min()
        max_b = other.get_max()
        min_b = other.get_min()
        return (min_a.x > min_b.x and min_a.y > min_b.y and
                max_a.x < max_b.x and max_a.y < max_b.y)

    def contains_point(self, x, y):
        return (self.position.x < x < self.position.x + self.width and
                self.position.y < y < self.position.y + self.height)

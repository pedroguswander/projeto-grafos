import os
import random
import pygame
from engine.vector import Vector
from eta.airplane.small_airplane import SmallAirplane
from eta.airplane.medium_airplane import MediumAirplane
from eta.airplane.heavy_airplane import HeavyAirplane
from eta.airport.airport import Airport
from eta.point_text import PointText
from eta.radar_background import RadarBackground
from eta.eta_style import (
    draw_glass, draw_stat_chip,
    BLUE_1, BLUE_2, GOLD, TEXT, MUTED, DANGER, BG,
)

ASSETS_IMG = os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'img')
ASSETS_SND = os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'sound')

SPAWN_POSITIONS = [Vector(0, 0), Vector(0, 600), Vector(800, 600), Vector(800, 0)]
GAME_OVER_FLASH_SECS = 1.2   # brief "crash flash" before name-input screen

# HUD layout
HUD_H       = 34
CHIP_W      = 168
CHIP_H      = 24
CHIP_Y      = (HUD_H - CHIP_H) // 2
CHIP_L_RECT = pygame.Rect(12,        CHIP_Y, CHIP_W, CHIP_H)   # Pousados
CHIP_R_RECT = pygame.Rect(800 - CHIP_W - 12, CHIP_Y, CHIP_W, CHIP_H)  # Pontuação


class PlayingState:
    def __init__(self):
        self._airplanes   = []
        self._point_texts = []
        # Interior do Nordeste do Brasil no radar (≈ CE/PI interior)
        self._airport     = Airport(Vector(455, 225))
        self._selected    = None

        self._score  = 0
        self._landed = 0
        self._game_over       = False
        self._game_over_timer = 0.0
        self._snapshot        = None   # frozen frame shown in GameOverState
        self._next_spawn      = 0.0
        self._elapsed         = 0.0

        self._radar = RadarBackground()

        try:
            self._glow_image = pygame.image.load(
                os.path.join(ASSETS_IMG, 'glow.png')).convert_alpha()
        except Exception:
            self._glow_image = None

        try:
            pygame.mixer.music.load(os.path.join(ASSETS_SND, 'game.ogg'))
            pygame.mixer.music.set_volume(0.8)
            pygame.mixer.music.play(-1)
        except Exception:
            pass

        try:
            self._score_sound = pygame.mixer.Sound(os.path.join(ASSETS_SND, 'score.ogg'))
        except Exception:
            self._score_sound = None

        self._font_hud_label = pygame.font.SysFont('Verdana', 10, bold=True)
        self._font_hud_val   = pygame.font.SysFont('Verdana', 11, bold=True)
        self._font_go_title  = pygame.font.SysFont('Verdana', 64, bold=True)
        self._font_go_sub    = pygame.font.SysFont('Verdana', 16)
        self._font_go_score  = pygame.font.SysFont('Verdana', 22, bold=True)

        # Pre-render semi-transparent HUD bar (static part)
        self._hud_bar = pygame.Surface((800, HUD_H), pygame.SRCALPHA)
        self._hud_bar.fill((6, 18, 31, 210))
        pygame.draw.line(self._hud_bar, (255, 255, 255, 18), (0, HUD_H-1), (800, HUD_H-1))

        self._spawn_airplane()

    # ── Difficulty ────────────────────────────────────────────────────
    def _difficulty(self):
        """0–1 ramp: atinge máximo ao chegar em 800 pts."""
        return min(self._score / 800.0, 1.0)

    def _spawn_interval(self):
        """Intervalo entre spawns: 10 s no início → 2.5 s no topo."""
        return 10.0 - self._difficulty() * 7.5

    # ── Spawn ─────────────────────────────────────────────────────────
    def _spawn_airplane(self):
        if len(self._airplanes) >= 30:
            return
        pos = random.choice(SPAWN_POSITIONS)

        t = self._difficulty()
        # Pesado: 8 % → 30 % | Médio: 17 % → 40 % | Pequeno: resto
        heavy_pct  =  8 + t * 22
        medium_pct = 17 + t * 23

        r = random.uniform(0, 100)
        if r < heavy_pct:
            plane = HeavyAirplane()
        elif r < heavy_pct + medium_pct:
            plane = MediumAirplane()
        else:
            plane = SmallAirplane()

        plane.set_position(pos)
        self._airplanes.append(plane)
        self._next_spawn = self._elapsed + self._spawn_interval()

    def handle_event(self, event):
        pass

    # ── Update ───────────────────────────────────────────────────────
    def update(self, dt, mouse_pos, mouse_down, mouse_just_pressed):
        self._radar.update(dt)
        self._elapsed += dt

        if self._game_over:
            self._game_over_timer += dt
            if self._game_over_timer >= GAME_OVER_FLASH_SECS:
                from eta.states.game_over_state import GameOverState
                return GameOverState(self._score, self._landed, self._snapshot)
            return self

        for pt in self._point_texts[:]:
            pt.update(dt)
            if pt.finished:
                self._point_texts.remove(pt)

        if self._elapsed >= self._next_spawn:
            self._spawn_airplane()

        mx, my = mouse_pos
        if mouse_down and self._selected is not None:
            self._selected.add_target(mx, my)
        elif not mouse_down:
            self._selected = None

        i = 0
        while i < len(self._airplanes):
            plane = self._airplanes[i]

            if self._airport.in_landing_area(plane):
                if self._score_sound:
                    self._score_sound.play()
                self._point_texts.append(PointText(str(plane.score), plane.get_position()))
                self._score  += plane.score
                self._landed += 1
                self._airplanes.pop(i)
                continue

            for j in range(i + 1, len(self._airplanes)):
                if plane.get_hitbox().collides_with(self._airplanes[j].get_hitbox()):
                    plane.crashed = True
                    plane.clear_path()
                    self._airplanes[j].crashed = True
                    self._airplanes[j].clear_path()
                    try: pygame.mixer.music.stop()
                    except Exception: pass
                    self._game_over = True
                    # capture frozen frame for game-over screen backdrop
                    self._snapshot = pygame.display.get_surface().copy()
                    break

            if self._game_over:
                break

            if (mouse_just_pressed and self._selected is None and
                    plane.get_hitbox().contains_point(mx, my)):
                plane.clear_path()
                self._selected = plane

            plane.update(dt)
            i += 1

        if not self._airplanes and not self._game_over:
            self._spawn_airplane()

        return self

    # ── Draw ─────────────────────────────────────────────────────────
    def draw(self, surface):
        # Animated radar background
        self._radar.draw(surface)

        self._airport.draw(surface)

        if self._selected is not None:
            self._selected.draw_glow(surface, self._glow_image)

        for plane in self._airplanes:
            plane.draw(surface)

        for pt in self._point_texts:
            pt.draw(surface)

        # ── HUD bar ──────────────────────────────────────────────
        surface.blit(self._hud_bar, (0, 0))

        lbl_landed = self._font_hud_label.render('POUSADOS', True, MUTED)
        val_landed = self._font_hud_val.render(str(self._landed), True, BLUE_1)
        draw_stat_chip(surface, CHIP_L_RECT, lbl_landed, val_landed, accent=BLUE_1)

        lbl_score = self._font_hud_label.render('PONTUAÇÃO', True, MUTED)
        val_score = self._font_hud_val.render(str(self._score), True, GOLD)
        draw_stat_chip(surface, CHIP_R_RECT, lbl_score, val_score, accent=GOLD)

        # brief red flash on collision before transitioning to GameOverState
        if self._game_over:
            alpha = max(0, int(120 * (1 - self._game_over_timer / GAME_OVER_FLASH_SECS)))
            flash = pygame.Surface((800, 600), pygame.SRCALPHA)
            flash.fill((180, 30, 30, alpha))
            surface.blit(flash, (0, 0))

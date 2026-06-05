"""
Animated radar background — replaces background.png.
Renders: dark navy bg, grid, concentric rings, crosshair,
Brazil GeoJSON map and a rotating sweep cone, all in pure Pygame.
"""
import math
import json
import os
import threading
import urllib.request
import pygame

# ── Config ────────────────────────────────────────────────────────────────
W, H         = 800, 600
CENTER       = (400, 310)
RADIUS       = 295
GRID_STEP    = 40
N_RINGS      = 5
SWEEP_DEG    = 55
SPEED        = 0.008          # radians per frame at 60 fps

# Brazil bounding box
LON_MIN, LON_MAX = -74.0, -28.8
LAT_MIN, LAT_MAX = -33.8,   5.3
LON_CTR = (LON_MIN + LON_MAX) / 2   # -51.4
LAT_CTR = (LAT_MIN + LAT_MAX) / 2   # -14.25
MAP_SCALE = min(420 / (LON_MAX - LON_MIN), 400 / (LAT_MAX - LAT_MIN))

GEOJSON_URL   = ("https://raw.githubusercontent.com/codeforamerica/"
                 "click_that_hood/master/public/data/brazil-states.geojson")
GEOJSON_CACHE = os.path.join(os.path.dirname(__file__), '..', 'brazil_states.json')


# ── Projection ────────────────────────────────────────────────────────────
def _project(lon, lat):
    x = CENTER[0] + (lon - LON_CTR) * MAP_SCALE
    y = CENTER[1] - (lat - LAT_CTR) * MAP_SCALE   # flip y (lat up → screen down)
    return (int(x), int(y))


# ── Static layer build ────────────────────────────────────────────────────
def _build_static(geojson):
    """Pre-render everything that does not move."""
    cx, cy = CENTER

    # ── Opaque dark base ─────────────────────────────────────────
    surf = pygame.Surface((W, H))
    surf.fill((3, 13, 26))

    # ── Grid (very faint blue) ────────────────────────────────────
    grid_ov = pygame.Surface((W, H), pygame.SRCALPHA)
    for x in range(0, W + 1, GRID_STEP):
        pygame.draw.line(grid_ov, (20, 70, 150, 38), (x, 0), (x, H))
    for y in range(0, H + 1, GRID_STEP):
        pygame.draw.line(grid_ov, (20, 70, 150, 38), (0, y), (W, y))
    surf.blit(grid_ov, (0, 0))

    # ── Concentric rings ─────────────────────────────────────────
    rings_ov = pygame.Surface((W, H), pygame.SRCALPHA)
    step = RADIUS // N_RINGS
    for i in range(1, N_RINGS + 1):
        r = step * i
        pygame.draw.circle(rings_ov, (30, 90, 180, 64), (cx, cy), r, 1)
    surf.blit(rings_ov, (0, 0))

    # ── Crosshair ─────────────────────────────────────────────────
    ch_ov = pygame.Surface((W, H), pygame.SRCALPHA)
    pygame.draw.line(ch_ov, (30, 90, 180, 64), (0, cy), (W, cy))
    pygame.draw.line(ch_ov, (30, 90, 180, 64), (cx, 0), (cx, H))
    surf.blit(ch_ov, (0, 0))

    # ── Brazil map ────────────────────────────────────────────────
    if geojson:
        map_ov = pygame.Surface((W, H), pygame.SRCALPHA)
        for feature in geojson.get('features', []):
            geom  = feature.get('geometry', {})
            gtype = geom.get('type', '')

            if gtype == 'Polygon':
                rings = [geom['coordinates'][0]]
            elif gtype == 'MultiPolygon':
                rings = [p[0] for p in geom['coordinates']]
            else:
                continue

            for ring in rings:
                pts = [_project(c[0], c[1]) for c in ring]
                if len(pts) >= 3:
                    pygame.draw.polygon(map_ov, (10, 40, 100, 140), pts)
                    pygame.draw.lines(map_ov,   (60, 160, 255, 179), True, pts, 1)

        surf.blit(map_ov, (0, 0))

    return surf


# ── Public class ──────────────────────────────────────────────────────────
class RadarBackground:
    def __init__(self):
        self._angle      = 0.0
        self._geojson    = None
        self._loaded     = False
        self._static     = None     # built once, after geojson arrives
        self._sweep_surf = None     # re-used every frame

        threading.Thread(target=self._fetch, daemon=True).start()

    # ── GeoJSON fetch ──────────────────────────────────────────────
    def _fetch(self):
        cache = os.path.abspath(GEOJSON_CACHE)
        try:
            if os.path.exists(cache):
                with open(cache, 'r', encoding='utf-8') as f:
                    self._geojson = json.load(f)
            else:
                with urllib.request.urlopen(GEOJSON_URL, timeout=12) as r:
                    data = json.loads(r.read().decode('utf-8'))
                with open(cache, 'w', encoding='utf-8') as f:
                    json.dump(data, f)
                self._geojson = data
        except Exception as e:
            print(f'[Radar] GeoJSON: {e}')
        self._loaded = True

    # ── Per-frame ──────────────────────────────────────────────────
    def update(self, dt):
        self._angle = (self._angle + SPEED * 60 * dt) % (2 * math.pi)

        # Build static once pygame is ready and geojson may be loaded
        if self._static is None and pygame.get_init():
            self._static     = _build_static(self._geojson if self._loaded else None)
            self._sweep_surf = pygame.Surface((W, H), pygame.SRCALPHA)

        # If geojson just finished loading, rebuild with the map
        if self._loaded and self._geojson and self._static is not None:
            # Rebuild once when map data arrives (check via a flag)
            if not getattr(self, '_map_built', False):
                self._static  = _build_static(self._geojson)
                self._map_built = True

    def draw(self, surface):
        if self._static:
            surface.blit(self._static, (0, 0))
        else:
            surface.fill((3, 13, 26))

        if self._sweep_surf is None:
            return

        self._draw_sweep(surface)

    # ── Sweep ──────────────────────────────────────────────────────
    def _draw_sweep(self, surface):
        cx, cy  = CENTER
        r       = RADIUS
        a       = self._angle
        sweep   = math.radians(SWEEP_DEG)
        steps   = 30

        self._sweep_surf.fill((0, 0, 0, 0))

        for i in range(steps):
            t1   = i       / steps
            t2   = (i + 1) / steps
            a1   = a - sweep * t1
            a2   = a - sweep * t2
            alpha = int(55 * (1.0 - t1) ** 1.2)
            if alpha <= 0:
                continue
            p0 = (cx, cy)
            p1 = (cx + r * math.cos(a1), cy + r * math.sin(a1))
            p2 = (cx + r * math.cos(a2), cy + r * math.sin(a2))
            pygame.draw.polygon(self._sweep_surf, (0, 180, 255, alpha),
                                [p0, p1, p2])

        surface.blit(self._sweep_surf, (0, 0))

        # Bright leading-edge line
        lx = int(cx + r * math.cos(a))
        ly = int(cy + r * math.sin(a))
        pygame.draw.line(surface, (160, 255, 255), (cx, cy), (lx, ly), 2)

        # Glowing dot at tip
        for gr, ga in ((7, 28), (5, 55), (3, 115)):
            gs = pygame.Surface((gr * 2, gr * 2), pygame.SRCALPHA)
            pygame.draw.circle(gs, (160, 255, 255, ga), (gr, gr), gr)
            surface.blit(gs, (lx - gr, ly - gr))
        pygame.draw.circle(surface, (210, 255, 255), (lx, ly), 2)

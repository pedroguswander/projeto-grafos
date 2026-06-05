import os
import pygame
from eta.ranking import load_ranking

ASSETS = os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'img')

# ── Set True to see coloured overlays for hit-region calibration ──────
DEBUG_BUTTONS = False

# Hit regions — BACK confirmed correct
BACK_RECT = pygame.Rect(668,  29, 101, 50)   # < Voltar  ✓

# Content area inside the PNG's rounded card — calibrate with DEBUG_BUTTONS = False
CARD_RECT = pygame.Rect(218, 272, 370, 258)

# ── Palette ───────────────────────────────────────────────────────────
TEXT  = (244, 247, 255)
MUTED = (140, 165, 192)
GOLD  = (246, 197, 111)
BLUE  = ( 77, 163, 255)
MEDAL_COLORS = [GOLD, (192, 192, 212), (205, 127,  50)]

ROW_H = 28   # pixels per data row
PAD_V = 12   # vertical padding inside card
PAD_H = 14   # horizontal padding inside card


class RankingState:
    _bg    = None
    _ready = False

    def __init__(self, ranking=None, current_name='', current_score=0):
        self._ranking       = ranking or load_ranking()
        self._current_name  = current_name
        self._current_score = current_score
        self._scroll        = 0

        self._f_hdr  = pygame.font.SysFont('Verdana', 10, bold=True)
        self._f_row  = pygame.font.SysFont('Verdana', 12, bold=True)
        self._f_rows = pygame.font.SysFont('Verdana', 11)

    # ── Class-level PNG load (once) ───────────────────────────────────
    @classmethod
    def _load(cls):
        if cls._ready:
            return
        cls._ready = True
        try:
            raw    = pygame.image.load(os.path.join(ASSETS, 'ranking_v2.png')).convert()
            cls._bg = pygame.transform.smoothscale(raw, (800, 600))
        except Exception as e:
            print(f'[Ranking] ranking_v2.png: {e}')
            cls._bg = None

    # ── How many data rows fit inside the card ────────────────────────
    def _visible_rows(self):
        used = PAD_V + 14 + 6 + PAD_V   # top pad + header + divider + bottom pad
        return max(1, (CARD_RECT.h - used) // ROW_H)

    # ── Mouse-wheel scrolling ─────────────────────────────────────────
    def handle_event(self, event):
        if event.type == pygame.MOUSEWHEEL:
            max_s = max(0, len(self._ranking) - self._visible_rows())
            self._scroll = max(0, min(self._scroll - event.y, max_s))

    # ── State transitions ─────────────────────────────────────────────
    def update(self, dt, mouse_pos, mouse_down, mouse_just_pressed):
        if mouse_just_pressed:
            mx, my = mouse_pos
            if BACK_RECT.collidepoint(mx, my):
                from eta.states.menu_state import MenuState
                return MenuState()
        return self

    # ── Draw ──────────────────────────────────────────────────────────
    def draw(self, surface):
        self._load()

        if self._bg:
            surface.blit(self._bg, (0, 0))
        else:
            surface.fill((3, 13, 26))

        self._draw_table(surface)

        if DEBUG_BUTTONS:
            _dbg_font = pygame.font.SysFont('Verdana', 11, bold=True)
            for rect, col, lbl in [
                (CARD_RECT, (  0, 255, 120), 'CARD'),
            ]:
                ov = pygame.Surface((rect.w, rect.h), pygame.SRCALPHA)
                ov.fill((*col, 50))
                pygame.draw.rect(ov, (*col, 220), (0, 0, rect.w, rect.h), 2)
                surface.blit(ov, rect.topleft)
                surface.blit(_dbg_font.render(lbl, True, col), (rect.x + 4, rect.y + 4))

    # ── Table rendering ───────────────────────────────────────────────
    def _draw_table(self, surface):
        cr      = CARD_RECT
        entries = self._ranking
        vis     = self._visible_rows()
        page    = entries[self._scroll: self._scroll + vis]

        # Column anchor X positions — fitted to ~385 px card width
        cx_rank = cr.x + PAD_H            # badge  (28 px)
        cx_name = cr.x + PAD_H + 28       # name   (115 px)
        cx_pts  = cr.x + PAD_H + 143      # score  (70 px)
        cx_land = cr.x + PAD_H + 213      # landed (60 px)
        cx_date = cr.x + PAD_H + 273      # date   (fills rest)

        # ── Header ───────────────────────────────────────────────────
        hdr_y = cr.y + PAD_V
        for cx, lbl in [
            (cx_rank, '#'),
            (cx_name, 'JOGADOR'),
            (cx_pts,  'PTS'),
            (cx_land, 'POUSO'),
            (cx_date, 'HORA'),
        ]:
            surface.blit(self._f_hdr.render(lbl, True, MUTED), (cx, hdr_y))

        # Divider
        div = pygame.Surface((cr.w - PAD_H * 2, 1), pygame.SRCALPHA)
        div.fill((255, 255, 255, 38))
        surface.blit(div, (cr.x + PAD_H, hdr_y + 15))

        row_y0 = hdr_y + 22

        # ── Empty state ───────────────────────────────────────────────
        if not page:
            emp = self._f_rows.render('Nenhuma pontuação registrada ainda.', True, MUTED)
            surface.blit(emp, emp.get_rect(center=(cr.centerx, cr.centery + 18)))
            return

        # ── Data rows ─────────────────────────────────────────────────
        for i, entry in enumerate(page):
            g_i = self._scroll + i
            ry  = row_y0 + i * ROW_H

            if ry + ROW_H > cr.bottom - PAD_V:
                break

            is_me = (entry['name'] == self._current_name and
                     entry['score'] == self._current_score)

            # Row highlight for current player
            if is_me:
                hl = pygame.Surface((cr.w - PAD_H * 2, ROW_H - 4), pygame.SRCALPHA)
                pygame.draw.rect(hl, (77, 163, 255, 22), hl.get_rect(), border_radius=8)
                pygame.draw.rect(hl, (77, 163, 255, 55), hl.get_rect(), 1, border_radius=8)
                surface.blit(hl, (cr.x + PAD_H, ry - 1))

            # Rank badge
            if g_i < 3:
                mc = pygame.Surface((20, 20), pygame.SRCALPHA)
                pygame.draw.circle(mc, (*MEDAL_COLORS[g_i], 220), (10, 10), 10)
                surface.blit(mc, (cx_rank, ry + 3))
                rn = self._f_hdr.render(str(g_i + 1), True, (8, 18, 35))
                surface.blit(rn, rn.get_rect(center=(cx_rank + 10, ry + 13)))
            else:
                surface.blit(
                    self._f_rows.render(str(g_i + 1), True, MUTED),
                    (cx_rank + 4, ry + 5),
                )

            name_col = BLUE if is_me else TEXT
            surface.blit(self._f_row.render(entry['name'][:13], True, name_col),
                         (cx_name, ry + 4))
            surface.blit(self._f_row.render(str(entry['score']), True, GOLD),
                         (cx_pts, ry + 4))
            surface.blit(self._f_rows.render(str(entry.get('landed', '-')), True, MUTED),
                         (cx_land, ry + 5))
            hora = entry.get('time') or entry.get('date', '')
            surface.blit(self._f_rows.render(hora, True, MUTED),
                         (cx_date, ry + 5))

        # ── Scrollbar (only when needed) ──────────────────────────────
        max_s = max(0, len(entries) - vis)
        if max_s > 0:
            sb_x   = cr.right - 8
            sb_h   = cr.h - PAD_V * 2
            t_h    = max(18, sb_h * vis // max(len(entries), 1))
            t_y    = cr.y + PAD_V + int((sb_h - t_h) * self._scroll / max_s)

            track = pygame.Surface((4, sb_h), pygame.SRCALPHA)
            track.fill((255, 255, 255, 14))
            thumb = pygame.Surface((4, t_h), pygame.SRCALPHA)
            thumb.fill((255, 255, 255, 75))
            surface.blit(track, (sb_x, cr.y + PAD_V))
            surface.blit(thumb, (sb_x, t_y))

"""ETA Design System — shared colors and drawing helpers for Pygame."""
import pygame

# ── Palette ────────────────────────────────────────────────────────
BG       = (6,   18,  31)
CARD     = (10,  24,  44)
BLUE_1   = (77,  163, 255)
BLUE_2   = (124, 92,  255)
GOLD     = (246, 197, 111)
SUCCESS  = (38,  194, 129)
DANGER   = (255, 107, 107)
TEXT     = (244, 247, 255)
MUTED    = (157, 176, 199)

# ── Background ─────────────────────────────────────────────────────

def draw_dark_bg(surface):
    """Deep navy background with subtle radial glows — same vibe as ETA."""
    surface.fill(BG)
    _ellipse_glow(surface, BLUE_1,  -80, -80, 480, 380, 24)
    _ellipse_glow(surface, BLUE_2,  540, 360, 380, 300, 18)

def _ellipse_glow(surface, color, x, y, w, h, alpha):
    s = pygame.Surface((w, h), pygame.SRCALPHA)
    pygame.draw.ellipse(s, (*color, alpha), (0, 0, w, h))
    surface.blit(s, (x, y))

# ── Glass card ──────────────────────────────────────────────────────

def draw_glass(surface, rect, *, border_radius=20, alpha=10,
               border_alpha=22, hover=False):
    s = pygame.Surface((rect.w, rect.h), pygame.SRCALPHA)
    bg_a   = alpha + (12 if hover else 0)
    bd_col = (*BLUE_1, border_alpha + 35) if hover else (255, 255, 255, border_alpha)
    pygame.draw.rect(s, (255, 255, 255, bg_a), s.get_rect(), border_radius=border_radius)
    pygame.draw.rect(s, bd_col,               s.get_rect(), 1, border_radius=border_radius)
    surface.blit(s, rect.topleft)

# ── Hub button (same DNA as .hub-card in React) ─────────────────────

def draw_hub_button(surface, rect, title_surf, sub_surf, *,
                    hover=False, br_tl=999, br_tr=999, br_bl=999, br_br=999):
    oy   = -2 if hover else 0
    bg_a = 32  if hover else 11
    bd_a = 55  if hover else 20
    bd_c = (*BLUE_1, bd_a) if hover else (255, 255, 255, bd_a)

    s = pygame.Surface((rect.w, rect.h), pygame.SRCALPHA)
    pygame.draw.rect(s, (255, 255, 255, bg_a), s.get_rect(),
                     border_top_left_radius=br_tl,  border_top_right_radius=br_tr,
                     border_bottom_left_radius=br_bl, border_bottom_right_radius=br_br)
    pygame.draw.rect(s, bd_c, s.get_rect(), 1,
                     border_top_left_radius=br_tl,  border_top_right_radius=br_tr,
                     border_bottom_left_radius=br_bl, border_bottom_right_radius=br_br)
    surface.blit(s, (rect.x, rect.y + oy))

    cy = rect.centery + oy
    surface.blit(title_surf, title_surf.get_rect(midleft=(rect.x + 20, cy - 10)))
    surface.blit(sub_surf,   sub_surf.get_rect(midleft=(rect.x + 20, cy + 11)))

# ── Back button — identical look to ETA ────────────────────────────

BACK_RECT = pygame.Rect(14, 14, 192, 44)

def draw_back_button(surface, font, hover=False):
    r = BACK_RECT
    pill = pygame.Surface((r.w, r.h), pygame.SRCALPHA)
    pygame.draw.rect(pill, (15, 32, 58, 210), (0, 0, r.w, r.h),
                     border_radius=r.h // 2)
    bd = (*BLUE_1, 150) if hover else (255, 255, 255, 40)
    pygame.draw.rect(pill, bd, (0, 0, r.w, r.h), 1, border_radius=r.h // 2)
    surface.blit(pill, r.topleft)

    cx = r.x + r.h // 2
    cy = r.centery
    cr = r.h // 2 - 4
    icon = pygame.Surface((cr*2+2, cr*2+2), pygame.SRCALPHA)
    pygame.draw.circle(icon, (16, 40, 82, 230), (cr+1, cr+1), cr)
    pygame.draw.circle(icon, (50, 110, 200, 160), (cr+1, cr+1), cr, 1)
    surface.blit(icon, (cx - cr - 1, cy - cr - 1))

    pts = [(cx+5, cy-7), (cx-4, cy), (cx+5, cy+7)]
    pygame.draw.lines(surface, (200, 225, 255), False, pts, 2)

    tc = (235, 245, 255) if hover else (195, 218, 255)
    txt = font.render('Voltar ao ETA', True, tc)
    surface.blit(txt, (cx + cr + 10, cy - txt.get_height() // 2))

# ── Stat chip (used in HUD) ──────────────────────────────────────────

def draw_stat_chip(surface, rect, label_surf, value_surf, *, accent=BLUE_1):
    s = pygame.Surface((rect.w, rect.h), pygame.SRCALPHA)
    pygame.draw.rect(s, (255, 255, 255, 10), (0, 0, rect.w, rect.h), border_radius=rect.h//2)
    pygame.draw.rect(s, (*accent, 40),        (0, 0, rect.w, rect.h), 1, border_radius=rect.h//2)
    surface.blit(s, rect.topleft)
    cy = rect.centery
    surface.blit(label_surf, label_surf.get_rect(midleft=(rect.x + 10, cy)))
    surface.blit(value_surf, value_surf.get_rect(midright=(rect.right - 10, cy)))

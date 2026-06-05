import pygame
from eta.ranking import add_entry
from eta.eta_style import (
    draw_dark_bg, draw_glass, draw_hub_button,
    TEXT, MUTED, BLUE_1, GOLD, DANGER,
)

CARD_RECT  = pygame.Rect(160, 140, 480, 320)
INPUT_RECT = pygame.Rect(200, 328, 400, 46)
SAVE_RECT  = pygame.Rect(200, 388, 190, 56)
SKIP_RECT  = pygame.Rect(410, 388, 190, 56)
MAX_NAME   = 20


class GameOverState:
    def __init__(self, score, landed, bg_snapshot=None):
        self._score       = score
        self._landed      = landed
        self._bg          = bg_snapshot   # frozen frame of the gameplay
        self._name        = ''
        self._cursor_on   = True
        self._cursor_t    = 0.0
        self._next        = None          # pending state transition

        self._f_title  = pygame.font.SysFont('Verdana', 52, bold=True)
        self._f_score  = pygame.font.SysFont('Verdana', 18, bold=True)
        self._f_label  = pygame.font.SysFont('Verdana', 11)
        self._f_input  = pygame.font.SysFont('Verdana', 17, bold=True)
        self._f_btn_t  = pygame.font.SysFont('Verdana', 13, bold=True)
        self._f_btn_s  = pygame.font.SysFont('Verdana', 10)

    # ── Events ──────────────────────────────────────────────────────
    def handle_event(self, event):
        if event.type != pygame.KEYDOWN:
            return
        if event.key == pygame.K_RETURN:
            self._confirm()
        elif event.key == pygame.K_BACKSPACE:
            self._name = self._name[:-1]
        elif event.key == pygame.K_ESCAPE:
            from eta.states.menu_state import MenuState
            self._next = MenuState()
        elif event.unicode and event.unicode.isprintable() and len(self._name) < MAX_NAME:
            self._name += event.unicode

    def _confirm(self):
        ranking = add_entry(self._name or 'Anônimo', self._score, self._landed)
        from eta.states.ranking_state import RankingState
        self._next = RankingState(ranking, self._name or 'Anônimo', self._score)

    # ── Update ──────────────────────────────────────────────────────
    def update(self, dt, mouse_pos, mouse_down, mouse_just_pressed):
        if self._next:
            return self._next

        self._cursor_t += dt
        if self._cursor_t >= 0.5:
            self._cursor_on = not self._cursor_on
            self._cursor_t  = 0.0

        if mouse_just_pressed:
            mx, my = mouse_pos
            if SAVE_RECT.collidepoint(mx, my):
                self._confirm()
            elif SKIP_RECT.collidepoint(mx, my):
                from eta.states.menu_state import MenuState
                self._next = MenuState()

        return self

    # ── Draw ────────────────────────────────────────────────────────
    def draw(self, surface):
        # frozen gameplay behind
        if self._bg:
            surface.blit(self._bg, (0, 0))
        else:
            surface.fill((6, 18, 31))

        # dark overlay
        ov = pygame.Surface((800, 600), pygame.SRCALPHA)
        ov.fill((4, 12, 24, 215))
        surface.blit(ov, (0, 0))

        # glass card
        draw_glass(surface, CARD_RECT, border_radius=28, alpha=14, border_alpha=35)

        # "FIM DE JOGO"
        t = self._f_title.render('FIM DE JOGO', True, DANGER)
        surface.blit(t, t.get_rect(center=(400, 210)))

        # divider
        d = pygame.Surface((300, 1), pygame.SRCALPHA)
        d.fill((*DANGER, 50))
        surface.blit(d, (250, 235))

        # score row
        score_s   = self._f_score.render(f'Pontuação: {self._score}', True, GOLD)
        landed_s  = self._f_score.render(f'Pousados: {self._landed}', True, BLUE_1)
        surface.blit(score_s,  score_s.get_rect(midright=(390, 268)))
        surface.blit(landed_s, landed_s.get_rect(midleft=(412, 268)))

        # name prompt
        prompt = self._f_label.render('Digite seu nome para o ranking:', True, MUTED)
        surface.blit(prompt, prompt.get_rect(midleft=(INPUT_RECT.x, INPUT_RECT.y - 16)))

        # input field
        inp = pygame.Surface((INPUT_RECT.w, INPUT_RECT.h), pygame.SRCALPHA)
        pygame.draw.rect(inp, (255, 255, 255, 12), inp.get_rect(), border_radius=12)
        pygame.draw.rect(inp, (*BLUE_1, 80),        inp.get_rect(), 1, border_radius=12)
        surface.blit(inp, INPUT_RECT.topleft)

        display = self._name + ('|' if self._cursor_on else ' ')
        inp_t = self._f_input.render(display, True, TEXT)
        surface.blit(inp_t, inp_t.get_rect(midleft=(INPUT_RECT.x + 14, INPUT_RECT.centery)))

        # action buttons
        mx, my = pygame.mouse.get_pos()
        draw_hub_button(surface, SAVE_RECT,
                        self._f_btn_t.render('SALVAR',  True, TEXT),
                        self._f_btn_s.render('Entrar no ranking', True, MUTED),
                        hover=SAVE_RECT.collidepoint(mx, my),
                        br_tl=999, br_tr=18, br_bl=999, br_br=18)

        draw_hub_button(surface, SKIP_RECT,
                        self._f_btn_t.render('PULAR',   True, TEXT),
                        self._f_btn_s.render('Voltar ao menu',    True, MUTED),
                        hover=SKIP_RECT.collidepoint(mx, my),
                        br_tl=18, br_tr=999, br_bl=18, br_br=999)

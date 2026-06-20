import { useRef, useEffect, useState, useCallback } from 'react'
import { playSound } from './containerSounds.js'
import logoETN from './assets/logo-2/logo-branca-completa2.png'
import WebcamCapture from './WebcamCapture.jsx'

// ── Constants ──────────────────────────────────────────────────
const CW = 480, CH = 750
const CW_BASE = 170
const CH_BASE = 85
const MIN_SCALE = 0.24
const SCALE_DECAY = 0.03
const CRANE_TOP_Y = 110
const ROPE_LEN = 168
const ROPE_MIN_LEN = 110
const ROPE_PULSE_START_LEVEL = 5
const ROPE_PULSE_SPEED = 0.04
const GRAB_H = 30
const ROPE_TOP_SPREAD = 12
const CART_W = 110, CART_H = 52
const CART_RAIL_OFFSET_Y = 2
const PIVOT_OFFSET_FROM_CART_BOTTOM = -2
const FLOOR_TILE = 32
const FLOOR_ROWS = 1
const FLOOR_H = FLOOR_TILE * FLOOR_ROWS
const FLOOR_SCREEN_Y = CH - FLOOR_H
const FLOOR_WY = 100000
const STACK_SY = 560
const REBASE_THRESH = 5000
const REBASE_SHIFT = 80000
const GRAVITY = 0.5
const INIT_DROP_VY = 1
const PEND_MAX_ANGLE = 1.16
const PEND_BASE_FREQ = 0.026
const PEND_FREQ_INC = 0.0037
const LAND_OVERLAP = 0.35
const LAND_DELAY = 28
// ── Balanço da torre (a partir do nível 7) ─────────────────────
const SWAY_START_LEVEL = 7
const SWAY_FREQ = 0.028      // velocidade do bamboleio (lento e fluido)
const SWAY_LAG = 0.9         // defasagem por altura → efeito chicote
const SWAY_MAX_PX = 18       // deslocamento máximo no topo
const CONTAINER_COLORS = ['amarelo', 'azul', 'laranja', 'roxo', 'verde']

// ── 3D container rendering ─────────────────────────────────────
// Cada container é desenhado INTEIRAMENTE por código como uma caixa 3D
// (frente + topo + lateral corrugados), sem usar mais o sprite 2D plano —
// isso elimina os "gaps" e gera um container 3D limpo e coeso.
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16)
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  if (amt >= 0) { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt }
  else { r *= (1 + amt); g *= (1 + amt); b *= (1 + amt) }
  return `rgb(${r | 0},${g | 0},${b | 0})`
}

const CONTAINER_BASE = {
  amarelo: { c: '#e3b62a', id: 'DDL·02' },
  azul:    { c: '#2f62c4', id: 'BLU·07' },
  laranja: { c: '#d6612a', id: 'ORG·15' },
  roxo:    { c: '#7a3fa6', id: 'PRP·03' },
  verde:   { c: '#37a046', id: 'RLDR70' },
}
const CONTAINER_PALETTE = {}
for (const [k, { c, id }] of Object.entries(CONTAINER_BASE)) {
  CONTAINER_PALETTE[k] = {
    id,
    base:    c,
    light:   shade(c, 0.16),
    dark:    shade(c, -0.20),
    groove:  shade(c, -0.42),
    ribHi:   shade(c, 0.34),
    frame:   shade(c, -0.32),
    frameHi: shade(c, 0.04),
    frameDk: shade(c, -0.54),
    top:     shade(c, 0.20),
    topHi:   shade(c, 0.40),
    side:    shade(c, -0.34),
    sideDk:  shade(c, -0.50),
    edge:    shade(c, 0.55),
  }
}
const DEPTH_RATIO = 0.20  // profundidade da extrusão (fração da largura)

function fillPoly(ctx, pts, fill) {
  ctx.beginPath()
  ctx.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1])
  ctx.closePath()
  if (fill) { ctx.fillStyle = fill; ctx.fill() }
}

// Squash & stretch elástico ao aterrissar (crush = mais intenso p/ amassado)
function impactSquash(t, crush) {
  if (t == null || t >= 1) return { sx: 1, sy: 1 }
  const e = elasticOut(Math.max(0, t))
  const amp = crush ? 0.36 : 0.22
  return {
    sx: (1 + amp * 0.85) - amp * 0.85 * e,
    sy: (1 - amp) + amp * e,
  }
}

const PORT_DECOR = [
  { key: 'fence_2', x: 82, yOff: -24, w: 73, h: 24 },
  { key: 'dbox_2', x: 84, yOff: -70, w: 46, h: 46 },
  { key: 'dbox_6', x: 93, yOff: -108, w: 38, h: 38 },
]

const CRANE_SIDE_MARGIN = 48
const CRANE_LEG_W = 34
const CRANE_WHEEL_W = 110
const CART_MOVE_START_LEVEL = 3
const CART_MOVE_BASE_SPEED = 0.18
const CART_MOVE_BAND_BONUS = 0.18
const CART_MOVE_PROGRESS_PER_LEVEL = 0.08
const CART_MOVE_STACK_INC = 0.015
const REP_MAX = 100
const REP_START = 100
const REP_BASE_LOSS = 7
const REP_LEVEL_LOSS = 0.7
const REP_BASE_GAIN = 4.8
const REP_LEVEL_GAIN_DECAY = 0.12
const REP_MIN_GAIN = 1.5
const HUD_H = 58

// ── Graph: Bellman-Ford helpers ────────────────────────────────

// Peso de uma jogada: negativo = eficiente, positivo = custoso
function getMoveWeight({ perfect, reactionTime, level }) {
  let w = perfect ? -3 : 2
  const rt = reactionTime / 1000  // segundos

  // Janela ótima: ~2s (tempo natural do pêndulo chegar à posição ideal)
  if (rt >= 1.5 && rt <= 2.5)      w -= 2  // sweet spot
  else if (rt >= 1.0 && rt < 1.5)  w -= 1  // ligeiramente cedo
  else if (rt > 2.5 && rt <= 3.5)  w -= 1  // ligeiramente tarde
  else if (rt > 3.5 && rt <= 5.0)  w += 1  // tarde demais
  else if (rt > 5.0)               w += 2  // indecisão

  // nível aumenta levemente o custo base
  w += Math.floor((level - 1) / 5) * 0.5

  return Math.round(w * 10) / 10
}

// Bellman-Ford: dist[i] = custo mínimo de S0 até Si
// Cada nó Si representa "i containers empilhados com sucesso"
function runBellmanFord(nodeCount, edges) {
  const dist = new Array(nodeCount).fill(Infinity)
  dist[0] = 0

  for (let i = 0; i < nodeCount - 1; i++) {
    let updated = false
    for (const { from, to, weight } of edges) {
      if (dist[from] !== Infinity && dist[from] + weight < dist[to]) {
        dist[to] = dist[from] + weight
        updated = true
      }
    }
    if (!updated) break
  }

  // Detectar ciclo negativo (não ocorre neste DAG linear, incluído por completude)
  let hasNegativeCycle = false
  for (const { from, to, weight } of edges) {
    if (dist[from] !== Infinity && dist[from] + weight < dist[to]) {
      hasNegativeCycle = true; break
    }
  }

  return { dist, hasNegativeCycle }
}

// ── Ranking ────────────────────────────────────────────────────
const RANKING_KEY = 'cstack_ranking'

function loadRankings() {
  try {
    return JSON.parse(localStorage.getItem(RANKING_KEY) || '[]')
  } catch {
    return []
  }
}

function addToRanking(rawName, score, photo) {
  const name = (rawName.trim().slice(0, 12) || 'ANON').toUpperCase()
  const list = loadRankings()
  list.push({ name, score, date: new Date().toLocaleDateString('pt-BR'), photo: photo || null })
  list.sort((a, b) => b.score - a.score)
  const top = list.slice(0, 10)
  try { localStorage.setItem(RANKING_KEY, JSON.stringify(top)) } catch { /* cota cheia */ }
  return { top, name }
}

// ── Assets ─────────────────────────────────────────────────────
function enc(p) {
  return p.split('/').map(encodeURIComponent).join('/')
}

function loadImg(src) {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

async function loadAllAssets() {
  const entries = [
    ['crane', enc('3 Objects/4 Overhead crane/Overhead-crane.png')],
    ['craneTile', enc('3 Objects/4 Overhead crane/1 Base/Tile1.png')],
    ['craneBase', enc('3 Objects/4 Overhead crane/1 Base/Base.png')],
    ['cart', enc('3 Objects/4 Overhead crane/2 Cart/Cart.png')],
    ['tile', enc('1 Tiles/Tile_01.png')],
    ['bg_sky_day', enc('3 Background/Day/1.png')],
    ['bg_2_day',   enc('3 Background/Day/2.png')],
    ['bg_3_day',   enc('3 Background/Day/3.png')],
    ['bg_4_day',   enc('3 Background/Day/4.png')],
    ['bg_5_day',   enc('3 Background/Day/5.png')],
    ['fence_2', enc('3 Objects/2 Fencing/2.png')],
    ['dbox_2',  enc('3 Objects/3 Box/2.png')],
    ['dbox_6',  enc('3 Objects/3 Box/6.png')],
    // containers agora são 100% procedurais (sem sprite)
  ]

  const imgs = {}
  await Promise.all(entries.map(async ([k, src]) => {
    imgs[k] = await loadImg('/' + src)
  }))
  return imgs
}

// ── Progression helpers ────────────────────────────────────────
function shouldShrinkAtLevel(level) {
  const cycle = Math.floor((level - 1) / 5)
  return cycle % 2 === 0
}

function getShrinkStepsUntilLevel(level) {
  let steps = 0
  for (let lv = 1; lv <= level; lv++) {
    if (shouldShrinkAtLevel(lv)) steps++
  }
  return steps
}

function getTowerScale(level, stacked) {
  const shrinkSteps = getShrinkStepsUntilLevel(level)
  const stackPressure = Math.floor(stacked / 3) * 0.012
  const levelScale = 1 - (shrinkSteps - 1) * SCALE_DECAY - stackPressure
  return Math.max(MIN_SCALE, levelScale)
}

function getBlockSize(level, stacked) {
  const scale = getTowerScale(level, stacked)
  return {
    scale,
    w: Math.round(CW_BASE * scale),
    h: Math.round(CH_BASE * scale),
  }
}

function getCartSpeed(level, stacked) {
  if (level < CART_MOVE_START_LEVEL) return 0
  const levelIntoMove = level - CART_MOVE_START_LEVEL
  const bandIndex = Math.floor(levelIntoMove / 10)
  const withinBand = levelIntoMove % 10
  let speed = CART_MOVE_BASE_SPEED
  speed += bandIndex * CART_MOVE_BAND_BONUS
  speed += withinBand * CART_MOVE_PROGRESS_PER_LEVEL
  speed += Math.floor(stacked / 10) * CART_MOVE_STACK_INC
  return speed
}

function getPendulumFrequency(level, stacked) {
  return PEND_BASE_FREQ + (level - 1) * PEND_FREQ_INC + Math.floor(stacked / 10) * 0.0018
}

function getPivotBounds(level, stacked) {
  const nextSize = getBlockSize(level, stacked)
  const maxSwingX = ROPE_LEN * Math.sin(PEND_MAX_ANGLE)
  const halfContainer = nextSize.w / 2
  const minPivotX = halfContainer + maxSwingX
  const maxPivotX = CW - halfContainer - maxSwingX
  return {
    min: Math.max(CART_W / 2, minPivotX),
    max: Math.min(CW - CART_W / 2, maxPivotX),
  }
}

function getReputationLoss(level, stacked) {
  return REP_BASE_LOSS + (level - 1) * REP_LEVEL_LOSS + Math.floor(stacked / 8) * 0.9
}

function getReputationGain(level, stacked) {
  const gain = REP_BASE_GAIN - (level - 1) * REP_LEVEL_GAIN_DECAY - Math.floor(stacked / 14) * 0.22
  return Math.max(REP_MIN_GAIN, gain)
}

// ── State helpers ──────────────────────────────────────────────
function randContainerKey() {
  return CONTAINER_COLORS[Math.floor(Math.random() * CONTAINER_COLORS.length)]
}

function makeState() {
  const { w, h, scale } = getBlockSize(1, 0)
  const ix = (CW - w) / 2
  const floorWY = FLOOR_WY
  const firstBlockWY = floorWY - h
  const initialViewY = floorWY - FLOOR_SCREEN_Y

  return {
    pendAngle: 0,
    pendTime: 0,
    ropePulseTime: 0,
    dropping: null,
    nextImg: randContainerKey(),
    nextScale: scale,
    pivotX: CW / 2,
    prevPivotX: CW / 2, // posição do carrinho no frame anterior (p/ detectar movimento)
    cartDir: 1,
    smoke: [],          // fumaça do carrinho (espaço de tela)
    smokeTimer: 0,
    clawOpen: 0,        // 0 = garra fechada (segurando), 1 = aberta (soltou)
    clawRecoil: 0,      // recuo elástico do cabo ao soltar a carga
    grabT: 0,           // animação de "morder" ao pegar a carga (0→1 elástico)
    stack: [{
      worldX: ix,
      worldY: firstBlockWY,
      width: w,
      height: h,
      scale,
      imgKey: randContainerKey(),
      damaged: false,
      impactT: 1,
    }],
    floorWY,
    viewY: initialViewY,
    targetViewY: initialViewY,
    score: 0,
    level: 1,
    stacked: 0,
    landDelay: 0,
    gameOver: false,
    particles: [],
    floatTexts: [],
    shakeAmt: 0,
    reputation: REP_START,
    bgTime: 0,
    swayAmt: 0,         // intensidade do balanço da torre (0→1, entra suave no nível 7)
    initialViewY,
    // ── Grafo de estados da partida ──────────────────────────
    graphNodes: 1,          // S0 existe ao início
    graphEdges: [],         // arestas Si→Si+1 adicionadas a cada jogada
    bellmanDist: [0],       // custo mínimo acumulado por BF
    moveStartTime: performance.now(),  // quando o container ficou disponível
    lastReactionTime: 0,
    lastMoveWeight: null,
    lastMoveLabel: '',
  }
}

function getCartY() {
  return CRANE_TOP_Y - CART_H / 2 + CART_RAIL_OFFSET_Y
}

function getPivotY() {
  return getCartY() + CART_H / 2 + PIVOT_OFFSET_FROM_CART_BOTTOM
}

function getCurrentRopeLen(s) {
  if (s.level < ROPE_PULSE_START_LEVEL) return ROPE_LEN
  const t = (Math.sin(s.ropePulseTime) + 1) / 2
  return ROPE_MIN_LEN + (ROPE_LEN - ROPE_MIN_LEN) * t
}

// ── Update ─────────────────────────────────────────────────────
function update(s) {
  s.bgTime++
  s.viewY += (s.targetViewY - s.viewY) * 0.1

  // intensidade do balanço entra/sai de forma suave (nível 7+, cresce um pouco por nível)
  const swayTarget = s.level >= SWAY_START_LEVEL ? Math.min(1, 0.55 + (s.level - SWAY_START_LEVEL) * 0.12) : 0
  s.swayAmt += (swayTarget - (s.swayAmt ?? 0)) * 0.02

  if (s.targetViewY < REBASE_THRESH) {
    s.viewY += REBASE_SHIFT
    s.targetViewY += REBASE_SHIFT
    s.floorWY += REBASE_SHIFT
    s.initialViewY += REBASE_SHIFT
    for (const b of s.stack) b.worldY += REBASE_SHIFT
    if (s.dropping) s.dropping.worldY += REBASE_SHIFT
    for (const p of s.particles) p.y += REBASE_SHIFT
    for (const t of s.floatTexts) t.worldY += REBASE_SHIFT
  }

  // ── garra: abre ao soltar/esperar, fecha ao mirar; cabo recua ──
  const clawTarget = (s.dropping || s.landDelay > 0) ? 1 : 0
  s.clawOpen += (clawTarget - s.clawOpen) * 0.28
  if (s.clawRecoil > 0.1) s.clawRecoil *= 0.84
  else s.clawRecoil = 0
  // ao mirar (segurando), avança a animação de "morder"
  if (clawTarget === 0) s.grabT = Math.min(1, (s.grabT ?? 1) + 0.06)

  // ── animação de impacto (squash) de cada bloco recém-pousado ──
  for (const b of s.stack) {
    if (b.impactT != null && b.impactT < 1) b.impactT = Math.min(1, b.impactT + 0.055)
  }

  const pivotBounds = getPivotBounds(s.level, s.stacked)

  if (s.level >= CART_MOVE_START_LEVEL) {
    const speed = getCartSpeed(s.level, s.stacked)
    s.pivotX += speed * s.cartDir
    if (s.pivotX <= pivotBounds.min) {
      s.pivotX = pivotBounds.min
      s.cartDir = 1
    } else if (s.pivotX >= pivotBounds.max) {
      s.pivotX = pivotBounds.max
      s.cartDir = -1
    }
  } else {
    const center = CW / 2
    s.pivotX += (center - s.pivotX) * 0.12
    if (Math.abs(center - s.pivotX) < 0.1) s.pivotX = center
  }

  // ── fumaça do carrinho: emite enquanto o trole traversa (acompanha-o) ──
  const cartDelta = s.pivotX - (s.prevPivotX ?? s.pivotX)
  s.prevPivotX = s.pivotX
  if (s.smokeTimer > 0) s.smokeTimer--
  if (Math.abs(cartDelta) > 0.06 && s.smokeTimer <= 0) {
    spawnCartSmoke(s, cartDelta)
    s.smokeTimer = 4
  }
  updateSmoke(s)

  if (s.level >= ROPE_PULSE_START_LEVEL && !s.dropping && s.landDelay === 0) {
    s.ropePulseTime += ROPE_PULSE_SPEED
  }

  if (s.landDelay > 0) {
    s.landDelay--
    if (s.landDelay === 0) { s.moveStartTime = performance.now(); s.grabT = 0 }
    updateParticles(s)
    updateFloatTexts(s)
    return
  }

  if (!s.dropping) {
    const freq = getPendulumFrequency(s.level, s.stacked)
    s.pendTime += freq
    s.pendAngle = PEND_MAX_ANGLE * Math.sin(s.pendTime)
  } else {
    s.dropping.vy += GRAVITY
    s.dropping.worldY += s.dropping.vy

    const top = s.stack[s.stack.length - 1]
    const landWY = top.worldY - s.dropping.height

    if (s.dropping.worldY >= landWY) {
      s.dropping.worldY = landWY

      const contL = s.dropping.x
      const contR = contL + s.dropping.width
      const stkL = top.worldX
      const stkR = stkL + top.width
      const ov = Math.min(contR, stkR) - Math.max(contL, stkL)

      if (ov < s.dropping.width * LAND_OVERLAP) {
        playSound('miss')
        s.gameOver = true
        s.dropping = null
        return
      }

      const dropCenter = s.dropping.x + s.dropping.width / 2
      const stkCenter = top.worldX + top.width / 2
      const perfect = Math.abs(dropCenter - stkCenter) <= s.dropping.width * 0.20
      const pts = perfect ? 150 : 100
      const dropX = s.dropping.x
      const imgKey = s.dropping.imgKey
      const width = s.dropping.width
      const height = s.dropping.height
      const scale = s.dropping.scale

      s.stack.push({
        worldX: dropX,
        worldY: landWY,
        width,
        height,
        scale,
        imgKey,
        damaged: !perfect,
        impactT: 0,
        dmgSeed: Math.random(),
      })

      spawnParticles(s, dropX + width / 2, landWY, width, height)
      spawnDust(s, dropX + width / 2, landWY + height, width)
      if (!perfect) spawnDust(s, dropX + width / 2, landWY + height, width * 1.2)

      if (perfect) {
        const gain = getReputationGain(s.level, s.stacked)
        s.reputation = Math.min(REP_MAX, s.reputation + gain)
        s.floatTexts.push({
          text: `✦ PERFECT! +150  REP +${gain.toFixed(1)}`,
          x: dropX + width / 2,
          worldY: landWY - 10,
          alpha: 1,
          color: '#FFD700',
        })
      } else {
        const loss = getReputationLoss(s.level, s.stacked)
        s.reputation = Math.max(0, s.reputation - loss)
        s.floatTexts.push({
          text: `+${pts}  REP -${loss.toFixed(1)}`,
          x: dropX + width / 2,
          worldY: landWY - 10,
          alpha: 1,
          color: '#ff5a5a',
        })
      }

      s.dropping = null
      s.stacked++
      s.score += pts

      // ── Grafo: criar aresta Si-1 → Si e recalcular Bellman-Ford ──
      {
        const fromIdx = s.stacked - 1
        const toIdx   = s.stacked
        const w = getMoveWeight({ perfect, reactionTime: s.lastReactionTime, level: s.level })
        s.lastMoveWeight = w
        s.lastMoveLabel  = w <= -4 ? '⚡ ELITE' : w < 0 ? '✦ EFICIENTE' : w < 2 ? '◆ NEUTRO' : '⚠ CUSTOSO'
        s.graphNodes++
        s.graphEdges.push({ from: fromIdx, to: toIdx, weight: w })
        const { dist } = runBellmanFord(s.graphNodes, s.graphEdges)
        s.bellmanDist = dist
      }

      playSound(perfect ? 'perfect' : 'land')

      if (s.stacked % 8 === 0) s.level++

      s.targetViewY = landWY - STACK_SY
      s.landDelay = LAND_DELAY
      s.nextImg = randContainerKey()

      const next = getBlockSize(s.level, s.stacked)
      s.nextScale = next.scale
      s.shakeAmt = perfect ? 2 : 5

      const newBounds = getPivotBounds(s.level, s.stacked)
      s.pivotX = Math.max(newBounds.min, Math.min(newBounds.max, s.pivotX))

      if (s.reputation <= 0) {
        playSound('miss')
        s.gameOver = true
      }
    }
  }

  updateParticles(s)
  updateFloatTexts(s)

  if (s.shakeAmt > 0) s.shakeAmt -= 0.25
}

function spawnParticles(s, cx, wy, width, height) {
  const colors = ['#E55', '#F90', '#FA0', '#5CE', '#8F4', '#F5A']
  for (let i = 0; i < 18; i++) {
    s.particles.push({
      x: cx + (Math.random() - 0.5) * width,
      y: wy + Math.random() * height * 0.5,
      vx: (Math.random() - 0.5) * 6,
      vy: -Math.random() * 5 - 1,
      alpha: 1,
      size: Math.max(2, 4 + Math.random() * 8 * (width / CW_BASE)),
      color: colors[Math.floor(Math.random() * colors.length)],
    })
  }
}

function spawnDust(s, cx, wy, width) {
  const n = 10
  for (let i = 0; i < n; i++) {
    s.particles.push({
      type: 'dust',
      x: cx + (Math.random() - 0.5) * width * 0.95,
      y: wy + (Math.random() - 0.5) * 4,
      vx: (Math.random() - 0.5) * 5,
      vy: -Math.random() * 1.4 - 0.2,
      alpha: 0.45 + Math.random() * 0.30,
      size: 5 + Math.random() * 9 * (width / CW_BASE),
      grow: 0.22 + Math.random() * 0.32,
    })
  }
}

// ── Fumaça do carrinho (trole) ─────────────────────────────────
// Pequenos baforos cinza que sobem do topo do carrinho enquanto ele se move.
// Vivem em espaço de TELA (o carrinho é desenhado sem o translate da câmera),
// por isso não entram no rebase do mundo.
function spawnCartSmoke(s, dir) {
  const cx = s.pivotX - CART_W * 0.12 + (Math.random() - 0.5) * 8
  const cy = getCartY() - CART_H / 2 + 6
  const drift = -Math.sign(dir) * (0.18 + Math.random() * 0.30)  // arrasta p/ trás do movimento
  s.smoke.push({
    x: cx, y: cy,
    vx: drift + (Math.random() - 0.5) * 0.25,
    vy: -(0.32 + Math.random() * 0.40),                          // sobe
    size: 3 + Math.random() * 3,
    grow: 0.16 + Math.random() * 0.22,
    alpha: 0.30 + Math.random() * 0.18,
    fade: 0.0065 + Math.random() * 0.005,
  })
  if (s.smoke.length > 60) s.smoke.shift()
}

function updateSmoke(s) {
  if (!s.smoke.length) return
  s.smoke = s.smoke.filter(p => p.alpha > 0.02)
  for (const p of s.smoke) {
    p.x += p.vx; p.y += p.vy
    p.vy *= 0.98; p.vx *= 0.97
    p.size += p.grow
    p.alpha -= p.fade
  }
}

function drawCartSmoke(ctx, s) {
  if (!s.smoke || !s.smoke.length) return
  ctx.save()
  for (const p of s.smoke) {
    ctx.globalAlpha = Math.max(0, p.alpha)
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size)
    g.addColorStop(0, 'rgba(228,233,235,0.92)')
    g.addColorStop(0.6, 'rgba(182,190,194,0.5)')
    g.addColorStop(1, 'rgba(165,174,178,0)')
    ctx.fillStyle = g
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill()
  }
  ctx.restore()
}

function updateParticles(s) {
  s.particles = s.particles.filter(p => p.alpha > 0.04)
  for (const p of s.particles) {
    p.x += p.vx
    p.y += p.vy
    if (p.type === 'dust') {
      p.vx *= 0.92
      p.vy = p.vy * 0.90 - 0.03
      p.size += p.grow
      p.alpha -= 0.018
    } else {
      p.vy += 0.3
      p.alpha -= 0.022
    }
  }
}

function updateFloatTexts(s) {
  s.floatTexts = s.floatTexts.filter(t => t.alpha > 0.05)
  for (const t of s.floatTexts) {
    t.worldY -= 0.9
    t.alpha -= 0.013
  }
}

// Balanço orgânico da torre (nível 7+): a pilha verga como uma haste flexível —
// base firme, topo "bambo" — com leve efeito chicote por altura. Limitado à tela.
function towerSwayOffset(s, block) {
  if (!s.swayAmt || s.swayAmt < 0.01) return 0
  const base = s.stack[0]
  const top = s.stack[s.stack.length - 1]
  const totalH = base.worldY - top.worldY
  if (totalH < 1) return 0
  const norm = Math.min(1, Math.max(0, (base.worldY - block.worldY) / totalH))
  const k = Math.pow(norm, 1.6)
  const wob = Math.sin(s.bgTime * SWAY_FREQ - norm * SWAY_LAG)
            + 0.32 * Math.sin(s.bgTime * SWAY_FREQ * 0.5 + 1.3)
  let off = SWAY_MAX_PX * s.swayAmt * k * wob
  // entra suave quando o bloco acabou de pousar (evita "pulo" do offset)
  if (block.impactT != null) off *= Math.min(1, block.impactT)
  // não deixa o bloco ultrapassar as bordas da tela
  const lo = 4 - block.worldX
  const hi = CW - 4 - block.width - block.worldX
  return Math.max(lo, Math.min(hi, off))
}

// ── Draw ───────────────────────────────────────────────────────
function draw(ctx, s, imgs) {
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, CW, CH)

  ctx.beginPath()
  ctx.rect(0, 0, CW, CH)
  ctx.clip()

  ctx.imageSmoothingEnabled = false

  if (s.shakeAmt > 0.5) {
    ctx.translate(
      (Math.random() - 0.5) * s.shakeAmt * 2,
      (Math.random() - 0.5) * s.shakeAmt * 2,
    )
  }

  drawBackground(ctx, s, imgs)

  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, CW, CH)
  ctx.clip()

  drawCraneLegs(ctx, s, imgs)

  ctx.save()
  ctx.translate(0, -Math.round(s.viewY))

  drawFloor(ctx, s, imgs)
  drawPortDecor(ctx, s, imgs)

  drawTowerShadow(ctx, s)
  for (const block of s.stack) {
    const sy = block.worldY - s.viewY
    if (sy > CH + 80 || sy + block.height < -80) continue  // cull fora da tela
    const swayX = towerSwayOffset(s, block)
    if (swayX) {
      ctx.save(); ctx.translate(swayX, 0); drawBlock(ctx, block); ctx.restore()
    } else {
      drawBlock(ctx, block)
    }
  }
  if (s.dropping) drawDropping(ctx, s)

  for (const p of s.particles) {
    if (p.type === 'dust') {
      ctx.globalAlpha = Math.max(0, p.alpha)
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size)
      g.addColorStop(0, 'rgba(216,208,190,0.85)')
      g.addColorStop(1, 'rgba(216,208,190,0)')
      ctx.fillStyle = g
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill()
    } else {
      ctx.globalAlpha = p.alpha
      ctx.fillStyle = p.color
      ctx.fillRect(
        Math.round(p.x - p.size / 2),
        Math.round(p.y - p.size / 2),
        Math.round(p.size),
        Math.round(p.size)
      )
    }
  }

  ctx.globalAlpha = 1
  ctx.textAlign = 'center'

  for (const t of s.floatTexts) {
    ctx.globalAlpha = t.alpha
    ctx.fillStyle = t.color
    ctx.font = 'bold 18px monospace'
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'
    ctx.lineWidth = 3
    ctx.strokeText(t.text, Math.round(t.x), Math.round(t.worldY))
    ctx.fillText(t.text, Math.round(t.x), Math.round(t.worldY))
  }

  ctx.globalAlpha = 1
  ctx.textAlign = 'left'
  ctx.restore()

  drawCraneTop(ctx, s, imgs)
  drawCartSmoke(ctx, s)
  drawClaw(ctx, s)

  ctx.restore()

  ctx.restore()

  // ── vinheta / atmosfera ──
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  const vg = ctx.createRadialGradient(CW / 2, CH * 0.42, CH * 0.32, CW / 2, CH * 0.52, CH * 0.78)
  vg.addColorStop(0, 'rgba(0,0,0,0)')
  vg.addColorStop(1, 'rgba(2,10,8,0.42)')
  ctx.fillStyle = vg
  ctx.fillRect(0, 0, CW, CH)
  ctx.restore()
}

// ── Background paralaxe ────────────────────────────────────────
function lerpColor(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16)
  const ar = (pa >> 16) & 255, ag = (pa >> 8) & 255, ab = pa & 255
  const br = (pb >> 16) & 255, bg = (pb >> 8) & 255, bb = pb & 255
  return `rgb(${ar + (br - ar) * t | 0},${ag + (bg - ag) * t | 0},${ab + (bb - ab) * t | 0})`
}

function drawCloud(ctx, cx, cy, r, alpha) {
  ctx.save()
  ctx.globalAlpha = alpha
  const puffs = [
    [-r * 0.95, r * 0.10, r * 0.62],
    [-r * 0.35, -r * 0.30, r * 0.80],
    [r * 0.35, -r * 0.22, r * 0.74],
    [r * 0.98, r * 0.12, r * 0.56],
    [0, r * 0.22, r * 0.98],
  ]
  for (const [ox, oy, pr] of puffs) {
    const g = ctx.createRadialGradient(cx + ox, cy + oy - pr * 0.25, pr * 0.1, cx + ox, cy + oy, pr)
    g.addColorStop(0, 'rgba(255,255,255,0.96)')
    g.addColorStop(0.55, 'rgba(244,249,253,0.62)')
    g.addColorStop(1, 'rgba(214,228,242,0)')
    ctx.fillStyle = g
    ctx.beginPath(); ctx.arc(cx + ox, cy + oy, pr, 0, Math.PI * 2); ctx.fill()
  }
  ctx.restore()
}

function drawBackground(ctx, s, imgs) {
  const rise = Math.max(0, s.initialViewY - s.viewY)
  const t = Math.min(1, rise / 2600)   // 0 = chão, 1 = alta altitude

  // ── céu graduado por altitude ──
  const sky = ctx.createLinearGradient(0, 0, 0, CH)
  sky.addColorStop(0, lerpColor('#a9bcca', '#2f5c98', t))
  sky.addColorStop(0.5, lerpColor('#cdd9e0', '#6f9cc6', t))
  sky.addColorStop(1, lerpColor('#eef2f3', '#bdd6ea', t))
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, CW, CH)

  // brilho do sol (alto-esquerda)
  const sun = ctx.createRadialGradient(CW * 0.26, CH * 0.15, 0, CW * 0.26, CH * 0.15, CH * 0.55)
  sun.addColorStop(0, `rgba(255,250,234,${0.24 - 0.14 * t})`)
  sun.addColorStop(1, 'rgba(255,250,234,0)')
  ctx.fillStyle = sun
  ctx.fillRect(0, 0, CW, CH)

  // ── nuvens: parallax VERTICAL (descem conforme a câmera sobe) ──
  const M = 130, range = CH + 2 * M
  const cloudLayers = [
    { p: 0.22, scale: 26, alpha: 0.42, period: 235, drift: 0.05 },  // distantes
    { p: 0.46, scale: 35, alpha: 0.62, period: 305, drift: 0.10 },  // médias
    { p: 0.82, scale: 50, alpha: 0.85, period: 430, drift: 0.18 },  // próximas
  ]
  for (const L of cloudLayers) {
    const scrollY = rise * L.p
    const a = L.alpha * (0.45 + 0.55 * t)          // mais nuvens conforme sobe
    const span = CW + L.scale * 4
    const n = Math.ceil(range / L.period) + 1
    for (let k = 0; k < n; k++) {
      const cy = (((k * L.period + scrollY) % range) + range) % range - M
      const baseX = ((k * 0.61803398) % 1) * CW
      const cx = (((baseX + s.bgTime * L.drift + L.scale * 2) % span) + span) % span - L.scale * 2
      drawCloud(ctx, cx, cy, L.scale, a)
    }
  }

  // ── silhueta do porto: afunda e some conforme a câmera sobe ──
  const floorSY = s.floorWY - s.viewY
  const anchorY = floorSY + FLOOR_H
  const portFade = 1 - Math.min(0.9, t * 0.95)
  if (portFade > 0.02) {
    ctx.save()
    ctx.globalAlpha = portFade
    const portLayers = [
      { n: '5', hFrac: 0.14, speed: 0.04 },
      { n: '4', hFrac: 0.18, speed: 0.09 },
      { n: '3', hFrac: 0.22, speed: 0.17 },
      { n: '2', hFrac: 0.28, speed: 0.28 },
    ]
    for (const layer of portLayers) {
      const img = imgs[`bg_${layer.n}_day`]
      if (!img) continue
      const dispH = Math.round(CH * layer.hFrac)
      const dispW = Math.round(img.naturalWidth * dispH / img.naturalHeight)
      if (dispW <= 0) continue
      const screenY = Math.round(anchorY - dispH)
      if (screenY >= CH) continue
      const offset = Math.round(s.bgTime * layer.speed) % dispW
      for (let x = -offset - dispW; x < CW + dispW; x += dispW) {
        ctx.drawImage(img, Math.round(x), screenY, dispW, dispH)
      }
    }
    ctx.restore()
  }

  // neblina no horizonte do porto (atmosfera)
  if (anchorY > 0 && anchorY < CH + 80) {
    const hzH = CH * 0.20
    const hz = ctx.createLinearGradient(0, anchorY - hzH, 0, anchorY)
    hz.addColorStop(0, 'rgba(222,233,240,0)')
    hz.addColorStop(1, `rgba(222,233,240,${0.45 * (1 - t) + 0.12})`)
    ctx.fillStyle = hz
    ctx.fillRect(0, Math.max(0, anchorY - hzH), CW, Math.min(CH, hzH))
  }
}

function drawPortDecor(ctx, s, imgs) {
  for (const item of PORT_DECOR) {
    const img = imgs[item.key]
    const worldY = s.floorWY + item.yOff
    if (img) {
      ctx.drawImage(
        img,
        0, 0, img.naturalWidth, img.naturalHeight,
        Math.round(item.x), Math.round(worldY), item.w, item.h
      )
    } else {
      ctx.fillStyle = '#7a5c3a'
      ctx.fillRect(Math.round(item.x), Math.round(worldY), item.w, item.h)
    }
  }
}

function drawFloor(ctx, s, imgs) {
  const y = Math.round(s.floorWY)

  if (imgs.tile) {
    for (let row = 0; row < FLOOR_ROWS; row++) {
      for (let x = 0; x < CW + FLOOR_TILE; x += FLOOR_TILE) {
        ctx.drawImage(imgs.tile, x, y + row * FLOOR_TILE, FLOOR_TILE, FLOOR_TILE)
      }
    }
  } else {
    ctx.fillStyle = '#446'
    ctx.fillRect(0, y, CW, FLOOR_H)
  }
}

// PRNG determinístico (mulberry32) — dano consistente por container, mas variado entre eles.
function rng(a) {
  a = a >>> 0 || 1
  return () => {
    a |= 0; a = a + 0x6D2B79F5 | 0
    let t = Math.imul(a ^ a >>> 15, 1 | a)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

// Dente côncavo realista: iluminado de cima → sombra no topo, brilho embaixo.
function paintDent(ctx, cx, cy, rx, ry, rot = 0, k = 1) {
  ctx.save()
  ctx.translate(cx, cy); ctx.rotate(rot)
  // bacia escurecida
  const sh = ctx.createRadialGradient(0, -ry * 0.35, 0, 0, 0, rx)
  sh.addColorStop(0, `rgba(0,0,0,${0.34 * k})`)
  sh.addColorStop(0.6, `rgba(0,0,0,${0.12 * k})`)
  sh.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = sh
  ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.fill()
  // borda superior em sombra (face voltada p/ baixo)
  ctx.strokeStyle = `rgba(0,0,0,${0.36 * k})`; ctx.lineWidth = Math.max(1, rx * 0.09)
  ctx.beginPath(); ctx.ellipse(0, 0, rx * 0.86, ry * 0.84, 0, Math.PI * 1.06, Math.PI * 1.94); ctx.stroke()
  // fundo do dente pega luz
  ctx.strokeStyle = `rgba(255,255,255,${0.26 * k})`; ctx.lineWidth = Math.max(1, rx * 0.06)
  ctx.beginPath(); ctx.ellipse(0, ry * 0.16, rx * 0.72, ry * 0.6, 0, Math.PI * 0.14, Math.PI * 0.86); ctx.stroke()
  ctx.restore()
}

// Dano variado e natural — aplicado SOBRE o container íntegro, com luz coerente.
function paintDamage(ctx, x, y, w, h, pal, rail, post, seed) {
  const rnd = rng(Math.floor((seed ?? 0.37) * 4294967296))
  const R = (a, b) => a + (b - a) * rnd()
  ctx.save()
  // leve perda de brilho
  ctx.fillStyle = 'rgba(118,116,110,0.05)'
  ctx.fillRect(x, y, w, h)
  const inL = x + post, inW = w - post * 2

  // dobra horizontal (≈70% dos casos), altura e ondulação variáveis
  if (rnd() < 0.7) {
    const cy = y + h * R(0.40, 0.62)
    const amp = h * R(0.014, 0.030)
    const phase = R(0, 6.28)
    const band = ctx.createLinearGradient(0, cy - h * 0.15, 0, cy + h * 0.15)
    band.addColorStop(0, 'rgba(0,0,0,0)')
    band.addColorStop(0.40, `rgba(0,0,0,${R(0.34, 0.46)})`)
    band.addColorStop(0.50, `rgba(255,255,255,${R(0.18, 0.28)})`)
    band.addColorStop(0.62, 'rgba(0,0,0,0.28)')
    band.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = band
    ctx.fillRect(inL, cy - h * 0.15, inW, h * 0.30)
    const segs = 7
    ctx.lineJoin = 'round'
    ctx.strokeStyle = 'rgba(16,12,8,0.5)'; ctx.lineWidth = 1.5
    ctx.beginPath()
    for (let i = 0; i <= segs; i++) {
      const px = inL + inW * i / segs
      const py = cy + Math.sin(i * 1.9 + phase) * amp
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)
    }
    ctx.stroke()
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1
    ctx.beginPath()
    for (let i = 0; i <= segs; i++) {
      const px = inL + inW * i / segs
      const py = cy - 1.5 + Math.sin(i * 1.9 + phase) * amp
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)
    }
    ctx.stroke()
  }

  // 2 a 4 dentes côncavos espalhados (posição/forma/intensidade variáveis)
  const nDents = 2 + Math.floor(rnd() * 3)
  for (let i = 0; i < nDents; i++) {
    const cx = x + w * R(0.16, 0.84)
    const cyy = y + h * R(0.22, 0.82)
    const rx = Math.min(w, h) * R(0.10, 0.19)
    const ry = rx * R(0.6, 0.95)
    paintDent(ctx, cx, cyy, rx, ry, R(-0.6, 0.6), R(0.7, 1))
  }

  // travessa superior afundada (≈55%) em posição aleatória
  if (rnd() < 0.55) {
    const fx = R(0.26, 0.6)
    ctx.fillStyle = 'rgba(0,0,0,0.34)'
    ctx.beginPath()
    ctx.moveTo(x + w * fx, y)
    ctx.quadraticCurveTo(x + w * (fx + 0.09), y + rail * R(1.6, 2.4), x + w * (fx + 0.18), y)
    ctx.closePath(); ctx.fill()
  }

  // canto amassado (≈35%)
  if (rnd() < 0.35) {
    const left = rnd() < 0.5
    const cxp = left ? x : x + w * 0.86
    ctx.fillStyle = 'rgba(0,0,0,0.30)'
    ctx.beginPath()
    ctx.moveTo(cxp + (left ? 0 : w * 0.14), y)
    ctx.lineTo(cxp + w * 0.14 * (left ? 1 : 0), y)
    ctx.lineTo(cxp + (left ? w * 0.05 : w * 0.10), y + h * 0.13)
    ctx.closePath(); ctx.fill()
  }

  // arranhões expondo metal (1 a 3)
  const nScr = 1 + Math.floor(rnd() * 3)
  for (let i = 0; i < nScr; i++) {
    const x1 = x + w * R(0.15, 0.8), y1 = y + h * R(0.2, 0.85)
    const len = w * R(0.07, 0.2), ang = R(-0.5, 0.5)
    ctx.strokeStyle = `rgba(232,232,226,${R(0.14, 0.30)})`; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 + Math.cos(ang) * len, y1 + Math.sin(ang) * len); ctx.stroke()
  }

  // manchas de ferrugem (2 a 5)
  const nRust = 2 + Math.floor(rnd() * 4)
  for (let i = 0; i < nRust; i++) {
    ctx.fillStyle = `rgba(${90 + rnd() * 34 | 0},${48 + rnd() * 22 | 0},${22 + rnd() * 18 | 0},${R(0.30, 0.52)})`
    ctx.beginPath(); ctx.arc(x + w * R(0.1, 0.9), y + h * R(0.18, 0.9), R(1, 2.6), 0, Math.PI * 2); ctx.fill()
  }
  ctx.restore()
}

// Face frontal corrugada — desenhada 100% por código (sem sprite).
function paintFront(ctx, x, y, w, h, pal, damaged, id, seed) {
  const rail = Math.max(3, Math.round(h * 0.12))
  const post = Math.max(3, Math.round(w * 0.05))
  const big  = w > 50
  const inX = x + post, inY = y + rail
  const inW = w - post * 2, inH = h - rail * 2

  // base com gradiente de forma (luz no topo, sombra na base)
  const bg = ctx.createLinearGradient(x, y, x, y + h)
  bg.addColorStop(0, pal.light)
  bg.addColorStop(0.12, pal.base)
  bg.addColorStop(0.85, pal.base)
  bg.addColorStop(1, pal.dark)
  ctx.fillStyle = bg
  ctx.fillRect(x, y, w, h)

  // corrugação: nervuras trapezoidais com crista iluminada e vão sombreado
  if (big) {
    const period = Math.max(6, Math.round(w / 15))
    for (let rx = inX; rx < inX + inW; rx += period) {
      const pw = Math.min(period, inX + inW - rx)
      const g = ctx.createLinearGradient(rx, 0, rx + period, 0)
      g.addColorStop(0, pal.groove)
      g.addColorStop(0.16, pal.ribHi)
      g.addColorStop(0.46, pal.base)
      g.addColorStop(0.84, pal.dark)
      g.addColorStop(1, pal.groove)
      ctx.fillStyle = g
      ctx.fillRect(Math.round(rx), inY, Math.ceil(pw), inH)
    }
    // sombreamento vertical de forma (cima clara, base escura) por cima das nervuras
    const vg = ctx.createLinearGradient(0, inY, 0, inY + inH)
    vg.addColorStop(0, 'rgba(255,255,255,0.06)')
    vg.addColorStop(0.5, 'rgba(0,0,0,0)')
    vg.addColorStop(1, 'rgba(0,0,0,0.16)')
    ctx.fillStyle = vg
    ctx.fillRect(inX, inY, inW, inH)
  } else {
    ctx.fillStyle = pal.groove
    for (let rx = inX + 2; rx < inX + inW; rx += 4) ctx.fillRect(Math.round(rx), inY, 1, inH)
  }

  // weathering: estrias verticais sutis (determinístico)
  if (big && !damaged) {
    ctx.save()
    const streaks = [[0.16, 0.55], [0.4, 0.78], [0.63, 0.5], [0.83, 0.68]]
    for (let i = 0; i < streaks.length; i++) {
      ctx.globalAlpha = 0.09
      ctx.fillStyle = i % 2 ? pal.frameDk : pal.dark
      ctx.fillRect(Math.round(x + w * streaks[i][0]), inY, 1.5, inH * streaks[i][1])
    }
    ctx.restore()
  }

  // moldura: travessas (topo/base) + montantes (laterais)
  ctx.fillStyle = pal.frame
  ctx.fillRect(x, y, w, rail)
  ctx.fillRect(x, y + h - rail, w, rail)
  ctx.fillRect(x, y, post, h)
  ctx.fillRect(x + w - post, y, post, h)
  // realces e sombras da moldura
  ctx.fillStyle = pal.frameHi
  ctx.fillRect(x, y, w, 1.5)
  ctx.fillRect(x, y + h - rail, w, 1)
  ctx.fillStyle = 'rgba(0,0,0,0.20)'
  ctx.fillRect(x, y + rail - 1.5, w, 1.5)            // sombra interna sob a travessa
  ctx.fillRect(x, y + h - rail - 1.5, w, 1.5)

  // cantoneiras (corner castings) com recesso
  const cc = Math.max(4, Math.round(Math.min(w, h) * 0.13))
  for (const [cx2, cy2] of [[x, y], [x + w - cc, y], [x, y + h - cc], [x + w - cc, y + h - cc]]) {
    ctx.fillStyle = pal.frameDk
    ctx.fillRect(cx2, cy2, cc, cc)
    ctx.fillStyle = 'rgba(0,0,0,0.30)'
    ctx.fillRect(cx2 + cc * 0.26, cy2 + cc * 0.3, cc * 0.48, cc * 0.4)
    ctx.fillStyle = pal.frameHi
    ctx.fillRect(cx2, cy2, cc, 1)
  }

  // ID estampado
  if (w > 96 && !damaged) {
    ctx.save()
    ctx.globalAlpha = 0.46
    ctx.fillStyle = pal.edge
    ctx.font = `900 ${Math.round(h * 0.2)}px "Arial Narrow", Inter, sans-serif`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(id, x + w / 2, y + h / 2)
    ctx.restore()
  }

  if (damaged) paintDamage(ctx, x, y, w, h, pal, rail, post, seed)
}

// ── Amassado orgânico (deformação real da silhueta) ───────────
// Perfil de crush determinístico por container: cantos superiores afundados,
// flambagem do teto, lateral esquerda côncava e base empurrada — variando
// por container (seed) para parecer impacto real, não um decalque.
function getCrushProfile(seed) {
  const rnd = rng(Math.floor(((seed ?? 0.41) * 0.83 + 0.07) * 4294967296))
  const R = (a, b) => a + (b - a) * rnd()
  return {
    topDL: rnd() < 0.62 ? R(0.08, 0.22) : 0,   // canto sup-esq afundado (fração de h)
    topDR: rnd() < 0.62 ? R(0.08, 0.22) : 0,    // canto sup-dir
    topBuckleAmp: R(0.025, 0.085),              // flambagem do teto
    topBuckleFreq: 1 + Math.floor(rnd() * 3),
    topBucklePhase: R(0, 6.28),
    leftCave: rnd() < 0.5 ? R(0.04, 0.11) : 0,  // lateral esq côncava (fração de w)
    leftCaveY: R(0.32, 0.68),
    botUp: rnd() < 0.4 ? R(0.05, 0.13) : 0,     // base empurrada p/ cima (fração de h)
    botSide: rnd() < 0.5,                       // canto inferior afetado
  }
}

// Borda superior deformada (sempre p/ baixo) — flambagem + cantos afundados.
function buildCrushTopEdge(x, y, w, h, prof, k) {
  const N = Math.max(6, Math.round(w / 9))
  const pts = []
  for (let i = 0; i <= N; i++) {
    const t = i / N, px = x + w * t
    const buckle = (1 - Math.cos(prof.topBuckleFreq * 2 * Math.PI * t + prof.topBucklePhase)) * 0.5
    let dip = h * prof.topBuckleAmp * buckle
    const wL = Math.max(0, (0.24 - t) / 0.24)
    const wR = Math.max(0, (t - 0.76) / 0.24)
    dip += h * prof.topDL * wL * wL
    dip += h * prof.topDR * wR * wR
    pts.push([px, y + dip * k])
  }
  return pts
}

// Contorno fechado da face frontal amassada (topo deformado + base + lateral esq).
function buildCrushOutline(x, y, w, h, prof, k, topPts) {
  const out = topPts.map(p => [p[0], p[1]])
  const topY0 = topPts[0][1]
  out.push([x + w, y + h])                       // desce a lateral direita (reta)
  const M = 6                                     // base, da direita p/ esquerda
  for (let i = 1; i <= M; i++) {
    const t = i / M, px = x + w - w * t
    let up = 0
    if (prof.botUp > 0) {
      const ww = prof.botSide ? Math.max(0, (0.32 - t) / 0.32) : Math.max(0, (t - 0.68) / 0.32)
      up = h * prof.botUp * ww * ww
    }
    out.push([px, y + h - up * k])
  }
  const L = 6                                     // lateral esquerda, de baixo p/ cima
  for (let i = 1; i <= L; i++) {
    const t = i / L
    const py = (y + h) + (topY0 - (y + h)) * t
    let cave = 0
    if (prof.leftCave > 0) {
      const cw = Math.max(0, 1 - Math.abs((1 - t) - prof.leftCaveY) / 0.30)
      cave = w * prof.leftCave * cw * cw
    }
    out.push([x + cave * k, py])
  }
  return out
}

// y da borda superior numa coluna px (p/ acompanhar nervuras e juntas do topo).
function topYAt(pts, px) {
  if (px <= pts[0][0]) return pts[0][1]
  for (let i = 1; i < pts.length; i++) {
    if (px <= pts[i][0]) {
      const a = pts[i - 1], b = pts[i]
      const t = (px - a[0]) / ((b[0] - a[0]) || 1)
      return a[1] + (b[1] - a[1]) * t
    }
  }
  return pts[pts.length - 1][1]
}

// Teto extrudado a partir da borda superior (acompanha a deformação).
function drawTopFace(ctx, x, w, topPts, dx, dy, pal, damaged, big) {
  const n = topPts.length
  ctx.beginPath()
  ctx.moveTo(topPts[0][0], topPts[0][1])
  for (let i = 1; i < n; i++) ctx.lineTo(topPts[i][0], topPts[i][1])
  for (let i = n - 1; i >= 0; i--) ctx.lineTo(topPts[i][0] + dx, topPts[i][1] + dy)
  ctx.closePath()
  ctx.fillStyle = damaged ? shade(pal.base, 0.05) : pal.top
  ctx.fill()
  const a = topPts[0]
  const g = ctx.createLinearGradient(a[0], a[1], a[0] + dx, a[1] + dy)
  g.addColorStop(0, 'rgba(255,255,255,0.22)')
  g.addColorStop(1, 'rgba(0,0,0,0.24)')
  ctx.fillStyle = g; ctx.fill()
  if (big) {
    ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 1
    const cnt = Math.max(5, Math.round(w / 16))
    for (let i = 1; i < cnt; i++) {
      const px = x + w * (i / cnt)
      const py = topYAt(topPts, px)
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + dx, py + dy); ctx.stroke()
    }
  }
}

// Sombreamento de relevo nas zonas amassadas (concavidades + cristas com luz).
function paintCrushShading(ctx, x, y, w, h, prof, k, topPts) {
  ctx.save()
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'
  // sombra interna sob a borda superior amassada → concavidade
  ctx.beginPath()
  topPts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1] + 4) : ctx.moveTo(p[0], p[1] + 4))
  ctx.strokeStyle = 'rgba(0,0,0,0.30)'; ctx.lineWidth = 5; ctx.stroke()
  // crista iluminada
  ctx.beginPath()
  topPts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1] + 0.5) : ctx.moveTo(p[0], p[1] + 0.5))
  ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1; ctx.stroke()
  // bacias côncavas nos cantos superiores afundados
  if (prof.topDL > 0) paintDent(ctx, x + w * 0.11, y + h * prof.topDL * k * 0.55 + 5, w * 0.17, h * 0.13, 0.22, 1)
  if (prof.topDR > 0) paintDent(ctx, x + w * 0.89, y + h * prof.topDR * k * 0.55 + 5, w * 0.17, h * 0.13, -0.22, 1)
  // sombra da lateral esquerda côncava
  if (prof.leftCave > 0) {
    const cy = y + h * prof.leftCaveY
    const g = ctx.createLinearGradient(x, cy, x + w * 0.24, cy)
    g.addColorStop(0, 'rgba(0,0,0,0.34)'); g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g; ctx.fillRect(x, cy - h * 0.24, w * 0.24, h * 0.48)
  }
  ctx.restore()
}

// Caixa 3D 100% procedural (frente + topo + lateral corrugados).
function draw3DContainer(ctx, o) {
  const { imgKey, damaged } = o
  const x = o.x, y = o.y, w = o.w, h = o.h
  const sx = o.sx ?? 1, sy = o.sy ?? 1
  const pal = CONTAINER_PALETTE[imgKey] || CONTAINER_PALETTE.azul
  const depth = Math.max(4, Math.round(w * DEPTH_RATIO))
  const dx = depth, dy = -depth
  const big = w > 50
  const k = damaged ? Math.max(0, Math.min(1.15, o.crush ?? 1)) : 0
  const prof = (damaged && k > 0) ? getCrushProfile(o.seed) : null

  ctx.save()
  if (sx !== 1 || sy !== 1) {
    const px = x + w / 2, py = y + h
    ctx.translate(px, py); ctx.scale(sx, sy); ctx.translate(-px, -py)
  }
  ctx.imageSmoothingEnabled = false

  // borda superior (amassada quando danificado) e contorno frontal deformado
  const topPts = prof ? buildCrushTopEdge(x, y, w, h, prof, k) : [[x, y], [x + w, y]]
  const bumpR = topPts[topPts.length - 1][1] - y
  const outline = prof ? buildCrushOutline(x, y, w, h, prof, k, topPts) : null

  // ── face lateral direita (porta corrugada) ──
  const sidePts = [[x + w, y + bumpR], [x + w + dx, y + bumpR + dy], [x + w + dx, y + h + dy], [x + w, y + h]]
  fillPoly(ctx, sidePts, damaged ? pal.sideDk : pal.side)
  {
    const g = ctx.createLinearGradient(x + w, 0, x + w + dx, 0)
    g.addColorStop(0, 'rgba(255,255,255,0.12)')
    g.addColorStop(1, 'rgba(0,0,0,0.34)')
    fillPoly(ctx, sidePts, null); ctx.fillStyle = g; ctx.fill()
  }
  if (big) {
    ctx.strokeStyle = pal.sideDk; ctx.lineWidth = 1
    for (let i = 1; i < 4; i++) {
      const t = i / 4, fx = x + w + dx * t
      ctx.beginPath(); ctx.moveTo(fx, y + bumpR + dy * t); ctx.lineTo(fx, y + h + dy * t); ctx.stroke()
    }
  }

  // ── face de topo (extrudada do perfil deformado) ──
  drawTopFace(ctx, x, w, topPts, dx, dy, pal, damaged, big)

  // ── face frontal (recortada ao contorno amassado) ──
  ctx.save()
  if (outline) {
    ctx.beginPath()
    ctx.moveTo(outline[0][0], outline[0][1])
    for (let i = 1; i < outline.length; i++) ctx.lineTo(outline[i][0], outline[i][1])
    ctx.closePath(); ctx.clip()
  }
  paintFront(ctx, x, y, w, h, pal, damaged, pal.id, o.seed)
  if (prof) paintCrushShading(ctx, x, y, w, h, prof, k, topPts)
  // oclusão de contato no topo (sombra da caixa de cima)
  if (big) {
    const aoH = Math.min(9, Math.round(h * 0.16))
    const ao = ctx.createLinearGradient(0, y, 0, y + aoH)
    ao.addColorStop(0, 'rgba(0,0,0,0.30)')
    ao.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = ao
    ctx.fillRect(Math.round(x), Math.round(y), w, aoH)
  }
  ctx.restore()

  // aresta frontal-superior iluminada (acompanha o perfil amassado)
  ctx.strokeStyle = pal.edge; ctx.lineWidth = big ? 2 : 1; ctx.lineJoin = 'round'
  ctx.beginPath()
  topPts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))
  ctx.stroke()

  // brilho de contorno (carga em queda / destaque)
  if (o.glow > 0) {
    ctx.save()
    ctx.globalAlpha = o.glow
    ctx.strokeStyle = 'rgba(255,238,158,0.9)'
    ctx.lineWidth = 2
    ctx.shadowColor = 'rgba(255,224,120,0.9)'; ctx.shadowBlur = 14
    ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, w - 1, h - 1)
    ctx.restore()
  }

  ctx.restore()
}

function drawTowerShadow(ctx, s) {
  const base = s.stack[0]
  if (!base) return
  const cx = base.worldX + base.width / 2
  const cy = s.floorWY + 2
  const rx = base.width * 0.72
  ctx.save()
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx)
  g.addColorStop(0, 'rgba(0,0,0,0.42)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.beginPath(); ctx.ellipse(cx, cy, rx, rx * 0.20, 0, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
}

function drawBlock(ctx, block) {
  const { sx, sy } = impactSquash(block.impactT, block.damaged)
  // o amassado "se forma" no impacto: profundidade cresce com elástico (com leve overshoot)
  const crush = block.damaged ? 0.6 + 0.4 * elasticOut(block.impactT ?? 1) : 0
  draw3DContainer(ctx, {
    x: block.worldX, y: block.worldY, w: block.width, h: block.height,
    imgKey: block.imgKey, damaged: block.damaged, sx, sy, seed: block.dmgSeed, crush,
  })
}

function drawDropping(ctx, s) {
  const d = s.dropping
  const top = s.stack[s.stack.length - 1]
  const landWY = top.worldY - d.height

  // sombra de queda projetada no topo da pilha — cresce/escurece ao chegar
  const dist = Math.max(0, landWY - d.worldY)
  const near = 1 - Math.min(1, dist / 320)
  const shW = d.width * (0.5 + near * 0.5)
  const shCx = d.x + d.width / 2
  const shCy = top.worldY + 3
  ctx.save()
  ctx.globalAlpha = 0.10 + near * 0.30
  const sg = ctx.createRadialGradient(shCx, shCy, 0, shCx, shCy, shW)
  sg.addColorStop(0, 'rgba(0,0,0,0.55)')
  sg.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = sg
  ctx.beginPath(); ctx.ellipse(shCx, shCy, shW, shW * 0.22, 0, 0, Math.PI * 2); ctx.fill()
  ctx.restore()

  // esticar levemente com a velocidade de queda (antecipação)
  const k = Math.max(0, Math.min(0.14, (d.vy - 1) * 0.012))
  draw3DContainer(ctx, {
    x: d.x, y: d.worldY, w: d.width, h: d.height,
    imgKey: d.imgKey, damaged: false,
    sx: 1 - k, sy: 1 + k, glow: 0.45 + near * 0.55,
  })
}

function _craneMetrics(s, imgs) {
  const craneNW = imgs.crane?.naturalWidth || 352
  const craneNH = imgs.crane?.naturalHeight || 128
  const cScale = CW / craneNW
  const xbSrcH = Math.round(craneNH * 0.32)
  const xbDstH = Math.round(xbSrcH * cScale)
  const wheelNW = imgs.craneBase?.naturalWidth || 64
  const wheelNH = imgs.craneBase?.naturalHeight || 80
  const wheelW = CRANE_WHEEL_W
  const wheelH = Math.round(wheelNH * wheelW / wheelNW)
  const leftX = CRANE_SIDE_MARGIN
  const rightX = CW - CRANE_SIDE_MARGIN - CRANE_LEG_W
  const floorSY = s.floorWY - s.viewY
  const wheelY = Math.round(floorSY - wheelH)
  const tileStart = Math.round(CRANE_TOP_Y + xbDstH - 4)
  const tileEnd = Math.round(wheelY + 4)

  return { craneNW, craneNH, xbSrcH, xbDstH, wheelW, wheelH, leftX, rightX, wheelY, tileStart, tileEnd }
}

function drawCraneLegs(ctx, s, imgs) {
  const { wheelW, wheelH, leftX, rightX, wheelY, tileStart, tileEnd } = _craneMetrics(s, imgs)

  if (imgs.craneBase) {
    const wheelLeftX = leftX + (CRANE_LEG_W - wheelW) / 2
    const wheelRightX = rightX + (CRANE_LEG_W - wheelW) / 2
    ctx.drawImage(imgs.craneBase, Math.round(wheelLeftX), wheelY, wheelW, wheelH)
    ctx.drawImage(imgs.craneBase, Math.round(wheelRightX), wheelY, wheelW, wheelH)
  }

  if (imgs.craneTile) {
    const tw = imgs.craneTile.naturalWidth
    const th = imgs.craneTile.naturalHeight
    const tileH = Math.max(2, Math.round(th * CRANE_LEG_W / tw))
    for (let y = tileStart; y < tileEnd; y += tileH) {
      const dh = Math.min(tileH, tileEnd - y)
      if (dh <= 0) break
      const srcH = Math.max(1, Math.round(th * dh / tileH))
      ctx.drawImage(imgs.craneTile, 0, 0, tw, srcH, leftX, y, CRANE_LEG_W, dh)
      ctx.drawImage(imgs.craneTile, 0, 0, tw, srcH, rightX, y, CRANE_LEG_W, dh)
    }
  } else {
    ctx.fillStyle = '#C8A832'
    ctx.fillRect(leftX, tileStart, CRANE_LEG_W, tileEnd - tileStart)
    ctx.fillRect(rightX, tileStart, CRANE_LEG_W, tileEnd - tileStart)
  }
}

function drawCraneTop(ctx, s, imgs) {
  const { craneNW, xbSrcH, xbDstH } = _craneMetrics(s, imgs)

  if (imgs.crane) {
    ctx.drawImage(imgs.crane, 0, 0, craneNW, xbSrcH, 0, CRANE_TOP_Y, CW, xbDstH)
  } else {
    ctx.fillStyle = '#C8A832'
    ctx.fillRect(0, CRANE_TOP_Y, CW, 50)
  }

  const cartX = s.pivotX
  const cartY = getCartY()

  if (imgs.cart) {
    ctx.drawImage(imgs.cart, Math.round(cartX - CART_W / 2), Math.round(cartY - CART_H / 2), CART_W, CART_H)
  } else {
    ctx.fillStyle = '#CC3322'
    ctx.fillRect(Math.round(cartX - CART_W / 2), Math.round(cartY - CART_H / 2), CART_W, CART_H)
  }
}

function clawRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// ── Spreader ETN (garra de contêiner) ──────────────────────────
// Referência: spreader real de pórtico — viga telescópica amarela, headblock
// com polias e travas (twistlocks) nos cantos. Bonito, icônico e legível.

// Viga espalhadora telescópica amarela.
function drawSpreaderBeam(ctx, x0, x1, cy, h) {
  const w = x1 - x0
  ctx.save()
  ctx.fillStyle = '#1c201e'
  clawRoundRect(ctx, x0 - 2, cy - h / 2 - 2, w + 4, h + 4, 5); ctx.fill()
  const g = ctx.createLinearGradient(0, cy - h / 2, 0, cy + h / 2)
  g.addColorStop(0, '#f7d662'); g.addColorStop(0.45, '#e0b231'); g.addColorStop(1, '#9a7113')
  ctx.fillStyle = g
  clawRoundRect(ctx, x0, cy - h / 2, w, h, 4); ctx.fill()
  ctx.fillStyle = 'rgba(255,246,205,0.7)'; ctx.fillRect(x0 + 3, cy - h / 2 + 2, w - 6, 1.6)
  ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fillRect(x0 + 3, cy + h / 2 - 3, w - 6, 2)
  // juntas telescópicas
  ctx.strokeStyle = 'rgba(0,0,0,0.30)'; ctx.lineWidth = 1.5
  for (const fx of [x0 + w * 0.30, x0 + w * 0.70]) {
    ctx.beginPath(); ctx.moveTo(fx, cy - h / 2 + 2); ctx.lineTo(fx, cy + h / 2 - 2); ctx.stroke()
  }
  // listras de perigo na seção central
  ctx.save()
  ctx.beginPath(); ctx.rect(x0 + w * 0.36, cy - h / 2 + 2, w * 0.28, h - 4); ctx.clip()
  ctx.strokeStyle = 'rgba(22,17,6,0.5)'; ctx.lineWidth = 3
  for (let i = -h; i < w; i += 7) {
    ctx.beginPath(); ctx.moveTo(x0 + i, cy + h / 2); ctx.lineTo(x0 + i + h, cy - h / 2); ctx.stroke()
  }
  ctx.restore()
  ctx.restore()
}

// Bloco-cabeça (headblock) com polias onde os cabos convergem.
function drawHeadblock(ctx, cx, cy, w, h) {
  ctx.save()
  ctx.fillStyle = '#1c201e'
  clawRoundRect(ctx, cx - w / 2 - 1.5, cy - 1.5, w + 3, h + 3, 4); ctx.fill()
  const g = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0)
  g.addColorStop(0, '#566059'); g.addColorStop(0.5, '#aeb8b3'); g.addColorStop(1, '#454e49')
  ctx.fillStyle = g
  clawRoundRect(ctx, cx - w / 2, cy, w, h, 3); ctx.fill()
  ctx.fillStyle = '#262c28'
  for (const sx of [cx - w / 2 + 4, cx + w / 2 - 4]) {
    ctx.beginPath(); ctx.arc(sx, cy + h * 0.45, 3, 0, Math.PI * 2); ctx.fill()
  }
  ctx.fillStyle = '#e8b730'; ctx.fillRect(cx - w / 2 + 2, cy + h - 4.5, w - 4, 2.5)
  ctx.restore()
}

// Pod de canto com twistlock — o indicador gira p/ travar (verde) / soltar (âmbar).
function drawTwistPod(ctx, cx, topY, w, h, lockT, back) {
  ctx.save()
  if (back) ctx.globalAlpha = 0.92
  ctx.fillStyle = back ? '#20251f' : '#2a302c'
  clawRoundRect(ctx, cx - w / 2 - 1.5, topY - 1.5, w + 3, h + 3, 4); ctx.fill()
  const g = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0)
  // traseira: cinza médio (visível, mas um tom abaixo da frente p/ ler como "atrás")
  if (back) { g.addColorStop(0, '#8b9591'); g.addColorStop(0.5, '#5c655f'); g.addColorStop(1, '#3a423d') }
  else { g.addColorStop(0, '#d7dee0'); g.addColorStop(0.5, '#8b9591'); g.addColorStop(1, '#525b56') }
  ctx.fillStyle = g
  clawRoundRect(ctx, cx - w / 2, topY, w, h, 3); ctx.fill()
  ctx.fillStyle = back ? '#b8901f' : '#e8b730'
  ctx.fillRect(cx - w / 2 + 2, topY + 2, w - 4, 3)
  if (!back) {
    // indicador giratório de trava (twistlock)
    const ang = (1 - lockT) * (Math.PI / 2)
    const iy = topY + h * 0.6, ir = Math.min(w, h) * 0.3
    const col = lockT > 0.55 ? '76,247,176' : '247,168,92'
    ctx.save(); ctx.translate(cx, iy); ctx.rotate(ang)
    ctx.shadowColor = `rgba(${col},0.9)`; ctx.shadowBlur = 6
    ctx.fillStyle = `rgb(${col})`
    ctx.fillRect(-ir, -ir * 0.32, ir * 2, ir * 0.64)
    ctx.restore()
    // rebites
    ctx.fillStyle = '#1c211f'
    ctx.beginPath(); ctx.arc(cx, topY + h - 4, 1.5, 0, Math.PI * 2); ctx.fill()
  }
  ctx.restore()
}

// Aba-guia (flipper) articulada que abraça o canto do contêiner; abre ao soltar.
// back=true → versão recuada (atrás do contêiner): tom mais escuro p/ profundidade.
function drawFlipper(ctx, hingeX, hingeY, len, wTop, dirX, openT, back) {
  const ang = dirX * (0.12 + openT * 0.55)
  ctx.save()
  if (back) ctx.globalAlpha = 0.82
  ctx.translate(hingeX, hingeY); ctx.rotate(ang)
  ctx.beginPath()
  ctx.moveTo(-wTop * 0.5, 0); ctx.lineTo(wTop * 0.5, 0)
  ctx.lineTo(wTop * 0.30, len); ctx.lineTo(-wTop * 0.30, len); ctx.closePath()
  const g = ctx.createLinearGradient(-wTop * 0.5, 0, wTop * 0.5, 0)
  if (back) { g.addColorStop(0, '#717c76'); g.addColorStop(0.5, '#454e49'); g.addColorStop(1, '#252b27') }
  else { g.addColorStop(0, '#c4cec8'); g.addColorStop(0.5, '#79847d'); g.addColorStop(1, '#39413c') }
  ctx.fillStyle = g; ctx.fill()
  ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1; ctx.stroke()
  // ponta-guia amarela (funil que centraliza no contêiner)
  ctx.fillStyle = back ? '#9a7a1c' : '#e8b730'
  ctx.beginPath()
  ctx.moveTo(-wTop * 0.30, len); ctx.lineTo(wTop * 0.30, len); ctx.lineTo(0, len + wTop * 0.42); ctx.closePath(); ctx.fill()
  ctx.restore()
}

function drawClaw(ctx, s) {
  const aiming = !s.dropping && s.landDelay === 0
  const pivotX = s.pivotX
  const pivotY = getPivotY()
  const angle = s.pendAngle                       // mantém o ângulo de soltura (sem snap p/ centro)
  const ropeLen = getCurrentRopeLen(s) - (s.clawRecoil || 0)
  const grabX = pivotX + ropeLen * Math.sin(angle)
  const grabY = pivotY + ropeLen * Math.cos(angle)
  const open = s.clawOpen ?? 0
  const lockT = elasticOut(s.grabT ?? 1) * (1 - open)   // 1 = travado, 0 = solto

  const nextSize = getBlockSize(s.level, s.stacked)
  const contW = nextSize.w
  const contH = nextSize.h
  const contX = grabX - contW / 2
  const contY = grabY + GRAB_H   // mesma origem do drop (sem "pulo" ao soltar)

  const depth = Math.max(4, Math.round(contW * DEPTH_RATIO))
  const dx = depth, dy = -depth
  const Rg = contX + contW                       // borda frontal direita

  // animação: assenta (settle) ao travar, ergue (lift) ao soltar
  const settle = (1 - elasticOut(s.grabT ?? 1)) * 4
  const lift = open * 9
  const beamH = Math.max(9, Math.round(contH * 0.24))
  const beamY = contY - beamH / 2 - 3 - lift + settle
  const beamX0 = contX - 5, beamX1 = Rg + 5
  const beamCx = (beamX0 + beamX1) / 2
  const beamTop = beamY - beamH / 2
  const beamBot = beamY + beamH / 2

  // headblock acima da viga
  const hbW = Math.max(22, Math.round(contW * 0.3))
  const hbH = Math.max(9, Math.round(beamH * 0.85))
  const hbCx = beamCx
  const hbY = beamTop - hbH - 9

  // ── cabos cart → headblock (catenária dupla; saltam com o recuo) ──
  const topL = pivotX - ROPE_TOP_SPREAD, topR = pivotX + ROPE_TOP_SPREAD
  const sag = 7 + (s.clawRecoil || 0) * 0.6
  ctx.save(); ctx.lineCap = 'round'
  for (const pass of [['rgba(30,36,34,0.96)', 3], ['rgba(150,160,155,0.5)', 1]]) {
    ctx.strokeStyle = pass[0]; ctx.lineWidth = pass[1]
    ctx.beginPath()
    ctx.moveTo(topL, pivotY); ctx.quadraticCurveTo((topL + hbCx - hbW * 0.3) / 2, pivotY + sag + 14, hbCx - hbW * 0.3, hbY)
    ctx.moveTo(topR, pivotY); ctx.quadraticCurveTo((topR + hbCx + hbW * 0.3) / 2, pivotY + sag + 14, hbCx + hbW * 0.3, hbY)
    ctx.stroke()
  }
  ctx.restore()

  // dimensões dos flippers (usadas pela estrutura traseira e dianteira)
  const flipLen = Math.round(contH * 0.5)
  const flipW = Math.max(8, Math.round(contW * 0.13))

  // ── estrutura traseira (profundidade 3D): viga + flippers + pods recuados ──
  // Desenhada ANTES do contêiner → fica atrás; só o topo dos pods/abas "espia"
  // acima da borda traseira, vendendo a garra travando nos 4 cantos.
  drawSpreaderBeam(ctx, beamX0 + dx, beamX1 + dx, beamY + dy, beamH * 0.9)
  drawFlipper(ctx, contX + dx, beamBot + dy, flipLen, flipW, -1, open, true)
  drawFlipper(ctx, Rg + dx, beamBot + dy, flipLen, flipW, 1, open, true)
  drawTwistPod(ctx, contX + dx, beamTop + dy, Math.max(8, contW * 0.12), beamH * 1.9, lockT, true)
  drawTwistPod(ctx, Rg + dx, beamTop + dy, Math.max(8, contW * 0.12), beamH * 1.9, lockT, true)

  // ── carga suspensa (entre a estrutura traseira e a dianteira) ──
  if (aiming) {
    draw3DContainer(ctx, {
      x: contX, y: contY, w: contW, h: contH,
      imgKey: s.nextImg, damaged: false,
      glow: 0.12 * (1 - open),
    })
  }

  // ── flippers dianteiros abraçando os cantos (abrem ao soltar) ──
  drawFlipper(ctx, contX, beamBot, flipLen, flipW, -1, open)
  drawFlipper(ctx, Rg, beamBot, flipLen, flipW, 1, open)

  // ── ligações headblock → viga ──
  ctx.save(); ctx.strokeStyle = '#2a302c'; ctx.lineWidth = 4; ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(hbCx - hbW * 0.32, hbY + hbH); ctx.lineTo(hbCx - hbW * 0.32, beamTop + 1)
  ctx.moveTo(hbCx + hbW * 0.32, hbY + hbH); ctx.lineTo(hbCx + hbW * 0.32, beamTop + 1)
  ctx.stroke(); ctx.restore()

  // ── viga dianteira + headblock ──
  drawSpreaderBeam(ctx, beamX0, beamX1, beamY, beamH)
  drawHeadblock(ctx, hbCx, hbY, hbW, hbH)

  // ── pods/twistlocks dianteiros (travam os cantos do contêiner) ──
  const podW = Math.max(9, Math.round(contW * 0.14))
  drawTwistPod(ctx, contX, beamTop, podW, beamH * 1.5, lockT, false)
  drawTwistPod(ctx, Rg, beamTop, podW, beamH * 1.5, lockT, false)

  // dobradiças nas pontas da viga
  for (const hx of [contX, Rg]) {
    ctx.fillStyle = '#39413c'; ctx.beginPath(); ctx.arc(hx, beamBot, 3.5, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#f4cf4e'; ctx.beginPath(); ctx.arc(hx, beamBot, 1.6, 0, Math.PI * 2); ctx.fill()
  }
}

// ── HUD ────────────────────────────────────────────────────────
function drawHUD(ctx, s) {
  // fundo ETN dark
  ctx.fillStyle = 'rgba(6, 26, 20, 0.92)'
  ctx.fillRect(0, 0, CW, HUD_H)

  // linha separadora ETN verde
  ctx.fillStyle = 'rgba(38, 194, 129, 0.35)'
  ctx.fillRect(0, HUD_H - 1, CW, 1)

  ctx.font = 'bold 14px system-ui, -apple-system, sans-serif'

  // Score — verde ETN brilhante
  ctx.fillStyle = '#4cf7b0'
  ctx.textAlign = 'left'
  ctx.fillText(`SCORE: ${s.score}`, 12, 21)

  // Stacked — branco suave
  ctx.fillStyle = '#d4f4e8'
  ctx.textAlign = 'center'
  ctx.fillText(`×${s.stacked}`, CW / 2, 21)

  // Nível — gold accent ETN
  ctx.fillStyle = '#f6c56f'
  ctx.textAlign = 'right'
  ctx.fillText(`NÍV: ${s.level}`, CW - 12, 21)

  ctx.textAlign = 'left'

  const barX = 10
  const barY = 29
  const barW = CW - 20
  const barH = 18
  const ratio = Math.max(0, Math.min(1, s.reputation / REP_MAX))

  // Fundo da barra
  ctx.fillStyle = 'rgba(255, 255, 255, 0.07)'
  ctx.fillRect(barX, barY, barW, barH)

  // Cor da barra conforme reputação
  let repColor = '#26c281'        // verde ETN
  if (ratio < 0.6) repColor = '#f6c56f'  // gold ETN
  if (ratio < 0.3) repColor = '#ff6b6b'  // danger ETN

  // Gradiente na barra de reputação
  const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0)
  grad.addColorStop(0, repColor)
  grad.addColorStop(1, repColor + 'cc')
  ctx.fillStyle = grad
  ctx.fillRect(barX, barY, Math.round(barW * ratio), barH)

  // Borda da barra
  ctx.strokeStyle = 'rgba(38, 194, 129, 0.25)'
  ctx.lineWidth = 1
  ctx.strokeRect(barX + 0.5, barY + 0.5, barW - 1, barH - 1)

  // Texto da reputação
  ctx.fillStyle = ratio < 0.3 ? '#ff6b6b' : ratio < 0.6 ? '#f6c56f' : '#9cc8b6'
  ctx.font = 'bold 10px system-ui, -apple-system, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(`REPUTAÇÃO ${Math.ceil(s.reputation)}%`, CW / 2, barY + 13)
  ctx.textAlign = 'left'
}

// ── Graph Visualization ─────────────────────────────────────────

const GVIZ_W    = 240
const GVIZ_COLS = 3      // 3 por linha → nós maiores e mais legíveis
const GVIZ_ROW_H = 96
const GVIZ_NR   = 20    // node radius
const GVIZ_PX   = 30    // horizontal padding

// CSS elastic-out: overshoot e se asienta em 1
function elasticOut(t) {
  if (t <= 0) return 0
  if (t >= 1) return 1
  const c4 = (2 * Math.PI) / 3
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1
}

function gvizPos(i, W) {
  const row = Math.floor(i / GVIZ_COLS)
  const col = (row % 2 === 0) ? i % GVIZ_COLS : GVIZ_COLS - 1 - i % GVIZ_COLS
  const sp  = GVIZ_COLS <= 1 ? 0 : (W - GVIZ_PX * 2) / (GVIZ_COLS - 1)
  return { x: GVIZ_PX + col * sp, y: 38 + GVIZ_NR + row * GVIZ_ROW_H }
}

function drawGviz(ctx, W, H, { edges, nodeCount, nodeT, edgeProgress, nodeRings, bellmanDist, pulseT }) {
  ctx.clearRect(0, 0, W, H)
  if (nodeCount < 1) return

  const pos = Array.from({ length: nodeCount }, (_, i) => gvizPos(i, W))

  // ── Edges ─────────────────────────────────────────────────────
  for (let idx = 0; idx < edges.length; idx++) {
    const { from, to, weight } = edges[idx]
    const p1 = pos[from], p2 = pos[to]
    if (!p1 || !p2) continue

    const prog = edgeProgress[idx] ?? 1
    const rgb  = weight < 0 ? '76,247,176' : weight < 2 ? '180,200,190' : '255,107,107'
    const sameRow = Math.floor(from / GVIZ_COLS) === Math.floor(to / GVIZ_COLS)

    ctx.save()
    ctx.lineWidth = 2.5

    if (sameRow) {
      const ang = Math.atan2(p2.y - p1.y, p2.x - p1.x)
      const sx  = p1.x + Math.cos(ang) * GVIZ_NR
      const sy  = p1.y + Math.sin(ang) * GVIZ_NR
      const ex  = p2.x - Math.cos(ang) * GVIZ_NR
      const ey  = p2.y - Math.sin(ang) * GVIZ_NR
      const len = Math.hypot(ex - sx, ey - sy)

      // Aresta se desenhando progressivamente via dash-offset
      ctx.strokeStyle = `rgba(${rgb},0.90)`
      ctx.setLineDash([len, len])
      ctx.lineDashOffset = len * (1 - prog)
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke()
      ctx.setLineDash([])

      // Glow na aresta sendo desenhada
      if (prog < 1) {
        const drawn = sx + (ex - sx) * prog
        const drawnY = sy + (ey - sy) * prog
        ctx.strokeStyle = `rgba(${rgb},0.25)`
        ctx.lineWidth = 7
        ctx.shadowColor = `rgba(${rgb},0.9)`;  ctx.shadowBlur = 12
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(drawn, drawnY); ctx.stroke()
        ctx.shadowBlur = 0
      }

      // Seta aparece quando aresta está quase completa
      if (prog > 0.82) {
        const aOp = Math.min(1, (prog - 0.82) / 0.18)
        const aw = 9
        ctx.globalAlpha = aOp
        ctx.strokeStyle = `rgba(${rgb},0.95)`
        ctx.lineWidth = 2.5
        ctx.beginPath()
        ctx.moveTo(ex, ey); ctx.lineTo(ex - aw * Math.cos(ang - 0.42), ey - aw * Math.sin(ang - 0.42))
        ctx.moveTo(ex, ey); ctx.lineTo(ex - aw * Math.cos(ang + 0.42), ey - aw * Math.sin(ang + 0.42))
        ctx.stroke()
        ctx.globalAlpha = 1
      }

      // Peso surge após aresta completa
      if (prog > 0.88) {
        const lOp = Math.min(1, (prog - 0.88) / 0.12)
        ctx.globalAlpha  = lOp
        ctx.fillStyle    = `rgba(${rgb},1)`
        ctx.font         = 'bold 10px "Courier New",monospace'
        ctx.textAlign    = 'center'
        ctx.textBaseline = 'alphabetic'
        ctx.fillText(weight > 0 ? '+' + weight : String(weight),
          (p1.x + p2.x) / 2, (p1.y + p2.y) / 2 - GVIZ_NR - 3)
        ctx.globalAlpha  = 1
      }
    } else {
      // Aresta vertical de virada de linha
      const sy   = p1.y + GVIZ_NR
      const ey   = p2.y - GVIZ_NR
      const len  = Math.abs(ey - sy)
      const midY = (sy + ey) / 2

      ctx.strokeStyle = `rgba(${rgb},0.90)`
      ctx.setLineDash([len, len])
      ctx.lineDashOffset = len * (1 - prog)
      ctx.beginPath(); ctx.moveTo(p1.x, sy); ctx.lineTo(p2.x, ey); ctx.stroke()
      ctx.setLineDash([])

      if (prog > 0.82) {
        const aOp = Math.min(1, (prog - 0.82) / 0.18)
        const aw = 9
        ctx.globalAlpha = aOp; ctx.strokeStyle = `rgba(${rgb},0.95)`; ctx.lineWidth = 2.5
        ctx.beginPath()
        ctx.moveTo(p2.x, ey); ctx.lineTo(p2.x - aw * 0.5, ey - aw * 0.87)
        ctx.moveTo(p2.x, ey); ctx.lineTo(p2.x + aw * 0.5, ey - aw * 0.87)
        ctx.stroke(); ctx.globalAlpha = 1
      }

      if (prog > 0.88) {
        const lOp = Math.min(1, (prog - 0.88) / 0.12)
        ctx.globalAlpha  = lOp
        ctx.fillStyle    = `rgba(${rgb},1)`
        ctx.font         = 'bold 10px "Courier New",monospace'
        const toRight    = p1.x < W / 2
        ctx.textAlign    = toRight ? 'left' : 'right'
        ctx.textBaseline = 'middle'
        ctx.fillText(weight > 0 ? '+' + weight : String(weight), p1.x + (toRight ? 16 : -16), midY)
        ctx.globalAlpha  = 1
      }
    }
    ctx.restore()
  }

  // ── Nodes ──────────────────────────────────────────────────────
  for (let i = 0; i < nodeCount; i++) {
    const { x, y } = pos[i]
    const t      = nodeT[i] ?? 1
    const sc     = elasticOut(t)
    const isLast = i === nodeCount - 1
    const pulse  = isLast ? Math.sin(pulseT * 2) * 0.09 + 1 : 1
    const ring   = nodeRings?.[i]
    const dist   = bellmanDist?.[i]

    // Ring burst que expande ao aparecer
    if (ring && ring.op > 0.01) {
      ctx.save()
      ctx.beginPath()
      ctx.arc(x, y, GVIZ_NR * ring.r, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(76,247,176,${ring.op * 0.8})`
      ctx.lineWidth = 2.5
      ctx.shadowColor = 'rgba(76,247,176,0.9)'; ctx.shadowBlur = 10
      ctx.stroke()
      ctx.restore()
    }

    ctx.save()
    ctx.translate(x, y)
    ctx.scale(sc * pulse, sc * pulse)

    if (isLast) {
      ctx.shadowColor = 'rgba(76,247,176,0.85)'; ctx.shadowBlur = 22
    } else if (t < 1) {
      ctx.shadowColor = 'rgba(76,247,176,0.55)'; ctx.shadowBlur = 14
    }

    ctx.beginPath(); ctx.arc(0, 0, GVIZ_NR, 0, Math.PI * 2)
    ctx.fillStyle   = isLast ? 'rgba(38,194,129,0.28)' : i === 0 ? 'rgba(76,130,255,0.18)' : 'rgba(255,255,255,0.07)'
    ctx.fill()
    ctx.lineWidth   = 2
    ctx.strokeStyle = isLast ? '#4cf7b0' : i === 0 ? 'rgba(100,160,255,0.60)' : 'rgba(255,255,255,0.28)'
    ctx.stroke()

    ctx.shadowBlur   = 0
    ctx.fillStyle    = isLast ? '#4cf7b0' : 'rgba(195,220,210,0.88)'
    ctx.font         = `bold ${i >= 10 ? 8 : 9}px "Courier New",monospace`
    ctx.textAlign    = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('S' + i, 0, 0)
    ctx.restore()

    // Custo BF surge gradualmente abaixo do nó
    if (dist !== undefined && dist !== Infinity && t > 0.5) {
      const lOp = Math.min(1, (t - 0.5) / 0.5)
      ctx.save()
      ctx.globalAlpha  = lOp
      ctx.font         = '8px "Courier New",monospace'
      ctx.textAlign    = 'center'; ctx.textBaseline = 'alphabetic'
      ctx.fillStyle    = dist < 0 ? 'rgba(76,247,176,0.75)' : dist > 3 ? 'rgba(255,107,107,0.75)' : 'rgba(175,200,190,0.62)'
      ctx.fillText((dist > 0 ? '+' : '') + dist.toFixed(1), x, y + GVIZ_NR + 13)
      ctx.restore()
    }
  }
}

function GraphViz({ edges, nodeCount, bellmanDist }) {
  const canvasRef = useRef(null)
  const stRef     = useRef({
    edges: [], nodeCount: 1, bellmanDist: [0],
    nodeT: [0],           // tempo elástico 0→1 para cada nó
    edgeProgress: [],     // progresso 0→1 de desenho de cada aresta
    nodeRings: [{ r: 1, op: 0 }],  // ring burst por nó
    pulseT: 0,
  })

  // Sync props → stRef; crescer arrays de animação para nós/arestas novos
  useEffect(() => {
    const st = stRef.current
    while (st.nodeT.length < nodeCount) {
      st.nodeT.push(0)
      st.nodeRings.push({ r: 1, op: 1 })  // ativa ring burst para novo nó
    }
    while (st.edgeProgress.length < edges.length) st.edgeProgress.push(0)
    st.edges = edges; st.nodeCount = nodeCount; st.bellmanDist = bellmanDist || []

    const canvas = canvasRef.current
    if (canvas) {
      const rows = Math.max(1, Math.ceil(nodeCount / GVIZ_COLS))
      canvas.height = 38 + GVIZ_NR + rows * GVIZ_ROW_H + 28
    }
  }, [edges, nodeCount, bellmanDist])

  // Loop RAF persistente para animações
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let rafId

    const tick = () => {
      const st = stRef.current
      st.pulseT += 0.05

      // Animação elástica dos nós
      for (let i = 0; i < st.nodeT.length; i++)
        if (st.nodeT[i] < 1) st.nodeT[i] = Math.min(1, st.nodeT[i] + 0.055)

      // Progresso de desenho das arestas
      for (let i = 0; i < st.edgeProgress.length; i++)
        if (st.edgeProgress[i] < 1) st.edgeProgress[i] = Math.min(1, st.edgeProgress[i] + 0.05)

      // Ring burst expandindo e desaparecendo
      for (const ring of st.nodeRings) {
        if (ring.op > 0) {
          ring.r  = Math.min(3.5, ring.r + 0.07)
          ring.op = Math.max(0, ring.op - 0.032)
        }
      }

      drawGviz(ctx, canvas.width, canvas.height, st)
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])

  return <canvas ref={canvasRef} width={GVIZ_W} height={38 + GVIZ_NR + GVIZ_ROW_H + 28} className="cg-gviz-canvas" />
}

// ── React component ────────────────────────────────────────────
export default function Game({ startDirect = false, onBack }) {
  const canvasRef = useRef(null)
  const stateRef = useRef(null)
  const rafRef = useRef(null)
  const imgsRef = useRef({})
  const [phase, setPhase] = useState('loading')
  const [finalScore, setFinalScore] = useState(0)
  const [hiScore, setHiScore] = useState(() => Number(localStorage.getItem('cstack_hi') || 0))
  const [rankings, setRankings] = useState(() => loadRankings())
  const [playerName, setPlayerName] = useState('')
  const [lastSavedIdx, setLastSavedIdx] = useState(-1)
  const [photo, setPhoto] = useState(null)        // foto da webcam p/ o ranking
  const [camOpen, setCamOpen] = useState(false)
  const [hudState, setHudState] = useState({
    score: 0, level: 1, reputation: 100, stacked: 0, rankPos: 1,
    graphEdgesPreview: [], bellmanFinalCost: 0,
    lastMoveWeight: null, lastMoveLabel: '', lastReactionTime: 0,
    graphEdgesAll: [], graphNodeCount: 1, graphBellmanDist: [0],
  })
  const gvizScrollRef = useRef(null)
  const rankingsRef = useRef(loadRankings())

  useEffect(() => {
    loadAllAssets().then(imgs => {
      imgsRef.current = imgs
      if (startDirect) {
        stateRef.current = makeState()
        setPhase('playing')
      } else {
        setPhase('menu')
      }
    })
  }, [])

  // Auto-scroll graph viz to bottom when new node appears
  useEffect(() => {
    if (gvizScrollRef.current) {
      gvizScrollRef.current.scrollTop = gvizScrollRef.current.scrollHeight
    }
  }, [hudState.graphNodeCount])

  const startGame = useCallback(() => {
    stateRef.current = makeState()
    setPlayerName('')
    setLastSavedIdx(-1)
    setPhoto(null)
    setCamOpen(false)
    setPhase('playing')
  }, [])

  useEffect(() => {
    if (phase !== 'playing') return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    let hudTick = 0
    function loop() {
      const s = stateRef.current
      if (!s) return

      update(s)
      draw(ctx, s, imgsRef.current)

      hudTick++
      if (hudTick % 6 === 0) {
        const rankPos = rankingsRef.current.filter(r => r.score > s.score).length + 1
        setHudState({
          score: s.score, level: s.level, reputation: s.reputation, stacked: s.stacked, rankPos,
          graphEdgesPreview: s.graphEdges.slice(-3),
          bellmanFinalCost: s.bellmanDist.length > 0 ? s.bellmanDist[s.bellmanDist.length - 1] : 0,
          lastMoveWeight: s.lastMoveWeight,
          lastMoveLabel: s.lastMoveLabel,
          lastReactionTime: s.lastReactionTime,
          graphEdgesAll: [...s.graphEdges],
          graphNodeCount: s.graphNodes,
          graphBellmanDist: [...s.bellmanDist],
        })
      }

      if (s.gameOver) {
        const sc = s.score
        setFinalScore(sc)
        setHiScore(prev => {
          const next = Math.max(prev, sc)
          localStorage.setItem('cstack_hi', next)
          return next
        })
        setPhase('gameover')
        return
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [phase])

  const handleSaveScore = useCallback(() => {
    const { top, name } = addToRanking(playerName, finalScore, photo)
    const idx = top.findIndex(r => r.name === name && r.score === finalScore)
    setLastSavedIdx(idx)
    setRankings(top)

    if (top.length > 0) {
      const hi = top[0].score
      localStorage.setItem('cstack_hi', hi)
      setHiScore(h => Math.max(h, hi))
    }

    rankingsRef.current = top
    setPhase('ranking')
  }, [playerName, finalScore, photo])

  const handleSkipSave = useCallback(() => {
    setLastSavedIdx(-1)
    const latest = loadRankings()
    rankingsRef.current = latest
    setRankings(latest)
    setPhase('ranking')
  }, [])

  const handleInput = useCallback(() => {
    if (phase !== 'playing') return
    const s = stateRef.current
    if (!s || s.dropping || s.landDelay > 0 || s.gameOver) return

    s.lastReactionTime = performance.now() - s.moveStartTime
    playSound('drop')
    s.clawOpen = 1        // abre a garra imediatamente ao soltar
    s.clawRecoil = 9      // cabo recua/salta ao perder a carga

    const angle = s.pendAngle
    const pivotY = getPivotY()
    const ropeLen = getCurrentRopeLen(s)
    const grabX = s.pivotX + ropeLen * Math.sin(angle)
    const grabY = pivotY + ropeLen * Math.cos(angle)

    const nextSize = getBlockSize(s.level, s.stacked)
    const width = nextSize.w
    const height = nextSize.h
    const contX = Math.max(0, Math.min(CW - width, grabX - width / 2))
    const contY = grabY + GRAB_H

    s.dropping = {
      x: contX,
      worldY: contY + s.viewY,
      vy: INIT_DROP_VY,
      imgKey: s.nextImg,
      width,
      height,
      scale: nextSize.scale,
    }
  }, [phase])

  // Barra de espaço também solta o contêiner (além do clique/toque)
  useEffect(() => {
    if (phase !== 'playing') return
    const onKey = (e) => {
      if (e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault()
        handleInput()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, handleInput])

  const repColor = hudState.reputation > 60 ? '#26c281' : hudState.reputation > 30 ? '#f6c56f' : '#ff6b6b'
  const isPlaying = phase === 'playing'

  return (
    <div className="cg-outer-game">

      <button className="cg-back-btn" onClick={onBack} type="button" title="Sair">
        <span className="cg-back-icon">
          <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
            <path d="M15 6L9 12L15 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
        <span className="cg-back-text">Voltar</span>
      </button>

      <div className="cg-game-row">
        {isPlaying && (
          <div className="cg-graph-viz-panel">
            <div className="cg-gviz-heading">GRAFO DA PARTIDA</div>
            <div className="cg-gviz-scroll" ref={gvizScrollRef}>
              <GraphViz
                edges={hudState.graphEdgesAll}
                nodeCount={hudState.graphNodeCount}
                bellmanDist={hudState.graphBellmanDist}
              />
            </div>
            <div className="cg-gviz-footer">
              <span className="cg-gviz-footer-label">CUSTO ACUMULADO BF</span>
              <span className={`cg-gviz-footer-cost${(hudState.bellmanFinalCost || 0) < 0 ? ' neg' : (hudState.bellmanFinalCost || 0) > 4 ? ' pos' : ''}`}>
                {(hudState.bellmanFinalCost || 0) > 0 ? '+' : ''}{Number(hudState.bellmanFinalCost || 0).toFixed(1)}
              </span>
            </div>
          </div>
        )}

        <div className="cg-canvas-wrap">
          <canvas
            ref={canvasRef}
            width={CW}
            height={CH}
            className="cg-canvas-el"
            onClick={handleInput}
            onTouchStart={e => { e.preventDefault(); handleInput() }}
          />
        </div>

        <div className={`cg-sidebar${isPlaying ? '' : ' cg-sidebar--hidden'}`}>
          <div className="cg-scard">
            <div className="cg-scard-header">
              <img src={logoETN} className="cg-scard-brand-logo" alt="ETN" />
              <span className="cg-scard-brand-sub">CONTROLE DE CARGAS</span>
            </div>
            <div className="cg-scard-divider" />
            <div className="cg-scard-stats">
              <div className="cg-scard-stat cg-scard-stat--rep">
                <span className="cg-scard-label">REPUTAÇÃO</span>
                <span className="cg-scard-value" style={{ color: repColor }}>{Math.round(hudState.reputation)}%</span>
              </div>
              <div className="cg-scard-stat cg-scard-stat--gold">
                <span className="cg-scard-label">PONTUAÇÃO</span>
                <span className="cg-scard-value">{hudState.score}</span>
              </div>
              <div className="cg-scard-stat cg-scard-stat--lvl">
                <span className="cg-scard-label">NÍVEL</span>
                <span className="cg-scard-value">{hudState.level}</span>
              </div>
              <div className="cg-scard-stat cg-scard-stat--rank">
                <span className="cg-scard-label">RANKING</span>
                <span className="cg-scard-value">#{hudState.rankPos}</span>
              </div>
            </div>
            <div className="cg-scard-divider" />
            <div className="cg-graph-section">
              <span className="cg-graph-heading">BELLMAN-FORD</span>
              <div className="cg-graph-chain">
                {hudState.graphEdgesPreview.length === 0 ? (
                  <span className="cg-graph-empty">Aguardando jogadas…</span>
                ) : (
                  <>
                    {hudState.graphEdgesPreview.length >= 3 && (
                      <span className="cg-graph-more">…</span>
                    )}
                    {hudState.graphEdgesPreview.map((e, i) => (
                      <span key={e.from} className="cg-gnode-pair">
                        {i === 0 && <span className="cg-gnode">S{e.from}</span>}
                        <span className={`cg-gedge ${e.weight < 0 ? 'cg-gedge--neg' : e.weight < 2 ? 'cg-gedge--neu' : 'cg-gedge--pos'}`}>
                          {e.weight > 0 ? '+' : ''}{e.weight}
                        </span>
                        <span className="cg-gnode">S{e.to}</span>
                      </span>
                    ))}
                  </>
                )}
              </div>
              <div className="cg-graph-row2">
                <div className="cg-graph-meta-item">
                  <span className="cg-graph-meta-label">CUSTO BF</span>
                  <span className={`cg-graph-meta-val${hudState.bellmanFinalCost < 0 ? ' neg' : hudState.bellmanFinalCost > 4 ? ' pos' : ''}`}>
                    {hudState.bellmanFinalCost === Infinity ? '∞' : (hudState.bellmanFinalCost > 0 ? '+' : '') + Number(hudState.bellmanFinalCost).toFixed(1)}
                  </span>
                </div>
                {hudState.lastReactionTime > 0 && (
                  <div className="cg-graph-meta-item">
                    <span className="cg-graph-meta-label">REAÇÃO</span>
                    <span className="cg-graph-meta-val">{(hudState.lastReactionTime / 1000).toFixed(2)}s</span>
                  </div>
                )}
              </div>
              {hudState.lastMoveLabel && (
                <div className={`cg-graph-badge${
                  hudState.lastMoveWeight !== null && hudState.lastMoveWeight < 0 ? ' cg-graph-badge--neg' :
                  hudState.lastMoveWeight !== null && hudState.lastMoveWeight < 2 ? ' cg-graph-badge--neu' : ' cg-graph-badge--pos'
                }`}>
                  {hudState.lastMoveLabel}
                </div>
              )}
            </div>
            <div className="cg-scard-divider" />
            <div className="cg-scard-footer">
              <span className="cg-scard-ping" />
              <span className="cg-scard-status">EM SERVIÇO</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Loading ── */}
      {phase === 'loading' && (
        <div className="overlay">
          <div className="panel">
            <p className="blink">CARREGANDO ASSETS...</p>
          </div>
        </div>
      )}

      {/* ── Menu principal — estilo AirportGame ── */}
      {phase === 'menu' && (
        <div className="overlay cg-menu-overlay">
          <div className="cg-shell">
            <div className="cg-header">
              <h2 className="cg-title">CONTROLE DE CARGAS</h2>
              <p className="cg-subtitle">Empilhe contêineres no porto com precisão</p>
            </div>

            <div className="panel cg-menu-panel">
              <div className="cg-inner">
                <div className="cg-stats-row">
                  <div className="cg-stat-card cg-stat-teal">
                    <span className="cg-stat-val">+REP</span>
                    <span className="cg-stat-label">PERFEITO</span>
                    <span className="cg-stat-desc">Encaixe preciso</span>
                  </div>
                  <div className="cg-stat-card cg-stat-gold">
                    <span className="cg-stat-val">−REP</span>
                    <span className="cg-stat-label">ERRO</span>
                    <span className="cg-stat-desc">Cresce com o nível</span>
                  </div>
                  <div className="cg-stat-card cg-stat-purple">
                    <span className="cg-stat-val">×8</span>
                    <span className="cg-stat-label">NÍVEL</span>
                    <span className="cg-stat-desc">Sobe a cada 8</span>
                  </div>
                </div>

                <div className="cg-howto">
                  {[
                    'Observe o contêiner balançar no pêndulo',
                    'Clique para soltar no momento certo',
                    'Reputação zero — fim de jogo!',
                  ].map((tip, i) => (
                    <div className="cg-howto-item" key={i}>
                      <span className="cg-howto-num">{i + 1}</span>
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>

                {hiScore > 0 && <p className="hi cg-hi">RECORDE: {hiScore}</p>}

                <div className="cg-launch-wrap">
                  <button className="cg-nav-btn cg-nav-btn--play" onClick={startGame} type="button">
                    <span className="cg-nav-btn-title">▶ JOGAR</span>
                    <span className="cg-nav-btn-sub">Iniciar partida</span>
                  </button>
                  <button
                    className="cg-nav-btn cg-nav-btn--rank"
                    type="button"
                    onClick={() => {
                      setRankings(loadRankings())
                      setLastSavedIdx(-1)
                      setPhase('ranking')
                    }}
                  >
                    <span className="cg-nav-btn-title">RANKING</span>
                    <span className="cg-nav-btn-sub">Melhores jogadores</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Game Over ── */}
      {phase === 'gameover' && (
        <div className="overlay">
          <div className="panel">
            <h1 className="title over">GAME<br />OVER</h1>
            <p className="score-val">Pontuação: <strong>{finalScore}</strong></p>
            {finalScore > 0 && finalScore >= hiScore && (
              <p className="new-rec">NOVO RECORDE!</p>
            )}
            <div className="name-entry">
              <p className="sub">Digite seu nome para salvar:</p>
              <input
                className="rank-input"
                type="text"
                maxLength={12}
                placeholder="SEU NOME"
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveScore()}
                autoFocus
              />
            </div>

            {/* Foto da webcam para o ranking */}
            <div className="cg-photo-entry">
              <button
                type="button"
                className={`cg-photo-avatar${photo ? ' has-photo' : ''}`}
                onClick={() => setCamOpen(true)}
                title={photo ? 'Refazer foto' : 'Tirar foto'}
              >
                {photo
                  ? <img src={photo} alt="sua foto" />
                  : <span className="cg-photo-icon">📷</span>}
                <span className="cg-photo-edit">{photo ? '↻' : '+'}</span>
              </button>
              <button type="button" className="cg-photo-btn" onClick={() => setCamOpen(true)}>
                {photo ? 'REFAZER FOTO' : 'TIRAR FOTO'}
              </button>
            </div>

            <div className="btn-row">
              <button className="btn" onClick={handleSaveScore}>SALVAR</button>
              <button className="btn btn-outline" onClick={handleSkipSave}>PULAR</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Ranking ── */}
      {phase === 'ranking' && (
        <div className="overlay">
          <div className="panel panel-wide">
            <h1 className="title rank-title">TOP 10</h1>
            <table className="rank-table">
              <thead>
                <tr>
                  <th className="th-pos">#</th>
                  <th className="th-avatar"></th>
                  <th className="th-name">NOME</th>
                  <th className="th-score">PONTOS</th>
                </tr>
              </thead>
              <tbody>
                {rankings.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="rank-empty">Sem recordes ainda</td>
                  </tr>
                ) : (
                  rankings.map((r, i) => (
                    <tr key={i} className={i === lastSavedIdx ? 'rank-highlight' : ''}>
                      <td className={`rank-pos rank-pos-${i + 1}`}>{i + 1}</td>
                      <td className="rank-avatar-cell">
                        {r.photo
                          ? <img className="cg-rank-photo" src={r.photo} alt="" />
                          : <span className="cg-rank-photo cg-rank-photo--empty">{(r.name || '?').charAt(0)}</span>}
                      </td>
                      <td className="rank-name">{r.name}</td>
                      <td className="rank-score">{r.score}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <div className="btn-row">
              <button className="btn" onClick={startGame}>JOGAR</button>
              <button className="btn btn-outline" onClick={() => startDirect && onBack ? onBack() : setPhase('menu')}>MENU</button>
            </div>
          </div>
        </div>
      )}

      <WebcamCapture
        open={camOpen}
        accent="#26c281"
        onCapture={setPhoto}
        onClose={() => setCamOpen(false)}
      />
    </div>
  )
}
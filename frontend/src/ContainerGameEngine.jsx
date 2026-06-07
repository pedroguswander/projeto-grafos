import { useRef, useEffect, useState, useCallback } from 'react'
import { playSound } from './containerSounds.js'
import logoETN from './assets/logo-2/logo-branca-completa2.png'

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
const GRAB_W = 210
const GRAB_H = 30
const ROPE_TOP_SPREAD = 12
const ROPE_GRAB_SPREAD = 24
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
const CONTAINER_COLORS = ['amarelo', 'azul', 'laranja', 'roxo', 'verde']

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

function addToRanking(rawName, score) {
  const name = (rawName.trim().slice(0, 12) || 'ANON').toUpperCase()
  const list = loadRankings()
  list.push({ name, score, date: new Date().toLocaleDateString('pt-BR') })
  list.sort((a, b) => b.score - a.score)
  const top = list.slice(0, 10)
  localStorage.setItem(RANKING_KEY, JSON.stringify(top))
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
    ['grab', enc('3 Objects/4 Overhead crane/3 Grab/1Grab.png')],
    ['tile', enc('1 Tiles/Tile_01.png')],
    ['bg_sky_day', enc('3 Background/Day/1.png')],
    ['bg_2_day',   enc('3 Background/Day/2.png')],
    ['bg_3_day',   enc('3 Background/Day/3.png')],
    ['bg_4_day',   enc('3 Background/Day/4.png')],
    ['bg_5_day',   enc('3 Background/Day/5.png')],
    ['fence_2', enc('3 Objects/2 Fencing/2.png')],
    ['dbox_2',  enc('3 Objects/3 Box/2.png')],
    ['dbox_6',  enc('3 Objects/3 Box/6.png')],
    ...CONTAINER_COLORS.flatMap(color => [
      [`${color}_inteiro`, enc(`3 Objects/1 Cargos/${color}-inteiro.png`)],
      [`${color}_amassado`, enc(`3 Objects/1 Cargos/${color}-amassado.png`)],
    ]),
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
    cartDir: 1,
    stack: [{
      worldX: ix,
      worldY: firstBlockWY,
      width: w,
      height: h,
      scale,
      imgKey: randContainerKey(),
      damaged: false,
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

  if (s.level >= ROPE_PULSE_START_LEVEL && !s.dropping && s.landDelay === 0) {
    s.ropePulseTime += ROPE_PULSE_SPEED
  }

  if (s.landDelay > 0) {
    s.landDelay--
    if (s.landDelay === 0) s.moveStartTime = performance.now()
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
      })

      spawnParticles(s, dropX + width / 2, landWY, width, height)

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
          color: '#fff',
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

function updateParticles(s) {
  s.particles = s.particles.filter(p => p.alpha > 0.05)
  for (const p of s.particles) {
    p.x += p.vx
    p.y += p.vy
    p.vy += 0.3
    p.alpha -= 0.022
  }
}

function updateFloatTexts(s) {
  s.floatTexts = s.floatTexts.filter(t => t.alpha > 0.05)
  for (const t of s.floatTexts) {
    t.worldY -= 0.9
    t.alpha -= 0.013
  }
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

  for (const block of s.stack) drawBlock(ctx, block, imgs)
  if (s.dropping) drawDropping(ctx, s, imgs)

  for (const p of s.particles) {
    ctx.globalAlpha = p.alpha
    ctx.fillStyle = p.color
    ctx.fillRect(
      Math.round(p.x - p.size / 2),
      Math.round(p.y - p.size / 2),
      Math.round(p.size),
      Math.round(p.size)
    )
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
  if (!s.dropping && s.landDelay === 0) drawPendulum(ctx, s, imgs)

  ctx.restore()

  ctx.restore()
}

// ── Background paralaxe ────────────────────────────────────────
function drawBackground(ctx, s, imgs) {
  const cameraRise = Math.max(0, s.initialViewY - s.viewY)
  const skyShift = Math.min(cameraRise * 0.03, 60)

  if (imgs.bg_sky_day) {
    // draw with extra height to cover the gap left by the upward shift
    ctx.drawImage(imgs.bg_sky_day, 0, Math.round(-skyShift), CW, CH + Math.ceil(skyShift))
  } else {
    ctx.fillStyle = '#b8ccd8'
    ctx.fillRect(0, 0, CW, CH)
  }

  const floorSY = s.floorWY - s.viewY
  // clamp so layers never leave the bottom of the canvas as camera rises
  const anchorY = Math.min(floorSY + FLOOR_H, CH)

  const layers = [
    { n: '5', hFrac: 0.14, speed: 0.04 },
    { n: '4', hFrac: 0.18, speed: 0.09 },
    { n: '3', hFrac: 0.22, speed: 0.17 },
    { n: '2', hFrac: 0.28, speed: 0.28 },
  ]

  for (const layer of layers) {
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

function drawBlock(ctx, block, imgs) {
  const variant = block.damaged ? '_amassado' : '_inteiro'
  const img = imgs[block.imgKey + variant]
  if (img) {
    ctx.drawImage(
      img,
      0, 0, img.naturalWidth, img.naturalHeight,
      Math.round(block.worldX), Math.round(block.worldY), block.width, block.height
    )
  } else {
    ctx.fillStyle = `hsl(${block.worldY * 0.05 % 360}, 65%, 55%)`
    ctx.fillRect(Math.round(block.worldX), Math.round(block.worldY), block.width, block.height)
  }
}

function drawDropping(ctx, s, imgs) {
  const img = imgs[s.dropping.imgKey + '_inteiro']
  const { x, worldY, width, height } = s.dropping
  if (img) {
    ctx.drawImage(
      img,
      0, 0, img.naturalWidth, img.naturalHeight,
      Math.round(x), Math.round(worldY), width, height
    )
  } else {
    ctx.fillStyle = '#4A8'
    ctx.fillRect(Math.round(x), Math.round(worldY), width, height)
  }
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

function drawPendulum(ctx, s, imgs) {
  const pivotX = s.pivotX
  const pivotY = getPivotY()
  const angle = s.pendAngle
  const ropeLen = getCurrentRopeLen(s)
  const grabX = pivotX + ropeLen * Math.sin(angle)
  const grabY = pivotY + ropeLen * Math.cos(angle)

  const topLeftX = pivotX - ROPE_TOP_SPREAD
  const topRightX = pivotX + ROPE_TOP_SPREAD
  const topY = pivotY
  const bottomLeftX = grabX - ROPE_GRAB_SPREAD
  const bottomRightX = grabX + ROPE_GRAB_SPREAD
  const bottomY = grabY + 2

  const nextSize = getBlockSize(s.level, s.stacked)
  const contW = nextSize.w
  const contH = nextSize.h
  const contX = grabX - contW / 2
  const contY = grabY + GRAB_H

  const top = s.stack[s.stack.length - 1]
  const topSY = top.worldY - s.viewY
  const landY = topSY - contH



  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,100,0.65)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(Math.round(top.worldX), Math.round(topSY))
  ctx.lineTo(Math.round(top.worldX + top.width), Math.round(topSY))
  ctx.stroke()
  ctx.restore()

  const lineFrom = contY + contH
  if (lineFrom < landY - 10) {
    ctx.save()
    ctx.setLineDash([4, 8])
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(Math.round(grabX), Math.round(lineFrom))
    ctx.lineTo(Math.round(grabX), Math.round(landY))
    ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()
  }

  ctx.save()
  ctx.strokeStyle = '#888'
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(Math.round(topLeftX), Math.round(topY))
  ctx.lineTo(Math.round(bottomLeftX), Math.round(bottomY))
  ctx.moveTo(Math.round(topRightX), Math.round(topY))
  ctx.lineTo(Math.round(bottomRightX), Math.round(bottomY))
  ctx.stroke()
  ctx.restore()

  if (imgs.grab) {
    const iw = imgs.grab.naturalWidth
    const ih = imgs.grab.naturalHeight
    ctx.drawImage(
      imgs.grab,
      0, 0, iw / 4, ih,
      Math.round(grabX - GRAB_W / 2), Math.round(grabY), GRAB_W, GRAB_H
    )
  } else {
    ctx.fillStyle = '#e44'
    ctx.fillRect(Math.round(grabX - GRAB_W / 2), Math.round(grabY), GRAB_W, GRAB_H)
  }

  const nextImgKey = s.nextImg + '_inteiro'
  if (imgs[nextImgKey]) {
    ctx.drawImage(
      imgs[nextImgKey],
      0, 0, imgs[nextImgKey].naturalWidth, imgs[nextImgKey].naturalHeight,
      Math.round(contX), Math.round(contY), contW, contH
    )
  } else {
    ctx.fillStyle = '#4A8'
    ctx.fillRect(Math.round(contX), Math.round(contY), contW, contH)
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
    const { top, name } = addToRanking(playerName, finalScore)
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
  }, [playerName, finalScore])

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
                  <th className="th-name">NOME</th>
                  <th className="th-score">PONTOS</th>
                </tr>
              </thead>
              <tbody>
                {rankings.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="rank-empty">Sem recordes ainda</td>
                  </tr>
                ) : (
                  rankings.map((r, i) => (
                    <tr key={i} className={i === lastSavedIdx ? 'rank-highlight' : ''}>
                      <td className={`rank-pos rank-pos-${i + 1}`}>{i + 1}</td>
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
    </div>
  )
}
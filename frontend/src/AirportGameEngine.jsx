import { useEffect, useRef, useState, useCallback } from 'react'
import './css/AirportGameEngine.css'
import logoETA from './assets/logo/logo_branca_completa.png'
import { createPlanes3D, createTerrain3D, makeThumbnails } from './planes3d.js'

// ════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════
const CW = 800, CH = 600
const MAX_DT = 0.05

// Radar — shifted up so full circle fits in 600px canvas
// CY=295, R=285: top=10, bottom=580 ✓
const RADAR_CX = 400, RADAR_CY = 295, RADAR_R = 285
const GRID_STEP = 40, N_RINGS = 5, SWEEP_DEG = 55
const SWEEP_SPEED = 0.008

// Brazil projection (radar_background.py)
const LON_MIN = -74.0, LON_MAX = -28.8
const LAT_MIN = -33.8, LAT_MAX =   5.3
const LON_CTR = (LON_MIN + LON_MAX) / 2   // -51.4
const LAT_CTR = (LAT_MIN + LAT_MAX) / 2   // -14.25
// Larger scale → bigger Brazil on screen
const MAP_SCALE = 12.5   // 25% larger than original for better readability

// Airport position recalculated for new RADAR_CY=295, MAP_SCALE=10
// Same geographic location (~45.5°W, 5.1°S — NE Brazil interior)
const AIRPORT_POS = { x: 459, y: 204 }
const AIRPORT_SCALE = 0.52
// LANDING_REL offset: (-10, 0) from AIRPORT_POS
const LANDING_AREA = { x: 449, y: 204, w: 36, h: 104 }
const LANDING_THRESHOLD = 0.22

// Roaming area — full canvas (HUD is now React, outside canvas)
const ROAM = { x: 0, y: 0, w: 800, h: 600 }

// Spawn corners
const SPAWN_CORNERS = [
  { x: 20, y: 20 }, { x: 20, y: 580 }, { x: 780, y: 580 }, { x: 780, y: 20 },
]

// Airplane definitions
const PLANE_DEFS = {
  //                                                              apprDist = 30 + (speed/turnSpeed)*1.5  (min vertical lead for each type)
  small:  { speed: 35,  turnSpeed: 5.5, hitbox: 14, score: 10,  imgScale: 0.63, apprDist: 40  },
  medium: { speed: 65,  turnSpeed: 3.0, hitbox: 16, score: 50,  imgScale: 0.75, apprDist: 65  },
  heavy:  { speed: 110, turnSpeed: 1.5, hitbox: 18, score: 100, imgScale: 0.72, apprDist: 140 },
}
// RGB strings for Dijkstra path color per plane type
const DJK_COLORS = { small: '255,185,40', medium: '77,163,255', heavy: '255,70,70' }

// Menu button rects (calibrated for menu_v4.png drawn at 800×600)
const PLAY_BTN = { x: 272, y: 318, w: 258, h: 80 }
const RANK_BTN = { x: 258, y: 432, w: 288, h: 60 }
const BACK_BTN = { x: 668, y:  29, w: 101, h: 50 }

// Ranking card (ranking_v2.png)
const RANK_CARD = { x: 218, y: 272, w: 370, h: 258 }
const RANK_ROW_H = 28, RANK_PAD_V = 12, RANK_PAD_H = 14

// Path
const PATH_GAP_SQ = 100

// Game-over flash duration
const GAMEOVER_FLASH = 1.2

// Fuel — durations in seconds, already reduced 25% from base values
const FUEL_MAX = { small: 94, medium: 75, heavy: 49 }
// Blink timing
const BLINK_PERIOD_FULL  = 4.0   // seconds between blinks at 100% fuel
const BLINK_PERIOD_EMPTY = 0.3   // seconds between blinks near empty
const BLINK_DARK_DUR     = 0.12  // duration of each "off" flash
const FUEL_CRITICAL      = 0.25  // below 25% → red blink

// Bird hazard — periodic no-fly zone over the runway (unlocks past a score gate).
// Every BIRD_PERIOD seconds the zone activates: a WARN grace window (blinking ring,
// not yet deadly → time to reroute) followed by a DANGER window (entering = bird strike).
const BIRD_SCORE_THRESHOLD = 400   // birds only start appearing after this score
const BIRD_PERIOD          = 30    // seconds between alerts
const BIRD_WARN_DUR        = 4.5   // grace: zone blinks but isn't lethal yet
const BIRD_DANGER_DUR      = 9     // lethal window — a plane inside = bird strike
const BIRD_HAZARD_DUR      = BIRD_WARN_DUR + BIRD_DANGER_DUR
const BIRD_COUNT           = 8     // silhouettes circling inside the zone
const BIRD_ZONE = {
  x: LANDING_AREA.x + LANDING_AREA.w / 2,   // 467 — runway centre
  y: LANDING_AREA.y + LANDING_AREA.h / 2,   // 256
  r: 86,
}

// Game-over cause metadata (shown on the end screen + drives the reason chip)
const GAMEOVER_REASONS = {
  collision: { icon: '✕',  label: 'Colisão entre aeronaves',          color: '#ff5a5a' },
  fuel:      { icon: '⛽', label: 'Combustível esgotado',              color: '#f6c56f' },
  bird:      { icon: '🐦', label: 'Bird strike — pássaros na pista',   color: '#ff7846' },
}

// ════════════════════════════════════════════════════════════════════════════
// PURE HELPERS
// ════════════════════════════════════════════════════════════════════════════
let _uid = 0
function uid() { return ++_uid }

function dist2(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy }
function pointInRect(r, px, py) { return px > r.x && px < r.x + r.w && py > r.y && py < r.y + r.h }

function getHitbox(p) {
  const h = p.def.hitbox
  return { x: p.x - h / 2, y: p.y - h / 2, w: h, h }
}
function aabbCollide(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

function checkLanding(p) {
  const hb = getHitbox(p)
  const hbCX = hb.x + hb.w / 2
  if (hbCX < LANDING_AREA.x || hbCX > LANDING_AREA.x + LANDING_AREA.w) return false
  if (!aabbCollide(hb, LANDING_AREA)) return false
  const vl = Math.sqrt(p.vx * p.vx + p.vy * p.vy)
  if (vl === 0) return false
  return Math.abs(-(p.vx / vl)) < LANDING_THRESHOLD
}

function updatePlane(p, dt) {
  if (p.crashed) return
  p.turnSign = 0 // set below while turning — drives the 3D bank (roll)
  let { vx, vy } = p
  const hb = getHitbox(p)

  const outside = hb.x < ROAM.x || hb.y < ROAM.y ||
                  hb.x + hb.w > ROAM.x + ROAM.w || hb.y + hb.h > ROAM.y + ROAM.h
  if (outside) {
    if (p.x < ROAM.x && vx < 0)           vx = -vx
    if (p.x > ROAM.x + ROAM.w && vx > 0)  vx = -vx
    if (p.y < ROAM.y && vy < 0)            vy = -vy
    if (p.y > ROAM.y + ROAM.h && vy > 0)  vy = -vy
  }

  if (p.path.length > 0) {
    const tgt = p.path[0]
    const dx = tgt.x - p.x, dy = tgt.y - p.y
    const d2 = dx * dx + dy * dy
    if (d2 < p.def.hitbox * p.def.hitbox) {
      p.path.shift()
    } else {
      const vl = Math.sqrt(vx * vx + vy * vy)
      const pl = Math.sqrt(d2)
      if (vl > 0 && pl > 0) {
        const vnx = vx / vl, vny = vy / vl
        const pnx = dx / pl, pny = dy / pl
        const cross = vnx * pny - vny * pnx
        const dot   = vnx * pnx + vny * pny
        let rot = 0
        if (Math.abs(cross) > 0.05) rot = p.def.turnSpeed * dt * (cross > 0 ? 1 : -1)
        else if (dot < 0)           rot = p.def.turnSpeed * dt
        if (rot !== 0) {
          const a = Math.atan2(vy, vx) + rot
          vx = Math.cos(a) * vl
          vy = Math.sin(a) * vl
          p.turnSign = rot > 0 ? 1 : -1
        }
      }
    }
  }

  p.vx = vx; p.vy = vy
  p.x += vx * dt
  p.y += vy * dt
}

function difficulty(score) { return Math.min(score / 800, 1) }
function spawnInterval(score) { return 10 - difficulty(score) * 7.5 }

function createPlane(imgs, score) {
  const t = difficulty(score)
  const heavyPct  =  8 + t * 22
  const mediumPct = 17 + t * 23
  const r = Math.random() * 100
  const type = r < heavyPct ? 'heavy' : r < heavyPct + mediumPct ? 'medium' : 'small'
  const def  = PLANE_DEFS[type]
  const corner = SPAWN_CORNERS[Math.floor(Math.random() * 4)]
  const angle = Math.random() * Math.PI * 2
  return {
    id: uid(), type, def,
    img: imgs[type] ?? null,
    x: corner.x, y: corner.y,
    vx: Math.cos(angle) * def.speed,
    vy: Math.sin(angle) * def.speed,
    path: [], crashed: false,
    fuel: FUEL_MAX[type], blinkTimer: 0,
    dijkstraPath: [],
  }
}

function toCanvas(canvas, cx, cy) {
  const r = canvas.getBoundingClientRect()
  return { x: (cx - r.left) * (CW / r.width), y: (cy - r.top) * (CH / r.height) }
}

function drawRotated(ctx, img, x, y, angle, scale) {
  const w = img.width * scale, h = img.height * scale
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.drawImage(img, -w / 2, -h / 2, w, h)
  ctx.restore()
}

// ════════════════════════════════════════════════════════════════════════════
// BIRD HAZARD
// ════════════════════════════════════════════════════════════════════════════
// Spawn a flock of silhouettes that orbit the runway centre while the zone is active.
function makeBirds() {
  const out = []
  for (let i = 0; i < BIRD_COUNT; i++) {
    out.push({
      orbit:      BIRD_ZONE.r * (0.18 + Math.random() * 0.42),  // kept inside the red disc
      angle:      Math.random() * Math.PI * 2,
      orbitSpeed: (0.4 + Math.random() * 0.7) * (Math.random() < 0.5 ? 1 : -1),
      bob:        Math.random() * Math.PI * 2,
      bobSpeed:   1.4 + Math.random() * 1.6,
      flap:       Math.random() * Math.PI * 2,
      flapSpeed:  9 + Math.random() * 6,
      scale:      0.75 + Math.random() * 0.7,
    })
  }
  return out
}

// State machine: idle → warn → danger → idle, fired every BIRD_PERIOD once unlocked.
function updateBirdHazard(gs, dt) {
  if (gs.score >= BIRD_SCORE_THRESHOLD) {
    gs.birdTimer += dt
    if (!gs.birdActive && gs.birdTimer >= BIRD_PERIOD) {
      gs.birdTimer   = 0
      gs.birdActive  = true
      gs.birdElapsed = 0
      gs.birdPhase   = 'warn'
      gs.birds       = makeBirds()
      try { playBirdAlert() } catch (_) {}
    }
  }

  if (gs.birdActive) {
    gs.birdElapsed += dt
    gs.birdPhase = gs.birdElapsed < BIRD_WARN_DUR ? 'warn' : 'danger'
    for (const b of gs.birds) {
      b.angle += b.orbitSpeed * dt
      b.bob   += b.bobSpeed * dt
      b.flap  += b.flapSpeed * dt
    }
    if (gs.birdElapsed >= BIRD_HAZARD_DUR) {
      gs.birdActive = false
      gs.birdPhase  = 'idle'
      gs.birds      = []
    }
  }
}

// A plane is bird-struck when it sits inside the zone during the DANGER window.
function birdStrike(gs, p) {
  return gs.birdPhase === 'danger' &&
    dist2(p.x, p.y, BIRD_ZONE.x, BIRD_ZONE.y) < BIRD_ZONE.r * BIRD_ZONE.r
}

// Lightweight two-tone klaxon via WebAudio (no asset needed, fully optional).
let _alertCtx = null
function playBirdAlert() {
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return
  _alertCtx = _alertCtx || new AC()
  const ac = _alertCtx
  if (ac.state === 'suspended') ac.resume().catch(() => {})
  const now = ac.currentTime
  for (let i = 0; i < 2; i++) {
    const o = ac.createOscillator(), g = ac.createGain()
    o.type = 'square'
    o.frequency.value = 860
    const t0 = now + i * 0.24
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(0.16, t0 + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2)
    o.connect(g); g.connect(ac.destination)
    o.start(t0); o.stop(t0 + 0.22)
  }
}

// Single seagull silhouette — two wing strokes whose tips flap with `flap`.
function drawBird(ctx, x, y, size, flap) {
  const tip = -size * (0.3 + 0.5 * (0.5 + 0.5 * Math.sin(flap)))  // tips rise/fall
  ctx.save()
  ctx.shadowColor = 'rgba(255,180,170,0.55)'
  ctx.shadowBlur  = 4
  ctx.strokeStyle = 'rgba(12,8,10,0.95)'
  ctx.lineWidth   = Math.max(1.3, size * 0.22)
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(x - size, y + tip)
  ctx.quadraticCurveTo(x - size * 0.45, y + tip * 0.05, x, y)
  ctx.quadraticCurveTo(x + size * 0.45, y + tip * 0.05, x + size, y + tip)
  ctx.stroke()
  ctx.restore()
}

// The whole hazard overlay: pulsing red disc, dashed rotating rings + flock.
function drawBirdHazard(ctx, gs) {
  if (!gs.birdActive) return
  const danger = gs.birdPhase === 'danger'
  const { x: cx, y: cy, r } = BIRD_ZONE
  const t = gs.elapsed
  const blink = 0.5 + 0.5 * Math.sin(t * (danger ? 9 : 4.5))

  ctx.save()

  // soft pulsing red disc — the birds' airspace
  const fillA = (danger ? 0.22 : 0.11) * (0.6 + 0.4 * blink)
  const g = ctx.createRadialGradient(cx, cy, r * 0.15, cx, cy, r)
  g.addColorStop(0,   `rgba(255,70,60,${fillA * 0.55})`)
  g.addColorStop(0.6, `rgba(220,30,30,${fillA})`)
  g.addColorStop(1,   'rgba(200,20,20,0)')
  ctx.fillStyle = g
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill()

  // dashed rotating perimeter — the alert ring
  ctx.shadowColor = 'rgba(255,40,40,0.9)'
  ctx.shadowBlur  = danger ? 14 : 7
  ctx.strokeStyle = `rgba(255,${danger ? 45 : 85},${danger ? 45 : 60},${0.5 + 0.5 * blink})`
  ctx.lineWidth   = danger ? 3 : 2.2
  ctx.setLineDash([11, 9])
  ctx.lineDashOffset = -t * (danger ? 46 : 22)
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke()

  // inner counter-rotating ring for depth
  ctx.shadowBlur  = 0
  ctx.strokeStyle = `rgba(255,90,80,${0.28 + 0.32 * blink})`
  ctx.lineWidth   = 1.2
  ctx.setLineDash([4, 9])
  ctx.lineDashOffset = t * 34
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.7, 0, Math.PI * 2); ctx.stroke()
  ctx.setLineDash([])

  // flock of silhouettes circling the runway
  for (const b of gs.birds) {
    const bx = cx + Math.cos(b.angle) * b.orbit
    const by = cy + Math.sin(b.angle) * b.orbit * 0.78 + Math.sin(b.bob) * 3.5
    drawBird(ctx, bx, by, 5.2 * b.scale, b.flap)
  }

  ctx.restore()
}

// ════════════════════════════════════════════════════════════════════════════
// RADAR
// ════════════════════════════════════════════════════════════════════════════
function _project(lon, lat) {
  return [
    RADAR_CX + (lon - LON_CTR) * MAP_SCALE,
    RADAR_CY - (lat - LAT_CTR) * MAP_SCALE,
  ]
}

// opaque=false → transparent HUD-only layer (grid/rings over the 3D terrain);
// geoJSON is only drawn in the 2D fallback (no WebGL terrain available)
function buildStaticLayer(geoJSON, opaque = true) {
  const off = document.createElement('canvas')
  off.width = CW; off.height = CH
  const ctx = off.getContext('2d')

  if (opaque) {
    ctx.fillStyle = 'rgb(3,13,26)'
    ctx.fillRect(0, 0, CW, CH)
  }

  ctx.strokeStyle = 'rgba(20,70,150,0.149)'
  ctx.lineWidth = 1
  for (let x = 0; x <= CW; x += GRID_STEP) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CH); ctx.stroke() }
  for (let y = 0; y <= CH; y += GRID_STEP) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CW, y); ctx.stroke() }

  ctx.strokeStyle = 'rgba(30,90,180,0.251)'
  const step = RADAR_R / N_RINGS
  for (let i = 1; i <= N_RINGS; i++) {
    ctx.beginPath(); ctx.arc(RADAR_CX, RADAR_CY, step * i, 0, Math.PI * 2); ctx.stroke()
  }

  ctx.strokeStyle = 'rgba(30,90,180,0.251)'
  ctx.beginPath(); ctx.moveTo(0, RADAR_CY); ctx.lineTo(CW, RADAR_CY); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(RADAR_CX, 0); ctx.lineTo(RADAR_CX, CH); ctx.stroke()

  if (geoJSON) {
    for (const feature of geoJSON.features || []) {
      const geom = feature.geometry
      let rings = []
      if (geom.type === 'Polygon')      rings = [geom.coordinates[0]]
      else if (geom.type === 'MultiPolygon') rings = geom.coordinates.map(p => p[0])
      for (const ring of rings) {
        if (ring.length < 3) continue
        ctx.beginPath()
        for (let i = 0; i < ring.length; i++) {
          const [x, y] = _project(ring[i][0], ring[i][1])
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        }
        ctx.closePath()
        ctx.fillStyle   = 'rgba(10,40,100,0.549)'
        ctx.fill()
        ctx.strokeStyle = 'rgba(60,160,255,0.702)'
        ctx.lineWidth = 1
        ctx.stroke()
      }
    }
  }

  return off
}

function drawSweep(ctx, angle) {
  const sweep = (SWEEP_DEG * Math.PI) / 180
  const steps = 30

  for (let i = 0; i < steps; i++) {
    const t1 = i / steps
    const a1 = angle - sweep * t1
    const a2 = angle - sweep * ((i + 1) / steps)
    const alpha = Math.max(0, Math.floor(55 * (1 - t1) ** 1.2)) / 255
    if (alpha <= 0) continue
    ctx.beginPath()
    ctx.moveTo(RADAR_CX, RADAR_CY)
    ctx.lineTo(RADAR_CX + RADAR_R * Math.cos(a1), RADAR_CY + RADAR_R * Math.sin(a1))
    ctx.lineTo(RADAR_CX + RADAR_R * Math.cos(a2), RADAR_CY + RADAR_R * Math.sin(a2))
    ctx.closePath()
    ctx.fillStyle = `rgba(0,180,255,${alpha})`
    ctx.fill()
  }

  const lx = RADAR_CX + RADAR_R * Math.cos(angle)
  const ly = RADAR_CY + RADAR_R * Math.sin(angle)
  ctx.beginPath(); ctx.moveTo(RADAR_CX, RADAR_CY); ctx.lineTo(lx, ly)
  ctx.strokeStyle = 'rgba(160,255,255,1)'; ctx.lineWidth = 2; ctx.stroke()

  for (const [gr, ga] of [[7, 28 / 255], [5, 55 / 255], [3, 115 / 255]]) {
    ctx.beginPath(); ctx.arc(lx, ly, gr, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(160,255,255,${ga})`; ctx.fill()
  }
  ctx.beginPath(); ctx.arc(lx, ly, 2, 0, Math.PI * 2)
  ctx.fillStyle = 'rgb(210,255,255)'; ctx.fill()
}

// ════════════════════════════════════════════════════════════════════════════
// DIJKSTRA GRID
// ════════════════════════════════════════════════════════════════════════════
// Node layout:
//   0-79  — 10×8 grid covering the canvas
//   80    — top approach funnel   (directly above runway, same X)
//   81    — bottom approach funnel (directly below runway, same X)
// After Dijkstra we manually append the actual runway entry point so the
// final segment is always a perfectly vertical drop/climb into the strip.
const DJK_COLS    = 10
const DJK_ROWS    = 8
const DJK_GRID_N  = DJK_COLS * DJK_ROWS  // 80
const DJK_TAPPR_I = DJK_GRID_N           // 80  ↑ above runway
const DJK_BAPPR_I = DJK_GRID_N + 1       // 81  ↓ below runway
const DJK_N       = DJK_GRID_N + 2       // 82

// Runway strip geometry — use right-side X (user-calibrated to match visual runway)
const _RCX           = LANDING_AREA.x + LANDING_AREA.w - 4    // ≈ 481 (near right edge)
const DJK_LAND_MID_Y = LANDING_AREA.y + LANDING_AREA.h / 2    // 256
// Actual runway entry points (appended after Dijkstra for the mandatory vertical segment)
const DJK_LAND_TOP = { x: _RCX, y: LANDING_AREA.y }           // (481, 204)
const DJK_LAND_BOT = { x: _RCX, y: LANDING_AREA.y + LANDING_AREA.h } // (481, 308)

// Grid-node positions only — funnel positions (80/81) are computed dynamically per plane
function djkXY(idx) {
  return {
    x: (idx % DJK_COLS + 0.5) * (CW / DJK_COLS),
    y: (Math.floor(idx / DJK_COLS) + 0.5) * (CH / DJK_ROWS),
  }
}

// Static adjacency — grid-to-grid only (funnel connections added dynamically per apprDist)
const DJK_ADJ = (() => {
  const adj = Array.from({ length: DJK_GRID_N }, () => [])
  for (let r = 0; r < DJK_ROWS; r++) {
    for (let c = 0; c < DJK_COLS; c++) {
      const i = r * DJK_COLS + c
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue
          const nr = r + dr, nc = c + dc
          if (nr < 0 || nr >= DJK_ROWS || nc < 0 || nc >= DJK_COLS) continue
          const j  = nr * DJK_COLS + nc
          const pi = djkXY(i), pj = djkXY(j)
          adj[i].push([j, Math.hypot(pj.x - pi.x, pj.y - pi.y)])
        }
      }
    }
  }
  return adj
})()

function runDijkstra(sx, sy, planes, excludeId, apprDist) {
  const nx = CW / DJK_COLS  // ~80
  // Funnel positions depend on plane maneuverability (apprDist = min vertical lead)
  const topAppr = { x: _RCX, y: LANDING_AREA.y - apprDist }
  const botAppr = { x: _RCX, y: LANDING_AREA.y + LANDING_AREA.h + apprDist }
  const apprXY  = (i) => i === DJK_TAPPR_I ? topAppr : botAppr

  const tgtI   = sy < DJK_LAND_MID_Y ? DJK_TAPPR_I : DJK_BAPPR_I
  const skipI  = tgtI === DJK_TAPPR_I ? DJK_BAPPR_I : DJK_TAPPR_I
  const entryPt = tgtI === DJK_TAPPR_I ? DJK_LAND_TOP : DJK_LAND_BOT

  let src = 0, minD = Infinity
  for (let i = 0; i < DJK_GRID_N; i++) {
    const p = djkXY(i), d = (p.x - sx) ** 2 + (p.y - sy) ** 2
    if (d < minD) { minD = d; src = i }
  }

  const dist = new Float32Array(DJK_N).fill(Infinity)
  const prev = new Int32Array(DJK_N).fill(-1)
  const vis  = new Uint8Array(DJK_N)
  dist[src]  = 0
  vis[skipI] = 1

  for (;;) {
    let u = -1
    for (let i = 0; i < DJK_N; i++) if (!vis[i] && (u < 0 || dist[i] < dist[u])) u = i
    if (u < 0 || dist[u] === Infinity || u === tgtI) break
    vis[u] = 1

    if (u < DJK_GRID_N) {
      // Grid → grid (static edges)
      for (const [v, w0] of DJK_ADJ[u]) {
        if (vis[v]) continue
        let pen = 0
        const vp = djkXY(v)
        for (const pl of planes) {
          if (pl.id === excludeId || pl.crashed) continue
          const dd = Math.hypot(pl.x - vp.x, pl.y - vp.y)
          if (dd < 90) pen += (90 - dd) * 2.2
        }
        const nd = dist[u] + w0 + pen
        if (nd < dist[v]) { dist[v] = nd; prev[v] = u }
      }
      // Grid → funnel (dynamic, radius = 2 cells)
      const uPt = djkXY(u)
      for (const apprI of [DJK_TAPPR_I, DJK_BAPPR_I]) {
        if (vis[apprI]) continue
        const ap = apprXY(apprI)
        const d  = Math.hypot(uPt.x - ap.x, uPt.y - ap.y)
        if (d < nx * 2) {
          const nd = dist[u] + d
          if (nd < dist[apprI]) { dist[apprI] = nd; prev[apprI] = u }
        }
      }
    } else {
      // Funnel → grid (dynamic)
      const ap = apprXY(u)
      for (let i = 0; i < DJK_GRID_N; i++) {
        if (vis[i]) continue
        const p = djkXY(i)
        const d = Math.hypot(p.x - ap.x, p.y - ap.y)
        if (d < nx * 2) {
          const nd = dist[u] + d
          if (nd < dist[i]) { dist[i] = nd; prev[i] = u }
        }
      }
    }
  }

  // Reconstruct path — use apprXY for funnel nodes, djkXY for grid nodes
  const pts = []
  let cur   = tgtI
  for (let g = 0; cur >= 0 && g < DJK_N; g++) {
    pts.unshift(cur >= DJK_GRID_N ? apprXY(cur) : djkXY(cur))
    if (cur === src) break
    cur = prev[cur]
  }
  pts.unshift({ x: sx, y: sy })
  pts.push(entryPt)
  return pts.length >= 2 ? pts : [{ x: sx, y: sy }, entryPt]
}

// Catmull-Rom spline rendered as cubic Bézier through Dijkstra waypoints
function drawCatmullPath(ctx, pts) {
  if (pts.length < 2) return
  ctx.beginPath()
  ctx.moveTo(pts[0].x, pts[0].y)
  if (pts.length === 2) { ctx.lineTo(pts[1].x, pts[1].y); return }
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y)
  }
}

// ════════════════════════════════════════════════════════════════════════════
// RANKING
// ════════════════════════════════════════════════════════════════════════════
const LS_KEY = 'atc_ranking_v1'

function loadRanking() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] }
}

function saveRanking(name, score, landed) {
  const now = new Date()
  const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
  const entries = [...loadRanking(), { name: name.trim() || 'Anônimo', score, landed, time }]
  entries.sort((a, b) => b.score - a.score)
  const top50 = entries.slice(0, 50)
  try { localStorage.setItem(LS_KEY, JSON.stringify(top50)) } catch {}
  return top50
}

// ════════════════════════════════════════════════════════════════════════════
// FRESH GAME STATE
// ════════════════════════════════════════════════════════════════════════════
function freshState(imgs) {
  return {
    airplanes:    [createPlane(imgs, 0)],
    pointTexts:   [],
    score:        0,
    landed:       0,
    elapsed:      0,
    nextSpawn:    spawnInterval(0),
    selectedId:   null,
    mouseDown:    false,
    mouseX:       0,
    mouseY:       0,
    justPressed:  false,
    sweepAngle:   0,
    snapshot:     null,
    flashTimer:   0,
    djkTimer:     0.25, // start at threshold so first run fires immediately
    djkDash:      0,
    // Bird hazard
    birdTimer:    0,
    birdActive:   false,
    birdPhase:    'idle',   // 'idle' | 'warn' | 'danger'
    birdElapsed:  0,
    birds:        [],
    gameOverReason: null,   // 'collision' | 'fuel' | 'bird'
  }
}

// ════════════════════════════════════════════════════════════════════════════
// ASSETS
// ════════════════════════════════════════════════════════════════════════════
const ASSET_SRCS = {
  menu:    '/atc-game/menu_v4.png',
  ranking: '/atc-game/ranking_v2.png',
  glow:    '/atc-game/glow.png',
  airport: '/atc-game/airport1.png',
  small:   '/atc-game/small.png',
  medium:  '/atc-game/medium.png',
  heavy:   '/atc-game/heavy.png',
}

function loadImages(onDone) {
  const result = {}
  let n = Object.keys(ASSET_SRCS).length
  for (const [k, src] of Object.entries(ASSET_SRCS)) {
    const img = new Image()
    const done = () => { result[k] = img.naturalWidth > 0 ? img : null; if (!--n) onDone(result) }
    img.onload = done; img.onerror = done; img.src = src
  }
}

// ════════════════════════════════════════════════════════════════════════════
// CANVAS HELPERS (ranking table)
// ════════════════════════════════════════════════════════════════════════════
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

function drawRankingTable(ctx, entries, scroll, curName, curScore) {
  const cr  = RANK_CARD
  const vis = Math.max(1, Math.floor((cr.h - RANK_PAD_V * 2 - 14 - 6) / RANK_ROW_H))
  const page = entries.slice(scroll, scroll + vis)
  const GOLD_C = 'rgb(246,197,111)'
  const BLUE_C = 'rgb(77,163,255)'
  const MUTED  = 'rgb(140,165,192)'
  const TEXT_C = 'rgb(244,247,255)'

  const cols = {
    rank: cr.x + RANK_PAD_H,
    name: cr.x + RANK_PAD_H + 28,
    pts:  cr.x + RANK_PAD_H + 143,
    land: cr.x + RANK_PAD_H + 213,
    date: cr.x + RANK_PAD_H + 273,
  }
  const hdrY = cr.y + RANK_PAD_V

  ctx.font = 'bold 10px Verdana,sans-serif'; ctx.fillStyle = MUTED; ctx.textAlign = 'left'
  for (const [cx, lbl] of [[cols.rank, '#'], [cols.name, 'JOGADOR'], [cols.pts, 'PTS'], [cols.land, 'POUSO'], [cols.date, 'HORA']])
    ctx.fillText(lbl, cx, hdrY + 10)

  ctx.strokeStyle = 'rgba(255,255,255,0.149)'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(cr.x + RANK_PAD_H, hdrY + 15); ctx.lineTo(cr.x + cr.w - RANK_PAD_H, hdrY + 15); ctx.stroke()

  if (!page.length) {
    ctx.font = '11px Verdana,sans-serif'; ctx.fillStyle = MUTED; ctx.textAlign = 'center'
    ctx.fillText('Nenhuma pontuação registrada ainda.', cr.x + cr.w / 2, cr.y + cr.h / 2 + 18)
    return
  }

  const row0 = hdrY + 22
  const MEDALS = ['rgb(246,197,111)', 'rgb(192,192,212)', 'rgb(205,127,50)']

  for (let i = 0; i < page.length; i++) {
    const gI = scroll + i
    const ry = row0 + i * RANK_ROW_H
    if (ry + RANK_ROW_H > cr.y + cr.h - RANK_PAD_V) break
    const entry = page[i]
    const isMe = entry.name === curName && entry.score === curScore

    if (isMe) {
      ctx.fillStyle = 'rgba(77,163,255,0.086)'
      ctx.strokeStyle = 'rgba(77,163,255,0.216)'
      ctx.lineWidth = 1; roundRect(ctx, cr.x + RANK_PAD_H, ry - 1, cr.w - RANK_PAD_H * 2, RANK_ROW_H - 4, 8)
      ctx.fill(); ctx.stroke()
    }

    if (gI < 3) {
      ctx.beginPath(); ctx.arc(cols.rank + 10, ry + 12, 10, 0, Math.PI * 2)
      ctx.fillStyle = MEDALS[gI]; ctx.fill()
      ctx.font = 'bold 10px Verdana,sans-serif'; ctx.fillStyle = 'rgb(8,18,35)'; ctx.textAlign = 'center'
      ctx.fillText(String(gI + 1), cols.rank + 10, ry + 16)
    } else {
      ctx.font = '11px Verdana,sans-serif'; ctx.fillStyle = MUTED; ctx.textAlign = 'left'
      ctx.fillText(String(gI + 1), cols.rank + 4, ry + 14)
    }

    ctx.font = 'bold 12px Verdana,sans-serif'; ctx.textAlign = 'left'
    ctx.fillStyle = isMe ? BLUE_C : TEXT_C
    ctx.fillText(entry.name.substring(0, 13), cols.name, ry + 14)
    ctx.fillStyle = GOLD_C; ctx.fillText(String(entry.score), cols.pts, ry + 14)
    ctx.font = '11px Verdana,sans-serif'; ctx.fillStyle = MUTED
    ctx.fillText(String(entry.landed ?? '-'), cols.land, ry + 15)
    ctx.fillText(entry.time || '', cols.date, ry + 15)
  }

  const maxS = Math.max(0, entries.length - vis)
  if (maxS > 0) {
    const sbX = cr.x + cr.w - 8, sbH = cr.h - RANK_PAD_V * 2
    const tH  = Math.max(18, sbH * vis / Math.max(entries.length, 1))
    const tY  = cr.y + RANK_PAD_V + (sbH - tH) * scroll / maxS
    ctx.fillStyle = 'rgba(255,255,255,0.055)'; ctx.fillRect(sbX, cr.y + RANK_PAD_V, 4, sbH)
    ctx.fillStyle = 'rgba(255,255,255,0.294)'; ctx.fillRect(sbX, tY, 4, tH)
  }
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════════════════════════════════════
export default function AirportGameEngine({ onBack, startDirect = false }) {
  const canvasRef      = useRef(null)
  const glCanvasRef    = useRef(null)
  const terrainCanvasRef = useRef(null)
  const planes3dRef    = useRef(null)
  const terrain3dRef   = useRef(null)
  const imgsRef        = useRef({})
  const staticRef      = useRef(null)
  const gsRef          = useRef(null)
  const phaseRef       = useRef('loading')
  const musicRef       = useRef(null)
  const rankingRef     = useRef([])
  const scrollRef      = useRef(0)
  const startDirectRef = useRef(startDirect)

  // 3D thumbnails for the sidebar (null until rendered → PNG fallback)
  const [thumbs, setThumbs] = useState(null)

  // HUD state — updated from game loop ~10fps
  const [hudState,    setHudState]    = useState({ score: 0, landed: 0, rankPos: 1, planes: { small: 0, medium: 0, heavy: 0 }, birdPhase: 'idle' })
  const [uiState,     setUiState]     = useState('none')
  const [finalScore,  setFinalScore]  = useState(0)
  const [finalLanded, setFinalLanded] = useState(0)
  const [finalReason, setFinalReason] = useState('collision')
  const [playerName,  setPlayerName]  = useState('')

  // ── Input ──────────────────────────────────────────────────────
  const handleDown = useCallback((cx, cy) => {
    const canvas = canvasRef.current; if (!canvas) return
    const pos   = toCanvas(canvas, cx, cy)
    const phase = phaseRef.current

    if (phase === 'menu') {
      if (pointInRect(BACK_BTN, pos.x, pos.y)) { onBack(); return }
      if (pointInRect(PLAY_BTN, pos.x, pos.y)) {
        gsRef.current = freshState(imgsRef.current)
        phaseRef.current = 'playing'
        try { musicRef.current?.play().catch(() => {}) } catch (_) {}
        return
      }
      if (pointInRect(RANK_BTN, pos.x, pos.y)) {
        rankingRef.current = loadRanking()
        scrollRef.current  = 0
        phaseRef.current   = 'ranking'
        return
      }
    }

    if (phase === 'ranking') {
      if (pointInRect(BACK_BTN, pos.x, pos.y)) { phaseRef.current = 'menu'; return }
    }

    if (phase === 'playing') {
      const gs = gsRef.current; if (!gs) return
      gs.mouseDown = true; gs.mouseX = pos.x; gs.mouseY = pos.y; gs.justPressed = true
    }
  }, [onBack])

  const handleMove = useCallback((cx, cy) => {
    if (phaseRef.current !== 'playing') return
    const canvas = canvasRef.current; if (!canvas) return
    const pos = toCanvas(canvas, cx, cy)
    const gs  = gsRef.current; if (!gs) return
    gs.mouseX = pos.x; gs.mouseY = pos.y
  }, [])

  const handleUp    = useCallback(() => { const gs = gsRef.current; if (gs) gs.mouseDown = false }, [])

  const handleWheel = useCallback((e) => {
    if (phaseRef.current !== 'ranking') return
    e.preventDefault()
    const vis  = Math.max(1, Math.floor((RANK_CARD.h - RANK_PAD_V * 2 - 14 - 6) / RANK_ROW_H))
    const maxS = Math.max(0, rankingRef.current.length - vis)
    scrollRef.current = Math.max(0, Math.min(scrollRef.current - Math.sign(e.deltaY), maxS))
  }, [])

  // ── Game-over handlers ─────────────────────────────────────────
  const handleSave = useCallback(() => {
    const name = playerName.trim() || 'Anônimo'
    saveRanking(name, finalScore, finalLanded)
    setUiState('none')
    onBack()
  }, [playerName, finalScore, finalLanded, onBack])

  const handleSkip = useCallback(() => {
    setUiState('none')
    onBack()
  }, [onBack])

  // ── Canvas loop ────────────────────────────────────────────────
  useEffect(() => {
    const canvas  = canvasRef.current
    const ctx     = canvas.getContext('2d')
    let animId
    let lastTime  = performance.now()
    let hudTick   = 0

    // 3D plane layer (transparent WebGL canvas over the radar) +
    // 3D terrain layer (relief map + airport, beneath the radar HUD)
    planes3dRef.current  = createPlanes3D(glCanvasRef.current, LANDING_AREA)
    terrain3dRef.current = createTerrain3D(terrainCanvasRef.current, LANDING_AREA)
    setThumbs(makeThumbnails())

    // Computes per-plane visual fx and pushes state to the 3D layer.
    // Returns false when WebGL is unavailable → caller draws 2D sprites.
    function pushTo3D(gs, dt, now) {
      const p3d = planes3dRef.current
      if (!p3d) return false
      for (const p of gs.airplanes) {
        const fuelFrac = Math.max(0, p.fuel / FUEL_MAX[p.type])
        const period  = BLINK_PERIOD_EMPTY + (BLINK_PERIOD_FULL - BLINK_PERIOD_EMPTY) * fuelFrac
        const blinkOn = p.blinkTimer < (period - BLINK_DARK_DUR)
        p.fx = {
          opacity:  p.crashed || blinkOn ? 1 : 0.15,
          critical: !p.crashed && blinkOn && fuelFrac < FUEL_CRITICAL,
          crashed:  p.crashed,
        }
      }
      p3d.sync(gs.airplanes, dt, now / 1000)
      return true
    }

    try { const m = new Audio('/atc-game/game.ogg'); m.loop = true; m.volume = 0.8; musicRef.current = m } catch (_) {}

    let imgsReady = false, geoReady = false
    function tryStart() {
      if (!imgsReady || !geoReady) return
      if (startDirectRef.current) {
        rankingRef.current = loadRanking()
        gsRef.current    = freshState(imgsRef.current)
        phaseRef.current = 'playing'
        try { musicRef.current?.play().catch(() => {}) } catch (_) {}
      } else {
        phaseRef.current = 'menu'
      }
    }

    loadImages(imgs => { imgsRef.current = imgs; imgsReady = true; tryStart() })
    fetch('/atc-game/brazil_states.json')
      .then(r => r.json())
      .then(geo => {
        const t3d = terrain3dRef.current
        if (t3d) {
          t3d.setGeo(geo, _project)                          // relief map on the 3D layer
          staticRef.current = buildStaticLayer(null, false)  // transparent HUD on top
        } else {
          staticRef.current = buildStaticLayer(geo, true)    // 2D fallback (flat map)
        }
        geoReady = true; tryStart()
      })
      .catch(() => {
        staticRef.current = buildStaticLayer(null, !terrain3dRef.current)
        geoReady = true; tryStart()
      })

    const loop = (now) => {
      const dt    = Math.min((now - lastTime) / 1000, MAX_DT)
      lastTime    = now
      const phase = phaseRef.current
      const imgs  = imgsRef.current

      // Loading screen
      if (phase === 'loading') {
        ctx.fillStyle = 'rgb(3,13,26)'; ctx.fillRect(0, 0, CW, CH)
        ctx.font = 'bold 18px Verdana,sans-serif'
        ctx.fillStyle = 'rgba(77,163,255,0.85)'; ctx.textAlign = 'center'
        ctx.fillText('CARREGANDO…', CW / 2, CH / 2)
        animId = requestAnimationFrame(loop); return
      }

      // Menu
      if (phase === 'menu') {
        planes3dRef.current?.clearFrame()
        ctx.fillStyle = 'rgb(3,13,26)'; ctx.fillRect(0, 0, CW, CH)
        if (imgs.menu) ctx.drawImage(imgs.menu, 0, 0, CW, CH)
        animId = requestAnimationFrame(loop); return
      }

      // Ranking canvas view
      if (phase === 'ranking') {
        planes3dRef.current?.clearFrame()
        ctx.fillStyle = 'rgb(3,13,26)'; ctx.fillRect(0, 0, CW, CH)
        if (imgs.ranking) ctx.drawImage(imgs.ranking, 0, 0, CW, CH)
        drawRankingTable(ctx, rankingRef.current, scrollRef.current, '', 0)
        animId = requestAnimationFrame(loop); return
      }

      const gs = gsRef.current
      if (!gs) { animId = requestAnimationFrame(loop); return }
      if (import.meta.env.DEV) { window.__ATC_GS = gs; window.__ATC_PHASE = phase } // debug/test hook (dev only)

      // ── Gameover flash ─────────────────────────────────────────
      if (phase === 'gameover_flash') {
        gs.flashTimer += dt
        if (gs.flashTimer >= GAMEOVER_FLASH) {
          // Advance phase FIRST so the block never runs again
          phaseRef.current = 'gameover_wait'
          setFinalScore(gs.score); setFinalLanded(gs.landed)
          setFinalReason(gs.gameOverReason || 'collision')
          setPlayerName(''); setUiState('gameover_input')
        }
        if (gs.snapshot) {
          ctx.putImageData(gs.snapshot, 0, 0)
          const a = Math.max(0, 120 * (1 - gs.flashTimer / GAMEOVER_FLASH)) / 255
          ctx.fillStyle = `rgba(180,30,30,${a})`; ctx.fillRect(0, 0, CW, CH)
        }
        pushTo3D(gs, 0, now) // keep crashed planes frozen on the 3D layer
        animId = requestAnimationFrame(loop); return
      }

      // ── Gameover wait (frozen frame while React overlay is shown) ──
      if (phase === 'gameover_wait') {
        if (gs.snapshot) ctx.putImageData(gs.snapshot, 0, 0)
        pushTo3D(gs, 0, now)
        animId = requestAnimationFrame(loop); return
      }

      // ── Playing ────────────────────────────────────────────────
      gs.elapsed += dt
      gs.sweepAngle = (gs.sweepAngle + SWEEP_SPEED * 60 * dt) % (Math.PI * 2)

      // ── Bird hazard (periodic no-fly zone over the runway) ────────
      updateBirdHazard(gs, dt)

      // ── Dijkstra path update ──────────────────────────────────────
      gs.djkDash  = (gs.djkDash - 55 * dt + 1000) % 100
      gs.djkTimer += dt
      if (gs.djkTimer >= 0.25) {
        gs.djkTimer = 0
        for (const p of gs.airplanes) {
          if (!p.crashed)
            p.dijkstraPath = runDijkstra(p.x, p.y, gs.airplanes, p.id, p.def.apprDist)
        }
      }

      if (gs.elapsed >= gs.nextSpawn && gs.airplanes.length < 30) {
        gs.airplanes.push(createPlane(imgs, gs.score))
        gs.nextSpawn = gs.elapsed + spawnInterval(gs.score)
        gs.djkTimer  = 0.25  // force immediate recompute for the new plane
      }

      gs.pointTexts = gs.pointTexts.filter(pt => {
        pt.y -= 40 * dt; pt.alpha -= (255 / 2.5) * dt; return pt.alpha > 0
      })

      if (gs.mouseDown && gs.selectedId !== null) {
        const sel = gs.airplanes.find(p => p.id === gs.selectedId)
        if (sel) {
          const { mouseX: mx, mouseY: my } = gs
          if (mx > ROAM.x && mx < ROAM.x + ROAM.w && my > ROAM.y && my < ROAM.y + ROAM.h) {
            const last = sel.path.at(-1)
            if (!last || dist2(last.x, last.y, mx, my) > PATH_GAP_SQ)
              sel.path.push({ x: mx, y: my })
          }
        }
      }

      const landed = new Set(); let collision = false, fuelDead = false, birdHit = false
      for (let i = 0; i < gs.airplanes.length && !collision && !fuelDead && !birdHit; i++) {
        const p = gs.airplanes[i]; if (p.crashed) continue
        // Bird strike — entering the lethal zone while birds are on the runway
        if (birdStrike(gs, p)) {
          p.crashed = true; p.path = []; birdHit = true; break
        }
        // Landing is disabled while the runway is closed for birds
        if (!gs.birdActive && checkLanding(p)) {
          landed.add(p.id); gs.score += p.def.score; gs.landed++
          gs.pointTexts.push({ x: p.x, y: p.y, text: '+' + p.def.score, alpha: 255 })
          try { new Audio('/atc-game/score.ogg').play().catch(() => {}) } catch (_) {}
          continue
        }
        const hbA = getHitbox(p)
        for (let j = i + 1; j < gs.airplanes.length; j++) {
          const q = gs.airplanes[j]; if (q.crashed) continue
          if (aabbCollide(hbA, getHitbox(q))) {
            p.crashed = q.crashed = true; p.path = q.path = []; collision = true; break
          }
        }
        if (collision) break
        if (gs.justPressed && gs.selectedId === null) {
          if (pointInRect(getHitbox(p), gs.mouseX, gs.mouseY)) { p.path = []; gs.selectedId = p.id }
        }
        updatePlane(p, dt)

        // Fuel drain & blink
        p.fuel -= dt
        if (p.fuel <= 0) { fuelDead = true; break }
        const fuelFrac = p.fuel / FUEL_MAX[p.type]
        const period = BLINK_PERIOD_EMPTY + (BLINK_PERIOD_FULL - BLINK_PERIOD_EMPTY) * fuelFrac
        p.blinkTimer += dt
        if (p.blinkTimer >= period) p.blinkTimer -= period
      }
      gs.justPressed = false

      if (collision || fuelDead || birdHit) {
        gs.gameOverReason = birdHit ? 'bird' : fuelDead ? 'fuel' : 'collision'
        try { musicRef.current?.pause() } catch (_) {}
        gs.snapshot = ctx.getImageData(0, 0, CW, CH)
        phaseRef.current = 'gameover_flash'
      }

      gs.airplanes = gs.airplanes.filter(p => !landed.has(p.id))
      if (gs.airplanes.length === 0) {
        gs.airplanes.push(createPlane(imgs, gs.score))
        gs.nextSpawn = gs.elapsed + spawnInterval(gs.score)
      }
      if (!gs.mouseDown) gs.selectedId = null

      // Throttled HUD update (~10fps)
      hudTick++
      if (hudTick % 6 === 0) {
        const rankPos = rankingRef.current.filter(e => e.score > gs.score).length + 1
        const planes = { small: 0, medium: 0, heavy: 0 }
        for (const p of gs.airplanes) planes[p.type] = (planes[p.type] || 0) + 1
        setHudState({ score: gs.score, landed: gs.landed, rankPos, planes, birdPhase: gs.birdPhase })
      }

      // ── Draw frame ─────────────────────────────────────────────
      // 3D terrain below is static (renders itself on geo load);
      // here we only repaint the transparent HUD layer above it
      ctx.clearRect(0, 0, CW, CH)
      if (staticRef.current) ctx.drawImage(staticRef.current, 0, 0)
      else if (!terrain3dRef.current) { ctx.fillStyle = 'rgb(3,13,26)'; ctx.fillRect(0, 0, CW, CH) }
      drawSweep(ctx, gs.sweepAngle)

      // Airport sprite — 2D fallback only (3D terrain has its own airport)
      if (!terrain3dRef.current && imgs.airport) {
        ctx.drawImage(imgs.airport,
          AIRPORT_POS.x, AIRPORT_POS.y,
          Math.round(imgs.airport.width * AIRPORT_SCALE),
          Math.round(imgs.airport.height * AIRPORT_SCALE))
      }

      // Glow on selected
      const sel = gs.airplanes.find(p => p.id === gs.selectedId)
      if (sel && imgs.glow) {
        ctx.drawImage(imgs.glow, sel.x - imgs.glow.width / 2, sel.y - imgs.glow.height / 2)
      }

      // ── Dijkstra routes (Catmull-Rom, dashed amber) ──────────────
      ctx.save()
      ctx.setLineDash([10, 7])
      ctx.lineWidth = 1.8
      for (const p of gs.airplanes) {
        if (p.crashed || !p.dijkstraPath || p.dijkstraPath.length < 2) continue
        // Snap start to plane nose every frame — no Dijkstra needed for this
        const ang     = Math.atan2(p.vy, p.vx)
        const noseDst = p.def.hitbox * 0.85
        p.dijkstraPath[0] = { x: p.x + Math.cos(ang) * noseDst, y: p.y + Math.sin(ang) * noseDst }
        const alpha = p.path.length > 0 ? 0.18 : 0.52
        const rgb = DJK_COLORS[p.type] || '255,185,60'
        ctx.strokeStyle  = `rgba(${rgb},${alpha})`
        ctx.lineDashOffset = -gs.djkDash
        drawCatmullPath(ctx, p.dijkstraPath)
        ctx.stroke()
      }
      ctx.setLineDash([])
      ctx.restore()

      // Paths (BLUE)
      for (const p of gs.airplanes) {
        if (p.path.length > 0) {
          ctx.beginPath(); ctx.moveTo(p.x, p.y)
          for (const wp of p.path) ctx.lineTo(wp.x, wp.y)
          ctx.strokeStyle = 'rgba(77,163,255,0.85)'; ctx.lineWidth = 2; ctx.stroke()
        }
      }

      // Bird hazard zone — drawn under the planes (they fly over the flock)
      drawBirdHazard(ctx, gs)

      // Airplanes — 3D models on the WebGL layer; 2D sprites as fallback
      if (!pushTo3D(gs, dt, now)) {
        for (const p of gs.airplanes) {
          if (p.img) {
            const fuelFrac = Math.max(0, p.fuel / FUEL_MAX[p.type])
            const period = BLINK_PERIOD_EMPTY + (BLINK_PERIOD_FULL - BLINK_PERIOD_EMPTY) * fuelFrac
            const blinkOn = p.blinkTimer < (period - BLINK_DARK_DUR)
            const angle = Math.atan2(p.vy, p.vx)
            if (!blinkOn) {
              ctx.save(); ctx.globalAlpha = 0.15
              drawRotated(ctx, p.img, p.x, p.y, angle, p.def.imgScale)
              ctx.restore()
            } else if (fuelFrac < FUEL_CRITICAL) {
              ctx.save()
              ctx.translate(p.x, p.y); ctx.rotate(angle)
              const w = p.img.width * p.def.imgScale, h = p.img.height * p.def.imgScale
              ctx.drawImage(p.img, -w / 2, -h / 2, w, h)
              ctx.globalCompositeOperation = 'source-atop'
              ctx.fillStyle = 'rgba(255,60,60,0.55)'
              ctx.fillRect(-w / 2, -h / 2, w, h)
              ctx.restore()
            } else {
              drawRotated(ctx, p.img, p.x, p.y, angle, p.def.imgScale)
            }
          } else {
            const colors = { small: '#4da3ff', medium: '#a78bfa', heavy: '#f6c56f' }
            ctx.fillStyle = p.crashed ? '#ff4444' : (colors[p.type] || '#fff')
            const s = p.def.hitbox / 2; ctx.fillRect(p.x - s, p.y - s, p.def.hitbox, p.def.hitbox)
          }
        }
      }

      // Gold floating score texts
      for (const pt of gs.pointTexts) {
        ctx.save(); ctx.globalAlpha = Math.max(0, pt.alpha / 255)
        ctx.font = 'bold 30px Arial,sans-serif'; ctx.textAlign = 'center'
        ctx.fillStyle = 'rgb(246,197,111)'; ctx.fillText(pt.text, pt.x, pt.y)
        ctx.restore()
      }

      animId = requestAnimationFrame(loop)
    }

    animId = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(animId)
      try { musicRef.current?.pause() } catch (_) {}
      planes3dRef.current?.dispose()
      planes3dRef.current = null
      terrain3dRef.current?.dispose()
      terrain3dRef.current = null
    }
  }, [])

  // ── Event wiring ───────────────────────────────────────────────
  const onMouseDown  = e => handleDown(e.clientX, e.clientY)
  const onMouseMove  = e => handleMove(e.clientX, e.clientY)
  const onMouseUp    = () => handleUp()
  const onTouchStart = e => { e.preventDefault(); const t = e.touches[0]; handleDown(t.clientX, t.clientY) }
  const onTouchMove  = e => { e.preventDefault(); const t = e.touches[0]; handleMove(t.clientX, t.clientY) }
  const onTouchEnd   = e => { e.preventDefault(); handleUp() }

  const isPlaying = uiState === 'none' &&
    (phaseRef.current === 'playing' || phaseRef.current === 'gameover_flash' || phaseRef.current === 'gameover_wait')

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="atc-outer">
      <button className="atc-back-btn" onClick={onBack} type="button" title="Sair">
        <span className="atc-back-icon">
          <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
            <path d="M15 6L9 12L15 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
        <span className="atc-back-text">Voltar</span>
      </button>

      <div className="atc-game-row">
        {/* Canvas — height-fills viewport, sidebar sits immediately to its right */}
        <div className="atc-canvas-wrap">
          {/* Bottom WebGL layer — 3D relief map + airport under the radar HUD */}
          <canvas ref={terrainCanvasRef} width={CW} height={CH}
            className="atc-canvas-terrain" aria-hidden="true" />

          <canvas ref={canvasRef} width={CW} height={CH} className="atc-canvas"
            onMouseDown={onMouseDown} onMouseMove={onMouseMove}
            onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
            onWheel={handleWheel} onTouchStart={onTouchStart}
            onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
          />

          {/* Transparent WebGL layer — 3D airplanes drawn over the radar */}
          <canvas ref={glCanvasRef} width={CW} height={CH}
            className="atc-canvas3d" aria-hidden="true" />

          {/* Bird-strike alert banner */}
          {uiState === 'none' && (hudState.birdPhase === 'warn' || hudState.birdPhase === 'danger') && (
            <div className={`atc-bird-alert atc-bird-alert--${hudState.birdPhase}`} role="alert">
              <span className="atc-bird-alert-icon">⚠</span>
              <span className="atc-bird-alert-text">ATENÇÃO! PÁSSAROS NA PISTA</span>
              <span className="atc-bird-alert-icon">⚠</span>
            </div>
          )}

          {/* Game-over name entry overlay */}
          {uiState === 'gameover_input' && (
            <div className="atc-overlay">
              <div className="atc-panel atc-go-panel">
                <h1 className="atc-go-title">FIM DE JOGO</h1>
                <div className="atc-go-divider" />
                <div className="atc-go-reason" style={{ '--reason-color': GAMEOVER_REASONS[finalReason].color }}>
                  <span className="atc-go-reason-icon">{GAMEOVER_REASONS[finalReason].icon}</span>
                  <span className="atc-go-reason-text">{GAMEOVER_REASONS[finalReason].label}</span>
                </div>
                <div className="atc-go-stats">
                  <span>Pontuação: <b>{finalScore}</b></span>
                  <span>Pousados: <b>{finalLanded}</b></span>
                </div>
                <p style={{ margin: '20px 0px 10px 0px' }} className="atc-go-prompt">Digite seu nome para o ranking:</p>
                <input
                  className="atc-go-input"
                  type="text" maxLength={20} placeholder="Seu nome"
                  value={playerName}
                  onChange={e => setPlayerName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                  autoFocus
                />
                <div className="atc-go-btns">
                  <button className="atc-btn atc-go-save" onClick={handleSave} type="button">
                    <span>SALVAR</span>
                  </button>
                  <button className="atc-btn atc-go-skip atc-btn-outline" onClick={handleSkip} type="button">
                    <span>PULAR</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar — full-height narrow card */}
        <div className={`atc-sidebar${isPlaying ? '' : ' atc-sidebar--hidden'}`}>
          <div className="atc-scard">
            <div className="atc-scard-header">
              <img src={logoETA} className="atc-scard-brand-logo" alt="ETA" />
            </div>
            <div className="atc-scard-divider" />
            <div className="atc-scard-stats">
              <div className="atc-scard-stat atc-scard-stat--blue">
                <span className="atc-scard-label">POUSADOS</span>
                <span className="atc-scard-value">{hudState.landed}</span>
              </div>
              <div className="atc-scard-stat atc-scard-stat--gold">
                <span className="atc-scard-label">PONTUAÇÃO</span>
                <span className="atc-scard-value">{hudState.score}</span>
              </div>
              <div className="atc-scard-stat atc-scard-stat--rank">
                <span className="atc-scard-label">RANKING</span>
                <span className="atc-scard-value">#{hudState.rankPos}</span>
              </div>
            </div>
            <div className="atc-scard-divider" />

            {/* Espaço Aéreo — planes currently in the game */}
            <div className="atc-scard-airspace">
              <span className="atc-scard-label">ESPAÇO AÉREO</span>
              <div className="atc-scard-planes-row">
                {[
                  { type: 'small',  src: '/atc-game/small.png',  label: 'Pequeno' },
                  { type: 'medium', src: '/atc-game/medium.png', label: 'Médio' },
                  { type: 'heavy',  src: '/atc-game/heavy.png',  label: 'Pesado' },
                ].map(({ type, src, label }) => (
                  <div className="atc-scard-plane-slot" key={type}>
                    <img src={thumbs?.[type] ?? src}
                      className={`atc-scard-plane-img${thumbs?.[type] ? ' atc-scard-plane-img--3d' : ''}`}
                      alt={label} />
                    <span className="atc-scard-plane-count">{hudState.planes[type]}</span>
                    <span className="atc-scard-plane-label">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="atc-scard-divider" />
            <div className="atc-scard-footer">
              <span className="atc-scard-ping" />
              <span className="atc-scard-status">EM SERVIÇO</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

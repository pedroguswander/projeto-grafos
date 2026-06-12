// ════════════════════════════════════════════════════════════════════════════
// planes3d.js — 3D layer for the ATC minigame
//
// Two transparent WebGL canvases sandwich the 2D radar HUD:
//   bottom — terrain: extruded Brazil states (relief) + 3D airport/runway
//   middle — the existing 2D canvas (grid, sweep, routes, texts), transparent
//   top    — the three plane types as procedural low-poly 3D models
// Both cameras are positioned so the z=0 plane maps 1:1 onto the 800×600
// game coordinate space — model (x, -y, 0) lands exactly on game pixel
// (x, y), so hitboxes, landing checks and click targets stay untouched.
// ════════════════════════════════════════════════════════════════════════════
import * as THREE from 'three'

const CW = 800, CH = 600
const FOV = 26 // narrow FOV ≈ near-orthographic, with just enough perspective for depth

// Max bank (roll) per type, radians — agile planes bank steeper
const MAX_BANK   = { small: 0.85, medium: 0.62, heavy: 0.42 }
const BANK_SMOOTH = 6 // 1/s exponential smoothing toward target bank

const COLORS = {
  fuselage:  0xe9eef8,
  glass:     0x16243c,
  engine:    0x9aa7bd,
  engineCap: 0x2c3648,
  prop:      0x2a2f3a,
  accent:    { small: 0xf6b928, medium: 0x4da3ff, heavy: 0xff4646 }, // matches DJK_COLORS
}

// ── Material / geometry helpers ─────────────────────────────────
function mat(color, { metalness = 0.15, roughness = 0.6, side = THREE.FrontSide } = {}) {
  return new THREE.MeshStandardMaterial({
    color, flatShading: true, metalness, roughness, transparent: true, side,
  })
}

// Capsule along +X (nose at +X, tail at -X)
function fuselageGeo(radius, length) {
  return new THREE.CapsuleGeometry(radius, length, 3, 10).rotateZ(-Math.PI / 2)
}

// Both wings as a single symmetric planform (hexagon) extruded in z.
// Local axes: +X nose direction (chord), ±Y span, +Z up.
function wingsGeo(span, rootChord, tipChord, sweep, thickness) {
  const le = rootChord / 2
  const s = new THREE.Shape()
  s.moveTo(le, 0)
  s.lineTo(le - sweep, span)
  s.lineTo(le - sweep - tipChord, span)
  s.lineTo(le - rootChord, 0)
  s.lineTo(le - sweep - tipChord, -span)
  s.lineTo(le - sweep, -span)
  s.closePath()
  const g = new THREE.ExtrudeGeometry(s, { depth: thickness, bevelEnabled: false })
  g.translate(0, 0, -thickness / 2)
  return g
}

// Vertical tail fin standing up in the X-Z plane
function finGeo(rootChord, tipChord, height, sweep, thickness = 0.6) {
  const s = new THREE.Shape()
  s.moveTo(rootChord / 2, 0)
  s.lineTo(rootChord / 2 - sweep, height)
  s.lineTo(rootChord / 2 - sweep - tipChord, height)
  s.lineTo(-rootChord / 2, 0)
  s.closePath()
  const g = new THREE.ExtrudeGeometry(s, { depth: thickness, bevelEnabled: false })
  g.translate(0, 0, -thickness / 2)
  g.rotateX(Math.PI / 2)
  return g
}

function engineGroup(r, len) {
  const grp = new THREE.Group()
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r * 0.88, len, 10).rotateZ(-Math.PI / 2),
    mat(COLORS.engine, { metalness: 0.45, roughness: 0.4 }),
  )
  const intake = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.72, r * 0.72, 0.5, 10).rotateZ(-Math.PI / 2),
    mat(COLORS.engineCap, { metalness: 0.3, roughness: 0.5 }),
  )
  intake.position.x = len / 2
  grp.add(body, intake)
  return grp
}

function cockpitGlass(sx, sy, sz, x, z) {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(1.6, 10, 8),
    mat(COLORS.glass, { metalness: 0.6, roughness: 0.25 }),
  )
  m.scale.set(sx, sy, sz)
  m.position.set(x, 0, z)
  return m
}

// ── The three plane models ──────────────────────────────────────
// Pequeno — high-wing single prop (Cessna style), amber accents
function buildSmall() {
  const g = new THREE.Group()
  const accent = () => mat(COLORS.accent.small, { side: THREE.DoubleSide })
  const white  = mat(COLORS.fuselage)

  g.add(new THREE.Mesh(fuselageGeo(2.1, 12), white))
  g.add(cockpitGlass(1.4, 0.9, 0.8, 3.4, 1.5))

  const wing = new THREE.Mesh(wingsGeo(8.8, 4.4, 3.2, 0.8, 0.7), accent())
  wing.position.set(1.6, 0, 2.3)
  const stab = new THREE.Mesh(wingsGeo(3.4, 2.3, 1.6, 0.7, 0.5), accent())
  stab.position.set(-6.9, 0, 0.7)
  const fin = new THREE.Mesh(finGeo(3.0, 1.6, 3.2, 1.5), accent())
  fin.position.set(-6.9, 0, 0.4)
  g.add(wing, stab, fin)

  // Spinning propeller (animated via userData lookup by name)
  const prop = new THREE.Group()
  prop.name = 'prop'
  const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.8, 8).rotateZ(-Math.PI / 2), white.clone())
  spinner.position.x = 0.7
  const bladeGeo = new THREE.BoxGeometry(0.25, 8.4, 0.9)
  const bladeMat = mat(COLORS.prop, { roughness: 0.5 })
  const b1 = new THREE.Mesh(bladeGeo, bladeMat)
  const b2 = new THREE.Mesh(bladeGeo, bladeMat)
  b2.rotation.x = Math.PI / 2
  prop.add(spinner, b1, b2)
  prop.position.set(8.6, 0, 0)
  g.add(prop)
  return g
}

// Médio — narrow-body twin jet, blue accents
function buildMedium() {
  const g = new THREE.Group()
  const accent = () => mat(COLORS.accent.medium, { side: THREE.DoubleSide })

  g.add(new THREE.Mesh(fuselageGeo(2.6, 19), mat(COLORS.fuselage)))
  g.add(cockpitGlass(1.6, 1.0, 0.8, 9.4, 1.1))

  const wing = new THREE.Mesh(wingsGeo(11.5, 5.6, 2.3, 4.6, 0.8), accent())
  wing.position.set(0.8, 0, -0.7)
  const stab = new THREE.Mesh(wingsGeo(4.6, 2.9, 1.4, 2.0, 0.55), accent())
  stab.position.set(-10.2, 0, 0.6)
  const fin = new THREE.Mesh(finGeo(4.4, 1.9, 5.0, 3.0), accent())
  fin.position.set(-10.4, 0, 0.8)
  g.add(wing, stab, fin)

  for (const sy of [-1, 1]) {
    const eng = engineGroup(1.25, 4.4)
    eng.position.set(2.8, 4.6 * sy, -2.3)
    g.add(eng)
  }
  return g
}

// Pesado — wide-body four-engine (747 style hump), red accents
function buildHeavy() {
  const g = new THREE.Group()
  const accent = () => mat(COLORS.accent.heavy, { side: THREE.DoubleSide })
  const white  = mat(COLORS.fuselage)

  g.add(new THREE.Mesh(fuselageGeo(3.3, 26), white))

  const hump = new THREE.Mesh(new THREE.SphereGeometry(2.6, 10, 8), white.clone())
  hump.scale.set(2.8, 1.05, 0.85)
  hump.position.set(6.5, 0, 2.4)
  g.add(hump)
  g.add(cockpitGlass(1.7, 1.1, 0.85, 12.6, 1.6))

  const wing = new THREE.Mesh(wingsGeo(15, 7.4, 2.6, 6.8, 1.0), accent())
  wing.position.set(0.5, 0, -0.9)
  const stab = new THREE.Mesh(wingsGeo(5.6, 3.4, 1.5, 2.6, 0.7), accent())
  stab.position.set(-13.2, 0, 0.7)
  const fin = new THREE.Mesh(finGeo(5.4, 2.2, 6.4, 3.8), accent())
  fin.position.set(-13.4, 0, 1.0)
  g.add(wing, stab, fin)

  for (const sy of [-1, 1]) {
    const inner = engineGroup(1.35, 4.8)
    inner.position.set(4.2, 5.6 * sy, -2.7)
    const outer = engineGroup(1.35, 4.8)
    outer.position.set(1.2, 10.2 * sy, -2.7)
    g.add(inner, outer)
  }
  return g
}

const BUILDERS = { small: buildSmall, medium: buildMedium, heavy: buildHeavy }
function buildPlane(type) { return (BUILDERS[type] || buildSmall)() }

function addLights(scene, sunPos, target) {
  scene.add(new THREE.HemisphereLight(0xcfe4ff, 0x16263d, 1.0))
  const sun = new THREE.DirectionalLight(0xffffff, 1.9)
  sun.position.copy(sunPos)
  if (target) { sun.target.position.copy(target); scene.add(sun.target) }
  scene.add(sun)
}

// Camera whose frustum at z=0 is exactly the CW×CH game space
function makeGameCamera() {
  const camera = new THREE.PerspectiveCamera(FOV, CW / CH, 10, 4000)
  const camH = (CH / 2) / Math.tan(THREE.MathUtils.degToRad(FOV / 2))
  camera.position.set(CW / 2, -CH / 2, camH)
  camera.lookAt(CW / 2, -CH / 2, 0)
  return camera
}

function makeGameRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
  renderer.setClearColor(0x000000, 0)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.setSize(CW, CH, false)
  return renderer
}

function disposeModel(model) {
  model.traverse(o => {
    if (o.geometry) o.geometry.dispose()
    const m = o.material
    if (Array.isArray(m)) m.forEach(x => x.dispose())
    else if (m) m.dispose()
  })
}

// ── Overlay renderer (top layer — airplanes) ────────────────────
// landingRect (optional): game-space LANDING_AREA — adds the pulsing
// control-tower beacon to this scene, since the terrain layer is static.
export function createPlanes3D(canvas, landingRect) {
  let renderer
  try {
    renderer = makeGameRenderer(canvas)
  } catch (_) {
    return null // no WebGL → caller falls back to 2D sprites
  }

  const scene = new THREE.Scene()
  const camera = makeGameCamera()

  addLights(scene,
    new THREE.Vector3(CW / 2 - 300, -CH / 2 + 260, 520),
    new THREE.Vector3(CW / 2, -CH / 2, 0))

  const airportLights = landingRect ? addAirportLights(scene, landingRect) : null

  // plane id → { outer (pos+heading), inner (bank), mats, prop, bank, phase }
  const live = new Map()

  function acquire(p) {
    let rec = live.get(p.id)
    if (rec) return rec
    const inner = buildPlane(p.type)
    const outer = new THREE.Group()
    outer.add(inner)
    const mats = new Set()
    inner.traverse(o => { if (o.isMesh) mats.add(o.material) })
    rec = {
      outer, inner,
      mats: [...mats],
      prop: inner.getObjectByName('prop'),
      bank: 0,
      phase: Math.random() * Math.PI * 2,
    }
    scene.add(outer)
    live.set(p.id, rec)
    return rec
  }

  function release(id) {
    const rec = live.get(id)
    if (!rec) return
    scene.remove(rec.outer)
    disposeModel(rec.outer)
    live.delete(id)
  }

  // planes: game plane objects (x, y, vx, vy, type, turnSign, fx)
  // t: time in seconds (for idle wobble / prop spin)
  function sync(planes, dt, t) {
    if (airportLights) airportLights(t)
    const seen = new Set()
    for (const p of planes) {
      seen.add(p.id)
      const rec = acquire(p)

      // Game coords are y-down; world is y-up → mirror y, negate heading
      rec.outer.position.set(p.x, -p.y, 0)
      rec.outer.rotation.z = Math.atan2(-p.vy, p.vx)

      // Bank into turns: roll around the fuselage axis, smoothed
      const target = (p.crashed ? 0 : (p.turnSign || 0)) * (MAX_BANK[p.type] ?? 0.6)
      if (dt > 0) rec.bank += (target - rec.bank) * (1 - Math.exp(-BANK_SMOOTH * dt))
      const idleRoll = Math.sin(t * 1.7 + rec.phase) * 0.04
      rec.inner.rotation.x = rec.bank + idleRoll
      rec.inner.position.z = Math.sin(t * 1.1 + rec.phase) * 1.2

      if (rec.prop && dt > 0) rec.prop.rotation.x += dt * 40

      // Fuel blink / critical / crashed effects (computed by the engine)
      const fx = p.fx
      if (fx) {
        const red = fx.crashed || fx.critical
        for (const m of rec.mats) {
          m.opacity = fx.opacity
          if (red) {
            m.emissive.setHex(0xff2222)
            m.emissiveIntensity = fx.crashed ? 0.9 : 0.55
          } else if (m.emissiveIntensity !== 0) {
            m.emissiveIntensity = 0
            m.emissive.setHex(0x000000)
          }
        }
      }
    }
    for (const id of [...live.keys()]) if (!seen.has(id)) release(id)
    renderer.render(scene, camera)
  }

  // Empty transparent frame (menu / ranking screens)
  function clearFrame() {
    for (const id of [...live.keys()]) release(id)
    renderer.clear()
  }

  function dispose() {
    clearFrame()
    renderer.dispose()
  }

  return { sync, clearFrame, dispose }
}

// ════════════════════════════════════════════════════════════════
// TERRAIN LAYER — extruded Brazil relief map + 3D airport/runway
// ════════════════════════════════════════════════════════════════
const TERRAIN = {
  ocean:     0x041124,
  stateTop:  0x0d2f66,
  stateSide: 0x071c40,
  border:    0x4db5ff,
  hMin: 4.5, hMax: 8,       // extrusion height range per state
}

// Deterministic per-state height → subtle topographic variation
function stateHeight(i) {
  const r = ((i + 1) * 2654435761 >>> 0) % 1000 / 1000
  return TERRAIN.hMin + r * (TERRAIN.hMax - TERRAIN.hMin)
}

const AIRPORT_TOP = 9 // platform top — just above the tallest state extrusion
// Runway centerline offset from the LANDING_AREA center: the Dijkstra
// approach funnels aim at the right side of the strip (game x ≈ 481), so
// the visual centerline sits there and suggested routes land dead-center.
const RWY_OFF_X = 14
const RWY_W     = 30
const TOWER_OFF = { x: -38, y: -34 } // local offset of the control tower

// Tower-beacon position in world coords (the pulsing light lives in the
// planes scene, which re-renders every frame — the terrain stays static)
function beaconWorldPos(rect) {
  return new THREE.Vector3(
    rect.x + rect.w / 2 + TOWER_OFF.x,
    -(rect.y + rect.h / 2) + TOWER_OFF.y,
    AIRPORT_TOP + 18.6,
  )
}

// Small emissive sphere — airfield light
function fieldLight(color, r, intensity) {
  const m = mat(color, { roughness: 0.4 })
  m.emissive.setHex(color)
  m.emissiveIntensity = intensity
  return new THREE.Mesh(new THREE.SphereGeometry(r, 6, 4), m)
}

// 3D airport: apron platform + runway with markings and lights + taxiway +
// terminal + tower + hangars + a parked plane. rect is the game-space
// LANDING_AREA {x, y, w, h}; visuals only — landing/collision logic still
// lives entirely in the 2D game space.
function buildAirport(rect) {
  const g = new THREE.Group()
  const TOP    = AIRPORT_TOP
  const rwyLen = rect.h + 16 // thresholds overhang the landing strip a bit

  const asphalt = mat(0x0e1a2e, { roughness: 0.92 })
  const taxiMat = mat(0x1c3a63, { roughness: 0.9 })
  const paint   = mat(0xeaf2ff, { roughness: 0.55 })
  paint.emissive.setHex(0xbcd8ff)
  paint.emissiveIntensity = 0.35 // markings glow faintly — night-ops look

  // ── Apron platform — same family as the map states, glowing edges ──
  const platGeo = new THREE.BoxGeometry(86, 136, TOP)
  const platTop  = mat(0x12305e, { roughness: 0.85, metalness: 0.05 })
  const platSide = mat(0x0a1f44, { roughness: 0.9 })
  const platform = new THREE.Mesh(platGeo, [platSide, platSide, platSide, platSide, platTop, platSide])
  platform.position.set(-7, 0, TOP / 2)
  g.add(platform)
  const platEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(platGeo),
    new THREE.LineBasicMaterial({ color: 0x4db5ff, transparent: true, opacity: 0.45 }),
  )
  platEdges.position.copy(platform.position)
  g.add(platEdges)

  // ── Runway (along Y — vertical approach, like the game) ───────────
  const runway = new THREE.Mesh(new THREE.BoxGeometry(RWY_W, rwyLen, 1.4), asphalt)
  runway.position.set(RWY_OFF_X, 0, TOP + 0.7)
  g.add(runway)

  const ZMARK = TOP + 1.5
  // Centerline dashes
  for (let i = 0; i < 8; i++) {
    const dash = new THREE.Mesh(new THREE.BoxGeometry(1.4, 6, 0.25), paint)
    dash.position.set(RWY_OFF_X, -49 + i * 14, ZMARK)
    g.add(dash)
  }
  // Piano-key threshold stripes on both ends
  for (const sy of [-1, 1]) {
    for (const dx of [-10, -6, -2, 2, 6, 10]) {
      const key = new THREE.Mesh(new THREE.BoxGeometry(2, 9, 0.25), paint)
      key.position.set(RWY_OFF_X + dx, (rwyLen / 2 - 7) * sy, ZMARK)
      g.add(key)
    }
    // Touchdown-zone marker pairs
    for (const ty of [22, 36]) {
      for (const dx of [-8, 8]) {
        const tz = new THREE.Mesh(new THREE.BoxGeometry(2.6, 5, 0.25), paint)
        tz.position.set(RWY_OFF_X + dx, ty * sy, ZMARK)
        g.add(tz)
      }
    }
  }
  // Runway edge lights (white-cyan) along both sides
  for (const sx of [-1, 1]) {
    for (let y = -52; y <= 52; y += 13) {
      const l = fieldLight(0xd9f6ff, 0.75, 1.6)
      l.position.set(RWY_OFF_X + (RWY_W / 2 + 1.4) * sx, y, TOP + 2)
      g.add(l)
    }
  }
  // Green threshold light bars at both ends
  for (const sy of [-1, 1]) {
    for (const dx of [-10, -5, 0, 5, 10]) {
      const l = fieldLight(0x47f2a8, 0.7, 1.8)
      l.position.set(RWY_OFF_X + dx, (rwyLen / 2 + 3) * sy, TOP + 2)
      g.add(l)
    }
  }

  // ── Parallel taxiway + connectors, blue edge lights ────────────────
  const taxi = new THREE.Mesh(new THREE.BoxGeometry(7, rect.h, 1.2), taxiMat)
  taxi.position.set(-10, 0, TOP + 0.6)
  g.add(taxi)
  for (const cy of [-45, 0, 45]) {
    const stub = new THREE.Mesh(new THREE.BoxGeometry(12, 6, 1.2), taxiMat)
    stub.position.set(1, cy, TOP + 0.6)
    g.add(stub)
  }
  for (let y = -48; y <= 48; y += 16) {
    const l = fieldLight(0x58b0ff, 0.55, 1.4)
    l.position.set(-15.5, y, TOP + 1.8)
    g.add(l)
  }

  // ── Terminal with glass front, facing the taxiway ─────────────────
  const terminal = new THREE.Mesh(new THREE.BoxGeometry(10, 30, 5), mat(0x466688, { roughness: 0.7 }))
  terminal.position.set(-34, -2, TOP + 2.5)
  const glassBand = new THREE.Mesh(new THREE.BoxGeometry(10.5, 26, 1.8), mat(COLORS.glass, { metalness: 0.6, roughness: 0.25 }))
  glassBand.position.set(-34, -2, TOP + 3.4)
  const termRoof = new THREE.Mesh(new THREE.BoxGeometry(11, 31, 0.6), mat(0x6f8cab, { roughness: 0.6 }))
  termRoof.position.set(-34, -2, TOP + 5.3)
  g.add(terminal, glassBand, termRoof)

  // ── Control tower (south-west corner) ──────────────────────────────
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.8, 13, 8).rotateX(Math.PI / 2), mat(0x8fa3bd, { roughness: 0.5 }))
  shaft.position.set(TOWER_OFF.x, TOWER_OFF.y, TOP + 6.5)
  const cab = new THREE.Mesh(new THREE.CylinderGeometry(4, 3.2, 3.4, 8).rotateX(Math.PI / 2), mat(COLORS.glass, { metalness: 0.6, roughness: 0.25 }))
  cab.position.set(TOWER_OFF.x, TOWER_OFF.y, TOP + 14.5)
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 0.8, 8).rotateX(Math.PI / 2), mat(0xb9c6d8, { roughness: 0.5 }))
  roof.position.set(TOWER_OFF.x, TOWER_OFF.y, TOP + 16.4)
  g.add(shaft, cab, roof)

  // ── Two barrel-roof hangars (north of the terminal) ───────────────
  for (const hy of [22, 36]) {
    const hangar = new THREE.Mesh(new THREE.BoxGeometry(11, 10, 4.5), mat(0x5d7a9c, { roughness: 0.7 }))
    hangar.position.set(-36, hy, TOP + 2.25)
    const hroof = new THREE.Mesh(
      new THREE.CylinderGeometry(5.5, 5.5, 10, 10, 1, false, -Math.PI / 2, Math.PI),
      mat(0x7e99b8, { roughness: 0.6 }),
    )
    hroof.scale.set(1, 1, 0.5)
    hroof.position.set(-36, hy, TOP + 4.5)
    g.add(hangar, hroof)
  }

  // ── A small plane parked on the apron ──────────────────────────────
  const parked = buildSmall()
  parked.scale.setScalar(0.85)
  parked.rotation.z = 2.2
  parked.position.set(-24, -22, TOP + 1.8)
  g.add(parked)

  g.position.set(rect.x + rect.w / 2, -(rect.y + rect.h / 2), 0)
  return g
}

// Animated airfield lights for the planes scene (it renders every frame):
// pulsing tower beacon + sequenced approach strobes ("rabbit") that run
// toward each runway threshold, tracing the vertical approach path.
function addAirportLights(scene, rect) {
  const updaters = []

  const beacon = fieldLight(0xff4646, 1.2, 1)
  beacon.material.emissive.setHex(0xff2222)
  beacon.position.copy(beaconWorldPos(rect))
  scene.add(beacon)
  updaters.push(t => {
    beacon.material.emissiveIntensity = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * 5))
  })

  const cx = rect.x + rect.w / 2 + RWY_OFF_X
  const cyW = -(rect.y + rect.h / 2)
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) { // i=0 nearest the threshold
      const s = fieldLight(0x9fdcff, 0.9, 0.1)
      s.position.set(cx, cyW + side * (70 + i * 10), AIRPORT_TOP + 1.5)
      scene.add(s)
      const phase = (3 - i) * 0.15 // farthest flashes first → runs inward
      updaters.push(t => {
        s.material.emissiveIntensity = ((t * 1.4 + phase) % 1) < 0.1 ? 3 : 0.1
      })
    }
  }

  return t => { for (const u of updaters) u(t) }
}

// Bottom WebGL layer: relief map + airport. The scene is static, so it is
// rendered only when content changes (creation + setGeo) — the canvas keeps
// showing the last presented frame at zero per-frame cost.
export function createTerrain3D(canvas, landingRect) {
  let renderer
  try {
    renderer = makeGameRenderer(canvas)
  } catch (_) {
    return null // no WebGL → caller keeps the flat 2D map + sprite airport
  }

  const scene = new THREE.Scene()
  const camera = makeGameCamera()
  addLights(scene,
    new THREE.Vector3(CW / 2 - 300, -CH / 2 + 260, 520),
    new THREE.Vector3(CW / 2, -CH / 2, 0))

  // Ocean / background floor
  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(CW * 1.4, CH * 1.4),
    mat(TERRAIN.ocean, { roughness: 1, metalness: 0 }),
  )
  ocean.position.set(CW / 2, -CH / 2, -1)
  scene.add(ocean)

  let mapGroup = null
  const airport = buildAirport(landingRect)
  scene.add(airport)

  // geoJSON: states FeatureCollection; project: (lon, lat) → [x, y] game px
  function setGeo(geoJSON, project) {
    if (mapGroup) { scene.remove(mapGroup); disposeModel(mapGroup) }
    mapGroup = new THREE.Group()
    const sideMat = mat(TERRAIN.stateSide, { roughness: 0.9 })
    const lineMat = new THREE.LineBasicMaterial({ color: TERRAIN.border, transparent: true, opacity: 0.7 })

    const features = geoJSON?.features || []
    for (let i = 0; i < features.length; i++) {
      const geom = features[i].geometry
      let rings = []
      if (geom.type === 'Polygon')           rings = [geom.coordinates[0]]
      else if (geom.type === 'MultiPolygon') rings = geom.coordinates.map(p => p[0])

      const h = stateHeight(i)
      for (const ring of rings) {
        if (ring.length < 3) continue
        const shape = new THREE.Shape()
        for (let k = 0; k < ring.length; k++) {
          const [x, y] = project(ring[k][0], ring[k][1])
          k === 0 ? shape.moveTo(x, -y) : shape.lineTo(x, -y)
        }
        const geo = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false })
        const topMat = mat(TERRAIN.stateTop, { roughness: 0.85, metalness: 0.05 })
        mapGroup.add(new THREE.Mesh(geo, [topMat, sideMat]))
        mapGroup.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), lineMat))
      }
    }
    scene.add(mapGroup)
    renderer.render(scene, camera)
  }

  function dispose() {
    if (mapGroup) { scene.remove(mapGroup); disposeModel(mapGroup) }
    mapGroup = null
    disposeModel(airport)
    ocean.geometry.dispose(); ocean.material.dispose()
    renderer.dispose()
  }

  renderer.render(scene, camera) // ocean + airport while the GeoJSON loads
  return { setGeo, dispose }
}

// ── Sidebar thumbnails — one static 3/4 render per type ────────
export function makeThumbnails(size = 132) {
  let renderer
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
  } catch (_) {
    return null
  }
  renderer.setClearColor(0x000000, 0)
  renderer.setPixelRatio(1)
  renderer.setSize(size, size)

  const scene = new THREE.Scene()
  addLights(scene, new THREE.Vector3(-60, 40, 110))
  const camera = new THREE.PerspectiveCamera(30, 1, 1, 1000)
  camera.up.set(0, 0, 1)

  const out = {}
  for (const type of ['small', 'medium', 'heavy']) {
    const model = buildPlane(type)
    model.rotation.set(0.32, 0, 0.55) // slight bank + nose angled toward viewer
    scene.add(model)
    model.updateMatrixWorld(true)

    const sph = new THREE.Box3().setFromObject(model).getBoundingSphere(new THREE.Sphere())
    model.position.sub(sph.center)
    const d = (sph.radius / Math.sin(THREE.MathUtils.degToRad(15))) * 1.06
    camera.position.set(0.2, -0.6, 0.78).normalize().multiplyScalar(d)
    camera.lookAt(0, 0, 0)

    renderer.render(scene, camera)
    out[type] = renderer.domElement.toDataURL('image/png')

    scene.remove(model)
    disposeModel(model)
  }
  renderer.dispose()
  try { renderer.forceContextLoss() } catch (_) {}
  return out
}

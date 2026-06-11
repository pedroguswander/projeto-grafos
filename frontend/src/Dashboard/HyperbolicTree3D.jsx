import { useRef, useState, useEffect, useMemo, useCallback } from "react"
import ForceGraph3D from "react-force-graph-3d"
import SpriteText from "three-spritetext"
import axios from "axios"

const API = import.meta.env.VITE_API_URL ?? ""

const REGION_CONTINENT = {
  "West Med":               "Europa",
  "North Continent Europe": "Europa",
  "UK":                     "Europa",
  "Dubai":                  "Médio Oriente",
  "Saudi Arabia":           "Médio Oriente",
  "Singapore":              "Ásia",
  "Hong Kong":              "Ásia",
  "Korea":                  "Ásia",
  "Japan":                  "Ásia",
  "Central China":          "Ásia",
  "North China":            "Ásia",
  "South China":            "Ásia",
  "Mumbai":                 "Ásia",
  "South Africa":           "África",
  "West Africa":            "África",
  "Brazil":                 "América do Sul",
  "US East Coast":          "América do Norte",
  "US West Coast":          "América do Norte",
  "US Gulf Coast":          "América do Norte",
  "Canada East Coast":      "América do Norte",
  "Canada West":            "América do Norte",
  "South America West Coast":"América do Sul",
  "Australia":              "Oceania",
}

const CONTINENT_COLORS = {
  "Europa":           "#60a5fa",
  "Médio Oriente":    "#fbbf24",
  "Ásia":             "#c084fc",
  "África":           "#fb923c",
  "América do Norte": "#34d399",
  "América do Sul":   "#4ade80",
  "Oceania":          "#22d3ee",
}

const ALL_CONTINENTS = Object.keys(CONTINENT_COLORS)
const R2 = 175  // Region ring radius
const R3 = 325  // Port ring radius

function ySpread(idx, step) {
  if (idx === 0) return 0
  return (idx % 2 === 0 ? 1 : -1) * Math.ceil(idx / 2) * step
}

// Pre-compute all node positions based on continent sectors
function computePositions(vertices) {
  const hierarchy = new Map()
  vertices.forEach(v => {
    const c = REGION_CONTINENT[v.D_Region] || "Outros"
    const r = v.D_Region || "Outros"
    if (!hierarchy.has(c)) hierarchy.set(c, new Map())
    const rm = hierarchy.get(c)
    if (!rm.has(r)) rm.set(r, [])
    rm.get(r).push(v.UNLocode)
  })

  const pos = {}
  const cList = [...hierarchy.keys()]
  const NC = cList.length

  cList.forEach((c, ci) => {
    const cAngle    = (2 * Math.PI * ci) / NC
    const sectorHalf = Math.PI / NC

    const regMap = hierarchy.get(c)
    const rList  = [...regMap.keys()]
    const NR     = rList.length

    rList.forEach((r, ri) => {
      const rFrac  = NR === 1 ? 0 : ri / (NR - 1) - 0.5
      const rAngle = cAngle + rFrac * sectorHalf * 1.6
      const rY     = ySpread(ri, 40)

      pos[`r::${r}`] = {
        x: R2 * Math.cos(rAngle),
        y: rY,
        z: R2 * Math.sin(rAngle),
      }

      const ports    = regMap.get(r)
      const NP       = ports.length
      const subHalf  = (sectorHalf * 1.6) / Math.max(NR, 1) * 0.46

      ports.forEach((code, pi) => {
        const pFrac  = NP === 1 ? 0 : pi / (NP - 1) - 0.5
        const pAngle = rAngle + pFrac * subHalf * 2
        const pY     = rY + ySpread(pi, 24)

        pos[code] = {
          x: R3 * Math.cos(pAngle),
          y: pY,
          z: R3 * Math.sin(pAngle),
        }
      })
    })
  })

  return pos
}

function buildGraphData(vertices, arestas, routeFilter, activeContinents) {
  const positions = computePositions(vertices)
  const nodes     = []
  const links     = []

  // Filter by active continents
  const visible = vertices.filter(v => {
    const c = REGION_CONTINENT[v.D_Region] || "Outros"
    return activeContinents.has(c)
  })
  const visibleIds = new Set(visible.map(v => v.UNLocode))

  // Only port nodes — no region/continent nodes in the 3D scene
  visible.forEach(v => {
    const region    = v.D_Region  || "Outros"
    const continent = REGION_CONTINENT[region] || "Outros"
    const color     = CONTINENT_COLORS[continent] || "#9ca3af"
    const p         = positions[v.UNLocode] ?? { x: 0, y: 0, z: 0 }

    nodes.push({
      id: v.UNLocode, name: v.name, code: v.UNLocode, type: "port",
      color, val: 3, continent, region,
      country:     v.Country,
      costFixed:   v.PortCallCostFixed,
      costPerFull: v.CostPerFULL,
      x: p.x, y: p.y, z: p.z, fx: p.x, fy: p.y, fz: p.z,
    })
  })

  // Route links only (no hierarchy edges without region nodes)
  if (routeFilter !== "none") {
    arestas.forEach(a => {
      if (!visibleIds.has(a.origem) || !visibleIds.has(a.destino)) return
      const peso = parseFloat(a.peso)
      if (isNaN(peso)) return
      const lucr = peso >= 0
      if (routeFilter === "profitable" && !lucr) return
      if (routeFilter === "deficit"    &&  lucr) return

      links.push({
        source: a.origem,
        target: a.destino,
        type:  "route",
        peso,
        color:         lucr ? "rgba(99,217,177,0.52)" : "rgba(248,113,113,0.44)",
        particleColor: lucr ? "#63d9b1"                : "#f87171",
      })
    })
  }

  return { nodes, links }
}

// ─── Main component ────────────────────────────────────────────
export default function HyperbolicTree3D() {
  const fgRef        = useRef()
  const containerRef = useRef()
  const rotateRef    = useRef(true)
  const rotIdRef     = useRef(null)
  const initRef      = useRef(false)

  const [vertices,  setVertices]  = useState([])
  const [arestas,   setArestas]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)

  const [routeFilter,      setRouteFilter]      = useState("none")
  const [activeContinents, setActiveContinents] = useState(() => new Set(ALL_CONTINENTS))
  const [autoRotate,       setAutoRotate]       = useState(true)
  const [selectedNode,     setSelectedNode]     = useState(null)
  const [canvasWidth,      setCanvasWidth]      = useState(700)

  useEffect(() => { rotateRef.current = autoRotate }, [autoRotate])

  // Measure only the canvas area (not the legend)
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => {
      setCanvasWidth(Math.floor(e.contentRect.width) || 700)
    })
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  // Load data
  useEffect(() => {
    Promise.all([
      axios.get(`${API}/api/etn/vertices`),
      axios.get(`${API}/api/etn/arestas`),
    ])
    .then(([vRes, eRes]) => {
      setVertices(vRes.data)
      setArestas(eRes.data)
      setLoading(false)
    })
    .catch(() => {
      setError("Erro ao carregar dados — Flask rodando?")
      setLoading(false)
    })
  }, [])

  const graphData = useMemo(
    () => buildGraphData(vertices, arestas, routeFilter, activeContinents),
    [vertices, arestas, routeFilter, activeContinents]
  )

  // Auto-rotation
  const startRotation = useCallback(() => {
    if (rotIdRef.current) clearInterval(rotIdRef.current)
    const DIST = 490, ELEV = 120
    let angle = 0
    rotIdRef.current = setInterval(() => {
      if (!rotateRef.current || !fgRef.current) return
      fgRef.current.cameraPosition({
        x: DIST * Math.sin(angle),
        y: ELEV,
        z: DIST * Math.cos(angle),
      })
      angle += Math.PI / 800
    }, 16)
  }, [])

  const handleEngineStop = useCallback(() => {
    if (initRef.current) return
    initRef.current = true
    fgRef.current?.cameraPosition({ x: 0, y: 120, z: 490 }, { x: 0, y: 0, z: 0 }, 0)
    startRotation()
  }, [startRotation])

  // Re-init camera on filter change
  useEffect(() => { initRef.current = false }, [routeFilter, activeContinents])

  useEffect(() => () => {
    if (rotIdRef.current) clearInterval(rotIdRef.current)
  }, [])

  // Port code label floating above each sphere
  const nodeThreeObject = useCallback(node => {
    const s = new SpriteText(node.code)
    s.color           = node.color
    s.textHeight      = 4.5
    s.backgroundColor = "rgba(5,18,14,0.72)"
    s.padding         = 1.5
    s.borderRadius    = 2
    return s
  }, [])

  const handleNodeClick = useCallback(node => {
    if (node.type !== "port") return
    setSelectedNode(prev => prev?.id === node.id ? null : node)
    setAutoRotate(false)
    if (fgRef.current && node.x != null) {
      const d   = 70
      const mag = Math.hypot(node.x, node.y, node.z) || 1
      const r   = 1 + d / mag
      fgRef.current.cameraPosition(
        { x: node.x * r, y: node.y * r + 25, z: node.z * r },
        node,
        900
      )
    }
  }, [])

  // Continent toggle helpers
  const toggleContinent = useCallback(c => {
    setActiveContinents(prev => {
      const next = new Set(prev)
      next.has(c) ? next.delete(c) : next.add(c)
      return next.size === 0 ? new Set(ALL_CONTINENTS) : next // guard: never empty
    })
    setSelectedNode(null)
  }, [])

  const selectAll = useCallback(() => {
    setActiveContinents(new Set(ALL_CONTINENTS))
    setSelectedNode(null)
  }, [])

  const toggleRotate = useCallback(() => {
    setAutoRotate(prev => {
      if (!prev) startRotation()
      return !prev
    })
  }, [startRotation])

  // ─── Route filter options ──────────────────────────────────────
  const ROUTE_OPTS = [
    { key: "none",       label: "Sem Rotas" },
    { key: "profitable", label: "Lucrativas" },
    { key: "deficit",    label: "Deficitárias" },
    { key: "all",        label: "Ambas" },
  ]

  if (loading) return (
    <div className="etn-tree3d-placeholder">
      <div className="etn-tree3d-spinner" />
      <span>Carregando árvore hiperbólica 3D…</span>
    </div>
  )

  if (error) return (
    <div className="etn-tree3d-placeholder etn-tree3d-err">{error}</div>
  )

  const allActive = activeContinents.size === ALL_CONTINENTS.length

  return (
    <div className="etn-tree3d-wrap">

      {/* ── Legend sidebar (static flex child) ── */}
      <div className="etn-tree3d-legend">
        <div className="etn-tree3d-legend-section-title">
          Continentes
          {!allActive && (
            <button
              type="button"
              className="etn-tree3d-legend-reset"
              onClick={selectAll}
            >todos</button>
          )}
        </div>

        {ALL_CONTINENTS.map(c => {
          const active = activeContinents.has(c)
          return (
            <button
              key={c}
              type="button"
              className={`etn-tree3d-legend-item etn-tree3d-legend-btn${active ? "" : " dim"}`}
              onClick={() => toggleContinent(c)}
            >
              <span
                className="etn-tree3d-legend-dot"
                style={{ background: CONTINENT_COLORS[c], opacity: active ? 1 : 0.3 }}
              />
              <span className="etn-tree3d-legend-label">{c}</span>
            </button>
          )
        })}

        {routeFilter !== "none" && (
          <>
            <div className="etn-tree3d-legend-sep" />
            <div className="etn-tree3d-legend-section-title">Rotas</div>
            {(routeFilter === "profitable" || routeFilter === "all") && (
              <div className="etn-tree3d-legend-item">
                <span className="etn-tree3d-legend-line" style={{ background: "#63d9b1" }} />
                <span className="etn-tree3d-legend-label">Lucrativa</span>
              </div>
            )}
            {(routeFilter === "deficit" || routeFilter === "all") && (
              <div className="etn-tree3d-legend-item">
                <span className="etn-tree3d-legend-line" style={{ background: "#f87171" }} />
                <span className="etn-tree3d-legend-label">Deficitária</span>
              </div>
            )}
          </>
        )}

        <div className="etn-tree3d-legend-sep" />
        <div className="etn-tree3d-legend-hint">
          Clique num porto<br />para ver detalhes
        </div>
      </div>

      {/* ── Canvas area (fills remaining space) ── */}
      <div className="etn-tree3d-canvas-area" ref={containerRef}>

        {/* Controls — absolute top-right inside canvas area */}
        <div className="etn-tree3d-controls">
          <div className="etn-tree3d-route-group">
            {ROUTE_OPTS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                className={`etn-tree3d-btn${routeFilter === key ? " active" : ""}`}
                onClick={() => setRouteFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className={`etn-tree3d-btn${autoRotate ? " active" : ""}`}
            onClick={toggleRotate}
          >
            {autoRotate ? "⏸ Parar" : "▶ Girar"}
          </button>
        </div>

      {/* ── 3-D graph ── */}
      <ForceGraph3D
        ref={fgRef}
        graphData={graphData}
        width={canvasWidth}
        height={620}
        backgroundColor="#081c16"
        cooldownTicks={0}
        d3AlphaDecay={1}
        dagMode={null}
        // Nodes
        nodeColor={n => n.color}
        nodeVal={n => n.val}
        nodeOpacity={0.92}
        nodeLabel={n =>
          n.type === "port"
            ? `<div style="padding:5px 10px;background:rgba(5,18,14,0.96);border:1px solid rgba(38,194,129,0.3);border-radius:7px;font-size:12px;color:#eefef7"><b>${n.name}</b><br/><span style="color:#8fbca8">${n.code} · ${n.country}</span></div>`
            : ""
        }
        nodeThreeObject={nodeThreeObject}
        nodeThreeObjectExtend={true}
        // Links
        linkColor={l => l.type === "route" ? l.color : "rgba(255,255,255,0.11)"}
        linkWidth={l => l.type === "route" ? 1.1 : 0.3}
        linkCurvature={l => l.type === "route" ? 0.18 : 0}
        linkDirectionalParticles={l =>
          l.type === "route" && Math.abs(l.peso) > 6000 ? 2 : 0
        }
        linkDirectionalParticleSpeed={0.007}
        linkDirectionalParticleColor={l => l.particleColor ?? "rgba(255,255,255,0.4)"}
        linkDirectionalParticleWidth={2.2}
        // Interaction
        onNodeClick={handleNodeClick}
        onBackgroundClick={() => setSelectedNode(null)}
        onEngineStop={handleEngineStop}
        enableNodeDrag={false}
      />

        {/* ── Port info panel — inside canvas area ── */}
        {selectedNode && (
          <div className="etn-tree3d-info">
            <div className="etn-tree3d-info-top">
              <div>
                <span
                  className="etn-tree3d-info-code"
                  style={{ color: CONTINENT_COLORS[selectedNode.continent] }}
                >
                  {selectedNode.code}
                </span>
                <h4 className="etn-tree3d-info-name">{selectedNode.name}</h4>
              </div>
              <button
                type="button"
                className="etn-tree3d-info-close"
                onClick={() => setSelectedNode(null)}
              >✕</button>
            </div>
            <div className="etn-tree3d-info-rows">
              <div className="etn-tree3d-info-row">
                <span>País</span><span>{selectedNode.country}</span>
              </div>
              <div className="etn-tree3d-info-row">
                <span>Região ETN</span><span>{selectedNode.region}</span>
              </div>
              <div className="etn-tree3d-info-row">
                <span>Continente</span>
                <span style={{ color: CONTINENT_COLORS[selectedNode.continent] }}>
                  {selectedNode.continent}
                </span>
              </div>
              {selectedNode.costFixed && (
                <div className="etn-tree3d-info-row">
                  <span>Custo Fixo</span>
                  <span>${Number(selectedNode.costFixed).toLocaleString("pt-BR")}</span>
                </div>
              )}
              {selectedNode.costPerFull && (
                <div className="etn-tree3d-info-row">
                  <span>Custo / FFE</span>
                  <span>${selectedNode.costPerFull}</span>
                </div>
              )}
            </div>
            <p className="etn-tree3d-info-hint">Clique no fundo para fechar</p>
          </div>
        )}

      </div>{/* end canvas-area */}
    </div>
  )
}

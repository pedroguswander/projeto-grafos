import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { AlertCircle, Loader2, Zap } from "lucide-react"
import {
  AreaChart, Area, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie,
} from "recharts"
import logoCompleta from "../assets/logo/logo_branca_completa.png"
import "../css/Dashboard.css"
import InsightPanel from "../../components/InsightPanel"
import { useAIInsight } from "../hooks/useAIInsight"

const API = "http://localhost:5000"
const PALETTE = ["#1e40af", "#0891b2", "#0369a1"]
const TICK = { fontSize: 11, fill: "#9ca3af" }
const GRID = "rgba(255,255,255,0.06)"

// ─── Weight Bins ───────────────────────────────────────────────

function buildWeightBins(routes, numBins) {
  const entries = routes
    .map(r => ({ w: r.distance ?? r.weight ?? r.peso, label: r.from && r.to ? `${r.from} – ${r.to}` : null }))
    .filter(e => e.w != null && !isNaN(e.w))
  if (!entries.length) return []

  if (entries.every(e => Number.isInteger(e.w))) {
    const map = new Map()
    entries.forEach(({ w, label }) => {
      if (!map.has(w)) map.set(w, { label: w, rangeEnd: w, count: 0, rotas: [] })
      const bin = map.get(w); bin.count++
      if (label && !bin.rotas.includes(label)) bin.rotas.push(label)
    })
    return Array.from(map.values()).sort((a, b) => a.label - b.label)
  }

  const weights = entries.map(e => e.w)
  const mn = Math.min(...weights), mx = Math.max(...weights), step = (mx - mn) / numBins || 1
  const bins = Array.from({ length: numBins }, (_, i) => ({
    label: parseFloat((mn + i * step).toFixed(2)), rangeEnd: parseFloat((mn + (i + 1) * step).toFixed(2)), count: 0, rotas: [],
  }))
  entries.forEach(({ w, label }) => {
    const idx = Math.min(Math.floor((w - mn) / step), numBins - 1)
    if (idx >= 0) { bins[idx].count++; if (label && !bins[idx].rotas.includes(label)) bins[idx].rotas.push(label) }
  })
  return bins
}

// ─── UI Atoms ──────────────────────────────────────────────────

const KPICard = ({ title, value, sub, loading }) => (
  <div className="dashboard-kpi-card">
    <p className="dashboard-kpi-title">{title}</p>
    {loading ? <div className="dashboard-skeleton-pulse" /> : <p className="dashboard-kpi-value">{value}</p>}
    {sub && <p className="dashboard-kpi-sub">{sub}</p>}
  </div>
)

const Skeleton = ({ height = 280 }) => (
  <div className="dashboard-skeleton-chart" style={{ height }}>
    <Loader2 size={24} className="animate-spin dashboard-skeleton-icon" />
  </div>
)

const ErrorBanner = ({ msg }) => (
  <div className="dashboard-error-banner">
    <AlertCircle size={18} />
    <div>
      <p className="dashboard-error-title">Falha ao conectar com a API</p>
      <p className="dashboard-error-text">{msg} — Flask rodando em {API}?</p>
    </div>
  </div>
)

const WinnerBadge = ({ winner }) => (
  <span className={`dashboard-winner-badge ${winner === "BFS" ? "bfs" : "dfs"}`}><Zap size={10} />{winner}</span>
)

const CloseBtn = ({ onClick, color }) => (
  <button onClick={onClick} type="button"
    style={{ fontSize: 11, color, background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>
    ✕ Fechar
  </button>
)

// ─── Tooltip Helpers ───────────────────────────────────────────

const TT = ({ cls = "", children }) => <div className={`dashboard-custom-tooltip ${cls}`}>{children}</div>
const TTHead = ({ c }) => <p className="dashboard-tooltip-heading">{c}</p>
const TTVal  = ({ c }) => <p className="dashboard-tooltip-value">{c}</p>
const TTSub  = ({ c }) => <p className="dashboard-tooltip-label">{c}</p>
const TTList = ({ items }) => <div className="dashboard-tooltip-list">{items.map((r, i) => <div key={i}>• {r}</div>)}</div>

const WeightBinTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const isSingle = d.label === d.rangeEnd || Math.abs(d.label - d.rangeEnd) < 0.01
  return (
    <TT cls="dashboard-tooltip-wide">
      <TTHead c={isSingle ? Number(d.label).toLocaleString("pt-BR") : `${Number(d.label).toLocaleString("pt-BR")} – ${Number(d.rangeEnd).toLocaleString("pt-BR")}`} />
      {d.rotas?.length > 0 ? <TTList items={d.rotas} /> : <TTVal c={`${d.count.toLocaleString("pt-BR")} rotas`} />}
    </TT>
  )
}

const ComparisonTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <TT cls="dashboard-comparison-tooltip">
      <p className="dashboard-comparison-tooltip-title">Source: {label}</p>
      {payload.map((p, i) => (
        <div key={i} className="dashboard-comparison-row">
          <span style={{ color: p.color }}>{p.name}</span>
          <span>{(p.value * 1000).toFixed(4)} ms</span>
        </div>
      ))}
      {payload.length === 2 && (
        <p className="dashboard-comparison-delta">Δ {Math.abs((payload[0].value - payload[1].value) * 1000).toFixed(4)} ms</p>
      )}
    </TT>
  )
}

// ─── Complex Sub-components ────────────────────────────────────

const ComparisonTable = ({ rows }) => (
  <div className="dashboard-table-wrap">
    <table className="dashboard-table">
      <thead>
        <tr>{["Source", "BFS (ms)", "Camadas", "DFS (ms)", "Ciclos", "Árv.", "Back", "Δ (ms)", "Mais rápido"].map(h => <th key={h}>{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            <td className="dashboard-table-strong">{row.source}</td>
            <td className="dashboard-table-bfs">{(row.bfs.tempo_segundos * 1000).toFixed(4)}</td>
            <td>{row.bfs.num_camadas}</td>
            <td className="dashboard-table-dfs">{(row.dfs.tempo_segundos * 1000).toFixed(4)}</td>
            <td>{row.dfs.ciclos?.toLocaleString("pt-BR")}</td>
            <td>{row.dfs.arestas_tree}</td>
            <td>{row.dfs.arestas_back}</td>
            <td>{Math.abs(row.delta_tempo_ms).toFixed(4)}</td>
            <td><WinnerBadge winner={row.mais_rapido} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

const RangeSlider = ({ label, min, max, value, onChange }) => {
  const pct = v => ((v - min) / (max - min)) * 100
  return (
    <div className="dashboard-range-slider">
      <label className="dashboard-range-label">
        {label} <span>{value[0].toLocaleString("pt-BR")} – {value[1].toLocaleString("pt-BR")}</span>
      </label>
      <div className="dashboard-range-track-wrap">
        <div className="dashboard-range-track" />
        <div className="dashboard-range-track-active" style={{ left: `${pct(value[0])}%`, width: `${pct(value[1]) - pct(value[0])}%` }} />
        <input type="range" min={min} max={max} value={value[0]} className="dashboard-range-input dashboard-range-input-left"
          onChange={e => onChange([Math.min(+e.target.value, value[1] - 1), value[1]])} />
        <input type="range" min={min} max={max} value={value[1]} className="dashboard-range-input dashboard-range-input-right"
          onChange={e => onChange([value[0], Math.max(+e.target.value, value[0] + 1)])} />
      </div>
    </div>
  )
}

const FilterBar = ({ ranges, pais, setPais, grauRange, setGrauRange, distRange, setDistRange, onClear, hasFilter }) => {
  if (!ranges) return null
  return (
    <section className="glass-card dashboard-filter-bar">
      <div className="dashboard-section-header">
        <div className="dashboard-section-title">Filtros do painel</div>
        <div className="dashboard-section-subtitle">Ajuste os intervalos para refinar os dados exibidos.</div>
      </div>
      <div className="dashboard-filter-grid">
        <RangeSlider label="Grau (conexões)" min={ranges.grau_min} max={ranges.grau_max} value={grauRange} onChange={setGrauRange} />
        <RangeSlider label="Distância da rota (pesos)" min={ranges.dist_min} max={ranges.dist_max} value={distRange} onChange={setDistRange} />
        <div className="dashboard-filter-actions">
          {hasFilter && <>
            <button onClick={onClear} className="dashboard-secondary-btn" type="button">Limpar filtros</button>
            <span className="dashboard-filter-active">● Filtro ativo</span>
          </>}
        </div>
      </div>
    </section>
  )
}

const HubDetail = ({ hub, conexoes, accent }) => (
  <div style={{ padding: "8px 4px" }}>
    <p style={{ fontWeight: 700, color: accent, marginBottom: 6, fontSize: 13 }}>{hub} — {conexoes.length} conexão(ões)</p>
    <div style={{ maxHeight: 230, overflowY: "auto", fontSize: 12, color: "#9ca3af", display: "flex", flexDirection: "column", gap: 3 }}>
      {conexoes.map((c, i) => (
        <div key={i} style={{ padding: "3px 6px", background: `${accent}11`, borderRadius: 4, display: "flex", justifyContent: "space-between" }}>
          <span>{c.label}</span>
          {c.dist != null && <span style={{ opacity: 0.6 }}>{c.dist.toLocaleString("pt-BR")}</span>}
        </div>
      ))}
    </div>
  </div>
)

const BackArrow = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="18" height="18">
    <path d="M15 6L9 12L15 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

// ─── Main ──────────────────────────────────────────────────────

export const Dashboard = ({ onBack }) => {
  const [stats, setStats] = useState(null)
  const [routes, setRoutes] = useState([])
  const [adjacencias, setAdjacencias] = useState([])
  const [bfsDfs, setBfsDfs] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [bfsErr, setBfsErr] = useState(null)
  const [view, setView] = useState("chart")
  const [weightBins, setWeightBins] = useState(30)
  const [selectedHub, setSelectedHub] = useState(null)
  const [ranges, setRanges] = useState(null)
  const [pais, setPais] = useState("")
  const [grauRange, setGrauRange] = useState([0, 9999])
  const [distRange, setDistRange] = useState([0, 9999999])
  const { insight, loadingInsight, generate } = useAIInsight()

  const hasFilter = !!(pais ||
    (ranges && grauRange[0] > ranges.grau_min) || (ranges && grauRange[1] < ranges.grau_max) ||
    (ranges && distRange[0] > ranges.dist_min) || (ranges && distRange[1] < ranges.dist_max))

  const buildStatsUrl = useCallback(() => {
    const p = new URLSearchParams()
    if (pais) p.set("pais", pais)
    if (ranges && grauRange[0] > ranges.grau_min) p.set("grau_min", grauRange[0])
    if (ranges && grauRange[1] < ranges.grau_max) p.set("grau_max", grauRange[1])
    if (ranges && distRange[0] > ranges.dist_min) p.set("dist_min", distRange[0])
    if (ranges && distRange[1] < ranges.dist_max) p.set("dist_max", distRange[1])
    const qs = p.toString()
    return `${API}/api/dashboard-stats/aeroportos/filtrado${qs ? `?${qs}` : ""}`
  }, [pais, grauRange, distRange, ranges])

  const generateRef = useRef(generate)
  useEffect(() => { generateRef.current = generate }, [generate])

  const fetchAll = useCallback(async () => {
    setError(null); setBfsErr(null)
    const [statsRes, bfsRes, routesRes, adjRes] = await Promise.allSettled([
      fetch(buildStatsUrl()).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() }),
      fetch(`${API}/api/report/comparacao/bfs-dfs`).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() }),
      fetch(`${API}/api/routes`).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() }),
      fetch(`${API}/api/adjacencias`).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() }),
    ])
    const s = statsRes.status  === "fulfilled" ? statsRes.value  : null
    const b = bfsRes.status    === "fulfilled" ? bfsRes.value    : null
    const r = routesRes.status === "fulfilled" ? routesRes.value : []
    const a = adjRes.status    === "fulfilled" ? adjRes.value    : []

    if (s) setStats(s); else setError(statsRes.reason?.message)
    if (b) setBfsDfs(b); else setBfsErr(bfsRes.reason?.message)
    setRoutes(r); setAdjacencias(a); setLoading(false)

    if (s) {
      const pesos = r.map(x => x.distance ?? x.weight ?? x.peso).filter(Boolean).sort((a, b) => a - b)
      generateRef.current({
        filtro: { grau: grauRange, dist: distRange },
        grafo: { vertices: s.totalV, arestas: s.totalE, grauMedio: s.grauMedio, pesoMedio: s.pesoMedio },
        rotas: { total: r.length, pesoMin: pesos[0] ?? 0, pesoMax: pesos[pesos.length - 1] ?? 0, mediana: Math.round(pesos[Math.floor(pesos.length / 2)] ?? 0) },
        bfsDfs: b ? { totalComparacoes: b.total_comparacoes, bfsVence: b.comparacoes?.filter(x => x.mais_rapido === "BFS").length, dfsVence: b.comparacoes?.filter(x => x.mais_rapido === "DFS").length } : null,
      })
    }
  }, [buildStatsUrl, grauRange, distRange])

  useEffect(() => {
    fetch(`${API}/api/dashboard-stats/aeroportos/filtros`).then(r => r.ok ? r.json() : null)
      .then(data => { if (data) { setRanges(data); setGrauRange([data.grau_min, data.grau_max]); setDistRange([data.dist_min, data.dist_max]) } })
      .catch(() => {})
  }, [])

  const debounceRef = useRef(null)
  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(fetchAll, 400)
    return () => clearTimeout(debounceRef.current)
  }, [fetchAll])

  const d = stats || {}
  const comparacoes = bfsDfs?.comparacoes || []
  const bfsWins = comparacoes.filter(r => r.mais_rapido === "BFS").length
  const dfsWins = comparacoes.filter(r => r.mais_rapido === "DFS").length
  const avgDelta = comparacoes.length ? (comparacoes.reduce((s, r) => s + Math.abs(r.delta_tempo_ms), 0) / comparacoes.length).toFixed(4) : "—"
  const chartData = comparacoes.map(r => ({ source: r.source, BFS: r.bfs.tempo_segundos, DFS: r.dfs.tempo_segundos }))

  const adjMap = useMemo(() => {
    const m = new Map()
    adjacencias.forEach(a => { m.set(`${a.origem}-${a.destino}`, a.tipo_conexao || "desconhecido"); m.set(`${a.destino}-${a.origem}`, a.tipo_conexao || "desconhecido") })
    return m
  }, [adjacencias])

  const weightBinsData = useMemo(() => buildWeightBins(
    routes.filter(r => { const w = r.distance ?? r.weight ?? r.peso; return w != null && !isNaN(w) && w >= distRange[0] && w <= distRange[1] }),
    weightBins
  ), [routes, distRange, weightBins])

  const weightStats = useMemo(() => {
    const vals = routes.map(r => r.distance ?? r.weight ?? r.peso).filter(v => v != null && !isNaN(v))
    if (!vals.length) return null
    const sorted = [...vals].sort((a, b) => a - b)
    return { min: Math.round(sorted[0]), max: Math.round(sorted[sorted.length - 1]), mean: Math.round(vals.reduce((s, v) => s + v, 0) / vals.length), median: Math.round(sorted[Math.floor(sorted.length / 2)]) }
  }, [routes])

  const hubConexoes = useMemo(() => {
    if (!selectedHub) return []
    return routes.filter(r => r.from === selectedHub || r.to === selectedHub)
      .map(r => ({ label: r.from === selectedHub ? `→ ${r.to}` : `← ${r.from}`, dist: r.distance ?? r.weight ?? r.peso }))
      .sort((a, b) => (b.dist ?? 0) - (a.dist ?? 0))
  }, [selectedHub, routes])

  const comparisonTrendData = useMemo(() => [...comparacoes].sort((a, b) => a.source.localeCompare(b.source))
    .map(r => ({ source: r.source, BFS: r.bfs.tempo_segundos, DFS: r.dfs.tempo_segundos })), [comparacoes])

  const deltaRankingData = useMemo(() => [...comparacoes]
    .map(r => ({ source: r.source, delta: Math.abs(r.delta_tempo_ms), winner: r.mais_rapido }))
    .sort((a, b) => b.delta - a.delta).slice(0, 10), [comparacoes])

  const connectionTypeData = useMemo(() => {
    const map = new Map()
    routes.forEach(r => {
      const tipo = adjMap.get(`${r.from}-${r.to}`) || "desconhecido"
      if (!map.has(tipo)) map.set(tipo, { value: 0, rotas: [] })
      const e = map.get(tipo); e.value++; e.rotas.push(`${r.from} → ${r.to}`)
    })
    return Array.from(map.entries()).map(([name, { value, rotas }]) => ({ name, value, rotas })).sort((a, b) => b.value - a.value).slice(0, 10)
  }, [routes, adjMap])

  const pesoMedioTipoData = useMemo(() => {
    const map = new Map()
    routes.forEach(r => {
      const tipo = adjMap.get(`${r.from}-${r.to}`) || "desconhecido"
      const w = r.distance ?? r.weight ?? r.peso
      if (w == null) return
      if (!map.has(tipo)) map.set(tipo, { sum: 0, count: 0 })
      const e = map.get(tipo); e.sum += w; e.count++
    })
    return Array.from(map.entries()).map(([name, { sum, count }]) => ({ name, media: Math.round(sum / count) })).sort((a, b) => b.media - a.media).slice(0, 10)
  }, [routes, adjMap])

  const routeDistanceProfile = useMemo(() => {
    const vals = routes.map(r => r.distance ?? r.weight ?? r.peso).filter(v => v != null && !isNaN(v)).sort((a, b) => a - b)
    if (!vals.length) return []
    const q1 = vals[Math.floor(vals.length * 0.33)], q2 = vals[Math.floor(vals.length * 0.66)]
    let curtas = 0, medias = 0, longas = 0
    vals.forEach(v => { if (v <= q1) curtas++; else if (v <= q2) medias++; else longas++ })
    return [{ name: "Curtas", value: curtas, color: "#1e40af" }, { name: "Médias", value: medias, color: "#0891b2" }, { name: "Longas", value: longas, color: "#2b4cd3" }]
  }, [routes])

  const degreeData = useMemo(() => (d.distribuicaoGraus || []).map(i => ({ ...i, vertices: i.vertices || [] })), [d.distribuicaoGraus])

  return (
    <div className="app-modern-bg dashboard-page">
      <header className="app-modern-header">
        <div className="header-top-actions">
          <button onClick={onBack} className="global-metrics-back-button" type="button" title="Voltar">
            <span className="global-metrics-back-icon"><BackArrow /></span>
            <span className="global-metrics-back-text">Voltar</span>
          </button>
        </div>
        <div className="clean-header">
          <div className="clean-header-brand"><img src={logoCompleta} alt="Logo ETA Airlines" className="clean-header-logo" /></div>
          <div className="clean-header-content">
            <h1 className="clean-header-title">Dashboard Analítico de Aeroportos</h1>
            <p className="dashboard-header-subtitle">Indicadores, distribuição de graus, distâncias das rotas e comparação entre BFS e DFS.</p>
          </div>
        </div>
      </header>

      <main className="app-modern-main dashboard-main">
        {error && <ErrorBanner msg={error} />}

        <FilterBar ranges={ranges} pais={pais} setPais={setPais}
          grauRange={grauRange} setGrauRange={setGrauRange}
          distRange={distRange} setDistRange={setDistRange}
          hasFilter={hasFilter}
          onClear={() => { setPais(""); if (ranges) { setGrauRange([ranges.grau_min, ranges.grau_max]); setDistRange([ranges.dist_min, ranges.dist_max]) } }}
        />

        <InsightPanel insight={insight} loading={loadingInsight} />

        <section className="dashboard-kpi-grid">
          <KPICard loading={loading} title="Vértices (Aeroportos)" value={d.totalV?.toLocaleString("pt-BR") || "—"} />
          <KPICard loading={loading} title="Arestas (Rotas)" value={d.totalE?.toLocaleString("pt-BR") || "—"} />
          <KPICard loading={loading} title="Grau Médio" value={d.grauMedio != null ? Number(d.grauMedio).toFixed(2) : "—"} sub="conexões por aeroporto" />
          <KPICard loading={loading} title="Distância Média" value={d.pesoMedio?.toLocaleString("pt-BR") || "—"} sub="por peso" />
        </section>

        <section className="dashboard-chart-row">
          <div className="glass-card dashboard-chart-card">
            <div className="dashboard-chart-header"><h3 className="dashboard-chart-title">Distribuição de Graus</h3></div>
            {loading ? <Skeleton /> : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={d.distribuicaoGraus || []}>
                  <defs>
                    <linearGradient id="gradGrauAero" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.25} /><stop offset="95%" stopColor="#7c3aed" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
                  <XAxis dataKey="grau" tick={TICK} /><YAxis tick={TICK} />
                  <Tooltip content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    const data = payload[0].payload
                    return <TT cls="dashboard-tooltip-wide"><TTHead c={`Grau ${label}`} /><TTSub c={`${data.quantidade} vértices`} /><TTList items={data.vertices || []} /></TT>
                  }} />
                  <Area type="monotone" dataKey="quantidade" stroke="#7c3aed" strokeWidth={2} fill="url(#gradGrauAero)" dot={{ r: 3, fill: "#7c3aed" }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="glass-card dashboard-chart-card">
            <div className="dashboard-chart-header">
              <h3 className="dashboard-chart-title">Top 10 Hubs</h3>
              {selectedHub && <CloseBtn onClick={() => setSelectedHub(null)} color="#0891b2" />}
            </div>
            {loading ? <Skeleton /> : selectedHub ? (
              <HubDetail hub={selectedHub} conexoes={hubConexoes} accent="#0891b2" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={d.topVertices || []} layout="vertical"
                  onClick={e => e?.activePayload?.[0] && setSelectedHub(e.activePayload[0].payload.nome)}
                  style={{ cursor: "pointer" }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={GRID} />
                  <XAxis type="number" tick={TICK} />
                  <YAxis dataKey="nome" type="category" width={90} tick={TICK} />
                  <Tooltip content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    return <TT><TTHead c={label} /><TTVal c={`${payload[0].value} conexões`} /><p style={{ fontSize: 10, color: "#0891b2", marginTop: 4 }}>Clique para ver conexões</p></TT>
                  }} />
                  <Bar dataKey="grau" radius={[0, 6, 6, 0]}>
                    {(d.topVertices || []).map((_, i) => <Cell key={i} fill={`rgba(77,163,255,${1 - i * 0.07})`} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="glass-card dashboard-chart-card">
          <div className="dashboard-chart-header dashboard-chart-header-wrap">
            <div>
              <h3 className="dashboard-chart-title">Distribuição de Distâncias das Rotas (Peso)</h3>
              {weightStats && (
                <p className="dashboard-chart-meta">
                  {routes.length.toLocaleString("pt-BR")} rotas · mín {weightStats.min.toLocaleString("pt-BR")} · máx {weightStats.max.toLocaleString("pt-BR")} · média {weightStats.mean.toLocaleString("pt-BR")} · mediana {weightStats.median.toLocaleString("pt-BR")}
                </p>
              )}
            </div>
            <div className="dashboard-select-group">
              <label className="dashboard-select-label">Faixas</label>
              <select value={weightBins} onChange={e => setWeightBins(+e.target.value)} className="dashboard-select">
                {[10, 20, 30, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
          {loading ? <Skeleton height={260} /> : weightBinsData.length === 0 ? (
            <div className="dashboard-empty-state">Nenhuma rota carregada</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={weightBinsData} margin={{ top: 4, right: 8, left: 0, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9ca3af" }} tickFormatter={v => Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} interval="preserveStartEnd" label={{ value: "Distância (peso)", position: "insideBottom", offset: -16, fontSize: 11, fill: "#9ca3af" }} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} label={{ value: "Rotas", angle: -90, position: "insideLeft", offset: 12, fontSize: 11, fill: "#9ca3af" }} />
                <Tooltip content={<WeightBinTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {weightBinsData.map((_, i) => <Cell key={i} fill={`rgba(124,58,237,${0.45 + 0.55 * (i / weightBinsData.length)})`} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>

        <section className="dashboard-chart-row">
          <div className="glass-card dashboard-chart-card">
            <div className="dashboard-chart-header">
              <div>
                <h3 className="dashboard-chart-title">Área de Frequência — Graus dos Aeroportos</h3>
                <p className="dashboard-chart-meta">Visão complementar da concentração de aeroportos por grau.</p>
              </div>
            </div>
            {loading ? <Skeleton /> : degreeData.length === 0 ? (
              <div className="dashboard-empty-state">Sem distribuição de graus disponível.</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={degreeData}>
                  <defs>
                    <linearGradient id="gradDegreeDensity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0891b2" stopOpacity={0.35} /><stop offset="95%" stopColor="#0891b2" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
                  <XAxis dataKey="grau" tick={TICK} /><YAxis tick={TICK} />
                  <Tooltip content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    const data = payload[0].payload
                    return <TT cls="dashboard-tooltip-wide"><TTHead c={`Grau ${label}`} /><TTSub c={`${data.quantidade} aeroporto(s)`} />{data.vertices?.length > 0 && <TTList items={data.vertices} />}</TT>
                  }} />
                  <Area type="monotone" dataKey="quantidade" stroke="#0891b2" strokeWidth={2} fill="url(#gradDegreeDensity)" dot={{ r: 3, fill: "#0891b2" }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="glass-card dashboard-chart-card">
            <div className="dashboard-chart-header">
              <div>
                <h3 className="dashboard-chart-title">Perfil das Rotas por Faixa de Distância</h3>
                <p className="dashboard-chart-meta">Segmentação relativa entre rotas curtas, médias e longas.</p>
              </div>
            </div>
            {loading ? <Skeleton /> : routeDistanceProfile.length === 0 ? (
              <div className="dashboard-empty-state">Nenhuma rota carregada.</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Tooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    return <TT><TTHead c={payload[0].name} /><TTVal c={Number(payload[0].value).toLocaleString("pt-BR")} /></TT>
                  }} />
                  <Legend verticalAlign="bottom" height={36} formatter={(v, e) => <span style={{ color: e.color, fontWeight: 700 }}>{v}</span>} />
                  <Pie data={routeDistanceProfile} dataKey="value" nameKey="name" cx="50%" cy="46%" innerRadius={58} outerRadius={100} paddingAngle={3}>
                    {routeDistanceProfile.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="glass-card dashboard-chart-card">
          <div className="dashboard-chart-header dashboard-chart-header-wrap">
            <div>
              <h3 className="dashboard-chart-title">Comparação de Tempo — BFS vs DFS</h3>
              {bfsDfs && <p className="dashboard-chart-meta">{bfsDfs.total_comparacoes} nós comparados</p>}
            </div>
            <div className="dashboard-view-toggle">
              {[{ id: "chart", label: "Gráfico" }, { id: "table", label: "Tabela" }].map(({ id, label }) => (
                <button key={id} onClick={() => setView(id)} className={`dashboard-view-btn ${view === id ? "active" : ""}`} type="button">{label}</button>
              ))}
            </div>
          </div>
          {bfsErr && <div className="dashboard-inline-error"><AlertCircle size={15} /> Falha: {bfsErr}</div>}
          {bfsDfs && (
            <div className="dashboard-mini-stats">
              {[{ label: "BFS mais rápido", value: bfsWins, color: "bfs" },
                { label: "DFS mais rápido", value: dfsWins, color: "dfs" },
                { label: "Δ médio", value: `${avgDelta} ms`, color: "accent" }].map(({ label, value, color }) => (
                <div key={label} className="dashboard-mini-stat-card">
                  <p className="dashboard-mini-stat-label">{label}</p>
                  <p className={`dashboard-mini-stat-value ${color}`}>{value}</p>
                </div>
              ))}
            </div>
          )}
          {!bfsDfs && !bfsErr ? <Skeleton height={300} /> : chartData.length > 0 && (
            view === "chart" ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }} barCategoryGap="30%" barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
                  <XAxis dataKey="source" tick={{ fontSize: 11, fill: "#9ca3af", fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => `${(v * 1000).toFixed(2)}ms`} tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} width={68} />
                  <Tooltip content={<ComparisonTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} formatter={v => <span style={{ color: v === "BFS" ? "#0891b2" : "#7c3aed", fontWeight: 700 }}>{v}</span>} />
                  <Bar dataKey="BFS" fill="#0891b2" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="DFS" fill="#7c3aed" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : <ComparisonTable rows={comparacoes} />
          )}
        </section>

        <section className="dashboard-chart-row">
          <div className="glass-card dashboard-chart-card">
            <div className="dashboard-chart-header">
              <div>
                <h3 className="dashboard-chart-title">Tendência dos Tempos — BFS vs DFS</h3>
                <p className="dashboard-chart-meta">Comparação contínua dos tempos por origem, em ordem alfabética.</p>
              </div>
            </div>
            {!bfsDfs ? <Skeleton /> : comparisonTrendData.length === 0 ? (
              <div className="dashboard-empty-state">Sem dados de tendência disponíveis.</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={comparisonTrendData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                  <defs>
                    <linearGradient id="gradBfsTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0891b2" stopOpacity={0.28} /><stop offset="95%" stopColor="#0891b2" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gradDfsTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.24} /><stop offset="95%" stopColor="#7c3aed" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
                  <XAxis dataKey="source" tick={{ fontSize: 10, fill: "#9ca3af" }} interval={0} angle={-25} textAnchor="end" height={65} />
                  <YAxis tickFormatter={v => `${(v * 1000).toFixed(2)}ms`} tick={{ fontSize: 10, fill: "#9ca3af" }} />
                  <Tooltip content={<ComparisonTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} formatter={v => <span style={{ color: v === "BFS" ? "#0891b2" : "#7c3aed", fontWeight: 700 }}>{v}</span>} />
                  <Area type="monotone" dataKey="BFS" stroke="#0891b2" fill="url(#gradBfsTrend)" strokeWidth={2} />
                  <Area type="monotone" dataKey="DFS" stroke="#7c3aed" fill="url(#gradDfsTrend)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="glass-card dashboard-chart-card">
            <div className="dashboard-chart-header">
              <div>
                <h3 className="dashboard-chart-title">Top 10 Maiores Diferenças de Tempo</h3>
                <p className="dashboard-chart-meta">Fontes onde BFS e DFS mais divergem em desempenho.</p>
              </div>
            </div>
            {!bfsDfs ? <Skeleton /> : deltaRankingData.length === 0 ? (
              <div className="dashboard-empty-state">Sem diferenças disponíveis.</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={deltaRankingData} layout="vertical" margin={{ top: 8, right: 10, left: 10, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={GRID} />
                  <XAxis type="number" tick={TICK} tickFormatter={v => `${Number(v).toFixed(2)} ms`} />
                  <YAxis dataKey="source" type="category" width={90} tick={TICK} />
                  <Tooltip content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    return <TT><TTHead c={label} /><TTVal c={`Δ ${Number(payload[0].value).toFixed(4)} ms`} /></TT>
                  }} />
                  <Bar dataKey="delta" radius={[0, 6, 6, 0]}>
                    {deltaRankingData.map((item, i) => <Cell key={i} fill={item.winner === "BFS" ? "rgba(8,145,178,0.85)" : "rgba(124,58,237,0.85)"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="dashboard-chart-row">
          <div className="glass-card dashboard-chart-card">
            <div className="dashboard-chart-header">
              <div>
                <h3 className="dashboard-chart-title">Top Tipos de Conexão</h3>
                <p className="dashboard-chart-meta">Frequência de cada categoria de rota no grafo.</p>
              </div>
            </div>
            {loading ? <Skeleton /> : connectionTypeData.length === 0 ? (
              <div className="dashboard-empty-state">Sem dados de tipo de conexão.</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={connectionTypeData} layout="vertical" margin={{ top: 4, right: 16, left: 10, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={GRID} />
                  <XAxis type="number" tick={TICK} />
                  <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 10, fill: "#9ca3af" }} />
                  <Tooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const d = payload[0].payload
                    return <TT cls="dashboard-tooltip-wide"><TTHead c={d.name} /><TTList items={d.rotas || []} /></TT>
                  }} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {connectionTypeData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="glass-card dashboard-chart-card">
            <div className="dashboard-chart-header">
              <div>
                <h3 className="dashboard-chart-title">Peso por Tipo de Conexão</h3>
                <p className="dashboard-chart-meta">Peso médio das rotas agrupado por categoria.</p>
              </div>
            </div>
            {loading ? <Skeleton /> : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={pesoMedioTipoData} layout="vertical" margin={{ top: 4, right: 16, left: 10, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={GRID} />
                  <XAxis type="number" tick={TICK} />
                  <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 10, fill: "#9ca3af" }} />
                  <Tooltip content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    return <TT><TTHead c={label} /><TTVal c={`Peso médio: ${payload[0].value}`} /></TT>
                  }} />
                  <Bar dataKey="media" radius={[0, 6, 6, 0]}>
                    {connectionTypeData.map((_, i) => <Cell key={i} fill={PALETTE[(i + 5) % PALETTE.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

export default Dashboard

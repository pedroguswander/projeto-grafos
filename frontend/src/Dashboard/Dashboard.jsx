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
import { useAIInsight, SUGGESTED_QUESTIONS } from "../hooks/useAIInsight"

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

  const allIntegers = entries.every(e => Number.isInteger(e.w))
  const distinctValues = allIntegers ? new Set(entries.map(e => e.w)).size : Infinity
  if (allIntegers && distinctValues <= numBins) {
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



// ─── Complex Sub-components ────────────────────────────────────

const RangeSlider = ({ label, min, max, value, onChange }) => {
  const safeMax = max > min ? max : min + 1
  const pct = v => ((v - min) / (safeMax - min)) * 100
  return (
    <div className="dashboard-range-slider">
      <div className="dashboard-range-header">
        <span className="dashboard-range-label">{label}</span>
        <span className="dashboard-range-value">
          {value[0].toLocaleString("pt-BR")} – {value[1].toLocaleString("pt-BR")}
        </span>
      </div>
      <div className="dashboard-range-track-wrap">
        <div className="dashboard-range-track" />
        <div className="dashboard-range-track-active" style={{ left: `${pct(value[0])}%`, width: `${pct(value[1]) - pct(value[0])}%` }} />
        <input type="range" min={min} max={safeMax} value={value[0]} className="dashboard-range-input dashboard-range-input-left"
          onChange={e => onChange([Math.min(+e.target.value, value[1] - 1), value[1]])} />
        <input type="range" min={min} max={safeMax} value={value[1]} className="dashboard-range-input dashboard-range-input-right"
          onChange={e => onChange([value[0], Math.max(+e.target.value, value[0] + 1)])} />
      </div>
      <div className="dashboard-range-bounds">
        <span>{Number(min).toLocaleString("pt-BR")}</span>
        <span>{Number(max).toLocaleString("pt-BR")}</span>
      </div>
    </div>
  )
}

const FilterBar = ({ ranges, pais, setPais, grauRange, setGrauRange, distRange, setDistRange, onClear, hasFilter }) => {
  if (!ranges) return null
  return (
    <section className="glass-card dashboard-filter-bar">
      <div className="dashboard-filter-toprow">
        <div className="dashboard-filter-heading">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="8" y1="12" x2="16" y2="12" />
            <line x1="11" y1="18" x2="13" y2="18" />
          </svg>
          Filtros do painel
        </div>
        {hasFilter && (
          <div className="dashboard-filter-actions">
            <span className="dashboard-filter-badge">
              <span className="dashboard-filter-badge-dot" />
              Filtro ativo
            </span>
            <button onClick={onClear} className="dashboard-clear-btn" type="button">
              ✕ Limpar
            </button>
          </div>
        )}
      </div>
      <p className="dashboard-filter-desc">Ajuste os intervalos para refinar os dados exibidos.</p>
      <div className="dashboard-filter-divider" />
      <div className="dashboard-filter-grid">
        <RangeSlider label="Grau (conexões)" min={ranges.grau_min} max={ranges.grau_max} value={grauRange} onChange={setGrauRange} />
        <RangeSlider label="Distância da rota (pesos)" min={ranges.dist_min} max={ranges.dist_max} value={distRange} onChange={setDistRange} />
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [weightBins, setWeightBins] = useState(30)
  const [selectedHub, setSelectedHub] = useState(null)
  const [selectedDistBand, setSelectedDistBand] = useState(null)
  const [selectedWeightBin, setSelectedWeightBin] = useState(null)
  const [ranges, setRanges] = useState(null)
  const [pais, setPais] = useState("")
  const [grauRange, setGrauRange] = useState([0, 9999])
  const [distRange, setDistRange] = useState([0, 9999999])
  const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY
  const { insight, history, loadingInsight, error: insightError, generate, ask, clearHistory } = useAIInsight(GROQ_KEY)
  const [insightOpen, setInsightOpen] = useState(false)

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
    setError(null)
    const [statsRes, routesRes, adjRes] = await Promise.allSettled([
      fetch(buildStatsUrl()).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() }),
      fetch(`${API}/api/routes`).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() }),
      fetch(`${API}/api/adjacencias`).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() }),
    ])
    const s = statsRes.status  === "fulfilled" ? statsRes.value  : null
    const r = routesRes.status === "fulfilled" ? routesRes.value : []
    const a = adjRes.status    === "fulfilled" ? adjRes.value    : []

    if (s) setStats(s); else setError(statsRes.reason?.message)
    setRoutes(r); setAdjacencias(a); setLoading(false)

    if (s) {
      const pesos = r.map(x => x.distance ?? x.weight ?? x.peso).filter(Boolean).sort((a, b) => a - b)
      generateRef.current({
        filtro: { grauRange, pesoRange: distRange },
        grafo: { vertices: s.totalV, arestas: s.totalE, grauMedio: s.grauMedio, pesoMedio: s.pesoMedio },
        topVertices: (s.topVertices || []).map(h => ({ iata: h.nome, cidade: h.nome_completo || h.nome, grau: h.grau })),
        rotas: { total: r.length, pesoMin: pesos[0] ?? 0, pesoMax: pesos[pesos.length - 1] ?? 0, mediana: Math.round(pesos[Math.floor(pesos.length / 2)] ?? 0) },
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

  const distBandRoutes = useMemo(() => {
    if (!selectedDistBand) return []
    const vals = routes.map(r => r.distance ?? r.weight ?? r.peso).filter(v => v != null && !isNaN(v)).sort((a, b) => a - b)
    if (!vals.length) return []
    const q1 = vals[Math.floor(vals.length * 0.33)], q2 = vals[Math.floor(vals.length * 0.66)]
    return routes
      .filter(r => {
        const w = r.distance ?? r.weight ?? r.peso
        if (w == null || isNaN(w)) return false
        if (selectedDistBand === "Curtas") return w <= q1
        if (selectedDistBand === "Médias") return w > q1 && w <= q2
        return w > q2
      })
      .map(r => ({ label: `${r.from} → ${r.to}`, dist: r.distance ?? r.weight ?? r.peso }))
      .sort((a, b) => (b.dist ?? 0) - (a.dist ?? 0))
  }, [selectedDistBand, routes])

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
            <p className="dashboard-header-subtitle">Indicadores, distribuição de graus e distâncias das rotas.</p>
          </div>
        </div>

        <div className="dashboard-header-ia-row">
          <button
            className="dashboard-ia-btn"
            onClick={() => setInsightOpen(true)}
            type="button"
            aria-label="Abrir painel de IA"
          >
            <span className="dashboard-ia-icon" aria-hidden="true">
              <Zap size={18} />
            </span>
            <span className="dashboard-ia-text">IA Insight</span>
            {insight && <span className="dashboard-ia-dot" />}
          </button>
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

        {/* ── Modal IA ── */}
        {insightOpen && (
          <div className="insight-modal-overlay" onClick={() => setInsightOpen(false)}>
            <div className="insight-modal insight-modal--blue" onClick={e => e.stopPropagation()}>
              <InsightPanel
                insight={insight}
                history={history}
                loading={loadingInsight}
                error={insightError}
                theme="blue"
                suggestedQuestions={SUGGESTED_QUESTIONS}
                onAsk={ask}
                onClear={clearHistory}
                onClose={() => setInsightOpen(false)}
              />
            </div>
          </div>
        )}

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
              {weightStats && !selectedWeightBin && (
                <p className="dashboard-chart-meta">
                  {routes.length.toLocaleString("pt-BR")} rotas · mín {weightStats.min.toLocaleString("pt-BR")} · máx {weightStats.max.toLocaleString("pt-BR")} · média {weightStats.mean.toLocaleString("pt-BR")} · mediana {weightStats.median.toLocaleString("pt-BR")}
                </p>
              )}
            </div>
            {selectedWeightBin
              ? <CloseBtn onClick={() => setSelectedWeightBin(null)} color="#7c3aed" />
              : <div className="dashboard-select-group">
                  <label className="dashboard-select-label">Faixas</label>
                  <select value={weightBins} onChange={e => setWeightBins(+e.target.value)} className="dashboard-select">
                    {[10, 20, 30, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
            }
          </div>
          {loading ? <Skeleton height={260} /> : selectedWeightBin ? (
            <HubDetail
              hub={`Peso ${Number(selectedWeightBin.label).toLocaleString("pt-BR")}${selectedWeightBin.label !== selectedWeightBin.rangeEnd && Math.abs(selectedWeightBin.label - selectedWeightBin.rangeEnd) > 0.01 ? ` – ${Number(selectedWeightBin.rangeEnd).toLocaleString("pt-BR")}` : ""}`}
              conexoes={(selectedWeightBin.rotas || []).map(r => ({ label: r }))}
              accent="#7c3aed"
            />
          ) : weightBinsData.length === 0 ? (
            <div className="dashboard-empty-state">Nenhuma rota carregada</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={weightBinsData} margin={{ top: 4, right: 8, left: 0, bottom: 24 }}
                onClick={e => e?.activePayload?.[0] && setSelectedWeightBin(e.activePayload[0].payload)}
                style={{ cursor: "pointer" }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9ca3af" }} tickFormatter={v => Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} interval="preserveStartEnd" label={{ value: "Distância (peso)", position: "insideBottom", offset: -16, fontSize: 11, fill: "#9ca3af" }} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} label={{ value: "Rotas", angle: -90, position: "insideLeft", offset: 12, fontSize: 11, fill: "#9ca3af" }} />
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0].payload
                  return <TT><TTHead c={Number(d.label).toLocaleString("pt-BR")} /><TTVal c={`${d.count} rotas`} /><p style={{ fontSize: 10, color: "#7c3aed", marginTop: 4 }}>Clique para ver rotas</p></TT>
                }} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
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
                {!selectedDistBand && <p className="dashboard-chart-meta">Segmentação relativa entre rotas curtas, médias e longas.</p>}
              </div>
              {selectedDistBand && <CloseBtn onClick={() => setSelectedDistBand(null)} color="#0891b2" />}
            </div>
            {loading ? <Skeleton /> : selectedDistBand ? (
              <HubDetail
                hub={selectedDistBand}
                conexoes={distBandRoutes}
                accent={routeDistanceProfile.find(r => r.name === selectedDistBand)?.color ?? "#0891b2"}
              />
            ) : routeDistanceProfile.length === 0 ? (
              <div className="dashboard-empty-state">Nenhuma rota carregada.</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Tooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    return (
                      <TT>
                        <TTHead c={payload[0].name} />
                        <TTVal c={Number(payload[0].value).toLocaleString("pt-BR")} />
                        <p style={{ fontSize: 10, color: "#0891b2", marginTop: 4 }}>Clique para ver rotas</p>
                      </TT>
                    )
                  }} />
                  <Legend verticalAlign="bottom" height={36} formatter={(v, e) => <span style={{ color: e.color, fontWeight: 700 }}>{v}</span>} />
                  <Pie
                    data={routeDistanceProfile}
                    dataKey="value"
                    nameKey="name"
                    cx="50%" cy="46%"
                    innerRadius={58} outerRadius={100}
                    paddingAngle={3}
                    style={{ cursor: "pointer" }}
                    onClick={e => e?.name && setSelectedDistBand(e.name)}
                  >
                    {routeDistanceProfile.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                </PieChart>
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

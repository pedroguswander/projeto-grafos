import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { AlertCircle, Loader2 } from "lucide-react"
import {
  AreaChart, Area, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts"
import logoCompleta from "../assets/logo-2/logo-branca-completa2.png"
import "../css/DashboardETN.css"
import InsightPanel from "../../components/InsightPanel"
import { useAIInsightETN } from "../hooks/useAIInsightETN"

const API = "http://localhost:5000"

const PALETTE = [
  "#26c281",
  "#2fbf9b",
  "#36d699",
  "#1f9d7a",
  "#63d9b1",
  "#2fa37f",
  "#7be0bf",
  "#1a7f64",
  "#54cfa8",
  "#8be7ca",
]

const TICK_ETN = { fontSize: 11, fill: "#9fc7b8" }
const GRID = "rgba(255,255,255,0.06)"

// ─── Weight Bins ───────────────────────────────────────────────
function buildWeightBins(arestas, numBins) {
  const entries = arestas
    .map(a => ({
      w: a.peso ?? a.weight ?? a.distance,
      label: a.origem && a.destino
        ? `${a.origem} – ${a.destino}`
        : a.source && a.target
          ? `${a.source} – ${a.target}`
          : null,
    }))
    .filter(e => e.w != null && !isNaN(e.w))

  if (!entries.length) return []

  if (entries.every(e => Number.isInteger(Number(e.w)))) {
    const map = new Map()
    entries.forEach(({ w, label }) => {
      const weight = Number(w)
      if (!map.has(weight)) {
        map.set(weight, { label: weight, rangeEnd: weight, count: 0, arestas: [] })
      }
      const bin = map.get(weight)
      bin.count++
      if (label && !bin.arestas.includes(label)) bin.arestas.push(label)
    })
    return Array.from(map.values()).sort((a, b) => a.label - b.label)
  }

  const weights = entries.map(e => Number(e.w))
  const mn = Math.min(...weights)
  const mx = Math.max(...weights)
  const step = (mx - mn) / numBins || 1

  const bins = Array.from({ length: numBins }, (_, i) => ({
    label: parseFloat((mn + i * step).toFixed(2)),
    rangeEnd: parseFloat((mn + (i + 1) * step).toFixed(2)),
    count: 0,
    arestas: [],
  }))

  entries.forEach(({ w, label }) => {
    const idx = Math.min(Math.floor((Number(w) - mn) / step), numBins - 1)
    if (idx >= 0) {
      bins[idx].count++
      if (label && !bins[idx].arestas.includes(label)) bins[idx].arestas.push(label)
    }
  })

  return bins
}

// ─── UI Atoms ──────────────────────────────────────────────────
const KPICard = ({ title, value, sub, loading, accent }) => (
  <div className="dashboard-etn-kpi-card">
    <p className="dashboard-etn-kpi-title">{title}</p>
    {loading ? (
      <div className="dashboard-etn-skeleton-pulse" />
    ) : (
      <p
        className="dashboard-etn-kpi-value"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </p>
    )}
    {sub && <p className="dashboard-etn-kpi-sub">{sub}</p>}
  </div>
)

const Skeleton = ({ height = 280 }) => (
  <div className="dashboard-etn-skeleton-chart" style={{ height }}>
    <Loader2 size={24} className="animate-spin dashboard-etn-skeleton-icon" />
  </div>
)

const ErrorBanner = ({ msg }) => (
  <div className="dashboard-etn-error-banner">
    <AlertCircle size={18} />
    <div>
      <p className="dashboard-etn-error-title">Falha ao conectar com a API</p>
      <p className="dashboard-etn-error-text">{msg} — Flask rodando em {API}?</p>
    </div>
  </div>
)

const WinnerBadge = ({ winner }) => (
  <span className={`dashboard-etn-winner-badge ${winner === "BFS" ? "bfs" : "dfs"}`}>
    <Zap size={10} />
    {winner}
  </span>
)

const CloseBtn = ({ onClick }) => (
  <button onClick={onClick} type="button" className="dashboard-etn-close-btn">
    ✕ Fechar
  </button>
)

// ─── Tooltip Helpers ───────────────────────────────────────────
const TT = ({ cls = "", children }) => (
  <div className={`dashboard-etn-custom-tooltip ${cls}`}>{children}</div>
)
const TTH = ({ c }) => <p className="dashboard-etn-tooltip-heading">{c}</p>
const TTV = ({ c }) => <p className="dashboard-etn-tooltip-value">{c}</p>
const TTL = ({ c }) => <p className="dashboard-etn-tooltip-label">{c}</p>
const TTList = ({ items }) => (
  <div className="dashboard-etn-tooltip-list">
    {items.map((r, i) => (
      <div key={i}>• {r}</div>
    ))}
  </div>
)

const ComparisonTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <TT cls="dashboard-etn-comparison-tooltip">
      <p className="dashboard-etn-comparison-tooltip-title">Source: {label}</p>
      {payload.map((p, i) => (
        <div key={i} className="dashboard-etn-comparison-row">
          <span style={{ color: p.color }}>{p.name}</span>
          <span>{(p.value * 1000).toFixed(4)} ms</span>
        </div>
      ))}
      {payload.length === 2 && (
        <p className="dashboard-etn-comparison-delta">
          Δ {Math.abs((payload[0].value - payload[1].value) * 1000).toFixed(4)} ms
        </p>
      )}
    </TT>
  )
}

// ─── Complex Sub-components ────────────────────────────────────
const ComparisonTable = ({ rows }) => (
  <div className="dashboard-etn-table-wrap">
    <table className="dashboard-etn-table">
      <thead>
        <tr>
          {["Source", "BFS (ms)", "Camadas", "DFS (ms)", "Ciclos", "Árv.", "Back", "Δ (ms)", "Mais rápido"].map(h => (
            <th key={h}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            <td className="dashboard-etn-table-strong">{row.source}</td>
            <td className="dashboard-etn-table-bfs">{(row.bfs.tempo_segundos * 1000).toFixed(4)}</td>
            <td>{row.bfs.num_camadas}</td>
            <td className="dashboard-etn-table-dfs">{(row.dfs.tempo_segundos * 1000).toFixed(4)}</td>
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
  const safeMax = max > min ? max : min + 1
  const pct = v => ((v - min) / (safeMax - min)) * 100

  return (
    <div className="dashboard-etn-range-slider">
      <div className="dashboard-etn-range-header">
        <span className="dashboard-etn-range-label">{label}</span>
        <span className="dashboard-etn-range-value">
          {value[0].toLocaleString("pt-BR")} – {value[1].toLocaleString("pt-BR")}
        </span>
      </div>

      <div className="dashboard-etn-range-track-wrap">
        <div className="dashboard-etn-range-track-bg" />
        <div
          className="dashboard-etn-range-track-fill"
          style={{
            left: `${pct(value[0])}%`,
            width: `${pct(value[1]) - pct(value[0])}%`,
          }}
        />
        <input
          type="range" min={min} max={safeMax} value={value[0]}
          onChange={e => onChange([Math.min(+e.target.value, value[1] - 1), value[1]])}
          className="dashboard-etn-range-input range-a"
        />
        <input
          type="range" min={min} max={safeMax} value={value[1]}
          onChange={e => onChange([value[0], Math.max(+e.target.value, value[0] + 1)])}
          className="dashboard-etn-range-input range-b"
        />
      </div>

      <div className="dashboard-etn-range-bounds">
        <span>{Number(min).toLocaleString("pt-BR")}</span>
        <span>{Number(max).toLocaleString("pt-BR")}</span>
      </div>
    </div>
  )
}

const FilterBar = ({
  ranges,
  grauRange,
  setGrauRange,
  pesoRange,
  setPesoRange,
  onClear,
  hasFilter,
}) => {
  if (!ranges) return null

  const hasGrau = ranges.grau_min != null && ranges.grau_max != null
  const hasPeso = ranges.peso_min != null && ranges.peso_max != null
  if (!hasGrau && !hasPeso) return null

  return (
    <section className="glass-card-etn dashboard-etn-filter-bar">
      <div className="dashboard-etn-filter-toprow">
        <div className="dashboard-etn-filter-heading">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="8" y1="12" x2="16" y2="12" />
            <line x1="11" y1="18" x2="13" y2="18" />
          </svg>
          Filtros do painel
        </div>

        {hasFilter && (
          <div className="dashboard-etn-filter-actions">
            <span className="dashboard-etn-filter-badge">
              <span className="dashboard-etn-filter-badge-dot" />
              Filtro ativo
            </span>
            <button onClick={onClear} className="dashboard-etn-clear-btn" type="button">
              ✕ Limpar
            </button>
          </div>
        )}
      </div>

      <p className="dashboard-etn-filter-desc">
        Ajuste os intervalos para refinar os dados exibidos nos indicadores e gráficos.
      </p>

      <div className="dashboard-etn-filter-divider" />

      <div className="dashboard-etn-filter-controls">
        {hasGrau && (
          <RangeSlider
            label="Grau (conexões)"
            min={ranges.grau_min}
            max={ranges.grau_max}
            value={grauRange}
            onChange={setGrauRange}
          />
        )}
        {hasPeso && (
          <RangeSlider
            label="Peso da rota"
            min={ranges.peso_min}
            max={ranges.peso_max}
            value={pesoRange}
            onChange={setPesoRange}
          />
        )}
      </div>
    </section>
  )
}

// ─── Main Component ────────────────────────────────────────────
export const DashboardETN = ({ onBack }) => {
  const [stats, setStats] = useState(null)
  const [arestas, setArestas] = useState([])
  const [vertices, setVertices] = useState([])
  const [bfsDfs, setBfsDfs] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [bfsErr, setBfsErr] = useState(null)
  const [view, setView] = useState("chart")
  const [weightBins, setWeightBins] = useState(30)
  const [selectedHub, setSelectedHub] = useState(null)
  const [selectedPais, setSelectedPais] = useState(null)
  const [selectedRegiao, setSelectedRegiao] = useState(null)
  const [selectedWeightBin, setSelectedWeightBin] = useState(null)
  const [selectedRegioDistrib, setSelectedRegioDistrib] = useState(null)
  const [ranges, setRanges] = useState(null)
  const [grauRange, setGrauRange] = useState([0, 9999])
  const [pesoRange, setPesoRange] = useState([-9999999, 9999999])

  const { insight, loadingInsight, generate } = useAIInsightETN()

  const hasFilter = !!(
    (ranges && grauRange[0] > ranges.grau_min) ||
    (ranges && grauRange[1] < ranges.grau_max) ||
    (ranges && pesoRange[0] > ranges.peso_min) ||
    (ranges && pesoRange[1] < ranges.peso_max)
  )

  const buildStatsUrl = useCallback(() => {
    const p = new URLSearchParams()
    if (ranges && grauRange[0] > ranges.grau_min) p.set("grau_min", grauRange[0])
    if (ranges && grauRange[1] < ranges.grau_max) p.set("grau_max", grauRange[1])
    if (ranges && pesoRange[0] > ranges.peso_min) p.set("peso_min", pesoRange[0])
    if (ranges && pesoRange[1] < ranges.peso_max) p.set("peso_max", pesoRange[1])
    const qs = p.toString()
    return `${API}/api/dashboard-stats/etn/filtrado${qs ? "?" + qs : ""}`
  }, [grauRange, pesoRange, ranges])

  const generateRef = useRef(generate)
  useEffect(() => { generateRef.current = generate }, [generate])

  const fetchAll = useCallback(async () => {
    setError(null)
    setBfsErr(null)

    const [statsRes, arestasRes, verticesRes] = await Promise.allSettled([
      fetch(buildStatsUrl()).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() }),
      fetch(`${API}/api/etn/arestas`).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() }),
      fetch(`${API}/api/etn/vertices`).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() }),
    ])

    const statsData = statsRes.status === "fulfilled" ? statsRes.value : null
    const arestasData = arestasRes.status === "fulfilled" ? arestasRes.value : []
    const verticesData = verticesRes.status === "fulfilled" ? verticesRes.value : []

    if (statsData) setStats(statsData)
    else setError(statsRes.reason?.message)

    setArestas(arestasData)
    setVertices(verticesData)
    setLoading(false)

    if (statsData) {
      generateRef.current({
        filtro: { grauRange, pesoRange },
        grafo: {
          vertices: statsData.totalV,
          arestas: statsData.totalE,
          grauMedio: statsData.grauMedio,
          pesoMedio: statsData.pesoMedio,
        },
        topVertices: (statsData.topVertices || []).map(v => ({
          codigo: v.nome,
          nome: v.nome_completo || v.nome,
          grau: v.grau,
        })),
        rotas: {
          total: statsData.totalE,
          rotasNegativas: statsData.rotasDeficitarias ?? 0,
          percNegativas: statsData.percDeficitarias != null ? statsData.percDeficitarias + "%" : "0%",
          pesoMin: statsData.pesoMin ?? 0,
          pesoMax: statsData.pesoMax ?? 0,
          pesoMedioPositivo: statsData.pesoMedioPositivo ?? 0,
        },
      })
    }
  }, [buildStatsUrl, grauRange, pesoRange])

  useEffect(() => {
    fetch(`${API}/api/dashboard-stats/etn/filtros`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setRanges(data)
          setGrauRange([data.grau_min, data.grau_max])
          setPesoRange([data.peso_min, data.peso_max])
        }
      })
      .catch(() => {})
  }, [])

  const debounceRef = useRef(null)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(fetchAll, 400)
    return () => clearTimeout(debounceRef.current)
  }, [fetchAll])

  const d = stats || {}
  const comparacoes = bfsDfs?.comparacoes || []
  const chartData = comparacoes.map(r => ({
    source: r.source,
    BFS: r.bfs.tempo_segundos,
    DFS: r.dfs.tempo_segundos,
  }))

  const bfsWins = comparacoes.filter(r => r.mais_rapido === "BFS").length
  const dfsWins = comparacoes.filter(r => r.mais_rapido === "DFS").length

  const avgDelta = comparacoes.length
    ? (comparacoes.reduce((s, r) => s + Math.abs(r.delta_tempo_ms), 0) / comparacoes.length).toFixed(4)
    : "—"

  const weightBinsData = useMemo(() => buildWeightBins(arestas, weightBins), [arestas, weightBins])

  const weightStats = useMemo(() => {
    const vals = arestas
      .map(a => parseFloat(a.peso ?? a.weight ?? a.distance))
      .filter(v => !isNaN(v))

    if (!vals.length) return null

    const sorted = [...vals].sort((a, b) => a - b)
    return {
      total: vals.length,
      min: Math.round(sorted[0]),
      max: Math.round(sorted[sorted.length - 1]),
      mean: Math.round(vals.reduce((s, v) => s + v, 0) / vals.length),
      median: Math.round(sorted[Math.floor(sorted.length / 2)]),
    }
  }, [arestas])

  const vertexMap = useMemo(() => {
    const m = new Map()
    vertices.forEach(v => m.set(v.UNLocode, v.name || v.UNLocode))
    return m
  }, [vertices])

  const topRotasPeso = useMemo(() => (
    [...arestas]
      .map(a => ({
        label: `${vertexMap.get(a.origem) || a.origem} → ${vertexMap.get(a.destino) || a.destino}`,
        peso: parseFloat(a.peso ?? 0),
      }))
      .filter(a => !isNaN(a.peso))
      .sort((a, b) => b.peso - a.peso)
      .slice(0, 10)
  ), [arestas, vertexMap])

  const portosPorPais = useMemo(() => {
    const m = new Map()
    vertices.forEach(v => {
      const pais = v.Country || "Desconhecido"
      if (!m.has(pais)) m.set(pais, [])
      m.get(pais).push({ code: v.UNLocode, name: v.name || v.UNLocode })
    })

    return Array.from(m.entries())
      .map(([nome, portos]) => ({ nome, valor: portos.length, portos }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 12)
  }, [vertices])

  const balancoPorRegiao = useMemo(() => {
    const m = new Map()

    arestas.forEach(a => {
      const peso = parseFloat(a.peso ?? 0)
      if (isNaN(peso)) return

      const regiao = vertices.find(v => v.UNLocode === a.origem)?.D_Region || "Desconhecida"

      if (!m.has(regiao)) {
        m.set(regiao, {
          lucrativas: 0,
          deficitarias: 0,
          rotasLucr: [],
          rotasDef: [],
        })
      }

      const e = m.get(regiao)
      const label = `${vertexMap.get(a.origem) || a.origem} → ${vertexMap.get(a.destino) || a.destino}`

      if (peso >= 0) {
        e.lucrativas++
        e.rotasLucr.push(label)
      } else {
        e.deficitarias++
        e.rotasDef.push(label)
      }
    })

    return Array.from(m.entries())
      .map(([nome, v]) => ({ nome, ...v }))
      .sort((a, b) => (b.lucrativas + b.deficitarias) - (a.lucrativas + a.deficitarias))
  }, [arestas, vertices, vertexMap])

  return (
    <div className="dashboard-etn-page">
      <header className="dashboard-etn-top-header">
        <div className="dashboard-etn-topbar">
          <button onClick={onBack} className="dashboard-etn-back-btn" type="button" title="Voltar">
            <span className="dashboard-etn-back-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="18" height="18">
                <path d="M15 6L9 12L15 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="dashboard-etn-back-text">Voltar</span>
          </button>
        </div>

        <div className="dashboard-etn-header">
          <div className="dashboard-etn-header-brand">
            <img src={logoCompleta} alt="Logo ETN" className="dashboard-etn-header-logo" />
          </div>
          <div className="dashboard-etn-header-content">
            <h1 className="dashboard-etn-header-title">Dashboard Analítico ETN</h1>
            <p className="dashboard-etn-header-subtitle">
              Indicadores da rede ETN, distribuição de graus, distribuição por região e pesos das arestas.
            </p>
          </div>
        </div>
      </header>

      <div className="dashboard-etn-shell">
        <main className="dashboard-etn-main">
          {error && <ErrorBanner msg={error} />}

          <FilterBar
            ranges={ranges}
            grauRange={grauRange}
            setGrauRange={setGrauRange}
            pesoRange={pesoRange}
            setPesoRange={setPesoRange}
            hasFilter={hasFilter}
            onClear={() => {
              if (ranges) {
                setGrauRange([ranges.grau_min, ranges.grau_max])
                setPesoRange([ranges.peso_min, ranges.peso_max])
              }
            }}
          />

          <InsightPanel insight={insight} loading={loadingInsight} theme="green" />

          <section className="dashboard-etn-kpi-grid">
            <KPICard loading={loading} title="Vértices (Portos)" value={d.totalV?.toLocaleString("pt-BR") || "—"} />
            <KPICard loading={loading} title="Arestas (Rotas)" value={d.totalE?.toLocaleString("pt-BR") || "—"} />
            <KPICard loading={loading} title="Grau Médio" value={d.grauMedio != null ? Number(d.grauMedio).toFixed(2) : "—"} sub="conexões por porto" />
            <KPICard loading={loading} title="Peso Médio (geral)" value={d.pesoMedio?.toLocaleString("pt-BR") || "—"} sub="incluindo rotas deficitárias" />
            <KPICard loading={loading} title="Peso Médio (positivo)" value={d.pesoMedioPositivo?.toLocaleString("pt-BR") || "—"} sub="apenas rotas lucrativas" accent="#63d9b1" />
            <KPICard
              loading={loading}
              title="Rotas Deficitárias"
              value={d.rotasDeficitarias != null ? `${d.rotasDeficitarias.toLocaleString("pt-BR")} (${d.percDeficitarias}%)` : "—"}
              sub="peso negativo"
              accent="#f87171"
            />
          </section>

          <section className="dashboard-etn-chart-row">
            <div className="glass-card dashboard-etn-chart-card">
              <div className="dashboard-etn-chart-header">
                <h3 className="dashboard-etn-chart-title">Distribuição de Graus</h3>
              </div>
              {loading ? <Skeleton /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={d.distribuicaoGraus || []}>
                    <defs>
                      <linearGradient id="gradGrauETN" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#36d699" stopOpacity={0.26} />
                        <stop offset="95%" stopColor="#36d699" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
                    <XAxis dataKey="grau" tick={TICK_ETN} />
                    <YAxis tick={TICK_ETN} />
                    <Tooltip content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      const data = payload[0].payload
                      return (
                        <TT cls="dashboard-etn-tooltip-wide">
                          <TTH c={`Grau ${label}`} />
                          <TTL c={`${data.quantidade} vértices`} />
                          <TTList items={data.vertices || []} />
                        </TT>
                      )
                    }} />
                    <Area
                      type="monotone"
                      dataKey="quantidade"
                      stroke="#36d699"
                      strokeWidth={2}
                      fill="url(#gradGrauETN)"
                      dot={{ r: 3, fill: "#36d699" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="glass-card dashboard-etn-chart-card">
              <div className="dashboard-etn-chart-header">
                <h3 className="dashboard-etn-chart-title">Top 10 Hubs</h3>
                {selectedHub && <CloseBtn onClick={() => setSelectedHub(null)} />}
              </div>

              {loading ? <Skeleton /> : selectedHub ? (
                <div className="dashboard-etn-detail-panel">
                  <p className="dashboard-etn-detail-title">
                    {selectedHub.nome_completo || selectedHub.nome} — {selectedHub.grau} conexões
                  </p>
                  <div className="dashboard-etn-detail-list">
                    {(selectedHub.conexoes || []).map((c, i) => (
                      <div key={i} className="dashboard-etn-detail-item">
                        → {vertexMap.get(c) ? `${vertexMap.get(c)} (${c})` : c}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={(d.topVertices || []).map(v => ({ ...v, label: v.nome_completo || v.nome }))}
                    layout="vertical"
                    onClick={e => e?.activePayload?.[0] && setSelectedHub(e.activePayload[0].payload)}
                    style={{ cursor: "pointer" }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={GRID} />
                    <XAxis type="number" tick={TICK_ETN} />
                    <YAxis dataKey="label" type="category" width={110} tick={{ fontSize: 10, fill: "#9fc7b8" }} />
                    <Tooltip content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const v = payload[0].payload
                      return (
                        <TT>
                          <TTH c={`${v.nome_completo || v.nome} (${v.nome})`} />
                          <TTV c={`${v.grau} conexões`} />
                          <p className="dashboard-etn-tooltip-click">Clique para ver destinos</p>
                        </TT>
                      )
                    }} />
                    <Bar dataKey="grau" radius={[0, 6, 6, 0]}>
                      {(d.topVertices || []).map((_, i) => (
                        <Cell key={i} fill={`rgba(54,214,153,${0.92 - i * 0.07})`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          <section className="glass-card dashboard-etn-chart-card">
            <div className="dashboard-etn-chart-header">
              <h3 className="dashboard-etn-chart-title">Distribuição por Região</h3>
              {selectedRegioDistrib && <CloseBtn onClick={() => setSelectedRegioDistrib(null)} />}
            </div>

            {loading ? <Skeleton height={260} /> : selectedRegioDistrib ? (
              <div className="dashboard-etn-detail-panel">
                <p className="dashboard-etn-detail-title">
                  {selectedRegioDistrib.nome} — {selectedRegioDistrib.valor} porto(s)
                </p>
                <div className="dashboard-etn-detail-list">
                  {vertices.filter(v => v.D_Region === selectedRegioDistrib.nome).map((v, i) => (
                    <div key={i} className="dashboard-etn-detail-item">
                      {v.name || v.UNLocode} <span className="dashboard-etn-detail-muted">({v.UNLocode})</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(260, (d.distribuicaoRegiao || []).slice(0, 10).length * 36)}>
                <BarChart
                  data={(d.distribuicaoRegiao || []).slice(0, 10)}
                  layout="vertical"
                  margin={{ top: 4, right: 60, left: 8, bottom: 4 }}
                  onClick={e => e?.activePayload?.[0] && setSelectedRegioDistrib(e.activePayload[0].payload)}
                  style={{ cursor: "pointer" }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={GRID} />
                  <XAxis type="number" tick={TICK_ETN} axisLine={false} tickLine={false} />
                  <YAxis dataKey="nome" type="category" width={130} tick={{ fontSize: 12, fill: "#dff7ee", fontWeight: 500 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.035)" }}
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      return (
                        <TT>
                          <TTH c={label} />
                          <TTV c={`${Number(payload[0].value).toLocaleString("pt-BR")} portos`} />
                          <p className="dashboard-etn-tooltip-click">Clique para ver portos</p>
                        </TT>
                      )
                    }}
                  />
                  <Bar dataKey="valor" radius={[0, 6, 6, 0]} maxBarSize={22} label={{ position: "right", fill: "#9fc7b8", fontSize: 11, fontWeight: 700 }}>
                    {(d.distribuicaoRegiao || []).slice(0, 10).map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </section>

          <section className="glass-card dashboard-etn-chart-card">
            <div className="dashboard-etn-chart-header dashboard-etn-chart-header-wrap">
              <div>
                <h3 className="dashboard-etn-chart-title">Distribuição de Pesos das Arestas</h3>
                {weightStats && !selectedWeightBin && (
                  <p className="dashboard-etn-chart-meta">
                    {weightStats.total.toLocaleString("pt-BR")} arestas · mín {weightStats.min.toLocaleString("pt-BR")} · máx {weightStats.max.toLocaleString("pt-BR")} · média {weightStats.mean.toLocaleString("pt-BR")} · mediana {weightStats.median.toLocaleString("pt-BR")}
                  </p>
                )}
              </div>

              {selectedWeightBin ? (
                <CloseBtn onClick={() => setSelectedWeightBin(null)} />
              ) : (
                <div className="dashboard-etn-select-group">
                  <label className="dashboard-etn-select-label">Faixas</label>
                  <select value={weightBins} onChange={e => setWeightBins(+e.target.value)} className="dashboard-etn-select">
                    {[10, 20, 30, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              )}
            </div>

            {loading ? <Skeleton height={260} /> : selectedWeightBin ? (
              <div className="dashboard-etn-detail-panel">
                <p className="dashboard-etn-detail-title">
                  Peso {Number(selectedWeightBin.label).toLocaleString("pt-BR")}
                  {Math.abs(selectedWeightBin.label - selectedWeightBin.rangeEnd) > 0.01
                    ? ` – ${Number(selectedWeightBin.rangeEnd).toLocaleString("pt-BR")}`
                    : ""}
                  {" "}— {selectedWeightBin.count} aresta(s)
                </p>
                <div className="dashboard-etn-detail-list">
                  {(selectedWeightBin.arestas || []).map((r, i) => (
                    <div key={i} className="dashboard-etn-detail-item">• {r}</div>
                  ))}
                </div>
              </div>
            ) : weightBinsData.length === 0 ? (
              <div className="dashboard-etn-empty-state">Nenhuma aresta com peso carregada</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={weightBinsData}
                  margin={{ top: 4, right: 8, left: 0, bottom: 24 }}
                  onClick={e => e?.activePayload?.[0] && setSelectedWeightBin(e.activePayload[0].payload)}
                  style={{ cursor: "pointer" }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "#9fc7b8" }}
                    tickFormatter={v => Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
                    interval="preserveStartEnd"
                    label={{ value: "Peso", position: "insideBottom", offset: -16, fontSize: 11, fill: "#9fc7b8" }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#9fc7b8" }}
                    label={{ value: "Arestas", angle: -90, position: "insideLeft", offset: 12, fontSize: 11, fill: "#9fc7b8" }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const d = payload[0].payload
                      return (
                        <TT>
                          <TTH c={Number(d.label).toLocaleString("pt-BR")} />
                          <TTV c={`${d.count} arestas`} />
                          <p className="dashboard-etn-tooltip-click">Clique para ver arestas</p>
                        </TT>
                      )
                    }}
                    cursor={{ fill: "rgba(255,255,255,0.035)" }}
                  />
                  <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                    {weightBinsData.map((_, i) => (
                      <Cell key={i} fill={`rgba(54,214,153,${0.36 + 0.48 * (i / weightBinsData.length)})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </section>

          <section className="glass-card dashboard-etn-chart-card">
            <div className="dashboard-etn-chart-header dashboard-etn-chart-header-wrap">
              <div>
                <h3 className="dashboard-etn-chart-title">Comparação de Tempo — BFS vs DFS</h3>
                {bfsDfs && <p className="dashboard-etn-chart-meta">{bfsDfs.total_comparacoes} nós comparados</p>}
              </div>

              <div className="dashboard-etn-view-toggle">
                {[{ id: "chart", label: "Gráfico" }, { id: "table", label: "Tabela" }].map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => setView(id)}
                    className={`dashboard-etn-view-btn ${view === id ? "active" : ""}`}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {bfsErr && (
              <div className="dashboard-etn-inline-error">
                <AlertCircle size={15} /> Falha: {bfsErr}
              </div>
            )}

            {bfsDfs && (
              <div className="dashboard-etn-mini-stats">
                {[
                  { label: "BFS mais rápido", value: bfsWins, color: "bfs" },
                  { label: "DFS mais rápido", value: dfsWins, color: "dfs" },
                  { label: "Δ médio", value: `${avgDelta} ms`, color: "accent" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="dashboard-etn-mini-stat-card">
                    <div>
                      <p className="dashboard-etn-mini-stat-label">{label}</p>
                      <p className={`dashboard-etn-mini-stat-value ${color}`}>{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!bfsDfs && !bfsErr ? (
              <Skeleton height={300} />
            ) : chartData.length > 0 && (
              view === "chart" ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }} barCategoryGap="30%" barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="source" tick={{ fontSize: 11, fill: "#9fc7b8", fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => `${(v * 1000).toFixed(2)}ms`} tick={{ fontSize: 10, fill: "#88af9f" }} axisLine={false} tickLine={false} width={68} />
                    <Tooltip content={<ComparisonTooltip />} cursor={{ fill: "rgba(255,255,255,0.035)" }} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} formatter={v => <span style={{ color: v === "BFS" ? "#2fbf9b" : "#63d9b1", fontWeight: 700 }}>{v}</span>} />
                    <Bar dataKey="BFS" fill="#2fbf9b" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="DFS" fill="#63d9b1" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ComparisonTable rows={comparacoes} />
              )
            )}
          </section>

          <section className="dashboard-etn-chart-row">
            <div className="glass-card dashboard-etn-chart-card">
              <div className="dashboard-etn-chart-header">
                <h3 className="dashboard-etn-chart-title">Top 10 Rotas por Peso</h3>
                <p className="dashboard-etn-chart-meta">Rotas com maior peso (lucratividade) na rede.</p>
              </div>

              {loading ? <Skeleton /> : topRotasPeso.length === 0 ? (
                <div className="dashboard-etn-empty-state">Sem dados de arestas.</div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topRotasPeso} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.06)" />
                    <XAxis type="number" tick={TICK_ETN} tickFormatter={v => v.toLocaleString("pt-BR")} />
                    <YAxis dataKey="label" type="category" width={200} tick={TICK_ETN} />
                    <Tooltip content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      return (
                        <TT>
                          <TTH c={payload[0].payload.label} />
                          <TTV c={`Peso: ${Number(payload[0].value).toLocaleString("pt-BR")}`} />
                        </TT>
                      )
                    }} />
                    <Bar dataKey="peso" radius={[0, 6, 6, 0]}>
                      {topRotasPeso.map((item, i) => (
                        <Cell key={i} fill={item.peso >= 0 ? `rgba(54,214,153,${0.92 - i * 0.07})` : "#f87171"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="glass-card dashboard-etn-chart-card">
              <div className="dashboard-etn-chart-header">
                <h3 className="dashboard-etn-chart-title">Portos por País</h3>
                <p className="dashboard-etn-chart-meta">Quantidade de portos por país na rede ETN.</p>
                {selectedPais && <CloseBtn onClick={() => setSelectedPais(null)} />}
              </div>

              {loading ? <Skeleton /> : selectedPais ? (
                <div className="dashboard-etn-detail-panel">
                  <p className="dashboard-etn-detail-title">
                    {selectedPais.nome} — {selectedPais.valor} porto(s)
                  </p>
                  <div className="dashboard-etn-detail-list">
                    {selectedPais.portos.map((p, i) => (
                      <div key={i} className="dashboard-etn-detail-item">
                        {p.name} <span className="dashboard-etn-detail-muted">({p.code})</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : portosPorPais.length === 0 ? (
                <div className="dashboard-etn-empty-state">Sem dados de vértices.</div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={portosPorPais}
                    layout="vertical"
                    margin={{ top: 4, right: 40, left: 8, bottom: 4 }}
                    onClick={e => e?.activePayload?.[0] && setSelectedPais(e.activePayload[0].payload)}
                    style={{ cursor: "pointer" }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.06)" />
                    <XAxis type="number" tick={TICK_ETN} />
                    <YAxis dataKey="nome" type="category" width={100} tick={TICK_ETN} />
                    <Tooltip content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      return (
                        <TT>
                          <TTH c={label} />
                          <TTV c={`${payload[0].value} porto(s)`} />
                          <p className="dashboard-etn-tooltip-click">Clique para ver portos</p>
                        </TT>
                      )
                    }} />
                    <Bar dataKey="valor" radius={[0, 6, 6, 0]} label={{ position: "right", fill: "#9fc7b8", fontSize: 10 }}>
                      {portosPorPais.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          <section className="glass-card dashboard-etn-chart-card">
            <div className="dashboard-etn-chart-header">
              <div>
                <h3 className="dashboard-etn-chart-title">Balanço por Região — Lucrativas vs Deficitárias</h3>
                <p className="dashboard-etn-chart-meta">Rotas positivas e negativas por região. Clique para ver as rotas.</p>
              </div>
              {selectedRegiao && <CloseBtn onClick={() => setSelectedRegiao(null)} />}
            </div>

            {loading ? <Skeleton height={300} /> : selectedRegiao ? (
              <div className="dashboard-etn-detail-panel">
                <p className="dashboard-etn-detail-title">{selectedRegiao.nome}</p>
                <div className="dashboard-etn-detail-grid">
                  <div>
                    <p className="dashboard-etn-detail-section-title ok">
                      ✔ Lucrativas ({selectedRegiao.lucrativas})
                    </p>
                    <div className="dashboard-etn-detail-list small">
                      {selectedRegiao.rotasLucr.map((r, i) => (
                        <div key={i} className="dashboard-etn-detail-item ok-bg">{r}</div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="dashboard-etn-detail-section-title danger">
                      ✖ Deficitárias ({selectedRegiao.deficitarias})
                    </p>
                    <div className="dashboard-etn-detail-list small">
                      {selectedRegiao.rotasDef.map((r, i) => (
                        <div key={i} className="dashboard-etn-detail-item danger-bg">{r}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : balancoPorRegiao.length === 0 ? (
              <div className="dashboard-etn-empty-state">Sem dados de balanço.</div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(300, balancoPorRegiao.length * 42)}>
                <BarChart
                  data={balancoPorRegiao}
                  layout="vertical"
                  margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
                  barGap={2}
                  onClick={e => e?.activePayload?.[0] && setSelectedRegiao(e.activePayload[0].payload)}
                  style={{ cursor: "pointer" }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.06)" />
                  <XAxis type="number" tick={TICK_ETN} />
                  <YAxis dataKey="nome" type="category" width={180} tick={TICK_ETN} />
                  <Tooltip content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    return (
                      <TT>
                        <TTH c={label} />
                        {payload.map((p, i) => (
                          <p key={i} style={{ color: p.color }}>{p.name}: {p.value}</p>
                        ))}
                        <p className="dashboard-etn-tooltip-click">Clique para ver rotas</p>
                      </TT>
                    )
                  }} />
                  <Legend formatter={v => <span style={{ color: v === "lucrativas" ? "#63d9b1" : "#f87171", fontWeight: 700 }}>{v}</span>} />
                  <Bar dataKey="lucrativas" fill="#63d9b1" radius={[0, 4, 4, 0]} maxBarSize={18} />
                  <Bar dataKey="deficitarias" fill="#f87171" radius={[0, 4, 4, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </section>
        </main>
      </div>
    </div>
  )

}

export default DashboardETN
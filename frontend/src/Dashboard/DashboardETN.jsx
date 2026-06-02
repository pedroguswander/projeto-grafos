import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { RefreshCw, AlertCircle, Loader2, Zap } from "lucide-react"
import {
  AreaChart, Area, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts"
import logoCompleta from "../assets/logo-2/logo-branca-completa2.png"
import "../css/DashboardETN.css"

const API = "http://localhost:5000"

const PALETTE = [
  "#26c281",
  "#34d399",
  "#10b981",
  "#22c55e",
  "#6ee7b7",
  "#059669",
  "#4ade80",
  "#86efac",
  "#2dd4bf",
  "#16a34a",
]

function buildWeightBins(arestas, numBins) {
  const entries = arestas
    .map(a => ({
      w: a.peso ?? a.weight ?? a.distance,
      label: a.source && a.target ? `${a.source} – ${a.target}` : null,
    }))
    .filter(e => e.w != null && !isNaN(e.w))

  if (!entries.length) return []

  const allIntegers = entries.every(e => Number.isInteger(Number(e.w)))

  if (allIntegers) {
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
    const weight = Number(w)
    const idx = Math.min(Math.floor((weight - mn) / step), numBins - 1)
    if (idx >= 0) {
      bins[idx].count++
      if (label && !bins[idx].arestas.includes(label)) bins[idx].arestas.push(label)
    }
  })

  return bins
}

const KPICard = ({ title, value, sub, loading }) => (
  <div className="dashboard-etn-kpi-card">
    <div>
      <p className="dashboard-etn-kpi-title">{title}</p>
      {loading ? <div className="dashboard-etn-skeleton-pulse" /> : <p className="dashboard-etn-kpi-value">{value}</p>}
      {sub && <p className="dashboard-etn-kpi-sub">{sub}</p>}
    </div>
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

const ChartTooltip = ({ active, payload, label, prefix = "", suffix = "" }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="dashboard-etn-custom-tooltip">
      <p className="dashboard-etn-tooltip-label">{prefix}{label}{suffix}</p>
      {payload.map((p, i) => (
        <p key={i} className="dashboard-etn-tooltip-value">
          {Number(p.value).toLocaleString("pt-BR")}
        </p>
      ))}
    </div>
  )
}

const WeightBinTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const isSingle = d.label === d.rangeEnd || Math.abs(d.label - d.rangeEnd) < 0.01

  return (
    <div className="dashboard-etn-custom-tooltip dashboard-etn-tooltip-wide">
      <p className="dashboard-etn-tooltip-heading">
        {isSingle
          ? Number(d.label).toLocaleString("pt-BR")
          : `${Number(d.label).toLocaleString("pt-BR")} – ${Number(d.rangeEnd).toLocaleString("pt-BR")}`}
      </p>
      {d.arestas?.length > 0 ? (
        <div className="dashboard-etn-tooltip-list">
          {d.arestas.map((r, i) => <div key={i}>• {r}</div>)}
        </div>
      ) : (
        <p className="dashboard-etn-tooltip-value">{d.count.toLocaleString("pt-BR")} arestas</p>
      )}
    </div>
  )
}

const ComparisonTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="dashboard-etn-custom-tooltip dashboard-etn-comparison-tooltip">
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
    </div>
  )
}

const WinnerBadge = ({ winner }) => {
  const bfs = winner === "BFS"
  return (
    <span className={`dashboard-etn-winner-badge ${bfs ? "bfs" : "dfs"}`}>
      <Zap size={10} />
      {winner}
    </span>
  )
}

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

const SelectField = ({ label, value, onChange, options, disabled }) => (
  <div className="dashboard-etn-select-stack">
    <label className="dashboard-etn-select-label">{label}</label>
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      className="dashboard-etn-select"
    >
      <option value="">Todos</option>
      {options.map(o => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  </div>
)

const FilterBar = ({ filtros, regiao, setRegiao, pais, setPais, onClear, hasFilter }) => {
  const paisOptions = regiao && filtros?.paises_por_regiao?.[regiao]
    ? filtros.paises_por_regiao[regiao]
    : Object.values(filtros?.paises_por_regiao || {})
        .flat()
        .filter((v, i, a) => a.indexOf(v) === i)
        .sort()

  return (
    <section className="glass-card dashboard-etn-filter-bar">
      <div className="dashboard-etn-section-header">
        <div className="dashboard-etn-section-title">Filtros do painel</div>
        <div className="dashboard-etn-section-subtitle">
          Ajuste a região e o país para refinar os dados exibidos nos indicadores e gráficos.
        </div>
      </div>

      <div className="dashboard-etn-filter-grid">
        <SelectField
          label="Região"
          value={regiao}
          onChange={value => {
            setRegiao(value)
            setPais("")
          }}
          options={filtros?.regioes || []}
          disabled={!filtros}
        />

        <SelectField
          label="País"
          value={pais}
          onChange={setPais}
          options={paisOptions}
          disabled={!filtros}
        />

        <div className="dashboard-etn-filter-actions">
          {hasFilter && (
            <>
              <button onClick={onClear} className="dashboard-etn-secondary-btn" type="button">
                Limpar filtros
              </button>
              <span className="dashboard-etn-filter-active">● Filtro ativo</span>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

export const DashboardETN = ({ onBack }) => {
  const [stats, setStats] = useState(null)
  const [arestas, setArestas] = useState([])
  const [bfsDfs, setBfsDfs] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [bfsErr, setBfsErr] = useState(null)
  const [spinning, setSpinning] = useState(false)
  const [view, setView] = useState("chart")
  const [weightBins, setWeightBins] = useState(30)
  const [filtros, setFiltros] = useState(null)
  const [regiao, setRegiao] = useState("")
  const [pais, setPais] = useState("")

  const hasFilter = !!(regiao || pais)

  const buildStatsUrl = useCallback(() => {
    if (!hasFilter) return `${API}/api/dashboard-stats`
    const p = new URLSearchParams()
    if (regiao) p.set("regiao", regiao)
    if (pais) p.set("pais", pais)
    return `${API}/api/dashboard-stats/etn/filtrado?${p.toString()}`
  }, [hasFilter, regiao, pais])

  const fetchAll = useCallback(async () => {
    setSpinning(true)
    setError(null)
    setBfsErr(null)

    const [statsRes, bfsRes, arestasRes] = await Promise.allSettled([
      fetch(buildStatsUrl()).then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      }),
      fetch(`${API}/api/report/comparacao/bfs-dfs`).then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      }),
      fetch(`${API}/api/ego-aeroportos`).then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      }),
    ])

    if (statsRes.status === "fulfilled") setStats(statsRes.value)
    else setError(statsRes.reason.message)

    if (bfsRes.status === "fulfilled") setBfsDfs(bfsRes.value)
    else setBfsErr(bfsRes.reason.message)

    if (arestasRes.status === "fulfilled") setArestas(arestasRes.value)

    setLoading(false)
    setSpinning(false)
  }, [buildStatsUrl])

  useEffect(() => {
    fetch(`${API}/api/dashboard-stats/etn/filtros`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data) setFiltros(data)
      })
      .catch(() => {})
  }, [])

  const debounceRef = useRef(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { fetchAll() }, 400)
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
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length

    return {
      total: vals.length,
      min: Math.round(sorted[0]),
      max: Math.round(sorted[sorted.length - 1]),
      mean: Math.round(mean),
      median: Math.round(sorted[Math.floor(sorted.length / 2)]),
    }
  }, [arestas])

  return (
    <div className="app-modern-bg dashboard-etn-page">
      <header className="app-modern-header">
        <div className="header-top-actions">
          <button
            onClick={onBack}
            className="global-metrics-back-button"
            type="button"
            title="Voltar"
          >
            <span className="global-metrics-back-icon" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
              >
                <path
                  d="M15 6L9 12L15 18"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="global-metrics-back-text">Voltar</span>
          </button>
        </div>

        <div className="clean-header">
          <div className="clean-header-brand">
            <img
              src={logoCompleta}
              alt="Logo ETN"
              className="clean-header-logo"
            />
          </div>

          <div className="clean-header-content">
            <h1 className="clean-header-title">Dashboard Analítico ETN</h1>
            <p className="dashboard-etn-header-subtitle">
              Indicadores da rede ETN, distribuição de graus, distribuição por região, pesos das arestas e comparação entre BFS e DFS.
            </p>
          </div>
        </div>
      </header>

      <main className="app-modern-main dashboard-etn-main">
        {error && <ErrorBanner msg={error} />}

        <FilterBar
          filtros={filtros}
          regiao={regiao}
          setRegiao={setRegiao}
          pais={pais}
          setPais={setPais}
          hasFilter={hasFilter}
          onClear={() => {
            setRegiao("")
            setPais("")
          }}
        />

        <section className="dashboard-etn-kpi-grid">
          <KPICard loading={loading} title="Vértices (Portos)" value={d.totalV?.toLocaleString("pt-BR") || "—"} />
          <KPICard loading={loading} title="Arestas (Rotas)" value={d.totalE?.toLocaleString("pt-BR") || "—"} />
          <KPICard loading={loading} title="Grau Médio" value={d.grauMedio != null ? Number(d.grauMedio).toFixed(2) : "—"} sub="conexões por porto" />
          <KPICard loading={loading} title="Peso Médio" value={d.pesoMedio?.toLocaleString("pt-BR") || "—"} sub="por aresta" />
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
                      <stop offset="5%" stopColor="#34d399" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#34d399" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.07)" />
                  <XAxis dataKey="grau" tick={{ fontSize: 11, fill: "#9cc8b6" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#9cc8b6" }} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      const data = payload[0].payload
                      return (
                        <div className="dashboard-etn-custom-tooltip dashboard-etn-tooltip-wide">
                          <p className="dashboard-etn-tooltip-heading">Grau {label}</p>
                          <p className="dashboard-etn-tooltip-label">{data.quantidade} vértices</p>
                          <div className="dashboard-etn-tooltip-list">
                            {data.vertices?.map((v, i) => <div key={i}>• {v}</div>)}
                          </div>
                        </div>
                      )
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="quantidade"
                    stroke="#34d399"
                    strokeWidth={2}
                    fill="url(#gradGrauETN)"
                    dot={{ r: 3, fill: "#34d399" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="glass-card dashboard-etn-chart-card">
            <div className="dashboard-etn-chart-header">
              <h3 className="dashboard-etn-chart-title">Top 10 Hubs</h3>
            </div>

            {loading ? <Skeleton /> : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={d.topVertices || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.07)" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#9cc8b6" }} />
                  <YAxis dataKey="nome" type="category" width={90} tick={{ fontSize: 11, fill: "#9cc8b6" }} />
                  <Tooltip content={<ChartTooltip suffix=" conexões" />} />
                  <Bar dataKey="grau" radius={[0, 6, 6, 0]}>
                    {(d.topVertices || []).map((_, i) => (
                      <Cell key={i} fill={`rgba(52,211,153,${1 - i * 0.07})`} />
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
          </div>

          {loading ? <Skeleton height={260} /> : (
            <ResponsiveContainer width="100%" height={Math.max(260, (d.distribuicaoRegiao || []).slice(0, 10).length * 36)}>
              <BarChart
                data={(d.distribuicaoRegiao || []).slice(0, 10)}
                layout="vertical"
                margin={{ top: 4, right: 60, left: 8, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.06)" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#9cc8b6" }} axisLine={false} tickLine={false} />
                <YAxis
                  dataKey="nome"
                  type="category"
                  width={130}
                  tick={{ fontSize: 12, fill: "#dff7ee", fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} content={<ChartTooltip suffix=" portos" />} />
                <Bar dataKey="valor" radius={[0, 6, 6, 0]} maxBarSize={22} label={{ position: "right", fill: "#9cc8b6", fontSize: 11, fontWeight: 700 }}>
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
              {weightStats && (
                <p className="dashboard-etn-chart-meta">
                  {weightStats.total.toLocaleString("pt-BR")} arestas · mín {weightStats.min.toLocaleString("pt-BR")} · máx {weightStats.max.toLocaleString("pt-BR")} · média {weightStats.mean.toLocaleString("pt-BR")} · mediana {weightStats.median.toLocaleString("pt-BR")}
                </p>
              )}
            </div>

            <div className="dashboard-etn-select-group">
              <label className="dashboard-etn-select-label">Faixas</label>
              <select
                value={weightBins}
                onChange={e => setWeightBins(+e.target.value)}
                className="dashboard-etn-select"
              >
                {[10, 20, 30, 50, 100].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>

          {loading ? <Skeleton height={260} /> : weightBinsData.length === 0 ? (
            <div className="dashboard-etn-empty-state">Nenhuma aresta com peso carregada</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={weightBinsData} margin={{ top: 4, right: 8, left: 0, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.07)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "#9cc8b6" }}
                  tickFormatter={v => Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
                  interval="preserveStartEnd"
                  label={{ value: "Peso", position: "insideBottom", offset: -16, fontSize: 11, fill: "#9cc8b6" }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#9cc8b6" }}
                  label={{ value: "Arestas", angle: -90, position: "insideLeft", offset: 12, fontSize: 11, fill: "#9cc8b6" }}
                />
                <Tooltip content={<WeightBinTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {weightBinsData.map((_, i) => (
                    <Cell key={i} fill={`rgba(52,211,153,${0.45 + 0.55 * (i / weightBinsData.length)})`} />
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
              {bfsDfs && (
                <p className="dashboard-etn-chart-meta">
                  {bfsDfs.total_comparacoes} nós comparados
                </p>
              )}
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
                  <p className="dashboard-etn-mini-stat-label">{label}</p>
                  <p className={`dashboard-etn-mini-stat-value ${color}`}>{value}</p>
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
                  <XAxis dataKey="source" tick={{ fontSize: 11, fill: "#9cc8b6", fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => `${(v * 1000).toFixed(2)}ms`} tick={{ fontSize: 10, fill: "#7fa795" }} axisLine={false} tickLine={false} width={68} />
                  <Tooltip content={<ComparisonTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                  <Legend
                    wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                    formatter={v => <span style={{ color: v === "BFS" ? "#2dd4bf" : "#34d399", fontWeight: 700 }}>{v}</span>}
                  />
                  <Bar dataKey="BFS" fill="#2dd4bf" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="DFS" fill="#34d399" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ComparisonTable rows={comparacoes} />
            )
          )}
        </section>
      </main>
    </div>
  )
}

export default DashboardETN
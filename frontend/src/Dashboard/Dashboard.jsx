import { useState, useEffect } from "react"
import { Plane, GitBranch, Activity, Ruler, RefreshCw, AlertCircle, Loader2, Zap, Clock, BarChart2 } from "lucide-react"
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import logoCompleta from "../assets/logo/logo_branca_completa.png"

const API = "http://localhost:5000"
const PALETTE = ["#1e40af", "#7c3aed", "#0891b2", "#059669", "#d97706", "#dc2626", "#9333ea", "#0d9488"]

// ── Componentes auxiliares ────────────────────────────────────────────────────

const KPICard = ({ title, value, sub, icon: Icon, accent, loading }) => (
  <div className="kpi-card">
    <div>
      <p className="kpi-title">{title}</p>
      {loading ? <div className="skeleton-pulse" /> : <p className="kpi-value">{value}</p>}
      {sub && <p className="kpi-sub">{sub}</p>}
    </div>
    <div className="kpi-icon-wrapper" style={{ background: accent + "18", color: accent }}>
      <Icon size={22} />
    </div>
  </div>
)

const Skeleton = ({ height = 280 }) => (
  <div className="skeleton-chart" style={{ height }}>
    <Loader2 size={24} color="#9ca3af" className="animate-spin" />
  </div>
)

const ErrorBanner = ({ msg }) => (
  <div className="error-banner">
    <AlertCircle size={18} />
    <div>
      <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>Falha ao conectar com a API</p>
      <p style={{ margin: "2px 0 0", fontSize: 12, opacity: 0.8 }}>{msg} — Flask rodando em {API}?</p>
    </div>
  </div>
)

const ChartTooltip = ({ active, payload, label, prefix = "", suffix = "" }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="custom-tooltip">
      <p style={{ margin: 0, opacity: 0.7, fontSize: 11 }}>{prefix}{label}{suffix}</p>
      {payload.map((p, i) => <p key={i} style={{ margin: "2px 0 0", fontWeight: 700 }}>{p.value.toLocaleString("pt-BR")}</p>)}
    </div>
  )
}

const ComparisonTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="custom-tooltip" style={{ minWidth: 180 }}>
      <p style={{ margin: "0 0 6px", fontWeight: 700, fontSize: 12, borderBottom: "1px solid rgba(255,255,255,0.15)", paddingBottom: 4 }}>
        Source: {label}
      </p>
      {payload.map((p, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 16, margin: "3px 0" }}>
          <span style={{ color: p.color, fontSize: 11, fontWeight: 600 }}>{p.name}</span>
          <span style={{ fontWeight: 700, fontSize: 12 }}>{(p.value * 1000).toFixed(4)} ms</span>
        </div>
      ))}
      {payload.length === 2 && (
        <p style={{ margin: "6px 0 0", fontSize: 10, opacity: 0.6, borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 4 }}>
          Δ {Math.abs((payload[0].value - payload[1].value) * 1000).toFixed(4)} ms
        </p>
      )}
    </div>
  )
}

const WinnerBadge = ({ winner }) => {
  const bfs = winner === "BFS"
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700,
      padding: "2px 8px", borderRadius: 999,
      background: bfs ? "rgba(8,145,178,0.18)" : "rgba(124,58,237,0.18)",
      color: bfs ? "#0891b2" : "#7c3aed",
      border: `1px solid ${bfs ? "#0891b230" : "#7c3aed30"}`
    }}>
      <Zap size={9} />{winner}
    </span>
  )
}

const ComparisonTable = ({ rows }) => (
  <div style={{ overflowX: "auto", marginTop: 16 }}>
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
      <thead>
        <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          {["Source", "BFS (ms)", "Camadas", "DFS (ms)", "Ciclos", "Árv.", "Back", "Δ (ms)", "Mais rápido"].map(h => (
            <th key={h} style={{ padding: "6px 10px", textAlign: "left", opacity: 0.5, fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent" }}>
            <td style={{ padding: "7px 10px", fontWeight: 700, color: "#e2e8f0" }}>{row.source}</td>
            <td style={{ padding: "7px 10px", color: "#0891b2", fontWeight: 600 }}>{(row.bfs.tempo_segundos * 1000).toFixed(4)}</td>
            <td style={{ padding: "7px 10px", opacity: 0.7 }}>{row.bfs.num_camadas}</td>
            <td style={{ padding: "7px 10px", color: "#7c3aed", fontWeight: 600 }}>{(row.dfs.tempo_segundos * 1000).toFixed(4)}</td>
            <td style={{ padding: "7px 10px", opacity: 0.7 }}>{row.dfs.ciclos?.toLocaleString("pt-BR")}</td>
            <td style={{ padding: "7px 10px", opacity: 0.7 }}>{row.dfs.arestas_tree}</td>
            <td style={{ padding: "7px 10px", opacity: 0.7 }}>{row.dfs.arestas_back}</td>
            <td style={{ padding: "7px 10px", opacity: 0.7 }}>{Math.abs(row.delta_tempo_ms).toFixed(4)}</td>
            <td style={{ padding: "7px 10px" }}><WinnerBadge winner={row.mais_rapido} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

// ── Componente principal ──────────────────────────────────────────────────────

export const Dashboard = ({ onBack }) => {
  const [stats, setStats] = useState(null)
  const [bfsDfs, setBfsDfs] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [bfsErr, setBfsErr] = useState(null)
  const [spinning, setSpinning] = useState(false)
  const [view, setView] = useState("chart")

  const fetchAll = async () => {
    setSpinning(true)
    setError(null)
    setBfsErr(null)
    const [statsRes, bfsRes] = await Promise.allSettled([
      fetch(`${API}/api/dashboard-stats/aeroportos`).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() }),
      fetch(`${API}/api/report/comparacao/bfs-dfs`).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() }),
    ])
    if (statsRes.status === 'fulfilled') setStats(statsRes.value)
    else setError(statsRes.reason.message)
    if (bfsRes.status === 'fulfilled') setBfsDfs(bfsRes.value)
    else setBfsErr(bfsRes.reason.message)
    setLoading(false)
    setSpinning(false)
  }

  useEffect(() => { fetchAll() }, [])

  const d = stats || {}
  const comparacoes = bfsDfs?.comparacoes || []
  const chartData = comparacoes.map(r => ({ source: r.source, BFS: r.bfs.tempo_segundos, DFS: r.dfs.tempo_segundos }))
  const bfsWins = comparacoes.filter(r => r.mais_rapido === "BFS").length
  const dfsWins = comparacoes.filter(r => r.mais_rapido === "DFS").length
  const avgDelta = comparacoes.length
    ? (comparacoes.reduce((s, r) => s + Math.abs(r.delta_tempo_ms), 0) / comparacoes.length).toFixed(4)
    : "—"

  return (
    <div className="dashboard-container">

      {/* Header */}
      <div className="dashboard-header">
        <button className="home-back-button" onClick={onBack} type="button">
          <span className="home-back-icon">
            <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
              <path d="M15 6L9 12L15 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="home-back-text">Voltar</span>
        </button>
        <div className="logo-2"><img src={logoCompleta} alt="" /></div>
        <button onClick={fetchAll} disabled={spinning} className="sync-button">
          <RefreshCw size={15} className={spinning ? "animate-spin" : ""} />
          {spinning ? "Buscando..." : "Sincronizar"}
        </button>
      </div>

      {error && <ErrorBanner msg={error} />}

      {/* KPIs */}
      <div className="kpi-grid">
        <KPICard loading={loading} title="Vértices (Aeroportos)" value={d.totalV?.toLocaleString("pt-BR")} icon={Plane} accent="#1e40af" />
        <KPICard loading={loading} title="Arestas (Rotas)" value={d.totalE?.toLocaleString("pt-BR")} icon={GitBranch} accent="#7c3aed" />
        <KPICard loading={loading} title="Grau Médio" value={d.grauMedio != null ? Number(d.grauMedio).toFixed(2) : "—"} icon={Activity} accent="#059669" sub="conexões por aeroporto" />
        <KPICard loading={loading} title="Distância Média" value={d.pesoMedio?.toLocaleString("pt-BR")} icon={Ruler} accent="#d97706" sub="por rota (km)" />
      </div>

      {/* Gráficos linha 1 */}
      <div className="chart-row">
        <div className="chart-card">
          <div className="chart-header"><h3 className="chart-title">Distribuição de Graus</h3></div>
          {loading ? <Skeleton /> : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={d.distribuicaoGraus || []}>
                <defs>
                  <linearGradient id="gradGrauAero" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="grau" tick={{ fontSize: 11, fill: "#9ca3af" }} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} />
                <Tooltip content={<ChartTooltip prefix="Grau " />} />
                <Area type="monotone" dataKey="quantidade" stroke="#7c3aed" strokeWidth={2} fill="url(#gradGrauAero)" dot={{ r: 3, fill: "#7c3aed" }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="chart-card">
          <div className="chart-header"><h3 className="chart-title">Top 10 Hubs</h3></div>
          {loading ? <Skeleton /> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={d.topVertices || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#9ca3af" }} />
                <YAxis dataKey="nome" type="category" width={90} tick={{ fontSize: 11, fill: "#374151" }} />
                <Tooltip content={<ChartTooltip suffix=" conexões" />} />
                <Bar dataKey="grau" radius={[0, 6, 6, 0]}>
                  {(d.topVertices || []).map((_, i) => <Cell key={i} fill={`rgba(30,64,175,${1 - i * 0.07})`} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard

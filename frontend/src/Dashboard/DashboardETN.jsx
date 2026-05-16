import { useState, useEffect } from "react"
import {
  TrendingUp, Anchor, GitBranch, Activity, Weight,
  RefreshCw, MapPin, Globe, AlertCircle, Loader2
} from "lucide-react"
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts"

import logoCompleta from "../assets/logo-2/logo-branca-completa2.png";

const API_BASE = "http://localhost:5000"
const PALETTE = ["#1e40af", "#7c3aed", "#0891b2", "#059669", "#d97706", "#dc2626", "#9333ea", "#0d9488"]

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

const CustomTooltip = ({ active, payload, label, prefix = "", suffix = "" }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="custom-tooltip">
      <p style={{ margin: 0, opacity: 0.7, fontSize: 11 }}>{prefix}{label}{suffix}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ margin: "2px 0 0", fontWeight: 700 }}>
          {p.value.toLocaleString("pt-BR")}
        </p>
      ))}
    </div>
  )
}

const SkeletonChart = ({ height = 280 }) => (
  <div className="skeleton-chart" style={{ height }}>
    <Loader2 size={24} color="#9ca3af" className="animate-spin" />
  </div>
)

export const DashboardETN = () => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [spinning, setSpinning] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)

  const fetchData = async () => {
    setSpinning(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/dashboard-stats`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json)
      setLastUpdate(new Date().toLocaleTimeString("pt-BR"))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
      setSpinning(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const d = data || {}

  return (
    <div className="dashboard-container">
      {/* HEADER */}
      <div className="dashboard-header">
        <div className="logo-2">
          <img src={logoCompleta} alt="" />
        </div>
        <button onClick={fetchData} disabled={spinning} className="sync-button">
          <RefreshCw size={15} className={spinning ? "animate-spin" : ""} />
          {spinning ? "Buscando..." : "Sincronizar"}
        </button>
      </div>

      {/* ERRO */}
      {error && (
        <div className="error-banner">
          <AlertCircle size={18} />
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>Falha ao conectar com a API</p>
            <p style={{ margin: "2px 0 0", fontSize: 12, opacity: 0.8 }}>
              {error} — certifique-se de que o Flask está rodando em {API_BASE}
            </p>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="kpi-grid">
        <KPICard loading={loading} title="Vértices (Portos)" value={d.totalV?.toLocaleString("pt-BR")} icon={Anchor} accent="#1e40af" />
        <KPICard loading={loading} title="Arestas (Rotas)" value={d.totalE?.toLocaleString("pt-BR")} icon={GitBranch} accent="#7c3aed" />
        <KPICard loading={loading} title="Grau Médio" value={d.grauMedio != null ? Number(d.grauMedio).toFixed(2) : "—"} icon={Activity} accent="#059669" sub="conexões por porto" />
        <KPICard loading={loading} title="Peso Médio" value={d.pesoMedio?.toLocaleString("pt-BR")} icon={Weight} accent="#d97706" sub="por aresta" />
      </div>

      {/* LINHA 1 */}
      <div className="chart-row">
        <div className="chart-card">
          <div className="chart-header">
            <h3 className="chart-title">Distribuição de Graus</h3>
          </div>
          {loading ? <SkeletonChart /> : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={d.distribuicaoGraus || []}>
                <defs>
                  <linearGradient id="gradGrau" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="grau" tick={{ fontSize: 11, fill: "#9ca3af" }} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} />
                <Tooltip content={<CustomTooltip prefix="Grau " />} />
                <Area type="monotone" dataKey="quantidade" stroke="#7c3aed" strokeWidth={2} fill="url(#gradGrau)" dot={{ r: 3, fill: "#7c3aed" }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <h3 className="chart-title">Top 10 Hubs</h3>
          </div>
          {loading ? <SkeletonChart /> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={d.topVertices || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#9ca3af" }} />
                <YAxis dataKey="nome" type="category" width={90} tick={{ fontSize: 11, fill: "#374151" }} />
                <Tooltip content={<CustomTooltip suffix=" conexões" />} />
                <Bar dataKey="grau" radius={[0, 6, 6, 0]}>
                  {(d.topVertices || []).map((_, i) => (
                    <Cell key={i} fill={`rgba(30,64,175,${1 - i * 0.07})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-header">
          <h3 className="chart-title">Distribuição por Região</h3>
        </div>
        {loading ? <SkeletonChart height={220} /> : (
          <div className="pie-container">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={(d.distribuicaoRegiao || []).slice(0, 8)}
                  dataKey="valor"
                  nameKey="nome"
                  innerRadius={55} outerRadius={90}
                  paddingAngle={3}
                >
                  {(d.distribuicaoRegiao || []).slice(0, 8).map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(d.distribuicaoRegiao || []).slice(0, 8).map((r, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: PALETTE[i % PALETTE.length] }} />
                  <span style={{ fontSize: 13, color: "#374151", flex: 1 }}>{r.nome}</span>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{r.valor}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="chart-card">
        <div className="chart-header">
          <h3 className="chart-title">Comparação de Tempo BSF e DFS</h3>
        </div>
        
      </div>
    </div>
  )
}

export default DashboardETN

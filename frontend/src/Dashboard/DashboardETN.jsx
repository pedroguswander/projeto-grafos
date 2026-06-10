import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { AlertCircle, Loader2, Zap } from "lucide-react"
import {
  AreaChart, Area, BarChart, Bar, Cell,
  PieChart, Pie, Treemap,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts"

import logoCompleta from "../assets/logo-2/logo-branca-completa2.png"
import "../css/DashboardETN.css"
import InsightPanel from "../../components/InsightPanel"
import { useAIInsightETN, SUGGESTED_QUESTIONS_ETN } from "../hooks/useAIInsightETN"
import HyperbolicTree3D from "./HyperbolicTree3D"

const API = ""

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

// ─── Half-Donut gauge ──────────────────────────────────────────
const HalfDonut = ({ pct = 0, count = 0 }) => {
  const R = 64, sw = 13
  const C = 2 * Math.PI * R
  const halfC = C / 2
  const p = Math.max(0, Math.min(pct, 100))
  const filled = (p / 100) * halfC

  return (
    <svg
      viewBox="12 26 176 84"
      width="100%"
      style={{ display: "block", maxWidth: 200, margin: "0 auto 0.15rem" }}
      aria-label={`${p}% de rotas deficitárias`}
    >
      {/* Track */}
      <circle
        cx={100} cy={100} r={R}
        fill="none"
        stroke="rgba(248,113,113,0.15)"
        strokeWidth={sw}
        strokeDasharray={`${halfC} ${C}`}
        strokeDashoffset={0}
        transform="rotate(180 100 100)"
        strokeLinecap="round"
      />
      {/* Fill */}
      {p > 0 && (
        <circle
          cx={100} cy={100} r={R}
          fill="none"
          stroke="#f87171"
          strokeWidth={sw}
          strokeDasharray={`${halfC} ${C}`}
          strokeDashoffset={halfC - filled}
          transform="rotate(180 100 100)"
          strokeLinecap="round"
        >
          <animate
            attributeName="stroke-dashoffset"
            from={halfC}
            to={halfC - filled}
            dur="1s"
            calcMode="spline"
            keySplines="0.22 1 0.36 1"
            fill="freeze"
          />
        </circle>
      )}
      {/* Percentage */}
      <text
        x={100} y={92}
        textAnchor="middle"
        fill="#f87171" fontSize={26} fontWeight={900}
      >
        {p}%
      </text>
      {/* Count */}
      <text
        x={100} y={106}
        textAnchor="middle"
        fill="rgba(255,255,255,0.42)" fontSize={10}
      >
        {Number(count).toLocaleString("pt-BR")} rotas
      </text>
    </svg>
  )
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

const DONUT_COLORS = { BFS: "#2fbf9b", DFS: "#63d9b1" }

const ComparisonTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null

  const bfsVal  = payload.find(p => p.name === "BFS")?.value ?? 0
  const dfsVal  = payload.find(p => p.name === "DFS")?.value ?? 0
  const bfsMs   = (bfsVal * 1000).toFixed(4)
  const dfsMs   = (dfsVal * 1000).toFixed(4)
  const delta   = Math.abs(bfsVal - dfsVal) * 1000
  const winner  = bfsVal <= dfsVal ? "BFS" : "DFS"
  const loserV  = winner === "BFS" ? dfsVal : bfsVal
  const winnerV = winner === "BFS" ? bfsVal : dfsVal
  const speedup = winnerV > 0 ? (loserV / winnerV).toFixed(1) : "∞"
  const total   = bfsVal + dfsVal || 1
  const bfsPct  = Math.round((bfsVal / total) * 100)
  const dfsPct  = 100 - bfsPct

  const donutData = [
    { name: "BFS", value: bfsVal || 0.000001 },
    { name: "DFS", value: dfsVal || 0.000001 },
  ]

  return (
    <div className="dashboard-etn-donut-tooltip">
      {/* Header */}
      <div className="dashboard-etn-donut-header">
        <span className="dashboard-etn-donut-source">{label}</span>
        <span className={`dashboard-etn-donut-badge ${winner.toLowerCase()}`}>
          ⚡ {winner}
        </span>
      </div>

      {/* Donut + center */}
      <div className="dashboard-etn-donut-chart-wrap">
        <PieChart width={136} height={136}>
          <Pie
            data={donutData}
            cx={63}
            cy={63}
            innerRadius={40}
            outerRadius={62}
            dataKey="value"
            startAngle={90}
            endAngle={-270}
            strokeWidth={0}
            isAnimationActive
            animationBegin={0}
            animationDuration={650}
            animationEasing="ease-out"
          >
            {donutData.map(entry => (
              <Cell
                key={entry.name}
                fill={DONUT_COLORS[entry.name]}
                opacity={entry.name === winner ? 1 : 0.45}
              />
            ))}
          </Pie>
        </PieChart>
        <div className="dashboard-etn-donut-center">
          <span className="dashboard-etn-donut-speedup" style={{ color: DONUT_COLORS[winner] }}>
            {speedup}x
          </span>
          <span className="dashboard-etn-donut-speedup-sub">mais rápido</span>
        </div>
      </div>

      {/* Progress bars */}
      <div className="dashboard-etn-donut-bars">
        {[
          { name: "BFS", ms: bfsMs, pct: bfsPct },
          { name: "DFS", ms: dfsMs, pct: dfsPct },
        ].map(({ name, ms, pct }) => (
          <div key={name} className="dashboard-etn-donut-bar-row">
            <div className="dashboard-etn-donut-bar-meta">
              <span style={{ color: DONUT_COLORS[name] }}>● {name}</span>
              <span className="dashboard-etn-donut-bar-ms">{ms} ms</span>
            </div>
            <div className="dashboard-etn-donut-bar-track">
              <div
                className="dashboard-etn-donut-bar-fill"
                style={{
                  width: `${pct}%`,
                  background: DONUT_COLORS[name],
                  opacity: name === winner ? 1 : 0.45,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Delta */}
      <div className="dashboard-etn-donut-delta-row">
        <span>Δ diferença</span>
        <span>{delta.toFixed(4)} ms</span>
      </div>
    </div>
  )
}

// ─── Distribuição de Pesos tooltip ─────────────────────────────
const WeightBinTooltip = ({ active, payload, totalArestas }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const isRange = Math.abs(d.label - d.rangeEnd) > 0.01
  const positive = d.label >= 0
  const pct = totalArestas > 0 ? Math.round((d.count / totalArestas) * 100 * 10) / 10 : 0
  const rangeLabel = isRange
    ? `${Number(d.label).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} → ${Number(d.rangeEnd).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}`
    : Number(d.label).toLocaleString("pt-BR")
  return (
    <div className="dashboard-etn-donut-tooltip">
      <div className="dashboard-etn-donut-header">
        <span className="dashboard-etn-donut-source" style={{ fontSize: "0.74rem" }}>{rangeLabel}</span>
        <span className={`dashboard-etn-donut-badge ${positive ? "lucr" : "def"}`}>
          {positive ? "✓ Lucrativo" : "✗ Deficitário"}
        </span>
      </div>
      <div className="wbin-tooltip-count">
        <span className="wbin-tooltip-num" style={{ color: positive ? "#63d9b1" : "#f87171" }}>
          {d.count.toLocaleString("pt-BR")}
        </span>
        <span className="wbin-tooltip-num-lbl">arestas nesta faixa</span>
      </div>
      <div className="dashboard-etn-donut-bars">
        <div className="dashboard-etn-donut-bar-row">
          <div className="dashboard-etn-donut-bar-meta">
            <span style={{ color: positive ? "#63d9b1" : "#f87171" }}>● % do total</span>
            <span className="dashboard-etn-donut-bar-ms">{pct}%</span>
          </div>
          <div className="dashboard-etn-donut-bar-track">
            <div className="dashboard-etn-donut-bar-fill"
              style={{ width: `${pct}%`, background: positive ? "#63d9b1" : "#f87171" }}
            />
          </div>
        </div>
      </div>
      <div className="dashboard-etn-donut-click-hint">↵ clique para ver as arestas</div>
    </div>
  )
}

// ─── Distribuição de Pesos detail panel ────────────────────────
const WeightBinDetail = ({ bin, totalArestas }) => {
  const isRange = Math.abs(bin.label - bin.rangeEnd) > 0.01
  const positive = bin.label >= 0
  const pct = totalArestas > 0 ? Math.round((bin.count / totalArestas) * 100) : 0
  const rangeLabel = isRange
    ? `${Number(bin.label).toLocaleString("pt-BR")} — ${Number(bin.rangeEnd).toLocaleString("pt-BR")}`
    : `Peso ${Number(bin.label).toLocaleString("pt-BR")}`

  return (
    <div className="wbin-detail">
      <div className="wbin-detail-header">
        <div className="wbin-detail-range">
          <span className="wbin-detail-range-lbl">Faixa de peso</span>
          <span className="wbin-detail-range-val">{rangeLabel}</span>
        </div>
        <div className="wbin-detail-stats">
          <div className="wbin-detail-stat">
            <span className="wbin-detail-stat-num" style={{ color: positive ? "#63d9b1" : "#f87171" }}>
              {bin.count.toLocaleString("pt-BR")}
            </span>
            <span className="wbin-detail-stat-lbl">arestas</span>
          </div>
          <div className="wbin-detail-stat">
            <span className="wbin-detail-stat-num" style={{ color: positive ? "#63d9b1" : "#f87171" }}>
              {pct}%
            </span>
            <span className="wbin-detail-stat-lbl">do total</span>
          </div>
          <span className={`dashboard-etn-donut-badge ${positive ? "lucr" : "def"}`} style={{ alignSelf: "center" }}>
            {positive ? "✓ Lucrativo" : "✗ Deficitário"}
          </span>
        </div>
      </div>

      <div className="wbin-detail-progress">
        <div className="bal-detail-progress-bar">
          <div className="bal-detail-progress-fill"
            style={{
              width: `${pct}%`,
              background: positive
                ? "linear-gradient(90deg,#2fbf9b,#63d9b1)"
                : "linear-gradient(90deg,#ef4444,#f87171)",
            }}
          />
        </div>
      </div>

      <div className="wbin-detail-routes">
        {(bin.arestas || []).map((r, i) => {
          const parts = r.split(" – ")
          return (
            <div key={i} className={`wbin-detail-route ${positive ? "pos" : "neg"}`}>
              {parts.length === 2 ? (
                <>
                  <span className="wbin-route-code">{parts[0]}</span>
                  <span className="wbin-route-arrow">→</span>
                  <span className="wbin-route-code">{parts[1]}</span>
                </>
              ) : r}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Portos por País detail panel ──────────────────────────────
const PaisDetail = ({ p }) => (
  <div className="pais-detail">
    <div className="pais-detail-header">
      <div className="pais-detail-country">{p.nome}</div>
      <div className="pais-detail-count">
        <span className="pais-detail-count-num">{p.valor}</span>
        <span className="pais-detail-count-lbl">porto{p.valor !== 1 ? "s" : ""} na rede</span>
      </div>
    </div>
    <div className="pais-detail-grid">
      {p.portos.map((porto, i) => (
        <div key={i} className="pais-detail-porto">
          <span className="pais-detail-porto-code">{porto.code}</span>
          <span className="pais-detail-porto-name">{porto.name}</span>
        </div>
      ))}
    </div>
  </div>
)

// ─── Top 10 Hubs tooltip + detail ──────────────────────────────
const HubTooltip = ({ active, payload, maxGrau }) => {
  if (!active || !payload?.length) return null
  const v = payload[0].payload
  const pct = maxGrau > 0 ? Math.round((v.grau / maxGrau) * 100) : 0
  return (
    <div className="dashboard-etn-donut-tooltip">
      <div className="dashboard-etn-donut-header">
        <span className="dashboard-etn-donut-source" style={{ fontSize: "0.76rem" }}>
          {v.nome_completo || v.nome}
        </span>
        <span className="dashboard-etn-donut-badge lucr" style={{ fontFamily: "monospace", letterSpacing: "0.06em" }}>
          {v.nome}
        </span>
      </div>
      <div className="wbin-tooltip-count">
        <span className="wbin-tooltip-num" style={{ color: "#26c281" }}>{v.grau}</span>
        <span className="wbin-tooltip-num-lbl">conexões</span>
      </div>
      <div className="dashboard-etn-donut-bars">
        <div className="dashboard-etn-donut-bar-row">
          <div className="dashboard-etn-donut-bar-meta">
            <span style={{ color: "#26c281" }}>● vs. maior hub</span>
            <span className="dashboard-etn-donut-bar-ms">{pct}%</span>
          </div>
          <div className="dashboard-etn-donut-bar-track">
            <div className="dashboard-etn-donut-bar-fill" style={{ width: `${pct}%`, background: "#26c281" }} />
          </div>
        </div>
      </div>
      <div className="dashboard-etn-donut-click-hint">↵ clique para ver destinos</div>
    </div>
  )
}

const HubDetail = ({ hub, vertexMap }) => (
  <div className="pais-detail">
    <div className="pais-detail-header">
      <div>
        <div className="pais-detail-country">{hub.nome_completo || hub.nome}</div>
        <div className="pais-detail-hub-code">{hub.nome}</div>
      </div>
      <div className="pais-detail-count">
        <span className="pais-detail-count-num">{hub.grau}</span>
        <span className="pais-detail-count-lbl">conexões</span>
      </div>
    </div>
    <div className="pais-detail-grid">
      {(hub.conexoes || []).map((code, i) => (
        <div key={i} className="pais-detail-porto">
          <span className="pais-detail-porto-code">{code}</span>
          <span className="pais-detail-porto-name">{vertexMap.get(code) || code}</span>
        </div>
      ))}
    </div>
  </div>
)

// ─── Distribuição por Região tooltip + detail ──────────────────
const RegiaoDistribTooltip = ({ active, payload, label, total }) => {
  if (!active || !payload?.length) return null
  const count = payload[0].value
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="dashboard-etn-donut-tooltip">
      <div className="dashboard-etn-donut-header">
        <span className="dashboard-etn-donut-source" style={{ fontSize: "0.78rem" }}>{label}</span>
      </div>
      <div className="wbin-tooltip-count">
        <span className="wbin-tooltip-num" style={{ color: "#26c281" }}>
          {Number(count).toLocaleString("pt-BR")}
        </span>
        <span className="wbin-tooltip-num-lbl">porto{count !== 1 ? "s" : ""} na região</span>
      </div>
      <div className="dashboard-etn-donut-bars">
        <div className="dashboard-etn-donut-bar-row">
          <div className="dashboard-etn-donut-bar-meta">
            <span style={{ color: "#26c281" }}>● % dos portos</span>
            <span className="dashboard-etn-donut-bar-ms">{pct}%</span>
          </div>
          <div className="dashboard-etn-donut-bar-track">
            <div className="dashboard-etn-donut-bar-fill" style={{ width: `${pct}%`, background: "#26c281" }} />
          </div>
        </div>
      </div>
      <div className="dashboard-etn-donut-click-hint">↵ clique para ver portos</div>
    </div>
  )
}

const RegiaoDistribDetail = ({ r, vertices }) => {
  const ports = vertices.filter(v => v.D_Region === r.nome)
  return (
    <div className="pais-detail">
      <div className="pais-detail-header">
        <div className="pais-detail-country">{r.nome}</div>
        <div className="pais-detail-count">
          <span className="pais-detail-count-num">{r.valor}</span>
          <span className="pais-detail-count-lbl">porto{r.valor !== 1 ? "s" : ""} na região</span>
        </div>
      </div>
      <div className="pais-detail-grid">
        {ports.map((porto, i) => (
          <div key={i} className="pais-detail-porto">
            <span className="pais-detail-porto-code">{porto.UNLocode}</span>
            <span className="pais-detail-porto-name">{porto.name || porto.UNLocode}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Balanço detail panel ──────────────────────────────────────
const BalancoDetail = ({ r }) => {
  const total   = r.lucrativas + r.deficitarias || 1
  const lucrPct = Math.round((r.lucrativas / total) * 100)
  const defPct  = 100 - lucrPct
  return (
    <div className="bal-detail">
      <div className="bal-detail-summary">
        <div className="bal-detail-kpi lucr">
          <span className="bal-detail-kpi-num">{r.lucrativas}</span>
          <span className="bal-detail-kpi-lbl">✓ Lucrativas</span>
        </div>
        <div className="bal-detail-progress-wrap">
          <div className="bal-detail-progress-bar">
            <div className="bal-detail-progress-fill" style={{ width: `${lucrPct}%` }} />
          </div>
          <span className="bal-detail-progress-label">
            {lucrPct}% lucrativas · {defPct}% deficitárias · {total} rotas
          </span>
        </div>
        <div className="bal-detail-kpi def">
          <span className="bal-detail-kpi-num">{r.deficitarias}</span>
          <span className="bal-detail-kpi-lbl">✗ Deficitárias</span>
        </div>
      </div>

      <div className="bal-detail-cols">
        <div className="bal-detail-col lucr">
          <div className="bal-detail-col-header">
            <span>✓</span><span>Lucrativas</span>
            <span className="bal-detail-col-count">{r.lucrativas}</span>
          </div>
          <div className="bal-detail-col-list">
            {r.rotasLucr.map((rt, i) => <div key={i} className="bal-detail-route lucr">{rt}</div>)}
          </div>
        </div>
        <div className="bal-detail-col def">
          <div className="bal-detail-col-header">
            <span>✗</span><span>Deficitárias</span>
            <span className="bal-detail-col-count">{r.deficitarias}</span>
          </div>
          <div className="bal-detail-col-list">
            {r.rotasDef.map((rt, i) => <div key={i} className="bal-detail-route def">{rt}</div>)}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Balanço por Região tooltip (pizza) ────────────────────────
const BAL_COLORS = { lucrativas: "#63d9b1", deficitarias: "#f87171" }

const BalancoTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null

  const lucr  = payload.find(p => p.name === "lucrativas")?.value  ?? 0
  const def   = payload.find(p => p.name === "deficitarias")?.value ?? 0
  const total = lucr + def || 1
  const lucrPct = Math.round((lucr / total) * 100)
  const defPct  = 100 - lucrPct
  const dominant = lucr >= def ? "lucrativas" : "deficitarias"

  const pieData = [
    { name: "lucrativas",   value: lucr || 0.000001 },
    { name: "deficitarias", value: def  || 0.000001 },
  ]

  return (
    <div className="dashboard-etn-donut-tooltip">
      <div className="dashboard-etn-donut-header">
        <span className="dashboard-etn-donut-source">{label}</span>
        <span className={`dashboard-etn-donut-badge ${dominant === "lucrativas" ? "lucr" : "def"}`}>
          {dominant === "lucrativas" ? "✓ Lucrativa" : "✗ Deficitária"}
        </span>
      </div>

      <div className="dashboard-etn-donut-chart-wrap" style={{ filter: "none" }}>
        <PieChart width={136} height={136}>
          <Pie
            data={pieData}
            cx={63} cy={63}
            innerRadius={0}
            outerRadius={60}
            dataKey="value"
            startAngle={90} endAngle={-270}
            stroke="rgba(6,20,16,0.55)" strokeWidth={2}
            isAnimationActive
            animationBegin={0}
            animationDuration={650}
            animationEasing="ease-out"
          >
            {pieData.map(entry => (
              <Cell
                key={entry.name}
                fill={BAL_COLORS[entry.name]}
                opacity={entry.name === dominant ? 1 : 0.42}
              />
            ))}
          </Pie>
        </PieChart>
      </div>

      <div className="dashboard-etn-donut-bars">
        {[
          { name: "lucrativas",   label: "Lucrativas",   count: lucr, pct: lucrPct },
          { name: "deficitarias", label: "Deficitárias", count: def,  pct: defPct  },
        ].map(({ name, label: lbl, count, pct }) => (
          <div key={name} className="dashboard-etn-donut-bar-row">
            <div className="dashboard-etn-donut-bar-meta">
              <span style={{ color: BAL_COLORS[name] }}>● {lbl}</span>
              <span className="dashboard-etn-donut-bar-ms">{count} rotas · {pct}%</span>
            </div>
            <div className="dashboard-etn-donut-bar-track">
              <div
                className="dashboard-etn-donut-bar-fill"
                style={{
                  width: `${pct}%`,
                  background: BAL_COLORS[name],
                  opacity: name === dominant ? 1 : 0.45,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-etn-donut-delta-row">
        <span>Total de rotas</span>
        <span>{lucr + def}</span>
      </div>

      <div className="dashboard-etn-donut-click-hint">
        ↵ clique para ver as rotas
      </div>
    </div>
  )
}

// ─── Complex Sub-components ────────────────────────────────────
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [weightBins, setWeightBins] = useState(30)
  const [selectedHub, setSelectedHub] = useState(null)
  const [selectedPais, setSelectedPais] = useState(null)
  const [selectedRegiao, setSelectedRegiao] = useState(null)
  const [selectedWeightBin, setSelectedWeightBin] = useState(null)
  const [selectedRegioDistrib, setSelectedRegioDistrib] = useState(null)
  const [hoveredPort, setHoveredPort] = useState(null)
  const [ranges, setRanges] = useState(null)
  const [grauRange, setGrauRange] = useState([0, 9999])
  const [pesoRange, setPesoRange] = useState([-9999999, 9999999])

  const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY
  const { insight, history, loadingInsight, error: insightError, generate, ask, clearHistory } = useAIInsightETN(GROQ_KEY)
  const [insightOpen, setInsightOpen] = useState(false)

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

  const portImpactData = useMemo(() => {
    if (!arestas.length || !vertices.length) return []

    const balMap = {}
    arestas.forEach(a => {
      const peso = parseFloat(a.peso ?? 0)
      if (isNaN(peso)) return
      if (a.origem) balMap[a.origem] = (balMap[a.origem] || 0) + peso
      if (a.destino) balMap[a.destino] = (balMap[a.destino] || 0) + peso
    })

    const regionMap = {}
    vertices.forEach(v => {
      const code = v.UNLocode
      if (!(code in balMap)) return
      const balance = balMap[code]
      const region = v.D_Region || "Sem Região"
      if (!regionMap[region]) regionMap[region] = []
      regionMap[region].push({
        name: code,
        fullName: v.name || code,
        value: Math.max(Math.abs(balance), 1),
        balance,
        positive: balance >= 0,
      })
    })

    return Object.entries(regionMap)
      .map(([name, children]) => ({
        name,
        children: children.sort((a, b) => b.value - a.value),
      }))
      .sort((a, b) =>
        b.children.reduce((s, c) => s + c.value, 0) -
        a.children.reduce((s, c) => s + c.value, 0)
      )
  }, [arestas, vertices])

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

        <div className="dashboard-etn-header-ia-row">
          <button
            className="dashboard-etn-back-btn dashboard-etn-ia-btn"
            onClick={() => setInsightOpen(true)}
            type="button"
            aria-label="Abrir painel de IA"
          >
            <span className="dashboard-etn-back-icon dashboard-etn-ia-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </span>
            <span className="dashboard-etn-back-text">IA Insight</span>
            {insight && <span className="dashboard-etn-ia-dot" />}
          </button>
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

          {/* ── Modal IA ── */}
          {insightOpen && (
            <div className="insight-modal-overlay" onClick={() => setInsightOpen(false)}>
              <div className="insight-modal insight-modal--green" onClick={e => e.stopPropagation()}>
                <InsightPanel
                  insight={insight}
                  history={history}
                  loading={loadingInsight}
                  error={insightError}
                  theme="green"
                  suggestedQuestions={SUGGESTED_QUESTIONS_ETN}
                  onAsk={ask}
                  onClear={clearHistory}
                  onClose={() => setInsightOpen(false)}
                />
              </div>
            </div>
          )}

          <section className="dashboard-etn-kpi-grid">
            <KPICard loading={loading} title="Vértices (Portos)" value={d.totalV?.toLocaleString("pt-BR") || "—"} />
            <KPICard loading={loading} title="Arestas (Rotas)" value={d.totalE?.toLocaleString("pt-BR") || "—"} />
            <KPICard loading={loading} title="Grau Médio" value={d.grauMedio != null ? Number(d.grauMedio).toFixed(2) : "—"} sub="conexões por porto" />
            <KPICard loading={loading} title="Peso Médio (geral)" value={d.pesoMedio?.toLocaleString("pt-BR") || "—"} sub="incluindo rotas deficitárias" />
            <KPICard loading={loading} title="Peso Médio (positivo)" value={d.pesoMedioPositivo?.toLocaleString("pt-BR") || "—"} sub="apenas rotas lucrativas" accent="#63d9b1" />
            <div className="dashboard-etn-kpi-card">
              <p className="dashboard-etn-kpi-title">Rotas Deficitárias</p>
              {loading ? (
                <div className="dashboard-etn-skeleton-pulse" />
              ) : (
                <HalfDonut
                  pct={d.percDeficitarias ?? 0}
                  count={d.rotasDeficitarias ?? 0}
                />
              )}
              <p className="dashboard-etn-kpi-sub">peso negativo</p>
            </div>
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
                <HubDetail hub={selectedHub} vertexMap={vertexMap} />
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
                    <Tooltip
                      content={props => <HubTooltip {...props} maxGrau={d.topVertices?.[0]?.grau || 1} />}
                      cursor={{ fill: "rgba(255,255,255,0.035)" }}
                    />
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
              <RegiaoDistribDetail r={selectedRegioDistrib} vertices={vertices} />
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
                    content={props => <RegiaoDistribTooltip {...props} total={vertices.length} />}
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
              <WeightBinDetail bin={selectedWeightBin} totalArestas={weightStats?.total || 0} />
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
                    content={props => <WeightBinTooltip {...props} totalArestas={weightStats?.total || 0} />}
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
                <PaisDetail p={selectedPais} />
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

          {/* ── Treemap: Impacto Financeiro Líquido por Porto ── */}
          <section className="glass-card dashboard-etn-chart-card">
            <div className="dashboard-etn-chart-header dashboard-etn-chart-header-wrap">
              <div>
                <h3 className="dashboard-etn-chart-title">Impacto Financeiro Líquido por Porto</h3>
                <p className="dashboard-etn-chart-meta">
                  Balanço acumulado de todas as rotas por porto — tamanho = magnitude financeira, cor = lucro/déficit.
                </p>
              </div>
              <div className="etn-treemap-legend-pills">
                <span className="etn-treemap-pill pos">&#9632; Lucrativo</span>
                <span className="etn-treemap-pill neg">&#9632; Deficitário</span>
              </div>
            </div>

            {loading ? <Skeleton height={340} /> : portImpactData.length === 0 ? (
              <div className="dashboard-etn-empty-state">Sem dados.</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={340}>
                  <Treemap
                    data={portImpactData}
                    dataKey="value"
                    aspectRatio={4 / 3}
                    isAnimationActive={false}
                    content={(props) => {
                      const { depth, x, y, width, height, name, balance, positive, fullName } = props
                      if (!width || !height || width < 2 || height < 2) return null

                      if (depth < 2) {
                        return (
                          <g>
                            <rect
                              x={x} y={y} width={width} height={height}
                              fill="transparent"
                              stroke="rgba(6,20,16,0.95)"
                              strokeWidth={2}
                            />
                            {width > 72 && height > 20 && (
                              <text
                                x={x + 7} y={y + 15}
                                fill="rgba(255,255,255,0.36)"
                                fontSize={9}
                                fontWeight="700"
                              >
                                {(name || "").toUpperCase()}
                              </text>
                            )}
                          </g>
                        )
                      }

                      const tooSmall = width < 36 || height < 22
                      return (
                        <g
                          onMouseEnter={() => setHoveredPort({ name, fullName, balance, positive })}
                          onMouseLeave={() => setHoveredPort(null)}
                        >
                          <rect
                            x={x + 1} y={y + 1} width={width - 2} height={height - 2}
                            fill={positive ? "rgba(47,191,155,0.78)" : "rgba(248,113,113,0.70)"}
                            rx={3}
                            stroke={positive ? "rgba(47,191,155,0.22)" : "rgba(248,113,113,0.20)"}
                            strokeWidth={1}
                          />
                          {!tooSmall && (
                            <>
                              <text
                                x={x + width / 2}
                                y={y + (height > 44 ? height / 2 - 5 : height / 2)}
                                textAnchor="middle"
                                dominantBaseline={height <= 44 ? "middle" : "auto"}
                                fill="white"
                                fontSize={Math.min(11, Math.floor(width / 3.2))}
                                fontWeight="800"
                              >
                                {name}
                              </text>
                              {height > 44 && (
                                <text
                                  x={x + width / 2} y={y + height / 2 + 10}
                                  textAnchor="middle"
                                  fill="rgba(255,255,255,0.60)"
                                  fontSize={8}
                                >
                                  {(positive ? "+" : "") + Number(balance).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                                </text>
                              )}
                            </>
                          )}
                        </g>
                      )
                    }}
                  />
                </ResponsiveContainer>

                <div className={`etn-treemap-hover-bar${hoveredPort ? " visible" : ""}`}>
                  {hoveredPort ? (
                    <>
                      <span className="etn-treemap-hover-code">{hoveredPort.name}</span>
                      <span className="etn-treemap-hover-sep">·</span>
                      <span className="etn-treemap-hover-name">{hoveredPort.fullName}</span>
                      <span className="etn-treemap-hover-sep">·</span>
                      <span className={`etn-treemap-hover-bal ${hoveredPort.positive ? "pos" : "neg"}`}>
                        Balanço líquido:&nbsp;
                        {hoveredPort.positive ? "+" : ""}
                        {Number(hoveredPort.balance).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                      </span>
                    </>
                  ) : <span style={{ opacity: 0 }}>—</span>}
                </div>
              </>
            )}
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
              <BalancoDetail r={selectedRegiao} />
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
                  <Tooltip content={<BalancoTooltip />} cursor={{ fill: "rgba(255,255,255,0.035)" }} />
                  <Legend formatter={v => <span style={{ color: v === "lucrativas" ? "#63d9b1" : "#f87171", fontWeight: 700 }}>{v}</span>} />
                  <Bar dataKey="lucrativas" fill="#63d9b1" radius={[0, 4, 4, 0]} maxBarSize={18} />
                  <Bar dataKey="deficitarias" fill="#f87171" radius={[0, 4, 4, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </section>

          <section className="etn-tree3d-section">
            <div className="glass-card dashboard-etn-chart-card" style={{ padding: "1.25rem 1.25rem 1.25rem" }}>
              <div className="dashboard-etn-chart-header">
                <h3 className="dashboard-etn-chart-title">Árvore Hiperbólica 3D — Rede ETN</h3>
                <p className="dashboard-etn-chart-subtitle" style={{ fontSize: "0.75rem", color: "#8fbca8", marginTop: "0.2rem" }}>
                  Hierarquia: Continente → Região → Porto · Clique num porto para ver detalhes · Arraste para rodar
                </p>
              </div>
              <HyperbolicTree3D />
            </div>
          </section>
        </main>
      </div>
    </div>
  )

}

export default DashboardETN

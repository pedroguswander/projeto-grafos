import { Zap } from "lucide-react"

const InsightPanel = ({ insight, loading }) => (
  <div style={{
    padding: "14px 18px", borderRadius: 12, marginBottom: 20,
    background: "rgba(124,58,237,0.08)",
    border: "1px solid rgba(124,58,237,0.25)",
    display: "flex", gap: 12, alignItems: "flex-start",
  }}>
    <Zap size={16} color="#7c3aed" style={{ marginTop: 2, flexShrink: 0 }} />
    <div style={{ fontSize: 13, lineHeight: 1.7, color: "#c4b5fd" }}>
      {loading
        ? <span style={{ opacity: 0.5 }}>Analisando os dados com IA…</span>
        : insight ?? <span style={{ opacity: 0.4 }}>Aplique um filtro para gerar insights.</span>
      }
    </div>
  </div>
)

export default InsightPanel

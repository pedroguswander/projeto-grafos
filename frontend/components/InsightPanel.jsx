import { Zap, Loader2 } from "lucide-react"

const THEMES = {
  blue: {
    bg: "linear-gradient(135deg, rgba(14,165,233,0.10) 0%, rgba(30,64,175,0.13) 100%)",
    border: "1px solid rgba(56,189,248,0.28)",
    boxShadow: "0 2px 24px 0 rgba(14,165,233,0.10), inset 0 1px 0 rgba(186,230,255,0.08)",
    iconColor: "#38bdf8",
    iconGlow: "drop-shadow(0 0 6px rgba(56,189,248,0.7))",
    textColor: "#bae6fd",
    mutedColor: "rgba(186,230,255,0.38)",
    dotColor: "#0ea5e9",
    loaderColor: "#38bdf8",
    tagBg: "rgba(14,165,233,0.15)",
    tagBorder: "rgba(56,189,248,0.30)",
    tagColor: "#7dd3fc",
    labelText: "IA INSIGHT",
    divider: "rgba(56,189,248,0.15)",
  },
  green: {
    bg: "linear-gradient(135deg, rgba(16,185,129,0.10) 0%, rgba(5,150,105,0.13) 100%)",
    border: "1px solid rgba(52,211,153,0.28)",
    boxShadow: "0 2px 24px 0 rgba(16,185,129,0.10), inset 0 1px 0 rgba(167,243,208,0.08)",
    iconColor: "#34d399",
    iconGlow: "drop-shadow(0 0 6px rgba(52,211,153,0.7))",
    textColor: "#a7f3d0",
    mutedColor: "rgba(167,243,208,0.38)",
    dotColor: "#10b981",
    loaderColor: "#34d399",
    tagBg: "rgba(16,185,129,0.15)",
    tagBorder: "rgba(52,211,153,0.30)",
    tagColor: "#6ee7b7",
    labelText: "IA INSIGHT",
    divider: "rgba(52,211,153,0.15)",
  },
}

const InsightPanel = ({ insight, loading, theme = "blue" }) => {
  const t = THEMES[theme] ?? THEMES.blue

  return (
    <div style={{
      padding: "16px 20px",
      borderRadius: 14,
      marginBottom: 20,
      background: t.bg,
      border: t.border,
      boxShadow: t.boxShadow,
      display: "flex",
      gap: 14,
      alignItems: "flex-start",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Subtle shimmer line at top */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        height: 1,
        background: `linear-gradient(90deg, transparent 0%, ${t.iconColor}55 40%, ${t.iconColor}55 60%, transparent 100%)`,
      }} />

      {/* Icon column */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        paddingTop: 2,
        flexShrink: 0,
      }}>
        {loading ? (
          <Loader2
            size={16}
            color={t.loaderColor}
            style={{
              animation: "spin 1s linear infinite",
              filter: t.iconGlow,
            }}
          />
        ) : (
          <Zap
            size={16}
            color={t.iconColor}
            style={{ filter: t.iconGlow, flexShrink: 0 }}
          />
        )}
        {/* Vertical divider line below icon */}
        <div style={{
          width: 1,
          flex: 1,
          minHeight: 20,
          background: `linear-gradient(to bottom, ${t.divider}, transparent)`,
        }} />
      </div>

      {/* Text column */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Label badge */}
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: "2px 8px",
          borderRadius: 99,
          background: t.tagBg,
          border: `1px solid ${t.tagBorder}`,
          marginBottom: 8,
        }}>
          <div style={{
            width: 5, height: 5,
            borderRadius: "50%",
            background: t.dotColor,
            boxShadow: `0 0 6px ${t.dotColor}`,
            animation: loading ? "pulse 1.5s ease-in-out infinite" : "none",
          }} />
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.08em",
            color: t.tagColor,
            textTransform: "uppercase",
          }}>
            {loading ? "Analisando…" : t.labelText}
          </span>
        </div>

        {/* Insight text */}
        <div style={{
          fontSize: 13,
          lineHeight: 1.75,
          color: loading ? t.mutedColor : t.textColor,
          transition: "color 0.3s ease",
        }}>
          {loading
            ? <span>Processando os dados da rede com inteligência artificial…</span>
            : insight
              ?? <span style={{ opacity: 0.45 }}>Aplique um filtro para gerar insights.</span>
          }
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  )
}

export default InsightPanel

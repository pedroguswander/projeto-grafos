import { useState, useRef } from "react"

/**
 * InsightPanel — card de IA com:
 *  - Insight automático (via prop `insight`)
 *  - Perguntas sugeridas clicáveis (prop `suggestedQuestions`)
 *  - Input para pergunta customizada (prop `onAsk`)
 *
 * Props:
 *   insight            string | null   — texto gerado automaticamente
 *   loading            bool
 *   error              string | null
 *   theme              "blue" | "green"
 *   suggestedQuestions string[]        — lista de perguntas sugeridas
 *   onAsk              (q: string) => void — callback para pergunta do usuário
 */
export default function InsightPanel({
  insight,
  loading,
  error,
  theme = "blue",
  suggestedQuestions = [],
  onAsk,
}) {
  const [input, setInput] = useState("")
  const [asked, setAsked] = useState(null)
  const inputRef = useRef(null)

  function handleAsk(q) {
    if (!onAsk || !q.trim()) return
    setAsked(q.trim())
    setInput("")
    onAsk(q.trim())
  }

  function handleSubmit(e) {
    e.preventDefault()
    handleAsk(input)
  }

  return (
    <div className="insight-panel">

      {/* ── Cabeçalho ── */}
      <div className="insight-panel-header">
        <svg
          className="insight-panel-icon"
          width="18" height="18" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2.2"
          strokeLinecap="round" strokeLinejoin="round"
        >
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
        <span className="insight-panel-title">IA Insight</span>
        {loading && (
          <span className="insight-panel-loading" style={{ marginLeft: "auto" }}>
            <span className="insight-panel-loading-spinner" />
            Analisando…
          </span>
        )}
      </div>

      {/* ── Corpo do insight ── */}
      <div className="insight-panel-body">
        {error ? (
          <div className="insight-panel-error">⚠ {error}</div>
        ) : asked ? (
          <>
            <p className="insight-panel-question">"{asked}"</p>
            <p className="insight-panel-answer" style={{ opacity: loading ? 0.4 : 1 }}>
              {insight || (loading ? "" : "—")}
            </p>
          </>
        ) : insight ? (
          <p className="insight-panel-answer">{insight}</p>
        ) : !loading ? (
          <p className="insight-panel-answer" style={{ opacity: 0.4 }}>
            Ajuste os filtros para gerar um insight automático.
          </p>
        ) : null}
      </div>

      {/* ── Perguntas sugeridas ── */}
      {suggestedQuestions.length > 0 && (
        <div>
          <p className="insight-panel-suggestions-label">Perguntas sugeridas</p>
          <div className="insight-panel-suggestions">
            {suggestedQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => handleAsk(q)}
                disabled={loading}
                className="insight-panel-suggestion-btn"
                type="button"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Input customizado ── */}
      {onAsk && (
        <form onSubmit={handleSubmit} className="insight-panel-input-row">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Faça uma pergunta sobre o grafo…"
            disabled={loading}
            className="insight-panel-input"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="insight-panel-send-btn"
            aria-label="Enviar pergunta"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
      )}
    </div>
  )
}

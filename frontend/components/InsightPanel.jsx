import { useState, useRef, useEffect } from "react"

export default function InsightPanel({
  insight,
  history = [],
  loading,
  error,
  theme = "blue",
  suggestedQuestions = [],
  onAsk,
  onClear,
  onClose,
}) {
  const [input, setInput] = useState("")
  const historyRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    const el = historyRef.current
    if (!el) return
    if (loading) {
      el.scrollTop = el.scrollHeight
      return
    }
    const msgs = el.querySelectorAll(".insight-panel-message")
    if (!msgs.length) return
    const last = msgs[msgs.length - 1]
    const lastRect = last.getBoundingClientRect()
    const elRect = el.getBoundingClientRect()
    el.scrollTop += lastRect.top - elRect.top - 8
  }, [history, loading])

  function handleAsk(q) {
    if (!onAsk || !q.trim() || loading) return
    setInput("")
    onAsk(q.trim())
    inputRef.current?.focus()
  }

  function handleSubmit(e) {
    e.preventDefault()
    handleAsk(input)
  }

  const hasHistory = history.length > 0
  const noKey = !insight && !loading && !error && !hasHistory

  return (
    <div className="insight-panel">

      {/* ── Header ── */}
      <div className="insight-panel-header">
        <svg className="insight-panel-icon" width="16" height="16" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
        <span className="insight-panel-title">IA Insight</span>

        <div className="insight-panel-header-right">
          {loading && (
            <span className="insight-panel-loading">
              <span className="insight-panel-loading-spinner" />
              Analisando…
            </span>
          )}
          {hasHistory && !loading && onClear && (
            <button onClick={onClear} className="insight-panel-clear-btn" type="button">
              ↺ Limpar
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="insight-panel-close-btn" type="button" aria-label="Fechar">
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── History / Body ── */}
      <div className="insight-panel-history" ref={historyRef}>
        {!hasHistory && !loading && !error && (
          <p className="insight-panel-empty">
            {noKey
              ? "Configure VITE_GROQ_API_KEY no arquivo .env para ativar a IA."
              : "Selecione uma pergunta sugerida ou escreva sua própria pergunta abaixo."}
          </p>
        )}

        {error && (
          <div className="insight-panel-error">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error.includes("invalid_api_key") ? "Chave Groq inválida — verifique o arquivo .env" : error}
          </div>
        )}

        {history.map((msg, i) => (
          <div key={i} className="insight-panel-message">
            {msg.q && (
              <p className="insight-panel-question">"{msg.q}"</p>
            )}
            {msg.a ? (
              <p className="insight-panel-answer">{msg.a}</p>
            ) : loading && i === history.length - 1 ? (
              <div className="insight-panel-thinking">
                <span className="insight-panel-dot-1" />
                <span className="insight-panel-dot-2" />
                <span className="insight-panel-dot-3" />
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {/* ── Suggested questions ── */}
      {suggestedQuestions.length > 0 && (
        <div className="insight-panel-suggestions-wrap">
          <p className="insight-panel-suggestions-label">Perguntas sugeridas</p>
          <div className="insight-panel-suggestions">
            {suggestedQuestions.map((q, i) => (
              <button key={i} onClick={() => handleAsk(q)} disabled={loading}
                className="insight-panel-suggestion-btn" type="button">
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Input ── */}
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
          <button type="submit" disabled={loading || !input.trim()}
            className="insight-panel-send-btn" aria-label="Enviar">
            {loading ? (
              <span className="insight-panel-send-spinner" />
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            )}
          </button>
        </form>
      )}
    </div>
  )
}

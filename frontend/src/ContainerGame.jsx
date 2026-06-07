import { useRef, useState } from 'react'
import backJogo from './assets/back-jogo.png'
import ContainerGameEngine from './ContainerGameEngine.jsx'
import './css/ContainerGame.css'

const STAT_TYPES = [
  { label: 'PERFEITO', val: '+REP', desc: 'Encaixe preciso',    cls: 'cg-stat-teal'   },
  { label: 'ERRO',     val: '−REP', desc: 'Cresce com o nível', cls: 'cg-stat-gold'   },
  { label: 'NÍVEL',    val: '×8',   desc: 'Sobe a cada 8',      cls: 'cg-stat-purple' },
]

const MEDALS = ['🥇', '🥈', '🥉']
const RANKING_KEY = 'cstack_ranking'

function loadRankings() {
  try { return JSON.parse(localStorage.getItem(RANKING_KEY) || '[]') } catch { return [] }
}

function loadHiScore() {
  try {
    const list = loadRankings()
    return list.length > 0 ? list[0].score : 0
  } catch { return 0 }
}

export default function ContainerGame({ onBack }) {
  const bgRef = useRef(null)
  const [playing, setPlaying]           = useState(false)
  const [showRanking, setShowRanking]   = useState(false)
  const [rankings, setRankings]         = useState([])

  const handleMouseMove = (e) => {
    const x = e.clientX / window.innerWidth - 0.5
    const y = e.clientY / window.innerHeight - 0.5
    if (bgRef.current)
      bgRef.current.style.transform = `translate(${-x * 32}px, ${-y * 18}px) scale(1.03)`
  }

  const handleMouseLeave = () => {
    if (bgRef.current) bgRef.current.style.transform = 'translate(0px, 0px) scale(1)'
  }

  const openRanking = () => {
    setRankings(loadRankings())
    setShowRanking(true)
  }

  if (playing) {
    return <ContainerGameEngine startDirect={true} onBack={() => setPlaying(false)} />
  }

  const hiScore = loadHiScore()

  return (
    <div
      className="home-clean-bg home-etn-theme cg-outer"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div
        ref={bgRef}
        className="home-bg-image"
        style={{ backgroundImage: `url(${backJogo})` }}
      />

      <button
        className="home-back-button home-back-floating"
        onClick={onBack}
        type="button"
        title="Voltar"
      >
        <span className="home-back-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
            <path d="M15 6L9 12L15 18" stroke="currentColor" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="home-back-text">Voltar</span>
      </button>

      <div className="home-shell">
        <div className="cg-header">
          <h1 className="cg-title">Controle de Cargas</h1>
          <p className="cg-subtitle">Empilhe contêineres no porto com precisão</p>
        </div>

        <div className="home-clean-content cg-menu-panel">
          <div className="cg-inner">
            <div className="cg-stats-row">
              {STAT_TYPES.map((s) => (
                <div className={`cg-stat-card ${s.cls}`} key={s.label}>
                  <span className="cg-stat-val">{s.val}</span>
                  <span className="cg-stat-label">{s.label}</span>
                  <span className="cg-stat-desc">{s.desc}</span>
                </div>
              ))}
            </div>

            <div className="cg-howto">
              {[
                'Observe o contêiner balançar no pêndulo',
                'Clique para soltar no momento certo',
                'Reputação zero — fim de jogo!',
              ].map((tip, i) => (
                <div className="cg-howto-item" key={i}>
                  <span className="cg-howto-num">{i + 1}</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>

            <div className="cg-launch-wrap">
              <button className="cg-nav-btn cg-nav-btn--play" onClick={() => setPlaying(true)} type="button">
                <span className="cg-nav-btn-title">JOGAR</span>
                <span className="cg-nav-btn-sub">Iniciar partida</span>
              </button>
              <button className="cg-nav-btn cg-nav-btn--rank" onClick={openRanking} type="button">
                <span className="cg-nav-btn-title">RANKING</span>
                <span className="cg-nav-btn-sub">Melhores jogadores</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {showRanking && (
        <div className="cg-rank-overlay" onClick={e => e.target === e.currentTarget && setShowRanking(false)}>
          <div className="cg-rank-panel">
            <div className="cg-rank-header">
              <h2 className="cg-rank-title">TOP 10</h2>
              <button className="cg-rank-close" onClick={() => setShowRanking(false)} type="button">✕</button>
            </div>

            {rankings.length === 0 ? (
              <p className="cg-rank-empty">Nenhuma partida registrada ainda.<br />Jogue e entre para o hall!</p>
            ) : (
              <div className="cg-rank-list">
                {rankings.slice(0, 10).map((entry, i) => (
                  <div className="cg-rank-row" key={i}>
                    <span className="cg-rank-pos">
                      {i < 3 ? MEDALS[i] : <span className="cg-rank-num">{i + 1}</span>}
                    </span>
                    <span className="cg-rank-name">{entry.name}</span>
                    <span className="cg-rank-pts">{entry.score} pts</span>
                  </div>
                ))}
              </div>
            )}

            <button
              className="cg-nav-btn cg-nav-btn--play cg-rank-play-btn"
              onClick={() => { setShowRanking(false); setPlaying(true) }}
              type="button"
            >
              <span className="cg-nav-btn-title">▶ JOGAR AGORA</span>
              <span className="cg-nav-btn-sub">Iniciar partida</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

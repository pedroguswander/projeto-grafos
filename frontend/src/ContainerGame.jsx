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
  const [showInfo, setShowInfo]         = useState(false)

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

            <button className="cg-info-trigger" onClick={() => setShowInfo(true)} type="button">
              <span className="cg-info-trigger-icon">⬡</span>
              <span className="cg-info-trigger-text">Como funciona o Grafo Bellman-Ford?</span>
              <span className="cg-info-trigger-chevron">→</span>
            </button>

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

      {showInfo && (
        <div className="cg-info-overlay" onClick={e => e.target === e.currentTarget && setShowInfo(false)}>
          <div className="cg-info-panel">

            <div className="cg-info-header">
              <div className="cg-info-header-left">
                <span className="cg-info-header-icon">⬡</span>
                <div>
                  <h2 className="cg-info-title">Grafo Bellman-Ford</h2>
                  <p className="cg-info-tagline">Como a partida é modelada como grafo dirigido ponderado</p>
                </div>
              </div>
              <button className="cg-info-close" onClick={() => setShowInfo(false)} type="button">✕</button>
            </div>

            <div className="cg-info-body">

              {/* ── Seção 1: Grafo de Estados ── */}
              <section className="cg-info-section">
                <h3 className="cg-info-section-title">
                  <span className="cg-info-section-num">1</span>
                  Grafo de Estados
                </h3>
                <p className="cg-info-text">
                  Cada container empilhado cria um novo <strong>estado Sᵢ</strong>.
                  A partida inteira é um caminho linear dirigido — sem bifurcações.
                </p>

                <svg viewBox="0 0 460 100" className="cg-info-svg" aria-hidden="true">
                  {/* edges */}
                  <line x1="68" y1="44" x2="106" y2="44" stroke="rgba(76,247,176,0.68)" strokeWidth="2"/>
                  <polygon points="116,44 106,39 106,49" fill="rgba(76,247,176,0.68)"/>
                  <text x="92" y="28" textAnchor="middle" fill="rgba(76,247,176,0.90)" fontSize="11" fontWeight="bold" fontFamily="'Courier New',monospace">−5</text>

                  <line x1="160" y1="44" x2="198" y2="44" stroke="rgba(76,247,176,0.68)" strokeWidth="2"/>
                  <polygon points="208,44 198,39 198,49" fill="rgba(76,247,176,0.68)"/>
                  <text x="184" y="28" textAnchor="middle" fill="rgba(76,247,176,0.90)" fontSize="11" fontWeight="bold" fontFamily="'Courier New',monospace">−3</text>

                  <line x1="252" y1="44" x2="290" y2="44" stroke="rgba(255,107,107,0.68)" strokeWidth="2"/>
                  <polygon points="300,44 290,39 290,49" fill="rgba(255,107,107,0.68)"/>
                  <text x="276" y="28" textAnchor="middle" fill="rgba(255,107,107,0.90)" fontSize="11" fontWeight="bold" fontFamily="'Courier New',monospace">+2</text>

                  <line x1="344" y1="44" x2="382" y2="44" stroke="rgba(76,247,176,0.68)" strokeWidth="2"/>
                  <polygon points="392,44 382,39 382,49" fill="rgba(76,247,176,0.68)"/>
                  <text x="368" y="28" textAnchor="middle" fill="rgba(76,247,176,0.90)" fontSize="11" fontWeight="bold" fontFamily="'Courier New',monospace">−4</text>

                  {/* S0 */}
                  <circle cx="46" cy="44" r="21" fill="rgba(76,100,247,0.14)" stroke="rgba(100,140,255,0.42)" strokeWidth="1.75"/>
                  <text x="46" y="48" textAnchor="middle" fill="rgba(185,210,255,0.80)" fontSize="9.5" fontWeight="700" fontFamily="'Courier New',monospace">S0</text>
                  <text x="46" y="80" textAnchor="middle" fill="rgba(195,215,205,0.50)" fontSize="8.5" fontFamily="'Courier New',monospace">0.0</text>
                  {/* S1 */}
                  <circle cx="138" cy="44" r="21" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.18)" strokeWidth="1.75"/>
                  <text x="138" y="48" textAnchor="middle" fill="rgba(190,220,210,0.80)" fontSize="9.5" fontWeight="700" fontFamily="'Courier New',monospace">S1</text>
                  <text x="138" y="80" textAnchor="middle" fill="rgba(76,247,176,0.68)" fontSize="8.5" fontFamily="'Courier New',monospace">−5.0</text>
                  {/* S2 */}
                  <circle cx="230" cy="44" r="21" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.18)" strokeWidth="1.75"/>
                  <text x="230" y="48" textAnchor="middle" fill="rgba(190,220,210,0.80)" fontSize="9.5" fontWeight="700" fontFamily="'Courier New',monospace">S2</text>
                  <text x="230" y="80" textAnchor="middle" fill="rgba(76,247,176,0.68)" fontSize="8.5" fontFamily="'Courier New',monospace">−8.0</text>
                  {/* S3 */}
                  <circle cx="322" cy="44" r="21" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.18)" strokeWidth="1.75"/>
                  <text x="322" y="48" textAnchor="middle" fill="rgba(190,220,210,0.80)" fontSize="9.5" fontWeight="700" fontFamily="'Courier New',monospace">S3</text>
                  <text x="322" y="80" textAnchor="middle" fill="rgba(255,107,107,0.62)" fontSize="8.5" fontFamily="'Courier New',monospace">−6.0</text>
                  {/* S4 — nó final */}
                  <circle cx="414" cy="44" r="21" fill="rgba(38,194,129,0.18)" stroke="rgba(76,247,176,0.62)" strokeWidth="1.75"/>
                  <text x="414" y="48" textAnchor="middle" fill="rgba(180,255,220,0.90)" fontSize="9.5" fontWeight="700" fontFamily="'Courier New',monospace">S4</text>
                  <text x="414" y="80" textAnchor="middle" fill="rgba(76,247,176,0.85)" fontSize="8.5" fontFamily="'Courier New',monospace">−10.0</text>

                  <text x="0" y="98" fill="rgba(156,200,182,0.28)" fontSize="8" fontFamily="Inter,system-ui,sans-serif">dist[] acumulado (Bellman-Ford)</text>
                </svg>

                <p className="cg-info-note">
                  Custo final negativo = partida eficiente ✦ &nbsp;|&nbsp; +2 em S3 = jogada custosa que elevou o total
                </p>
              </section>

              <div className="cg-info-divider"/>

              {/* ── Seção 2: Peso da Aresta ── */}
              <section className="cg-info-section">
                <h3 className="cg-info-section-title">
                  <span className="cg-info-section-num">2</span>
                  Peso da Aresta  w(Sᵢ₋₁ → Sᵢ)
                </h3>
                <p className="cg-info-text">
                  Dois fatores independentes somam o peso da aresta gerada por cada jogada:
                </p>

                <div className="cg-info-weight-grid">
                  <div className="cg-info-weight-card cg-info-wc--elite">
                    <span className="cg-info-wc-badge">⚡ ELITE</span>
                    <span className="cg-info-wc-val">−5</span>
                    <span className="cg-info-wc-desc">Perfeito + janela ideal<br/>(reação 1.5 – 2.5 s)</span>
                  </div>
                  <div className="cg-info-weight-card cg-info-wc--efic">
                    <span className="cg-info-wc-badge">✦ EFICIENTE</span>
                    <span className="cg-info-wc-val">−4 a −1</span>
                    <span className="cg-info-wc-desc">Perfeito ou boa timing<br/>(reação até 3.5 s)</span>
                  </div>
                  <div className="cg-info-weight-card cg-info-wc--neu">
                    <span className="cg-info-wc-badge">◆ NEUTRO</span>
                    <span className="cg-info-wc-val">0 a +1</span>
                    <span className="cg-info-wc-desc">Normal + timing razoável<br/>(reação até 3.5 s)</span>
                  </div>
                  <div className="cg-info-weight-card cg-info-wc--cost">
                    <span className="cg-info-wc-badge">⚠ CUSTOSO</span>
                    <span className="cg-info-wc-val">+2 a +4</span>
                    <span className="cg-info-wc-desc">Normal + lento ou<br/>reação &gt; 3.5 s</span>
                  </div>
                </div>

                <div className="cg-info-formula">
                  <span className="cg-info-formula-line"><span className="cg-ifl--label">base</span><span className="cg-ifl--op"> = </span><span className="cg-ifl--val">Perfeito ? <span className="cg-ifl--neg">−3</span> : <span className="cg-ifl--pos">+2</span></span></span>
                  <span className="cg-info-formula-line"><span className="cg-ifl--label">bônus</span><span className="cg-ifl--op"> += </span><span className="cg-ifl--neg">−2</span><span className="cg-ifl--dim">  se reação ∈ [1.5, 2.5] s  ⚡ janela ideal</span></span>
                  <span className="cg-info-formula-line"><span className="cg-ifl--label">      </span><span className="cg-ifl--op"> += </span><span className="cg-ifl--neg">−1</span><span className="cg-ifl--dim">  se reação ∈ [1.0, 3.5] s  ✦ boa timing</span></span>
                  <span className="cg-info-formula-line"><span className="cg-ifl--label">      </span><span className="cg-ifl--op"> += </span><span className="cg-ifl--pos">+1</span><span className="cg-ifl--dim">  se reação ∈ (3.5, 5.0] s  ⚠ lento</span></span>
                  <span className="cg-info-formula-line"><span className="cg-ifl--label">      </span><span className="cg-ifl--op"> += </span><span className="cg-ifl--pos">+2</span><span className="cg-ifl--dim">  se reação &gt; 5.0 s          ✕ muito lento</span></span>
                </div>
              </section>

              <div className="cg-info-divider"/>

              {/* ── Seção 3: Bellman-Ford ── */}
              <section className="cg-info-section">
                <h3 className="cg-info-section-title">
                  <span className="cg-info-section-num">3</span>
                  Algoritmo Bellman-Ford
                </h3>
                <p className="cg-info-text">
                  A cada nova aresta adicionada, o algoritmo percorre o grafo <strong>V−1 vezes</strong>,
                  atualizando a distância mínima acumulada para cada nó.
                </p>

                <div className="cg-info-formula">
                  <span className="cg-info-formula-line"><span className="cg-ifl--label">dist</span><span className="cg-ifl--dim">[S₀]</span><span className="cg-ifl--op"> = </span><span className="cg-ifl--val">0</span></span>
                  <span className="cg-info-formula-line"><span className="cg-ifl--label">dist</span><span className="cg-ifl--dim">[Sᵢ]</span><span className="cg-ifl--op"> = </span><span className="cg-ifl--val">dist[Sᵢ₋₁]  +  w(Sᵢ₋₁ → Sᵢ)</span></span>
                </div>

                <div className="cg-info-bf-row">
                  <div className="cg-info-bf-card cg-info-bf--adv">
                    <span className="cg-info-bf-card-icon">✦</span>
                    <div>
                      <strong>Pesos negativos</strong>
                      <p>Bellman-Ford suporta arestas negativas — ao contrário do Dijkstra, essencial para representar jogadas de alta eficiência.</p>
                    </div>
                  </div>
                  <div className="cg-info-bf-card cg-info-bf--goal">
                    <span className="cg-info-bf-card-icon">⬡</span>
                    <div>
                      <strong>Objetivo</strong>
                      <p>Minimizar o custo acumulado de S₀ até Sₙ. Custo total negativo = sessão eficiente.</p>
                    </div>
                  </div>
                </div>
              </section>

            </div>
          </div>
        </div>
      )}

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

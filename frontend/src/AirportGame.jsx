import { useRef, useState } from 'react';
import aviaoCabine from './assets/Aviao_cabine.png';
import AirportGameEngine from './AirportGameEngine.jsx';
import './css/AirportGame.css';

const PLANE_TYPES = [
  { label: 'Pequeno', pts: '10 pts', desc: 'Lento, gira na hora', color: '#4da3ff' },
  { label: 'Médio', pts: '50 pts', desc: 'Velocidade moderada', color: '#a78bfa' },
  { label: 'Pesado', pts: '100 pts', desc: 'Rápido e difícil de guiar', color: '#f6c56f' },
];

const LS_KEY = 'atc_ranking_v1';
const MEDALS = ['🥇', '🥈', '🥉'];

function loadRanking() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
}

export default function AirportGame({ onBack }) {
  const bgRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [showRanking, setShowRanking] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [ranking, setRanking] = useState([]);

  const handleMouseMove = (e) => {
    const x = e.clientX / window.innerWidth - 0.5;
    const y = e.clientY / window.innerHeight - 0.5;
    if (bgRef.current)
      bgRef.current.style.transform = `translate(${-x * 32}px, ${-y * 18}px) scale(1.03)`;
  };

  const handleMouseLeave = () => {
    if (bgRef.current) bgRef.current.style.transform = 'translate(0px, 0px) scale(1)';
  };

  const openRanking = () => {
    setRanking(loadRanking());
    setShowRanking(true);
  };

  if (playing) {
    return <AirportGameEngine startDirect={true} onBack={() => setPlaying(false)} />;
  }

  return (
    <div className="home-clean-bg" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      <div
        ref={bgRef}
        className="home-bg-image"
        style={{ backgroundImage: `url(${aviaoCabine})` }}
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
        <div className="ag-header">
          <h1 className="ag-title">Controle de Tráfego Aéreo</h1>
          <p className="ag-subtitle">Guie os aviões até a pista sem deixá-los colidir</p>
        </div>

        <div className="home-clean-content">
          <div className="ag-inner">
            <div className="ag-planes-row">
              {PLANE_TYPES.map((p) => (
                <div className="ag-plane-card" key={p.label} style={{ '--cc': p.color }}>
                  <span className="ag-plane-pts">{p.pts}</span>
                  <span className="ag-plane-label">{p.label}</span>
                  <span className="ag-plane-desc">{p.desc}</span>
                </div>
              ))}
            </div>

            <div className="ag-howto">
              {[
                'Clique em um avião para selecioná-lo',
                'Arraste o mouse para traçar o caminho até a pista',
                'Evite colisões — o jogo termina na primeira batida!',
              ].map((tip, i) => (
                <div className="ag-howto-item" key={i}>
                  <span className="ag-howto-num">{i + 1}</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>

            <div className="ag-fuel-notice">
              <span className="ag-fuel-icon">⚠</span>
              <span className="ag-fuel-desc">Cada avião consome combustível. Piscadas mais rápidas = tanque acabando. Vermelho = crítico. Vazio = game over!</span>
            </div>

            <button className="ag-info-trigger" onClick={() => setShowInfo(true)} type="button">
              <span className="ag-info-trigger-icon">
                <svg viewBox="0 0 20 20" fill="none" width="15" height="15">
                  <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.6"/>
                  <path d="M10 9v5M10 6.5v.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </span>
              <span className="ag-info-trigger-text">Como funciona o Dijkstra?</span>
              <span className="ag-info-trigger-chevron">→</span>
            </button>

            <div className="ag-launch-wrap">
              <button className="ag-nav-btn ag-nav-btn--play" onClick={() => setPlaying(true)} type="button">
                <span className="ag-nav-btn-title">JOGAR</span>
                <span className="ag-nav-btn-sub">Iniciar partida</span>
              </button>
              <button className="ag-nav-btn ag-nav-btn--rank" onClick={openRanking} type="button">
                <span className="ag-nav-btn-title">RANKING</span>
                <span className="ag-nav-btn-sub">Melhores jogadores</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Dijkstra info modal */}
      {showInfo && (
        <div className="ag-info-overlay" onClick={e => e.target === e.currentTarget && setShowInfo(false)}>
          <div className="ag-info-panel">
            <div className="ag-info-header">
              <h2 className="ag-info-title">Algoritmo de Dijkstra</h2>
              <button className="ag-rank-close" onClick={() => setShowInfo(false)} type="button">✕</button>
            </div>
            <div className="ag-info-body">

              {/* ── Seção 1: Grid invisível ── */}
              <div className="ag-info-section">
                <div className="ag-info-section-title">
                  <span className="ag-info-section-num">1</span>
                  O Grid Invisível
                </div>
                <p className="ag-info-desc">
                  O mapa é dividido em <strong>80 nós</strong> (grade 10×8). O Dijkstra percorre essas células para encontrar o menor caminho do avião até a pista.
                </p>
                <svg className="ag-info-svg" viewBox="0 0 260 120" fill="none">
                  {/* Grid lines */}
                  {[0,1,2,3,4].map(r => (
                    [0,1,2,3,4,5].map(c => {
                      const x = 10 + c * 40, y = 10 + r * 25
                      const isPath = (r===2&&c===0)||(r===2&&c===1)||(r===1&&c===2)||(r===0&&c===3)||(r===0&&c===4)||(r===0&&c===5)
                      const isPlane = r===2 && c===0
                      const isRunway = r===0 && c===5
                      return (
                        <g key={`${r}-${c}`}>
                          <circle
                            cx={x} cy={y} r={isPath ? 6 : 4}
                            fill={isPlane ? '#4da3ff' : isRunway ? '#f6c56f' : isPath ? 'rgba(77,163,255,0.35)' : 'rgba(255,255,255,0.08)'}
                            stroke={isPath ? (isPlane ? '#4da3ff' : isRunway ? '#f6c56f' : 'rgba(77,163,255,0.7)') : 'rgba(255,255,255,0.12)'}
                            strokeWidth="1.2"
                          />
                          {/* Edge lines to right/down neighbors */}
                          {c < 5 && <line x1={x} y1={y} x2={x+40} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>}
                          {r < 4 && <line x1={x} y1={y} x2={x} y2={y+25} stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>}
                        </g>
                      )
                    })
                  ))}
                  {/* Path highlight */}
                  <polyline points="10,60 50,60 90,35 130,10 170,10 210,10" stroke="rgba(77,163,255,0.6)" strokeWidth="2" strokeDasharray="4,3" fill="none"/>
                  {/* Labels */}
                  <text x="10" y="75" fontSize="8" fill="#4da3ff" textAnchor="middle">avião</text>
                  <text x="210" y="6" fontSize="8" fill="#f6c56f" textAnchor="middle">pista</text>
                  <text x="130" y="115" fontSize="8" fill="rgba(155,180,210,0.7)" textAnchor="middle">10 × 8 = 80 nós · grade ~80 px por célula</text>
                </svg>
              </div>

              {/* ── Seção 2: Custo das arestas ── */}
              <div className="ag-info-section">
                <div className="ag-info-section-title">
                  <span className="ag-info-section-num">2</span>
                  Custo das Arestas
                </div>
                <div className="ag-info-cost-grid">
                  <div className="ag-info-cost-card ag-info-cost--free">
                    <span className="ag-info-cost-val">= dist</span>
                    <span className="ag-info-cost-label">LIVRE</span>
                    <span className="ag-info-cost-desc">Custo = distância euclidiana entre nós</span>
                  </div>
                  <div className="ag-info-cost-card ag-info-cost--near">
                    <span className="ag-info-cost-val">+ pen</span>
                    <span className="ag-info-cost-label">AVIÃO PRÓXIMO</span>
                    <span className="ag-info-cost-desc">Penalidade cresce conforme a proximidade (&lt; 90 px)</span>
                  </div>
                  <div className="ag-info-cost-card ag-info-cost--block">
                    <span className="ag-info-cost-val">bloq</span>
                    <span className="ag-info-cost-label">FUNNEL OPOSTO</span>
                    <span className="ag-info-cost-desc">Entrada contrária é bloqueada antes do Dijkstra rodar</span>
                  </div>
                </div>
                <div className="ag-info-formula">
                  <span className="ag-ifl--label">custo(u→v)</span>
                  <span className="ag-ifl--op"> = </span>
                  <span className="ag-ifl--val">dist(u,v)</span>
                  <span className="ag-ifl--op"> + </span>
                  <span className="ag-ifl--pen">Σ max(0, 90 − d</span>
                  <span className="ag-ifl--dim">avião</span>
                  <span className="ag-ifl--pen">) × 2.2</span>
                </div>
              </div>

              {/* ── Seção 3: Funil de aproximação ── */}
              <div className="ag-info-section">
                <div className="ag-info-section-title">
                  <span className="ag-info-section-num">3</span>
                  Funil de Aproximação Vertical
                </div>
                <p className="ag-info-desc">
                  O caminho termina num <strong>nó virtual</strong> acima ou abaixo da pista, garantindo que o avião entre <em>reto na vertical</em>. A distância do funil varia com velocidade e manobrabilidade do avião.
                </p>
                <svg className="ag-info-svg ag-info-svg--funnel" viewBox="0 0 260 100" fill="none">
                  {/* Runway strip */}
                  <rect x="115" y="30" width="16" height="50" rx="2" fill="rgba(246,197,111,0.15)" stroke="rgba(246,197,111,0.4)" strokeWidth="1"/>
                  <text x="123" y="78" fontSize="7" fill="rgba(246,197,111,0.7)" textAnchor="middle">pista</text>
                  {/* Top funnel examples per type */}
                  {[
                    { color:'#4da3ff', dist:40,  label:'pequeno', x:40  },
                    { color:'#a78bfa', dist:65,  label:'médio',   x:123 },
                    { color:'#f6c56f', dist:140, label:'pesado',  x:206 },
                  ].map(({color,dist,label,x}) => {
                    const pct = dist/140
                    const funnelY = 30 - pct*26
                    return (
                      <g key={label}>
                        <circle cx={x} cy={funnelY} r="4" fill={color} opacity="0.85"/>
                        <line x1={x} y1={funnelY+4} x2={x} y2={28} stroke={color} strokeWidth="1.5" strokeDasharray="3,2" opacity="0.7"/>
                        <text x={x} y={funnelY-7} fontSize="7" fill={color} textAnchor="middle">{dist}px</text>
                        <text x={x} y="96" fontSize="7" fill="rgba(155,180,210,0.7)" textAnchor="middle">{label}</text>
                      </g>
                    )
                  })}
                  {/* Mid runway line */}
                  <line x1="40" y1="30" x2="206" y2="30" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="3,3"/>
                  <text x="10" y="33" fontSize="7" fill="rgba(155,180,210,0.5)" textAnchor="start">topo pista</text>
                </svg>
              </div>

              {/* ── Seção 4: Rotas coloridas ── */}
              <div className="ag-info-section">
                <div className="ag-info-section-title">
                  <span className="ag-info-section-num">4</span>
                  Sugestão de Rota
                </div>
                <div className="ag-info-route-row">
                  {[
                    { color:'#4da3ff', rgb:'77,163,255',  label:'Pequeno', sub:'rápido de alinhar'  },
                    { color:'#a78bfa', rgb:'167,139,250', label:'Médio',   sub:'curva moderada'     },
                    { color:'#f6c56f', rgb:'246,197,111', label:'Pesado',  sub:'precisa de espaço'  },
                  ].map(({color, label, sub}) => (
                    <div className="ag-info-route-card" key={label} style={{'--rc': color}}>
                      <span className="ag-info-route-dash">- - -</span>
                      <span className="ag-info-route-label">{label}</span>
                      <span className="ag-info-route-sub">{sub}</span>
                    </div>
                  ))}
                </div>
                <p className="ag-info-desc ag-info-desc--sm">
                  O tracejado atualiza a cada 0.25 s. O primeiro ponto segue a ponta do nariz do avião a cada frame sem re-rodar o algoritmo.
                </p>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Ranking overlay */}
      {showRanking && (
        <div className="ag-rank-overlay" onClick={e => e.target === e.currentTarget && setShowRanking(false)}>
          <div className="panel ag-rank-panel">
            <div className="ag-rank-header">
              <h2 className="ag-rank-title">Ranking</h2>
              <button className="ag-rank-close" onClick={() => setShowRanking(false)} type="button">✕</button>
            </div>

            {ranking.length === 0 ? (
              <p className="ag-rank-empty">Nenhuma partida registrada ainda.<br/>Jogue e entre para o hall!</p>
            ) : (
              <div className="ag-rank-list">
                {ranking.slice(0, 15).map((entry, i) => (
                  <div className="ag-rank-row" key={i}>
                    <span className="ag-rank-pos">
                      {i < 3 ? MEDALS[i] : <span className="ag-rank-num">{i + 1}</span>}
                    </span>
                    <span className="ag-rank-name">{entry.name}</span>
                    <span className="ag-rank-pts">{entry.score} pts</span>
                    <span className="ag-rank-land">{entry.landed ?? 0} ✈</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

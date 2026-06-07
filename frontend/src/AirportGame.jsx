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

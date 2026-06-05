import { useRef } from 'react';
import axios from 'axios';
import aviaoCabine from './assets/Aviao_cabine.png';
import './css/AirportGame.css';

const API = 'http://localhost:5000';

const PLANE_TYPES = [
  { label: 'Pequeno', pts: '10 pts', desc: 'Lento, gira na hora', color: '#4da3ff' },
  { label: 'Médio', pts: '50 pts', desc: 'Velocidade moderada', color: '#a78bfa' },
  { label: 'Pesado', pts: '100 pts', desc: 'Rápido e difícil de guiar', color: '#f6c56f' },
];

export default function AirportGame({ onBack }) {
  const bgRef = useRef(null);

  const handleMouseMove = (e) => {
    const x = e.clientX / window.innerWidth - 0.5;
    const y = e.clientY / window.innerHeight - 0.5;

    if (bgRef.current) {
      bgRef.current.style.transform = `translate(${-x * 32}px, ${-y * 18}px) scale(1.03)`;
    }
  };

  const handleMouseLeave = () => {
    if (bgRef.current) {
      bgRef.current.style.transform = 'translate(0px, 0px) scale(1)';
    }
  };

  const handleLaunch = async () => {
    try {
      await axios.post(`${API}/api/launch-game`);
    } catch (error) {
      console.error('Erro ao iniciar o jogo:', error);
    }
  };

  return (
    <div
      className="home-clean-bg"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
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
            <path
              d="M15 6L9 12L15 18"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="home-back-text">Voltar</span>
      </button>

      <div className="home-shell">
        <div className="ag-header">
          <h1 className="ag-title">Controle de Tráfego Aéreo</h1>
          <p className="ag-subtitle">
            Guie os aviões até a pista sem deixá-los colidir
          </p>
        </div>

        <div className="home-clean-content">
          <div className="ag-inner">
            <div className="ag-planes-row">
              {PLANE_TYPES.map((p) => (
                <div
                  className="ag-plane-card"
                  key={p.label}
                  style={{ '--cc': p.color }}
                >
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

            <div className="ag-launch-wrap">
              <button
                className="ag-launch-btn"
                onClick={handleLaunch}
                type="button"
              >
                <span className="ag-launch-btn-text">▶ Jogar Agora</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
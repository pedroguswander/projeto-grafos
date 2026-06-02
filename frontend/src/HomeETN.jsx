import { useRef } from 'react';
import logoCompletaEtn from './assets/logo-2/logo-branca-isolada2.png';
import navioCabine from './assets/Navio_cabine.png';
import './css/Home.css';

export default function HomeETN({ onNavigate }) {
  const bgRef = useRef(null);

  const handleMouseMove = (e) => {
    const { innerWidth, innerHeight } = window;
    const x = (e.clientX / innerWidth - 0.5) * 1.0;
    const y = (e.clientY / innerHeight - 0.5) * 1.0;

    if (bgRef.current) {
      bgRef.current.style.transform = `translate(${-x * 32}px, ${-y * 18}px) scale(1.03)`;
    }
  };

  const handleMouseLeave = () => {
    if (bgRef.current) {
      bgRef.current.style.transform = 'translate(0px, 0px) scale(1)';
    }
  };

  return (
    <div
      className="home-clean-bg home-etn-theme"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div
        ref={bgRef}
        className="home-bg-image"
        style={{ backgroundImage: `url(${navioCabine})` }}
      />

      <button
        className="home-back-button home-back-floating"
        onClick={() => onNavigate('splash')}
        type="button"
        title="Voltar"
      >
        <span className="home-back-icon" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
          >
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
        <div className="home-logo-wrap">
          <img
            src={logoCompletaEtn}
            alt="Logo ETN"
            className="main-logo-clean"
          />
        </div>

        <div className="home-clean-content">
          <div className="home-actions-grid">
            <button
              className="hub-card pill-left"
              onClick={() => onNavigate('database-etn')}
              type="button"
            >
              <span className="hub-card-title">DATA BASE</span>
              <span className="hub-card-sub">Base de dados operacional</span>
            </button>

            <button
              className="hub-card pill-right"
              onClick={() => onNavigate('regras-etn')}
              type="button"
            >
              <span className="hub-card-title">REGRAS & PESOS</span>
              <span className="hub-card-sub">Critérios do grafo</span>
            </button>

            <button
              className="hub-card pill-left"
              onClick={() => onNavigate('requisitos-etn')}
              type="button"
            >
              <span className="hub-card-title">REQUISITOS DO PROJETO</span>
              <span className="hub-card-sub">Escopo e objetivos</span>
            </button>

            <button
              className="hub-card pill-right"
              onClick={() => onNavigate('relatorio-etn')}
              type="button"
            >
              <span className="hub-card-title">RELATÓRIO ETN</span>
              <span className="hub-card-sub">Documento de relatório da parte II</span>
            </button>

            <button
              className="hub-card pill-left ia-card"
              onClick={() => onNavigate('declaracao-ia-etn')}
              type="button"
            >
              <span className="hub-card-title">DECLARAÇÃO IA</span>
              <span className="hub-card-sub">Transparência e uso de IA</span>
            </button>

            <button
              className="hub-card pill-right"
              onClick={() => onNavigate('dashboard-etn')}
              type="button"
            >
              <span className="hub-card-title">DASHBOARD</span>
              <span className="hub-card-sub">Visão analítica</span>
            </button>

            <button
              className="hub-card flight-panel-card"
              onClick={() => onNavigate('painel-etn')}
              type="button"
            >
              <span className="hub-card-title">PAINEL DE ROTAS</span>
              <span className="hub-card-sub">
                Visualização principal e acompanhamento operacional
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}



import React, { useRef } from 'react';
import logoCompletaEtn from './assets/logo-2/logo-branca-isolada2.png';
import navioCabine from './assets/Navio_cabine.png';


export default function HomeETN({ onNavigate }) {
  const bgRef = useRef(null);

  // Parallax effect handler (movendo a imagem conforme o cursor)
  const handleMouseMove = (e) => {
    const { innerWidth, innerHeight } = window;
    const x = (e.clientX / innerWidth - 0.5) * 1.0;
    const y = (e.clientY / innerHeight - 0.5) * 1.0;
    if (bgRef.current) {
      bgRef.current.style.transform = `translate(${-x * 40}px, ${-y * 20}px) scale(1.04)`;
    }
  };

  const handleMouseLeave = () => {
    if (bgRef.current) {
      bgRef.current.style.transform = 'translate(0px, 0px) scale(1)';
    }
  };

  return (
    <div className="home-etn-bg" style={{ position: 'relative', overflow: 'hidden' }} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      {/* Background cabine navio com efeito parallax */}
      <div
        ref={bgRef}
        style={{
          backgroundImage: `url(${navioCabine})`,
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          zIndex: 0,
          transition: 'transform 0.3s cubic-bezier(.25,.8,.25,1)',
          filter: 'brightness(0.55) blur(0.5px)',
        }}
      />
      <button
        className="home-back-button home-back-floating"
        onClick={() => onNavigate('splash')}
        type="button"
        title="Voltar"
      >
        <span className="home-back-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="18" height="18">
            <path d="M15 6L9 12L15 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="home-back-text">Voltar</span>
      </button>
      {/* Conteúdo original sobreposto */}
      <div className="home-etn-content" style={{ position: 'relative', zIndex: 1 }}>
        <img src={logoCompletaEtn} alt="Logo ETN" className="main-logo-etn" />
        <div className="home-hub-etn">
          <div className="hub-grid-etn">
            <div className="hub-col-etn">
              <button className="hub-card-etn" onClick={() => onNavigate('')}>
                <span className="hub-card-title-etn">REQUISITOS DO PROJETO</span>
                <span className="hub-card-sub-etn">Escopo e objetivos</span>
              </button>
              <button className="hub-card-etn" onClick={() => onNavigate('')}>
                <span className="hub-card-title-etn">REGRAS & PESOS</span>
                <span className="hub-card-sub-etn">Critérios do grafo</span>
              </button>
            </div>
            <div className="hub-center-wrap-etn">
              <div className="hub-center-lines-etn"></div>
              <button className="hub-card-etn hub-card-main-etn" onClick={() => onNavigate('')}>
                <span className="hub-card-title-etn">PAINEL DE ROTAS</span>
                <span className="hub-card-sub-etn">Visualização principal</span>
              </button>
            </div>
            <div className="hub-col-etn">
              <button className="hub-card-etn" onClick={() => onNavigate('')}>
                <span className="hub-card-title-etn">MÉTRICAS GLOBAIS</span>
                <span className="hub-card-sub-etn">Indicadores gerais</span>
              </button>
              <button className="hub-card-etn" onClick={() => onNavigate('dashboard-etn')}>
                <span className="hub-card-title-etn">DASHBOARD</span>
                <span className="hub-card-sub-etn">Visão analítica</span>
              </button>
            </div>
          </div>
          <div className="hub-bottom-etn">
            <button className="hub-card-etn hub-card-bottom-etn" onClick={() => onNavigate('database-etn')}>
              <span className="hub-card-title-etn">DATA BASE</span>
              <span className="hub-card-sub-etn">Base de dados operacional</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

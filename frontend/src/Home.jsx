
import logo from './assets/logo/logo_branca_completa.png';
import { useRef } from 'react';
import aviaoCabine from './assets/Aviao_cabine.png';
import './css/Home.css';

export default function Home({ onNavigate }) {
  const bgRef = useRef(null);


  // Parallax effect handler (movendo a imagem conforme o cursor)
  const handleMouseMove = (e) => {
    const { innerWidth, innerHeight } = window;
    const x = (e.clientX / innerWidth - 0.5) * 1.0; // -0.5 a 0.5
    const y = (e.clientY / innerHeight - 0.5) * 1.0;
    if (bgRef.current) {
      // Move até 40px para os lados e 20px para cima/baixo
      bgRef.current.style.transform = `translate(${-x * 40}px, ${-y * 20}px) scale(1.04)`;
    }
  };

  const handleMouseLeave = () => {
    if (bgRef.current) {
      bgRef.current.style.transform = 'translate(0px, 0px) scale(1)';
    }
  };

  return (
    <div className="home-clean-bg" style={{ position: 'relative', overflow: 'hidden' }} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      {/* Background cabine com efeito parallax */}
      <div
        ref={bgRef}
        style={{
          backgroundImage: `url(${aviaoCabine})`,
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
      {/* Conteúdo original sobreposto */}
      <div className="home-clean-content" style={{ position: 'relative', zIndex: 1 }}>
        <img src={logo} alt="Logo ETA Airlines" className="main-logo-clean" />
        <div className="home-hub">
          <div className="hub-grid">
            <div className="hub-col">
              <button className="hub-card" onClick={() => onNavigate('requisitos')}>
                <span className="hub-card-title">REQUISITOS DO PROJETO</span>
                <span className="hub-card-sub">Escopo e objetivos</span>
              </button>
              <button className="hub-card" onClick={() => onNavigate('regras')}>
                <span className="hub-card-title">REGRAS & PESOS</span>
                <span className="hub-card-sub">Critérios do grafo</span>
              </button>
            </div>
            <div className="hub-center-wrap">
              <div className="hub-center-lines"></div>
              <button className="hub-card hub-card-main" onClick={() => onNavigate('painel')}>
                <span className="hub-card-title">PAINEL DE VOOS</span>
                <span className="hub-card-sub">Visualização principal</span>
              </button>
            </div>
            <div className="hub-col">
              <button className="hub-card" onClick={() => onNavigate('metricas')}>
                <span className="hub-card-title">MÉTRICAS GLOBAIS</span>
                <span className="hub-card-sub">Indicadores gerais</span>
              </button>
              <button className="hub-card" onClick={() => onNavigate('dashboard')}>
                <span className="hub-card-title">DASHBOARD</span>
                <span className="hub-card-sub">Visão analítica</span>
              </button>
            </div>
          </div>
          <div className="hub-bottom">
            <button className="hub-card hub-card-bottom" onClick={() => onNavigate('database')}>
              <span className="hub-card-title">DATA BASE</span>
              <span className="hub-card-sub">Base de dados operacional</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

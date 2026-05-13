import logo from './assets/logo/logo_branca_completa.png';
import './Home.css';

export default function Home({ onNavigate }) {
  return (
    <div className="home-clean-bg">
      <div className="home-clean-content">
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
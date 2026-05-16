
import logoCompletaEtn from './assets/logo-2/logo-branca-isolada2.png';

export default function HomeETN({ onNavigate }) {
  return (
    <div className="home-etn-bg">
      <div className="home-etn-content">
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

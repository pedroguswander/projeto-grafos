import logo from './assets/logo/logo_branca_completa.png'
import './Home.css'

export default function Home({ onNavigate }) {
  return (
    <div className="home-clean-bg">
      <div className="home-clean-content">
        <img src={logo} alt="Logo ETA Airlines" className="main-logo-clean" />

        <p className="home-subtitle">
          Sistema visual de rotas aéreas com cálculo do menor caminho usando grafos e algoritmo de Dijkstra.
        </p>

        <div className="clean-btn-row">
          <button className="clean-btn" onClick={() => onNavigate('requisitos')}>
            REQUISITOS DO PROJETO
          </button>
          <button className="clean-btn" onClick={() => onNavigate('regras')}>
            REGRAS & PESOS
          </button>
          <button className="clean-btn main" onClick={() => onNavigate('painel')}>
            PAINEL DE VOOS
          </button>
          <button className="clean-btn" onClick={() => onNavigate('metricas')}>
            MÉTRICAS GLOBAIS
          </button>
        </div>
      </div>
    </div>
  )
}
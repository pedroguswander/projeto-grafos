import './css/Requisitos_ETN.css';
import regrasPdfETN from './assets/Regras_e_Pesos_ETN.pdf';

export default function RegrasETN({ onBack }) {
  return (
    <div className="declaracaoia-bg declaracaoia-etn-theme">
      <div className="declaracaoia-container">
        <div className="declaracaoia-top-actions">
          <button
            onClick={onBack}
            className="declaracaoia-back-button"
            type="button"
            title="Voltar"
          >
            <span className="declaracaoia-back-icon" aria-hidden="true">
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
            <span className="declaracaoia-back-text">Voltar</span>
          </button>
        </div>

        <div className="declaracaoia-header">
          <h1 className="declaracaoia-title">Regras & Pesos</h1>
          <div className="declaracaoia-subtitle">
            Visualização do documento oficial com as regras e pesos do projeto.
          </div>
        </div>

        <div className="declaracaoia-actions">
          <a
            href={regrasPdfETN}
            target="_blank"
            rel="noreferrer"
            className="declaracaoia-action-btn secondary"
          >
            Abrir em nova aba
          </a>

          <a
            href={regrasPdfETN}
            download="Regras_e_Pesos_ETN.pdf"
            className="declaracaoia-action-btn primary"
          >
            Baixar PDF
          </a>
        </div>

        <div className="pdf-viewer-wrapper">
          <embed
            src={`${regrasPdfETN}#toolbar=1&navpanes=0&scrollbar=1`}
            type="application/pdf"
            className="pdf-viewer"
          />
        </div>
      </div>
    </div>
  );
}

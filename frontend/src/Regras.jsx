import './Regras.css';
import pdfRegras from './assets/Regra de pesos.pdf';

export default function Regras({ onBack }) {
  return (
    <div className="regras-bg">
      <div className="regras-container">
        <div className="regras-top-actions">
          <button className="regras-back-button" onClick={onBack} type="button">
            <span className="regras-back-icon" aria-hidden="true">
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
            <span className="regras-back-text">Voltar</span>
          </button>
        </div>

        <div className="regras-header">
          <h1 className="regras-title">Regras & Pesos</h1>
          <p className="regras-subtitle">
            Visualização do documento oficial com as regras e pesos do projeto.
          </p>
        </div>

        <div className="regras-actions">
          <a
            href={pdfRegras}
            target="_blank"
            rel="noreferrer"
            className="regras-action-btn secondary"
          >
            Abrir em nova aba
          </a>

          <a
            href={pdfRegras}
            download="Regra de pesos.pdf"
            className="regras-action-btn primary"
          >
            Baixar PDF
          </a>
        </div>

        <div className="pdf-viewer-wrapper">
          <embed
            src={`${pdfRegras}#toolbar=1&navpanes=0&scrollbar=1`}
            type="application/pdf"
            className="pdf-viewer"
          />
        </div>
      </div>
    </div>
  );
}
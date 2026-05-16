import './css/Requisitos.css';
import requisitosPdf from './assets/Requisitos - Parte 1.pdf';

export default function Requisitos({ onBack }) {
  return (
    <div className="requisitos-bg">
      <div className="requisitos-container">
        <div className="requisitos-top-actions">
          <button
            className="requisitos-back-button"
            onClick={onBack}
            type="button"
            title="Voltar"
          >
            <span className="requisitos-back-icon" aria-hidden="true">
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
            <span className="requisitos-back-text">Voltar</span>
          </button>
        </div>

        <div className="requisitos-header">
          <h1 className="requisitos-title">Requisitos do Projeto</h1>
          <p className="requisitos-subtitle">
            Visualização do documento oficial com os requisitos do projeto.
          </p>
        </div>

        <div className="requisitos-actions">
          <a
            href={requisitosPdf}
            target="_blank"
            rel="noreferrer"
            className="requisitos-action-btn secondary"
          >
            Abrir em nova aba
          </a>
          <a
            href={requisitosPdf}
            download="Requisitos - Parte 1.pdf"
            className="requisitos-action-btn primary"
          >
            Baixar PDF
          </a>
        </div>

        <div className="pdf-viewer-wrapper">
          <embed
            src={`${requisitosPdf}#toolbar=1&navpanes=0&scrollbar=1`}
            type="application/pdf"
            className="pdf-viewer"
          />
        </div>
      </div>
    </div>
  );
}

import './css/DeclaracaoIA.css';
import declaracaoIAPdf from './assets/Declaração IA.pdf';


export default function DeclaracaoIA({ onBack }) {

  return (
    <div className="declaracaoia-bg">
      <div className="declaracaoia-container">
        <div className="declaracaoia-top-actions">
          <button
            className="declaracaoia-back-button"
            onClick={onBack}
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
          <h1 className="declaracaoia-title">Declaração de Inteligência Artificial</h1>
          <div className="declaracaoia-subtitle">
            Consulte abaixo a declaração de uso de IA no projeto. Você pode visualizar ou baixar o documento completo.
          </div>
        </div>

        <div className="declaracaoia-actions">
          <a
            href={declaracaoIAPdf}
            target="_blank"
            rel="noreferrer"
            className="declaracaoia-action-btn secondary"
          >
            Abrir em nova aba
          </a>
          <a
            href={declaracaoIAPdf}
            download="Declaração IA.pdf"
            className="declaracaoia-action-btn primary"
          >
            Baixar PDF
          </a>
        </div>

        <div className="pdf-viewer-wrapper">
          <embed
            src={`${declaracaoIAPdf}#toolbar=1&navpanes=0&scrollbar=1`}
            type="application/pdf"
            className="pdf-viewer"
          />
        </div>
      </div>
    </div>
  );
}
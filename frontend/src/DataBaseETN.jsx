import React, { useMemo, useState } from 'react';
import aviaoCru from './assets/Aviao/aviao cru.png';
import asasImg from './assets/Aviao/azas.png';
import caldaImg from './assets/Aviao/calda.png';
import frenteImg from './assets/Aviao/frente.png';
import meioImg from './assets/Aviao/meio.png';
import turbinasImg from './assets/Aviao/turbinas.png';

export default function DataBaseETN({ onBack }) {
  const [parteSelecionada, setParteSelecionada] = useState('base');

  const imagens = useMemo(
    () => ({
      base: {
        label: 'Avião cru',
        src: aviaoCru,
        desc: 'Visualização base da aeronave.',
      },
      frente: {
        label: 'Frente',
        src: frenteImg,
        desc: 'Seção frontal da aeronave.',
      },
      meio: {
        label: 'Meio',
        src: meioImg,
        desc: 'Parte central da fuselagem.',
      },
      asas: {
        label: 'Asas',
        src: asasImg,
        desc: 'Estrutura lateral responsável pela sustentação.',
      },
      turbinas: {
        label: 'Turbinas',
        src: turbinasImg,
        desc: 'Sistema de propulsão da aeronave.',
      },
      calda: {
        label: 'Calda',
        src: caldaImg,
        desc: 'Parte traseira da aeronave.',
      },
    }),
    []
  );

  const imagemAtual = imagens[parteSelecionada] || imagens.base;

  return (
    <div className="database-etn-page">
      <div className="database-etn-shell">
        <div className="database-etn-topbar">
          <button className="database-etn-back-btn" onClick={onBack} type="button">
            <span className="database-etn-back-icon" aria-hidden="true">
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
            <span className="database-etn-back-text">Voltar</span>
          </button>
        </div>

        <div className="database-etn-header">
          <h1 className="database-etn-title">Estrutura do Avião</h1>
          <p className="database-etn-desc">
            Selecione uma parte específica da aeronave pelo menu ou clicando
            diretamente sobre a imagem interativa.
          </p>
        </div>

        <div className="database-etn-content">
          <div className="database-etn-panel database-etn-controls">
            <h2 className="database-etn-panel-title">Seleção de componente</h2>
            <p className="database-etn-panel-text">
              Escolha qual parte do avião deseja visualizar.
            </p>

            <label htmlFor="parte-aviao-etn" className="database-etn-label">
              Parte do avião
            </label>

            <select
              id="parte-aviao-etn"
              className="database-etn-select"
              value={parteSelecionada}
              onChange={(e) => setParteSelecionada(e.target.value)}
            >
              <option value="base">Avião cru</option>
              <option value="frente">Frente</option>
              <option value="meio">Meio</option>
              <option value="asas">Asas</option>
              <option value="turbinas">Turbinas</option>
              <option value="calda">Calda</option>
            </select>
          </div>

          <div className="database-etn-panel database-etn-image-panel">
            <img
              src={imagemAtual.src}
              alt={imagemAtual.label}
              className="database-etn-image"
            />
            <div className="database-etn-image-desc">
              <strong>{imagemAtual.label}</strong>
              <div>{imagemAtual.desc}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

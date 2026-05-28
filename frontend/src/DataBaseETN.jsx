
import React, { useMemo, useState } from 'react';
import './css/DataBaseETN.css';
import navioCru from './assets/navio/navio-cru.png';
import navioFrente from './assets/navio/navio-frente.png';
import navioMeio from './assets/navio/navio-meio.png';
import navioCauda from './assets/navio/navio-cauda.png';
import navioTorre from './assets/navio/navio-torre.png';
import navioBotes from './assets/navio/navio-botes.png';
import navioCargaSuperior from './assets/navio/navio-carga-superior.png';
import navioCargaInferior from './assets/navio/navio-carga-inferior.png';

// TODO: Plotly - Usar para gerar mapas
export default function DataBaseETN({ onBack }) {
  const [parteSelecionada, setParteSelecionada] = useState('base');

  const imagens = useMemo(
    () => ({
      base: {
        label: 'Navio cru',
        src: navioCru,
        desc: 'Visualização base do navio.',
      },
      frente: {
        label: 'Frente',
        src: navioFrente,
        desc: 'Seção frontal do navio.',
      },
      meio: {
        label: 'Meio',
        src: navioMeio,
        desc: 'Parte central do navio.',
      },
      cauda: {
        label: 'Cauda',
        src: navioCauda,
        desc: 'Parte traseira do navio.',
      },
      torre: {
        label: 'Torre',
        src: navioTorre,
        desc: 'Torre de comando e navegação.',
      },
      botes: {
        label: 'Botes',
        src: navioBotes,
        desc: 'Botes salva-vidas e acessórios.',
      },
      cargaSuperior: {
        label: 'Carga Superior',
        src: navioCargaSuperior,
        desc: 'Área de carga superior do navio.',
      },
      cargaInferior: {
        label: 'Carga Inferior',
        src: navioCargaInferior,
        desc: 'Área de carga inferior do navio.',
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
          <h1 className="database-etn-title">Estrutura do Navio</h1>
          <p className="database-etn-desc">
            Selecione uma parte específica do navio pelo menu ou clicando diretamente sobre a imagem interativa.
          </p>
        </div>

        <div className="database-etn-content">
          <div className="database-etn-panel database-etn-controls">
            <h2 className="database-etn-panel-title">Seleção de componente</h2>
            <p className="database-etn-panel-text">
              Escolha qual parte do navio deseja visualizar.
            </p>

            <label htmlFor="parte-navio-etn" className="database-etn-label">
              Parte do navio
            </label>

            <select
              id="parte-navio-etn"
              className="database-etn-select"
              value={parteSelecionada}
              onChange={(e) => setParteSelecionada(e.target.value)}
            >
              <option value="base">Navio cru</option>
              <option value="frente">Frente</option>
              <option value="meio">Meio</option>
              <option value="cauda">Cauda</option>
              <option value="torre">Torre</option>
              <option value="botes">Botes</option>
              <option value="cargaSuperior">Carga Superior</option>
              <option value="cargaInferior">Carga Inferior</option>
            </select>

            <div className="database-etn-info-card">
              <span className="database-etn-info-label">Selecionado</span>
              <strong className="database-etn-info-title">{imagemAtual.label}</strong>
              <p className="database-etn-info-desc">{imagemAtual.desc}</p>
            </div>
          </div>

          <div className="database-etn-panel database-etn-viewer">
            <div className="database-etn-image-head">
              <h2 className="database-etn-panel-title">Mapa clicável</h2>
              <span className="database-etn-image-tag">{imagemAtual.label}</span>
            </div>

            <div className="database-etn-image-frame">
              <div className="database-etn-clickable-ship">
                <img
                  src={imagemAtual.src}
                  alt={imagemAtual.label}
                  className="database-etn-image"
                />

                {/* Hotspots para seleção das áreas do navio */}
                <button type="button" className="ship-hotspot hotspot-navio-frente" onClick={() => setParteSelecionada('frente')} aria-label="Selecionar frente" />
                <button type="button" className="ship-hotspot hotspot-navio-frente2" onClick={() => setParteSelecionada('frente')} aria-label="Selecionar frente" />
                <button type="button" className="ship-hotspot hotspot-navio-meio" onClick={() => setParteSelecionada('meio')} aria-label="Selecionar meio" />
                <button type="button" className="ship-hotspot hotspot-navio-meio2" onClick={() => setParteSelecionada('meio')} aria-label="Selecionar meio" />
                <button type="button" className="ship-hotspot hotspot-navio-meio3" onClick={() => setParteSelecionada('meio')} aria-label="Selecionar meio" />
                <button type="button" className="ship-hotspot hotspot-navio-meio4" onClick={() => setParteSelecionada('meio')} aria-label="Selecionar meio" />
                <button type="button" className="ship-hotspot hotspot-navio-cauda" onClick={() => setParteSelecionada('cauda')} aria-label="Selecionar cauda" />
                <button type="button" className="ship-hotspot hotspot-navio-cauda2" onClick={() => setParteSelecionada('cauda')} aria-label="Selecionar cauda" />
                <button type="button" className="ship-hotspot hotspot-navio-cauda3" onClick={() => setParteSelecionada('cauda')} aria-label="Selecionar cauda" />
                <button type="button" className="ship-hotspot hotspot-navio-cauda4" onClick={() => setParteSelecionada('cauda')} aria-label="Selecionar cauda" />
                <button type="button" className="ship-hotspot hotspot-navio-torre" onClick={() => setParteSelecionada('torre')} aria-label="Selecionar torre" />
                <button type="button" className="ship-hotspot hotspot-navio-torre2" onClick={() => setParteSelecionada('torre')} aria-label="Selecionar torre" />
                <button type="button" className="ship-hotspot hotspot-navio-torre3" onClick={() => setParteSelecionada('torre')} aria-label="Selecionar torre" />
                <button type="button" className="ship-hotspot hotspot-navio-botes" onClick={() => setParteSelecionada('botes')} aria-label="Selecionar botes" />
                <button type="button" className="ship-hotspot hotspot-navio-botes2" onClick={() => setParteSelecionada('botes')} aria-label="Selecionar botes" />
                <button type="button" className="ship-hotspot hotspot-navio-carga-superior" onClick={() => setParteSelecionada('cargaSuperior')} aria-label="Selecionar carga superior" />
                <button type="button" className="ship-hotspot hotspot-navio-carga-superior2" onClick={() => setParteSelecionada('cargaSuperior')} aria-label="Selecionar carga superior" />
                <button type="button" className="ship-hotspot hotspot-navio-carga-superior3" onClick={() => setParteSelecionada('cargaSuperior')} aria-label="Selecionar carga superior" />
                <button type="button" className="ship-hotspot hotspot-navio-carga-inferior" onClick={() => setParteSelecionada('cargaInferior')} aria-label="Selecionar carga inferior" />
                <button type="button" className="ship-hotspot hotspot-navio-carga-inferior2" onClick={() => setParteSelecionada('cargaInferior')} aria-label="Selecionar carga inferior" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

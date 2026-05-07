import React, { useMemo, useState } from 'react';
import './DataBase.css';

import aviaoCru from './assets/Aviao/aviao cru.png';
import asasImg from './assets/Aviao/azas.png';
import caldaImg from './assets/Aviao/calda.png';
import frenteImg from './assets/Aviao/frente.png';
import meioImg from './assets/Aviao/meio.png';
import turbinasImg from './assets/Aviao/turbinas.png';

export default function DataBase({ onBack }) {
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
    <div className="database-page">
      <div className="database-shell">
        <div className="database-topbar">
          <button className="database-back-btn" onClick={onBack} type="button">
            ← Voltar
          </button>
        </div>

        <div className="database-header">
          <h1 className="database-title">Estrutura do Avião</h1>
          <p className="database-desc">
            Selecione uma parte específica da aeronave pelo menu ou clicando
            diretamente sobre a imagem interativa.
          </p>
        </div>

        <div className="database-content">
          <div className="database-panel database-controls">
            <h2 className="database-panel-title">Seleção de componente</h2>
            <p className="database-panel-text">
              Escolha qual parte do avião deseja visualizar.
            </p>

            <label htmlFor="parte-aviao" className="database-label">
              Parte do avião
            </label>

            <select
              id="parte-aviao"
              className="database-select"
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

            <div className="database-info-card">
              <span className="database-info-label">Selecionado</span>
              <strong className="database-info-title">{imagemAtual.label}</strong>
              <p className="database-info-desc">{imagemAtual.desc}</p>
            </div>
          </div>

          <div className="database-panel database-viewer">
            <div className="database-image-head">
              <h2 className="database-panel-title">Mapa clicável</h2>
              <span className="database-image-tag">{imagemAtual.label}</span>
            </div>

            <div className="database-image-frame">
              <div className="database-clickable-plane">
                <img
                  src={imagemAtual.src}
                  alt={imagemAtual.label}
                  className="database-image"
                />

                {/* Frente */}
                <button
                  type="button"
                  className="plane-hotspot hotspot-frente"
                  onClick={() => setParteSelecionada('frente')}
                  aria-label="Selecionar frente"
                />

                {/* Meio */}
                <button
                  type="button"
                  className="plane-hotspot hotspot-meio-1"
                  onClick={() => setParteSelecionada('meio')}
                  aria-label="Selecionar meio"
                />
                <button
                  type="button"
                  className="plane-hotspot hotspot-meio-2"
                  onClick={() => setParteSelecionada('meio')}
                  aria-label="Selecionar meio"
                />
                <button
                  type="button"
                  className="plane-hotspot hotspot-meio-3"
                  onClick={() => setParteSelecionada('meio')}
                  aria-label="Selecionar meio"
                />
                <button
                  type="button"
                  className="plane-hotspot hotspot-meio-4"
                  onClick={() => setParteSelecionada('meio')}
                  aria-label="Selecionar meio"
                />

                {/* Asas */}
                <button
                  type="button"
                  className="plane-hotspot hotspot-asa-1"
                  onClick={() => setParteSelecionada('asas')}
                  aria-label="Selecionar asas"
                />
                <button
                  type="button"
                  className="plane-hotspot hotspot-asa-2"
                  onClick={() => setParteSelecionada('asas')}
                  aria-label="Selecionar asas"
                />
                <button
                  type="button"
                  className="plane-hotspot hotspot-asa-3"
                  onClick={() => setParteSelecionada('asas')}
                  aria-label="Selecionar asas"
                />

                {/* Turbinas */}
                <button
                  type="button"
                  className="plane-hotspot hotspot-turbina-1"
                  onClick={() => setParteSelecionada('turbinas')}
                  aria-label="Selecionar turbinas"
                />
                <button
                  type="button"
                  className="plane-hotspot hotspot-turbina-2"
                  onClick={() => setParteSelecionada('turbinas')}
                  aria-label="Selecionar turbinas"
                />

                {/* Calda */}
                <button
                  type="button"
                  className="plane-hotspot hotspot-calda"
                  onClick={() => setParteSelecionada('calda')}
                  aria-label="Selecionar calda"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
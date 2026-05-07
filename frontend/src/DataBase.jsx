import React from 'react';
import './DataBase.css';

export default function DataBase({ onBack }) {
  return (
    <div className="database-page">
      <button className="database-back-btn" onClick={onBack} type="button">
        Voltar
      </button>
      <h1 className="database-title">Data Base</h1>
      <p className="database-desc">Planilhas utilizadas como estrutura basal do projeto</p>
    </div>
  );
}
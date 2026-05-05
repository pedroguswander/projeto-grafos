import React from 'react'

export const Dashboard = ({ onBack }) => {
  return (
    <div>
      <h1>Pagina do Dashboard</h1>
      <button className="back-button-text" onClick={onBack}>Voltar</button>
    </div>
  )
}
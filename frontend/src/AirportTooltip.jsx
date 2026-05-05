import React from 'react'
import './AirportTooltip.css'

export default function AirportTooltip({ airport, region, grau, ordem_ego, tamanho_ego, densidade_ego }) {
  if (!airport) return null
  return (
    <div className="airport-tooltip">
      <div className="tooltip-title">{airport}</div>
      <div className="tooltip-row"><span>Região:</span> <strong>{region}</strong></div>
      <div className="tooltip-row"><span>Grau:</span> <strong>{grau}</strong></div>
      <div className="tooltip-row"><span>Ordem Ego:</span> <strong>{ordem_ego}</strong></div>
      <div className="tooltip-row"><span>Tamanho Ego:</span> <strong>{tamanho_ego}</strong></div>
      <div className="tooltip-row"><span>Densidade Ego:</span> <strong>{densidade_ego}</strong></div>
    </div>
  )
}

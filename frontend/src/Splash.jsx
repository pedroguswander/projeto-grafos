import React from 'react';
import './Splash.css';
import logoCompleta from './assets/logo/logo_branca_completa.png';
import logoCompletaEtn from './assets/logo-2/logo-branca-completa2.png';

export default function Splash({ onNavigate }) {
  return (
    <div className="splash-container">
      <div
        className="splash-half splash-left"
        onClick={() => onNavigate('home')}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            onNavigate('home');
          }
        }}
      >
        <img
          src={logoCompleta}
          alt="ETA Airlines"
          className="splash-logo"
        />
      </div>

      <div
        className="splash-half splash-right"
        onClick={() => onNavigate('home-etn')}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            onNavigate('home-etn');
          }
        }}
      >
        <img
          src={logoCompletaEtn}
          alt="ETN Shipping"
          className="splash-logo"
        />
      </div>
    </div>
  );
}
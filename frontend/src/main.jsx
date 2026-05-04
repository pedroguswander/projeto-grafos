import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import Home from './Home.jsx';

function Root() {
  const [screen, setScreen] = useState('home');

  const handleNavigate = (target) => {
    if (target === 'painel') setScreen('app');
    else setScreen(target); // requisitos ou regras
  };

  if (screen === 'home') {
    return <Home onNavigate={handleNavigate} />;
  }
  if (screen === 'requisitos') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#fff' }}>
        <h1 style={{ marginBottom: 24 }}>REQUISITOS DO PROJETO</h1>
        <p style={{ maxWidth: 600, textAlign: 'center', marginBottom: 32 }}>Adicione aqui os requisitos do seu projeto.</p>
        <button className="home-btn" onClick={() => setScreen('home')}>Voltar</button>
      </div>
    );
  }
  if (screen === 'regras') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#fff' }}>
        <h1 style={{ marginBottom: 24 }}>REGRAS & PESOS</h1>
        <p style={{ maxWidth: 600, textAlign: 'center', marginBottom: 32 }}>Adicione aqui as regras e pesos do seu projeto.</p>
        <button className="home-btn" onClick={() => setScreen('home')}>Voltar</button>
      </div>
    );
  }
  // painel de voos
  return <App />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);

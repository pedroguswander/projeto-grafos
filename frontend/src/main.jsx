import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './App.css';
import './SearchBar.css';
import App from './App.jsx';
import Home from './Home.jsx';
import Regras from './Regras.jsx';
import { Dashboard } from './Dashboard/Dashboard.jsx';
import GlobalMetrics from './GlobalMetrics.jsx';
import DataBase from './DataBase.jsx';
import DataBaseETN from './DataBaseETN.jsx';
import Splash from './Splash.jsx';
import HomeETN from './HomeETN.jsx';



function Root() {
  const [screen, setScreen] = useState('splash');
  const [lastHome, setLastHome] = useState('home');

  const handleNavigate = (target) => {
    if (target === 'painel') setScreen('app');
    else if (target === 'home' || target === 'home-etn') {
      setLastHome(target);
      setScreen(target);
    } else if (target === 'database') {
      if (lastHome === 'home-etn' || screen === 'home-etn') setScreen('database-etn');
      else setScreen('database');
    } else {
      setScreen(target);
    }
  };

  if (screen === 'splash') return <Splash onNavigate={setScreen} />;
  if (screen === 'home') return <Home onNavigate={handleNavigate} />;
  if (screen === 'home-etn') return <HomeETN onNavigate={handleNavigate} />;
  if (screen === 'dashboard') return <Dashboard onBack={() => setScreen(lastHome)} />;
  if (screen === 'requisitos') {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: '#fff',
        }}
      >
        <h1 style={{ marginBottom: 24 }}>REQUISITOS DO PROJETO</h1>
        <p style={{ maxWidth: 600, textAlign: 'center', marginBottom: 32 }}>
          Adicione aqui os requisitos do seu projeto.
        </p>
        <button className="home-btn" onClick={() => setScreen(lastHome)}>
          Voltar
        </button>
      </div>
    );
  }
  if (screen === 'regras') return <Regras onBack={() => setScreen(lastHome)} />;
  if (screen === 'metricas') return <GlobalMetrics onBack={() => setScreen(lastHome)} />;
  if (screen === 'database') return <DataBase onBack={() => setScreen(lastHome)} />;
  if (screen === 'database-etn') return <DataBaseETN onBack={() => setScreen('home-etn')} />;

  return <App onNavigate={handleNavigate} />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
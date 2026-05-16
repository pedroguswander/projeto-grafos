import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './css/index.css';
import './css/App.css';
import './css/SearchBar.css';
import './css/AirportTooltip.css';
import './css/HomeETN.css';
import './css/Splash.css';
import './css/DataBase.css';
import './css/GlobalMetrics.css';
import './css/Home.css';
import './css/Regras.css';
import './css/airport-ego-panel-horizontal.css';
import './css/DataBaseETN.css';
import './css/DashboardETN.css';
import './css/DeclaracaoIA.css';
import App from './App.jsx';
import Home from './Home.jsx';
import Regras from './Regras.jsx';
import { Dashboard } from './Dashboard/Dashboard.jsx';
import GlobalMetrics from './GlobalMetrics.jsx';
import DataBase from './DataBase.jsx';
import DataBaseETN from './DataBaseETN.jsx';
import Splash from './Splash.jsx';
import HomeETN from './HomeETN.jsx';
import { DashboardETN } from './Dashboard/DashboardETN.jsx';
import DeclaracaoIA from './DeclaracaoIA.jsx';
import Requisitos from './Requisitos.jsx';

function Root() {
  const [screen, setScreen] = useState('splash');
  const [lastHome, setLastHome] = useState('home');

  const handleNavigate = (target) => {
    if (target === 'painel') {
      setScreen('app');
    } else if (target === 'home' || target === 'home-etn') {
      setLastHome(target);
      setScreen(target);
    } else if (target === 'database') {
      if (lastHome === 'home-etn' || screen === 'home-etn') {
        setScreen('database-etn');
      } else {
        setScreen('database');
      }
    } else {
      setScreen(target);
    }
  };

  if (screen === 'splash') return <Splash onNavigate={setScreen} />;
  if (screen === 'home') return <Home onNavigate={handleNavigate} />;
  if (screen === 'home-etn') return <HomeETN onNavigate={handleNavigate} />;
  if (screen === 'dashboard') return <Dashboard onBack={() => setScreen(lastHome)} />;
  if (screen === 'dashboard-etn') return <DashboardETN onBack={() => setScreen(lastHome)} />;
  if (screen === 'requisitos') return <Requisitos onBack={() => setScreen(lastHome)} />;
  if (screen === 'regras') return <Regras onBack={() => setScreen(lastHome)} />;
  if (screen === 'metricas') return <GlobalMetrics onBack={() => setScreen(lastHome)} />;
  if (screen === 'database') return <DataBase onBack={() => setScreen(lastHome)} />;
  if (screen === 'database-etn') return <DataBaseETN onBack={() => setScreen('home-etn')} />;
  if (screen === 'declaracaoIA') return <DeclaracaoIA onBack={() => setScreen(lastHome)} />;

  return <App onNavigate={handleNavigate} />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
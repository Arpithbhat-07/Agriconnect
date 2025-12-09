import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import Weather from './components/Weather';
import CropRecommendation from './components/CropRecommendation';
import MarketPrices from './components/MarketPrices';
import GovSchemes from './components/GovSchemes';
import DiseaseDetection from './components/DiseaseDetection';
import VoiceAssistant from './components/VoiceAssistant';
import { translations } from './translations/translations';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [language, setLanguage] = useState('en');

  const t = translations[language];

  useEffect(() => {
    const handler = (e) => {
      const page = e?.detail;
      if (page) setCurrentPage(page);
    };
    window.addEventListener('agri:navigate', handler);
    return () => window.removeEventListener('agri:navigate', handler);
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard language={language} />;
      case 'weather':
        return <Weather language={language} />;
      case 'crop':
        return <CropRecommendation language={language} />;
      case 'market':
        return <MarketPrices language={language} />;
      case 'schemes':
        return <GovSchemes language={language} />;
      case 'disease':
        return <DiseaseDetection language={language} />;
      default:
        return <Dashboard language={language} />;
    }
  };

  return (
    <div className="container">
      <div className="header">
        <div>
          <h1>🌾 {t.appTitle}</h1>
          <p>{t.appSubtitle}</p>
        </div>
        <div className="language-selector">
          <button
            className={`language-btn ${language === 'en' ? 'active' : ''}`}
            onClick={() => setLanguage('en')}
          >
            English
          </button>
          <button
            className={`language-btn ${language === 'hi' ? 'active' : ''}`}
            onClick={() => setLanguage('hi')}
          >
            हिंदी
          </button>
          <button
            className={`language-btn ${language === 'kn' ? 'active' : ''}`}
            onClick={() => setLanguage('kn')}
          >
            ಕನ್ನಡ
          </button>
        </div>
      </div>

      <div className="nav-buttons">
        <button
          className={`nav-btn ${currentPage === 'dashboard' ? 'active' : ''}`}
          onClick={() => setCurrentPage('dashboard')}
        >
          📊 {t.dashboard}
        </button>
        <button
          className={`nav-btn ${currentPage === 'weather' ? 'active' : ''}`}
          onClick={() => setCurrentPage('weather')}
        >
          🌤️ {t.weather}
        </button>
        <button
          className={`nav-btn ${currentPage === 'crop' ? 'active' : ''}`}
          onClick={() => setCurrentPage('crop')}
        >
          🌱 {t.cropRec}
        </button>
        <button
          className={`nav-btn ${currentPage === 'market' ? 'active' : ''}`}
          onClick={() => setCurrentPage('market')}
        >
          💰 {t.marketPrices}
        </button>
        <button
          className={`nav-btn ${currentPage === 'schemes' ? 'active' : ''}`}
          onClick={() => setCurrentPage('schemes')}
        >
          🏛️ {t.govSchemes}
        </button>
        <button
          className={`nav-btn ${currentPage === 'disease' ? 'active' : ''}`}
          onClick={() => setCurrentPage('disease')}
        >
          🔬 {t.diseaseDetection}
        </button>
      </div>

      <div className="content">
        {renderPage()}
      </div>

      <VoiceAssistant language={language} />
    </div>
  );
}

export default App;
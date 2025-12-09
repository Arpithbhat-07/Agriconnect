import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { translations } from '../translations/translations';

const API_BASE = 'http://localhost:5000';

function Dashboard({ language }) {
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const t = translations[language];

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const weatherRes = await axios.get(`${API_BASE}/weather?location=Bangalore`);
      setWeatherData(weatherRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">{t.loading}</div>;
  }

  return (
    <div>
      <h2>🏠 {t.dashboard}</h2>
      <p style={{ marginBottom: '20px', color: '#222' }}>{t.welcomeMsg}</p>

      <div className="grid">
        <div className="card">
          <h3>🌤️ {t.currentWeather}</h3>
          {weatherData && (
            <>
              <p><strong>{t.location}:</strong> {weatherData.location}</p>
              <p><strong>{t.temperature}:</strong> {weatherData.temperature}°C</p>
              <p><strong>{t.humidity}:</strong> {weatherData.humidity}%</p>
              <p><strong>{t.condition}:</strong> {weatherData.description}</p>
            </>
          )}
        </div>

        <div className="card">
          <h3>🌾 {t.quickTips}</h3>
          <p>• {t.tip1}</p>
          <p>• {t.tip2}</p>
          <p>• {t.tip3}</p>
          <p>• {t.tip4}</p>
        </div>

        <div className="card">
          <h3>📱 {t.features}</h3>
          <p>✅ {t.feature1}</p>
          <p>✅ {t.feature2}</p>
          <p>✅ {t.feature3}</p>
          <p>✅ {t.feature4}</p>
          <p>✅ {t.feature5}</p>
          <p>✅ {t.feature6}</p>
        </div>
      </div>

      {weatherData && weatherData.alerts && weatherData.alerts.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h3>⚠️ {t.weatherAlerts}</h3>
          {weatherData.alerts.map((alert, index) => (
            <div key={index} className={`alert alert-${alert.severity === 'high' ? 'danger' : 'warning'}`}>
              {language === 'hi' ? alert.message_hi : language === 'kn' ? alert.message_kn : alert.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
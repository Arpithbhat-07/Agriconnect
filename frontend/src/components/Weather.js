import React, { useState } from 'react';
import axios from 'axios';
import { translations } from '../translations/translations';

const API_BASE = 'http://localhost:5000';

function Weather({ language }) {
  const [location, setLocation] = useState('Bangalore');
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(false);
  const t = translations[language];

  const fetchWeather = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/weather?location=${location}`);
      setWeatherData(response.data);
    } catch (error) {
      console.error('Error fetching weather:', error);
      alert('Error fetching weather data. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div>
      <h2>🌤️ {t.weather}</h2>
      
      <div className="form-group">
        <label>{t.location}</label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder={t.enterCity}
        />
      </div>

      <button className="btn" onClick={fetchWeather} disabled={loading}>
        {loading ? t.loading : t.checkWeather}
      </button>

      {weatherData && (
        <div style={{ marginTop: '20px' }}>
          <div className="card">
            <h3>{t.currentWeather} - {weatherData.location}</h3>
            <div className="grid">
              <div>
                <p><strong>🌡️ {t.temperature}:</strong> {weatherData.temperature}°C</p>
                <p><strong>🤒 {t.feelsLike}:</strong> {weatherData.feels_like}°C</p>
                <p><strong>💧 {t.humidity}:</strong> {weatherData.humidity}%</p>
              </div>
              <div>
                <p><strong>🌬️ {t.windSpeed}:</strong> {weatherData.wind_speed} m/s</p>
                <p><strong>🌧️ {t.rainfall}:</strong> {weatherData.rainfall} mm</p>
                <p><strong>📊 {t.pressure}:</strong> {weatherData.pressure} hPa</p>
              </div>
            </div>
            <p style={{ marginTop: '10px', fontSize: '18px' }}>
              <strong>{t.condition}:</strong> {weatherData.description}
            </p>
          </div>

          {weatherData.alerts && weatherData.alerts.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <h3>⚠️ {t.weatherAlerts}</h3>
              {weatherData.alerts.map((alert, index) => (
                <div key={index} className={`alert alert-${alert.severity === 'high' ? 'danger' : 'warning'}`}>
                  <strong>{alert.type.toUpperCase()}:</strong>{' '}
                  {language === 'hi' ? alert.message_hi : language === 'kn' ? alert.message_kn : alert.message}
                </div>
              ))}
            </div>
          )}

          {weatherData.forecast && weatherData.forecast.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <h3>📅 {t.forecast24h}</h3>
              <div className="grid">
                {weatherData.forecast.slice(0, 4).map((item, index) => (
                  <div key={index} className="card">
                    <p><strong>⏰ {t.time}:</strong> {new Date(item.time).toLocaleString()}</p>
                    <p><strong>🌡️ {t.temp}:</strong> {item.temp}°C</p>
                    <p><strong>🌧️ {t.rainChance}:</strong> {item.rain_probability.toFixed(0)}%</p>
                    <p><strong>{t.condition}:</strong> {item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Weather;
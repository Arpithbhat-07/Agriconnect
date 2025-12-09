import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { translations } from '../translations/translations';

const API_BASE = 'http://localhost:5000';

function MarketPrices({ language }) {
  const [crop, setCrop] = useState('');
  const [location, setLocation] = useState('');
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(false);
  const t = translations[language];

  useEffect(() => {
    fetchPrices();
  }, []);

  const fetchPrices = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/market?crop=${crop}&location=${location}`);
      setPrices(response.data.prices);
    } catch (error) {
      console.error('Error fetching prices:', error);
      alert('Error fetching market prices. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div>
      <h2>💰 {t.marketPrices}</h2>
      <p style={{ color: '#666', marginBottom: '20px' }}>{t.marketInfo}</p>

      <div className="form-group">
        <label>{t.crop}</label>
        <input
          type="text"
          value={crop}
          onChange={(e) => setCrop(e.target.value)}
          placeholder={t.enterCrop}
        />
      </div>

      <div className="form-group">
        <label>{t.location}</label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder={t.enterLocationMarket}
        />
      </div>

      <button className="btn" onClick={fetchPrices} disabled={loading}>
        {loading ? t.loading : t.searchPrices}
      </button>

      {prices.length > 0 && (
        <div style={{ marginTop: '20px', overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>{t.crop}</th>
                <th>{t.location}</th>
                <th>{t.market}</th>
                <th>{t.price}</th>
                <th>{t.change}</th>
                <th>{t.date}</th>
              </tr>
            </thead>
            <tbody>
              {prices.map((item, index) => (
                <tr key={index}>
                  <td>
                    {language === 'hi' ? item.crop_hi : language === 'kn' ? item.crop_kn : item.crop}
                  </td>
                  <td>{item.location}</td>
                  <td>{item.market}</td>
                  <td>
                    <strong>₹{item.current_price}</strong> / {item.unit}
                  </td>
                  <td>
                    <span className={`badge ${item.change >= 0 ? 'badge-success' : 'badge-warning'}`}>
                      {item.change >= 0 ? '+' : ''}{item.change}
                    </span>
                  </td>
                  <td>{new Date(item.last_updated).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && prices.length === 0 && (
        <div className="alert alert-warning" style={{ marginTop: '20px' }}>
          {t.noPriceData}
        </div>
      )}
    </div>
  );
}

export default MarketPrices;
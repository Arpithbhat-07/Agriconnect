import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { translations } from '../translations/translations';

const API_BASE = 'http://localhost:5000';

function GovSchemes({ language }) {
  const [schemes, setSchemes] = useState([]);
  const [state, setState] = useState('');
  const [loading, setLoading] = useState(false);
  const t = translations[language];

  useEffect(() => {
    fetchSchemes();
  }, []);

  const fetchSchemes = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/schemes?state=${state}&language=${language}`);
      setSchemes(response.data.schemes);
    } catch (error) {
      console.error('Error fetching schemes:', error);
      alert('Error fetching government schemes. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div>
      <h2>🏛️ {t.govSchemes}</h2>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        {t.schemesInfo}
      </p>

      <div className="form-group">
        <label>{t.filterByState}</label>
        <input
          type="text"
          value={state}
          onChange={(e) => setState(e.target.value)}
          placeholder={t.enterState}
        />
      </div>

      <button className="btn" onClick={fetchSchemes} disabled={loading}>
        {loading ? t.loading : t.viewSchemes}
      </button>

      {schemes.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h3>{t.availableSchemes} ({schemes.length})</h3>
          {schemes.map((scheme, index) => (
            <div key={index} className="card">
              <h3>
                {language === 'hi' ? scheme.name_hi : language === 'kn' ? scheme.name_kn : scheme.name}
              </h3>
              <p>
                {language === 'hi' ? scheme.description_hi : language === 'kn' ? scheme.description_kn : scheme.description}
              </p>
              <p><strong>{t.eligibility}:</strong> {scheme.eligibility}</p>
              <p><strong>{t.benefits}:</strong> {scheme.benefits}</p>
              {scheme.applicable_states && (
                <p><strong>{t.applicableStates}:</strong> {scheme.applicable_states.join(', ')}</p>
              )}
              <button
                onClick={() => window.open(scheme.link, '_blank')}
                className="btn"
                style={{ marginTop: '10px' }}
              >
                🔗 {t.applyOnline}
              </button>
            </div>
          ))}
        </div>
      )}

      {!loading && schemes.length === 0 && (
        <div className="alert alert-warning" style={{ marginTop: '20px' }}>
          {t.noSchemes}
        </div>
      )}
    </div>
  );
}

export default GovSchemes;
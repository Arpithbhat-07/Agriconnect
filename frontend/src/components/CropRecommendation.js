import React, { useState } from 'react';
import axios from 'axios';
import { translations } from '../translations/translations';

const API_BASE = 'http://localhost:5000';

function CropRecommendation({ language }) {
  const [soilType, setSoilType] = useState('loamy');
  const [season, setSeason] = useState('kharif');
  const [location, setLocation] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [soilAnalysis, setSoilAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const t = translations[language];

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const cropRes = await axios.get(`${API_BASE}/crop?soil=${soilType}&season=${season}&location=${location}`);
      setRecommendations(cropRes.data.recommendations);

      const soilRes = await axios.post(`${API_BASE}/soil`, { type: soilType });
      setSoilAnalysis(soilRes.data);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      alert('Error fetching recommendations. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div>
      <h2>🌱 {t.cropRec}</h2>

      <div className="form-group">
        <label>{t.soilType}</label>
        <select value={soilType} onChange={(e) => setSoilType(e.target.value)}>
          <option value="clay">{t.clay}</option>
          <option value="sandy">{t.sandy}</option>
          <option value="loamy">{t.loamy}</option>
          <option value="black">{t.black}</option>
        </select>
      </div>

      <div className="form-group">
        <label>{t.season}</label>
        <select value={season} onChange={(e) => setSeason(e.target.value)}>
          <option value="kharif">{t.kharif}</option>
          <option value="rabi">{t.rabi}</option>
          <option value="summer">{t.summer}</option>
          <option value="all">{t.allSeason}</option>
        </select>
      </div>

      <div className="form-group">
        <label>{t.location} ({t.optional})</label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder={t.enterLocation}
        />
      </div>

      <button className="btn" onClick={fetchRecommendations} disabled={loading}>
        {loading ? t.loading : t.getRecommendations}
      </button>

      {soilAnalysis && (
        <div style={{ marginTop: '20px' }}>
          <h3>🌍 {t.soilAnalysis} - {soilAnalysis.soil_type.toUpperCase()}</h3>
          <div className="card">
            <p><strong>💧 {t.waterRequirement}:</strong> {soilAnalysis.water_requirement}</p>
            <p><strong>🌾 {t.suitableCrops}:</strong> {soilAnalysis.crops.join(', ')}</p>
            <p><strong>🧪 {t.recommendedFertilizers}:</strong> {soilAnalysis.fertilizers.join(', ')}</p>
            <p><strong>💡 {t.tips}:</strong> {soilAnalysis.tips}</p>
          </div>
        </div>
      )}

      {recommendations.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h3>{t.recommendedCrops} ({recommendations.length})</h3>
          <div className="grid">
            {recommendations.map((crop, index) => (
              <div key={index} className="card">
                <h3>
                  {language === 'hi' ? crop.name_hi : language === 'kn' ? crop.name_kn : crop.name}
                </h3>
                <p><strong>🌡️ {t.idealTemp}:</strong> {crop.ideal_temp}</p>
                <p><strong>💧 {t.water}:</strong> {crop.water_requirement}</p>
                <p><strong>🧪 {t.fertilizers}:</strong> {crop.fertilizers.join(', ')}</p>
                <p><strong>⏱️ {t.duration}:</strong> {crop.duration}</p>
                <p><strong>📊 {t.expectedYield}:</strong> {crop.yield}</p>
                <div style={{ marginTop: '10px' }}>
                  {crop.seasons.map((s, i) => (
                    <span key={i} className="badge badge-success">{s}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && recommendations.length === 0 && (
        <div className="alert alert-warning" style={{ marginTop: '20px' }}>
          {t.noRecommendations}
        </div>
      )}
    </div>
  );
}

export default CropRecommendation;
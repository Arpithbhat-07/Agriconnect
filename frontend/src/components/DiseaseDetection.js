import React, { useState } from 'react';
import axios from 'axios';
import { translations } from '../translations/translations';

const API_BASE = 'http://localhost:5000';

function DiseaseDetection({ language }) {
  const [crop, setCrop] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [diseases, setDiseases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const t = translations[language];

  const detectDisease = async () => {
    if (!symptoms.trim()) {
      alert('Please describe the symptoms');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE}/disease`, {
        symptoms: symptoms,
        crop: crop
      });
      setDiseases(response.data.diseases);
    } catch (error) {
      console.error('Error detecting disease:', error);
      alert('Error detecting disease. Please try again.');
    }
    setLoading(false);
  };

  const detectImage = async () => {
    if (!imageFile) {
      alert('Please select or capture an image of the affected plant');
      return;
    }

    setLoading(true);
    try {
      const form = new FormData();
      form.append('image', imageFile);
      const res = await axios.post(`${API_BASE}/detect_disease`, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data && res.data.prediction) {
        const p = res.data;
        const matched = p.matched ? [p.matched] : [];
        setDiseases(matched);
        // also append a synthetic message showing prediction
        // we reuse diseases state for display
      } else {
        alert('No result from server');
      }
    } catch (err) {
      console.error('Image detect error', err);
      alert('Image detection failed. See console for details.');
    }
    setLoading(false);
  };

  const onFileChange = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setImageFile(f);
    const url = URL.createObjectURL(f);
    setImagePreview(url);
  };

  return (
    <div>
      <h2>🔬 {t.diseaseDetection}</h2>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        {t.diseaseInfo}
      </p>

      <div className="form-group">
        <label>{t.crop} ({t.optional})</label>
        <input
          type="text"
          value={crop}
          onChange={(e) => setCrop(e.target.value)}
          placeholder={t.enterCropDisease}
        />
      </div>

      <div className="form-group">
        <label>{t.symptoms}</label>
        <textarea
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value)}
          placeholder={t.describeSymptoms}
          rows="4"
        />
      </div>

      <div className="form-group">
        <label>📷 {t.uploadImage} (optional, use camera on mobile)</label>
        <input type="file" accept="image/*" capture="environment" onChange={onFileChange} />
        {imagePreview && (
          <div style={{ marginTop: '10px' }}>
            <img src={imagePreview} alt="preview" style={{ maxWidth: '220px', borderRadius: 8, border: '1px solid #e0e0e0' }} />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button className="btn" onClick={detectDisease} disabled={loading}>
          {loading ? t.loading : t.detectDisease}
        </button>
        <button className="btn" onClick={detectImage} disabled={loading}>
          {loading ? t.loading : 'Detect from Image'}
        </button>
      </div>

      {diseases.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h3>{t.possibleDiseases} ({diseases.length})</h3>
          {diseases.map((disease, index) => (
            <div key={index} className="card">
              <h3>
                {language === 'hi' ? disease.name_hi : language === 'kn' ? disease.name_kn : disease.name}
              </h3>
              <p><strong>🌾 {t.affectedCrops}:</strong> {disease.crops.join(', ')}</p>
              <p><strong>🦠 {t.cause}:</strong> {disease.cause}</p>
              <p><strong>🔍 {t.symptoms}:</strong> {disease.symptoms.join(', ')}</p>
              <div className="alert alert-success" style={{ marginTop: '15px' }}>
                <strong>💊 {t.treatment}:</strong><br />
                {language === 'hi' ? disease.treatment_hi : language === 'kn' ? disease.treatment_kn : disease.treatment}
              </div>
              <div className="alert alert-info" style={{ marginTop: '10px' }}>
                <strong>🛡️ {t.prevention}:</strong> {disease.prevention}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && diseases.length === 0 && symptoms && (
        <div className="alert alert-warning" style={{ marginTop: '20px' }}>
          {t.noDiseases}
        </div>
      )}
    </div>
  );
}

export default DiseaseDetection;
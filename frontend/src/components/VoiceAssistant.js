import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { translations } from '../translations/translations';

const API_BASE = 'http://localhost:5000';

function VoiceAssistant({ language }) {
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState([]);
  const [showChat, setShowChat] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [recognition, setRecognition] = useState(null);
  const [talkbackEnabled, setTalkbackEnabled] = useState(() => {
    try {
      const v = localStorage.getItem('agri_talkback');
      return v === null ? true : v === 'true';
    } catch (e) {
      return true;
    }
  });
  const [pendingIntent, setPendingIntent] = useState(null);
  const [pendingData, setPendingData] = useState(null);
  const [userLocation, setUserLocation] = useState(() => {
    try {
      return localStorage.getItem('agri_location') || '';
    } catch (e) {
      return '';
    }
  });
  const [expandedCards, setExpandedCards] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [lastFailedIntent, setLastFailedIntent] = useState(null);
  const t = translations[language];

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recog = new SpeechRecognition();
      recog.continuous = false;
      recog.interimResults = false;
      
      const langCode = language === 'hi' ? 'hi-IN' : language === 'kn' ? 'kn-IN' : 'en-IN';
      recog.lang = langCode;

      recog.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        handleSendMessage(transcript);
      };

      recog.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recog.onend = () => {
        setIsListening(false);
      };

      setRecognition(recog);
    }
  }, [language]);

  const startListening = () => {
    if (recognition) {
      setIsListening(true);
      setShowChat(true);
      recognition.start();
    } else {
      alert('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
    }
  };

  const handleSendMessage = async (text) => {
    if (!text.trim()) return;

    const userMessage = { sender: 'user', text: text };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    // If waiting for a follow-up (e.g., soil type for crop rec), handle it first
    if (pendingIntent === 'awaiting_soil_for_crop') {
      const soil = text.toLowerCase().trim();
      const season = pendingData?.season || '';
      setPendingIntent(null);
      setPendingData(null);

      try {
        const params = { params: {} };
        if (soil) params.params.soil = soil;
        if (season) params.params.season = season;
        const res = await axios.get(`${API_BASE}/crop`, params);
        const data = res.data;

        const card = { type: 'crop', data };
        card.id = Date.now() + Math.floor(Math.random() * 1000);
        setMessages(prev => [...prev, { sender: 'bot', card }]);
        speakText(`I found ${data.count} recommended crops.`);
      } catch (err) {
        console.error('Crop fetch error (follow-up):', err);
        const errorMsg = { sender: 'bot', text: 'Sorry, I could not fetch crop recommendations right now.', isError: true, retryIntent: 'crop', retryData: { soil, season } };
        setMessages(prev => [...prev, errorMsg]);
        setLastFailedIntent({ type: 'crop', data: { soil, season } });
      }
      setIsLoading(false);
      return;
    }

    const lower = text.toLowerCase();

    // Improved intent detection
    const weatherKeywords = ['weather', 'temperature', 'forecast', 'rain', 'humidity', 'mausam', 'मौसम'];
    const isWeather = weatherKeywords.some(k => lower.includes(k));

    // Extract location: handle multi-word locations like "new delhi", "los angeles"
    let location = '';
    const locMatch = lower.match(/in\s+([a-z\s]+?)(?:\s+for|\s+weather|$|\.)/i) || lower.match(/weather\s+(?:for|in)\s+([a-z\s]+?)(?:\s+|$|\.)/i);
    if (locMatch && locMatch[1]) {
      location = locMatch[1].trim();
    }

    if (isWeather) {
      try {
        if (!location && userLocation) location = userLocation;
        const params = location ? { params: { location } } : {};
        const res = await axios.get(`${API_BASE}/weather`, params);
        const info = res.data;

        let botText = `Weather for ${info.location}: ${info.description}. Temperature ${info.temperature}°C (feels like ${info.feels_like}°C). Humidity ${info.humidity}%. Wind ${info.wind_speed} m/s.`;
        if (info.alerts && info.alerts.length) {
          botText += '\nAlerts:' + info.alerts.map(a => `\n- ${a.message}`).join('');
        }

        if (info.forecast && info.forecast.length) {
          botText += '\n\nUpcoming forecast (next few entries):';
          info.forecast.slice(0, 3).forEach(f => {
            botText += `\n${f.time}: ${f.temp}°C, ${f.description}`;
          });
        }

        const card = { type: 'weather', info };
        card.id = Date.now() + Math.floor(Math.random() * 1000);
        setMessages(prev => [...prev, { sender: 'bot', card }]);
        speakText(botText);
      } catch (err) {
        console.error('Weather fetch error:', err);
        const errorMsg = { sender: 'bot', text: 'Sorry, I could not fetch the weather right now.', isError: true, retryIntent: 'weather', retryData: { location } };
        setMessages(prev => [...prev, errorMsg]);
        setLastFailedIntent({ type: 'weather', data: { location } });
      }
      setIsLoading(false);
      return;
    }

    // Market prices intent
    const marketKeywords = ['price', 'prices', 'rate', 'rates', 'market', 'cost'];
    const isMarket = marketKeywords.some(k => lower.includes(k));

    if (isMarket) {
      try {
        // Extract crop name: handle multi-word crops like "sugar cane", "black rice"
        let crop = '';
        const m = lower.match(/(?:price|prices|rate|rates|cost)\s+(?:of\s+|for\s+)?([a-z\s]+?)(?:\s+in|\s+at|$|\.)/i) || lower.match(/(?:for|of)\s+([a-z\s]+?)\s+(?:prices?|rates?|cost|market)/i);
        if (m && m[1]) crop = m[1].trim();

        const params = crop ? { params: { crop } } : {};
        const res = await axios.get(`${API_BASE}/market`, params);
        const data = res.data;

        const card = { type: 'market', data };
        card.id = Date.now() + Math.floor(Math.random() * 1000);
        setMessages(prev => [...prev, { sender: 'bot', card }]);
        const summary = data.prices && data.prices.length ? `Found ${data.prices.length} market entries.` : 'No market price data found.';
        speakText(summary);
      } catch (err) {
        console.error('Market fetch error:', err);
        const errorMsg = { sender: 'bot', text: 'Sorry, I could not fetch market prices right now.', isError: true, retryIntent: 'market', retryData: {} };
        setMessages(prev => [...prev, errorMsg]);
        setLastFailedIntent({ type: 'market', data: {} });
      }
      setIsLoading(false);
      return;
    }

    // Crop recommendation intent
    const cropKeywords = ['crop', 'recommend', 'suggest', 'recommendation', 'suggestion', 'कृषि', 'फसल', 'सिफारिश'];
    const isCrop = cropKeywords.some(k => lower.includes(k));

    if (isCrop) {
      try {
        // Extract soil and season (handle multi-word patterns)
        const soilMatch = lower.match(/(clay|sandy|loamy|black|red|alluvial)/i);
        const seasonMatch = lower.match(/(kharif|rabi|summer|winter|monsoon|all)/i);
        const soil = soilMatch ? soilMatch[1].toLowerCase() : '';
        const season = seasonMatch ? seasonMatch[1].toLowerCase() : '';

        const params = { params: {} };
        if (soil) params.params.soil = soil;
        if (season) params.params.season = season;

        const callParams = (soil || season) ? params : {};
        const res = await axios.get(`${API_BASE}/crop`, callParams);
        const data = res.data;

        if (!soil) {
          setPendingIntent('awaiting_soil_for_crop');
          setPendingData({ season });
          const followUp = { sender: 'bot', text: 'Which soil type do you have? (clay, sandy, loamy, black, red, alluvial)' };
          setMessages(prev => [...prev, followUp]);
          speakText('Which soil type do you have?');
          setIsLoading(false);
          return;
        }

        const card = { type: 'crop', data };
        setMessages(prev => [...prev, { sender: 'bot', card }]);
        const summary = data.recommendations && data.recommendations.length ? `Found ${data.recommendations.length} recommendations.` : 'No crop recommendations found.';
        speakText(summary);
      } catch (err) {
        console.error('Crop fetch error:', err);
        const errorMsg = { sender: 'bot', text: 'Sorry, I could not fetch crop recommendations right now.', isError: true, retryIntent: 'crop', retryData: {} };
        setMessages(prev => [...prev, errorMsg]);
        setLastFailedIntent({ type: 'crop', data: {} });
      }
      setIsLoading(false);
      return;
    }

    // Fallback to existing chatbot endpoint for other intents
    try {
      const response = await axios.post(`${API_BASE}/chatbot`, {
        message: text,
        language: language
      });

      const botMessage = { sender: 'bot', text: response.data.response };
      setMessages(prev => [...prev, botMessage]);

      speakText(response.data.response);
    } catch (error) {
      console.error('Error with chatbot:', error);
      const errorMsg = { sender: 'bot', text: 'Sorry, I encountered an error. Please try again.', isError: true, retryIntent: 'general', retryData: {} };
      setMessages(prev => [...prev, errorMsg]);
    }
    setIsLoading(false);
  };

  const speakText = (text) => {
    if (!talkbackEnabled) return;
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === 'hi' ? 'hi-IN' : language === 'kn' ? 'kn-IN' : 'en-IN';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleTalkback = () => {
    setTalkbackEnabled(prev => {
      const next = !prev;
      try { localStorage.setItem('agri_talkback', next ? 'true' : 'false'); } catch (e) {}
      // If turning off, stop any active speech
      if (!next && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      return next;
    });
  };

  // Toggle expand/collapse for a card
  const handleToggleExpand = (cardId) => {
    setExpandedCards(prev => ({ ...prev, [cardId]: !prev[cardId] }));
  };

  // Set user's saved location (persisted)
  const handleSetLocation = (location) => {
    if (!location) return;
    // ask the user to confirm
    const ok = window.confirm(`Save ${location} as your default location?`);
    if (!ok) return;
    try {
      localStorage.setItem('agri_location', location);
    } catch (e) {}
    setUserLocation(location);
    const confirm = { sender: 'bot', text: `Location saved: ${location}` };
    setMessages(prev => [...prev, confirm]);
    speakText(`Location saved as ${location}`);
  };

  // Open a page in the app by dispatching a custom event the App listens to
  const handleOpenPage = (page) => {
    try {
      window.dispatchEvent(new CustomEvent('agri:navigate', { detail: page }));
    } catch (e) {
      // fallback: open root
      window.location.href = '/';
    }
  };

  // Save a crop (object) to favorites in localStorage
  const handleSaveFavoriteCrop = (crop) => {
    if (!crop || !crop.name) return;
    try {
      const raw = localStorage.getItem('agri_favorites');
      const favs = raw ? JSON.parse(raw) : [];
      // avoid duplicates by name
      if (!favs.find(f => f.name === crop.name)) {
        favs.push(crop);
        localStorage.setItem('agri_favorites', JSON.stringify(favs));
        const confirm = { sender: 'bot', text: `${crop.name} saved to favorites.` };
        setMessages(prev => [...prev, confirm]);
        speakText(`${crop.name} saved to favorites`);
      } else {
        const confirm = { sender: 'bot', text: `${crop.name} is already in favorites.` };
        setMessages(prev => [...prev, confirm]);
      }
    } catch (e) {
      const errorMsg = { sender: 'bot', text: 'Could not save favorite right now.' };
      setMessages(prev => [...prev, errorMsg]);
    }
  };

  // Retry failed API call
  const handleRetry = () => {
    if (!lastFailedIntent) return;
    const { type, data } = lastFailedIntent;
    
    let retryText = '';
    if (type === 'weather') {
      retryText = data.location ? `weather in ${data.location}` : 'weather';
    } else if (type === 'market') {
      retryText = 'market prices';
    } else if (type === 'crop') {
      retryText = 'crop recommendations';
    } else {
      retryText = 'retry';
    }
    
    handleSendMessage(retryText);
  };

  return (
    <>
      <button
        className={`voice-btn ${isListening ? 'listening' : ''}`}
        onClick={isListening ? null : startListening}
        title={t.voiceAssistant}
      >
        🎤
      </button>

      {showChat && (
        <div style={{
          position: 'fixed',
          bottom: '100px',
          right: '30px',
          width: '500px',
          maxHeight: '650px',
          background: 'rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(10px)',
          borderRadius: '10px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1000
        }}>
          <div style={{
            background: '#3f5945',
            color: 'white',
            padding: '15px',
            borderTopLeftRadius: '10px',
            borderTopRightRadius: '10px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h3 style={{ margin: 0 }}>🤖 {t.aiAssistant}</h3>
            <button
              onClick={() => setShowChat(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                fontSize: '20px',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
          </div>

          <div className="chat-container" style={{ flex: 1, padding: '15px', overflowY: 'auto' }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: '#222', padding: '20px' }}>
                <p style={{ fontSize: '16px', fontWeight: 'bold' }}>👋 {t.hiMessage}</p>
                <p style={{ fontSize: '15px', marginBottom: '15px' }}>🎤 <strong>Try a voice query!</strong> Click Record and ask me anything about:</p>
                <ul style={{ textAlign: 'left', marginTop: '10px', fontSize: '14px' }}>
                  <li>☀️ {t.weatherUpdates}</li>
                  <li>🌾 {t.cropRecommendations}</li>
                  <li>💰 {t.marketPricesVoice}</li>
                  <li>📜 {t.govSchemesVoice}</li>
                  <li>🦠 {t.diseaseDetectionVoice}</li>
                </ul>
                <p style={{ fontSize: '12px', marginTop: '15px', color: '#666' }}>Examples: "weather in delhi", "sugar cane prices", "crops for clay soil"</p>
              </div>
            )}
            {isLoading && (
              <div style={{ marginBottom: '10px', padding: '10px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.2)', color: '#222', textAlign: 'center' }}>
                <span>⏳ Loading</span>
                <span style={{ animation: 'blink 1.4s infinite', marginLeft: '4px' }}>•••</span>
                <style>{`
                  @keyframes blink {
                    0%, 20%, 50%, 80%, 100% { opacity: 1; }
                    40% { opacity: 0.5; }
                    60% { opacity: 0.7; }
                  }
                `}</style>
              </div>
            )}
            {messages.map((msg, index) => {
              // Render error messages with retry button
              if (msg.isError) {
                return (
                  <div key={index} style={{ marginBottom: '10px', padding: '10px', borderRadius: '8px', background: 'rgba(220, 53, 69, 0.15)', color: '#a33', borderLeft: '3px solid #dc3545' }}>
                    <div>{msg.text}</div>
                    <button
                      onClick={handleRetry}
                      style={{
                        marginTop: '8px',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        border: 'none',
                        background: '#dc3545',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '13px'
                      }}
                    >
                      🔄 Retry
                    </button>
                  </div>
                );
              }

              // Render structured cards when present
              if (msg.card) {
                const card = msg.card;
                if (card.type === 'weather') {
                  const info = card.info;
                  const isExpanded = expandedCards[card.id];
                  return (
                    <div key={card.id} style={{ marginBottom: '12px', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.95)', color: '#222', boxShadow: '0 2px 6px rgba(0,0,0,0.08)', maxWidth: '460px' }}>
                      <strong style={{ fontSize: '17px' }}>Weather — {info.location}</strong>
                      <div style={{ marginTop: '6px', fontSize: '17px' }}>{info.description} • {info.temperature}°C (feels {info.feels_like}°C)</div>
                      <div style={{ fontSize: '16px', marginTop: '6px' }}>Humidity: {info.humidity}% • Wind: {info.wind_speed} m/s</div>
                      {info.alerts && info.alerts.length > 0 && (
                        <div style={{ marginTop: '8px', color: '#a33' }}>
                          <strong style={{ fontSize: '16px' }}>Alerts:</strong>
                          <ul style={{ margin: '6px 0 0 16px', fontSize: '15px' }}>
                            {info.alerts.map((a, i) => <li key={i}>{a.message}</li>)}
                          </ul>
                        </div>
                      )}
                      {info.forecast && info.forecast.length > 0 && (
                        <div style={{ marginTop: '8px' }}>
                          <strong style={{ fontSize: '16px' }}>Forecast:</strong>
                          <ul style={{ margin: '6px 0 0 16px', fontSize: '15px' }}>
                            {(isExpanded ? info.forecast : info.forecast.slice(0,3)).map((f, i) => (
                              <li key={i}>{f.time}: {f.temp}°C — {f.description}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleToggleExpand(card.id)} style={{ padding: '8px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: '#3b4f1b', color: 'white', fontSize: '14px' }}>{isExpanded ? 'View less' : 'View more'}</button>
                        <button onClick={() => handleOpenPage('weather')} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #3b4f1b', cursor: 'pointer', background: 'white', color: '#3b4f1b', fontSize: '14px' }}>Open Weather Page</button>
                        <button onClick={() => handleSetLocation(info.location)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #3b4f1b', cursor: 'pointer', background: 'white', color: '#3b4f1b', fontSize: '14px' }}>Set as my location</button>
                      </div>
                    </div>
                  );
                }

                if (card.type === 'market') {
                  const data = card.data;
                  const isExpanded = expandedCards[card.id];
                  const firstLoc = data.prices && data.prices[0] ? data.prices[0].location : '';
                  return (
                    <div key={card.id} style={{ marginBottom: '12px', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.95)', color: '#222', boxShadow: '0 2px 6px rgba(0,0,0,0.08)', maxWidth: '460px' }}>
                      <strong style={{ fontSize: '15px' }}>Market Prices</strong>
                      {data.prices && data.prices.length ? (
                        <ul style={{ margin: '8px 0 0 16px', fontSize: '13px' }}>
                          {(isExpanded ? data.prices : data.prices.slice(0,5)).map((p, i) => (
                            <li key={i}>{p.crop} — {p.location}: ₹{p.current_price} ({p.change >= 0 ? '+'+p.change : p.change})</li>
                          ))}
                        </ul>
                      ) : (
                        <div style={{ marginTop: '6px', fontSize: '14px' }}>No market data found.</div>
                      )}
                      <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleToggleExpand(card.id)} style={{ padding: '6px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: '#3b4f1b', color: 'white' }}>{isExpanded ? 'View less' : 'View more'}</button>
                        <button onClick={() => handleOpenPage('market')} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #3b4f1b', cursor: 'pointer', background: 'white', color: '#3b4f1b' }}>Open Market Page</button>
                        {firstLoc && <button onClick={() => handleSetLocation(firstLoc)} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #3b4f1b', cursor: 'pointer', background: 'white', color: '#3b4f1b' }}>Set as my location</button>}
                      </div>
                    </div>
                  );
                }

                if (card.type === 'crop') {
                  const data = card.data;
                  const isExpanded = expandedCards[card.id];
                  return (
                    <div key={card.id} style={{ marginBottom: '12px', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.95)', color: '#222', boxShadow: '0 2px 6px rgba(0,0,0,0.08)', maxWidth: '460px' }}>
                      <strong style={{ fontSize: '15px' }}>Crop Recommendations</strong>
                      {data.recommendations && data.recommendations.length ? (
                        <div>
                          <ul style={{ margin: '8px 0 0 16px', fontSize: '13px' }}>
                            {(isExpanded ? data.recommendations : data.recommendations.slice(0,4)).map((r, i) => (
                                <li key={i} style={{ marginBottom: '8px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div><strong>{r.name}</strong> — {r.duration || ''} {r.yield ? `• yield: ${r.yield}` : ''}</div>
                                    {isExpanded && (
                                      <button onClick={() => handleSaveFavoriteCrop(r)} style={{ padding: '4px 8px', borderRadius: '6px', border: 'none', background: '#3b4f1b', color: 'white', cursor: 'pointer', fontSize: '12px' }}>Save</button>
                                    )}
                                  </div>
                                  {isExpanded && (
                                    <div style={{ fontSize: '12px', marginTop: '4px', marginLeft: '8px', color: '#444' }}>
                                      <div>Soil: {r.soil_types ? r.soil_types.join(', ') : '—'}</div>
                                      <div>Water: {r.water_requirement || '—'}</div>
                                      <div>Fertilizers: {r.fertilizers ? r.fertilizers.join(', ') : '—'}</div>
                                    </div>
                                  )}
                                </li>
                              ))}
                          </ul>
                          <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                            <button onClick={() => handleToggleExpand(card.id)} style={{ padding: '6px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: '#3b4f1b', color: 'white' }}>{isExpanded ? 'View less' : 'View more'}</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ marginTop: '6px', fontSize: '14px' }}>No recommendations found.</div>
                      )}
                    </div>
                  );
                }
              }

              // Default text message rendering
              return (
                <div
                  key={index}
                  className={`message ${msg.sender}`}
                  style={{
                    marginBottom: '10px',
                    padding: '10px',
                    borderRadius: '8px',
                    maxWidth: '80%',
                    marginLeft: msg.sender === 'user' ? 'auto' : '0',
                    background: msg.sender === 'user' ? '#3b4f1b' : 'rgba(255, 255, 255, 0.2)',
                    backdropFilter: msg.sender === 'bot' ? 'blur(10px)' : 'none',
                    color: msg.sender === 'user' ? 'white' : '#222',
                    fontSize: '14px'
                  }}
                >
                  {msg.text}
                </div>
              );
            })}
          </div>

          <div style={{ padding: '15px', borderTop: '1px solid #e0e0e0' }}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(inputMessage)}
                style={{
                  flex: 1,
                  padding: '10px',
                  border: '2px solid #3b4f1b',
                  borderRadius: '5px',
                  fontSize: '16px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)',
                  color: '#222'
                }}
              />
              <button
                onClick={() => handleSendMessage(inputMessage)}
                className="btn"
                style={{ padding: '10px 20px', margin: 0, fontSize: '16px' }}
              >
                {t.send}
              </button>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={startListening}
                className="btn"
                style={{
                  flex: 1,
                  padding: '10px 15px',
                  margin: 0,
                  background: isListening ? '#dc3545' : '#3b4f1b',
                  fontSize: '16px'
                }}
                disabled={isListening}
              >
                🎤 Record
              </button>
              <button
                onClick={toggleTalkback}
                className="btn"
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  margin: 0,
                  background: talkbackEnabled ? '#3b4f1b' : '#999',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontSize: '16px'
                }}
                title={talkbackEnabled ? 'Talkback enabled' : 'Talkback disabled'}
              >
                {talkbackEnabled ? '🔊' : '🔇'} {talkbackEnabled ? 'On' : 'Off'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default VoiceAssistant;
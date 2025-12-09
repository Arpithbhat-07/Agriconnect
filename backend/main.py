from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import requests
from datetime import datetime, timedelta
import random
import os
from PIL import Image

app = Flask(__name__)
CORS(app)

# Load data files
def load_json(filename):
    try:
        with open(f'data/{filename}', 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return []

crops_data = load_json('crops.json')
schemes_data = load_json('schemes.json')
diseases_data = load_json('diseases.json')
market_data = load_json('market_prices.json')

# OpenWeatherMap API (Free - sign up at openweathermap.org)
WEATHER_API_KEY = "6099031efaec451cb47ba1f8fe9f063c"  # Replace with your key
WEATHER_BASE_URL = "http://api.openweathermap.org/data/2.5"

@app.route('/')
def home():
    return jsonify({"message": "AgriConnect API is running", "status": "success"})

# Weather endpoint with real-time data
@app.route('/weather', methods=['GET'])
def get_weather():
    location = request.args.get('location', 'Bangalore')
    
    try:
        # Current weather
        current_url = f"{WEATHER_BASE_URL}/weather?q={location}&appid={WEATHER_API_KEY}&units=metric"
        current_response = requests.get(current_url, timeout=5)
        current_data = current_response.json()
        
        # 5-day forecast
        forecast_url = f"{WEATHER_BASE_URL}/forecast?q={location}&appid={WEATHER_API_KEY}&units=metric"
        forecast_response = requests.get(forecast_url, timeout=5)
        forecast_data = forecast_response.json()
        
        if current_response.status_code == 200:
            weather_info = {
                "location": location,
                "temperature": current_data['main']['temp'],
                "feels_like": current_data['main']['feels_like'],
                "humidity": current_data['main']['humidity'],
                "pressure": current_data['main']['pressure'],
                "wind_speed": current_data['wind']['speed'],
                "description": current_data['weather'][0]['description'],
                "icon": current_data['weather'][0]['icon'],
                "rainfall": current_data.get('rain', {}).get('1h', 0),
                "timestamp": datetime.now().isoformat(),
                "forecast": []
            }
            
            # Process forecast data
            if forecast_response.status_code == 200:
                for item in forecast_data['list'][:8]:  # Next 24 hours
                    weather_info['forecast'].append({
                        "time": item['dt_txt'],
                        "temp": item['main']['temp'],
                        "description": item['weather'][0]['description'],
                        "rain_probability": item.get('pop', 0) * 100,
                        "rainfall": item.get('rain', {}).get('3h', 0)
                    })
            
            # Generate alerts
            alerts = []
            if weather_info['rainfall'] > 50:
                alerts.append({
                    "type": "heavy_rain",
                    "severity": "high",
                    "message": "Heavy rainfall alert! Secure your crops and check drainage.",
                    "message_hi": "भारी बारिश की चेतावनी! अपनी फसलें सुरक्षित करें।",
                    "message_kn": "ಭಾರೀ ಮಳೆ ಎಚ್ಚರಿಕೆ! ನಿಮ್ಮ ಬೆಳೆಗಳನ್ನು ಸುರಕ್ಷಿತಗೊಳಿಸಿ."
                })
            elif weather_info['temperature'] > 35 and weather_info['humidity'] < 30:
                alerts.append({
                    "type": "drought",
                    "severity": "medium",
                    "message": "High temperature and low humidity. Ensure adequate irrigation.",
                    "message_hi": "उच्च तापमान और कम आर्द्रता। पर्याप्त सिंचाई सुनिश्चित करें।",
                    "message_kn": "ಹೆಚ್ಚಿನ ತಾಪಮಾನ ಮತ್ತು ಕಡಿಮೆ ತೇವಾಂಶ. ಸಾಕಷ್ಟು ನೀರಾವರಿ ಖಚಿತಪಡಿಸಿ."
                })
            
            weather_info['alerts'] = alerts
            return jsonify(weather_info)
        else:
            # Fallback to mock data if API fails
            return jsonify(get_mock_weather(location))
    except Exception as e:
        print(f"Weather API error: {str(e)}")
        return jsonify(get_mock_weather(location))

def get_mock_weather(location):
    return {
        "location": location,
        "temperature": random.randint(20, 35),
        "feels_like": random.randint(20, 35),
        "humidity": random.randint(40, 80),
        "pressure": 1013,
        "wind_speed": random.randint(5, 15),
        "description": "partly cloudy",
        "rainfall": random.randint(0, 20),
        "timestamp": datetime.now().isoformat(),
        "alerts": [],
        "forecast": [
            {
                "time": (datetime.now() + timedelta(hours=i*3)).strftime("%Y-%m-%d %H:%M:%S"),
                "temp": random.randint(20, 35),
                "description": "clear sky",
                "rain_probability": random.randint(0, 50),
                "rainfall": 0
            } for i in range(8)
        ]
    }

# Crop recommendation endpoint
@app.route('/crop', methods=['GET'])
def recommend_crop():
    soil = request.args.get('soil', '').lower()
    season = request.args.get('season', '').lower()
    location = request.args.get('location', '')
    
    recommendations = []
    for crop in crops_data:
        if (not soil or soil in crop['soil_types']) and \
           (not season or season in crop['seasons']):
            recommendations.append(crop)
    
    return jsonify({
        "recommendations": recommendations[:10],
        "count": len(recommendations)
    })

# Market prices endpoint with real-time simulation
@app.route('/market', methods=['GET'])
def get_market_prices():
    crop = request.args.get('crop', '').lower()
    location = request.args.get('location', '').lower()
    
    prices = []
    for item in market_data:
        if (not crop or crop in item['crop'].lower()) and \
           (not location or location in item['location'].lower()):
            # Add slight random variation to simulate real-time prices
            varied_price = item['price'] + random.randint(-50, 50)
            prices.append({
                **item,
                "current_price": varied_price,
                "change": varied_price - item['price'],
                "last_updated": datetime.now().isoformat()
            })
    
    return jsonify({
        "prices": prices,
        "count": len(prices)
    })

# Government schemes endpoint
@app.route('/schemes', methods=['GET'])
def get_schemes():
    state = request.args.get('state', '').lower()
    language = request.args.get('language', 'en')
    
    schemes = schemes_data
    if state:
        schemes = [s for s in schemes if state in s.get('applicable_states', [])]
    
    return jsonify({
        "schemes": schemes,
        "count": len(schemes)
    })

# Disease detection endpoint
@app.route('/disease', methods=['POST'])
def detect_disease():
    data = request.get_json()
    symptoms = data.get('symptoms', '').lower()
    crop_type = data.get('crop', '').lower()
    
    matches = []
    for disease in diseases_data:
        if crop_type and crop_type not in disease['crops']:
            continue
        
        # Simple keyword matching
        symptom_match = any(sym in symptoms for sym in disease['symptoms'])
        if symptom_match or not symptoms:
            matches.append(disease)
    
    return jsonify({
        "diseases": matches,
        "count": len(matches)
    })


# Image-based disease detection (simple heuristic)
@app.route('/detect_disease', methods=['POST'])
def detect_disease_image():
    # Accept multipart/form-data 'image' file
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400
    img_file = request.files['image']
    if img_file.filename == '':
        return jsonify({'error': 'Empty filename'}), 400

    try:
        # Save temporarily
        tmp_dir = 'tmp_uploads'
        os.makedirs(tmp_dir, exist_ok=True)
        save_path = os.path.join(tmp_dir, f"upload_{int(datetime.now().timestamp())}_{img_file.filename}")
        img_file.save(save_path)

        img = Image.open(save_path).convert('RGB')
        img.thumbnail((300, 300))

        pixels = list(img.getdata())
        total = len(pixels)
        white_count = 0
        brown_count = 0
        dark_count = 0
        green_count = 0

        for (r, g, b) in pixels:
            brightness = (r + g + b) / 3
            # white powder (high brightness, low saturation)
            if r > 200 and g > 200 and b > 200:
                white_count += 1
            # brownish pixels heuristic
            if r > 100 and g < 140 and b < 100 and r > g and g > b:
                brown_count += 1
            # dark spots
            if brightness < 70:
                dark_count += 1
            # green areas
            if g > r and g > b and g > 100:
                green_count += 1

        white_pct = white_count / total
        brown_pct = brown_count / total
        dark_pct = dark_count / total
        green_pct = green_count / total

        # Simple decision rules
        predicted = None
        confidence = 0.0

        if white_pct >= 0.12:
            predicted = 'Powdery Mildew'
            confidence = round(min(0.99, white_pct * 2.5) * 100, 1)
        elif brown_pct >= 0.12:
            # if many dark pixels as well, consider late blight
            if dark_pct >= 0.10:
                predicted = 'Late Blight'
                confidence = round(min(0.98, (brown_pct + dark_pct) / 2 * 2) * 100, 1)
            else:
                predicted = 'Leaf Blight'
                confidence = round(min(0.98, brown_pct * 2.2) * 100, 1)
        elif dark_pct >= 0.25:
            predicted = 'Root Rot'
            confidence = round(min(0.95, dark_pct * 1.8) * 100, 1)
        elif green_pct < 0.15 and (brown_pct + dark_pct) > 0.08:
            predicted = 'Aphid Infestation'
            confidence = round(min(0.9, (brown_pct + dark_pct) * 1.5) * 100, 1)
        else:
            predicted = 'Healthy'
            confidence = 95.0

        # Match with diseases_data for details where possible
        matched = None
        for d in diseases_data:
            if d['name'].lower() == predicted.lower():
                matched = d
                break

        result = {
            'prediction': predicted,
            'confidence': confidence,
            'matched': matched,
            'stats': {
                'white_pct': round(white_pct, 4),
                'brown_pct': round(brown_pct, 4),
                'dark_pct': round(dark_pct, 4),
                'green_pct': round(green_pct, 4)
            }
        }

        # Cleanup uploaded file
        try:
            os.remove(save_path)
        except:
            pass

        return jsonify(result)
    except Exception as e:
        print('Image detection error:', e)
        return jsonify({'error': 'Image processing failed'}), 500

# Soil analysis endpoint
@app.route('/soil', methods=['POST'])
def analyze_soil():
    data = request.get_json()
    soil_type = data.get('type', 'loamy').lower()
    
    soil_recommendations = {
        "clay": {
            "crops": ["Rice", "Wheat", "Cotton"],
            "fertilizers": ["Organic compost", "Gypsum", "NPK 10-26-26"],
            "water_requirement": "High - Clay retains water well",
            "tips": "Add organic matter to improve drainage. Avoid overwatering."
        },
        "sandy": {
            "crops": ["Groundnut", "Watermelon", "Carrots"],
            "fertilizers": ["Compost", "Vermicompost", "NPK 19-19-19"],
            "water_requirement": "Very High - Sandy soil drains quickly",
            "tips": "Frequent irrigation needed. Add organic matter to retain moisture."
        },
        "loamy": {
            "crops": ["Tomato", "Potato", "Maize", "Vegetables"],
            "fertilizers": ["Balanced NPK 20-20-20", "Organic manure"],
            "water_requirement": "Moderate - Ideal soil type",
            "tips": "Best soil for most crops. Maintain pH 6-7."
        },
        "black": {
            "crops": ["Cotton", "Soybean", "Sunflower"],
            "fertilizers": ["DAP", "Urea", "Potash"],
            "water_requirement": "Moderate - Good water retention",
            "tips": "Rich in minerals. Ensure proper drainage during monsoon."
        }
    }
    
    result = soil_recommendations.get(soil_type, soil_recommendations['loamy'])
    result['soil_type'] = soil_type
    
    return jsonify(result)

# AI Chatbot endpoint
@app.route('/chatbot', methods=['POST'])
def chatbot():
    data = request.get_json()
    message = data.get('message', '').lower()
    language = data.get('language', 'en')
    
    # Simple rule-based responses
    responses = {
        "en": {
            "weather": "You can check real-time weather updates in the Weather section. It provides forecasts and alerts for your location.",
            "crop": "Visit the Crop Recommendation section to get personalized crop suggestions based on your soil type and season.",
            "price": "Check the Market Prices section for current rates of various crops in different markets.",
            "scheme": "Government Schemes section has information about various schemes with direct application links.",
            "disease": "Use the Disease Detection feature to identify crop diseases and get treatment recommendations.",
            "default": "I'm here to help! Ask me about weather, crop recommendations, market prices, government schemes, or crop diseases."
        },
        "hi": {
            "weather": "आप मौसम अनुभाग में वास्तविक समय मौसम अपडेट देख सकते हैं।",
            "crop": "अपनी मिट्टी के प्रकार और मौसम के आधार पर व्यक्तिगत फसल सुझाव प्राप्त करने के लिए फसल सिफारिश अनुभाग पर जाएं।",
            "price": "विभिन्न बाजारों में विभिन्न फसलों की वर्तमान दरों के लिए बाजार मूल्य अनुभाग देखें।",
            "scheme": "सरकारी योजनाएं अनुभाग में सीधे आवेदन लिंक के साथ विभिन्न योजनाओं की जानकारी है।",
            "disease": "फसल रोगों की पहचान करने और उपचार सिफारिशें प्राप्त करने के लिए रोग का पता लगाने की सुविधा का उपयोग करें।",
            "default": "मैं मदद के लिए यहां हूं! मुझसे मौसम, फसल सिफारिशें, बाजार मूल्य, सरकारी योजनाओं या फसल रोगों के बारे में पूछें।"
        },
        "kn": {
            "weather": "ನೀವು ಹವಾಮಾನ ವಿಭಾಗದಲ್ಲಿ ನೈಜ-ಸಮಯದ ಹವಾಮಾನ ನವೀಕರಣಗಳನ್ನು ಪರಿಶೀಲಿಸಬಹುದು.",
            "crop": "ನಿಮ್ಮ ಮಣ್ಣಿನ ಪ್ರಕಾರ ಮತ್ತು ಋತುವಿನ ಆಧಾರದ ಮೇಲೆ ವೈಯಕ್ತಿಕ ಬೆಳೆ ಸಲಹೆಗಳನ್ನು ಪಡೆಯಲು ಬೆಳೆ ಶಿಫಾರಸು ವಿಭಾಗಕ್ಕೆ ಭೇಟಿ ನೀಡಿ.",
            "price": "ವಿವಿಧ ಮಾರುಕಟ್ಟೆಗಳಲ್ಲಿ ವಿವಿಧ ಬೆಳೆಗಳ ಪ್ರಸ್ತುತ ದರಗಳಿಗಾಗಿ ಮಾರುಕಟ್ಟೆ ಬೆಲೆಗಳ ವಿಭಾಗವನ್ನು ಪರಿಶೀಲಿಸಿ.",
            "scheme": "ಸರ್ಕಾರಿ ಯೋಜನೆಗಳ ವಿಭಾಗದಲ್ಲಿ ನೇರ ಅನ್ವಯ ಲಿಂಕ್‌ಗಳೊಂದಿಗೆ ವಿವಿಧ ಯೋಜನೆಗಳ ಮಾಹಿತಿ ಇದೆ.",
            "disease": "ಬೆಳೆ ರೋಗಗಳನ್ನು ಗುರುತಿಸಲು ಮತ್ತು ಚಿಕಿತ್ಸಾ ಶಿಫಾರಸುಗಳನ್ನು ಪಡೆಯಲು ರೋಗ ಪತ್ತೆ ವೈಶಿಷ್ಟ್ಯವನ್ನು ಬಳಸಿ.",
            "default": "ನಾನು ಸಹಾಯ ಮಾಡಲು ಇಲ್ಲಿದ್ದೇನೆ! ಹವಾಮಾನ, ಬೆಳೆ ಶಿಫಾರಸುಗಳು, ಮಾರುಕಟ್ಟೆ ಬೆಲೆಗಳು, ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು ಅಥವಾ ಬೆಳೆ ರೋಗಗಳ ಬಗ್ಗೆ ನನ್ನನ್ನು ಕೇಳಿ."
        }
    }
    
    lang_responses = responses.get(language, responses['en'])
    
    for keyword, response in lang_responses.items():
        if keyword in message:
            return jsonify({"response": response, "language": language})
    
    return jsonify({"response": lang_responses['default'], "language": language})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
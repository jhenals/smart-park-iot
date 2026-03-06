# 🌦️ IoT Weather Forecast - Smart Park Administration System

![Project Banner](https://github.com/user-attachments/assets/076df49d-3e28-40ac-bf36-88c5d23ed27f)

A comprehensive full-stack IoT weather monitoring and prediction system designed for Smart Park administrators. This solution integrates **Robustel EG5120 IoT Gateway** with edge-deployed ML models, **FastAPI** backend, and **Vue.js** frontend for real-time weather visualization and forecasting.

---

## 🚀 Features

### 🎯 Core Capabilities
* **Real-time Dashboard:** Built with Vue.js for reactive data updates
* **Edge AI Weather Prediction:** TensorFlow Lite model running on Robustel EG5120 Gateway
* **High Performance Backend:** FastAPI for asynchronous data handling
* **IoT Integration:** Process sensor data from distributed weather stations
* **Voice-Enabled AI Chat:** Groq-powered RAG assistant with Whisper transcription
* **Interactive Maps:** Leaflet-based visualization of sensor locations
* **Multi-Zone Monitoring:** Track micro-climates across different park areas

### ⚡ AI & ML Features
* **Edge Inference:** Weather classification on IoT gateway (no cloud needed)
* **Real-time Predictions:** Sub-second inference with TensorFlow Lite
* **Voice Assistant:** Hold-to-talk interface with Groq Whisper & Llama
* **Smart Context:** RAG system with real-time sensor data integration

---

### Data Flow

```
Sensors → Node-RED → predictor.py → TFLite Model → Weather Prediction → InfluxDB
                                                                           ↓
                                                                      FastAPI API
                                                                           ↓
                                                                   Vue.js Dashboard
```

---

## 📂 Project Structure

```
IoT_ProjectWeatherForcast/
├── 📁 github/                          # GitHub workflows
├── 📁 Robustel EG5120 ML/              # Edge ML Deployment
│   ├── WeatherData.csv                 # Training dataset
│   ├── predictor.py                    # Edge inference script
│   ├── preprocess.json                 # Scaler metadata
│   ├── train_export.py                 # Model training & export
│   └── weather_model.tflite            # TFLite model
├── 📁 artifacts/                       # Training artifacts
├── 📁 Robustel EG5120/                 # Gateway configs
│   ├── Node-red backup.json            # Node-RED flows
│   ├── Robustel EG5120 Configuration.pdf
│   └── new_-grafana.json               # Grafana dashboard
├── 📁 app/                             # FastAPI Backend
│   ├── __pycache__/
│   ├── routes/
│   │   ├── rag.py                      # Groq RAG endpoint
│   │   └── weather.py                  # Weather API
│   ├── static/                         # Static assets
│   ├── config.py                       # Configuration
│   ├── influx.py                       # InfluxDB client
│   ├── main.py                         # FastAPI entry point
│   └── schemas.py                      # Pydantic models
├── 📁 weather/                         # Vue.js Frontend
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── RagChatGroq.vue         # Voice AI assistant
│   │   │   └── ...
│   │   └── pages/
│   │       ├── WeatherPage.vue         # Main dashboard
│   │       └── ...
│   ├── package.json
│   └── vite.config.js
├── .env.example                        # Environment template
├── README.md                           # This file
├── requirements.txt                    # Python dependencies
└── requirements_groq.txt               # Groq-specific deps
```

---

## 🛠️ Installation & Setup

### Prerequisites

- **Python 3.9+**
- **Node.js 16+** and npm
- **InfluxDB 2.x**
- **Robustel EG5120 Gateway** (for edge deployment)
- **Groq API Key** (for voice assistant)

---

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/yonasyifter/IoT_ProjectWeatherForcast.git
cd IoT_ProjectWeatherForcast
```

---

### 2️⃣ Backend Setup (FastAPI)

#### Install Dependencies

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install base requirements
pip install -r requirements.txt

# Install Groq dependencies (for RAG chat)
pip install -r requirements_groq.txt
```

#### Configure Environment

```bash
# Copy example environment file
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# InfluxDB Configuration
INFLUXDB_URL=http://localhost:8086
INFLUXDB_TOKEN=your_influxdb_token_here
INFLUXDB_ORG=your_org
INFLUXDB_BUCKET=weather_data

# Groq API (for RAG chat)
GROQ_API_KEY=gsk_your_groq_api_key_here

# FastAPI Configuration
API_HOST=0.0.0.0
API_PORT=8000
```

#### Run the Backend

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**API Documentation:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

### 3️⃣ Frontend Setup (Vue.js)

#### Install Dependencies

```bash
cd weather
npm install
```

#### Configure Environment

Create `weather/.env.local`:

```env
VITE_API_BASE=http://localhost:8000
```

#### Run the Frontend

```bash
npm run dev
```

**Local Access:** [http://localhost:5173](http://localhost:5173)

---

### 4️⃣ Edge ML Deployment (Robustel EG5120)

#### Install ai_edge_litert (TFLite) Runtime on Gateway

SSH into your Robustel EG5120:

```bash
ssh admin@<gateway-ip>
```

Install dependencies:

```bash
pip install tflite-runtime or ai_edge_litert
# If not available:
pip install tensorflow
```

#### Transfer Files to Gateway

```bash
# Copy ML files to gateway
scp Robustel\ EG5120\ ML/predictor.py admin@<gateway-ip>:/home/admin/
scp Robustel\ EG5120\ ML/weather_model.tflite admin@<gateway-ip>:/home/admin/
scp Robustel\ EG5120\ ML/preprocess.json admin@<gateway-ip>:/home/admin/
```

#### Import Node-RED Flow

1. Access Node-RED on gateway: `http://<gateway-ip>:1880`
2. Import `Robustel EG5120/Node-red backup.json`
3. Configure Exec node to call `predictor.py`

---

## 🧠 Edge ML Model Training

### Train the Weather Classifier

```bash
cd "Robustel EG5120 ML"
python train_export.py
```

This will:
✅ Train neural network on `WeatherData.csv`
✅ Generate learning curves in `artifacts/`
✅ Export `weather_model.tflite`
✅ Save preprocessing metadata to `preprocess.json`

### Model Architecture

```
Input Layer (4 features)
    ↓
Dense(64) + ReLU
    ↓
Dropout(0.3)
    ↓
Dense(32) + ReLU
    ↓
Dense(N classes) + Softmax
```

**Hyperparameters:**
- Optimizer: Adam (learning rate: 1e-3)
- Loss: Sparse Categorical Crossentropy
- Epochs: 30
- Validation Split: 20%

### Input Features

| Feature | Unit | Range |
|---------|------|-------|
| Temperature | °C | -20 to 50 |
| Humidity | % | 0 to 100 |
| Pressure | kPa | 90 to 110 |
| TOF | custom | 0 to 500 |

### Output Classes

- ☀️ Sunny
- ⛅ Partly Cloudy
- ☁️ Mostly Cloudy
- 🌧️ Rainy
- ⛈️ Stormy

---

## ▶️ Running Edge Inference

### Command Line Test

```bash
cd "Robustel EG5120 ML"

# Test with JSON input
echo '{"temperature":24.8,"humidity":51,"pressure":101.2,"tof":234}' | python3 predictor.py
```

**Output:**
```json
{
  "prediction": "Sunny",
  "confidence": 0.91
}
```

### Node-RED Integration

**Flow Configuration:**

```
[Inject] → [Function] → [Exec] → [Debug]
```

**Exec Node Settings:**
- Command: `python3 /home/admin/predictor.py`
- Append `msg.payload` ✅
- Output: `when command completes - exec mode`

**Example Flow:**

```javascript
// Function node - Format sensor data
msg.payload = JSON.stringify({
    temperature: msg.temperature,
    humidity: msg.humidity,
    pressure: msg.pressure,
    tof: msg.tof
});
return msg;
```

---

## 🎤 Voice AI Assistant (Groq Integration)

### Features

- 🎙️ **Hold-to-Record:** Voice input with automatic transcription
- 💬 **Text Chat:** Type questions directly  
- 🌡️ **Sensor Context:** Real-time park weather data integration
- ⚡ **Ultra-Fast:** Groq LPU inference (~2-3s total latency)
- 📱 **Mobile Friendly:** Responsive design

### Get Groq API Key

1. Visit [https://console.groq.com/keys](https://console.groq.com/keys)
2. Sign up / Log in
3. Create new API key
4. Add to `.env`: `GROQ_API_KEY=gsk_...`

### Models Used

- **Speech-to-Text:** `whisper-large-v3-turbo`
- **Chat:** `llama-3.3-70b-versatile`

### API Endpoint

**POST** `/api/rag/chat`

**Request (multipart/form-data):**
- `user_query` (optional): Text query
- `audio_file` (optional): Audio recording (WAV, OGG, WebM, MP3)
- `device_data` (optional): JSON array of sensor readings

**Response:**
```json
{
  "transcript": "What's the weather in Zone A?",
  "answer": "In Zone A, temperature is 24°C with 60% humidity."
}
```

---

## 📊 Database Schema (InfluxDB)

### Measurements

**Measurement:** `Sensor_S6000U_data1`, `Sensor_S6000U_data2`, `Sensor_S6000U_data3`

| Field | Type | Description |
|-------|------|-------------|
| `time` | timestamp | Reading timestamp |
| `device_id` | tag | Gateway/sensor ID |
| `temperature` | float | Temperature (°C) |
| `humidity` | float | Relative humidity (%) |
| `pressure` | float | Atmospheric pressure (Pa) |
| `light` | int | Light level |
| `noise` | int | Noise level (dB) |
| `tof` | int | Time-of-flight sensor |
| `angle` | int | Sensor angle |
| `accX/Y/Z` | float | Accelerometer readings |
| `vibrAccX/Y/Z` | float | Vibration acceleration |
| `latitude` | float | GPS latitude |
| `longitude` | float | GPS longitude |
| `weather_prediction` | string | ML prediction result |
| `prediction_confidence` | float | Confidence score (0-1) |

---

## 🗺️ Frontend Components

### WeatherPage.vue

**Main Features:**
- 🗺️ Interactive Leaflet map with device markers
- 🌡️ Real-time weather display
- 📊 Multi-layer visualization (Temperature, Humidity, Noise)
- 📍 Reverse geocoding for device locations
- 🎨 Device-specific weather icons based on predictions

**Layer Types:**
- **Temperature:** Red (hot) → Yellow (warm) → Blue (cool)
- **Humidity:** Cyan (high) → Green (moderate) → Yellow (low)  
- **Noise:** Red (loud) → Yellow (moderate) → Green (quiet)

### RagChatGroq.vue

**Voice Interface:**
- Hold mic button to record
- Automatic Whisper transcription
- Context-aware responses with sensor data
- Audio format support: WAV, OGG, WebM, MP3

---

## 🔌 API Endpoints

### Weather Endpoints

```http
GET /api/weather/forecast/
  ?minutes=60                    # Time window (minutes)
  &measurement=Sensor_S6000U_data1
  &device_id=101                 # Optional: filter by device

Response: Array of sensor readings
```

### RAG Chat Endpoints

```http
POST /api/rag/chat
  Content-Type: multipart/form-data
  
  user_query: "What's the weather?"
  audio_file: <audio-blob>
  device_data: "[{...}]"

Response: { transcript, answer }
```

---

## 🚦 Performance Metrics

| Operation | Latency | Notes |
|-----------|---------|-------|
| Edge Inference | < 100ms | TFLite on EG5120 |
| Groq Whisper | ~1-2s | 10s audio transcription |
| Groq Llama | ~0.5-1s | Response generation |
| API Response | < 200ms | FastAPI + InfluxDB |
| Frontend Render | < 100ms | Vue.js reactivity |

**Total Voice Query:** ~2-3 seconds (record → transcribe → answer)

---

## 🔐 Security Best Practices

1. ✅ **Use environment variables** for all secrets
2. ✅ **Implement rate limiting** in production
3. ✅ **Validate inputs** on backend (Pydantic schemas)
4. ✅ **Set CORS policies** appropriately
5. ✅ **Use HTTPS** in production
6. ✅ **Rotate API keys** regularly

---

## 🛠️ Troubleshooting

### Backend Issues

**Problem:** `Connection refused` to InfluxDB

**Solution:**
```bash
# Check InfluxDB is running
systemctl status influxdb
```

---

**Problem:** Groq API rate limit

**Solution:**
- Check current limits: [https://console.groq.com/settings/limits](https://console.groq.com/settings/limits)
- Implement request queuing
- Consider paid tier for higher limits

---
## 📈 Monitoring & Visualization

### Grafana Dashboard

Import `Robustel EG5120/new_-grafana.json` into Grafana:

1. Access Grafana: `http://localhost:3000`
2. Add InfluxDB data source
3. Import dashboard JSON
4. Configure bucket/org settings

**Dashboard Panels:**
- Temperature trends by device
- Humidity heatmap
- Noise level alerts
- Prediction accuracy metrics

---

## 🤝 Contributing

1. Fork the Project
2. Create Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit Changes (`git commit -m 'Add AmazingFeature'`)
4. Push to Branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

### Coding Standards

- **Python:** Follow PEP 8
- **JavaScript/Vue:** ESLint + Prettier
- **Commits:** Conventional Commits format

---

## 🙏 Acknowledgments

- **Robustel** - EG5120 IoT Gateway hardware
- **Groq** - Ultra-fast LLM inference
- **TensorFlow** - ML model framework
- **InfluxDB** - Time-series database
- **FastAPI** - Modern Python web framework
- **Vue.js** - Progressive JavaScript framework

---

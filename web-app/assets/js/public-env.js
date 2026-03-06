import { API, SILA_LOCATION, THRESHOLDS, PATHS } from "./utils/constants.js";

const gigantiDellaSilaCenter = [SILA_LOCATION.LAT, SILA_LOCATION.LON];
let map, userMarker;
let REAL_TIME_DATA = [];

document.addEventListener("DOMContentLoaded", () => {
  initMap();
  loadPublicEnv();
  setInterval(loadPublicEnv, 30000); // Sync every 30s
});

async function loadPublicEnv() {
  try {
    const response = await fetch(API.FASTAPI_URL);
    if (!response.ok) throw new Error("Backend unreachable");

    const data = await response.json();
    REAL_TIME_DATA = data;

    if (REAL_TIME_DATA.length > 0) {
      const latest = REAL_TIME_DATA[REAL_TIME_DATA.length - 1];

      const previous =
        REAL_TIME_DATA.length > 1
          ? REAL_TIME_DATA[REAL_TIME_DATA.length - 2]
          : latest;

      updateLivePulse(latest);
      updateEnvironmentalInsights(latest, previous);
      renderSensorNodes(REAL_TIME_DATA);
      updateOutlookCard(latest);

      const statusEl = document.getElementById("gateway-status");
      if (statusEl) statusEl.innerText = "Active";
    }
  } catch (error) {
    console.error("Failed to sync with FastAPI:", error);
    const statusEl = document.getElementById("gateway-status");
    if (statusEl) statusEl.innerText = "Offline";
  }
}

function initMap() {
  map = L.map("map").setView(gigantiDellaSilaCenter, 14);

  L.tileLayer(PATHS.MAP_URL, {
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  userMarker = L.marker(gigantiDellaSilaCenter)
    .addTo(map)
    .bindPopup("🌲 Sila National Park Entrance")
    .openPopup();
}

function renderSensorNodes(dataList) {
  map.eachLayer((layer) => {
    if (layer instanceof L.Circle) map.removeLayer(layer);
  });

  const latest = dataList[dataList.length - 1];

  if (latest.latitude && latest.longitude) {
    L.circle([latest.latitude, latest.longitude], {
      color: "#4caf50",
      fillColor: "#81c784",
      fillOpacity: 0.3,
      radius: 200,
    })
      .addTo(map)
      .bindPopup(
        `<b>Node ${latest.device_id}</b><br>Latest Temp: ${latest.temperature}°C`,
      );
  }
}

function updateLivePulse(latest) {
  const tempEl = document.getElementById("live-temp");
  const humEl = document.getElementById("live-humidity");
  const noiseEl = document.getElementById("live-noise");

  if (tempEl) tempEl.innerText = `${latest.temperature.toFixed(1)}°C`;
  if (humEl) humEl.innerText = `${latest.humidity}%`;
  if (noiseEl) noiseEl.innerText = getNoiseLabel(latest.noise);
}

function updateOutlookCard(sensorData) {
  const predictionValue = document.getElementById("live-weather-prediction");
  const predictionDesc = document.getElementById("outlook-desc");
  const predictionIcon = document.getElementById("prediction-icon");
  const confidenceBar = document.getElementById("confidence-bar");
  const confidenceText = document.getElementById("confidence-pct");

  const prediction = sensorData.weather_prediction;
  const confidence = sensorData.prediction_confidence;
  const confidencePct = Math.round(confidence * 100);

  const iconMap = {
    "Sun-Drenched": "☀️",
    "Partly Cloudy": "⛅",
    Overcast: "☁️",
    Rainy: "🌧️",
    Stormy: "⛈️",
  };

  if (predictionIcon) predictionIcon.innerText = iconMap[prediction] || "📡";
  if (predictionValue) predictionValue.innerText = prediction;

  // Description based on confidence level
  if (predictionDesc) {
    if (confidence >= 0.8) {
      predictionDesc.innerText = "High reliability for the next 2-4 hours.";
    } else if (confidence >= 0.5) {
      predictionDesc.innerText = "Stable, but stay alert for Sila fog.";
    } else {
      predictionDesc.innerText = "Low certainty. Conditions may fluctuate.";
    }
  }

  if (confidenceBar) {
    confidenceBar.style.width = `${confidencePct}%`;
    if (confidencePct < 40) {
      confidenceBar.className = "progress-bar bg-danger";
    } else {
      confidenceBar.className = "progress-bar bg-emerald";
    }
  }
  if (confidenceText) confidenceText.innerText = `${confidencePct}%`;
}

function updateEnvironmentalInsights(latest, previous) {
  const trendEl = document.getElementById("pressure-trend");
  const visibilityEl = document.getElementById("live-visibility");

  if (trendEl) {
    const diff = latest.pressure - previous.pressure;
    if (Math.abs(diff) < THRESHOLDS.pressure.stableDiff)
      trendEl.innerHTML = 'Stable <i class="bi bi-arrow-left-right"></i> ';
    else if (diff > 0)
      trendEl.innerHTML = 'Rising <i class="bi bi-arrow-up"></i>';
    else trendEl.innerHTML = 'Falling <i class="bi bi-arrow-down"></i>';
  }

  if (visibilityEl) {
    if (latest.light >= THRESHOLDS.light.sensor.bright) {
      visibilityEl.innerText = "Clear Skies (Open Area)";
    } else if (latest.light >= THRESHOLDS.light.sensor.shaded) {
      visibilityEl.innerText = "Shaded Forest Floor";
    } else if (latest.light >= THRESHOLDS.light.sensor.deepCanopy) {
      visibilityEl.innerText = "Deep Canopy (Gloom)";
    } else if (
      latest.light >= 0 &&
      latest.light < THRESHOLDS.light.sensor.headlampRequired
    ) {
      visibilityEl.innerText = "Headlamp Required";
    } else {
      visibilityEl.innerText = "Low Visibility";
    }
  }
}

function getNoiseLabel(noise) {
  for (const threshold of THRESHOLDS.noise) {
    if (noise <= threshold.max) return threshold.label;
  }
  return "Unknown";
}

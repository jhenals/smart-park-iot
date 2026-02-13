// 1. API Configuration
const FASTAPI_BASE_URL =
  "http://localhost:8000/api/weather/forecast/?minutes=60";
const gigantiDellaSilaCenter = [39.355, 16.223];
let map, userMarker;
let REAL_TIME_DATA = [];

document.addEventListener("DOMContentLoaded", () => {
  initMap();
  loadPublicEnv(); // Initial load
  setInterval(loadPublicEnv, 30000); // Sync every 30s
});

async function loadPublicEnv() {
  try {
    const response = await fetch(FASTAPI_BASE_URL);
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

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
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

/**

function updateLivePulse(dataList) {
  const latest = dataList[dataList.length - 1];

  const tempEl = document.getElementById("live-temp");
  const noiseEl = document.getElementById("live-noise");
  const humidEl = document.getElementById("live-humidity");
  const visibilityEl = document.getElementById("live-visibility");
  const trendEl = document.getElementById("pressure-trend");

  if (tempEl && latest.temperature) {
    tempEl.innerText = `${latest.temperature.toFixed(1)}°C`;
  }

  if (noiseEl && latest.noise) {
    noiseEl.innerText = getNoiseLabel(latest.noise);
  }

  if (humidEl && latest.humidity) {
    humidEl.innerText = `${latest.humidity.toFixed(1)}%`;
  }

  // Visibility Logic (using 'light' and 'tof')
  if (latest.light > 5) visibilityEl.innerText = "High Clarity";
  else if (latest.light > 2) visibilityEl.innerText = "Moderate";
  else visibilityEl.innerText = "Low/Canopy Shadow";

  const diff = latest.pressure - previous.pressure;
  if (Math.abs(diff) < 2) trendEl.innerText = "Stable ↔️";
  else if (diff > 0) trendEl.innerText = "Rising ↗️";
  else trendEl.innerText = "Falling ↘️";

  document.getElementById("gateway-status").innerText = "Active";
}
 */
function updateLivePulse(latest) {
  const tempEl = document.getElementById("live-temp");
  const humEl = document.getElementById("live-humidity");
  const noiseEl = document.getElementById("live-noise");

  if (tempEl) tempEl.innerText = `${latest.temperature.toFixed(1)}°C`;
  if (humEl) humEl.innerText = `${latest.humidity}%`;
  if (noiseEl) noiseEl.innerText = getNoiseLabel(latest.noise);
}

function updateEnvironmentalInsights(latest, previous) {
  const trendEl = document.getElementById("pressure-trend");
  const visibilityEl = document.getElementById("live-visibility");

  if (trendEl) {
    const diff = latest.pressure - previous.pressure;
    if (Math.abs(diff) < 2) trendEl.innerText = "Stable ↔️";
    else if (diff > 0) trendEl.innerText = "Rising ↗️";
    else trendEl.innerText = "Falling ↘️";
  }

  // 2. Visibility Logic (Light)
  if (visibilityEl) {
    // Your JSON shows light: 3, which is quite low
    if (latest.light > 10) visibilityEl.innerText = "Clear Skies";
    else if (latest.light > 2)
      visibilityEl.innerText = "Deep Canopy / Twilight";
    else visibilityEl.innerText = "Low Visibility";
  }
}

const noiseThresholds = [
  { label: "Serene", max: 45 },
  { label: "Quiet", max: 55 },
  { label: "Natural Sounds", max: Infinity },
];

function getNoiseLabel(noise) {
  for (const threshold of noiseThresholds) {
    if (noise <= threshold.max) return threshold.label;
  }
  return "Unknown";
}

/**
TODO: Put this in admin
/**
 * Calculates sensor stability based on accelerometer data.
 * Your data uses units where ~1000 = 1g (gravity).
 
function calculateStability(latestData) {
  const { accX, accY, accZ } = latestData;

  // Calculate the total magnitude of acceleration
  // In a stable state, magnitude should be approx 1000 (1g)
  const magnitude = Math.sqrt(accX ** 2 + accY ** 2 + accZ ** 2);
  const deviation = Math.abs(1000 - magnitude);

  // Calculate Tilt (how far the sensor is leaning from vertical)
  // 0 is perfectly upright; higher values indicate tilt
  const tilt = Math.sqrt(accX ** 2 + accY ** 2);

  let status = {
    label: "Secure",
    class: "status-safe",
    description: "Node is upright and stable.",
  };

  if (deviation > 150) {
    status = {
      label: "Vibration",
      class: "status-warning",
      description: "Mechanical vibration detected.",
    };
  }

  if (tilt > 300) {
    status = {
      label: "Tilted",
      class: "status-danger",
      description: "Sensor position may be compromised.",
    };
  }

  return status;
}

function updateStabilityUI(latestData) {
  const stability = calculateStability(latestData);
  const container = document.getElementById("node-stability");

  if (container) {
    container.innerHTML = `
            <div class="stability-badge ${stability.class}">
                ${stability.label}
            </div>
            <p>${stability.description}</p>
            <small>Tilt Index: ${Math.round(Math.sqrt(latestData.accX ** 2 + latestData.accY ** 2))}</small>
        `;
  }
}

**/

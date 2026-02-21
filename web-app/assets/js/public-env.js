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
    const response = await fetch("http://localhost:8000/api/weather/forecast/public?minutes=60");
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
    if (Math.abs(diff) < THRESHOLDS.pressure.stableDiff)
      trendEl.innerText = "Stable ↔️";
    else if (diff > 0) trendEl.innerText = "Rising ↗️";
    else trendEl.innerText = "Falling ↘️";
  }

  // 2. Visibility Logic (Light)
  if (visibilityEl) {
    if (latest.light > THRESHOLDS.light.clearSkies)
      visibilityEl.innerText = "Clear Skies";
    else if (latest.light > THRESHOLDS.light.deepCanopy)
      visibilityEl.innerText = "Deep Canopy / Twilight";
    else visibilityEl.innerText = "Low Visibility";
  }
}

function getNoiseLabel(noise) {
  for (const threshold of THRESHOLDS.noise) {
    if (noise <= threshold.max) return threshold.label;
  }
  return "Unknown";
}

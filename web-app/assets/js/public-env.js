const SENSORS_DATA_URL = "../../database/sensors.json";
const gigantiDellaSilaCenter = [39.2, 16.8];
let map, userMarker;

document.addEventListener("DOMContentLoaded", () => {
  loadPublicEnv();
});

let MOCK_SENSORS = [];

fetch(SENSORS_DATA_URL)
  .then((response) => response.json())
  .then((sensors) => {
    MOCK_SENSORS = Array.isArray(sensors) ? sensors : [];
    if (map) {
      renderSensorNodes();
    }
  })
  .catch((error) => {
    console.error("Failed to load sensors data:", error);
  });

async function loadPublicEnv() {
  try {
    const response = await fetch(SENSORS_DATA_URL);
    const sensors = await response.json();

    const sensorList = Array.isArray(sensors) ? sensors : [];
    initPublicMap(sensorList);
    updateLivePulse(sensorList);
  } catch (error) {
    console.error("Failed to load public environment data:", error);
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

  renderSensorNodes();
}

function renderSensorNodes() {
  MOCK_SENSORS.forEach((sensor) => {
    L.circle([sensor.lat, sensor.lng], {
      color: "#4caf50",
      fillColor: "#81c784",
      fillOpacity: 0.3,
      radius: 100,
    })
      .addTo(map)
      .bindPopup(`<b>Sensor ${sensor.id}</b><br>Status: Monitoring`);
  });
}

function simulateLiveUpdates() {
  setInterval(() => {
    const temp = (15 + Math.random() * 3).toFixed(1);
    document.getElementById("live-temp").innerText = `${temp}°C`;
  }, 5000);
}

document.addEventListener("DOMContentLoaded", () => {
  initMap();
  simulateLiveUpdates();
});

function updateLivePulse(sensorNodes) {
  if (!sensorNodes.length) return;

  const avgTemp = getAverage(sensorNodes, "temperature");
  const avgNoise = getAverage(sensorNodes, "noise");
  const worstStatus = getWorstStatus(sensorNodes);

  const tempEl = document.getElementById("live-temp");
  const noiseEl = document.getElementById("live-noise");
  const aqiEl = document.getElementById("live-aqi");

  if (tempEl && Number.isFinite(avgTemp)) {
    tempEl.innerText = `${avgTemp.toFixed(1)}°C`;
  }

  if (noiseEl && Number.isFinite(avgNoise)) {
    noiseEl.innerText = getNoiseLabel(avgNoise);
  }

  if (aqiEl) {
    aqiEl.innerText = getAqiLabel(worstStatus);
  }
}

function getAverageLatLng(sensorNodes) {
  const total = sensorNodes.reduce(
    (acc, node) => {
      acc.lat += Number(node.lat) || 0;
      acc.lng += Number(node.lng) || 0;
      acc.count += 1;
      return acc;
    },
    { lat: 0, lng: 0, count: 0 },
  );

  return total.count
    ? [total.lat / total.count, total.lng / total.count]
    : [39.368, 16.598];
}

function getAverage(sensorNodes, key) {
  const values = sensorNodes
    .map((node) => Number(node[key]))
    .filter((value) => Number.isFinite(value));

  if (!values.length) return null;
  const sum = values.reduce((acc, value) => acc + value, 0);
  return sum / values.length;
}

function getWorstStatus(sensorNodes) {
  const priority = { critical: 3, warning: 2, normal: 1 };
  return sensorNodes.reduce((worst, node) => {
    const current = node.status || "normal";
    return priority[current] > priority[worst] ? current : worst;
  }, "normal");
}

function getNoiseLabel(avgNoise) {
  if (avgNoise <= 40) return "Serene";
  if (avgNoise <= 60) return "Quiet";
  if (avgNoise <= 80) return "Natural Sounds";
  return "Noisy";
}

function getAqiLabel(status) {
  if (status === "critical") return "Poor";
  if (status === "warning") return "Moderate";
  return "Excellent";
}

function getStatusColors(status) {
  switch (status) {
    case "critical":
      return { stroke: "#d32f2f", fill: "#ef5350" };
    case "warning":
      return { stroke: "#f57c00", fill: "#ffb74d" };
    default:
      return { stroke: "#4caf50", fill: "#81c784" };
  }
}

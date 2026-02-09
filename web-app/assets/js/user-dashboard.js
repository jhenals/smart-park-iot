const DASHBOARD_DATA_URL = "../../../database/user-dashboard.json";
const GIANTS_DATA_URL = "../../../database/giants-sila.json";

document.addEventListener("DOMContentLoaded", () => {
  loadDashboardData();
});

async function loadDashboardData() {
  try {
    const [dashboardResponse, giantsResponse] = await Promise.all([
      fetch(DASHBOARD_DATA_URL),
      fetch(GIANTS_DATA_URL),
    ]);

    const data = await dashboardResponse.json();
    const giantsData = await giantsResponse.json();

    applyUserAndTrail(data.user, data.safety);
    updateSafetyUI(data.safety);
    setupWeather(data.weather);
    setupEta(data.eta);
    startSensorPolling(data.sensors);
    startGPSTracking(data.gps, giantsData, data.discovery);
  } catch (error) {
    console.error("Failed to load dashboard data:", error);
  }
}

function applyUserAndTrail(user, safety) {
  const savedTrail = localStorage.getItem("recommendedTrail");
  const savedUser = localStorage.getItem("username");

  const displayUser = savedUser || user?.name || "Visitor";
  const displayTrail = savedTrail || user?.preferredTrail || "Giant Pine Loop";

  const trailEl = document.getElementById("active-trail");
  const userEl = document.getElementById("display-username");

  if (trailEl) trailEl.innerText = displayTrail;
  if (userEl) userEl.innerText = displayUser;
}

function startGPSTracking(gpsConfig, giants, discoveryConfig) {
  const progressEl = document.getElementById("progress-percent");
  const circle = document.getElementById("progress-circle");

  let progress = 0;
  const intervalMs = gpsConfig?.progressIntervalMs ?? 3000;
  const step = gpsConfig?.progressStep ?? 2;
  const startLat = gpsConfig?.start?.lat ?? 39.3685;
  const startLng = gpsConfig?.start?.lng ?? 16.5982;
  const markerStep = gpsConfig?.markerStep ?? 0.00005;

  setInterval(() => {
    if (progress >= 100) return;

    progress += step;

    if (progressEl) progressEl.innerText = `${progress}%`;
    if (circle) {
      const offset = 113 - (progress / 100) * 113;
      circle.style.strokeDashoffset = offset;
    }

    const newLat = startLat + progress * markerStep;
    const newLng = startLng + progress * markerStep;

    if (typeof userMarker !== "undefined" && userMarker) {
      userMarker.setLatLng([newLat, newLng]);
    }
    if (typeof map !== "undefined" && map) {
      map.panTo([newLat, newLng]);
    }

    if (Array.isArray(giants) && giants.length > 0) {
      checkProximity(newLat, newLng, giants, discoveryConfig);
    }
  }, intervalMs);
}

function startSensorPolling(sensorConfig) {
  const tempEl = document.getElementById("temp-val");
  const noiseEl = document.getElementById("noise-val");
  const card = document.getElementById("comfort-card");
  const noiseFill = document.getElementById("noise-fill");

  const intervalMs = sensorConfig?.intervalMs ?? 3000;
  const noiseThreshold = sensorConfig?.noiseThreshold ?? 40;
  const tempRange = sensorConfig?.temperatureRange ?? { min: 15, max: 20 };
  const noiseRange = sensorConfig?.noiseRange ?? { min: 30, max: 45 };

  setInterval(() => {
    const temp = randomBetween(tempRange.min, tempRange.max, 1);
    const noise = randomBetween(noiseRange.min, noiseRange.max, 0);

    if (tempEl) tempEl.innerText = `${temp}°C`;
    if (noiseEl) noiseEl.innerText = `${noise} dB`;

    if (card && noiseFill) {
      if (noise > noiseThreshold) {
        card.classList.add("warning");
        noiseFill.style.backgroundColor = "#ff5252";
      } else {
        card.classList.remove("warning");
        noiseFill.style.backgroundColor = "#4caf50";
      }
    }
  }, intervalMs);
}

function setupWeather(weatherConfig) {
  const banner = document.getElementById("weather-alert");
  if (!banner || !weatherConfig) return;

  if (weatherConfig.safe) {
    banner.innerText = weatherConfig.safe.text;
    banner.style.backgroundColor = weatherConfig.safe.color;
  }

  if (weatherConfig.alert) {
    const delay = weatherConfig.alert.delayMs ?? 10000;
    setTimeout(() => {
      banner.innerText = weatherConfig.alert.text;
      banner.style.backgroundColor = weatherConfig.alert.color;
    }, delay);
  }
}

function setupEta(etaConfig) {
  if (!etaConfig) return;

  const labelEl = document.getElementById("eta-label");
  const detailsEl = document.getElementById("eta-details");

  if (labelEl) {
    const label = etaConfig.label || "ETA to Exit";
    const time = etaConfig.time || "";
    labelEl.innerText = time ? `${label}: ${time}` : label;
  }

  if (detailsEl && Array.isArray(etaConfig.items)) {
    detailsEl.innerHTML = etaConfig.items
      .map(
        (item) => `<span class="eta-item">${item.label}: ${item.value}</span>`,
      )
      .join("");
  }
}

function toggleChat(message) {
  alert(
    message ||
      "AI Assistant: 'Hello! I am your RAG-powered guide. Ask me anything about the Laricio Pines!'",
  );
}

function checkProximity(userLat, userLng, giants, discoveryConfig) {
  const threshold = discoveryConfig?.threshold ?? 0.0003;
  const container = document.getElementById("discovery-content");
  const wrapper = document.getElementById("discovery-container");
  if (!container || !wrapper) return;

  let foundGiant = null;

  giants.forEach((giant) => {
    const dist = Math.sqrt(
      Math.pow(userLat - giant.lat, 2) + Math.pow(userLng - giant.lng, 2),
    );
    if (dist < threshold) {
      foundGiant = giant;
    }
  });

  if (foundGiant) {
    container.innerHTML = `
            <div class="state-found">
                <span class="badge" style="background: var(--primary-color); color: var(--text-light-color);">📍 Landmark Reached</span>
                <h4>${foundGiant.name}</h4>
                <p>${foundGiant.desc}</p>
                <button class="main-button" onclick="openChatWithContext('${foundGiant.name}')">
                    Ask Guide about this Tree
                </button>
            </div>
        `;
    wrapper.style.background = "rgba(255, 193, 7, 0.1)";

    // Save to Passport
    let visited = JSON.parse(localStorage.getItem("visitedGiants")) || [];
    if (!visited.includes(foundGiant.name)) {
      visited.push(foundGiant.name);
      localStorage.setItem("visitedGiants", JSON.stringify(visited));
    }
  } else {
    container.innerHTML = `
            <div class="state-scanning">
                <span class="badge pulse">📡 Scanning</span>
                <h4>Searching for Giants...</h4>
                <p>Keep moving. Your GPS is active and tracking the trail.</p>
            </div>
        `;
    wrapper.style.background = "rgba(255, 255, 255, 0.15)";
  }
}

function openChatWithContext(treeName) {
  const message = `Tell me about ${treeName}`;
  localStorage.setItem("pendingChatQuestion", message);
  toggleChat(message);
}

function updateSafetyUI(safetyConfig) {
  const banner = document.getElementById("safety-shield");
  const text = document.getElementById("safety-text");
  if (!banner || !text) return;

  const status = safetyConfig?.status ?? "safe";
  if (status === "danger") {
    banner.className = "safety-banner danger";
    text.innerText =
      safetyConfig?.dangerText || "⚠️ EMERGENCY: Storm approaching. Evacuate.";
  } else {
    banner.className = "safety-banner safe";
    text.innerText =
      safetyConfig?.safeText || "Park Conditions: Optimal for Hiking";
  }
}

function randomBetween(min, max, decimals) {
  const value = min + Math.random() * (max - min);
  return Number(value.toFixed(decimals));
}

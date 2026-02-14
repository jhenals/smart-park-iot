// Track when user starts the trail for ETA calculation
let trailStartTime = null;

document.addEventListener("DOMContentLoaded", () => {
  loadDashboardData();
});

async function loadDashboardData() {
  try {
    const [dashboardResponse, giantsResponse, sensorResponse] =
      await Promise.all([
        fetch(API.DASHBOARD_DATA_PATH),
        fetch(API.GIANTS_DATA_PATH),
        fetch(API.SENSORS_DATA_PATH),
      ]);

    const data = await dashboardResponse.json();
    const giantsData = await giantsResponse.json();
    const sensorData = await sensorResponse.json();

    applyUserAndTrail(data.user, data.safety);
    updateSafetyUI(data.safety);
    setupWeather(data.weather);
    setupEta(data.eta);
    startSensorPolling(sensorData);
    startGPSTracking(data.gps, giantsData, data.discovery);
  } catch (error) {
    console.error("Failed to load dashboard data:", error);
  }
}

function applyUserAndTrail(user, safety) {
  // Get user session from localStorage (set during login)
  const userSessionData = localStorage.getItem("userSession");
  const userSession = userSessionData ? JSON.parse(userSessionData) : null;

  // Get recommended trail from localStorage (set during trail preferences)
  const savedTrailData = localStorage.getItem("recommendedTrail");
  const savedTrail = savedTrailData ? JSON.parse(savedTrailData) : null;

  // Determine display name
  let displayUser = "Explorer";
  if (userSession) {
    if (userSession.firstName && userSession.lastName) {
      displayUser = `${userSession.firstName} ${userSession.lastName}`;
    } else if (userSession.firstName) {
      displayUser = userSession.firstName;
    } else if (userSession.username) {
      displayUser = userSession.username;
    }
  } else if (user?.name) {
    displayUser = user.name;
  }

  // Determine display trail
  const displayTrail =
    savedTrail?.name || user?.preferredTrail || "Giant Pine Loop";

  // Update UI elements
  const trailEl = document.getElementById("active-trail");
  const userEl = document.getElementById("display-username");
  const trailDescEl = document.getElementById("trail-description");

  if (trailEl) trailEl.innerText = displayTrail;
  if (userEl) userEl.innerText = displayUser;
  if (trailDescEl && savedTrail?.description) {
    trailDescEl.innerText = savedTrail.description;
  }

  // Optional: Display additional trail info if available
  updateTrailInfo(savedTrail);

  // Initialize trail start time for ETA calculation
  initializeTrailStart();
}

function startGPSTracking(gpsConfig, giants, discoveryConfig) {
  const progressEl = document.getElementById("progress-percent");
  const circle = document.getElementById("progress-circle");

  // Use shared progress from localStorage
  let progress = parseInt(
    localStorage.getItem("sharedTrailProgress") || "0",
    10,
  );
  const intervalMs = gpsConfig?.progressIntervalMs ?? 3000;
  const step = gpsConfig?.progressStep ?? 2;

  // Use SILA_LOCATION from constants as default
  const startLat = gpsConfig?.start?.lat ?? SILA_LOCATION.LAT;
  const startLng = gpsConfig?.start?.lng ?? SILA_LOCATION.LON;
  const markerStep = gpsConfig?.markerStep ?? 0.00005;

  setInterval(() => {
    if (progress >= 100) return;

    progress += step;

    // Store shared progress
    localStorage.setItem("sharedTrailProgress", progress.toString());

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

    // Update dynamic ETA based on current progress
    const trail = getCurrentTrail();
    if (trail && progress > 0) {
      const eta = calculateDynamicETA(progress, trail);
      const etaLabelEl = document.getElementById("eta-label");
      if (etaLabelEl) {
        etaLabelEl.innerText = `ETA to Complete: ${eta}`;
      }
    }

    if (Array.isArray(giants) && giants.length > 0) {
      checkProximity(newLat, newLng, giants, discoveryConfig);
    }
  }, intervalMs);
}

function startSensorPolling(sensorData) {
  const tempEl = document.getElementById("temp-val");
  const noiseEl = document.getElementById("noise-val");
  const card = document.getElementById("comfort-card");
  const noiseFill = document.getElementById("noise-fill");
  const lightEl = document.getElementById("light-val");

  if (!sensorData || sensorData.length === 0) {
    console.error("No sensor data available");
    return;
  }

  // Use thresholds from constants
  const noiseThreshold = THRESHOLDS.noise[0].max; // Serene threshold (45 dB)

  let currentIndex = sensorData.length - 1; // Start from latest reading
  const intervalMs = 3000; // Update every 3 seconds

  setInterval(() => {
    // Cycle through sensor data
    if (currentIndex < 0) {
      currentIndex = sensorData.length - 1; // Loop back to latest
    }

    const reading = sensorData[currentIndex];
    currentIndex--;

    if (!reading) return;

    // Use actual sensor values
    const temp = reading.temperature || 0;
    const noise = reading.noise || 0;
    const light = reading.light || 0;

    if (tempEl) tempEl.innerText = `${temp.toFixed(1)}°C`;
    if (noiseEl) noiseEl.innerText = `${Math.round(noise)} dB`;

    // Convert light sensor value (0-10 scale) to descriptive lux estimate
    // Light sensor: 0-2 = deep canopy (~200-300 lux), 3-5 = moderate (~400-600 lux), 6-10 = bright (~700-1000 lux)
    const estimatedLux = Math.round(light * 100 + 200); // Rough conversion
    if (lightEl) lightEl.innerText = `${estimatedLux} lux`;

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

function updateTrailInfo(trail) {
  if (!trail) return;

  // Update ETA section with trail-specific data
  const etaLabelEl = document.getElementById("eta-label");
  const etaDetailsEl = document.getElementById("eta-details");

  if (etaLabelEl && trail.duration) {
    etaLabelEl.innerText = `ETA to Complete Trail: ${trail.duration}`;
  }

  if (etaDetailsEl) {
    const details = [];

    if (trail.distance) {
      details.push(
        `<span class="eta-item"><strong>Distance:</strong> ${trail.distance}</span>`,
      );
    }
    if (trail.elevation) {
      details.push(
        `<span class="eta-item"><strong>Elevation Gain:</strong> ${trail.elevation}</span>`,
      );
    }
    if (trail.difficulty) {
      const difficultyLabel =
        TRAIL_PREFERENCES?.difficulty?.find((d) => d.value === trail.difficulty)
          ?.label || trail.difficulty;
      details.push(
        `<span class="eta-item"><strong>Difficulty:</strong> ${difficultyLabel}</span>`,
      );
    }

    if (trail.features && Array.isArray(trail.features)) {
      const featuresHTML = trail.features
        .slice(0, 3)
        .map(
          (feature) =>
            `<span class="eta-item feature-badge">✓ ${feature}</span>`,
        )
        .join("");
      details.push(featuresHTML);
    }

    if (details.length > 0) {
      etaDetailsEl.innerHTML = details.join("<br>");
    }
  }
}

// Get current user session
function getCurrentUser() {
  const userSessionData = localStorage.getItem("userSession");
  return userSessionData ? JSON.parse(userSessionData) : null;
}

// Get current trail
function getCurrentTrail() {
  const savedTrailData = localStorage.getItem("recommendedTrail");
  return savedTrailData ? JSON.parse(savedTrailData) : null;
}

// Initialize trail start time
function initializeTrailStart() {
  const savedStartTime = localStorage.getItem("trailStartTime");
  if (savedStartTime) {
    trailStartTime = parseInt(savedStartTime, 10);
  } else {
    trailStartTime = Date.now();
    localStorage.setItem("trailStartTime", trailStartTime.toString());
  }
}

// Reset trail start time (call when starting a new trail)
function resetTrailStart() {
  trailStartTime = Date.now();
  localStorage.setItem("trailStartTime", trailStartTime.toString());
  localStorage.setItem("sharedTrailProgress", "0");
  localStorage.removeItem("visitedGiants");
}

// Format minutes into readable time string
function formatTime(minutes) {
  if (minutes < 1) {
    return "< 1m";
  }

  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);

  if (hours > 0) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${mins}m`;
}

// Calculate dynamic ETA based on current progress
function calculateDynamicETA(currentProgress, trail) {
  // Restore start time if not set
  if (!trailStartTime) {
    const savedStartTime = localStorage.getItem("trailStartTime");
    if (savedStartTime) {
      trailStartTime = parseInt(savedStartTime, 10);
    } else {
      return trail.duration || "N/A";
    }
  }

  if (currentProgress === 0) {
    return trail.duration || "N/A";
  }

  // Calculate elapsed time
  const elapsedMs = Date.now() - trailStartTime;
  const elapsedMinutes = elapsedMs / (1000 * 60);

  // Calculate average speed (percent per minute)
  const avgSpeedPercentPerMin = currentProgress / elapsedMinutes;

  // Calculate remaining time with difficulty adjustment
  return calculateAdjustedETA(currentProgress, trail, avgSpeedPercentPerMin);
}

// Calculate ETA with difficulty and elevation adjustments
function calculateAdjustedETA(currentProgress, trail, avgSpeedPercentPerMin) {
  let difficultyMultiplier = 1.0;

  // Adjust for trail difficulty
  if (trail.difficulty) {
    switch (trail.difficulty.toLowerCase()) {
      case "easy":
        difficultyMultiplier = 0.9;
        break;
      case "moderate":
        difficultyMultiplier = 1.0;
        break;
      case "hard":
        difficultyMultiplier = 1.3;
        break;
      case "expert":
        difficultyMultiplier = 1.6;
        break;
    }
  }

  // Adjust for elevation gain (parse from string like "150m" or "500 ft")
  if (trail.elevation) {
    const elevationMatch = trail.elevation.match(/\d+/);
    if (elevationMatch) {
      const elevationGain = parseInt(elevationMatch[0], 10);
      if (elevationGain > 300) {
        difficultyMultiplier *= 1.2;
      } else if (elevationGain > 500) {
        difficultyMultiplier *= 1.4;
      }
    }
  }

  // Calculate adjusted speed
  const adjustedSpeed = avgSpeedPercentPerMin / difficultyMultiplier;

  // Calculate remaining progress and time
  const remainingProgress = 100 - currentProgress;
  const remainingMinutes = remainingProgress / adjustedSpeed;

  return formatTime(remainingMinutes);
}

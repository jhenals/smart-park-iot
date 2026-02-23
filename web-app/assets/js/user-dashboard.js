import {
  getUserProfile,
  getSession,
  getDoc,
  doc,
  userDatabase as trailDatabase,
} from "./auth.js";
import { trackTrailVisit } from "./ml-integration.js";

let trailStartTime = null;
let currentTrailId = null;

document.addEventListener("DOMContentLoaded", async () => {
  await displayUserAndTrail();
});

const session = JSON.parse(localStorage.getItem("userSession"));
const userId = session && session.uid ? session.uid : null;
const displayName = userId ? session.displayName : "Visitor";

async function displayUserAndTrail() {
  const savedTrailId = localStorage.getItem("selectedTrailId");
  let savedTrail = null;

  if (savedTrailId) {
    try {
      const trailDoc = await getDoc(doc(trailDatabase, "trails", savedTrailId));
      if (trailDoc.exists()) {
        savedTrail = trailDoc.data();
        currentTrailId = savedTrailId;
      }
    } catch (error) {
      console.error("Error fetching trail info:", error);
    }
  }

  updateUserAndTrailUI(savedTrail);
}

function updateUserAndTrailUI(savedTrail) {
  const userEl = document.getElementById("display-username");
  const trailEl = document.getElementById("active-trail");
  const trailDescEl = document.getElementById("trail-description");
  const slopeEl = document.getElementById("trail-slope");
  const widthEl = document.getElementById("trail-width");
  const noiseEl = document.getElementById("trail-noise");
  const tagsEl = document.getElementById("trail-tags");

  if (userEl) userEl.innerText = displayName;
  if (trailEl) trailEl.innerText = savedTrail?.name || "No Trail Selected";
  if (trailDescEl) trailDescEl.innerText = savedTrail?.description || "";
  if (slopeEl) slopeEl.innerText = savedTrail?.slope || "";
  if (widthEl) widthEl.innerText = savedTrail?.width || "";
  if (noiseEl) noiseEl.innerText = savedTrail?.noise || "";
  if (tagsEl)
    tagsEl.innerText = Array.isArray(savedTrail?.tags)
      ? savedTrail.tags.join(", ")
      : savedTrail?.tags || "";

  // Also update ETA and details dynamically when trail info is loaded
  if (savedTrail) {
    updateDashboardUI(savedTrail);
  }
}

function updateDashboardUI(trail) {
  // Always check for null/undefined and for element existence
  const trailEl = document.getElementById("active-trail");
  if (trailEl) trailEl.innerText = trail?.name || "No Trail Selected";

  const descEl = document.getElementById("trail-description");
  if (descEl) descEl.innerText = trail?.description || "";

  const slopeEl = document.getElementById("trail-slope");
  if (slopeEl) slopeEl.innerText = trail?.slope ?? "";

  const widthEl = document.getElementById("trail-width");
  if (widthEl) widthEl.innerText = trail?.width ?? "";

  const noiseEl = document.getElementById("trail-noise");
  if (noiseEl) noiseEl.innerText = trail?.noise ?? "";

  const tagsEl = document.getElementById("trail-tags");
  if (tagsEl)
    tagsEl.innerText = Array.isArray(trail?.tags)
      ? trail.tags.join(", ")
      : trail?.tags || "";

  // ETA and details
  updateTrailInfo(trail);
}

function updateTrailInfo(trail) {
  const etaLabelEl = document.getElementById("eta-label");
  const etaDetailsEl = document.getElementById("eta-details");
  let progress = parseInt(
    localStorage.getItem("sharedTrailProgress") || "0",
    10,
  );
  let eta = trail?.duration || "N/A";
  if (progress > 0 && trail) {
    eta = calculateDynamicETA(progress, trail);
  }
  if (etaLabelEl) etaLabelEl.innerText = `ETA to Complete Trail: ${eta}`;

  if (etaDetailsEl && trail) {
    etaDetailsEl.innerHTML = `
      <span class="eta-item">Distance: ${trail.distance ?? "?"} km</span><br>
      <span class="eta-item">Elevation: +${trail.elevation ?? "?"} m</span><br>
      <span class="eta-item">Difficulty: ${trail.difficulty ?? "?"}</span><br>
      <span class="eta-item">Features: ${(trail.features || []).slice(0, 3).join(", ")}</span>
    `;
  }
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
    if (progress >= 100) {
      // Trail completed - track it!
      if (currentTrailId && trailStartTime) {
        const durationMinutes = Math.floor(
          (Date.now() - trailStartTime) / 60000,
        );
        trackTrailVisit(currentTrailId, {
          duration: durationMinutes,
          completed: true,
        }).then(() => {
          console.log(
            `✅ Trail completion tracked: ${currentTrailId} (${durationMinutes} mins)`,
          );
        });
        currentTrailId = null; // Prevent duplicate tracking
      }
      return;
    }

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

//TODO: Put this in Passport
async function deleteUserPreferencesInFirebase() {
  try {
    const session = getSession();
    const userId = session.uid;
    const userPrefsRef = doc(userDatabase, "user_prefs", userId);
    await setDoc(userPrefsRef, {});
    console.log("User preferences deleted from Firebase");
    return true;
  } catch (error) {
    console.error("Error deleting user preferences:", error);
    return false;
  }
}

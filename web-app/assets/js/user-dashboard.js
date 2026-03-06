import { THRESHOLDS,SILA_LOCATION, API } from "./utils/constants.js";
import { trackTrailVisit } from "./ml-integration.js";
import { firestoreDatabase } from "../../../firebase-config/firebase.js";
import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";


let trailStartTime = null;
let currentTrailId = null;

document.addEventListener("DOMContentLoaded", async () => {
  await displayUserAndTrail();
  updateSafetyBanner("safe"); // Default to safe, will be updated by config
  fetchAndDisplayEnvironmentInfo();
});

async function displayUserAndTrail() {
  const session = JSON.parse(localStorage.getItem("userSession"));
  const displayName = session?.displayName || "Explorer";
  const savedTrailId = localStorage.getItem("selectedTrailId");
  let savedTrail = null;

  const trailLengthEl = document.getElementById("trail-length");
  const trailDescEl = document.getElementById("trail-description");
  const trailDurationEl = document.getElementById("trail-duration");

  if (savedTrailId) {
    try {
      const trailDoc = await getDoc(doc(firestoreDatabase, "trails", savedTrailId));
      console.log("Fetched trail document:", trailDoc.id, trailDoc.data());
      if (trailDoc.exists()) {
        savedTrail = trailDoc.data();
        if (trailLengthEl)
          trailLengthEl.innerText = savedTrail.length || "-- km";
        if (trailDescEl)
          trailDescEl.innerText = savedTrail.description || "--";
        if (trailDurationEl)
          trailDurationEl.innerText = savedTrail.duration || "-- mins";
        currentTrailId = savedTrailId; // Set current trail ID for tracking
      }
    } catch (error) {
      console.error("Error fetching trail info from Firebase:", error);
    }
  }
  updateUserAndTrailUI(savedTrail, savedTrailId, displayName);
}


//TODO: Change status based on real-time config from backend (e.g. weather alerts, ranger updates)
function updateSafetyBanner(status) {
          const shield = document.getElementById('safety-shield');
          const text = document.getElementById('safety-text');
          const icon = document.getElementById('safety-icon');
          if (status === 'danger') {
            shield.className = 'safety-banner danger';
            text.textContent = 'Warning: Unsafe Park Conditions!';
            icon.src = '../../public/icons/warning-icon.png';
            icon.alt = 'warning-icon';
          } else {
            shield.className = 'safety-banner safe';
            text.textContent = 'Park Conditions: Optimal for Hiking';
            icon.src = '../../public/icons/forest-icon.png';
            icon.alt = 'forest-icon';
          }
        }

function updateUserAndTrailUI(savedTrail, savedTrailId, displayName) {
  const userEl = document.getElementById("display-username");
  const trailEl = document.getElementById("active-trail");
  const trailDescEl = document.getElementById("trail-description");
  if (userEl) userEl.innerText = displayName;
  if (trailEl)
    trailEl.innerText = savedTrail?.name || savedTrailId || "No Trail Selected";
  if (trailDescEl) trailDescEl.innerText = savedTrail?.description || "";
}

async function fetchAndDisplayEnvironmentInfo() {
  try {
    const response = await fetch(API.FASTAPI_URL);
    if (!response.ok) throw new Error("Backend unreachable");
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) return;
    const latest = data[data.length - 1];
    const tempEl = document.getElementById("temp-val");
    const noiseEl = document.getElementById("noise-val");
    const lightEl = document.getElementById("light-val");
    if (tempEl && typeof latest.temperature === "number")
      tempEl.innerText = `${latest.temperature.toFixed(1)}°C`;
    if (noiseEl && typeof latest.noise === "number")
      noiseEl.innerText = `${Math.round(latest.noise)} dB`;
    if (lightEl && typeof latest.light === "number") {
      const estimatedLux = Math.round(latest.light * 100 + 200);
      lightEl.innerText = `${estimatedLux} lux`;
    }
  } catch (error) {
    console.error("Failed to fetch environment info from FastAPI:", error);
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
    const userPrefsRef = doc(firestoreDatabase, "user_prefs", userId);
    await setDoc(userPrefsRef, {});
    console.log("User preferences deleted from Firebase");
    return true;
  } catch (error) {
    console.error("Error deleting user preferences:", error);
    return false;
  }
}

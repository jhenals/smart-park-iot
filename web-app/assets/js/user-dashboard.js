document.addEventListener("DOMContentLoaded", () => {
  const savedTrail =
    localStorage.getItem("recommendedTrail") || "Giant Pine Loop";
  const savedUser = localStorage.getItem("username") || "Visitor";

  document.getElementById("active-trail").innerText = savedTrail;
  document.getElementById("display-username").innerText = savedUser;

  initMap();

  simulateSensors();
  simulateGPS();
  simulateWeather();
});

function initMap() {
  if (typeof L === "undefined") {
    console.error(
      "Leaflet library not found! Did you include the <link> and <script> tags in your HTML?",
    );
    return;
  }

  // Add this inside your initMap() function
  MOCK_GIANTS.forEach((giant) => {
    // Visualizes the 30-meter detection zone
    L.circle([giant.lat, giant.lng], {
      color: "rgba(255, 193, 7, 0.5)", // Gold
      fillColor: "#ffc107",
      fillOpacity: 0.2,
      radius: 30, // 30 meters
    }).addTo(map);
  });

  map = L.map("map-container").setView([39.3685, 16.5982], 16);
  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
  ).addTo(map);
  userMarker = L.marker([39.3685, 16.5982]).addTo(map);
}

function startGPSTracking() {
  let progress = 0;
  setInterval(() => {
    if (progress < 100) {
      progress += 2;
      document.getElementById("progress-percent").innerText = `${progress}%`;

      // Update Circle
      const circle = document.getElementById("progress-circle");
      const offset = 113 - (progress / 100) * 113;
      circle.style.strokeDashoffset = offset;

      // Move the marker on the map to simulate walking
      const newLat = 39.3685 + progress * 0.00005;
      const newLng = 16.5982 + progress * 0.00005;

      if (userMarker) {
        userMarker.setLatLng([newLat, newLng]);
        map.panTo([newLat, newLng]); // Follow the user
        checkProximity(newLat, newLng); // Check for trees
      }
    }
  }, 3000);
}

function simulateSensors() {
  setInterval(() => {
    const temp = (15 + Math.random() * 5).toFixed(1); // 15°C - 20°C
    const noise = (30 + Math.random() * 10).toFixed(0); // 30dB - 40dB

    document.getElementById("temp-val").innerText = `${temp}°C`;
    document.getElementById("noise-val").innerText = `${noise} dB`;

    document.getElementById("noise-status").innerText =
      noise > 35 ? "Moderate" : "Quiet";
  }, 3000);
}

let progress = 0;
function simulateGPS() {
  setInterval(() => {
    if (progress < 100) {
      progress += 5;
      document.getElementById("hike-progress").style.width = `${progress}%`;

      const lat = (39.368 + Math.random() * 0.001).toFixed(4);
      const lng = (16.598 + Math.random() * 0.001).toFixed(4);
      document.getElementById("gps-coords").innerText =
        `LAT: ${lat} | LNG: ${lng}`;

      if (progress === 50) {
        document.getElementById("insight-text").innerText =
          "You are near 'The Twin Giants'!";
      }
    }
  }, 5000);
}

function simulateWeather() {
  const banner = document.getElementById("weather-alert");

  banner.innerText = "🌤️ Sky is clear. Trail is safe.";
  banner.style.backgroundColor = "#2e7d32";

  // Randomly simulate a weather warning after 10 seconds
  setTimeout(() => {
    banner.innerText =
      "⚠️ CAUTION: Rain detected via API. Suggesting shorter route.";
    banner.style.backgroundColor = "#d32f2f";
  }, 10000);
}

function toggleChat() {
  alert(
    "AI Assistant: 'Hello! I am your RAG-powered guide. Ask me anything about the Laricio Pines!'",
  );
}

function checkProximity(userLat, userLng) {
  const threshold = 0.0003;
  const container = document.getElementById("discovery-content");
  let foundGiant = null;

  // Check if user is near any giant
  MOCK_GIANTS.forEach((giant) => {
    const dist = Math.sqrt(
      Math.pow(userLat - giant.lat, 2) + Math.pow(userLng - giant.lng, 2),
    );
    if (dist < threshold) {
      foundGiant = giant;
    }
  });

  if (foundGiant) {
    // --- State: Giant Found ---
    container.innerHTML = `
            <div class="state-found">
                <span class="badge" style="background: #ffc107; color: #1b3022;">📍 Landmark Reached</span>
                <h4>${foundGiant.name}</h4>
                <p>${foundGiant.desc}</p>
                <button class="btn-small" onclick="openChatWithContext('${foundGiant.name}')">
                    Ask Guide about this Tree
                </button>
            </div>
        `;
    document.getElementById("discovery-container").style.background =
      "rgba(255, 193, 7, 0.1)";
  } else {
    // --- State: Default Scanning ---
    container.innerHTML = `
            <div class="state-scanning">
                <span class="badge pulse">📡 Scanning</span>
                <h4>Searching for Giants...</h4>
                <p>Keep moving. Your GPS is active and tracking the trail.</p>
            </div>
        `;
    document.getElementById("discovery-container").style.background =
      "rgba(255, 255, 255, 0.15)";
  }
}

function openChatWithContext(treeName) {
  // This connects to Rima's role
  // You could open a chat modal here and pre-fill the question
  const message = `Tell me about ${treeName}`;
  localStorage.setItem("pendingChatQuestion", message);
  toggleChat(message);
}

// --- DYNAMIC DATA SIMULATOR ---
const MOCK_GIANTS = [
  {
    name: "The Grand Laricio",
    lat: 39.3685,
    lng: 16.5982,
    desc: "A 45m tall titan.",
  },
  {
    name: "Twin Pines",
    lat: 39.369,
    lng: 16.599,
    desc: "Two trees sharing one root.",
  },
];

document.addEventListener("DOMContentLoaded", () => {
  updateSafetyUI("safe");
  startSensorPolling();
  startGPSTracking();
});

// 1. GPS & ETA Logic (Your Role)
function startGPSTracking() {
  let progress = 0;
  setInterval(() => {
    if (progress < 100) {
      progress += 2;
      document.getElementById("progress-percent").innerText = `${progress}%`;

      // Update the SVG circle progress
      const circle = document.getElementById("progress-circle");
      const offset = 113 - (progress / 100) * 113;
      circle.style.strokeDashoffset = offset;

      // Check for nearby "Giants" (Proximity Alert)
      if (progress === 20) showDiscovery(MOCK_GIANTS[0]);
    }
  }, 3000);
}

// 2. Sensor UI Feedback (Meron/Zakariye Role)
function startSensorPolling() {
  setInterval(() => {
    const noise = Math.floor(Math.random() * (45 - 30) + 30);
    const card = document.getElementById("comfort-card");
    const noiseText = document.getElementById("noise-val");

    noiseText.innerText = `${noise} dB`;

    // Aesthetic change: Card turns red if noise preference is violated
    if (noise > 40) {
      card.classList.add("warning");
      document.getElementById("noise-fill").style.backgroundColor = "#ff5252";
    } else {
      card.classList.remove("warning");
      document.getElementById("noise-fill").style.backgroundColor = "#4caf50";
    }
  }, 4000);
}

function updateSafetyUI(status) {
  const banner = document.getElementById("safety-shield");
  if (status === "danger") {
    banner.className = "safety-banner danger";
    document.getElementById("safety-text").innerText =
      "⚠️ EMERGENCY: Storm approaching. Evacuate.";
  }
}

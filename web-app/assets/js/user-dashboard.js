document.addEventListener("DOMContentLoaded", () => {
  // 1. Initial Setup from LocalStorage
  const savedTrail =
    localStorage.getItem("recommendedTrail") || "Giant Pine Loop";
  const savedUser = localStorage.getItem("username") || "Visitor";

  document.getElementById("active-trail").innerText = savedTrail;
  document.getElementById("display-username").innerText = savedUser;

  // 2. Start Data Simulations
  simulateSensors();
  simulateGPS();
  simulateWeather();
});

// Simulate S6000U Sensor Data (Temperature & Noise)
function simulateSensors() {
  setInterval(() => {
    const temp = (15 + Math.random() * 5).toFixed(1); // 15°C - 20°C
    const noise = (30 + Math.random() * 10).toFixed(0); // 30dB - 40dB

    document.getElementById("temp-val").innerText = `${temp}°C`;
    document.getElementById("noise-val").innerText = `${noise} dB`;

    // Dynamic status update
    document.getElementById("noise-status").innerText =
      noise > 35 ? "Moderate" : "Quiet";
  }, 3000);
}

// Simulate your GPS Localization Role
let progress = 0;
function simulateGPS() {
  setInterval(() => {
    if (progress < 100) {
      progress += 5;
      document.getElementById("hike-progress").style.width = `${progress}%`;

      // Mock Coordinates
      const lat = (39.368 + Math.random() * 0.001).toFixed(4);
      const lng = (16.598 + Math.random() * 0.001).toFixed(4);
      document.getElementById("gps-coords").innerText =
        `LAT: ${lat} | LNG: ${lng}`;

      // Update AI Insight based on progress
      if (progress === 50) {
        document.getElementById("insight-text").innerText =
          "You are near 'The Twin Giants'!";
      }
    }
  }, 5000);
}

// Simulate Weather Forecast Overrides
function simulateWeather() {
  const banner = document.getElementById("weather-alert");
  // Simulate a clear status initially
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
  const threshold = 0.0002; // Roughly 20 meters
  MOCK_GIANTS.forEach((giant) => {
    const dist = Math.sqrt(
      Math.pow(userLat - giant.lat, 2) + Math.pow(userLng - giant.lng, 2),
    );
    if (dist < threshold) {
      document.getElementById("discovery-alert").style.display = "block";
      document.getElementById("discovery-text").innerText =
        `You've reached ${giant.name}!`;
    }
  });
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

// 3. Safety Override (Sisay's Role)
function updateSafetyUI(status) {
  const banner = document.getElementById("safety-shield");
  if (status === "danger") {
    banner.className = "safety-banner danger";
    document.getElementById("safety-text").innerText =
      "⚠️ EMERGENCY: Storm approaching. Evacuate.";
  }
}

// src/user/localization.js
let map, userMarker;

function initMap() {
  const gigantiDellaSilaCenter = [39.2, 16.8];
  var map = L.map("map").setView(gigantiDellaSilaCenter, 13);

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);
  // Watch the user's position
  navigator.geolocation.watchPosition(updateLocation, handleError, {
    enableHighAccuracy: true,
  });
}
z;
function updateLocation(position) {
  const { latitude, longitude } = position.coords;

  if (!userMarker) {
    userMarker = L.marker([latitude, longitude])
      .addTo(map)
      .bindPopup("You are here")
      .openPopup();
  } else {
    userMarker.setLatLng([latitude, longitude]);
  }

  // Auto-center map on user
  map.panTo([latitude, longitude]);

  // Call your proximity logic to see if they are near a "Giant"
  checkProximity(latitude, longitude);
}

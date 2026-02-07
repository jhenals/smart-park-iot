const loadingMessage = document.getElementById("loading-message");

const gigantiDellaSilaCenter = [39.2, 16.8];
let map, userMarker;

function initMap() {
  map = L.map("map").setView(gigantiDellaSilaCenter, 13);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  userMarker = L.marker(gigantiDellaSilaCenter)
    .addTo(map)
    .bindPopup("📍 You are here")
    .openPopup();
}

initMap();
const DUMMY_USER_POSITION = {
  lat: 39.3305,
  lng: 16.4728,
};

const sensors = [];

fetchSensors();

// Helper functions
function goToUserDashboard() {
  window.location.href = "../../src/user/user-dashboard.html";
}

function fetchSensors() {
  const loadingMessage = document.getElementById("loading-message");

  loadingMessage.style.display = "block";

  // Simulate network delay with setTimeout
  setTimeout(() => {
    fetch("../../../database/sensors.json")
      .then((res) => res.json())
      .then((data) => {
        data.forEach((sensor) => sensors.push(sensor));
        renderSidebar(sensors);
        renderMapMarkers(sensors);

        // Hide loading and render data
        loadingMessage.style.display = "none";
      })
      .catch((err) => {
        loadingMessage.textContent = "Error loading sensors";
        console.error("Error loading sensors:", err);
      });
  }, 1000); // 1 second simulated delay
}

function getIconByStatus(status) {
  const color =
    status === "normal" ? "green" : status === "warning" ? "orange" : "red";
  return L.divIcon({
    html: `<i style="background-color:${color};display:block;width:20px;height:20px;border-radius:50%;border:2px solid #fff;"></i>`,
    className: "",
  });
}

function getAlertMessage(sensor) {
  if (sensor.noise >= 90) {
    return {
      title: "High Noise Level",
      message: `Noise has exceeded safe limits (${sensor.noise} dB). This area may be crowded or unsafe.`,
      icon: "fa-volume-high",
    };
  }

  if (sensor.temperature >= 35) {
    return {
      title: "High Temperature",
      message: `Temperature is very high (${sensor.temperature}°C). Stay hydrated and avoid long exposure.`,
      icon: "fa-temperature-high",
    };
  }

  if (sensor.humidity >= 80) {
    return {
      title: "High Humidity",
      message: `Humidity is elevated (${sensor.humidity}%). Trail conditions may feel uncomfortable.`,
      icon: "fa-water",
    };
  }

  return {
    title: "Environmental Warning",
    message: "Unusual environmental conditions detected.",
    icon: "fa-triangle-exclamation",
  };
}

function renderSidebar(sensors) {
  const list = document.getElementById("device-list");
  list.innerHTML = "";
  sensors.forEach((s) => {
    const li = document.createElement("li");
    li.className = `device-item status-${s.status}`;
    li.innerHTML = `
          <h4>${s.name}</h4>
          <p>Temperature: ${s.temperature}°C</p>
          <p>Humidity: ${s.humidity}%</p>
          <p>Noise: ${s.noise} dB</p>
          <p>Battery: ${s.battery}%</p> 
          <p>Last update: ${s.timestamp}</p>
        `;
    list.appendChild(li);
  });

  const alertList = document.getElementById("alert-list");
  alertList.innerHTML = "";

  sensors
    .filter((s) => s.status === "warning" || s.status === "critical")
    .forEach((sensor) => {
      const alertInfo = getAlertMessage(sensor);

      const li = document.createElement("li");
      li.className = `alert-item status-${sensor.status}`;

      li.innerHTML = `
      <p class="alert-clickable">
        <span class="fa-solid ${alertInfo.icon}"></span>
        ${sensor.name} – ${alertInfo.title}
      </p>
    
      <div class="alert-detail hidden">
      <p>${alertInfo.message}</p>
      <small>${sensor.timestamp}</small>
      </div>
    `;

      alertList.appendChild(li);

      const detailBox = li.querySelector(".alert-detail");
      li.querySelectorAll(".alert-clickable").forEach((p) => {
        p.addEventListener("click", () => {
          detailBox.classList.toggle("hidden");
        });
      });
    });
}

function renderMapMarkers(sensors) {
  sensors.forEach((s) => {
    const marker = L.marker([s.lat, s.lng], {
      icon: getIconByStatus(s.status),
    }).addTo(map);
    marker.bindPopup(`
          <b>${s.name}</b><br>
          Temperature: ${s.temperature}°C<br>
          Humidity: ${s.humidity}%<br>
          Noise: ${s.noise} dB<br>
          Battery: ${s.battery}%<br> 
          Last update: ${s.timestamp}
        `);
  });
}

function locateUser() {
  if (!navigator.geolocation) {
    alert("Geolocation is not supported by your browser");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      const dummyLat = DUMMY_USER_POSITION.lat;
      const dummyLng = DUMMY_USER_POSITION.lng;

      if (userMarker) {
        map.removeLayer(userMarker);
      }

      userMarker = L.marker([dummyLat, dummyLng])
        .addTo(map)
        .bindPopup("📍 You are here")
        .openPopup();

      //map.setView([lat, lng], 16);
      map.setView([dummyLat, dummyLng], 16);

      // OPTIONAL: send GPS to backend (Node-RED)
      sendLocationToBackend(lat, lng);
    },
    () => {
      alert("Unable to retrieve your location");
    },
  );
}

function sendLocationToBackend(lat, lng) {
  fetch("http://localhost:1880/update-location", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ latitude: lat, longitude: lng }),
  }).catch((err) => console.error("Error sending location to backend:", err));
}

function refreshMap() {
  renderSidebar(sensors);
  renderMapMarkers(sensors);
  map.setView(gigantiDellaSilaCenter, 13);
}

// For Mock up: simulate real-time updates every 15 seconds
setInterval(() => {
  sensors.forEach((s) => {
    // random change for demonstration
    s.temperature += Math.floor(Math.random() * 3 - 1);
    s.humidity += Math.floor(Math.random() * 3 - 1);
    s.noise += Math.floor(Math.random() * 5 - 2);
    if (s.noise > 80) s.status = "critical";
    else if (s.noise > 60) s.status = "warning";
    else s.status = "normal";
    s.timestamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  });
  renderSidebar(sensors);
  map.eachLayer((layer) => {
    if (layer instanceof L.Marker) map.removeLayer(layer);
  });
  renderMapMarkers(sensors);
}, 15000);

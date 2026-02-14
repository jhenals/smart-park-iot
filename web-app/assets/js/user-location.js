let locationMap, userLocationMarker, accuracyCircle, pathPolyline;
let userPosition = null;
let isFollowingUser = true;
let watchID = null;
let nearbyGiants = [];

document.addEventListener("DOMContentLoaded", () => {
  initializeLocationMap();
  loadTrailInfo();
  loadNearbyPoints();
  startLocationTracking();
});

function initializeLocationMap() {
  locationMap = L.map("location-map").setView(
    [SILA_LOCATION.LAT, SILA_LOCATION.LON],
    15,
  );

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(locationMap);

  const userIcon = L.divIcon({
    html: `
      <div style="
        width: 24px;
        height: 24px;
        background: #2196f3;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 0 10px rgba(33, 150, 243, 0.5);
        position: relative;
      ">
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 8px;
          height: 8px;
          background: white;
          border-radius: 50%;
        "></div>
      </div>
    `,
    className: "",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  userLocationMarker = L.marker([SILA_LOCATION.LAT, SILA_LOCATION.LON], {
    icon: userIcon,
  })
    .addTo(locationMap)
    .bindPopup("📍 You are here");

  accuracyCircle = L.circle([SILA_LOCATION.LAT, SILA_LOCATION.LON], {
    radius: 50,
    color: "#2196f3",
    fillColor: "#2196f3",
    fillOpacity: 0.1,
    weight: 1,
  }).addTo(locationMap);

  pathPolyline = L.polyline([], {
    color: "var(--danger-color)",
    weight: 3,
    opacity: 0.7,
    dashArray: "10, 5",
  }).addTo(locationMap);
}

function loadTrailInfo() {
  const trail = getCurrentTrail();
  const trailEl = document.getElementById("current-trail");

  if (trail && trail.name) {
    trailEl.textContent = trail.name;
  } else {
    trailEl.textContent = "No trail selected";
  }
}

async function loadNearbyPoints() {
  try {
    const response = await fetch(API.GIANTS_DATA_PATH);
    nearbyGiants = await response.json();

    nearbyGiants.forEach((giant) => {
      const giantIcon = L.divIcon({
        html: `<div style="font-size: 50px;">🌲</div>`,
        className: "",
        iconSize: [24, 24],
        iconAnchor: [12, 24],
      });

      const marker = L.marker([giant.lat, giant.lng], { icon: giantIcon })
        .addTo(locationMap)
        .bindPopup(`<strong>${giant.name}</strong><br>${giant.desc}`);

      giant.marker = marker;
    });

    if (userPosition) {
      updateNearbyPoints(userPosition.lat, userPosition.lng);
    }
  } catch (error) {
    console.error("Error loading nearby points:", error);
  }
}

function startLocationTracking() {
  if ("geolocation" in navigator) {
    watchID = navigator.geolocation.watchPosition(
      (position) => {
        updateUserPosition(
          position.coords.latitude,
          position.coords.longitude,
          position.coords.accuracy,
        );
      },
      (error) => {
        console.warn("Geolocation error:", error.message);
        simulateLocationTracking();
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      },
    );
  } else {
    simulateLocationTracking();
  }
}

function simulateLocationTracking() {
  const startLat = SILA_LOCATION.LAT;
  const startLng = SILA_LOCATION.LON;
  const step = 0.00005;

  setInterval(() => {
    let progress = parseInt(
      localStorage.getItem("sharedTrailProgress") || "0",
      5,
    );
    if (progress > 100) progress = 0;

    const lat = startLat + (Math.random() - 0.5) * step + progress * step * 0.1;
    const lng = startLng + (Math.random() - 0.5) * step + progress * step * 0.1;
    const accuracy = 10 + Math.random() * 20; // 10-30 meters

    updateUserPosition(lat, lng, accuracy);
    updateTrailProgress(progress);
  }, 3000);
}

function updateUserPosition(lat, lng, accuracy = 15) {
  userPosition = { lat, lng, accuracy };

  userLocationMarker.setLatLng([lat, lng]);
  accuracyCircle.setLatLng([lat, lng]);
  accuracyCircle.setRadius(accuracy);

  document.getElementById("user-lat").textContent = lat.toFixed(6);
  document.getElementById("user-lng").textContent = lng.toFixed(6);

  updateAccuracyDisplay(accuracy);

  const pathCoords = pathPolyline.getLatLngs();
  pathCoords.push([lat, lng]);
  pathPolyline.setLatLngs(pathCoords);

  if (isFollowingUser) {
    locationMap.setView([lat, lng], locationMap.getZoom());
  }

  updateNearbyPoints(lat, lng);
}

function updateAccuracyDisplay(accuracy) {
  const indicator = document.getElementById("accuracy-indicator");
  const text = document.getElementById("accuracy-text");

  if (accuracy < 10) {
    indicator.className = "accuracy-indicator accuracy-high";
    text.textContent = `Excellent (±${Math.round(accuracy)}m)`;
  } else if (accuracy < 30) {
    indicator.className = "accuracy-indicator accuracy-medium";
    text.textContent = `Good (±${Math.round(accuracy)}m)`;
  } else {
    indicator.className = "accuracy-indicator accuracy-low";
    text.textContent = `Fair (±${Math.round(accuracy)}m)`;
  }
}

function updateNearbyPoints(userLat, userLng) {
  if (!nearbyGiants || nearbyGiants.length === 0) return;

  const pointsWithDistance = nearbyGiants.map((giant) => {
    const distance = calculateDistance(userLat, userLng, giant.lat, giant.lng);
    return { ...giant, distance };
  });

  pointsWithDistance.sort((a, b) => a.distance - b.distance);

  // Show top 5 nearest
  const nearestPoints = pointsWithDistance.slice(0, 5);
  const listEl = document.getElementById("nearby-points");

  listEl.innerHTML = nearestPoints
    .map(
      (point) => `
    <li class="nearby-item" onclick="focusOnPoint(${point.lat}, ${point.lng}, '${point.name.replace(/'/g, "\\'")}')">
      <span>${point.name}</span>
      <span class="distance-badge">${formatDistance(point.distance)}</span>
    </li>
  `,
    )
    .join("");
}

function calculateDistance(lat1, lng1, lat2, lng2) {
  // Haversine formula for distance in meters
  const R = 6371000; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function formatDistance(meters) {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  } else {
    return `${(meters / 1000).toFixed(1)}km`;
  }
}

function updateTrailProgress(progress) {
  document.getElementById("trail-progress").textContent = `${progress}%`;
}

function toggleFollow() {
  isFollowingUser = !isFollowingUser;
  const btn = document.getElementById("follow-btn");

  if (isFollowingUser) {
    btn.classList.add("active");
    btn.innerHTML = "🎯 Follow Me";
    if (userPosition) {
      locationMap.setView([userPosition.lat, userPosition.lng]);
    }
  } else {
    btn.classList.remove("active");
    btn.innerHTML = "🎯 Follow Off";
  }
}

function centerOnUser() {
  if (userPosition) {
    locationMap.setView([userPosition.lat, userPosition.lng], 16);
    isFollowingUser = true;
    document.getElementById("follow-btn").classList.add("active");
  }
}

function showFullTrail() {
  const pathCoords = pathPolyline.getLatLngs();
  if (pathCoords.length > 0) {
    const bounds = L.latLngBounds(pathCoords);
    locationMap.fitBounds(bounds, { padding: [50, 50] });
    isFollowingUser = false;
    document.getElementById("follow-btn").classList.remove("active");
  }
}

function focusOnPoint(lat, lng, name) {
  locationMap.setView([lat, lng], 17);
  isFollowingUser = false;
  document.getElementById("follow-btn").classList.remove("active");

  nearbyGiants.forEach((giant) => {
    if (giant.name === name && giant.marker) {
      giant.marker.openPopup();
    }
  });
}

function shareLocation() {
  if (!userPosition) {
    alert(
      "Location not available yet. Please wait for GPS to acquire position.",
    );
    return;
  }

  const shareData = {
    title: "My Location at Giganti della Sila",
    text: `I'm at ${userPosition.lat.toFixed(6)}, ${userPosition.lng.toFixed(6)}`,
    url: `https://www.openstreetmap.org/?mlat=${userPosition.lat}&mlon=${userPosition.lng}&zoom=16`,
  };

  if (navigator.share) {
    navigator
      .share(shareData)
      .catch((err) => console.log("Share failed:", err));
  } else {
    const coordText = `${userPosition.lat.toFixed(6)}, ${userPosition.lng.toFixed(6)}`;
    navigator.clipboard.writeText(coordText).then(() => {
      alert("Coordinates copied to clipboard: " + coordText);
    });
  }
}

function getCurrentTrail() {
  const savedTrailData = localStorage.getItem("recommendedTrail");
  return savedTrailData ? JSON.parse(savedTrailData) : null;
}

window.addEventListener("beforeunload", () => {
  if (watchID) {
    navigator.geolocation.clearWatch(watchID);
  }
});

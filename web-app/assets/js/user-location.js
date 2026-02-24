import { getDoc, doc, userDatabase as db } from "./auth.js";
import {
  getDocs,
  collection,
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

let customTrailPolyline;
let locationMap,
  trailPolyline,
  userMarker,
  userLocationMarker,
  accuracyCircle,
  pathPolyline;
let userPosition = null;
let isFollowingUser = true;
let watchID = null;
let nearbyGiants = [];
const trail = null;

window.addEventListener("beforeunload", () => {
  if (watchID) {
    navigator.geolocation.clearWatch(watchID);
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  const locUserLat = SILA_LOCATION.LAT;
  const locUserLng = SILA_LOCATION.LON;
  locationMap = L.map("location-map").setView([locUserLat, locUserLng], 15);

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(locationMap);

  userLocationMarker = L.marker([locUserLat, locUserLng]).addTo(locationMap);
  accuracyCircle = L.circle([locUserLat, locUserLng], {
    radius: 15,
    color: "#3388ff",
    fillOpacity: 0.2,
  }).addTo(locationMap);

  trail = await getCurrentTrail();
  if (trail && trail.coords) {
    renderTrailFromCoords(trail.coords);
    if (trail.name) {
      document.getElementById("current-trail").textContent = trail.name;
    } else {
      document.getElementById("current-trail").textContent = "Unknown";
    }
  } else {
    document.getElementById("current-trail").textContent = "Not found";
  }

  loadTrailInfo();
  loadNearbyPoints();

  startLocationTracking();
});

const trailId = localStorage.getItem("selectedTrailId");
if (trailId) renderTrail(trailId);
//renderUserPosition();

function centerOnUser() {
  if (userPosition) {
    locationMap.setView([userPosition.lat, userPosition.lng], 16);
    isFollowingUser = true;
    document.getElementById("follow-btn").classList.add("active");
  }
}

function renderTrailFromCoords(coords, color = "orange") {
  if (!Array.isArray(coords) || coords.length === 0) {
    alert("No coordinates provided for trail.");
    return;
  }
  const latlngs = coords
    .map((pt) => {
      if (pt && typeof pt.lat === "number" && typeof pt.lng === "number") {
        return [pt.lat, pt.lng];
      } else if (
        pt &&
        typeof pt.latitude === "number" &&
        typeof pt.longitude === "number"
      ) {
        return [pt.latitude, pt.longitude];
      } else {
        return null;
      }
    })
    .filter(Boolean);
  if (latlngs.length === 0) {
    alert("No valid coordinates found in array.");
    return;
  }
  // Add marker for starting position
  if (window.trailStartMarker) {
    locationMap.removeLayer(window.trailStartMarker);
  }
  const startLatLng = latlngs[0];
  window.trailStartMarker = L.marker(startLatLng, {
    icon: L.icon({
      iconUrl: "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
    }),
  })
    .addTo(locationMap)
    .bindPopup("Trail Start");

  if (customTrailPolyline) locationMap.removeLayer(customTrailPolyline);
  customTrailPolyline = L.polyline(latlngs, {
    color,
    weight: 7,
    opacity: 0.95,
  }).addTo(locationMap);
  locationMap.fitBounds(customTrailPolyline.getBounds());
}

async function moveToTrailStart() {
  const trailId = localStorage.getItem("selectedTrailId");
  if (!trailId) {
    alert("No trail selected.");
    return;
  }
  const trailDoc = await getDoc(doc(trailDatabase, "trails", trailId));
  if (trailDoc.exists()) {
    let coords = trailDoc.data().coords;
    if (Array.isArray(coords) && coords.length > 0) {
      let first = coords[0];
      let lat, lng;
      if (
        first &&
        typeof first.lat === "number" &&
        typeof first.lng === "number"
      ) {
        lat = first.lat;
        lng = first.lng;
      } else if (
        first &&
        typeof first.latitude === "number" &&
        typeof first.longitude === "number"
      ) {
        lat = first.latitude;
        lng = first.longitude;
      } else {
        alert("Invalid coordinate format in trail start.");
        return;
      }
      updateUserPosition(lat, lng, 10);
      locationMap.setView([lat, lng], 17);
    } else {
      alert("Trail has no coordinates.");
    }
  } else {
    alert("Trail not found in database.");
  }
}

function renderUserPosition() {
  if (!navigator.geolocation) return;
  navigator.geolocation.watchPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      if (userMarker) {
        userMarker.setLatLng([latitude, longitude]);
      } else {
        userMarker = L.marker([latitude, longitude])
          .addTo(locationMap)
          .bindPopup("You are here")
          .openPopup();
      }
    },
    (err) => console.error("Geolocation error:", err),
    { enableHighAccuracy: true },
  );
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
      10,
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

async function getCurrentTrail() {
  const trailId = localStorage.getItem("selectedTrailId");
  if (!trailId) return null;
  try {
    const trailDoc = await getDoc(doc(db, "trails", trailId));
    if (trailDoc.exists()) {
      return trailDoc.data();
    }
    return null;
  } catch (error) {
    console.error("Error fetching current trail from Firebase:", error);
    return null;
  }
}

// Zoom to trail start on load

window.enlargeTrail = enlargeTrail;
window.setLocationToTrailStart = setLocationToTrailStart;
window.moveToTrailStart = moveToTrailStart;
window.toggleFollow = toggleFollow;
window.centerOnUser = centerOnUser;
window.showFullTrail = showFullTrail;
window.shareLocation = shareLocation;
window.renderTrailFromCoords = renderTrailFromCoords;

import { API } from "./utils/constants.js";
import { createBaseMap, createMarker, createAccuracyCircle } from "./utils/mapsUtils.js";
import {
  getDocs,
  collection,
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

let customTrailPolyline;
let locationMap, userLocationMarker, accuracyCircle;
let isFollowingUser = true;
let watchID = null;
let nearbyGiants = [];
let trail;
let userPosition = null; // { lat, lng, accuracy }

document.addEventListener("DOMContentLoaded", async () => {
  const mapContainer = document.getElementById("location-map");
  if (mapContainer) {
    mapContainer.style.position = "relative";
    const loadingDiv = document.createElement("div");
    loadingDiv.id = "map-loading-message";
    loadingDiv.style.position = "absolute";
    loadingDiv.style.top = "50%";
    loadingDiv.style.left = "50%";
    loadingDiv.style.transform = "translate(-50%, -50%)";
    loadingDiv.style.background = "rgba(255,255,255,0.9)";
    loadingDiv.style.padding = "16px 32px";
    loadingDiv.style.borderRadius = "8px";
    loadingDiv.style.fontSize = "1.2em";
    loadingDiv.style.zIndex = "1000";
    loadingDiv.textContent = "Loading map...";
    mapContainer.appendChild(loadingDiv);
  }
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        document.getElementById("map-loading-message")?.remove();
           userPosition = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };

        document.getElementById("user-lat").textContent = userPosition.lat.toFixed(2);
        document.getElementById("user-lng").textContent = userPosition.lng.toFixed(2);

        locationMap = createBaseMap(
          "location-map",
          [userPosition.lat, userPosition.lng],
          15
        );

        const blueDotIconUrl = "https://maps.google.com/mapfiles/ms/icons/blue-dot.png";
        userLocationMarker = createMarker(locationMap, userPosition.lat, userPosition.lng, blueDotIconUrl);

        accuracyCircle = createAccuracyCircle(locationMap, userPosition.lat, userPosition.lng, userPosition.accuracy, "#0066cc");
    

        trail = await getCurrentTrail();
        if (trail && trail.coords) {
          renderTrailFromCoords(trail.coords);
          document.getElementById("current-trail").textContent = trail.name || "Not Found";
            setShowFullTrailButtonState(true);

        } else {
          document.getElementById("current-trail").textContent = "No Current Trail.. Choose one to use this feature!";
          setShowFullTrailButtonState(false);
        }

        loadNearbyPoints();
        updateTrailProgress(progress)
        startLocationTracking();
      },
      (error) => {
        document.getElementById("map-loading-message")?.remove();
        console.warn("Geolocation error:", error.message);
        setShowFullTrailButtonState(false);
        if (error.code === 1) { // PERMISSION_DENIED
          showGPSModal();
        }
      },
      { enableHighAccuracy: true }
    );
  } else {
    setShowFullTrailButtonState(false);
    showGPSModal();
  }
});

window.addEventListener("beforeunload", () => {
  if (watchID) {
    navigator.geolocation.clearWatch(watchID);
  }
});

function showGPSModal() {
  const modal = document.createElement("div");
  modal.id = "gps-modal";
  modal.style.position = "fixed";
  modal.style.top = "0";
  modal.style.left = "0";
  modal.style.width = "100vw";
  modal.style.height = "100vh";
  modal.style.background = "rgba(0,0,0,0.5)";
  modal.style.display = "flex";
  modal.style.justifyContent = "center";
  modal.style.alignItems = "center";
  modal.style.zIndex = "9999";

  modal.innerHTML = `
    <div style="background: #fff; padding: 32px; border-radius: 12px; box-shadow: 0 2px 16px rgba(0,0,0,0.2); text-align: center; max-width: 350px;">
      <h2>Enable GPS</h2>
      <p>This feature requires access to your device's location. Please turn on GPS/location services to continue.</p>
      <button id="gps-enable-btn" style="margin: 12px 8px 0 0; padding: 8px 16px; background: #4CAF50; color: #fff; border: none; border-radius: 6px; cursor: pointer;">Enable GPS</button>
      <button id="gps-cancel-btn" style="margin: 12px 0 0 8px; padding: 8px 16px; background: #ccc; color: #333; border: none; border-radius: 6px; cursor: pointer;">Cancel</button>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById("gps-enable-btn").onclick = () => {
    document.body.removeChild(modal);
    location.reload();
  };
  document.getElementById("gps-cancel-btn").onclick = () => {
    document.body.removeChild(modal);
  };
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
  if (!locationMap) return;

  if (!trail || !trail.coords || trail.coords.length < 2) {
    setShowFullTrailButtonState(false);
    return;
  }

  renderTrailFromCoords(trail.coords);

  if (customTrailPolyline) {
    const bounds = customTrailPolyline.getBounds();
    if (bounds.isValid()) {
      locationMap.fitBounds(bounds, { padding: [30, 30] });
    }
  }

  isFollowingUser = false;
  const btn = document.getElementById("follow-btn");
  if (btn) {
    btn.classList.remove("active");
    btn.innerHTML = "🎯 Follow Off";
  }
}

function setShowFullTrailButtonState(isActive) {
  const btn = document.getElementById("show-full-trail-btn");
  if (!btn) return;

  btn.disabled = !isActive;
  btn.classList.toggle("inactive", !isActive);
  btn.setAttribute("aria-disabled", String(!isActive));
}


function renderTrailFromCoords(coords, color = "red") {
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
  const startTrailIconUrl = "https://maps.google.com/mapfiles/ms/icons/green-dot.png";  
  const startLatLng = latlngs[0];
  window.trailStartMarker = createMarker(locationMap, startLatLng[0], startLatLng[1], startTrailIconUrl)
    .bindPopup("Trail Start");

    const endLatLng = latlngs[latlngs.length - 1];
    window.trailEndMarker = createMarker(locationMap, endLatLng[0], endLatLng[1], "https://maps.google.com/mapfiles/ms/icons/flag.png")
    .bindPopup("Trail End");
    
  if (customTrailPolyline) locationMap.removeLayer(customTrailPolyline);
  customTrailPolyline = L.polyline(latlngs, {
    color,
    weight: 7,
    opacity: 0.95,
  }).addTo(locationMap);
  locationMap.fitBounds(customTrailPolyline.getBounds());
}


function parseCoordinate(value) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return NaN;

  const v = value.trim().toUpperCase();
  const num = parseFloat(v.replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(num)) return NaN;

  if (v.includes("S") || v.includes("W")) return -Math.abs(num);
  return num;
}

function normalizePointLocation(rawLocation) {
  // Expected format: ["39.373° N", "16.036° E"]
  if (Array.isArray(rawLocation) && rawLocation.length >= 2) {
    const lat = parseCoordinate(rawLocation[0]);
    const lng = parseCoordinate(rawLocation[1]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }

  if (rawLocation && typeof rawLocation === "object") {
    const lat = parseCoordinate(rawLocation.lat);
    const lng = parseCoordinate(rawLocation.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }

  return null;
}

async function loadNearbyPoints() {
  try {
    const listEl = document.getElementById("nearby-points");
    if (listEl) listEl.innerHTML = `<li class="nearby-item"><span>Loading nearby giants...</span></li>`;

    // 1) Load giants from Firestore
    const snap = await getDocs(collection(db, "giants"));
    const loadedGiants = snap.docs
      .map((docSnap) => {
        const data = docSnap.data();
        const pos = normalizePointLocation(data.location);
        if (!pos) return null;

        return {
          id: docSnap.id,
          name: data.name || "Unnamed giant",
          description: data.description || data.desc || "",
          lat: pos.lat,
          lng: pos.lng,
          marker: null,
        };
      })
      .filter(Boolean);

    // 2) Remove old markers (if reloading)
    nearbyGiants.forEach((g) => {
      if (g.marker && locationMap?.hasLayer(g.marker)) {
        locationMap.removeLayer(g.marker);
      }
    });

    nearbyGiants = loadedGiants;

    // 3) Render markers on map
    nearbyGiants.forEach((giant) => {
      const giantIcon = L.divIcon({
        html: `<div style="font-size: 50px;">🌲</div>`,
        className: "",
        iconSize: [24, 24],
        iconAnchor: [12, 24],
      });

      giant.marker = L.marker([giant.lat, giant.lng], { icon: giantIcon })
        .addTo(locationMap)
        .bindPopup(`<strong>${giant.name}</strong><br>${giant.description}`);
    });

    // 4) Render panel list + distance using existing calculation helpers
    if (!listEl) return;

    if (!nearbyGiants.length) {
      listEl.innerHTML = `<li class="nearby-item"><span>No nearby giants found.</span></li>`;
      return;
    }

    const sorted = [...nearbyGiants].map((g) => {
      let distance = null;
      if (userPosition) {
        distance = calculateDistance(userPosition.lat, userPosition.lng, g.lat, g.lng);
      }
      return { ...g, distance };
    });

    sorted.sort((a, b) => {
      if (a.distance == null) return 1;
      if (b.distance == null) return -1;
      return a.distance - b.distance;
    });

    listEl.innerHTML = sorted
      .map((g) => {
        const distanceText = g.distance != null ? formatDistance(g.distance) : "--";
        return `
          <li class="nearby-item" onclick="focusOnPoint(${g.lat}, ${g.lng}, '${String(g.name).replace(/'/g, "\\'")}')">
            <div>
              <strong>${g.name}</strong><br>
              <small>${g.description}</small>
            </div>
            <span>${distanceText}</span>
          </li>
        `;
      })
      .join("");

    // Keep your existing behavior too
    if (userPosition) {
      updateNearbyPoints(userPosition.lat, userPosition.lng);
    }
  } catch (error) {
    console.error("Error loading nearby points:", error);
    const listEl = document.getElementById("nearby-points");
    if (listEl) {
      listEl.innerHTML = `<li class="nearby-item"><span>Error loading nearby giants.</span></li>`;
    }
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
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      },
    );
  } else {
    alert("Geolocation is not supported by this browser.");}
}

function updateUserPosition(lat, lng, accuracy = 15) {

  document.getElementById("user-lat").textContent = lat.toFixed(6);
  document.getElementById("user-lng").textContent = lng.toFixed(6);

  updateAccuracyDisplay(accuracy);
  userLocationMarker.setLatLng([lat, lng]);
  
  accuracyCircle.setLatLng([lat, lng]);
  accuracyCircle.setRadius(accuracy);

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

window.toggleFollow = toggleFollow;
window.centerOnUser = centerOnUser;
window.showFullTrail = showFullTrail;
window.shareLocation = shareLocation;
window.renderTrailFromCoords = renderTrailFromCoords;
window.updateTrailProgress = updateTrailProgress; 

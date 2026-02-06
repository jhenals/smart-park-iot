window.onload = function () {
  const chosenTrail =
    localStorage.getItem("recommendedTrail") || "General Loop";
  const user = localStorage.getItem("username") || "Visitor";

  // Update UI elements
  document.getElementById("active-trail").innerText = chosenTrail;
  document.getElementById("display-username").innerText = user;

  // Trigger specific logic based on the trail
  updateTrailMap(chosenTrail);
  checkWeatherSafety();
};

function updateTrailMap(trailName) {
  console.log(`Rendering GPS path for: ${trailName}`);
  // Here you would load specific GeoJSON coordinates for the chosen trail
}

function checkWeatherSafety() {
  // Mocking a safety override
  const isRaining = false;
  const banner = document.getElementById("weather-alert");

  if (isRaining) {
    banner.className = "alert-banner danger";
    banner.innerText =
      "⚠️ SAFETY ALERT: Rain detected. Please stay on the main path.";
  } else {
    banner.className = "alert-banner safe";
    banner.innerText = "🌤️ Weather is clear. Enjoy your hike!";
  }
}

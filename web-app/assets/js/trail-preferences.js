function initializePreferences() {
  populateSelect("difficulty", TRAIL_PREFERENCES.difficulty);
  populateSelect("environment", TRAIL_PREFERENCES.environment);
  populateSelect("interest", TRAIL_PREFERENCES.interest);
}

function populateSelect(elementId, options) {
  const selectElement = document.getElementById(elementId);
  if (!selectElement) return;

  selectElement.innerHTML = "";

  options.forEach((option) => {
    const optionElement = document.createElement("option");
    optionElement.value = option.value;
    optionElement.textContent = option.label;
    optionElement.title = option.description;
    selectElement.appendChild(optionElement);
  });
}

function generateMockRecommendation() {
  const difficulty = document.getElementById("difficulty").value;
  const env = document.getElementById("environment").value;
  const interest = document.getElementById("interest").value;

  const key = `${difficulty}_${env}_${interest}`;
  const trailKey = TRAIL_RECOMMENDATIONS[key];
  const trail = TRAILS[trailKey] || TRAILS.mainParkLoop;

  localStorage.setItem("recommendedTrail", JSON.stringify(trail));

  displayTrailRecommendation(trail);
}

function displayTrailRecommendation(trail) {
  const resultDiv = document.getElementById("recommendation-result");
  const trailNameEl = document.getElementById("trail-name");
  const trailDetailsEl = document.getElementById("trail-details");

  trailNameEl.innerText = trail.name;

  // Build detailed trail information
  const detailsHTML = `
    <p class="trail-description">${trail.description}</p>
    <div class="trail-stats">
      <span><strong>Distance:</strong> ${trail.distance}</span>
      <span><strong>Duration:</strong> ${trail.duration}</span>
      <span><strong>Elevation:</strong> ${trail.elevation}</span>
    </div>
    <div class="trail-features">
      <strong>Features:</strong>
      <ul>
        ${trail.features.map((feature) => `<li>${feature}</li>`).join("")}
      </ul>
    </div>
  `;

  if (trailDetailsEl) {
    trailDetailsEl.innerHTML = detailsHTML;
  }

  resultDiv.style.display = "block";
}

function goToHomepage() {
  window.location.href = "/web-app/src/user/user-dashboard.html";
}

if (typeof TRAIL_PREFERENCES !== "undefined") {
  initializePreferences();
} else {
  console.error(
    "TRAIL_PREFERENCES not loaded. Make sure constants.js is included.",
  );
}

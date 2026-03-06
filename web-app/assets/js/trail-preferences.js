import { getSession } from "./utils/auth.js";
import { goToHomepage, carouselImages } from "./utils/utils.js";
import {TRAIL_PREFERENCES} from "./utils/constants.js";
import { firestoreDatabase } from "../../../firebase-config/firebase.js";
import {
  setDoc,
  doc,
  addDoc,
  collection,
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

const session = getSession();
const userId = session && session.uid ? session.uid : null;
const displayName = session.displayName || "Explorer";
document.getElementById("welcome-message").innerText = displayName;

const preferencesState = {
  noise: null,
  slope: null,
  vibe: null,
  width: null,
};

const images = [
  "../../public/images/trail-pref-images/1.jpg",
  "../../public/images/trail-pref-images/2.jpg",
  "../../public/images/trail-pref-images/3.jpg",
  "../../public/images/trail-pref-images/4.jpg",
  "../../public/images/trail-pref-images/5.jpg",
];

let currentRecommendation = null;
let allRecommendations = [];

function goToUserDashboard() {
  const selectedTrailId = localStorage.getItem("selectedTrailId");
  
  if (selectedTrailId) {
    goToHomepage();
  }else{
    const modal = document.createElement("div");
    modal.id = "confirmModal";
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    `;
    
    modal.innerHTML = `
      <div class="glass-card" style="padding: 2rem; text-align: center; max-width: 400px;">
        <h3>No Trail Selected</h3>
        <p>Do you want to continue to the dashboard without choosing a recommendation?</p>
        <div style="display: flex; gap: 1rem; margin-top: 1.5rem; justify-content: center;">
          <button id="confirmYes" class="main-button" style="flex: 1;">Yes</button>
          <button id="confirmNo" class="main-button" style="flex: 1; background-color: #666;">No</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById("confirmYes").onclick = () => {
      modal.remove();
      goToHomepage();
    };
    
    document.getElementById("confirmNo").onclick = () => {
      modal.remove();
    };
  }
}
window.goToUserDashboard = goToUserDashboard;


function initializePreferences() {
  if (typeof TRAIL_PREFERENCES !== "undefined") {
    populateModalOptions("noise", TRAIL_PREFERENCES.noise);
    populateModalOptions("slope", TRAIL_PREFERENCES.slope);
    populateModalOptions("vibe", TRAIL_PREFERENCES.vibe);
    populateModalOptions("width", TRAIL_PREFERENCES.width);
  }
  loadSavedPreferences();
  setInterval(() => carouselImages(".image-container", images), 3000); // Change every 3 seconds
  carouselImages(".image-container", images);
}

function loadSavedPreferences() {
  try {
    if (!userId) return null;
    const cachedPrefs = localStorage.getItem(`userPrefs_${userId}`);
    if (cachedPrefs) {
      const savedPrefs = JSON.parse(cachedPrefs);
      Object.assign(preferencesState, savedPrefs);
      updatePreferencesDisplay(savedPrefs);
      return savedPrefs;
    }
    return null;
  } catch (error) {
    return null;
  }
}

function updatePreferencesDisplay(savedPrefs) {
  ["noise", "slope", "vibe", "width"].forEach((key) => {
    const displayElement = document.getElementById(`${key}-display`);
    if (displayElement && savedPrefs[key]) {
      displayElement.textContent = savedPrefs[key];
    }
  });
  const allSelected = Object.values(preferencesState).every(
    (val) => val !== null,
  );
  if (allSelected) {
    const recommendButton = document.getElementById("recommendButton");
    if (recommendButton) recommendButton.style.display = "block";
  }
}

const modalFlow = {
  currentStep: 0,
  categories: ["noise", "slope", "width", "vibe"],
};

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = "none";
    document.body.style.overflow = "auto";
  }
}

window.openModal = openModal;
window.closeModal = closeModal;

function populateModalOptions(category, options) {
  const optionsContainer = document.getElementById(`${category}Options`);
  if (!optionsContainer) return;

  optionsContainer.innerHTML = "";

  options.forEach((option) => {
    const optionCard = document.createElement("div");
    optionCard.className = "option-card";

    if (preferencesState[category] === option.value) {
      optionCard.classList.add("selected");
    }

    optionCard.innerHTML = `
      <div class="option-label">${option.label}</div>
      <div class="option-description">${option.description || ""}</div>
    `;
    optionCard.onclick = (e) => {
      e.stopPropagation();
      selectPreference(category, option.value, option.label);
    };
    optionsContainer.appendChild(optionCard);
  });
}

function startPreferenceFlow(startCategory = "noise") {
  const startIndex = modalFlow.categories.indexOf(startCategory);
  if (startIndex === -1) {
    console.error(`Invalid category: ${startCategory}`);
    return;
  }

  modalFlow.currentStep = startIndex;

  const allSelected = modalFlow.categories.every(
    (cat) => preferencesState[cat] !== null,
  );

  if (allSelected) {
    const recommendButton = document.getElementById("recommendButton");
    if (recommendButton) {
      recommendButton.style.display = "block";
    }
  } else {
    setTimeout(() => {
      openModal(`${startCategory}Modal`);
    }, 200);
  }
}

function selectPreference(category, value, label) {
  preferencesState[category] = value;
  const displayElement = document.getElementById(`${category}-display`);
  if (displayElement) {
    displayElement.textContent = label;
  }
  updateSelectedState(category, label);
  closeModal(`${category}Modal`);
  modalFlow.currentStep++;
  const allSelected = modalFlow.categories.every(
    (cat) =>
      preferencesState[cat] !== null &&
      preferencesState[cat] !== undefined &&
      preferencesState[cat] !== "",
  );
  if (allSelected) {
    savePreferencesToFirebase(preferencesState).then(() => {
      localStorage.setItem("userPreferences", JSON.stringify(preferencesState));
      const recommendButton = document.getElementById("recommendButton");
      if (recommendButton) recommendButton.style.display = "block";
    });
  } else {
    const nextCategory =
      modalFlow.categories[modalFlow.currentStep % modalFlow.categories.length];
    setTimeout(() => {
      openModal(`${nextCategory}Modal`);
    }, 300);
  }
}

function updateSelectedState(category, selectedValue) {
  const optionsContainer = document.getElementById(`${category}Options`);
  if (!optionsContainer) return;

  const cards = optionsContainer.querySelectorAll(".option-card");
  cards.forEach((card, index) => {
    const options =
      category === "noise"
        ? TRAIL_PREFERENCES.noise
        : category === "slope"
          ? TRAIL_PREFERENCES.slope
          : category === "vibe"
            ? TRAIL_PREFERENCES.vibe
            : TRAIL_PREFERENCES.width;

    if (options[index].value === selectedValue) {
      card.classList.add("selected");
    } else {
      card.classList.remove("selected");
    }
  });
}

function resetPreferences() {
  preferencesState.noise = null;
  preferencesState.slope = null;
  preferencesState.vibe = null;
  preferencesState.width = null;

  localStorage.removeItem("selectedTrailId");
  console.log("🗑️ Cleared localStorage: selectedTrailId");

  document.getElementById("noise-display").textContent = "Select";
  document.getElementById("slope-display").textContent = "Select";
  document.getElementById("vibe-display").textContent = "Select";
  document.getElementById("width-display").textContent = "Select";

  modalFlow.currentStep = 0;

  modalFlow.categories.forEach((category) => {
    closeModal(`${category}Modal`);
  });

  const recommendButton = document.getElementById("recommendButton");
  if (recommendButton) {
    recommendButton.style.display = "none";
  }

  const wrapper = document.getElementById("recommendation-wrapper");
  if (wrapper) {
    wrapper.style.display = "none";
  }

  modalFlow.categories.forEach((category) => {
    const optionsContainer = document.getElementById(`${category}Options`);
    if (optionsContainer) {
      const cards = optionsContainer.querySelectorAll(".option-card");
      cards.forEach((card) => {
        card.classList.remove("selected");
      });
    }
  });

  allRecommendations = [];
  currentRecommendation = {
    trail: null,
    score: null,
    reason: null,
    whyRecommended: null,
  };

  console.log("Preferences reset");
}

async function savePreferencesToFirebase(preferences) {
  try {
    if (!userId) return;
    const userPrefsRef = doc(firestoreDatabase, "user_prefs", userId);
    await setDoc(userPrefsRef, {
      userId: userId,
      noise_prefs: preferences.noise,
      slope_prefs: preferences.slope,
      width_prefs: preferences.width,
      vibe_prefs: preferences.vibe,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    console.log("✅ Preferences saved to Firebase");
  } catch (error) {
    console.error("Error saving preferences to Firebase:", error);
  }
}

async function getRecommendation() {
  try {
    const allSelected = Object.values(preferencesState).every(
      (val) => val !== null,
    );
    if (!allSelected) {
      alert("Please select all preferences before getting a recommendation.");
      return;
    }

    const resultSection = document.getElementById("recommendation-wrapper");
    resultSection.innerHTML = `
      <div class="glass-card" style="padding: 2rem; text-align: center;">
        <div class="loading-spinner"></div>
        <h3>🤖 Loading Recommendations...</h3>
        <p>Fetching your trail matches...</p>
      </div>
    `;
    resultSection.style.display = "block";

    const response = await fetch("http://localhost:3100/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    const data = await response.json();

    if (!data.recommendations || data.recommendations.length === 0) {
      resultSection.innerHTML = `
        <div class="glass-card" style="padding: 2rem; text-align: center;">
          <h3>😕 No Recommendations Found</h3>
          <p>We couldn't find trails matching your preferences.</p>
          <button onclick="location.reload()" class="main-button" style="margin-top: 1rem;">
            Start Over
          </button>
        </div>
      `;
      return;
    }

    allRecommendations = await Promise.all(
      data.recommendations.map(async (rec) => {
        const trailId = rec.trail_id || rec.id || rec.trailId;
        const trail = trailId ? await fetchTrailFromFirebase(trailId) : null;
        return {
          trail: trail
            ? trail
            : {
                id: trailId,
                name: rec.name || `Trail ${trailId}`,
                noise: preferencesState.noise,
                slope: preferencesState.slope,
                width: preferencesState.width,
                tags: preferencesState.vibe,
              },
          score: rec.score,
          whyRecommended: rec.matched_reasons || [],
          algorithm: "generate_recom",
        };
      }),
    );

    console.log(
      "Received recommendations from server:",
      JSON.stringify(allRecommendations, null, 2),
    );
    displayAllRecommendations(allRecommendations);

    async function fetchTrailFromFirebase(trailId) {
      try {
        const { getDoc, doc } =
          await import("https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js");
        const trailDoc = await getDoc(doc(firestoreDatabase, "trails", trailId));
        if (trailDoc.exists()) {
          return { id: trailDoc.id, ...trailDoc.data() };
        }
        return null;
      } catch (e) {
        console.warn("Could not fetch trail from Firebase", e);
        return null;
      }
    }
  } catch (error) {
    const resultSection = document.getElementById("recommendation-wrapper");
    resultSection.innerHTML = `
      <div class="glass-card" style="padding: 2rem; text-align: center; border-left: 4px solid #ff6b6b;">
        <h3>❌ Error</h3>
        <p>${error.message || "Failed to load recommendations"}</p>
        <button onclick="getRecommendation()" class="main-button" style="margin-top: 1rem;">
          Try Again
        </button>
      </div>
    `;
    resultSection.style.display = "block";
  }
}

function selectRecommendation(index) {
  if (allRecommendations && allRecommendations[index]) {
    currentRecommendation = allRecommendations[index];

    localStorage.setItem("selectedTrailId", currentRecommendation.trail.id);
    console.log(
      "💾 Trail ID saved to localStorage:",
      currentRecommendation.trail.id,
    );

    displayTrailRecommendation(currentRecommendation);
  }
}

async function displayAllRecommendations(recommendations) {
  const resultSection = document.getElementById("recommendation-wrapper");

  if (!resultSection || !recommendations || recommendations.length === 0) {
    console.error("Cannot display recommendations");
    return;
  }

  console.log(
    `📌 displayAllRecommendations called with ${recommendations.length} items`,
  );
  recommendations.forEach((rec, idx) => {
    console.log(
      `  [${idx + 1}] ${rec.trail?.name || "Unknown"} - ${rec.score}%`,
    );
  });

  allRecommendations = recommendations;

  let recommendationsHTML = `
    <div class="recommendation-list-container">
      <div class="recommendation-list-header">
        <h2>🎯 Recommended Trails</h2>
        <p>Click any trail to see more details</p>
      </div>
      
      <div class="recommendations-grid">
  `;

  recommendations.forEach((rec, index) => {
    const { trail, score, whyRecommended } = rec;

    const noise = Array.isArray(trail.noise) ? trail.noise[0] : trail.noise;
    const slope = Array.isArray(trail.slope) ? trail.slope[0] : trail.slope;
    const width = Array.isArray(trail.width) ? trail.width[0] : trail.width;
    const tags = Array.isArray(trail.tags) ? trail.tags.join(", ") : trail.tags;

    console.log(`🎨 Rendering card ${index + 1}: ${trail.name}`);

    recommendationsHTML += `
      <div class="recommendation-card" onclick="selectRecommendation(${index})">
        <div class="recommendation-rank">#${index + 1}</div>
        <div class="match-score">${score}% Match</div>
        
        <h3>${trail.name}</h3>
        
        <div class="trail-details-compact">
          <div class="detail">🔊 ${noise}</div>
          <div class="detail">⛰️ ${slope}</div>
          <div class="detail">↔️ ${width}</div>
          <div class="detail">✨ ${tags}</div>
        </div>
        
        <div class="why-recommended-compact">
          <strong>Why:</strong>
          <ul>
            ${whyRecommended.map((reason) => `<li>${reason}</li>`).join("")}
          </ul>
        </div>
      </div>
    `;
  });

  recommendationsHTML += `
      </div>
      
      <div class="action-button">
        <button onclick="resetPreferences()" class="btn-secondary">
          Try Again
        </button>
      </div>
    </div>
  `;

  resultSection.innerHTML = recommendationsHTML;
  resultSection.style.display = "block";
  resultSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

async function displayTrailRecommendation(recommendation) {
  const resultSection = document.getElementById("recommendation-wrapper");

  if (!resultSection || !recommendation) {
    console.error("Cannot display recommendation");
    return;
  }

  let { userId, trail, score, whyRecommended } = recommendation;

  if (
    trail &&
    (!trail.name || !trail.noise || !trail.slope || !trail.width || !trail.tags)
  ) {
    const fetchedTrail = await fetchTrailFromFirebase(
      trail.id || trail.trailId || trail.trail_id,
    );
    if (fetchedTrail) {
      trail = fetchedTrail;
    }
  }

  const noise = Array.isArray(trail.noise) ? trail.noise[0] : trail.noise;
  const slope = Array.isArray(trail.slope) ? trail.slope[0] : trail.slope;
  const width = Array.isArray(trail.width) ? trail.width[0] : trail.width;
  const tags = Array.isArray(trail.tags) ? trail.tags.join(", ") : trail.tags;

  resultSection.innerHTML = `
    <div class="recommendation-card">
      <div class="recommendation-header">
        <h2>🎯 Your Trail Recommendation</h2>
        <div class="match-score">${score}% Match</div>
      </div>

      <div class= "d-flex">

      <div class="trail-info">
        <h3 class="text-center">${trail.name}</h3>
        <p class="recommendation-reason text-center">This trail has been selected for you based on availability.</p>
      
        <div class="trail-details">
          <div class="detail-item">
            <span class="detail-label">🔊 Noise Level:</span>
            <span class="detail-value">${noise}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">⛰️ Slope:</span>
            <span class="detail-value">${slope}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">↔️ Width:</span>
            <span class="detail-value">${width}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">✨ Vibe:</span>
            <span class="detail-value">${tags}</span>
          </div>
        </div>
        <div class="why-recommended">
          <h4>Why This Trail?</h4>
          <ul>
            ${whyRecommended.map((reason) => `<li>${reason}</li>`).join("")}
          </ul>
        </div>
      </div>


        <div id="trail-image-wrap" class="recommendation-image">
          <img
            id="trail-image"
            src="../../public/images/discover-giganti.jpg"
            data-placeholder-src="../../public/images/discover-giganti.jpg"
            alt="Recommended trail"
            />
          </div>
      </div>
            
      <div class="action-buttons">
        <button onclick="savePreferencesAndRecommendation()" class="main-button start-hiking-button">
          Start Hiking
        </button>
        <button onclick="displayAllRecommendations(allRecommendations)" class="main-button back-to-recommendations-button">
          Back to Recommendations
        </button>
        <button onclick="resetPreferences()" class="main-button reset-button">
          Try Again
        </button>
      </div>
    </div>
  `;

  resultSection.style.display = "block";
  resultSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

async function savePreferencesAndRecommendation() {
  try {
    if (!userId || !currentRecommendation || !currentRecommendation.trail) {
      alert("No trail selected or user not authenticated.");
      return;
    }
    await addDoc(collection(firestoreDatabase, "user_trail_selections"), {
      userId: userId,
      trailId: currentRecommendation.trail.id,
      trailName: currentRecommendation.trail.name,
      score: currentRecommendation.score,
      whyRecommended: currentRecommendation.whyRecommended || [],
      algorithm: currentRecommendation.algorithm || "generate_recom",
      selectedAt: new Date().toISOString(),
      createdAt: Date.now(),
    });
    // Store trail info in localStorage for dashboard access
    localStorage.setItem(
      "recommendedTrail",
      JSON.stringify(currentRecommendation.trail),
    );
    alert("Your trail selection has been saved! Redirecting to dashboard...");
    setTimeout(() => {
      window.location.href = `${userPrefix}/src/user/user-dashboard.html?userId=${userId}`;
    }, 1000);
  } catch (error) {
    console.error("Error saving trail selection:", error);
    alert("Failed to save. Please try again.");
  }
}

window.getRecommendation = getRecommendation;
window.resetPreferences = resetPreferences;
window.savePreferencesAndRecommendation = savePreferencesAndRecommendation;
window.displayAllRecommendations = displayAllRecommendations;
window.selectRecommendation = selectRecommendation;
window.displayTrailRecommendation = displayTrailRecommendation;
window.loadSavedPreferences = loadSavedPreferences;
window.updatePreferencesDisplay = updatePreferencesDisplay;
Object.defineProperty(window, "allRecommendations", {
  get() {
    return allRecommendations;
  },
});

initializePreferences();

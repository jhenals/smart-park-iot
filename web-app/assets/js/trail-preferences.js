import { getUserProfile, getSession } from "./auth.js";
import { userDatabase } from "../../../firebase-config/firebase.js";
import {
  setDoc,
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

const user = await getUserProfile(getSession().uid);
const displayName = user && user.displayName ? user.displayName : "Visitor";
document.getElementById("welcome-message").innerText = displayName;

const preferencesState = {
  noise: null,
  slope: null,
  vibe: null,
  width: null,
};

let currentRecommendation = {
  trail: null,
  score: null,
};

function initializePreferences() {
  // Populate modal options
  populateModalOptions("noise", TRAIL_PREFERENCES.noise);
  populateModalOptions("slope", TRAIL_PREFERENCES.slope);
  populateModalOptions("vibe", TRAIL_PREFERENCES.vibe);
  populateModalOptions("width", TRAIL_PREFERENCES.width);

  loadSavedPreferences();
}

async function loadSavedPreferences() {
  try {
    const session = getSession();
    const userId = session.uid;

    const userPrefsRef = doc(userDatabase, "user_prefs", userId);
    const userPrefsDoc = await getDoc(userPrefsRef);

    if (userPrefsDoc.exists()) {
      const savedPrefs = userPrefsDoc.data();

      // Update state and display
      if (savedPrefs.noise_prefs) {
        preferencesState.noise = savedPrefs.noise_prefs;
        const noiseOption = TRAIL_PREFERENCES.noise.find(
          (opt) => opt.value === savedPrefs.noise_prefs,
        );
        if (noiseOption) {
          document.getElementById("noise-display").textContent =
            noiseOption.label;
          updateSelectedState("noise", savedPrefs.noise_prefs);
        }
      }
      if (savedPrefs.slope_prefs) {
        preferencesState.slope = savedPrefs.slope_prefs;
        const slopeOption = TRAIL_PREFERENCES.slope.find(
          (opt) => opt.value === savedPrefs.slope_prefs,
        );
        if (slopeOption) {
          document.getElementById("slope-display").textContent =
            slopeOption.label;
          updateSelectedState("slope", savedPrefs.slope_prefs);
        }
      }
      if (savedPrefs.vibe_prefs) {
        preferencesState.vibe = savedPrefs.vibe_prefs;
        const vibeOption = TRAIL_PREFERENCES.vibe.find(
          (opt) => opt.value === savedPrefs.vibe_prefs,
        );
        if (vibeOption) {
          document.getElementById("vibe-display").textContent =
            vibeOption.label;
          updateSelectedState("vibe", savedPrefs.vibe_prefs);
        }
      }
      if (savedPrefs.width_prefs) {
        preferencesState.width = savedPrefs.width_prefs;
        const widthOption = TRAIL_PREFERENCES.width.find(
          (opt) => opt.value === savedPrefs.width_prefs,
        );
        if (widthOption) {
          document.getElementById("width-display").textContent =
            widthOption.label;
          updateSelectedState("width", savedPrefs.width_prefs);
        }
      }

      console.log("Loaded saved preferences:", savedPrefs);
      return savedPrefs;
    } else {
      console.log("No saved preferences found");
      return null;
    }
  } catch (error) {
    console.error("Error loading saved preferences:", error);
    return null;
  }
}

const modalFlow = {
  currentStep: 0,
  categories: ["noise", "slope", "width", "vibe"],
};

function openModal(modalId) {
  console.log(`openModal called with: ${modalId}`);
  const modal = document.getElementById(modalId);
  if (modal) {
    console.log(`Modal found: ${modalId}, setting display to flex`);
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
  } else {
    console.error(`Modal not found: ${modalId}`);
  }
}

function closeModal(modalId) {
  console.log(`closeModal called with: ${modalId}`);
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = "none";
    document.body.style.overflow = "auto";
  }
}

function populateModalOptions(category, options) {
  const optionsContainer = document.getElementById(`${category}Options`);
  if (!optionsContainer) return;

  optionsContainer.innerHTML = "";

  options.forEach((option) => {
    const optionCard = document.createElement("div");
    optionCard.className = "option-card";

    // Add selected class if this option is already selected
    if (preferencesState[category] === option.value) {
      optionCard.classList.add("selected");
    }

    optionCard.innerHTML = `
      <div class="option-label">${option.label}</div>
      <div class="option-description">${option.description || ""}</div>
    `;
    optionCard.onclick = (e) => {
      e.stopPropagation(); // Prevent event bubbling to modal overlay
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

  // Set modal flow to start from the clicked category
  modalFlow.currentStep = startIndex;

  // Check if all preferences are already loaded
  const allSelected = modalFlow.categories.every(
    (cat) => preferencesState[cat] !== null,
  );

  if (allSelected) {
    // All preferences already selected, show recommend button
    const recommendButton = document.getElementById("recommendButton");
    if (recommendButton) {
      recommendButton.style.display = "block";
    }
  } else {
    // Open the clicked category's modal
    setTimeout(() => {
      openModal(`${startCategory}Modal`);
    }, 200);
  }
}

function selectPreference(category, value, label) {
  console.log(
    `selectPreference called: category=${category}, value=${value}, label=${label}`,
  );

  preferencesState[category] = value;
  const displayElement = document.getElementById(`${category}-display`);
  if (displayElement) {
    displayElement.textContent = label;
  }

  updateSelectedState(category, label);

  closeModal(`${category}Modal`);

  modalFlow.currentStep++;

  const allSelected = modalFlow.categories.every(
    (cat) => preferencesState[cat] !== null,
  );

  console.log(
    `All selected: ${allSelected}, current step: ${modalFlow.currentStep}`,
  );

  if (allSelected) {
    console.log("All preferences selected, showing recommend button");
    const recommendButton = document.getElementById("recommendButton");
    if (recommendButton) {
      recommendButton.style.display = "block";
    }
  } else {
    // Show next modal in circular flow
    const nextCategory =
      modalFlow.categories[modalFlow.currentStep % modalFlow.categories.length];
    console.log(`Opening next modal: ${nextCategory}Modal`);
    setTimeout(() => {
      openModal(`${nextCategory}Modal`);
    }, 300); // Small delay for smooth transition
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

  localStorage.removeItem("recommendedTrail");

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

  console.log(
    "Preferences reset and localStorage cleared and Firebase deleted",
  );
}

//TODO: Put this in Passport
async function deleteUserPreferencesInFirebase() {
  try {
    const session = getSession();
    const userId = session.uid;
    const userPrefsRef = doc(userDatabase, "user_prefs", userId);
    await setDoc(userPrefsRef, {});
    console.log("User preferences deleted from Firebase");
    return true;
  } catch (error) {
    console.error("Error deleting user preferences:", error);
    return false;
  }
}

async function saveUserPreferences(preferences) {
  try {
    const session = getSession();
    const userId = session.uid;

    const userPrefsData = {
      userId: userId,
      noise_prefs: preferences.noise,
      slope_prefs: preferences.slope,
      vibe_prefs: preferences.vibe,
      width_prefs: preferences.width,
      timestamp: new Date().toISOString(),
    };

    const userPrefsRef = doc(userDatabase, "user_prefs", userId);
    await setDoc(userPrefsRef, userPrefsData);
    console.log("User preferences saved successfully:", userPrefsData);
    return true;
  } catch (error) {
    console.error("Error saving user preferences:", error);
    alert("Failed to save preferences. Please try again.");
    return false;
  }
}

function normalizeFirebaseTrail(trailDoc) {
  const data = trailDoc.data();
  const distance = data.distance?.value
    ? `${data.distance.value} ${data.distance.unit || ""}`.trim()
    : data.distance || "N/A";
  const duration = data.duration?.value
    ? `${data.duration.value} ${data.duration.unit || ""}`.trim()
    : data.duration || "N/A";
  const elevation = data.elevationGain
    ? `${data.elevationGain} m`
    : data.elevation || "N/A";

  return {
    id: trailDoc.id,
    name: data.title || data.name || trailDoc.id,
    description: data.description || "A trail matched to your preferences.",
    distance: distance,
    duration: duration,
    elevation: elevation,
    features: Array.isArray(data.features) ? data.features : [],
    tags: Array.isArray(data.tags) ? data.tags : data.tags ? [data.tags] : [],
    imageUrl: data.imageUrl || data.image_url || "",
    source: "firebase",
  };
}

async function getFirebaseTrailMatch(preferences) {
  try {
    const trailsRef = collection(userDatabase, "trails");
    const baseFilters = [
      where("noise", "==", preferences.noise),
      where("slope", "==", preferences.slope),
      where("width", "==", preferences.width),
    ];

    // Prefer array-contains when tags is an array.
    let trailsQuery = query(
      trailsRef,
      ...baseFilters,
      where("tags", "array-contains", preferences.vibe),
    );
    let trailsSnapshot = await getDocs(trailsQuery);

    // Fallback when tags is stored as a string.
    if (trailsSnapshot.empty) {
      trailsQuery = query(
        trailsRef,
        ...baseFilters,
        where("tags", "==", preferences.vibe),
      );
      trailsSnapshot = await getDocs(trailsQuery);
    }

    if (trailsSnapshot.empty) {
      return null;
    }

    const trailDoc = trailsSnapshot.docs[0];
    return normalizeFirebaseTrail(trailDoc);
  } catch (error) {
    console.error("Error fetching trail from Firebase:", error);
    return null;
  }
}

async function verifyTrailExists(trailId) {
  try {
    const trailRef = doc(userDatabase, "trails", trailId);
    const trailDoc = await getDoc(trailRef);

    if (trailDoc.exists()) {
      console.log("Trail found in Firebase:", trailDoc.data());
      return trailDoc.data();
    } else {
      console.log("Trail not found in Firebase:", trailId);
      return null;
    }
  } catch (error) {
    console.error("Error verifying trail in Firebase:", error);
    return null;
  }
}

async function saveRecommendation(trailId, score) {
  try {
    const session = getSession();
    const userId = session.uid;

    const recommendationData = {
      user_id: userId,
      trail_id: trailId,
      score: score,
      timestamp: new Date().toISOString(),
      preferences: {
        noise: preferencesState.noise,
        slope: preferencesState.slope,
        vibe: preferencesState.vibe,
        width: preferencesState.width,
      },
    };

    const recommendationsRef = collection(userDatabase, "recommendations");
    const docRef = await addDoc(recommendationsRef, recommendationData);

    console.log(
      "Recommendation saved successfully:",
      docRef.id,
      recommendationData,
    );
    return true;
  } catch (error) {
    console.error("Error saving recommendation:", error);
    return false;
  }
}

async function saveAndRecommend() {
  // Validate that all preferences are selected
  if (
    !preferencesState.noise ||
    !preferencesState.slope ||
    !preferencesState.vibe ||
    !preferencesState.width
  ) {
    alert("Please select all preferences before getting a recommendation.");
    return;
  }

  // Save user preferences to Firebase
  const preferences = {
    noise: preferencesState.noise,
    slope: preferencesState.slope,
    vibe: preferencesState.vibe,
    width: preferencesState.width,
  };

  const saved = await saveUserPreferences(preferences);

  if (saved) {
    // Show success message briefly
    const indicator = document.getElementById("saved-prefs-indicator");
    if (indicator) {
      indicator.textContent = "✓ Preferences saved successfully!";
      indicator.style.display = "block";
      setTimeout(() => {
        indicator.style.opacity = "0";
        indicator.style.transition = "opacity 1s";
        setTimeout(() => {
          indicator.style.display = "none";
          indicator.style.opacity = "1";
          indicator.textContent = "✓ Your saved preferences have been loaded";
        }, 1000);
      }, 2000);
    }

    // Generate recommendation based on preferences
    generateMockRecommendation(preferences);
  }
}

async function generateMockRecommendation(preferences) {
  // Map new preferences to old trail system (temporary until ML model is ready)
  let difficulty = "moderate";
  let environment = "quiet";
  let interest = "botany";

  // Map slope to difficulty
  if (preferences.slope === "flat" || preferences.slope === "gentle") {
    difficulty = "easy";
  } else if (preferences.slope === "steep") {
    difficulty = "hard";
  }

  // Map noise to environment
  if (preferences.noise === "quiet") {
    environment = "quiet";
  } else {
    environment = "bright";
  }

  // Map vibe to interest (simplified)
  if (preferences.vibe && preferences.vibe.includes("Clear")) {
    interest = "history";
  }

  const key = `${difficulty}_${environment}_${interest}`;
  const trailKey = TRAIL_RECOMMENDATIONS[key];
  let trail = TRAILS[trailKey] || TRAILS.mainParkLoop;

  // Try to match a trail from Firebase based on the preference schema.
  const firebaseTrail = await getFirebaseTrailMatch(preferences);
  if (firebaseTrail) {
    trail = firebaseTrail;
  }

  // Calculate recommendation score (0-100) based on preference matching
  let score = 75; // Base score
  if (trail.difficulty === difficulty) score += 10;
  if (trail.environment === environment) score += 10;
  if (trail.interest === interest) score += 5;

  // Add user preferences to the trail object for display
  trail.userPreferences = {
    noise: preferences.noise,
    slope: preferences.slope,
    vibe: preferences.vibe,
    width: preferences.width,
  };

  // Store the recommendation to be saved when user clicks "Start Hiking"
  currentRecommendation.trail = trail;
  currentRecommendation.score = score;

  localStorage.setItem("recommendedTrail", JSON.stringify(trail));

  displayTrailRecommendation(trail);
}

function displayTrailRecommendation(trail) {
  const wrapper = document.getElementById("recommendation-wrapper");
  const resultDiv = document.getElementById("recommendation-result");
  const trailNameEl = document.getElementById("trail-name");
  const trailDetailsEl = document.getElementById("trail-details");
  const imageWrap = document.getElementById("trail-image-wrap");
  const imageEl = document.getElementById("trail-image");

  trailNameEl.innerText = trail.name;

  if (imageWrap && imageEl) {
    const placeholderSrc = imageEl.getAttribute("data-placeholder-src") || "";
    const resolvedSrc = trail.imageUrl || placeholderSrc;

    if (resolvedSrc) {
      imageEl.src = resolvedSrc;
      imageEl.alt = trail.imageUrl
        ? `${trail.name} trail`
        : "Recommended trail";
      imageWrap.style.display = "flex";
    } else {
      imageWrap.style.display = "none";
      imageEl.src = "";
      imageEl.alt = "Recommended trail";
    }
  }

  // Build detailed trail information with user preferences
  let preferencesHTML = "";
  if (trail.userPreferences) {
    // Helper function to get label from preference value
    const getLabel = (category, value) => {
      const option = TRAIL_PREFERENCES[category]?.find(
        (opt) => opt.value === value,
      );
      return option?.label || value;
    };

    preferencesHTML = `
      <div class="user-preferences" style="margin-bottom: 20px; padding: 15px; background: rgba(255, 255, 255, 0.1); border-radius: 8px;">
        <h4 style="margin-top: 0;">Your Preferences:</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <span><strong>Noise:</strong> ${getLabel("noise", trail.userPreferences.noise)}</span>
          <span><strong>Slope:</strong> ${getLabel("slope", trail.userPreferences.slope)}</span>
          <span><strong>Vibe:</strong> ${getLabel("vibe", trail.userPreferences.vibe)}</span>
          <span><strong>Width:</strong> ${getLabel("width", trail.userPreferences.width)}</span>
        </div>
      </div>
    `;
  }

  const tagsHTML =
    trail.tags && trail.tags.length
      ? `<div class="trail-features"><strong>Tags:</strong> ${trail.tags.join(", ")}</div>`
      : "";
  const featuresHTML =
    trail.features && trail.features.length
      ? `<div class="trail-features">
        <strong>Features:</strong>
        <ul>
          ${trail.features.map((feature) => `<li>${feature}</li>`).join("")}
        </ul>
      </div>`
      : "";

  const detailsHTML = `
    ${preferencesHTML}
    <p class="trail-description">${trail.description}</p>
    <div class="trail-stats">
      <span><strong>Distance:</strong> ${trail.distance}</span>
      <span><strong>Duration:</strong> ${trail.duration}</span>
      <span><strong>Elevation:</strong> ${trail.elevation}</span>
    </div>
    ${tagsHTML}
    ${featuresHTML}
  `;

  if (trailDetailsEl) {
    trailDetailsEl.innerHTML = detailsHTML;
  }

  if (wrapper) {
    wrapper.style.display = "flex";
  }
  resultDiv.style.display = "block";
}

async function goToHomepage() {
  // Save the recommendation if one has been generated
  if (currentRecommendation.trail && currentRecommendation.score !== null) {
    try {
      // Verify trail exists in Firebase and save recommendation
      const trailInFirebase =
        currentRecommendation.trail.source === "firebase"
          ? currentRecommendation.trail
          : await verifyTrailExists(currentRecommendation.trail.id);

      if (trailInFirebase) {
        console.log("Trail verified in Firebase, saving recommendation...");
        await saveRecommendation(
          currentRecommendation.trail.id,
          currentRecommendation.score,
        );
        console.log("Recommendation saved successfully");
      } else {
        console.warn("Trail not found in Firebase. Recommendation not saved.");
      }
    } catch (error) {
      console.error("Error saving recommendation:", error);
    }
  }

  // Navigate to user dashboard
  window.location.href = "/web-app/src/user/user-dashboard.html";
}

// Make functions available globally for inline onclick handlers
window.saveAndRecommend = saveAndRecommend;
window.generateMockRecommendation = generateMockRecommendation;
window.goToHomepage = goToHomepage;
window.loadSavedPreferences = loadSavedPreferences;
window.openModal = openModal;
window.closeModal = closeModal;
window.selectPreference = selectPreference;
window.startPreferenceFlow = startPreferenceFlow;
window.resetPreferences = resetPreferences;
window.selectPreference = selectPreference;
window.startPreferenceFlow = startPreferenceFlow;

if (typeof TRAIL_PREFERENCES !== "undefined") {
  initializePreferences();
} else {
  console.error(
    "TRAIL_PREFERENCES not loaded. Make sure constants.js is included.",
  );
}

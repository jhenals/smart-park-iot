import { getUserProfile, getSession } from "./auth.js";
import { userDatabase } from "../../../firebase-config/firebase.js";
import {
  setDoc,
  doc,
  getDoc,
  collection,
  where,
  getDocs,
  addDoc,
  query,
  orderBy,
  limit,
  updateDoc,
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
  reason: null,
  whyRecommended: null,
};

function initializePreferences() {
  populateModalOptions("noise", TRAIL_PREFERENCES.noise);
  populateModalOptions("slope", TRAIL_PREFERENCES.slope);
  populateModalOptions("vibe", TRAIL_PREFERENCES.vibe);
  populateModalOptions("width", TRAIL_PREFERENCES.width);

  loadSavedPreferences();
}

function loadSavedPreferences() {
  try {
    const session = getSession();

    // Check if session exists and is valid
    if (!session || !session.uid) {
      console.log("No valid session found");
      return null;
    }

    const userId = session.uid;

    const cachedPrefs = localStorage.getItem(`userPrefs_${userId}`);
    if (cachedPrefs) {
      console.log("Loading preferences from localStorage");
      const savedPrefs = JSON.parse(cachedPrefs);
      updatePreferencesDisplay(savedPrefs);
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

function updatePreferencesDisplay(savedPrefs) {
  const preferenceFields = [
    {
      key: "noise_prefs",
      state: "noise",
      display: "noise-display",
      options: TRAIL_PREFERENCES.noise,
    },
    {
      key: "slope_prefs",
      state: "slope",
      display: "slope-display",
      options: TRAIL_PREFERENCES.slope,
    },
    {
      key: "vibe_prefs",
      state: "vibe",
      display: "vibe-display",
      options: TRAIL_PREFERENCES.vibe,
    },
    {
      key: "width_prefs",
      state: "width",
      display: "width-display",
      options: TRAIL_PREFERENCES.width,
    },
  ];

  preferenceFields.forEach((field) => {
    if (savedPrefs[field.key]) {
      preferencesState[field.state] = savedPrefs[field.key];
      const option = field.options.find(
        (opt) => opt.value === savedPrefs[field.key],
      );

      if (option) {
        const displayElement = document.getElementById(field.display);
        if (displayElement) {
          displayElement.textContent = option.label;
        }
        updateSelectedState(field.state, savedPrefs[field.key]);
      }
    }
  });

  // Show recommend button if all preferences are loaded
  const allSelected = Object.values(preferencesState).every(
    (val) => val !== null,
  );
  if (allSelected) {
    const recommendButton = document.getElementById("recommendButton");
    if (recommendButton) {
      recommendButton.style.display = "block";
    }
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
    localStorage.setItem("userPreferences", JSON.stringify(preferencesState));
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

async function getRecommendation() {
  try {
    // Validate that all preferences are selected
    const allSelected = Object.values(preferencesState).every(
      (val) => val !== null,
    );

    if (!allSelected) {
      alert("Please select all preferences before getting a recommendation.");
      return;
    }

    console.log("Getting recommendation with preferences:", preferencesState);

    // Build preferences object
    const preferences = {
      noise: preferencesState.noise,
      slope: preferencesState.slope,
      vibe: preferencesState.vibe,
      width: preferencesState.width,
    };

    // Generate recommendation (replace with actual AI call later)
    const recommendation = await generateMockRecommendation(preferences);
    console.log("Recommendation received:", recommendation);

    if (recommendation) {
      currentRecommendation = recommendation;
      displayTrailRecommendation(currentRecommendation);
    } else {
      alert("Could not generate a recommendation. Please try again.");
    }
  } catch (error) {
    console.error("Error getting recommendation:", error);
    alert("Failed to get recommendation. Please try again.");
  }
}

// TODO: To change with ML model integration, this is just a mock function to simulate recommendation logic
async function getFirebaseTrailMatch(preferences) {
  try {
    console.log("Getting random trail recommendation from Firebase");

    // Fetch all trails from Firebase
    const trailsRef = collection(userDatabase, "trails");
    const querySnapshot = await getDocs(trailsRef);

    if (querySnapshot.empty) {
      console.log("No trails available in database");
      alert("No trails found in database.");
      return null;
    }

    // Convert to array
    const trails = [];
    querySnapshot.forEach((doc) => {
      trails.push({ id: doc.id, ...doc.data() });
    });

    console.log("Trails found in database:", trails.length);
    console.log("All trails:", trails);

    if (trails.length === 0) {
      console.error("No trails in array");
      return null;
    }

    // Randomly select a trail
    const randomIndex = Math.floor(Math.random() * trails.length);
    const selectedTrail = trails[randomIndex]; // Remove .data - just use the trail object

    console.log("Random index:", randomIndex);
    console.log("Randomly selected trail:", selectedTrail);

    if (!selectedTrail) {
      console.error("Selected trail is undefined at index:", randomIndex);
      return null;
    }

    return {
      userId: user.uid,
      trail: selectedTrail,
      score: 100,
      whyRecommended: ["Available trail in the park", "Ready for your visit"],
    };
  } catch (error) {
    console.error("Error getting trail from Firebase:", error);
    throw error;
  }
}

async function generateMockRecommendation(preferences) {
  try {
    console.log("Generating recommendation");
    const recommendation = await getFirebaseTrailMatch(preferences);

    if (recommendation) {
      return recommendation;
    } else {
      alert("No trails available. Please try again later.");
      return null;
    }
  } catch (error) {
    console.error("Error generating recommendation:", error);
    alert("Failed to generate recommendation. Please try again.");
    return null;
  }
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

async function saveUserPreferencesInFirebase(preferences) {
  try {
    const session = getSession();
    const userId = session.uid;

    const docRef = await addDoc(collection(userDatabase, "user_pref"), {
      id: null, // Will be updated with the auto-generated ID
      userId: userId,
      ...preferences,
      createdAt: Date.now(),
    });

    // Update the document with its own ID
    await updateDoc(doc(userDatabase, "user_pref", docRef.id), {
      id: docRef.id,
    });

    console.log("Preferences saved with ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error saving user preferences:", error);
    alert("Failed to save preferences. Please try again.");
    return false;
  }
}

async function saveUserRecommendationInFirebase(userPrefId, recommendations) {
  try {
    const docRef = await addDoc(collection(userDatabase, "recommendations"), {
      id: null, // Will be updated with the auto-generated ID
      userId: user.uid,
      userPrefId: userPrefId, // Reference to the user preference document
      recommendedTrails: recommendations,
      createdAt: Date.now(),
    });

    console.log("Recommendations saved with ID:", docRef.id);
    localStorage.setItem("recommendation", JSON.stringify(recommendations));
    return docRef.id;
  } catch (error) {
    console.error("Error saving recommendations:", error);
    throw error;
  }
}

async function savePreferencesAndRecommendation() {
  try {
    const preferences = {
      noise: preferencesState.noise,
      slope: preferencesState.slope,
      vibe: preferencesState.vibe,
      width: preferencesState.width,
    };
    let userPrefId = await saveUserPreferencesInFirebase(preferences);
    let trailRecId = await saveUserRecommendationInFirebase(
      userPrefId,
      currentRecommendation,
    );
    if (userPrefId && trailRecId) {
      window.location.href = `http://localhost:5500/web-app/src/user/user-dashboard.html?userId=${user.uid}`;
    }
  } catch (error) {
    console.error("Error saving preferences and recommendation:", error);
  }
}

// Update displayTrailRecommendation to fetch the full trail data
async function displayTrailRecommendation(recommendation) {
  const resultSection = document.getElementById("recommendation-wrapper");

  if (!resultSection || !recommendation) {
    console.error("Cannot display recommendation");
    return;
  }

  const { userId, trail, score, whyRecommended } = recommendation;

  // Handle array values from Firebase
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
        <button onclick="savePreferencesAndRecommendation()" class="btn-primary">
          Start Hiking
        </button>
        <button onclick="resetPreferences()" class="btn-secondary">
          Try Again
        </button>
      </div>
    </div>
  `;

  resultSection.style.display = "block";
  resultSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
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
window.generateMockRecommendation = generateMockRecommendation;
window.getRecommendation = getRecommendation;
window.goToHomepage = goToHomepage;
window.loadSavedPreferences = loadSavedPreferences;
window.openModal = openModal;
window.closeModal = closeModal;
window.selectPreference = selectPreference;
window.startPreferenceFlow = startPreferenceFlow;
window.resetPreferences = resetPreferences;
window.selectPreference = selectPreference;
window.startPreferenceFlow = startPreferenceFlow;
window.savePreferencesAndRecommendation = savePreferencesAndRecommendation;
window.deleteUserPreferencesInFirebase = deleteUserPreferencesInFirebase;

if (typeof TRAIL_PREFERENCES !== "undefined") {
  initializePreferences();
} else {
  console.error(
    "TRAIL_PREFERENCES not loaded. Make sure constants.js is included.",
  );
}

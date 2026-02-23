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

let allRecommendations = []; // Store all recommendations for selection

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
    const nextCategory =
      modalFlow.categories[modalFlow.currentStep % modalFlow.categories.length];
    console.log(`Opening next modal: ${nextCategory}Modal`);
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
  // Reset state
  preferencesState.noise = null;
  preferencesState.slope = null;
  preferencesState.vibe = null;
  preferencesState.width = null;

  // Clear localStorage (only trail selection)
  localStorage.removeItem("selectedTrailId");
  console.log("🗑️ Cleared localStorage: selectedTrailId");

  // Reset display
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

  // Reset recommendations
  allRecommendations = [];
  currentRecommendation = {
    trail: null,
    score: null,
    reason: null,
    whyRecommended: null,
  };

  console.log("Preferences reset");
}

async function getRecommendation() {
  try {
    // Validate all preferences are selected
    const allSelected = Object.values(preferencesState).every(
      (val) => val !== null,
    );

    if (!allSelected) {
      alert("Please select all preferences before getting a recommendation.");
      return;
    }

    console.log("💾 Saving preferences...");

    // 1. Save preferences to Firebase
    await savePreferencesDirectlyToFirebase(preferencesState);

    // 2. Show loading state
    const resultSection = document.getElementById("recommendation-wrapper");
    resultSection.innerHTML = `
      <div class="glass-card" style="padding: 2rem; text-align: center;">
        <div class="loading-spinner"></div>
        <h3>🤖 Loading Recommendations...</h3>
        <p>Fetching your trail matches...</p>
      </div>
    `;
    resultSection.style.display = "block";

    console.log("🚀 Fetching recommendations from Firestore...");

    // 3. Fetch recommendations directly from Firestore
    const session = getSession();
    const userId = session.uid;

    // Fetch recommendation batches for this user (no orderBy needed - will sort in code)
    const recommendationsQuery = query(
      collection(userDatabase, "recommendations"),
      where("userId", "==", userId),
    );

    const snapshot = await getDocs(recommendationsQuery);

    if (snapshot.empty) {
      throw new Error(
        "No recommendations found. Please run: node generate_recom.js <userId>",
      );
    }

    // Get the latest batch (sort by generatedAt in code)
    const allBatches = snapshot.docs.map((doc) => doc.data());
    allBatches.sort(
      (a, b) =>
        new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime(),
    );
    const resultDoc = allBatches[0]; // Latest batch

    console.log("📋 Result Document:", resultDoc);

    const topRecommendations = resultDoc.recommendations || [];
    console.log(
      `✅ Found ${topRecommendations.length} recommendations in batch`,
    );

    // 4. Display results
    if (topRecommendations && topRecommendations.length > 0) {
      console.log(
        `📊 Processing ${topRecommendations.length} recommendations, fetching trail details...`,
      );

      // Fetch full trail data for each recommendation
      const enrichedRecommendations = await Promise.all(
        topRecommendations.map(async (rec, idx) => {
          try {
            console.log(`🔍 Fetching trail ${idx + 1}/5: ${rec.trail_id}`);
            const trailDoc = await getDoc(
              doc(userDatabase, "trails", rec.trail_id),
            );
            if (trailDoc.exists()) {
              console.log(`✅ Trail found: ${rec.trail_id}`);
              return {
                trail: { id: rec.trail_id, ...trailDoc.data() },
                score: rec.score,
                whyRecommended: rec.matched_reasons || [],
                algorithm: rec.algorithm || "generate_recom",
              };
            } else {
              console.warn(`⚠️ Trail document not found: ${rec.trail_id}`);
              // Return with minimal trail data
              return {
                trail: {
                  id: rec.trail_id,
                  name: `Trail ${rec.trail_id}`,
                  noise: "Unknown",
                  slope: "Unknown",
                  width: "Unknown",
                  tags: "No data",
                },
                score: rec.score,
                whyRecommended: rec.matched_reasons || [],
                algorithm: rec.algorithm || "generate_recom",
              };
            }
          } catch (error) {
            console.warn(`❌ Error fetching trail ${rec.trail_id}:`, error);
            // Return with minimal trail data on error
            return {
              trail: {
                id: rec.trail_id,
                name: `Trail ${rec.trail_id}`,
                noise: "Unknown",
                slope: "Unknown",
                width: "Unknown",
                tags: "No data",
              },
              score: rec.score,
              whyRecommended: rec.matched_reasons || [],
              algorithm: rec.algorithm || "generate_recom",
            };
          }
        }),
      );

      console.log(
        `📊 Total enriched recommendations: ${enrichedRecommendations.length}`,
      );
      enrichedRecommendations.forEach((rec, idx) => {
        console.log(`  [${idx + 1}] ${rec.trail.name} - ${rec.score}%`);
      });

      if (enrichedRecommendations.length > 0) {
        allRecommendations = enrichedRecommendations;
        displayAllRecommendations(enrichedRecommendations);
      } else {
        throw new Error("Could not load any recommendations");
      }
    } else {
      // No matches found
      resultSection.innerHTML = `
        <div class="glass-card" style="padding: 2rem; text-align: center;">
          <h3>😕 No Recommendations Found</h3>
          <p>We couldn't find trails matching your preferences.</p>
          <p style="margin-top: 1rem; color: #666;">
            Recommendations must be generated first using: <code>node generate_recom.js &lt;userId&gt;</code>
          </p>
          <button onclick="location.reload()" class="main-button" style="margin-top: 1rem;">
            Start Over
          </button>
        </div>
      `;
    }
  } catch (error) {
    console.error("❌ Error loading recommendations:", error);

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

async function savePreferencesDirectlyToFirebase(preferences) {
  try {
    const session = getSession();
    if (!session || !session.uid) {
      throw new Error("User not authenticated");
    }

    const userId = session.uid;

    // Use setDoc with userId as document ID (this REPLACES old preferences)
    const userPrefsRef = doc(userDatabase, "user_prefs", userId);

    await setDoc(userPrefsRef, {
      userId: userId,
      noise_prefs: preferences.noise,
      slope_prefs: preferences.slope,
      width_prefs: preferences.width,
      vibe_prefs: preferences.vibe,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    console.log("✅ Preferences saved to Firebase (replaced old preferences)");
    console.log("📌 User ID:", userId);
    console.log("📌 Preferences:", preferences);

    return true;
  } catch (error) {
    console.error("Error saving preferences to Firebase:", error);
    throw error;
  }
}

function selectRecommendation(index) {
  if (allRecommendations && allRecommendations[index]) {
    currentRecommendation = allRecommendations[index];

    // Save selected trail ID to localStorage (REPLACE old one)
    localStorage.setItem("selectedTrailId", currentRecommendation.trail.id);
    console.log(
      "💾 Trail ID saved to localStorage:",
      currentRecommendation.trail.id,
    );

    displayTrailRecommendation(currentRecommendation);
  }
}

async function savePreferencesAndRecommendation() {
  try {
    // Get selected trail ID from localStorage
    const selectedTrailId = localStorage.getItem("selectedTrailId");
    if (!selectedTrailId) {
      alert("No trail selected. Please choose a trail.");
      return;
    }

    if (!currentRecommendation || !currentRecommendation.trail) {
      alert("No recommendation found. Please get a recommendation first.");
      return;
    }

    console.log("💾 Saving recommendation to Firebase...");
    console.log("Selected Trail ID:", selectedTrailId);
    console.log("Current Recommendation:", currentRecommendation);

    const session = getSession();
    const userId = session.uid;

    // Save the recommendation with trail selection
    const docRef = await addDoc(
      collection(userDatabase, "user_trail_selections"),
      {
        id: null,
        userId: userId,
        trailId: currentRecommendation.trail.id,
        trailName: currentRecommendation.trail.name,
        score: currentRecommendation.score,
        whyRecommended: currentRecommendation.whyRecommended || [],
        algorithm: currentRecommendation.algorithm || "generate_recom",
        selectedAt: new Date().toISOString(),
        createdAt: Date.now(),
      },
    );

    // Update the document with its own ID
    await updateDoc(doc(userDatabase, "user_trail_selections", docRef.id), {
      id: docRef.id,
    });

    console.log("✅ Trail selection saved to Firebase with ID:", docRef.id);

    alert("Your trail selection has been saved! Redirecting to dashboard...");

    // Navigate to dashboard after successful save
    setTimeout(() => {
      window.location.href = "/web-app/src/user/user-dashboard.html";
    }, 1000);
  } catch (error) {
    console.error("Error saving trail selection:", error);
    alert("Failed to save. Please try again.");
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

  // Store recommendations for later selection
  allRecommendations = recommendations;

  let recommendationsHTML = `
    <div class="recommendations-container">
      <div class="recommendations-header">
        <h2>🎯 Recommended Trails</h2>
        <p>Click any trail to see more details</p>
      </div>
      
      <div class="recommendations-grid">
  `;

  recommendations.forEach((rec, index) => {
    const { trail, score, whyRecommended } = rec;

    // Handle array values from Firebase
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
      
      <div class="action-buttons">
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
        <button onclick="displayAllRecommendations(allRecommendations)" class="btn-secondary">
          Back to Recommendations
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
window.getRecommendation = getRecommendation;
window.goToHomepage = goToHomepage;
window.loadSavedPreferences = loadSavedPreferences;
window.openModal = openModal;
window.closeModal = closeModal;
window.selectPreference = selectPreference;
window.startPreferenceFlow = startPreferenceFlow;
window.resetPreferences = resetPreferences;
window.savePreferencesAndRecommendation = savePreferencesAndRecommendation;
window.displayAllRecommendations = displayAllRecommendations;
window.selectRecommendation = selectRecommendation;
window.displayTrailRecommendation = displayTrailRecommendation;

// Make variables available globally
Object.defineProperty(window, "allRecommendations", {
  get() {
    return allRecommendations;
  },
});

if (typeof TRAIL_PREFERENCES !== "undefined") {
  initializePreferences();
} else {
  console.error(
    "TRAIL_PREFERENCES not loaded. Make sure constants.js is included.",
  );
}

// Shared constants for Smart Park IoT application

const API = {
  FASTAPI_URL: "http://localhost:8000/api/weather/forecast/?minutes=60",
  SENSORS_DATA_PATH: "../../../database/sensor_reponse.json",
  USER_DATA_URL: "http://localhost:8000/api/users/", //TODO: change to actual endpoint when backend is ready
  USER_DATA_PATH: "../../../database/users.json",
  DASHBOARD_DATA_PATH: "../../../database/user-dashboard.json",
  GIANTS_DATA_PATH: "../../../database/giants-sila.json",
};

const PATHS = {
  FIREBASE_CONFIG_PATH: "../../../firebase-config/firebase.js",
};

//Sila Geographic coordinates
const SILA_LOCATION = {
  LAT: 39.3551, // Giganti della Sila latitude
  LON: 16.2232, // Giganti della Sila longitude
};

// Weather and Trail Condition Thresholds
const THRESHOLDS = {
  precipitation: {
    rainyIcon: 20, // % probability to show rain icon
  },
  temperature: {
    jacketRequired: 18, // °C - below this recommend jacket
  },
  humidity: {
    dampTrails: 65, // % - above this recommend waterproof boots
    highHumidity: 75, // % - trail readiness warning
    severeWarning: 85, // % - severe safety warning
  },
  light: {
    excellent: 15, // Above this is excellent visibility (for weather forecast scale)
    moderate: 3, // Between moderate and excellent is shaded
    headlampRequired: 5, // Below this recommend headlamp
    lowVisibility: 5, // Below this is low visibility warning
    clearSkies: 10, // Above this is clear skies
    deepCanopy: 2, // Between deep canopy and clear skies is deep canopy/twilight
    // Sensor scale (0-10): raw sensor readings from IoT devices
    sensor: {
      deepCanopy: 2, // 0-2: Very dark, deep forest canopy (~200-300 lux)
      moderate: 5, // 3-5: Moderate light, shaded areas (~400-600 lux)
      bright: 10, // 6-10: Bright, open areas (~700-1000 lux)
    },
  },
  pressure: {
    stableDiff: 2, // Pa - pressure change less than this is stable
    stableRange: 5, // Pa - pressure change in this range is fairly stable
    falling: -15, // Pa - pressure dropping more than this is warning
  },
  noise: [
    { value: "very_quiet", label: "Serene", max: 30 },
    { value: "comfortable", label: "Comfortable", max: 50 },
    { value: "noticeable", label: "Noticeable", max: 65 },
    { value: "noisy_disturbing", label: "Noisy/ Disturbing", max: 75 },
    { value: "harmful", label: "Harmful with long exposure", max: 100 },
  ],
};

// Trail Preferences and Options
const TRAIL_PREFERENCES = {
  noise: [
    {
      value: "very_quiet",
      label: "Very Quiet",
      description: "Peaceful and serene environment",
    },
    {
      value: "comfortable",
      label: "Comfortable",
      description: "Natural sounds and ambiance",
    },
    {
      value: "noticeable",
      label: "Noticeable",
      description: "Some noticeable sounds and activity",
    },
  ],
  slope: [
    {
      value: "steep",
      label: "Steep",
      description: "Demanding climbs and descents",
    },
    {
      value: "moderate",
      label: "Moderate",
      description: "Some challenging sections",
    },
    {
      value: "flat",
      label: "Flat",
      description: "Minimal elevation change, easy walking",
    },
  ],
  vibe: [
    {
      value: "frosty",
      label: "Frosty",
      description: "Fresh mountain air and clear skies",
    },
    {
      value: "moody",
      label: "Moody",
      description: "Fresh mountain air and clear skies",
    },
    {
      value: "brisk",
      label: "Brisk",
      description: "Fresh mountain air and clear skies",
    },
    {
      value: "serene_mild",
      label: "Serene, Mild",
      description: "Fresh mountain air and clear skies",
    },
    {
      value: "crisp_clear",
      label: "Crisp, Clear",
      description: "Fresh mountain air and clear skies",
    },
    {
      value: "sun_drenched",
      label: "Sun-Drenched",
      description: "Fresh mountain air and clear skies",
    },
  ],
  width: [
    {
      value: "narrow",
      label: "Narrow",
      description: "Intimate single-track paths",
    },
    {
      value: "moderate",
      label: "Moderate",
      description: "Standard trail width",
    },
    {
      value: "wide",
      label: "Wide",
      description: "Spacious paths, accessible",
    },
  ],
};

//TODO: Trail Database (to be replaced with ML recommendations)
const TRAILS = {
  silentGiant: {
    id: "silent_giant",
    name: "The Silent Giant Path",
    difficulty: "easy",
    environment: "quiet",
    interest: "history",
    description:
      "A peaceful walk among ancient pine giants with minimal elevation gain.",
    distance: "2.5 km",
    duration: "45 min",
    elevation: "50 m",
    features: ["Ancient Pines", "Historical Markers", "Wheelchair Accessible"],
  },
  sunlitGlade: {
    id: "sunlit_glade",
    name: "The Sunlit Glade",
    difficulty: "easy",
    environment: "bright",
    interest: "botany",
    description:
      "Open meadows with abundant wildflowers and excellent birding opportunities.",
    distance: "3 km",
    duration: "1 hour",
    elevation: "30 m",
    features: ["Wildflowers", "Bird Watching", "Photography Spots"],
  },
  ancientForest: {
    id: "ancient_forest",
    name: "Ancient Forest Loop",
    difficulty: "moderate",
    environment: "quiet",
    interest: "history",
    description:
      "Immerse yourself in old-growth forest with centuries-old trees.",
    distance: "5 km",
    duration: "2 hours",
    elevation: "150 m",
    features: ["Old Growth Forest", "Scenic Viewpoints", "Wildlife Habitat"],
  },
  deepSilaRidge: {
    id: "deep_sila_ridge",
    name: "Deep Sila Ridge",
    difficulty: "hard",
    environment: "quiet",
    interest: "botany",
    description:
      "Challenging ridge hike through dense forest with diverse ecosystems.",
    distance: "8 km",
    duration: "3.5 hours",
    elevation: "400 m",
    features: ["Panoramic Views", "Diverse Ecosystems", "Adventure Trail"],
  },
  peakOfGiants: {
    id: "peak_of_giants",
    name: "Peak of the Giants",
    difficulty: "hard",
    environment: "bright",
    interest: "history",
    description:
      "Summit hike offering breathtaking views of Sila National Park.",
    distance: "10 km",
    duration: "4 hours",
    elevation: "600 m",
    features: ["Summit Views", "Historic Sites", "Photo Opportunities"],
  },
  mainParkLoop: {
    id: "main_park_loop",
    name: "Main Park Loop",
    difficulty: "moderate",
    environment: "bright",
    interest: "botany",
    description: "The classic Sila experience with varied terrain and scenery.",
    distance: "6 km",
    duration: "2.5 hours",
    elevation: "200 m",
    features: ["Varied Terrain", "Family Friendly", "Interpretive Signs"],
  },
};

// Trail recommendation mapping
const TRAIL_RECOMMENDATIONS = {
  easy_quiet_history: "silentGiant",
  easy_quiet_botany: "silentGiant",
  easy_bright_history: "sunlitGlade",
  easy_bright_botany: "sunlitGlade",
  moderate_quiet_history: "ancientForest",
  moderate_quiet_botany: "ancientForest",
  moderate_bright_history: "mainParkLoop",
  moderate_bright_botany: "mainParkLoop",
  hard_quiet_history: "deepSilaRidge",
  hard_quiet_botany: "deepSilaRidge",
  hard_bright_history: "peakOfGiants",
  hard_bright_botany: "peakOfGiants",
};

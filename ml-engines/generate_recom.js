// Utility to ensure value is always an array
function toArray(val) {
  if (Array.isArray(val)) return val;
  if (val === undefined || val === null) return [];
  return [val];
}
const admin = require("firebase-admin");

const serviceAccount = require("./../firebase-config/iot-project-49099-firebase-adminsdk-fbsvc-9db98decb5.json");
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// Add this utility at the top (after db = admin.firestore();)
function toArray(val) {
  if (Array.isArray(val)) return val;
  if (val === undefined || val === null) return [];
  return [val];
}

async function generateTop5Recommendations(userId) {
  try {
    console.log(`Starting recommendation engine for ${userId}...`);

    // 2. Fetch the User's Preferences
    const userDoc = await db.collection("user_prefs").doc(userId).get();
    if (!userDoc.exists) {
      console.log(`Error: User ${userId} not found in user_prefs!`);
      return;
    }
    const userPrefs = userDoc.data();

    // 3. Fetch All Trails
    const trailsSnapshot = await db.collection("trails").get();
    let allTrails = [];
    trailsSnapshot.forEach((doc) => {
      allTrails.push({ trail_id: doc.id, ...doc.data() });
    });

    // 4. Calculate Match Scores for Every Trail
    let recommendations = [];

    allTrails.forEach((trail) => {
      let earnedPoints = 0;
      let totalPossiblePoints = 4; // Vibes, Slope, Width, Noise
      let matchedReasons = [];

      // Helper function to safely find overlapping items in two arrays
      const getMatches = (userArr = [], trailArr = []) =>
        toArray(userArr).filter((pref) => toArray(trailArr).includes(pref));

      // A. Score Vibes/Tags (Partial points allowed if they match some but not all)
      let vibeMatches = getMatches(userPrefs.vibe_prefs, trail.tags);
      if (
        vibeMatches.length > 0 &&
        userPrefs.vibe_prefs &&
        userPrefs.vibe_prefs.length > 0
      ) {
        earnedPoints += vibeMatches.length / userPrefs.vibe_prefs.length;
        matchedReasons.push(...vibeMatches);
      }

      // B. Score Slope
      let slopeMatches = getMatches(userPrefs.slope_prefs, trail.slope);
      if (slopeMatches.length > 0) {
        earnedPoints += 1;
        matchedReasons.push(`Slope: ${slopeMatches.join(", ")}`);
      }

      // C. Score Width
      let widthMatches = getMatches(userPrefs.width_prefs, trail.width);
      if (widthMatches.length > 0) {
        earnedPoints += 1;
        matchedReasons.push(`Width: ${widthMatches.join(", ")}`);
      }

      // D. Score Noise
      let noiseMatches = getMatches(userPrefs.noise_prefs, trail.noise);
      if (noiseMatches.length > 0) {
        earnedPoints += 1;
        matchedReasons.push(`Noise: ${noiseMatches.join(", ")}`);
      }

      // Calculate percentage
      let finalScore = (earnedPoints / totalPossiblePoints) * 100;

      // Only add to the list if the score is greater than 0%
      if (finalScore > 0) {
        recommendations.push({
          trail_id: trail.trail_id,
          score: Math.round(finalScore),
          matched_reasons: matchedReasons,
        });
      }
    });

    recommendations.sort((a, b) => b.score - a.score);
    let top5Recommendations = recommendations.slice(0, 5);

    // 5. Insert all recommendations as one array in a single document
    if (top5Recommendations.length > 0) {
      const batchId = `batch_${userId}_${Date.now()}`;
      const generatedAt = new Date().toISOString();
      const resultDocument = {
        userId: userId,
        batchId: batchId,
        generatedAt: generatedAt,
        recommendations: top5Recommendations,
      };
      await db.collection("recommendations").doc(batchId).set(resultDocument);
      console.log();
      console.log("Here are the top matches:", top5Recommendations);
      console.log(
        `Recommendations saved to Firestore with batchId: ${batchId}`,
      );
      console.log("Recommendation Documnent:", resultDocument);
      return resultDocument;
    } else {
      console.log("No trails matched this user's preferences.");
    }
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

if (require.main === module) {
  // CLI code here
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log("Usage: node generate_recom.js <userId>");
    console.log("Example: node generate_recom.js user_01");
    process.exit(1);
  }

  const userId = args[0];
  generateTop5Recommendations(userId)
    .then((result) => {
      console.log("\n📊 Results:", JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Error:", error.message);
      process.exit(1);
    });
}

module.exports = { generateTop5Recommendations };

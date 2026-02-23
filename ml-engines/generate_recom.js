const admin = require("firebase-admin");

const serviceAccount = require("./../firebase-config/iot-project-49099-firebase-adminsdk-fbsvc-9db98decb5.json");
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function generateTop5Recommendations(userId) {
  try {
    console.log(`Starting recommendation engine for ${userId}...`);

    // 2. Fetch the User's Preferences
    const userDoc = await db.collection("user_prefs").doc(userId).get();
    if (!userDoc.exists) {
      console.log(`Error: User ${userId} not found in user_prefs!`);
      return { success: false, error: "User not found" };
    }
    const userPrefs = userDoc.data();
    console.log("📋 User Preferences:", JSON.stringify(userPrefs, null, 2));

    // 3. Fetch All Trails
    const trailsSnapshot = await db.collection("trails").get();
    let allTrails = [];
    trailsSnapshot.forEach((doc) => {
      // Combine the document ID (trail_01) with its data
      allTrails.push({ trail_id: doc.id, ...doc.data() });
    });

    // 4. Calculate Match Scores for Every Trail
    let recommendations = [];

    allTrails.forEach((trail) => {
      let earnedPoints = 0;
      let totalPossiblePoints = 4; // Vibes, Slope, Width, Noise
      let matchedReasons = [];

      // Helper function to safely convert to array and find matches
      const ensureArray = (val) => {
        if (!val) return [];
        if (Array.isArray(val)) return val;
        return [val]; // Convert string to array
      };

      const getMatches = (userVal, trailVal) => {
        const userArr = ensureArray(userVal);
        const trailArr = ensureArray(trailVal);
        return userArr.filter((pref) => trailArr.includes(pref));
      };

      // A. Score Vibes/Tags (Partial points allowed if they match some but not all)
      const vibePrefs = ensureArray(userPrefs.vibe_prefs);
      let vibeMatches = getMatches(userPrefs.vibe_prefs, trail.tags);
      if (vibeMatches.length > 0 && vibePrefs.length > 0) {
        earnedPoints += vibeMatches.length / vibePrefs.length;
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
        // Normalize trail_id to string
        let normalizedTrailId = trail.trail_id;
        if (Array.isArray(normalizedTrailId)) {
          normalizedTrailId = normalizedTrailId[0]; // Take first element if array
        }
        normalizedTrailId = String(normalizedTrailId); // Ensure it's a string

        recommendations.push({
          user_id: userId,
          trail_id: normalizedTrailId,
          score: Math.round(finalScore),
          matched_reasons: matchedReasons,
        });
      }
    });

    // 5. Sort from highest score to lowest, and grab ONLY the top 5
    recommendations.sort((a, b) => b.score - a.score);
    let top5Recommendations = recommendations.slice(0, 5);

    if (top5Recommendations.length > 0) {
      const batchId = `batch_${userId}_${Date.now()}`;
      const generatedAt = new Date().toISOString();

      // Create single result document with all recommendations
      const resultDocument = {
        success: true,
        count: top5Recommendations.length,
        userId: userId,
        batchId: batchId,
        generatedAt: generatedAt,
        recommendations: top5Recommendations.map((rec, index) => ({
          ...rec,
          rank: index + 1,
        })),
        isActive: true,
      };

      // Save as single document in recommendations collection
      const batch = db.batch();
      const newRecRef = db.collection("recommendations").doc(batchId);
      batch.set(newRecRef, resultDocument);
      await batch.commit();

      console.log(
        `✅ Successfully generated ${top5Recommendations.length} recommendations for ${userId}`,
      );
      console.log(`📌 Saved as document ID: ${batchId}`);

      return resultDocument;
    } else {
      console.log("No trails matched this user's preferences.");
      return {
        success: true,
        count: 0,
        userId: userId,
        message: "No trails matched user preferences",
        recommendations: [],
      };
    }
  } catch (error) {
    console.error("An error occurred:", error);
    throw error;
  }
}

// CLI Support - Run directly with: node generate_recom.js <userId>
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

module.exports = { generateTop5Recommendations };

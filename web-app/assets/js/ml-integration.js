import { getSession } from "./auth.js";
import { userDatabase } from "../../../firebase-config/firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  query,
  where,
  limit,
  doc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

export async function getMLRecommendations(topN = 5) {
  try {
    const session = getSession();
    if (!session || !session.uid) {
      throw new Error("User not authenticated");
    }

    const userId = session.uid;
    console.log("🔍 Fetching generate_recom.js results for:", userId);

    const recsRef = collection(userDatabase, "recommendations");
    const q = query(recsRef, where("user_id", "==", userId), limit(topN));

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      throw new Error(
        `No recommendations found for user ${userId}. Run: node generate_recom.js ${userId}`,
      );
    }

    const recommendations = [];

    for (const docSnap of snapshot.docs) {
      const recData = docSnap.data();
      console.log(
        "Found recommendation:",
        recData.trail_id,
        "Score:",
        recData.score,
      );

      const trailData = await getTrailById(recData.trail_id);

      if (trailData) {
        recommendations.push({
          userId: recData.user_id,
          trail: trailData,
          score: recData.score,
          whyRecommended: recData.matched_reasons || [],
          algorithm: "generate_recom",
        });
      } else {
        console.warn(
          `⚠️ Trail data not found for ${recData.trail_id}, skipping`,
        );
      }
    }

    if (recommendations.length === 0) {
      throw new Error(
        `Trail data not found in database. Make sure trails collection is populated.`,
      );
    }

    recommendations.sort((a, b) => b.score - a.score);

    console.log(
      "✅ Got",
      recommendations.length,
      "recommendations from generate_recom.js",
    );
    return recommendations;
  } catch (error) {
    console.error("❌ Error:", error.message);
    throw error;
  }
}

async function getTrailById(trailId) {
  try {
    const trailDocRef = doc(userDatabase, "trails", trailId);
    const trailDoc = await getDoc(trailDocRef);

    if (trailDoc.exists()) {
      return { id: trailId, ...trailDoc.data() };
    }

    const trailsRef = collection(userDatabase, "trails");
    const q = query(trailsRef, where("trail_id", "==", trailId), limit(1));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      return { id: trailId, ...snapshot.docs[0].data() };
    }

    console.warn(`Trail ${trailId} not found in database`);
    return null;
  } catch (error) {
    console.error("Error fetching trail:", error);
    return null;
  }
}

export async function trackTrailVisit(trailId, metadata = {}) {
  try {
    const session = getSession();
    if (!session || !session.uid) {
      console.warn("Cannot track: user not authenticated");
      return;
    }

    const userId = session.uid;
    const interactionRef = collection(userDatabase, "user_interactions");

    await addDoc(interactionRef, {
      user_id: userId,
      trail_id: trailId,
      type: "visit",
      timestamp: serverTimestamp(),
      ...metadata,
    });

    console.log("✅ Tracked trail visit");
  } catch (error) {
    console.error("Error tracking visit:", error);
  }
}

/**
 * Track trail rating
 */
export async function trackTrailRating(trailId, rating) {
  try {
    const session = getSession();
    if (!session || !session.uid) {
      console.warn("Cannot track: user not authenticated");
      return;
    }

    await addDoc(collection(userDatabase, "user_interactions"), {
      user_id: session.uid,
      trail_id: trailId,
      type: "rating",
      rating: rating,
      timestamp: serverTimestamp(),
    });

    console.log("✅ Tracked trail rating:", rating);
  } catch (error) {
    console.error("Error tracking rating:", error);
  }
}

/**
 * Track trail favorite
 */
export async function trackTrailFavorite(trailId) {
  try {
    const session = getSession();
    if (!session || !session.uid) {
      console.warn("Cannot track: user not authenticated");
      return;
    }

    await addDoc(collection(userDatabase, "user_interactions"), {
      user_id: session.uid,
      trail_id: trailId,
      type: "favorite",
      timestamp: serverTimestamp(),
    });

    console.log("✅ Tracked trail as favorite");
  } catch (error) {
    console.error("Error tracking favorite:", error);
  }
}

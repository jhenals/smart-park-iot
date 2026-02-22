import {
  firebaseConfig,
  auth,
  userDatabase,
} from "../../../firebase-config/firebase.js";
import {
  setDoc,
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";

console.log(
  "Firebase & Auth module initialized from centralized configuration:",
  firebaseConfig.projectId,
);

const API_BASE_URL = "http://localhost:8000";

async function signUp(email, password, confirmPassword) {
  if (!email || !password || !confirmPassword) {
    alert("Please fill up all fields to continue.");
    return;
  }

  if (!email.includes("@")) {
    alert("Please enter a valid email address.");
    return;
  }

  if (password !== confirmPassword) {
    alert("Passwords do not match. Please try again.");
    return;
  }

  if (password.length < 6) {
    alert("Password must be at least 6 characters long.");
    return;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );
    const user = userCredential.user;

    const userData = {
      email: email,
      displayName:
        email.split("@")[0].charAt(0).toUpperCase() +
        email.split("@")[0].slice(1),
      role: "visitor",
      createdAt: new Date().toISOString(),
      uid: user.uid,
    };

    const userDocRef = doc(userDatabase, "users", user.uid);
    await setDoc(userDocRef, userData);

    console.log(
      "User registered and data stored in database with ID:",
      user.uid,
    );
    alert("Registration successful! You can now log in with your credentials.");
    window.location.href = "http://localhost:5500/web-app/src/login.html";
  } catch (error) {
    const errorCode = error.code;
    const errorMessage = error.message;

    // Handle specific Firebase errors
    if (errorCode === "auth/email-already-in-use") {
      alert(
        "This email is already registered. Please log in or use a different email.",
      );
    } else if (errorCode === "auth/weak-password") {
      alert("Password is too weak. Please use a stronger password.");
    } else {
      alert(`Registration failed: ${errorMessage}`);
    }

    console.error("Registration error:", errorCode, errorMessage);
  }
}

//TODO: Instead of an alert, consider using a modal or inline error message for better UX. Also, add loading indicators during async operations for improved user feedback.

async function signIn(email, password) {
  if (!email || !password) {
    alert("Please enter email and password to continue.");
    return;
  }

  if (!email.includes("@")) {
    alert("Please enter a valid email address.");
    return;
  }

  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password,
    );

    const user = userCredential.user;
    const userDocRef = doc(userDatabase, "users", user.uid);
    const userDocSnapshot = await getDoc(userDocRef);

    if (!userDocSnapshot.exists()) {
      alert("User account not found in database. Please register first.");
      console.error("No user document found for UID:", user.uid);
      window.location.href = "http://localhost:5500/web-app/src/login.html";
      return;
    }

    const userData = userDocSnapshot.data();

    // Get Firebase ID token (JWT)
    const idToken = await user.getIdToken();
    const tokenResult = await user.getIdTokenResult();
    saveSession({
      email: email,
      uid: user.uid,
      role: userData.role,
      token: idToken,
      tokenExpiration: tokenResult.expirationTime, // Firebase default duration: 1 hour
    });

if (isSessionValid()) {
  console.log("Session validation passed for role:", userData.role);
  if (userData.role === "admin") {
    console.log("Admin detected, redirecting to weather app with token");
    const encodedToken = encodeURIComponent(idToken);
    window.location.href = `http://localhost:5173/admin?token=${encodedToken}`;
  } else {
    console.log("Login successful for user:", user.uid, userData.role);
    window.location.href =
       `http://localhost:5500/web-app/src/user/trail-preferences.html?userId=${user.uid}`;
  }
} else {
  console.error("Session validation failed");
  alert("Error: Session could not be saved. Please try again.");
  console.error("Session validation failed after save");
}
  } catch (error) {
    const errorCode = error.code;
    const errorMessage = error.message;

    if (errorCode === "auth/invalid-login-credentials") {
      alert(
        "Email or password is incorrect. Please try again.\nIf you don't have an account, please register first.",
      );
    } else {
      alert(`Login failed: ${errorMessage}`);
    }
    console.error("Login error:", errorCode, errorMessage);
  }
}

export async function getUserProfile(uid) {
  try {
    const cached = localStorage.getItem(`userProfile_${uid}`);
    const cacheTime = localStorage.getItem(`userProfile_${uid}_time`);
    const oneHour = 60 * 60 * 1000;

    if (cached && cacheTime && Date.now() - parseInt(cacheTime) < oneHour) {
      return JSON.parse(cached);
    }

    const userDocRef = doc(userDatabase, "users", uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();
      localStorage.setItem(`userProfile_${uid}`, JSON.stringify(userData));
      localStorage.setItem(`userProfile_${uid}_time`, Date.now().toString());
      return userData;
    }
  } catch (error) {
    console.error("Error fetching user profile:", error);
  }
  return null;
}

function getSession() {
  const session = localStorage.getItem("userSession");
  return session ? JSON.parse(session) : null;
}

function setLoggedInFlags(value) {
  localStorage.setItem("isLoggedIn", value ? "true" : "false");
}

function saveSession({ email, uid, role, token, tokenExpiration }) {
  const sessionData = {
    email: email,
    uid: uid,
    role: role,
    token: token,
    tokenExpiration: tokenExpiration,
    lastLogin: new Date().toISOString(),
    isActive: true,
  };

  localStorage.setItem("userSession", JSON.stringify(sessionData));
  localStorage.setItem("sessionSavedAt", new Date().toISOString());
  localStorage.setItem("accessToken", token);
  localStorage.setItem("tokenType", "Bearer");
  localStorage.setItem("userUid", uid);
  setLoggedInFlags(true);
  return sessionData;
}

function isSessionValid() {
  const session = getSession();
  if (!session) return false;
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const hasToken = !!localStorage.getItem("accessToken");
  return !!(session.isActive && isLoggedIn && hasToken);
}

function restoreSession() {
  if (isSessionValid()) {
    const session = getSession();
    //console.log("Session restored from localStorage:", session);
    return session;
  }
  return null;
}

function logout() {
  localStorage.clear();
  console.log("All local storage cleared");

  auth
    .signOut()
    .then(() => {
      console.log("User signed out from Firebase");
      window.location.href = "http://localhost:5500/web-app/src/login.html";
    })
    .catch((error) => {
      console.error("Error signing out:", error);
      window.location.href = "http://localhost:5500/web-app/src/login.html";
    });
}

/**
 * Listen for logout messages from other ports (e.g., port 5173)
 */
window.addEventListener("message", (event) => {
  // Accept messages from both localhost and localhost:5173
  if (event.data && event.data.type === "LOGOUT_FROM_5173") {
    console.log("Received logout signal from port 5173");
    localStorage.clear();
    console.log("Local storage cleared from cross-port logout");
  }
});

// Expose functions to global scope for inline onclick handlers
window.signIn = signIn;
window.signUp = signUp;
window.getUserProfile = getUserProfile;
window.logout = logout;
window.getSession = getSession;
window.isSessionValid = isSessionValid;
window.restoreSession = restoreSession;

// Initialize session on page load
document.addEventListener("DOMContentLoaded", function () {
  const session = restoreSession();
  if (session) {
    console.log("Session restored on page load:", session);
    // You can use the session data here if needed
  }
});

// Export Firebase instances and functions for use in other modules
export {
  auth,
  userDatabase,
  firebaseConfig,
  signIn,
  signUp,
  logout,
  getSession,
  isSessionValid,
  restoreSession,
  saveSession,
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import {
  getFirestore,
  setDoc,
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAvlmocEGgpWviAtHTcPaoxQWh5PZ6QDbI",
  authDomain: "smart-park-iot-d7743.firebaseapp.com",
  databaseURL:
    "https://smart-park-iot-d7743-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "smart-park-iot-d7743",
  storageBucket: "smart-park-iot-d7743.firebasestorage.app",
  messagingSenderId: "292986669185",
  appId: "1:292986669185:web:2935ae540d17025bafa580",
  measurementId: "G-LH5LGV3RPF",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth();
const userDatabase = getFirestore();
const API_BASE = "http://localhost:8000";
console.log("Firebase app initialized:", app);

async function handleRegister() {
  const email = document.getElementById("reg-email").value.trim();
  const password = document.getElementById("reg-password").value;
  const confirmPassword = document.getElementById("reg-confirm-password").value;

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
    window.location.href = "/web-app/src/login.html";
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

async function handleLogin() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

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
      window.location.href = "/web-app/src/login.html";
      return;
    }

    const userData = userDocSnapshot.data();

    // Get Firebase ID token (JWT)
    const idToken = await user.getIdToken();
    const tokenResult = await user.getIdTokenResult();

    const userSession = {
      email: email,
      uid: user.uid,
      role: userData.role,
      lastLogin: new Date().toISOString(),
      token: idToken,
      tokenExpiration: tokenResult.expirationTime, //Firebase default duration: 1 hour
    };

    // Save session and token data
    saveSession(userSession); // Now handles all localStorage operations
    setLoggedInFlags(true);

    console.log("Login successful for user:", user.uid);
    console.log("Token expires at:", tokenResult.expirationTime);
    alert("Login successful! Redirecting...");

    // Redirect based on user role (token is already stored in localStorage)
    if (isSessionValid()) {
      if (userData.role === "admin") {
        console.log("Admin detected, redirecting to weather app");
        window.location.href = "http://localhost:5173/";
      } else {
        window.location.href = "/web-app/src/user/trail-preferences.html";
      }
    } else {
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

function setLoggedInFlags(value) {
  localStorage.setItem("isLoggedIn", value ? "true" : "false");
}

function saveSession(userSession) {
  const sessionData = {
    ...userSession,
    timestamp: new Date().getTime(),
    isActive: true,
  };
  localStorage.setItem("userSession", JSON.stringify(sessionData));
  localStorage.setItem("sessionSavedAt", new Date().toISOString());

  if (userSession.token) {
    localStorage.setItem("accessToken", userSession.token);
    localStorage.setItem("tokenType", "bearer");
  }
  if (userSession.uid) {
    localStorage.setItem("userUid", userSession.uid);
  }

  console.log("Session saved to localStorage:", sessionData);
}

function getSession() {
  const session = localStorage.getItem("userSession");
  return session ? JSON.parse(session) : null;
}

function isSessionValid() {
  const session = getSession();
  if (!session) return false;

  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const hasToken = !!localStorage.getItem("accessToken");

  return isLoggedIn && hasToken && session.isActive;
}

function restoreSession() {
  if (isSessionValid()) {
    const session = getSession();
    console.log("Session restored from localStorage:", session);
    return session;
  }
  return null;
}

function logout() {
  localStorage.removeItem("userSession");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("tokenType");
  localStorage.removeItem("userUid");
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("sessionSavedAt");
  console.log("Session and token cleared from localStorage");

  // Sign out from Firebase
  auth
    .signOut()
    .then(() => {
      console.log("User signed out from Firebase");
      window.location.href = "/web-app/src/login.html";
    })
    .catch((error) => {
      console.error("Error signing out:", error);
      window.location.href = "/web-app/src/login.html";
    });
}

// Get and refresh Firebase token
async function getValidToken() {
  const user = auth.currentUser;
  if (!user) {
    console.error("No user logged in");
    return null;
  }

  try {
    // This automatically refreshes the token if expired
    const token = await user.getIdToken(true);

    // Update localStorage with fresh token
    localStorage.setItem("accessToken", token);

    const tokenResult = await user.getIdTokenResult();
    console.log("Token refreshed, expires at:", tokenResult.expirationTime);

    // Update session with new token
    const session = getSession();
    if (session) {
      session.token = token;
      session.tokenExpiration = tokenResult.expirationTime;
      saveSession(session);
    }

    return token;
  } catch (error) {
    console.error("Error getting token:", error);
    return null;
  }
}

// Check if token is expired or about to expire (within 5 minutes)
function isTokenExpiring() {
  const session = getSession();
  if (!session || !session.tokenExpiration) {
    return true;
  }

  const expirationTime = new Date(session.tokenExpiration).getTime();
  const currentTime = new Date().getTime();
  const fiveMinutes = 5 * 60 * 1000;

  return expirationTime - currentTime < fiveMinutes;
}

async function validateAndRefreshToken() {
  if (isTokenExpiring()) {
    console.log("Token expiring soon, refreshing...");
    return await getValidToken();
  }

  return localStorage.getItem("accessToken");
}

async function getTokenInfo() {
  const user = auth.currentUser;
  if (!user) {
    console.error("No user logged in");
    return null;
  }

  try {
    const tokenResult = await user.getIdTokenResult();
    const session = getSession();

    const expirationTime = new Date(tokenResult.expirationTime);
    const issuedAtTime = new Date(tokenResult.issuedAtTime);
    const currentTime = new Date();

    const timeUntilExpiry = expirationTime.getTime() - currentTime.getTime();
    const minutesUntilExpiry = Math.floor(timeUntilExpiry / (1000 * 60));
    const tokenAge = currentTime.getTime() - issuedAtTime.getTime();
    const tokenAgeMinutes = Math.floor(tokenAge / (1000 * 60));

    const info = {
      token: tokenResult.token,
      expirationTime: tokenResult.expirationTime,
      issuedAtTime: tokenResult.issuedAtTime,
      signInProvider: tokenResult.signInProvider,
      claims: tokenResult.claims,

      // Formatted times
      expiresAt: expirationTime.toLocaleString(),
      issuedAt: issuedAtTime.toLocaleString(),

      // Time calculations
      minutesUntilExpiry: minutesUntilExpiry,
      tokenAgeMinutes: tokenAgeMinutes,
      isExpired: timeUntilExpiry <= 0,
      isExpiringSoon: minutesUntilExpiry < 5,

      // Session data
      sessionData: session,
    };

    console.log("📝 Token Information:");
    console.log(`  - Issued at: ${info.issuedAt}`);
    console.log(`  - Expires at: ${info.expiresAt}`);
    console.log(`  - Token age: ${info.tokenAgeMinutes} minutes`);
    console.log(`  - Time until expiry: ${info.minutesUntilExpiry} minutes`);
    console.log(`  - Is expired: ${info.isExpired}`);
    console.log(`  - Expiring soon: ${info.isExpiringSoon}`);

    return info;
  } catch (error) {
    console.error("Error getting token info:", error);
    return null;
  }
}

async function isUserAdmin() {
  const user = auth.currentUser;
  if (!user) {
    alert("Please log in first");
    return false;
  }

  try {
    const userDocRef = doc(userDatabase, "users", user.uid);
    const userDoc = await getDoc(userDocRef);
    return userDoc.exists() && userDoc.data().role === "admin";
  } catch (error) {
    console.error("Error fetching user role:", error);
    return false;
  }
}

async function makeAPIRequest(endpoint, method = "GET", body = null) {
  const user = auth.currentUser;

  if (!user) {
    alert("Please log in first");
    return null;
  }

  // Check if user is admin
  const isAdmin = await isUserAdmin();
  if (!isAdmin) {
    alert("Admin access required to use this feature");
    return null;
  }

  try {
    // Get valid token (auto-refreshes if expired)
    const token = await validateAndRefreshToken();

    if (!token) {
      alert("Session expired. Please login again.");
      window.location.href = "/web-app/src/login.html";
      return null;
    }

    const options = {
      method: method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      credentials: "include",
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(endpoint, options);

    if (response.status === 403) {
      alert("You do not have admin access");
      return null;
    }

    if (response.status === 401) {
      alert("Session expired. Please login again.");
      logout();
      return null;
    }

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("API request failed:", error);
    alert(`Request failed: ${error.message}`);
    return null;
  }
}

async function getWeatherForecast() {
  const data = await makeAPIRequest("/api/forecast/?minutes=60");
  if (data) {
    console.log("Weather data:", data);
    // Display data on your page
  }
}

// Expose functions to global scope for inline onclick handlers
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.logout = logout;
window.getWeatherForecast = getWeatherForecast;
window.getSession = getSession;
window.isSessionValid = isSessionValid;
window.restoreSession = restoreSession;
window.getValidToken = getValidToken;
window.validateAndRefreshToken = validateAndRefreshToken;
window.makeAPIRequest = makeAPIRequest;
window.getTokenInfo = getTokenInfo;

// Initialize session on page load
document.addEventListener("DOMContentLoaded", function () {
  const session = restoreSession();
  if (session) {
    console.log("Session restored on page load:", session);
    // You can use the session data here if needed
  }
});

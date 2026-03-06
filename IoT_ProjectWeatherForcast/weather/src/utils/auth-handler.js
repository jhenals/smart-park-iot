import { auth, userDatabase } from "./firebase.js";

window.userPrefix = window.WEBAPP_PUBLIC_PREFIX || "http://localhost:8081";
const userPrefix = window.userPrefix;
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Decode JWT token and extract user information
 * @param {string} token - JWT token (optional, uses token from localStorage if not provided)
 * @returns {Object} Decoded token payload with user info
 */
export function decodeToken(token = null) {
  try {
    const tokenToDecode = token || localStorage.getItem("accessToken");

    if (!tokenToDecode) {
      console.warn("No token found");
      return null;
    }

    // JWT tokens have 3 parts separated by dots: header.payload.signature
    const parts = tokenToDecode.split(".");
    if (parts.length !== 3) {
      console.warn("Invalid token format");
      return null;
    }

    // Decode the payload (second part)
    const payload = parts[1];
    // Add padding if necessary
    const padded = payload + "==".substring(0, (4 - (payload.length % 4)) % 4);
    const decoded = JSON.parse(atob(padded));

    console.log("Token decoded:", decoded);
    return decoded;
  } catch (error) {
    console.error("Error decoding token:", error);
    return null;
  }
}

/**
 * Get user ID from the stored token
 * @returns {string} User ID from token
 */
export function getUserIdFromToken() {
  try {
    const decoded = decodeToken();

    if (!decoded) {
      console.warn("Could not decode token");
      return null;
    }

    // Firebase tokens use 'sub' for user ID, but check common alternatives
    const userId = decoded.sub || decoded.uid || decoded.user_id || decoded.id;

    if (userId) {
      console.log("User ID from token:", userId);
      return userId;
    } else {
      console.warn("No user ID found in token");
      return null;
    }
  } catch (error) {
    console.error("Error extracting user ID from token:", error);
    return null;
  }
}

/**
 * Get all user claims from the token
 * @returns {Object} Full token payload with all claims
 */
export function getTokenClaims() {
  return decodeToken();
}

/**
 * Get user data from Firebase Firestore
 * @param {string} userId - The user ID to fetch (optional, uses current user if not provided)
 * @returns {Promise<Object>} User data from Firebase
 */
export async function getUserData(userId = null) {
  try {
    let uid = userId;

    if (!uid) {
      const currentUser = await new Promise((resolve) => {
        onAuthStateChanged(auth, (user) => {
          resolve(user);
        });
      });

      if (!currentUser) {
        console.warn("No user authenticated");
        return null;
      }
      uid = currentUser.uid;
    }

    const userDocRef = doc(userDatabase, "users", uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const userData = userDocSnap.data();
      console.log("User data retrieved:", userData);
      return userData;
    } else {
      console.warn("User document not found in Firestore");
      return null;
    }
  } catch (error) {
    console.error("Error fetching user data from Firebase:", error);
    return null;
  }
}

export async function initializeAuth() {
  try {
    const token = localStorage.getItem("accessToken");
    console.log("Initializing authentication with token:", token);
    if (!token) {
      return false;
    }

    const userIdFromToken = getUserIdFromToken();
    const tokenClaims = getTokenClaims();

    let session = await getUserData(userIdFromToken);

    if (!session) {
      session = {
        uid: userIdFromToken,
        email: tokenClaims?.email || "unknown@example.com",
        role: tokenClaims?.role || "user",
      };
      console.warn("Using user data from token (Firebase fetch failed)");
    }

    const sessionData = {
      email: session.email || tokenClaims?.email,
      uid: session.uid || userIdFromToken,
      role: session.role || "user",
      token: token,
      tokenExpiration: tokenClaims?.exp
        ? new Date(tokenClaims.exp * 1000).toISOString()
        : null,
      lastLogin: new Date().toISOString(),
      isActive: true,
    };

    localStorage.setItem("userSession", JSON.stringify(sessionData));
    localStorage.setItem("sessionSavedAt", new Date().toISOString());
    localStorage.setItem("accessToken", token);
    localStorage.setItem("tokenType", "Bearer");
    localStorage.setItem("userUid", sessionData.uid);
    return true;
  } catch (error) {
    console.error("Authentication check failed:", error);
    return false;
  }
}

/**
 * Get all users data from Firebase Firestore (admin only)
 * @returns {Promise<Array>} Array of all user data
 */
export async function getAllUsersData() {
  try {
    const usersCollectionRef = collection(userDatabase, "users");
    const querySnapshot = await getDocs(usersCollectionRef);

    const allUsers = [];
    querySnapshot.forEach((doc) => {
      allUsers.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    console.log("All users retrieved:", allUsers);
    return allUsers;
  } catch (error) {
    console.error("Error fetching all users from Firebase:", error);
    return [];
  }
}

/**
 * Search users by email in Firestore
 * @param {string} email - Email to search for
 * @returns {Promise<Array>} Array of matching users
 */
export async function getUserByEmail(email) {
  try {
    const usersCollectionRef = collection(userDatabase, "users");
    const q = query(usersCollectionRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);

    const users = [];
    querySnapshot.forEach((doc) => {
      users.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    if (users.length > 0) {
      console.log("User found by email:", users[0]);
      return users[0];
    } else {
      console.warn("No user found with email:", email);
      return null;
    }
  } catch (error) {
    console.error("Error searching user by email:", error);
    return null;
  }
}

/**
 * Get current user session
 */
export function getUserSession() {
  const session = localStorage.getItem("userSession");
  return session ? JSON.parse(session) : null;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated() {
  const session = getUserSession();
  return !!(session && session.role === "admin");
}

/**
 * Redirect to login if not authenticated
 */
export function requireAuth() {
  if (!isAuthenticated()) {
    //window.location.href = `${userPrefix}/web-app/src/login.html`;
    console.warn("User not authenticated. Redirecting to login.");
    return false;
  }
  return true;
}

/**
 * Logout - clear all session data, notify web app, and redirect to login
 */
export async function logout() {
  try {
    localStorage.clear();
    console.log("Local storage cleared");

    notifyLogoutToWebApp();
    setTimeout(() => {
      window.location.href = `${userPrefix}/src/login.html`;
    }, 500);
  } catch (error) {
    console.error("Logout error:", error);
    window.location.href = `${userPrefix}/src/login.html`;
  }
}

function notifyLogoutToWebApp() {
  try {
    // Create a hidden iframe to trigger logout on the web-app (dynamic prefix)
    const logoutUrl = `${userPrefix}/logout.html`;
    const iframe = document.createElement("iframe");
    iframe.src = logoutUrl;
    iframe.style.display = "none";
    iframe.className = "logout-frame";
    iframe.onload = () => {
      // Optionally, send a message to the iframe if needed
      // iframe.contentWindow.postMessage({ type: "LOGOUT_FROM_ADMIN" }, userPrefix);

      // Remove iframe after a short delay
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1500);
    };
    document.body.appendChild(iframe);

    console.log("Logout notification sent to web-app");
  } catch (error) {
    console.error("Error notifying web-app of logout:", error);
  }
}

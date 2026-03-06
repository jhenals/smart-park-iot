import {
  firebaseConfig,
  auth,
  userDatabase,
} from "../../../../firebase-config/firebase.js";

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

const windowPrefix ="http://localhost:8081";

export async function signUp(email, password, confirmPassword) {
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
    window.location.href = `${userPrefix}/src/login.html`;
  } catch (error) {
    const errorCode = error.code;
    const errorMessage = error.message;

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

export async function signIn(email, password) {
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
      window.location.href = `${userPrefix}/src/login.html`;
      return;
    }

    const userData = userDocSnapshot.data();
    const idToken = await user.getIdToken();
    const tokenResult = await user.getIdTokenResult();
    saveSession({
      email: email,
      uid: user.uid,
      displayName: userData.displayName,
      role: userData.role,
      token: idToken,
      tokenExpiration: tokenResult.expirationTime,
    });

    if (isSessionValid()) {
      if (userData.role === "admin") {
        const encodedToken = encodeURIComponent(idToken);
        window.location.href = `http://localhost:5173/admin?token=${encodedToken}`;
      } else {
        window.location.href = `${userPrefix}/src/user/trail-preferences.html?userId=${user.uid}`;
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

export function getSession() {
  const session = localStorage.getItem("userSession");
  return session ? JSON.parse(session) : null;
}

export function setLoggedInFlags(value) {
  localStorage.setItem("isLoggedIn", value ? "true" : "false");
}

export function saveSession({
  email,
  displayName,
  uid,
  role,
  token,
  tokenExpiration,
}) {
  const sessionData = {
    email: email,
    uid: uid,
    displayName: displayName,
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

export function isSessionValid() {
  const session = getSession();
  if (!session) return false;
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const hasToken = !!localStorage.getItem("accessToken");
  return !!(session.isActive && isLoggedIn && hasToken);
}

export function restoreSession() {
  if (isSessionValid()) {
    const session = getSession();
    return session;
  }
  return null;
}

export function logout() {
  auth
    .signOut()
    .then(() => {
      console.log("User signed out from Firebase");
      window.location.href = `${windowPrefix}/src/login.html`;
    })
    .catch((error) => {
      console.error("Error signing out:", error);
      window.location.href = `${windowPrefix}/src/login.html`;
    });
      localStorage.clear();

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

// Initialize session on page load
document.addEventListener("DOMContentLoaded", function () {
  const session = restoreSession();
  if (session) {
    console.log("Session restored on page load:", session);
  }
});

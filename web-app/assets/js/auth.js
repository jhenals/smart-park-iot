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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth();
const userDatabase = getFirestore();

console.log("Firebase app initialized:", app);

$(document).ready(function () {
  $(".login-info-box").fadeOut();
  $(".login-show").addClass("show-log-panel");
});

$('.login-reg-panel input[type="radio"]').on("change", function () {
  if ($("#log-login-show").is(":checked")) {
    $(".register-info-box").fadeOut();
    $(".login-info-box").fadeIn();

    $(".white-panel").addClass("right-log");
    $(".register-show").addClass("show-log-panel");
    $(".login-show").removeClass("show-log-panel");
  } else if ($("#log-reg-show").is(":checked")) {
    $(".register-info-box").fadeIn();
    $(".login-info-box").fadeOut();

    $(".white-panel").removeClass("right-log");

    $(".login-show").addClass("show-log-panel");
    $(".register-show").removeClass("show-log-panel");
  }
});

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
    preventDefault(); // Prevent form submission if using a form element
    // Create user in Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );
    const user = userCredential.user;

    // Store user data in Firestore database
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

    // User exists in database, proceed with login
    const userData = userDocSnapshot.data();
    const userSession = {
      email: email,
      uid: user.uid,
      role: userData.role,
      lastLogin: new Date().toISOString(),
    };

    localStorage.setItem("userSession", JSON.stringify(userSession));
    localStorage.setItem("accessToken", user.uid);
    localStorage.setItem("tokenType", "bearer");
    setLoggedInFlags(true);

    console.log("Login successful for user:", user.uid);
    alert("Login successful! Redirecting...");

    if (userData.role === "admin") {
      window.location.href = "http://localhost:5173/";
    } else {
      window.location.href = "/web-app/src/user/trail-preferences.html";
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
  localStorage.setItem("loggedIn", value ? "true" : "false");
}

function logout() {
  localStorage.removeItem("userSession");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("tokenType");
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("loggedIn");
  window.location.href = "/web-app/src/login.html";
}

// Expose functions to global scope for inline onclick handlers
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.logout = logout;

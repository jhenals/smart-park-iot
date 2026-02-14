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

async function loadUsers() {
  try {
    const response = await fetch("../../database/users.json");
    if (!response.ok) {
      throw new Error("Failed to load users");
    }
    return await response.json();
  } catch (error) {
    console.error("Error loading users:", error);
    return [];
  }
}

async function handleLogin() {
  const emailOrUsername = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!emailOrUsername || !password) {
    alert("Please enter email/username and password to continue.");
    return;
  }

  // Load users from JSON
  const users = await loadUsers();

  // Find user by email or username
  const user = users.find(
    (u) =>
      u.email.toLowerCase() === emailOrUsername.toLowerCase() ||
      u.username.toLowerCase() === emailOrUsername.toLowerCase(),
  );

  if (!user) {
    alert("User not found. Please check your credentials.");
    return;
  }

  // Validate password
  if (user.password !== password) {
    alert("Incorrect password. Please try again.");
    return;
  }

  // Store user session data (excluding password for security)
  const userSession = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    lastLogin: new Date().toISOString(),
  };

  localStorage.setItem("userSession", JSON.stringify(userSession));
  localStorage.setItem("isLoggedIn", "true");

  // Redirect based on role
  if (user.role === "admin") {
    window.location.href = "http://localhost:5173/";
  } else {
    window.location.href = "/web-app/src/user/trail-preferences.html";
  }
}

async function handleRegister() {
  const email = document.getElementById("reg-email").value.trim();
  const password = document.getElementById("reg-password").value;
  const confirmPassword = document.getElementById("reg-confirm-password").value;

  if (!email || !password || !confirmPassword) {
    alert("Please fill up all fields to continue.");
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
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

  const users = await loadUsers();

  const existingUser = users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase(),
  );

  if (existingUser) {
    alert("An account with this email already exists. Please login instead.");
    return;
  }

  const newUser = {
    id: users.length + 1,
    username: email.split("@")[0], // Use email prefix as username
    password: password,
    email: email,
    role: "visitor", // Default role
    firstName: "",
    lastName: "",
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
  };

  const userSession = {
    id: newUser.id,
    username: newUser.username,
    email: newUser.email,
    role: newUser.role,
    firstName: newUser.firstName,
    lastName: newUser.lastName,
    lastLogin: newUser.lastLogin,
  };

  localStorage.setItem("userSession", JSON.stringify(userSession));
  localStorage.setItem("isLoggedIn", "true");

  alert("Registration successful! Redirecting...");
  // Note: In production, you would save this to a backend/database
  console.log("New user registered:", newUser);
  window.location.href = "/web-app/src/user/trail-preferences.html";
}

function logout() {
  localStorage.removeItem("userSession");
  localStorage.removeItem("isLoggedIn");
  window.location.href = "/web-app/src/login.html";
}

function checkAuth() {
  const isLoggedIn = localStorage.getItem("isLoggedIn");
  if (!isLoggedIn || isLoggedIn !== "true") {
    window.location.href = "/web-app/src/login.html";
    return null;
  }
  return JSON.parse(localStorage.getItem("userSession"));
}

function isAdmin() {
  const user = checkAuth();
  return user && user.role === "admin";
}

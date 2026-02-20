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

function getApiBaseUrl() {
  return localStorage.getItem("apiBaseUrl") || "http://localhost:8000";
}

function setLoggedInFlags(value) {
  localStorage.setItem("isLoggedIn", value ? "true" : "false");
  localStorage.setItem("loggedIn", value ? "true" : "false");
}

async function handleLogin() {
  const username = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!username || !password) {
    alert("Please enter username and password to continue.");
    return;
  }

  const apiBase = getApiBaseUrl();
  const body = new URLSearchParams();
  body.append("username", username);
  body.append("password", password);

  try {
    const response = await fetch(`${apiBase}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      alert(payload.detail || "Invalid username or password.");
      return;
    }

    localStorage.setItem("accessToken", payload.access_token);
    localStorage.setItem("tokenType", payload.token_type || "bearer");

    const userSession = {
      username,
      email: "",
      role: username.toLowerCase() === "admin" ? "admin" : "visitor",
      lastLogin: new Date().toISOString(),
    };

    localStorage.setItem("userSession", JSON.stringify(userSession));
    setLoggedInFlags(true);
  } catch (error) {
    console.error("Login request failed:", error);
    alert("Unable to reach authentication server.");
    return;
  }

  if (username.toLowerCase() === "admin") {
    window.location.href = "http://localhost:5173/";
  } else {
    window.location.href = "/web-app/src/user/trail-preferences.html";
  }
}

async function handleRegister() {
  const username = document.getElementById("reg-username").value.trim();
  const password = document.getElementById("reg-password").value;
  const confirmPassword = document.getElementById("reg-confirm-password").value;

  if (!username || !password || !confirmPassword) {
    alert("Please fill up all fields to continue.");
    return;
  }

  if (username.length < 3) {
    alert("Username must be at least 3 characters long.");
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

  const apiBase = getApiBaseUrl();
  const registerPayload = {
    username,
    password,
  };

  try {
    const registerResponse = await fetch(`${apiBase}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(registerPayload),
    });

    const registerData = await registerResponse.json().catch(() => ({}));
    if (!registerResponse.ok) {
      alert(registerData.detail || "Registration failed.");
      return;
    }

    const loginForm = new URLSearchParams();
    loginForm.append("username", username);
    loginForm.append("password", password);

    const loginResponse = await fetch(`${apiBase}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: loginForm,
    });

    const loginData = await loginResponse.json().catch(() => ({}));
    if (!loginResponse.ok) {
      alert(loginData.detail || "Registered but auto-login failed.");
      return;
    }

    localStorage.setItem("accessToken", loginData.access_token);
    localStorage.setItem("tokenType", loginData.token_type || "bearer");

    const userSession = {
      username,
      email: "",
      role: "visitor",
      lastLogin: new Date().toISOString(),
    };
    localStorage.setItem("userSession", JSON.stringify(userSession));
    setLoggedInFlags(true);
  } catch (error) {
    console.error("Registration request failed:", error);
    alert("Unable to reach authentication server.");
    return;
  }

  alert("Registration successful! Redirecting...");
  window.location.href = "/web-app/src/user/trail-preferences.html";
}

function logout() {
  localStorage.removeItem("userSession");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("tokenType");
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("loggedIn");
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

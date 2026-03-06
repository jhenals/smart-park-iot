import { setTimeAndDate } from "./utils/utils.js";
import { logout } from "./utils/auth.js";

document.addEventListener("DOMContentLoaded", () => {
  const navContainer = document.getElementById("dynamic-navbar");
  if (!navContainer) return;

  const role = localStorage.getItem("userRole"); // 'admin' or 'visitor'
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const user = JSON.parse(localStorage.getItem("userSession")) || {
    displayName: "Explorer",
  };
  console.log("User:", user);
  const variant = navContainer.dataset.variant || "";
  const effectiveVariant =
    variant === "auto" && !isLoggedIn ? "public" : variant;

  const publicPrefix = normalizePrefix(
    navContainer.dataset.publicPrefix || "/",
  );
  const userPrefix = normalizePrefix(
    navContainer.dataset.userPrefix || "../../",
  );

  let navContent = "";

  if (effectiveVariant === "public") {
    navContent = `
      <div class="container-fluid">
        <div class="logo">
          <img
            src="/public/images/logo.png"
            class="logo"
            alt="Smart Trek Logo"
          />
          <a class="navbar-brand title" href="/index.html">Smart Park</a>
        </div>
        <button
          class="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarText"
          aria-controls="navbarText"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarText">
          <ul class="navbar-nav m-auto mb-2 mb-lg-0">
            <li class="nav-item">
              <a class="nav-link" href="/index.html">Home</a>
            </li>
            <li class="nav-item">
              <a class="nav-link" href="/src/public-env.html">Environment</a>
            </li>
            <li class="nav-item">
              <a class="nav-link" href="/src/components/weather.html">Weather</a>
            </li>
            <li class="nav-item">
              <a class="nav-link" href="/src/discover.html">Discover</a>
            </li>
            <li class="nav-item">
              <a class="nav-link" href="/src/login.html">Sign In</a>
            </li>
          </ul>

          <div class="datetimeloc d-flex flex-column">
            <span class="d-flex flex-row"
              >DATE TIME:
              <div id="current-date"></div>
            </span>
            <span>LOCATION: SILA NATIONAL PARK</span>
          </div>
        </div>
      </div>
    `;
  } else {
    navContent = `
        <div class="container-fluid">
        <div class="logo">
          <img
            src="${userPrefix}public/images/logo.png"
            class="logo"
            alt="Smart Trek Logo"
          />
          <a class="navbar-brand title" href="${userPrefix}index.html">Smart Park</a>
        </div>
        <button
          class="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarText"
          aria-controls="navbarText"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarText">
          <ul class="navbar-nav m-auto mb-2 mb-lg-0">
            <li class="nav-item">
              <a class="nav-link" href="${userPrefix}src/user/user-dashboard.html">Home</a>
            </li>
            <li class="nav-item">
              <a class="nav-link" href="${userPrefix}src/user/user-location.html">Map</a>
            </li>
            <li class="nav-item">
              <a class="nav-link" href="${userPrefix}src/user/trail-preferences.html">Change Trail</a>
            </li>
            <li class="nav-item">
              <a class="nav-link" href="${userPrefix}src/components/weather.html">Weather</a>
            </li>
            <li class="nav-item">
              <a class="nav-link" onclick="toggleChat()"">Guide</a>
            </li>
            <li class="nav-item">
              <a class="nav-link" onclick="logout()"">Exit (${user.displayName})</a>

            </li>
          </ul>

          <div class="datetimeloc d-flex flex-column">
            <span class="d-flex flex-row">
              DATE TIME:
              <div id="current-date"></div>
            </span>
            <span>LOCATION: SILA NATIONAL PARK</span>
          </div>
        </div>
      </div>
    `;
  }
  navContainer.innerHTML = navContent;
  setTimeAndDate();
  if (effectiveVariant === "public") {
    setActivePublicLink(navContainer);
  } else if (role === "visitor" || isLoggedIn) {
    setActiveUserLink(navContainer);
  }
function setActiveUserLink(navContainer) {
  const currentPath = window.location.pathname.replace(/\/index\.html$/, "/");
  const links = navContainer.querySelectorAll(".nav-link");

  links.forEach((link) => {
    link.classList.remove("active");
    link.removeAttribute("aria-current");

    const linkPath = new URL(
      link.href,
      window.location.origin,
    ).pathname.replace(/\/index\.html$/, "/");
    if (linkPath === currentPath) {
      link.classList.add("active");
      link.setAttribute("aria-current", "page");
    }
  });
}
});

function normalizePrefix(prefix) {
  if (!prefix) return "";
  return prefix.endsWith("/") ? prefix : `${prefix}/`;
}

function setActivePublicLink(navContainer) {
  const currentPath = window.location.pathname.replace(/\/index\.html$/, "/");
  const links = navContainer.querySelectorAll(".nav-link");

  links.forEach((link) => {
    link.classList.remove("active");
    link.removeAttribute("aria-current");

    const linkPath = new URL(
      link.href,
      window.location.origin,
    ).pathname.replace(/\/index\.html$/, "/");
    if (linkPath === currentPath) {
      link.classList.add("active");
      link.setAttribute("aria-current", "page");
    }
  });
}

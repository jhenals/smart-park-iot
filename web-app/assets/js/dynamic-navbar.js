document.addEventListener("DOMContentLoaded", () => {
  const navContainer = document.getElementById("dynamic-navbar");
  const role = localStorage.getItem("userRole"); // 'admin' or 'visitor'
  const name = localStorage.getItem("username") || "Guest";

  let navContent = "";

  if (role === "admin") {
    // --- Admin Path Navbar ---
    navContent = `
            <div class="nav-links">
                <a href="/admin.html">Fleet</a>
                <a href="/gateway-status.html">Gateway</a>
                <a href="/analytics.html">Stats</a>
                <button onclick="logout()" class="logout-btn">Exit</button>
            </div>
        `;
  } else {
    // --- Visitor Path Navbar ---
    navContent = `
          <div class="logo">
          <img
            src="../../public/images/logo.png"
            class="logo"
            alt="Smart Trek Logo"
          />
          <a class="navbar-brand title" href="#">Smart Trek</a>
        </div>
            <div class="nav-links">
                <a href="../../src/user/map.html">Map</a>
                <a href="../../src/user/trail-preferences.html">Change Trail</a>
                <a id="weather-status" class="status-dot" href="../../src/components/weather.html">Weater</a>
                <button onclick="toggleChat()" class="chat-btn">Guide</button>
                <button onclick="logout()" class="logout-btn">Exit (${name})</button>
            </div>
        `;
  }

  navContainer.innerHTML = navContent;
});

function logout() {
  localStorage.clear();
  window.location.href = "/web-app/index.html";
}

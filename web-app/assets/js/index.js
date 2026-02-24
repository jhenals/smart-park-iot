document.addEventListener("DOMContentLoaded", () => {
  const dateDiv = document.getElementById("current-date");
  var now = new Date();
  if (dateDiv) dateDiv.textContent = now.toLocaleString();
});

function goToHomePage() {
  const isLoggedIn = localStorage.getItem("loggedIn") === "true";
  const user = JSON.parse(localStorage.getItem("user"));
  window.location.href =
    isLoggedIn && user
      ? `http://localhost:5500/web-app/src/user/user-dashboard.html?userId=${user.uid}`
      : "http://localhost:5500/web-app/index.html";
}

document.addEventListener("DOMContentLoaded", () => {
  const dateDiv = document.getElementById("current-date");
  var now = new Date();
  if (dateDiv) dateDiv.textContent = now.toUTCString();
});

function goToHomePage() {
  const isLoggedIn = localStorage.getItem("loggedIn") === "true";
  window.location.href = isLoggedIn
    ? "/web-app/src/user/user-dashboard.html"
    : "/web-app/index.html";
}

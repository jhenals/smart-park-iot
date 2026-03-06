window.userPrefix = window.WEBAPP_PUBLIC_PREFIX || "http://localhost:8081";
const userPrefix = window.userPrefix;

export function setTimeAndDate() {
  const dateDiv = document.getElementById("current-date");
  if (dateDiv) {
    var now = new Date();
    dateDiv.textContent = now.toLocaleString();
  } else {
    console.warn('Element with id "current-date" not found.');
  }
}

export function goToHomepage() {
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  if (isLoggedIn) {
    window.location.href = `${userPrefix}/src/user/user-dashboard.html`;
  } else {
    window.location.href = `${userPrefix}/index.html`;
  }
}

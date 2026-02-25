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
  // Assume login status is stored in localStorage as 'isLoggedIn' (string 'true' or 'false')
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  if (isLoggedIn) {
    window.location.href = `${userPrefix}/web-app/src/user/user-dashboard.html`;
  } else {
    window.location.href = `${userPrefix}/web-app/index.html`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const dateDiv = document.getElementById("current-date");
  var now = new Date();
  if (dateDiv) dateDiv.textContent = now.toUTCString();
});

function goToHomePage() {
  window.location.href = "../index.html";
}


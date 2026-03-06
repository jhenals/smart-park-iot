window.userPrefix = window.WEBAPP_PUBLIC_PREFIX || "http://localhost:8081";
const userPrefix = window.userPrefix;

export function setTimeAndDate(elementId = "current-date", interval = 1000) {
  const dateDiv = document.getElementById(elementId);
  
  if (!dateDiv) {
    console.warn(`Element with id "${elementId}" not found.`);
    return;
  }

  // Update immediately
  const updateDateTime = () => {
    const now = new Date();
    dateDiv.textContent = now.toLocaleString();
  };

  updateDateTime();
  setInterval(updateDateTime, interval);
}

export function goToHomepage() {
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  if (isLoggedIn) {
    window.location.href = `${userPrefix}/src/user/user-dashboard.html`;
  } else {
    window.location.href = `${userPrefix}/index.html`;
  }
}

let imgIndex = 0;

export function carouselImages(section, images) {
  const heroSection = document.querySelector(section);

  if (heroSection) {
    const img = new window.Image();
    img.onload = function () {
      heroSection.style.backgroundImage = `url('${images[imgIndex]}')`;
      heroSection.style.backgroundSize = "cover";
      heroSection.style.backgroundPosition = "center";
      imgIndex = (imgIndex + 1) % images.length;
    };
    img.onerror = function () {
      heroSection.style.backgroundImage = "none";
      imgIndex = (imgIndex + 1) % images.length;
    };
    img.src = images[imgIndex];
  }
}


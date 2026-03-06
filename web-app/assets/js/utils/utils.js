window.userPrefix = (() => {
  const origin = window.location.origin; // e.g., http://127.0.0.1:5500
  const pathname = window.location.pathname; // e.g., /web-app/src/weather.html
  
  if (pathname.includes('/web-app/')) {
    return `${origin}/web-app/`;
  }
    return `${origin}/`;
})();

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
  let targetUrl = "";
  
  if (isLoggedIn) {
    targetUrl = `${userPrefix}src/user/user-dashboard.html`;
  } else {
    targetUrl = `${userPrefix}index.html`;
  }
  
  window.location.href = targetUrl;
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


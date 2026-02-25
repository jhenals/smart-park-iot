import { cycleImages } from "./../js/modules/changingImages.js";

document.addEventListener("DOMContentLoaded", function () {
  const bgImages = [
    "/web-app/public/images/homepage-imgs/1.png",
    "/web-app/public/images/homepage-imgs/2.png",
    "/web-app/public/images/homepage-imgs/3.png",
    "/web-app/public/images/homepage-imgs/4.png",
    "/web-app/public/images/homepage-imgs/5.png",
  ];
  setInterval(() => cycleImages(".hero-section", bgImages), 3000); // Change every 3 seconds
  cycleImages(".user-dashboard-container", bgImages);
});

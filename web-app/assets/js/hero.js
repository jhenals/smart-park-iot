import { cycleImages } from "./../js/modules/changingImages.js";

document.addEventListener("DOMContentLoaded", function () {
  const bgImages = [
    "/public/images/homepage-imgs/1.png",
    "/public/images/homepage-imgs/2.png",
    "/public/images/homepage-imgs/3.png",
    "/public/images/homepage-imgs/4.png",
    "/public/images/homepage-imgs/5.png",
  ];
  setInterval(() => cycleImages(".hero-section", bgImages), 3000); // Change every 3 seconds
  cycleImages(".user-dashboard-container", bgImages);
});

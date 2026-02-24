document.addEventListener("DOMContentLoaded", function () {
  const heroSection = document.querySelector(".hero-section");
  const bgImages = [
    "/web-app/public/images/homepage-imgs/1.png",
    "/web-app/public/images/homepage-imgs/2.png",
    "/web-app/public/images/homepage-imgs/3.png",
    "/web-app/public/images/homepage-imgs/4.png",
    "/web-app/public/images/homepage-imgs/5.png",
  ];
  let bgIndex = 0;

  function changeHeroBackground() {
    if (heroSection) {
      const img = new window.Image();
      img.onload = function () {
        heroSection.style.backgroundImage = `url('${bgImages[bgIndex]}')`;
        heroSection.style.backgroundSize = "cover";
        heroSection.style.backgroundPosition = "center";
        console.log("Setting background:", bgImages[bgIndex]);
        bgIndex = (bgIndex + 1) % bgImages.length;
      };
      img.onerror = function () {
        console.warn("Image failed to load:", bgImages[bgIndex]);
        heroSection.style.backgroundImage = "none";
        bgIndex = (bgIndex + 1) % bgImages.length;
      };
      img.src = bgImages[bgIndex];
    }
  }

  setInterval(changeHeroBackground, 3500); // Change every 3.5 seconds
  changeHeroBackground();
});

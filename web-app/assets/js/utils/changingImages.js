let imgIndex = 0;

export function cycleImages(section, images) {
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

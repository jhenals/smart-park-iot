function generateMockRecommendation() {
  const difficulty = document.getElementById("difficulty").value;
  const env = document.getElementById("environment").value;

  // Mock Database of Trails (to be replaced by Husayn's ML output)
  const mockTrails = {
    easy_quiet: "The Silent Giant Path",
    easy_bright: "The Sunlit Glade",
    moderate_quiet: "Ancient Forest Loop",
    hard_quiet: "Deep Sila Ridge",
    hard_bright: "Peak of the Giants",
  };

  const key = `${difficulty}_${env}`;
  const recommendedTrail = mockTrails[key] || "Main Park Loop";

  // Store the recommendation to display on the User Homepage
  localStorage.setItem("recommendedTrail", recommendedTrail);

  // Show the result
  document.getElementById("trail-name").innerText = recommendedTrail;
  document.getElementById("recommendation-result").style.display = "block";
}

function goToHomepage() {
  // Redirect to the final Visitor Homepage (Step 3)
  window.location.href = "/web-app/src/user/user-dashboard.html";
}

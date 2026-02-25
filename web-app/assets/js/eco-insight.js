const DASHBOARD_DATA_URL = await fetch(API.DASHBOARD_DATA_PATH);
const GIANTS_DATA_URL = await fetch(API.GIANTS_DATA_PATH);

document.addEventListener("DOMContentLoaded", () => {
  renderPassport();
  renderAverages();
});

async function renderPassport() {
  const container = document.getElementById("giants-checklist");
  if (!container) return;

  try {
    const [dashboardResponse, giantsResponse] = await Promise.all([
      fetch(DASHBOARD_DATA_URL),
      fetch(GIANTS_DATA_URL),
    ]);

    const dashboardData = await dashboardResponse.json();
    const giantsData = await giantsResponse.json();

    const visited = Array.isArray(dashboardData?.visitedGiants)
      ? dashboardData.visitedGiants.map((giant) => giant.name).filter(Boolean)
      : dashboardData?.user?.visitedGiants || [];

    const giantsList = Array.isArray(giantsData?.giants)
      ? giantsData.giants
      : Array.isArray(giantsData)
        ? giantsData
        : [];

    const allGiants =
      giantsList.length > 0
        ? giantsList.map((giant) => ({
            name: giant.name || "Unknown Giant",
            id: giant.id || "unknown",
          }))
        : [];

    const visitedSet = new Set(visited);
    const orderedGiants = allGiants
      .slice()
      .sort(
        (a, b) =>
          Number(visitedSet.has(b.name)) - Number(visitedSet.has(a.name)),
      );

    container.innerHTML = orderedGiants
      .map(
        (giant) => `
          <div class="checklist-item ${visitedSet.has(giant.name) ? "checked" : "locked"}">
              <span class="status-icon">${visitedSet.has(giant.name) ? "✅" : "🔒"}</span>
              <span class="giant-name">${giant.name}</span>
          </div>
      `,
      )
      .join("");
  } catch (error) {
    console.error("Failed to load passport data:", error);
  }
}

function renderAverages() {
  document.getElementById("avg-noise").innerText = "34.2 dB";
  document.getElementById("avg-temp").innerText = "19.1 °C";
}

async function injectLiveFact() {
  const response = await fetch(API.FASTAPI_URL);
  const data = await response.json();

  if (data.length > 0) {
    const latest = data[data.length - 1];
    const factBox = document.createElement("div");
    factBox.className = "live-fact-toast glass";
    factBox.innerHTML = `✨ <strong>Live Discovery:</strong> It is currently ${latest.temperature}°C in the forest. Perfect for a walk!`;
    document.body.appendChild(factBox);
  }
}

document.addEventListener("DOMContentLoaded", injectLiveFact);

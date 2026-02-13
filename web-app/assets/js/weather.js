const FASTAPI_URL = "http://localhost:8000/api/weather/forecast/?minutes=60";
const LAT = 39.3551; // Matching your sensor's actual latitude
const LON = 16.2232; // Matching your sensor's actual longitude

async function loadWeather() {
  const container = document.getElementById("weather");
  const forecastList = document.getElementById("forecast-list");

  try {
    const sensorRes = await fetch(FASTAPI_URL);
    const sensorData = await sensorRes.json();
    const latestSensor = sensorData[sensorData.length - 1];

    const meteoRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&hourly=temperature_2m,relative_humidity_2m,precipitation_probability`,
    );
    const weatherData = await meteoRes.json();

    updateLiveConditions(latestSensor);

    // 3. Process the Hourly Forecast
    renderHourlyForecast(weatherData, forecastList);
  } catch (err) {
    if (container) container.innerHTML = "<p>System synchronization error.</p>";
    console.error("Weather update error:", err);
  }
}

function renderHourlyForecast(data, listElement) {
  if (!listElement) return;

  const times = data.hourly.time;
  const temps = data.hourly.temperature_2m;
  const precip = data.hourly.precipitation_probability;

  listElement.innerHTML = "";
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < 24; i++) {
    const li = document.createElement("li");
    li.className = "forecast-row glass";

    const timeLabel = new Date(times[i]).toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    });

    li.innerHTML = `
            <span class="forecast-time">${timeLabel}</span>
            <span class="forecast-icon">${precip[i] > 20 ? "🌧️" : "☀️"}</span>
            <span class="forecast-temp">${temps[i]}°C   </span>
            <span class="forecast-precip">${precip[i]}%</span>
        `;
    fragment.appendChild(li);
  }
  listElement.appendChild(fragment);
}

function updateGearList(latestSensor) {
  const gearList = document.getElementById("gear-list");
  if (!gearList) return;

  let gear = ["💧 1L Water", "📱 Fully Charged Phone"]; // Basics

  if (latestSensor.temperature < 18) gear.push("🧥 Light Jacket");
  if (latestSensor.humidity > 65) gear.push("🥾 Waterproof Boots");
  if (latestSensor.light < 5) gear.push("🔦 Headlamp/Torch");

  gearList.innerHTML = gear.map((item) => `<li>${item}</li>`).join("");
}

function updateLiveConditions(sensor) {
  const liveTemp = document.getElementById("live-sensor-temp");
  const liveHum = document.getElementById("live-sensor-hum");
  const safetyBanner = document.getElementById("safety-status-text");

  if (liveTemp) liveTemp.innerText = `${sensor.temperature.toFixed(1)}°C`;
  if (liveHum) liveHum.innerText = `${sensor.humidity}%`;

  // Logic: If sensor light is very low (canopy cover/fog) and humidity is high
  if (safetyBanner) {
    if (sensor.humidity > 85) {
      safetyBanner.innerText = "Damp Trails: Use Caution";
      safetyBanner.className = "status-warning";
    } else {
      safetyBanner.innerText = "Optimal Conditions";
      safetyBanner.className = "status-safe";
    }
  }
}
loadWeather();

import { API, THRESHOLDS, TEMPERATURE_RANGES } from "../js/utils/constants.js";

async function loadWeather() {
  const container = document.getElementById("weather");
  const forecastList = document.getElementById("forecast-list");

  try {
    const sensorRes = await fetch(API.FASTAPI_URL);
    const sensorDataArray = await sensorRes.json();
    const latestSensorData = sensorDataArray[sensorDataArray.length - 1];

    const meteoRes = await fetch(API.OPEN_METEO_URL);
    const openMeteoData = await meteoRes.json();

    updateStatsDashboard(openMeteoData, latestSensorData);
    renderHourlyForecast(openMeteoData, forecastList);
    updateTrailReadinessBadge(openMeteoData, latestSensorData);
    updateTrailReadinessVis(openMeteoData, latestSensorData);

    if (sensorDataArray.length > 1) {
      const latest = sensorDataArray[sensorDataArray.length - 1];
      const previous = sensorDataArray[sensorDataArray.length - 2];

      updateTrailReadinessStability(latest, previous);
    }

    renderPressureChart(sensorDataArray);
    updateGearList(latestSensorData);
  } catch (err) {
    if (container) container.innerHTML = "<p>System synchronization error.</p>";
    console.error("Weather update error:", err);
  }
}

function updateStatsDashboard(openMeteoData, sensorData) {
  const currentHour = new Date().getHours();

  const feelsLike = openMeteoData.current.apparent_temperature;
  const windSpeed = openMeteoData.current.wind_speed_10m;
  const uvIndex = openMeteoData.hourly.uv_index[currentHour];
  const sunsetRaw = openMeteoData.daily.sunset[0];
  const sunsetTime = sunsetRaw.split("T")[1]; // Extracts "17:45"

  // Updated via API data, but can also be overridden by live sensor readings if available
  try {
    document.getElementById("current-temp-main").innerText =
      sensorData.temperature
        ? `${sensorData.temperature}°C`
        : `${openMeteoData.current.temperature_2m}°C`;
    document.getElementById("stat-feels").innerText = `${feelsLike}°C`;
    document.getElementById("stat-uv").innerText = uvIndex;
    document.getElementById("stat-wind").innerText = `${windSpeed} km/h`;
    document.getElementById("stat-sunset").innerText = sunsetTime;
  } catch (error) {
    console.error("Error fetching API data:", error);
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
    li.className = "forecast-hour-col";
    li.style.display = "flex";
    li.style.flexDirection = "column";
    li.style.alignItems = "center";
    li.style.justifyContent = "center";
    li.style.padding = "8px 4px";

    const timeLabel = new Date(times[i]).toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    });

    li.innerHTML = `
      <span class="forecast-icon" style="font-size: 2em;">${precip[i] > THRESHOLDS.precipitation.rainyIcon ? "🌧️" : "☀️"}</span>
      <span class="forecast-temp" style="margin-top: 4px;">${temps[i]}°C</span>
      <span class="forecast-time" style="margin-top: 2px; font-size: 0.9em; color: var(--forest-dark);">${timeLabel}</span>
      <span class="forecast-precip" style="margin-top: 2px; font-size: 0.8em; color: var(--forest-dark);"><i class="bi bi-umbrella"></i>
${precip[i]}%</span>
    `;
    fragment.appendChild(li);
  }
  listElement.appendChild(fragment);
}

function getTemperatureReadinessRange(temp) {
  return TEMPERATURE_RANGES.findIndex((r) => temp >= r.min && temp < r.max);
}

function updateTrailReadinessBadge(openMeteoData, sensorData) {
  const badge = document.getElementById("hike-recommendation");
  const desc = document.getElementById("hike-recommendation-desc");
  const temp = sensorData.temperature || openMeteoData.current.temperature_2m;

  // PRIORITY 1: Storm/Wind Risk (Safety override)
  if (
    openMeteoData.current.wind_speed_10m >= 40 ||
    openMeteoData.current.pressure_trend === "falling"
  ) {
    badge.innerText = "Storm Risk";
    badge.className = "status-badge status-badge-danger";
    desc.innerText =
      "Unstable pressure detected. High-altitude trekking not advised.";
  }
  // PRIORITY 2: Temperature Logic (Using temp Constant)
  else {
    const tempReadinessIndex = getTemperatureReadinessRange(
      temp,
    );
    const tempRange = TEMPERATURE_RANGES[tempReadinessIndex] || {
      label: "Unknown",
      description: "Check local sensor data.",
    };
    badge.innerText = tempRange.label;
    if (
      tempReadinessIndex === 0 ||
      tempReadinessIndex === TEMPERATURE_RANGES.length - 1
    ) {
      badge.className = "status-badge status-badge-danger";
    } else if (
      tempReadinessIndex === 1 ||
      tempReadinessIndex === 2 ||
      tempReadinessIndex === 4
    ) {
      badge.className = "status-badge status-badge-warning";
    } else {
      badge.className = "status-badge status-badge-safe";
    }
    desc.innerText = tempRange.description;
  }
}

function updateTrailReadinessVis(openMeteoData, sensorData) {
  const visDisplay = document.getElementById("readiness-light");
  let statusText = "";
  let visKm = 0;

  try {
    if (sensorData) {
      const light = sensorData.light;
      visKm = light;
      console.log("Light sensor reading:", light);
      if (light >= THRESHOLDS.light.sensor.bright) {
        statusText = "☀️ Open Area (Bright Sun)";
        visDisplay.style.color = "var(--text-status-safe)";
      } else if (light >= THRESHOLDS.light.sensor.shaded) {
        statusText = "🌤️ Shaded Forest Floor";
        visDisplay.style.color = "var(--text-status-warning)";
      } else if (light >= THRESHOLDS.light.sensor.deepCanopy) {
        statusText = "🌲 Deep Canopy (Gloom)";
        visDisplay.style.color = "var(--text-status-danger)";
      } else if (
        light >= 0 &&
        light <= THRESHOLDS.light.sensor.headlampRequired
      ) {
        statusText = "🔦 Headlamp Required";
        visDisplay.style.color = "var(--text-status-danger)";
      } else {
        statusText = "Unknown Visibility";
        visDisplay.style.color = "var(--text-status-warning)";
      }
    } else {
      const visMeters = openMeteoData.current.visibility;
      const visKm = (visMeters / 1000).toFixed(1); // Convert to km for the UI

      if (visMeters < THRESHOLDS.light.weatherAPI.dangerLupa) {
        statusText = "🚨 Danger: Thick Fog";
        visDisplay.style.color = "var(--text-status-danger)";
      } else if (
        visMeters < THRESHOLDS.light.weatherAPI.moderateMistMax &&
        visMeters >= THRESHOLDS.light.weatherAPI.moderateMistMin
      ) {
        statusText = "🌫️ Moderate Mist";
        visDisplay.style.color = "var(--text-status-warning)";
      } else {
        statusText = "✅ Clear Visibility";
        visDisplay.style.color = "var(--text-status-safe)";
      }
    }
  } catch (error) {
    console.error("Error updating trail readiness:", error);
  }

  visDisplay.innerText = `${statusText} (${visKm} km)`;
  visDisplay.className = "fw-bold";
}

function updateTrailReadinessStability(latestSensorData, previousSensorData) {
  const stabilityEl = document.getElementById("readiness-press");

  try {
    const presDiff = latestSensorData.pressure - previousSensorData.pressure;
    // A difference less than threshold in InfluxDB pressure is generally stable
    if (Math.abs(presDiff) < THRESHOLDS.pressure.stableDiff) {
      stabilityEl.innerText = "Stable";
      stabilityEl.style.color = "var(--forest-dark)";
    } else if (presDiff > 0) {
      stabilityEl.innerText = "Rising (Clearing)";
      stabilityEl.style.color = "var(--text-status-safe)";
    } else {
      stabilityEl.innerText = "Falling (Unstable)";
      stabilityEl.style.color = "var(--text-status-danger)";
    }
  } catch (error) {
    console.error("Error updating pressure stability:", error);
  }
}

let pressureChartInstance = null;

function renderPressureChart(sensorDataArray) {
  const canvas = document.getElementById("pressureChart");
  if (!canvas) {
    console.error("Canvas element 'pressureChart' not found");
    return;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    console.error("Could not get 2D context from canvas");
    return;
  }
  const labels = sensorDataArray.map((entry) => {
    return new Date(entry.time).toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    });
  });

  const pressureValues = sensorDataArray.map((entry) => entry.pressure);

  if (pressureChartInstance) {
    pressureChartInstance.destroy();
  }

  pressureChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Atmospheric Pressure (Pa)",
          data: pressureValues,
          borderColor: "var(--primary-color)",
          backgroundColor: "rgba(255, 193, 7, 0.1)",
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0.4, // Makes the line smooth/curvy
          fill: true, // Shaded area under the line
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }, // Hide legend for minimalist look
      },
      scales: {
        x: {
          display: true,
          grid: { display: false },
          ticks: { color: "rgba(255, 255, 255, 0.6)", maxTicksLimit: 6 },
        },
        y: {
          display: true,
          grid: { color: "rgba(255, 255, 255, 0.1)" },
          ticks: { color: "rgba(255, 255, 255, 0.6)" },
        },
      },
    },
  });
}

function updateGearList(latestSensor) {
  const gearList = document.getElementById("gear-list");
  if (!gearList || !latestSensor) return;

  // Essentials for all hikes
  let gear = [
    "💧 1L Water",
    "📱 Fully Charged Phone",
    "Standard First Aid Kit",
    "Offline Map (GPS)",
  ];

  // Add based on sensor readings
  if (latestSensor.uvIndex && latestSensor.uvIndex > 6) {
    gear.push("Sunscreen SPF 50", "Hiking Hat");
  }
  if (latestSensor.temperature !== undefined && latestSensor.temperature < 10) {
    gear.push("Insulated Jacket", "Emergency Blanket");
  }
  if (latestSensor.windSpeed && latestSensor.windSpeed > 20) {
    gear.push("Windbreaker Shell");
  }
  if (
    latestSensor.temperature < (THRESHOLDS?.temperature?.jacketRequired ?? 15)
  ) {
    gear.push("🧥 Light Jacket");
  }
  if (latestSensor.humidity > (THRESHOLDS?.humidity?.dampTrails ?? 80)) {
    gear.push("🥾 Waterproof Boots");
  }
  if (latestSensor.light < (THRESHOLDS?.light?.headlampRequired ?? 100)) {
    gear.push("🔦 Headlamp/Torch");
  }

  gearList.innerHTML = gear.map((item) => `<li>${item}</li>`).join("");
}

loadWeather();

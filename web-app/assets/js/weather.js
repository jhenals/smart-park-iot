async function loadWeather() {
  const container = document.getElementById("weather");
  const forecastList = document.getElementById("forecast-list");

  try {
    const sensorRes = await fetch(API.SENSORS_DATA_PATH); //TODO: Change this to API.FASTAPI_URL to fetch from backend
    const sensorData = await sensorRes.json();

    console.log("SENSOR DATA:", sensorData);

    const latestSensor = sensorData[sensorData.length - 1];

    const meteoRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${SILA_LOCATION.LAT}&longitude=${SILA_LOCATION.LON}&hourly=temperature_2m,relative_humidity_2m,precipitation_probability`,
    );
    const weatherData = await meteoRes.json();
    if (sensorData.length > 1) {
      const latest = sensorData[sensorData.length - 1];
      const previous = sensorData[sensorData.length - 2];

      updateTrailReadiness(latest, previous);
    }

    renderHourlyForecast(weatherData, forecastList);
    updateLiveConditions(latestSensor);
    updateGearList(latestSensor);
    renderPressureChart(sensorData);
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
    li.className = "forecast-row";

    const timeLabel = new Date(times[i]).toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    });

    li.innerHTML = `
            <div>
              <span class="forecast-time">${timeLabel}</span>
              <span class="forecast-temp">${temps[i]}°C   </span>
            </div>
            <div>
              <span class="forecast-icon">${precip[i] > THRESHOLDS.precipitation.rainyIcon ? "🌧️" : "☀️"}</span>
              <span class="forecast-precip">${precip[i]}%</span>
            </div>
        `;
    fragment.appendChild(li);
  }
  listElement.appendChild(fragment);
}

function updateGearList(latestSensor) {
  const gearList = document.getElementById("gear-list");
  if (!gearList) return;

  let gear = ["💧 1L Water", "📱 Fully Charged Phone"]; // Basics

  if (latestSensor.temperature < THRESHOLDS.temperature.jacketRequired)
    gear.push("🧥 Light Jacket");
  if (latestSensor.humidity > THRESHOLDS.humidity.dampTrails)
    gear.push("🥾 Waterproof Boots");
  if (latestSensor.light < THRESHOLDS.light.headlampRequired)
    gear.push("🔦 Headlamp/Torch");

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
    if (sensor.humidity > THRESHOLDS.humidity.severeWarning) {
      safetyBanner.innerText = "Damp Trails: Use Caution";
      safetyBanner.className = "status-warning";
    } else {
      safetyBanner.innerText = "Optimal Conditions";
      safetyBanner.className = "status-safe";
    }
  }
}

let pressureChartInstance = null;

function renderPressureChart(dataList) {
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
  const labels = dataList.map((entry) => {
    return new Date(entry.time).toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    });
  });

  const pressureValues = dataList.map((entry) => entry.pressure);

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

function updateTrailReadiness(latest, previous) {
  const badge = document.getElementById("hike-recommendation");
  const messageEl = document.getElementById("hike-recommendation-desc");

  const pressureDiff = latest.pressure - previous.pressure;
  const isHumidityHigh = latest.humidity > THRESHOLDS.humidity.highHumidity;
  const isLightLow = latest.light < THRESHOLDS.light.lowVisibility;
  const isPressureFalling = pressureDiff < THRESHOLDS.pressure.falling;

  let status = "Highly Recommended";
  let statusClass = "status-safe";
  let reasons = [];

  if (Math.abs(pressureDiff) < THRESHOLDS.pressure.stableRange) {
    reasons.push("stable pressure");
  } else if (pressureDiff > 0) {
    reasons.push("improving atmospheric stability");
  }

  if (latest.humidity < THRESHOLDS.humidity.dampTrails) {
    reasons.push("low humidity");
  }

  if (isPressureFalling || isHumidityHigh || isLightLow) {
    status = "Use Caution";
    statusClass = "status-warning";

    let warnings = [];
    if (isPressureFalling) warnings.push("dropping pressure (possible rain)");
    if (isHumidityHigh) warnings.push("high humidity (slippery trails)");
    if (isLightLow) warnings.push("low visibility");

    messageEl.innerText = `Warning: ${warnings.join(" and ")} detected by Node ${latest.device_id}.`;
  } else {
    messageEl.innerText = `${reasons.join(" and ").charAt(0).toUpperCase() + reasons.join(" and ").slice(1)} detected by Node ${latest.device_id}.`;
  }

  badge.innerText = status;
  badge.className = `status-badge ${statusClass}`;

  const lightEl = document.getElementById("readiness-light");
  const pressEl = document.getElementById("readiness-press");

  if (lightEl) {
    if (latest.light > THRESHOLDS.light.excellent) {
      lightEl.innerText = "Excellent";
      lightEl.style.color = "var(--forest-dark)";
    } else if (latest.light >= THRESHOLDS.light.moderate) {
      lightEl.innerText = "Moderate (Shaded)";
      lightEl.style.color = "#ffc107";
    } else {
      lightEl.innerText = "Low (Twilight)";
      lightEl.style.color = "#ff5252";
    }
  }

  // 2. Stability Logic (using 'pressure' trend)
  if (pressEl) {
    const diff = latest.pressure - previous.pressure;

    // A difference less than threshold in InfluxDB pressure is generally stable
    if (Math.abs(diff) < THRESHOLDS.pressure.stableDiff) {
      pressEl.innerText = "Stable";
      pressEl.style.color = "var(--forest-dark)";
    } else if (diff > 0) {
      pressEl.innerText = "Rising (Clearing)";
      pressEl.style.color = "#81c784";
    } else {
      pressEl.innerText = "Falling (Unstable)";
      pressEl.style.color = "#ff5252";
    }
  }
}

loadWeather();

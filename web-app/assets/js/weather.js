//approx latitude and longitude of Sila
const LAT = 39.2;
const LON = 16.8;

async function loadWeather() {
  const container = document.getElementById("weather");
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&hourly=temperature_2m`,
    );
    const weatherData = await res.json();

    const times = weatherData.hourly.time;
    const temps = weatherData.hourly.temperature_2m;

    const hourlyForecast = times.map((t, i) => ({
      time: t,
      temperature: temps[i],
    }));

    const next24h = hourlyForecast.slice(0, 24);
    const forecastList = document.getElementById("forecast-list");
    if (!forecastList) return;

    forecastList.innerHTML = "";

    const fragment = document.createDocumentFragment();

    const header = document.createElement("li");
    header.className = "forecast-row forecast-header";
    header.innerHTML = `
      <span class="forecast-time">Time</span>
      <span class="forecast-temp">Temp</span>
    `;
    fragment.appendChild(header);

    next24h.forEach((hour) => {
      const li = document.createElement("li");
      li.className = "forecast-row";

      const timeLabel = new Date(hour.time).toLocaleTimeString("it-IT", {
        hour: "2-digit",
        minute: "2-digit",
      });

      li.innerHTML = `
        <span class="forecast-time">${timeLabel}</span>
        <span class="forecast-temp">${hour.temperature} °C</span>
      `;

      fragment.appendChild(li);
    });

    forecastList.appendChild(fragment);
  } catch (err) {
    container.innerHTML =
      "<p>Unable to load weather data for Giganti della Sila.</p>";
    console.error("Weather fetch error:", err);
  }
}

loadWeather();

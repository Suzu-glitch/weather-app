import "./styles/main.scss";
import { fetchForecast } from "./api.js";
import { getConditionImagePath } from "./conditions.js";

const CITY_QUERY = "Mannheim";
const WEEKDAY_NAMES = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

const appEl = document.getElementById("app");

function applyBackground(imageUrl) {
  if (!imageUrl) {
    appEl.classList.remove("app--with-background");
    return;
  }

  appEl.style.setProperty("--detail-condition-image", `url(${imageUrl})`);
  appEl.classList.add("app--with-background");
}

function renderLoading(message) {
  appEl.classList.remove("app--with-background");
  appEl.innerHTML = `
    <div class="loading">
      <div class="loading__message">${message}</div>
      <div class="loading__spinner"></div>
    </div>
  `;
}

function renderCurrentWeather(location, current, today) {
  return `
    <div class="current-weather">
      <h2 class="current-weather__location">${location.name}</h2>
      <h1 class="current-weather__temperature">${Math.round(current.temp_c)}°</h1>
      <p class="current-weather__condition">${current.condition.text}</p>
      <div>
        H:${Math.round(today.day.maxtemp_c)}° T:${Math.round(today.day.mintemp_c)}°
      </div>
    </div>
  `;
}

function getNext24Hours(forecastDays, nowEpoch) {
  const allHours = forecastDays.flatMap((day) => day.hour);
  const startIndex = allHours.findIndex(
    (hour) => hour.time_epoch + 3600 > nowEpoch,
  );
  return allHours.slice(startIndex, startIndex + 24);
}

function renderTodayForecast(today, forecastDays, nowEpoch) {
  const hoursHtml = getNext24Hours(forecastDays, nowEpoch)
    .map((hour, index) => {
      const timeLabel =
        index === 0 ? "Jetzt" : hour.time.slice(11, 16) + " Uhr";
      return `
        <div class="hourly-forecast">
          <div>${timeLabel}</div>
          <img class="hourly-forecast__icon" src="https:${hour.condition.icon}" alt="${hour.condition.text}" />
          <div>${Math.round(hour.temp_c)}°</div>
        </div>
      `;
    })
    .join("");

  return `
    <div class="today-forecast">
      <div class="today-forecast__summary">
        Heute ${today.day.condition.text}. Wind bis zu ${today.day.maxwind_kph} km/h.
      </div>
      <div class="today-forecast__hours">${hoursHtml}</div>
    </div>
  `;
}

function getDayLabel(dateString, index) {
  if (index === 0) {
    return "Heute";
  }
  const date = new Date(dateString + "T12:00:00");
  return WEEKDAY_NAMES[date.getDay()];
}

function renderThreeDayForecast(forecastDays) {
  const daysHtml = forecastDays
    .map((forecastDay, index) => {
      return `
        <div class="forecast-day">
          <div class="forecast-day__name">${getDayLabel(forecastDay.date, index)}</div>
          <img class="forecast-day__icon" src="https:${forecastDay.day.condition.icon}" alt="${forecastDay.day.condition.text}" />
          <div>H:${Math.round(forecastDay.day.maxtemp_c)}°</div>
          <div>T:${Math.round(forecastDay.day.mintemp_c)}°</div>
          <div class="forecast-day__wind">Wind: ${forecastDay.day.maxwind_kph} km/h</div>
        </div>
      `;
    })
    .join("");

  return `
    <div class="forecast">
      <div class="forecast__title">Vorhersage für die nächsten 3 Tage:</div>
      <div class="forecast__days">${daysHtml}</div>
    </div>
  `;
}

function formatTime(timeString) {
  const [time, period] = timeString.split(" ");
  const [hoursText, minutes] = time.split(":");
  let hours = Number(hoursText);

  if (period === "PM" && hours !== 12) {
    hours += 12;
  }
  if (period === "AM" && hours === 12) {
    hours = 0;
  }

  return String(hours).padStart(2, "0") + ":" + minutes;
}

function renderMiniStats(current, today) {
  const stats = [
    { heading: "Feuchtigkeit", value: current.humidity + "%" },
    { heading: "Gefühlt", value: Math.round(current.feelslike_c) + "°" },
    {
      heading: "Sonnenaufgang",
      value: formatTime(today.astro.sunrise) + " Uhr",
    },
    {
      heading: "Sonnenuntergang",
      value: formatTime(today.astro.sunset) + " Uhr",
    },
    { heading: "Niederschlag", value: current.precip_mm + " mm" },
    { heading: "UV-Index", value: current.uv },
    { heading: "Wind", value: current.wind_kph + " km/h" },
    { heading: "Sichtweite", value: current.vis_km + " km" },
    { heading: "Luftdruck", value: current.pressure_mb + " hPa" },
  ];

  const statsHtml = stats
    .map((stat) => {
      return `
        <div class="mini-stat">
          <div class="mini-stat__heading">${stat.heading}</div>
          <div class="mini-stat__value">${stat.value}</div>
        </div>
      `;
    })
    .join("");

  return `<div class="mini-stats">${statsHtml}</div>`;
}

function renderDetails(weatherData) {
  const { location, current, forecast } = weatherData;
  const today = forecast.forecastday[0];

  applyBackground(
    getConditionImagePath(current.condition.code, current.is_day !== 1),
  );

  appEl.innerHTML =
    renderCurrentWeather(location, current, today) +
    renderTodayForecast(
      today,
      forecast.forecastday,
      current.last_updated_epoch,
    ) +
    renderThreeDayForecast(forecast.forecastday) +
    renderMiniStats(current, today);
}

async function init() {
  renderLoading("Lade Wetter für " + CITY_QUERY + "...");
  try {
    const weatherData = await fetchForecast(CITY_QUERY, 3);
    renderDetails(weatherData);
  } catch (error) {
    appEl.innerHTML = `<p>${error.message}</p>`;
  }
}

init();

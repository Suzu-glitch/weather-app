import { fetchForecast } from "../api.js";
import { getConditionImagePath } from "../conditions.js";
import { appEl, applyBackground, renderLoading } from "../dom.js";
import { BACK_ICON, FAVORITE_ICON } from "../icons.js";
import { addFavoriteCityId, getFavoriteCityIds } from "../storage.js";

const WEEKDAY_NAMES = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

function renderActionBar(isFavorite) {
  return `
    <div class="action-bar">
      <button class="action-bar__back" aria-label="Zurück">${BACK_ICON}</button>
      ${
        isFavorite
          ? ""
          : `<button class="action-bar__favorite" aria-label="Zu Favoriten hinzufügen">${FAVORITE_ICON}</button>`
      }
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
        index === 0 ? "Jetzt" : hour.time.slice(11, 13) + " Uhr";
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
          <div>Wind: ${forecastDay.day.maxwind_kph} km/h</div>
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
    { heading: "Gefühlt", value: current.feelslike_c + "°" },
    {
      heading: "Sonnenaufgang",
      value: formatTime(today.astro.sunrise) + " Uhr",
    },
    {
      heading: "Sonnenuntergang",
      value: formatTime(today.astro.sunset) + " Uhr",
    },
    { heading: "Niederschlag", value: current.precip_mm + "mm" },
    { heading: "UV-Index", value: current.uv },
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

function setupDetailsEvents(cityId, onBack) {
  const backButtonEl = document.querySelector(".action-bar__back");
  const favoriteButtonEl = document.querySelector(".action-bar__favorite");

  backButtonEl.addEventListener("click", onBack);

  if (favoriteButtonEl) {
    favoriteButtonEl.addEventListener("click", () => {
      addFavoriteCityId(cityId);
      favoriteButtonEl.remove();
    });
  }
}

function renderDetails(weatherData, cityId, onBack) {
  const { location, current, forecast } = weatherData;
  const today = forecast.forecastday[0];
  const isFavorite = getFavoriteCityIds().includes(cityId);

  applyBackground(
    getConditionImagePath(current.condition.code, current.is_day !== 1),
  );

  appEl.innerHTML =
    renderActionBar(isFavorite) +
    renderCurrentWeather(location, current, today) +
    renderTodayForecast(
      today,
      forecast.forecastday,
      current.last_updated_epoch,
    ) +
    renderThreeDayForecast(forecast.forecastday) +
    renderMiniStats(current, today);

  setupDetailsEvents(cityId, onBack);
}

export async function showCityDetails(cityId, cityName, onBack) {
  renderLoading("Lade Wetter für " + cityName + "...");

  try {
    const weatherData = await fetchForecast("id:" + cityId, 3);
    renderDetails(weatherData, cityId, onBack);
  } catch (error) {
    appEl.innerHTML = `<p>${error.message}</p>`;
  }
}

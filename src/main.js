import "./styles/main.scss";
import { fetchForecast, searchCities } from "./api.js";
import { getConditionImagePath } from "./conditions.js";
import {
  addFavoriteCityId,
  getFavoriteCityIds,
  removeFavoriteCityId,
} from "./storage.js";
import { debounce } from "./utils.js";

const WEEKDAY_NAMES = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

const appEl = document.getElementById("app");

const BACK_ICON = `
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
  </svg>
`;

const FAVORITE_ICON = `
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
    <path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
  </svg>
`;

const DELETE_ICON = `
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
`;

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

function setupDetailsEvents(cityId) {
  const backButtonEl = document.querySelector(".action-bar__back");
  const favoriteButtonEl = document.querySelector(".action-bar__favorite");

  backButtonEl.addEventListener("click", () => {
    renderMainMenu();
  });

  if (favoriteButtonEl) {
    favoriteButtonEl.addEventListener("click", () => {
      addFavoriteCityId(cityId);
      favoriteButtonEl.remove();
    });
  }
}

function renderDetails(weatherData, cityId) {
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

  setupDetailsEvents(cityId);
}

async function showCityDetails(cityId, cityName) {
  renderLoading("Lade Wetter für " + cityName + "...");

  try {
    const weatherData = await fetchForecast("id:" + cityId, 3);
    renderDetails(weatherData, cityId);
  } catch (error) {
    appEl.innerHTML = `<p>${error.message}</p>`;
  }
}

function renderMainMenuHeader() {
  return `
    <div class="main-menu__heading">
      Wetter
      <button class="main-menu__edit-button">Bearbeiten</button>
    </div>
    <div class="main-menu__search-bar">
      <input type="text" class="main-menu__search-input" placeholder="Nach Stadt suchen..." />
      <div class="main-menu__search-results main-menu__search-results--hidden"></div>
    </div>
  `;
}

function renderCityCard(cityId, weatherData) {
  const { location, current, forecast } = weatherData;
  const today = forecast.forecastday[0];
  const imageUrl = getConditionImagePath(
    current.condition.code,
    current.is_day !== 1,
  );
  const styleAttribute = imageUrl
    ? `style="--city-image: url(${imageUrl})"`
    : "";

  return `
    <div class="city-wrapper">
      <button class="city-wrapper__delete" data-city-id="${cityId}" aria-label="Stadt entfernen">${DELETE_ICON}</button>
      <div class="city" data-city-id="${cityId}" data-city-name="${location.name}" ${styleAttribute}>
        <div class="city__left-column">
          <div>
            <h2 class="city__name">${location.name}</h2>
            <div class="city__country">${location.country}</div>
          </div>
          <div>${current.condition.text}</div>
        </div>
        <div class="city__right-column">
          <div class="city__temperature">${Math.round(current.temp_c)}°</div>
          <div>H:${Math.round(today.day.maxtemp_c)}° T:${Math.round(today.day.mintemp_c)}°</div>
        </div>
      </div>
    </div>
  `;
}

async function renderCityCards() {
  const favoriteCityIds = getFavoriteCityIds();

  if (favoriteCityIds.length === 0) {
    return `<div class="main-menu__cities"><p>Noch keine Favoriten gespeichert.</p></div>`;
  }

  let cardsHtml = "";

  for (const cityId of favoriteCityIds) {
    const weatherData = await fetchForecast("id:" + cityId, 1);
    cardsHtml += renderCityCard(cityId, weatherData);
  }

  return `<div class="main-menu__cities">${cardsHtml}</div>`;
}

function setupCityEvents() {
  document.querySelectorAll(".city").forEach((cityEl) => {
    cityEl.addEventListener("click", () => {
      showCityDetails(
        cityEl.getAttribute("data-city-id"),
        cityEl.getAttribute("data-city-name"),
      );
    });
  });

  document
    .querySelectorAll(".city-wrapper__delete")
    .forEach((deleteButtonEl) => {
      deleteButtonEl.addEventListener("click", () => {
        removeFavoriteCityId(deleteButtonEl.getAttribute("data-city-id"));
        deleteButtonEl.parentElement.remove();

        if (getFavoriteCityIds().length === 0) {
          document.querySelector(".main-menu__cities").innerHTML =
            "<p>Noch keine Favoriten gespeichert.</p>";
        }
      });
    });
}

function setupEditButton() {
  const mainMenuEl = document.querySelector(".main-menu");
  const editButtonEl = document.querySelector(".main-menu__edit-button");

  editButtonEl.addEventListener("click", () => {
    const isEditMode = mainMenuEl.classList.toggle("main-menu--edit-mode");
    editButtonEl.textContent = isEditMode ? "Fertig" : "Bearbeiten";
  });
}

function showSearchResults() {
  const searchResultsEl = document.querySelector(".main-menu__search-results");
  searchResultsEl.classList.remove("main-menu__search-results--hidden");
}

function hideSearchResults() {
  const searchResultsEl = document.querySelector(".main-menu__search-results");
  searchResultsEl.classList.add("main-menu__search-results--hidden");
}

function renderSearchResults(cities) {
  const searchResultsEl = document.querySelector(".main-menu__search-results");

  if (cities.length === 0) {
    searchResultsEl.innerHTML = `<div class="search-result">Keine Städte gefunden.</div>`;
    return;
  }

  searchResultsEl.innerHTML = cities
    .map((city) => {
      return `
        <div class="search-result" data-city-id="${city.id}" data-city-name="${city.name}" tabindex="0">
          <h3 class="search-result__name">${city.name}</h3>
          <p>${city.region ? city.region + ", " : ""}${city.country}</p>
        </div>
      `;
    })
    .join("");

  document
    .querySelectorAll(".search-result[data-city-id]")
    .forEach((resultEl) => {
      resultEl.addEventListener("click", () => {
        showCityDetails(
          resultEl.getAttribute("data-city-id"),
          resultEl.getAttribute("data-city-name"),
        );
      });
    });
}

async function handleSearchInput(event) {
  const searchText = event.target.value.trim();
  const searchResultsEl = document.querySelector(".main-menu__search-results");

  if (searchText.length < 2) {
    searchResultsEl.innerHTML = "";
    return;
  }

  searchResultsEl.innerHTML = `<div class="search-result">Lade Vorschläge...</div>`;
  showSearchResults();

  try {
    const cities = await searchCities(searchText);
    renderSearchResults(cities);
  } catch (error) {
    searchResultsEl.innerHTML = `<div class="search-result">${error.message}</div>`;
  }
}

function setupSearch() {
  const searchInputEl = document.querySelector(".main-menu__search-input");

  searchInputEl.addEventListener("input", debounce(handleSearchInput, 500));
  searchInputEl.addEventListener("focus", showSearchResults);
}

document.addEventListener("click", (event) => {
  const searchBarEl = document.querySelector(".main-menu__search-bar");

  if (searchBarEl && !searchBarEl.contains(event.target)) {
    hideSearchResults();
  }
});

async function renderMainMenu() {
  renderLoading("Lade Übersicht...");

  try {
    appEl.innerHTML = `
      <div class="main-menu">
        ${renderMainMenuHeader()}
        ${await renderCityCards()}
      </div>
    `;

    setupEditButton();
    setupSearch();
    setupCityEvents();
  } catch (error) {
    appEl.innerHTML = `<p>${error.message}</p>`;
  }
}

renderMainMenu();

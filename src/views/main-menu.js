import { fetchForecast } from "../api.js";
import { getConditionImagePath } from "../conditions.js";
import { appEl, renderError, renderLoading } from "../dom.js";
import { DELETE_ICON } from "../icons.js";
import { getFavoriteCityIds, removeFavoriteCityId } from "../storage.js";
import { setupSearch } from "./search.js";

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

  const weatherDataList = await Promise.all(
    favoriteCityIds.map((cityId) => fetchForecast("id:" + cityId, 1)),
  );

  const cardsHtml = favoriteCityIds
    .map((cityId, index) => renderCityCard(cityId, weatherDataList[index]))
    .join("");

  return `<div class="main-menu__cities">${cardsHtml}</div>`;
}

function setupCityEvents(onCitySelect) {
  document.querySelectorAll(".city").forEach((cityEl) => {
    cityEl.addEventListener("click", () => {
      onCitySelect(
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

export async function renderMainMenu(onCitySelect) {
  renderLoading("Lade Übersicht...");

  try {
    appEl.innerHTML = `
      <div class="main-menu">
        ${renderMainMenuHeader()}
        ${await renderCityCards()}
      </div>
    `;

    setupEditButton();
    setupSearch(onCitySelect);
    setupCityEvents(onCitySelect);
  } catch (error) {
    renderError(error.message, [
      {
        label: "Erneut versuchen",
        handler: () => renderMainMenu(onCitySelect),
      },
    ]);
  }
}

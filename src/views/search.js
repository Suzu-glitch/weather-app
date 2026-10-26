import { searchCities } from "../api.js";
import { debounce } from "../utils.js";

function showSearchResults() {
  const searchResultsEl = document.querySelector(".main-menu__search-results");
  searchResultsEl.classList.remove("main-menu__search-results--hidden");
}

function hideSearchResults() {
  const searchResultsEl = document.querySelector(".main-menu__search-results");
  searchResultsEl.classList.add("main-menu__search-results--hidden");
}

function renderSearchResults(cities, onCitySelect) {
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
        onCitySelect(
          resultEl.getAttribute("data-city-id"),
          resultEl.getAttribute("data-city-name"),
        );
      });
    });
}

async function handleSearchInput(event, onCitySelect) {
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
    renderSearchResults(cities, onCitySelect);
  } catch (error) {
    searchResultsEl.innerHTML = `<div class="search-result">${error.message}</div>`;
  }
}

export function setupSearch(onCitySelect) {
  const searchInputEl = document.querySelector(".main-menu__search-input");

  searchInputEl.addEventListener(
    "input",
    debounce((event) => handleSearchInput(event, onCitySelect), 500),
  );
  searchInputEl.addEventListener("focus", showSearchResults);
}

document.addEventListener("click", (event) => {
  const searchBarEl = document.querySelector(".main-menu__search-bar");

  if (searchBarEl && !searchBarEl.contains(event.target)) {
    hideSearchResults();
  }
});

const API_KEY = "0f276eed9b01411da9f71744261910";
const BASE_URL = "https://api.weatherapi.com/v1";

async function fetchJson(url, errorMessage) {
  let response;

  try {
    response = await fetch(url);
  } catch (error) {
    throw new Error("Keine Verbindung zum Internet.");
  }

  if (!response.ok) {
    throw new Error(errorMessage);
  }

  return await response.json();
}

export async function fetchForecast(cityQuery, dayCount) {
  return await fetchJson(
    `${BASE_URL}/forecast.json?key=${API_KEY}&q=${cityQuery}&days=${dayCount}&lang=de`,
    "Wetterdaten konnten nicht geladen werden.",
  );
}

export async function searchCities(searchText) {
  return await fetchJson(
    `${BASE_URL}/search.json?key=${API_KEY}&q=${encodeURIComponent(searchText)}&lang=de`,
    "Die Suche ist fehlgeschlagen.",
  );
}

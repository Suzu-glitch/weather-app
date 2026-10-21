const API_KEY = "0f276eed9b01411da9f71744261910";
const BASE_URL = "https://api.weatherapi.com/v1";

export async function fetchForecast(cityQuery, dayCount) {
  const response = await fetch(
    `${BASE_URL}/forecast.json?key=${API_KEY}&q=${cityQuery}&days=${dayCount}&lang=de`,
  );

  if (!response.ok) {
    throw new Error("Wetterdaten konnten nicht geladen werden.");
  }

  return await response.json();
}

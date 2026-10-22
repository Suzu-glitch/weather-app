const FAVORITES_KEY = "favorite-cities";

export function getFavoriteCityIds() {
  return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || [];
}

export function addFavoriteCityId(cityId) {
  const favoriteCityIds = getFavoriteCityIds();

  if (favoriteCityIds.includes(cityId)) {
    return;
  }

  favoriteCityIds.push(cityId);
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favoriteCityIds));
}

export function removeFavoriteCityId(cityId) {
  const remainingCityIds = getFavoriteCityIds().filter((id) => id !== cityId);
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(remainingCityIds));
}

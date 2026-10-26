import "./styles/main.scss";
import { renderMainMenu } from "./views/main-menu.js";
import { showCityDetails } from "./views/details.js";

function openMainMenu() {
  renderMainMenu(openCityDetails);
}

function openCityDetails(cityId, cityName) {
  showCityDetails(cityId, cityName, openMainMenu);
}

openMainMenu();

export const appEl = document.getElementById("app");

export function applyBackground(imageUrl) {
  if (!imageUrl) {
    appEl.classList.remove("app--with-background");
    return;
  }

  appEl.style.setProperty("--detail-condition-image", `url(${imageUrl})`);
  appEl.classList.add("app--with-background");
}

export function renderLoading(message) {
  appEl.classList.remove("app--with-background");
  appEl.innerHTML = `
    <div class="loading">
      <div class="loading__message">${message}</div>
      <div class="loading__spinner"></div>
    </div>
  `;
}

export function renderError(message, actions) {
  appEl.classList.remove("app--with-background");

  const buttonsHtml = actions
    .map((action, index) => {
      return `<button class="error__button" data-action-index="${index}">${action.label}</button>`;
    })
    .join("");

  appEl.innerHTML = `
    <div class="error">
      <p class="error__message">${message}</p>
      <div class="error__actions">${buttonsHtml}</div>
    </div>
  `;

  document.querySelectorAll(".error__button").forEach((buttonEl) => {
    buttonEl.addEventListener("click", () => {
      actions[buttonEl.getAttribute("data-action-index")].handler();
    });
  });
}

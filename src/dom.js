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

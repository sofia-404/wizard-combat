"use strict";
const tabs = [...document.querySelectorAll('[role="tab"]')];
const descriptions = {
  menu: "Главное меню приглашает к первому действию. Знак жеста заменяет герб, а спокойная композиция оставляет место воображению.",
  training:
    "Тренировка отделяет область жеста от инструкции. Холодный свет показывает траекторию, а три отметки делают прогресс понятным.",
  fight:
    "Концепция поединка сохраняет свободный центр. Статус и заклинание остаются по краям. Мишень и отклик здесь — только визуальная демонстрация.",
};
function showScreen(name, focus = false) {
  tabs.forEach((tab) => {
    const active = tab.id === `tab-${name}`;
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
    document.getElementById(tab.getAttribute("aria-controls")).hidden = !active;
    if (active && focus) tab.focus();
  });
  document.getElementById("screen-description").textContent =
    descriptions[name];
}
tabs.forEach((tab, index) => {
  tab.addEventListener("click", () => showScreen(tab.id.replace("tab-", "")));
  tab.addEventListener("keydown", (event) => {
    let target;
    if (event.key === "ArrowRight") target = (index + 1) % tabs.length;
    if (event.key === "ArrowLeft")
      target = (index + tabs.length - 1) % tabs.length;
    if (event.key === "Home") target = 0;
    if (event.key === "End") target = tabs.length - 1;
    if (target !== undefined) {
      event.preventDefault();
      showScreen(tabs[target].id.replace("tab-", ""), true);
    }
  });
});
document
  .querySelectorAll("[data-screen]")
  .forEach((button) =>
    button.addEventListener("click", () =>
      showScreen(button.dataset.screen, true),
    ),
  );
document.querySelectorAll("[data-scroll]").forEach((button) =>
  button.addEventListener("click", () => {
    const section = document.getElementById(button.dataset.scroll);
    section.scrollIntoView();
    section.querySelector("button")?.focus({ preventScroll: true });
  }),
);
let casts = 0;
const castButton = document.getElementById("simulate-cast");
function updateCast() {
  document.getElementById("cast-count").textContent = `${casts} / 3`;
  document
    .querySelectorAll(".segments i")
    .forEach((el, index) => el.classList.toggle("filled", index < casts));
  castButton.disabled = casts === 3;
  castButton.textContent =
    casts === 3 ? "Три жеста выполнены" : "Показать точный жест";
  document.getElementById("training-instruction").textContent =
    casts === 3 ? "Точность закреплена." : "Вправо. Затем вниз.";
  document.getElementById("training-status").textContent =
    casts === 3
      ? "Демонстрация завершена. Начните заново, чтобы повторить."
      : casts
        ? `Точный жест показан. Ещё ${3 - casts} до завершения демо.`
        : "Демо управляется кнопкой. Камера не используется.";
}
castButton.addEventListener("click", () => {
  casts = Math.min(3, casts + 1);
  updateCast();
});
document.getElementById("reset-cast").addEventListener("click", () => {
  casts = 0;
  updateCast();
  castButton.focus();
});
let fightOn = false;
document.getElementById("simulate-fight").addEventListener("click", (event) => {
  fightOn = !fightOn;
  document.getElementById("screen-fight").classList.toggle("is-cast", fightOn);
  document.getElementById("fight-message").textContent = fightOn
    ? "Жест завершён."
    : "Выберите момент.";
  document.getElementById("fight-badge").textContent = fightOn
    ? "Демонстрационный отклик"
    : "Ожидание жеста";
  event.currentTarget.textContent = fightOn
    ? "Сбросить отклик"
    : "Показать отклик";
});
document.getElementById("demo-action").addEventListener("click", () => {
  document.getElementById("button-status").textContent =
    "Готово. Это пример ответа на действие; игровая сессия не запускается.";
});
document.getElementById("demo-sound").addEventListener("change", (event) => {
  document.getElementById("sound-status").textContent =
    `${event.target.checked ? "Включён" : "Выключен"} · демонстрационный переключатель`;
});
document.getElementById("demo-error").addEventListener("input", (event) => {
  const valid = event.target.value.trim().length > 0;
  event.target.setAttribute("aria-invalid", String(!valid));
  const hint = document.getElementById("name-error");
  hint.textContent = valid
    ? "Имя указано. Ошибка исправлена."
    : "Введите имя, чтобы продолжить.";
  hint.classList.toggle("field-error", !valid);
  hint.classList.toggle("field-hint", valid);
});
document.querySelectorAll("[data-color]").forEach((button) =>
  button.addEventListener("click", async () => {
    const status = document.getElementById("color-status");
    try {
      await navigator.clipboard.writeText(button.dataset.color);
      status.textContent = `Цвет ${button.dataset.color} скопирован.`;
    } catch {
      status.textContent = `Цвет для копирования: ${button.dataset.color}`;
    }
  }),
);

document.getElementById("demo-secondary").addEventListener("click", () => {
  showScreen("menu", true);
  document.getElementById("screens").scrollIntoView();
});

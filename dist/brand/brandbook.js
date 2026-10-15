"use strict";
const tabs = [...document.querySelectorAll('[role="tab"]')];
const descriptions = {
  menu: "The main menu invites a first action. A gesture mark takes the place of a crest, while the quiet composition leaves room for imagination.",
  training:
    "Training separates the gesture area from instructions. Cool light shows the path, and three marks make progress clear.",
  fight:
    "The duel concept keeps the center clear. Status and spell controls stay at the edges. The target and feedback are visual demonstrations only.",
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
    casts === 3 ? "Three gestures complete" : "Show precise gesture";
  document.getElementById("training-instruction").textContent =
    casts === 3 ? "Precision established." : "Right. Then down.";
  document.getElementById("training-status").textContent =
    casts === 3
      ? "Demo complete. Start again to repeat it."
      : casts
        ? `Precise gesture shown. ${3 - casts} more to complete the demo.`
        : "Use the button to run this demo. No camera is used.";
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
    ? "Gesture complete."
    : "Choose your moment.";
  document.getElementById("fight-badge").textContent = fightOn
    ? "Demo feedback"
    : "Awaiting gesture";
  event.currentTarget.textContent = fightOn
    ? "Reset feedback"
    : "Show feedback";
});
document.getElementById("demo-action").addEventListener("click", () => {
  document.getElementById("button-status").textContent =
    "Done. This is a sample response; no game session has started.";
});
document.getElementById("demo-sound").addEventListener("change", (event) => {
  document.getElementById("sound-status").textContent =
    `${event.target.checked ? "On" : "Off"} · demo toggle`;
});
document.getElementById("demo-error").addEventListener("input", (event) => {
  const valid = event.target.value.trim().length > 0;
  event.target.setAttribute("aria-invalid", String(!valid));
  const hint = document.getElementById("name-error");
  hint.textContent = valid
    ? "Name entered. Error resolved."
    : "Enter a name to continue.";
  hint.classList.toggle("field-error", !valid);
  hint.classList.toggle("field-hint", valid);
});
document.querySelectorAll("[data-color]").forEach((button) =>
  button.addEventListener("click", async () => {
    const status = document.getElementById("color-status");
    try {
      await navigator.clipboard.writeText(button.dataset.color);
      status.textContent = `Color ${button.dataset.color} copied.`;
    } catch {
      status.textContent = `Color to copy: ${button.dataset.color}`;
    }
  }),
);

document.getElementById("demo-secondary").addEventListener("click", () => {
  showScreen("menu", true);
  document.getElementById("screens").scrollIntoView();
});

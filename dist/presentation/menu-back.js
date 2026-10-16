// Keep the return control's content and setup in one place.
export function setupMenuBack(onBack) {
  for (const button of document.querySelectorAll('button[data-back]')) {
    button.classList.add('menu-back');
    button.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m10 5-7 7 7 7M3 12h18"/></svg><span>Back to menu</span>';
    button.addEventListener('click', event => onBack(event.detail === 0));
  }
}

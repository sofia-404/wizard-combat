// Keep a short, in-memory history. Each row describes one completed event.
export function createFightEvents(list, empty) {
  const timeFormat = new Intl.DateTimeFormat('en-GB', {
    hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false
  });
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let slide;
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) slide?.cancel();
  });
  return {
    add(message, detail = '') {
      const row = document.createElement('li');
      const time = document.createElement('time');
      const date = new Date();
      time.dateTime = date.toISOString();
      time.textContent = timeFormat.format(date);
      const title = document.createElement('strong');
      title.textContent = message;
      const heading = document.createElement('div');
      heading.className = 'fight-event-heading';
      heading.append(title, time);
      row.append(heading);
      if (detail) {
        const description = document.createElement('p');
        description.textContent = detail;
        row.append(description);
      }
      // Continue from the current position if another event arrives mid-slide.
      const previous = list.firstElementChild?.firstElementChild;
      const previousTop = previous?.getBoundingClientRect().top;
      slide?.cancel();
      empty.hidden = true;
      list.prepend(row);
      while (list.children.length > 50) list.lastElementChild.remove();
      if (!reducedMotion.matches && list.getClientRects().length) {
        const offset = previous
          ? previousTop - previous.getBoundingClientRect().top
          : -row.getBoundingClientRect().height;
        slide = list.animate([
          {transform:`translateY(${offset}px)`},
          {transform:'translateY(0)'}
        ], {duration:380, easing:'cubic-bezier(0.25, 0.1, 0.25, 1)'});
      }
    },
    clear() {
      slide?.cancel();
      list.replaceChildren();
      empty.hidden = false;
    }
  };
}

// Display only. The Shield model decides when protection ends.
export function createShieldView(svg, status, shield, bounds) {
  const ns = 'http://www.w3.org/2000/svg';
  const make = (tag, attributes, parent = svg) => {
    const node = document.createElementNS(ns, tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    parent.append(node);
    return node;
  };
  const defs = make('defs', {});
  const gradient = make('radialGradient', {id: svg.id+'-surface'}, defs);
  for (const [offset, opacity] of [['0%', '.01'], ['75%', '.03'], ['94%', '.15'], ['100%', '.35']]) {
    make('stop', {offset, 'stop-color': 'currentColor', 'stop-opacity': opacity}, gradient);
  }
  // Keep the larger radius. Clip at the view edge instead of squeezing the sphere.
  const circle = {cx: bounds.cx, cy: bounds.cy, r: Math.max(bounds.rx, bounds.ry)};
  make('circle', {...circle, fill: `url(#${svg.id}-surface)`, stroke: 'currentColor', 'stroke-width': 3, 'stroke-opacity': .75});
  make('circle', {...circle, r: circle.r*.9, fill: 'none', stroke: 'currentColor', 'stroke-width': 1, 'stroke-opacity': .2});
  let timer;
  function refresh(color) {
    clearTimeout(timer);
    if (color) svg.style.color = color;
    const active = shield.active(performance.now());
    svg.classList.toggle('shield-active', active);
    if (status) status.textContent = active ? 'Shield active' : 'Shield inactive';
    if (active) timer = setTimeout(() => refresh(), Math.max(1, shield.expiresAt-performance.now()));
  }
  refresh();
  return {refresh, clear() { shield.reset(); refresh(); }};
}

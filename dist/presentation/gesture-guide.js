import {spellList} from '../spells/index.js';

export function renderSpellChoices(select, examples) {
  const selected = select.value;
  const option = (value, label) => {
    const node = document.createElement('option');
    node.value = value; node.textContent = label;
    return node;
  };
  select.replaceChildren(option('Any', 'Any shape'), ...spellList.map(spell => option(spell.label, spell.label)));
  if ([...select.options].some(item => item.value === selected)) select.value = selected;
  examples.replaceChildren(...spellList.map(spell => {
    const row = document.createElement('div'), text = document.createElement('div');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', spell.guide.viewBox);
    if (spell.guide.label) { svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', spell.guide.label); }
    for (const [tag, attributes] of spell.guide.elements) {
      const element = document.createElementNS(svg.namespaceURI, tag);
      for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
      svg.append(element);
    }
    const label = document.createElement('b'), hint = document.createElement('span');
    label.textContent = spell.label; hint.textContent = spell.description;
    text.append(label, hint); row.append(svg, text);
    return row;
  }));
}

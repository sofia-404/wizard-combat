import {replaceGlobal} from './async.mjs';

// Minimal DOM for controller tests. Game rules and health updates stay real.
export function element(id = '') {
  const attributes = new Map(), queries = new Map(), children = [];
  return Object.assign(new EventTarget(), {
    id, hidden:false, textContent:'', dataset:{}, children, options:children,
    classList:{toggle(){}}, focus(){},
    setAttribute(key, value) {attributes.set(key, String(value));},
    getAttribute:key => attributes.get(key) ?? null,
    querySelector(selector) {
      if (!queries.has(selector)) queries.set(selector, element(id + ' ' + selector));
      return queries.get(selector);
    },
    querySelectorAll:() => [], cloneNode:() => element(),
    append(...items) {for (const child of items) {children.push(child); child.parentElement = this;}},
    prepend(child) {children.unshift(child); child.parentElement = this;},
    replaceChildren(...items) {for (const child of [...children]) child.remove(); this.append(...items);},
    remove() {
      if (this.parentElement) {
        const siblings = this.parentElement.children;
        siblings.splice(siblings.indexOf(this), 1);
        this.parentElement = null;
      }
    },
    content:{querySelector:() => element()}
  });
}

export function combatHarness(t) {
  const nodes = new Map(), effects = new Map(), records = [], cancellations = [];
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, element(id));
    return nodes.get(id);
  };
  const document = Object.assign(new EventTarget(), {
    hidden:false, getElementById:node, querySelector:node,
    createElement:() => element(), createElementNS:() => element()
  });
  const window = new EventTarget();
  let now = 100;
  for (const [name, value] of Object.entries({document, window, performance:{now:() => now},
    combatEffects:effects, combatRecords:records, combatCancellations:cancellations})) replaceGlobal(t, name, value);
  t.mock.timers.enable({apis:['setTimeout', 'setInterval']});
  const replacements = {
    'app.js':`export const record = event => globalThis.combatRecords.push(event);
      export const cancelGestureCapture = reason => globalThis.combatCancellations.push(reason);
      export const toggleGameCamera = () => {};`,
    // Keep callbacks available to test delivery after cancellation. Count cleanup calls.
    'practice-arena-effects.js':`export function createSpellEffects(node, impact) {
      const effect = {shots:[], impact, clears:0, cancelled:0, cast(shot){this.shots.push(shot);},
        clear(){this.clears++;}, cancelFlights(){this.cancelled++;}};
      globalThis.combatEffects.set(node.id, effect); return effect;
    }`,
    'practice-arena-reactions.js':`export const createDummyReactions = () => ({react(){}, reset(){}, settle(){}});
      export const createPlayerReactions = createDummyReactions;`,
    'practice-arena-gesture.js':"export const createGestureMirror = () => ({start(){}, stop(){}});",
    'presentation/combat-status.js':"export const createCombatStatus = () => ({render(){}});",
    'presentation/shield-view.js':"export const createShieldView = () => ({refresh(){}});",
    'presentation/opponent-charge.js':"export const createOpponentCharge = () => ({refresh(){}, clear(){}});",
    'presentation/practice-arena-events.js':"export const createPracticeArenaEvents = () => ({add(){}, clear(){}});",
    'presentation/game-camera.js':"export const syncGameCamera = () => {};"
  };
  return {node, document, window, effects, records, cancellations, replacements,
    get now(){return now;},
    advance(ms) {
      while (ms > 0) {const step = Math.min(ms, 50); now += step; t.mock.timers.tick(step); ms -= step;}
    }
  };
}

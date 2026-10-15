import {damageValue} from './damage.js';
import {applyDisarm} from './disarm.js';
import {applyShield} from './shield.js';

export const effects = Object.freeze({
  damage: {value: damageValue},
  disarm: {apply: applyDisarm},
  shield: {apply: applyShield}
});

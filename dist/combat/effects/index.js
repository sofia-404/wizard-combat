import {damageValue} from './damage.js';
import {applyDisarm} from './disarm.js';

export const effects = Object.freeze({
  damage: {value: damageValue},
  disarm: {apply: applyDisarm}
});

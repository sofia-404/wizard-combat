// Shared balance settings. All modes use the same player rules and spell effects.
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
export const COMBAT_RULES = freeze({
  health:200, readyMs:3000, shieldMs:2000, shieldCooldownMs:4000,
  perfectMs:400, counterMs:1500, disarmMs:2000, disarmProtectionMs:4000,
  castCueMs:2000
});
export const COMBAT_SPELLS = freeze({
  'Basic Cast': {damage:20, flightMs:1000, recoveryMs:600},
  Confringo: {damage:40, flightMs:1200, recoveryMs:2000},
  Expelliarmus: {damage:10, flightMs:1100, recoveryMs:800},
  Protego: {damage:0, flightMs:0, recoveryMs:0}
});
export const DIFFICULTIES = freeze({
  easy: {noticeMs:350, shieldPrepareMs:600, shieldChance:.45, attackGapMs:8000,
    warnings:{'Basic Cast':3200, Confringo:3400}, limitFactor:1.35, captureMs:9000},
  normal: {noticeMs:300, shieldPrepareMs:600, shieldChance:.70, attackGapMs:6500,
    warnings:{'Basic Cast':2600, Confringo:2800}, limitFactor:1, captureMs:6000},
  hard: {noticeMs:180, shieldPrepareMs:370, shieldChance:.85, attackGapMs:5000,
    warnings:{'Basic Cast':2100, Confringo:2300}, limitFactor:.7, captureMs:3500}
});
export const difficultyProfile = name => DIFFICULTIES[Object.hasOwn(DIFFICULTIES, name) ? name : 'normal'];
export const spellRule = shape => Object.hasOwn(COMBAT_SPELLS, shape) ? COMBAT_SPELLS[shape] : null;

import {COMBAT_SPELLS} from '../../combat/rules.js';
export default {
  id: 'confringo', label: 'Confringo', kind: 'spell', version: 1,
  description: 'Right, down-left, then right. Either end can be the start. No mirror image.',
  gesture: {checker: 'zigzag', scoreScale: .15, diagnosticKey: 'confringo', strokeDiagnostics: true},
  guide: {
    viewBox: '0 0 60 60', label: 'Confringo: start at the dot. Move right, down-left, then right. Pause at the end.',
    elements: [
      ['circle', {cx: 10, cy: 10, r: 3}],
      ['path', {d: 'M13 10H50L10 50H46'}],
      ['path', {d: 'M27 6L31 10L27 14M28 25V32H35M28 46L32 50L28 54'}],
      ['path', {d: 'M50 46L54 50L50 54L46 50Z'}]
    ]
  },
  effects: [{type: 'damage', tiers: [{minScore: 0, value: COMBAT_SPELLS['Confringo'].damage}]}],
  visuals: {cast: 'dummy-hit', color: '#ef4444'},
  sound: '/spells/confringo/cast.wav',
  lesson: null
};

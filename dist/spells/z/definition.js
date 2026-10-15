export default {
  id: 'z', label: 'Z', kind: 'shape', version: 1,
  description: 'Match this Z on screen. No reflected Z.',
  gesture: {checker: 'zigzag', scoreScale: .15, diagnosticKey: 'z', strokeDiagnostics: true},
  guide: {viewBox: '0 0 60 60', elements: [['path', {d: 'M10 10H50L10 50H50'}]]},
  effects: [{type: 'damage', tiers: [{minScore: 88, value: 30}, {minScore: 78, value: 25}, {minScore: 0, value: 20}]}],
  visuals: {cast: 'dummy-hit', color: '#ffe19a'},
  lesson: null
};

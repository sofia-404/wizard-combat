export default {
  id: 'circle', label: 'Circle', kind: 'shape', version: 1,
  description: 'Small gap allowed. Extra loops cast once.',
  gesture: {checker: 'loop', scoreScale: .45, diagnosticKey: 'circle', strokeDiagnostics: false},
  guide: {viewBox: '0 0 60 60', elements: [['circle', {cx: 30, cy: 30, r: 21}]]},
  effects: [{type: 'damage', tiers: [{minScore: 88, value: 30}, {minScore: 78, value: 25}, {minScore: 0, value: 20}]}],
  visuals: {cast: 'dummy-hit', color: '#8ce8ff'},
  lesson: null
};

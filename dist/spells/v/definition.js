export default {
  id: 'v', label: 'V', kind: 'shape', version: 1,
  description: 'Down, then up. Either direction.',
  gesture: {checker: 'valley', scoreScale: .15, diagnosticKey: 'v', strokeDiagnostics: true},
  guide: {viewBox: '0 0 60 60', elements: [['path', {d: 'M10 10L30 50L50 10'}]]},
  effects: [{type: 'damage', tiers: [{minScore: 88, value: 30}, {minScore: 78, value: 25}, {minScore: 0, value: 20}]}],
  visuals: {cast: 'dummy-hit', color: '#c5a0ff'},
  lesson: null
};

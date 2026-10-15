export default {
  id: 'expelliarmus', label: 'Expelliarmus', kind: 'spell', version: 1,
  description: 'Start at the dot. Right, then down. Do not pause at the corner.',
  gesture: {checker: 'ordered-corner', scoreScale: .15, diagnosticKey: 'expelliarmus', strokeDiagnostics: true, startsIntent: true},
  guide: {
    viewBox: '0 0 60 60', label: 'Start at the dot. Move right, then down.',
    elements: [['circle', {cx: 10, cy: 10, r: 3}], ['path', {d: 'M13 10H48V50M28 6L33 10L28 14M43 44L48 50L53 44'}]]
  },
  effects: [
    {type: 'damage', tiers: [{minScore: 88, value: 30}, {minScore: 78, value: 25}, {minScore: 0, value: 20}]},
    {type: 'disarm', durationMs: 2000, repeat: 'refresh'}
  ],
  visuals: {cast: 'dummy-hit', color: '#ff927e'},
  lesson: {
    requiredCasts: 3,
    start: 'Hold still. Draw right, then down. Pause at the end.',
    idle: 'Start the lesson. Make three correct Expelliarmus casts.',
    complete: 'Lesson complete. Three correct Expelliarmus casts.',
    correction: 'Draw Expelliarmus: right, then down.'
  }
};

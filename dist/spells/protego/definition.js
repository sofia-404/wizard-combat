export default {
  id: 'protego', label: 'Protego', kind: 'spell', version: 1,
  description: 'Draw a circle in either direction. Small gaps are allowed. Extra loops cast once.',
  gesture: {checker: 'loop', scoreScale: .45, diagnosticKey: 'protego', strokeDiagnostics: false},
  guide: {viewBox: '0 0 60 60', label: 'Protego: draw a circle in either direction, then pause.', elements: [['circle', {cx: 30, cy: 30, r: 21}]]},
  effects: [{type: 'shield', target: 'self', durationMs: 3000, repeat: 'refresh'}],
  visuals: {cast: 'shield', color: '#8ce8ff'},
  lesson: null
};

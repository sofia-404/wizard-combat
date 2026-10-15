export default {
  id: 'basic-cast', label: 'Basic Cast', kind: 'spell', version: 1,
  description: 'Start at the dot. Down, then up. Either direction. Pause at the end.',
  gesture: {checker: 'valley', scoreScale: .15, diagnosticKey: 'basiccast', strokeDiagnostics: true},
  guide: {
    viewBox: '0 0 60 60', label: 'Basic Cast: start at the dot. Move down, then up. Either direction. Pause at the end.',
    elements: [
      ['circle', {cx: 10, cy: 10, r: 3}],
      ['path', {d: 'M11.5 13L30 50L48.5 13'}],
      ['path', {d: 'M14 29L20 30L23 24M34 33L40 30L42 37'}],
      ['path', {d: 'M50 6L54 10L50 14L46 10Z'}]
    ]
  },
  effects: [{type: 'damage', tiers: [{minScore: 88, value: 30}, {minScore: 78, value: 25}, {minScore: 0, value: 20}]}],
  visuals: {cast: 'dummy-hit', color: '#c5a0ff'},
  lesson: null
};

import {ROUND_RULES} from '../combat/rounds.js';

// Used only by Practice Arena and Solo Duel.
export function createRoundView(arena, targetName) {
  const banner = document.createElement('div');
  banner.className = 'arena-round-banner';
  banner.setAttribute('role', 'status');
  banner.setAttribute('aria-live', 'polite');
  banner.setAttribute('aria-atomic', 'true');
  banner.hidden = true;
  const title = document.createElement('span');
  banner.append(title);
  arena.append(banner);
  const scores = ['player', 'dummy'].map(actor => {
    const score = document.createElement('span');
    score.className = 'arena-round-score';
    score.setAttribute('role', 'img');
    for (let i = 0; i < ROUND_RULES.wins; i++) {
      const mark = document.createElement('i');
      mark.setAttribute('aria-hidden', 'true');
      score.append(mark);
    }
    arena.querySelector('.combatant-' + actor).append(score);
    return score;
  });
  return {
    render(rounds) {
      arena.dataset.roundPhase = rounds.phase;
      arena.dataset.round = String(rounds.number);
      const text = rounds.phase === 'intro' ? `Round ${rounds.number}` : rounds.phase === 'fight' ? 'Fight'
        : rounds.phase === 'result' ? `${rounds.winner === 'player' ? 'Player' : targetName} wins round ${rounds.number}` : '';
      // A stopped camera uses the same central space as the banner.
      banner.hidden = !text || !rounds.ready;
      if (title.textContent !== text) title.textContent = text;
      for (const [index, actor] of ['player', 'opponent'].entries()) {
        const wins = rounds.wins[actor];
        const label = `${index ? targetName : 'Player'}: ${wins} of ${ROUND_RULES.wins} round wins`;
        if (scores[index].getAttribute('aria-label') !== label) scores[index].setAttribute('aria-label', label);
        [...scores[index].children].forEach((mark, i) => mark.classList.toggle('is-won', i < wins));
      }
    }
  };
}

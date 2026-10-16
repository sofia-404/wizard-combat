export const ROUND_RULES = Object.freeze({wins:2, introMs:1500, fightMs:500, resultMs:2000, timeMs:100000});

// Match state only. The arena supplies readiness, time, and the round winner.
export class Rounds {
  constructor() { this.reset(); }
  reset() {
    this.number = 1;
    this.wins = {player:0, opponent:0};
    this.winner = null;
    this.phase = 'waiting';
    this.remaining = 0;
    this.timeRemaining = ROUND_RULES.timeMs;
    this.lastAt = null;
    this.ready = false;
  }
  get over() { return this.phase === 'complete'; }
  get active() { return this.ready && this.phase === 'active'; }
  update(now, ready) {
    const elapsed = this.ready && this.lastAt !== null ? Math.max(0, now - this.lastAt) : 0;
    this.lastAt = now;
    this.ready = ready;
    if (!ready || this.over) return;
    if (this.phase === 'waiting') {
      this.phase = 'intro';
      this.remaining = ROUND_RULES.introMs;
    } else if (this.phase === 'active') {
      this.timeRemaining = Math.max(0, this.timeRemaining - elapsed);
    } else {
      this.remaining = Math.max(0, this.remaining - elapsed);
      if (this.remaining > 0) return;
      // Do not skip announcements after a delayed frame.
      if (this.phase === 'intro') {
        this.phase = 'fight';
        this.remaining = ROUND_RULES.fightMs;
      } else if (this.phase === 'fight') {
        this.phase = 'active';
      } else if (this.phase === 'result') {
        this.number++;
        this.phase = 'intro';
        this.remaining = ROUND_RULES.introMs;
        this.timeRemaining = ROUND_RULES.timeMs;
      }
    }
  }
  finish(winner) {
    if (!this.active || !Object.hasOwn(this.wins, winner)) return false;
    this.wins[winner]++;
    this.winner = winner;
    this.phase = this.wins[winner] === ROUND_RULES.wins ? 'complete' : 'result';
    this.remaining = this.over ? 0 : ROUND_RULES.resultMs;
    return true;
  }
}

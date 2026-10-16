// Shared status copy. Keep combat availability separate from hand tracking.
export function createCombatStatus(mount, fighter) {
  const status = document.createElement('p');
  status.className = 'combat-status';
  status.hidden = true;
  mount.after(status);
  return {
    render(now, active) {
      status.hidden = !active;
      if (!active) return;
      const seconds = until => (Math.max(0, until - now) / 1000).toFixed(1);
      const release = fighter.disarmed ? `Disarmed · ${seconds(fighter.returnAt)} s`
        : fighter.queued ? `Spell ready: ${fighter.queued.shape} · ${seconds(fighter.recoveryUntil)} s`
        : now < fighter.recoveryUntil ? `Recovering · ${seconds(fighter.recoveryUntil)} s` : 'Ready to cast';
      const shield = now < fighter.shieldReadyAt ? `Protego in ${seconds(fighter.shieldReadyAt)} s` : 'Protego ready';
      const text = `${release}. ${shield}.`;
      if (status.textContent !== text) status.textContent = text;
    }
  };
}

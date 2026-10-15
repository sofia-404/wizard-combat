import {defaultLessonSpell, spells, spellForShape} from '../spells/index.js';

// Lesson state belongs to the player, never to the shared spell definition.
export class SpellLesson {
  constructor(spellId = defaultLessonSpell.id) {
    this.spell = spells[spellId];
    if (!this.spell?.lesson) throw new Error(`No lesson for spell: ${spellId}`);
    this.requiredCasts = this.spell.lesson.requiredCasts;
    this.stop();
  }
  start() { this.state = 'active'; this.count = 0; this.message = this.spell.lesson.start; }
  stop() { this.state = 'idle'; this.count = 0; this.message = this.spell.lesson.idle; }
  update(event) {
    if (this.state !== 'active') return;
    if (event.type === 'cast' && event.accepted && spellForShape(event.shape)?.id === this.spell.id) {
      this.count++;
      if (this.count === this.requiredCasts) { this.state = 'complete'; this.message = this.spell.lesson.complete; }
      else this.message = `Correct. ${this.count} of ${this.requiredCasts} casts. Draw the next spell.`;
    } else if (event.type === 'cast') this.message = `That was ${event.shape}. ${this.spell.lesson.correction}`;
    else if (event.type === 'cancel') this.message = 'No cast. ' + event.reason;
    else if (event.type === 'reject' || event.type === 'ignored') this.message = 'No cast. Follow the path. Pause only at the end.';
  }
}

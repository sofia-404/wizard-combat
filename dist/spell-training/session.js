import {defaultLessonSpell, spells} from '../spells/index.js';
import {SpellLesson} from './lesson.js';

class SelectedSpellLesson extends SpellLesson {
  constructor(spell) {
    super();
    // Add lesson text locally. Shared spell definitions stay unchanged.
    this.spell = {...spell, lesson: {...(spell.lesson || {
      requiredCasts: 3,
      idle: `Start the lesson. Make three correct ${spell.label} casts.`,
      complete: `Lesson complete. Three correct ${spell.label} casts.`,
      correction: `Draw ${spell.label}. ${spell.description}`
    }), start: 'Hold still. Follow the guide.'}};
    if (spell.id === 'protego') Object.assign(this.spell.lesson, {
      start: 'Watch the opponent. Cast Protego before the spell hits.',
      idle: 'Start the camera. Block three attacks with Protego.',
      complete: 'Lesson complete. Three attacks blocked with Protego.'
    });
    this.requiredCasts = 3;
    this.stop();
  }
  update(event) {
    if (this.spell.id !== 'protego') { super.update(event); return; }
    if (this.state !== 'active') return;
    if (event.type === 'block' && event.blocked === true) {
      this.count++;
      if (this.count === this.requiredCasts) {
        this.state = 'complete';
        this.message = this.spell.lesson.complete;
      } else this.message = `Blocked. ${this.count} of ${this.requiredCasts} attacks. Watch for the next spell.`;
    } else if (event.type === 'hit') {
      this.message = 'The spell hit you. Cast Protego before the next spell hits.';
    } else if (event.type === 'cast' && event.accepted && event.shape === 'Protego') {
      this.message = 'Protego cast. Block an incoming spell within 3 seconds to count.';
    } else if (event.type !== 'block') super.update(event);
  }
}

export class SpellTrainingSession {
  constructor(spellId = defaultLessonSpell.id) {
    this.learned = new Set();
    this.lessons = new Map();
    this.seenEvents = new WeakSet();
    this.seenCastIds = new Set();
    this.select(spellId);
  }
  get spell() { return spells[this.spellId]; }
  get lesson() { return this.lessons.get(this.spellId); }
  get state() { return this.lesson.state; }
  get count() { return this.lesson.count; }
  get requiredCasts() { return this.lesson.requiredCasts; }
  get message() { return this.lesson.message; }
  select(spellId) {
    if (!Object.hasOwn(spells, spellId)) throw new Error(`Unknown spell: ${spellId}`);
    if (!this.lessons.has(spellId)) this.lessons.set(spellId, new SelectedSpellLesson(spells[spellId]));
    this.spellId = spellId;
  }
  start() { this.lesson.start(); }
  stop() { this.lesson.stop(); }
  stopActive() {
    for (const lesson of this.lessons.values()) if (lesson.state === 'active') lesson.stop();
  }
  update(event) {
    if (this.state !== 'active' || !event || typeof event !== 'object') return;
    if (event.type === 'cast' || event.type === 'block') {
      if (this.seenEvents.has(event)) return;
      const castId = 'castId' in event ? event.castId : event.id;
      if ('castId' in event || 'id' in event) {
        if (!(typeof castId === 'string' && castId.trim()) &&
            !(typeof castId === 'number' && Number.isFinite(castId))) return;
        if (this.seenCastIds.has(castId)) return;
        this.seenCastIds.add(castId);
      }
      this.seenEvents.add(event);
    }
    this.lesson.update(event);
    if (this.state === 'complete') this.learned.add(this.spellId);
  }
}

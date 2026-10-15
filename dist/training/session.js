import {defaultLessonSpell, spells} from '../spells/index.js';
import {SpellLesson} from './lesson.js';

class SelectedSpellLesson extends SpellLesson {
  constructor(spell) {
    super();
    // Add lesson text locally. Shared spell definitions stay unchanged.
    this.spell = spell.lesson ? spell : {...spell, lesson: {
      requiredCasts: 3,
      start: `Hold still. Follow the ${spell.label} path. Pause at the end.`,
      idle: `Start the lesson. Make three correct ${spell.label} casts.`,
      complete: `Lesson complete. Three correct ${spell.label} casts.`,
      correction: `Draw ${spell.label}. ${spell.description}`
    }};
    this.requiredCasts = 3;
    this.stop();
  }
}

export class TrainingSession {
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
  update(event) {
    if (this.state !== 'active' || !event || typeof event !== 'object') return;
    if (event.type === 'cast') {
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

import assert from 'node:assert/strict';
import test from 'node:test';
import {createMenuAudio} from '../dist/menu-audio.js';

test('game audio follows scenes, mute, visibility, defeat, and page exit', t => {
  const mockGlobal = (name, value) => {
    const saved = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, {value, configurable:true, writable:true});
    t.after(() => {if(saved)Object.defineProperty(globalThis, name, saved);else delete globalThis[name];});
  };
  const sounds = new Map();
  mockGlobal('Audio', class {
    constructor(path) { this.paused = true; this.currentTime = 0; this.plays = 0; sounds.set(path, this); }
    play() { this.paused = false; this.plays++; return Promise.resolve(); }
    pause() { this.paused = true; }
  });
  mockGlobal('document', {hidden:false});
  const settings = {music:true, sfx:true, muted:false};
  const audio = createMenuAudio(() => settings);
  const menu = sounds.get('/audio/menu-night-vigil.mp3');
  const practiceArena = sounds.get('/audio/duel-clash-defiant.mp3');
  const spell = sounds.get('/spells/protego/cast.wav');
  const victory = sounds.get('/audio/duel-victory.mp3');
  audio.sync(); assert.equal(menu.paused, true);
  audio.unlock(); assert.equal(menu.paused, false);
  audio.setScene('duel'); assert.equal(menu.paused, true); assert.equal(practiceArena.paused, false);
  audio.play('Protego'); assert.equal(spell.plays, 1);
  document.hidden = true; audio.sync();
  assert.ok([...sounds.values()].every(sound => sound.paused));
  audio.play('Protego'); assert.equal(spell.plays, 1);
  document.hidden = false; audio.sync();
  assert.equal(practiceArena.paused, false); assert.equal(spell.paused, true);
  audio.setDefeated(true); assert.equal(practiceArena.paused, true); assert.equal(victory.plays, 1);
  audio.setScene(null); assert.equal(victory.paused, true);
  audio.setScene('duel'); assert.equal(practiceArena.paused, true); assert.equal(victory.plays, 1);
  audio.setDefeated(false); assert.equal(practiceArena.currentTime, 0); assert.equal(practiceArena.paused, false);
  audio.setDefeated(true, false); assert.equal(practiceArena.paused, true); assert.equal(victory.plays, 1, 'player defeat has no victory fanfare');
  audio.setDefeated(false);
  settings.sfx = false; audio.sync(); audio.play('Protego'); assert.equal(spell.plays, 1);
  assert.equal(practiceArena.paused, false);
  settings.sfx = true; settings.muted = true; audio.sync();
  assert.ok([...sounds.values()].every(sound => sound.paused));
  settings.muted = false; audio.sync(); audio.play('Protego');
  audio.setScene(null); assert.equal(spell.paused, true);
  audio.play('Protego'); assert.equal(spell.paused, false);
  audio.stop(); assert.ok([...sounds.values()].every(sound => sound.paused));
  audio.sync(); assert.equal(spell.paused, true);
  audio.setScene('duel','practiceArena');
  audio.play('Protego'); audio.play('hit');
  const hit = sounds.get('/audio/duel-hit.wav');
  assert.equal(spell.paused, false); assert.equal(hit.paused, false);
  practiceArena.currentTime = 12;
  audio.setScene('duel','soloDuel');
  assert.equal(spell.paused, true); assert.equal(hit.paused, true);
  assert.equal(practiceArena.paused, false);
  assert.equal(practiceArena.currentTime, 12, 'Shared music continues across game screens');
  audio.play('Protego');
  audio.setScene('duel','spellTraining');
  assert.equal(spell.paused, true); assert.equal(practiceArena.paused, false);
  settings.music = false; audio.sync(); audio.play('hit');
  assert.equal(practiceArena.paused, true); assert.equal(hit.paused, false, 'Effects stay on without music');
  settings.music = true; settings.sfx = false; audio.sync();
  assert.equal(practiceArena.paused, false); assert.equal(hit.paused, true, 'Music stays on without effects');
});

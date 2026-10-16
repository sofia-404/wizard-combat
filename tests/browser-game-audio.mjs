import assert from 'node:assert/strict';

// Run inside the input-settings suite, which replaces audio playback and blocks the camera.
export async function checkGameAudio(page, base) {
  const battle = '/audio/duel-clash-defiant.mp3';
  const hit = '/audio/duel-hit.wav';
  const victory = '/audio/duel-victory.mp3';
  const click = '/audio/menu-click.wav';
  const spellPaths = {
    Protego:'/spells/protego/cast.wav', 'Basic Cast':'/spells/basic-cast/cast.wav',
    Confringo:'/spells/confringo/cast.wav', Expelliarmus:'/spells/expelliarmus/cast.wav'
  };
  const count = path => page.evaluate(path => playedAudio.filter(url => new URL(url).pathname === path).length, path);
  const state = path => page.evaluate(path => audioStates[path], path);
  const settings = patch => page.evaluate(async patch => (await import('/settings.js')).updateSettings(patch), patch);
  const route = async view => {
    await page.evaluate(view => { location.hash = view; }, view);
    await page.locator('#' + view + 'View').waitFor({state:'visible'});
  };
  const cast = (view, shape, duplicate = false) => page.evaluate(({view, shape, duplicate}) => {
    const type = view === 'spellTraining' ? 'wizard:spell-training-gesture' : 'wizard:cast';
    const detail = {id:crypto.randomUUID(), type:'cast', accepted:true, shape, score:95};
    document.dispatchEvent(new CustomEvent(type, {detail}));
    if (duplicate) document.dispatchEvent(new CustomEvent(type, {detail}));
  }, {view, shape, duplicate});
  const damage = (view, amount) => page.evaluate(({view, amount}) => {
    document.dispatchEvent(new CustomEvent('wizard:player-hit', {detail:{view, id:crypto.randomUUID(), damage:amount}}));
  }, {view, amount});

  await page.clock.install();
  for (const view of ['practiceArena','soloDuel','spellTraining']) {
    await page.goto(base + '?audio=' + view + '#' + view);
    await page.locator('#' + view + 'View').waitFor({state:'visible'});
    await settings({music:true, sfx:true, muted:false});
    assert.equal(await state(battle), 'paused', view + ': music waits for user input');
    await page.keyboard.press('Shift');
    assert.equal(await state(battle), 'playing', view + ': battle music');
    let health = 200;
    for (const shape of Object.keys(spellPaths)) {
      const before = await count(spellPaths[shape]), hits = await count(hit);
      await cast(view, shape, true);
      assert.equal(await count(spellPaths[shape]), before + 1, view + ': accepted cast plays once');
      await page.clock.runFor(200);
      if (shape !== 'Protego') health -= 30;
      assert.equal(await page.locator('#' + view + 'DummyHealth').evaluate(node => node.value), health);
      assert.equal(await count(hit), hits + (shape === 'Protego' ? 0 : 1), view + ': hit sound at impact');
    }
    await page.clock.runFor(3100);
    const beforeDamage = await count(hit);
    await damage(view, 20);
    assert.equal(await count(hit), beforeDamage + 1, view + ': player damage sound');
    while (health > 0) {
      await cast(view, 'Basic Cast');
      await page.clock.runFor(200);
      health = Math.max(0, health - 30);
    }
    assert.equal(await state(battle), 'paused');
    assert.equal(await count(victory), 1, view + ': one victory sound');
    const blocked = await count(spellPaths['Basic Cast']);
    await cast(view, 'Basic Cast');
    assert.equal(await count(spellPaths['Basic Cast']), blocked, view + ': no cast sound for a defeated target');
    if (view === 'spellTraining') await page.clock.runFor(2100);
    else {
      const clicks = await count(click);
      await page.locator('#' + view + 'ResetDummy').click();
      assert.equal(await count(click), clicks + 1, view + ': restart click sound');
    }
    assert.equal(await state(battle), 'playing', view + ': music resumes on reset');
    assert.equal(await state(victory), 'paused');
    await damage(view, 200);
    assert.equal(await state(battle), 'paused');
    assert.equal(await count(victory), 1, view + ': no victory on player defeat');
    const deadPlayer = await count(spellPaths.Protego);
    await cast(view, 'Protego');
    assert.equal(await count(spellPaths.Protego), deadPlayer, view + ': no cast sound after player defeat');
    await route(view === 'practiceArena' ? 'soloDuel' : 'practiceArena');
    assert.equal(await state(battle), 'playing', 'A fresh screen does not inherit defeat');
    await page.clock.runFor(2200);
    await route(view);
    assert.equal(await state(battle), view === 'spellTraining' ? 'playing' : 'paused', 'Each screen restores its own defeat state');
    assert.equal(await count(victory), 1, 'Returning does not replay victory');
    await settings({muted:true});
    assert.equal(await state(battle), 'paused');
    assert.equal(await page.evaluate(() => cameraCalls), 0);
  }

  await page.goto(base + '?audio=controls#spellTraining');
  await page.locator('#spellTrainingView').waitFor({state:'visible'});
  await settings({music:true, sfx:true, muted:false});
  await page.keyboard.press('Shift');
  // Both pointer and keyboard controls keep their existing action and gain sound.
  for (const width of [1920,390]) {
    await page.setViewportSize({width, height:900});
    await page.clock.runFor(150);
    const before = await count('/audio/menu-hover.wav');
    await page.locator('#spellTrainingSpell').focus();
    assert.equal(await count('/audio/menu-hover.wav'), before + 1);
    const clicks = await count(click);
    await page.locator('#gameBack').click();
    assert.equal(await count(click), clicks + 1);
    await route('spellTraining');
    await page.clock.runFor(150);
  }
  await cast('spellTraining', 'Basic Cast');
  assert.equal(await state(spellPaths['Basic Cast']), 'playing');
  await route('soloDuel');
  assert.equal(await state(spellPaths['Basic Cast']), 'paused', 'Direct game switch stops the previous effect');
  assert.equal(await state(battle), 'playing');
  await settings({music:false});
  await cast('soloDuel', 'Confringo');
  assert.equal(await state(battle), 'paused');
  assert.equal(await state(spellPaths.Confringo), 'playing');
  await settings({music:true, sfx:false});
  const effectsOff = await count(spellPaths.Protego);
  await cast('soloDuel', 'Protego');
  assert.equal(await count(spellPaths.Protego), effectsOff);
  assert.equal(await state(battle), 'playing');
  await settings({muted:true, sfx:true});
  const muted = await count(spellPaths.Protego);
  await cast('soloDuel', 'Protego');
  assert.equal(await count(spellPaths.Protego), muted);
  assert.equal(await state(battle), 'paused');
  await settings({muted:false});
  assert.equal(await page.evaluate(() => cameraCalls), 0);
  console.log('PASS: all three game screens have music, cast, hit, victory, and control sounds; rejected casts, direct switches, separate defeat state, reset, mute, and independent sound settings. Mock audio and simulated input only.');
}

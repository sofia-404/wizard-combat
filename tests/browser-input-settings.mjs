import assert from 'node:assert/strict';
import {checkHealthBars, checkSpellTrainingRestart, checkPlayerDefeat, startSimulatedLesson} from './browser-health-checks.mjs';
import {checkGameAudio} from './browser-game-audio.mjs';
import {chromium} from 'playwright-core';
import {mkdir, mkdtemp, cp, copyFile, rm} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, '.tmp/input-settings');
await mkdir(output, {recursive:true});
const folder = await mkdtemp(path.join(root, '.tmp/input-settings-server-'));
await cp(path.join(root, 'dist'), path.join(folder, 'dist'), {recursive:true});
await copyFile(path.join(root, 'server.mjs'), path.join(folder, 'server.mjs'));
let api, browser;
try {
  api = spawn(process.execPath, ['server.mjs'], {cwd:folder, env:{...process.env, PORT:'25185'}, stdio:['ignore','pipe','pipe']});
  const base = await new Promise((resolve, reject) => {
    let stdout = '', stderr = '';
    const timer = setTimeout(() => reject(Error('Server start timed out: ' + stderr)), 10000);
    api.stderr.on('data', data => { stderr += data; });
    api.stdout.on('data', data => {
      stdout += data;
      const match = stdout.match(/http:\/\/127\.0\.0\.1:\d+\//);
      if (match) { clearTimeout(timer); resolve(match[0]); }
    });
    api.once('error', error => { clearTimeout(timer); reject(error); });
    api.once('exit', code => { clearTimeout(timer); reject(Error(`Server exited with ${code}: ${stderr}`)); });
  });
  browser = await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE, headless:true, args:['--disable-gpu']});
  const context = await browser.newContext({permissions:[], reducedMotion:'reduce', viewport:{width:1920,height:1080}});
  await context.addInitScript(() => {
    window.cameraCalls = 0;
    window.playedAudio = [];
    window.audioStates = {};
    HTMLMediaElement.prototype.play = function() {
      window.playedAudio.push(this.src);
      window.audioStates[new URL(this.src, location.href).pathname] = 'playing';
      return Promise.resolve();
    };
    HTMLMediaElement.prototype.pause = function() {
      window.audioStates[new URL(this.src, location.href).pathname] = 'paused';
    };
    navigator.mediaDevices.getUserMedia = async () => {
      window.cameraCalls++;
      throw Error('Camera access is forbidden in this test');
    };
  });
  const page = await context.newPage(), errors = [], records = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/events', async route => {
    records.push(JSON.parse(route.request().postData()));
    await route.fulfill({status:201, contentType:'application/json', body:'{"saved":true}'});
  });
  await page.goto(base);
  assert.equal(await page.locator('#swap, #practiceArenaSwap, #spellTrainingSwap').count(), 0);
  const openMode = async name => {
    assert.equal(await page.evaluate(() => window.cameraCalls), 0);
    if (await page.locator('#gameView').isVisible()) await page.locator('#gameBack').click();
    await page.getByRole('button', {name, exact:true}).click();
  };
  const openOptions = async () => {
    await page.keyboard.press('Escape');
    await page.getByRole('button', {name:'Options', exact:true}).click();
  };
  assert.equal(await page.locator('#practiceArenaHand, #practiceArenaPoint, #spellTrainingHand, #spellTrainingPoint').count(), 0);
  await openOptions();
  assert.equal(await page.locator('#handSetting').inputValue(), 'Left');
  assert.equal(await page.locator('#pointSetting').inputValue(), 'tip');
  await page.locator('#handSetting').selectOption('Right');
  await page.locator('#pointSetting').selectOption('grip');
  await page.keyboard.press('Escape');
  for (const mode of ['Spell Training', 'Practice Arena']) {
    await openMode(mode);
    assert.equal(await page.evaluate(async () => (await import('/settings.js')).getSettings().hand), 'Right');
    assert.equal(await page.evaluate(async () => (await import('/settings.js')).getSettings().point), 'grip');
    const record = records.findLast(record => record.cause === 'tab_change');
    assert.equal(record.hand, 'Right');
    assert.equal(record.point, 'grip');
  }
  await page.reload();
  assert.equal(await page.locator('#practiceArenaView').isVisible(), true);
  assert.equal(new URL(page.url()).hash, '#practiceArena');
  await openOptions();
  assert.equal(await page.locator('#handSetting').inputValue(), 'Right');
  assert.equal(await page.locator('#pointSetting').inputValue(), 'grip');
  assert.equal(await page.evaluate(async () => (await import('/settings.js')).getSettings().hand), 'Right');
  assert.equal(await page.evaluate(async () => (await import('/settings.js')).getSettings().point), 'grip');
  await page.locator('#handSetting').selectOption('Left');
  await page.locator('#pointSetting').selectOption('tip');
  await page.keyboard.press('Escape');
  const setInput = async (hand, point) => {
    if (await page.locator('#gameView').isVisible()) await page.locator('#gameBack').click();
    await page.getByRole('button', {name:'Options', exact:true}).click();
    await page.locator('#handSetting').selectOption(hand);
    await page.locator('#pointSetting').selectOption(point);
    await page.keyboard.press('Escape');
  };
  await openMode('Spell Training');
  assert.equal(await page.evaluate(async () => (await import('/settings.js')).getSettings().hand), 'Left');
  await setInput('Right', 'grip');
  for (const name of ['Spell Training', 'Practice Arena']) {
    await openMode(name);
    assert.equal(await page.evaluate(async () => (await import('/settings.js')).getSettings().hand), 'Right');
    assert.equal(await page.evaluate(async () => (await import('/settings.js')).getSettings().point), 'grip');
  }
  await page.reload();
  assert.equal(await page.locator('#practiceArenaView').isVisible(), true);
  assert.equal(new URL(page.url()).hash, '#practiceArena');
  await openMode('Spell Training');
  assert.equal(await page.evaluate(async () => (await import('/settings.js')).getSettings().hand), 'Right');
  assert.equal(await page.evaluate(async () => (await import('/settings.js')).getSettings().point), 'grip');
  await setInput('Left', 'tip');
  await openMode('Spell Training');
  assert.equal(await page.evaluate(async () => (await import('/settings.js')).getSettings().hand), 'Left');
  assert.equal(await page.evaluate(async () => (await import('/settings.js')).getSettings().point), 'tip');
  assert.equal(await page.locator('#video').evaluate(el => getComputedStyle(el).transform), 'matrix(-1, 0, 0, 1, 0, 0)');

  // Candidates stay in .tmp until they pass the manual preview checks.
  const emptyEventHeights = new Map();
  const checkEventPanel = async width => {
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const bounds = await page.evaluate(() => {
      const panel = document.querySelector('#practiceArenaView .practice-arena-events-panel');
      const arena = document.querySelector('#practiceArenaView .practice-arena').getBoundingClientRect();
      const box = panel.getBoundingClientRect();
      const log = panel.querySelector('[role="log"]');
      return {height:box.height, bottom:box.bottom, arenaBottom:arena.bottom,
        overflow:getComputedStyle(log).overflowY, logHeight:log.clientHeight, contentHeight:log.scrollHeight};
    });
    if (width >= 1100) assert.ok(Math.abs(bounds.bottom - bounds.arenaBottom) < 1, 'events end at the battlefield bottom');
    if (emptyEventHeights.has(width)) assert.ok(Math.abs(bounds.height - emptyEventHeights.get(width)) < 1, 'events do not grow the panel');
    else emptyEventHeights.set(width, bounds.height);
    assert.equal(bounds.overflow, 'hidden', 'older events do not create a scrollbar');
    assert.equal(await page.locator('#practiceArenaEvents').evaluate(list =>
      [...list.children].every(row => getComputedStyle(row).visibility === 'visible')
    ), true, 'older rows stay in the flow and leave through the clipped bottom edge');
  };
  const capture = async (prefix, selector) => {
    for (const [size,width,height] of [['desktop',1920,1080],['mobile',390,844]]) {
      await page.setViewportSize({width,height});
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.equal(await page.locator('#video').evaluate(el => el.srcObject), null);
      await page.evaluate(async () => {
        window.scrollTo(0, 0);
        await document.fonts.ready;
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      });
      if (prefix.startsWith('practice-arena-')) await checkEventPanel(width);
      const options = {path:path.join(output, `${prefix}-${size}.png`), animations:'disabled'};
      if (selector) await page.locator(selector).screenshot(options);
      else await page.screenshot({...options, fullPage:true});
    }
  };
  if (await page.locator('#gameView').isVisible()) await page.locator('#gameBack').click();
  await capture('menu');
  await openMode('Solo Duel');
  await page.locator('#soloDuelView .practice-arena').waitFor({state:'visible'});
  await capture('solo-duel-gameplay');
  await page.locator('#gameBack').click();
  await openOptions();
  await capture('options');
  await page.keyboard.press('Escape');
  await openMode('Practice Arena');
  assert.equal(await page.locator('#practiceArenaEventsEmpty').isVisible(), true);
  assert.equal(await page.locator('#practiceArenaEvents li').count(), 0);
  await page.setViewportSize({width:1100,height:900});
  await checkEventPanel(1100);
  await capture('practice-arena-gameplay');
  // Repeated failed attempts are separate events, even with the same reason.
  await page.evaluate(() => {
    for (let i = 0; i < 2; i++) document.dispatchEvent(new CustomEvent('wizard:practice-arena-gesture', {
      detail:{type:'reject', reason:'Draw a larger shape', cause:'too_small'}
    }));
  });
  assert.equal(await page.locator('#practiceArenaEvents li').count(), 2);
  assert.equal(await page.locator('#practiceArenaEventsEmpty').isVisible(), false);
  // Capture the defeat window with simulated casts and no camera access.
  for (const health of [170, 140, 110, 80, 50, 20, 0]) {
    await page.evaluate(() => document.dispatchEvent(new CustomEvent('wizard:cast', {
      detail:{id:crypto.randomUUID(), shape:'Basic Cast', score:95, damage:30}
    })));
    await page.waitForFunction(value => document.querySelector('#practiceArenaDummyHealth').value === value, health);
    if (health === 170) {
      assert.equal(await page.locator('#practiceArenaEvents li').count(), 3, 'one spell event after two failed attempts');
      assert.equal(await page.locator('#practiceArenaEvents li strong').first().textContent(), 'Basic Cast');
      assert.equal(await page.locator('#practiceArenaEvents li p').first().textContent(), '30 damage · 95% precision');
    }
  }
  await page.waitForFunction(() => document.querySelector('#practiceArenaEffects').childElementCount === 0);
  assert.equal(await page.locator('#practiceArenaEvents li').count(), 10);
  assert.equal(await page.locator('#practiceArenaEvents li strong').first().textContent(), 'Dummy defeated');
  assert.equal(await page.locator('#practiceArenaEvents li strong').nth(1).textContent(), 'Basic Cast');
  assert.equal(await page.locator('#practiceArenaEvents li p').nth(1).textContent(), '20 damage · 95% precision');
  assert.equal(await page.locator('#practiceArenaEvents li strong').nth(2).textContent(), 'Basic Cast');
  assert.equal(await page.locator('#practiceArenaEvents').textContent().then(text => text.includes('Draw a larger shape')), true);
  await page.setViewportSize({width:1100,height:900});
  await checkEventPanel(1100);
  await capture('practice-arena-defeat');
  await page.getByRole('button', {name:'Restart', exact:true}).click();
  assert.equal(await page.locator('#practiceArenaEvents li').count(), 1);
  assert.equal(await page.locator('#practiceArenaEvents li strong').textContent(), 'Practice Arena restarted');
  await page.evaluate(() => document.dispatchEvent(new CustomEvent('wizard:cast', {
    detail:{id:crypto.randomUUID(), shape:'Protego', score:87, damage:0}
  })));
  assert.equal(await page.locator('#practiceArenaEvents li strong').first().textContent(), 'Protego');
  assert.equal(await page.locator('#practiceArenaEvents li p').first().textContent(), '0 damage · 87% precision');
  assert.equal(await page.locator('#practiceArenaEvents').evaluate(list => list.getAnimations().length), 0, 'reduced motion has no slide');
  await page.emulateMedia({reducedMotion:'no-preference'});
  for (const width of [1920,390]) {
    await page.setViewportSize({width,height:1080});
    const motion = await page.evaluate(() => {
      const list = document.querySelector('#practiceArenaEvents');
      const previous = list.firstElementChild;
      const add = () => document.dispatchEvent(new CustomEvent('wizard:practice-arena-gesture', {
        detail:{type:'reject', reason:'Draw a larger shape', cause:'too_small'}
      }));
      add();
      const slide = list.getAnimations()[0];
      slide.pause();
      slide.currentTime = 0;
      const start = previous.getBoundingClientRect().top;
      slide.currentTime = slide.effect.getTiming().duration / 2;
      const middle = previous.getBoundingClientRect().top;
      slide.finish();
      const end = previous.getBoundingClientRect().top;
      add();
      list.getAnimations()[0].currentTime = 80;
      const before = previous.getBoundingClientRect().top;
      add();
      const next = list.getAnimations()[0];
      next.pause();
      next.currentTime = 0;
      const after = previous.getBoundingClientRect().top;
      next.finish();
      return {start,middle,end,before,after};
    });
    assert.ok(motion.start < motion.middle && motion.middle < motion.end, 'older rows slide down');
    assert.ok(Math.abs(motion.before - motion.after) < 1, `rapid events continue without a jump: ${JSON.stringify(motion)}`);
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.locator('#practiceArenaResetDummy').evaluate(button => button.click());
  assert.equal(await page.locator('#practiceArenaEvents').evaluate(list => list.getAnimations().length), 0, 'restart clears motion');
  assert.equal(await page.locator('#practiceArenaEvents li').count(), 1);
  for (const [id,shape,prefix] of [['expelliarmus','Expelliarmus','spell-training-layout']]) {
    await page.reload();
    assert.equal(await page.locator('#practiceArenaView').isVisible(), true);
    assert.equal(new URL(page.url()).hash, '#practiceArena');
    await openMode('Spell Training');
    await page.locator('#spellTrainingSpell').selectOption(id);
    await startSimulatedLesson(page);
    // Simulated lesson events only. No camera stream or detector is started.
    await page.evaluate(shape => {
      for (let i = 0; i < 3; i++) document.dispatchEvent(new CustomEvent('wizard:spell-training-gesture', {
        detail:{id:crypto.randomUUID(), type:'cast', accepted:true, shape, score:95}
      }));
    }, shape);
    assert.equal(await page.locator('#spellTrainingCount').textContent(), '3 / 3');
    await page.waitForFunction(() => document.querySelector('#spellTrainingEvents').children.length === 3);
    assert.deepEqual(await page.locator('#spellTrainingEvents li strong').allTextContents(), ['Expelliarmus','Expelliarmus','Expelliarmus']);
    assert.deepEqual(await page.locator('#spellTrainingEvents li p').allTextContents(), Array(3).fill('30 damage · 95% precision'));
    assert.equal(await page.locator('#spellTrainingEvents').evaluate(list => list.getAnimations().length), 0);
    assert.equal(await page.locator('#practiceArenaEvents li').count(), 0, 'Spell Training events stay separate');
    await page.waitForFunction(() => document.querySelector('#spellTrainingEffects').childElementCount === 0
      && document.querySelector('#spellTrainingDummyActor').dataset.disarmed === 'false', null, {timeout:10000});
    // Clear transient reactions and show the stable completed-lesson message.
    await page.locator('#spellTrainingSpell').selectOption('protego');
    await page.locator('#spellTrainingSpell').selectOption(id);
    assert.deepEqual(await page.locator('#spellTrainingView .combatant-card strong').allTextContents(), ['Player','Dummy']);
    assert.deepEqual(await page.locator('#spellTrainingView .practice-arena-health').evaluateAll(bars =>
      bars.map(bar => ({value:bar.value,max:bar.max}))), [{value:200,max:200},{value:110,max:200}]);
    await capture(prefix);
    await openMode('Practice Arena');
    assert.equal(await page.locator('#practiceArenaEvents li').count(), 0);
    await openMode('Spell Training');
    assert.equal(await page.locator('#spellTrainingEvents li').count(), 3);
    await page.evaluate(() => document.dispatchEvent(new CustomEvent('wizard:spell-training-gesture', {
      detail:{id:crypto.randomUUID(), type:'reject', reason:'Draw a larger shape', cause:'too_small'}
    })));
    assert.equal(await page.locator('#spellTrainingEvents li strong').first().textContent(), 'Spell not cast');
    assert.equal(await page.locator('#spellTrainingEvents li p').first().textContent(), 'Draw a larger shape');
    assert.equal(await page.locator('#spellTrainingCount').textContent(), '3 / 3');
    assert.equal(await page.evaluate(() => window.cameraCalls), 0);
    assert.equal(await page.locator('#practiceArenaEvents li').count(), 0, 'reload clears Practice Arena events and Spell Training casts do not add them');
  }
  for (const id of ['basic-cast', 'protego', 'expelliarmus', 'confringo']) {
    await page.locator('#spellTrainingSpell').selectOption(id);
    await capture(`spell-training-${id}`, '#spellTrainingGuide');
  }
  assert.equal(await page.evaluate(() => window.cameraCalls), 0);
  await checkHealthBars(page, openMode);
  await checkSpellTrainingRestart(page, openMode, output);
  await checkPlayerDefeat(page, openMode, output);
  assert.ok(records.length > 0);
  assert.ok(records.every(record => !Object.hasOwn(record, 'swap')));

  // Old master mute becomes two zero volume sliders.
  assert.equal(await page.locator('#gameSoundToggle, #soundToggle').count(), 0);
  await openOptions();
  await page.evaluate(() => localStorage.setItem('wizard-combat-settings', JSON.stringify({music:true,sfx:true,muted:true})));
  await page.reload();
  const setVolume = (id, value) => page.locator('#' + id).evaluate((input, value) => {input.value=String(value);input.dispatchEvent(new Event('input',{bubbles:true}));}, value);
  assert.equal(await page.locator('#musicVolume').inputValue(), '0');
  assert.equal(await page.locator('#sfxVolume').inputValue(), '0');
  await setVolume('musicVolume', 60);
  await setVolume('sfxVolume', 40);
  await page.reload();
  assert.equal(await page.locator('#musicVolume').inputValue(), '60');
  assert.equal(await page.locator('#musicVolumeValue').textContent(), '60%');
  assert.equal(await page.locator('#sfxVolume').inputValue(), '40');
  assert.equal(await page.locator('#sfxVolumeValue').textContent(), '40%');
  assert.equal(await page.evaluate(async () => (await import('/settings.js')).getSettings().muted), false);
  const toggleEffects = async value => {
    await openOptions();
    await setVolume('sfxVolume', value);
    await page.keyboard.press('Escape');
    await openMode('Spell Training');
  };
  await page.keyboard.press('Escape');
  await openMode('Spell Training');
  // Accepted Spell Training spells play once, including Protego and an unselected spell.
  await page.evaluate(() => {
    window.playedAudio = [];
    for (const shape of ['Protego', 'Basic Cast', 'Confringo', 'Expelliarmus']) {
      const detail = {id:crypto.randomUUID(), type:'cast', accepted:true, shape, score:95};
      document.dispatchEvent(new CustomEvent('wizard:spell-training-gesture', {detail}));
      document.dispatchEvent(new CustomEvent('wizard:spell-training-gesture', {detail}));
    }
    for (const type of ['reject', 'cancel']) document.dispatchEvent(new CustomEvent('wizard:spell-training-gesture', {
      detail:{id:crypto.randomUUID(), type, accepted:false, shape:'Protego'}
    }));
  });
  assert.deepEqual(await page.evaluate(() => playedAudio.filter(url => url.includes('/spells/')).map(url => new URL(url).pathname)),
    ['/spells/protego/cast.wav', '/spells/basic-cast/cast.wav', '/spells/confringo/cast.wav', '/spells/expelliarmus/cast.wav']);
  await toggleEffects(0);
  const soundCount = await page.evaluate(() => playedAudio.length);
  await page.evaluate(() => document.dispatchEvent(new CustomEvent('wizard:spell-training-gesture', {
    detail:{id:crypto.randomUUID(), type:'cast', accepted:true, shape:'Protego', score:95}
  })));
  assert.equal(await page.evaluate(() => playedAudio.length), soundCount);
  await toggleEffects(40);

  await checkGameAudio(page, base);
  await page.setViewportSize({width:1920,height:1080});
  await page.goto(new URL('brandbook.html', base).href);
  await page.evaluate(() => document.fonts.ready);
  for (const name of ['menu', 'spell-training', 'practice-arena']) {
    await page.locator(`#tab-${name}`).click();
    await page.locator('#screens').screenshot({path:path.join(output, `brandbook-${name}.png`), animations:'disabled'});
  }
  assert.equal(await page.evaluate(() => window.cameraCalls), 0);
  assert.deepEqual(errors, []);
  console.log('PASS: input settings, sound volume sliders and saved mute migration, menu icon, Spell Training spell audio and duplicate checks, mirrored preview, records, desktop/narrow layout. No camera access.');
} finally {
  await browser?.close();
  if (api && api.exitCode === null && api.signalCode === null) {
    const exited = once(api, 'exit'); api.kill(); await exited;
  }
  await rm(folder, {recursive:true, force:true});
}

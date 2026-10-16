import {chromium} from 'playwright-core';
import {mkdir, mkdtemp, cp, copyFile, rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {randomInt} from 'node:crypto';
import {once} from 'node:events';
import {spawn} from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';
import {resample} from '../dist/gesture.js';
import {openGameMode, startSelectedMode} from './browser-game-mode.mjs';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const output = path.join(root, '.tmp/browser-check');
await mkdir(output, {recursive:true});
const folder = await mkdtemp(path.join(root, '.tmp/spell-training-tab-server-'));
await cp(path.join(root, 'dist'), path.join(folder, 'dist'), {recursive:true});
await copyFile(path.join(root, 'server.mjs'), path.join(folder, 'server.mjs'));
let api, browser;
try {
  api = spawn(process.execPath, ['server.mjs'], {cwd:folder,
    env:{...process.env, PORT:String(randomInt(20000, 60000))}, stdio:['ignore','pipe','pipe']});
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
  browser = await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE, headless:true,
    args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
  const context = await browser.newContext({viewport:{width:1920,height:1080}, permissions:['camera']});
  const page = await context.newPage(), errors = [], records = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/events', async route => {
    records.push(JSON.parse(route.request().postData()));
    await route.continue();
  });
  await page.addInitScript(() => {
    window.steps = []; window.step = 0; window.workerCount = 0; window.workerStops = 0;
    window.cameraCount = 0; window.effectSpells = [];
    const getUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async options => {
      window.cameraCount++;
      window.cameraStream = await getUserMedia(options);
      return window.cameraStream;
    };
    window.Worker = class {
      constructor() { window.workerCount++; }
      postMessage(data) {
        if (data.type === 'init') { setTimeout(() => this.onmessage({data:{type:'ready'}}), 0); return; }
        data.bitmap.close();
        const point = window.steps[Math.min(window.step++, window.steps.length - 1)];
        const landmarks = point ? [Array.from({length:21}, () => ({x:1-point.x,y:point.y/.75,z:0}))] : [];
        setTimeout(() => this.onmessage({data:{type:'result',t:data.t,inference:12,landmarks,
          handedness:landmarks.map(() => [{categoryName:'Left',score:.95}])}}), 2);
      }
      terminate() { window.workerStops++; }
    };
    document.addEventListener('DOMContentLoaded', () => {
      new MutationObserver(records => {
        for (const record of records) for (const node of record.addedNodes) {
          if (node.dataset?.spell) window.effectSpells.push(node.dataset.spell);
        }
      }).observe(document.querySelector('#spellTrainingEffects'), {childList:true});
    });
  });
  await page.goto(base);
 const openMode=(name,target=page)=>openGameMode(target,name);

  assert.equal(await page.locator('#mainMenu').isVisible(), true);
  await page.getByRole('button', {name:'Options',exact:true}).click();
  for(const id of ['musicVolume','sfxVolume'])await page.locator('#'+id).evaluate(input=>{input.value='0';input.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.locator('#handSetting').selectOption('Right');
  await page.locator('#difficultySetting').selectOption('hard');
  await page.keyboard.press('Escape');
  await page.reload();
  await page.getByRole('button', {name:'Options',exact:true}).click();
  assert.equal(await page.locator('#musicVolume').inputValue(), '0');
  assert.equal(await page.locator('#sfxVolume').inputValue(), '0');
  assert.equal(await page.locator('#handSetting').inputValue(), 'Right');
  assert.equal(await page.locator('#difficultySetting').inputValue(), 'hard');
  assert.match(await page.locator('#difficultyHelp').textContent(), /3.5 seconds/);
  await page.locator('#handSetting').selectOption('Left');
  await page.locator('#difficultySetting').selectOption('normal');
  await page.keyboard.press('Escape');
  for (const [name, id] of [['Practice Arena','practiceArenaView'],['Spell Training','spellTrainingView']]) {
    const trigger=page.getByRole('button',{name,exact:true});
    await trigger.focus();await page.keyboard.press('Enter');await startSelectedMode(page, true);
    for(const other of ['spellTrainingView','practiceArenaView'])assert.equal(await page.locator('#'+other).isVisible(),other===id);
    assert.equal(await page.locator('#gameView [role="tablist"], #gameView [role="tab"], #gameView .view-tabs').count(),0);
    assert.equal(await page.locator('#gameBack').evaluate(el=>el===document.activeElement),true);
    assert.equal(await page.locator('#gameView').isVisible(), true);
    assert.equal(await page.locator('#' + id).isVisible(), true);
    assert.equal(await page.evaluate(() => window.cameraCount), 0);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#mainMenu').isVisible(), true);
    assert.equal(await page.getByRole('button', {name,exact:true}).evaluate(el => el === document.activeElement), true);
  }
  await page.getByRole('button',{name:'Spell Training',exact:true}).click(); await startSelectedMode(page);
  await page.waitForFunction(() => document.querySelector('#spellTrainingSpell').options.length === 4);
  // Spell Training shows the same idle wizard and dummy as Practice Arena.
  assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('#spellTrainingView .idle')]
    .filter(group => !group.classList.contains('player-back-arm') && !group.classList.contains('player-wand-arm'))
    .map(group => group.getAnimations().map(animation => animation.animationName).join())),
    ['player-breathe', 'player-sway', 'dummy-breathe', 'dummy-sway', 'dummy-wand']);
  const text = id => page.locator('#' + id).textContent();
  const count = async value => assert.equal(await text('spellTrainingCount'), `${value} / 3`);
  const exp = resample([{x:.25,y:.2},{x:.55,y:.2},{x:.55,y:.5}], 40);
  const basic = resample([{x:.25,y:.2},{x:.4,y:.5},{x:.6,y:.2}], 40);
  const circle = Array.from({length:50}, (_, i) => ({x:.45+.15*Math.cos(i/49*Math.PI*2),y:.35+.15*Math.sin(i/49*Math.PI*2)}));
  const send = points => page.evaluate(points => {
    window.steps = [...Array(18).fill(points[0]), ...points, ...Array(24).fill(points.at(-1))];
    window.step = 0;
  }, points);
  const draw = async (points, shape, source = 'spellTraining') => {
    for (let attempt = 0; attempt < 3; attempt++) {
      const start = records.length;
      await send(points);
      await page.waitForFunction(() => window.step >= window.steps.length && document.querySelector('#phase').textContent === 'READY');
      await page.waitForFunction(async () => (await import('/input-state.js')).getInputState().saveStatus === 'Saved on this laptop');
      const results = records.slice(start).filter(event => event.source === (source === 'spellTraining' ? 'spellTraining' : 'camera'));
      const casts = results.filter(event => event.type === 'cast');
      if (!casts.length && results.some(event => event.type === 'cancel' && ['gap_duration','stale_frame','worker_stall'].includes(event.cause)) && attempt < 2) continue;
      assert.equal(casts.length, 1, JSON.stringify({shape,results}));
      assert.equal(casts[0].shape, shape);
      return;
    }
  };
  await openMode('Practice Arena');
  await send(Array(20).fill(exp[0]));await page.locator('#practiceArenaCamera').click();
  await page.waitForFunction(() => document.querySelector('#phase').textContent === 'READY');
  const baseline = await page.evaluate(() => ({dummy:document.querySelector('#practiceArenaDummyHealth').value,
    player:document.querySelector('#practiceArenaPlayerHealth').value, practiceArenaHits:document.querySelector('#practiceArenaHits').textContent}));
  await openMode('Spell Training');
  assert.equal(await page.evaluate(()=>window.cameraStream.getVideoTracks()[0].readyState),'ended');
  assert.equal(await text('spellTrainingCamera'),'Start camera');
  assert.equal(await page.locator('#spellTrainingStart').count(), 0);
  await send(Array(20).fill(exp[0]));await page.locator('#spellTrainingCamera').click();
  await page.waitForFunction(()=>document.querySelector('#phase').textContent==='READY');
  assert.equal(await page.locator('#spellTrainingView .practice-arena-stage').count(), 1);
  assert.equal(await page.locator('#spellTrainingView .practice-arena-live #spellTrainingCameraMount').count(), 1);
  assert.equal(await page.locator('#spellTrainingView .practice-arena-battlefield #spellTrainingGuide').count(), 1);
  assert.equal(await page.locator('#spellTrainingTokens').count(), 0);
  assert.equal(await page.locator('#spellTrainingGuide .schema-path').getAttribute('d'), 'M46 54H264V246');
  assert.equal(await page.locator('#spellTrainingGuide .schema-ring circle').count(), 4);
  assert.equal(await page.locator('#spellTrainingGuide .schema-end').getAttribute('d'), 'M264 233L280 249L264 265L248 249Z');
  assert.equal(await page.locator('#spellTrainingView .spell-training-lesson').count(), 0);
  assert.equal(await page.locator('#spellTrainingView .practice-arena-hud #spellTrainingProgress').count(), 1);
  assert.equal(await page.locator('#spellTrainingView .practice-arena-camera-panel + .spell-training-selection #spellTrainingSpell').count(), 1);
  assert.equal(await page.locator('#spellTrainingView .practice-arena-live #spellTrainingEvents').count(), 1);
  assert.equal(await page.locator('#spellTrainingMessage').textContent(), 'Hold still. Follow the guide.');
  assert.equal(await page.locator('#spellTrainingMessage').isVisible(), false);
  assert.equal(await page.locator('#spellTrainingStop').count(), 0);
  await page.evaluate(() => document.dispatchEvent(new CustomEvent('wizard:spell-training-gesture', {detail:{id:'hidden-reject',type:'reject'}})));
  assert.equal(await page.locator('#spellTrainingMessage').isHidden(), true);
  await draw(basic, 'Basic Cast');
  await count(0);
  assert.ok(await page.evaluate(() => window.effectSpells.includes('Basic Cast')));
  await page.waitForFunction(() => document.querySelector('#spellTrainingEvents li strong')?.textContent === 'Basic Cast');
  assert.equal(await page.locator('#spellTrainingEvents li strong').first().textContent(), 'Basic Cast');
  assert.match(await page.locator('#spellTrainingEvents li p').first().textContent(), /damage · .*% precision/);
  const effectCount = await page.evaluate(() => window.effectSpells.length);
  await draw(circle, 'Protego');
  await count(0);
  assert.equal(await page.evaluate(() => window.effectSpells.length), effectCount);
  assert.equal(await page.locator('#spellTrainingEffects [data-spell="Protego"]').count(), 0);
  assert.equal(await page.locator('#spellTrainingShield').evaluate(el => el.classList.contains('shield-active')), true);
  await draw(exp, 'Expelliarmus');
  await count(1);
  for (const name of ['Practice Arena','Spell Training']) await openMode(name);
  await count(0);
  assert.deepEqual(await page.evaluate(() => ({cameras:window.cameraCount,workers:window.workerCount,
    stops:window.workerStops,stream:document.querySelector('#video').srcObject,
    mount:document.querySelector('#viewport').parentElement.id})),
  {cameras:2,workers:2,stops:2,stream:null,mount:'spellTrainingCameraMount'});
  await send(Array(20).fill(exp[0]));await page.locator('#spellTrainingCamera').click();
  await page.waitForFunction(()=>document.querySelector('#phase').textContent==='READY');
  assert.equal(await page.locator('#spellTrainingMessage').textContent(), 'Hold still. Follow the guide.', 'camera restart starts a new lesson');
  await draw(exp, 'Expelliarmus');
  await count(1);
  await page.locator('#spellTrainingCamera').click();
  await count(0);
  await send(Array(20).fill(exp[0]));
  await page.locator('#spellTrainingCamera').click();
  await page.waitForFunction(() => document.querySelector('#phase').textContent === 'READY');
  await draw(exp, 'Expelliarmus');
  await count(1);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#mainMenu').isVisible(), true);
  assert.equal(await page.locator('#video').evaluate(el => el.srcObject), null);
  assert.equal(await page.evaluate(() => window.cameraStream.getVideoTracks()[0].readyState), 'ended');
  await page.getByRole('button', {name:'Spell Training',exact:true}).click(); await startSelectedMode(page);
  await count(0);
  assert.equal(await text('spellTrainingCamera'), 'Start camera');
  await page.locator('#gameBack').click();
  assert.equal(await page.locator('#mainMenu').isVisible(), true);
  await page.getByRole('button', {name:'Spell Training',exact:true}).click(); await startSelectedMode(page);
  await count(0);
  await send(Array(20).fill(exp[0]));
  await page.locator('#spellTrainingCamera').click();
  await page.waitForFunction(() => document.querySelector('#phase').textContent === 'READY');
  for (let i = 0; i < 3; i++) await draw(exp, 'Expelliarmus');
  await count(3);
  assert.equal(await page.locator('#spellTrainingCompletion').isVisible(), false);
  assert.equal(await text('spellTrainingLearnedTitle'), 'Expelliarmus learned');
  assert.equal(await text('spellTrainingLearnedTotal'), '1 of 4 spells learned');
  assert.equal(await page.locator('#spellTrainingProgress').evaluate(el => el.value), 3);
  await page.locator('#spellTrainingSpell').selectOption('protego');
  await count(0);
  await draw(circle, 'Protego');
  await count(0); // A shield cast counts only after it blocks an opponent attack.
  await page.locator('#spellTrainingSpell').selectOption('expelliarmus');
  await count(3);
  assert.equal(await page.locator('#spellTrainingCompletion').isVisible(), false);
  assert.equal(await text('spellTrainingLearnedTitle'), 'Expelliarmus learned');
  assert.deepEqual(await page.evaluate(() => ({dummy:document.querySelector('#practiceArenaDummyHealth').value,
    player:document.querySelector('#practiceArenaPlayerHealth').value,practiceArenaHits:document.querySelector('#practiceArenaHits').textContent})), baseline);
  assert.ok(!records.some(event => event.type === 'practiceArena' && event.cause === 'hit'));
  await page.locator('#spellTrainingCamera').click();
  for (const [name, width, height] of [['desktop',1920,1080],['small-desktop',1100,900],['mobile',390,844],['small-mobile',320,740]]) {
    await page.setViewportSize({width,height});
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.equal(await page.locator('#spellTrainingView .spell-training-guide-area').isVisible(), false);
    const layout = await page.evaluate(() => {
      const box = selector => document.querySelector(selector).getBoundingClientRect();
      return {
        guide:box('#spellTrainingGuide').toJSON(),
        camera:box('#spellTrainingView .practice-arena-camera-panel').toJSON(),
        selection:box('#spellTrainingView .spell-training-selection').toJSON(),
        events:box('#spellTrainingView .practice-arena-events-panel').toJSON(),
        arena:box('#spellTrainingView .practice-arena').toJSON(),
        actionBottom:box('#spellTrainingCamera').bottom,
        arenaBottom:box('#spellTrainingView .practice-arena').bottom,
        actionTop:box('#spellTrainingCamera').top,
        hudBottom:box('#spellTrainingView .practice-arena-hud').bottom
      };
    });
    assert.ok(layout.camera.bottom < layout.selection.top && layout.selection.bottom < layout.events.top, 'spell selection sits between camera and events');
    if (width >= 1100) assert.ok(Math.abs(layout.events.bottom - layout.arena.bottom) < 1, 'events end at the battlefield bottom');
    assert.ok(layout.guide.bottom < layout.arena.bottom && layout.guide.top > layout.actionBottom, 'guide stays inside the arena below the central action');
    assert.ok(Math.abs(layout.guide.x + layout.guide.width / 2 - layout.arena.x - layout.arena.width / 2) < 1, 'guide stays centered');
    assert.ok(layout.actionTop >= layout.hudBottom, 'central action clears the health and progress row');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({path:path.join(output, `spell-training-tab-${name}.png`),fullPage:true});
  }
  await page.reload();
  assert.equal(new URL(page.url()).hash, '#spellTraining');
  assert.equal(await page.locator('#spellTrainingView').isVisible(), true);
  await count(0);
  assert.equal(await text('spellTrainingLearnedTotal'), '0 of 4 spells learned');
  assert.equal(await page.locator('#spellTrainingCompletion').isVisible(), false);
  assert.equal(await text('spellTrainingCamera'), 'Start camera');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({result:'PASS',checks:'Worker landmark input through detector; three casts; wrong spell effect; Protego shield without projectile; camera release and restart; camera stop clears active lessons and keeps learned marks; Practice Arena isolation; keyboard menu routes; no nested tabs; reload keeps Spell Training and resets progress; desktop and mobile screenshots',records:records.length}));
} finally {
  await browser?.close();
  if (api && api.exitCode === null && api.signalCode === null) {
    const exited = once(api, 'exit'); api.kill(); await exited;
  }
  await rm(folder, {recursive:true,force:true});
}

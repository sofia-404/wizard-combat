import {chromium} from 'playwright-core';
import {mkdir, mkdtemp, cp, copyFile, rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {randomInt} from 'node:crypto';
import {once} from 'node:events';
import {spawn} from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';
import {resample} from '../dist/gesture.js';
import {openGameMode} from './browser-game-mode.mjs';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const output = path.join(root, '.tmp/browser-check');
await mkdir(output, {recursive:true});
const folder = await mkdtemp(path.join(root, '.tmp/training-tab-server-'));
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
      }).observe(document.querySelector('#trainingEffects'), {childList:true});
    });
  });
  await page.goto(base);
 const openMode=(name,target=page)=>openGameMode(target,name);

  assert.equal(await page.locator('#mainMenu').isVisible(), true);
  await page.getByRole('button', {name:'Options',exact:true}).click();
  await page.locator('#musicSetting').uncheck();
  await page.locator('#sfxSetting').uncheck();
  await page.locator('#handSetting').selectOption('Right');
  await page.locator('#difficultySetting').selectOption('hard');
  await page.keyboard.press('Escape');
  await page.reload();
  await page.getByRole('button', {name:'Options',exact:true}).click();
  assert.equal(await page.locator('#musicSetting').isChecked(), false);
  assert.equal(await page.locator('#sfxSetting').isChecked(), false);
  assert.equal(await page.locator('#handSetting').inputValue(), 'Right');
  assert.equal(await page.locator('#difficultySetting').inputValue(), 'hard');
  assert.match(await page.locator('#difficultyHelp').textContent(), /3.5 seconds/);
  await page.locator('#handSetting').selectOption('Left');
  await page.locator('#difficultySetting').selectOption('normal');
  await page.keyboard.press('Escape');
  for (const [name, id] of [['Fight','fightView'],['Training','trainingView']]) {
    const trigger=page.getByRole('button',{name,exact:true});
    await trigger.focus();await page.keyboard.press('Enter');
    for(const other of ['trainingView','fightView'])assert.equal(await page.locator('#'+other).isVisible(),other===id);
    assert.equal(await page.locator('#gameView [role="tablist"], #gameView [role="tab"], #gameView .view-tabs').count(),0);
    assert.equal(await page.locator('#gameBack').evaluate(el=>el===document.activeElement),true);
    assert.equal(await page.locator('#gameView').isVisible(), true);
    assert.equal(await page.locator('#' + id).isVisible(), true);
    assert.equal(await page.evaluate(() => window.cameraCount), 0);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#mainMenu').isVisible(), true);
    assert.equal(await page.getByRole('button', {name,exact:true}).evaluate(el => el === document.activeElement), true);
  }
  await page.getByRole('button',{name:'Training',exact:true}).click();
  await page.waitForFunction(() => document.querySelector('#trainingSpell').options.length === 4);
  // Training shows the same idle wizard and dummy as Fight.
  assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('#trainingView .idle')].map(group => group.getAnimations().map(animation => animation.animationName).join())),
    ['player-breathe', 'player-sway', 'player-back-arm', 'player-wand-arm', 'dummy-breathe', 'dummy-sway', 'dummy-wand']);
  const text = id => page.locator('#' + id).textContent();
  const count = async value => assert.equal(await text('trainingCount'), `${value} / 3`);
  const exp = resample([{x:.25,y:.2},{x:.55,y:.2},{x:.55,y:.5}], 40);
  const basic = resample([{x:.25,y:.2},{x:.4,y:.5},{x:.6,y:.2}], 40);
  const circle = Array.from({length:50}, (_, i) => ({x:.45+.15*Math.cos(i/49*Math.PI*2),y:.35+.15*Math.sin(i/49*Math.PI*2)}));
  const send = points => page.evaluate(points => {
    window.steps = [...Array(18).fill(points[0]), ...points, ...Array(24).fill(points.at(-1))];
    window.step = 0;
  }, points);
  const draw = async (points, shape, source = 'training') => {
    for (let attempt = 0; attempt < 3; attempt++) {
      const start = records.length;
      await send(points);
      await page.waitForFunction(() => window.step >= window.steps.length && document.querySelector('#phase').textContent === 'READY');
      await page.waitForFunction(async () => (await import('/input-state.js')).getInputState().saveStatus === 'Saved on this laptop');
      const results = records.slice(start).filter(event => event.source === (source === 'training' ? 'training' : 'camera'));
      const casts = results.filter(event => event.type === 'cast');
      if (!casts.length && results.some(event => event.type === 'cancel' && ['gap_duration','stale_frame','worker_stall'].includes(event.cause)) && attempt < 2) continue;
      assert.equal(casts.length, 1, JSON.stringify({shape,results}));
      assert.equal(casts[0].shape, shape);
      return;
    }
  };
  await openMode('Fight');
  await send(Array(20).fill(exp[0]));await page.locator('#fightCamera').click();
  await page.waitForFunction(() => document.querySelector('#phase').textContent === 'READY');
  const baseline = await page.evaluate(() => ({dummy:document.querySelector('#fightDummyHealth').value,
    player:document.querySelector('#fightPlayerHealth').value, fightHits:document.querySelector('#fightHits').textContent}));
  await openMode('Training');
  assert.equal(await page.evaluate(()=>window.cameraStream.getVideoTracks()[0].readyState),'ended');
  assert.equal(await text('trainingCamera'),'Start camera');
  await send(Array(20).fill(exp[0]));await page.locator('#trainingCamera').click();
  await page.waitForFunction(()=>document.querySelector('#phase').textContent==='READY');
  assert.equal(await page.locator('#trainingView .fight-stage').count(), 1);
  assert.equal(await page.locator('#trainingView .fight-live #trainingCameraMount').count(), 1);
  assert.equal(await page.locator('#trainingView .fight-live #trainingGuide').count(), 1);
  assert.equal(await page.locator('#trainingTokens').count(), 0);
  assert.equal(await page.locator('#trainingGuide .schema-path').getAttribute('d'), 'M46 54H264V246');
  assert.equal(await page.locator('#trainingGuide .schema-ring circle').count(), 4);
  assert.equal(await page.locator('#trainingGuide .schema-end').getAttribute('d'), 'M264 233L280 249L264 265L248 249Z');
  await page.locator('#trainingStart').click();
  await draw(basic, 'Basic Cast');
  await count(0);
  assert.ok(await page.evaluate(() => window.effectSpells.includes('Basic Cast')));
  assert.equal(await page.locator('#trainingEvents li strong').first().textContent(), 'Basic Cast');
  assert.match(await page.locator('#trainingEvents li p').first().textContent(), /damage · .*% precision/);
  const effectCount = await page.evaluate(() => window.effectSpells.length);
  await draw(circle, 'Protego');
  await count(0);
  assert.equal(await page.evaluate(() => window.effectSpells.length), effectCount);
  assert.equal(await page.locator('#trainingEffects [data-spell="Protego"]').count(), 0);
  assert.equal(await page.locator('#trainingShield').evaluate(el => el.classList.contains('shield-active')), true);
  await draw(exp, 'Expelliarmus');
  await count(1);
  for (const name of ['Fight','Training']) await openMode(name);
  await count(1);
  assert.deepEqual(await page.evaluate(() => ({cameras:window.cameraCount,workers:window.workerCount,
    stops:window.workerStops,stream:document.querySelector('#video').srcObject,
    mount:document.querySelector('#viewport').parentElement.id})),
  {cameras:2,workers:2,stops:2,stream:null,mount:'trainingCameraMount'});
  await send(Array(20).fill(exp[0]));await page.locator('#trainingCamera').click();
  await page.waitForFunction(()=>document.querySelector('#phase').textContent==='READY');
  await draw(exp, 'Expelliarmus');
  await count(2);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#mainMenu').isVisible(), true);
  assert.equal(await page.locator('#video').evaluate(el => el.srcObject), null);
  assert.equal(await page.evaluate(() => window.cameraStream.getVideoTracks()[0].readyState), 'ended');
  await page.getByRole('button', {name:'Training',exact:true}).click();
  await count(2);
  assert.equal(await text('trainingCamera'), 'Start camera');
  await page.locator('#gameBack').click();
  assert.equal(await page.locator('#mainMenu').isVisible(), true);
  await page.getByRole('button', {name:'Training',exact:true}).click();
  await count(2);
  await send(Array(20).fill(exp[0]));
  await page.locator('#trainingCamera').click();
  await page.waitForFunction(() => document.querySelector('#phase').textContent === 'READY');
  await draw(exp, 'Expelliarmus');
  await count(3);
  assert.equal(await page.locator('#trainingCompletion').isVisible(), true);
  assert.equal(await text('trainingLearnedTitle'), 'Expelliarmus learned');
  assert.equal(await text('trainingLearnedTotal'), '1 of 4 spells learned');
  assert.equal(await page.locator('#trainingProgress').evaluate(el => el.value), 3);
  await page.locator('#trainingSpell').selectOption('protego');
  await count(0);
  await page.locator('#trainingSpell').selectOption('expelliarmus');
  await count(3);
  assert.equal(await page.locator('#trainingCompletion').isVisible(), true);
  assert.equal(await text('trainingLearnedTitle'), 'Expelliarmus learned');
  assert.deepEqual(await page.evaluate(() => ({dummy:document.querySelector('#fightDummyHealth').value,
    player:document.querySelector('#fightPlayerHealth').value,fightHits:document.querySelector('#fightHits').textContent})), baseline);
  assert.ok(!records.some(event => event.type === 'fight' && event.cause === 'hit'));
  await page.locator('#trainingCamera').click();
  for (const [name, width, height] of [['desktop',1920,1080],['mobile',390,844]]) {
    await page.setViewportSize({width,height});
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({path:path.join(output, `training-tab-${name}.png`),fullPage:true});
  }
  await page.reload();
  assert.equal(new URL(page.url()).hash, '#training');
  assert.equal(await page.locator('#trainingView').isVisible(), true);
  await count(0);
  assert.equal(await text('trainingLearnedTotal'), '0 of 4 spells learned');
  assert.equal(await page.locator('#trainingCompletion').isVisible(), false);
  assert.equal(await text('trainingCamera'), 'Start camera');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({result:'PASS',checks:'Worker landmark input through detector; three casts; wrong spell effect; Protego shield without projectile; camera release and restart; menu and camera progress; Fight isolation; keyboard menu routes; no nested tabs; reload keeps Training and resets progress; desktop and mobile screenshots',records:records.length}));
} finally {
  await browser?.close();
  if (api && api.exitCode === null && api.signalCode === null) {
    const exited = once(api, 'exit'); api.kill(); await exited;
  }
  await rm(folder, {recursive:true,force:true});
}

import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {mkdir, mkdtemp, cp, copyFile, rm} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, '.tmp/protego-training');
await mkdir(output, {recursive:true});
const folder = await mkdtemp(path.join(root, '.tmp/protego-training-server-'));
await cp(path.join(root, 'dist'), path.join(folder, 'dist'), {recursive:true});
await copyFile(path.join(root, 'server.mjs'), path.join(folder, 'server.mjs'));
let api, browser;
try {
  api = spawn(process.execPath, ['server.mjs'], {cwd:folder, env:{...process.env, PORT:'25197'}, stdio:['ignore','pipe','pipe']});
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
    navigator.mediaDevices.getUserMedia = () => { window.cameraCalls++; throw Error('Real camera access is forbidden'); };
    HTMLMediaElement.prototype.play = () => Promise.resolve();
  });
  const records = [], errors = [];
  await context.route('**/api/events', async route => {
    records.push(JSON.parse(route.request().postData()));
    await route.fulfill({status:201, body:'{"saved":true}'});
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base + '#spellTraining');
  await page.locator('#spellTrainingView .practice-arena').waitFor({state:'visible'});
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  const advance = ms => page.clock.runFor(ms);
  const playerHealth = () => page.locator('#spellTrainingPlayerHealth').evaluate(node => node.value);
  const count = () => page.locator('#spellTrainingCount').textContent();
  const targetHealth = () => page.locator('#spellTrainingDummyHealth').evaluate(node => node.value);
  const charge = page.locator('#spellTrainingDummyWand .opponent-charge');
  const input = async ready => page.evaluate(async ready => (await import('/input-state.js')).updateInputState({
    camera:ready ? 'Stop camera' : 'Start camera', cameraState:ready ? 'Camera on' : 'Camera stopped', cameraDisabled:false
  }), ready);
  const cast = async shape => page.evaluate(shape => document.dispatchEvent(new CustomEvent('wizard:spell-training-gesture', {
    detail:{id:crypto.randomUUID(), type:'cast', accepted:true, shape, score:95}
  })), shape);
  const fresh = async () => {
    await input(false);
    await input(true);
  };
  const capture = async prefix => {
    for (const [size,width,height] of [['desktop',1920,1080],['mobile',390,844]]) {
      await page.setViewportSize({width,height});
      await page.evaluate(async () => { scrollTo(0,0); await document.fonts.ready; });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      if (prefix === 'spell-training-protego-warning') {
        const arena = await page.locator('#spellTrainingView .practice-arena').boundingBox();
        const core = await charge.locator(':scope > circle').last().boundingBox();
        assert.ok(core.x >= arena.x && core.x + core.width <= arena.x + arena.width
          && core.y >= arena.y && core.y + core.height <= arena.y + arena.height, 'Wand charge stays inside the battlefield');
      }
      if (prefix === 'spell-training-protego-complete') {
        const arena = await page.locator('#spellTrainingView .practice-arena').boundingBox();
        const popup = await page.locator('#spellTrainingCompletion').boundingBox();
        assert.ok(popup.x >= arena.x && popup.y >= arena.y && popup.x + popup.width <= arena.x + arena.width
          && popup.y + popup.height <= arena.y + arena.height, 'Completion popup stays inside the battlefield');
      }
      await page.screenshot({path:path.join(output, `${prefix}-${size}.png`), fullPage:true, animations:'disabled'});
    }
  };
  await page.locator('#spellTrainingSpell').selectOption('protego');
  await capture('spell-training-protego-idle');
  await page.clock.fastForward(15000);
  assert.equal(await charge.isVisible(), false, 'No charge while the camera is off');
  assert.equal(await playerHealth(), 200);
  await input(true);
  await cast('Protego');
  assert.equal(await count(), '0 / 3', 'Casting alone does not count');
  await advance(3050);
  assert.match(await page.locator('#spellTrainingDummyState').textContent(), /Casting Basic Cast/);
  assert.equal(await charge.isVisible(), true, 'Charge is visible from the start of preparation');
  assert.equal(await charge.getAttribute('data-spell'), 'Basic Cast');
  await capture('spell-training-protego-warning');
  const steadyCore = await charge.locator(':scope > circle').last().getAttribute('r');
  await advance(1000);
  assert.equal(await charge.locator(':scope > circle').last().getAttribute('r'), steadyCore, 'Reduced motion keeps the charge steady');
  await advance(1000);
  assert.equal(await charge.isVisible(), false, 'Charge ends at launch, before impact');
  await advance(650);
  assert.equal(await playerHealth(), 175, 'Expired shield does not block');
  assert.equal(await count(), '0 / 3');
  await advance(3400);
  assert.match(await page.locator('#spellTrainingDummyState').textContent(), /Casting Confringo/);
  assert.equal(await charge.evaluate(node => getComputedStyle(node).color), 'rgb(239, 68, 68)', 'Confringo charge uses its spell color');
  await cast('Protego');
  await advance(2600);
  assert.equal(await playerHealth(), 175);
  assert.equal(await count(), '1 / 3');
  await capture('spell-training-protego-block');
  for (let i = 0; i < 2; i++) {
    await advance(3400);
    await cast('Protego');
    await advance(2600);
  }
  assert.equal(await count(), '3 / 3');
  assert.equal(await page.locator('#spellTrainingCompletion').isVisible(), true);
  assert.match(await page.locator('#spellTrainingCompletionText').textContent(), /Three attacks blocked/);
  await capture('spell-training-protego-complete');
  assert.equal(await page.locator('#spellTrainingView .practice-arena #spellTrainingCompletion').count(), 1);
  assert.equal(await page.locator('#spellTrainingCompletion').getAttribute('role'), 'dialog');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#spellTrainingCompletion').isHidden(), true);
  assert.equal(await page.locator('#spellTrainingView').isVisible(), true);
  assert.equal(await page.locator('#spellTrainingSpell').evaluate(node => node === document.activeElement), true);
  await page.locator('#spellTrainingSpell').selectOption('basic-cast');
  await page.locator('#spellTrainingSpell').selectOption('protego');
  await page.locator('#spellTrainingCompletionClose').click({force:true});
  assert.equal(await page.locator('#spellTrainingCompletion').isHidden(), true);
  await page.clock.fastForward(15000);
  assert.equal(await playerHealth(), 175, 'Completed lesson stops attacks');
  await fresh();
  await advance(5150);
  assert.equal(await page.locator('#spellTrainingIncomingEffects [data-phase="flight"]').count(), 1);
  await page.locator('#spellTrainingSpell').selectOption('basic-cast');
  await page.clock.fastForward(10000);
  assert.equal(await playerHealth(), 175, 'Spell change cancels the incoming attack');
  assert.equal(await page.locator('#spellTrainingIncomingEffects > g').count(), 0);
  await cast('Basic Cast');
  assert.equal(await count(), '1 / 3', 'Other lessons still count casts');
  await page.locator('#spellTrainingSpell').selectOption('protego');
  await advance(5150);
  await input(false);
  await page.clock.fastForward(10000);
  assert.equal(await playerHealth(), 175, 'Camera stop cancels the incoming attack');
  await input(true);
  await advance(5150);
  await page.evaluate(async () => (await import('/input-state.js')).updateInputState({cameraState:'Switching to CPU…'}));
  await page.clock.fastForward(10000);
  assert.equal(await playerHealth(), 175, 'Tracker recovery cancels attacks');
  await input(true);
  await advance(3050);
  await cast('Expelliarmus');
  await advance(150);
  assert.equal(await page.locator('#spellTrainingDummyActor').getAttribute('data-disarmed'), 'true');
  assert.equal(await charge.isVisible(), false, 'Disarm clears the charge');
  await advance(2500);
  assert.equal(await playerHealth(), 175, 'Disarm interrupts preparation');
  await fresh();
  await advance(5150);
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await page.clock.fastForward(10000);
  assert.equal(await playerHealth(), 175, 'Page hide cancels flights');
  await page.evaluate(() => window.dispatchEvent(new Event('pageshow')));
  await input(true); // Page hide stops the shared camera; readiness must be restored.
  await advance(5700);
  assert.equal(await playerHealth(), 150, 'Return starts a new readiness wait');
  await fresh();
  await advance(5150);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {configurable:true, value:true});
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.fastForward(10000);
  assert.equal(await playerHealth(), 150);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {configurable:true, value:false});
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await fresh();
  await page.evaluate(() => document.dispatchEvent(new CustomEvent('wizard:player-hit', {
    detail:{view:'spellTraining', id:'lethal', damage:200}
  })));
  assert.equal(await playerHealth(), 0);
  await advance(2050);
  assert.equal(await playerHealth(), 200, 'Player recovers after two seconds');
  assert.equal(await count(), '0 / 3');
  await advance(5700);
  assert.equal(await playerHealth(), 175, 'Attacks resume after player recovery');
  await fresh();
  for (let i = 0; i < 7; i++) { await cast('Basic Cast'); await advance(150); }
  assert.equal(await targetHealth(), 0);
  await advance(2050);
  assert.equal(await targetHealth(), 200, 'Opponent recovers');
  await advance(5700);
  assert.equal(await playerHealth(), 150, 'Attacks resume after opponent recovery');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await fresh();
  await advance(3050);
  const earlyCore = Number(await charge.locator(':scope > circle').last().getAttribute('r'));
  await advance(1000);
  assert.ok(Number(await charge.locator(':scope > circle').last().getAttribute('r')) > earlyCore, 'Charge grows during preparation');
  await advance(1100);
  assert.equal(await charge.isVisible(), false);
  const x = await page.locator('#spellTrainingIncomingEffects [data-phase="flight"] > circle').evaluate(node => Number(node.getAttribute('cx')));
  assert.ok(x > 295 && x < 1348, 'Incoming spell travels toward the player');
  await cast('Protego');
  await advance(600);
  assert.equal(await playerHealth(), 150);
  assert.equal(await count(), '1 / 3', 'Shield during travel blocks at impact');
  await fresh();
  await advance(5150);
  await page.locator('#gameBack').click();
  await page.clock.fastForward(10000);
  assert.equal(await playerHealth(), 150, 'Navigation cancels attacks');
  assert.equal(await page.locator('#practiceArenaPlayerHealth').evaluate(node => node.value), 200);
  assert.equal(await page.locator('#soloDuelPlayerHealth').evaluate(node => node.value), 200);
  assert.equal(await page.evaluate(() => window.cameraCalls), 0);
  assert.deepEqual(errors, []);
  console.log('PASS: Protego blocks, missed hits, completion, spell changes, camera stop, recovery, disarm, page hide, navigation, motion, and desktop/narrow previews. Simulated input only.');
} finally {
  await browser?.close();
  if (api && api.exitCode === null && api.signalCode === null) {
    const exited = once(api, 'exit'); api.kill(); await exited;
  }
  await rm(folder, {recursive:true, force:true});
}

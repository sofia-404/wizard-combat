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
  await page.clock.install({time:new Date('2026-10-16T12:00:00Z')});
  await page.clock.pauseAt(new Date('2026-10-16T12:00:01Z'));
  await page.goto(base + '#spellTraining');
  await page.locator('#spellTrainingView .practice-arena').waitFor({state:'visible'});
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
      await page.evaluate(async () => { scrollTo({top:0,left:0,behavior:'instant'}); await document.fonts.ready; });
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
  const until = async (check, label, max = 15000) => {
    for (let elapsed = 0; elapsed <= max; elapsed += 50) {
      if (await check()) return;
      await advance(50);
    }
    assert.fail(`Timed out: ${label}`);
  };
  const launched = () => page.locator('#spellTrainingIncomingEffects [data-phase="flight"]').count();
  const waitForHit = () => until(async () => !(await launched()), 'incoming impact');
  await page.locator('#spellTrainingSpell').selectOption('protego');
  await capture('spell-training-protego-idle');
  await advance(15000);
  assert.equal(await charge.isVisible(), false);
  assert.equal(await playerHealth(), 200);
  await input(true);
  await cast('Protego');
  assert.equal(await count(), '0 / 3', 'Casting alone does not count');
  await advance(3050);
  assert.match(await page.locator('#spellTrainingDummyState').textContent(), /Casting Basic Cast/);
  assert.equal(await charge.isVisible(), true);
  await capture('spell-training-protego-warning');
  const steadyCore = await charge.locator(':scope > circle').last().getAttribute('r');
  await advance(1000);
  assert.equal(await charge.locator(':scope > circle').last().getAttribute('r'), steadyCore);
  await advance(550);
  assert.match(await page.locator('#spellTrainingDummyState').textContent(), /Cast Protego now/);
  await until(launched, 'Basic Cast release');
  assert.equal(await charge.isVisible(), false);
  await waitForHit();
  assert.equal(await playerHealth(), 180, 'Expired shield misses shared 20-damage Basic Cast');
  assert.equal(await count(), '0 / 3');
  for (let i = 1; i <= 3; i++) {
    await until(launched, 'next training attack');
    await cast('Protego');
    await waitForHit();
    assert.equal(await playerHealth(), 180);
    assert.equal(await count(), `${i} / 3`);
    if (i === 1) await capture('spell-training-protego-block');
  }
  assert.equal(await page.locator('#spellTrainingCompletion').isVisible(), true);
  assert.match(await page.locator('#spellTrainingCompletionText').textContent(), /Three attacks blocked/);
  await capture('spell-training-protego-complete');
  assert.equal(await page.locator('#spellTrainingCompletion').getAttribute('role'), 'dialog');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#spellTrainingCompletion').isHidden(), true);
  assert.equal(await page.locator('#spellTrainingSpell').evaluate(node => node === document.activeElement), true);
  await page.locator('#spellTrainingSpell').selectOption('basic-cast');
  await page.locator('#spellTrainingSpell').selectOption('protego');
  await page.locator('#spellTrainingCompletionClose').click({force:true});
  await advance(15000);
  assert.equal(await playerHealth(), 180, 'Completed lesson stops attacks');

  await fresh();
  await until(launched, 'attack before spell change');
  await page.locator('#spellTrainingSpell').selectOption('basic-cast');
  await advance(10000);
  assert.equal(await playerHealth(), 180);
  assert.equal(await page.locator('#spellTrainingIncomingEffects > g').count(), 0);
  await cast('Confringo');
  await cast('Basic Cast');
  assert.equal(await count(), '0 / 3', 'Queued lesson spell does not count before release');
  await cast('Protego');
  assert.match(await page.locator('#spellTrainingView .combat-status').textContent(), /Spell ready: Protego/);
  await advance(2050);
  assert.equal(await count(), '0 / 3', 'Replaced attack never counts');
  await cast('Basic Cast');
  assert.equal(await count(), '1 / 3');
  await page.locator('#spellTrainingSpell').selectOption('protego');
  await until(launched, 'attack before camera stop');
  await input(false);
  await advance(10000);
  assert.equal(await playerHealth(), 180);
  await input(true);
  await until(launched, 'attack before tracker recovery');
  await page.evaluate(async () => (await import('/input-state.js')).updateInputState({cameraState:'Switching to CPU…'}));
  await advance(10000);
  assert.equal(await playerHealth(), 180);
  await input(true);
  await advance(3050);
  await cast('Expelliarmus');
  await advance(1150);
  assert.equal(await page.locator('#spellTrainingDummyActor').getAttribute('data-disarmed'), 'true');
  assert.equal(await charge.isVisible(), false);
  await advance(1900);
  assert.equal(await page.locator('#spellTrainingDummyActor').getAttribute('data-disarmed'), 'true');
  await advance(150);
  assert.equal(await page.locator('#spellTrainingDummyActor').getAttribute('data-disarmed'), 'false');
  assert.equal(await playerHealth(), 180);

  await fresh();
  await until(launched, 'attack before page hide');
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await advance(10000);
  assert.equal(await playerHealth(), 180);
  await page.evaluate(() => window.dispatchEvent(new Event('pageshow')));
  await input(true);
  await until(async () => await playerHealth() < 180, 'attack after page return');
  const afterReturn = await playerHealth();
  await fresh();
  await until(launched, 'attack before visibility change');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {configurable:true, value:true});
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await advance(10000);
  assert.equal(await playerHealth(), afterReturn);
  await page.evaluate(() => {
    delete document.hidden;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await fresh();
  await page.evaluate(() => document.dispatchEvent(new CustomEvent('wizard:player-hit', {
    detail:{view:'spellTraining', id:'lethal', damage:200}
  })));
  assert.equal(await playerHealth(), 0);
  await advance(2050);
  assert.equal(await playerHealth(), 200);
  assert.equal(await count(), '0 / 3');
  await until(async () => await playerHealth() < 200, 'attacks after player recovery');
  await fresh();
  for (let i = 0; i < 10; i++) { await cast('Basic Cast'); await advance(1050); }
  assert.equal(await targetHealth(), 0);
  await advance(2050);
  assert.equal(await targetHealth(), 200);
  const beforeResume = await playerHealth();
  await until(async () => await playerHealth() < beforeResume, 'attacks after target recovery');

  await page.emulateMedia({reducedMotion:'no-preference'});
  await fresh();
  const beforeBlock = await playerHealth();
  await advance(3050);
  const earlyCore = Number(await charge.locator(':scope > circle').last().getAttribute('r'));
  await advance(1000);
  assert.ok(Number(await charge.locator(':scope > circle').last().getAttribute('r')) > earlyCore);
  await until(launched, 'moving incoming attack');
  await advance(150);
  const x = await page.locator('#spellTrainingIncomingEffects [data-phase="flight"] > circle').evaluate(node => Number(node.getAttribute('cx')));
  assert.ok(x > 295 && x < 1348);
  await cast('Protego');
  await waitForHit();
  assert.equal(await playerHealth(), beforeBlock);
  assert.equal(await count(), '1 / 3');
  await fresh();
  await until(launched, 'attack before navigation');
  await page.locator('#gameBack').click();
  await advance(10000);
  assert.equal(await playerHealth(), beforeBlock);
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

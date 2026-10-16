import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {mkdir, mkdtemp, cp, copyFile, rm} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, '.tmp/solo-combat');
await mkdir(output, {recursive:true});
const folder = await mkdtemp(path.join(root, '.tmp/solo-combat-server-'));
await cp(path.join(root, 'dist'), path.join(folder, 'dist'), {recursive:true});
await copyFile(path.join(root, 'server.mjs'), path.join(folder, 'server.mjs'));
let api, browser;
try {
  api = spawn(process.execPath, ['server.mjs'], {cwd:folder, env:{...process.env, PORT:'25196'}, stdio:['ignore','pipe','pipe']});
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
  await page.goto(base + '#soloDuel');
  await page.locator('#soloDuelView .practice-arena').waitFor({state:'visible'});
  await page.clock.install();
  const advance = ms => page.clock.runFor(ms);
  const playerHealth = () => page.locator('#soloDuelPlayerHealth').evaluate(node => node.value);
  const targetHealth = () => page.locator('#soloDuelDummyHealth').evaluate(node => node.value);
  const input = async ready => page.evaluate(async ready => (await import('/input-state.js')).updateInputState({
    camera:ready ? 'Stop camera' : 'Start camera', cameraState:ready ? 'Camera on' : 'Camera stopped', cameraDisabled:false
  }), ready);
  const cast = async shape => page.evaluate(shape => document.dispatchEvent(new CustomEvent('wizard:cast', {
    detail:{id:crypto.randomUUID(), shape, score:95}
  })), shape);
  const fresh = async () => {
    await input(false);
    await page.locator('#soloDuelResetDummy').evaluate(node => node.click());
    await input(true);
  };
  const capture = async prefix => {
    for (const [size,width,height] of [['desktop',1920,1080],['mobile',390,844]]) {
      await page.setViewportSize({width,height});
      await page.evaluate(async () => { scrollTo(0,0); await document.fonts.ready; });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({path:path.join(output, `${prefix}-${size}.png`), fullPage:true, animations:'disabled'});
    }
  };
  await capture('solo-duel-gameplay');
  await page.clock.fastForward(15000);
  assert.equal(await playerHealth(), 200, 'No attacks before camera readiness');
  assert.equal(records.some(record => record.cause === 'opponent_cast'), false);
  await input(true);
  await advance(3050);
  assert.match(await page.locator('#soloDuelDummyState').textContent(), /Casting Basic Cast/);
  await capture('solo-duel-warning');
  await advance(2650);
  assert.equal(await playerHealth(), 175, 'First attack applies 25 damage at impact');
  assert.equal(await page.locator('#soloDuelPlayerActor').getAttribute('data-pose'), 'ready');
  await fresh();
  await advance(4900);
  await cast('Protego');
  await advance(800);
  assert.equal(await playerHealth(), 200, 'Player Protego blocks the incoming attack');
  assert.match(await page.locator('#soloDuelEvents').textContent(), /Protego blocked the hit/);
  await capture('solo-duel-block');
  await advance(6000);
  assert.equal(await playerHealth(), 175, 'Expired player shield does not block the next attack');
  await advance(3400);
  assert.equal(await page.locator('#soloDuelOpponentShield').evaluate(node => node.classList.contains('shield-active')), true);
  await capture('solo-duel-opponent-shield');
  const before = await targetHealth();
  await cast('Expelliarmus');
  await advance(100);
  assert.equal(await targetHealth(), before);
  assert.equal(await page.locator('#soloDuelDummyActor').getAttribute('data-disarmed'), 'false', 'Shield blocks disarm');
  assert.equal(await page.locator('#soloDuelHits').textContent(), '0 hits');
  await advance(3100);
  await cast('Basic Cast');
  await advance(100);
  assert.equal(await targetHealth(), before - 30, 'Opponent shield expires');

  await fresh();
  await advance(4000);
  await cast('Expelliarmus');
  await advance(1800);
  assert.equal(await playerHealth(), 200, 'Disarm cancels the prepared attack');
  await input(false);
  await page.clock.fastForward(15000);
  assert.equal(await playerHealth(), 200, 'Stopped camera prevents attacks');
  await input(true);
  await advance(5100);
  await input(false);
  await advance(2000);
  assert.equal(await playerHealth(), 200, 'Stopping the camera cancels an incoming flight');

  await fresh();
  await advance(4000);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {configurable:true, value:true});
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.fastForward(15000);
  assert.equal(await playerHealth(), 200, 'Hidden page cancels attacks');
  await page.evaluate(() => {
    delete document.hidden;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await advance(1000);
  assert.equal(await playerHealth(), 200, 'Resume has no overdue attack');
  await page.locator('#gameBack').click();
  await page.getByRole('button', {name:'Practice Arena',exact:true}).click();
  await input(true);
  await page.clock.fastForward(15000);
  assert.equal(await page.locator('#practiceArenaPlayerHealth').evaluate(node => node.value), 200, 'Practice Arena does not attack');
  assert.equal(await playerHealth(), 200, 'Hidden Solo Duel does not attack');
  await cast('Basic Cast');
  await advance(150);
  assert.equal(await page.locator('#practiceArenaDummyHealth').evaluate(node => node.value), 170, 'Practice Arena attacks still apply damage');
  assert.equal(await page.locator('#practiceArenaHits').textContent(), '1 hit');
  await cast('Protego');
  await page.evaluate(() => document.dispatchEvent(new CustomEvent('wizard:player-hit', {detail:{view:'practiceArena', id:crypto.randomUUID(), damage:25}})));
  assert.equal(await page.locator('#practiceArenaPlayerHealth').evaluate(node => node.value), 200, 'Practice Arena Protego still blocks damage');
  await page.locator('#gameBack').click();
  await page.getByRole('button', {name:'Solo Duel',exact:true}).click();
  await fresh();
  await page.evaluate(() => document.dispatchEvent(new CustomEvent('wizard:player-hit', {detail:{view:'soloDuel', id:crypto.randomUUID(), damage:175}})));
  await advance(5700);
  assert.equal(await playerHealth(), 0);
  assert.equal(await page.locator('#soloDuelDefeat strong').textContent(), 'Player defeated');
  const count = records.filter(record => record.cause === 'opponent_cast').length;
  await page.clock.fastForward(15000);
  assert.equal(records.filter(record => record.cause === 'opponent_cast').length, count, 'Defeat stops attacks');
  await page.locator('#soloDuelResetDummy').click();
  assert.equal(await playerHealth(), 200);
  assert.equal(await targetHealth(), 200);
  await advance(5700);
  assert.equal(await playerHealth(), 175, 'Restart starts a fresh attack cycle');
  for (let i = 0; i < 7; i++) { await cast('Basic Cast'); await advance(150); }
  assert.equal(await targetHealth(), 0);
  const afterWin = await playerHealth();
  await page.clock.fastForward(15000);
  assert.equal(await playerHealth(), afterWin, 'Defeated opponent cannot attack');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await fresh();
  await advance(5150);
  const x = await page.locator('#soloDuelIncomingEffects [data-phase="flight"] > circle').evaluate(node => Number(node.getAttribute('cx')));
  assert.ok(x > 295 && x < 1348, 'Incoming spell travels from opponent to player');
  assert.equal(await playerHealth(), 200, 'No damage before impact with motion enabled');
  await cast('Protego');
  await advance(600);
  assert.equal(await playerHealth(), 200, 'Protego cast during travel blocks at impact');
  assert.equal(await page.evaluate(() => window.cameraCalls), 0);
  assert.deepEqual(errors, []);
  assert.ok(records.some(record => record.cause === 'opponent_block' && record.source === 'soloDuel'));
  console.log('PASS: opponent attacks, warnings, both Protego shields, disarm, camera stop, visibility, navigation, defeat, restart, and desktop/narrow previews. Simulated input only.');
} finally {
  await browser?.close();
  if (api && api.exitCode === null && api.signalCode === null) {
    const exited = once(api, 'exit'); api.kill(); await exited;
  }
  await rm(folder, {recursive:true, force:true});
}

import {startSelectedMode} from './browser-game-mode.mjs';
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
    Math.random = () => 0; // Always choose defense when the opponent is eligible.
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
  await page.goto(base + '#soloDuel');
  await page.locator('#soloDuelView .practice-arena').waitFor({state:'visible'});
  const advance = ms => page.clock.runFor(ms);
  const playerHealth = () => page.locator('#soloDuelPlayerHealth').evaluate(node => node.value);
  const targetHealth = () => page.locator('#soloDuelDummyHealth').evaluate(node => node.value);
  const charge = page.locator('#soloDuelDummyWand .opponent-charge');
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
    await advance(2000);
  };
  const capture = async prefix => {
    for (const [size,width,height] of [['desktop',1920,1080],['mobile',390,844]]) {
      await page.setViewportSize({width,height});
      await page.evaluate(async () => { scrollTo({top:0,left:0,behavior:'instant'}); await document.fonts.ready; });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      if (prefix === 'solo-duel-warning') {
        const arena = await page.locator('#soloDuelView .practice-arena').boundingBox();
        const core = await charge.locator(':scope > circle').last().boundingBox();
        assert.ok(core.x >= arena.x && core.x + core.width <= arena.x + arena.width
          && core.y >= arena.y && core.y + core.height <= arena.y + arena.height, 'Wand charge stays inside the battlefield');
      }
      await page.screenshot({path:path.join(output, `${prefix}-${size}.png`), fullPage:true, animations:'disabled'});
    }
  };
  const opponentProtected = () => page.locator('#soloDuelOpponentShield').evaluate(node => node.classList.contains('shield-active'));
  const playerProtected = () => page.locator('#soloDuelShield').evaluate(node => node.classList.contains('shield-active'));
  await page.evaluate(() => {
    window.playerCasts = [];
    document.addEventListener('wizard:game-cast', ({detail}) => {
      if (detail.view === 'soloDuel') window.playerCasts.push({...detail, time:performance.now()});
    });
  });
  await capture('solo-duel-gameplay');
  await cast('Basic Cast');
  await advance(15000);
  assert.equal(await playerHealth(), 200, 'No attacks before camera readiness');
  assert.equal(await targetHealth(), 200, 'Camera-off casts are ignored');
  assert.equal(await charge.isVisible(), false);

  const status = page.locator('#soloDuelView .combat-status');
  const until = async (check, label, max = 15000) => {
    for (let elapsed = 0; elapsed <= max; elapsed += 50) {
      if (await check()) return;
      await advance(50);
    }
    assert.fail(`Timed out: ${label}`);
  };
  const launched = () => page.locator('#soloDuelIncomingEffects [data-phase="flight"]').count();
  await fresh();
  await advance(3050);
  assert.match(await page.locator('#soloDuelDummyState').textContent(), /Casting Basic Cast/);
  assert.equal(await charge.isVisible(), true);
  await capture('solo-duel-warning');
  await advance(1550);
  assert.match(await page.locator('#soloDuelDummyState').textContent(), /Cast Protego now/);
  await until(launched, 'first attack release');
  assert.equal(await charge.isVisible(), false);
  assert.match(await page.locator('#soloDuelDummyState').textContent(), /Cast Protego now/, 'cue stays visible during flight and opponent recovery');
  await advance(900);
  assert.equal(await playerHealth(), 200, 'Full flight time remains in reduced motion');
  await advance(150);
  assert.equal(await playerHealth(), 180);
  await until(launched, 'second attack release');
  await cast('Basic Cast');
  await advance(1050);
  assert.equal(await targetHealth(), 180, 'Heavy recovery prevents reactive defense');
  await advance(200);
  assert.equal(await playerHealth(), 140);
  await capture('solo-duel-recovery');

  await fresh();
  await advance(5100);
  await cast('Protego');
  await advance(1600);
  assert.equal(await playerHealth(), 200);
  assert.match(await page.locator('#soloDuelEvents').textContent(), /Protego blocked the hit/);
  await capture('solo-duel-block');
  await advance(500);
  assert.equal(await playerProtected(), false, 'Shield expires after two seconds');
  await until(async () => await playerHealth() === 160, 'next unblocked heavy hit');

  await fresh();
  await until(launched, 'attack before perfect block');
  await advance(750);
  await cast('Protego');
  await advance(300);
  assert.equal(await playerHealth(), 200);
  assert.match(await page.locator('#soloDuelEvents').textContent(), /Perfect block/);
  assert.match(await page.locator('#soloDuelDummyState').textContent(), /Recovering/);
  await capture('solo-duel-perfect-block');
  await cast('Confringo');
  await advance(1250);
  assert.equal(await targetHealth(), 160, 'Counter lands inside the 1.5-second opening');

  await fresh();
  await cast('Confringo');
  await advance(650);
  await cast('Basic Cast');
  await cast('Protego');
  assert.match(await status.textContent(), /Spell ready: Protego/);
  assert.match(await page.locator('#soloDuelEvents').textContent(), /Protego replaces/);
  assert.equal(await playerProtected(), false);
  await capture('solo-duel-queued');
  await advance(1250);
  assert.equal(await playerProtected(), false, 'Replacement keeps the original recovery deadline');
  await advance(150);
  assert.equal(await playerProtected(), true);
  assert.doesNotMatch(await status.textContent(), /Spell ready/);
  await cast('Protego');
  assert.match(await page.locator('#soloDuelEvents').textContent(), /Protego ready in/);
  await advance(2050);
  assert.equal(await playerProtected(), false);

  await fresh();
  await cast('Expelliarmus');
  await advance(250);
  assert.equal(await opponentProtected(), false);
  await advance(100);
  assert.match(await page.locator('#soloDuelDummyState').textContent(), /Preparing Protego/);
  await advance(500);
  assert.equal(await opponentProtected(), false, 'Normal needs 900 ms to raise its shield');
  await advance(100);
  assert.equal(await opponentProtected(), true);
  await capture('solo-duel-opponent-shield');
  await advance(2000);
  assert.equal(await targetHealth(), 200);
  await cast('Expelliarmus'); // Shield is down, but its cooldown still runs.
  await advance(1050);
  assert.equal(await targetHealth(), 200);
  await advance(100);
  assert.equal(await targetHealth(), 190);
  assert.equal(await page.locator('#soloDuelDummyActor').getAttribute('data-disarmed'), 'true');
  assert.equal(await charge.isVisible(), false);
  await cast('Expelliarmus');
  await advance(1150);
  assert.equal(await targetHealth(), 180);
  await advance(900);
  assert.equal(await page.locator('#soloDuelDummyActor').getAttribute('data-disarmed'), 'false', 'Repeat hit cannot extend two-second disarm');

  await fresh();
  await cast('Confringo');
  await advance(500);
  await cast('Protego');
  await input(false);
  await advance(5000);
  await input(true);
  await advance(1000);
  assert.equal(await playerProtected(), false, 'Camera restart cannot release an old queue');
  await fresh();
  await until(launched, 'incoming flight before camera stop');
  await input(false);
  await advance(2000);
  assert.equal(await playerHealth(), 200);

  await fresh();
  await advance(4000);
  assert.equal(await charge.isVisible(), true);
  await cast('Basic Cast');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {configurable:true, value:true});
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await advance(15000);
  assert.equal(await playerHealth(), 200);
  assert.equal(await charge.getAttribute('visibility'), 'hidden');
  assert.equal(await opponentProtected(), false);
  await page.evaluate(() => {
    delete document.hidden;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await advance(1000);
  assert.equal(await playerHealth(), 200);
  await page.locator('#gameBack').click();
  await page.getByRole('button', {name:'Practice Arena',exact:true}).click(); await startSelectedMode(page);
  await input(true);
  await advance(15000);
  assert.equal(await page.locator('#practiceArenaPlayerHealth').evaluate(node => node.value), 200);
  await cast('Basic Cast');
  await advance(1050);
  assert.equal(await page.locator('#practiceArenaDummyHealth').evaluate(node => node.value), 180, 'Practice uses the same fixed damage and flight');
  await cast('Protego');
  await page.evaluate(() => document.dispatchEvent(new CustomEvent('wizard:player-hit', {detail:{view:'practiceArena', id:crypto.randomUUID(), damage:25}})));
  assert.equal(await page.locator('#practiceArenaPlayerHealth').evaluate(node => node.value), 200);
  await page.locator('#gameBack').click();
  await page.getByRole('button', {name:'Solo Duel',exact:true}).click(); await startSelectedMode(page);
  await fresh();
  await page.evaluate(() => document.dispatchEvent(new CustomEvent('wizard:player-hit', {detail:{view:'soloDuel', id:crypto.randomUUID(), damage:190}})));
  await advance(6750);
  assert.equal(await playerHealth(), 0);
  assert.equal(await page.locator('#soloDuelView .practice-arena').getAttribute('data-round-phase'), 'result');
  await advance(4000);
  await page.evaluate(() => document.dispatchEvent(new CustomEvent('wizard:player-hit', {detail:{view:'soloDuel', id:crypto.randomUUID(), damage:200}})));
  assert.equal(await page.locator('#soloDuelDefeat strong').textContent(), 'Opponent wins the match · 0–2');
  await cast('Protego');
  assert.equal(await playerProtected(), false);
  const count = records.filter(record => record.cause === 'opponent_cast').length;
  await advance(15000);
  assert.equal(records.filter(record => record.cause === 'opponent_cast').length, count);
  await fresh();
  assert.equal(await playerHealth(), 200);
  assert.equal(await targetHealth(), 200);
  assert.equal(await page.locator('#practiceArenaDummyHealth').evaluate(node => node.value), 180);

  await page.emulateMedia({reducedMotion:'no-preference'});
  await fresh();
  await advance(3050);
  const earlyCore = Number(await charge.locator(':scope > circle').last().getAttribute('r'));
  await advance(1000);
  assert.ok(Number(await charge.locator(':scope > circle').last().getAttribute('r')) > earlyCore);
  await until(launched, 'moving incoming spell');
  await advance(150);
  const x = await page.locator('#soloDuelIncomingEffects [data-phase="flight"] > circle').evaluate(node => Number(node.getAttribute('cx')));
  assert.ok(x > 295 && x < 1348);
  await cast('Protego');
  assert.match(await page.locator('#soloDuelDummyState').textContent(), /Cast Protego now/, 'cue stays visible during flight and opponent recovery');
  await advance(900);
  assert.equal(await playerHealth(), 200);
  await fresh();
  await cast('Expelliarmus');
  await advance(100);
  const outgoingX = await page.locator('#soloDuelEffects [data-phase="flight"] > circle').evaluate(node => Number(node.getAttribute('cx')));
  assert.ok(outgoingX > 560 && outgoingX < 1410);
  await advance(1050);
  assert.equal(await targetHealth(), 200);
  for (const [difficulty, reactionMs] of [['easy',950], ['normal',900], ['hard',550]]) {
    await page.evaluate(async difficulty => (await import('/settings.js')).updateSettings({difficulty}), difficulty);
    await fresh();
    await cast('Expelliarmus');
    await advance(reactionMs - 50);
    assert.equal(await opponentProtected(), false);
    await advance(100);
    assert.equal(await opponentProtected(), true, `${difficulty}: notice plus preparation delay`);
  }
  assert.equal(await page.evaluate(() => window.cameraCalls), 0);
  assert.deepEqual(errors, []);
  assert.ok(records.some(record => record.cause === 'opponent_block' && record.source === 'soloDuel'));
  console.log('PASS: Solo Duel damage, flight, warnings, recovery, queued shield, cooldown, disarm, perfect block, lifecycle, other-mode isolation, motion, and desktop/narrow previews. Simulated input only.');
} finally {
  await browser?.close();
  if (api && api.exitCode === null && api.signalCode === null) {
    const exited = once(api, 'exit'); api.kill(); await exited;
  }
  await rm(folder, {recursive:true, force:true});
}

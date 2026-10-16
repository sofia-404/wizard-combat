import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {mkdir, mkdtemp, cp, copyFile, rm} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, '.tmp/rounds');
await mkdir(output, {recursive:true});
const folder = await mkdtemp(path.join(root, '.tmp/rounds-server-'));
await cp(path.join(root, 'dist'), path.join(folder, 'dist'), {recursive:true});
await copyFile(path.join(root, 'server.mjs'), path.join(folder, 'server.mjs'));
let api, browser;
try {
  api = spawn(process.execPath, ['server.mjs'], {cwd:folder, env:{...process.env, PORT:'25206'}, stdio:['ignore','pipe','pipe']});
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
  const advance = ms => page.clock.runFor(ms);
  const input = async ready => page.evaluate(async ready => (await import('/input-state.js')).updateInputState({
    camera:ready ? 'Stop camera' : 'Start camera', cameraState:ready ? 'Camera on' : 'Camera stopped', cameraDisabled:false
  }), ready);
  const cast = async shape => page.evaluate(shape => document.dispatchEvent(new CustomEvent('wizard:cast', {
    detail:{id:crypto.randomUUID(), shape, score:95}
  })), shape);
  const hit = async (view, damage = 200, extra = {}) => page.evaluate(({view,damage,extra}) =>
    document.dispatchEvent(new CustomEvent('wizard:player-hit', {detail:{view, damage, id:crypto.randomUUID(), ...extra}})), {view,damage,extra});
  let mode;
  const arena = () => page.locator('#' + mode + 'View .practice-arena');
  const phase = () => arena().getAttribute('data-round-phase');
  const health = actor => page.locator('#' + mode + actor + 'Health').evaluate(node => node.value);
  const wins = actor => arena().locator('.combatant-' + actor + ' .arena-round-score').getAttribute('aria-label');
  const banner = () => arena().locator('.arena-round-banner');
  const capture = async name => {
    await page.evaluate(async () => { await document.fonts.ready; });
    for (const [size,width,height] of [['desktop',1920,1080],['mobile',390,844]]) {
      await page.setViewportSize({width,height});
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      const box = await arena().boundingBox();
      for (const target of [arena().locator('.practice-arena-hud'), ...(await banner().isVisible() ? [banner()] : [])]) {
        const bounds = await target.boundingBox();
        assert.ok(bounds.x >= box.x && bounds.x + bounds.width <= box.x + box.width + 1);
      }
      await page.screenshot({path:path.join(output, `${name}-${size}.png`), fullPage:true, animations:'disabled'});
    }
  };
  const nextRound = async number => {
    assert.equal(await phase(), 'result');
    await advance(2000);
    assert.equal(await phase(), 'intro');
    assert.equal(await arena().getAttribute('data-round'), String(number));
    assert.equal(await health('Player'), 200);
    assert.equal(await health('Dummy'), 200);
    assert.equal(await page.locator('#' + mode + 'Timer').textContent(), '100');
    assert.equal(await arena().locator('.shield-active').count(), 0);
    assert.equal(await page.locator('#' + mode + 'DummyActor').getAttribute('data-disarmed'), 'false');
    await advance(2000);
    assert.equal(await phase(), 'active');
  };
  const winRound = async () => {
    for (let i = 0; i < 50 && await phase() === 'active'; i++) {
      await cast('Basic Cast');
      await advance(1050);
    }
    assert.equal(await health('Dummy'), 0, 'player defeats the target with existing spell rules');
  };

  for (mode of ['practiceArena', 'soloDuel']) {
    await page.goto(base + '#' + mode);
    await arena().waitFor({state:'visible'});
    await page.evaluate(() => {
      window.matchResults = [];
      window.incoming = [];
      document.addEventListener('wizard:duel-defeat', ({detail}) => window.matchResults.push(detail));
      document.addEventListener('wizard:opponent-cast', ({detail}) => window.incoming.push(detail));
    });
    assert.equal(await page.locator('#' + mode + 'Camera').textContent(), 'Start camera');
    await advance(10000);
    await cast('Basic Cast');
    await hit(mode);
    assert.equal(await phase(), 'waiting');
    assert.equal(await health('Player'), 200);
    assert.equal(await health('Dummy'), 200);
    assert.equal(await page.locator('#' + mode + 'Timer').textContent(), '100');
    await capture(mode === 'soloDuel' ? 'solo-duel-gameplay' : 'practice-arena-gameplay');
    await input(true);
    assert.equal(await banner().textContent(), 'Round 1');
    await capture(mode + '-round-intro');
    await cast('Protego');
    await hit(mode);
    assert.equal(await health('Player'), 200);
    assert.equal(await arena().locator('.shield-active').count(), 0);
    await advance(1000);
    await input(false);
    await advance(10000);
    assert.equal(await phase(), 'intro');
    assert.equal(await banner().isVisible(), false, 'stopped camera button is unobstructed');
    await input(true);
    await advance(500);
    assert.equal(await phase(), 'fight');
    assert.equal(await banner().textContent(), 'Fight');
    await cast('Basic Cast');
    await hit(mode);
    await advance(450);
    assert.equal(await health('Dummy'), 200);
    assert.equal(await health('Player'), 200);
    assert.equal(await page.locator('#' + mode + 'Timer').textContent(), '100');
    await capture(mode + '-fight');
    await advance(50);
    assert.equal(await phase(), 'active');
    await advance(1000);
    assert.equal(await page.locator('#' + mode + 'Timer').textContent(), '99');
    await input(false);
    await advance(10000);
    assert.equal(await page.locator('#' + mode + 'Timer').textContent(), '99');
    await input(true);
    await winRound();
    assert.equal(await phase(), 'result');
    assert.match(await wins('player'), /1 of 2/);
    assert.equal(await page.locator('#' + mode + 'Defeat').isVisible(), false);
    assert.equal(await page.evaluate(() => window.matchResults.length), 0, 'round win does not emit match victory');
    await capture(mode + '-round-result');
    await hit(mode);
    await cast('Basic Cast');
    assert.match(await wins('player'), /1 of 2/);
    // Result countdown freezes during tracker recovery.
    await page.evaluate(async () => (await import('/input-state.js')).updateInputState({cameraState:'Switching to CPU…'}));
    await advance(10000);
    assert.equal(await phase(), 'result');
    await input(true);
    await nextRound(2);
    const oldShot = await page.evaluate(() => window.incoming.find(cast => cast.type === 'cast'));
    if (oldShot) {
      await hit(mode, oldShot.damage, oldShot);
      assert.equal(await health('Player'), 200, 'old round projectile cannot hit a new round');
    }
    // Force an accepted incoming lethal hit to cover a third round in both modes.
    await hit(mode, 200, {id:'round-two-loss'});
    assert.equal(await phase(), 'result');
    assert.match(await wins('dummy'), /1 of 2/);
    await nextRound(3);
    await hit(mode, 200, {id:'round-two-loss'});
    assert.equal(await health('Player'), 200, 'old incoming hit cannot replay');
    await winRound();
    assert.equal(await phase(), 'complete');
    assert.match(await wins('player'), /2 of 2/);
    assert.equal(await page.locator('#' + mode + 'Defeat').isVisible(), true);
    assert.match(await page.locator('#' + mode + 'Defeat strong').textContent(), /Player wins the match/);
    assert.equal(await page.evaluate(() => window.matchResults.length), 1);
    await capture(mode + '-match-result');
    const timer = await page.locator('#' + mode + 'Timer').textContent();
    await advance(10000);
    await hit(mode);
    await cast('Basic Cast');
    assert.equal(await page.locator('#' + mode + 'Timer').textContent(), timer);
    assert.equal(await phase(), 'complete');
    await page.locator('#' + mode + 'ResetDummy').focus();
    await page.keyboard.press('Enter');
    assert.equal(await phase(), 'intro');
    assert.match(await wins('player'), /0 of 2/);
    assert.equal(await health('Player'), 200);
    assert.equal(await health('Dummy'), 200);
    assert.equal(await page.locator('#' + mode + 'Camera').evaluate(node => node === document.activeElement), true);
    await advance(2000);
    await hit(mode);
    await nextRound(2);
    await hit(mode);
    assert.equal(await phase(), 'complete');
    assert.equal(await arena().getAttribute('data-round'), '2');
    assert.match(await page.locator('#' + mode + 'Defeat strong').textContent(), /wins the match/);
    await capture(mode === 'practiceArena' ? 'practice-arena-player-defeat' : 'soloDuel-match-loss');
    await page.reload();
    assert.equal(await phase(), 'waiting');
    assert.match(await wins('dummy'), /0 of 2/);
    await input(true);
    await advance(2000);
    await winRound();
    await page.locator('#gameBack').click();
    await advance(10000);
    await page.evaluate(mode => { location.hash = mode; }, mode);
    await arena().waitFor({state:'visible'});
    assert.equal(await phase(), 'result');
    assert.match(await wins('player'), /1 of 2/);
    await input(true);
    await nextRound(2);
    await winRound();
    assert.equal(await phase(), 'complete');
    await capture(mode === 'practiceArena' ? 'practice-arena-defeat' : 'soloDuel-two-round-win');
  }
  await page.goto(base + '#spellTraining');
  assert.equal(await page.locator('#spellTrainingView .arena-round-banner, #spellTrainingView .arena-round-score').count(), 0);
  assert.equal(await page.evaluate(() => window.cameraCalls), 0);
  assert.deepEqual(errors, []);
  console.log('PASS: shared rounds, readiness, intro, Fight, timer, 2–0 and 2–1 results, both winners, reset, stale hits, pauses, navigation, match events, keyboard focus, and desktop/narrow previews. Simulated input only.');
} finally {
  await browser?.close();
  if (api && api.exitCode === null && api.signalCode === null) {
    const exited = once(api, 'exit'); api.kill(); await exited;
  }
  await rm(folder, {recursive:true, force:true});
}

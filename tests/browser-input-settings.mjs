import assert from 'node:assert/strict';
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
  assert.equal(await page.locator('#swap, #fightSwap, #trainingSwap').count(), 0);
  const openMode = async name => {
    assert.equal(await page.evaluate(() => window.cameraCalls), 0);
    if (await page.locator('#gameView').isVisible()) await page.locator('#gameBack').click();
    await page.getByRole('button', {name, exact:true}).click();
  };
  const openOptions = async () => {
    await page.keyboard.press('Escape');
    await page.getByRole('button', {name:'Options', exact:true}).click();
  };
  assert.equal(await page.locator('#fightHand, #fightPoint, #trainingHand, #trainingPoint').count(), 0);
  await openOptions();
  assert.equal(await page.locator('#handSetting').inputValue(), 'Left');
  assert.equal(await page.locator('#pointSetting').inputValue(), 'tip');
  await page.locator('#handSetting').selectOption('Right');
  await page.locator('#pointSetting').selectOption('grip');
  await page.keyboard.press('Escape');
  for (const mode of ['Training', 'Fight']) {
    await openMode(mode);
    assert.equal(await page.evaluate(async () => (await import('/settings.js')).getSettings().hand), 'Right');
    assert.equal(await page.evaluate(async () => (await import('/settings.js')).getSettings().point), 'grip');
    const record = records.findLast(record => record.cause === 'tab_change');
    assert.equal(record.hand, 'Right');
    assert.equal(record.point, 'grip');
  }
  await page.reload();
  assert.equal(await page.locator('#fightView').isVisible(), true);
  assert.equal(new URL(page.url()).hash, '#fight');
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
  await openMode('Training');
  assert.equal(await page.evaluate(async () => (await import('/settings.js')).getSettings().hand), 'Left');
  await setInput('Right', 'grip');
  for (const name of ['Training', 'Fight']) {
    await openMode(name);
    assert.equal(await page.evaluate(async () => (await import('/settings.js')).getSettings().hand), 'Right');
    assert.equal(await page.evaluate(async () => (await import('/settings.js')).getSettings().point), 'grip');
  }
  await page.reload();
  assert.equal(await page.locator('#fightView').isVisible(), true);
  assert.equal(new URL(page.url()).hash, '#fight');
  await openMode('Training');
  assert.equal(await page.evaluate(async () => (await import('/settings.js')).getSettings().hand), 'Right');
  assert.equal(await page.evaluate(async () => (await import('/settings.js')).getSettings().point), 'grip');
  await setInput('Left', 'tip');
  await openMode('Training');
  assert.equal(await page.evaluate(async () => (await import('/settings.js')).getSettings().hand), 'Left');
  assert.equal(await page.evaluate(async () => (await import('/settings.js')).getSettings().point), 'tip');
  assert.equal(await page.locator('#video').evaluate(el => getComputedStyle(el).transform), 'matrix(-1, 0, 0, 1, 0, 0)');

  // Candidates stay in .tmp until they pass the manual preview checks.
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
      const options = {path:path.join(output, `${prefix}-${size}.png`), animations:'disabled'};
      if (selector) await page.locator(selector).screenshot(options);
      else await page.screenshot({...options, fullPage:true});
    }
  };
  await openOptions();
  await capture('options');
  await page.keyboard.press('Escape');
  await openMode('Fight');
  await capture('fight-gameplay');
  for (const [id,shape,prefix] of [['expelliarmus','Expelliarmus','training-layout']]) {
    await page.reload();
    assert.equal(await page.locator('#fightView').isVisible(), true);
    assert.equal(new URL(page.url()).hash, '#fight');
    await openMode('Training');
    await page.locator('#trainingSpell').selectOption(id);
    await page.locator('#trainingStart').click();
    // Simulated lesson events only. No camera stream or detector is started.
    await page.evaluate(shape => {
      for (let i = 0; i < 3; i++) document.dispatchEvent(new CustomEvent('wizard:training-gesture', {
        detail:{id:crypto.randomUUID(), type:'cast', accepted:true, shape, score:95}
      }));
    }, shape);
    assert.equal(await page.locator('#trainingCount').textContent(), '3 / 3');
    await page.waitForFunction(() => document.querySelector('#trainingEffects').childElementCount === 0
      && document.querySelector('#trainingDummyActor').dataset.disarmed === 'false', null, {timeout:10000});
    // Clear transient reactions and show the stable completed-lesson message.
    await page.locator('#trainingSpell').selectOption('protego');
    await page.locator('#trainingSpell').selectOption(id);
    await capture(prefix);
    assert.equal(await page.evaluate(() => window.cameraCalls), 0);
  }
  for (const id of ['basic-cast', 'protego', 'expelliarmus', 'confringo']) {
    await page.locator('#trainingSpell').selectOption(id);
    await capture(`training-${id}`, '#trainingGuide');
  }
  assert.equal(await page.evaluate(() => window.cameraCalls), 0);
  assert.ok(records.length > 0);
  assert.ok(records.every(record => !Object.hasOwn(record, 'swap')));

  await page.setViewportSize({width:1920,height:1080});
  await page.goto(new URL('brandbook.html', base).href);
  await page.evaluate(() => document.fonts.ready);
  for (const name of ['menu', 'training', 'fight']) {
    await page.locator(`#tab-${name}`).click();
    await page.locator('#screens').screenshot({path:path.join(output, `brandbook-${name}.png`), animations:'disabled'});
  }
  assert.equal(await page.evaluate(() => window.cameraCalls), 0);
  assert.deepEqual(errors, []);
  console.log('PASS: input controls, shared hand/point settings, saved drawing hand and track point, mirrored preview, records, desktop/narrow layout. No camera access.');
} finally {
  await browser?.close();
  if (api && api.exitCode === null && api.signalCode === null) {
    const exited = once(api, 'exit'); api.kill(); await exited;
  }
  await rm(folder, {recursive:true, force:true});
}

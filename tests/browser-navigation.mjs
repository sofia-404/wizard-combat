import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {mkdir, mkdtemp, cp, copyFile, rm} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {checkSiteHistory} from './browser-history.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
await mkdir(path.join(root, '.tmp'), {recursive:true});
const folder = await mkdtemp(path.join(root, '.tmp/navigation-server-'));
await cp(path.join(root, 'dist'), path.join(folder, 'dist'), {recursive:true});
await copyFile(path.join(root, 'server.mjs'), path.join(folder, 'server.mjs'));
let api, browser;
try {
  api = spawn(process.execPath, ['server.mjs'], {cwd:folder, env:{...process.env, PORT:'25195'}, stdio:['ignore','pipe','pipe']});
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
    window.viewChanges = [];
    document.addEventListener('wizard:view', event => window.viewChanges.push(event.detail.view));
    // All streams come from a canvas. Never call the real camera API.
    navigator.mediaDevices.getUserMedia = async () => {
      window.cameraCalls++;
      if (!window.allowCamera) throw Error('Camera access is forbidden in this test');
      const canvas = document.createElement('canvas');
      canvas.width = 640; canvas.height = 480;
      canvas.getContext('2d').fillRect(0, 0, 640, 480);
      window.cameraStream = canvas.captureStream(30);
      if (window.delayCamera) await new Promise(resolve => { window.resolveCamera = resolve; });
      return window.cameraStream;
    };
    window.Worker = class {
      postMessage(data) {
        if (data.type === 'init') { queueMicrotask(() => this.onmessage({data:{type:'ready'}})); return; }
        data.bitmap.close();
        queueMicrotask(() => this.onmessage({data:{type:'result',t:data.t,inference:1,landmarks:[],handedness:[]}}));
      }
      terminate() {}
    };
  });
  const records = [], errors = [];
  await context.route('**/api/events', async route => {
    records.push(JSON.parse(route.request().postData()));
    await route.fulfill({status:201, contentType:'application/json', body:'{"saved":true}'});
  });
  await context.route('**/api/results', route => route.fulfill({status:201, contentType:'application/json', body:'{"saved":true}'}));
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  const screens = {menu:'mainMenu', training:'trainingView', fight:'fightView', options:'optionsView', credits:'creditsView'};
  const checkScreen = async name => {
    await page.locator('#' + screens[name]).waitFor({state:'visible'});
    for (const [other, id] of Object.entries(screens)) assert.equal(await page.locator('#' + id).isVisible(), other === name);
    assert.equal(await page.locator('#legacyPracticeView').count(), 0);
    const focus = name === 'menu' ? '#mainMenu button' : ['fight','training'].includes(name) ? '#gameBack' : '#' + name + 'Title';
    assert.equal(await page.locator(focus).evaluateAll(elements => elements.includes(document.activeElement)), true);
    if (['fight','training'].includes(name)) {
      assert.equal(await page.locator('#viewport').evaluate(element => element.parentElement.id), name + 'CameraMount');
      assert.equal(await page.locator('#video').evaluate(element => element.srcObject), null);
    }
  };
  const hash = async name => {
    await page.evaluate(name => { location.hash = name; }, name);
    await checkScreen(name);
  };
  for (const viewport of [{width:1920,height:1080}, {width:390,height:844}]) {
    await page.setViewportSize(viewport);
    for (const name of Object.keys(screens)) {
      await page.goto(base + '#' + name);
      await checkScreen(name);
      assert.equal(await page.evaluate(() => window.cameraCalls), 0);
      await page.reload();
      await checkScreen(name);
      assert.equal(new URL(page.url()).hash, '#' + name);
      assert.equal(await page.evaluate(() => window.cameraCalls), 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    }
  }
  for (const fragment of ['', '#unknown', '#legacy-practice', '#game', '#constructor', '#%E0%A4%A']) {
    await page.goto(base + fragment);
    await checkScreen('menu');
    assert.equal(new URL(page.url()).hash, fragment ? '#menu' : '');
  }
  await page.goto(base + '?check=keep#options');
  await page.getByRole('button', {name:'Back to menu', exact:true}).click();
  assert.equal(new URL(page.url()).search, '?check=keep');
  for (const name of ['Fight','Training','Options','Credits']) {
    await page.getByRole('button', {name, exact:true}).focus();
    await page.keyboard.press('Enter');
    await checkScreen(name.toLowerCase());
    await page.keyboard.press('Escape');
    await checkScreen('menu');
    assert.equal(await page.getByRole('button', {name, exact:true}).evaluate(element => element === document.activeElement), true);
  }
  // Both popstate and hashchange may fire for one history move. Apply it once.
  await page.goto(base + '#menu');
  await page.getByRole('button', {name:'Training', exact:true}).click();
  await page.locator('#gameBack').click();
  await page.getByRole('button', {name:'Fight', exact:true}).click();
  await page.goBack(); await checkScreen('menu');
  await page.goBack(); await checkScreen('training');
  const changes = await page.evaluate(() => window.viewChanges.length);
  const historyLength = await page.evaluate(() => history.length);
  await page.evaluate(() => {
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    document.querySelector('[data-view="training"]').click();
  });
  assert.equal(await page.evaluate(() => window.viewChanges.length), changes);
  assert.equal(await page.evaluate(() => history.length), historyLength);
  await page.goForward(); await checkScreen('menu');
  await page.goForward(); await checkScreen('fight');
  assert.deepEqual(await page.evaluate(() => window.viewChanges), ['training',null,'fight',null,'training',null,'fight']);

  // Navigation keeps state; reload clears state while keeping the screen.
  await page.locator('#gameBack').click();
  await page.getByRole('button', {name:'Options', exact:true}).click();
  await page.locator('#handSetting').selectOption('Right');
  await page.keyboard.press('Escape');
  await page.getByRole('button', {name:'Training', exact:true}).click();
  await page.locator('#trainingStart').click();
  await page.evaluate(() => {
    for (let i=0;i<3;i++) document.dispatchEvent(new CustomEvent('wizard:training-gesture', {
      detail:{id:crypto.randomUUID(),type:'cast',accepted:true,shape:'Expelliarmus',score:95}
    }));
  });
  assert.equal(await page.locator('#trainingCount').textContent(), '3 / 3');
  await hash('fight');
  await hash('training');
  assert.equal(await page.locator('#trainingCount').textContent(), '3 / 3');
  await page.locator('#trainingSpell').selectOption('protego');
  await page.reload(); await checkScreen('training');
  assert.equal(await page.locator('#trainingSpell').inputValue(), 'expelliarmus');
  assert.equal(await page.locator('#trainingCount').textContent(), '0 / 3');
  assert.equal(await page.locator('#trainingLearnedTotal').textContent(), '0 of 4 spells learned');
  assert.equal(await page.locator('#handSetting').inputValue(), 'Right');
  await hash('fight');
  await page.evaluate(() => document.dispatchEvent(new CustomEvent('wizard:cast', {detail:{id:crypto.randomUUID(),shape:'Basic Cast',score:95}})));
  await page.waitForFunction(() => document.querySelector('#fightDummyHealth').value === 170);
  await hash('training'); await hash('fight');
  assert.equal(await page.locator('#fightDummyHealth').evaluate(element => element.value), 170);
  await page.reload(); await checkScreen('fight');
  assert.equal(await page.locator('#fightDummyHealth').evaluate(element => element.value), 200);
  assert.equal(await page.locator('#fightHits').textContent(), '0 hits');

  // A direct game-to-game route must stop an active or pending camera.
  await page.evaluate(() => { window.allowCamera = true; });
  await page.locator('#fightCamera').click();
  await page.waitForFunction(async () => (await import('/input-state.js')).getInputState().camera === 'Stop camera');
  await page.evaluate(() => {
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
  assert.equal(await page.evaluate(() => document.querySelector('#video').srcObject === window.cameraStream), true);
  assert.equal(await page.evaluate(() => window.cameraStream.getVideoTracks()[0].readyState), 'live');
  await hash('training');
  assert.equal(await page.evaluate(() => window.cameraStream.getVideoTracks()[0].readyState), 'ended');
  await page.evaluate(() => { window.delayCamera = true; });
  await page.locator('#trainingCamera').click();
  await page.waitForFunction(() => typeof window.resolveCamera === 'function');
  await hash('fight');
  await page.evaluate(() => window.resolveCamera());
  await page.waitForFunction(() => window.cameraStream.getVideoTracks()[0].readyState === 'ended');
  assert.equal(await page.locator('#video').evaluate(element => element.srcObject), null);
  await page.evaluate(() => { window.delayCamera = false; });
  await page.locator('#fightCamera').click();
  await page.waitForFunction(async () => (await import('/input-state.js')).getInputState().camera === 'Stop camera');
  await page.goBack(); await checkScreen('training');
  assert.equal(await page.evaluate(() => window.cameraStream.getVideoTracks()[0].readyState), 'ended');
  await page.evaluate(() => { location.hash = 'unsupported'; });
  await checkScreen('menu');
  assert.equal(new URL(page.url()).hash, '#menu');

  await page.goBack(); await checkScreen('training');

  // Route restoration does not depend on browser storage.
  const isolated = await browser.newContext({permissions:[]});
  await isolated.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {get(){throw Error('Storage blocked');}});
    navigator.mediaDevices.getUserMedia = () => { throw Error('No camera access'); };
  });
  await isolated.route('**/api/events', route => route.fulfill({status:201,body:'{"saved":true}'}));
  const fresh = await isolated.newPage();
  fresh.on('pageerror', error => errors.push(error.message));
  await fresh.goto(base);
  assert.equal(await fresh.locator('#mainMenu').isVisible(), true);
  await fresh.goto(base + '#training');
  await fresh.reload();
  assert.equal(await fresh.locator('#trainingView').isVisible(), true);
  assert.equal(await fresh.locator('#video').evaluate(element => element.srcObject), null);
  await isolated.close();
  await checkSiteHistory(browser, base, false);
  // Full Chromium supports cache restores; the default headless shell disables them.
  const cachedBrowser = await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE, channel:'chromium', headless:true, ignoreDefaultArgs:['--disable-back-forward-cache']});
  try { await checkSiteHistory(cachedBrowser, base, true); } finally { await cachedBrowser.close(); }
  assert.ok(records.some(record => record.cause === 'tab_change' && record.activeTab === 'training'));
  assert.deepEqual(errors, []);
  console.log('PASS: routes, reload, history, focus, invalid routes, camera cleanup, game resets, blocked storage, desktop and narrow layout. Simulated input only.');
} finally {
  await browser?.close();
  if (api && api.exitCode === null && api.signalCode === null) {
    const exited = once(api, 'exit'); api.kill(); await exited;
  }
  await rm(folder, {recursive:true, force:true});
}

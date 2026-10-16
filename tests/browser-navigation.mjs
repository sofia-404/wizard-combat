import {startSimulatedArena} from './browser-game-mode.mjs';
import {startSelectedMode} from './browser-game-mode.mjs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {mkdir, mkdtemp, cp, copyFile, rm} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {startSimulatedLesson} from './browser-health-checks.mjs';
import {checkSoloDuel} from './browser-solo-duel.mjs';
import {checkSiteHistory} from './browser-history.mjs';
import {checkStageSelection} from './browser-stage-selection.mjs';
import {checkCharacterSelection} from './browser-character-selection.mjs';
import {checkBattleSkins} from './browser-battle-skins.mjs';
import {checkReloadRendering} from './browser-reload-rendering.mjs';

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
  await checkCharacterSelection(browser, base, root);
  await checkBattleSkins(browser, base, root);
  await checkStageSelection(browser, base, root);
  await checkReloadRendering(browser, base, root);
  const context = await browser.newContext({permissions:[], reducedMotion:'reduce', viewport:{width:1920,height:1080}});
  await context.addInitScript(() => {
    window.cameraCalls = 0;
    window.viewChanges = [];
    window.focusCalls = [];
    const focus = HTMLElement.prototype.focus;
    HTMLElement.prototype.focus = function(...args) {
      window.focusCalls.push(this.id || this.dataset.view);
      return focus.apply(this, args);
    };
    document.addEventListener('wizard:view', event => window.viewChanges.push(event.detail.view));
    // All streams come from a canvas. Never call the real camera API.
    navigator.mediaDevices.getUserMedia = async () => {
      window.cameraCalls++;
      if (window.deferCameraFailure) return new Promise((resolve, reject) => {
        window.rejectCamera = () => reject(new DOMException('Simulated denial', 'NotAllowedError'));
      });
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
  await checkSoloDuel(page, base);
  const screens = {menu:'mainMenu', spellTraining:'spellTrainingView', practiceArena:'practiceArenaView', soloDuel:'soloDuelView', options:'optionsView', credits:'creditsView'};
  const checkScreen = async (name, expectFocus = true) => {
    await page.locator('#' + screens[name]).waitFor({state:'visible'});
    for (const [other, id] of Object.entries(screens)) assert.equal(await page.locator('#' + id).isVisible(), other === name);
    assert.deepEqual(await page.locator('#gameView [role="region"]').evaluateAll(nodes => nodes.map(node => node.id)), ['practiceArenaView', 'soloDuelView', 'spellTrainingView']);
    const focus = name === 'menu' ? '#mainMenu button' : ['practiceArena','spellTraining','soloDuel'].includes(name) ? '#gameBack' : '#' + name + 'Title';
    if (expectFocus) assert.equal(await page.locator(focus).evaluateAll(elements => elements.includes(document.activeElement)), true);
    if (['practiceArena','spellTraining','soloDuel'].includes(name)) {
      await page.locator('#' + name + 'View .practice-arena').waitFor({state:'visible'});
      assert.equal(await page.locator('#viewport').evaluate(element => element.parentElement.id), name + 'CameraMount');
      assert.equal(await page.locator('#video').evaluate(element => element.srcObject), null);
    }
  };
  const checkStartup = async name => {
    await checkScreen(name, false);
    assert.deepEqual(await page.evaluate(() => window.focusCalls), []);
  };
  const checkKeyboardFocus = async selector => {
    const state = await page.locator(selector).evaluate(element => {
      const style = getComputedStyle(element);
      const outline = style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0;
      const menuMarker = element.matches('.menu-nav button') && getComputedStyle(element, '::before').opacity === '1';
      return {focused:element === document.activeElement, visible:element.matches(':focus-visible'),
        indicator:outline || menuMarker, active:document.activeElement.id || document.activeElement.tagName};
    });
    assert.ok(state.focused && state.visible && state.indicator,
      `${page.url()}: expected visible keyboard focus on ${selector}; ${JSON.stringify(state)}`);
  };
  const hash = async name => {
    await page.evaluate(name => { location.hash = name; }, name);
    await checkScreen(name);
  };
  for (const viewport of [{width:1920,height:1080}, {width:390,height:844}]) {
    await page.setViewportSize(viewport);
    for (const name of Object.keys(screens)) {
      await page.goto(base + '?load=' + viewport.width + '-' + name + '#' + name);
      await checkStartup(name);
      assert.equal(await page.locator(':focus-visible').count(), 0);
      assert.equal(await page.evaluate(() => window.cameraCalls), 0);
      if (name === 'menu') {
        assert.deepEqual(await page.locator('.menu-nav button').allTextContents(),
          ['Spell Training','Practice Arena','Solo Duel','Multiplayer','Options','Credits']);
        for (const label of ['Multiplayer']) {
          const button = page.getByRole('button', {name:label, exact:true});
          assert.equal(await button.isDisabled(), true);
          await button.evaluate(element => element.click());
          assert.equal(await page.locator('#mainMenu').isVisible(), true);
        }
      }
      if (['practiceArena','spellTraining','soloDuel'].includes(name)) {
        const arena = await page.locator('#' + name + 'View .practice-arena').boundingBox();
        const button = await page.locator('#' + name + 'View .practice-arena > #' + name + 'Camera').boundingBox();
        assert.ok(Math.abs(button.x + button.width / 2 - arena.x - arena.width / 2) < 1);
        if (name === 'spellTraining' && viewport.width === 390) {
          const guide = await page.locator('#spellTrainingGuide').boundingBox();
          assert.ok(button.y >= arena.y && button.y + button.height <= guide.y, 'Training camera control stays above its guide');
        } else assert.ok(Math.abs(button.y + button.height / 2 - arena.y - arena.height / 2) < 1);
      }
      await page.reload();
      await checkStartup(name);
      assert.equal(await page.locator(':focus-visible').count(), 0);
      assert.equal(new URL(page.url()).hash, '#' + name);
      assert.equal(await page.evaluate(() => window.cameraCalls), 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      const first = ['practiceArena','spellTraining','soloDuel'].includes(name) ? '#gameBack' : name === 'menu' ? '[data-view="spellTraining"]' : '#' + name + 'View [data-back]';
      await page.keyboard.press('Tab');
      await checkKeyboardFocus(first);
      await page.keyboard.press('Tab');
      if (['practiceArena','spellTraining','soloDuel'].includes(name)) {
        await checkKeyboardFocus('#' + name + 'Camera');
        if (name === 'spellTraining') {
          await page.keyboard.press('Tab');
          await checkKeyboardFocus('#spellTrainingSpell');
          await page.keyboard.press('Shift+Tab');
          await checkKeyboardFocus('#spellTrainingCamera');
        }
      }
      await page.keyboard.press('Shift+Tab');
      await checkKeyboardFocus(first);
      if (['practiceArena','spellTraining','soloDuel'].includes(name)) {
        await page.keyboard.press('Space');
        await checkScreen('menu');
        await page.keyboard.press('Enter');
        await startSelectedMode(page, true);
        await checkScreen(name);
        await checkKeyboardFocus('#gameBack');
      }
    }
    // Pointer navigation must not carry a keyboard outline to the next screen.
    await page.goto(base + '?pointer=' + viewport.width + '#practiceArena');
    await page.keyboard.press('Tab');
    await checkKeyboardFocus('#gameBack');
    for (const name of ['Spell Training','Practice Arena','Options','Credits','Spell Training']) {
      await page.getByRole('button', {name:'Back to menu', exact:true}).click();
      await checkScreen('menu', false);
      assert.equal(await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle), 'none');
      await page.keyboard.press('Tab');
      await checkKeyboardFocus('[data-view="spellTraining"]');
      await page.getByRole('button', {name, exact:true}).click();
      await startSelectedMode(page);
      await checkScreen(({'Practice Arena':'practiceArena','Solo Duel':'soloDuel','Spell Training':'spellTraining'}[name] || name.toLowerCase()), false);
      assert.equal(await page.locator(':focus-visible:visible').count(), 0);
    }
    await page.keyboard.press('Tab');
    await checkKeyboardFocus('#gameBack');
  }
  // Camera startup restores keyboard focus only while the user stays put.
  for (const name of ['practiceArena','spellTraining','soloDuel']) for (const outcome of ['failure','success']) {
    for (const action of ['stay','stay-space','tab','focus-away','pointer-away','leave','pointer-start']) {
      await page.goto(base + '?camera-focus=' + name + '-' + outcome + '-' + action + '#' + name);
      await page.evaluate(outcome => {
        window.deferCameraFailure = outcome === 'failure';
        window.allowCamera = outcome === 'success';
        window.delayCamera = outcome === 'success';
      }, outcome);
      const button = page.locator('#' + name + 'Camera');
      await button.waitFor({state:'visible'});
      if (action === 'pointer-start') await button.click();
      else {
        // All game views put Start camera immediately after Back to menu.
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        await checkKeyboardFocus('#' + name + 'Camera');
        await page.keyboard.press(action === 'stay-space' ? 'Space' : 'Enter');
      }
      await page.waitForFunction(outcome => typeof window[outcome === 'success' ? 'resolveCamera' : 'rejectCamera'] === 'function', outcome);
      assert.equal(await button.isDisabled(), true);
      if (action === 'tab') {
        await page.keyboard.press('Shift+Tab');
        await checkKeyboardFocus('#gameBack');
      }
      if (action === 'focus-away') {
        await page.locator('#gameBack').focus();
        await page.locator('#gameBack').evaluate(element => element.blur());
      }
      if (action === 'pointer-away') await page.mouse.click(1, 1);
      if (action === 'leave') {
        await page.keyboard.press('Escape');
        await page.keyboard.press('Enter');
        await startSelectedMode(page, true);
        await checkScreen(name);
      }
      const focusCalls = await page.evaluate(() => window.focusCalls.length);
      await page.evaluate(outcome => window[outcome === 'success' ? 'resolveCamera' : 'rejectCamera'](), outcome);
      if (outcome === 'success') {
        if (action === 'leave') await page.waitForFunction(() => window.cameraStream.getVideoTracks()[0].readyState === 'ended');
        else await page.waitForFunction(async () => (await import('/input-state.js')).getInputState().camera === 'Stop camera');
      }
      await page.waitForFunction(() => !document.querySelector(location.hash + 'Camera').disabled);
      // Let stale promise handlers finish before checking that they kept focus.
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const stayed = action === 'stay' || action === 'stay-space';
      if (action !== 'leave') {
        assert.equal(await button.evaluate(element => element.parentElement.matches('.game-navigation')), outcome === 'success');
        assert.equal(await button.textContent(), outcome === 'success' ? 'Stop camera' : 'Start camera');
        if (outcome !== 'success') assert.match(await page.locator('#' + name + 'Events').textContent(), /Camera permission denied/);
      }
      if (stayed) await checkKeyboardFocus('#' + name + 'Camera');
      else if (action === 'tab' || action === 'leave') await checkKeyboardFocus('#gameBack');
      else if (action === 'pointer-start') assert.equal(await button.evaluate(element => element.matches(':focus-visible')), false);
      else assert.equal(await button.evaluate(element => element === document.activeElement), false, name + '/' + action);
      if (!stayed) assert.equal(await page.evaluate(() => window.focusCalls.length), focusCalls, name + '/' + outcome + '/' + action);
      assert.equal(await page.evaluate(() => window.cameraCalls), 1);
      if (outcome === 'success' && stayed) {
        await page.keyboard.press('Space');
        assert.equal(await button.textContent(), 'Start camera');
        await checkKeyboardFocus('#' + name + 'Camera');
        assert.equal(await page.evaluate(() => window.cameraStream.getVideoTracks()[0].readyState), 'ended');
      }
    }
  }
  // Hiding an active game control must keep keyboard focus on its replacement.
  for (const action of ['Enter','Space','mouse']) {
    const activate = async selector => {
      if (action === 'mouse') await page.locator(selector).click();
      else {
        await checkKeyboardFocus(selector);
        await page.keyboard.press(action);
      }
    };
    const checkReplacement = async selector => {
      if (action === 'mouse') assert.equal(await page.locator(':focus-visible:visible').count(), 0);
      else await checkKeyboardFocus(selector);
    };
    const completeLesson = async prefix => page.evaluate(async prefix => {
      const {spells} = await import('/spells/index.js');
      const shape = spells[document.querySelector('#spellTrainingSpell').value].label;
      for (let i = 0; i < 3; i++) document.dispatchEvent(new CustomEvent('wizard:spell-training-gesture', {
        detail:{id:prefix + i, type:'cast', accepted:true, shape, score:99}
      }));
    }, prefix);
    await page.goto(base + '?lesson-focus=' + action + '#spellTraining');
    await page.locator('#spellTrainingCamera').waitFor({state:'visible'});
    await page.evaluate(async () => (await import('/input-state.js')).updateInputState({camera:'Stop camera', cameraDisabled:false}));
    assert.equal(await page.locator('#spellTrainingStart').count(), 0);
    if (action !== 'mouse') {
      for (let i = 0; i < 8 && !await page.locator('#spellTrainingCamera').evaluate(node => node === document.activeElement); i++) await page.keyboard.press('Tab');
    } else await page.locator('#spellTrainingSpell').click();
    const focused = await page.evaluate(() => document.activeElement.id);
    await completeLesson('complete-');
    assert.equal(await page.evaluate(() => document.activeElement.id), focused);
    await page.evaluate(async () => {
      const {updateInputState} = await import('/input-state.js');
      updateInputState({cameraState:'Camera on'});
      updateInputState({camera:'Start camera',cameraState:'Camera stopped'});
      updateInputState({camera:'Stop camera',cameraState:'Camera on'});
    });
    assert.equal(await page.locator('#spellTrainingCount').textContent(), '0 / 3');
    assert.equal(await page.locator('#spellTrainingCompletion').isHidden(), true);
    assert.equal(await page.evaluate(() => document.activeElement.id), focused);
    await page.locator('#gameBack').focus();
    await completeLesson('away-');
    assert.equal(await page.locator('#gameBack').evaluate(element => element === document.activeElement), true);

    await page.goto(base + '?defeat-focus=' + action + '#practiceArena');
    await page.locator('#practiceArenaCamera').waitFor({state:'visible'});
    await page.evaluate(() => { window.allowCamera = true; });
    if (action !== 'mouse') { await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); }
    await activate('#practiceArenaCamera');
    await page.waitForFunction(async () => (await import('/input-state.js')).getInputState().camera === 'Stop camera');
    await page.waitForFunction(() => document.querySelector('#practiceArenaView .practice-arena').dataset.roundPhase === 'active');
    // Simulated casts exercise the UI state without a real camera or detector.
    for (let round = 1; round <= 2; round++) {
    for (let i = 0; i < 7; i++) {
      await page.evaluate(i => document.dispatchEvent(new CustomEvent('wizard:cast', {
        detail:{id:crypto.randomUUID(), shape:'Expelliarmus', score:99}
      })), i);
      await page.waitForFunction(i => document.querySelector('#practiceArenaDummyHealth').value === Math.max(0, 200 - (i + 1) * 30), i);
    }
    if(round === 1)await page.waitForFunction(() => document.querySelector('#practiceArenaView .practice-arena').dataset.roundPhase === 'active');
    }
    await activate('#practiceArenaCamera');
    assert.equal(await page.locator('#practiceArenaCamera').isHidden(), true);
    await checkReplacement('#practiceArenaResetDummy');
    await activate('#practiceArenaResetDummy');
    await checkReplacement('#practiceArenaCamera');
    assert.equal(await page.locator('#practiceArenaCamera').textContent(), 'Start camera');
  }
  for (const fragment of ['', '#unknown', '#game', '#multiplayer', '#constructor', '#%E0%A4%A']) {
    await page.goto(base + '?invalid=' + encodeURIComponent(fragment) + fragment);
    await checkStartup('menu');
    assert.equal(new URL(page.url()).hash, fragment ? '#menu' : '');
  }
  await page.goto(base + '?check=keep#options');
  await page.getByRole('button', {name:'Back to menu', exact:true}).click();
  assert.equal(new URL(page.url()).search, '?check=keep');
  await page.goto(base + '?keyboard#menu');
  for (const name of ['Spell Training','Practice Arena','Solo Duel','Options','Credits']) {
    await page.keyboard.press('Tab');
    assert.equal(await page.getByRole('button', {name, exact:true}).evaluate(element => element === document.activeElement && element.matches(':focus-visible')), true);
    await page.keyboard.press('Enter');
    await startSelectedMode(page, true);
    await checkScreen(({'Practice Arena':'practiceArena','Solo Duel':'soloDuel','Spell Training':'spellTraining'}[name] || name.toLowerCase()));
    await page.keyboard.press('Escape');
    await checkScreen('menu');
    assert.equal(await page.getByRole('button', {name, exact:true}).evaluate(element => element === document.activeElement), true);
  }
  // Both popstate and hashchange may fire for one history move. Apply it once.
  await page.goto(base + '#menu');
  await page.getByRole('button', {name:'Spell Training', exact:true}).click(); await startSelectedMode(page);
  await page.locator('#gameBack').click();
  await page.getByRole('button', {name:'Practice Arena', exact:true}).click(); await startSelectedMode(page);
  await page.goBack(); await checkScreen('menu');
  await page.goBack(); await checkScreen('spellTraining');
  const changes = await page.evaluate(() => window.viewChanges.length);
  const historyLength = await page.evaluate(() => history.length);
  await page.evaluate(() => {
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
  assert.equal(await page.evaluate(() => window.viewChanges.length), changes);
  assert.equal(await page.evaluate(() => history.length), historyLength);
  await page.goForward(); await checkScreen('menu');
  await page.goForward(); await checkScreen('practiceArena');
  assert.deepEqual(await page.evaluate(() => window.viewChanges), ['spellTraining',null,'practiceArena',null,'spellTraining',null,'practiceArena']);

  // Navigation keeps state; reload clears state while keeping the screen.
  await page.locator('#gameBack').click();
  await page.getByRole('button', {name:'Options', exact:true}).click();
  await page.locator('#handSetting').selectOption('Right');
  await page.keyboard.press('Escape');
  await page.getByRole('button', {name:'Spell Training', exact:true}).click(); await startSelectedMode(page);
  await startSimulatedLesson(page);
  await page.evaluate(() => {
    for (let i=0;i<3;i++) document.dispatchEvent(new CustomEvent('wizard:spell-training-gesture', {
      detail:{id:crypto.randomUUID(),type:'cast',accepted:true,shape:'Expelliarmus',score:95}
    }));
  });
  assert.equal(await page.locator('#spellTrainingCount').textContent(), '3 / 3');
  await hash('practiceArena');
  await hash('spellTraining');
  assert.equal(await page.locator('#spellTrainingCount').textContent(), '3 / 3');
  await page.locator('#spellTrainingSpell').selectOption('protego');
  await page.reload(); await checkStartup('spellTraining');
  assert.equal(await page.locator('#spellTrainingSpell').inputValue(), 'expelliarmus');
  assert.equal(await page.locator('#spellTrainingCount').textContent(), '0 / 3');
  assert.equal(await page.locator('#spellTrainingLearnedTotal').textContent(), '0 of 4 spells learned');
  assert.equal(await page.locator('#handSetting').inputValue(), 'Right');
  await hash('practiceArena');
  await startSimulatedArena(page, 'practiceArena', false);
  await page.evaluate(() => document.dispatchEvent(new CustomEvent('wizard:cast', {detail:{id:crypto.randomUUID(),shape:'Basic Cast',score:95}})));
  await page.waitForFunction(() => document.querySelector('#practiceArenaDummyHealth').value === 170);
  await hash('spellTraining'); await hash('practiceArena');
  assert.equal(await page.locator('#practiceArenaDummyHealth').evaluate(element => element.value), 170);
  await page.reload(); await checkStartup('practiceArena');
  assert.equal(await page.locator('#practiceArenaDummyHealth').evaluate(element => element.value), 200);
  assert.equal(await page.locator('#practiceArenaHits').textContent(), '0 hits');

  // A direct game-to-game route must stop an active or pending camera.
  await page.evaluate(() => { window.allowCamera = true; });
  assert.equal(await page.locator('.practice-arena > #practiceArenaCamera').isVisible(), true);
  await page.evaluate(() => { window.delayCamera = true; });
  await page.locator('#practiceArenaCamera').click();
  await page.waitForFunction(() => typeof window.resolveCamera === 'function');
  assert.equal(await page.locator('#practiceArenaCamera').textContent(), 'Start camera');
  assert.equal(await page.locator('#practiceArenaCamera').isDisabled(), true);
  await page.evaluate(() => { window.delayCamera = false; window.resolveCamera(); });
  await page.waitForFunction(async () => (await import('/input-state.js')).getInputState().camera === 'Stop camera');
  assert.equal(await page.locator('.game-navigation > #practiceArenaCamera').isVisible(), true);
  assert.equal(await page.locator('#practiceArenaCamera').textContent(), 'Stop camera');
  await mkdir(path.join(root, '.tmp/camera-controls'), {recursive:true});
  for (const width of [1920, 390]) {
    await page.setViewportSize({width, height:1080});
    const position = await page.locator('#practiceArenaCamera').evaluate(button => {
      const bar = button.parentElement, box = button.getBoundingClientRect(), bounds = bar.getBoundingClientRect();
      const style = getComputedStyle(bar);
      return {right:bounds.right - parseFloat(style.paddingRight) - box.right, top:box.top - bounds.top - parseFloat(style.paddingTop)};
    });
    assert.ok(Math.abs(position.right) < 1);
    if (width === 390) assert.ok(Math.abs(position.top) < 1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({path:path.join(root, `.tmp/camera-controls/stop-camera-${width}.png`), fullPage:true});
  }
  await page.evaluate(() => {
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
  assert.equal(await page.evaluate(() => document.querySelector('#video').srcObject === window.cameraStream), true);
  assert.equal(await page.evaluate(() => window.cameraStream.getVideoTracks()[0].readyState), 'live');
  await hash('spellTraining');
  assert.equal(await page.evaluate(() => window.cameraStream.getVideoTracks()[0].readyState), 'ended');
  await page.evaluate(() => { window.delayCamera = true; });
  await page.locator('#spellTrainingCamera').click();
  await page.waitForFunction(() => typeof window.resolveCamera === 'function');
  await hash('practiceArena');
  await page.evaluate(() => window.resolveCamera());
  await page.waitForFunction(() => window.cameraStream.getVideoTracks()[0].readyState === 'ended');
  assert.equal(await page.locator('#video').evaluate(element => element.srcObject), null);
  await page.evaluate(() => { window.delayCamera = false; });
  await page.locator('#practiceArenaCamera').click();
  await page.waitForFunction(async () => (await import('/input-state.js')).getInputState().camera === 'Stop camera');
  await page.goBack(); await checkScreen('spellTraining');
  assert.equal(await page.evaluate(() => window.cameraStream.getVideoTracks()[0].readyState), 'ended');
  await page.evaluate(() => { location.hash = 'unsupported'; });
  await checkScreen('menu');
  assert.equal(new URL(page.url()).hash, '#menu');

  await page.goBack(); await checkScreen('spellTraining');

  // Route restoration does not depend on browser storage.
  const isolated = await browser.newContext({permissions:[], hasTouch:true});
  await isolated.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {get(){throw Error('Storage blocked');}});
    navigator.mediaDevices.getUserMedia = () => { throw Error('No camera access'); };
  });
  await isolated.route('**/api/events', route => route.fulfill({status:201,body:'{"saved":true}'}));
  const fresh = await isolated.newPage();
  fresh.on('pageerror', error => errors.push(error.message));
  await fresh.goto(base);
  assert.equal(await fresh.locator('#mainMenu').isVisible(), true);
  await fresh.goto(base + '#spellTraining');
  await fresh.reload();
  assert.equal(await fresh.locator('#spellTrainingView').isVisible(), true);
  assert.equal(await fresh.locator('#video').evaluate(element => element.srcObject), null);
  for (const name of ['Practice Arena','Spell Training','Solo Duel','Options','Credits','Spell Training']) {
    await fresh.getByRole('button', {name:'Back to menu', exact:true}).tap();
    assert.equal(await fresh.evaluate(() => getComputedStyle(document.activeElement).outlineStyle), 'none');
    await fresh.keyboard.press('Tab');
    assert.equal(await fresh.locator('[data-view="spellTraining"]').evaluate(element => element === document.activeElement && element.matches(':focus-visible')), true);
    await fresh.getByRole('button', {name, exact:true}).tap();
    await startSelectedMode(fresh);
    await fresh.locator('#' + screens[({'Practice Arena':'practiceArena','Solo Duel':'soloDuel','Spell Training':'spellTraining'}[name] || name.toLowerCase())]).waitFor({state:'visible'});
    assert.equal(await fresh.locator(':focus-visible:visible').count(), 0);
  }
  await isolated.close();
  await checkSiteHistory(browser, base, false);
  // Full Chromium supports cache restores; the default headless shell disables them.
  const cachedBrowser = await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE, channel:'chromium', headless:true, ignoreDefaultArgs:['--disable-back-forward-cache']});
  try { await checkSiteHistory(cachedBrowser, base, true); } finally { await cachedBrowser.close(); }
  assert.ok(records.some(record => record.cause === 'tab_change' && record.activeTab === 'spellTraining'));
  assert.deepEqual(errors, []);
  console.log('PASS: routes, reload, history, focus, invalid routes, camera cleanup, game resets, blocked storage, desktop and narrow layout. Simulated input only.');
} finally {
  await browser?.close();
  if (api && api.exitCode === null && api.signalCode === null) {
    const exited = once(api, 'exit'); api.kill(); await exited;
  }
  await rm(folder, {recursive:true, force:true});
}

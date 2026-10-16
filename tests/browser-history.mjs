import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';

// Use a real second site. Request interception can change cache eligibility.
export async function checkSiteHistory(browser, base, cached) {
  const outside = createServer((_request, response) => {
    response.writeHead(200, {'Content-Type':'text/html'});
    response.end('<!doctype html><title>Other site</title><h1>Other site</h1>');
  });
  outside.listen(0, '127.0.0.1');
  await once(outside, 'listening');
  const away = `http://localhost:${outside.address().port}/`;
  const context = await browser.newContext({permissions:[], reducedMotion:'reduce', viewport:{width:1920,height:1080}});
  try {
    await context.addInitScript(() => {
      window.historyTest = {id:crypto.randomUUID(), shows:[], views:[], cameraCalls:0, focusCalls:[]};
      const focus = HTMLElement.prototype.focus;
      HTMLElement.prototype.focus = function(...args) {
        window.historyTest.focusCalls.push(this.id || this.dataset.view);
        return focus.apply(this, args);
      };
      addEventListener('pageshow', event => window.historyTest.shows.push({persisted:event.persisted, hash:location.hash}));
      document.addEventListener('wizard:view', event => window.historyTest.views.push(event.detail.view));
      navigator.mediaDevices.getUserMedia = async () => {
        window.historyTest.cameraCalls++;
        if (!window.historyTest.allowCamera) throw Error('Real camera access is forbidden');
        if (window.historyTest.delayCamera) await new Promise(resolve => { window.historyTest.resolveCamera = resolve; });
        const canvas = document.createElement('canvas');
        canvas.width = 640; canvas.height = 480;
        canvas.getContext('2d').fillRect(0, 0, 640, 480);
        const stream = canvas.captureStream(30);
        window.historyTest.stream = stream;
        return stream;
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
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const screens = {menu:'mainMenu', training:'trainingView', fight:'fightView', options:'optionsView', credits:'creditsView'};
    const checkScreen = async name => {
      await page.waitForFunction(id => window.historyTest?.shows.length && document.getElementById(id)?.hidden === false, screens[name], {timeout:5000});
      assert.equal(new URL(page.url()).hash, '#' + name);
      for (const [other, id] of Object.entries(screens)) assert.equal(await page.locator('#' + id).isVisible(), other === name);
      assert.equal(await page.locator('#video').evaluate(element => element.srcObject), null);
      if (['training','fight'].includes(name)) {
        assert.equal(await page.locator('#viewport').evaluate(element => element.parentElement.id), name + 'CameraMount');
        assert.equal(await page.locator('#' + name + 'Camera').textContent(), 'Start camera');
      }
    };
    const saved = () => page.waitForFunction(async () => (await import('/input-state.js')).getInputState().saveStatus === 'Saved on this laptop');
    const checkReturn = async (name, previousId, expectCache = cached) => {
      await checkScreen(name);
      const state = await page.evaluate(() => ({id:historyTest.id, show:historyTest.shows.at(-1), cameraCalls:historyTest.cameraCalls, notRestored:performance.getEntriesByType('navigation')[0]?.notRestoredReasons?.toJSON()}));
      if (expectCache !== null) assert.equal(state.show.persisted, expectCache, JSON.stringify(state));
      assert.equal(state.id === previousId, state.show.persisted);
      if (!state.show.persisted) assert.deepEqual(await page.evaluate(() => historyTest.focusCalls), []);
      return state;
    };
    for (const name of Object.keys(screens)) {
      await page.goto(away);
      await page.goto(base + '?history=' + name + '#' + name);
      await checkScreen(name); await saved();
      let id = await page.evaluate(() => historyTest.id);
      await page.goBack({waitUntil:'commit'});
      assert.equal(await page.title(), 'Other site');
      await page.goForward({waitUntil:'commit'});
      id = (await checkReturn(name, id)).id;
      await saved();
      const focusTarget = ['training','fight'].includes(name) ? '#gameBack' : name === 'menu' ? '[data-view="fight"]' : '#' + name + 'View [data-back]';
      await page.locator(focusTarget).focus();
      await page.goto(away);
      await page.goBack({waitUntil:'commit'});
      const state = await checkReturn(name, id);
      if (state.show.persisted) assert.equal(await page.locator(focusTarget).evaluate(element => element === document.activeElement), true);
      assert.equal(state.cameraCalls, 0);
      await page.goForward({waitUntil:'commit'});
      assert.equal(await page.title(), 'Other site');
      await page.goBack({waitUntil:'commit'});
      await checkReturn(name, state.id);
    }
    // Return to an earlier hash entry in the cached document, not its last screen.
    await page.goto(base + '#menu');
    await page.getByRole('button', {name:'Training',exact:true}).click();
    await page.locator('#gameBack').click();
    await page.getByRole('button', {name:'Fight',exact:true}).click();
    await saved();
    const id = await page.evaluate(() => historyTest.id);
    await page.goto(away);
    await page.evaluate(() => history.go(-3));
    await page.waitForURL(base + '#training', {waitUntil:'commit'});
    // Chromium may reload when jumping over several entries. Check either path.
    const earlier = await checkReturn('training', id, cached ? null : false);
    await page.goForward({waitUntil:'commit'}); await checkScreen('menu');
    await page.goForward({waitUntil:'commit'}); await checkScreen('fight');
    await page.goForward({waitUntil:'commit'});
    assert.equal(await page.title(), 'Other site');
    // Cached game state stays in memory. A fresh history load keeps normal resets.
    for (const name of ['training','fight']) {
      await page.goto(base + '?state=' + name + '#' + name);
      if (name === 'training') {
        await page.locator('#trainingStart').click();
        await page.evaluate(() => document.dispatchEvent(new CustomEvent('wizard:training-gesture', {
          detail:{id:crypto.randomUUID(),type:'cast',accepted:true,shape:'Expelliarmus',score:95}
        })));
        assert.equal(await page.locator('#trainingCount').textContent(), '1 / 3');
      } else {
        await page.evaluate(() => document.dispatchEvent(new CustomEvent('wizard:cast', {
          detail:{id:crypto.randomUUID(),shape:'Basic Cast',score:95}
        })));
        await page.waitForFunction(() => document.querySelector('#fightDummyHealth').value === 170);
      }
      await saved();
      const stateId = await page.evaluate(() => historyTest.id);
      await page.goto(away); await page.goBack({waitUntil:'commit'});
      await checkReturn(name, stateId);
      if (name === 'training') assert.equal(await page.locator('#trainingCount').textContent(), cached ? '1 / 3' : '0 / 3');
      else assert.equal(await page.locator('#fightDummyHealth').evaluate(element => element.value), cached ? 170 : 200);
      // The returned screen can still change modes and handle controls.
      await page.locator('#gameBack').click(); await checkScreen('menu');
      await page.getByRole('button', {name:name === 'fight' ? 'Training' : 'Fight',exact:true}).click();
      await checkScreen(name === 'fight' ? 'training' : 'fight');
    }

    for (const pending of [false,true]) {
      await page.goto(base + '?camera=' + pending + '#training');
      await saved();
      await page.evaluate(pending => { historyTest.allowCamera = true; historyTest.delayCamera = pending; }, pending);
      await page.locator('#trainingCamera').click();
      if (pending) await page.waitForFunction(() => typeof historyTest.resolveCamera === 'function');
      else await page.waitForFunction(async () => (await import('/input-state.js')).getInputState().camera === 'Stop camera');
      const cameraId = await page.evaluate(() => historyTest.id);
      await page.goto(away); await page.goBack({waitUntil:'commit'});
      // Media streams can make a page ineligible for the browser cache.
      const state = await checkReturn('training', cameraId, cached ? null : false);
      assert.equal(state.cameraCalls, state.show.persisted ? 1 : 0);
      if (state.show.persisted) {
        if (pending) await page.evaluate(() => historyTest.resolveCamera());
        await page.waitForFunction(() => historyTest.stream?.getTracks().every(track => track.readyState === 'ended'));
      }
      // Starting input again needs an explicit user action.
      await page.evaluate(() => { historyTest.allowCamera = true; historyTest.delayCamera = false; });
      await page.locator('#trainingCamera').click();
      await page.waitForFunction(async () => (await import('/input-state.js')).getInputState().camera === 'Stop camera');
      await page.locator('#trainingCamera').click();
      await checkScreen('training');
      assert.equal(await page.evaluate(() => historyTest.stream.getTracks().every(track => track.readyState === 'ended')), true);
    }
    assert.deepEqual(errors, []);
    console.log(`PASS: cross-site Back/Forward for all screens, game state, and active/pending simulated input; cache ${cached ? 'restored' : 'disabled'}; earlier hash return ${earlier.show.persisted ? 'cached' : 'fresh'}.`);
  } finally {
    await context.close();
    await new Promise(resolve => outside.close(resolve));
  }
}

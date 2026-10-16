import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';

const gate = () => {
  let release;
  const promise = new Promise(resolve => { release = resolve; });
  return {promise, release};
};
const frames = page => page.evaluate(() => new Promise(resolve =>
  requestAnimationFrame(() => requestAnimationFrame(resolve))));

export async function checkReloadRendering(browser, base, root) {
  const output = path.join(root, '.tmp/reload-rendering');
  await mkdir(output, {recursive:true});
  for (const width of [1920, 390]) for (const mode of ['practiceArena', 'spellTraining', 'soloDuel']) {
    const context = await browser.newContext({viewport:{width, height:width === 390 ? 844 : 1080}, reducedMotion:'reduce'});
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    let shell, background, actor, failActor = false;
    await context.route('**/shell.js', async route => { await shell.promise; await route.continue(); });
    await context.route('**/assets/practice-arena-background.jpg', async route => { await background.promise; await route.continue(); });
    await context.route('**/assets/practice-arena-dummy-unarmed.png', async route => {
      await actor.promise;
      if (failActor) await route.abort(); else await route.continue();
    });
    await context.route('**/api/events', route => route.fulfill({status:201, body:'{"saved":true}'}));
    await context.addInitScript(() => {
      window.renderFrames = [];
      window.cameraCalls = 0;
      navigator.mediaDevices.getUserMedia = () => { window.cameraCalls++; throw Error('Real camera access is forbidden'); };
      const visible = element => !!element && !!element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden';
      const sample = () => {
        const arena = document.querySelector(location.hash + 'View .practice-arena');
        window.renderFrames.push({menu:visible(document.querySelector('#menuShell')), arena:visible(arena), state:arena?.dataset.artState});
        requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    const arena = page.locator(`#${mode}View .practice-arena`);
    try {
      for (const reload of [false, true]) {
        shell = gate(); background = gate(); actor = gate();
        if (reload) await page.reload({waitUntil:'commit'});
        else await page.goto(base + '#' + mode, {waitUntil:'commit'});
        await page.locator('#menuShell').waitFor({state:'attached'});
        await frames(page);
        assert.equal(await page.locator('#menuShell').isVisible(), false, 'No menu before the shell loads');
        shell.release();
        await page.locator('#gameBack').waitFor({state:'visible'});
        await frames(page);
        assert.equal(await arena.isVisible(), false, 'No arena before its images load');
        const reserved = await arena.evaluate(element => ({width:element.getBoundingClientRect().width, height:element.getBoundingClientRect().height}));
        assert.ok(reserved.width > 0 && reserved.height > 0, 'Keep the arena space');
        background.release();
        await page.waitForFunction(mode => document.querySelector(`#${mode}View .arena-art`).naturalWidth > 0, mode);
        await frames(page);
        assert.equal(await arena.isVisible(), false, 'A missing character must keep the whole arena hidden');
        actor.release();
        await page.waitForFunction(mode => document.querySelector(`#${mode}View .practice-arena`).dataset.artState === 'ready', mode);
        await frames(page);
        assert.equal(await arena.isVisible(), true);
        assert.deepEqual(await arena.evaluate(element => ({width:element.getBoundingClientRect().width, height:element.getBoundingClientRect().height})), reserved);
        assert.equal(await page.evaluate(() => window.renderFrames.some(frame => frame.menu || (frame.arena && frame.state !== 'ready'))), false);
        assert.equal(await page.evaluate(() => window.cameraCalls), 0);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      }
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({path:path.join(output, `${mode}-${width}.png`), fullPage:true});

      // One failed layer must not leave a partial scene or block navigation.
      failActor = true;
      await page.reload({waitUntil:'domcontentloaded'});
      await page.waitForFunction(mode => document.querySelector(`#${mode}View .practice-arena`).dataset.artState === 'failed', mode);
      assert.equal(await arena.isVisible(), true);
      assert.equal(await arena.locator('.arena-art').isVisible(), false);
      assert.equal(await arena.locator('.practice-arena-actors').isVisible(), false);
      assert.equal(await page.locator(`#${mode}Camera`).isVisible(), true);
      failActor = false;
      await page.locator('#gameBack').click();
      await page.locator(`[data-view="${mode}"]`).click();
      await page.waitForFunction(mode => document.querySelector(`#${mode}View .practice-arena`).dataset.artState === 'ready', mode);

      // Leaving while an image is pending must not let its completion change the route.
      actor = gate();
      await page.reload({waitUntil:'domcontentloaded'});
      await page.locator('#gameBack').click();
      assert.equal(await page.locator('#mainMenu').isVisible(), true);
      actor.release();
      await page.waitForFunction(mode => document.querySelector(`#${mode}View .practice-arena`).dataset.artState === 'ready', mode);
      assert.equal(await page.locator('#mainMenu').isVisible(), true);
      assert.equal(await page.locator('#gameView').isVisible(), false);
      assert.equal(await page.evaluate(() => window.cameraCalls), 0);
      assert.deepEqual(errors, []);
    } finally {
      shell.release(); background.release(); actor.release();
      await context.close();
    }
  }
  console.log('PASS: Practice Arena and Spell Training first frames, reload, delayed images, failed-image retry, navigation during loading, desktop and narrow layout. No camera access.');
}

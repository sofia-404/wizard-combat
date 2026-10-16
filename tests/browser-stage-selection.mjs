import {startSimulatedArena} from './browser-game-mode.mjs';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {finishCharacterSelection} from './browser-game-mode.mjs';
import {stages, gameModes} from '../dist/stages.js';

export async function checkStageSelection(browser, base, root) {
  const output = path.join(root, '.tmp/stage-selection');
  await mkdir(output, {recursive:true});
  const context = await browser.newContext({viewport:{width:1920,height:1080}, reducedMotion:'reduce'});
  await context.addInitScript(() => {
    window.stageCameraCalls = 0;
    navigator.mediaDevices.getUserMedia = () => { window.stageCameraCalls++; throw Error('Real camera access is forbidden'); };
  });
  await context.route('**/api/**', route => route.fulfill({status:201, body:'{"saved":true}'}));
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const open = async mode => {
    await page.goto(base + '#menu');
    await page.locator(`[data-view="${mode}"]`).click();
    await finishCharacterSelection(page);
  };
  const ready = async mode => {
    await page.locator(`#${mode}View`).waitFor({state:'visible'});
    await page.waitForFunction(mode => document.querySelector(`#${mode}View .practice-arena`).dataset.artState === 'ready', mode);
  };
  try {
    for (const width of [1920, 390]) {
      await page.setViewportSize({width,height:width === 390 ? 844 : 1080});
      await open('soloDuel');
      assert.equal(await page.locator('.stage-tile').count(), 10);
      assert.equal(await page.locator('.stage-tile').nth(2).getAttribute('data-stage'), 'random');
      assert.equal(await page.locator('.stage-tile[aria-pressed="true"]').count(), 0);
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([...document.querySelectorAll('#stageSelectView img')].filter(img => img.getClientRects().length).map(img => img.decode()));
      });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({path:path.join(output, `stage-selection-${width}.png`),fullPage:true});
      for (const mode of Object.keys(gameModes)) {
        await open(mode);
        await page.locator('[data-stage="forest"]').click();
        assert.equal(await page.locator('#stageStatus').textContent(), '');
        assert.equal(await page.locator('#stagePreview').getAttribute('src'), stages[1].image);
        await page.locator('#stageStart').click();
        await ready(mode);
        assert.equal(new URL(page.url()).searchParams.get('stage'), 'forest');
        assert.equal(await page.locator(`#${mode}View .arena-art`).getAttribute('src'), stages[1].image);
        assert.equal(await page.locator(`#${mode}View .arena-backing`).isVisible(), false);
        assert.equal(await page.locator(`#${mode}PlayerHealth`).evaluate(node => node.value), 200);
        assert.equal(await page.locator(`#${mode}DummyHealth`).evaluate(node => node.value), 200);
        assert.equal(await page.locator(`#${mode}Camera`).textContent(), 'Start camera');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        await page.screenshot({path:path.join(output, `${mode}-forest-${width}.png`),fullPage:true});
      }
    }
    await page.setViewportSize({width:1920,height:1080});
    // All backgrounds use the same loader in every arena, including direct reloads.
    for (const mode of Object.keys(gameModes)) for (const stage of stages) {
      await page.goto(`${base}?stage=${stage.id}#${mode}`);
      await ready(mode);
      assert.equal(await page.locator(`#${mode}View .practice-arena`).getAttribute('data-stage'), stage.id);
    }
    // Both random entry paths show the resolved tile for a second, then start once.
    await page.clock.install();
    for (const explicitRandom of [false, true]) {
      await open('practiceArena');
      await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 100));
      await page.evaluate(() => { window.rolls = 0; Math.random = () => { window.rolls++; return .5; }; });
      if (explicitRandom) {
        await page.locator('[data-stage="forest"]').click();
        await page.locator('[data-stage="random"]').focus();
        await page.keyboard.press('Enter');
      } else await page.locator('#stageStart').click();
      await page.evaluate(() => document.getElementById('stagePreview').decode());
      assert.equal(await page.locator('.stage-tile[aria-pressed="true"]').getAttribute('data-stage'), 'gryffindor');
      assert.equal(await page.locator('#stagePreview').getAttribute('src'), stages[4].image);
      assert.equal(await page.locator('#stageStatus').textContent(), '');
      assert.equal(await page.locator('#stageStart').isDisabled(), true);
      await page.clock.runFor(999);
      assert.equal(await page.locator('#stageSelectView').isVisible(), true);
      await page.clock.runFor(1);
      await ready('practiceArena');
      await page.clock.resume();
      assert.equal(await page.evaluate(() => window.rolls), 1);
      const url = page.url();
      assert.equal(new URL(url).searchParams.get('stage'), 'gryffindor');
      await page.locator('#gameBack').click();
      await page.goBack();
      await ready('practiceArena');
      assert.equal(page.url(), url);
      assert.equal(await page.evaluate(() => window.rolls), 1);
      await page.reload();
      await ready('practiceArena');
      assert.equal(page.url(), url);
    }
    await startSimulatedArena(page, 'practiceArena', false);
    // Changing stages preserves gameplay state and the player can still fall and reset.
    await page.evaluate(() => document.dispatchEvent(new CustomEvent('wizard:cast', {detail:{id:crypto.randomUUID(),shape:'Basic Cast',score:95}})));
    await page.waitForFunction(() => document.getElementById('practiceArenaDummyHealth').value === 170);
    await page.locator('#gameBack').click();
    await page.locator('[data-view="practiceArena"]').click();
    await finishCharacterSelection(page);
    await page.locator('.stage-tile[data-stage="platform"]').click();
    await page.locator('#stageStart').click();
    await ready('practiceArena');
    assert.equal(await page.locator('#practiceArenaDummyHealth').evaluate(node => node.value), 170);
    await startSimulatedArena(page, 'practiceArena', false);
    await page.evaluate(() => document.dispatchEvent(new CustomEvent('wizard:player-hit', {detail:{view:'practiceArena',id:crypto.randomUUID(),damage:200}})));
    await page.waitForFunction(() => document.querySelector('#practiceArenaView .practice-arena').dataset.roundPhase === 'active');
    await page.evaluate(() => document.dispatchEvent(new CustomEvent('wizard:player-hit', {detail:{view:'practiceArena',id:crypto.randomUUID(),damage:200}})));
    await page.waitForFunction(() => document.getElementById('practiceArenaPlayerActor').dataset.pose === 'fallen');
    assert.equal(await page.locator('#practiceArenaView .practice-arena-player-repair').isVisible(), false);
    await page.screenshot({path:path.join(output,'practiceArena-platform-fallen.png'),fullPage:true});
    const stageURL = page.url();
    await page.locator('#practiceArenaResetDummy').click();
    assert.equal(page.url(), stageURL);
    assert.equal(await page.locator('#practiceArenaPlayerHealth').evaluate(node => node.value), 200);
    // A failed stage stays in setup and retries the same choice.
    await open('soloDuel');
    await page.route('**/09-castle-field.jpg', route => route.abort());
    await page.locator('[data-stage="castle-field"]').click();
    await page.locator('#stageStart').click();
    await page.getByRole('button',{name:'Retry',exact:true}).waitFor();
    assert.equal(await page.locator('#stageSelectView').isVisible(), true);
    await page.unroute('**/09-castle-field.jpg');
    await page.locator('#stageStart').click();
    await ready('soloDuel');
    assert.equal(new URL(page.url()).searchParams.get('stage'),'castle-field');
    // Leaving while Start waits cannot reopen a game later.
    await open('spellTraining');
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    await page.route('**/02-forest.jpg', async route => { await gate; await route.continue(); });
    await page.locator('[data-stage="forest"]').click();
    await page.locator('#stageStart').click();
    await page.keyboard.press('Escape');
    release();
    await page.waitForFunction(() => document.querySelector('#spellTrainingView .practice-arena').dataset.artState === 'ready');
    assert.equal(await page.locator('#mainMenu').isVisible(), true);
    assert.equal(await page.locator('#gameView').isVisible(), false);
    // Keyboard selection and Escape keep normal focus and never request a camera.
    await page.locator('[data-view="soloDuel"]').focus();
    await page.keyboard.press('Enter');
    await finishCharacterSelection(page, true);
    assert.equal(await page.locator('#stageSelectTitle').evaluate(node => node === document.activeElement), true);
    await page.locator('[data-stage="ravenclaw"]').focus();
    await page.keyboard.press('Space');
    assert.equal(await page.locator('[data-stage="ravenclaw"]').getAttribute('aria-pressed'),'true');
    await page.locator('#stageStart').focus();
    await page.keyboard.press('Enter');
    await ready('soloDuel');
    assert.equal(await page.locator('#gameBack').evaluate(node => node === document.activeElement), true);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('[data-view="soloDuel"]').evaluate(node => node === document.activeElement), true);
    // A double-click starts the chosen stage in each mode.
    for (const mode of Object.keys(gameModes)) {
      await open(mode);
      await page.locator('.stage-tile[data-stage="hufflepuff"]').dblclick();
      await ready(mode);
      assert.equal(new URL(page.url()).searchParams.get('stage'), 'hufflepuff');
    }
    // A new choice or Back cancels the one-second automatic start.
    await open('soloDuel');
    await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 100));
    await page.evaluate(() => { window.rolls = 0; Math.random = () => { window.rolls++; return .5; }; });
    await page.locator('.stage-tile[data-stage="random"]').dblclick();
    await page.evaluate(() => document.getElementById('stagePreview').decode());
    assert.equal(await page.evaluate(() => window.rolls), 1);
    await page.locator('.stage-tile[data-stage="forest"]').click();
    await page.clock.runFor(1100);
    assert.equal(await page.locator('#stageSelectView').isVisible(), true);
    assert.equal(await page.locator('.stage-tile[aria-pressed="true"]').getAttribute('data-stage'), 'forest');
    await page.locator('.stage-tile[data-stage="random"]').click();
    await page.evaluate(() => document.getElementById('stagePreview').decode());
    await page.keyboard.press('Escape');
    await page.clock.runFor(1100);
    assert.equal(await page.locator('#mainMenu').isVisible(), true);
    await page.clock.resume();
    assert.equal(await page.evaluate(() => window.stageCameraCalls), 0);
    assert.deepEqual(errors, []);
    console.log('PASS: shared stage selection, 27 stage/mode combinations, one-second random reveal, double-click start, reload/history, state preservation, failure/retry, cancelled loading/reveal, keyboard, desktop/narrow. No camera access.');
  } finally { await context.close(); }
}

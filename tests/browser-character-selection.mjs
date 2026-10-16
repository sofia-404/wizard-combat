import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {finishCharacterSelection} from './browser-game-mode.mjs';
import {characters} from '../dist/characters.js';

export async function checkCharacterSelection(browser, base, root) {
  const output = path.join(root, '.tmp/character-selection');
  await mkdir(output, {recursive:true});
  const context = await browser.newContext({viewport:{width:1920,height:1080}, reducedMotion:'reduce'});
  await context.addInitScript(() => {
    window.characterCameraCalls = 0;
    navigator.mediaDevices.getUserMedia = () => { window.characterCameraCalls++; throw Error('Real camera access is forbidden'); };
  });
  await context.route('**/api/**', route => route.fulfill({status:201, body:'{"saved":true}'}));
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const enter = async (mode = 'soloDuel') => {
    await page.goto(base + '#menu', {waitUntil:'domcontentloaded'});
    await page.locator(`[data-view="${mode}"]`).click();
    await page.locator('#characterSelectView').waitFor({state:'visible'});
  };
  const next = () => finishCharacterSelection(page);
  const capture = async name => {
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.querySelectorAll('#characterSelectView img, #stageSelectView img')].filter(img => img.getClientRects().length).map(img => img.decode()));
    });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({path:path.join(output,name + '.png'),fullPage:true});
  };
  try {
    for (const [size,width,height] of [['desktop',1920,1080],['mobile',390,844]]) {
      await page.setViewportSize({width,height});
      await enter();
      assert.equal(await page.locator('.character-tile').count(),12);
      assert.ok(characters.some(c=>c.id===new URL(page.url()).searchParams.get('character')));
      assert.ok(characters.some(c=>c.id===new URL(page.url()).searchParams.get('opponent')));
      assert.equal(await page.getByRole('button',{name:'Next',exact:true}).count(),0);
      await page.locator('#opponentRole').click();
      await page.locator('[data-character="original-witch"]').click();
      await page.locator('#playerRole').click();
      await page.locator('[data-character="original-wizard"]').click();
      assert.equal(await page.locator('#characterMode').textContent(),'Solo Duel');
      assert.equal(await page.locator('#playerRole').textContent(),'P1 You');
      assert.equal(await page.locator('#opponentRole').textContent(),'P2 Computer');
      assert.equal(await page.locator('#characterTitle, #opponentTitle').count(),0);
      assert.equal(await page.locator('#playerRole').getAttribute('aria-pressed'),'true');
      assert.equal(await page.locator('#opponentRole').getAttribute('aria-pressed'),'false');
      assert.equal(await page.locator('#characterStatus').textContent(),'');
      assert.ok(await page.locator('#playerRole').evaluate(node=>parseFloat(getComputedStyle(node).fontSize)>=18));
      await capture('characters-original-' + size);
      await page.locator('[data-character="iris"]').click();
      assert.equal(await page.locator('#characterName').textContent(),'Iris');
      assert.equal(new URL(page.url()).searchParams.get('character'),'iris');
      await capture('characters-' + size);
      await page.locator('[data-character="silas"]').hover();
      assert.equal(await page.locator('[data-character="silas"] .character-label').evaluate(node=>getComputedStyle(node).backgroundColor),'rgb(229, 201, 140)');
      assert.equal(await page.locator('[data-character="iris"]').getAttribute('aria-pressed'),'true');
      await capture('characters-hover-' + size);
      await page.mouse.move(0,0);
      await page.evaluate(()=>{window.previousRandom=Math.random;Math.random=()=>.15;});
      await page.locator('[data-character="random"]').click();
      await page.evaluate(()=>{Math.random=window.previousRandom;});
      assert.notEqual(await page.locator('#characterName').textContent(),'Random');
      assert.equal(await page.locator('.character-tile[aria-pressed="true"]').getAttribute('data-character'),new URL(page.url()).searchParams.get('character'));
      await capture('characters-random-' + size);
      await page.locator('[data-character="iris"]').click();
      await page.reload();
      assert.equal(await page.locator('#characterName').textContent(),'Iris');
      await page.locator('[data-character="mara"]').click();
      assert.equal(await page.locator('#characterSelectView [data-back]').count(),1);
      await page.locator('#opponentRole').click();
      assert.equal(await page.locator('#characterSelectTitle').textContent(),'SELECT A CHARACTER');
      await page.locator('[data-character="silas"]').click();
      assert.equal(await page.locator('#characterName').textContent(),'Mara');
      assert.equal(await page.locator('#opponentName').textContent(),'Silas');
      assert.equal(await page.locator('[data-character="mara"] .character-marker').textContent(),'P1');
      assert.equal(await page.locator('[data-character="silas"] .character-marker').textContent(),'P2');
      await page.reload();
      assert.equal(await page.locator('#characterSelectView').getAttribute('data-editing'),'opponent');
      assert.equal(await page.locator('#characterName').textContent(),'Mara');
      assert.equal(await page.locator('#opponentName').textContent(),'Silas');
      assert.equal(await page.locator('#characterMode').textContent(),'Solo Duel');
      assert.equal(await page.locator('#characterMatchup').innerText(),'Mara\nVS\nSilas');
      await capture('characters-opponent-' + size);
      // Either role can be edited without changing the other choice.
      await page.locator('#playerRole').click();
      await page.locator('[data-character="ravenclaw"]').click();
      assert.equal(await page.locator('#opponentName').textContent(),'Silas');
      assert.equal(await page.locator('#characterTitle, #opponentTitle').count(),0);
      assert.equal(await page.locator('#characterStatus').textContent(),'');
      await page.locator('[data-character="mara"]').click();
      await page.locator('#opponentRole').click();
      await next();
      assert.equal(await page.locator('#stageSelectView [data-back]').count(),1);
      assert.equal(await page.locator('.stage-character-opponent img').getAttribute('src'),characters.find(c=>c.id==='silas').image);
      assert.equal(await page.locator('.stage-character').first().locator('img').getAttribute('src'),characters.find(c=>c.id==='mara').image);
      assert.equal(await page.getByRole('button',{name:'Change character',exact:true}).count(),0);
      await page.locator('[data-stage="forest"]').click();
      assert.equal(await page.locator('.stage-tile[aria-pressed="true"]').getAttribute('data-stage'),'forest');
      await capture('character-stage-' + size);
      await page.reload();
      assert.equal(await page.locator('.stage-tile[aria-pressed="true"]').getAttribute('data-stage'),'forest');
      assert.equal(await page.locator('.stage-character').first().locator('img').getAttribute('src'),characters.find(c=>c.id==='mara').image);
      await page.locator('#stageStart').click();
      await page.locator('#soloDuelView').waitFor({state:'visible'});
      const url=page.url();
      assert.equal(new URL(url).searchParams.get('character'),'mara');
      assert.equal(new URL(url).searchParams.get('opponent'),'silas');
      // Exercise the reset handler without starting a match or a camera.
      await page.locator('#soloDuelResetDummy').evaluate(button => button.click());
      assert.equal(page.url(),url);
      await page.reload();
      assert.equal(await page.locator('#soloDuelView').getAttribute('data-character'),'mara');
      assert.equal(await page.locator('#soloDuelView').getAttribute('data-opponent'),'silas');
      await page.locator('#gameBack').click();
      await page.goBack();
      await page.locator('#soloDuelView').waitFor({state:'visible'});
      assert.equal(page.url(),url);
    }
    await page.setViewportSize({width:1920,height:1080});
    // Every portrait can be selected. The original pair uses the unchanged source.
    await enter();
    for (const character of characters) {
      await page.locator(`[data-character="${character.id}"]`).click();
      assert.equal(await page.locator('#characterName').textContent(),character.name);
      assert.equal(await page.locator('#characterPreview img').getAttribute('src'),character.image);
    }
    // Resolve Random once, including failed image loading and Retry.
    await page.route('**/rowan.png', route=>route.abort());
    await enter();
    await page.locator('#opponentRole').click();
    await page.locator('[data-character="hufflepuff"]').click();
    await page.locator('#playerRole').click();
    await page.evaluate(() => { window.rolls=0; Math.random=()=>{window.rolls++;return .25;}; });
    await page.locator('[data-character="random"]').click();
    assert.equal(await page.locator('#characterName').textContent(),'Rowan');
    assert.equal(await page.locator('[data-character="rowan"]').getAttribute('aria-pressed'),'true');
    assert.equal(new URL(page.url()).searchParams.get('character'),'rowan');
    await page.locator('#characterNext').focus();
    await page.keyboard.press('Enter');
    await page.getByRole('button',{name:'Retry loading',exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>window.rolls),1);
    assert.equal(await page.locator('#characterNext').evaluate(node=>node===document.activeElement),true);
    await page.unroute('**/rowan.png');
    await next();
    assert.equal(await page.evaluate(()=>window.rolls),1);
    assert.equal(new URL(page.url()).searchParams.get('character'),'rowan');
    // A loading portrait cannot navigate after Back or a different selection.
    let release;
    const gate=new Promise(resolve=>{release=resolve;});
    await page.route('**/bram.png',async route=>{await gate;await route.continue();});
    await enter();
    await page.locator('[data-character="bram"]').click();
    await page.locator('#characterNext').click();
    await page.locator('#characterBack').click();
    release();
    await page.evaluate(() => document.querySelector('#characterPreview img').decode());
    await page.waitForLoadState('networkidle');
    await page.unroute('**/bram.png');
    assert.equal(await page.locator('#mainMenu').isVisible(),true);
    // Switching roles during loading cancels navigation and keeps both choices editable.
    await enter();
    await page.locator('[data-character="bram"]').click();
    // Hold decode directly because a cached portrait may not make a network request.
    await page.evaluate(() => {
      const decode = HTMLImageElement.prototype.decode;
      const gate = new Promise(resolve=>{window.releaseRoleLoad=resolve;});
      window.restoreDecode=()=>{HTMLImageElement.prototype.decode=decode;};
      HTMLImageElement.prototype.decode=function() {
        const loaded=decode.call(this);
        if (!this.src.endsWith('/bram.png')) return loaded;
        return window.pendingRoleLoad=loaded.then(()=>gate);
      };
    });
    await page.locator('#characterNext').click();
    await page.locator('#opponentRole').click();
    await page.locator('[data-character="silas"]').click();
    await page.evaluate(async()=>{window.releaseRoleLoad();await window.pendingRoleLoad;window.restoreDecode();});
    assert.equal(await page.locator('#characterSelectView').isVisible(),true);
    assert.equal(await page.locator('#characterName').textContent(),'Bram');
    assert.equal(await page.locator('#opponentName').textContent(),'Silas');
    await next();
    assert.equal(new URL(page.url()).searchParams.get('character'),'bram');
    assert.equal(new URL(page.url()).searchParams.get('opponent'),'silas');
    // Keyboard flow works in every mode. No combat or camera is started by setup.
    for (const mode of ['spellTraining','practiceArena','soloDuel']) {
      await page.goto(base+'#menu');
      await page.locator(`[data-view="${mode}"]`).focus();
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('#characterSelectTitle').evaluate(node=>node===document.activeElement),true);
      if (mode === 'soloDuel') {
        await page.locator('#opponentRole').focus();
        await page.keyboard.press('Enter');
        await page.locator('[data-character="silas"]').focus();
        await page.keyboard.press('Space');
        await page.locator('#playerRole').focus();
        await page.keyboard.press('Space');
        assert.equal(await page.locator('#playerRole').getAttribute('aria-pressed'),'true');
        assert.equal(await page.locator('#opponentName').textContent(),'Silas');
      }
      await page.locator('[data-character="hufflepuff"]').focus();
      await page.keyboard.press('Space');
      await finishCharacterSelection(page, true);
      assert.equal(await page.locator('#stageSelectTitle').evaluate(node=>node===document.activeElement),true);
      await page.locator('[data-stage="courtyard"]').click();
      await page.locator('#stageStart').click();
      await page.locator(`#${mode}View`).waitFor({state:'visible'});
      assert.equal(await page.locator(`#${mode}View`).getAttribute('data-character'),'hufflepuff');
      assert.equal(new URL(page.url()).searchParams.has('opponent'),mode==='soloDuel');
      assert.equal(await page.locator(`#${mode}Camera`).textContent(),'Start camera');
      assert.equal(await page.locator(`#${mode}PlayerHealth`).evaluate(node=>node.value),200);
    }
    // Random reveals distinct choices immediately; confirmation does not roll again.
    await enter();
    await page.locator('#opponentRole').click();
    await page.locator('[data-character="hufflepuff"]').click();
    await page.locator('#playerRole').click();
    await page.evaluate(() => { window.rolls=0; Math.random=()=>{window.rolls++;return .25;}; });
    await page.locator('[data-character="random"]').click();
    await page.locator('#opponentRole').click();
    await page.locator('[data-character="random"]').click();
    assert.equal(await page.locator('#opponentName').textContent(),'Mara');
    assert.equal(await page.locator('#characterName').textContent(),'Rowan');
    assert.equal(await page.locator('[data-character="mara"]').getAttribute('aria-pressed'),'true');
    await next();
    assert.equal(await page.evaluate(()=>window.rolls),2);
    assert.equal(new URL(page.url()).searchParams.get('character'),'rowan');
    assert.equal(new URL(page.url()).searchParams.get('opponent'),'mara');
    await page.goBack();
    assert.equal(await page.locator('#mainMenu').isVisible(),true);
    // A later manual pick may match a random result. Test both role orders.
    for (const role of ['player','opponent']) {
      await page.goto(base+'?mode=soloDuel&character=original-wizard&opponent=original-wizard#characters');
      assert.equal(await page.locator('[data-character="original-wizard"] .character-marker').textContent(),'P1 / P2');
      await page.evaluate(()=>{Math.random=()=>0;});
      await page.locator(role==='player'?'#playerRole':'#opponentRole').click();
      await page.locator('[data-character="random"]').click();
      assert.equal(await page.locator(role==='player'?'#characterName':'#opponentName').textContent(),'Original Witch');
      assert.equal(await page.locator(role==='player'?'#opponentName':'#characterName').textContent(),'Original Wizard');
      await page.locator(role==='player'?'#opponentRole':'#playerRole').click();
      await page.locator('[data-character="original-witch"]').click();
      assert.equal(await page.locator('[data-character="original-witch"] .character-marker').textContent(),'P1 / P2');
      await page.reload();
      assert.equal(await page.locator('[data-character="original-witch"] .character-marker').textContent(),'P1 / P2');
      await next();
      assert.equal(new URL(page.url()).searchParams.get('character'),'original-witch');
      assert.equal(new URL(page.url()).searchParams.get('opponent'),'original-witch');
    }
    // Equal random values still produce distinct fresh starting skins.
    await page.goto(base+'#menu');
    await page.evaluate(()=>{Math.random=()=>0;});
    await page.locator('[data-view="soloDuel"]').click();
    assert.equal(await page.locator('#characterName').textContent(),'Original Wizard');
    assert.equal(await page.locator('#opponentName').textContent(),'Original Witch');
    // Restored one-sided choices also exclude the existing character from a random fill.
    for (const query of ['character=original-wizard&opponent=random','character=random&opponent=original-wizard']) {
      await page.goto(base+'?mode=soloDuel&'+query+'#characters');
      const params=new URL(page.url()).searchParams;
      assert.notEqual(params.get('character'),params.get('opponent'));
    }
    // A new mode entry rolls again, while reload restores the chosen skins.
    await page.goto(base+'#menu');
    await page.evaluate(() => { window.rolls=0; Math.random=()=>[.25,.4,.5,.6][window.rolls++]; });
    await page.locator('[data-view="soloDuel"]').click();
    assert.equal(await page.locator('#characterName').textContent(),'Rowan');
    assert.equal(await page.locator('#opponentName').textContent(),'Iris');
    await page.locator('#characterBack').click();
    await page.locator('[data-view="soloDuel"]').click();
    assert.equal(await page.locator('#characterName').textContent(),'Iris');
    assert.equal(await page.locator('#opponentName').textContent(),'Slytherin');
    assert.equal(await page.evaluate(()=>window.rolls),4);
    await page.reload();
    assert.equal(await page.locator('#characterName').textContent(),'Iris');
    assert.equal(await page.locator('#opponentName').textContent(),'Slytherin');
    // Single-player setup has no opponent step, even with stale duel parameters.
    for (const [size,width,height] of [['desktop',1920,1080],['mobile',390,844],['medium',960,768]]) {
      await page.setViewportSize({width,height});
      await page.goto(base+'?mode=practiceArena&character=iris&opponent=mara&pick=opponent#characters');
      assert.equal(await page.locator('#opponentPanel').isVisible(),false);
      assert.equal(await page.locator('#characterSelectView').getAttribute('data-editing'),'player');
      await capture('characters-practice-' + size);
      await next();
      assert.equal(new URL(page.url()).searchParams.has('opponent'),false);
      assert.equal(new URL(page.url()).searchParams.has('pick'),false);
      await enter();
      await capture('characters-layout-' + size);
    }
    // Menu exits do not reopen a previous selection step.
    for (const mode of ['spellTraining','practiceArena','soloDuel']) {
      await enter(mode);
      await page.locator('#characterBack').click();
      assert.equal(await page.locator('#mainMenu').isVisible(),true);
      await enter(mode);
      if (mode === 'soloDuel') {
        await page.locator('#opponentRole').click();
        await page.locator('#characterBack').focus();
        await page.keyboard.press('Enter');
        assert.equal(await page.locator('[data-view="soloDuel"]').evaluate(node=>node===document.activeElement),true);
        await enter(mode);
      }
      await next();
      await page.locator('#stageBack').focus();
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('#mainMenu').isVisible(),true);
      assert.equal(await page.locator(`[data-view="${mode}"]`).evaluate(node=>node===document.activeElement),true);
    }
    // Invalid IDs get valid random skins without losing the other role.
    await page.goto(base+'?mode=soloDuel&character=iris&opponent=unknown&pick=opponent#characters');
    assert.equal(await page.locator('#characterName').textContent(),'Iris');
    assert.ok(characters.some(c=>c.id===new URL(page.url()).searchParams.get('opponent')));
    await page.goto(base+'?mode=soloDuel&character=unknown#characters');
    assert.ok(characters.some(c=>c.id===new URL(page.url()).searchParams.get('character')));
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('[data-view="soloDuel"]').evaluate(node=>node===document.activeElement),true);
    await page.goto(base+'?mode=unknown#characters');
    assert.equal(await page.locator('#mainMenu').isVisible(),true);
    assert.equal(await page.evaluate(()=>window.characterCameraCalls),0);
    assert.deepEqual(errors,[]);
    console.log('PASS: editable P1/P2 buttons, distinct random skins, manual duplicates, one Choose location action, no outfit captions or visible status text, shared heading, same-character picks, keyboard, desktop/narrow/medium, stage handoff, restart/reload/history, load retry/cancellation, player-only training/practice, Back to menu. No camera access.');
  } finally {await context.close();}
}

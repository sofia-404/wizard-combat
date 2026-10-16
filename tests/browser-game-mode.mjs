import assert from 'node:assert/strict';

export async function finishCharacterSelection(page, keyboard = false) {
  if (!await page.locator('#characterSelectView').isVisible()) return;
  const confirm = async () => {
    if (keyboard) {
      await page.locator('#characterNext').focus();
      await page.keyboard.press('Enter');
    } else await page.locator('#characterNext').click();
  };
  await confirm();
  await page.locator('#stageSelectView').waitFor({state:'visible'});
}

export async function startSelectedMode(page, keyboard = false) {
  await finishCharacterSelection(page, keyboard);
  if (!await page.locator('#stageSelectView').isVisible()) return;
  if (keyboard) {
    await page.locator('.stage-tile[data-stage="courtyard"]').focus();
    await page.keyboard.press('Space');
    await page.locator('#stageStart').focus();
    await page.keyboard.press('Enter');
  } else {
    await page.locator('.stage-tile[data-stage="courtyard"]').click();
    await page.locator('#stageStart').click();
  }
  await page.locator('#gameBack').waitFor({state:'visible'});
}

export async function openGameMode(page,name) {
  if(await page.locator('#gameView').isVisible())await page.locator('#gameBack').click();
  assert.equal(await page.locator('#mainMenu').isVisible(),true);
  assert.equal(await page.locator('#video').evaluate(el=>el.srcObject),null);
  assert.deepEqual(await page.locator('.menu-nav [data-view]').allTextContents(),['Spell Training','Practice Arena','Solo Duel','Multiplayer','Options','Credits']);
  await page.getByRole('button',{name,exact:true}).click();
  await startSelectedMode(page);
  const selected={'Spell Training':'spellTrainingView','Practice Arena':'practiceArenaView','Solo Duel':'soloDuelView'}[name];
  for(const id of ['spellTrainingView','practiceArenaView','soloDuelView'])assert.equal(await page.locator('#'+id).isVisible(),id===selected);
  assert.equal(await page.locator('#gameView [role="tablist"], #gameView [role="tab"], #gameView .view-tabs').count(),0);
  assert.equal(await page.locator('#gameBack').evaluate(el=>el.matches(':focus-visible')),false);
}

// Simulated readiness only. This helper never requests camera access.
export async function startSimulatedArena(page, view, controlledClock = true) {
  await page.evaluate(async () => (await import('/input-state.js')).updateInputState({
    camera:'Stop camera', cameraState:'Camera on', cameraDisabled:false
  }));
  if (await page.locator('#' + view + 'View .practice-arena').getAttribute('data-round-phase') === 'active') return;
  if (controlledClock) await page.clock.runFor(2000);
  else await page.waitForFunction(view => document.querySelector('#' + view + 'View .practice-arena').dataset.roundPhase === 'active', view);
}

import assert from 'node:assert/strict';

export async function openGameMode(page,name) {
  if(await page.locator('#gameView').isVisible())await page.locator('#gameBack').click();
  assert.equal(await page.locator('#mainMenu').isVisible(),true);
  assert.equal(await page.locator('#video').evaluate(el=>el.srcObject),null);
  assert.deepEqual(await page.locator('.menu-nav [data-view]').allTextContents(),['Spell Training','Practice Arena','Solo Duel','Multiplayer','Options','Credits']);
  await page.getByRole('button',{name,exact:true}).click();
  const selected={'Spell Training':'spellTrainingView','Practice Arena':'practiceArenaView','Solo Duel':'soloDuelView'}[name];
  for(const id of ['spellTrainingView','practiceArenaView','soloDuelView'])assert.equal(await page.locator('#'+id).isVisible(),id===selected);
  assert.equal(await page.locator('#gameView [role="tablist"], #gameView [role="tab"], #gameView .view-tabs').count(),0);
  assert.equal(await page.locator('#gameBack').evaluate(el=>el.matches(':focus-visible')),false);
}

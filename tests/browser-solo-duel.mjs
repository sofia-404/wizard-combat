import assert from 'node:assert/strict';

export async function checkSoloDuel(page, base) {
  await page.goto(base + '?solo-duel-test#soloDuel');
  await page.locator('#soloDuelView .practice-arena').waitFor({state:'visible'});
  assert.equal(await page.locator('#soloDuelHeading').textContent(), 'SOLO DUEL');
  assert.equal(await page.locator('#soloDuelCamera').textContent(), 'Start camera');
  assert.equal(await page.evaluate(() => window.cameraCalls), 0);
  assert.equal(await page.evaluate(() => {
    const ids = [...document.querySelectorAll('[id]')].map(node => node.id);
    return new Set(ids).size === ids.length;
  }), true, 'Cloned markup has unique IDs');
  const health = view => page.locator('#' + view + 'DummyHealth').evaluate(node => node.value);
  const cast = shape => page.evaluate(shape => document.dispatchEvent(new CustomEvent('wizard:cast', {
    detail:{id:crypto.randomUUID(), shape, score:95}
  })), shape);
  await cast('Expelliarmus');
  await page.waitForFunction(() => document.querySelector('#soloDuelDummyHealth').value === 170);
  assert.equal(await page.locator('#soloDuelDummyActor').getAttribute('data-disarmed'), 'true');
  assert.equal(await health('practiceArena'), 200);
  assert.equal(await page.locator('#practiceArenaEvents li').count(), 0);
  await cast('Protego');
  await page.evaluate(() => document.dispatchEvent(new CustomEvent('wizard:player-hit', {
    detail:{view:'soloDuel',id:crypto.randomUUID(),damage:30}
  })));
  assert.equal(await page.locator('#soloDuelPlayerHealth').evaluate(node => node.value), 200);
  await page.locator('#gameBack').click();
  await page.getByRole('button', {name:'Practice Arena',exact:true}).click();
  await cast('Basic Cast');
  await page.waitForFunction(() => document.querySelector('#practiceArenaDummyHealth').value === 170);
  assert.equal(await health('soloDuel'), 170);
  const timer = await page.locator('#soloDuelTimer').textContent();
  await page.waitForTimeout(1100);
  assert.equal(await page.locator('#soloDuelTimer').textContent(), timer, 'Hidden Solo Duel timer pauses');
  await page.locator('#gameBack').click();
  await page.getByRole('button', {name:'Solo Duel',exact:true}).click();
  for (let i = 0; i < 6; i++) {
    await cast('Basic Cast');
    await page.waitForFunction(value => document.querySelector('#soloDuelDummyHealth').value === value, Math.max(0, 170 - 30 * (i + 1)));
  }
  assert.equal(await page.locator('#soloDuelDefeat').isVisible(), true);
  await page.locator('#soloDuelResetDummy').click();
  assert.equal(await health('soloDuel'), 200);
  assert.equal(await health('practiceArena'), 170, 'Solo Duel restart keeps Practice Arena state');
  assert.equal(await page.locator('#soloDuelEvents li strong').textContent(), 'Solo Duel restarted');
  await page.reload();
  await page.locator('#soloDuelView .practice-arena').waitFor({state:'visible'});
  assert.equal(await health('soloDuel'), 200);
  assert.equal(await page.locator('#soloDuelEvents li').count(), 0);
  assert.equal(await page.evaluate(() => window.cameraCalls), 0);
  console.log('PASS: Solo Duel casts, shield, defeat, restart, separate state, paused timer, and reload. Simulated input only.');
}

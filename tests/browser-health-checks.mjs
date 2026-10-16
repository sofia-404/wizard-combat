import assert from 'node:assert/strict';

// Call after preview captures. All hits are simulated; the camera stays off.
export async function checkHealthBars(page, openMode) {
  await page.reload();
  await openMode('Training');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.clock.install();
  const value = id => page.locator('#' + id).evaluate(bar => bar.value);
  const cast = (view, shape, score = 95, id = crypto.randomUUID()) => page.evaluate(({view,shape,score,id}) => {
    document.dispatchEvent(new CustomEvent(view === 'training' ? 'wizard:training-gesture' : 'wizard:cast', {
      detail:{id,type:'cast',accepted:true,shape,score}
    }));
  }, {view,shape,score,id});
  const incoming = (view, damage, id = crypto.randomUUID()) => page.evaluate(detail => {
    document.dispatchEvent(new CustomEvent('wizard:player-hit', {detail}));
  }, {view,damage,id});
  await page.locator('#trainingStart').click();
  let expected = 200;
  for (const [shape,score,damage] of [['Basic Cast',70,20],['Confringo',80,25],['Expelliarmus',95,30]]) {
    const id = crypto.randomUUID();
    await cast('training',shape,score,id);
    assert.equal(await value('trainingDummyHealth'),expected,'launch does not apply damage');
    await page.clock.runFor(160);
    expected -= damage;
    assert.equal(await value('trainingDummyHealth'),expected);
    assert.equal(await page.locator('#trainingDummyHealthText').textContent(),`${expected} / 200`);
    await cast('training',shape,score,id);
    await page.clock.runFor(160);
    assert.equal(await value('trainingDummyHealth'),expected,'duplicate cast does not hit again');
  }
  await cast('training','Protego');
  await page.clock.runFor(160);
  assert.equal(await value('trainingDummyHealth'),expected);
  await cast('training','Basic Cast');
  await page.locator('#trainingSpell').selectOption('protego');
  await page.clock.runFor(160);
  assert.equal(await value('trainingDummyHealth'),expected,'spell change cancels pending damage');
  await cast('training','Basic Cast');
  await openMode('Fight');
  await page.clock.runFor(160);
  assert.equal(await value('trainingDummyHealth'),expected,'leaving cancels pending damage');
  assert.equal(await value('fightDummyHealth'),200,'Training damage stays separate');
  await openMode('Training');
  for (let i = 0; i < 6; i++) {
    await cast('training','Basic Cast');
    await page.clock.runFor(160);
  }
  assert.equal(await value('trainingDummyHealth'),0);
  assert.equal(await page.locator('#trainingDummyActor').getAttribute('data-pose'),'falling');
  await page.locator('#trainingStart').click();
  assert.equal(await value('trainingDummyHealth'),200,'starting a lesson refills the target');
  await page.clock.runFor(3100);
  for (const view of ['training','fight']) {
    await openMode(view === 'training' ? 'Training' : 'Fight');
    const other = view === 'fight' ? 'training' : 'fight';
    const otherHealth = await value(other + 'PlayerHealth');
    await incoming(other,25);
    assert.equal(await value(other + 'PlayerHealth'),otherHealth,'hidden view ignores hits');
    await incoming(view,25,'first-' + view);
    await incoming(view,25,'first-' + view);
    assert.equal(await value(view + 'PlayerHealth'),175);
    assert.equal(await page.locator('#' + view + 'PlayerHealthText').textContent(),'175 / 200');
    await cast(view,'Protego');
    await incoming(view,30,'blocked-' + view);
    assert.equal(await value(view + 'PlayerHealth'),175,'Protego blocks the hit');
    await page.clock.runFor(3100);
    await incoming(view,30,'blocked-' + view);
    assert.equal(await value(view + 'PlayerHealth'),175,'blocked hits cannot replay');
    await incoming(view,-20);
    assert.equal(await value(view + 'PlayerHealth'),175,'invalid damage is ignored');
    await incoming(view,999);
    assert.equal(await value(view + 'PlayerHealth'),0);
    assert.equal(await page.locator('#' + view + 'PlayerHealthText').textContent(),'0 / 200');
  }
  await page.reload();
  for (const view of ['training','fight']) for (const actor of ['Player','Dummy']) {
    assert.equal(await value(view + actor + 'Health'),200,'reload restores health');
  }
}

export async function checkTrainingRestart(page, openMode, output) {
  await page.reload();
  await openMode('Training');
  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 100));
  await page.setViewportSize({width:1920,height:1080});
  await page.emulateMedia({reducedMotion:'no-preference'});
  const cast = async shape => {
    await page.evaluate(shape => document.dispatchEvent(new CustomEvent('wizard:training-gesture', {
      detail:{id:crypto.randomUUID(),type:'cast',accepted:true,shape,score:95}
    })),shape);
    await page.clock.runFor(160);
  };
  const health = () => page.locator('#trainingDummyHealth').evaluate(bar => bar.value);
  const pose = () => page.locator('#trainingDummyActor').getAttribute('data-pose');
  const lesson = () => page.evaluate(() => {
    const ids = ['trainingSpell','trainingCount','trainingLearnedTotal','trainingCompletion','trainingStart','trainingStop'];
    return ids.map(id => {
      const el = document.getElementById(id);
      return {id,text:el.textContent,value:el.value,hidden:el.hidden};
    });
  });
  await page.locator('#trainingStart').click();
  for (let i = 0; i < 3; i++) await cast('Expelliarmus');
  await page.locator('#trainingSpell').selectOption('basic-cast');
  await page.locator('#trainingStart').click();
  await cast('Basic Cast');
  for (let i = 0; i < 5; i++) await cast('Confringo');
  await page.evaluate(() => document.dispatchEvent(new CustomEvent('wizard:player-hit', {
    detail:{view:'training',id:'before-restart',damage:25}
  })));
  await cast('Protego');
  const before = await lesson();
  await cast('Expelliarmus');
  assert.equal(await health(),0);
  assert.equal(await pose(),'falling');
  await page.waitForTimeout(1000);
  assert.equal(await pose(),'fallen');
  await cast('Confringo');
  assert.equal(await health(),0,'fallen dummy ignores attacks');
  assert.deepEqual(await lesson(),before);
  await page.clock.runFor(1600);
  assert.equal(await health(),0,'dummy stays down until the restart deadline');
  await page.clock.runFor(250);
  assert.equal(await health(),200);
  assert.equal(await pose(),'ready');
  assert.equal(await page.locator('#trainingDummyActor').getAttribute('data-disarmed'),'false');
  assert.equal(await page.locator('#trainingPlayerHealth').evaluate(bar => bar.value),175);
  await page.evaluate(() => document.dispatchEvent(new CustomEvent('wizard:player-hit', {
    detail:{view:'training',id:'after-restart',damage:25}
  })));
  assert.equal(await page.locator('#trainingPlayerHealth').evaluate(bar => bar.value),175,'restart preserves Protego');
  assert.deepEqual(await lesson(),before,'restart preserves active lesson and learned marks');
  await cast('Basic Cast');
  assert.equal(await health(),170,'new dummy accepts hits');
  assert.equal(await page.locator('#trainingCount').textContent(),'2 / 3');

  await page.emulateMedia({reducedMotion:'reduce'});
  await cast('Basic Cast');
  for (let i = 0; i < 5; i++) await cast('Confringo');
  assert.equal(await health(),0);
  assert.equal(await pose(),'fallen','reduced motion skips the fall animation');
  const complete = await lesson();
  await page.clock.runFor(600);
  for (const [size,width,height] of [['desktop',1920,1080],['mobile',390,844]]) {
    await page.setViewportSize({width,height});
    await page.screenshot({path:`${output}/training-defeat-${size}.png`,fullPage:true});
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),false);
  }
  await openMode('Fight');
  await page.clock.runFor(2100);
  assert.equal(await health(),200,'restart also completes while Training is hidden');
  assert.equal(await page.locator('#fightDummyHealth').evaluate(bar => bar.value),200);
  await openMode('Training');
  assert.deepEqual(await lesson(),complete,'completed lesson survives automatic restart');
  for (let i = 0; i < 7; i++) await cast('Confringo');
  assert.equal(await health(),0);
  await page.locator('#trainingStart').click();
  assert.equal(await pose(),'ready','manual practice restores the fallen pose');
  await cast('Basic Cast');
  await page.clock.runFor(2100);
  assert.equal(await health(),170,'manual practice cancels the old restart timer');
  await page.clock.resume();
  await page.reload();
}

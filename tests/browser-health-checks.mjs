import assert from 'node:assert/strict';

// Simulate readiness for lesson setup without requesting a camera stream.
export async function startSimulatedLesson(page) {
  const previous = await page.evaluate(async () => {
    const {getInputState, updateInputState} = await import('/input-state.js');
    const {camera, cameraDisabled} = getInputState();
    updateInputState({camera:'Stop camera', cameraDisabled:false});
    return {camera, cameraDisabled};
  });
  await page.evaluate(async previous => (await import('/input-state.js')).updateInputState(previous), previous);
}

// Call after preview captures. All hits are simulated; the camera stays off.
export async function checkHealthBars(page, openMode) {
  await page.reload();
  await openMode('Spell Training');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.clock.install();
  const value = id => page.locator('#' + id).evaluate(bar => bar.value);
  const cast = (view, shape, score = 95, id = crypto.randomUUID()) => page.evaluate(({view,shape,score,id}) => {
    document.dispatchEvent(new CustomEvent(view === 'spellTraining' ? 'wizard:spell-training-gesture' : 'wizard:cast', {
      detail:{id,type:'cast',accepted:true,shape,score}
    }));
  }, {view,shape,score,id});
  const incoming = (view, damage, id = crypto.randomUUID()) => page.evaluate(detail => {
    document.dispatchEvent(new CustomEvent('wizard:player-hit', {detail}));
  }, {view,damage,id});
  await startSimulatedLesson(page);
  let expected = 200;
  for (const [shape,score,damage] of [['Basic Cast',70,20],['Confringo',80,25],['Expelliarmus',95,30]]) {
    const id = crypto.randomUUID();
    await cast('spellTraining',shape,score,id);
    assert.equal(await value('spellTrainingDummyHealth'),expected,'launch does not apply damage');
    await page.clock.runFor(160);
    expected -= damage;
    assert.equal(await value('spellTrainingDummyHealth'),expected);
    assert.equal(await page.locator('#spellTrainingDummyHealthText').textContent(),`${expected} / 200`);
    await cast('spellTraining',shape,score,id);
    await page.clock.runFor(160);
    assert.equal(await value('spellTrainingDummyHealth'),expected,'duplicate cast does not hit again');
  }
  await cast('spellTraining','Protego');
  await page.clock.runFor(160);
  assert.equal(await value('spellTrainingDummyHealth'),expected);
  await cast('spellTraining','Basic Cast');
  await page.locator('#spellTrainingSpell').selectOption('protego');
  await page.clock.runFor(160);
  assert.equal(await value('spellTrainingDummyHealth'),expected,'spell change cancels pending damage');
  await cast('spellTraining','Basic Cast');
  await openMode('Practice Arena');
  await page.clock.runFor(160);
  assert.equal(await value('spellTrainingDummyHealth'),expected,'leaving cancels pending damage');
  assert.equal(await value('practiceArenaDummyHealth'),200,'Spell Training damage stays separate');
  await openMode('Spell Training');
  for (let i = 0; i < 6; i++) {
    await cast('spellTraining','Basic Cast');
    await page.clock.runFor(160);
  }
  assert.equal(await value('spellTrainingDummyHealth'),0);
  assert.equal(await page.locator('#spellTrainingDummyActor').getAttribute('data-pose'),'falling');
  await startSimulatedLesson(page);
  assert.equal(await value('spellTrainingDummyHealth'),200,'starting a lesson refills the target');
  await page.clock.runFor(3100);
  for (const view of ['spellTraining','practiceArena']) {
    await openMode(view === 'spellTraining' ? 'Spell Training' : 'Practice Arena');
    const other = view === 'practiceArena' ? 'spellTraining' : 'practiceArena';
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
  for (const view of ['spellTraining','practiceArena']) for (const actor of ['Player','Dummy']) {
    assert.equal(await value(view + actor + 'Health'),200,'reload restores health');
  }
}

export async function checkSpellTrainingRestart(page, openMode, output) {
  await page.reload();
  await openMode('Spell Training');
  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 100));
  await page.setViewportSize({width:1920,height:1080});
  await page.emulateMedia({reducedMotion:'no-preference'});
  const cast = async shape => {
    await page.evaluate(shape => document.dispatchEvent(new CustomEvent('wizard:spell-training-gesture', {
      detail:{id:crypto.randomUUID(),type:'cast',accepted:true,shape,score:95}
    })),shape);
    await page.clock.runFor(160);
  };
  const health = () => page.locator('#spellTrainingDummyHealth').evaluate(bar => bar.value);
  const pose = () => page.locator('#spellTrainingDummyActor').getAttribute('data-pose');
  const lesson = () => page.evaluate(() => {
    const ids = ['spellTrainingSpell','spellTrainingCount','spellTrainingLearnedTotal','spellTrainingCompletion'];
    return ids.map(id => {
      const el = document.getElementById(id);
      return {id,text:el.textContent,value:el.value,hidden:el.hidden};
    });
  });
  await startSimulatedLesson(page);
  for (let i = 0; i < 3; i++) await cast('Expelliarmus');
  await page.locator('#spellTrainingSpell').selectOption('basic-cast');
  await startSimulatedLesson(page);
  await cast('Basic Cast');
  for (let i = 0; i < 5; i++) await cast('Confringo');
  await page.evaluate(() => document.dispatchEvent(new CustomEvent('wizard:player-hit', {
    detail:{view:'spellTraining',id:'before-restart',damage:25}
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
  assert.equal(await page.locator('#spellTrainingDummyActor').getAttribute('data-disarmed'),'false');
  assert.equal(await page.locator('#spellTrainingPlayerHealth').evaluate(bar => bar.value),175);
  await page.evaluate(() => document.dispatchEvent(new CustomEvent('wizard:player-hit', {
    detail:{view:'spellTraining',id:'after-restart',damage:25}
  })));
  assert.equal(await page.locator('#spellTrainingPlayerHealth').evaluate(bar => bar.value),175,'restart preserves Protego');
  assert.deepEqual(await lesson(),before,'restart preserves active lesson and learned marks');
  await cast('Basic Cast');
  assert.equal(await health(),170,'new dummy accepts hits');
  assert.equal(await page.locator('#spellTrainingCount').textContent(),'2 / 3');

  await page.emulateMedia({reducedMotion:'reduce'});
  await cast('Basic Cast');
  for (let i = 0; i < 5; i++) await cast('Confringo');
  assert.equal(await health(),0);
  assert.equal(await pose(),'fallen','reduced motion skips the fall animation');
  const complete = await lesson();
  await page.clock.runFor(600);
  for (const [size,width,height] of [['desktop',1920,1080],['mobile',390,844]]) {
    await page.setViewportSize({width,height});
    await page.screenshot({path:`${output}/spell-training-defeat-${size}.png`,fullPage:true});
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),false);
  }
  await openMode('Practice Arena');
  await page.clock.runFor(2100);
  assert.equal(await health(),200,'restart also completes while Spell Training is hidden');
  assert.equal(await page.locator('#practiceArenaDummyHealth').evaluate(bar => bar.value),200);
  await openMode('Spell Training');
  assert.deepEqual(await lesson(),complete,'completed lesson survives automatic restart');
  for (let i = 0; i < 7; i++) await cast('Confringo');
  assert.equal(await health(),0);
  await startSimulatedLesson(page);
  assert.equal(await pose(),'ready','manual practice restores the fallen pose');
  await cast('Basic Cast');
  await page.clock.runFor(2100);
  assert.equal(await health(),170,'manual practice cancels the old restart timer');
  await page.clock.resume();
  await page.reload();
}

export async function checkPlayerDefeat(page, openMode, output) {
  const cast = view => page.evaluate(view => document.dispatchEvent(new CustomEvent(
    view === 'practiceArena' ? 'wizard:cast' : 'wizard:spell-training-gesture',
    {detail:{id:crypto.randomUUID(),type:'cast',accepted:true,shape:'Expelliarmus',score:95}}
  )),view);
  const hit = (view,id,damage=999) => page.evaluate(detail => document.dispatchEvent(
    new CustomEvent('wizard:player-hit',{detail})
  ),{view,id,damage});
  const hp = (view,actor) => page.locator(`#${view}${actor}Health`).evaluate(bar => bar.value);
  const pose = view => page.locator(`#${view}PlayerActor`).getAttribute('data-pose');
  for (const view of ['practiceArena','spellTraining']) {
    await page.reload();
    await openMode(view === 'practiceArena' ? 'Practice Arena' : 'Spell Training');
    await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 100));
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.setViewportSize({width:1920,height:1080});
    if (view === 'spellTraining') await startSimulatedLesson(page);
    await cast(view);
    await page.clock.runFor(160);
    assert.equal(await hp(view,'Dummy'),170);
    const progress = await page.locator('#spellTrainingCount').textContent();
    await hit(view,view + '-lethal');
    assert.equal(await hp(view,'Player'),0);
    assert.equal(await pose(view),'falling');
    assert.equal(await page.locator(`#${view}PlayerActor .player-breathe`).evaluate(el => getComputedStyle(el).animationName),'none');
    await page.waitForTimeout(1000);
    assert.equal(await pose(view),'fallen');
    await cast(view);
    await hit(view,view + '-repeat');
    await page.clock.runFor(160);
    assert.equal(await hp(view,'Dummy'),170,'fallen player cannot cast');
    assert.equal(await page.locator('#spellTrainingCount').textContent(),progress,'defeat does not change lesson count');
    const fallenTransform = await page.locator(`#${view}PlayerActor`).evaluate(el => getComputedStyle(el).transform);
    assert.notEqual(fallenTransform,'none');
    await page.emulateMedia({reducedMotion:'reduce'});
    for (const [size,width,height] of [['desktop',1920,1080],['mobile',390,844]]) {
      await page.setViewportSize({width,height});
      await page.screenshot({path:`${output}/${view}-player-defeat-${size}.png`,fullPage:true});
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),false);
    }
    if (view === 'practiceArena') {
      assert.equal(await page.locator('#practiceArenaDefeat strong').textContent(),'Player defeated');
      const timer = await page.locator('#practiceArenaTimer').textContent();
      await openMode('Spell Training');
      await page.clock.runFor(3000);
      await openMode('Practice Arena');
      assert.equal(await hp(view,'Player'),0);
      assert.equal(await pose(view),'fallen');
      assert.equal(await page.locator('#practiceArenaTimer').textContent(),timer,'defeat pauses Practice Arena time');
      await page.locator('#practiceArenaResetDummy').focus();
      await page.keyboard.press('Enter');
      assert.equal(await hp(view,'Dummy'),200);
      assert.equal(await page.locator('#practiceArenaCamera').evaluate(el => el === document.activeElement),true);
      assert.equal(await page.locator('#practiceArenaDefeat').isVisible(),false);
    } else {
      await page.clock.runFor(1800);
      assert.equal(await hp(view,'Player'),0,'repeat hits do not reset or shorten the delay');
      await openMode('Practice Arena');
      await page.clock.runFor(100);
      await openMode('Spell Training');
      assert.equal(await hp(view,'Dummy'),170,'player restart keeps dummy health');
      assert.equal(await page.locator('#spellTrainingCount').textContent(),progress);
    }
    assert.equal(await hp(view,'Player'),200);
    assert.equal(await pose(view),'ready');
    await hit(view,view + '-lethal');
    assert.equal(await hp(view,'Player'),200,'old hit cannot replay after restart');
    await hit(view,view + '-reduced');
    assert.equal(await pose(view),'fallen','reduced motion shows the fallen state directly');
    if (view === 'spellTraining') {
      await page.clock.runFor(2100);
      await cast(view);
      await page.clock.runFor(160);
      await cast(view);
      await page.clock.runFor(160);
      assert.equal(await page.locator('#spellTrainingCount').textContent(),'3 / 3');
      const learned = await page.locator('#spellTrainingLearnedTotal').textContent();
      await hit(view,'completed-lesson');
      await page.clock.runFor(2100);
      assert.equal(await page.locator('#spellTrainingCount').textContent(),'3 / 3');
      assert.equal(await page.locator('#spellTrainingLearnedTotal').textContent(),learned);
      assert.equal(await page.locator('#spellTrainingCompletion').isVisible(),true);
    } else {
      await page.locator('#practiceArenaResetDummy').click();
    }
    await page.clock.resume();
  }
  await page.reload();
}

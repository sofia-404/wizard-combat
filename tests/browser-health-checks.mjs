import {startSimulatedArena} from './browser-game-mode.mjs';
import assert from 'node:assert/strict';
import {COMBAT_SPELLS} from '../dist/combat/rules.js';

// Simulate full readiness without requesting a camera stream.
export async function startSimulatedLesson(page) {
  await page.evaluate(async () => {
    const {updateInputState} = await import('/input-state.js');
    updateInputState({camera:'Start camera', cameraState:'Camera stopped', cameraDisabled:false});
    updateInputState({camera:'Stop camera', cameraState:'Camera on', cameraDisabled:false});
  });
}
const value = (page, view, actor) => page.locator(`#${view}${actor}Health`).evaluate(bar => bar.value);
const cast = (page, view, shape, id = crypto.randomUUID()) => page.evaluate(({view,shape,id}) => {
  document.dispatchEvent(new CustomEvent(view === 'spellTraining' ? 'wizard:spell-training-gesture' : 'wizard:cast', {
    detail:{id,type:'cast',accepted:true,shape,score:95}
  }));
}, {view,shape,id});
const incoming = (page, view, damage, id = crypto.randomUUID()) => page.evaluate(detail => {
  document.dispatchEvent(new CustomEvent('wizard:player-hit', {detail}));
}, {view,damage,id});
const settle = (page, shape) => page.clock.runFor(Math.max(COMBAT_SPELLS[shape].flightMs, COMBAT_SPELLS[shape].recoveryMs) + 50);
const capture = async (page, output, prefix) => {
  await page.emulateMedia({reducedMotion:'reduce'});
  for (const [size,width,height] of [['desktop',1920,1080],['mobile',390,844]]) {
    await page.setViewportSize({width,height});
    await page.evaluate(() => scrollTo({top:0,left:0,behavior:'instant'}));
    await page.screenshot({path:`${output}/${prefix}-${size}.png`,fullPage:true});
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),false);
  }
};

export async function checkHealthBars(page, openMode) {
  await page.clock.install();
  await page.reload();
  await openMode('Spell Training');
  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 100));
  await startSimulatedLesson(page);
  let expected = 200;
  for (const shape of ['Basic Cast','Confringo','Expelliarmus']) {
    const id = crypto.randomUUID();
    await cast(page,'spellTraining',shape,id);
    assert.equal(await value(page,'spellTraining','Dummy'),expected,'launch does not apply damage');
    await settle(page,shape);
    expected -= COMBAT_SPELLS[shape].damage;
    assert.equal(await value(page,'spellTraining','Dummy'),expected);
    await cast(page,'spellTraining',shape,id);
    await settle(page,shape);
    assert.equal(await value(page,'spellTraining','Dummy'),expected,'duplicate cannot hit again');
  }
  await cast(page,'spellTraining','Basic Cast');
  await page.locator('#spellTrainingSpell').selectOption('basic-cast');
  await page.clock.runFor(1200);
  // Selecting an idle lesson refills the target and cancels the old shot.
  assert.equal(await value(page,'spellTraining','Dummy'),200);
  await cast(page,'spellTraining','Basic Cast');
  await openMode('Practice Arena');
  await page.clock.runFor(1200);
  assert.equal(await value(page,'spellTraining','Dummy'),200,'navigation cancels pending damage');
  for (const view of ['spellTraining','practiceArena']) {
    await openMode(view === 'spellTraining' ? 'Spell Training' : 'Practice Arena');
    if (view === 'spellTraining') await startSimulatedLesson(page);
    else await startSimulatedArena(page,view);
    const other = view === 'practiceArena' ? 'spellTraining' : 'practiceArena';
    const before = await value(page,other,'Player');
    await incoming(page,other,25);
    assert.equal(await value(page,other,'Player'),before,'hidden views ignore hits');
    await incoming(page,view,25,'first-'+view);
    await incoming(page,view,25,'first-'+view);
    assert.equal(await value(page,view,'Player'),175);
    await cast(page,view,'Protego');
    await incoming(page,view,30,'blocked-'+view);
    assert.equal(await value(page,view,'Player'),175);
    await page.clock.runFor(2050);
    await incoming(page,view,30,'blocked-'+view);
    await incoming(page,view,-20);
    assert.equal(await value(page,view,'Player'),175,'blocked replays and invalid damage do nothing');
    await incoming(page,view,999);
    assert.equal(await value(page,view,'Player'),0);
  }
  await page.reload();
  for (const view of ['spellTraining','practiceArena']) for (const actor of ['Player','Dummy']) {
    assert.equal(await value(page,view,actor),200);
  }
  await page.clock.resume();
}

export async function checkSpellTrainingRestart(page, openMode, output) {
  await page.reload();
  await openMode('Spell Training');
  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 100));
  await startSimulatedLesson(page);
  for (let i=0;i<3;i++) { await cast(page,'spellTraining','Expelliarmus'); await settle(page,'Expelliarmus'); }
  await page.locator('#spellTrainingSpell').selectOption('basic-cast');
  for (let i=0;i<10;i++) { await cast(page,'spellTraining','Basic Cast'); await settle(page,'Basic Cast'); }
  assert.equal(await value(page,'spellTraining','Dummy'),0);
  assert.equal(await page.locator('#spellTrainingCount').textContent(),'3 / 3');
  const learned = await page.locator('#spellTrainingLearnedTotal').textContent();
  await incoming(page,'spellTraining',25);
  await page.clock.runFor(250);
  await cast(page,'spellTraining','Protego');
  await capture(page,output,'spell-training-defeat');
  await page.clock.runFor(1600);
  assert.equal(await value(page,'spellTraining','Dummy'),0,'full two-second restart delay');
  await page.clock.runFor(200);
  assert.equal(await value(page,'spellTraining','Dummy'),200);
  assert.equal(await page.locator('#spellTrainingDummyActor').getAttribute('data-disarmed'),'false');
  assert.equal(await value(page,'spellTraining','Player'),175);
  await incoming(page,'spellTraining',25);
  assert.equal(await value(page,'spellTraining','Player'),175,'target reset keeps the remaining shield time');
  assert.equal(await page.locator('#spellTrainingCount').textContent(),'3 / 3');
  assert.equal(await page.locator('#spellTrainingLearnedTotal').textContent(),learned);
  await cast(page,'spellTraining','Basic Cast'); await settle(page,'Basic Cast');
  assert.equal(await value(page,'spellTraining','Dummy'),180);
  for (let i=0;i<9;i++) { await cast(page,'spellTraining','Basic Cast'); await settle(page,'Basic Cast'); }
  assert.equal(await value(page,'spellTraining','Dummy'),0);
  await openMode('Practice Arena');
  await page.clock.runFor(2100);
  assert.equal(await value(page,'spellTraining','Dummy'),200,'restart completes in a hidden mode');
  await openMode('Spell Training');
  assert.equal(await page.locator('#spellTrainingLearnedTotal').textContent(),learned);
  await startSimulatedLesson(page);
  await cast(page,'spellTraining','Basic Cast'); await settle(page,'Basic Cast');
  await page.clock.runFor(2100);
  assert.equal(await value(page,'spellTraining','Dummy'),180,'lesson restart cancels old timers');
  await page.clock.resume();
}

export async function checkPlayerDefeat(page, openMode, output) {
  for (const view of ['practiceArena','spellTraining']) {
    await page.reload();
    await openMode(view === 'practiceArena' ? 'Practice Arena' : 'Spell Training');
    await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 100));
    if (view === 'spellTraining') await startSimulatedLesson(page);
    else await startSimulatedArena(page,view);
    await cast(page,view,'Expelliarmus'); await settle(page,'Expelliarmus');
    assert.equal(await value(page,view,'Dummy'),190);
    await incoming(page,view,999,'lethal-'+view);
    assert.equal(await value(page,view,'Player'),0);
    await cast(page,view,'Expelliarmus');
    await page.clock.runFor(100);
    assert.equal(await value(page,view,'Dummy'),190);
    await capture(page,output,view+'-player-defeat');
    if (view === 'practiceArena') {
      await page.clock.runFor(3900);
      await incoming(page,view,999);
      assert.equal(await page.locator('#practiceArenaDefeat strong').textContent(),'Dummy wins the match · 0–2');
      await openMode('Spell Training'); await openMode('Practice Arena');
      assert.equal(await value(page,view,'Player'),0);
      await page.locator('#practiceArenaResetDummy').focus();
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('#practiceArenaCamera').evaluate(el => el === document.activeElement),true);
      await startSimulatedArena(page,view);
    } else {
      await page.clock.runFor(1800);
      assert.equal(await value(page,view,'Player'),0);
      await page.clock.runFor(150);
      assert.equal(await value(page,view,'Dummy'),190);
      assert.equal(await page.locator('#spellTrainingCount').textContent(),'1 / 3');
    }
    assert.equal(await value(page,view,'Player'),200);
    await incoming(page,view,999,'lethal-'+view);
    assert.equal(await value(page,view,'Player'),200,'old hit cannot replay after reset');
    if (view === 'spellTraining') {
      for (let i=0;i<2;i++) { await cast(page,view,'Expelliarmus'); await settle(page,'Expelliarmus'); }
      assert.equal(await page.locator('#spellTrainingCount').textContent(),'3 / 3');
      await incoming(page,view,999);
      await page.clock.runFor(2100);
      assert.equal(await page.locator('#spellTrainingCount').textContent(),'3 / 3');
    }
    await page.clock.resume();
  }
  await page.reload();
}

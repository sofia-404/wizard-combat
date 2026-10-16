import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {characters} from '../dist/characters.js';
import {COMBAT_SPELLS} from '../dist/combat/rules.js';

export async function checkBattleSkins(browser, base, root) {
  const output = path.join(root, '.tmp/battle-skins');
  await mkdir(output, {recursive:true});
  const context = await browser.newContext({viewport:{width:1920,height:1080}, reducedMotion:'reduce'});
  await context.addInitScript(() => {
    window.skinCameraCalls = 0;
    navigator.mediaDevices.getUserMedia = () => { window.skinCameraCalls++; throw Error('Real camera access is forbidden'); };
  });
  await context.route('**/api/**', route => route.fulfill({status:201, body:'{"saved":true}'}));
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const ready = mode => page.locator(`#${mode}View .practice-arena[data-art-state="ready"]`).waitFor({state:'visible'});
  const check = async (mode, player, opponent) => {
    await ready(mode);
    for (const [role, id] of [['Player', player], ['Dummy', opponent]]) {
      const actor = page.locator(`#${mode}${role}Actor`);
      assert.equal(await actor.getAttribute('data-skin'), id);
      const body = actor.locator('.battle-skin image').last();
      if (id) {
        assert.equal(await body.getAttribute('href'), characters.find(c => c.id === id).battleImage);
        assert.equal(await body.isVisible(), true);
        assert.equal(await actor.locator('.skin-original-hidden').evaluateAll(nodes => nodes.every(node => getComputedStyle(node).display === 'none')), true);
      } else assert.equal(await body.count(), 0);
    }
    assert.equal(await page.locator(`#${mode}PlayerHealth`).evaluate(node => node.value), 200);
  };
  const capture = async name => {
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({path:path.join(output, name + '.png'), fullPage:true});
  };
  try {
    // Same arena and same stage, with no reload: a different skin must invalidate art loading.
    await page.goto(base + '?stage=forest&character=mara&opponent=silas#soloDuel');
    for (let i = 0; i < characters.length; i++) {
      const player = characters[i], opponent = characters[(i + 1) % characters.length];
      await page.evaluate(({player, opponent}) => {
        history.replaceState(null, '', `?stage=forest&character=${player}&opponent=${opponent}#soloDuel`);
        dispatchEvent(new PopStateEvent('popstate'));
      }, {player:player.id, opponent:opponent.id});
      await check('soloDuel', player.id, opponent.id);
      await page.locator('#soloDuelView .practice-arena').screenshot({path:path.join(output, player.id + '.png')});
    }
    // Check actual PNG transparency, not just file names or dataset flags.
    const transparent = await page.evaluate(async sources => Promise.all(sources.map(async src => {
      const image = new Image(); image.src = src; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width=image.width; canvas.height=image.height;
      const ctx=canvas.getContext('2d'); ctx.drawImage(image,0,0);
      const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;
      let empty=0, solid=0;
      for(let i=3;i<data.length;i+=4){if(data[i]===0)empty++;if(data[i]>=240)solid++;}
      return {src,empty:empty/(canvas.width*canvas.height),solid:solid/(canvas.width*canvas.height)};
    })), characters.map(c => c.battleImage));
    assert.ok(transparent.every(result=>result.empty>.25 && result.solid>.1),JSON.stringify(transparent));
    for (const [size,width,height] of [['desktop',1920,1080],['mobile',390,844]]) {
      await page.setViewportSize({width,height});
      for (const mode of ['soloDuel','practiceArena','spellTraining']) {
        await page.goto(base + `?stage=forest&character=mara&opponent=silas#${mode}`);
        await check(mode, 'mara', mode === 'soloDuel' ? 'silas' : null);
        await capture(mode + '-' + size);
        if (mode !== 'soloDuel') assert.equal(await page.locator(`#${mode}DummyActor .dummy-sway > image`).getAttribute('href'), '/assets/practice-arena-dummy-unarmed.png');
      }
    }
    await page.goto(base + '?stage=forest&character=mara&opponent=silas#soloDuel');
    await check('soloDuel', 'mara', 'silas');
    await page.locator('#soloDuelResetDummy').evaluate(button => button.click());
    await check('soloDuel', 'mara', 'silas');
    await page.reload();
    await check('soloDuel', 'mara', 'silas');
    const origin = await page.evaluate(async () => {
      const {createSpellEffects}=await import('/practice-arena-effects.js');
      const svg=document.querySelector('#soloDuelIncomingEffects');
      const effects=createSpellEffects(svg,()=>{});
      effects.cast({shape:'Basic Cast'});
      const orb=svg.querySelector('.practice-arena-spell > circle');
      const result={x:Number(orb.getAttribute('cx')),y:Number(orb.getAttribute('cy'))};
      effects.clear();
      const wand=document.querySelector('#soloDuelDummyWand');
      return {actual:result,expected:{x:Number(wand.dataset.tipX),y:Number(wand.dataset.tipY)}};
    });
    assert.deepEqual(origin.actual,origin.expected);
    // Existing display controllers still own the same actor and wand nodes.
    await page.evaluate(async () => {
      const actor=document.querySelector('#soloDuelDummyActor');
      const {createPracticeArenaDisarm}=await import('/practice-arena-disarm.js');
      window.skinDisarm=createPracticeArenaDisarm(actor,null);
      window.skinDisarm.hit({id:'skin-disarm',shape:'Expelliarmus'});
    });
    assert.equal(await page.locator('#soloDuelDummyActor').getAttribute('data-disarmed'),'true');
    assert.notEqual(await page.locator('#soloDuelDummyWand').evaluate(node=>getComputedStyle(node).transform),'matrix(1, 0, 0, 1, 0, 0)');
    const droppedTip = await page.locator('#soloDuelDummyWand image').evaluate(node =>
      new DOMPoint(1289,618).matrixTransform(node.getCTM()).matrixTransform(node.ownerSVGElement.getCTM().inverse()).y);
    assert.ok(Math.abs(droppedTip-773)<2,`Dropped wand must reach the floor: ${droppedTip}`);
    await page.evaluate(async () => {
      window.skinDisarm.reset();
      const {createDummyReactions,createPlayerReactions}=await import('/practice-arena-reactions.js');
      createDummyReactions(document.querySelector('#soloDuelDummyActor')).react('Basic Cast',true);
      createPlayerReactions(document.querySelector('#soloDuelPlayerActor')).react('Basic Cast',true);
    });
    assert.equal(await page.locator('#soloDuelDummyActor').getAttribute('data-pose'),'fallen');
    assert.equal(await page.locator('#soloDuelPlayerActor').getAttribute('data-pose'),'fallen');
    assert.equal(await page.locator('#soloDuelDummyActor .battle-skin').isVisible(),true);
    await capture('fallen-mobile');
    // Direct links with no skin restore the old layers and wand after a selected skin.
    await page.evaluate(() => { history.replaceState(null,'','?stage=forest#soloDuel');dispatchEvent(new PopStateEvent('popstate')); });
    await check('soloDuel',null,null);
    assert.equal(await page.locator('#soloDuelDummyWand image').getAttribute('transform'),null);
    assert.equal(await page.locator('#soloDuelView .skin-original-hidden').count(),0);
    // A failed battle sprite keeps setup open and retries the same choices.
    await page.route('**/battle-v1/iris.png',route=>route.abort());
    await page.goto(base+'?mode=soloDuel&stage=forest&character=iris&opponent=iris#stages');
    await page.locator('#stageStart').click();
    await page.getByRole('button',{name:'Retry',exact:true}).waitFor();
    assert.equal(await page.locator('#stageSelectView').isVisible(),true);
    await page.unroute('**/battle-v1/iris.png');
    await page.locator('#stageStart').click();
    await check('soloDuel','iris','iris');
    // Real game event handlers with simulated readiness; never request a camera stream.
    await page.clock.install();
    await page.goto(base+'?stage=forest&character=mara#practiceArena');
    await check('practiceArena','mara',null);
    await page.evaluate(async () => (await import('/input-state.js')).updateInputState({camera:'Stop camera',cameraState:'Camera on',cameraDisabled:false}));
    await page.clock.runFor(3500);
    await page.evaluate(() => document.dispatchEvent(new CustomEvent('wizard:cast',{detail:{id:crypto.randomUUID(),shape:'Basic Cast',score:95}})));
    await page.clock.runFor(COMBAT_SPELLS['Basic Cast'].flightMs+100);
    assert.equal(await page.locator('#practiceArenaDummyHealth').evaluate(node=>node.value),200-COMBAT_SPELLS['Basic Cast'].damage);
    await page.evaluate(() => document.dispatchEvent(new CustomEvent('wizard:player-hit',{detail:{view:'practiceArena',id:crypto.randomUUID(),damage:25}})));
    assert.equal(await page.locator('#practiceArenaPlayerHealth').evaluate(node=>node.value),175);
    assert.equal(await page.locator('#practiceArenaPlayerActor').getAttribute('data-skin'),'mara');
    assert.equal(await page.evaluate(()=>window.skinCameraCalls),0);
    assert.deepEqual(errors,[]);
    console.log('PASS: all 11 battle skins for P1 and P2, same-stage skin changes, transparency, three modes at desktop/narrow widths, unchanged practice dummies, reload/Restart, same-skin opponents, sprite retry, disarm/fall display, floor contact, spell origin, simulated casts and hits, legacy restoration. Real camera blocked.');
  } finally { await context.close(); }
}

import {getSettings,updateSettings} from './settings.js';
import {createMenuAudio} from './menu-audio.js';
import {setupMenuBack} from './presentation/menu-back.js';
import {stopGameCamera} from './app.js';
import {selectGameView} from './practice-arena.js';
import './spell-training.js';
const $=id=>document.getElementById(id);
const audio=createMenuAudio(getSettings);
const views={menu:$('mainMenu'),options:$('optionsView'),credits:$('creditsView'),game:$('gameView')};
const routes=['menu','spellTraining','practiceArena','soloDuel','options','credits'];
let current=null,returnFocus=null;
const help={easy:'9 seconds to draw. More forgiving shape tolerance.',normal:'6 seconds to draw. Standard shape tolerance.',hard:'3.5 seconds to draw. Tighter shape tolerance.'};
function renderSettings(){
  const settings=getSettings();
  for(const key of ['musicVolume','sfxVolume']){$(key).value=settings[key];$(key+'Value').textContent=settings[key]+'%';}
  $('handSetting').value=settings.hand;$('pointSetting').value=settings.point;
  $('difficultySetting').value=settings.difficulty;$('difficultyHelp').textContent=help[settings.difficulty];
  audio.sync();
}
const music={practiceArena:'duel',soloDuel:'duel',spellTraining:'duel'};
function show(name,trigger,moveFocus=true){
  if(!routes.includes(name)||name===current)return;
  const initial=current===null;
  const game=['spellTraining','practiceArena','soloDuel'].includes(name);
  const viewName=game?'game':name;
  if(['spellTraining','practiceArena','soloDuel'].includes(current)){stopGameCamera();if(!game)selectGameView(null);}
  if(name!=='menu')returnFocus=trigger||document.querySelector(`[data-view="${name}"]`);
  for(const [key,view] of Object.entries(views))view.hidden=key!==viewName;
  $('menuShell').hidden=game;
  current=name;
  if(game)selectGameView(name);
  audio.setScene(game?music[name]:'menu',game?name:'menu');window.scrollTo(0,0);
  if(initial)return;
  // Pointer returns start Tab at the menu without selecting a button.
  if(!moveFocus){if(name==='menu')views.menu.focus({preventScroll:true});return;}
  if(name==='menu')(returnFocus||document.querySelector('[data-view="spellTraining"]')).focus();
  else if(game)$('gameBack').focus();
  else views[name].querySelector('h2').focus();
}
function navigate(name,trigger,moveFocus=true){
  if(!routes.includes(name))return;
  if(location.hash!=='#'+name)history.pushState(null,'','#'+name);
  show(name,trigger,moveFocus);
}
function restoreRoute(){
  const requested=location.hash.slice(1),name=routes.includes(requested)?requested:'menu';
  if(requested&&requested!==name)history.replaceState(null,'','#'+name);
  show(name);
}
window.addEventListener('popstate',restoreRoute);
window.addEventListener('hashchange',restoreRoute);
// Keyboard and assistive activation have no pointer click count.
for(const button of document.querySelectorAll('[data-view]:not(:disabled)'))button.addEventListener('click',event=>navigate(button.dataset.view,button,event.detail===0));
setupMenuBack(moveFocus=>navigate('menu',null,moveFocus));
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&current!=='menu'){event.preventDefault();navigate('menu');}});
$('optionsForm').addEventListener('submit',event=>event.preventDefault());
for(const [id,key] of [['handSetting','hand'],['pointSetting','point'],['difficultySetting','difficulty']])$(id).addEventListener('change',event=>updateSettings({[key]:event.target.value}));
for(const key of ['musicVolume','sfxVolume'])$(key).addEventListener('input',event=>updateSettings({[key]:Number(event.target.value)}));
for(const type of ['wizard:game-cast','wizard:opponent-cast','wizard:spell-training-cast'])document.addEventListener(type,({detail})=>{if(detail.view===current)audio.play(detail.shape);});
document.addEventListener('wizard:duel-defeat',({detail})=>{if(detail.view===current)audio.setDefeated(true,!detail.player);});
document.addEventListener('wizard:duel-state',({detail})=>{if(detail.view===current)audio.setDefeated(detail.over,false);});
document.addEventListener('wizard:duel-reset',({detail})=>{if(detail.view===current)audio.setDefeated(false);});
document.addEventListener('wizard:duel-hit',({detail})=>{if(detail.view===current)audio.play('hit');});
window.addEventListener('pagehide',()=>audio.stop());
window.addEventListener('pageshow',()=>audio.sync());
document.addEventListener('pointerdown',()=>audio.unlock(),{once:true});document.addEventListener('keydown',()=>audio.unlock(),{once:true});
for(const button of document.querySelectorAll('#menuShell button:not(:disabled),#menuShell select,#gameView button,#gameView select')){button.addEventListener('pointerenter',()=>{if(!button.disabled)audio.play('hover');});button.addEventListener('focus',()=>{if(!button.disabled)audio.play('hover');});button.addEventListener('click',()=>audio.play('click'));}
window.addEventListener('wizard-settings',renderSettings);document.addEventListener('visibilitychange',()=>audio.sync());renderSettings();

for(const button of document.querySelectorAll('.menu-nav button:not(:disabled)'))button.addEventListener('pointermove',event=>{if(event.pointerType==='mouse'&&document.activeElement!==button)button.focus({preventScroll:true});});
restoreRoute();

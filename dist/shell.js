import {getSettings,updateSettings} from './settings.js';
import {createMenuAudio} from './menu-audio.js';
import {stopGameCamera} from './app.js';
import {selectGameView} from './fight.js';
import './training.js';
const $=id=>document.getElementById(id);
const audio=createMenuAudio(getSettings);
const views={menu:$('mainMenu'),options:$('optionsView'),credits:$('creditsView'),game:$('gameView')};
const routes=['menu','training','fight','options','credits'];
let current=null,returnFocus=null;
const help={easy:'9 seconds to draw. More forgiving shape tolerance.',normal:'6 seconds to draw. Standard shape tolerance.',hard:'3.5 seconds to draw. Tighter shape tolerance.'};
function renderSettings(){
  const settings=getSettings();
  $('musicSetting').checked=settings.music;$('sfxSetting').checked=settings.sfx;
  $('handSetting').value=settings.hand;$('pointSetting').value=settings.point;
  $('difficultySetting').value=settings.difficulty;$('difficultyHelp').textContent=help[settings.difficulty];
  const label=settings.muted?'Unmute sound':'Mute sound';
  $('soundToggleLabel').textContent=label;
  $('soundToggle').setAttribute('aria-pressed',String(settings.muted));$('soundToggle').setAttribute('aria-label',label);
  audio.sync();
}
const music={fight:'duel',training:null};
function show(name,trigger,moveFocus=true){
  if(!routes.includes(name)||name===current)return;
  const initial=current===null;
  const game=['training','fight'].includes(name);
  const viewName=game?'game':name;
  if(['training','fight'].includes(current)){stopGameCamera();if(!game)selectGameView(null);}
  if(name!=='menu')returnFocus=trigger||document.querySelector(`[data-view="${name}"]`);
  for(const [key,view] of Object.entries(views))view.hidden=key!==viewName;
  $('menuShell').hidden=game;
  current=name;
  if(game)selectGameView(name);
  audio.setScene(game?music[name]:'menu');window.scrollTo(0,0);
  if(initial)return;
  // Pointer returns start Tab at the menu without selecting a button.
  if(!moveFocus){if(name==='menu')views.menu.focus({preventScroll:true});return;}
  if(name==='menu')(returnFocus||document.querySelector('[data-view="training"]')).focus();
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
for(const button of document.querySelectorAll('[data-view]'))button.addEventListener('click',event=>navigate(button.dataset.view,button,event.detail===0));
for(const button of document.querySelectorAll('[data-back]'))button.addEventListener('click',event=>navigate('menu',null,event.detail===0));
$('gameBack').addEventListener('click',event=>navigate('menu',null,event.detail===0));
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&current!=='menu'){event.preventDefault();navigate('menu');}});
$('optionsForm').addEventListener('submit',event=>event.preventDefault());
for(const [id,key] of [['musicSetting','music'],['sfxSetting','sfx'],['handSetting','hand'],['pointSetting','point'],['difficultySetting','difficulty']])$(id).addEventListener('change',event=>updateSettings({[key]:event.target.type==='checkbox'?event.target.checked:event.target.value}));
$('soundToggle').addEventListener('click',()=>updateSettings({muted:!getSettings().muted}));
document.addEventListener('wizard:cast',event=>audio.play(event.detail.shape));
document.addEventListener('wizard:training-cast',event=>audio.play(event.detail.shape));
document.addEventListener('wizard:duel-defeat',()=>audio.setDefeated(true));
document.addEventListener('wizard:duel-reset',()=>audio.setDefeated(false));
document.addEventListener('wizard:duel-hit',()=>audio.play('hit'));
window.addEventListener('pagehide',()=>audio.stop());
window.addEventListener('pageshow',()=>audio.sync());
document.addEventListener('pointerdown',()=>audio.unlock(),{once:true});document.addEventListener('keydown',()=>audio.unlock(),{once:true});
for(const button of document.querySelectorAll('#menuShell button,#menuShell select')){button.addEventListener('pointerenter',()=>audio.play('hover'));button.addEventListener('focus',()=>audio.play('hover'));button.addEventListener('click',()=>audio.play('click'));}
window.addEventListener('wizard-settings',renderSettings);document.addEventListener('visibilitychange',()=>audio.sync());renderSettings();

for(const button of document.querySelectorAll('.menu-nav button'))button.addEventListener('pointermove',event=>{if(event.pointerType==='mouse'&&document.activeElement!==button)button.focus({preventScroll:true});});
restoreRoute();

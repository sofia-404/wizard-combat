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
function renderSettings(){const settings=getSettings();$('musicSetting').checked=settings.music;$('sfxSetting').checked=settings.sfx;$('handSetting').value=settings.hand;$('pointSetting').value=settings.point;$('difficultySetting').value=settings.difficulty;$('difficultyHelp').textContent=help[settings.difficulty];$('soundToggleLabel').textContent=settings.muted?'Unmute sound':'Mute sound';$('soundToggle').setAttribute('aria-pressed',String(settings.muted));$('soundToggle').setAttribute('aria-label',settings.muted?'Unmute sound':'Mute sound');audio.sync();}
function show(name,trigger){
  if(!routes.includes(name)||name===current)return;
  const game=['training','fight'].includes(name);
  const viewName=game?'game':name;
  if(['training','fight'].includes(current)){stopGameCamera();if(!game)selectGameView(null);}
  if(name!=='menu')returnFocus=trigger||document.querySelector(`[data-view="${name}"]`);
  for(const [key,view] of Object.entries(views))view.hidden=key!==viewName;
  $('menuShell').hidden=game;
  current=name;
  if(game)selectGameView(name);
  audio.setMenuVisible(!game);window.scrollTo(0,0);
  if(name==='menu')(returnFocus||document.querySelector('[data-view="training"]')).focus();
  else if(game)$('gameBack').focus();
  else views[name].querySelector('h2').focus();
}
function navigate(name,trigger){
  if(!routes.includes(name))return;
  if(location.hash!=='#'+name)history.pushState(null,'','#'+name);
  show(name,trigger);
}
function restoreRoute(){
  const requested=location.hash.slice(1),name=routes.includes(requested)?requested:'menu';
  if(requested&&requested!==name)history.replaceState(null,'','#'+name);
  show(name);
}
window.addEventListener('popstate',restoreRoute);
window.addEventListener('hashchange',restoreRoute);
for(const button of document.querySelectorAll('[data-view]'))button.addEventListener('click',()=>navigate(button.dataset.view,button));
for(const button of document.querySelectorAll('[data-back]'))button.addEventListener('click',()=>navigate('menu'));
$('gameBack').addEventListener('click',()=>navigate('menu'));
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&current!=='menu'){event.preventDefault();navigate('menu');}});
$('optionsForm').addEventListener('submit',event=>event.preventDefault());
for(const [id,key] of [['musicSetting','music'],['sfxSetting','sfx'],['handSetting','hand'],['pointSetting','point'],['difficultySetting','difficulty']])$(id).addEventListener('change',event=>updateSettings({[key]:event.target.type==='checkbox'?event.target.checked:event.target.value}));
$('soundToggle').addEventListener('click',()=>updateSettings({muted:!getSettings().muted}));
document.addEventListener('pointerdown',()=>audio.unlock(),{once:true});document.addEventListener('keydown',()=>audio.unlock(),{once:true});
for(const button of document.querySelectorAll('#menuShell button,#menuShell select')){button.addEventListener('pointerenter',()=>audio.play('hover'));button.addEventListener('focus',()=>audio.play('hover'));button.addEventListener('click',()=>audio.play('click'));}
window.addEventListener('wizard-settings',renderSettings);document.addEventListener('visibilitychange',()=>audio.sync());renderSettings();

for(const button of document.querySelectorAll('.menu-nav button'))button.addEventListener('pointermove',event=>{if(event.pointerType==='mouse'&&document.activeElement!==button)button.focus({preventScroll:true});});
restoreRoute();

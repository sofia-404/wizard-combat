import {getSettings,updateSettings} from './settings.js';
import {createMenuAudio} from './menu-audio.js';
import {stopTrainingCamera} from './app.js';
import {selectGameView} from './duel.js';
const $=id=>document.getElementById(id);
const audio=createMenuAudio(getSettings);
const views={menu:$('mainMenu'),options:$('optionsView'),credits:$('creditsView'),training:$('trainingView')};
let current='menu',returnFocus=null;
const help={easy:'9 seconds to draw. More forgiving shape tolerance.',normal:'6 seconds to draw. Standard shape tolerance.',hard:'3.5 seconds to draw. Tighter shape tolerance.'};
function renderSettings(){const settings=getSettings();$('musicSetting').checked=settings.music;$('sfxSetting').checked=settings.sfx;$('handSetting').value=settings.hand;$('difficultySetting').value=settings.difficulty;$('difficultyHelp').textContent=help[settings.difficulty];$('soundToggle').textContent=settings.muted?'Unmute sound':'Mute sound';$('soundToggle').setAttribute('aria-pressed',String(settings.muted));$('soundToggle').setAttribute('aria-label',settings.muted?'Unmute sound':'Mute sound');audio.sync();}
function show(name,trigger){
  const game=name==='training'||name==='fight';
  const viewName=game?'training':name;
  if(!views[viewName])return;
  if(current==='training'&&!game){stopTrainingCamera();selectGameView('practice');}
  if(current==='menu'&&name!=='menu')returnFocus=trigger;
  for(const [key,view] of Object.entries(views))view.hidden=key!==viewName;
  $('menuShell').hidden=game;
  current=viewName;
  if(game)selectGameView(name==='fight'?'duel':'practice');
  audio.setMenuVisible(!game);window.scrollTo(0,0);
  if(name==='menu')(returnFocus||document.querySelector('[data-view="training"]')).focus();
  else if(game)$('trainingBack').focus();
  else views[name].querySelector('h2').focus();
}
for(const button of document.querySelectorAll('[data-view]'))button.addEventListener('click',()=>show(button.dataset.view,button));
for(const button of document.querySelectorAll('[data-back]'))button.addEventListener('click',()=>show('menu'));
$('trainingBack').addEventListener('click',()=>show('menu'));
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&current!=='menu'){event.preventDefault();show('menu');}});
$('optionsForm').addEventListener('submit',event=>event.preventDefault());
for(const [id,key] of [['musicSetting','music'],['sfxSetting','sfx'],['handSetting','hand'],['difficultySetting','difficulty']])$(id).addEventListener('change',event=>updateSettings({[key]:event.target.type==='checkbox'?event.target.checked:event.target.value}));
$('soundToggle').addEventListener('click',()=>updateSettings({muted:!getSettings().muted}));
document.addEventListener('pointerdown',()=>audio.unlock(),{once:true});document.addEventListener('keydown',()=>audio.unlock(),{once:true});
for(const button of document.querySelectorAll('#menuShell button,#menuShell select')){button.addEventListener('pointerenter',()=>audio.play('hover'));button.addEventListener('focus',()=>audio.play('hover'));button.addEventListener('click',()=>audio.play('click'));}
window.addEventListener('wizard-settings',renderSettings);document.addEventListener('visibilitychange',()=>audio.sync());renderSettings();

document.querySelector('#mainMenu [data-view="training"]').focus({preventScroll:true});

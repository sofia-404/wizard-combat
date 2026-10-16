import {getSettings,updateSettings} from './settings.js';
import {createMenuAudio} from './menu-audio.js';
import {createMenuVideo} from './menu-video.js';
import {setupMenuBack} from './presentation/menu-back.js';
import {stopGameCamera} from './app.js';
import {selectGameView} from './practice-arena.js';
import {gameModes, stageById} from './stages.js';
import {createStageSelector} from './stage-select.js';
import {characterById} from './characters.js';
import {createCharacterSelector} from './character-select.js';
import './spell-training.js';
const $=id=>document.getElementById(id);
const audio=createMenuAudio(getSettings);
const menuVideo=createMenuVideo(document.querySelector('.menu-art'));
const views={menu:$('mainMenu'),characters:$('characterSelectView'),stages:$('stageSelectView'),options:$('optionsView'),credits:$('creditsView'),game:$('gameView')};
const routes=['menu','characters','stages','spellTraining','practiceArena','soloDuel','options','credits'];
let current=null,currentKey=null,returnFocus=null;
const selector=createStageSelector((mode,stage,moveFocus)=>navigate(mode,null,moveFocus,{
  stage,character:new URLSearchParams(location.search).get('character'),
  opponent:mode==='soloDuel'?new URLSearchParams(location.search).get('opponent'):null,replace:true
}), stage=>updateSetup({stage}));
const characterSelector=createCharacterSelector((mode,selection,moveFocus)=>navigate('stages',null,moveFocus,{
  mode,...selection,stage:new URLSearchParams(location.search).get('stage'),replace:true
}), values=>updateSetup(values));
function routeKey(name,params){return name+':'+params.get('mode')+':'+params.get('stage')+':'+params.get('character')+':'+params.get('opponent')+':'+params.get('pick');}
function updateSetup(values){
  const url=new URL(location.href);
  for(const [key,value] of Object.entries(values))value?url.searchParams.set(key,value):url.searchParams.delete(key);
  history.replaceState(null,'',url);
  currentKey=routeKey(current,url.searchParams);
}
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
  const params=new URLSearchParams(location.search);
  const mode=params.get('mode');
  const stage=stageById(params.get('stage'));
  const character=characterById(params.get('character'));
  const opponent=(mode==='soloDuel'||name==='soloDuel')?characterById(params.get('opponent')):null;
  const key=routeKey(name,params);
  if(!routes.includes(name)||key===currentKey)return;
  const initial=current===null;
  const game=Object.hasOwn(gameModes,name);
  const viewName=game?'game':name;
  if(Object.hasOwn(gameModes,current)){stopGameCamera();if(!game)selectGameView(null);}
  selector.close();
  characterSelector.close();
  if(name!=='menu')returnFocus=trigger||document.querySelector(`[data-view="${['characters','stages'].includes(name)?mode:name}"]`);
  for(const [key,view] of Object.entries(views))view.hidden=key!==viewName;
  $('menuShell').hidden=game;
  current=name;
  currentKey=key;
  menuVideo.setActive(!game&&!['characters','stages'].includes(name));
  if(name==='characters')characterSelector.open(mode,params.get('character'),params.get('opponent'),params.get('pick'));
  if(name==='stages')selector.open(mode,stage,character,opponent);
  if(game){
    selectGameView(name,stage,character,opponent);
    const panel=$(name+'View');
    if(character)panel.dataset.character=character.id;
    else delete panel.dataset.character;
    if(opponent)panel.dataset.opponent=opponent.id;
    else delete panel.dataset.opponent;
  }
  audio.setScene(game?music[name]:'menu',game?name:'menu');window.scrollTo(0,0);
  if(initial)return;
  // Pointer returns start Tab at the menu without selecting a button.
  if(!moveFocus){if(name==='menu')views.menu.focus({preventScroll:true});return;}
  if(name==='menu')(returnFocus||document.querySelector('[data-view="spellTraining"]')).focus();
  else if(game)$('gameBack').focus();
  else views[name].querySelector('h2').focus();
}
function navigate(name,trigger,moveFocus=true,{mode,stage,character,opponent,replace=false}={}){
  if(!routes.includes(name))return;
  const url=new URL(location.href);
  url.hash=name;
  url.searchParams.delete('mode');
  url.searchParams.delete('stage');
  url.searchParams.delete('character');
  url.searchParams.delete('opponent');
  url.searchParams.delete('pick');
  if(mode)url.searchParams.set('mode',mode);
  if(stage)url.searchParams.set('stage',stage);
  if(character)url.searchParams.set('character',character);
  if(opponent)url.searchParams.set('opponent',opponent);
  if(url.href!==location.href)history[replace?'replaceState':'pushState'](null,'',url);
  show(name,trigger,moveFocus);
}
function restoreRoute(){
  const requested=location.hash.slice(1);
  const validMode=Object.hasOwn(gameModes,new URLSearchParams(location.search).get('mode'));
  const name=routes.includes(requested)&&(!['characters','stages'].includes(requested)||validMode)?requested:'menu';
  if(requested&&requested!==name)history.replaceState(null,'','#'+name);
  show(name);
}
window.addEventListener('popstate',restoreRoute);
window.addEventListener('hashchange',restoreRoute);
// Keyboard and assistive activation have no pointer click count.
for(const button of document.querySelectorAll('[data-view]:not(:disabled)'))button.addEventListener('click',event=>{
  if(Object.hasOwn(gameModes,button.dataset.view))navigate('characters',button,event.detail===0,{mode:button.dataset.view});
  else navigate(button.dataset.view,button,event.detail===0);
});
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

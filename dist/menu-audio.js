export function createMenuAudio(getSettings){
  const music=new Audio('/audio/menu-night-vigil.mp3');music.loop=true;music.volume=.25;music.preload='none';
  const effects={hover:new Audio('/audio/menu-hover.wav'),click:new Audio('/audio/menu-click.wav')};
  for(const effect of Object.values(effects)){effect.volume=.35;effect.preload='none';}
  let unlocked=false,lastHover=-Infinity,menuVisible=true;
  const sync=()=>{const state=getSettings();if(state.muted||!state.sfx){for(const effect of Object.values(effects)){effect.pause();effect.currentTime=0;}}if(unlocked&&menuVisible&&!document.hidden&&state.music&&!state.muted){music.play().catch(()=>{});}else music.pause();};
  return {unlock(){unlocked=true;sync();},sync,setMenuVisible(value){menuVisible=value;sync();},play(name){const state=getSettings();if(!unlocked||state.muted||!state.sfx)return;if(name==='hover'){if(performance.now()-lastHover<100)return;lastHover=performance.now();}const effect=effects[name];if(effect){effect.currentTime=0;effect.play().catch(()=>{});}}};
}


export function createMenuAudio(getSettings){
  const tracks={menu:new Audio('/audio/menu-night-vigil.mp3'),duel:new Audio('/audio/duel-clash-defiant.mp3')};
  for(const track of Object.values(tracks)){track.loop=true;track.volume=.25;track.preload='none';}
  const effects={hover:new Audio('/audio/menu-hover.wav'),click:new Audio('/audio/menu-click.wav')};
  for(const effect of Object.values(effects)){effect.volume=.35;effect.preload='none';}
  let unlocked=false,lastHover=-Infinity,scene='menu';
  const sync=()=>{const state=getSettings();if(state.muted||!state.sfx){for(const effect of Object.values(effects)){effect.pause();effect.currentTime=0;}}for(const [name,track] of Object.entries(tracks)){if(unlocked&&scene===name&&!document.hidden&&state.music&&!state.muted)track.play().catch(()=>{});else track.pause();}};
  return {unlock(){unlocked=true;sync();},sync,setScene(value){scene=value;sync();},play(name){const state=getSettings();if(!unlocked||state.muted||!state.sfx)return;if(name==='hover'){if(performance.now()-lastHover<100)return;lastHover=performance.now();}const effect=effects[name];if(effect){effect.currentTime=0;effect.play().catch(()=>{});}}};
}

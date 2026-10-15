import {spellList} from './spells/index.js';

export function createMenuAudio(getSettings){
  const tracks={menu:new Audio('/audio/menu-night-vigil.mp3'),duel:new Audio('/audio/duel-clash-defiant.mp3')};
  for(const track of Object.values(tracks)){track.loop=true;track.volume=.25;track.preload='none';}
  const effects={hover:new Audio('/audio/menu-hover.wav'),click:new Audio('/audio/menu-click.wav')};
  for(const effect of Object.values(effects)){effect.volume=.35;effect.preload='none';}
  // Spell sounds use the cast labels as names. Preload them so the first cast is not late.
  for(const spell of spellList)if(spell.sound){const effect=new Audio(spell.sound);effect.volume=.35;effect.preload='auto';effects[spell.label]=effect;}
  // The Duel damage sound plays at impact. Preload it so the first hit is not late.
  effects.hit=new Audio('/audio/duel-hit.wav');effects.hit.volume=.35;effects.hit.preload='auto';
  // The victory fanfare plays once when the Duel dummy is defeated. Battle music stays off until reset.
  effects.victory=new Audio('/audio/duel-victory.mp3');effects.victory.volume=.35;effects.victory.preload='auto';
  let unlocked=false,lastHover=-Infinity,scene='menu',defeated=false;
  const stopEffects=()=>{for(const effect of Object.values(effects)){effect.pause();effect.currentTime=0;}};
  const sync=()=>{const state=getSettings();if(document.hidden||state.muted||!state.sfx)stopEffects();if(scene!=='duel')effects.victory.pause();for(const [name,track] of Object.entries(tracks)){if(unlocked&&scene===name&&!(name==='duel'&&defeated)&&!document.hidden&&state.music&&!state.muted)track.play().catch(()=>{});else track.pause();}};
  return {unlock(){unlocked=true;sync();},sync,
    stop(){stopEffects();for(const track of Object.values(tracks))track.pause();},
    setScene(value){if(scene!==value)stopEffects();scene=value;sync();},
    setDefeated(value){defeated=value;if(value)tracks.duel.currentTime=0;else effects.victory.pause();sync();if(value)this.play('victory');},
    play(name){const state=getSettings();if(!unlocked||document.hidden||state.muted||!state.sfx)return;if(name==='hover'){if(performance.now()-lastHover<100)return;lastHover=performance.now();}const effect=effects[name];if(effect){effect.currentTime=0;effect.play().catch(()=>{});}}
  };
}

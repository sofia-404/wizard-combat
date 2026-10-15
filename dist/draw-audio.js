// The stroke trail loops while a shape is drawn. Speed controls its level and pitch.
const MAX_GAIN=.14;

// Fingertip speed is in screen widths per second. Slow movement stays quiet.
export function trailLevel(speed){return Number.isFinite(speed)?Math.min(1,Math.max(0,(speed-.05)/.55)):0;}

export function createDrawAudio(getSettings){
  let context=null,gain=null,source=null,loading=null;
  const load=()=>{
    loading??=fetch('/audio/draw-trail.wav').then(response=>response.arrayBuffer()).then(bytes=>context.decodeAudioData(bytes)).then(buffer=>{
      gain=context.createGain();gain.gain.value=0;gain.connect(context.destination);
      source=context.createBufferSource();source.buffer=buffer;source.loop=true;source.connect(gain);source.start();
    }).catch(()=>{loading=null;});
  };
  // Browsers allow audio only after a user action.
  const unlock=()=>{if(!window.AudioContext)return;context??=new AudioContext();context.resume().catch(()=>{});load();};
  document.addEventListener('pointerdown',unlock,{once:true});document.addEventListener('keydown',unlock,{once:true});
  return {update(drawing,speed){
    if(!gain)return;
    const state=getSettings(),level=drawing&&!document.hidden&&state.sfx&&!state.muted?trailLevel(speed):0;
    // Fade in quickly when the stroke moves, and fade out a little slower so the end is smooth.
    gain.gain.setTargetAtTime(MAX_GAIN*level,context.currentTime,level>0?.03:.06);
    source.playbackRate.setTargetAtTime(.92+.16*level,context.currentTime,.08);
  }};
}

// Play the supplied menu animation while keeping the original artwork as a fallback.
export function createMenuVideo(art){
  const video=document.createElement('video');
  video.className='menu-video';
  video.setAttribute('aria-hidden','true');
  video.muted=true;
  video.defaultMuted=true;
  video.loop=true;
  video.autoplay=false;
  video.playsInline=true;
  video.preload='metadata';
  video.playbackRate=1;
  video.hidden=true;
  art.append(video);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let active=false,ready=false;
  const stop=()=>{video.pause();video.hidden=true;art.classList.remove('is-video');};
  const sync=()=>{
    if(!active||document.hidden||reduced.matches||!ready){stop();return;}
    video.hidden=false;art.classList.add('is-video');
    const play=video.play();
    if(play)play.catch(stop);
  };
  video.addEventListener('canplay',()=>{video.playbackRate=1;ready=true;sync();});
  video.addEventListener('error',stop);
  video.src='/brand/assets/menu-animation.mp4';
  reduced.addEventListener('change',sync);
  document.addEventListener('visibilitychange',sync);
  window.addEventListener('pagehide',stop);
  window.addEventListener('pageshow',sync);
  return {setActive(value){active=value;sync();}};
}

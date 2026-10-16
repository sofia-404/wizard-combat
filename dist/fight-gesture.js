// Copy only the existing transparent hand/path overlay, never camera pixels.
// A second detector or a second interpretation of the gesture is not needed.
export function createGestureMirror({source, target, video, panel, phase, instruction, result, status}) {
  const ctx = target.getContext('2d');
  let frame = 0;

  function copyText(from, to) {
    if (to.textContent !== from.textContent) to.textContent = from.textContent;
  }

  function draw() {
    frame = 0;
    if (panel.hidden || document.hidden) { stop(); return; }
    if (target.width !== source.width) target.width = source.width;
    if (target.height !== source.height) target.height = source.height;
    ctx.clearRect(0, 0, target.width, target.height);
    if (video.srcObject) ctx.drawImage(source, 0, 0);
    if (phase && status?.phase) copyText(phase, status.phase);
    if (instruction && status?.instruction) copyText(instruction, status.instruction);
    if (result && status?.result) copyText(result, status.result);
    frame = requestAnimationFrame(draw);
  }

  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    ctx.clearRect(0, 0, target.width, target.height);
  }

  return {
    start() { if (!frame && !panel.hidden && !document.hidden) draw(); },
    stop
  };
}

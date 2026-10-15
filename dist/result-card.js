export const resultTitle=result=>result.type==='cast'?result.shape:result.type==='cancel'?(result.endRule==='loss'?'Tracking lost':'Stopped'):result.type==='ignored'?'Move ignored':'No match';
// Save the result panel only. The camera canvas is never read here.
export function resultCard(result,pathPreview){
  const canvas=document.createElement('canvas');canvas.width=720;canvas.height=440;
  const c=canvas.getContext('2d');c.fillStyle='#fffefa';c.fillRect(0,0,720,440);
  c.fillStyle='#24352e';c.font='bold 19px sans-serif';c.fillText('02 / RESULT',28,36);
  c.font='14px sans-serif';c.fillText(`${result.at} | ${result.hand} | ${result.point}`,28,64);
  c.fillStyle='#f3f1e9';c.fillRect(28,90,260,220);c.drawImage(pathPreview,36,94,244,204);
  c.fillStyle='#24352e';c.font='bold 30px sans-serif';
  c.fillText(resultTitle(result),318,126);
  c.font='18px sans-serif';
  const words=result.reason.split(' ');let line='',y=166;
  for(const word of words){if(c.measureText(line+word).width>365){c.fillText(line,318,y);line='';y+=25;}line+=word+' ';}c.fillText(line,318,y);
  c.font='16px sans-serif';c.fillText(result.type==='cast'?`Shape: ${result.shape} | Score: ${result.score}%`:'No shape accepted',318,246);
  c.fillText(`Size: ${Math.round(Math.max(result.width||0,result.height||0)*100)}% | Points: ${result.samples||0}`,318,274);
  c.fillText(`End to result: ${result.latency} ms`,318,302);
  c.font='14px sans-serif';c.fillText(`Cause: ${result.cause} | End: ${result.endRule||'loss'}`,28,350);
  c.fillText(`Capture: ${result.captureNo} | Gap returns: ${result.gapResumes||0} | Longest gap: ${result.maxGapMs||0} ms`,28,376);
  c.fillStyle='#6b786d';c.font='12px sans-serif';c.fillText(`Event ${result.id}`,28,412);
  return canvas.toDataURL('image/png');
}

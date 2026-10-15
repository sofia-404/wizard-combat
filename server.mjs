import http from 'node:http';
import {readFile, appendFile, mkdir, realpath, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url)), web=path.join(root,'dist');
const mime={'.txt':'text/plain; charset=utf-8','.html':'text/html','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.task':'application/octet-stream','.jpg':'image/jpeg','.svg':'image/svg+xml','.png':'image/png','.ttf':'font/ttf','.woff2':'font/woff2','.webp':'image/webp','.mp3':'audio/mpeg','.wav':'audio/wav'};
const fields=new Set(['difficulty','id','session','at','type','expected','shape','score','margin','latency','duration','reason','hand','point','hz','inference','source','version','swap','cause','trackingCause','state','detected','handCount','labelConfidence','frameAge','frameGap','gapMs','frames','noHandFrames','labelHoldFrames','wrongHandFrames','gaps','samples','width','height','minSize','circleDistance','vDistance','zDistance','circleGate','vGate','zGate','closure','winding','matchLimit','marginLimit']);
for(const field of ['edgeFrames','duplicateFrames','duplicateHands','uniqueHands','candidateSeparation','captureNo','endRule','startSpan','holdSpan','holdMs','gapResumes','maxGapMs','gapDistance','gapAllowed','pathLength','resultImage','lineDeviation','stopCause','circleMatcher','circleCoverage','circleTurns','radialSpread','circleOtherDistance','circleLimit','vArmRatio','strokeMatcher','matchCandidates','vLimit','zLimit','vBend','zBend','vEfficiency','zEfficiency','zOrientation','zTrim','motionForm','circleCornerMargin','circleIndent','circleReverseTurn','pathReverseTurn','shapeStarted','vCornerTurn','circleIndentLimit','gapCause','duplicatePalmDistance','duplicatePointDistance','selectedPalmError','selectedPointError','selectionRule','expelliarmusDistance','expelliarmusGate','expelliarmusLimit','expelliarmusBend','expelliarmusEfficiency','lessonState','lessonCount'])fields.add(field);
let writes=Promise.resolve();
for(const field of ['activeTab','previousTab','castId','castToHitMs','playerHealth','dummyHealth','previousDummyHealth','maxHealth','damage','hits'])fields.add(field);
const server=http.createServer(async(req,res)=>{
  const reply=(code,data)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
  try {
    const url=new URL(req.url,'http://localhost');
    if(url.pathname==='/api/events'||url.pathname==='/api/results'){
      if(req.method!=='POST')return reply(405,{error:'Use POST'});
      const origin=`http://127.0.0.1:${server.address().port}`;
      if(req.headers.origin!==origin||req.headers.host!==`127.0.0.1:${server.address().port}`)return reply(403,{error:'Local origin required'});
      let body='';const limit=url.pathname==='/api/results'?262144:4096;for await(const chunk of req){body+=chunk;if(body.length>limit)return reply(413,{error:'Too large'});}
      const event=JSON.parse(body);
      if(url.pathname==='/api/results'){
        if(!event||typeof event.id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(event.id)||typeof event.png!=='string'||!/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(event.png))return reply(400,{error:'Invalid result card'});
        const png=Buffer.from(event.png.split(',')[1],'base64');
        if(png.length<24||png.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||png.readUInt32BE(16)!==720||png.readUInt32BE(20)!==440)return reply(400,{error:'Invalid PNG'});
        const folder=path.join(root,'play-data/results');await mkdir(folder,{recursive:true});
        try{await writeFile(path.join(folder,event.id+'.png'),png,{flag:'wx',mode:0o600});}catch(error){if(error.code!=='EEXIST')throw error;}
        return reply(201,{saved:true});
      }
      if(!event||Array.isArray(event)||!['cast','reject','cancel','camera','reset','tracking','settings','capture','ignored','duel'].includes(event.type))return reply(400,{error:'Invalid event'});
      for(const [key,value] of Object.entries(event))if(!fields.has(key)||!['string','number'].includes(typeof value)||(typeof value==='string'&&value.length>200)||(typeof value==='number'&&!Number.isFinite(value)))return reply(400,{error:'Invalid field'});
      const save=writes.then(async()=>{await mkdir(path.join(root,'play-data'),{recursive:true});await appendFile(path.join(root,'play-data/events.jsonl'),JSON.stringify(event)+'\n',{mode:0o600});});
      writes=save.catch(()=>{});await save;return reply(201,{saved:true});
    }
    if(!['GET','HEAD'].includes(req.method))return reply(405,{error:'Method not allowed'});
    const file=path.resolve(web,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
    if(!file.startsWith(web+path.sep))return reply(403,{error:'Invalid path'});
    const actual=await realpath(file);if(!actual.startsWith(web+path.sep))return reply(403,{error:'Invalid path'});
    const bytes=await readFile(actual);
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Permissions-Policy':'camera=(self), microphone=()','Content-Security-Policy':"default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; img-src 'self' data:; media-src 'self' blob:; worker-src 'self'; connect-src 'self'; object-src 'none'; frame-ancestors 'none'"});
    res.end(req.method==='HEAD'?undefined:bytes);
  }catch{if(!res.headersSent)reply(404,{error:'Not found'});else res.end();}
});
let port=Number(process.env.PORT||5185);
if(!Number.isInteger(port)||port<1024||port>65000)throw Error('Invalid port');
const first=port;
server.on('error',e=>{if(e.code==='EADDRINUSE'&&port<first+20){server.listen(++port,'127.0.0.1');}else{console.error(e);process.exitCode=1;}});
server.listen(port,'127.0.0.1',()=>console.log(`Wizard Combat: http://127.0.0.1:${server.address().port}/`));

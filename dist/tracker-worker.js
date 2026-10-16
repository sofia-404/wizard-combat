importScripts('/vendor/vision_bundle.js');
let tracker;
self.onmessage=async({data})=>{
  if(data.type==='init'){
    try{
      const vision=await Vision.FilesetResolver.forVisionTasks('/vendor/wasm');
      tracker=await Vision.HandLandmarker.createFromOptions(vision,{
        baseOptions:{modelAssetPath:'/models/hand_landmarker.task',delegate:data.delegate||'GPU'},
        runningMode:'VIDEO',numHands:data.numHands||2,minHandDetectionConfidence:.6,minHandPresenceConfidence:.6,minTrackingConfidence:.6
      });
      self.postMessage({type:'ready',delegate:data.delegate||'GPU'});
    }catch(e){self.postMessage({type:'error',message:String(e.message||e)});}
  }
  if(data.type==='frame'){
    const start=performance.now();
    try{if(!tracker)throw Error('Model not ready');const r=tracker.detectForVideo(data.bitmap,data.t);self.postMessage({type:'result',t:data.t,landmarks:r.landmarks,handedness:r.handedness,inference:performance.now()-start});}
    catch(e){self.postMessage({type:'error',message:String(e.message||e)});}
    finally{data.bitmap.close();}
  }
};

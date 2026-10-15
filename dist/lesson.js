// Lesson progress uses recognized casts. It does not change gesture recognition.
export class ExpelliarmusLesson{
  constructor(){this.stop();}
  start(){this.state='active';this.count=0;this.message='Hold still. Draw right, then down. Pause at the end.';}
  stop(){this.state='idle';this.count=0;this.message='Start the lesson. Make three correct Expelliarmus casts.';}
  update(event){
    if(this.state!=='active')return;
    if(event.type==='cast'&&event.accepted&&event.shape==='Expelliarmus'){
      this.count++;
      if(this.count===3){this.state='complete';this.message='Lesson complete. Three correct Expelliarmus casts.';}
      else this.message=`Correct. ${this.count} of 3 casts. Hold still, then try again.`;
    }else if(event.type==='cast')this.message=`That was ${event.shape}. Draw Expelliarmus: right, then down.`;
    else if(event.type==='cancel')this.message='No cast. '+event.reason;
    else if(event.type==='reject'||event.type==='ignored')this.message='No cast. Follow the path. Pause only at the end.';
  }
}

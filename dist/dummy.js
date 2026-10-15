export class TrainingDummy{
  constructor(){this.reset();}
  reset(){this.returnAt=0;}
  get disarmed(){return this.returnAt>0;}
  cast(event,now){
    if(event.type!=='cast'||!event.accepted||event.shape!=='Expelliarmus')return false;
    this.returnAt=now+2000;
    return true;
  }
  restore(now){
    if(!this.disarmed||now<this.returnAt)return false;
    this.reset();
    return true;
  }
}

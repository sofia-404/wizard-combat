import {applyCast} from './cast.js';

export class PracticeDummy{
  constructor(){this.reset();}
  reset(){this.returnAt=0;this.disarmProtectedUntil=0;}
  get disarmed(){return this.returnAt>0;}
  cast(event,now){
    return applyCast(event,this,now);
  }
  restore(now){
    if(!this.disarmed||now<this.returnAt)return false;
    this.returnAt=0;
    return true;
  }
}

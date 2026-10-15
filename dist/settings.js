export const SETTINGS_KEY='wizard-combat-settings';
export const DEFAULT_SETTINGS=Object.freeze({music:true,sfx:true,muted:false,hand:'Left',difficulty:'normal'});
export function normalizeSettings(value){
  const input=value&&typeof value==='object'?value:{};
  return {music:typeof input.music==='boolean'?input.music:true,sfx:typeof input.sfx==='boolean'?input.sfx:true,muted:typeof input.muted==='boolean'?input.muted:false,hand:['Left','Right'].includes(input.hand)?input.hand:'Left',difficulty:['easy','normal','hard'].includes(input.difficulty)?input.difficulty:'normal'};
}
export function loadSettings(storage){try{return normalizeSettings(JSON.parse(storage.getItem(SETTINGS_KEY)));}catch{return {...DEFAULT_SETTINGS};}}
export function saveSettings(storage,value){try{storage.setItem(SETTINGS_KEY,JSON.stringify(normalizeSettings(value)));return true;}catch{return false;}}
let storage;try{storage=globalThis.localStorage;}catch{}
let settings=loadSettings(storage);
export const getSettings=()=>({...settings});
export function updateSettings(change){settings=normalizeSettings({...settings,...change});saveSettings(storage,settings);globalThis.dispatchEvent?.(new CustomEvent('wizard-settings',{detail:getSettings()}));return getSettings();}

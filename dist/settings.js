export const SETTINGS_KEY='wizard-combat-settings';
export const DEFAULT_SETTINGS=Object.freeze({music:true,musicVolume:25,sfx:true,sfxVolume:35,muted:false,hand:'Left',point:'tip',difficulty:'normal'});
export function normalizeSettings(value){
  const input=value&&typeof value==='object'?value:{};
  const volume=(key,legacy,defaultValue)=>Number.isFinite(input[key])?Math.max(0,Math.min(100,Math.round(input[key]))):input[legacy]===false?0:defaultValue;
  const musicVolume=volume('musicVolume','music',25),sfxVolume=volume('sfxVolume','sfx',35);
  return {music:musicVolume>0,musicVolume,sfx:sfxVolume>0,sfxVolume,muted:typeof input.muted==='boolean'?input.muted:false,hand:['Left','Right'].includes(input.hand)?input.hand:'Left',point:['tip','grip'].includes(input.point)?input.point:'tip',difficulty:['easy','normal','hard'].includes(input.difficulty)?input.difficulty:'normal'};
}
export function loadSettings(storage){
  try{
    const settings=normalizeSettings(JSON.parse(storage.getItem(SETTINGS_KEY)));
    // Replace the old master mute with two zeroed volume sliders.
    if(settings.muted)return normalizeSettings({...settings,musicVolume:0,sfxVolume:0,muted:false});
    return settings;
  }catch{return {...DEFAULT_SETTINGS};}
}
export function saveSettings(storage,value){try{storage.setItem(SETTINGS_KEY,JSON.stringify(normalizeSettings(value)));return true;}catch{return false;}}
let storage;try{storage=globalThis.localStorage;}catch{}
let settings=loadSettings(storage);
export const getSettings=()=>({...settings});
export function updateSettings(change){const patch={...change};if('music' in patch&&!('musicVolume' in patch))patch.musicVolume=patch.music?(settings.musicVolume||25):0;if('sfx' in patch&&!('sfxVolume' in patch))patch.sfxVolume=patch.sfx?(settings.sfxVolume||35):0;settings=normalizeSettings({...settings,...patch});saveSettings(storage,settings);globalThis.dispatchEvent?.(new CustomEvent('wizard-settings',{detail:getSettings()}));return getSettings();}

import {makeMixer, playCue, scoreStep, tempos, matchScenes} from './synth.js';

let mixer, track, scheduler, step=0, next=0, intensity=0;
let scene='home', musicWanted=false, fxEnabled=true;
const volumes={master:.76, music:.49, fx:.74};
try {
  const saved=JSON.parse(localStorage.getItem('hs-volumes')||'{}');
  for (const key of Object.keys(volumes)) if (Number.isFinite(saved?.[key])) {
    volumes[key]=Math.max(0,Math.min(1,saved[key]));
  }
} catch {}

function fade(param, target, time, speed) {
  if (typeof param.cancelAndHoldAtTime==='function') param.cancelAndHoldAtTime(time);
  else { const value=param.value; param.cancelScheduledValues(time); param.setValueAtTime(value,time); }
  param.setTargetAtTime(target,time,speed);
}
function schedule() {
  if (!track||document.hidden||mixer.ctx.state!=='running') return;
  const now=mixer.ctx.currentTime;
  if (next<now-.06) next=now+.025;
  while (next<now+.16) {
    scoreStep(mixer,track,scene,step,next,intensity);
    next+=60/tempos[scene]/4;
    step++;
  }
}
function stopTrack() {
  clearInterval(scheduler); scheduler=null;
  if (!track) return;
  const old=track; track=null;
  fade(old.gain,0,mixer.ctx.currentTime,.065);
  setTimeout(()=>old.disconnect(),420);
}
function startTrack() {
  if (track||!musicWanted||!mixer||document.hidden||mixer.ctx.state!=='running') return;
  const ctx=mixer.ctx;
  track=ctx.createGain(); track.gain.value=.001;
  track.connect(mixer.duck);
  fade(track.gain,1,ctx.currentTime,.14);
  step=0; next=ctx.currentTime+.028;
  schedule(); scheduler=setInterval(schedule,60);
}
// Context creation and resumption are driven by a real pointer or keyboard activation.
export function unlockAudio() {
  try {
    if (!mixer) {
      const AC=window.AudioContext||window.webkitAudioContext;
      if (!AC) return false;
      const ctx=new AC();
      mixer=makeMixer(ctx);
      mixer.master.gain.value=volumes.master;
      mixer.music.volume.gain.value=musicWanted?volumes.music:0;
      mixer.fx.volume.gain.value=fxEnabled?volumes.fx:0;
      ctx.addEventListener('statechange',()=>{if (ctx.state==='running') startTrack();});
    }
    if (document.hidden) return false;
    if (mixer.ctx.state==='suspended'||mixer.ctx.state==='interrupted') mixer.ctx.resume().then(startTrack).catch(()=>{});
    else startTrack();
    return true;
  } catch { return false; }
}
export function sound(name='click', options={}) {
  if (!fxEnabled||!mixer||document.hidden||mixer.ctx.state==='closed') return;
  const now=mixer.ctx.currentTime;
  if (['win','collect','up','down','steal','break','timeout','line','opening'].includes(name)&&musicWanted) {
    const g=mixer.duck.gain;
    fade(g,name==='win'?.45:.70,now,.018);
    g.setTargetAtTime(1,now+(name==='win'||name==='steal'?.74:name==='break'?.54:.26),.14);
  }
  playCue(mixer,name,options,now+.009+Math.min(1,Math.max(0,options.delay||0)));
}
export function setScene(value, nearFinish=false) {
  if (!(value in tempos)) return;
  intensity=nearFinish?1:0;
  if (scene===value) return;
  stopTrack(); scene=value; startTrack();
}
export function setMatchScore(mode, nearFinish=false) {
  setScene(matchScenes[mode]||'game',nearFinish);
}
export function setMusic(value) {
  if (musicWanted===!!value) return;
  musicWanted=!!value;
  if (mixer) fade(mixer.music.volume.gain,musicWanted?volumes.music:0,mixer.ctx.currentTime,.042);
  if (musicWanted) startTrack(); else stopTrack();
}
export function setFX(value) {
  fxEnabled=!!value;
  if (mixer) fade(mixer.fx.volume.gain,fxEnabled?volumes.fx:0,mixer.ctx.currentTime,.025);
}
export function getVolumes() { return {...volumes}; }
export function setVolume(key,value) {
  if (!Object.hasOwn(volumes,key)) return;
  volumes[key]=Math.max(0,Math.min(1,Number(value)||0));
  try { localStorage.setItem('hs-volumes',JSON.stringify(volumes)); } catch {}
  if (!mixer) return;
  const gain=key==='master'?mixer.master.gain:mixer[key].volume.gain;
  const muted=(key==='fx'&&!fxEnabled)||(key==='music'&&!musicWanted);
  fade(gain,muted?0:volumes[key],mixer.ctx.currentTime,.033);
}
export function speak(str,lang) {
  if (!('speechSynthesis' in window)) return;
  const u=new SpeechSynthesisUtterance(str);
  u.lang={ko:'ko-KR',en:'en-US',ja:'ja-JP',zh:'zh-CN'}[lang]||'ko-KR'; u.rate=.96;
  window.speechSynthesis.cancel(); window.speechSynthesis.speak(u);
}
document.addEventListener('visibilitychange',()=>{
  if (!mixer) return;
  if (document.hidden) { stopTrack(); mixer.ctx.suspend().catch(()=>{}); }
  else mixer.ctx.resume().then(startTrack).catch(()=>{});
});

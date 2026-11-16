import {paintRibbons, contact, clearTouches} from './atmosphere.js';

const media=matchMedia('(prefers-reduced-motion: reduce)');
let reduced=localStorage.getItem('hs-reduced')===null?media.matches:localStorage.getItem('hs-reduced')==='1';
const chosen=Object.fromEntries(['ambient','gameFx','touchFx'].map(key=>[key,localStorage.getItem('hs-'+key)!=='0']));
let stars=[], sky, light, field, fieldCanvas, fieldWidth=0, fieldHeight=0, fieldScene='', fieldObserver;
let skyFrame=0, fxFrame=0, lastSky=-100;
let castFrom=null, castSprites=new Set();
let width=0, height=0, effects=[], pulseTimers=new Map();
const tau=Math.PI*2;
export function isReduced() { return reduced; }
export function chosenEffect(key) { return chosen[key]; }
const allowed=key=>!reduced&&chosen[key];
export function clearEffects() {
  cancelAnimationFrame(fxFrame); fxFrame=0; effects=[]; castFrom=null;
  for (const sprite of castSprites) sprite.remove();
  castSprites.clear();
  for (const [el,timer] of pulseTimers) { clearTimeout(timer); el.classList.remove('instrument-pulse'); }
  pulseTimers.clear();
  light?.clearRect(0,0,width,height);
}
function refreshPreferences() {
  const flags=document.documentElement.dataset;
  flags.motion=reduced?'reduced':'full';
  for (const key of Object.keys(chosen)) flags[key]=allowed(key)?'on':'off';
  if (!allowed('gameFx')) clearEffects();
  if (!allowed('touchFx')) clearTouches();
  restartSky();
}
export function setReduced(value) {reduced=!!value;refreshPreferences();}
export function toggleEffect(key) {
  if (!Object.hasOwn(chosen,key)) return;
  chosen[key]=!chosen[key];localStorage.setItem('hs-'+key,chosen[key]?'1':'0');refreshPreferences();
}
export function touchLight(x,y,target) {
  if (allowed('touchFx')&&!document.hidden) contact(x,y,target);
}
function resizeSurface(ctx,w,h,scale) {
  ctx.canvas.width=Math.max(1,Math.ceil(w*scale));ctx.canvas.height=Math.max(1,Math.ceil(h*scale));
  ctx.setTransform(scale,0,0,scale,0,0);
}
function sizeField() {
  if (!fieldCanvas?.isConnected) return;
  const w=fieldCanvas.clientWidth,h=fieldCanvas.clientHeight;
  if (w===fieldWidth&&h===fieldHeight) return;
  fieldWidth=w;fieldHeight=h;resizeSurface(field,w,h,Math.min(devicePixelRatio||1,1.25));
  restartSky();
}
export function mountField(host,scene) {
  fieldObserver?.disconnect();
  if (!field || !host) {fieldCanvas?.remove();fieldScene='';return;}
  fieldScene=scene;host.prepend(fieldCanvas);
  fieldObserver?.observe(host);sizeField();
}
function resize() {
  width=document.documentElement.clientWidth;height=window.innerHeight;
  const scale=Math.min(window.devicePixelRatio||1,width<650?1.4:1.65);
  if (sky) resizeSurface(sky,width,height,Math.min(scale,1.25));
  if (light) resizeSurface(light,width,height,scale);
  stars=Array.from({length:Math.min(104,Math.ceil(width*height/10800))},()=>({
    x:Math.random()*width,y:Math.random()*height,r:Math.random()*1+.32,
    a:.26+Math.random()*.47,phase:Math.random()*tau
  }));
  clearEffects();sizeField();restartSky();
}
function restartSky() {
  cancelAnimationFrame(skyFrame);skyFrame=0;lastSky=-100;
  if (!document.hidden&&sky) paintSky(performance.now());
}
function paintSky(now) {
  skyFrame=0;
  const animate=allowed('ambient');
  if (now-lastSky>=42) {
    const time=animate?now/1000:0;
    sky.clearRect(0,0,width,height);
    if (animate) paintRibbons(sky,width,height,time,'sky');
    for (const s of stars) {
      sky.globalAlpha=s.a*(animate?.76+.24*Math.sin(time*.62+s.phase):.79);
      sky.fillStyle='#d9e2f5';sky.beginPath();sky.arc(s.x,s.y,s.r,0,tau);sky.fill();
    }
    sky.globalAlpha=1;lastSky=now;
    if (field && fieldScene && fieldCanvas.isConnected) {
      field.clearRect(0,0,fieldWidth,fieldHeight);
      if (animate) paintRibbons(field,fieldWidth,fieldHeight,time+.87,fieldScene);
    }
  }
  if (animate&&!document.hidden) skyFrame=requestAnimationFrame(paintSky);
}
export function startStars() {
  sky=document.querySelector('#cosmos')?.getContext('2d');
  light=document.querySelector('#light-effects')?.getContext('2d');
  fieldCanvas=document.createElement('canvas');fieldCanvas.className='field-light';
  fieldCanvas.setAttribute('aria-hidden','true');field=fieldCanvas.getContext('2d');
  if ('ResizeObserver'in window) fieldObserver=new ResizeObserver(sizeField);
  resize();refreshPreferences();
  window.addEventListener('resize',resize,{passive:true});
  if ('ResizeObserver' in window) new ResizeObserver(()=>{
    if (width!==document.documentElement.clientWidth) resize();
  }).observe(document.documentElement);
  document.addEventListener('visibilitychange',()=>{
    clearEffects();clearTouches();restartSky();
  });
  media.addEventListener?.('change',e=>{
    if (localStorage.getItem('hs-reduced')===null) setReduced(e.matches);
  });
}
function point(el,x=.5,y=.5) {
  if (!el) return null;
  const r=el.getBoundingClientRect();
  if (!r.width||!r.height) return null;
  return {x:r.left+r.width*x+scrollX,y:r.top+r.height*y+scrollY};
}
function visible(el) {
  if (!el) return false;
  const r=el.getBoundingClientRect();
  return r.width&&r.height&&r.left<width&&r.right>0&&r.top<height&&r.bottom>0;
}
function prefer(...els) { return els.find(visible)||els.find(Boolean); }
function push(spec,delay=0) {
  if (!light||!allowed('gameFx')||document.hidden) return;
  const limit=width<650?85:145;
  if (effects.length>=limit) effects.shift();
  effects.push({...spec,start:performance.now()+delay});
  if (!fxFrame) fxFrame=requestAnimationFrame(paintLights);
}
function ring(p,color,size,delay=0,inward=false) {
  if (p) push({type:'ring',p,color,size,inward,length:460},delay);
}
function sparks(p,color,count=12,delay=0) {
  if (!p) return;
  if (width<650) count=Math.ceil(count*.70);
  for (let i=0;i<count;i++) {
    const a=(i+Math.random()*.55)*tau/count, radius=17+Math.random()*52;
    push({type:'spark',p,color,dx:Math.cos(a)*radius,dy:Math.sin(a)*radius,
      size:.65+Math.random()*1.5,length:320+Math.random()*440},delay);
  }
}
function route(start,end,color,length=500,delay=0,bend=.16) {
  if (!start||!end) return;
  const distance=Math.hypot(end.x-start.x,end.y-start.y);
  if (distance<4) { ring(end,color,24,delay); return; }
  const arc=Math.min(110,Math.max(13,distance*Math.abs(bend)))*Math.sign(bend);
  push({type:'route',p:start,end,color,length,arc,dx:(end.x-start.x)/distance,dy:(end.y-start.y)/distance},delay);
}
function pathPoint(e,t) {
  const lift=4*t*(1-t)*e.arc + Math.sin(t*tau*2.5)*Math.sin(Math.PI*t)*4;
  return {x:e.p.x+(e.end.x-e.p.x)*t-e.dy*lift,y:e.p.y+(e.end.y-e.p.y)*t+e.dx*lift};
}
function strokePath(e,t) {
  const head=1-(1-t)**1.35, tail=Math.max(0,head-.31);
  const path=new Path2D();
  for (let i=0;i<=12;i++) {
    const p=pathPoint(e,tail+(head-tail)*i/12);
    if (i) path.lineTo(p.x,p.y); else path.moveTo(p.x,p.y);
  }
  light.strokeStyle=e.color; light.globalAlpha=.25; light.lineWidth=7; light.stroke(path);
  light.globalAlpha=.93; light.lineWidth=2; light.stroke(path);
  const tip=pathPoint(e,head);
  light.fillStyle='#fff6dd'; light.beginPath(); light.arc(tip.x,tip.y,2.9,0,tau); light.fill();
}
function paintLights(now) {
  fxFrame=0; light.clearRect(0,0,width,height); light.save(); light.translate(-scrollX,-scrollY);
  light.globalCompositeOperation='lighter'; light.lineCap='round';
  effects=effects.filter(e=>now<e.start+e.length);
  for (const e of effects) {
    const t=(now-e.start)/e.length;
    if (t<0) continue;
    if (e.type==='route') { strokePath(e,t); continue; }
    light.strokeStyle=e.color;
    if (e.type==='ring') {
      const radius=Math.max(.2,(e.inward?(1-t)**1.2:1-(1-t)**2)*e.size);
      light.globalAlpha=e.inward?.65*Math.sin(Math.PI*t):.82*(1-t);
      light.lineWidth=1.2; light.beginPath(); light.ellipse(e.p.x,e.p.y,radius,radius*.74,-.2,0,tau); light.stroke();
    } else {
      const d=1-(1-t)**2, x=e.p.x+d*e.dx, y=e.p.y+d*e.dy+t*t*18;
      light.globalAlpha=(1-t)**1.15; light.lineWidth=e.size;
      light.beginPath(); light.moveTo(x-e.dx*.12*(1-t),y-e.dy*.12*(1-t)); light.lineTo(x,y); light.stroke();
    }
  }
  light.restore();
  if (effects.length&&allowed('gameFx')&&!document.hidden) fxFrame=requestAnimationFrame(paintLights);
}
function pulse(el,color) {
  if (!el||!allowed('gameFx')) return;
  el.style.setProperty('--signal',color);
  el.classList.remove('instrument-pulse');
  void el.offsetWidth; el.classList.add('instrument-pulse');
  clearTimeout(pulseTimers.get(el));
  pulseTimers.set(el,setTimeout(()=>{el.classList.remove('instrument-pulse');pulseTimers.delete(el);},650));
}
function actorElement(id) {
  return typeof id==='string'?document.querySelector('[data-player="'+CSS.escape(id)+'"]'):null;
}
function mini(actor,energy) { return actor?.querySelector('[data-mini-line="'+Number(energy)+'"]'); }
function railPoint(energy) {
  const rail=document.querySelector('[data-energy="'+Number(energy)+'"] .rail');
  const p=point(rail),electron=document.querySelector('.electron');
  if (p&&electron) p.x=point(electron)?.x??p.x;
  return p;
}
export function captureCard(element,art) {
  const from=point(element?.querySelector('.card-visual'));
  castFrom=from&&{from,art,at:performance.now()};
}
function castCard(e,own,actor,body,color) {
  const destination=body?.querySelector('.last-card'),to=point(destination?.querySelector('img')||destination);
  if (!to||!visible(destination)||!Number.isInteger(e.art)||e.art<0||e.art>21) return;
  const saved=own&&castFrom?.art===e.art&&performance.now()-castFrom.at<1800?castFrom.from:null;
  const from=saved||point(prefer(actor,body),.57,.42); if (own) castFrom=null;
  if (!from||!Element.prototype.animate) return;
  for (const old of castSprites) old.remove();
  castSprites.clear();
  const card=document.createElement('img');
  card.className='cast-card';card.src='/cards/card'+e.art+'.png';card.alt='';card.setAttribute('aria-hidden','true');
  card.style.left=from.x+'px';card.style.top=from.y+'px';card.style.setProperty('--signal',color);
  document.body.append(card);castSprites.add(card);
  const dx=to.x-from.x,dy=to.y-from.y;
  const frames=[
    {transform:'translate(-50%,-50%) rotate(-8deg) scale(.86)',opacity:.8},
    {transform:`translate(calc(-50% + ${dx*.44}px),calc(-50% + ${dy*.47-22}px)) rotate(7deg) scale(.64)`,opacity:.74,offset:.48},
    {transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) rotate(0) scale(.26)`,opacity:0}
  ];
  const animation=card.animate(frames,{duration:410,easing:'cubic-bezier(.26,.62,.28,1)'});
  animation.oncancel=animation.onfinish=()=>{card.remove();castSprites.delete(card);};
}
// Match each trail to the same public log entry that drives the sound and readout.
export function playLight(e,line,own,actorId,victimId,me) {
  if (!allowed('gameFx')||document.hidden) return;
  const body=document.querySelector('.game-center'), panel=document.querySelector('.signal-panel');
  const actor=actorElement(actorId), victim=actorElement(victimId);
  const ownSlot=line&&document.querySelector('[data-line="'+line.e+'"]');
  const target=prefer(own?ownSlot:null,mini(actor,line?.e),panel,body);
  const color=line?.c||(e.to>e.from?'#8ce6ff':'#ffd29b');
  castCard(e,own,actor,body,color);
  const fromBoard=own&&visible(document.querySelector('.energy'));
  const source=fromBoard?railPoint(e.from):point(prefer(actor,body,panel));
  const bench=point(prefer(body,panel),.52,.48);
  if (e.kind==='steal'||e.kind==='break') {
    const removed=prefer(victimId===me?ownSlot:null,mini(victim,line?.e),victim,panel);
    const p=point(removed);
    if (e.kind==='steal') {
      route(p,point(target),color,470,0,-.22); ring(point(target),color,44,430); sparks(point(target),color,18,415);
    } else { ring(p,color,34,0,true); sparks(p,color,23,85); }
    pulse(removed,color);
  } else if (typeof e.to==='number') {
    const end=fromBoard?railPoint(e.to):point(prefer(actor,panel,body));
    if (e.to>e.from) {
      const near=source&&{x:source.x+58,y:source.y-20};
      route(near,source,color,185); ring(source,color,28,0,true);
      route(source,end,color,350,110,-.22); sparks(end,color,12,430);
    } else {
      route(source,end,color,300,0,-.17);
      const outward=end&&{x:end.x+74,y:end.y-24};
      const dest=line&&e.gain?point(target):outward;
      route(end,dest,color,385,210,.19); ring(end,color,28,205);
      if (line&&e.gain) { sparks(dest,color,22,545); ring(dest,color,47,550); }
    }
  } else if (e.kind==='wild'&&e.gain) {
    route(bench,point(target),color,440); sparks(point(target),color,19,390); ring(point(target),color,45,400);
  }
  pulse(panel,color);
}
export function auditionLight(key,display,color) {
  if (!allowed('gameFx')) return;
  const source=point(key,.5,.32),dest=point(display,.73,.6);
  ring(source,color,29); route(source,dest,color,380,0,.16); sparks(dest,color,12,325); pulse(display,color);
}
export function celebrate(lines) {
  if (!allowed('gameFx')||document.hidden) return;
  const banner=document.querySelector('.win');
  if (!banner) return;
  const c=point(banner,.5,.48);
  lines.forEach((line,i)=>{
    const to=point(banner,(i+.6)/(lines.length+.1),.25+(i%2)*.37);
    route(c,to,line.c,540,i*58,(i%2?1:-1)*.24); ring(to,line.c,35,450+i*58);
    sparks(to,line.c,15,465+i*58);
  });
  pulse(banner,'#edce85');
}

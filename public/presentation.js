import {LINES} from './engine.js';

// The oscilloscope motif and musical pitches are illustrative, independent of the game's EU scale.
function trace(cycles, idle=false) {
  const points=[];
  for (let x=0;x<=208;x+=2) {
    const f=x/208, envelope=Math.sin(Math.PI*f)**2;
    const y=20+Math.sin(f*cycles*2*Math.PI)*envelope*(idle?2:15);
    points.push((x?'L':'M')+x+' '+y.toFixed(1));
  }
  return `<svg viewBox="0 0 208 40" class="signal-wave" aria-hidden="true" preserveAspectRatio="none"><path d="${points.join(' ')}"/></svg>`;
}
function cycles(line) {return line?2.5+(5-LINES.indexOf(line))*.69:3.5;}
export function lineInstrument(t,line) {
  return `<section class="line-instrument" aria-label="${t('auditionTitle')}">
    <div class="instrument-info"><h3>${t('auditionTitle')}</h3><span>${t('auditionHint')}</span></div>
    <div class="line-keys">${LINES.map(l=>`<button type="button" class="line-key" data-audition="${l.e}" style="--c:${l.c}" aria-pressed="${l.e===line.e}" aria-label="${t('auditionTitle')} · ${l.s}, ${l.w} nm"><i aria-hidden="true"></i><span>${l.s}</span><small>${l.w} nm</small></button>`).join('')}</div>
    <div class="bench-display" data-bench-display aria-live="off">${benchReading(line,t)}</div>
  </section>`;
}
export function benchReading(line,t) {
  return `<div class="bench-trace" style="--signal:${line.c}">${trace(cycles(line))}<span><b>${line.s}</b> ${line.w} nm${line.s==='UV'||line.s==='IR'?' · '+t('invisible'):''}</span></div>`;
}
export function playStyle(e) {
  const line=LINES.find(l=>l.e===e.e);
  const transition=Number.isFinite(e.to);
  const kind=transition?(e.to>e.from?'up':'down'):e.kind;
  const color=line?.c||(kind==='up'?'#86e4ff':'#ffcc96');
  return {line,kind,color};
}
export function signalReading(e,t,escapedName) {
  const {line,kind,color}=e?playStyle(e):{color:'#b0a381'};
  let title=t('awaitSignal'),detail=t('detector');
  if (e) {
    const action=t(kind==='up'?'absorb':kind==='down'?'emit':kind);
    title=Number.isFinite(e.to)?action+' · '+e.from+' → '+e.to:action+(line?' · '+line.s:'');
    const collection=e.gain===true?' · '+t('collected'):e.gain===false?' · '+t('noStock'):'';
    detail=escapedName+(line?' · '+line.s+' '+line.w+' nm':'')+collection;
  }
  return `<section class="signal-panel" style="--signal:${color}" aria-label="${t('detector')}"><div class="signal-caption"><b>${title}</b><small>${detail}</small></div><div class="signal-plot" aria-hidden="true">${trace(cycles(line),!e)}</div></section>`;
}
export function cardSurface(c,i,valid,redeal) {
  const tint=c.kind==='energy'?(c.v>0?'#86e4ff':'#ffc392'):({up:'#86e4ff',down:'#ffc392',steal:'#c8a1ff',break:'#ff859a',wild:'#f4d99e'}[c.kind]||'#e8c783');
  const glints = redeal ? '<i class="deal-glints" aria-hidden="true"><i></i><i></i><i></i></i>' : '';
  return `<span class="card-number" aria-hidden="true">0${i+1}</span><span class="card-visual ${redeal?'fresh-card':''}" style="--foil:${tint};--deal-side:${i?1:-1};--deal-delay:${i*75}ms"><span class="card-flip ${redeal?'just-dealt':''}"><span class="card-front"><img src="/cards/card${c.art}.png" alt="" draggable="false">${valid?'<i class="card-varnish"></i>':''}${redeal?'<i class="deal-foil" aria-hidden="true"></i>':''}</span><span class="card-back" aria-hidden="true"></span></span>${glints}</span>`;

}
export function lastCard(e,t,escapedName) {
  const {kind,color}=playStyle(e);
  const label=t(kind==='up'?'absorb':kind==='down'?'emit':kind);
  const art=Number.isInteger(e.art)&&e.art>=0&&e.art<=21?`<img src="/cards/card${e.art}.png" alt="">`:'';
  return `<div class="last-card" style="--signal:${color}" title="${t('lastCard')} · ${escapedName}">${art}<span><small>${t('lastCard')}</small><b>${label}</b></span></div>`;
}
export function finalSpectrum(p,t) {
  const first=LINES[0].w,last=LINES.at(-1).w;
  const collected=LINES.filter(l=>p.tokens.includes(l.e));
  return `<figure class="final-spectrum"><figcaption>${t('recordedLines')}</figcaption>
    <div class="film-frame"><div class="spectrum-film" aria-hidden="true">${LINES.map((l,i)=>`<i style="--c:${l.c};--n:${i};--x:${(l.w-first)/(last-first)*100}%" class="${p.tokens.includes(l.e)?'exposed':''}"></i>`).join('')}</div>
    <div class="film-scale" aria-hidden="true"><span>${first} nm</span><span>λ</span><span>${last} nm</span></div></div>
    <div class="recorded-lines">${collected.map(l=>`<button class="quiet" style="--c:${l.c}" data-line="${l.e}" aria-label="${l.s}, ${l.w} nm"><i aria-hidden="true"></i><b>${l.s}</b> ${l.w} nm</button>`).join('')||`<span>${t('noLinesYet')}</span>`}</div>
    <p class="subtle">${t('symbolic')}</p></figure>`;
}
export function resultPlate(game) {
  const hits=new Set(game.players.filter(p=>game.winner.includes(p.id)).flatMap(p=>p.tokens));
  return `<div class="result-optic" aria-hidden="true"><div>${LINES.map((l,i)=>`<i style="--c:${l.c};--n:${i}" class="${hits.has(l.e)?'lit':''}"></i>`).join('')}</div></div>`;
}

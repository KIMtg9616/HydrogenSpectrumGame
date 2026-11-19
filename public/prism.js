// Geometric-optics section registered to the front triangular face of the photograph.
// Coordinates use a downwards y axis. Each interface normal points into the next medium.
export const PRISM_SETUP = {
  width:1774, height:887,
  source:[1034,361], apex:[1251,225], left:[1145,472], right:[1386,455],
  entryFraction:.15
};

// A representative, visible Balmer quartet. The sRGB display colours approximate hue;
// their brightness is chosen for legibility rather than a radiometric measurement.
const visibleLines = [
  {w:656, name:'Hα', color:'#ff534d'},
  {w:486, name:'Hβ', color:'#53e2e0'},
  {w:434, name:'Hγ', color:'#817dff'},
  {w:410, name:'Hδ', color:'#b66aff'}
];

// SCHOTT N-SF11, 2014-02-01, Constants of Dispersion Formula (wavelength in µm):
// https://media.schott.com/api/public/content/78e83df5ca2c4da4ad4490a52c80a146?v=1a468147
const sellmeier = [
  [1.737596950, .013188707],
  [.313747346, .0623068142],
  [1.898781010, 155.23629000]
];
export function glassIndex(wavelengthNm) {
  const lambdaSquared = (wavelengthNm / 1000) ** 2;
  return Math.sqrt(1 + sellmeier.reduce((sum,[b,c]) => sum + b*lambdaSquared/(lambdaSquared-c), 0));
}

// The front of each narrow-band light pulse travels at the group velocity.
// This is n − λ dn/dλ, differentiated analytically from the same Sellmeier formula.
export function glassGroupIndex(wavelengthNm) {
  const lambdaSquared = (wavelengthNm / 1000) ** 2;
  const n = glassIndex(wavelengthNm);
  const slopeSum = sellmeier.reduce((sum,[b,c]) => sum + b*c/(lambdaSquared-c)**2, 0);
  return n + lambdaSquared*slopeSum/n;
}

const difference = (a,b) => [a[0]-b[0], a[1]-b[1]];
const along = (from,vector,distance) => [from[0]+vector[0]*distance, from[1]+vector[1]*distance];
const dot = (a,b) => a[0]*b[0]+a[1]*b[1];
const cross = (a,b) => a[0]*b[1]-a[1]*b[0];
function unit(vector) {
  const length = Math.hypot(...vector);
  return [vector[0]/length, vector[1]/length];
}

function refract(direction,tangent,fromIndex,toIndex) {
  const normal = [tangent[1],-tangent[0]];
  // Signed tangential wavevector is continuous across the boundary (Snell's law).
  const sine = dot(direction,tangent)*fromIndex/toIndex;
  if (Math.abs(sine)>1 || dot(direction,normal)<=0) return null;
  const cosine = Math.sqrt(1-sine*sine);
  return [sine*tangent[0]+cosine*normal[0], sine*tangent[1]+cosine*normal[1]];
}

function faceIntersection(origin,direction,apex,edge) {
  const span = difference(edge,apex);
  const determinant = cross(direction,span);
  if (Math.abs(determinant)<1e-10) return null;
  const offset = difference(apex,origin);
  const distance = cross(offset,span)/determinant;
  const fraction = cross(offset,direction)/determinant;
  return distance>0 && fraction>=0 && fraction<=1 ? along(origin,direction,distance) : null;
}

function imageBoundary(point,direction,width,height) {
  const [dx,dy] = direction;
  const tx = dx === 0 ? Infinity : ((dx>0 ? width : 0)-point[0])/dx;
  const ty = dy === 0 ? Infinity : ((dy>0 ? height : 0)-point[1])/dy;
  return along(point,direction,Math.min(tx,ty));
}

// This models the directly transmitted beam through the two sloping faces only.
// A missed exit or total internal reflection produces no transmitted ray at that face.
export function traceSpectrum(setup = PRISM_SETUP) {
  const {source,apex,left,right,entryFraction,width,height} = setup;
  const entry = along(apex,difference(left,apex),entryFraction);
  const incident = unit(difference(entry,source));
  const entryTangent = unit(difference(left,apex));
  const exitTangent = unit(difference(right,apex));
  const rays = [];
  for (const line of visibleLines) {
    const n = glassIndex(line.w);
    const inside = refract(incident,entryTangent,1,n);
    const exit = inside && faceIntersection(entry,inside,apex,right);
    if (!exit) continue;
    const outgoing = refract(inside,exitTangent,n,1);
    if (!outgoing) continue;
    rays.push({...line,n,inside,exit,outgoing,end:imageBoundary(exit,outgoing,width,height)});
  }
  return {source,entry,incident,rays};
}

const clamp01 = n => Math.max(0,Math.min(1,n));
const smooth = n => {const t=clamp01(n);return t*t*(3-2*t);};
const number = x => Number(x.toFixed(3));
const svgPoint = p => p.map(number).join(' ');

// Air legs share a slowed display speed. All four components leave the tube together.
export function opticalPulse(setup=PRISM_SETUP) {
  const trace=traceSpectrum(setup);
  const airSpeed=185*setup.width/PRISM_SETUP.width;
  const legs=[];
  function leg(from,to,start,groupIndex,color) {
    const [dx,dy]=difference(to,from);
    const length=Math.hypot(dx,dy);
    const path={index:legs.length,from,to,dx,dy,length,color,start,end:start+length*groupIndex/airSpeed,
      angle:number(Math.atan2(dy,dx)*180/Math.PI)};
    legs.push(path);
    return path;
  }
  const input=leg(trace.source,trace.entry,.38,1,'#ffc3d9');
  const lines=trace.rays.map(ray=>{
    const glass=leg(trace.entry,ray.exit,input.end,glassGroupIndex(ray.w),ray.color);
    const air=leg(ray.exit,ray.end,glass.end,1,ray.color);
    return {...ray,glass,air};
  });
  const complete=Math.max(input.end,...lines.map(l=>l.air.end));
  const fadeStart=complete+1.95,fadeEnd=fadeStart+.78;
  return {input,lines,legs,complete,fadeStart,fadeEnd,period:fadeEnd+.16};
}

const observatoryPulse=opticalPulse();

export function pulseFrame(pulse,elapsed) {
  const t=((elapsed%pulse.period)+pulse.period)%pulse.period;
  const intensity=1-smooth((t-pulse.fadeStart)/(pulse.fadeEnd-pulse.fadeStart));
  const progress=pulse.legs.map(leg=>clamp01((t-leg.start)/(leg.end-leg.start)));
  // The small spectrum display records a line when its front reaches the far field.
  const marks=pulse.lines.map(({air})=>smooth((progress[air.index]-.80)/.14)*intensity);
  return {progress,marks,intensity,lamp:.18+.82*smooth(t/.47)*intensity};
}

function endpoint(leg,p) {return [leg.from[0]+leg.dx*p,leg.from[1]+leg.dy*p];}
const pathTo=(leg,point)=>'M '+svgPoint(leg.from)+' L '+svgPoint(point);
const tipTransform=(leg,point,p)=>
  `translate(${svgPoint(point)}) rotate(${leg.angle}) scale(${number(Math.min(1,leg.length*p/16))} 1)`;

function segmentMarkup(leg,frame,weight=1) {
  const p=frame.progress[leg.index],point=endpoint(leg,p),d=pathTo(leg,point);
  return `<g class="optic-leg" data-leg="${leg.index}" visibility="${p?'visible':'hidden'}">
    <g class="ray-ink" fill="none" stroke="${leg.color}" stroke-linecap="round">
      <path class="prism-bloom" d="${d}" stroke-width="${12*weight}" opacity=".10"/>
      <path d="${d}" stroke-width="${5.6*weight}" opacity=".37"/>
      <path class="prism-core" d="${d}" stroke-width="${2.55*weight}" opacity=".99"/>
    </g>
    <g class="ray-front" visibility="${p>0&&p<1?'visible':'hidden'}" transform="${tipTransform(leg,point,p)}" fill="${leg.color}">
      <ellipse cx="-8" rx="8" ry="3.9" opacity=".36"/><ellipse cx="-5" rx="5" ry="2.25"/>
      <ellipse cx="-2.3" rx="2.3" ry="1.25" fill="#fff4eb"/>
    </g></g>`;
}

function junction(point,kind,strength) {
  return `<g class="prism-junction" data-junction="${kind}" transform="translate(${svgPoint(point)})" opacity="${number(strength)}">
    <circle r="7" fill="#fbc8f4" opacity=".12"/><circle r="3.2" fill="#ffe1f4" opacity=".57"/><circle r="1.45" fill="#fff3e5"/>
    </g>`;
}
function junctionLight(progress) {
  if(progress<=0)return 0;
  return smooth(progress/.06)*(.40+.60*(1-smooth(progress/.46)));
}
function drawRays(pulse,frame) {
  const first=pulse.lines[0];
  const entry=first?junction(pulse.input.to,'entry',junctionLight(frame.progress[first.glass.index])):'';
  const exit=first?junction(first.exit,'exit',junctionLight(frame.progress[first.air.index])):'';
  return `<g class="prism-rays" aria-hidden="true" pointer-events="none" opacity="${number(frame.intensity)}">
    <g class="prism-input">${segmentMarkup(pulse.input,frame,1.16)}</g>
    ${pulse.lines.map(line=>`<g class="prism-line" data-wavelength="${line.w}">${segmentMarkup(line.glass,frame,.82)}${segmentMarkup(line.air,frame)}</g>`).join('')}
    ${entry}${exit}</g>`;
}
export function prismRays(setup=PRISM_SETUP,elapsed) {
  const pulse=setup===PRISM_SETUP?observatoryPulse:opticalPulse(setup);
  return drawRays(pulse,pulseFrame(pulse,elapsed??pulse.complete+.2));
}

function spectrumPlate(pulse,frame) {
  return `<svg class="optic-spectrum" viewBox="0 0 160 12" preserveAspectRatio="none" aria-hidden="true">
    <path d="M0 10.5H160" stroke="#92acbc" opacity=".22"/>
    ${pulse.lines.map(({w,color},i)=>{
      const x=number(2+156*(w-390)/(680-390));
      return `<g class="plate-line" data-nm="${w}" opacity="${number(.09+.91*frame.marks[i])}">
        <path d="M${x} 1V10" stroke="${color}" stroke-width="5.5" opacity=".24"/>
        <path d="M${x} 0V11" stroke="${color}" stroke-width="1.9"/></g>`;
    }).join('')}</svg>`;
}

// This same view is used for the motion-reduced still and for an individual frame of the optical loop.
export function observatoryScene(t,elapsed=observatoryPulse.complete+.2) {
  const {width,height,source:[x,y]}=PRISM_SETUP;
  const frame=pulseFrame(observatoryPulse,elapsed);
  return `<figure class="observatory-photo" role="img" aria-label="${t('opticAlt')}">
    <svg class="observatory-window" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="dischargeHalo"><stop stop-color="#fff2de" stop-opacity=".98"/><stop offset=".23" stop-color="#ff908d" stop-opacity=".8"/><stop offset=".53" stop-color="#fb488d" stop-opacity=".39"/><stop offset="1" stop-color="#ed407f" stop-opacity="0"/></radialGradient>
        <linearGradient id="observationFalloff" gradientUnits="userSpaceOnUse" x1="1620" x2="1774"><stop stop-color="white"/><stop offset=".66" stop-color="#f5f5f5"/><stop offset="1" stop-color="#c8c8c8"/></linearGradient>
        <mask id="observationWindow" maskUnits="userSpaceOnUse" x="0" y="0" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="url(#observationFalloff)"/></mask>
      </defs>
      <g class="observatory-camera">
        <image href="/art/observatory.webp" width="${width}" height="${height}" preserveAspectRatio="none"/>
        <g class="discharge-lamp" opacity="${number(frame.lamp)}">
          <ellipse cx="${x}" cy="${y-60}" rx="35" ry="108" fill="url(#dischargeHalo)" opacity=".53"/>
          <ellipse cx="${x}" cy="${y-60}" rx="7" ry="72" fill="url(#dischargeHalo)"/>
          <ellipse cx="${x}" cy="${y}" rx="17" ry="13" fill="url(#dischargeHalo)"/>
        </g>
        <g mask="url(#observationWindow)">${drawRays(observatoryPulse,frame)}</g>
      </g>
    </svg>
    <figcaption class="optic-caption" aria-hidden="true"><span>${t('opticCaption')}</span>${spectrumPlate(observatoryPulse,frame)}</figcaption>
  </figure>`;
}

export function bindObservatory(host) {
  const figure=host.querySelector('.observatory-photo');
  if(!figure)return null;
  const pulse=observatoryPulse,glass=pulse.lines[0].glass,air=pulse.lines[0].air;
  const ink=figure.querySelector('.prism-rays'),lamp=figure.querySelector('.discharge-lamp');
  const entries=Array.from(figure.querySelectorAll('[data-leg]'),group=>({
    leg:pulse.legs[Number(group.dataset.leg)],group,paths:group.querySelectorAll('.ray-ink path'),tip:group.querySelector('.ray-front')
  }));
  const entryFlash=figure.querySelector('[data-junction="entry"]'),exitFlash=figure.querySelector('[data-junction="exit"]');
  const plate=Array.from(figure.querySelectorAll('.plate-line'));
  const dialog=host.ownerDocument.querySelector('dialog');
  let elapsed=0,lastTime=null,previous;

  function render(frame) {
    for(const {leg,group,paths,tip} of entries) {
      const p=frame.progress[leg.index];
      if(previous?.progress[leg.index]===p)continue;
      const point=endpoint(leg,p),d=pathTo(leg,point);
      group.setAttribute('visibility',p?'visible':'hidden');
      paths.forEach(path=>path.setAttribute('d',d));
      tip.setAttribute('visibility',p>0&&p<1?'visible':'hidden');
      if(p>0&&p<1)tip.setAttribute('transform',tipTransform(leg,point,p));
    }
    if(previous?.intensity!==frame.intensity)ink.setAttribute('opacity',number(frame.intensity));
    if(previous?.lamp!==frame.lamp)lamp.setAttribute('opacity',number(frame.lamp));
    if(previous?.progress[glass.index]!==frame.progress[glass.index])entryFlash.setAttribute('opacity',number(junctionLight(frame.progress[glass.index])));
    if(previous?.progress[air.index]!==frame.progress[air.index])exitFlash.setAttribute('opacity',number(junctionLight(frame.progress[air.index])));
    plate.forEach((mark,i)=>{
      if(previous?.marks[i]!==frame.marks[i])mark.setAttribute('opacity',number(.09+.91*frame.marks[i]));
    });
    previous=frame;
  }
  const still=pulseFrame(pulse,pulse.complete+.2);
  return {
    pause(){lastTime=null;},
    update(now,animate) {
      if(!animate){
        lastTime=null;elapsed=0;
        if(previous!==still)render(still);
        return;
      }
      if(dialog?.open||host.classList.contains('optics-paused')){lastTime=null;return;}
      if(lastTime!==null)elapsed=(elapsed+(now-lastTime)/1000)%pulse.period;
      lastTime=now;
      render(pulseFrame(pulse,elapsed));
    }
  };
}

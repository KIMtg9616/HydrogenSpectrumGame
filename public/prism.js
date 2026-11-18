// Geometric-optics section registered to the front triangular face of the photograph.
// Coordinates use a downwards y axis. Each interface normal points into the next medium.
export const PRISM_SETUP = {
  width:1774, height:887,
  source:[1034,361], apex:[1251,225], left:[1145,472], right:[1386,455],
  entryFraction:.12
};

// A representative, visible Balmer quartet. The sRGB display colours approximate hue;
// their brightness is chosen for legibility rather than a radiometric measurement.
const visibleLines = [
  {w:656, name:'Hα', color:'#ff474b'},
  {w:486, name:'Hβ', color:'#4adcf6'},
  {w:434, name:'Hγ', color:'#7974ff'},
  {w:410, name:'Hδ', color:'#aa64ff'}
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

const svgPoint = p => p.map(v=>Number(v.toFixed(2))).join(' ');
function luminousPath(path,color,weight=1) {
  return `<g fill="none" stroke="${color}" stroke-linejoin="round" stroke-linecap="round">
    <path class="prism-bloom" d="${path}" stroke-width="${11*weight}" opacity=".082"/>
    <path d="${path}" stroke-width="${5.4*weight}" opacity=".23"/>
    <path class="prism-core" d="${path}" stroke-width="${1.85*weight}" opacity=".97"/>
  </g>`;
}

export function prismRays(setup = PRISM_SETUP) {
  const {source,entry,rays} = traceSpectrum(setup);
  const input = 'M '+svgPoint(source)+' L '+svgPoint(entry);
  const spectrum = rays.map(ray => {
    const path='M '+svgPoint(entry)+' L '+svgPoint(ray.exit)+' L '+svgPoint(ray.end);
    return `<g class="prism-line" data-wavelength="${ray.w}">${luminousPath(path,ray.color)}
      <circle cx="${ray.exit[0].toFixed(2)}" cy="${ray.exit[1].toFixed(2)}" r="2.2" fill="${ray.color}" opacity=".76"/></g>`;
  }).join('');
  return `<g class="prism-rays" aria-hidden="true" pointer-events="none">
    <g class="prism-input">${luminousPath(input,'#ffb7ce',.85)}</g>${spectrum}
    <circle class="prism-junction" cx="${entry[0].toFixed(2)}" cy="${entry[1].toFixed(2)}" r="2.8" fill="#ffe9ed" opacity=".82"/>
  </g>`;
}

// Camera, lamp and paths share one coordinate system at every aspect ratio.
export function observatoryScene(t) {
  const {width,height,source}=PRISM_SETUP;
  const [x,y]=source;
  return `<figure class="observatory-photo" role="img" aria-label="${t('opticAlt')}">
    <svg class="observatory-window" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="dischargeHalo"><stop stop-color="#fff0de" stop-opacity=".9"/><stop offset=".23" stop-color="#ff908d" stop-opacity=".78"/><stop offset=".53" stop-color="#fb488d" stop-opacity=".36"/><stop offset="1" stop-color="#ed407f" stop-opacity="0"/></radialGradient>
        <linearGradient id="observationFalloff" gradientUnits="userSpaceOnUse" x1="1510" x2="1768"><stop stop-color="white"/><stop offset=".66" stop-color="#ddd"/><stop offset="1" stop-color="#222"/></linearGradient>
        <mask id="observationWindow" maskUnits="userSpaceOnUse" x="0" y="0" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="url(#observationFalloff)"/></mask>
      </defs>
      <g class="observatory-camera">
        <image href="/art/observatory.webp" width="${width}" height="${height}" preserveAspectRatio="none"/>
        <g class="discharge-cycle">
          <ellipse cx="${x}" cy="${y-60}" rx="31" ry="109" fill="url(#dischargeHalo)" opacity=".48"/>
          <ellipse cx="${x}" cy="${y-60}" rx="6.4" ry="72" fill="url(#dischargeHalo)"/>
          <ellipse cx="${x}" cy="${y}" rx="17" ry="13" fill="url(#dischargeHalo)" opacity=".78"/>
          <g mask="url(#observationWindow)">${prismRays()}</g>
        </g>
      </g>
    </svg>
    <figcaption class="optic-caption" aria-hidden="true"><i></i>${t('opticCaption')}</figcaption>
  </figure>`;
}

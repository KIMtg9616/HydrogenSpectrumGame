import test from 'node:test';
import assert from 'node:assert/strict';
import {PRISM_SETUP,glassIndex,traceSpectrum,prismRays} from '../public/prism.js';

const norm = a=>Math.hypot(...a);
const unit = a=>a.map(v=>v/norm(a));
const delta = (p,q)=>[p[0]-q[0],p[1]-q[1]];
const dot = (a,b)=>a[0]*b[0]+a[1]*b[1];
const close = (v,w,tolerance=1e-9)=>assert.ok(Math.abs(v-w)<tolerance,v+' vs '+w);

test('N-SF11 indices reproduce the tabulated helium d and mercury g lines',()=>{
  close(glassIndex(587.56),1.78472,.00002);
  close(glassIndex(435.835),1.82533,.00002);
  assert.ok(glassIndex(410)>glassIndex(434) && glassIndex(434)>glassIndex(486) && glassIndex(486)>glassIndex(656));
});

test('each transmitted Balmer line uses connected straight segments and satisfies Snell at both faces',()=>{
  const {apex,left,right,width,height}=PRISM_SETUP;
  const a=unit(delta(left,apex)),b=unit(delta(right,apex));
  const {entry,incident,rays}=traceSpectrum();
  assert.deepEqual(rays.map(r=>r.w),[656,486,434,410]);
  for(const r of rays){
    const inside=unit(delta(r.exit,entry)),outgoing=unit(delta(r.end,r.exit));
    close(norm(r.inside),1);close(norm(r.outgoing),1);
    close(dot(inside,r.inside),1);close(dot(outgoing,r.outgoing),1);
    close(dot(incident,a),r.n*dot(inside,a));
    close(r.n*dot(inside,b),dot(outgoing,b));
    close((r.exit[0]-apex[0])/(right[0]-apex[0]),(r.exit[1]-apex[1])/(right[1]-apex[1]));
    assert.ok(r.exit[1]>apex[1] && r.exit[1]<right[1]);
    assert.ok(Math.abs(r.end[0]-width)<1e-9 || Math.abs(r.end[1]-height)<1e-9 || Math.abs(r.end[1])<1e-9);
  }
  for(let i=1;i<rays.length;i++){
    assert.ok(rays[i].inside[1]>rays[i-1].inside[1]);
    assert.ok(rays[i].outgoing[1]>rays[i-1].outgoing[1]);
    const yAt=(r,x)=>r.exit[1]+(x-r.exit[0])*r.outgoing[1]/r.outgoing[0];
    for(const x of [Math.max(...rays.map(r=>r.exit[0])),Math.min(...rays.map(r=>r.end[0]))]){
      assert.ok(yAt(rays[i],x)>yAt(rays[i-1],x));
    }
  }
});

test('uniform image rescaling preserves the physical rays, with four independent visible spectral marks',()=>{
  const size=.37, setup={...PRISM_SETUP,width:PRISM_SETUP.width*size,height:PRISM_SETUP.height*size};
  for(const key of ['apex','left','right','source']) setup[key]=PRISM_SETUP[key].map(x=>x*size);
  const before=traceSpectrum(),after=traceSpectrum(setup);
  assert.equal(after.rays.length,4);
  before.rays.forEach((r,i)=>r.end.forEach((v,j)=>close(v*size,after.rays[i].end[j])));
  assert.deepEqual(Array.from(prismRays(setup).matchAll(/data-wavelength="(\d+)"/g),m=>+m[1]),[656,486,434,410]);
});

test('rays above the critical angle have no directly transmitted branch',()=>{
  // Normal incidence on the first face of an equilateral prism gives 60° incidence
  // on its second face. This is above the critical angle at every selected wavelength.
  const root3=Math.sqrt(3);
  const sample={width:220,height:160,apex:[100,20],left:[50,20+50*root3],right:[150,20+50*root3],
    entryFraction:.25,source:[87.5-20*root3,12.5*root3]};
  assert.equal(traceSpectrum(sample).rays.length,0);
});

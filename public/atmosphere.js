// All geometry is decorative. Time is measured in seconds so motion has a consistent speed.
const TAU = Math.PI * 2;
const bands = [
  {rgb:'58,208,214', base:.43, amp:.13, phase:.3, angle:-.19},
  {rgb:'127,118,221', base:.50, amp:.14, phase:.93, angle:-.24},
  {rgb:'224,169,98', base:.62, amp:.09, phase:2.8, angle:-.09}
];
function ridge(x,time,band,depth) {
  const phase = band.phase+time*.21;
  return band.base + band.angle*(x-.5) + band.amp*Math.sin(5.8*x+phase+depth*.58)
    + .055*Math.sin(10.4*x-phase*.72+depth*.9)
    + depth*(.095+.035*Math.cos(7*x+phase)) + .025*Math.sin(time*.29+2.4*x);
}
function line(path,width,height,time,band,depth,reverse=false) {
  const steps=36;
  for (let i=0;i<=steps;i++) {
    const u=reverse?1-i/steps:i/steps, x=(u*1.08-.04);
    const y=ridge(x,time,band,depth)*height;
    if (i===0 && !reverse) path.moveTo(x*width,y);
    else path.lineTo(x*width,y);
  }
}
export function paintRibbons(ctx,width,height,time,scene) {
  if (!width||!height) return;
  const interior=scene==='game', hero=scene==='home';
  const strength=interior?.91:hero?.72:.64;
  ctx.save();
  if (interior || hero) {
    ctx.translate(0,height*(hero?-.13:.10));
    ctx.scale(1,hero?.87:.97);
  }
  ctx.globalCompositeOperation='screen';
  for (const [j,b] of bands.entries()) {
    const fill=ctx.createLinearGradient(0,0,width,height*.25);
    const rgb=b.rgb;
    const rgba=(n)=>'rgba('+rgb+','+n*strength+')';
    fill.addColorStop(0,rgba(hero?.012:.06));fill.addColorStop(.28,rgba(hero?.018:.12));
    fill.addColorStop(.60,rgba(.21));fill.addColorStop(.83,rgba(.14));fill.addColorStop(1,rgba(.055));
    const threads=9;
    for (let i=0;i<threads;i++) {
      const d=i/(threads-1), path=new Path2D();
      line(path,width,height,time,b,d,false);
      if (i<threads-1) {
        const veil=new Path2D(path);
        line(veil,width,height,time,b,(i+1)/(threads-1),true);
        veil.closePath();ctx.fillStyle=fill;ctx.globalAlpha=.34+.62*(1-d)**2;ctx.fill(veil);
      }
      ctx.globalAlpha=(i===1?.94:(.18+.16*(1-d)))*strength;
      ctx.strokeStyle=fill;ctx.lineWidth=i===1?1.7:.8;ctx.stroke(path);
    }
    for (let k=0;k<(interior?4:6);k++) {
      const u=(time*(.016+j*.003)+k*.183+j*.29)%1;
      const fade=Math.sin(Math.PI*u);
      ctx.globalAlpha=fade*(hero?.43:.67);ctx.fillStyle='rgb('+rgb+')';
      const y=ridge(u,time,b,.13+(k%3)*.25)*height;
      ctx.beginPath();ctx.arc(u*width,y,k%2===0?1.55:1.05,0,TAU);ctx.fill();
    }
  }
  if (scene==='sky') {
    // An occasional grazing ray travels along the frame edge, clear of the controls.
    const pass=Math.floor(time/9), phase=(time%9)/2.1;
    if (phase<1) {
      const x=width*(.07+.82*phase),y=height*(.08+.09*(pass%3)+.11*phase);
      const length=Math.min(width*.13,95),tail=ctx.createLinearGradient(x-length,y-10,x,y);
      tail.addColorStop(0,'transparent');tail.addColorStop(1,'#b6def7');
      ctx.globalAlpha=.36*Math.sin(Math.PI*phase);ctx.strokeStyle=tail;ctx.lineWidth=1.15;
      ctx.beginPath();ctx.moveTo(x-length,y-10);ctx.lineTo(x,y);ctx.stroke();
    }
    for (let i=0;i<4;i++) {
      const pulse=Math.max(0,Math.sin(time*.61+i*2.10))**7;
      if (pulse<.12) continue;
      const x=width*(.09+i*.264),y=height*(.13+((i*3)%5)*.177),r=1+2.6*pulse;
      ctx.globalAlpha=.32*pulse;ctx.strokeStyle='#d3eafa';ctx.lineWidth=.8;
      ctx.beginPath();ctx.moveTo(x-r,y);ctx.lineTo(x+r,y);ctx.moveTo(x,y-r);ctx.lineTo(x,y+r);ctx.stroke();
    }
  }
  ctx.restore();
}

let liveTouches = [];
export function clearTouches() {
  for (const el of liveTouches) el.remove();
  liveTouches=[];
}
export function contact(x,y,target) {
  const instrument=target?.closest('.line-instrument');
  const host=instrument || document.querySelector('dialog[open]') || document.body;
  if (instrument) {
    const box=instrument.getBoundingClientRect();
    x-=box.left+instrument.clientLeft;
    y-=box.top+instrument.clientTop;
  }
  const tone=target?.closest('[style*="--c:"], .gamecard, .book-spread, [data-mode]');
  const css=tone && getComputedStyle(tone);
  const tint=css?.getPropertyValue('--c').trim() || css?.getPropertyValue('--ink').trim() || css?.getPropertyValue('--mode-ink').trim() || '#8fdbec';
  const pulse=document.createElement('div');
  pulse.className='contact-prism';pulse.setAttribute('aria-hidden','true');
  pulse.style.cssText='left:'+x+'px;top:'+y+'px';pulse.style.setProperty('--contact-color',tint);
  const colors=['#fff1cd',tint,'#bdabf2'];
  for(let i=0;i<9;i++) {
    const ray=document.createElement('i');
    const angle=(i*40+Math.random()*16)*Math.PI/180;
    const radius=24+Math.random()*36;
    ray.style.setProperty('--dx',(Math.cos(angle)*radius).toFixed(1)+'px');
    ray.style.setProperty('--dy',(Math.sin(angle)*radius).toFixed(1)+'px');
    ray.style.setProperty('--rot',(angle*180/Math.PI+45)+'deg');
    ray.style.setProperty('--ray',colors[i%3]);
    pulse.append(ray);
  }
  const finish=()=>{pulse.remove();liveTouches=liveTouches.filter(el=>el!==pulse);};
  pulse.addEventListener('animationend',e=>{if(e.target===pulse&&!e.pseudoElement)finish();});
  // Some hidden tabs and intervening preference changes suppress animationend.
  setTimeout(finish,820);
  if(liveTouches.length>=5) liveTouches.shift().remove();
  liveTouches.push(pulse);host.append(pulse);
}

// Original score and instrument patches. All time values use the Web Audio clock.
const hz = midi => 440 * 2 ** ((midi - 69) / 12);
const floor = 0.0001;

// The six notes are musical signatures, ordered from the longest to shortest wavelength.
// Each resonator has its own partials and decay, from a dark low tine to a bright glass rim.
const signatures = new Map([
  [3, {note:62, shape:'felt', decay:.55, overtone:12.01, shimmer:.12}],
  [4, {note:65, shape:'bass', decay:.83, overtone:19.03, shimmer:.23}],
  [5, {note:69, shape:'sine', decay:1.05, overtone:12.06, shimmer:.41}],
  [6, {note:72, shape:'string', decay:.74, overtone:24.02, shimmer:.21}],
  [7, {note:76, shape:'triangle', decay:.68, overtone:19.16, shimmer:.36}],
  [13,{note:81, shape:'sine', decay:.88, overtone:23.90, shimmer:.31}]
]);
const harmony = [
  [38, 53, 57, 60, 64], [34, 53, 57, 60, 62], [43, 53, 58, 62, 69], [36, 52, 55, 62, 67],
  [41, 53, 57, 64, 67], [40, 55, 59, 62, 67], [34, 53, 57, 62, 65], [33, 52, 55, 62, 64]
];
// Each phrase uses [sixteenth, MIDI note, length in sixteenths]. Rests give cues room.
const homePhrases = [
  [[2,69,4],[8,72,3],[13,76,5]], [[7,74,4],[13,69,3]],
  [[1,70,5],[10,69,2],[13,65,4]], [[6,67,5],[14,64,2]],
  [[1,69,3],[6,72,3],[12,79,5]], [[6,76,3],[11,74,3]],
  [[2,72,4],[9,69,4]], [[1,67,3],[7,64,4],[13,62,4]]
];
const gamePhrases = [
  [[0,74,3],[6,69,2],[10,72,2],[14,76,3]], [[4,77,3],[10,74,4]],
  [[2,74,3],[7,70,2],[12,69,4]], [[3,67,2],[8,72,2],[14,76,2]],
  [[0,77,4],[7,76,2],[12,72,3]], [[2,79,3],[8,74,3],[14,71,2]],
  [[2,74,4],[10,69,3]], [[0,67,3],[6,64,2],[10,69,3],[15,73,2]]
];
const coda = [[[2,74,6],[12,69,4]], [[6,72,7]], [[2,65,4],[10,69,4]], [[2,64,5],[11,62,5]]];
export const tempos = {home: 76, game: 104, result: 68};

function wave(ctx, strengths) {
  return ctx.createPeriodicWave(new Float32Array(strengths.length + 1), Float32Array.of(0, ...strengths));
}
function noiseBuffer(ctx, seconds, stereo = false) {
  const buffer = ctx.createBuffer(stereo ? 2 : 1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    let previous = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      previous = previous * .42 + white * .58;
      data[i] = stereo ? previous * (1 - i / data.length) ** 3.2 : white;
    }
    if (stereo) for (const [delay, gain] of [[.018,.6],[.037,.41],[.061,.26]]) {
      data[Math.floor((delay + ch * .0023) * ctx.sampleRate)] += gain;
    }
  }
  return buffer;
}
function channel(ctx, master, impulse, wetLevel) {
  const input = ctx.createGain(), volume = ctx.createGain();
  const room = ctx.createConvolver(), wet = ctx.createGain();
  room.buffer = impulse;
  wet.gain.value = wetLevel;
  input.connect(volume);
  input.connect(room).connect(wet).connect(volume);
  volume.connect(master);
  return {input, volume};
}
export function makeMixer(ctx) {
  const master = ctx.createGain(), guard = ctx.createDynamicsCompressor();
  guard.threshold.value = -15; guard.knee.value = 12; guard.ratio.value = 4;
  guard.attack.value = .005; guard.release.value = .18;
  master.connect(guard).connect(ctx.destination);
  const impulse = noiseBuffer(ctx, 1.15, true);
  const music = channel(ctx, master, impulse, .23), fx = channel(ctx, master, impulse, .16);
  music.input.gain.value=1.38; fx.input.gain.value=1.2;
  const duck = ctx.createGain();
  duck.connect(music.input);
  // One damped repeat gives the mallet voices distance without clouding the downbeat.
  const delay = ctx.createDelay(1), filter = ctx.createBiquadFilter(), echo = ctx.createGain();
  delay.delayTime.value = .287; filter.type = 'lowpass'; filter.frequency.value = 2100;
  echo.gain.value = .13;
  duck.connect(delay).connect(filter).connect(echo).connect(music.input);
  return {ctx, master, music, fx, duck, noise:noiseBuffer(ctx, 1.3), waves:{
    felt:wave(ctx,[1,.32,.17,.035,.048,.016]), bass:wave(ctx,[1,.29,.11,.035]),
    pad:wave(ctx,[1,.45,.20,.13,.08,.045,.03]), string:wave(ctx,[1,.21,.37,.10,.12,.06,.04])
  }};
}
function place(ctx, from, bus, pan) {
  if (!pan || !ctx.createStereoPanner) { from.connect(bus); return null; }
  const p = ctx.createStereoPanner();
  p.pan.value = pan;
  from.connect(p).connect(bus);
  return p;
}
function finish(source, end, nodes) {
  source.onended = () => { source.disconnect(); for (const n of nodes) n?.disconnect(); };
  source.stop(end + .015);
}
function voice(m, bus, time, pitch, duration, level, opts = {}) {
  const ctx = m.ctx, o = ctx.createOscillator(), env = ctx.createGain();
  const {shape='sine', attack=.012, hold=0, pan=0, cents=0, slide=0} = opts;
  if (m.waves[shape]) o.setPeriodicWave(m.waves[shape]); else o.type = shape;
  const base = hz(pitch);
  o.frequency.setValueAtTime(base, time);
  if (slide) o.frequency.exponentialRampToValueAtTime(hz(pitch + slide), time + duration * .78);
  o.detune.value = cents;
  const peak = time + Math.min(attack, duration * .42);
  env.gain.setValueAtTime(floor, time);
  env.gain.exponentialRampToValueAtTime(Math.max(level, floor), peak);
  if (hold) env.gain.setValueAtTime(level * .82, Math.max(peak, time + duration * hold));
  env.gain.exponentialRampToValueAtTime(floor, time + duration);
  o.connect(env);
  const p = place(ctx, env, bus, pan);
  o.start(time); finish(o, time + duration, [env,p]);
}
function breath(m, bus, time, duration, level, from, to, pan=0, attack=.01, q=.8) {
  const ctx=m.ctx, source=ctx.createBufferSource(), filter=ctx.createBiquadFilter(), env=ctx.createGain();
  source.buffer=m.noise; source.loop=true;
  filter.type='bandpass'; filter.Q.value=q;
  filter.frequency.setValueAtTime(from,time); filter.frequency.exponentialRampToValueAtTime(to,time+duration);
  env.gain.setValueAtTime(floor,time);
  env.gain.linearRampToValueAtTime(level,time+Math.min(attack,duration*.48));
  env.gain.exponentialRampToValueAtTime(floor,time+duration);
  source.connect(filter).connect(env);
  const p=place(ctx,env,bus,pan);
  source.start(time,(time*.413)%1); finish(source,time+duration,[filter,env,p]);
}
function tine(m, bus, t, note, length, level, pan=0) {
  voice(m,bus,t,note,length,level,{shape:'felt',pan});
  voice(m,bus,t+.003,note+19.04,Math.min(.41,length),level*.23,{attack:.003,pan:-pan*.6});
}
function glass(m, bus, time, note, level, pan=0) {
  for (const [interval, duration, gain] of [[0,.93,1],[12.02,.66,.35],[19.12,.38,.19],[27.8,.17,.09]]) {
    voice(m,bus,time,note+interval,duration,level*gain,{attack:.005,pan});
  }
}
function kick(m,bus,t,vol) {
  voice(m,bus,t,45,.22,vol,{slide:-17,attack:.004});
  breath(m,bus,t,.047,vol*.36,940,260);
}
export function scoreStep(m, bus, scene, step, t, intensity=0) {
  const unit=60/tempos[scene]/4, beat=step%16, rawBar=Math.floor(step/16);
  const bar=rawBar%8, alternate=Math.floor(rawBar/8)%2;
  const chord=harmony[scene==='result'?[0,1,2,0][bar%4]:bar];
  const play=scene==='game', accent=1+intensity*.32;
  if (beat===0) {
    chord.slice(1).forEach((note,i)=>{
      const pan=(i-1.5)*.36;
      voice(m,bus,t+i*.019,note,unit*17,.042,{shape:'pad',attack:.42,hold:.70,pan,cents:i%2?3:-4});
    });
    voice(m,bus,t,chord[0],unit*(play?6:13),play?.24:.17,{shape:'bass',attack:.032});
  }
  const phrase=scene==='result'?coda[bar%4]:play?gamePhrases[bar]:homePhrases[bar];
  for (const [start,note,len] of phrase) if (beat===start) {
    const delay=(start%2?unit*.075:0);
    tine(m,bus,t+delay,note,Math.max(.52,(len+2)*unit),play?.121:.139,alternate?.20:-.23);
    if (alternate && (bar===3||bar===7) && start>=10) glass(m,bus,t+unit*.60,note+12,.027,.54);
  }
  if (!play) {
    if (scene==='home' && [4,11].includes(beat)) {
      tine(m,bus,t,chord[beat===4?2:3],unit*4,.045,beat===4?-.5:.46);
    }
    return;
  }
  if (beat===8||beat===14&&bar%2===1) voice(m,bus,t,chord[0]+(beat===8?7:12),unit*3,.13,{shape:'bass'});
  if ([0,8].includes(beat)||beat===11&&bar%4===3) kick(m,bus,t,.17*accent);
  if (beat===4||beat===12) {
    breath(m,bus,t,.14,.135*accent,2100,900,-.24);
    voice(m,bus,t,52,.091,.052,{shape:'triangle',slide:-5});
  }
  if (beat%4===2 || (intensity && beat%4===3 && bar%2===1)) {
    breath(m,bus,t+unit*.055,.075,.075*accent,6800,3500,.43);
  }
  if ((beat===3||beat===10||beat===15) && (alternate||bar%2===0)) {
    voice(m,bus,t,chord[2+beat%3]+12,unit*2.4,.043,{shape:'string',pan:beat%2?-.53:.55});
  }
}

export function playCue(m, name, options={}, time=m.ctx.currentTime+.009) {
  const bus=m.fx.input, pan=options.pan||0, lvl=options.quiet?.62:1;
  const v=(n,d,a,off=0,opts={})=>voice(m,bus,time+off,n,d,a*lvl,{pan,...opts});
  const air=(off,d,a,lo,hi,p=pan,attack=.01)=>breath(m,bus,time+off,d,a*lvl,lo,hi,p,attack);
  const bell=(n,a,off=0,p=pan)=>glass(m,bus,time+off,n,a*lvl,p);
  const motif=(notes,spacing,level)=>notes.forEach((note,i)=>tine(m,bus,time+i*spacing,note,.45+i*.06,level*lvl,pan));
  const patch=signatures.get(options.energy)||signatures.get(5);
  const signature=patch.note;
  switch (name) {
    case 'draw': case 'redraw':
      air(0,.105,.27,1300,6600,-.46,.019);
      air(.105,.12,.22,1750,5900,.42,.013);
      v(name==='draw'?56:62,.10,.11,.034,{shape:'felt'});
      v(name==='draw'?63:59,.13,.095,.145,{shape:'felt'});
      break;
    case 'select': v(76,.105,.095,0,{shape:'felt'}); break;
    case 'up':
      air(0,.30,.24,520,5200,pan,.10);
      v(52,.35,.13,0,{shape:'string',slide:17,attack:.07}); bell(77,.08,.25); break;
    case 'down':
      v(82,.30,.14,0,{slide:-19}); air(.045,.34,.20,4900,680,pan,.035);
      v(57,.30,.085,.13,{shape:'felt'}); break;
    case 'collect': case 'line':
      v(signature,patch.decay,.20,0,{shape:patch.shape,attack:.007});
      v(signature+patch.overtone,patch.decay*.49,.20*patch.shimmer,.004,{pan:-pan*.7});
      bell(signature+7,.065,.075,pan*.5+.18);
      if (name==='collect') bell(signature+12,.075,.17,-.24); break;
    case 'steal':
      air(0,.24,.22,5200,1100,-.55); v(68,.26,.12,0,{slide:-9,pan:-.55});
      v(59,.23,.13,.17,{slide:12,pan:.5}); bell(signature,.13,.29,.45); break;
    case 'break':
      air(0,.09,.33,3900,1750); v(45,.21,.17,0,{shape:'triangle',slide:-7});
      [0,1,2].forEach(i=>v(87-i*6,.20,.058,.026+i*.046,{slide:-4,pan:(i-1)*.55})); break;
    case 'win':
      [62,69,74,77,81].forEach((n,i)=>bell(n,.14,i*.115,(i-2)*.19));
      [50,57,65,69,76].forEach((n,i)=>v(n,1.32,.072,.46+i*.017,{shape:'pad',attack:.08,hold:.47})); break;
    case 'finish': motif([69,65,62],.13,.12); break;
    case 'ready': motif([62,69,74],.068,.12); break;
    case 'turn': motif([69,74],.056,.080); break;
    case 'pass': motif([62,57],.053,.087); break;
    case 'tick': v(83+(3-(options.seconds||3))*2,.065,.080,0,{attack:.003}); break;
    case 'timeout': v(54,.20,.14,0,{shape:'felt',slide:-3}); v(45,.22,.10,.12); break;
    case 'error': motif([53,52],.08,.10); break;
    default: v(74,.065,.059,0,{shape:'felt',attack:.003});
  }
}

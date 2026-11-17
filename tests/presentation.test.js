import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,player,apply,publicGame,LINES} from '../public/engine.js';
import {playStyle,signalReading,finalSpectrum,lastCard,benchReading,lineInstrument} from '../public/presentation.js';
import {tr} from '../public/i18n.js';

const ko=key=>tr(key,'ko');

test('draws reveal no card art in the event log; the confirmed play identifies the actor, victim and played art',()=>{
  const s=createGame([player('a','Alex'),player('b','Alex'),player('c','Alex')]);
  s.players[2].tokens=[4];
  s.deck=[{kind:'up',id:'other-card',art:16},{kind:'steal',id:'chosen',art:20}];
  apply(s,'a',{type:'draw'});
  const waiting=publicGame(s,'b');
  assert.deepEqual(waiting.hand,[]);
  assert.equal(waiting.log[0].art,undefined);
  apply(s,'a',{type:'play',card:'chosen',other:'c',e:4});
  const played=publicGame(s,'b').log.at(-1);
  assert.equal(played.whoId,'a'); assert.equal(played.otherId,'c'); assert.equal(played.art,20);
  assert.equal(playStyle(played).kind,'steal');
});

test('upward, non-target and duplicate emissions use the correct feedback without crediting a new line',()=>{
  assert.equal(playStyle({from:17,to:18,kind:'energy'}).kind,'up');
  const nonTarget={from:19,to:18,kind:'down',nonTarget:true};
  assert.equal(playStyle(nonTarget).line,undefined);
  assert.match(signalReading(nonTarget,ko,'A'),/방출 · 19 → 18/);
  assert.doesNotMatch(signalReading(nonTarget,ko,'A'),/ · 수집/);
  const repeated={from:17,to:13,kind:'energy',e:4,gain:false};
  assert.match(signalReading(repeated,ko,'A'),/Hα 656 nm · 재고 없음 또는 중복/);
  assert.doesNotMatch(lastCard(repeated,ko,'A'),/<img/);
});

test('the final plate lights and labels precisely the recorded wavelengths, including an empty timed result',()=>{
  const markup=finalSpectrum({tokens:[13,4,3]},ko);
  assert.equal((markup.match(/class="exposed"/g)||[]).length,3);
  assert.match(markup,/data-line="13" aria-label="UV, 122 nm"/);
  assert.match(markup,/data-line="4" aria-label="Hα, 656 nm"/);
  assert.match(markup,/data-line="3" aria-label="IR, 1094 nm"/);
  assert.doesNotMatch(markup,/data-line="7"/);
  assert.match(finalSpectrum({tokens:[]},ko),/기록한 선이 없습니다/);
});

test('both invisible lines are identified in all four audition languages',()=>{
  for (const lang of ['ko','en','ja','zh']) {
    const t=key=>tr(key,lang);
    for (const l of LINES) assert.equal(benchReading(l,t).includes(t('invisible')),['UV','IR'].includes(l.s));
  }
});

test('all six auditions retain a complete wave on the same horizontal scale, including 1094 nm',()=>{
  let previousCrossings=Infinity;
  for (const line of LINES) {
    const markup=benchReading(line,ko);
    assert.match(markup,/viewBox="0 0 240 44"/);
    const path=markup.match(/class="bench-waveform" d="([^"]+)"/)[1];
    const points=[...path.matchAll(/[ML]([\d.]+) ([\d.]+)/g)].map(([,x,y])=>[Number(x),Number(y)]);
    assert.equal(points[0][0],3);
    assert.equal(points.at(-1)[0],237);
    let crossings=0;
    for (let i=1;i<points.length;i++) {
      const [x,y]=points[i];
      assert.ok(x>points[i-1][0]&&y>=7&&y<=37);
      if (points[i-1][1]>=22&&y<22) crossings++;
    }
    // Includes the rising crossing at the origin; every following one completes a cycle.
    assert.equal(crossings,Math.ceil(1600/line.w));
    assert.ok(crossings>=2&&crossings<=previousCrossings);
    previousCrossings=crossings;
  }
});

test('the six keyboard controls keep one selection and expose its wavelength and band in the status',()=>{
  for (const language of ['ko','en','ja','zh']) {
    const t=key=>tr(key,language);
    for (const line of LINES) {
      const html=lineInstrument(t,line);
      assert.equal((html.match(/data-audition="/g)||[]).length,6);
      assert.equal((html.match(/aria-pressed="true"/g)||[]).length,1);
      assert.ok(html.includes(`aria-pressed="true" aria-label="${t('auditionTitle')} · ${line.s}, ${line.w} nm"`));
      const reading=html.split('role="status"')[1];
      assert.ok(reading.includes(`<b>${line.s}</b> <strong>${line.w}</strong> <small>nm</small>`));
      const band=['UV','IR'].includes(line.s)?'invisible':'visible';
      assert.ok(reading.includes(`class="bench-band">${t(band)}</span>`));
    }
  }
});

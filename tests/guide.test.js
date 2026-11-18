import test from 'node:test';
import assert from 'node:assert/strict';
import {entries,transitions,guideMarkup} from '../public/field-guide.js';
import {LEVELS,LINES,VALUES,actions,createGame,player} from '../public/engine.js';
import {cardSurface} from '../public/presentation.js';
import {languages,tr} from '../public/i18n.js';

test('the guide represents the full 79-card deck in eight families with each face exactly once',()=>{
  assert.deepEqual(entries.map(c=>c.art),Array.from({length:22},(_,i)=>i));
  assert.equal(entries.reduce((n,c)=>n+c.copies,0),79);
  assert.equal(new Set(entries.map(c=>c.family)).size,8);
  for (const [family,sign] of [['absorb',1],['emit',-1]]) {
    const cards=entries.filter(c=>c.family===family);
    assert.deepEqual(cards.map(c=>c.v),VALUES.map(v=>sign*v));
    assert.ok(cards.every(c=>c.copies===3));
  }
});

test('every transition and spectral reward in the guide matches a legal move and the exact endpoints',()=>{
  const p=player('p','P'),s=createGame([p]);
  for(const card of entries.filter(c=>c.kind==='energy')) {
    const shown=transitions(card.v);
    for(const energy of LEVELS) {
      p.energy=energy;
      assert.deepEqual(shown.filter(q=>q.from===energy).map(q=>q.to),actions(s,card).map(o=>o.to));
    }
    for(const row of shown) assert.equal(row.line,LINES.find(l=>l.from===row.from&&l.to===row.to));
  }
  assert.deepEqual(transitions(-4).map(q=>[q.from,q.to,q.line?.s]),[[18,14,'Hα']]);
});

test('both signed value rows, per-face descriptions and examples exist in all four languages',()=>{
  for(const lang of languages) {
    const t=key=>{const result=tr(key,lang);assert.notEqual(result,key);return result;};
    for(const c of entries) {
      const page=guideMarkup(t,c.art);
      assert.ok(page.includes('/cards/card'+c.art+'.png'));
      assert.equal((page.match(/data-book="page"/g)||[]).length,c.kind==='energy'?16:0);
      assert.equal((page.match(/aria-pressed="true"/g)||[]).length,c.kind==='energy'?1:0);
    }
  }
});

test('a new face shines even when unplayable and a retained face has no repeat deal glow',()=>{
  for(const valid of [true,false]) {
    const fresh=cardSurface(entries[0],0,valid,true), retained=cardSurface(entries[0],0,valid,false);
    assert.match(fresh,/class="deal-foil"/);assert.match(fresh,/class="deal-glints"/);
    assert.doesNotMatch(retained,/deal-foil|deal-glints|just-dealt/);
    assert.match(cardSurface(entries[1],1,valid,true),/--deal-delay:75ms/);
  }
});

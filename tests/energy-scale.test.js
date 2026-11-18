import test from 'node:test';
import assert from 'node:assert/strict';
import {LEVELS, LINES, createGame, player, actions, offsetGameEnergy} from '../public/engine.js';
import {newRoom, joinRoom, actRoom, tickRoom, viewRoom, requestGround, decodeRoomAction} from '../src/room.js';
import {guideMarkup} from '../public/field-guide.js';
import {rulebookMarkup} from '../public/rulebook.js';
import {languages,tr} from '../public/i18n.js';

test('the reference board, card arithmetic and every locale agree on the positive game energies',()=>{
  assert.deepEqual(LEVELS,[1,14,18,19,20,21]);
  assert.deepEqual(LINES.map(l=>[l.from,l.to,l.e,l.w]),[
    [14,1,13,122], [21,14,7,410], [20,14,6,434], [19,14,5,486], [18,14,4,656], [21,18,3,1094]
  ]);
  const p=player('a','A'),g=createGame([p],'learn',1000);
  const card=v=>({kind:'energy',v});
  assert.equal(p.energy,1); assert.deepEqual(actions(g,card(-1)),[]);
  assert.deepEqual(actions(g,card(13)),[{to:14}]);p.energy=14;
  assert.deepEqual(actions(g,card(5)),[{to:19}]);assert.deepEqual(actions(g,card(3)),[]);
  for(const lang of languages) {
    const t=k=>tr(k,lang);
    const html=rulebookMarkup('learn',t,'spectrum');
    for(const energy of LEVELS) assert.match(html,new RegExp('<strong>'+energy+' <span>EU'));
    assert.ok(html.includes('18 − 4 = 14') && html.includes('−13.6 eV'));
    const up=guideMarkup(t,16),down=guideMarkup(t,17);
    assert.ok(up.includes(t('guideUpExample')) && down.includes(t('guideDownExample')));
    assert.deepEqual(t('guideUpExample').match(/\d+/g),['1','18','4','14']);
    assert.deepEqual(t('guideDownExample').match(/\d+/g),['21','14','410','18','1094']);
  }
});

test('a pre-update saved match upgrades once without disclosing cards, moving tokens or renewing either clock',()=>{
  const r=newRoom('ENERGY','Host',2,'timed'),now=r.created;
  joinRoom(r,'Guest');const [host,guest]=r.people;guest.ready=true;
  actRoom(r,host,{type:'start'},now);
  const g=r.game;g.players[0].tokens=[13,4];g.players[1].tokens=[5];
  g.removed[4]=2;g.hand=g.deck.splice(0,2);g.phase='choose';g.redraw=true;
  g.players[0].energy=18;g.players[1].energy=0;
  g.log=[{seq:1,key:'play',kind:'energy',from:0,to:13},{seq:2,key:'play',kind:'steal',from:18,e:4}];
  delete r.groundEU;r.people.forEach(p=>{p.energy=0;});
  const old=structuredClone(g),version=r.version;
  assert.equal(tickRoom(r,now+1),true);
  assert.equal(r.version,version+1);
  assert.deepEqual(r.people.map(p=>p.energy),[1,1]);
  assert.deepEqual(r.game.players.map(p=>p.energy),[19,1]);
  assert.deepEqual(r.game.log[1],{seq:2,key:'play',kind:'steal',from:19,e:4});
  assert.deepEqual(offsetGameEnergy(r.game,-1),old);
  assert.equal(tickRoom(r,now+2),false);assert.equal(r.version,version+1);
  const positive=viewRoom(r,host,[],now,1),legacy=viewRoom(r,host,[],now,0);
  assert.equal(positive.groundEU,1);assert.equal(legacy.groundEU,0);
  assert.deepEqual(legacy.game.log,old.log);assert.deepEqual(positive.game.log[0],{...old.log[0],from:1,to:14});
  assert.deepEqual(legacy.game.players[0].tokens,[13,4]);assert.deepEqual(positive.game.removed,old.removed);
  assert.deepEqual(viewRoom(r,guest,[],now,0).game.hand,[]);
  assert.equal(positive.game.turnDeadline,old.turnDeadline);assert.equal(positive.game.deadline,old.deadline);
  assert.deepEqual(positive.game.hand,old.hand);assert.equal(positive.game.redraw,true);
});

test('cached and current browsers can play overlapping absolute values by energy basis or quantum number',()=>{
  const endpoint='https://s.test/api/room/ABC123/action';
  const old=requestGround(new URL(endpoint)),current=requestGround(new URL(endpoint+'?groundEU=1'));
  assert.equal(old,0);assert.equal(current,1);
  const move={type:'play',card:'up',to:18};
  assert.equal(decodeRoomAction(move,old).to,19);assert.equal(decodeRoomAction(move,current).to,18);
  assert.equal(decodeRoomAction({...move,to:17,toLevel:3},current).to,18);
  assert.equal(decodeRoomAction({...move,toLevel:4},old).to,19);
  const photon={type:'play',card:'wild',e:4};assert.deepEqual(decodeRoomAction(photon,old),photon);
});

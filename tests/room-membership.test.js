import test from 'node:test';
import assert from 'node:assert/strict';
import {newRoom,joinRoom,actRoom,tickRoom,auth,viewRoom,roomExpiry,REJOIN_MS,DISCONNECT_MS} from '../src/room.js';
import {active,actions,stock,turnToken} from '../public/engine.js';
import {isTokenAttack,tokenEventCopy} from '../public/token-events.js';
import {tr} from '../public/i18n.js';

const at=1800000000000;
function setup(t,count=3,mode='normal'){
 t.mock.timers.enable({apis:['Date'],now:at});
 const r=newRoom('ABC123','A',4,mode);
 for(let i=1;i<count;i++)joinRoom(r,String.fromCharCode(65+i));
 r.people.forEach(p=>p.ready=true);actRoom(r,r.people[0],{type:'start'});
 return r;
}
const cardCount=g=>g.deck.length+g.hand.length+g.discard.length;
test('four to three: a departing host discards one hand, skips future turns and restores their original seat',t=>{
 const room=setup(t,4),[a,b,c,d]=room.people,g=room.game;
 const seat=g.players[0];seat.energy=17;seat.tokens=[4,5];const available=stock(g,4);
 actRoom(room,a,{type:'draw'},at+100);const hand=g.hand.map(c=>c.id);
 actRoom(room,a,{type:'leave'},at+900);
 assert.equal(g.status,'playing');assert.equal(active(g).id,b.id);assert.equal(room.host,b.id);
 assert.equal(g.turnDeadline,at+10900);assert.equal(g.turnSerial,2);
 assert.equal(cardCount(g),79);for(const id of hand)assert.ok(g.discard.some(c=>c.id===id));
 assert.equal(stock(g,4),available);
 for(const kind of ['steal','break'])assert.ok(actions(g,{kind}).every(o=>o.other!==a.id));
 assert.equal(viewRoom(room,a).game,undefined);
 assert.throws(()=>actRoom(room,a,{type:'draw'},at+1000),/away/);
 actRoom(room,a,{type:'leave'},at+1100);assert.equal(g.log.filter(e=>e.key==='depart').length,1);
 for(const person of [b,c,d]){
  actRoom(room,person,{type:'draw'},at+1800);actRoom(room,person,{type:'pass'},at+1900);
 }
 assert.equal(active(g).id,b.id);assert.equal(g.round,2);const current=turnToken(g);
 assert.throws(()=>joinRoom(room,a.name,'unrecognized',at+2000),/started/);
 assert.deepEqual(joinRoom(room,'new nickname',a.secret,at+2000),{id:a.id,secret:a.secret});
 joinRoom(room,a.name,a.secret,at+2100);
 assert.equal(g.log.filter(e=>e.key==='returnSeat').length,1);assert.equal(g.players.length,4);
 assert.equal(seat.energy,17);assert.deepEqual(seat.tokens,[4,5]);assert.equal(active(g).id,b.id);
 assert.equal(turnToken(g),current);assert.equal(room.host,b.id);
});
test('two to one ends immediately, freezes both clocks and a private hand, then resumes on a valid code re-entry',t=>{
 const room=setup(t,2,'timed'),[a,b]=room.people,g=room.game;
 actRoom(room,a,{type:'draw'},at+1200);const saved=g.hand.map(c=>c.id),old=turnToken(g);
 actRoom(room,b,{type:'leave'},at+3400);
 assert.equal(g.status,'ended');assert.equal(g.endReason,'alone');assert.deepEqual(g.winner,[]);
 assert.equal(g.turnDeadline,null);assert.equal(g.deadline,null);assert.equal(room.rejoinUntil,at+3400+REJOIN_MS);
 const solo=viewRoom(room,a);assert.deepEqual(solo.game.hand,[]);assert.equal(solo.game.resumeClock,undefined);
 assert.throws(()=>actRoom(room,a,{type:'rematch'},at+4000),/minimum/);
 assert.throws(()=>actRoom(room,a,{type:'draw'},at+4100),/ended/);
 joinRoom(room,'B',b.secret,at+14000,[a.id]);
 assert.equal(g.status,'playing');assert.equal(g.phase,'choose');assert.notEqual(turnToken(g),old);
 assert.deepEqual(viewRoom(room,a).game.hand.map(c=>c.id),saved);assert.deepEqual(viewRoom(room,b).game.hand,[]);
 assert.equal(g.turnDeadline,at+20600);assert.equal(g.deadline,at+310600);assert.equal(cardCount(g),79);
 assert.equal(room.rejoinUntil,undefined);assert.throws(()=>actRoom(room,a,{type:'pass',expectedTurn:old},at+14500),/staleTurn/);
});
test('a last connection has a grace period, a missed heartbeat releases only that seat and an empty room expires',t=>{
 const r=setup(t,3),[a,b,c]=r.people;
 delete a.lastSeen;assert(tickRoom(r,at,[a.id,b.id,c.id]));
 tickRoom(r,at+DISCONNECT_MS-1,[a.id,c.id]);assert.equal(b.away,undefined);
 tickRoom(r,at+DISCONNECT_MS,[a.id,c.id]);assert.equal(b.away,'offline');assert.equal(r.game.status,'playing');
 joinRoom(r,b.name,b.secret,at+DISCONNECT_MS+25,[a.id,c.id]);assert.equal(b.away,undefined);
 tickRoom(r,at+DISCONNECT_MS*2+25,[]);assert(r.people.every(p=>p.away));assert.equal(r.game.endReason,'alone');
 const until=roomExpiry(r);joinRoom(r,b.name,b.secret,until-100,[b.id]);assert.equal(r.game.status,'ended');
 assert.throws(()=>joinRoom(r,a.name,a.secret,until),/notFound/);
});
test('cold polling uses original disconnection deadlines; a legitimate time finish never reopens',t=>{
 const r=setup(t,2,'timed'),[a,b]=r.people;
 assert.throws(()=>joinRoom(r,b.name,b.secret,at+DISCONNECT_MS+REJOIN_MS+100),/notFound/);
 assert.equal(r.rejoinUntil,at+DISCONNECT_MS+REJOIN_MS);
 const normal=newRoom('FINISH','A',2,'timed');joinRoom(normal,'B');normal.people[1].ready=true;
 actRoom(normal,normal.people[0],{type:'start'},at);
 tickRoom(normal,at+300000,normal.people.map(p=>p.id));
 assert.equal(normal.game.status,'ended');assert.equal(normal.game.log.at(-1).key,'time');
 actRoom(normal,normal.people[1],{type:'leave'},at+300001);
 joinRoom(normal,'B',normal.people[1].secret,at+300002);
 assert.equal(normal.game.status,'ended');assert.equal(normal.rejoinUntil,undefined);
 assert.equal(auth(r,a.secret).id,a.id);
});
test('a private timed result excludes absent seats while keeping their reserved light in stock',t=>{
 const r=setup(t,3,'timed'),[a,b,c]=r.people,g=r.game;
 g.players[2].tokens=[3,4,5];g.players[1].tokens=[6];
 actRoom(r,c,{type:'leave'},at+100);tickRoom(r,at+300000,[a.id,b.id]);
 assert.deepEqual(g.winner,[b.id]);assert.equal(stock(g,3),7);
});
test('theft and removal identify the exact wavelength and role in all languages, including duplicate player names',()=>{
 const line={s:'Hα',w:656};
 for(const lang of ['ko','en','ja','zh'])for(const kind of ['steal','break']){
  const t=k=>tr(k,lang),event={key:'play',kind,whoId:'a',otherId:'b',who:'Nova',other:'Nova'};
  assert(isTokenAttack(event));assert(!isTokenAttack({...event,key:'draw'}));
  for(const [id,role] of [['a','Actor'],['b','Victim'],['c','Watch']]){
   const copy=tokenEventCopy(event,line,id,t);assert.equal(copy.title,t(kind+role));
   assert(!copy.title.includes(kind));assert.equal(copy.wavelength,'Hα · 656 nm');
   assert.equal(copy.detail.match(/Nova/g).length,2);
  }
 }
});

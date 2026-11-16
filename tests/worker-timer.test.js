import test from 'node:test';
import assert from 'node:assert/strict';
import {GameRoom} from '../src/worker.js';
import {newRoom,joinRoom,actRoom} from '../src/room.js';
import {turnToken} from '../public/engine.js';
const base=1800000000000;
async function harness(){
 const r=newRoom('CLOCK2','Host',2,'normal');joinRoom(r,'Guest');r.people[1].ready=true;actRoom(r,r.people[0],{type:'start'});
 const records=new Map([['room',structuredClone(r)]]),sockets=r.people.map(p=>({sent:[],closed:false,deserializeAttachment:()=>({id:p.id}),send(data){this.sent.push(JSON.parse(data))},close(){this.closed=true}}));
 let gate=Promise.resolve(),alarmTime=null,releases=0;
 const ctx={storage:{async get(k){return structuredClone(records.get(k))},async put(k,v){records.set(k,structuredClone(v))},async setAlarm(t){alarmTime=t},async deleteAll(){records.clear()}},getWebSockets:()=>sockets,blockConcurrencyWhile(fn){const next=gate.then(fn);gate=next.catch(()=>{});return next}};
 const env={REGISTRY:{idFromName:x=>x,get:()=>({async fetch(){releases++;return Response.json({ok:true})}})}};
 const room=new GameRoom(ctx,env);await gate;
 return {room,records,sockets,get alarmTime(){return alarmTime},get releases(){return releases}};
}
test('Durable Object alarms advance at ten seconds and broadcast without any browser request',async t=>{t.mock.timers.enable({apis:['Date'],now:base});const h=await harness();await h.room.persist();assert.equal(h.alarmTime,base+10000);t.mock.timers.tick(10000);await h.room.alarm();assert.equal(h.room.r.game.turn,1);assert.equal(h.alarmTime,base+20000);assert.equal(h.records.get('room').game.turnSerial,2);for(const socket of h.sockets){assert.equal(socket.sent.length,1);assert.equal(socket.sent[0].game.turn,1);assert.equal(socket.sent[0].game.log.at(-1).key,'timeout');assert.equal(socket.sent[0].serverNow,base+10000)}await h.room.alarm();assert.equal(h.room.r.game.turn,1);assert.equal(h.room.r.game.log.length,1);assert.equal(h.alarmTime,base+20000)});
test('Durable Object rejects a late draw at the deadline and persists the automatic handoff',async t=>{t.mock.timers.enable({apis:['Date'],now:base});const h=await harness(),host=h.room.r.people[0],token=turnToken(h.room.r.game);t.mock.timers.tick(10000);const response=await h.room.fetch(new Request('https://room/action',{method:'POST',headers:{Authorization:'Bearer '+host.secret,'Content-Type':'application/json'},body:JSON.stringify({type:'draw',expectedTurn:token})}));assert.equal(response.status,200);const state=await response.json();assert.equal(state.game.turn,1);assert.equal(state.game.hand.length,0);assert.equal(h.records.get('room').game.deck.length,79);assert.equal(h.alarmTime,base+20000)});
test('Durable Object expires abandoned rooms even while turn alarms are running',async t=>{t.mock.timers.enable({apis:['Date'],now:base});const h=await harness();t.mock.timers.tick(10000);await h.room.alarm();assert.equal(h.room.r.updated,base);t.mock.timers.tick(1790000);await h.room.alarm();assert.equal(h.room.r,null);assert.equal(h.records.size,0);assert.equal(h.releases,1);assert(h.sockets.every(s=>s.closed))});
test('Durable Object schedules the earlier total-game deadline and stops turn timeouts after game over',async t=>{t.mock.timers.enable({apis:['Date'],now:base});const h=await harness();h.room.r.game.deadline=base+5000;await h.room.persist();assert.equal(h.alarmTime,base+5000);t.mock.timers.tick(5000);await h.room.alarm();assert.equal(h.room.r.game.status,'ended');assert.equal(h.room.r.game.turnDeadline,null);assert.equal(h.alarmTime,base+5000+600000);assert.equal(h.room.r.game.log.at(-1).key,'time')});

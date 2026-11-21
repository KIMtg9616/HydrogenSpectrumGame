import test from 'node:test';
import assert from 'node:assert/strict';
import {GameRoom} from '../src/worker.js';
import {newRoom,joinRoom,actRoom} from '../src/room.js';
import {turnToken} from '../public/engine.js';
const base=1800000000000;
async function harness(prepareRoom){
 const r=newRoom('CLOCK2','Host',2,'normal');joinRoom(r,'Guest');r.people[1].ready=true;actRoom(r,r.people[0],{type:'start'});
 if(prepareRoom)prepareRoom(r);
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

test('Durable Object: final socket close starts a grace window, an alarm ends a lone game and authenticated join resumes it',async t=>{
 t.mock.timers.enable({apis:['Date'],now:base});
 const h=await harness(),room=h.room,[host,guest]=room.r.people;
 let live=[...h.sockets];room.ctx.getWebSockets=()=>live;
 const second={...h.sockets[1],close(){},deserializeAttachment:()=>({id:guest.id})};
 live=[h.sockets[0],second];await room.webSocketClose(h.sockets[1]);
 t.mock.timers.tick(21000);await room.alarm();assert.equal(guest.away,undefined);
 live=[h.sockets[0]];await room.webSocketClose(second);
 const dropped=Date.now();t.mock.timers.tick(19999);await room.alarm();assert.equal(guest.away,undefined);
 t.mock.timers.tick(1);await room.alarm();assert.equal(room.r.game.endReason,'alone');
 assert.equal(h.records.get('room').game.turnDeadline,null);assert.equal(room.r.rejoinUntil,dropped+620000);
 const result=await room.fetch(new Request('https://room/join',{method:'POST',headers:{Authorization:'Bearer '+guest.secret},body:'{"name":"B"}'}));
 assert.equal(result.status,200);assert.equal((await result.json()).id,guest.id);
 assert.equal(room.r.game.status,'playing');assert.equal(room.r.host,host.id);
});

test('Durable Object wakes a saved match on the new scale and sends each live socket its requested basis',async t=>{
 t.mock.timers.enable({apis:['Date'],now:base});
 const h=await harness(r=>{
  delete r.groundEU;
  r.people.forEach(p=>p.energy=0);
  r.game.players[0].energy=0;r.game.players[1].energy=17;
  r.game.log=[{seq:1,key:'play',kind:'energy',from:13,to:17}];
 });
 const {room,sockets,records}=h,[host,guest]=room.r.people;
 assert.deepEqual(records.get('room').game.players.map(p=>p.energy),[1,18]);
 assert.equal(records.get('room').game.turnDeadline,base+10000);
 sockets[1].deserializeAttachment=()=>({id:guest.id,groundEU:1});
 room.broadcast();
 assert.equal(sockets[0].sent[0].game.log[0].to,17);
 assert.equal(sockets[1].sent[0].game.log[0].to,18);
 const version=room.r.version;
 for(const basis of [0,1]) {
  const state=await (await room.fetch(new Request('https://room/state'+(basis?'?groundEU=1':''),{headers:{Authorization:'Bearer '+host.secret}}))).json();
  assert.equal(state.game.players[0].energy,basis);assert.equal(state.groundEU,basis);
  assert.equal(state.version,version);
 }
});

test('Durable Object broadcasts the lobby chat, draw, and out-of-turn chat to both WebSockets',async t=>{
 t.mock.timers.enable({apis:['Date'],now:base});
 const {room,sockets,records}=await harness(r=>{r.game=null;r.people[1].ready=true});
 const [host,guest]=room.r.people;
 async function post(seat,action){
  const res=await room.fetch(new Request('https://room/action?groundEU=1',{method:'POST',
   headers:{Authorization:'Bearer '+seat.secret},body:JSON.stringify(action)}));
  assert.equal(res.status,200);return res.json();
 }
 await post(guest,{type:'chat',text:'로비',nonce:'G1'});
 for(const s of sockets)assert.equal(s.sent.at(-1).chat[0].name,guest.name);
 const start=await post(host,{type:'start'});
 const draw=await post(host,{type:'draw'});
 await post(guest,{type:'chat',text:'게임',nonce:'G2'});
 for(const s of sockets){
  const state=s.sent.at(-1);
  assert.deepEqual(state.chat.map(m=>m.text),['로비','게임']);
  assert.deepEqual(state.game.lastDraw,draw.game.lastDraw);
  assert.equal(state.game.turnDeadline,start.game.turnDeadline);
 }
 assert.equal(sockets[1].sent.at(-1).game.hand.length,0);
 assert.equal(records.get('room').chat.length,2);
});

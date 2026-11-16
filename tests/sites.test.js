import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker from '../src/site-worker.js';
function database(){const sqlite=new DatabaseSync(':memory:');sqlite.exec(readFileSync(new URL('../drizzle/0000_game_rooms.sql',import.meta.url),'utf8'));return {sqlite,prepare(sql){let args=[];const q={bind(...v){args=v;return q},async first(){return sqlite.prepare(sql).get(...args)||null},async run(){const r=sqlite.prepare(sql).run(...args);return {meta:{changes:Number(r.changes)}}}};return q}}}
async function request(db,path,body,secret){let res=await worker.fetch(new Request('https://spectrum.test/api/'+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(secret?{Authorization:'Bearer '+secret}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})}),{DB:db});return {status:res.status,data:await res.json()}}
test('D1 adapter: four players join concurrently; fifth cannot join; readiness, private hands, turn ownership',async()=>{const db=database();const host=(await request(db,'create',{name:'Host',limit:4,mode:'normal'})).data;const guests=await Promise.all(['Nova','Lyra','Orion'].map(name=>request(db,`room/${host.code}/join`,{name})));for(const g of guests)assert.equal(g.status,200);assert.equal((await request(db,`room/${host.code}/join`,{name:'Fifth'})).status,400);assert.equal((await request(db,`room/${host.code}/action`,{type:'start'},host.secret)).status,400);await Promise.all(guests.map(g=>request(db,`room/${host.code}/action`,{type:'ready',value:true},g.data.secret)));assert.equal((await request(db,`room/${host.code}/action`,{type:'start'},host.secret)).status,200);assert.equal((await request(db,`room/${host.code}/action`,{type:'draw'},host.secret)).data.game.hand.length,2);const guest=(await request(db,`room/${host.code}/state`,undefined,guests[0].data.secret)).data;assert.deepEqual(guest.game.hand,[]);assert.equal(guest.game.deck,undefined);assert(!JSON.stringify(guest).includes(host.secret));assert.equal((await request(db,`room/${host.code}/action`,{type:'draw'},guests[0].data.secret)).status,400);const passed=await request(db,`room/${host.code}/action`,{type:'pass'},host.secret);assert.equal(passed.data.game.turn,1);assert.equal((await request(db,`room/${host.code}/state`,undefined,'bad-secret')).status,403);db.sqlite.close()});
test('D1 adapter: concurrent last-seat claims cannot overfill a room',async()=>{const db=database();const host=(await request(db,'create',{name:'Host',limit:2})).data;const r=await Promise.all(['A','B','C'].map(name=>request(db,`room/${host.code}/join`,{name})));assert.equal(r.filter(x=>x.status===200).length,1);assert.equal((await request(db,`room/${host.code}/state`,undefined,host.secret)).data.people.length,2);db.sqlite.close()});
test('D1 adapter: expiration, room cap and cross-origin mutations',async()=>{const db=database();for(let i=0;i<100;i++)assert.equal((await request(db,'create',{name:'Test'})).status,200);assert.equal((await request(db,'create',{name:'Overflow'})).status,429);db.sqlite.prepare('UPDATE game_rooms SET expires = 0').run();assert.equal((await request(db,'create',{name:'New'})).status,200);const blocked=await worker.fetch(new Request('https://spectrum.test/api/create',{method:'POST',headers:{origin:'https://other.test'},body:'{}'}),{DB:db});assert.equal(blocked.status,403);db.sqlite.close()});
test('D1 adapter: concurrent expiry requests persist one automatic handoff and discard late actions',async()=>{
 const db=database(),host=(await request(db,'create',{name:'Host',limit:2,mode:'normal'})).data;
 const guest=(await request(db,`room/${host.code}/join`,{name:'Guest'})).data;
 await request(db,`room/${host.code}/action`,{type:'ready',value:true},guest.secret);
 await request(db,`room/${host.code}/action`,{type:'start'},host.secret);
 const row=db.sqlite.prepare('SELECT state FROM game_rooms WHERE code = ?').get(host.code),state=JSON.parse(row.state);
 const token=`${state.game.started}:${state.game.turnSerial}`;
 state.game.turnDeadline=Date.now()-1;
 db.sqlite.prepare('UPDATE game_rooms SET state = ? WHERE code = ?').run(JSON.stringify(state),host.code);
 await Promise.all([
  request(db,`room/${host.code}/action`,{type:'draw',expectedTurn:token},host.secret),
  request(db,`room/${host.code}/state`,undefined,guest.secret)
 ]);
 const result=JSON.parse(db.sqlite.prepare('SELECT state FROM game_rooms WHERE code = ?').get(host.code).state);
 assert.equal(result.game.turn,1);assert.equal(result.game.turnSerial,2);
 assert.equal(result.game.log.filter(x=>x.key==='timeout').length,1);
 assert.equal(result.game.deck.length,79);assert.equal(result.game.hand.length,0);
 assert.equal(result.game.turnDeadline-result.game.turnStartedAt,10000);
 db.sqlite.close();
});

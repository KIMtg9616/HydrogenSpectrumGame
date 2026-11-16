import {player,createGame,apply,publicGame,tickGame} from '../public/engine.js';
export const MODES=['normal','speed','timed','learn'];
export const newId=()=>crypto.randomUUID();
const err=k=>{throw Error(k)};
export function newRoom(code,name,limit,mode){let id=newId(),secret=newId();return {code,limit:Math.max(2,Math.min(4,Number(limit)||4)),mode:MODES.includes(mode)?mode:'normal',host:id,people:[{...player(id,String(name||'Player').slice(0,20)),secret}],game:null,updated:Date.now(),created:Date.now(),version:1}}
export function joinRoom(r,name){if(r.game)err('started');if(r.people.length>=r.limit)err('full');let id=newId(),secret=newId();r.people.push({...player(id,String(name||'Player').slice(0,20)),secret});touch(r);return {id,secret}}
export function auth(r,secret){return r?.people.find(p=>p.secret===secret)}
function touch(r,now=Date.now()){r.updated=now;r.version++}
export function actRoom(r,p,a,now=Date.now()){
 if(!p)err('auth');
 // A late request can advance the clock, but it must never execute in the next turn.
 if(tickRoom(r,now))return;
 if(a.type==='ready'&&!r.game){p.ready=!!a.value;touch(r,now);return}
 if(a.type==='start'&&!r.game){
  if(p.id!==r.host)err('host');if(r.people.length<2)err('minimum');
  if(r.people.some(q=>q.id!==r.host&&!q.ready))err('notReady');
  r.game=createGame(r.people.map(q=>player(q.id,q.name)),r.mode,now);
  r.turnChanged=now;touch(r,now);return;
 }
 if(a.type==='rematch'&&r.game?.status==='ended'){
  if(p.id!==r.host)err('host');r.game=null;r.people.forEach(q=>q.ready=false);touch(r,now);return;
 }
 if(a.type==='leave'&&!r.game){r.people=r.people.filter(q=>q.id!==p.id);if(r.host===p.id)r.host=r.people[0]?.id;touch(r,now);return}
 if(a.type==='leave'&&r.game?.status==='playing')err('inGame');
 // Retained for old clients. New clients rely on the automatic 10-second clock.
 if(a.type==='skip'&&r.game?.status==='playing'&&p.id===r.host){
  if(now-(r.turnChanged||r.updated)<60000)err('wait');
  const id=r.game.players[r.game.turn].id;
  if(r.game.phase==='draw')apply(r.game,id,{type:'draw'},now);
  apply(r.game,id,{type:'pass'},now);r.turnChanged=now;touch(r,now);return;
 }
 if(!r.game)err('lobby');
 const before=r.game.turnSerial;
 apply(r.game,p.id,a,now);
 if(r.game.turnSerial!==before||r.game.status==='ended')r.turnChanged=now;
 touch(r,now);
}
export function viewRoom(r,p,online=[],now=Date.now()){
 return {code:r.code,host:r.host,limit:r.limit,mode:r.mode,version:r.version,
  turnChanged:r.turnChanged||r.updated,serverNow:now,
  people:r.people.map(({id,name,ready})=>({id,name,ready,online:online.includes(id)})),
  game:publicGame(r.game,p.id),me:p.id};
}
export function tickRoom(r,now=Date.now()){
 if(!r?.game||!tickGame(r.game,now))return false;
 r.version++;r.turnChanged=r.game.turnStartedAt||now;
 // Clock ticks do not keep abandoned rooms alive. Only a terminal result resets the cleanup TTL.
 if(r.game.status==='ended')r.updated=now;
 return true;
}

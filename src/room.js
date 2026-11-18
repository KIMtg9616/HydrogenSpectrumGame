import {player,createGame,apply,publicGame,tickGame,turnToken,setSeatAway,GAME_MODES} from '../public/engine.js';
export const MODES=GAME_MODES;
export const REJOIN_MS=10*60*1000;
export const DISCONNECT_MS=20*1000;
const SEEN_WRITE_MS=4000;
export const newId=()=>crypto.randomUUID();
const err=k=>{throw Error(k)};
function newSeat(name,now){return {...player(newId(),String(name||'Player').slice(0,20)),secret:newId(),lastSeen:now}}
export function newRoom(code,name,limit,mode){
 const now=Date.now(),seat=newSeat(name,now);
 return {code,limit:Math.max(2,Math.min(4,Number(limit)||4)),mode:MODES.includes(mode)?mode:'normal',
  host:seat.id,people:[seat],game:null,updated:now,created:now,version:1};
}
export function auth(r,secret){return secret&&r?.people.find(p=>p.secret===secret)}
function touch(r,now){r.updated=Math.max(r.updated,now);r.version++}
export function roomExpiry(r){
 if(r.rejoinUntil)return r.rejoinUntil;
 return r.updated+(r.game?.status==='ended'?REJOIN_MS:1800000);
}
function chooseHost(r){
 if(!r.people.some(p=>p.id===r.host&&!p.away))r.host=r.people.find(p=>!p.away)?.id||null;
}
function leaveSeat(r,p,reason,now){
 if(p.away||!r.people.includes(p))return false;
 if(!r.game)r.people=r.people.filter(seat=>seat!==p);
 else{
  p.away=reason;
  const before=turnToken(r.game);
  setSeatAway(r.game,p.id,true,now);
  if(before!==turnToken(r.game)||r.game.endReason==='alone')r.turnChanged=now;
  if(r.game.endReason==='alone'&&!r.rejoinUntil)r.rejoinUntil=now+REJOIN_MS;
 }
 chooseHost(r);touch(r,now);
 return true;
}
export function joinRoom(r,name,secret='',now=Date.now(),connected=[]){
 if(now>=roomExpiry(r))err('notFound');
 tickRoom(r,now,connected);
 if(now>=roomExpiry(r))err('notFound');
 let seat=auth(r,secret);
 if(seat){
  seat.lastSeen=now;
  if(seat.away){
   const before=r.game&&turnToken(r.game);
   delete seat.away;setSeatAway(r.game,seat.id,false,now);chooseHost(r);
   if(r.game&&before!==turnToken(r.game))r.turnChanged=now;
   if(r.game?.status==='playing')delete r.rejoinUntil;
   touch(r,now);
  }
 }else{
  if(r.game)err('started');
  if(r.people.length>=r.limit)err('full');
  seat=newSeat(name,now);r.people.push(seat);chooseHost(r);touch(r,now);
 }
 return {id:seat.id,secret:seat.secret};
}
// WebSocket seats are live while their transport is open. Polling seats renew a bounded lease.
export function nextPresenceCheck(r,connected=[]){
 if(r.game?.status==='ended'&&r.game.endReason!=='alone')return Infinity;
 return r.people.reduce((next,p)=>p.away||connected.includes(p.id)?next:
  Math.min(next,Number.isFinite(p.lastSeen)?p.lastSeen+DISCONNECT_MS:Date.now()+1),Infinity);
}
export function tickRoom(r,now=Date.now(),connected=[]){
 if(!r)return false;
 let dirty=false;
 // On polling transports there may be no requests for minutes. Use each actual lease
 // deadline so an empty room cannot reopen a new recovery window on its next request.
 if(!r.game||r.game.status==='playing'||r.game.endReason==='alone'){
  const expired=[];
  for(const p of r.people){
   if(p.away)continue;
   if(!Number.isFinite(p.lastSeen)){p.lastSeen=now;dirty=true;}
   const at=p.lastSeen+DISCONNECT_MS;
   if(!connected.includes(p.id)&&at<=now)expired.push({p,at});
  }
  expired.sort((a,b)=>a.at-b.at);
  for(const {p,at} of expired){
   if(r.game?.status==='playing'&&r.game.deadline&&r.game.deadline<=at)break;
   dirty=leaveSeat(r,p,'offline',at)||dirty;
  }
 }
 if(tickGame(r.game,now)){
  r.version++;r.turnChanged=r.game.turnStartedAt||now;
  if(r.game.status==='ended')r.updated=now;
  dirty=true;
 }
 return dirty;
}
export function seen(r,p,now=Date.now(),force=false){
 if(!p||p.away||!r.people.includes(p)||(!force&&now-p.lastSeen<SEEN_WRITE_MS))return false;
 p.lastSeen=now;return true;
}
export function actRoom(r,p,a=null,now=Date.now(),connected=[]){
 if(!p)err('auth');
 const before=r.game&&turnToken(r.game);
 const expired=tickRoom(r,now,connected);
 if(a?.type==='leave')return leaveSeat(r,p,'left',now)||expired;
 if(p.away||!r.people.includes(p)){if(a)err('away');return expired;}
 const heartbeat=seen(r,p,now);
 if(!a)return heartbeat||expired;
 if(a.type==='ready'&&!r.game){p.ready=!!a.value;touch(r,now);return true}
 if(a.type==='start'&&!r.game){
  if(p.id!==r.host)err('host');if(r.people.length<2)err('minimum');
  if(r.people.some(q=>q.id!==r.host&&!q.ready))err('notReady');
  r.game=createGame(r.people.map(q=>player(q.id,q.name)),r.mode,now);
  r.turnChanged=now;touch(r,now);return true;
 }
 if(a.type==='rematch'&&r.game?.status==='ended'){
  if(p.id!==r.host)err('host');if(r.game.endReason==='alone')err('minimum');
  r.game=null;r.people=r.people.filter(q=>!q.away);r.people.forEach(q=>{q.ready=false;q.lastSeen=now});
  touch(r,now);return true;
 }
 if(!r.game)err('lobby');
 if(before!==turnToken(r.game)||expired&&r.game.status==='ended')return true;
 if(a.type==='skip'&&r.game.status==='playing'&&p.id===r.host){
  if(now-(r.turnChanged||r.updated)<60000)err('wait');
  const id=r.game.players[r.game.turn].id;
  if(r.game.phase==='draw')apply(r.game,id,{type:'draw'},now);
  apply(r.game,id,{type:'pass'},now);
 }else apply(r.game,p.id,a,now);
 if(before!==turnToken(r.game)||r.game.status==='ended')r.turnChanged=now;
 touch(r,now);return true;
}
// A rejected move can still discover a real timeout or departure. Commit those first.
export function applyRoomRequest(r,p,action,now=Date.now(),connected=[]){
 const version=r.version;
 try{return {dirty:actRoom(r,p,action,now,connected)}}
 catch(error){return {dirty:r.version!==version,error:error.message}}
}
export function viewRoom(r,p,online=[],now=Date.now()){
 const base={code:r.code,me:p.id,version:r.version,serverNow:now};
 if(p.away||!r.people.includes(p))return {...base,away:p.away||'left'};
 return {...base,host:r.host,limit:r.limit,mode:r.mode,turnChanged:r.turnChanged||r.updated,
  rejoinUntil:r.rejoinUntil||null,
  people:r.people.map(q=>({id:q.id,name:q.name,ready:q.ready,away:!!q.away,online:!q.away&&online.includes(q.id)})),
  game:publicGame(r.game,p.id)};
}

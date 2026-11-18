import {newRoom,joinRoom,auth,actRoom,applyRoomRequest,viewRoom,tickRoom,roomExpiry,nextPresenceCheck,seen,requestGround,decodeRoomAction,upgradeRoomEnergy} from './room.js';
const json=(o,status=200)=>Response.json(o,{status,headers:{'Cache-Control':'no-store'}});
const fail=(e,status=400)=>json({error:e.message||String(e)},status);
const codeRx=/^[A-Z0-9]{6}$/;
const secretOf=req=>req.headers.get('Authorization')?.replace(/^Bearer /,'')||'';
const registry=env=>env.REGISTRY.get(env.REGISTRY.idFromName('global'));
export default {async fetch(req,env){let u=new URL(req.url),p=u.pathname;try{if(p==='/api/capabilities')return json({transport:'websocket',turnSeconds:10,maxPlayers:4,maxRooms:100});if(p==='/api/create'&&req.method==='POST'){let b=await req.json();let rr=await registry(env).fetch('https://registry/reserve',{method:'POST'});if(!rr.ok)return rr;let {code}=await rr.json();let stub=env.ROOMS.get(env.ROOMS.idFromName(code));let res=await stub.fetch('https://room/init',{method:'POST',body:JSON.stringify({...b,code})});if(!res.ok)await registry(env).fetch('https://registry/release',{method:'POST',body:JSON.stringify({code})});return res}let m=p.match(/^\/api\/room\/([A-Z0-9]{6})\/(join|state|action|ws)$/);if(m){return env.ROOMS.get(env.ROOMS.idFromName(m[1])).fetch(new Request('https://room/'+m[2]+u.search,req))}if(p.startsWith('/api/'))return json({error:'notFound'},404);return env.ASSETS.fetch(req)}catch(e){return fail(e)}}};
export class RoomRegistry {constructor(ctx,env){this.ctx=ctx;this.env=env}async fetch(req){return this.ctx.blockConcurrencyWhile(async()=>{let rooms=await this.ctx.storage.get('rooms')||{};let now=Date.now();for(let k in rooms)if(rooms[k]<now)delete rooms[k];let path=new URL(req.url).pathname;if(path==='/reserve'){if(Object.keys(rooms).length>=100)return json({error:'capacity'},429);let code;do{code=crypto.randomUUID().replaceAll('-','').slice(0,6).toUpperCase()}while(rooms[code]);rooms[code]=now+7200000;await this.ctx.storage.put('rooms',rooms);return json({code})}let {code}=await req.json();if(!codeRx.test(code))return json({error:'code'},400);if(path==='/release')delete rooms[code];else if(path==='/renew'&&rooms[code])rooms[code]=now+7200000;await this.ctx.storage.put('rooms',rooms);return json({ok:true})})}}
export class GameRoom {
 constructor(ctx,env){
  this.ctx=ctx;this.env=env;
  this.ctx.blockConcurrencyWhile(async()=>{
   this.r=await ctx.storage.get('room')||null;
   if(upgradeRoomEnergy(this.r))await ctx.storage.put('room',this.r);
  });
 }
 online(except){return this.ctx.getWebSockets().filter(w=>w!==except&&(w.readyState===undefined||w.readyState===1)).map(w=>w.deserializeAttachment()?.id).filter(Boolean)}
 async persist(){
  await this.ctx.storage.put('room',this.r);
  const r=this.r,playing=r.game?.status==='playing';
  const next=Math.min(
   roomExpiry(r),nextPresenceCheck(r,this.online()),
   !r.people.length?Date.now()+1:Infinity,
   playing&&r.game.deadline?r.game.deadline:Infinity,
   playing&&Number.isFinite(r.game.turnDeadline)?r.game.turnDeadline:Infinity
  );
  // One durable alarm handles turn deadlines, the five-minute mode, and room cleanup.
  await this.ctx.storage.setAlarm(Math.max(Date.now()+1,next));
 }
 broadcast(){
  for(const w of this.ctx.getWebSockets()){
   const seat=w.deserializeAttachment();
   const p=this.r?.people.find(p=>p.id===seat?.id);
   try{if(p)w.send(JSON.stringify(viewRoom(this.r,p,this.online(),Date.now(),seat.groundEU??0)));if(!p||p.away)w.close(1000,'left')}catch{}
  }
 }
 async fetch(req){
  const url=new URL(req.url),path=url.pathname,ground=requestGround(url);
  try{return await this.ctx.blockConcurrencyWhile(async()=>{
   if(path==='/init'&&req.method==='POST'){
    if(this.r)return json({error:'exists'},409);
    const b=await req.json();this.r=newRoom(b.code,b.name,b.limit,b.mode);await this.persist();
    const p=this.r.people[0];return json({code:b.code,id:p.id,secret:p.secret});
   }
   if(!this.r||Date.now()>=roomExpiry(this.r))return json({error:'notFound'},404);
   if(path==='/join'&&req.method==='POST'){
    const b=await req.json(),result=joinRoom(this.r,b.name,secretOf(req),Date.now(),this.online());await this.persist();this.broadcast();
    return json({...result,code:this.r.code});
   }
   const secret=path==='/ws'?url.searchParams.get('token'):secretOf(req);
   const p=auth(this.r,secret);if(!p)return json({error:'auth'},403);
   const now=Date.now(),version=this.r.version;
   if(path==='/state'&&req.method==='GET'||path==='/action'&&req.method==='POST'){
    const action=path==='/action'?decodeRoomAction(await req.json(),ground):null;
    const outcome=applyRoomRequest(this.r,p,action,now,this.online());
    if(outcome.dirty)await this.persist();
    if(version!==this.r.version)this.broadcast();
    if(outcome.error)return json({error:outcome.error},400);
    if(now>=roomExpiry(this.r))return json({error:'notFound'},404);
    return json(viewRoom(this.r,p,this.online(),now,ground));
   }
   if(path==='/ws'&&req.headers.get('Upgrade')?.toLowerCase()==='websocket'){
    const dirty=actRoom(this.r,p,null,now,this.online());
    if(p.away||!this.r.people.includes(p)){
     if(dirty){await this.persist();this.broadcast();}
     return json({error:'away'},403);
    }
    const pair=new WebSocketPair(),[client,server]=Object.values(pair);
    this.ctx.acceptWebSocket(server);server.serializeAttachment({id:p.id,groundEU:ground});
    await this.persist();this.broadcast();
    return new Response(null,{status:101,webSocket:client});
   }
   return json({error:'notFound'},404);
  })}catch(e){return fail(e)}
 }
 async webSocketMessage(ws,msg){if(msg==='ping')ws.send('pong')}
 async webSocketClose(ws){
  try{ws.close()}catch{}
  return this.ctx.blockConcurrencyWhile(async()=>{
   if(!this.r)return;
   const id=ws.deserializeAttachment()?.id,others=this.online(ws);
   const seat=this.r.people.find(q=>q.id===id);
   if(!others.includes(id)&&seen(this.r,seat,Date.now(),true))await this.persist();
   this.broadcast();
  });
 }
 async webSocketError(ws){return this.webSocketClose(ws)}
 async alarm(){
  return this.ctx.blockConcurrencyWhile(async()=>{
   if(!this.r)return;
   const now=Date.now();
   if(now>=roomExpiry(this.r)||!this.r.people.length){
    const code=this.r.code;
    for(const w of this.ctx.getWebSockets())try{w.close(1000,'expired')}catch{}
    this.r=null;await this.ctx.storage.deleteAll();
    await registry(this.env).fetch('https://registry/release',{method:'POST',body:JSON.stringify({code})});
    return;
   }
   // tickRoom is idempotent for an already-processed deadline, including retried alarms.
   const changed=tickRoom(this.r,now,this.online());
   await this.persist();
   if(changed)this.broadcast();
  });
 }
}

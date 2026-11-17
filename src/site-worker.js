// Sites deployment adapter. The standalone Cloudflare Worker retains WebSocket Durable Objects.
import {newRoom,joinRoom,auth,applyRoomRequest,viewRoom,roomExpiry} from './room.js';
const json=(o,status=200)=>Response.json(o,{status,headers:{'Cache-Control':'no-store'}});
function database(env){if(!env.DB)throw Error('database');return env.DB.withSession?env.DB.withSession('first-primary'):env.DB}
async function getRoom(db,code){const row=await db.prepare('SELECT state, version, expires FROM game_rooms WHERE code = ?').bind(code).first();if(!row||row.expires<=Date.now())return null;return {r:JSON.parse(row.state),version:row.version}}
async function commit(db,r,version){const out=await db.prepare('UPDATE game_rooms SET state = ?, version = version + 1, expires = ? WHERE code = ? AND version = ?').bind(JSON.stringify(r),roomExpiry(r),r.code,version).run();return out.meta.changes===1}
async function requestBody(req){const str=await req.text();if(str.length>12000)throw Error('body');return JSON.parse(str||'{}')}
export default {async fetch(req,env){const u=new URL(req.url),p=u.pathname;try{
 if(p==='/api/capabilities')return json({transport:'polling',maxPlayers:4,maxRooms:100});
 if(!p.startsWith('/api/'))return serveAsset(req);
 if(req.method==='POST'){const origin=req.headers.get('origin');if(origin&&origin!==u.origin)return json({error:'origin'},403)}
 const db=database(env);
 if(p==='/api/create'&&req.method==='POST'){
  const b=await requestBody(req);await db.prepare('DELETE FROM game_rooms WHERE expires < ?').bind(Date.now()).run();
  for(let i=0;i<5;i++){const code=crypto.randomUUID().replaceAll('-','').slice(0,6).toUpperCase(),r=newRoom(code,b.name,b.limit,b.mode);const out=await db.prepare('INSERT OR IGNORE INTO game_rooms (code, version, state, expires) SELECT ?, 1, ?, ? WHERE (SELECT COUNT(*) FROM game_rooms) < 100').bind(code,JSON.stringify(r),roomExpiry(r)).run();if(out.meta.changes===1)return json({code,id:r.host,secret:r.people[0].secret})}
  return json({error:'capacity'},429);
 }
 const m=p.match(/^\/api\/room\/([A-Z0-9]{6})\/(join|state|action|ws)$/);if(!m)return json({error:'notFound'},404);
 if(m[2]==='ws')return json({error:'polling'},426);
 if(m[2]==='state'&&req.method!=='GET'||['action','join'].includes(m[2])&&req.method!=='POST')return json({error:'method'},405);
 const body=req.method==='POST'?await requestBody(req):null,secret=req.headers.get('authorization')?.replace(/^Bearer /,'')||'';
 for(let i=0;i<4;i++){
  const row=await getRoom(db,m[1]);if(!row)return json({error:'notFound'},404);const {r,version}=row;
  if(m[2]==='join'){const result=joinRoom(r,body.name,secret);if(await commit(db,r,version))return json({...result,code:r.code});continue}
  const person=auth(r,secret);if(!person)return json({error:'auth'},403);const outcome=applyRoomRequest(r,person,m[2]==='action'?body:null);
  if(outcome.dirty&&!await commit(db,r,version))continue;
  if(outcome.error)return json({error:outcome.error},400);
  if(Date.now()>=roomExpiry(r))return json({error:'notFound'},404);
  return json(viewRoom(r,person,r.people.map(p=>p.id)));
 }
 return json({error:'conflict'},409);
 }catch(e){return json({error:e.message||'request'},400)}}};

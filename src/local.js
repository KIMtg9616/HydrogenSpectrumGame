import {releaseHeaders} from './release-headers.js';
import http from 'node:http';import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';import {newRoom,joinRoom,auth,actRoom,viewRoom,tickRoom,roomExpiry,requestGround,decodeRoomAction} from './room.js';
const root=fileURLToPath(new URL('../public/',import.meta.url));const rooms=new Map();const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};const send=(res,data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data))};const body=async req=>JSON.parse(await new Promise((ok,no)=>{let a='';req.on('data',c=>a+=c);req.on('end',()=>ok(a||'{}'));req.on('error',no)}));
http.createServer(async(req,res)=>{let u=new URL(req.url,'http://localhost');try{if(u.pathname==='/api/capabilities')return send(res,{transport:'polling'});if(u.pathname==='/api/create'&&req.method==='POST'){if(rooms.size>=100)throw Error('capacity');let b=await body(req),code;do{code=crypto.randomUUID().replaceAll('-','').slice(0,6).toUpperCase()}while(rooms.has(code));let r=newRoom(code,b.name,b.limit,b.mode);rooms.set(code,r);return send(res,{code,id:r.host,secret:r.people[0].secret})}let m=u.pathname.match(/^\/api\/room\/([A-Z0-9]{6})\/(join|state|action|ws)$/);if(m){
 const r=rooms.get(m[1]),endpoint=m[2],secret=req.headers.authorization?.replace(/^Bearer /,'')||'';
 if(!r||Date.now()>=roomExpiry(r))return send(res,{error:'notFound'},404);
 if(endpoint==='join'&&req.method==='POST')return send(res,{...joinRoom(r,(await body(req)).name,secret),code:r.code});
 const p=auth(r,secret);if(!p)return send(res,{error:'auth'},403);
 if(endpoint==='ws')return send(res,{error:'polling'},426);
 if(endpoint==='state'&&req.method==='GET'||endpoint==='action'&&req.method==='POST'){
  actRoom(r,p,endpoint==='action'?decodeRoomAction(await body(req),requestGround(u)):null);
  return send(res,viewRoom(r,p,r.people.map(q=>q.id),Date.now(),requestGround(u)));
 }
 return send(res,{error:'method'},405);
}let f=path.resolve(root,'.'+(u.pathname==='/'?'/index.html':u.pathname));if(!f.startsWith(path.resolve(root)+path.sep))return send(res,{},403);if (u.pathname.startsWith('/downloads/') && !['GET','HEAD'].includes(req.method)) {
  res.writeHead(405,{Allow:'GET, HEAD'}); return res.end();
}
const data=await fs.readFile(f);
res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream',...releaseHeaders(u,data.length)});
res.end(req.method==='HEAD'?undefined:data)}catch(e){send(res,{error:e.code==='ENOENT'?'notFound':e.message},e.code==='ENOENT'?404:400)}}).listen(Number(process.env.PORT)||Number(process.argv[process.argv.indexOf('--port')+1])||8787,'0.0.0.0',()=>console.log('Hydrogen Spectrum local: http://localhost:'+(Number(process.env.PORT)||Number(process.argv[process.argv.indexOf('--port')+1])||8787)));setInterval(()=>{for(let [code,r] of rooms){tickRoom(r);if(Date.now()>=roomExpiry(r)||!r.people.length)rooms.delete(code)}},250).unref();

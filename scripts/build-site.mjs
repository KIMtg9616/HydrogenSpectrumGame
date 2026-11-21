import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {releaseHeaders} from '../src/release-headers.js';
const root=process.cwd(),out=path.join(root,'dist');
await fs.rm(out,{recursive:true,force:true});await fs.mkdir(path.join(out,'server'),{recursive:true});await fs.mkdir(path.join(out,'.openai'),{recursive:true});
const assets={},mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
async function walk(dir){for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())await walk(p);else {const bytes=await fs.readFile(p),url='/'+path.relative(path.join(root,'public'),p).replaceAll(path.sep,'/');assets[url]={size:bytes.length,b:bytes.toString('base64'),t:mime[path.extname(p)]||'application/octet-stream',e:crypto.createHash('sha256').update(bytes).digest('hex').slice(0,16)}}}}await walk(path.join(root,'public'));
// STORE archives contain the same image, font and GIF bytes we already serve.
// Keep one copy in the Worker and reconstruct each original ZIP byte-for-byte.
const shareable=Object.entries(assets)
 .filter(([url,a])=>!url.endsWith('.zip')&&a.size>=1024)
 .map(([url,a])=>({url,bytes:Buffer.from(a.b,'base64')}));
for(const [url,asset] of Object.entries(assets)){
 if(!url.endsWith('.zip'))continue;
 const zip=Buffer.from(asset.b,'base64');
 const matches=shareable.map(({url,bytes})=>({url,at:zip.indexOf(bytes),size:bytes.length}))
  .filter(m=>m.at>=0).sort((a,b)=>a.at-b.at||b.size-a.size);
 if(!matches.length)continue;
 const parts=[];
 let cursor=0;
 for(const m of matches){
  if(m.at<cursor)continue;
  if(m.at>cursor)parts.push({b:zip.subarray(cursor,m.at).toString('base64')});
  parts.push({asset:m.url});cursor=m.at+m.size;
 }
 if(cursor<zip.length)parts.push({b:zip.subarray(cursor).toString('base64')});
 delete asset.b;asset.parts=parts;
}
const engine=(await fs.readFile('public/engine.js','utf8')).replace(/^export /gm,'');
const room=(await fs.readFile('src/room.js','utf8')).replace(/^import .*?;\n/,'').replace(/^export /gm,'');
const worker=(await fs.readFile('src/site-worker.js','utf8')).replace(/^import .*?;\n/m,'');
const serve = `const STATIC_ASSETS=${JSON.stringify(assets)};
${releaseHeaders.toString()}
function decoded(base64) {
  if (Uint8Array.fromBase64) return Uint8Array.fromBase64(base64);
  const binary=atob(base64), bytes=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
  return bytes;
}
function assetBytes(asset) {
  if(!asset.parts)return decoded(asset.b);
  const bytes=new Uint8Array(asset.size);
  let cursor=0;
  for(const part of asset.parts){
    const chunk=decoded(part.asset?STATIC_ASSETS[part.asset].b:part.b);
    bytes.set(chunk,cursor);cursor+=chunk.length;
  }
  return bytes;
}
function serveAsset(req) {
  const url = new URL(req.url);
  const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
  const asset = STATIC_ASSETS[pathname];
  if (!asset) return new Response('Not found', {status:404});
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return new Response('Method not allowed', {status:405, headers:{Allow:'GET, HEAD'}});
  }
  const headers = {
    'Content-Type': asset.t,
    'Cache-Control': pathname === '/sw.js' ? 'no-cache' : 'public, max-age=300',
    'ETag': '"' + asset.e + '"',
    'X-Content-Type-Options': 'nosniff',
    ...releaseHeaders(url, asset.size)
  };
  if (req.headers.get('if-none-match') === headers.ETag) return new Response(null, {status:304, headers});
  if (req.method === 'HEAD') return new Response(null, {headers});
  return new Response(assetBytes(asset), {headers});
}
`;
await fs.writeFile(path.join(out,'server/index.js'),engine+'\n'+room+'\n'+serve+'\n'+worker);
await fs.copyFile('.openai/hosting.json',path.join(out,'.openai/hosting.json'));
await fs.cp('drizzle',path.join(out,'drizzle'),{recursive:true});
const manifest=JSON.parse(await fs.readFile('.openai/hosting.json','utf8'));
await fs.writeFile(path.join(out,'server/wrangler.json'),JSON.stringify({name:'hydrogen-spectrum-sites',main:'index.js',compatibility_date:'2026-04-01',d1_databases:[{binding:manifest.d1,database_name:'site-creator-d1',database_id:'00000000-0000-0000-0000-000000000000',migrations_dir:'../drizzle'}]},null,2));
console.log('Built self-contained Worker with '+Object.keys(assets).length+' assets and D1 room adapter');

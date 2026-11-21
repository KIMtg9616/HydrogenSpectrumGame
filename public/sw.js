const CACHE='hydrogen-v99-room-social-1';
const SHELL=[
  '/','/index.html','/style.css','/app.js','/prism.js','/engine.js','/i18n.js',
  '/audio.js','/synth.js','/effects.js','/presentation.js','/token-events.js','/art/observatory.webp','/art/spectroscope.webp','/rulebook.js','/rulebook.css','/optics.css','/room-chat.js','/draw-window.js','/room-social.css','/atmosphere.js','/field-guide.js',
  '/fonts/reading.woff2','/fonts/display.woff2','/fonts/reading-bold.woff2',
  '/icon.svg','/icon-192.png','/icon-512.png','/manifest.webmanifest',
  ...Array.from({length:23},(_,i)=>'/cards/card'+i+'.png')
];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(names=>Promise.all(
    names.filter(name=>name.startsWith('hydrogen-')&&name!==CACHE).map(name=>caches.delete(name))
  )).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const req=event.request,url=new URL(req.url);
  if (req.method!=='GET'||url.origin!==location.origin||url.pathname.startsWith('/api/')) return;
  if (!SHELL.includes(url.pathname)&&req.mode!=='navigate') return;
  event.respondWith((async()=>{
    try {
      const response=await fetch(req);
      if (response.ok&&SHELL.includes(url.pathname)) {
        const copy=response.clone();
        event.waitUntil(caches.open(CACHE).then(cache=>cache.put(url.pathname,copy)).catch(()=>{}));
      }
      return response;
    } catch {
      const cache=await caches.open(CACHE);
      const saved=await cache.match(url.pathname);
      if (saved) return saved;
      return (req.mode==='navigate'&&await cache.match('/'))||Response.error();
    }
  })());
});

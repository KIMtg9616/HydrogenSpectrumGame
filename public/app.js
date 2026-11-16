import {LEVELS,LINES,player,createGame,apply,actions,active,botMove,tickGame,turnToken,TURN_SECONDS,target,stock} from './engine.js';
import {tr} from './i18n.js';
import {sound,setFX,setMusic,setScene,speak,unlockAudio,getVolumes,setVolume} from './audio.js';
import {startStars,setReduced,isReduced,clearEffects,captureCard,playLight,auditionLight,celebrate,chosenEffect,toggleEffect,touchLight,mountField} from './effects.js';
import {lineInstrument,benchReading,playStyle,signalReading,cardSurface,lastCard,finalSpectrum,resultPlate} from './presentation.js';
import {guideMarkup,bindGuide} from './field-guide.js';
const $=s=>document.querySelector(s),app=$('#app'),modal=$('#modal');
const safeJSON=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
let lang=['ko','en','ja','zh'].includes(localStorage.getItem('hs-lang'))?localStorage.getItem('hs-lang'):'ko',fx=localStorage.getItem('hs-fx')!=='0',music=localStorage.getItem('hs-music')!=='0',voice=localStorage.getItem('hs-voice')==='1',session=null,room=null,game=null,me='you',screen='home',online=false,ws=null,poll=null,botTimer=null,redrawMode=false,busy=false,lastSeq=0,installPrompt=null,chosenMode=localStorage.getItem('hs-mode')||'normal',pending=[],prevEnergy=null,prevHand=[],turnKey='',pollingOnly=false,notifyTimer,lastSocketTry=0,serverOffset=0,clockSync=false,clockSyncAt=0,warnedTurn='',warnedSeconds=new Set();
const t=k=>tr(k,lang),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let auditionLine=LINES.find(l=>l.s==='Hα');
const nameOf=p=>esc(p?.name||''),colors=['#e8c783','#8bb6ff','#d1a3f8','#82d9ba'];
const paths={music:'M4 19V5l14-2v14M4 8l14-2M4 16c-4-1-4 5 0 4 2 0 2-3 0-4Zm14-2c-4-1-4 5 0 4 2 0 2-3 0-4Z',settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm-2-5 4 0 1 3 3 1 3-1 2 4-2 2 0 3 2 2-2 4-3-1-3 1-1 3h-4l-1-3-3-1-3 1-2-4 2-2v-3l-2-2 2-4 3 1 3-1Z',full:'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5',solo:'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM4 21v-3a8 8 0 0 1 16 0v3',ai:'M7 7h10a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-8a3 3 0 0 1 3-3Zm5-4v4M8 12v2m8-2v2m-8 3h8M1 12v5m22-5v5',online:'M9 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM2 19v-2a7 7 0 0 1 14 0v2M17 4a3 3 0 0 1 0 6m3 9v-2a7 7 0 0 0-3-6',observe:'M3 20h18M6 16V9m6 7V4m6 12v-5M3 3l18 18'};
const icon=n=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[n]||paths.observe}"/></svg>`;
function notify(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(notifyTimer);notifyTimer=setTimeout(()=>$('#toast').classList.remove('show'),3600);if(voice)speak(message,lang)}
function dialogClock(){return game?.status==='playing'?`<div class="dialog-turn-clock"><span>${t('timeRemaining')}</span><b data-dialog-time>10.0${t('seconds')}</b></div>`:''}
function showDialog(html,title,view='info') {
 modal.dataset.view=view;
 modal.onkeydown=null;
 const body=$('#modalBody');
 body.oninput=null;
 body.innerHTML=`<h2 id="dialogTitle" tabindex="-1">${title}</h2>${dialogClock()}${html}`;
 $('#closeModal').setAttribute('aria-label',t('close'));
 if (!modal.open) modal.showModal();
 modal.scrollTop=0;
 $('#dialogTitle').focus({preventScroll:true});
}
function closeTurnChoice() {
 if (modal.open&&modal.dataset.view==='choice') modal.close();
 if (game?.status!=='playing') modal.querySelector('.dialog-turn-clock')?.remove();
}
function focusApp(){app.focus({preventScroll:true})}
function label(c){return c.kind==='energy'?`${t(c.v>0?'absorb':'emit')} ${c.v>0?'+':''}${c.v}`:t(c.kind)}
function options(){return ['normal','speed','timed','learn'].map(m=>`<option value="${m}" ${m===chosenMode?'selected':''}>${t(m)}</option>`).join('')}
function field(key,control){return `<label class="field">${t(key)}${control}</label>`}
function science(){return `<div class="science-note"><span aria-hidden="true">i</span><p>${t('science')} ${t('notOrbit')}</p></div>`}
function home(){clearEffects();screen='home';document.body.dataset.screen='home';setScene('home');app.innerHTML=`<section class="hero observatory-hero">
 <picture class="observatory-photo" aria-hidden="true"><img src="/art/observatory.webp" alt="" fetchpriority="high" width="1774" height="887"></picture>
 <div class="observatory-copy"><h1>HYDROGEN<br><em>SPECTRUM</em></h1><h2>${t('hero')}</h2><p class="intro">${t('intro')}</p>
 <div class="hero-facts"><span><b>1–4</b> ${t('playersUnit')}</span><span><b>79</b> ${t('cardsUnit')}</span><span><b>6</b> ${t('linesUnit')}</span></div>
 <div class="hero-actions"><button data-act="solo">${t('playNow')} <span class="arrow">↗</span></button><button class="secondary" data-act="rules">${t('howTo')}</button></div></div></section>
 ${lineInstrument(t,auditionLine)}<div class="section-heading"><h2>${t('chooseExperience')}</h2><span class="line"></span></div><section class="launch">${['solo','ai','online'].map((key,i)=>`<article class="launch-card ${i===0?'featured':''}"><div class="launch-top"><span class="launch-icon">${icon(key)}</span><span class="mono">0${i+1} / ${['EXPLORE','CHALLENGE','CONNECT'][i]}</span></div><h3>${t(key)}</h3><p>${t(key+'Desc')}</p><div class="launch-bottom">${i===0?`<small>3–5 MIN / SOLO</small><button data-act="solo">${t('start')} ↗</button>`:i===1?`<select id="bots" aria-label="${t('opponents')}">${[1,2,3].map(n=>`<option value="${n}" ${n===3?'selected':''}>AI × ${n}</option>`).join('')}</select><button class="secondary" data-act="ai">${t('start')} ↗</button>`:`<button class="secondary" data-act="create">${t('create')} ↗</button><button class="quiet" data-act="joinDialog">${t('roomJoin')}</button>`}</div></article>`).join('')}</section><div class="home-meta"><span>${t('soundHint')}</span><div class="strip"><button class="quiet" data-act="gallery">${t('cardGallery')} ↗</button><button class="quiet" data-act="history">${t('activity')} ↗</button><button class="quiet" data-act="install">${t('install')} ↗</button></div></div><section class="config" aria-label="${t('customize')}">${field('name',`<input id="nickname" maxlength="20" autocomplete="nickname" value="${esc(localStorage.getItem('hs-name')||'Player')}">`)}${field('mode',`<select id="mode">${options()}</select>`)}${field('roomSize',`<select id="limit"><option>2</option><option>3</option><option selected>4</option></select>`)}${localStorage.getItem('hs-session')?`<button class="secondary" data-act="restore">${t('restore')}</button>`:''}</section>${science()}`;$('#mode').onchange=e=>{chosenMode=e.target.value;localStorage.setItem('hs-mode',chosenMode)};$('#nickname').onchange=e=>localStorage.setItem('hs-name',e.target.value.trim()||'Player');mountField($('.observatory-hero'),'home');if(new URLSearchParams(location.search).has('room')&&!session){const code=new URLSearchParams(location.search).get('room');history.replaceState(null,'',location.pathname);joinDialog(code)}}
function miniSpectrum(p){return `<div class="mini-lines" aria-label="${p.tokens.length} / ${target(game)}">${LINES.map(l=>`<i data-mini-line="${l.e}" style="--c:${l.c}" class="${p.tokens.includes(l.e)?'lit':''}" title="${l.s} · ${l.w} nm"></i>`).join('')}</div>`}
function players(){return `<section class="players" aria-label="${t('participants')}">${game.players.map((p,i)=>`<div class="player ${i===game.turn&&game.status==='playing'?'active':''}" data-player="${esc(p.id)}"><div class="player-head"><span class="avatar" style="--pc:${colors[i]}">${p.bot?'AI':esc(p.name.slice(0,1).toUpperCase())}</span><div class="player-name"><b>${nameOf(p)}${p.id===me?' · '+t('you'):''}</b><small>E ${p.energy} · ${i===game.turn&&game.status==='playing'?t('turn'):p.bot?'COMPUTER':'PLAYER'}</small></div><span class="player-score">${p.tokens.length}<small>/${target(game)}</small></span></div>${miniSpectrum(p)}</div>`).join('')}</section>`}
function spectrum(p){return `<section class="spectrum"><div class="spectrum-head"><div><small>YOUR COLLECTION / HYDROGEN EMISSION</small><h3>${t('spectrum')}</h3></div><span class="collection-count">${p.tokens.length.toString().padStart(2,'0')}<small> / ${String(target(game)).padStart(2,'0')}</small></span></div><div class="spectrum-grid">${LINES.map(l=>`<button class="slot ${p.tokens.includes(l.e)?'lit':''}" style="--c:${l.c}" data-line="${l.e}" aria-label="${l.s}, ${l.w} nm, ${p.tokens.includes(l.e)?t('collected'):t('waiting')}"><span class="token-mark">✓</span><span class="slot-inner"></span><b>${l.s}</b><small>${l.w} nm</small><small>ΔE ${l.e}</small></button>`).join('')}</div><div class="spectrum-foot"><span>${t('symbolic')}</span><span>${t('spectrumHint')}</span></div></section>`}
function logText(l){if(l.key==='timeout')return `${esc(l.who)} · ${t('timeoutLog')}`;if(l.key==='draw')return `${esc(l.who)} · ${t('drawLog')}`;if(l.key==='pass')return `${esc(l.who)} · ${t('passLog')}`;if(l.key==='redraw')return `${esc(l.who)} · ${t('redraw')}`;if(l.key==='time')return t('time');if(l.key==='win')return `${esc(l.who)} · ${t('winner')}`;let x=`${esc(l.who)} · ${l.kind==='energy'?t(l.to>l.from?'absorb':'emit'):t(l.kind)}`;if(l.to!==undefined)x+=` ${l.from} → ${l.to}`;if(l.nonTarget)x+=`<br>${t('nonTarget')}`;if(l.e!==undefined)x+=` · ${LINES.find(x=>x.e===l.e)?.s||l.e}${l.gain===false?' ('+t('noStock')+')':''}`;if(l.other)x+=` · ${esc(l.other)}`;return x}
function renderGame(){
 if(!game)return;screen='game';document.body.dataset.screen='game';setScene(game.status==='ended'?'result':'game',game.players.some(q=>q.tokens.length>=target(game)-1));const p=game.players.find(p=>p.id===me),turn=active(game),mine=turn.id===me&&game.status==='playing';if(!p)return;
 const ended=game.status==='ended',hand=mine&&game.phase==='choose'?game.hand:[],idx=5-LEVELS.indexOf(p.energy),old=prevEnergy===null?idx:5-LEVELS.indexOf(prevEnergy);prevEnergy=p.energy;
 const dealt=new Set(hand.filter(c=>!prevHand.includes(c.id)).map(c=>c.id));
 prevHand=hand.map(c=>c.id);
 const latestPlay=[...game.log].reverse().find(e=>e.key==='play');
 const usable=hand.some(c=>actions(game,c,p).length),title=ended?t('endJourney'):mine?(game.phase==='draw'?t('readyToDraw'):redrawMode?t('redrawHint'):t('choose')):`${nameOf(turn)} · ${t('turn')}`;
 app.innerHTML=`<div class="game-head"><div><p class="eyebrow">${online?'ROOM '+esc(room.code):'QUANTUM LAB / '+t('local')} · ${t(game.mode)}</p><h2><span class="status-orb"></span>${ended?t('endJourney'):mine?t('yourTurn'):nameOf(turn)+' · '+t('turn')}</h2></div><div class="strip"><span class="pill gold">${t('round')} <b class="mono">${String(game.round).padStart(2,'0')}</b></span>${!ended?`<span class="pill turn-clock-pill" id="turnClock" role="timer" aria-live="off" aria-label="${t('turnTime')}">◷ ${t('turnTime')} <b data-turn-time>10.0${t('seconds')}</b></span>`:''}${game.deadline?`<span class="pill gold" id="clock" title="${t('gameTime')}"></span>`:''}<span class="pill">${t('deck')} ${game.deckCount??game.deck?.length??0}</span><span class="pill">${t('discard')} ${game.discardCount??game.discard?.length??0}</span>${online?`<span class="pill" id="connection"><i class="live-dot"></i>${pollingOnly?t('networkPolling'):ws?.readyState===1?t('connected'):t('reconnecting')}</span>`:''}<button class="quiet" data-act="leave">${t('menu')} ↗</button></div></div>${players()}${ended?`<section class="win">${resultPlate(game)}<div><h2>${game.log.at(-1)?.key==='time'?t('time'):game.winner.includes(me)?t('win'):t('lose')}</h2><p>${game.winner.map(id=>nameOf(game.players.find(q=>q.id===id))).join(' · ')} — ${t('winner')}</p></div><div class="controls">${!online||room.host===me?`<button data-act="again">${t('again')} ↗</button>`:''}<button class="secondary" data-act="leave">${t('menu')}</button></div></section>`:''}<div class="arena"><section class="panel energy-panel"><div class="panel-top"><div><p class="eyebrow">ENERGY STATE</p><h3>${t('energy')}</h3></div><span class="panel-num">H · 01</span></div><div class="energy-head"><div class="energy-value">${p.energy}<small>EU</small></div><span>n = ${LEVELS.indexOf(p.energy)+1}</span></div><div class="energy"><div class="electron ${old!==idx?'move':''}" style="--from:${old};--to:${idx}" aria-label="${t('current')} ${p.energy}">e⁻</div>${[...LEVELS].reverse().map((e,i)=>`<div class="level ${e===p.energy?'current':''}" data-energy="${e}"><small>n = ${6-i}</small><div class="rail"></div><strong>${e}</strong></div>`).join('')}</div>${signalReading(latestPlay,t,esc(latestPlay?.who))}<p id="energyCaption" class="energy-caption">${game.mode==='learn'?t('hint'):t('hoverHint')}</p></section><section class="panel game-center"><div class="turn-heading"><div><p class="eyebrow">${ended?'SPECTRUM':'YOUR NEXT MOVE'}</p><h3 aria-live="polite">${title}</h3><p class="turn-label">${ended?t('score')+' '+p.tokens.length+'/'+target(game):mine?(game.phase==='draw'?t('drawHint'):t('chooseHint')):t('waiting')}</p></div>${latestPlay?lastCard(latestPlay,t,esc(latestPlay.who)):`<div class="deck-meta">${t('deck')} <b>${game.deckCount??game.deck?.length??0}</b><br>${t('discard')} <b>${game.discardCount??game.discard?.length??0}</b></div>`}</div>${!ended?`<div class="turn-countdown" id="turnCountdown"><div><span>${t('timeRemaining')}</span><b data-turn-time>10.0${t('seconds')}</b></div><div class="turn-timebar"><i id="turnTimeFill"></i></div><small>${t('turnShort')}</small></div>`:''}${ended?`${finalSpectrum(p,t)}`:mine&&game.phase==='choose'?`<div class="cards">${hand.map((c,i)=>{const valid=actions(game,c,p).length>0;return `<button class="gamecard ${valid||redrawMode?'good':'bad'}" data-card="${c.id}" ${!redrawMode&&!valid?'disabled':''} aria-label="${esc(label(c))} · ${t(valid?'valid':'invalid')}">${cardSurface(c,i,valid,dealt.has(c.id))}<span class="desc">${esc(label(c))}<small>${redrawMode?t('redraw'):t(valid?'valid':'invalid')}${game.mode==='learn'&&c.kind==='energy'?' · '+p.energy+(c.v>=0?'+':'')+c.v+' = '+(p.energy+c.v):''}</small></span></button>`}).join('')}</div>${!usable&&!redrawMode?`<p class="hint-banner">${t('noMoves')}</p>`:''}<div class="controls">${game.redraw&&!game.redrawn?`<button class="secondary" data-act="redrawMode">↻ ${redrawMode?t('cancel'):t('redrawAvailable')}</button>`:''}<button class="quiet" data-act="pass">${t('pass')} →</button></div>`:`<div class="deck"><div class="deck-stack" ${mine?'data-act="draw" role="button" tabindex="0"':''} aria-label="${t('draw')}"><img src="/cards/card22.png" alt="${t('deck')}" draggable="false"></div>${!mine?'<span class="waiting-orbit" aria-hidden="true"></span>':''}<button data-act="draw" ${mine?'':'disabled'}>${mine?t('draw'):t('waiting')} ${mine?'<span class="kbd">D</span>':''}</button><p class="subtle">${mine?t('drawHint'):nameOf(turn)+' · '+t('turn')}</p></div>`}${game.mode==='learn'?`<div class="hint-banner">${t('hint')}</div>`:''}${ended?'':`<p class="keyboard-note">${t('keyboard')}</p>`}</section>${spectrum(p)}<aside class="side"><section class="panel activity-panel"><div class="panel-top"><div><p class="eyebrow">OBSERVATION</p><h3>${t('observe')}</h3></div><span class="panel-num">LIVE</span></div><div class="activity">${game.log.slice().reverse().map(l=>`<div class="log"><i></i><span>${logText(l)}</span></div>`).join('')||`<div class="empty-log"><div>${icon('observe')}<br>${t('emptyDesc')}</div></div>`}</div></section><section class="panel"><div class="panel-top"><h3>${t('stats')}</h3><span class="panel-num">${t('you')}</span></div><div class="stats">${[['turns',p.stats.turns],['transitions',p.stats.transitions],['cards',p.stats.cards],['photons',p.stats.photons]].map(([k,v])=>`<div class="stat"><b>${String(v).padStart(2,'0')}</b>${t(k)}</div>`).join('')}</div><div class="progress-track" style="--progress:${Math.min(100,p.tokens.length/target(game)*100)}%"><i></i></div><p class="subtle" style="margin:7px 0 0">${t('score')} ${p.tokens.length}/${target(game)}</p></section></aside></div>${science()}`;
 mountField($('.game-center'),'game');
 const energy=$('.energy');if(latestPlay)$('.game-center').style.setProperty('--stage-glow',playStyle(latestPlay).color);energy.style.setProperty('--eh',energy.offsetHeight+'px');updateClock();renderEffects();scheduleBot();
 const currentKey=game.started+':'+game.round+':'+game.turn;if(mine&&game.phase==='draw'&&turnKey!==currentKey){turnKey=currentKey;if(game.round>1&&game.players.length>1){$('.player.active')?.classList.add('turn-arrived');sound('turn');if(voice)speak(t('yourTurn'),lang)}}
}
function previewCard(id){if(!game||screen!=='game')return;const c=game.hand.find(x=>x.id===id),p=game.players.find(x=>x.id===me);if(!c||!p)return;const opts=actions(game,c,p);document.querySelectorAll('.level.predicted').forEach(x=>x.classList.remove('predicted'));opts.forEach(o=>{if(o.to!==undefined)$(`[data-energy="${o.to}"]`)?.classList.add('predicted')});const cap=$('#energyCaption');if(!cap)return;cap.classList.add('preview');if(c.kind==='energy'){const to=p.energy+c.v,l=LINES.find(l=>l.from===p.energy&&l.to===to);cap.textContent=`${p.energy} ${c.v>=0?'+':'−'} ${Math.abs(c.v)} = ${to} · ${!opts.length?t('invalid'):l&&!p.tokens.includes(l.e)&&stock(game,l.e)>0?t('collectLine')+' / '+l.s+' '+l.w+' nm':t('noToken')}`}else cap.textContent=label(c)+' · '+(opts.some(o=>o.to!==undefined)?t('previewLevel')+': '+opts.map(o=>o.to).join(' · '):t('pick'))}
function clearPreview(){document.querySelectorAll('.level.predicted').forEach(x=>x.classList.remove('predicted'));const cap=$('#energyCaption');if(cap){cap.classList.remove('preview');cap.textContent=game?.mode==='learn'?t('hint'):t('hoverHint')}}
function collectEvents(){const fresh=game?.log.filter(x=>x.seq>lastSeq)||[];if(fresh.length){lastSeq=fresh.at(-1).seq;if(!document.hidden)pending.push(...fresh)}if(game?.status==='ended'){const recordKey=String(game.started)+':'+me;if(localStorage.getItem('hs-last-record')!==recordKey){const p=game.players.find(q=>q.id===me);if(p){const arr=safeJSON('hs-history',[]);arr.unshift({date:new Date().toISOString(),mode:game.mode,count:p.tokens.length,goal:target(game),turns:p.stats.turns,won:game.winner.includes(me)});localStorage.setItem('hs-history',JSON.stringify(arr.slice(0,30)));localStorage.setItem('hs-last-record',recordKey)}}}}
function renderEffects() {
 const events=pending.splice(0);
 if (!events.length||document.hidden) return;
 const started=game.started;
 // Keep the full log on reconnect, but only audition its most recent event.
 const current=events.length>2?events.slice(-1):events;
 requestAnimationFrame(()=>{
  if (!game||screen!=='game'||game.started!==started||document.hidden) return;
  for (const e of current) {
   const actor=game.players.find(p=>p.id===e.whoId)||game.players.find(p=>p.name===e.who);
   const own=actor?.id===me;
   const mix={quiet:!!actor&&!own,pan:own?-.08:.20};
   if (e.key==='win'||e.key==='time') {
    const won=game.winner.includes(me);
    sound(won?'win':'finish');
    if (won) celebrate(LINES.filter(l=>game.players.some(q=>game.winner.includes(q.id)&&q.tokens.includes(l.e))));
   } else if (e.key==='timeout') {
    sound('timeout',mix); if (own) notify(t('turnExpired'));
   } else if (['draw','redraw','pass'].includes(e.key)) {
    sound(e.key,mix);
    if (!own && e.key!=='pass' && active(game).id===actor?.id && game.phase==='choose') {
      $('.deck-stack')?.classList.add('remote-deal');
    }
   } else if (e.key==='play') {
    const {kind,line}=playStyle(e);
    const matching=game.players.filter(p=>p.name===e.other);
    const victim=e.otherId||(matching.length===1?matching[0].id:undefined);
    playLight(e,line,own,actor?.id,victim,me);
    if (kind!=='wild') sound(kind,{...mix,energy:e.e});
    if (line&&e.gain) sound('collect',{...mix,energy:e.e,delay:kind==='wild'?.39:.52});
   }
  }
  const last=current.at(-1);
  if (voice&&!(last.key==='timeout'&&last.whoId===me)) speak(logText(last).replace(/<[^>]*>|&[^;]+;/g,' '),lang);
 });
}
function lobby(){mountField(null,'');clearEffects();screen='lobby';document.body.dataset.screen='lobby';setScene('home');const host=room.host===me;app.innerHTML=`<section class="panel lobby"><p class="eyebrow">CONNECT / ${t(room.mode)}</p><h2>${t('lobby')}</h2><p class="turn-limit-note">◷ ${t('turnTime')} · ${TURN_SECONDS}${t('seconds')}</p><p class="invitation-info">${t('inviteHelp')}</p><div class="room-code">${esc(room.code)}</div><div class="strip" style="justify-content:center"><span class="pill"><i class="live-dot"></i>${t('code')}</span><button class="secondary" data-act="copy">${t('copy')} ↗</button></div><div class="players">${Array.from({length:room.limit},(_,i)=>{const p=room.people[i];return p?`<div class="lobby-player ${p.ready||p.id===room.host?'ready':''}"><span class="avatar" style="--pc:${colors[i]}">${esc(p.name.slice(0,1).toUpperCase())}</span><b>${nameOf(p)} ${p.id===me?'· '+t('you'):''}</b><small>${p.id===room.host?t('host'):p.ready?'✓ '+t('ready'):t('waiting')}</small></div>`:`<div class="lobby-player empty"><div>＋<br>${t('emptySeat')}</div></div>`}).join('')}</div><span class="room-counter">${room.people.length} / ${room.limit} PLAYERS</span><div class="controls">${host?`<button data-act="startGame" ${room.people.length<2||room.people.some(p=>p.id!==me&&!p.ready)?'disabled':''}>${t('startGame')} ↗</button>`:`<button data-act="ready">${t(room.people.find(p=>p.id===me)?.ready?'unready':'ready')}</button>`}<button class="secondary" data-act="leave">${t('leave')}</button></div></section>${science()}`}
function readState(r){
 const old=room?.version??0;if(room&&r.version<old)return;
 if(Number.isFinite(r.serverNow))serverOffset=r.serverNow-Date.now();
 const previousToken=room?.game?turnToken(room.game):null;
 if(!r.game&&room?.game){lastSeq=0;redrawMode=false;prevEnergy=null;prevHand=[];pending=[]}
 const changed=!room||r.version!==old||JSON.stringify(r.people)!==JSON.stringify(room.people);
 room=r;game=r.game;me=r.me;
 if(previousToken&&(!game||game.status==='ended'||previousToken!==turnToken(game))){redrawMode=false;closeTurnChoice()}
 if(changed){if(game){collectEvents();renderGame()}else lobby()}
}

async function api(path,data,secret=session?.secret){const r=await fetch('/api/'+path,{method:data===undefined?'GET':'POST',headers:{...(data===undefined?{}:{'Content-Type':'application/json'}),...(secret?{Authorization:'Bearer '+secret}:{})},...(data===undefined?{}:{body:JSON.stringify(data)})});const j=await r.json();if(!r.ok)throw Error(j.error||'request');return j}
function stopNetwork(){clearTimeout(poll);poll=null;if(ws){ws.onclose=null;ws.close();ws=null}}
function openSocket(code){lastSocketTry=Date.now();const u=new URL('/api/room/'+code+'/ws',location.href);u.protocol=location.protocol==='https:'?'wss:':'ws:';u.searchParams.set('token',session.secret);try{ws=new WebSocket(u);ws.onmessage=e=>{if(e.data!=='pong')try{readState(JSON.parse(e.data))}catch{}};ws.onopen=()=>{if($('#connection'))$('#connection').innerHTML='<i class="live-dot"></i>'+t('connected')};ws.onclose=()=>{if($('#connection'))$('#connection').textContent=t('reconnecting')}}catch{}}
async function connect(){stopNetwork();const activeSession=session;try{const caps=await api('capabilities');if(session!==activeSession)return;pollingOnly=caps.transport==='polling'}catch{pollingOnly=false}if(!session||!online)return;const code=session.code;if(!pollingOnly)openSocket(code);const tick=async()=>{if(!online||session!==activeSession)return;try{if(pollingOnly||ws?.readyState!==1){readState(await api(`room/${code}/state`));if(!pollingOnly&&ws?.readyState===3&&Date.now()-lastSocketTry>15000)openSocket(code)}}catch(e){if(e.message==='auth'||e.message==='notFound'){notify(t('roomError'));exit();return}if($('#connection'))$('#connection').textContent=t('reconnecting')}poll=setTimeout(tick,document.hidden?4500:1100)};poll=setTimeout(tick,500)}
async function enter(s){stopNetwork();clearTimeout(botTimer);online=true;session=s;localStorage.setItem('hs-session',JSON.stringify(s));room=null;lastSeq=0;prevEnergy=null;prevHand=[];turnKey='';pending=[];const state=await api(`room/${s.code}/state`);lastSeq=state.game?.seq||0;readState(state);connect();focusApp()}
function scheduleBot(){clearTimeout(botTimer);if(!online&&game?.status==='playing'&&active(game).bot){botTimer=setTimeout(()=>{try{apply(game,active(game).id,botMove(game));collectEvents();renderGame()}catch{notify(t('roomError'))}},game.phase==='draw'?950:1400)}}
async function act(a){
 if(busy)return;busy=true;redrawMode=false;
 if(a.type==='play')captureCard(document.querySelector('[data-card="'+CSS.escape(a.card)+'"]'),game?.hand.find(c=>c.id===a.card)?.art);
 const request={...a};
 if(game&&['draw','redraw','play','pass','skip'].includes(a.type))request.expectedTurn=a.expectedTurn??turnToken(game);
 try{
  if(online)readState(await api(`room/${session.code}/action`,request));
  else{apply(game,me,request);collectEvents();renderGame()}
 }catch(e){
  sound('error');notify(t(e.message==='staleTurn'?'turnExpired':'roomError'));
  if(online)try{readState(await api(`room/${session.code}/state`))}catch{}
 }finally{busy=false}
}

function exit(){stopNetwork();clearTimeout(botTimer);online=false;session=null;room=null;game=null;lastSeq=0;pending=[];localStorage.removeItem('hs-session');if(modal.open)modal.close();home();focusApp()}
function localStart(bots=0,mode=chosenMode,name=$('#nickname')?.value||localStorage.getItem('hs-name')||'Player'){clearEffects();stopNetwork();clearTimeout(botTimer);online=false;session=null;me='you';serverOffset=0;lastSeq=0;prevEnergy=null;prevHand=[];turnKey='';redrawMode=false;pending=[];if(modal.open)modal.close();game=createGame([player(me,name),...Array.from({length:bots},(_,i)=>player('bot'+i,['NOVA','LYRA','ORION'][i],true))],mode);renderGame();focusApp();window.scrollTo({top:0,behavior:isReduced()?'instant':'smooth'})}
function updateClock(){
 if(screen!=='game'||!game)return;
 const now=Date.now()+(online?serverOffset:0);
 if(!online&&tickGame(game,now)){
  redrawMode=false;closeTurnChoice();collectEvents();renderGame();return;
 }
 const clock=$('#clock');
 if(clock&&game.deadline){
  const seconds=Math.max(0,Math.ceil((game.deadline-now)/1000));
  clock.textContent=`${t('gameTime')} ${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
  clock.style.color=seconds<30?'#ff929d':'';
 }
 if(game.status!=='playing')return;
 const milliseconds=Math.max(0,(game.turnDeadline||now)-now);
 const seconds=Math.ceil(milliseconds/1000),urgent=milliseconds<=3000;
 const text=(Math.ceil(milliseconds/100)/10).toFixed(1)+t('seconds');
 document.querySelectorAll('[data-turn-time],[data-dialog-time]').forEach(el=>el.textContent=text);
 $('#turnClock')?.classList.toggle('urgent',urgent);
 $('#turnCountdown')?.classList.toggle('urgent',urgent);
 $('.dialog-turn-clock')?.classList.toggle('urgent',urgent);
 const fill=$('#turnTimeFill');if(fill)fill.style.width=Math.min(100,milliseconds/((game.turnSeconds||TURN_SECONDS)*10))+'%';
 const token=turnToken(game);
 if(warnedTurn!==token){warnedTurn=token;warnedSeconds.clear()}
 if(active(game).id===me&&seconds>0&&seconds<=3&&!warnedSeconds.has(seconds)){
  warnedSeconds.add(seconds);sound('tick',{seconds});
 }
 if(milliseconds<=0){
  document.querySelectorAll('[data-card],[data-opt],[data-act="draw"],[data-act="pass"],[data-act="redrawMode"]').forEach(el=>{
   if(el.tagName==='BUTTON')el.disabled=true;else el.setAttribute('aria-disabled','true');
  });
  if(online&&!clockSync&&Date.now()>=clockSyncAt&&session){
   clockSync=true;clockSyncAt=Date.now()+800;
   const currentSession=session;
   api(`room/${session.code}/state`).then(r=>{if(session===currentSession&&online)readState(r)}).catch(()=>{}).finally(()=>{clockSync=false});
  }
 }
}
setInterval(updateClock,100);

function selectCard(id){if(!game||busy||active(game).id!==me)return;const c=game.hand.find(x=>x.id===id);if(!c)return;if(redrawMode){act({type:'redraw',card:id});return}const opts=actions(game,c);if(!opts.length)return;sound('select');const selectedTurn=turnToken(game),execute=o=>{if(modal.open)modal.close();act({type:'play',card:id,...o,expectedTurn:selectedTurn})};if(opts.length===1){execute(opts[0]);return}showDialog(`<p>${t('pick')}</p><div id="choices">${opts.map((o,i)=>{const from=active(game).energy,l=LINES.find(l=>o.to!==undefined?l.from===from&&l.to===o.to:l.e===o.e),gain=l&&!active(game).tokens.includes(l.e)&&stock(game,l.e)>0;return `<button class="option ${gain?'collect-choice':''}" data-opt="${i}"><span>${l?`<i class="light-swatch" style="--c:${l.c}"></i>`:''}<span>${o.to!==undefined?`E ${from} → ${o.to}<br><small>ΔE ${o.to-from>0?'+':''}${o.to-from}${gain?' · '+l.s+' / '+l.w+' nm':''}</small>`:`${o.other?nameOf(game.players.find(p=>p.id===o.other))+' · ':''}${l?.s||''} <small>${l?.w||''} nm</small>`}</span></span><span class="choice-number">${String(i+1).padStart(2,'0')} ↗</span></button>`}).join('')}</div>`,esc(label(c)),'choice');$('#choices').onclick=e=>{const b=e.target.closest('[data-opt]');if(b)execute(opts[Number(b.dataset.opt)])}}
function lineInfo(e){const l=LINES.find(l=>l.e===Number(e));if(!l)return;showDialog(`<p class="eyebrow">HYDROGEN EMISSION / ${l.s}</p><div class="copybox" style="font-size:25px;color:${l.c};text-align:center">${l.from} → ${l.to} <span style="font-size:14px">/ ΔE ${l.e}</span></div><p style="margin:18px 0 0">${t('wavelength')} <b style="color:${l.c}">${l.w} nm</b> · ${t('transition')}</p>${l.s==='UV'||l.s==='IR'?`<p>${t('invisible')} · ${t('symbolic')}</p>`:''}<p>${t('science')}</p>`,l.s+' · '+t('line'))}
function rules(){showDialog(`<button class="manual-link" data-act="gallery"><span><b>${t('cardGallery')}</b><small>${t('guideHint')}</small></span><span aria-hidden="true">↗</span></button><p>${t('intro')}</p><p class="hint-banner">${t('turnRule')}</p><div class="rule-steps">${['Draw','Move','Collect'].map((x,i)=>`<div class="rule-step"><span>0${i+1}</span><h3>${t('step'+x)}</h3><p>${t('step'+(i+1))}</p></div>`).join('')}</div><h3>${t('transition')} / 6 LINES</h3><table class="line-table"><thead><tr><th>${t('line')}</th><th>${t('transition')}</th><th>${t('wavelength')}</th></tr></thead><tbody>${LINES.map(l=>`<tr><td><i class="s-color" style="--c:${l.c}"></i>${l.s}</td><td class="mono">${l.from} → ${l.to}</td><td class="mono">${l.w} nm</td></tr>`).join('')}</tbody></table><details class="rules-expand"><summary>${t('details')}</summary><p>${t('rulesText')}</p></details><details class="rules-expand"><summary>${t('scienceTitle')}</summary><p>${t('science')} ${t('notOrbit')}</p></details><div class="controls"><button data-act="close">${t('back')}</button></div>`,t('rules'),'rules')}
function visualState(key) {
 if (key==='motion') return !isReduced();
 if (['ambient','gameFx','touchFx'].includes(key)) return chosenEffect(key);
 return {music,fx,voice,large:document.body.classList.contains('large-text')}[key];
}
function switchRow(key,title,desc='') {
 const child=['ambient','gameFx','touchFx'].includes(key);
 return `<label class="setting-row ${child?'effect-child':''}"><span>${t(title)}${desc?'<small>'+t(desc)+'</small>':''}</span><button type="button" class="toggle" role="switch" data-setting="${key}" aria-label="${t(title)}" aria-checked="${visualState(key)}" ${child&&isReduced()?'disabled':''}></button></label>`;
}
function settings() {
 const v=getVolumes();
 const volumes=[['master','master'],['music','musicVolume'],['fx','fxVolume']].map(([key,title])=>
   `<label class="volume-row">${t(title)}<input type="range" min="0" max="100" value="${Math.round(v[key]*100)}" data-volume="${key}"><output>${Math.round(v[key]*100)}%</output></label>`).join('');
 showDialog(`<p class="settings-note">${t('saved')}</p><div class="settings-group"><h3>${t('visualGroup')}</h3>
 ${switchRow('motion','motionMaster','motionDetail')}${switchRow('ambient','ambient','ambientDesc')}${switchRow('gameFx','gameFx','gameFxDesc')}${switchRow('touchFx','touchFx','touchFxDesc')}</div>
 <div class="settings-group"><h3>${t('readGroup')}</h3>${switchRow('large','largeText')}</div>
 <div class="settings-group"><h3>${t('audioGroup')}</h3>${switchRow('music','music','musicDesc')}${switchRow('fx','sound','sfxDesc')}${switchRow('voice','voice','voiceDesc')}<div class="mix-levels">${volumes}</div></div>`,t('settings'),'settings');
 $('#modalBody').oninput=e=>{const key=e.target.dataset.volume;if(key){setVolume(key,Number(e.target.value)/100);e.target.nextElementSibling.value=e.target.value+'%'}};
}
function gallery() {
 showDialog(guideMarkup(t),t('cardGallery'),'gallery');
 modal.onkeydown=bindGuide(modal,t);
}
function joinDialog(code=''){showDialog(`<p>${t('joinHelp')}</p><form id="joinForm"><label class="field">${t('name')}<input id="joinName" maxlength="20" autocomplete="nickname" value="${esc($('#nickname')?.value||localStorage.getItem('hs-name')||'Player')}"></label><input class="join-input" id="code" maxlength="6" pattern="[A-Za-z0-9]{6}" required aria-label="${t('code')}" placeholder="ABC123" value="${esc(code)}" autocomplete="off" spellcheck="false"><div class="controls"><button type="submit">${t('join')} ↗</button></div></form>`,t('roomJoin'));$('#joinForm').onsubmit=e=>{e.preventDefault();clickAction('join')};$('#code').focus()}
async function clickAction(a){const name=($('#nickname')?.value||$('#joinName')?.value||localStorage.getItem('hs-name')||'Player').trim().slice(0,20)||'Player';if(screen==='home')localStorage.setItem('hs-name',name);
 switch(a){case 'rules':rules();break;case 'close':modal.close();break;case 'gallery':gallery();break;case 'history':{const h=safeJSON('hs-history',[]);showDialog(`<p>${t('totalHistory')}</p>${h.map(x=>`<div class="history-item"><span>${t(x.mode)}${x.won?' · '+t('winner'):''}<small>${esc(new Date(x.date).toLocaleString(lang))} · ${t('turns')} ${x.turns}</small></span><strong>${x.count}/${x.goal||6}</strong></div>`).join('')||`<p>${t('empty')}</p>`}`,t('activity'));break}
 case 'solo':localStart(0,chosenMode,name);break;case 'ai':localStart(Number($('#bots')?.value)||3,chosenMode,name);break;case 'joinDialog':joinDialog();break;
 case 'create':case 'join':case 'restore':{if(busy)return;const code=$('#code')?.value.trim().toUpperCase();if(a==='join'&&!/^[A-Z0-9]{6}$/.test(code)){notify(t('codeError'));return}busy=true;app.setAttribute('aria-busy','true');try{const s=a==='restore'?safeJSON('hs-session',null):a==='create'?await api('create',{name,mode:chosenMode,limit:Number($('#limit')?.value)||4},''):await api(`room/${code}/join`,{name:$('#joinName')?.value.trim().slice(0,20)||name},'');if(!s)throw Error('session');if(modal.open)modal.close();await enter(s)}catch{notify(t('roomError'));online=false;stopNetwork()}finally{busy=false;app.removeAttribute('aria-busy')}break}
 case 'ready':sound('ready');act({type:'ready',value:!room.people.find(p=>p.id===me).ready});break;case 'startGame':act({type:'start'});break;case 'draw':act({type:'draw'});break;case 'redrawMode':redrawMode=!redrawMode;renderGame();break;case 'pass':act({type:'pass'});break;case 'skip':act({type:'skip'});break;case 'again':if(online){lastSeq=0;act({type:'rematch'})}else localStart(game.players.length-1,game.mode,game.players.find(p=>p.id===me).name);break;
 case 'leave':{if(screen==='game'&&game?.status==='playing'){showDialog(`<p>${t('exitConfirm')}</p><div class="controls"><button data-act="confirmLeave">${t('leave')}</button><button class="secondary" data-act="close">${t('cancel')}</button></div>`,t('leave'));return}if(online&&!room.game){try{await api(`room/${session.code}/action`,{type:'leave'})}catch{}}exit();break}
 case 'confirmLeave':if(online){session=null;stopNetwork();online=false;clearTimeout(botTimer);game=null;room=null;pending=[];modal.close();home();focusApp()}else exit();break;
 case 'copy':{const u=new URL(location.origin+location.pathname);u.searchParams.set('room',room.code);try{await navigator.clipboard.writeText(u.href);notify(t('copied'))}catch{showDialog(`<p class="copybox">${esc(u.href)}</p>`,t('copy'))}break}
 case 'install':if(installPrompt){await installPrompt.prompt();installPrompt=null}else notify(t('installHint'));break;
 }}
function applySetting(key) {
 switch (key) {
  case 'music': music=!music;setMusic(music);localStorage.setItem('hs-music',music?'1':'0');break;
  case 'fx': fx=!fx;setFX(fx);localStorage.setItem('hs-fx',fx?'1':'0');break;
  case 'voice': voice=!voice;localStorage.setItem('hs-voice',voice?'1':'0');if(voice)speak(t('voice'),lang);else window.speechSynthesis?.cancel();break;
  case 'motion': setReduced(!isReduced());localStorage.setItem('hs-reduced',isReduced()?'1':'0');break;
  case 'ambient': case 'gameFx': case 'touchFx': toggleEffect(key);break;
  case 'large': document.body.classList.toggle('large-text');localStorage.setItem('hs-large',visualState('large')?'1':'0');break;
 }
 toolLabels();
 for (const sw of modal.querySelectorAll('[data-setting]')) {
   sw.setAttribute('aria-checked',String(visualState(sw.dataset.setting)));
   if (sw.closest('.effect-child')) sw.disabled=isReduced();
 }
}
function toolLabels(){for(const [id,key,on]of [['bgm','music',music],['settings','settings',false],['full','fullscreen',!!document.fullscreenElement],['help','rules',false],['home','menu',false]]){const b=$('#'+id);b.title=t(key);b.setAttribute('aria-label',t(key)+(id==='bgm'?' · '+t(on?'on':'off'):''));if(id==='bgm'||id==='full')b.setAttribute('aria-pressed',String(on));b.classList.toggle('on',on)}$('#bgm').innerHTML=icon('music');$('#settings').innerHTML=icon('settings');$('#full').innerHTML=icon('full');$('#closeModal').setAttribute('aria-label',t('close'))}
function audition(button) {
 const line=LINES.find(l=>l.e===Number(button.dataset.audition));
 if (!line) return;
 auditionLine=line;
 for (const key of app.querySelectorAll('[data-audition]')) key.setAttribute('aria-pressed',String(key===button));
 const display=app.querySelector('[data-bench-display]');
 display.innerHTML=benchReading(line,t);
 auditionLight(button,display,line.c);
 sound('line',{energy:line.e,pan:(LINES.indexOf(line)-2.5)*.18});
}
app.addEventListener('click',e=>{const b=e.target.closest('[data-card],[data-act],[data-line],[data-audition]');if(!b||b.disabled)return;if(b.dataset.audition)audition(b);else if(b.dataset.card)selectCard(b.dataset.card);else if(b.dataset.line)lineInfo(b.dataset.line);else clickAction(b.dataset.act)});
$('#modalBody').addEventListener('click',e=>{const b=e.target.closest('[data-act],[data-setting]');if(!b)return;if(b.dataset.setting)applySetting(b.dataset.setting);else clickAction(b.dataset.act)});
app.addEventListener('pointerover',e=>{const b=e.target.closest('[data-card]');if(b&&!b.contains(e.relatedTarget))previewCard(b.dataset.card)});app.addEventListener('pointerout',e=>{const b=e.target.closest('[data-card]');if(b&&!b.contains(e.relatedTarget))clearPreview()});app.addEventListener('focusin',e=>{const b=e.target.closest('[data-card]');if(b)previewCard(b.dataset.card)});app.addEventListener('focusout',clearPreview);
document.addEventListener('pointerdown',e=>{
 if (e.button!==0) return;
 unlockAudio();setMusic(music);
 touchLight(e.clientX,e.clientY,e.target);
 const b=e.target.closest('button');
 if(b&&!b.disabled&&!b.matches('[data-card],[data-audition],[data-act="draw"],[data-setting="fx"]'))sound('click');
},{capture:true,passive:true});
document.addEventListener('click',e=>{
 if(e.detail!==0) return;
 const control=e.target.closest('button,[role="button"]');
 if(control){const r=control.getBoundingClientRect();touchLight(r.left+r.width/2,r.top+r.height/2,control);}
},true);
document.addEventListener('keydown',e=>{if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)||e.ctrlKey||e.metaKey||e.altKey||e.repeat)return;unlockAudio();setMusic(music);if(e.key==='Escape')return;if(modal.open)return;if(e.key.toLowerCase()==='r'){e.preventDefault();rules();return}if(screen==='game'&&active(game)?.id===me&&game.status==='playing'){const k=e.key.toLowerCase();if(k==='d'&&game.phase==='draw'){e.preventDefault();clickAction('draw')}if(k==='p'&&game.phase==='choose'){e.preventDefault();clickAction('pass')}if((k==='1'||k==='2')&&game.phase==='choose'){e.preventDefault();const c=game.hand[Number(k)-1];if(c)selectCard(c.id)}}if(e.target.matches('.deck-stack')&&['Enter',' '].includes(e.key)){e.preventDefault();clickAction('draw')}});
$('#closeModal').onclick=()=>modal.close();modal.addEventListener('click',e=>{if(e.target===modal){const r=modal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)modal.close()}});modal.addEventListener('close',()=>{$('#modalBody').oninput=null});
$('#help').onclick=rules;$('#home').onclick=()=>screen==='home'?home():clickAction('leave');$('#settings').onclick=settings;$('#bgm').onclick=()=>applySetting('music');$('#lang').value=lang;$('#lang').onchange=e=>{lang=e.target.value;document.documentElement.lang=lang;localStorage.setItem('hs-lang',lang);if(modal.open)modal.close();if(screen==='game')renderGame();else if(screen==='lobby')lobby();else home();toolLabels()};$('#full').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{notify(t('fullscreen'))}};document.addEventListener('fullscreenchange',toolLabels);
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e});window.addEventListener('online',()=>{if(online&&session)connect()});window.addEventListener('offline',()=>notify(t('offline')));if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});
if(!['normal','speed','timed','learn'].includes(chosenMode))chosenMode='normal';setReduced(localStorage.getItem('hs-reduced')===null?isReduced():localStorage.getItem('hs-reduced')==='1');document.body.classList.toggle('large-text',localStorage.getItem('hs-large')==='1');setFX(fx);setMusic(music);toolLabels();document.documentElement.lang=lang;startStars();home();

// One turn includes drawing, redrawing, and choosing an effect.
export const TURN_SECONDS=10;
export const TIMED_MINUTES=5;
export const GAME_MODES=['normal','speed','timed','learn'];
export const LEVELS=[0,13,17,18,19,20];
const TOKENS_PER_LINE=8;
export const VALUES=[1,2,3,4,5,6,7,13];
export const LINES=[{e:13,w:122,s:'UV',c:'#b75dff',from:13,to:0},{e:7,w:410,s:'Hδ',c:'#456aff',from:20,to:13},{e:6,w:434,s:'Hγ',c:'#37e6ef',from:19,to:13},{e:5,w:486,s:'Hβ',c:'#42ec86',from:18,to:13},{e:4,w:656,s:'Hα',c:'#ff404f',from:17,to:13},{e:3,w:1094,s:'IR',c:'#ff75c8',from:20,to:17}];
export const SPECIAL=['up','down','wild','redraw','steal','break'];
export function deck79(){return [...VALUES.flatMap((v,i)=>Array.from({length:3},(_,j)=>({id:`a${v}-${j}`,kind:'energy',v,art:i}))),...VALUES.flatMap((v,i)=>Array.from({length:3},(_,j)=>({id:`e${v}-${j}`,kind:'energy',v:-v,art:i+8}))),...SPECIAL.flatMap((kind,i)=>Array.from({length:[5,5,5,10,3,3][i]},(_,j)=>({id:`${kind}-${j}`,kind,art:16+i})))]}
function rand(n){if(globalThis.crypto?.getRandomValues){let a=new Uint32Array(1),lim=4294967296-(4294967296%n);do{crypto.getRandomValues(a)}while(a[0]>=lim);return a[0]%n}return Math.floor(Math.random()*n)}
export function shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){let j=rand(i+1);[a[i],a[j]]=[a[j],a[i]]}return a}
export function player(id,name,bot=false){return {id,name,bot,energy:0,tokens:[],ready:bot,stats:{turns:0,transitions:0,attempts:0,cards:0,photons:0,collected:0,stolen:0,lost:0,timeouts:0}}}
export function createGame(players,mode='normal',now=Date.now()){
 return {players,mode,deck:shuffle(deck79()),discard:[],hand:[],redraw:false,redrawn:false,
  phase:'draw',turn:0,round:1,status:'playing',winner:[],removed:Object.fromEntries(LINES.map(l=>[l.e,0])),
  log:[],seq:0,started:now,deadline:mode==='timed'?now+TIMED_MINUTES*60000:null,
  turnSerial:1,turnStartedAt:now,turnDeadline:now+TURN_SECONDS*1000,turnSeconds:TURN_SECONDS};
}
export function turnToken(s){return `${s.started}:${s.turnSerial||1}`}
function startTurn(s,now){
 s.turnSerial=(s.turnSerial||1)+1;
 s.turnSeconds=TURN_SECONDS;
 s.turnStartedAt=now;
 s.turnDeadline=now+TURN_SECONDS*1000;
}
// Server and local games share one clock policy. Never reset the clock on a draw or redraw.
export function tickGame(s,now=Date.now()){
 if(!s||s.status!=='playing')return false;
 if(finishTime(s,now))return true;
 // An older saved game gets one full timed turn on its first authenticated update.
 if(!Number.isFinite(s.turnDeadline)){
  s.turnSerial=s.turnSerial||1;s.turnSeconds=TURN_SECONDS;
  s.turnStartedAt=now;s.turnDeadline=now+TURN_SECONDS*1000;return true;
 }
 if(now<s.turnDeadline)return false;
 const p=active(s);
 if(s.phase==='draw')p.stats.turns++;
 p.stats.timeouts=(p.stats.timeouts||0)+1;
 record(s,'timeout',{who:p.name,whoId:p.id});
 endTurn(s,now);
 return true;
}

function record(s,key,data={}){s.log.push({seq:++s.seq,key,...data});if(s.log.length>40)s.log.shift()}
export function stock(s,e){return TOKENS_PER_LINE-s.removed[e]-s.players.filter(p=>p.tokens.includes(e)).length}
function take(s){if(!s.deck.length)s.deck=shuffle(s.discard.splice(0));return s.deck.pop()}
function give(s,p,e){if(p.tokens.includes(e)||stock(s,e)<=0)return false;p.tokens.push(e);p.stats.collected++;return true}
export function active(s){return s.players[s.turn]}
export function target(s){return s.mode==='speed'?3:6}
export function finishTime(s,now=Date.now()){if(s.status==='playing'&&s.deadline&&now>=s.deadline){s.status='ended';s.phase='ended';s.turnDeadline=null;const present=s.players.filter(p=>!p.away);let max=Math.max(...present.map(p=>p.tokens.length));s.winner=present.filter(p=>p.tokens.length===max).map(p=>p.id);s.discard.push(...s.hand.splice(0));record(s,'time');return true}return false}
export function actions(s,c,p=active(s)){if(!c)return [];const e=p.energy;switch(c.kind){case 'energy':return LEVELS.includes(e+c.v)?[{to:e+c.v}]:[];case 'up':return LEVELS.filter(x=>x>e).map(to=>({to}));case 'down':return LEVELS.filter(x=>x<e).map(to=>({to}));case 'wild':return LINES.filter(l=>!p.tokens.includes(l.e)&&stock(s,l.e)>0).map(l=>({e:l.e}));case 'steal':case 'break':return s.players.filter(q=>q.id!==p.id&&!q.away).flatMap(q=>q.tokens.filter(e=>c.kind==='break'||!p.tokens.includes(e)).map(e=>({other:q.id,e})));default:return []}}
function endTurn(s,now=Date.now()){
 s.discard.push(...s.hand.splice(0));s.redraw=false;s.redrawn=false;
 if(s.status==='ended'){s.turnDeadline=null;return;}
 const previous=s.turn;
 for(let step=1;step<=s.players.length;step++){
  const index=(previous+step)%s.players.length;
  if(!s.players[index].away){
   if(index<=previous)s.round++;
   s.turn=index;break;
  }
 }
 s.phase='draw';startTurn(s,now);
}

// A reserved seat keeps its spectrum and statistics while other players take their turns.
export function setSeatAway(s,id,away,now=Date.now()){
 const seat=s?.players.find(p=>p.id===id);
 if(!seat||!!seat.away===away)return;
 seat.away=away;
 if(s.status==='ended'&&s.endReason!=='alone')return;
 record(s,away?'depart':'returnSeat',{who:seat.name,whoId:id});
 const present=s.players.filter(p=>!p.away).length;
 if(s.status==='playing'){
  if(away&&id===active(s).id)endTurn(s,now);
  if(present>=2)return;
  s.resumeClock={phase:s.phase,turnLeft:Math.max(0,s.turnDeadline-now),gameLeft:s.deadline===null?null:Math.max(0,s.deadline-now)};
  s.status='ended';s.endReason='alone';s.phase='ended';s.winner=[];
  s.turnDeadline=null;s.deadline=null;
  return;
 }
 if(present<2)return;
 const saved=s.resumeClock;
 s.status='playing';delete s.endReason;delete s.resumeClock;
 s.deadline=saved.gameLeft===null?null:now+saved.gameLeft;
 if(active(s).away){endTurn(s,now);return;}
 s.phase=saved.phase;
 startTurn(s,now);
 s.turnDeadline=now+saved.turnLeft;
 s.turnStartedAt=s.turnDeadline-TURN_SECONDS*1000;
}
export function apply(s,id,a,now=Date.now()){if(tickGame(s,now))return s;if(a.expectedTurn!==undefined&&a.expectedTurn!==turnToken(s))throw Error('staleTurn');if(s.status!=='playing')throw Error('ended');let p=active(s);if(p.id!==id)throw Error('notTurn');switch(a.type){case 'draw':{if(s.phase!=='draw')throw Error('phase');p.stats.turns++;s.redraw=false;s.redrawn=false;while(s.hand.length<2){let c=take(s);if(!c)break;if(c.kind==='redraw'){s.redraw=true;s.discard.push(c)}else s.hand.push(c)}s.phase='choose';record(s,'draw',{who:p.name,whoId:p.id});break}case 'redraw':{if(s.phase!=='choose'||!s.redraw||s.redrawn)throw Error('phase');let i=s.hand.findIndex(c=>c.id===a.card);if(i<0)throw Error('card');s.discard.push(s.hand.splice(i,1)[0]);let c=take(s);if(c){if(c.kind==='redraw')s.discard.push(c);else s.hand.splice(i,0,c)}s.redrawn=true;p.stats.cards++;record(s,'redraw',{who:p.name,whoId:p.id});break}case 'play':{if(s.phase!=='choose')throw Error('phase');let c=s.hand.find(c=>c.id===a.card);if(!c)throw Error('card');let opts=actions(s,c,p);let o=opts.find(o=>Object.keys(o).every(k=>o[k]===a[k]));if(!o)throw Error('invalid');p.stats.cards++;let old=p.energy,info={who:p.name,whoId:p.id,kind:c.kind,art:c.art,from:old};if('to'in o){p.energy=o.to;p.stats.attempts++;p.stats.transitions++;info.to=o.to;if(o.to<old){p.stats.photons++;let l=LINES.find(l=>l.from===old&&l.to===o.to);if(l){info.e=l.e;info.gain=give(s,p,l.e)}else info.nonTarget=true}}else if(c.kind==='wild'){info.e=o.e;info.gain=give(s,p,o.e)}else{let q=s.players.find(q=>q.id===o.other);q.tokens=q.tokens.filter(e=>e!==o.e);q.stats.lost++;info.other=q.name;info.otherId=q.id;info.e=o.e;if(c.kind==='steal'){p.tokens.push(o.e);p.stats.collected++;p.stats.stolen++}else s.removed[o.e]++}record(s,'play',info);if(p.tokens.length>=target(s)){s.status='ended';s.phase='ended';s.winner=[p.id];record(s,'win',{who:p.name,whoId:p.id})}endTurn(s,now);break}case 'pass':{if(s.phase!=='choose')throw Error('phase');if(!s.hand.some(c=>actions(s,c,p).length)&&s.hand.some(c=>c.kind==='energy'))p.stats.attempts++;record(s,'pass',{who:p.name,whoId:p.id});endTurn(s,now);break}default:throw Error('action')}return s}
export function botMove(s){
 const p=active(s);
 if(s.phase==='draw')return {type:'draw'};
 const choices=s.hand.flatMap(card=>actions(s,card,p).map(option=>({
  type:'play',card:card.id,...option,score:score(s,p,card,option)
 })));
 choices.sort((a,b)=>b.score-a.score);
 if(s.redraw&&!s.redrawn&&s.hand.length&&(!choices.length||choices[0].score<4)){
  const bestScore=card=>Math.max(-1,...choices.filter(o=>o.card===card.id).map(o=>o.score));
  const worst=[...s.hand].sort((a,b)=>bestScore(a)-bestScore(b))[0];
  return {type:'redraw',card:worst.id};
 }
 return choices.length&&choices[0].score!==-Infinity?choices[0]:{type:'pass'};
}
function score(s,p,c,o){if(c.kind==='wild'||c.kind==='steal')return 11+(c.kind==='steal'?1:0);if(c.kind==='break'){
  // A bot may pass; destroying the last copy would put this line out of reach for everyone.
  if(s.removed[o.e]>=TOKENS_PER_LINE-1)return -Infinity;
  return 2+s.players.find(q=>q.id===o.other).tokens.length*.65;
 }let l=LINES.find(l=>l.from===p.energy&&l.to===o.to);if(l&&!p.tokens.includes(l.e)&&stock(s,l.e)>0)return 10;let potential=LINES.filter(l=>l.from===o.to&&!p.tokens.includes(l.e)&&stock(s,l.e)>0).length;return 1+potential*2+(o.to===13?1:0)+(o.to===0?-1:0)}
export function publicGame(s,id){if(!s)return null;let {deck,discard,resumeClock,...rest}=s;return {...rest,hand:s.status==='playing'&&active(s)?.id===id?s.hand:[],deckCount:deck.length,discardCount:discard.length,lastDiscard:discard.at(-1)||null}}

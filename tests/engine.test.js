import test from 'node:test';import assert from 'node:assert/strict';import {deck79,player,createGame,apply,actions,active,botMove,stock,finishTime,publicGame} from '../public/engine.js';import {newRoom,joinRoom,auth,actRoom,viewRoom} from '../src/room.js';
const setup=()=>createGame([player('a','Alice'),player('b','Bob')]);const card=(kind,v)=>({kind,v,id:'test',art:0});function choose(s,c){s.phase='choose';s.hand=[c]}
test('79 unique cards, counts exact',()=>{let d=deck79();assert.equal(d.length,79);assert.equal(new Set(d.map(x=>x.id)).size,79);for(let n of [1,2,3,4,5,6,7,13])for(let v of [n,-n])assert.equal(d.filter(c=>c.v===v).length,3);for(let [k,n] of Object.entries({up:5,down:5,wild:5,redraw:10,steal:3,break:3}))assert.equal(d.filter(c=>c.kind===k).length,n)});
test('exact transitions and non-target emissions',()=>{let s=setup();s.players[0].energy=20;choose(s,card('energy',-1));apply(s,'a',{type:'play',card:'test',to:19});assert.equal(s.players[0].energy,19);assert.equal(s.players[0].stats.photons,1);assert.deepEqual(s.players[0].tokens,[]);assert.equal(s.turn,1);assert.throws(()=>apply(s,'a',{type:'draw'}))});
test('all six target transitions',()=>{for(let [from,to,e] of [[13,0,13],[20,13,7],[19,13,6],[18,13,5],[17,13,4],[20,17,3]]){let s=setup();s.players[0].energy=from;choose(s,card('energy',to-from));apply(s,'a',{type:'play',card:'test',to});assert.deepEqual(s.players[0].tokens,[e])}});
test('redraw: draw two non-redraw, discard second redraw replacement',()=>{let s=setup();s.deck=[card('redraw'),{...card('energy',1),id:'b'},{...card('energy',13),id:'a'},{...card('redraw'),id:'r'}];apply(s,'a',{type:'draw'});assert.equal(s.hand.length,2);assert.equal(s.redraw,true);apply(s,'a',{type:'redraw',card:'a'});assert.equal(s.hand.length,1);assert.equal(s.redrawn,true);assert.throws(()=>apply(s,'a',{type:'redraw',card:'b'}));apply(s,'a',{type:'pass'});assert.equal(s.discard.length,4)});
test('steal and break preserve energy and removed stock',()=>{let s=setup();s.players[1].tokens=[7,4];choose(s,card('steal'));apply(s,'a',{type:'play',card:'test',other:'b',e:7});assert.deepEqual(s.players[0].tokens,[7]);assert.deepEqual(s.players[1].tokens,[4]);choose(s,card('break'));apply(s,'b',{type:'play',card:'test',other:'a',e:7});assert.equal(s.removed[7],1);assert.equal(stock(s,7),7);assert.equal(s.players[0].energy,0)});
test('six / three / timed and ties',()=>{let s=setup();s.mode='speed';s.players[0].tokens=[3,4];choose(s,card('wild'));apply(s,'a',{type:'play',card:'test',e:5});assert.equal(s.status,'ended');assert.deepEqual(s.winner,['a']);s=setup();s.deadline=Date.now()-1;assert(finishTime(s));assert.deepEqual(s.winner,['a','b'])});
test('server hides hand and deck from rivals, auth and capacity',()=>{let r=newRoom('ABCDEF','a',4,'normal');let a=r.people[0],b=joinRoom(r,'b');joinRoom(r,'c');joinRoom(r,'d');assert.throws(()=>joinRoom(r,'e'));for(let p of r.people.slice(1))actRoom(r,p,{type:'ready',value:true});actRoom(r,a,{type:'start'});actRoom(r,a,{type:'draw'});assert.equal(viewRoom(r,a).game.hand.length,2);assert.equal(viewRoom(r,auth(r,b.secret)).game.hand.length,0);assert.equal(viewRoom(r,a).game.deck,undefined);assert(!JSON.stringify(viewRoom(r,a)).includes(a.secret));assert.throws(()=>actRoom(r,auth(r,b.secret),{type:'draw'}))});
test('AI full 4-player simulated games conserve deck and stock',()=>{for(let i=0;i<30;i++){let s=createGame(Array.from({length:4},(_,j)=>player('p'+j,'Bot '+j,true)));for(let j=0;j<2000&&s.status==='playing';j++){apply(s,active(s).id,botMove(s));assert.equal(s.deck.length+s.discard.length+s.hand.length,79);for(let e of [3,4,5,6,7,13])assert(stock(s,e)>=0)}assert.equal(s.status,'ended')}});


test('a bot keeps the last existing copy of a line collectible, while a player can still remove it',()=>{
  const game=setup();
  game.players[1].tokens=[7];game.removed[7]=7;
  choose(game,card('break'));
  assert.deepEqual(actions(game,game.hand[0]),[{other:'b',e:7}]);
  assert.deepEqual(botMove(game),{type:'pass'});
  game.redraw=true;
  assert.deepEqual(botMove(game),{type:'redraw',card:'test'});
  game.redraw=false; game.players[1].tokens.push(4);
  assert.equal(botMove(game).e,4);
  apply(game,'a',{type:'play',card:'test',other:'b',e:7});
  assert.equal(game.removed[7],8);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {newRoom,joinRoom,actRoom,viewRoom,CHAT_HISTORY_LIMIT} from '../src/room.js';
import {apply,createGame,deck79,player,publicGame,turnToken,tickGame} from '../public/engine.js';
import {drawWindow,drawDetails} from '../public/draw-window.js';
import {tr} from '../public/i18n.js';

function seating() {
 const room=newRoom('SOCIAL','별빛',4,'normal');
 joinRoom(room,'프리즘');
 return {room,host:room.people[0],guest:room.people[1],now:Date.now()};
}
const chat=(text,nonce)=>({type:'chat',text,nonce});

test('chat follows the room from lobby to play and re-entry; it never takes the turn',()=>{
 const {room,host,guest,now}=seating();
 const action={...chat('  안녕하세요 🌙 ','first'),name:'someone else',sender:guest.id};
 const original=viewRoom(room,host).boardVersion;
 actRoom(room,host,action,now);
 const welcome=viewRoom(room,guest);
 assert.equal(welcome.boardVersion,original);
 assert.deepEqual(welcome.chat,[{seq:1,sender:host.id,name:'별빛',text:'안녕하세요 🌙',at:now}]);
 assert.equal(actRoom(room,host,action,now),false);
 actRoom(room,guest,{type:'ready',value:true},now);
 actRoom(room,host,{type:'start'},now);
 const playing=viewRoom(room,guest);
 actRoom(room,guest,chat('게임 중 답장','first'),now+400);
 const reply=viewRoom(room,host);
 assert.equal(reply.boardVersion,playing.boardVersion);
 assert.deepEqual(reply.game,playing.game);
 assert.deepEqual(reply.chat.map(m=>m.name),['별빛','프리즘']);
 actRoom(room,guest,{type:'leave'},now+500);
 assert.equal(viewRoom(room,guest).chat,undefined);
 assert.throws(()=>actRoom(room,guest,chat('x','away'),now+501),/away/);
 joinRoom(room,'다른 이름',guest.secret,now+600);
 assert.deepEqual(viewRoom(room,guest).chat,reply.chat);
});

test('chat handles the deadline once and preserves an older room with no saved chat array',()=>{
 const {room,host,guest,now}=seating();
 delete room.chat;
 actRoom(room,guest,{type:'ready',value:true},now);
 actRoom(room,host,{type:'start'},now);
 const before=viewRoom(room,guest);
 actRoom(room,guest,chat('차례가 넘어갔네요','late'),now+10000);
 const after=viewRoom(room,host);
 assert.equal(after.game.turn,1);
 assert.equal(after.game.turnDeadline,now+20000);
 assert.equal(after.chat[0].text,'차례가 넘어갔네요');
 assert.equal(after.boardVersion,before.boardVersion+1);
});

test('chat is bounded per room and handles Unicode, empty, oversized, and duplicate messages',()=>{
 const {room,host,guest,now}=seating();
 const unrelated=newRoom('SECOND','다른 방',2,'normal');
 for(const bad of [' \n ',{},'가'.repeat(201)])assert.throws(()=>actRoom(room,host,chat(bad,'b'),now),/chatLength/);
 assert.throws(()=>actRoom(room,host,chat('a',''),now),/chatId/);
 actRoom(room,guest,chat('🎉'.repeat(200),'emoji'),now);
 for(let i=0;i<CHAT_HISTORY_LIMIT+2;i++)actRoom(room,host,chat('<b>✦</b>','m'+i),now);
 const messages=viewRoom(room,guest).chat;
 assert.equal(messages.length,CHAT_HISTORY_LIMIT);
 assert.equal(messages[0].seq,4);
 assert.equal(messages.at(-1).text,'<b>✦</b>');
 assert.equal(new Set(messages.map(m=>m.seq)).size,messages.length);
 assert.deepEqual(viewRoom(unrelated,unrelated.people[0]).chat,[]);
});

function riggedGame(){
 const game=createGame([player('one','별빛'),player('two','프리즘')],'normal',0);
 const deck=deck79();
 game.deck=['e2-0','redraw-1','a3-0','a13-0','redraw-0'].map(id=>deck.find(c=>c.id===id));
 return game;
}
test('everyone sees both faces and the real drawer, including a discarded redraw replacement',()=>{
 const game=riggedGame();
 apply(game,'one',{type:'draw'},1);
 const draw=publicGame(game,'two').lastDraw;
 assert.deepEqual(draw,publicGame(game,'one').lastDraw);
 assert.equal(draw.who,'별빛');assert.equal(draw.bonus,1);
 assert.deepEqual(draw.cards,[{kind:'energy',art:7,v:13},{kind:'energy',art:2,v:3}]);
 assert.deepEqual(publicGame(game,'two').hand,[]);
 assert.throws(()=>apply(game,'two',{type:'pass'},2),/notTurn/);
 apply(game,'one',{type:'redraw',card:game.hand[1].id},3);
 const replacement=publicGame(game,'two').lastDraw;
 assert.equal(replacement.replaced,1);assert.equal(replacement.cards[1].kind,'redraw');
 assert.equal(replacement.cards[0].v,13);assert.equal(game.hand.length,1);
 apply(game,'one',{type:'pass'},4);
 assert.deepEqual(publicGame(game,'two').lastDraw,replacement);
 assert.notEqual(replacement.turn,turnToken(game));
 apply(game,'two',{type:'draw'},5);
 assert.equal(publicGame(game,'one').lastDraw.who,'프리즘');
});

test('fast play, a timeout, and an already-running older hand keep their public reveal',()=>{
 const game=riggedGame();
 apply(game,'one',{type:'draw'},1);
 const original=structuredClone(game.lastDraw);
 delete game.lastDraw;
 const restored=publicGame(game,'two').lastDraw;
 assert.deepEqual(restored.cards,original.cards);assert.equal(restored.whoId,'one');
 apply(game,'one',{type:'play',card:game.hand[0].id,to:14},2);
 assert.deepEqual(publicGame(game,'two').lastDraw.cards,original.cards);
 assert.equal(tickGame(game,10002),true);
 assert.equal(game.lastDraw.whoId,'one');
});

test('revealed cards have readable names in every locale and can be enlarged without a play control',()=>{
 const game=riggedGame();
 apply(game,'one',{type:'draw'},1);
 for(const lang of ['ko','en','ja','zh']){
  const t=key=>tr(key,lang);
  const html=drawWindow(game.lastDraw,game.players[0],turnToken(game),t,String,true);
  assert.ok(html.includes(t('thisDraw')));assert.ok(html.includes(t('drawBonus')));
  assert.ok(html.includes('data-act="inspectDraw"'));
  assert.ok(html.indexOf('/cards/card2.png')<html.indexOf('<bdi>별빛</bdi>'));
  const detail=drawDetails(game.lastDraw,t,String);
  assert.ok(detail.includes(t('absorb')+' +13'));assert.ok(!detail.includes('data-card='));
 }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {GAME_MODES, LINES, TURN_SECONDS, TIMED_MINUTES, createGame, player, target, finishTime, apply} from '../public/engine.js';
import {modeSummary, rulebookMarkup} from '../public/rulebook.js';
import {languages, tr} from '../public/i18n.js';
import {energyCalculation} from '../public/presentation.js';
import {matchScenes, tempos} from '../public/synth.js';

test('the configuration panel contains only the selected localized mode and its real deadlines',()=>{
  for (const lang of languages) for (const mode of GAME_MODES) {
    const t=key=>{const value=tr(key,lang);assert.notEqual(value,key);return value;};
    const game=createGame([player('a','A')],mode,1000);
    const summary=modeSummary(mode,t);
    const copy=t('modeRule_'+mode).replace('{goal}',target(game)).replace('{minutes}',TIMED_MINUTES);
    assert.ok(summary.includes(copy));
    assert.ok(summary.includes(t('manualTurnTime').replace('{seconds}',(game.turnDeadline-game.started)/1000)));
    assert.ok(summary.includes(game.deadline?t('matchMinutes').replace('{minutes}',(game.deadline-game.started)/60000):t('openMatch')));
    assert.equal((summary.match(/class="mode-summary-card"/g)||[]).length,1);
    for (const other of GAME_MODES.filter(m=>m!==mode)) assert.ok(!summary.includes('data-mode="'+other+'"'));
  }
});

test('each manual chapter links to the field guide and the four mode descriptions match configuration',()=>{
  for (const lang of languages) {
    const t=k=>{const v=tr(k,lang);assert.notEqual(v,k);return v;};
    for (const chapter of ['modes','turns','spectrum']) {
      const html=rulebookMarkup('timed',t,chapter);
      assert.match(html,/data-act="gallery"/);
      assert.equal((html.match(/data-current="true"/g)||[]).length,1);
      for (const mode of GAME_MODES) {
        const text=modeSummary(mode,t).match(/<p id="modeRuleText">([^<]+)<\/p>/)[1];
        assert.ok(html.includes('<p>'+text+'</p>'));
      }
      for (const id of ['modes','turns','spectrum']) {
        const panel=html.match(new RegExp('<section[^>]*id="panel-'+id+'"[^>]*>'))[0];
        assert.equal(panel.includes('hidden'),id!==chapter);
        assert.ok(html.includes('aria-controls="panel-'+id+'"'));
      }
      for(const line of LINES) assert.ok(html.includes(line.w+' nm'));
      assert.doesNotMatch(html,/\{(?:seconds|copies|minutes|goal)\}|undefined/);
    }
  }
});

test('the timed-mode description matches early collection, the match deadline and shared top scores',()=>{
  const players=['A','B','C'].map(id=>player(id,id));
  const game=createGame(players,'timed',500);
  players[0].tokens=[3,4]; players[1].tokens=[6,7]; players[2].tokens=[13];
  assert.equal(game.deadline-game.started,TIMED_MINUTES*60000);
  assert.equal(game.turnSeconds,TURN_SECONDS);
  assert.equal(target(game),LINES.length);
  assert.equal(finishTime(game,game.deadline-1),false);
  assert.equal(finishTime(game,game.deadline),true);
  assert.deepEqual(game.winner,['A','B']);
  const early=createGame([player('p','P')],'timed',500);
  early.players[0].tokens=LINES.slice(0,-1).map(l=>l.e);
  early.deck.push({id:'prize',kind:'wild',art:18});
  apply(early,'p',{type:'draw'},501);
  apply(early,'p',{type:'play',card:'prize',e:LINES.at(-1).e},502);
  assert.deepEqual(early.winner,['p']);assert.equal(early.status,'ended');
});
test('learning-card hints show exactly the example printed in the rulebook',()=>{
  const hint=energyCalculation(17,-4);
  assert.equal(hint,'17 − 4 = 13');
  for(const lang of languages) assert.ok(modeSummary('learn',k=>tr(k,lang)).includes(hint));
  assert.equal(energyCalculation(0,-7),'0 − 7 = −7');
  assert.equal(energyCalculation(13,4),'13 + 4 = 17');
});

test('each playable mode has its own arrangement and all seven scenes have a score tempo',()=>{
  assert.deepEqual(Object.keys(matchScenes),GAME_MODES);
  const scenes=['home','lobby',...GAME_MODES.map(m=>matchScenes[m]),'result'];
  assert.equal(new Set(scenes).size,7);
  for (const scene of scenes) assert.ok(Number.isFinite(tempos[scene]));
  assert.ok(tempos.speed>tempos.game && tempos.learn<tempos.game);
});

import {GAME_MODES, LEVELS, LINES, SPECIAL, VALUES, TURN_SECONDS, TIMED_MINUTES, target} from './engine.js';
import {entries} from './field-guide.js';

const chapters = ['modes', 'turns', 'spectrum'];
const tabLabel = {modes:'mode', turns:'chapterTurns', spectrum:'chapterSpectrum'};

function modeText(mode, t) {
  return t('modeRule_' + mode)
    .replaceAll('{goal}', String(target({mode})))
    .replaceAll('{minutes}', String(TIMED_MINUTES));
}

function turnTime(t) {
  return t('manualTurnTime').replace('{seconds}', String(TURN_SECONDS));
}

function modeSeal(mode) {
  return `<span class="mode-seal" aria-hidden="true"><span class="seal-face">${
    LINES.map((line,i) => `<i style="--i:${i};--ray:${line.c}"></i>`).join('')
  }</span></span>`;
}

export function modeSummary(mode, t) {
  const duration = mode === 'timed' ? t('matchMinutes').replace('{minutes}', String(TIMED_MINUTES)) : t('openMatch');
  return `<article class="mode-summary-card" data-mode="${mode}">
    ${modeSeal(mode)}
    <div class="mode-copy"><div class="mode-title"><span>${t('selectedMode')}</span><h3>${t(mode)}</h3></div>
      <p id="modeRuleText">${modeText(mode,t)}</p>
    </div>
    <div class="mode-times"><span>${turnTime(t)}</span><span>${duration}</span></div>
  </article>`;
}

function modeChapter(current, t) {
  return `<p class="rule-time-note"><span class="time-dial" aria-hidden="true"></span>${t('commonTurn').replace('{seconds}', String(TURN_SECONDS))}</p>
    <div class="mode-comparison">${GAME_MODES.map(mode => `
      <article class="mode-entry" data-mode="${mode}" ${mode===current?'data-current="true"':''}>
        <div class="mode-entry-head">${modeSeal(mode)}<h3>${t(mode)}</h3>
          ${mode===current?`<span class="mode-current">${t('selectedMode')}</span>`:''}
        </div>
        <p>${modeText(mode,t)}</p>
      </article>`).join('')}
    </div>`;
}

function turnChapter(t) {
  const familyCounts = new Map();
  for (const c of entries) familyCounts.set(c.family, (familyCounts.get(c.family) || 0) + c.copies);
  const energyCopies = entries.find(c => c.kind === 'energy').copies;
  const families = ['absorb', 'emit', ...SPECIAL];
  return `<ol class="turn-timeline">${[
    ['stepDraw','step1'], ['stepMove','step2'], ['stepCollect','collectRule']
  ].map(([title,body], i) => `<li><span class="turn-marker" aria-hidden="true">${i+1}</span>
      <div><h3>${t(title)}</h3><p>${t(body)}</p></div></li>`).join('')}</ol>
    <aside class="rule-time-note"><span class="time-dial" aria-hidden="true"></span>${t('turnRule')}</aside>
    <details class="rule-disclosure"><summary>${t('details')}</summary>
      <div class="deck-directory">${families.map(family => {
        const numeric = family==='absorb' || family==='emit';
        const values = numeric ? `<small class="card-values">${VALUES.map(v=>(family==='absorb'?'+':'−')+v).join(' · ')}<br>${t('copiesPerValue').replace('{copies}',String(energyCopies))}</small>` : '';
        const key = 'guide' + family[0].toUpperCase() + family.slice(1) + 'Rule';
        return `<div><h4>${t(family)} <small>×${familyCounts.get(family)}</small></h4><p>${t(key)}</p>${values}</div>`;
      }).join('')}</div>
    </details>`;
}

function spectrumChapter(t) {
  return `<div class="rule-scale"><h3>${t('levelScale')}</h3>
    <ol>${LEVELS.map((energy,i)=>`<li><small>n = ${i+1}</small><strong>${energy} <span>EU</span></strong></li>`).join('')}</ol></div>
    <table class="rule-lines"><caption>${t('lineTableTitle')}</caption>
    <thead><tr><th scope="col">${t('line')}</th><th scope="col">${t('transition')} <small>(EU)</small></th><th scope="col">${t('wavelength')}</th></tr></thead>
    <tbody>${LINES.map(line => `<tr><th scope="row"><i style="--ray:${line.c}"></i>${line.s}</th>
      <td>${line.from} → ${line.to}</td><td>${line.w} nm</td></tr>`).join('')}</tbody></table>
    <details class="rule-disclosure"><summary>${t('scienceTitle')}</summary><p>${t('scalePhysics')}</p><p>${t('opticPhysics')}</p><p>${t('science')} ${t('notOrbit')}</p></details>`;
}

export function rulebookMarkup(current, t, chapter='modes') {
  const tab = chapters.includes(chapter) ? chapter : 'modes';
  const content = {modes: modeChapter(current,t), turns: turnChapter(t), spectrum: spectrumChapter(t)};
  return `<nav class="rule-nav" aria-label="${t('rules')}">
    <div class="rule-tabs" role="tablist" aria-label="${t('rules')}">${chapters.map(id => `
        <button type="button" role="tab" data-chapter="${id}" id="tab-${id}" aria-controls="panel-${id}"
          aria-selected="${id===tab}" tabindex="${id===tab?0:-1}">${t(tabLabel[id])}</button>`).join('')}
    </div>
    <button class="atlas-shortcut" data-act="gallery"><span class="atlas-icon" aria-hidden="true"></span>${t('cardGallery')} <span aria-hidden="true">↗</span></button>
  </nav>
  ${chapters.map(id=>`<section class="rule-chapter" role="tabpanel" id="panel-${id}" aria-labelledby="tab-${id}" tabindex="0" ${id===tab?'':'hidden'}>
    ${content[id]}</section>`).join('')}`;
}

export function bindRulebook(modal, onChange) {
  const list = modal.querySelector('.rule-tabs');
  const buttons = Array.from(list.querySelectorAll('[role="tab"]'));
  function activate(next) {
    if (next.getAttribute('aria-selected')==='true') return;
    for (const button of buttons) {
      const selected = button===next;
      button.setAttribute('aria-selected',String(selected));
      button.tabIndex=selected?0:-1;
      modal.querySelector('#'+button.getAttribute('aria-controls')).hidden=!selected;
    }
    onChange(next.dataset.chapter);
  }
  list.onclick = event => {
    const button = event.target.closest('[role="tab"]');
    if (button) activate(button);
  };
  list.onkeydown = event => {
    const index = buttons.indexOf(event.target);
    if (index<0 || event.altKey || event.ctrlKey || event.metaKey) return;
    const targetIndex = {ArrowLeft:(index+buttons.length-1)%buttons.length, ArrowRight:(index+1)%buttons.length,
      Home:0, End:buttons.length-1}[event.key];
    if (targetIndex===undefined) return;
    event.preventDefault();
    buttons[targetIndex].focus();
    activate(buttons[targetIndex]);
  };
}

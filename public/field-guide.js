import {deck79, LEVELS, LINES} from './engine.js';

const deck = deck79();
export const entries = [...new Map(deck.map(c => [c.art, c])).values()]
  .sort((a,b) => a.art-b.art)
  .map(card => ({
    ...card,
    family: card.kind === 'energy' ? (card.v > 0 ? 'absorb' : 'emit') : card.kind,
    copies: deck.filter(c => c.art === card.art).length
  }));
const families = [...new Set(entries.map(c => c.family))];
const colors = {absorb:'#83e2fa',emit:'#ffd19a',up:'#9ae3ef',down:'#eab894',wild:'#d8b0f8',redraw:'#a5dec9',steal:'#c2adf4',break:'#f3a6ab'};
const signed = n => n > 0 ? '+' + n : '−' + Math.abs(n);
const number = n => String(n).padStart(2,'0');
const title = (card,t) => t(card.family) + (card.kind === 'energy' ? ' '+signed(card.v) : '');
const tag = key => 'guide' + key[0].toUpperCase() + key.slice(1);

// Derive every numeric example from the same allowed levels and line pairs used for play.
export function transitions(value) {
  return LEVELS.filter(from => LEVELS.includes(from+value)).map(from => ({
    from, to:from+value, line:LINES.find(l => l.from === from && l.to === from+value)
  }));
}
function valuesIndex(card,t) {
  return `<section class="book-values"><h4>${t('guideEnergyIndex')}</h4>${['absorb','emit'].map(family => {
    const cards = entries.filter(c => c.family === family);
    return `<div class="values-row" style="--ink:${colors[family]}"><b>${t(family)}</b><div>${cards.map(c =>
      `<button type="button" data-book="page" data-index="${c.art}" aria-label="${title(c,t)}" aria-pressed="${card.art===c.art}">${signed(c.v)}</button>`).join('')}</div></div>`;
  }).join('')}</section>`;
}
function examples(card,t) {
  if (card.kind !== 'energy') return `<section class="book-example"><h4>${t('guideExample')}</h4><p>${t(tag(card.family)+'Example')}</p></section>`;
  const pairs = transitions(card.v);
  return `<section class="book-example"><h4>${t('guideTransitions')}</h4><div class="transition-list">${pairs.map(p =>
    `<span><b>${p.from} <i>→</i> ${p.to}</b>${p.line ? `<small style="--line-ink:${p.line.c}">${p.line.s} · ${p.line.w} nm</small>` : ''}</span>`).join('')}</div></section>`;
}
function pageBody(index,t) {
  const c = entries[index], energy = c.kind === 'energy', name = title(c,t);
  return `<div class="book-spread" style="--ink:${colors[c.family]}">
    <figure class="book-plate"><button type="button" class="book-art" data-book="zoom" aria-label="${t('guideZoom')} · ${name}">
      <span class="plate-grid" aria-hidden="true"></span><img src="/cards/card${c.art}.png" width="300" height="417" alt="${name}" draggable="false">
      <span class="zoom-mark" aria-hidden="true">⤢</span></button>
      <figcaption>${t('guideArtHint')}</figcaption>
    </figure>
    <div class="book-copy"><span class="book-category"><i></i>${t(energy?'guideEnergy':'guideSpecial')}</span>
      <h3>${name}</h3><p class="book-count">${t('guideCopies')} <b>×${c.copies}</b>${energy?' · '+t('guideFamilyCopies'):''}</p>
      <p class="book-rule">${t(tag(c.family)+'Rule')}</p></div>
    <div class="book-details">${energy?valuesIndex(c,t):''}${examples(c,t)}</div></div>`;
}

export function guideMarkup(t,index=0) {
  return `<div class="book-toolbar"><button class="quiet book-back" data-act="rules">← ${t('rules')}</button>
    <label class="book-jump"><span>${t('guideJump')}</span><select data-book-family>${families.map(f => `<option value="${f}" ${f===entries[index].family?'selected':''}>${t(f)}</option>`).join('')}</select></label></div>
    <div class="book-page" data-book-body>${pageBody(index,t)}</div>
    <nav class="book-pager" aria-label="${t('cardGallery')}"><button class="secondary" data-book="prev">← <span>${t('guidePrev')}</span></button>
    <output class="book-position" aria-live="polite" aria-atomic="true">${number(index+1)} <i>/</i> ${entries.length}</output>
    <button class="secondary" data-book="next"><span>${t('guideNext')}</span> →</button></nav>`;
}
export function bindGuide(modal,t) {
  const body = modal.querySelector('[data-book-body]'), select = modal.querySelector('[data-book-family]');
  const counter = modal.querySelector('.book-position'), pager = modal.querySelector('.book-pager');
  let index = 0, start, suppressClick = false;
  function jump(value) {
    const next = (value+entries.length)%entries.length;
    if (next === index) return;
    const active = document.activeElement;
    const wasNumber = body.contains(active) && active.dataset.book === 'page';
    const wasImage = body.contains(active) && active.dataset.book === 'zoom';
    index = next;
    body.innerHTML = pageBody(index,t);
    select.value = entries[index].family;
    counter.textContent = number(index+1)+' / '+entries.length;
    if (wasNumber || wasImage) (body.querySelector(wasNumber?'[aria-pressed="true"]':'[data-book="zoom"]') || select).focus({preventScroll:true});
  }
  function zoom(open) {
    const enlarged = body.querySelector('.book-zoom');
    if (!open) {
      if (enlarged) {enlarged.remove(); body.querySelector('[data-book="zoom"]').focus({preventScroll:true});}
      return;
    }
    if (enlarged) return;
    const c = entries[index];
    const panel = document.createElement('div');
    panel.className = 'book-zoom';
    panel.innerHTML = `<button data-book="unzoom" class="secondary">${t('guideShrink')} ×</button><img width="300" height="417" src="/cards/card${c.art}.png" alt="${title(c,t)}"><strong>${title(c,t)}</strong>`;
    body.append(panel);
    panel.querySelector('button').focus({preventScroll:true});
  }
  function navigate(button) {
    switch (button.dataset.book) {
      case 'page': jump(Number(button.dataset.index)); break;
      case 'prev': jump(index-1); break;
      case 'next': jump(index+1); break;
      case 'zoom': zoom(true); break;
      case 'unzoom': zoom(false); break;
    }
  }
  for (const part of [body,pager]) part.onclick = e => {
    const b = e.target.closest('[data-book]');
    if (b && !suppressClick) navigate(b);
  };
  select.onchange = () => jump(entries.findIndex(c => c.family === select.value));
  // Capturing the pointer also lets a drag finish beyond the edge of the picture.
  // Native vertical scrolling and pinch zoom take over through pointercancel.
  body.addEventListener('pointerdown',e => {
    suppressClick=false;
    const art=e.target.closest('.book-art');
    if (!art || !e.isPrimary || e.button!==0) {start=null;return;}
    start={id:e.pointerId,x:e.clientX,y:e.clientY};
    art.setPointerCapture(e.pointerId);
  });
  body.addEventListener('pointercancel',() => {start=null;});
  body.addEventListener('pointerup',e => {
    const a=start; start=null;
    if (!a || a.id!==e.pointerId) return;
    const dx=e.clientX-a.x, dy=e.clientY-a.y;
    if (Math.abs(dx)>36 && Math.abs(dx)>Math.abs(dy)*1.4) {
      suppressClick=true;
      jump(index+(dx<0?1:-1));
      setTimeout(()=>{suppressClick=false;},0);
    }
  });
  return e => {
    const enlarged = body.querySelector('.book-zoom');
    if (enlarged) {
      if (e.key==='Escape') {e.preventDefault(); zoom(false);}
      return;
    }
    if (e.target.tagName==='SELECT' || e.altKey || e.metaKey || e.ctrlKey) return;
    if (e.key==='ArrowRight'||e.key==='ArrowLeft') {e.preventDefault();jump(index+(e.key==='ArrowRight'?1:-1));}
  };
}

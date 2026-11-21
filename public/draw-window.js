function faceLabel(card,t){
 return card.kind==='energy'?t(card.v>0?'absorb':'emit')+' '+(card.v>0?'+':'−')+Math.abs(card.v):t(card.kind);
}
function faces(draw,t){
 return draw.cards.map((card,i)=>{
  const title=faceLabel(card,t);
  return `<span class="draw-face"><img src="/cards/card${Number(card.art)}.png" alt="" draggable="false"><span>${draw.replaced===i?`<i>${t('replacedFace')}</i> `:''}${title}</span></span>`;
 }).join('');
}
function bonus(draw,t){
 return draw?.bonus?`<small class="draw-bonus">↻ ${t('drawBonus')}${draw.bonus>1?' ×'+draw.bonus:''}</small>`:'';
}
export function drawWindow(draw,turn,currentTurn,t,escape,fresh){
 const nickname=escape(draw?.who??turn.name),caption=draw?t(draw.turn===currentTurn?'thisDraw':'previousDraw'):t('drawWaiting');
 const cards=draw?faces(draw,t):'<span class="draw-back"></span><span class="draw-back"></span>';
 const body=`<span class="draw-plate-title"><b>${t('drawWindow')}</b><small>${caption}</small></span><span class="draw-faces">${cards}</span>${bonus(draw,t)}<span class="draw-owner"><i aria-hidden="true"></i><bdi>${nickname}</bdi></span>`;
 return draw?`<button type="button" class="draw-window${fresh?' new-draw':''}" data-act="inspectDraw" title="${t('inspectDraw')}" aria-label="${t('drawWindow')} · ${caption} · ${nickname} · ${draw.cards.map(c=>faceLabel(c,t)).join(', ')} · ${t('inspectDraw')}">${body}</button>`:`<div class="draw-window waiting" aria-label="${t('drawWindow')}">${body}</div>`;
}
export function drawDetails(draw,t,escape){
 return `<div class="draw-detail"><div class="draw-faces">${faces(draw,t)}</div>${bonus(draw,t)}<p class="draw-owner"><i aria-hidden="true"></i><bdi>${escape(draw.who)}</bdi></p></div>`;
}

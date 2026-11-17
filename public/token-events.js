// Account IDs distinguish actors even when two participants use the same nickname.
export function isTokenAttack(event){
 return event.key==='play'&&(event.kind==='steal'||event.kind==='break');
}
export function tokenEventCopy(event,line,viewer,t){
 const role=event.otherId===viewer?'Victim':event.whoId===viewer?'Actor':'Watch';
 const names={actor:event.who,victim:event.other};
 return {
  title:t(event.kind+role),
  detail:t(event.kind+'Detail').replace(/\{(actor|victim)\}/g,(_,key)=>names[key]||'—'),
  wavelength:line.s+' · '+line.w+' nm'
 };
}
const queue=[];
let timer=null;
function paintNext(){
 const host=document.getElementById('tokenEvent');
 if(!host)return;
 if(document.hidden||!queue.length){
  timer=null;host.hidePopover?.();host.hidden=true;host.replaceChildren();return;
 }
 const {event,line,copy,onShow}=queue.shift();
 host.dataset.kind=event.kind;
 host.style.setProperty('--lambda',line.c);
 host.innerHTML='<div class="token-notice"><div class="token-glyph" aria-hidden="true"><i class="token-track"></i><i class="token-orb"></i><i class="token-fragments"></i></div><div class="token-copy"><div><strong></strong><span></span></div><p></p></div></div>';
 host.querySelector('strong').textContent=copy.title;
 host.querySelector('.token-copy span').textContent=copy.wavelength;
 host.querySelector('p').textContent=copy.detail;
 host.hidden=false;
 host.showPopover?.();
 onShow();
 timer=setTimeout(paintNext,3100);
}
export function showTokenNotice(event,line,me,t,onShow){
 queue.push({event,line,copy:tokenEventCopy(event,line,me,t),onShow});
 if(timer===null)paintNext();
}
export function resumeTokenNotices(){
 if(!document.hidden&&queue.length&&timer===null)paintNext();
}
export function clearTokenNotices(){
 clearTimeout(timer);timer=null;queue.length=0;
 const host=document.getElementById('tokenEvent');
 if(host&&!host.hidden){host.hidePopover?.();host.hidden=true;host.replaceChildren();}
}

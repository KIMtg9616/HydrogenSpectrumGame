const speechIcon='<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M19 15.5a3 3 0 0 0 3-3v-6a3 3 0 0 0-3-3H5a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3h2v4l5.2-4z"/><path d="M7 8h10M7 11h6"/></svg>';

function messageKey(){
 const bytes=crypto.getRandomValues(new Uint8Array(16));
 return Array.from(bytes,v=>v.toString(16).padStart(2,'0')).join('');
}
export function roomChat(root,t,send){
 root.innerHTML=`<button class="chat-launch" type="button" aria-expanded="false" aria-controls="chatPanel">${speechIcon}<span></span><b class="chat-unread" hidden></b></button>
 <section class="chat-panel" id="chatPanel" aria-labelledby="chatTitle" hidden>
  <header class="chat-head"><div>${speechIcon}<h2 id="chatTitle"></h2><small class="chat-room"></small></div><button type="button" class="chat-close">×</button></header>
  <p class="chat-empty"></p><ol class="chat-log" role="log" aria-live="polite" aria-relevant="additions"></ol>
  <form class="chat-compose"><input type="text" autocomplete="off" enterkeyhint="send" dir="auto"><button type="submit"></button></form>
  <p class="chat-error" role="status" hidden></p></section>`;
 const find=s=>root.querySelector(s),launch=find('.chat-launch'),badge=find('.chat-unread'),
  panel=find('.chat-panel'),close=find('.chat-close'),log=find('.chat-log'),empty=find('.chat-empty'),
  form=find('form'),input=find('input'),submit=find('[type=submit]'),error=find('.chat-error');
 let identity='',me='',open=false,composing=false,pending=false,latest=0,unread=0,retry=null,errorKey='';
 let formatter,language='';
 function status(key=''){
  errorKey=key;error.hidden=!key;error.textContent=key?t(key):'';
 }
 function buttonState(){submit.disabled=pending||!input.value.trim()}
 function toggle(value,focus=false){
  open=value;
  if(open)unread=0;
  panel.hidden=!open;launch.hidden=open;
  launch.setAttribute('aria-expanded',String(open));
  badge.hidden=!unread;badge.textContent=String(unread);
  launch.setAttribute('aria-label',[t('roomChat'),t('chatOpen'),unread?t('chatUnread').replace('{n}',unread):''].filter(Boolean).join(' · '));
  if(open)log.scrollTop=log.scrollHeight;
  if(focus)(open?input:launch).focus({preventScroll:true});
 }
 function reset(){
  identity='';latest=0;unread=0;retry=null;pending=false;composing=false;
  input.value='';log.replaceChildren();status();toggle(false);root.hidden=true;
 }
 function addMessage(message){
  const item=document.createElement('li'),meta=document.createElement('div'),name=document.createElement('b'),
   time=document.createElement('time'),body=document.createElement('p');
  item.className='chat-message'+(message.sender===me?' own':'');item.dataset.seq=message.seq;
  name.textContent=message.name;name.dir='auto';
  time.dateTime=new Date(message.at).toISOString();time.textContent=formatter.format(message.at);
  body.textContent=message.text;body.dir='auto';
  meta.append(name,time);item.append(meta,body);log.append(item);
 }
 function update(state,lang){
  if(!state){if(identity)reset();return;}
  const key=state.code+'/'+state.me;
  const joined=key!==identity;
  if(joined){reset();identity=key;me=state.me;}
  root.hidden=false;
  if(lang!==language||joined){
   language=lang;formatter=new Intl.DateTimeFormat(lang,{hour:'2-digit',minute:'2-digit'});
   find('#chatTitle').textContent=t('roomChat');find('.chat-room').textContent=state.code;
   launch.querySelector('span').textContent=t('roomChat');close.setAttribute('aria-label',t('chatClose'));
   log.setAttribute('aria-label',t('roomChat'));empty.textContent=t('chatEmpty');
   input.placeholder=t('chatInput');input.setAttribute('aria-label',t('chatInput'));
   submit.textContent=t('chatSend');log.querySelectorAll('time').forEach(n=>{n.textContent=formatter.format(new Date(n.dateTime))});
   status(errorKey);toggle(open);
  }
  const history=state.chat||[],newest=history.at(-1)?.seq??0;
  empty.hidden=!!history.length;log.hidden=!history.length;
  if(newest>latest){
   const pinned=log.scrollHeight-log.clientHeight-log.scrollTop<28;
   const first=history[0].seq;
   while(log.firstElementChild&&Number(log.firstElementChild.dataset.seq)<first)log.firstElementChild.remove();
   for(const m of history){
    if(m.seq<=latest)continue;
    addMessage(m);
    if(!open&&m.sender!==me)unread++;
   }
   latest=newest;
   if(!open)toggle(false);
   else if(pinned||history.at(-1).sender===me)log.scrollTop=log.scrollHeight;
  }
  buttonState();
 }
 launch.onclick=()=>toggle(true,true);close.onclick=()=>toggle(false,true);
 root.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&open&&!e.isComposing&&!composing){e.stopPropagation();toggle(false,true);}
  if(e.key==='Enter'&&(e.isComposing||composing||e.keyCode===229))e.stopPropagation();
 });
 input.addEventListener('compositionstart',()=>{composing=true});
 input.addEventListener('compositionend',()=>{setTimeout(()=>{composing=false},0)});
 input.addEventListener('input',()=>{status();buttonState();if(retry&&retry.text!==input.value.trim())retry=null});
 form.onsubmit=async e=>{
  e.preventDefault();
  if(!identity||pending||composing)return;
  const draft=input.value,text=draft.trim(),key=identity;
  if(!text||Array.from(text).length>200){status('chatLength');return;}
  if(retry?.text!==text)retry={text,nonce:messageKey()};
  const outgoing=retry;
  pending=true;status();buttonState();
  try{
   await send({type:'chat',...outgoing});
   if(identity!==key)return;
   if(input.value===draft)input.value='';
   retry=null;
  }catch(e){
   if(identity===key)status(e.message==='chatLength'?'chatLength':'chatFailed');
  }finally{
   if(identity===key){pending=false;buttonState();}
  }
 };
 return {update};
}

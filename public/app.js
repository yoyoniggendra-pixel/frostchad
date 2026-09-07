const BACKEND_URL = String(window.FROSTLINK_BACKEND_URL || '').replace(/\/$/, '');
const API_BASE = BACKEND_URL;
const socket = io(BACKEND_URL || undefined, { transports: ['websocket', 'polling'] });
const messagesEl = document.getElementById('messages');
const input = document.getElementById('messageInput');
const composer = document.getElementById('composer');
const fileInput = document.getElementById('fileInput');
const attachBtn = document.getElementById('attachBtn');
const gifBtn = document.getElementById('gifBtn');
const gifPicker = document.getElementById('gifPicker');
const gifSearch = document.getElementById('gifSearch');
const gifSearchBtn = document.getElementById('gifSearchBtn');
const gifResults = document.getElementById('gifResults');
const gifClose = document.getElementById('gifClose');
const dropzone = document.getElementById('dropzone');
const typingEl = document.getElementById('typing');
const statusText = document.getElementById('statusText');
const statusDot = document.querySelector('.dot');
const settings = document.getElementById('settings');
const settingsBtn = document.getElementById('settingsBtn');
const closeSettings = document.getElementById('closeSettings');
const clearChatBtn = document.getElementById('clearChatBtn');
const notifyBtn = document.getElementById('notifyBtn');
const replyBar = document.getElementById('replyBar');
let replyText = document.getElementById('replyText');
const cancelReply = document.getElementById('cancelReply');
const editBar = document.getElementById('editBar');
const cancelEdit = document.getElementById('cancelEdit');
const emojiBtn = document.getElementById('emojiBtn');
const emojiPicker = document.getElementById('emojiPicker');
const reactPicker = document.getElementById('reactPicker');
const liveRegion = document.getElementById('liveRegion');
const editImageBtn = document.getElementById('editImageBtn');
const editDropZone = document.getElementById('editDropZone');
const imageEditor = document.getElementById('imageEditor');
const editorClose = document.getElementById('editorClose');
const editorCanvas = document.getElementById('editorCanvas');
const canvasWrap = document.getElementById('canvasWrap');
const canvasHint = document.getElementById('editorCanvasHint');
const editorColor = document.getElementById('editorColor');
const editorSize = document.getElementById('editorSize');
const editorFont = document.getElementById('editorFont');
const editorTextInput = document.getElementById('editorTextInput');
const editorAddText = document.getElementById('editorAddText');
const editorUndo = document.getElementById('editorUndo');
const editorRedo = document.getElementById('editorRedo');
const editorAddImage = document.getElementById('editorAddImage');
const editorOutlineColor = document.getElementById('editorOutlineColor');
const editorOutlineSize = document.getElementById('editorOutlineSize');
const editorFillEnabled = document.getElementById('editorFillEnabled');
const brushPreview = document.getElementById('brushPreview');
const editorClearMarks = document.getElementById('editorClearMarks');
const editorSend = document.getElementById('editorSend');
const editorReact = document.getElementById('editorReact');
const editorEmojiPicker = document.getElementById('editorEmojiPicker');

let sender = localStorage.getItem('frostlink_sender');
if (!sender) {
  sender = `Node-${Math.random().toString(36).slice(2, 7)}`;
  localStorage.setItem('frostlink_sender', sender);
}
document.getElementById('nodeName').textContent = sender;


let typingTimer;
let rendered = new Set();
let replyingTo = null;
let editingId = null;
let giphyEnabled = false;
let reactionEmoji = ['👍', '❤️', '😂', '😮', '🔥'];
let unreadCount = 0;
let unreadDividerShown = false;
const BASE_TITLE = 'FROSTLINK';
const bottomBtn=document.getElementById('bottomBtn');
const newMessagesIndicator=document.getElementById('newMessagesIndicator');
const newMessagesCount=document.getElementById('newMessagesCount');
const embedBar=document.getElementById('embedBar');
const embedInput=document.getElementById('embedInput');
const sendEmbedBtn=document.getElementById('sendEmbedBtn');
const cancelEmbed=document.getElementById('cancelEmbed');
const embedBtn=document.getElementById('embedBtn');
const soundBtn=document.getElementById('soundBtn');
const soundPicker=document.getElementById('soundPicker');
const soundClose=document.getElementById('soundClose');
const soundSearch=document.getElementById('soundSearch');
const soundSearchBtn=document.getElementById('soundSearchBtn');
const soundResults=document.getElementById('soundResults');
const reactionImageViewer=document.getElementById('reactionImageViewer');
const reactionImageView=document.getElementById('reactionImageView');
const reactionImageClose=document.getElementById('reactionImageClose');
const bgColorInput=document.getElementById('bgColorInput');
const saveBgBtn=document.getElementById('saveBgBtn');
const resetBgBtn=document.getElementById('resetBgBtn');
let backgroundAudio=null;
if(!BACKEND_URL){
  console.warn('FROSTLINK backend URL is not configured. Set FROSTLINK_BACKEND_URL in Vercel.');
}


const EMOJI_SET = ['😀','😁','😂','🤣','😊','😍','😘','😉','😎','🤔','😴','😭','😢','😡','🥳','😱','🙄','😅','🤗','🤝','👍','👎','👏','🙏','💪','🔥','✨','⭐','❄️','💙','💯','✅','❌','🎉','🎂','🍕','☕','🌙','☀️','🌧️','⚡','🐾','🎮','📎','📷','🎵','❤️','💔'];

function escapeHtml(s='') {
  return String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}
function escapeAttr(s='') { return escapeHtml(s).replace(/`/g, '&#96;'); }
function bytes(n){if(n<1024)return `${n} B`;if(n<1048576)return `${(n/1024).toFixed(1)} KB`;if(n<1073741824)return `${(n/1048576).toFixed(1)} MB`;return `${(n/1073741824).toFixed(1)} GB`}
function time(ts){return new Date(ts).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}
function dateTime(ts){return new Date(ts).toLocaleString([], {dateStyle:'medium',timeStyle:'short'})}
function dateKey(ts){const d=new Date(ts);return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`}
function dateLabel(ts){
  const d=new Date(ts); const now=new Date();
  const today=dateKey(now.getTime()); const key=dateKey(ts);
  if(key===today) return 'Today';
  const yest=new Date(now); yest.setDate(yest.getDate()-1);
  if(key===dateKey(yest.getTime())) return 'Yesterday';
  return d.toLocaleDateString([], {weekday:'long', month:'long', day:'numeric', year: d.getFullYear()!==now.getFullYear()?'numeric':undefined});
}
function linkify(text){
  const safe=escapeHtml(text);
  return safe.replace(/(https?:\/\/[^\s<]+)/g,'<a class="chat-link" href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
}
function attachmentHtml(a){
  const name=escapeHtml(a.name||'file');
  if(a.kind==='image'||a.kind==='gif') return `<div class="media"><img src="${escapeAttr(a.url)}" alt="${name}" loading="lazy"></div>`;
  if(a.kind==='video') return `<div class="media"><video controls preload="metadata" src="${escapeAttr(a.url)}"></video></div>`;
  if(a.kind==='audio') return `<div class="media audio-card"><audio controls preload="metadata" src="${escapeAttr(a.url)}"></audio><button type="button" class="background-audio-btn" data-audio-url="${escapeAttr(a.url)}">♫ Play in background</button></div>`;
  const icon=a.kind==='pdf'?'📄':'📦';
  return `<div class="media file"><span class="file-icon" aria-hidden="true">${icon}</span><div><a href="${escapeAttr(a.url)}" target="_blank" download>${name}</a><small>${escapeHtml(a.mime||'file')} · ${bytes(a.size||0)}</small></div></div>`;
}
function soundsHtml(m){
  return (m.sounds||[]).map(s=>`<div class="sound-message"><button type="button" class="sound-message-btn" data-sound-url="${escapeAttr(s.mp3||s.url)}" data-sound-title="${escapeAttr(s.title||'MyInstants sound')}">🔊 ${escapeHtml(s.title||'MyInstants sound')} <span>▶</span></button></div>`).join('');
}
function embedHtml(e){
  if(e.kind==='direct'){
    if(e.mediaKind==='video') return `<div class="media"><video controls preload="metadata" src="${escapeAttr(e.url)}"></video></div>`;
    if(e.mediaKind==='audio') return `<div class="media"><audio controls src="${escapeAttr(e.url)}"></audio></div>`;
    if(e.mediaKind==='gif'||e.mediaKind==='image') return `<div class="media"><img src="${escapeAttr(e.url)}" alt="embedded media" loading="lazy"></div>`;
  }
  if(e.provider==='youtube'){
    let id=''; try{const u=new URL(e.url);id=u.hostname==='youtu.be'?u.pathname.slice(1):u.searchParams.get('v')||u.pathname.split('/').filter(Boolean).pop();}catch{}
    if(id) return `<div class="embed"><iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}" title="YouTube" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`;
  }
  if(e.provider==='vimeo'){
    const id=e.url.match(/vimeo\.com\/(?:video\/)?(\d+)/i)?.[1];
    if(id) return `<div class="embed"><iframe src="https://player.vimeo.com/video/${id}" title="Vimeo" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`;
  }
  if(e.video && /^https?:\/\//i.test(e.video)) return `<div class="embed"><video controls preload="metadata" src="${escapeAttr(e.video)}"></video></div>`;
  const providerLabel=e.provider==='instagram'?'INSTAGRAM PREVIEW':'LINK PREVIEW';
  return `<div class="linkcard" data-url="${escapeAttr(e.url)}">${e.image?`<img src="${escapeAttr(e.image)}" alt="">`:''}<div class="linkcopy"><div class="linktag">${providerLabel}</div><b>${escapeHtml(e.title||'Open link')}</b><small>${escapeHtml(e.description||e.url)}</small><div class="link-actions"><button class="preview-link" type="button">Preview</button><a href="${escapeAttr(e.url)}" target="_blank" rel="noopener noreferrer">Open</a></div></div></div>`;
}
function replyHtml(r){
  if(!r) return '';
  const preview = r.previewImage ? `<img src="${escapeAttr(r.previewImage)}" alt="">` : '';
  const label = r.text || (r.previewImage ? 'Image' : (r.previewAudio ? 'Audio' : (r.previewVideo ? 'Video' : 'media message')));
  return `<button class="reply-quote" type="button" data-reply-id="${escapeAttr(r.id)}">${preview}<span class="reply-copy"><b>${escapeHtml(r.sender)}</b><span>${escapeHtml(label.slice(0,180))}</span></span></button>`;
}
function statusHtml(m){
  if(m.sender!==sender) return '';
  const cls = m.status==='read' ? 'read' : m.status==='delivered' ? 'delivered' : '';
  const label = m.status==='read' ? 'Read' : m.status==='delivered' ? 'Delivered' : 'Sent';
  const mark = m.status ? '✓✓' : '✓';
  return `<span class="delivery ${cls}" title="${label}">${mark}</span>`;
}
function reactionsHtml(m){
  const entries = Object.entries(m.reactions||{});
  if(!entries.length) return '';
  return `<div class="reactions">${entries.map(([key,list])=>{
    const mine = list.includes(sender);
    const isImage = key.startsWith('img:');
    const url = isImage ? key.slice(4) : '';
    const visual = isImage
      ? `<img class="reaction-thumb" src="${escapeAttr(url)}" alt="Picture reaction">`
      : escapeHtml(key);
    const label = isImage ? `${namesForReaction(list)} reacted with a picture` : `${namesForReaction(list)} reacted with ${key}`;
    return `<button type="button" class="reaction-pill ${mine?'mine':''} ${isImage?'image-reaction':''}" data-react-id="${escapeAttr(m.id)}" data-reaction-key="${escapeAttr(key)}" title="${escapeAttr(label)}" aria-label="${escapeAttr(label)}">${visual} <span>${list.length}</span></button>`;
  }).join('')}</div>`;
}
function namesForReaction(list){ return (list||[]).join(', '); }
function toolsHtml(m){
  const mine = m.sender===sender;
  let html = `<div class="message-tools">`;
  html += `<button type="button" class="tool-btn react-btn" data-react-id="${escapeAttr(m.id)}" aria-label="React to message" aria-haspopup="true">😊</button>`;
  html += `<button type="button" class="tool-btn star-btn" data-star-id="${escapeAttr(m.id)}" aria-label="Save message">★</button>`;
  html += `<button type="button" class="tool-btn reply-btn" data-reply-id="${escapeAttr(m.id)}" aria-label="Reply to message">↩</button>`;
  if(mine && m.text){
    html += `<button type="button" class="tool-btn edit-btn" data-edit-id="${escapeAttr(m.id)}" aria-label="Edit message">✏</button>`;
  }
  if(mine){
    html += `<button type="button" class="tool-btn delete-btn" data-delete-id="${escapeAttr(m.id)}" aria-label="Delete message">🗑</button>`;
  }
  html += `</div>`;
  return html;
}
function bubbleInner(m){
  if(m.deleted) return `<div class="text deleted-text">🚫 This message was deleted</div>`;
  const attachments=(m.attachments||[]).map(attachmentHtml).join('');
  const embeds=(m.embeds||[]).map(embedHtml).join('');
  const edited = m.edited ? '<span class="edited-tag">(edited)</span>' : '';
  return `${replyHtml(m.replyTo)}${m.text?`<div class="text">${linkify(m.text)}${edited}</div>`:''}${attachments}${embeds}${soundsHtml(m)}${reactionsHtml(m)}${toolsHtml(m)}`;
}
function ensureDateSeparator(ts){
  const key = dateKey(ts);
  if(messagesEl.dataset.lastDateKey === key) return;
  messagesEl.dataset.lastDateKey = key;
  const sep = document.createElement('div');
  sep.className = 'date-sep';
  sep.dataset.key = key;
  sep.innerHTML = `<span>${escapeHtml(dateLabel(ts))}</span>`;
  messagesEl.appendChild(sep);
}
function maybeInsertUnreadDivider(){
  if(unreadDividerShown) return;
  unreadDividerShown = true;
  const div = document.createElement('div');
  div.id = 'unreadDivider';
  div.className = 'unread-sep';
  div.innerHTML = `<span>New messages</span>`;
  messagesEl.appendChild(div);
}
function removeUnreadDivider(){
  unreadDividerShown = false;
  document.getElementById('unreadDivider')?.remove();
}
let followBottom=true;
function isNearBottom(threshold=140){ return messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight < threshold; }
function scrollToRealBottom(behavior='auto'){ followBottom=true; let stable=0,last=-1; const tick=()=>{const h=messagesEl.scrollHeight; messagesEl.scrollTop=h; if(h===last){stable++;}else{stable=0;last=h;} if(stable<3) requestAnimationFrame(tick);}; requestAnimationFrame(tick); if(behavior==='smooth') messagesEl.scrollTo({top:messagesEl.scrollHeight,behavior:'smooth'}); }
function renderMessage(m, opts={}){
  if(rendered.has(m.id)){ updateMessage(m); return; }
  rendered.add(m.id);
  const empty=messagesEl.querySelector('.empty'); if(empty) empty.remove();
  const mine=m.sender===sender;
  if(!opts.skipDateSep) ensureDateSeparator(m.createdAt);
  if(opts.trackUnread && document.hidden && !mine) maybeInsertUnreadDivider();
  const el=document.createElement('article');
  el.className=`message ${mine?'mine':''}${m.deleted?' is-deleted':''}`;
  el.dataset.id=m.id;
  el.innerHTML=`<div class="meta"><b>${escapeHtml(m.sender)}</b><span title="${escapeAttr(dateTime(m.createdAt))}">${time(m.createdAt)}</span>${statusHtml(m)}</div><div class="bubble">${bubbleInner(m)}</div>`;
  messagesEl.appendChild(el);
  if(opts.forceScroll || followBottom || isNearBottom()) scrollToRealBottom();

}
function updateMessage(m){
  const el = messagesEl.querySelector(`.message[data-id="${CSS.escape(m.id)}"]`);
  if(!el) return;
  const mine=m.sender===sender;
  el.className=`message ${mine?'mine':''}${m.deleted?' is-deleted':''}`;
  const bubble = el.querySelector('.bubble');
  if(bubble) bubble.innerHTML = bubbleInner(m);
  const meta = el.querySelector('.meta');
  if(meta) meta.innerHTML = `<b>${escapeHtml(m.sender)}</b><span title="${escapeAttr(dateTime(m.createdAt))}">${time(m.createdAt)}</span>${statusHtml(m)}`;
}
function findMessage(id){ return (window.__frostHistory||[]).find(m=>m.id===id) }
function rerenderAll(history){
  messagesEl.innerHTML=''; rendered.clear(); delete messagesEl.dataset.lastDateKey;
  history.forEach(m=>renderMessage(m,{skipDateSep:false}));
  emptyState();
  requestAnimationFrame(()=>scrollToRealBottom());
}
function emptyState(){if(!messagesEl.children.length)messagesEl.innerHTML='<div class="empty"><div><b>THE FROST IS QUIET</b><span>Send a message, upload media, or paste a link.</span></div></div>'}
async function upload(file){const fd=new FormData();fd.append('file',file);const r=await fetch(`${API_BASE}/api/upload`,{method:'POST',body:fd});if(!r.ok)throw new Error(await r.text());return r.json()}
async function resolveUrl(url){try{const r=await fetch(`${API_BASE}/api/resolve`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({url})});return r.ok?await r.json():null}catch{return null}}
function firstImagePreview(m){ return m?.attachments?.find(a=>a.kind==='image'||a.kind==='gif')?.url || m?.embeds?.find(e=>e.mediaKind==='image'||e.mediaKind==='gif')?.url || null; }
function setReply(m){
  cancelEditState();
  replyingTo={id:m.id,sender:m.sender,text:m.text||'',createdAt:m.createdAt,previewImage:firstImagePreview(m),previewAudio:m.attachments?.some(a=>a.kind==='audio'),previewVideo:m.attachments?.some(a=>a.kind==='video')};
  replyBar.innerHTML=`<span aria-hidden="true">↩</span>${replyingTo.previewImage?`<img class="reply-bar-preview" src="${escapeAttr(replyingTo.previewImage)}" alt="">`:''}<span id="replyText">Replying to ${escapeHtml(m.sender)}: ${escapeHtml((m.text||'media message').slice(0,120))}</span><button id="cancelReply" type="button" aria-label="Cancel reply">×</button>`;
  replyText=document.getElementById('replyText');
  document.getElementById('cancelReply').onclick=cancelReplyState;
  replyBar.classList.remove('hidden'); input.focus();
}
function cancelReplyState(){replyingTo=null;replyBar.classList.add('hidden');replyText.textContent=''}
function setEdit(m){
  cancelReplyState();
  editingId = m.id;
  input.value = m.text || '';
  input.style.height='auto';input.style.height=Math.min(input.scrollHeight,150)+'px';
  editBar.classList.remove('hidden');
  input.focus();
}
function cancelEditState(){editingId=null;editBar.classList.add('hidden');}

async function send(){
  const text=input.value.trim();
  if(editingId){
    if(!text){ alert('Message text cannot be empty.'); return; }
    socket.emit('message:edit', {id: editingId, sender, text});
    input.value=''; input.style.height='auto'; cancelEditState();
    return;
  }
  const files=[...fileInput.files];
  if(!text&&!files.length&&!replyingTo)return;
  const attachments=[];
  for(const f of files){try{attachments.push(await upload(f))}catch(e){alert(`Upload failed: ${f.name}`)}}
  const embeds=[];
  for(const raw of (text.match(/https?:\/\/[^\s<>]+/gi)||[])){
    const url=raw.replace(/[),.;!?]+$/,'');
    const e=await resolveUrl(url);
    if(e) embeds.push(e);
  }
  socket.emit('message:send',{sender,text,attachments,embeds,replyTo:replyingTo});
  input.value='';input.style.height='auto';fileInput.value='';stopTyping();cancelReplyState();
}
composer.addEventListener('submit',e=>{e.preventDefault();send()});
attachBtn.onclick=()=>fileInput.click();
fileInput.onchange=()=>send();
input.addEventListener('input',()=>{input.style.height='auto';input.style.height=Math.min(input.scrollHeight,150)+'px';if(!editingId){socket.emit('typing:start',{sender});clearTimeout(typingTimer);typingTimer=setTimeout(stopTyping,900)}});
input.addEventListener('keydown',e=>{
  if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}
  if(e.key==='Escape'){ if(editingId){input.value='';input.style.height='auto';cancelEditState()} else if(replyingTo){cancelReplyState()} }
});
function stopTyping(){clearTimeout(typingTimer);socket.emit('typing:stop',{sender})}
cancelReply.onclick=cancelReplyState;
replyBar.addEventListener('click',e=>{if(e.target.closest('#cancelReply'))return;if(replyingTo){jumpToMessage(replyingTo.id);}});
cancelEdit.onclick=()=>{input.value='';input.style.height='auto';cancelEditState()};

function jumpToMessage(id){
  const el=messagesEl.querySelector(`.message[data-id="${CSS.escape(id)}"]`);
  if(!el)return;
  el.scrollIntoView({behavior:'smooth',block:'center'});
  el.classList.remove('message-jump'); void el.offsetWidth; el.classList.add('message-jump');
  setTimeout(()=>el.classList.remove('message-jump'),1500);
}

messagesEl.addEventListener('click',e=>{const media=e.target.closest('.media img,.media video,.media .file-icon,.media a');if(!media)return;const wrap=media.closest('.media');if(!wrap)return;e.preventDefault();openMediaPreview(wrap);});
function openMediaPreview(wrap){const dlg=document.getElementById('mediaPreview'),body=document.getElementById('mediaPreviewBody'),title=document.getElementById('mediaPreviewTitle');body.innerHTML='';const img=wrap.querySelector('img'),vid=wrap.querySelector('video'),aud=wrap.querySelector('audio'),link=wrap.querySelector('a');title.textContent=link?.textContent?.trim()||img?.alt||'PREVIEW';if(img){const x=document.createElement('img');x.src=img.currentSrc||img.src;body.append(x)}else if(vid){const x=vid.cloneNode(true);x.controls=true;x.autoplay=true;body.append(x)}else if(aud){const x=aud.cloneNode(true);x.controls=true;body.append(x)}else if(link){const a=link.cloneNode(true);a.textContent='Open file';a.target='_blank';body.append(a)}dlg.showModal();}
document.getElementById('mediaPreviewClose')?.addEventListener('click',()=>document.getElementById('mediaPreview')?.close());
messagesEl.addEventListener('click', async e=>{ 
  const starButton=e.target.closest('.star-btn'); if(starButton){saveStarMessage(starButton.dataset.starId);return;} 
  const replyButton=e.target.closest('.reply-btn,.reply-quote');
  if(replyButton){
    const targetId=replyButton.dataset.replyId;
    const target=findMessage(targetId);
    if(!target)return;
    if(replyButton.classList.contains('reply-quote')) jumpToMessage(targetId); else setReply(target);
    return;
  }
  const editButton=e.target.closest('.edit-btn');
  if(editButton){
    const target=findMessage(editButton.dataset.editId);
    if(target) setEdit(target);
    return;
  }
  const deleteButton=e.target.closest('.delete-btn');
  if(deleteButton){
    const msgId=deleteButton.dataset.deleteId;
    if(confirm('Delete this message for everyone?')) socket.emit('message:delete',{id:msgId, sender});
    return;
  }
  const reactButton=e.target.closest('.react-btn');
  if(reactButton){
    openReactPicker(reactButton, reactButton.dataset.reactId);
    return;
  }
  const pillButton=e.target.closest('.reaction-pill');
  if(pillButton){
    const key=pillButton.dataset.reactionKey || '';
    if(key.startsWith('img:')){
      reactionImageView.src=key.slice(4); reactionImageViewer.showModal();
    } else socket.emit('message:react',{id:pillButton.dataset.reactId, sender, type:'emoji', emoji:key});
    return;
  }
  const audioBtn=e.target.closest('.background-audio-btn');
  if(audioBtn){ setBackgroundAudio(audioBtn.dataset.audioUrl); return; }
  const soundMsgBtn=e.target.closest('.sound-message-btn');
  if(soundMsgBtn){ playSound(soundMsgBtn.dataset.soundUrl); return; }
  const preview=e.target.closest('.preview-link');
  if(preview){
    const card=preview.closest('.linkcard');
    const url=card?.dataset.url;
    if(!url)return;
    preview.disabled=true;preview.textContent='Fetching…';
    const data=await resolveUrl(url);
    if(data){
      const wrapper=document.createElement('div');wrapper.innerHTML=embedHtml(data);
      card.replaceWith(wrapper.firstElementChild);
    }else{preview.textContent='Unavailable';preview.disabled=false;}
  }
});

['dragenter','dragover'].forEach(ev=>document.addEventListener(ev,e=>{
  if(e.target.closest('#editDropZone,#canvasWrap')) return;
  e.preventDefault(); dropzone.classList.remove('hidden');
}));
['dragleave','drop'].forEach(ev=>document.addEventListener(ev,e=>{
  if(e.target.closest('#editDropZone,#canvasWrap')) return;
  e.preventDefault();
  if(ev==='dragleave'&&!e.relatedTarget) dropzone.classList.add('hidden');
  if(ev==='drop'){
    dropzone.classList.add('hidden');
    const files=[...e.dataTransfer.files];
    if(files.length){
      const dt=new DataTransfer(); files.forEach(f=>dt.items.add(f));
      fileInput.files=dt.files; send();
    }
  }
}));
editDropZone.addEventListener('dragenter',e=>{e.preventDefault();e.stopPropagation();dropzone.classList.add('hidden');editDropZone.classList.add('dragging')});
editDropZone.addEventListener('dragover',e=>{e.preventDefault();e.stopPropagation();dropzone.classList.add('hidden');editDropZone.classList.add('dragging')});
editDropZone.addEventListener('dragleave',()=>editDropZone.classList.remove('dragging'));
editDropZone.addEventListener('drop',()=>dropzone.classList.add('hidden'));
editDropZone.addEventListener('drop',e=>{
  e.preventDefault();e.stopPropagation();editDropZone.classList.remove('dragging');
  const file=[...e.dataTransfer.files].find(f=>f.type.startsWith('image/'));
  if(file) openImageEditor(file,'send'); else alert('Drop an image here to edit.');
});
editDropZone.addEventListener('click',()=>openImageFilePicker('send'));
editDropZone.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openImageFilePicker('send')}});
canvasWrap.addEventListener('dragover',e=>{e.preventDefault();e.stopPropagation();canvasWrap.classList.add('dragging')});
canvasWrap.addEventListener('dragleave',()=>canvasWrap.classList.remove('dragging'));
canvasWrap.addEventListener('drop',e=>{
  e.preventDefault();e.stopPropagation();canvasWrap.classList.remove('dragging');
  const file=[...e.dataTransfer.files].find(f=>f.type.startsWith('image/'));
  if(file) openImageEditor(file,editorState.mode||'send');
});

function playNotification(){
  if(document.visibilityState==='visible') return;
  try{
    const ctx=new (window.AudioContext||window.webkitAudioContext)();
    const osc=ctx.createOscillator();const gain=ctx.createGain();
    osc.frequency.value=740;osc.type='sine';gain.gain.setValueAtTime(.0001,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.045,ctx.currentTime+.01);gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+.16);osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+.18);
  }catch{}
}
function updateTitle(){
  document.title = unreadCount>0 ? `(${unreadCount}) ${BASE_TITLE}` : BASE_TITLE;
}
function announce(msg){ liveRegion.textContent = msg; }
function maybeNotify(m){
  if(document.visibilityState==='visible') return;
  if(!('Notification' in window) || Notification.permission!=='granted') return;
  try{
    const body = m.text ? m.text.slice(0,120) : (m.attachments?.length ? 'Sent an attachment' : m.embeds?.length ? 'Sent a link' : 'New message');
    const n = new Notification(`${m.sender} · FROSTLINK`, {body, tag:'frostlink-msg'});
    n.onclick = ()=>{ window.focus(); n.close(); };
  }catch{}
}

document.addEventListener('visibilitychange', ()=>{
  if(document.visibilityState==='visible'){
    unreadCount=0; updateUnreadIndicator(); updateTitle(); removeUnreadDivider();
    socket.emit('messages:read');
  }
});

function updateUnreadIndicator(){
  newMessagesCount.textContent=String(unreadCount);
  newMessagesIndicator.classList.toggle('hidden', unreadCount===0);
}
function scrollToBottom(){ scrollToRealBottom('smooth'); unreadCount=0; updateUnreadIndicator(); updateTitle(); socket.emit('messages:read'); }
bottomBtn.onclick=scrollToBottom;
messagesEl.addEventListener('scroll',()=>{followBottom=isNearBottom();bottomBtn.classList.toggle('hidden',followBottom);if(followBottom){unreadCount=0;updateUnreadIndicator();}}); new ResizeObserver(()=>{if(followBottom)scrollToRealBottom()}).observe(messagesEl); new MutationObserver(()=>{if(followBottom)scrollToRealBottom()}).observe(messagesEl,{childList:true,subtree:true});
newMessagesIndicator.onclick=scrollToBottom;

socket.on('connect',()=>{statusText.textContent='CONNECTED';statusDot.style.background='#56efbd';statusDot.style.color='#56efbd';socket.emit('messages:read')});
socket.on('disconnect',()=>{statusText.textContent='RECONNECTING';statusDot.style.background='#ffbf62';statusDot.style.color='#ffbf62'});
socket.on('server:status', s=>{ if(Array.isArray(s?.reactionEmoji)&&s.reactionEmoji.length) reactionEmoji=s.reactionEmoji; });
socket.on('history',history=>{window.__frostHistory=history;rerenderAll(history)});
socket.on('message:new',m=>{
  window.__frostHistory=[...(window.__frostHistory||[]),m];
  messagesEl.querySelector('.empty')?.remove();
  renderMessage(m, {trackUnread:true});
  if(m.sender!==sender){
    playNotification();
    announce(`New message from ${m.sender}`);
    if(document.hidden){ unreadCount++; updateUnreadIndicator(); updateTitle(); maybeNotify(m); }
  }
});
socket.on('message:edited', p=>{
  const m = findMessage(p.id);
  if(m){ m.text=p.text; m.edited=true; m.editedAt=p.editedAt; updateMessage(m); }
});
socket.on('message:deleted', p=>{
  const m = findMessage(p.id);
  if(m){ m.deleted=true; m.deletedAt=p.deletedAt; m.text=''; m.attachments=[]; m.embeds=[]; m.sounds=[]; m.reactions={}; updateMessage(m); }
});
socket.on('message:reaction', p=>{
  const m = findMessage(p.id);
  if(m){ m.reactions=p.reactions||{}; updateMessage(m); }
});
socket.on('messages:status',x=>{
  window.__frostHistory=(window.__frostHistory||[]).map(m=>m.status?{...m,status:x.status}:m);
  document.querySelectorAll('.message.mine .delivery').forEach(el=>{
    el.textContent='✓✓'; el.title = x.status==='read'?'Read':'Delivered';
    el.classList.toggle('read', x.status==='read');
    el.classList.toggle('delivered', x.status==='delivered');
  });
});
socket.on('chat:cleared',()=>{window.__frostHistory=[];messagesEl.innerHTML='';rendered.clear();delete messagesEl.dataset.lastDateKey;emptyState()});
socket.on('typing',x=>{typingEl.textContent=x.active&&x.sender!==sender?`${x.sender} is typing…`:''});

settingsBtn.onclick=()=>settings.showModal();closeSettings.onclick=()=>settings.close();
clearChatBtn.onclick=()=>{if(confirm('Clear the entire Frostlink chat history for everyone? This cannot be undone.'))socket.emit('chat:clear')};
notifyBtn.onclick=async ()=>{
  if(!('Notification' in window)){ alert('Notifications are not supported in this browser.'); return; }
  const perm = await Notification.requestPermission();
  notifyBtn.textContent = perm==='granted' ? 'Enabled' : 'Enable';
};
if('Notification' in window && Notification.permission==='granted') notifyBtn.textContent='Enabled';

// Emoji picker — the emoji-picker-element component provides the full Unicode emoji
// library with categories and name search. A compact fallback remains for offline use.
function openFullEmojiPicker(anchor, mode, msgId){
  const existing=document.getElementById('fullEmojiPopover');
  if(existing) existing.remove();
  const pop=document.createElement('div');
  pop.id='fullEmojiPopover'; pop.className='full-emoji-popover';
  pop.innerHTML='<emoji-picker class="full-emoji-picker"></emoji-picker>';
  document.body.appendChild(pop);
  const rect=anchor.getBoundingClientRect();
  pop.style.left=Math.max(8,Math.min(rect.left,window.innerWidth-370))+'px';
  pop.style.top=Math.max(8,rect.top-pop.offsetHeight-8)+'px';
  const picker=pop.querySelector('emoji-picker');
  picker.addEventListener('emoji-click',ev=>{
    const emoji=ev.detail.unicode;
    if(mode==='react') socket.emit('message:react',{id:msgId,sender,type:'emoji',emoji});
    else { input.value += emoji; input.dispatchEvent(new Event('input')); input.focus(); }
    pop.remove();
  });
  setTimeout(()=>document.addEventListener('click',function close(e){
    if(!pop.contains(e.target)&&e.target!==anchor){pop.remove();document.removeEventListener('click',close)}
  }),0);
}
function buildEmojiGrid(){
  return reactionEmoji.slice(0,5).map(e=>`<button type="button" class="emoji-cell" data-emoji="${escapeAttr(e)}" aria-label="Insert ${escapeAttr(e)}">${e}</button>`).join('')
    + `<button type="button" class="emoji-cell emoji-more" data-full-emoji="1" aria-label="Search the full emoji library">＋</button>`;
}
function togglePopover(pop, anchor, show){
  if(show===false || (show===undefined && !pop.classList.contains('hidden'))){
    pop.classList.add('hidden'); anchor?.setAttribute('aria-expanded','false'); return;
  }
  document.querySelectorAll('.popover').forEach(p=>p.classList.add('hidden'));
  const rect=anchor.getBoundingClientRect();
  pop.style.left=Math.max(10,Math.min(rect.left,window.innerWidth-pop.offsetWidth-20))+'px';
  pop.style.top=Math.max(10,rect.top-8)+'px';
  pop.classList.remove('hidden');pop.style.transform='translateY(-100%)';
  anchor.setAttribute('aria-expanded','true');
}
emojiBtn.onclick=()=>{
  emojiPicker.innerHTML=buildEmojiGrid();
  togglePopover(emojiPicker,emojiBtn);
};
emojiPicker.addEventListener('click',e=>{
  const cell=e.target.closest('.emoji-cell');if(!cell)return;
  if(cell.dataset.fullEmoji){openFullEmojiPicker(emojiBtn,'insert');togglePopover(emojiPicker,null,false);return;}
  input.value+=cell.dataset.emoji;input.dispatchEvent(new Event('input'));input.focus();
});
function openReactPicker(anchor,msgId){
  reactPicker.innerHTML=buildEmojiGrid();
  reactPicker.dataset.msgId=msgId;
  reactPicker.dataset.fullAnchorId=anchor.id||'';
  togglePopover(reactPicker,anchor,true);
}
reactPicker.addEventListener('click',e=>{
  const cell=e.target.closest('.emoji-cell');if(!cell)return;
  if(cell.dataset.fullEmoji){openFullEmojiPicker(reactPicker,'react',reactPicker.dataset.msgId);togglePopover(reactPicker,null,false);return;}
  socket.emit('message:react',{id:reactPicker.dataset.msgId,sender,type:'emoji',emoji:cell.dataset.emoji});
  togglePopover(reactPicker,null,false);
});
document.addEventListener('click',e=>{
  if(!e.target.closest('.popover')&&!e.target.closest('#emojiBtn')&&!e.target.closest('.react-btn')){
    document.querySelectorAll('.popover').forEach(p=>p.classList.add('hidden'));
  }
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){document.querySelectorAll('.popover').forEach(p=>p.classList.add('hidden'));document.getElementById('fullEmojiPopover')?.remove();}
});

// Image editor / picture reactions.
const editorCtx=editorCanvas.getContext('2d');
const editorState={image:null,mode:'send',tool:'select',layers:[],strokes:[],selected:null,drag:null,history:[],redo:[]};
let editorFileInput=null;

function openImageFilePicker(mode){
  dropzone.classList.add('hidden');
  if(!editorFileInput){
    editorFileInput=document.createElement('input');editorFileInput.type='file';editorFileInput.accept='image/*';editorFileInput.hidden=true;
    editorFileInput.addEventListener('change',()=>{const f=editorFileInput.files?.[0];if(f)openImageEditor(f,mode);editorFileInput.value='';});
    document.body.appendChild(editorFileInput);
  }
  editorFileInput.dataset.mode=mode;editorFileInput.click();
}
function openImageEditor(file,mode='send'){
  if(!file||!file.type.startsWith('image/'))return;
  const reader=new FileReader();
  reader.onload=()=>{
    const img=new Image();
    img.onload=()=>{
      editorState.image=img;editorState.mode=mode;editorReact.hidden=mode!=='react';editorSend.hidden=mode==='react';editorState.layers=[];editorState.strokes=[];editorState.selected=null;editorState.drag=null;editorState.history=[];editorState.redo=[];
      imageEditor.showModal();canvasHint.classList.add('hidden');
      document.getElementById('editorModeText').textContent=mode==='react'?'Edit the picture, then add it as a reaction.':'Edit the picture, then send it as a new message.';
      fitEditorCanvas(img);renderEditor();
    }; img.src=reader.result;
  }; reader.readAsDataURL(file);
}
function fitEditorCanvas(img){
  const maxW=900,maxH=600,scale=Math.min(maxW/img.width,maxH/img.height,1);
  editorCanvas.width=Math.max(320,Math.round(img.width*scale));editorCanvas.height=Math.max(220,Math.round(img.height*scale));
  editorCanvas.style.aspectRatio=`${editorCanvas.width}/${editorCanvas.height}`;
}
function cloneLayer(l){return {...l};}
function editorSnapshot(){return {layers:editorState.layers.map(cloneLayer),strokes:structuredClone(editorState.strokes)}}
function editorPushHistory(){editorState.history.push(editorSnapshot());editorState.redo=[];if(editorState.history.length>50)editorState.history.shift();}
function restoreSnapshot(snap){try{editorState.layers=(snap.layers||[]).map(cloneLayer);editorState.strokes=structuredClone(snap.strokes||[]);editorState.selected=null;renderEditor()}catch{}}
function layerMetrics(l){
  editorCtx.font=`${l.size}px ${l.font}`;
  if(l.type==='text'){
    const lines=String(l.text).split('\n');const widths=lines.map(x=>editorCtx.measureText(x).width);
    return {w:Math.max(20,...widths),h:Math.max(24,lines.length*l.size*1.15)};
  }
  return {w:l.size*1.2,h:l.size*1.2};
}
function renderEditor(){
  const c=editorCanvas;editorCtx.clearRect(0,0,c.width,c.height);
  if(editorState.image)editorCtx.drawImage(editorState.image,0,0,c.width,c.height);
  for(const st of editorState.strokes){
    if(st.points.length<2)continue;
    editorCtx.save();editorCtx.lineCap='round';editorCtx.lineJoin='round';editorCtx.strokeStyle=st.color;editorCtx.lineWidth=st.size;
    editorCtx.beginPath();st.points.forEach((p,i)=>i?editorCtx.lineTo(p.x,p.y):editorCtx.moveTo(p.x,p.y));editorCtx.stroke();editorCtx.restore();
  }
  for(const l of editorState.layers){ const m=layerMetrics(l); editorCtx.save();editorCtx.translate(l.x+m.w/2,l.y+m.h/2);editorCtx.rotate((l.rotation||0)*Math.PI/180);editorCtx.scale(l.flipX?-1:1,l.flipY?-1:1);editorCtx.translate(-(l.x+m.w/2),-(l.y+m.h/2)); if(l.type==='image'&&l.img){editorCtx.drawImage(l.img,l.x,l.y,l.w,l.h);} else {editorCtx.font=`${l.size}px ${l.font}`;editorCtx.textBaseline='top';editorCtx.fillStyle=l.color;editorCtx.strokeStyle=l.outlineColor||'#000';editorCtx.lineWidth=l.outlineSize||0;if(l.type==='text')String(l.text).split('\n').forEach((line,i)=>{const y=l.y+i*l.size*1.15;if(l.outlineSize)editorCtx.strokeText(line,l.x,y);if(l.fill!==false)editorCtx.fillText(line,l.x,y);});else editorCtx.fillText(l.emoji,l.x,l.y);} editorCtx.restore(); }
  if(editorState.selected){
    const l=editorState.layers.find(x=>x.id===editorState.selected);
    if(l){const m=layerMetrics(l);editorCtx.save();editorCtx.strokeStyle='#61e8ff';editorCtx.setLineDash([5,4]);editorCtx.strokeRect(l.x-5,l.y-5,m.w+10,m.h+10);editorCtx.setLineDash([]);editorCtx.fillStyle='#61e8ff';editorCtx.fillRect(l.x+m.w,l.y+m.h,m.w>60?10:8,m.h>60?10:8);editorCtx.beginPath();editorCtx.arc(l.x+m.w/2,l.y-18,8,0,Math.PI*2);editorCtx.fill();editorCtx.restore();}
  }
}
function canvasPoint(e){const r=editorCanvas.getBoundingClientRect();return{x:(e.clientX-r.left)*editorCanvas.width/r.width,y:(e.clientY-r.top)*editorCanvas.height/r.height}}
function hitLayer(p){
  for(let i=editorState.layers.length-1;i>=0;i--){const l=editorState.layers[i],m=layerMetrics(l);if(p.x>=l.x-8&&p.x<=l.x+m.w+8&&p.y>=l.y-8&&p.y<=l.y+m.h+8)return l;}return null;
}
function nearHandle(p,l){const m=layerMetrics(l);return Math.abs(p.x-(l.x+m.w))<22&&Math.abs(p.y-(l.y+m.h))<22}
editorCanvas.addEventListener('pointerdown',e=>{
  if(!editorState.image)return;
  const p=canvasPoint(e);
  if(editorState.tool==='brush'||editorState.tool==='eraser'){
    editorPushHistory();
    if(editorState.tool==='brush'){editorState.strokes.push({color:editorColor.value,size:Number(editorSize.value),points:[p]});}
    else{
      const r=Number(editorSize.value)/2;
      editorState.strokes=editorState.strokes.filter(st=>!st.points.some(q=>Math.hypot(q.x-p.x,q.y-p.y)<=r));
    }
    editorState.drag={last:p};editorCanvas.setPointerCapture(e.pointerId);renderEditor();return;
  }
  const l=hitLayer(p);
  if(l){editorState.selected=l.id;editorPushHistory();const mm=layerMetrics(l);const rotating=Math.hypot(p.x-(l.x+mm.w/2),p.y-(l.y-18))<18;editorState.drag={layer:l,offsetX:p.x-l.x,offsetY:p.y-l.y,resizing:nearHandle(p,l),rotating};editorCanvas.setPointerCapture(e.pointerId);renderEditor();syncEditorControls(l);}
  else{editorState.selected=null;renderEditor();}
});
editorCanvas.addEventListener('pointermove',e=>{
  if(!editorState.drag)return;const p=canvasPoint(e),d=editorState.drag;
  if(editorState.tool==='brush'&&d.last){const st=editorState.strokes.at(-1);st.points.push(p);d.last=p;renderEditor();return;}
  if(editorState.tool==='eraser'){const r=Number(editorSize.value)/2;editorState.strokes=editorState.strokes.filter(st=>!st.points.some(q=>Math.hypot(q.x-p.x,q.y-p.y)<=r));renderEditor();return;}
  if(d.layer){
    if(d.rotating){const mm=layerMetrics(d.layer);d.layer.rotation=Math.round(Math.atan2(p.y-(d.layer.y+mm.h/2),p.x-(d.layer.x+mm.w/2))*180/Math.PI+90);} else if(d.resizing){const dx=p.x-d.layer.x,dy=p.y-d.layer.y;if(d.layer.type==='image'){d.layer.w=Math.max(20,dx);d.layer.h=Math.max(20,dy);}else d.layer.size=Math.max(8,Math.min(220,Math.round(Math.max(dx,dy)/(d.layer.type==='emoji'?1.2:1))));}
    else{d.layer.x=p.x-d.offsetX;d.layer.y=p.y-d.offsetY}
    renderEditor();
  }
});
editorCanvas.addEventListener('pointerup',()=>{editorState.drag=null});
editorCanvas.addEventListener('pointercancel',()=>{editorState.drag=null});
// Paste PNG/JPG/WebP with Ctrl+V directly into the editor; transparency stays intact.
document.addEventListener('paste',e=>{if(!imageEditor.open)return;const file=[...(e.clipboardData?.files||[])].find(f=>f.type.startsWith('image/'));if(!file)return;e.preventDefault();const img=new Image();img.onload=()=>{editorPushHistory();const maxW=Math.min(editorCanvas.width*.55,img.width),ratio=maxW/img.width;const l={id:`img_${Date.now()}_${Math.random()}`,type:'image',img,x:40,y:40,w:maxW,h:img.height*ratio,rotation:0,flipX:false,flipY:false};editorState.layers.push(l);editorState.selected=l.id;renderEditor();};img.src=URL.createObjectURL(file);});

document.querySelectorAll('.editor-tool').forEach(btn=>btn.addEventListener('click',()=>{
  document.querySelectorAll('.editor-tool').forEach(x=>x.classList.remove('active'));btn.classList.add('active');editorState.tool=btn.dataset.tool;
}));
editorAddText.onclick=()=>{
  const text=editorTextInput.value.trim();if(!text)return;
  editorPushHistory();const l={id:`l_${Date.now()}_${Math.random()}`,type:'text',text,x:30,y:30,size:Number(editorSize.value),color:editorColor.value,font:editorFont.value,outlineColor:editorOutlineColor?.value||'#000',outlineSize:Number(editorOutlineSize?.value||0),fill:editorFillEnabled?.checked!==false,rotation:0};
  editorState.layers.push(l);editorState.selected=l.id;editorState.tool='select';editorTextInput.value='';renderEditor();
};
editorEmojiPicker.addEventListener('emoji-click',e=>{
  editorPushHistory();const l={id:`l_${Date.now()}_${Math.random()}`,type:'emoji',emoji:e.detail.unicode,x:40,y:40,size:Number(editorSize.value),color:editorColor.value,font:editorFont.value};
  editorState.layers.push(l);editorState.selected=l.id;editorState.tool='select';renderEditor();
});
function syncEditorControls(l){
  if(!l)return;
  editorSize.value=Math.round(l.size);
  if(l.color&&/^#[0-9a-f]{6}$/i.test(l.color))editorColor.value=l.color;
  if(l.font)editorFont.value=l.font;
}
function selectedLayer(){return editorState.layers.find(l=>l.id===editorState.selected)}
editorColor.addEventListener('input',()=>{const l=selectedLayer();if(l){l.color=editorColor.value;renderEditor()}});editorOutlineColor?.addEventListener('input',()=>{const l=selectedLayer();if(l){l.outlineColor=editorOutlineColor.value;renderEditor()}});editorOutlineSize?.addEventListener('input',()=>{const l=selectedLayer();if(l){l.outlineSize=Number(editorOutlineSize.value);renderEditor()}});editorFillEnabled?.addEventListener('change',()=>{const l=selectedLayer();if(l){l.fill=editorFillEnabled.checked;renderEditor()}});editorSize.addEventListener('input',()=>{const n=Number(editorSize.value);if(brushPreview)brushPreview.style.width=brushPreview.style.height=`${Math.max(8,Math.min(42,n/3))}px`;const l=selectedLayer();if(l){l.size=n;renderEditor()}});
editorFont.addEventListener('change',()=>{const l=selectedLayer();if(l&&l.type==='text'){l.font=editorFont.value;renderEditor()}});

editorUndo.onclick=()=>{const snap=editorState.history.pop();if(snap){editorState.redo.push(editorSnapshot());restoreSnapshot(snap)}};editorRedo?.addEventListener('click',()=>{const snap=editorState.redo.pop();if(snap){editorState.history.push(editorSnapshot());restoreSnapshot(snap)}});document.addEventListener('keydown',e=>{if(!imageEditor.open)return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();if(e.shiftKey)editorRedo?.click();else editorUndo.click();}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();editorRedo?.click();}});
editorClearMarks.onclick=()=>{if(!editorState.strokes.length)return;editorPushHistory();editorState.strokes=[];renderEditor()};
editorClose.onclick=()=>imageEditor.close();
imageEditor.addEventListener('close',()=>{editorState.image=null;editorState.layers=[];editorState.strokes=[];editorState.selected=null;});
async function exportEditedImage(){
  return await new Promise(resolve=>editorCanvas.toBlob(blob=>resolve(new File([blob],`frost-edit-${Date.now()}.png`,{type:'image/png'})),'image/png',.92));
}
async function uploadEditedAnd(kind){
  try{
    const file=await exportEditedImage();if(!file)return;
    const uploaded=await upload(file);
    if(kind==='react') socket.emit('message:react',{id:editorState.reactMessageId,sender,type:'image',image:{url:uploaded.url,name:uploaded.name,mime:uploaded.mime,size:uploaded.size}});
    else socket.emit('message:send',{sender,text:'',attachments:[uploaded],embeds:[],replyTo:null});
    imageEditor.close();
  }catch(err){alert(`Image export/upload failed: ${err.message}`)}
}
editorAddImage?.addEventListener('click',()=>{const inp=document.createElement('input');inp.type='file';inp.accept='image/*';inp.onchange=()=>{const f=inp.files?.[0];if(!f)return;const img=new Image();img.onload=()=>{editorPushHistory();const maxW=Math.min(editorCanvas.width*.55,img.width),ratio=maxW/img.width;editorState.layers.push({id:`img_${Date.now()}`,type:'image',img,x:40,y:40,w:maxW,h:img.height*ratio,rotation:0});editorState.selected=editorState.layers.at(-1).id;renderEditor();};img.src=URL.createObjectURL(f);};inp.click();});
editorSend.onclick=()=>uploadEditedAnd('send');
editorReact.onclick=()=>uploadEditedAnd('react');

function openImageReactionEditor(msgId){
  editorState.reactMessageId=msgId;
  openImageFilePicker('react');
}

// Existing reaction button is emoji quick picker; add a picture editor button to it.
function addReactionPictureButton(){
  const btn=document.createElement('button');btn.type='button';btn.className='emoji-cell emoji-picture';btn.textContent='🖼️';btn.title='Edit a picture and react';
  btn.addEventListener('click',()=>{const id=reactPicker.dataset.msgId;togglePopover(reactPicker,null,false);openImageReactionEditor(id)});
  reactPicker.appendChild(btn);
}
const originalOpenReactPicker=openReactPicker;
openReactPicker=function(anchor,msgId){originalOpenReactPicker(anchor,msgId);addReactionPictureButton()};

editDropZone?.addEventListener('click',()=>openImageFilePicker('send'));// GIPHY picker — API key stays on PC1 in .env; the browser only receives GIF results.
gifBtn.onclick=()=>{gifPicker.showModal();gifSearch.focus();if(!gifResults.children.length)searchGifs('trending')};
gifClose.onclick=()=>gifPicker.close();
gifSearchBtn.onclick=()=>searchGifs(gifSearch.value.trim()||'trending');
gifSearch.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();searchGifs(gifSearch.value.trim()||'trending')}});
async function searchGifs(q){
  if(!giphyEnabled){gifResults.innerHTML='<div class="picker-note">GIPHY is not configured. Add GIPHY_API_KEY to PC1\'s .env.</div>';return;}
  gifResults.innerHTML='<div class="picker-note">Searching the frost…</div>';
  try{
    const r=await fetch(`${API_BASE}/api/giphy/search?q=${encodeURIComponent(q)}`);const body=await r.json();
    if(!r.ok)throw new Error(body.error||'GIPHY failed');
    gifResults.innerHTML=(body.data||[]).map(g=>`<button class="gif-tile" type="button" data-url="${escapeAttr(g.url)}" data-title="${escapeAttr(g.title||'GIPHY GIF')}"><img src="${escapeAttr(g.preview||g.url)}" alt="${escapeAttr(g.title||'GIF')}"></button>`).join('')||'<div class="picker-note">No GIFs found.</div>';
  }catch(err){gifResults.innerHTML=`<div class="picker-note">${escapeHtml(err.message)}</div>`}
}
gifResults.addEventListener('click',e=>{const tile=e.target.closest('.gif-tile');if(!tile)return;const url=tile.dataset.url;socket.emit('message:send',{sender,text:'',attachments:[],embeds:[{url,kind:'direct',mediaKind:'gif',mode:'direct',title:tile.dataset.title}]});gifPicker.close()});

// --- Media, embeds, MyInstants and background controls ---
function setBackgroundAudio(url){
  if(!url)return;
  if(backgroundAudio){backgroundAudio.pause();backgroundAudio.remove();}
  backgroundAudio=new Audio(url); backgroundAudio.loop=true; backgroundAudio.volume=.55; backgroundAudio.play().catch(()=>{});
  let bar=document.getElementById('backgroundPlayer');
  if(!bar){bar=document.createElement('div');bar.id='backgroundPlayer';document.body.appendChild(bar);}
  bar.innerHTML=`<span>♫ Background music</span><button type="button" id="bgPause">Pause</button><button type="button" id="bgStop">Stop</button>`;
  bar.querySelector('#bgPause').onclick=()=>{if(backgroundAudio.paused){backgroundAudio.play();bar.querySelector('#bgPause').textContent='Pause'}else{backgroundAudio.pause();bar.querySelector('#bgPause').textContent='Play'}};
  bar.querySelector('#bgStop').onclick=()=>{backgroundAudio.pause();backgroundAudio.remove();backgroundAudio=null;bar.remove()};
}
function playSound(url){ if(!url)return; const a=new Audio(url); a.volume=.8; a.play().catch(()=>{}); }
embedBtn.onclick=()=>{embedBar.classList.remove('hidden');embedInput.focus();};
cancelEmbed.onclick=()=>{embedBar.classList.add('hidden');embedInput.value='';};
sendEmbedBtn.onclick=async()=>{const url=embedInput.value.trim();if(!url)return;const e=await resolveUrl(url);if(!e){alert('That link could not be embedded.');return;}socket.emit('message:send',{sender,text:'',attachments:[],embeds:[e],sounds:[],replyTo:null});cancelEmbed.onclick();};
embedInput.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();sendEmbedBtn.click()} });

soundBtn.onclick=()=>{soundPicker.showModal();soundSearch.focus();if(!soundResults.children.length)searchSounds('trending');};
soundClose.onclick=()=>soundPicker.close();
soundSearchBtn.onclick=()=>searchSounds(soundSearch.value.trim()||'trending');
soundSearch.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();searchSounds(soundSearch.value.trim()||'trending')}});
async function searchSounds(q){
  soundResults.innerHTML='<div class="picker-note">Searching MyInstants…</div>';
  try{
    const endpoint=q==='trending'?`${API_BASE}/api/myinstants/trending`:`${API_BASE}/api/myinstants/search?q=${encodeURIComponent(q)}`; const r=await fetch(endpoint); const body=await r.json();
    if(!r.ok)throw new Error(body.error||'MyInstants failed');
    soundResults.innerHTML=(body.data||[]).map(x=>`<div class="sound-tile"><button type="button" class="sound-play" data-url="${escapeAttr(x.mp3||x.url)}">▶</button><div><b>${escapeHtml(x.title)}</b><small>MyInstants</small></div><button type="button" class="sound-send" data-id="${escapeAttr(x.id)}" data-title="${escapeAttr(x.title)}" data-url="${escapeAttr(x.mp3||x.url)}">Send</button></div>`).join('')||'<div class="picker-note">No sounds found.</div>';
  }catch(err){soundResults.innerHTML=`<div class="picker-note">${escapeHtml(err.message)}</div>`}
}
soundResults.addEventListener('click',e=>{
  const play=e.target.closest('.sound-play'); if(play){playSound(play.dataset.url);return;}
  const send=e.target.closest('.sound-send'); if(send){socket.emit('message:send',{sender,text:'',attachments:[],embeds:[],sounds:[{id:send.dataset.id,title:send.dataset.title,mp3:send.dataset.url}] ,replyTo:null});soundPicker.close();}
});
reactionImageClose.onclick=()=>reactionImageViewer.close();

function applyBackground(){const v=localStorage.getItem('frostlink_bg')||'#020812';document.documentElement.style.setProperty('--chat-bg',v);if(bgColorInput)bgColorInput.value=v;}
saveBgBtn.onclick=()=>{localStorage.setItem('frostlink_bg',bgColorInput.value);applyBackground()};
resetBgBtn.onclick=()=>{localStorage.removeItem('frostlink_bg');applyBackground()};
applyBackground();

fetch(`${API_BASE}/api/config`).then(r=>r.json()).then(c=>{
  document.getElementById('roomName').textContent = c.roomName + ' · PRIVATE MEDIA CHANNEL';
  document.title=c.roomName;
  giphyEnabled=Boolean(c.giphyEnabled);
  if(Array.isArray(c.reactionEmoji)&&c.reactionEmoji.length) reactionEmoji=c.reactionEmoji;
});


// Saved tabs: messages, links and local device-file references.
const starPanel=document.getElementById('starPanel'),starTabs=document.getElementById('starTabs'),starItems=document.getElementById('starItems');
let savedStore=JSON.parse(localStorage.getItem('frostlink_saved_tabs')||'{"tabs":[{"id":"t1","name":"Saved","items":[]}],"active":"t1"}');
function persistSaved(){localStorage.setItem('frostlink_saved_tabs',JSON.stringify(savedStore));}
function activeSavedTab(){return savedStore.tabs.find(t=>t.id===savedStore.active)}
function renderSaved(){const tabs=savedStore.tabs||[];if(!tabs.length)savedStore={tabs:[{id:'t1',name:'Saved',items:[]}],active:'t1'};if(!tabs.some(t=>t.id===savedStore.active))savedStore.active=tabs[0].id;starTabs.innerHTML=tabs.map(t=>`<button class="star-tab ${t.id===savedStore.active?'active':''}" data-tab="${escapeAttr(t.id)}">${escapeHtml(t.name)}</button>`).join('');const tab=activeSavedTab();starItems.innerHTML=(tab.items||[]).map((x,i)=>`<div class="star-item" data-id="${escapeAttr(x.id)}" data-msg="${escapeAttr(x.messageId||'')}"><b>${String(i+1).padStart(2,'0')}</b><span title="${escapeAttr(x.url||x.name||x.label||'')}">${escapeHtml(x.label||x.name||x.preview||'Saved item')}</span><small>${escapeHtml(new Date(x.savedAt).toLocaleDateString())}</small><details class="star-item-menu"><summary>⋮</summary><div class="menu-pop"><button data-action="rename">Rename</button><button data-action="share">Share</button><button data-action="open">Open in new tab</button><button data-action="delete">Delete</button></div></details></div>`).join('')||'<div class="picker-note">Nothing saved in this tab.</div>';persistSaved();}
function addSavedItem(item){const tab=activeSavedTab();if(!tab)return;tab.items.push({id:'s'+Date.now()+Math.random().toString(36).slice(2),savedAt:Date.now(),...item});renderSaved();}
function saveStarMessage(id){const m=findMessage(id);if(!m)return;const tab=activeSavedTab();if(!tab||tab.items.some(x=>x.messageId===id))return;addSavedItem({messageId:id,label:m.text||m.attachments?.[0]?.name||m.embeds?.[0]?.title||'Saved message',preview:(m.text||'media').slice(0,180)});}
document.getElementById('starPanelBtn')?.addEventListener('click',()=>{starPanel.classList.toggle('hidden');renderSaved();});document.getElementById('starClose')?.addEventListener('click',()=>starPanel.classList.add('hidden'));
starTabs?.addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(b){savedStore.active=b.dataset.tab;renderSaved();}});
document.getElementById('starAddTab')?.addEventListener('click',()=>{if(savedStore.tabs.length>=5)return alert('Maximum 5 tabs.');const name=prompt('Tab name','New tab');if(!name)return;const id='t'+Date.now();savedStore.tabs.push({id,name:name.slice(0,30),items:[]});savedStore.active=id;renderSaved();});
document.getElementById('starRenameTab')?.addEventListener('click',()=>{const t=activeSavedTab();const n=t&&prompt('Rename tab',t.name);if(n){t.name=n.slice(0,30);renderSaved();}});
document.getElementById('starDeleteTab')?.addEventListener('click',()=>{if(savedStore.tabs.length<=1)return alert('Keep at least one tab.');const t=activeSavedTab();if(t&&confirm(`Delete tab "${t.name}" and its saved items?`)){savedStore.tabs=savedStore.tabs.filter(x=>x.id!==t.id);savedStore.active=savedStore.tabs[0].id;renderSaved();}});
document.getElementById('starAddLink')?.addEventListener('click',()=>{const url=prompt('Paste a link');if(!url)return;try{new URL(url);addSavedItem({label:url,name:url,url});}catch{alert('Enter a valid URL.')}});
document.getElementById('starAddDevice')?.addEventListener('click',()=>document.getElementById('starDeviceInput')?.click());
document.getElementById('starDeviceInput')?.addEventListener('change',e=>{for(const f of [...e.target.files||[]])addSavedItem({label:f.name,name:f.name,kind:'device-file',size:f.size});e.target.value='';});
starItems?.addEventListener('click',async e=>{const row=e.target.closest('.star-item');if(!row)return;const item=activeSavedTab()?.items.find(x=>x.id===row.dataset.id);const action=e.target.dataset.action;if(action&&item){if(action==='rename'){const n=prompt('Rename item',item.label||item.name||'');if(n){item.label=n.slice(0,120);renderSaved();}}else if(action==='delete'){const t=activeSavedTab();t.items=t.items.filter(x=>x.id!==item.id);renderSaved();}else if(action==='open'){if(item.url)window.open(item.url,'_blank','noopener');else if(item.messageId){starPanel.classList.add('hidden');jumpToMessage(item.messageId);}}else if(action==='share'){const text=item.url||item.label||item.name||'';try{if(navigator.share)await navigator.share({title:'Frostlink saved item',text,url:item.url});else await navigator.clipboard.writeText(text);alert('Shared/copied.');}catch{}}return;}if(item?.messageId){starPanel.classList.add('hidden');jumpToMessage(item.messageId);}else if(item?.url)window.open(item.url,'_blank','noopener');});renderSaved();

// Account gate: the application stays hidden until a real account session is verified.
const authDialog=document.getElementById('authDialog');
const PALETTE=['#61e8ff','#9b7bff','#ff79b0','#56efbd','#ffbf62','#ff7a7a','#73a8ff','#d38cff'];
function colorForUser(name=''){let h=0;for(const c of String(name).toLowerCase())h=((h<<5)-h+c.charCodeAt(0))|0;return PALETTE[Math.abs(h)%PALETTE.length];}
function applyUser(name){sender=name;localStorage.setItem('frostlink_sender',sender);document.getElementById('nodeName').textContent=sender;document.getElementById('accountNameSetting').textContent=sender+' · colour assigned automatically';}
function applyMessageColours(){document.querySelectorAll('.message').forEach(el=>{const n=el.querySelector('.meta b')?.textContent||'';el.style.setProperty('--sender-color',colorForUser(n));});}
new MutationObserver(applyMessageColours).observe(document.getElementById('messages'),{childList:true,subtree:true});
document.getElementById('authBtn')?.addEventListener('click',()=>authDialog.showModal());document.getElementById('authClose')?.addEventListener('click',()=>authDialog.close());
async function accountRequest(action,email,username,password){const r=await fetch(`${API_BASE}/api/auth/${action}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,username,password})});const b=await r.json();if(!r.ok)throw new Error(b.error||'Account request failed');return b;}
function enterApp(b){if(!b?.token||!b?.username)throw new Error('Session was not created.');localStorage.setItem('frostlink_auth_token',b.token);applyUser(b.username);document.getElementById('authGate').classList.add('hidden');document.getElementById('appShell').classList.remove('hidden');authDialog?.close();applyMessageColours();}
async function gateAction(action){const email=document.getElementById('gateEmail').value.trim(),username=document.getElementById('gateUsername').value.trim(),password=document.getElementById('gatePassword').value,status=document.getElementById('gateStatus');status.textContent='Working…';try{enterApp(await accountRequest(action,email,username,password));status.textContent='';}catch(e){status.textContent=e.message;}}
document.getElementById('gateLogin')?.addEventListener('click',()=>gateAction('login'));document.getElementById('gateRegister')?.addEventListener('click',()=>gateAction('register'));
async function verifyExistingSession(){const token=localStorage.getItem('frostlink_auth_token');if(!token)return;try{const r=await fetch(`${API_BASE}/api/auth/me`,{headers:{authorization:`Bearer ${token}`}});const b=await r.json();if(!r.ok)throw new Error();applyUser(b.username);document.getElementById('authGate').classList.add('hidden');document.getElementById('appShell').classList.remove('hidden');}catch{localStorage.removeItem('frostlink_auth_token');}}
verifyExistingSession();
async function accountCall(action){const email=document.getElementById('authEmail').value.trim(),username=document.getElementById('authUsername').value.trim(),password=document.getElementById('authPassword').value,status=document.getElementById('authStatus');status.textContent='Working…';try{const b=await accountRequest(action,email,username,password);enterApp(b);status.textContent=b.message||'Done';}catch(e){status.textContent=e.message;}}
document.getElementById('authRegister')?.addEventListener('click',()=>accountCall('register'));document.getElementById('authLogin')?.addEventListener('click',()=>accountCall('login'));


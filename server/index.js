require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const cors = require('cors');
const { Server } = require('socket.io');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const PORT = Number(process.env.PORT || 3000);
const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB || 100);
const ROOM_NAME = process.env.ROOM_NAME || 'FROSTLINK';
const MAX_HISTORY = Number(process.env.MAX_HISTORY || 500);
const GIPHY_API_KEY = String(process.env.GIPHY_API_KEY || '').trim();
const GIPHY_RATING = process.env.GIPHY_RATING || 'pg-13';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const SUPABASE_URL = String(process.env.SUPABASE_URL || '').trim();
const SUPABASE_SERVICE_ROLE_KEY = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'frostlink-uploads';
const AUTH_JWT_SECRET = String(process.env.AUTH_JWT_SECRET || '').trim();

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !AUTH_JWT_SECRET) {
  console.error('Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or AUTH_JWT_SECRET.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const REACTION_EMOJI = ['👍', '❤️', '😂', '😮', '🔥'];
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  maxHttpBufferSize: 1 * 1024 * 1024,
  cors: { origin: CORS_ORIGIN, methods: ['GET', 'POST'], credentials: false }
});

app.use(cors({ origin: CORS_ORIGIN, credentials: false }));
app.options(/.*/, cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024 }
});

function id(prefix = 'id') {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}
function safeFilename(original) {
  const ext = path.extname(original).toLowerCase().slice(0, 12);
  return `${Date.now()}_${crypto.randomBytes(6).toString('hex')}${ext}`;
}
function mediaKind(mime = '') {
  if (mime === 'image/gif') return 'gif';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime === 'application/pdf') return 'pdf';
  return 'file';
}
function directMedia(url) {
  try {
    const u = new URL(url);
    const ext = path.extname(u.pathname).toLowerCase();
    if (['.mp4','.webm','.mov','.m4v','.ogv'].includes(ext)) return 'video';
    if (['.mp3','.wav','.ogg','.m4a','.aac','.flac'].includes(ext)) return 'audio';
    if (ext === '.gif') return 'gif';
    if (['.jpg','.jpeg','.png','.webp','.avif'].includes(ext)) return 'image';
    return null;
  } catch { return null; }
}
function provider(url) {
  try {
    const u = new URL(url);
    if (/(^|\.)youtube\.com$/.test(u.hostname) || u.hostname === 'youtu.be') return 'youtube';
    if (/(^|\.)vimeo\.com$/.test(u.hostname)) return 'vimeo';
    if (/(^|\.)instagram\.com$/.test(u.hostname) || u.hostname === 'instagr.am') return 'instagram';
    if (/(^|\.)openstreetmap\.org$/.test(u.hostname)) return 'map';
    return null;
  } catch { return null; }
}
function cleanUrl(url='') { return String(url).trim().replace(/[),.;!?]+$/, ''); }
function safeReply(reply) {
  if (!reply || typeof reply !== 'object') return null;
  return {
    id: String(reply.id || '').slice(0, 100),
    sender: String(reply.sender || '').slice(0, 40),
    text: String(reply.text || '').slice(0, 500),
    createdAt: Number(reply.createdAt || 0),
    previewImage: /^https?:\/\//i.test(String(reply.previewImage || '')) ? String(reply.previewImage) : null,
    previewAudio: Boolean(reply.previewAudio),
    previewVideo: Boolean(reply.previewVideo)
  };
}

async function getMessages() {
  const { data, error } = await supabase
    .from('frostlink_messages')
    .select('message')
    .order('created_at', { ascending: true })
    .limit(MAX_HISTORY);
  if (error) throw error;
  return (data || []).map(r => r.message);
}
async function insertMessage(message) {
  const { error } = await supabase.from('frostlink_messages').insert({
    id: message.id,
    created_at: new Date(message.createdAt).toISOString(),
    message
  });
  if (error) throw error;
}
async function updateMessage(message) {
  const { error } = await supabase.from('frostlink_messages').update({
    created_at: new Date(message.createdAt).toISOString(),
    message
  }).eq('id', message.id);
  if (error) throw error;
}
async function findMessage(messageId) {
  const { data, error } = await supabase.from('frostlink_messages').select('message').eq('id', messageId).maybeSingle();
  if (error) throw error;
  return data?.message || null;
}
async function clearMessages() {
  const { error } = await supabase.from('frostlink_messages').delete().not('id', 'is', null);
  if (error) throw error;
}
function publicUploadUrl(filename) {
  return `${SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/${encodeURIComponent(SUPABASE_BUCKET)}/${encodeURIComponent(filename)}`;
}
function isOurUpload(url='') {
  return String(url).startsWith(publicUploadUrl('').replace(/%2F$/, '/'));
}

const MAJOR_EMAIL_DOMAINS = new Set(['gmail.com','googlemail.com','yahoo.com','yahoo.co.in','outlook.com','hotmail.com','live.com','icloud.com','proton.me','protonmail.com']);
function validMajorEmail(email=''){ const m=String(email).trim().toLowerCase().match(/^[^\s@]+@([^\s@]+)$/); return Boolean(m && MAJOR_EMAIL_DOMAINS.has(m[1])); }
function hashPassword(password, salt=crypto.randomBytes(16).toString('hex')){const hash=crypto.scryptSync(String(password),salt,64).toString('hex');return `${salt}:${hash}`;}
function verifyPassword(password, packed=''){const [salt,hash]=String(packed).split(':');if(!salt||!hash)return false;return crypto.timingSafeEqual(Buffer.from(hash,'hex'),Buffer.from(hashPassword(password,salt).split(':')[1],'hex'));}
app.post('/api/auth/register', async (req,res)=>{const email=String(req.body?.email||'').trim().toLowerCase(),username=String(req.body?.username||'').trim(),password=String(req.body?.password||'');if(!validMajorEmail(email))return res.status(400).json({error:'Use Gmail, Yahoo, Outlook, Hotmail, iCloud, or another supported major provider.'});if(!/^[A-Za-z0-9_. -]{3,40}$/.test(username))return res.status(400).json({error:'Username must be 3–40 characters.'});if(password.length<8)return res.status(400).json({error:'Password must be at least 8 characters.'});try{const {data:existing,error:checkErr}=await supabase.from('frostlink_accounts').select('email').eq('email',email).maybeSingle();if(checkErr)throw checkErr;if(existing)return res.status(409).json({error:'An account already exists for this email.'});const {error}=await supabase.from('frostlink_accounts').insert({email,username,password_hash:hashPassword(password)});if(error)throw error;res.json({message:'Account created.',username,token:signSession(email,username)});}catch(err){console.error('register',err);res.status(500).json({error:'Account service unavailable. Run the updated Supabase SQL.'});}});
function signSession(email, username){ return jwt.sign({sub:email, username}, AUTH_JWT_SECRET, {expiresIn:'7d'}); }
function requireAuth(req,res,next){ const h=String(req.headers.authorization||''); const token=h.startsWith('Bearer ')?h.slice(7):''; try{ req.user=jwt.verify(token,AUTH_JWT_SECRET); next(); }catch{ res.status(401).json({error:'Authentication required.'}); } }
app.post('/api/auth/login', async (req,res)=>{const email=String(req.body?.email||'').trim().toLowerCase(),password=String(req.body?.password||'');try{const {data,error}=await supabase.from('frostlink_accounts').select('username,password_hash').eq('email',email).maybeSingle();if(error)throw error;if(!data||!verifyPassword(password,data.password_hash))return res.status(401).json({error:'Invalid email or password.'});res.json({message:'Logged in.',username:data.username,token:signSession(email,data.username)});}catch(err){console.error('login',err);res.status(500).json({error:'Account service unavailable.'});}});
app.get('/api/auth/me', requireAuth, (req,res)=>res.json({email:req.user.sub,username:req.user.username}));

app.get('/api/health', (_req, res) => res.json({ ok: true, room: ROOM_NAME, time: Date.now() }));
app.get('/api/config', (_req, res) => res.json({
  roomName: ROOM_NAME,
  maxUploadMB: MAX_UPLOAD_MB,
  giphyEnabled: Boolean(GIPHY_API_KEY),
  reactionEmoji: REACTION_EMOJI
}));
app.get('/api/messages', async (_req, res) => {
  try { res.json(await getMessages()); }
  catch (err) { res.status(500).json({ error: 'Database unavailable.' }); }
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
  try {
    const filename = safeFilename(req.file.originalname);
    const { error } = await supabase.storage.from(SUPABASE_BUCKET).upload(filename, req.file.buffer, {
      contentType: req.file.mimetype || 'application/octet-stream',
      upsert: false
    });
    if (error) throw error;
    const kind = mediaKind(req.file.mimetype);
    res.json({
      id: id('file'), kind, name: req.file.originalname, mime: req.file.mimetype,
      size: req.file.size, url: publicUploadUrl(filename)
    });
  } catch (err) {
    console.error('upload:', err);
    res.status(500).json({ error: 'Upload failed.' });
  }
});

async function proxyMyInstants(req, res, endpointPath) {
  try {
    const endpoint = new URL(`https://myinstants-api.vercel.app/${endpointPath}`);
    if (req.query.q) endpoint.searchParams.set('q', String(req.query.q).slice(0, 80));
    const r = await fetch(endpoint, { headers: { 'user-agent': 'Frostlink/2.0', accept: 'application/json' } });
    if (!r.ok) return res.status(r.status).json({ error: 'MyInstants request failed.' });
    const body = await r.json();
    const raw = Array.isArray(body) ? body : (body.data || body.results || body.sounds || []);
    const data = raw.map(x => ({
      id: String(x.id ?? x.slug ?? x.name ?? Math.random()),
      title: String(x.title ?? x.name ?? x.text ?? 'Sound').slice(0, 160),
      url: x.url ?? x.page_url ?? x.link ?? null,
      mp3: x.mp3 ?? x.audio ?? x.audio_url ?? x.sound ?? x.file ?? null,
      image: x.image ?? x.thumbnail ?? null
    })).filter(x => /^https?:\/\//i.test(String(x.mp3 || '')) || /^https?:\/\//i.test(String(x.url || '')));
    res.json({ data });
  } catch (err) { res.status(502).json({ error: `MyInstants unavailable: ${err.message}` }); }
}
app.get('/api/myinstants/trending', (req, res) => proxyMyInstants(req, res, 'trending'));
app.get('/api/myinstants/search', (req, res) => {
  if (!String(req.query.q || '').trim()) return res.json({ data: [] });
  return proxyMyInstants(req, res, 'search');
});

app.get('/api/giphy/search', async (req, res) => {
  if (!GIPHY_API_KEY) return res.status(503).json({ error: 'GIPHY is not configured.' });
  const q = String(req.query.q || '').trim().slice(0, 50);
  if (!q) return res.json({ data: [] });
  try {
    const endpoint = new URL('https://api.giphy.com/v1/gifs/search');
    endpoint.searchParams.set('api_key', GIPHY_API_KEY);
    endpoint.searchParams.set('q', q);
    endpoint.searchParams.set('limit', '18');
    endpoint.searchParams.set('rating', GIPHY_RATING);
    const r = await fetch(endpoint, { headers: { 'user-agent': 'Frostlink/2.0' } });
    if (!r.ok) return res.status(r.status).json({ error: 'GIPHY request failed.' });
    const body = await r.json();
    const data = (body.data || []).map(g => ({
      id: g.id, title: g.title,
      url: g.images?.original?.url || g.images?.downsized?.url,
      mp4: g.images?.original?.mp4 || g.images?.downsized?.mp4 || null,
      preview: g.images?.fixed_width_small?.url || g.images?.preview_gif?.url || g.images?.downsized?.url,
      giphyUrl: g.url
    })).filter(x => x.url);
    res.json({ data });
  } catch (err) { res.status(502).json({ error: `GIPHY unavailable: ${err.message}` }); }
});

app.post('/api/resolve', async (req, res) => {
  const url = cleanUrl(req.body?.url || '');
  if (!/^https?:\/\//i.test(url)) return res.status(400).json({ error: 'Only HTTP(S) URLs are supported.' });
  const kind = directMedia(url);
  if (kind) return res.json({ url, kind, mediaKind: kind, mode: 'direct' });
  const p = provider(url);
  if (p === 'youtube' || p === 'vimeo') return res.json({ url, provider: p, mode: 'provider' });
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const r = await fetch(url, { redirect: 'follow', signal: controller.signal, headers: { 'user-agent': 'Mozilla/5.0 FrostlinkLinkPreview/2.0', accept: 'text/html,application/xhtml+xml' } });
    clearTimeout(timer);
    const type = r.headers.get('content-type') || '';
    if (!type.includes('text/html')) return res.json({ url, provider: p, mode: 'link' });
    const html = (await r.text()).slice(0, 1500000);
    const getMeta = name => {
      const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re1 = new RegExp(`<meta[^>]+(?:property|name)=["']${esc}["'][^>]+content=["']([^"']*)["']`, 'i');
      const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${esc}["']`, 'i');
      return (html.match(re1)?.[1] || html.match(re2)?.[1] || '').trim();
    };
    const title = getMeta('og:title') || (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').trim();
    const description = getMeta('og:description') || getMeta('description');
    const image = getMeta('og:image');
    const video = getMeta('og:video') || getMeta('og:video:url') || getMeta('twitter:player:stream');
    res.json({ url, provider: p, mode: 'link', title: title.slice(0, 240), description: description.slice(0, 500), image: image || null, video: video || null });
  } catch {
    res.json({ url, provider: p, mode: 'link', title: p === 'instagram' ? 'Instagram preview' : 'Open link', description: 'Preview could not be fetched. Open the original page.', image: null });
  }
});

io.on('connection', async socket => {
  try {
    socket.emit('history', await getMessages());
    socket.emit('server:status', { online: true, roomName: ROOM_NAME, reactionEmoji: REACTION_EMOJI });
  } catch (err) {
    socket.emit('history', []);
    console.error('history:', err);
  }

  socket.on('message:send', async payload => {
    try {
      const message = {
        id: id('msg'),
        sender: String(payload?.sender || 'Anonymous').slice(0, 40),
        text: String(payload?.text || '').slice(0, 10000),
        attachments: Array.isArray(payload?.attachments) ? payload.attachments.slice(0, 20) : [],
        embeds: Array.isArray(payload?.embeds) ? payload.embeds.slice(0, 20) : [],
        sounds: Array.isArray(payload?.sounds) ? payload.sounds.slice(0, 10).map(x => ({ id: String(x?.id || '').slice(0,120), title: String(x?.title || 'Sound').slice(0,160), mp3: String(x?.mp3 || '').slice(0,1000) })).filter(x => /^https?:\/\//i.test(x.mp3)) : [],
        replyTo: safeReply(payload?.replyTo),
        createdAt: Date.now(), status: io.sockets.sockets.size > 1 ? 'delivered' : 'sent', edited: false, deleted: false, reactions: {}
      };
      if (!message.text && !message.attachments.length && !message.embeds.length && !message.sounds.length) return;
      if (message.status === 'delivered') message.deliveredAt = Date.now();
      await insertMessage(message);
      io.emit('message:new', message);
    } catch (err) { console.error('message:send:', err); }
  });

  socket.on('message:edit', async payload => {
    try {
      const msgId = String(payload?.id || '');
      const sender = String(payload?.sender || '').slice(0, 40);
      const text = String(payload?.text || '').slice(0, 10000);
      const msg = await findMessage(msgId);
      if (!msg || msg.deleted || msg.sender !== sender) return;
      if (!text.trim() && !(msg.attachments || []).length && !(msg.embeds || []).length) return;
      msg.text = text; msg.edited = true; msg.editedAt = Date.now();
      await updateMessage(msg); io.emit('message:edited', { id: msg.id, text: msg.text, editedAt: msg.editedAt });
    } catch (err) { console.error('message:edit:', err); }
  });

  socket.on('message:delete', async payload => {
    try {
      const msgId = String(payload?.id || '');
      const sender = String(payload?.sender || '').slice(0, 40);
      const msg = await findMessage(msgId);
      if (!msg || msg.sender !== sender) return;
      msg.deleted = true; msg.deletedAt = Date.now(); msg.text = ''; msg.attachments = []; msg.embeds = []; msg.sounds = []; msg.reactions = {};
      await updateMessage(msg); io.emit('message:deleted', { id: msg.id, deletedAt: msg.deletedAt });
    } catch (err) { console.error('message:delete:', err); }
  });

  socket.on('message:react', async payload => {
    try {
      const msgId = String(payload?.id || '');
      const sender = String(payload?.sender || 'Anonymous').slice(0, 40);
      let reactionKey = '';
      if (payload?.type === 'image') {
        const url = String(payload?.image?.url || '').slice(0, 1500);
        if (!isOurUpload(url)) return;
        reactionKey = `img:${url}`;
      } else {
        const emoji = String(payload?.emoji || '');
        if (!emoji || emoji.length > 32 || /[\u0000-\u001f\u007f]/.test(emoji)) return;
        reactionKey = emoji;
      }
      const msg = await findMessage(msgId);
      if (!msg || msg.deleted) return;
      msg.reactions = msg.reactions || {};
      const list = msg.reactions[reactionKey] || [];
      const idx = list.indexOf(sender);
      if (idx >= 0) list.splice(idx, 1); else list.push(sender);
      if (list.length) msg.reactions[reactionKey] = list; else delete msg.reactions[reactionKey];
      await updateMessage(msg); io.emit('message:reaction', { id: msg.id, reactions: msg.reactions });
    } catch (err) { console.error('message:react:', err); }
  });

  socket.on('messages:read', async () => {
    try {
      const messages = await getMessages();
      let changed = false;
      for (const m of messages) {
        if (m.status && m.status !== 'read') { m.status = 'read'; m.readAt = Date.now(); await updateMessage(m); changed = true; }
      }
      if (changed) io.emit('messages:status', { status: 'read' });
    } catch (err) { console.error('messages:read:', err); }
  });

  socket.on('chat:clear', async () => {
    try { await clearMessages(); io.emit('chat:cleared'); }
    catch (err) { console.error('chat:clear:', err); }
  });

  socket.on('typing:start', payload => socket.broadcast.emit('typing', { sender: String(payload?.sender || 'Someone').slice(0, 40), active: true }));
  socket.on('typing:stop', payload => socket.broadcast.emit('typing', { sender: String(payload?.sender || 'Someone').slice(0, 40), active: false }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`FROSTLINK backend running on http://0.0.0.0:${PORT}`);
  console.log(`Room: ${ROOM_NAME}`);
  console.log(`Uploads: Supabase bucket ${SUPABASE_BUCKET}`);
  console.log(`GIPHY: ${GIPHY_API_KEY ? 'enabled' : 'not configured (optional)'}`);
});

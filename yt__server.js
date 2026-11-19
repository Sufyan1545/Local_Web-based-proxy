// YouTube player helper: resolves a video with yt-dlp and streams it to plain <video>/<audio> tags.
// Runs next to Rammerhead (port 8090). Needs:  pip install -U yt-dlp yt-dlp-ejs
// Quality choice: muxed MP4 (usually 360p, one file) or separate video + audio streams kept in sync by the page.
const http = require('http');
const { spawn } = require('child_process');
const { Readable } = require('stream');

const PORT = Number(process.env.YT_PORT) || 8090;
const YTDLP = process.env.YTDLP || 'yt-dlp';
const ID_RE = /^[\w-]{11}$/;
const cache = new Map();   // id -> { info, meta, t }
const pending = new Map(); // id -> Promise

function run(id, useJsRuntime) {
  return new Promise((resolve, reject) => {
    const args = ['-J', '--no-playlist', '--no-warnings', 'https://www.youtube.com/watch?v=' + id];
    if (useJsRuntime) args.unshift('--js-runtimes', 'node');
    let out = '', err = '';
    let p;
    try { p = spawn(YTDLP, args, { maxBuffer: 1 << 28 }); } catch (e) { return reject(new Error('yt-dlp غير مثبت')); }
    p.on('error', () => reject(new Error('yt-dlp غير مثبت. نفّذ: pip install -U yt-dlp yt-dlp-ejs')));
    p.stdout.on('data', d => (out += d));
    p.stderr.on('data', d => (err += d));
    p.on('close', code => {
      if (code === 0) {
        try { return resolve(JSON.parse(out.trim())); } catch (e) { return reject(new Error('رد غير مفهوم من yt-dlp')); }
      }
      const e = new Error((err.trim().split('\n').pop() || 'فشل yt-dlp').slice(0, 300));
      e.optionError = /no such option|unrecognized arguments|js-runtimes/i.test(err);
      reject(e);
    });
  });
}

const none = c => !c || c === 'none';
const codecRank = c => (/^avc1/.test(c) ? 0 : /^vp0?9/.test(c) ? 1 : /^av01/.test(c) ? 2 : 3);
const cont = f => (f.ext === 'webm' ? 'webm' : 'mp4');

function build(info) {
  const map = new Map();
  const usable = f => f && f.url && f.format_id && (f.protocol === 'https' || f.protocol === 'http') && !f.fragments && f.ext !== 'mhtml';
  const all = (info.formats || []).filter(usable);
  all.forEach(f => map.set(String(f.format_id), f));
  const vids = all.filter(f => !none(f.vcodec) && none(f.acodec) && f.height);
  const mux = all.filter(f => !none(f.vcodec) && !none(f.acodec) && f.height);
  const auds = all.filter(f => none(f.vcodec) && !none(f.acodec));

  const audio = auds
    .sort((x, y) => (/^mp4a/.test(x.acodec) ? 0 : 1) - (/^mp4a/.test(y.acodec) ? 0 : 1) || (y.abr || y.tbr || 0) - (x.abr || x.tbr || 0))
    .slice(0, 3)
    .map(f => ({ f: String(f.format_id), mime: 'audio/' + cont(f) + '; codecs="' + f.acodec + '"' }));

  const byH = new Map();
  const slot = h => { if (!byH.has(h)) byH.set(h, { video: [] }); return byH.get(h); };
  mux.forEach(f => {
    const s = slot(f.height);
    if (!s.muxed || (f.tbr || 0) > s.tbr) {
      s.muxed = { f: String(f.format_id), mime: 'video/' + cont(f) + '; codecs="' + f.vcodec + ', ' + f.acodec + '"' };
      s.tbr = f.tbr || 0;
    }
  });
  vids.forEach(f => slot(f.height).video.push(f));

  const qualities = [...byH.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([h, s]) => {
      const q = { id: 'q' + h, label: h + 'p', height: h, muxed: s.muxed || null, video: [], audio: [] };
      if (!s.muxed) {
        q.video = s.video
          .sort((x, y) => codecRank(x.vcodec) - codecRank(y.vcodec) || (y.tbr || 0) - (x.tbr || 0))
          .slice(0, 3)
          .map(f => ({ f: String(f.format_id), mime: 'video/' + cont(f) + '; codecs="' + f.vcodec + '"' }));
        q.audio = audio;
      }
      return q;
    })
    .filter(q => q.muxed || (q.video.length && q.audio.length));
  return { map, qualities };
}

async function resolveFresh(id) {
  let info;
  try { info = await run(id, true); }
  catch (e) { if (e.optionError) info = await run(id, false); else throw e; }
  const meta = build(info || {});
  if (!meta.qualities.length) throw new Error('لم يتم العثور على صيغ تشغيل لهذا الفيديو');
  const entry = { info, meta, t: Date.now() };
  cache.set(id, entry);
  return entry;
}
function resolve(id, force) {
  const c = cache.get(id);
  if (!force && c && Date.now() - c.t < 30 * 60 * 1000) return Promise.resolve(c);
  if (pending.has(id)) return pending.get(id);
  const p = resolveFresh(id).finally(() => pending.delete(id));
  pending.set(id, p);
  return p;
}

const PAGE = `<!DOCTYPE html><html lang="ar"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Player</title>
<style>
html,body{margin:0;height:100%;background:#000;color:#e8edf2;font-family:system-ui,sans-serif}
#box{display:flex;flex-direction:column;height:100%;background:#000}
#top{display:flex;align-items:center;gap:6px;padding:6px;background:#1b2430;flex:0 0 auto}
#top button,#top select{border:0;border-radius:8px;padding:8px 10px;background:#2c3948;color:#e8edf2;font-size:14px;font-family:inherit}
#t{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}
#v{flex:1;min-height:0;width:100%;background:#000}
#e{padding:0 12px;color:#ff9aa5;font-size:13px;white-space:pre-wrap}
#e:not(:empty){padding:8px 12px}
#gear,#panel{display:none}
#panel button,#panel select{border:0;border-radius:8px;padding:8px 10px;background:#2c3948;color:#e8edf2;font-size:14px;font-family:inherit}
body.embed #top{display:none}
body.embed #box{display:block;position:relative}
body.embed #v{position:absolute;top:0;left:0;width:100%;height:100%}
body.embed #e{position:absolute;left:0;right:0;bottom:44px;z-index:4;background:rgba(0,0,0,.65)}
body.embed #gear{display:block;position:fixed;top:6px;right:6px;z-index:5;width:36px;height:36px;border:0;border-radius:18px;background:rgba(0,0,0,.55);color:#fff;font-size:18px}
body.embed #panel.open{display:flex;position:fixed;top:48px;right:6px;z-index:5;gap:6px;flex-wrap:wrap;padding:8px;border-radius:10px;background:rgba(27,36,48,.96);max-width:92%}
</style></head>
<body><div id="box">
<div id="top"><button id="b">‹ رجوع</button><span id="t" dir="auto">جاري التحضير…</span>
<select id="s" aria-label="السرعة"><option value="0.5">0.5x</option><option value="0.75">0.75x</option><option value="1" selected>1x</option><option value="1.25">1.25x</option><option value="1.5">1.5x</option><option value="2">2x</option></select>
<select id="q" aria-label="الجودة"></select><button id="f" aria-label="ملء الشاشة">⛶</button></div>
<div id="e"></div>
<video id="v" controls playsinline></video><audio id="a" preload="auto"></audio>
<button id="gear" aria-label="الإعدادات">⚙</button><div id="panel"></div>
</div>
<script>
var id=new URLSearchParams(location.search).get('v')||'';
var $=function(i){return document.getElementById(i)};
var box=$('box'),v=$('v'),a=$('a'),tEl=$('t'),eEl=$('e'),qSel=$('q'),sSel=$('s');
var info=null,cur=null,useAudio=false,lastSave=0;
var embed=new URLSearchParams(location.search).get('embed')==='1';
if(embed){
  document.body.classList.add('embed');
  var panel=$('panel');
  [sSel,qSel,$('f')].forEach(function(x){panel.appendChild(x);});
  $('gear').onclick=function(){panel.classList.toggle('open');};
}
function say(x){eEl.textContent=x||'';}
function store(k,val){try{if(val===null)localStorage.removeItem(k);else localStorage.setItem(k,val);}catch(e){}}
function load(k){try{return localStorage.getItem(k);}catch(e){return null;}}
function src(f){return '/stream?v='+encodeURIComponent(id)+'&f='+encodeURIComponent(f);}
function pick(list,el){list=list||[];for(var i=0;i<list.length;i++){if(el.canPlayType(list[i].mime))return list[i];}return list[0]||null;}
function pickQuality(){
  var saved=+load('ytq')||0,qs=info.qualities,i;
  if(saved){for(i=0;i<qs.length;i++)if(qs[i].height<=saved)return qs[i];return qs[qs.length-1];}
  for(i=0;i<qs.length;i++)if(qs[i].muxed)return qs[i];
  return qs[qs.length-1];
}
function syncRate(){a.playbackRate=v.playbackRate;}
function apply(q,t,play){
  cur=q;say('');
  var vf,af=null;
  if(q.muxed){vf=q.muxed.f;useAudio=false;}
  else{
    var vc=pick(q.video,v),ac=pick(q.audio,a);
    if(!vc){say('هذه الجودة غير مدعومة على هذا الجهاز. اختر جودة أخرى.');return;}
    vf=vc.f;af=ac&&ac.f;useAudio=!!af;
  }
  qSel.value=q.id;
  v.pause();a.pause();
  v.src=src(vf);
  if(useAudio){a.src=src(af);}else{a.removeAttribute('src');a.load();}
  var done=function(){
    v.removeEventListener('loadedmetadata',done);
    if(t>0){try{v.currentTime=t;}catch(e){}if(useAudio){try{a.currentTime=t;}catch(e){}}}
    if(play)v.play().catch(function(){});
  };
  v.addEventListener('loadedmetadata',done);
  v.playbackRate=+sSel.value;syncRate();
}
v.addEventListener('play',function(){if(useAudio){a.currentTime=v.currentTime;a.play().catch(function(){});}});
v.addEventListener('pause',function(){if(useAudio)a.pause();});
v.addEventListener('seeking',function(){if(useAudio)a.currentTime=v.currentTime;});
v.addEventListener('waiting',function(){if(useAudio)a.pause();});
v.addEventListener('playing',function(){
  if(useAudio){if(Math.abs(a.currentTime-v.currentTime)>0.3)a.currentTime=v.currentTime;a.play().catch(function(){});}
});
v.addEventListener('ratechange',syncRate);
v.addEventListener('volumechange',function(){a.volume=v.volume;a.muted=v.muted;});
v.addEventListener('timeupdate',function(){
  if(useAudio&&!v.paused&&Math.abs(a.currentTime-v.currentTime)>0.4)a.currentTime=v.currentTime;
  var n=Date.now();if(n-lastSave>5000&&v.currentTime>0){lastSave=n;store('pos:'+id,String(Math.floor(v.currentTime)));}
});
v.addEventListener('ended',function(){store('pos:'+id,null);});
v.addEventListener('error',function(){say('تعذر تشغيل هذه الجودة. جرّب جودة أخرى من القائمة.');});
a.addEventListener('error',function(){if(useAudio)say('تعذر تشغيل الصوت لهذه الجودة. جرّب جودة 360p.');});
$('b').onclick=function(){parent.postMessage({yt:'back'},'*');};
$('f').onclick=function(){
  var d=document,fs=d.fullscreenElement||d.webkitFullscreenElement;
  if(fs){(d.exitFullscreen||d.webkitExitFullscreen).call(d);}
  else{var r=box.requestFullscreen||box.webkitRequestFullscreen;if(r)r.call(box);}
};
sSel.onchange=function(){v.playbackRate=+sSel.value;syncRate();};
qSel.onchange=function(){
  var qs=info.qualities,q=null;
  for(var i=0;i<qs.length;i++)if(qs[i].id===qSel.value)q=qs[i];
  if(!q)return;
  store('ytq',String(q.height));
  apply(q,v.currentTime||0,!v.paused||v.currentTime===0);
};
fetch('/info?v='+encodeURIComponent(id)).then(function(r){return r.json()}).then(function(j){
  if(j.error){tEl.textContent='تعذر التشغيل';say(j.error);return;}
  info=j;tEl.textContent=j.title||'YouTube';
  parent.postMessage({yt:'title',title:j.title||'YouTube'},'*');
  j.qualities.forEach(function(q){var o=document.createElement('option');o.value=q.id;o.textContent=q.label;qSel.appendChild(o);});
  var pos=+load('pos:'+id)||0;
  apply(pickQuality(),pos>8?pos-2:0,true);
}).catch(function(){tEl.textContent='تعذر الاتصال';});
</script></body></html>`;

function send(res, code, type, body) { res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' }); res.end(body); }

async function stream(req, res, id, fid) {
  let entry = await resolve(id, false);
  for (let attempt = 0; attempt < 2; attempt++) {
    const fm = entry.meta.map.get(fid);
    if (!fm) return send(res, 404, 'text/plain', 'unknown format');
    const headers = Object.assign({}, entry.info.http_headers || {}, fm.http_headers || {}, { 'Accept-Encoding': 'identity' });
    if (req.headers.range) headers.Range = req.headers.range;
    const ctrl = new AbortController();
    res.on('close', () => ctrl.abort());
    const up = await fetch(fm.url, { headers, signal: ctrl.signal });
    if ((up.status === 403 || up.status === 410) && attempt === 0) {
      ctrl.abort(); entry = await resolve(id, true); continue;
    }
    const h = { 'Content-Type': up.headers.get('content-type') || 'video/mp4', 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' };
    ['content-length', 'content-range'].forEach(k => { const x = up.headers.get(k); if (x) h[k] = x; });
    res.writeHead(up.status, h);
    if (!up.body) return res.end();
    Readable.fromWeb(up.body).on('error', () => res.destroy()).pipe(res);
    return;
  }
}

http.createServer(async (req, res) => {
  let u;
  try { u = new URL(req.url, 'http://x'); } catch (e) { return send(res, 400, 'text/plain', 'bad request'); }
  const id = u.searchParams.get('v') || '';
  try {
    if (u.pathname === '/') return send(res, 200, 'text/plain', 'yt player ok');
    if (u.pathname === '/watch') return ID_RE.test(id) ? send(res, 200, 'text/html; charset=utf-8', PAGE) : send(res, 400, 'text/plain', 'bad id');
    if (!ID_RE.test(id)) return send(res, 400, 'text/plain', 'bad id');
    if (u.pathname === '/info') {
      try {
        const e = await resolve(id, false);
        return send(res, 200, 'application/json', JSON.stringify({ title: e.info.title || '', qualities: e.meta.qualities }));
      } catch (e) { return send(res, 200, 'application/json', JSON.stringify({ error: e.message })); }
    }
    if (u.pathname === '/stream') return await stream(req, res, id, u.searchParams.get('f') || '');
    send(res, 404, 'text/plain', 'not found');
  } catch (e) {
    if (!res.headersSent) send(res, 502, 'text/plain', 'upstream error: ' + e.message); else res.destroy();
  }
}).listen(PORT, '0.0.0.0', () => console.log('YouTube player helper on port ' + PORT));
process.on('unhandledRejection', e => console.log('yt helper warning:', e && e.message));

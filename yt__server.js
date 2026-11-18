// YouTube player helper: resolves a video with yt-dlp and streams it to a plain <video> tag.
// Runs next to Rammerhead (port 8090). Needs:  pip install -U yt-dlp yt-dlp-ejs
const http = require('http');
const { spawn } = require('child_process');
const { Readable } = require('stream');

const PORT = Number(process.env.YT_PORT) || 8090;
const YTDLP = process.env.YTDLP || 'yt-dlp';
const ID_RE = /^[\w-]{11}$/;
const FORMAT = 'best[ext=mp4][vcodec!=none][acodec!=none]/best[vcodec!=none][acodec!=none]/best';
const cache = new Map(); // id -> { info, t }
const pending = new Map(); // id -> Promise

function run(id, useJsRuntime) {
  return new Promise((resolve, reject) => {
    const args = ['-j', '--no-playlist', '--no-warnings', '-f', FORMAT, 'https://www.youtube.com/watch?v=' + id];
    if (useJsRuntime) args.unshift('--js-runtimes', 'node');
    let out = '', err = '';
    let p;
    try { p = spawn(YTDLP, args); } catch (e) { return reject(new Error('yt-dlp غير مثبت')); }
    p.on('error', () => reject(new Error('yt-dlp غير مثبت. نفّذ: pip install -U yt-dlp yt-dlp-ejs')));
    p.stdout.on('data', d => (out += d));
    p.stderr.on('data', d => (err += d));
    p.on('close', code => {
      if (code === 0) {
        try { return resolve(JSON.parse(out.split('\n')[0])); } catch (e) { return reject(new Error('رد غير مفهوم من yt-dlp')); }
      }
      const e = new Error((err.trim().split('\n').pop() || 'فشل yt-dlp').slice(0, 300));
      e.optionError = /no such option|unrecognized arguments|js-runtimes/i.test(err);
      reject(e);
    });
  });
}

async function resolveFresh(id) {
  let info;
  try { info = await run(id, true); }
  catch (e) { if (e.optionError) info = await run(id, false); else throw e; }
  if (!info || !info.url) throw new Error('لم يتم العثور على رابط تشغيل');
  cache.set(id, { info, t: Date.now() });
  return info;
}
function resolve(id, force) {
  const c = cache.get(id);
  if (!force && c && Date.now() - c.t < 30 * 60 * 1000) return Promise.resolve(c.info);
  if (pending.has(id)) return pending.get(id);
  const p = resolveFresh(id).finally(() => pending.delete(id));
  pending.set(id, p);
  return p;
}

const PAGE = `<!DOCTYPE html><html lang="ar"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Player</title>
<style>html,body{margin:0;height:100%;background:#000;color:#e8edf2;font-family:system-ui,sans-serif}
body{display:flex;flex-direction:column}#top{display:flex;align-items:center;gap:10px;padding:8px;background:#1b2430}
#b{border:0;border-radius:8px;padding:8px 14px;background:#2c3948;color:#e8edf2;font-size:15px}
#t{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px}
#v{flex:1;min-height:0;width:100%;background:#000}#e{padding:14px;color:#ff9aa5;font-size:14px;white-space:pre-wrap}</style></head>
<body><div id="top"><button id="b">‹ رجوع</button><span id="t" dir="auto">جاري التحضير…</span></div>
<video id="v" controls playsinline></video><div id="e"></div>
<script>
var id=new URLSearchParams(location.search).get('v')||'';
var t=document.getElementById('t'),v=document.getElementById('v'),e=document.getElementById('e');
document.getElementById('b').onclick=function(){parent.postMessage({yt:'back'},'*');};
fetch('/info?v='+encodeURIComponent(id)).then(function(r){return r.json()}).then(function(j){
  if(j.error){t.textContent='تعذر التشغيل';e.textContent=j.error;return;}
  t.textContent=j.title||'YouTube';
  parent.postMessage({yt:'title',title:j.title||'YouTube'},'*');
  v.src='/stream?v='+encodeURIComponent(id);
  v.play().catch(function(){});
}).catch(function(){t.textContent='تعذر الاتصال';});
</script></body></html>`;

function send(res, code, type, body) { res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' }); res.end(body); }

async function stream(req, res, id) {
  let info = await resolve(id, false);
  for (let attempt = 0; attempt < 2; attempt++) {
    const headers = Object.assign({}, info.http_headers || {}, { 'Accept-Encoding': 'identity' });
    if (req.headers.range) headers.Range = req.headers.range;
    const ctrl = new AbortController();
    res.on('close', () => ctrl.abort());
    const up = await fetch(info.url, { headers, signal: ctrl.signal });
    if ((up.status === 403 || up.status === 410) && attempt === 0) {
      ctrl.abort(); info = await resolve(id, true); continue;
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
      try { const i = await resolve(id, false); return send(res, 200, 'application/json', JSON.stringify({ title: i.title || '' })); }
      catch (e) { return send(res, 200, 'application/json', JSON.stringify({ error: e.message })); }
    }
    if (u.pathname === '/stream') return await stream(req, res, id);
    send(res, 404, 'text/plain', 'not found');
  } catch (e) {
    if (!res.headersSent) send(res, 502, 'text/plain', 'upstream error: ' + e.message); else res.destroy();
  }
}).listen(PORT, '0.0.0.0', () => console.log('YouTube player helper on port ' + PORT));
process.on('unhandledRejection', e => console.log('yt helper warning:', e && e.message));

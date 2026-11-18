#!/data/data/com.termux/files/usr/bin/bash
# Local Web-based Proxy - installer (Android + Termux)
# Downloads the ORIGINAL Rammerhead, then puts this repo's files on top of the originals.
# Any file named  folder__file.ext  in this repo replaces  folder/file.ext  inside Rammerhead
# (public__index.html -> rammerhead/public/index.html, yt__server.js -> rammerhead/yt/server.js, ...).
# Safe to run again at any time: it is also the update step (see update.sh).
HERE="$(cd "$(dirname "$0")" && pwd)"
RH_COMMIT=""   # optional: put a Rammerhead commit hash here to pin the upstream version

echo ">> Stopping any running proxy"
pkill -f "node src/server.js" 2>/dev/null || true
pkill -f "node .*yt/server.js" 2>/dev/null || true

set -e
pkg update -y
pkg upgrade -y
pkg install -y git nodejs-lts python

cd "$HOME"
if [ ! -d rammerhead/.git ]; then
  rm -rf rammerhead
  git clone https://github.com/binary-person/rammerhead
fi
cd rammerhead
[ -n "$RH_COMMIT" ] && git checkout "$RH_COMMIT"
npm install
npm run build

echo ">> Replacing original files with this repo's files"
count=0
for f in "$HERE"/*__*; do
  [ -f "$f" ] || continue
  rel="$(basename "$f" | sed 's/__/\//g')"
  mkdir -p "$(dirname "$HOME/rammerhead/$rel")"
  cp -f "$f" "$HOME/rammerhead/$rel"
  echo "   replaced: $rel"
  count=$((count+1))
done
if [ "$count" = "0" ]; then
  echo "ERROR: no custom files found in $HERE (expected public__index.html, src__config.js, yt__server.js)."
  exit 1
fi

echo ">> Installing the YouTube player tool (yt-dlp)"
pip install -U yt-dlp yt-dlp-ejs || echo "WARNING: yt-dlp install failed, the YouTube player will not work. Retry: pip install -U yt-dlp yt-dlp-ejs"

echo ">> Verifying"
ok=1
grep -q "Created by Sufyan" public/index.html      || { echo "FAIL: public/index.html is not the custom page"; ok=0; }
grep -q "password: null" src/config.js             || { echo "FAIL: password is not disabled"; ok=0; }
grep -q "restrictSessionToIP: false" src/config.js || { echo "FAIL: restrictSessionToIP is not false"; ok=0; }
grep -q "req.headers.host" src/config.js           || { echo "FAIL: getServerInfo is not dynamic"; ok=0; }
[ -f yt/server.js ]                                || { echo "FAIL: yt/server.js is missing (upload yt__server.js to GitHub)"; ok=0; }
if [ "$ok" = "0" ]; then
  echo "Some files were not applied. Make sure the GitHub repo has the latest files, then run: bash update.sh"
  exit 1
fi
command -v yt-dlp >/dev/null && echo "yt-dlp: $(yt-dlp --version)" || echo "WARNING: yt-dlp command not found"
echo "OK: custom files applied"

echo ">> Creating start/stop commands"
cat > "$HOME/start-proxy.sh" << 'EOS'
#!/data/data/com.termux/files/usr/bin/bash
termux-wake-lock
cd "$HOME/rammerhead"
node yt/server.js &
YT=$!
trap 'kill $YT 2>/dev/null' EXIT
IP="$(ip route get 1.1.1.1 2>/dev/null | sed -n 's/.* src \([0-9.]*\).*/\1/p')"
echo "Open from any device on the same network:  http://${IP:-PHONE_IP}:8080"
npm start
EOS
cat > "$HOME/stop-proxy.sh" << 'EOS'
#!/data/data/com.termux/files/usr/bin/bash
pkill -f "node src/server.js" 2>/dev/null
pkill -f "node .*yt/server.js" 2>/dev/null
termux-wake-unlock 2>/dev/null
echo "Proxy stopped."
EOS
chmod +x "$HOME/start-proxy.sh" "$HOME/stop-proxy.sh"

# Home-screen buttons for the optional Termux:Widget app (harmless if it is not installed)
mkdir -p "$HOME/.shortcuts/tasks"
printf '#!/data/data/com.termux/files/usr/bin/bash\n"$HOME/start-proxy.sh"\n' > "$HOME/.shortcuts/tasks/Start-Proxy.sh"
printf '#!/data/data/com.termux/files/usr/bin/bash\n"$HOME/stop-proxy.sh"\n'  > "$HOME/.shortcuts/tasks/Stop-Proxy.sh"
chmod +x "$HOME/.shortcuts/tasks/"*.sh

echo
echo "Done."
echo "  Start :  ~/start-proxy.sh"
echo "  Stop  :  ~/stop-proxy.sh   (or Ctrl+C)"
echo "Then open  http://PHONE_IP:8080  from any device on the same network."

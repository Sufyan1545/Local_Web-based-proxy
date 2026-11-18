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

# Safety net: these two must stay false (true makes WhatsApp Web, games and YouTube load forever)
sed -i 's/disableHttp2: true/disableHttp2: false/; s/disableLocalStorageSync: true/disableLocalStorageSync: false/' src/config.js

echo ">> Installing the YouTube player tool (yt-dlp)"
pip install -U yt-dlp yt-dlp-ejs || echo "WARNING: yt-dlp install failed, the YouTube player will not work. Retry: pip install -U yt-dlp yt-dlp-ejs"

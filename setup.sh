#!/data/data/com.termux/files/usr/bin/bash
# Downloads the ORIGINAL Rammerhead, then puts this repo's files on top of the originals.
# Any file named  folder__file.ext  in this repo replaces  folder/file.ext  inside Rammerhead
# (example: public__index.html -> rammerhead/public/index.html).
HERE="$(cd "$(dirname "$0")" && pwd)"
RH_COMMIT=""   # optional: put a Rammerhead commit hash here to pin the upstream version

echo ">> Stopping any running proxy"
pkill -f "node src/server.js" 2>/dev/null || true

set -e
pkg update -y
pkg upgrade -y
pkg install -y git nodejs-lts

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
  echo "ERROR: no custom files found in $HERE (expected public__index.html and src__config.js)."
  exit 1
fi

echo ">> Verifying"
ok=1
grep -q "Created by Sufyan" public/index.html      || { echo "FAIL: public/index.html is not the custom page"; ok=0; }
grep -q "password: null" src/config.js             || { echo "FAIL: password is not disabled"; ok=0; }
grep -q "restrictSessionToIP: false" src/config.js || { echo "FAIL: restrictSessionToIP is not false"; ok=0; }
grep -q "req.headers.host" src/config.js           || { echo "FAIL: getServerInfo is not dynamic"; ok=0; }
if [ "$ok" = "0" ]; then
  echo "Some files were not applied. Make sure the GitHub repo has the latest files, then: git pull && bash setup.sh"
  exit 1
fi
echo "OK: custom files applied"

cat > "$HOME/start-proxy.sh" << 'EOS'
#!/data/data/com.termux/files/usr/bin/bash
termux-wake-lock
cd "$HOME/rammerhead" && npm start
EOS
chmod +x "$HOME/start-proxy.sh"

echo
echo "Done. Start with:  ~/start-proxy.sh"
echo "Then open  http://PHONE_IP:8080  from any device on the network."

#!/data/data/com.termux/files/usr/bin/bash
# Installs Rammerhead in Termux and applies this repo's page + config.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"

pkg update -y
pkg upgrade -y
pkg install -y git nodejs-lts

cd "$HOME"
[ -d rammerhead ] || git clone https://github.com/binary-person/rammerhead
cd rammerhead
npm install
npm run build

cp "$HERE/config.js" src/config.js
cp "$HERE/index.html" public/index.html

cat > "$HOME/start-proxy.sh" << 'EOS'
#!/data/data/com.termux/files/usr/bin/bash
termux-wake-lock
cd "$HOME/rammerhead" && npm start
EOS
chmod +x "$HOME/start-proxy.sh"

echo
echo "Done. Start with:  ~/start-proxy.sh"
echo "Then open  http://PHONE_IP:8080  from any device on the network."

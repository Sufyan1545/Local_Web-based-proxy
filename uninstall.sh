#!/data/data/com.termux/files/usr/bin/bash
# Removes Rammerhead and the proxy scripts. Saved sessions (logins) are deleted with it.
read -r -p "Remove Rammerhead, saved sessions and the start/stop commands? [y/N] " a
case "$a" in y|Y) ;; *) echo "Cancelled."; exit 0;; esac
pkill -f "node src/server.js" 2>/dev/null || true
pkill -f "node .*yt/server.js" 2>/dev/null || true
termux-wake-unlock 2>/dev/null || true
rm -rf "$HOME/rammerhead" "$HOME/start-proxy.sh" "$HOME/stop-proxy.sh" \
       "$HOME/.shortcuts/tasks/Start-Proxy.sh" "$HOME/.shortcuts/tasks/Stop-Proxy.sh"
echo "Removed."
echo "Optional: pip uninstall -y yt-dlp yt-dlp-ejs   and delete this folder."

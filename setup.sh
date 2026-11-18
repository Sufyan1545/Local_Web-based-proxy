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

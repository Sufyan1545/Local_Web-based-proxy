# Local Proxy (Rammerhead on Termux)

A CroxyProxy-style web proxy that runs on your Android phone and opens from any device on your local network.
Type a link or a search, press Go, and the site opens inside the same page through your phone's connection.
Logins are kept in a session saved on the phone.

Created by Sufyan with Claude.

## Install (Android, Termux from F-Droid)

    pkg install git
    git clone https://github.com/YOUR_USER/YOUR_REPO
    cd YOUR_REPO
    bash setup.sh

## Run

    ~/start-proxy.sh

Open `http://PHONE_IP:8080` from another device on the same network.

## Notes

- No password is set, so anyone on your network can use the proxy. Do not expose port 8080 to the internet.
- Do not clear the browser's site data, or the saved session id is lost.
- Files: `index.html` (the page), `config.js` (Rammerhead settings), `setup.sh` (installer).

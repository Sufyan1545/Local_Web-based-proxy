# Local Web-based Proxy (Rammerhead on Termux)

A CroxyProxy-style web proxy that runs on your Android phone and opens from any device on your local network.
Type a link or a search, press Go, and the site opens inside the same page through your phone's connection.
Logins are kept in a session saved on the phone.

Created by Sufyan with Claude.

## How it works

`setup.sh` downloads the original [Rammerhead](https://github.com/binary-person/rammerhead), then replaces
the original files with the files in this repo. A file named `folder__file.ext` replaces `folder/file.ext`:

| Repo file | Replaces in Rammerhead |
|---|---|
| `public__index.html` | `public/index.html` (the custom page) |
| `src__config.js` | `src/config.js` (no password, saved sessions, local host) |

To customize more, add another file with the same naming rule and run `bash setup.sh` again.

## Install (Android, Termux from F-Droid)

    pkg install -y git
    git clone https://github.com/Sufyan1545/Local_Web-based-proxy.git
    cd Local_Web-based-proxy
    bash setup.sh

## Run

    ~/start-proxy.sh

Open `http://PHONE_IP:8080` from another device on the same network.

## Update

    cd ~/Local_Web-based-proxy && git pull && bash setup.sh

## Notes

- No password is set, so anyone on your network can use the proxy. Never expose port 8080 to the internet.
- Do not clear the browser's site data, or the saved session id is lost.
- Google rejects sign-in through rewriting proxies; use it for browsing and video.
- Use only where your network or device rules allow it.

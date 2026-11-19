#!/data/data/com.termux/files/usr/bin/bash
# Updates this project from GitHub and re-applies everything (including Rammerhead's own files).
cd "$(dirname "$0")"
if [ ! -d .git ]; then
  echo "This folder is not a git clone, so it cannot update itself."
  echo "Install again with:  git clone https://github.com/Sufyan1545/Local_Web-based-proxy.git"
  exit 1
fi
git pull || { echo "git pull failed. If you edited files here, run: git stash && bash update.sh"; exit 1; }
bash setup.sh

#!/bin/bash
# BazNova Dev Server with Auto-Restart
cd /home/z/my-project
echo "[BazNova] Starting dev server with auto-restart..."
while true; do
  node ./node_modules/.bin/next dev -p 3000 2>&1 | tee dev.log
  EXIT_CODE=$?
  echo "[BazNova] Server exited (631. Restarting in 2s..."
  sleep 2
done

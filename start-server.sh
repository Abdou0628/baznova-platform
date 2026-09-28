#!/bin/bash
cd /home/z/my-project
while true; do
  NODE_ENV=production bun .next/standalone/server.js >> /home/z/my-project/dev.log 2>&1
  echo "[$(date)] Server exited, restarting in 2s..." >> /home/z/my-project/dev.log
  sleep 2
done

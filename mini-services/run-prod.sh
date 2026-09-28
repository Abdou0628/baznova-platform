#!/bin/bash
cd /home/z/my-project/.next/standalone
export NODE_ENV=production
export PORT=3000
exec node server.js

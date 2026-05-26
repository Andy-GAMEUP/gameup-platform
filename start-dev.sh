#!/bin/bash
fuser -k 3000/tcp 2>/dev/null
rm -f ~/projects/gameup-platform/apps/web/.next/dev/lock
cd ~/projects/gameup-platform
pnpm dev

#!/usr/bin/env bash
# Production deploy for system.rootk-eg.com
# Stops Next.js before rebuilding .next so clients do not hit ENOENT / broken chunks.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="${DEPLOY_HOST:-root@62.72.23.5}"
JUMP="${DEPLOY_JUMP:-mtec-vps}"
REMOTE_DIR="${DEPLOY_DIR:-/var/www/rootk-systems}"
SSH=(ssh -o ConnectTimeout=20 -o BatchMode=yes -J "$JUMP" "$HOST")
RSYNC_SSH="ssh -o ConnectTimeout=20 -J $JUMP"

cd "$ROOT"

echo "== rsync → $HOST:$REMOTE_DIR =="
rsync -az --delete \
  -e "$RSYNC_SSH" \
  --exclude '.git/' \
  --exclude '.next/' \
  --exclude 'node_modules/' \
  --exclude 'backend/node_modules/' \
  --exclude 'backend/dist/' \
  --exclude 'android/' \
  --exclude 'ios/' \
  --exclude '.cursor/' \
  --exclude '.env' \
  --exclude '.env.local' \
  --exclude '.env.production' \
  --exclude 'backend/.env' \
  --exclude 'public/downloads/' \
  --exclude '*.apk' \
  --exclude '*.aab' \
  --exclude 'tmp/' \
  ./ "$HOST:$REMOTE_DIR/"

echo "== remote install / build / restart =="
"${SSH[@]}" "set -euo pipefail
cd $REMOTE_DIR
echo VERSION=\$(node -p 'require(\"./package.json\").version')

# Stop web BEFORE rewriting .next — prevents ENOENT on every page mid-build.
pm2 stop rootk-systems-web || true

echo '== frontend npm install =='
npm install 2>&1 | tail -12

echo '== backend npm install =='
cd backend
npm install 2>&1 | tail -12

echo '== prisma generate + migrate =='
npx prisma generate 2>&1 | tail -6
npx prisma migrate deploy 2>&1 | tail -20

echo '== backend build =='
npm run build 2>&1 | tail -15

cd $REMOTE_DIR
echo '== frontend build =='
# Prefer IPv4 when Next downloads Google Fonts (avoids flaky IPv6 / module-not-found).
NODE_OPTIONS=--dns-result-order=ipv4first npm run build 2>&1 | tail -25

test -f .next/required-server-files.json
echo 'required-server-files.json OK'

echo '== pm2 restart =='
pm2 restart rootk-systems-api --update-env
pm2 start rootk-systems-web --update-env || pm2 restart rootk-systems-web --update-env
pm2 save
sleep 2
pm2 list | grep rootk-systems || true

echo '== smoke =='
curl -sS -o /dev/null -w 'web:%{http_code}\n' http://127.0.0.1:3030/tasks
curl -sS http://127.0.0.1:3030/app-release.json | head -c 180
echo
echo DEPLOY_OK
"

#!/usr/bin/env bash
# Production deploy for system.rootk-eg.com
# Builds into `.next-new` while the live process keeps serving `.next`,
# then swaps and restarts — avoids long nginx 502 windows.
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
  --exclude '.next-new/' \
  --exclude '.next-prev/' \
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
  --exclude 'uploads/' \
  --exclude 'backend/uploads/' \
  --exclude '*.apk' \
  --exclude '*.aab' \
  --exclude 'tmp/' \
  ./ "$HOST:$REMOTE_DIR/"

echo "== remote install / build / restart =="
"${SSH[@]}" "set -euo pipefail
cd $REMOTE_DIR
echo VERSION=\$(node -p 'require(\"./package.json\").version')

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
echo '== frontend build (.next-new) =='
rm -rf .next-new
# Prefer IPv4 when Next downloads Google Fonts (avoids flaky IPv6 / module-not-found).
NODE_OPTIONS=--dns-result-order=ipv4first NEXT_DIST_DIR=.next-new npm run build 2>&1 | tail -30

test -f .next-new/required-server-files.json
echo 'required-server-files.json OK (.next-new)'

echo '== persistent uploads =='
mkdir -p /var/lib/rootk-systems/uploads
chmod 755 /var/lib/rootk-systems/uploads
touch backend/.env
grep -q '^ROOTK_UPLOADS_DIR=' backend/.env || echo 'ROOTK_UPLOADS_DIR=/var/lib/rootk-systems/uploads' >> backend/.env

echo '== atomic swap .next + restart =='
pm2 stop rootk-systems-web || true
rm -rf .next-prev
if [ -d .next ]; then mv .next .next-prev; fi
mv .next-new .next
pm2 restart rootk-systems-api --update-env
pm2 start rootk-systems-web --update-env || pm2 restart rootk-systems-web --update-env
pm2 save
sleep 2
# Keep one previous build for emergency rollback; drop older.
rm -rf .next-prev
pm2 list | grep rootk-systems || true

echo '== smoke =='
for i in 1 2 3 4 5; do
  code=\$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3030/reports || echo 000)
  echo \"smoke_try_\$i:\$code\"
  if [ \"\$code\" = \"200\" ]; then break; fi
  sleep 1
done
curl -sS -o /dev/null -w 'web:%{http_code}\n' http://127.0.0.1:3030/tasks
curl -sS http://127.0.0.1:3030/app-release.json | head -c 180
echo
test \"\$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3030/reports)\" = \"200\"
echo DEPLOY_OK
"

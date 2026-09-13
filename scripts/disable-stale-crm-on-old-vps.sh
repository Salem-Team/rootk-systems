#!/usr/bin/env bash
# Run INSIDE Hostinger Browser Terminal on VPS 187.77.162.79 (old).
# Stops stale system.rootk-eg.com CRM so DNS-cached clients cannot see old data.
set -euo pipefail

echo "=== Stopping stale rootk-systems on this host ==="
pm2 stop rootk-systems-api rootk-systems-web 2>/dev/null || true
pm2 delete rootk-systems-api rootk-systems-web 2>/dev/null || true
# Older name variants
pm2 stop rootk-hr-api rootk-hr-web 2>/dev/null || true
pm2 delete rootk-hr-api rootk-hr-web 2>/dev/null || true
pm2 save 2>/dev/null || true

echo "=== Disabling nginx vhosts for system.rootk-eg.com ==="
shopt -s nullglob
for f in \
  /etc/nginx/sites-enabled/system.rootk-eg.com \
  /etc/nginx/sites-enabled/*system*rootk* \
  /opt/rootk/apps/ROOTK_SYSTEM/deployments/production/nginx/conf.d/system.rootk-eg.com.conf \
  /opt/rootk/apps/ROOTK_SYSTEM/deployments/production/nginx/conf.d/system.rootk-eg.com.443.conf \
  /etc/nginx/conf.d/system.rootk-eg.com*.conf
do
  if [ -e "$f" ]; then
    echo "Disabling $f"
    mv "$f" "${f}.disabled-stale-$(date +%Y%m%d%H%M)" 2>/dev/null || rm -f "$f"
  fi
done

if command -v nginx >/dev/null 2>&1; then
  nginx -t && systemctl reload nginx || true
fi
if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' | grep -qx rootk-prod-nginx; then
  docker exec rootk-prod-nginx nginx -t && docker exec rootk-prod-nginx nginx -s reload || true
fi

echo "=== Verify (should fail or not serve CRM) ==="
curl -sS -m 5 -o /dev/null -w "local3030:%{http_code}\n" http://127.0.0.1:3030/crm || echo "local3030:down"
curl -sS -m 5 -o /dev/null -w "local3031:%{http_code}\n" http://127.0.0.1:3031/api/health/live || echo "local3031:down"

echo "Done. Canonical CRM: https://system.rootk-eg.com (62.72.23.5)"
echo "Also lower DNS TTL for system A record to 300 in Hostinger DNS."

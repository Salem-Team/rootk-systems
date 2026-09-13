# منع ظهور CRM قديم بعد نقل السيرفر (Split-brain)

## السبب
بعد تغيير DNS لـ `system.rootk-eg.com` إلى VPS جديد، أي جهاز ما زال يحتفظ بـ A record القديم (`187.77.162.79`) يرى نسخة CRM قديمة بدون الليدات الجديدة.

## الحماية الدائمة (مطبقة على السيرفر الجديد `62.72.23.5`)
1. `ROOTK_EDGE_ID=rootk-systems-62` في `/api/health/live`
2. هيدر `X-Rootk-Edge: rootk-systems-62`
3. `EdgeGuard` في الواجهة: لو الـ API رجّع بدون `edgeId` أو edge غلط → شاشة تحذير بدل بيانات ناقصة
4. `systemrootk.rootk-eg.com` → 301 إلى `https://system.rootk-eg.com`

## خطوة إلزامية على السيرفر القديم (بدها Hostinger Browser Terminal)
SSH لـ `187.77.162.79` مقفول (`Connection reset`). لازم من لوحة Hostinger:

1. VPS → `187.77.162.79` → **Browser Terminal**
2. نفّذ:

```bash
pm2 stop rootk-systems-api rootk-systems-web; pm2 delete rootk-systems-api rootk-systems-web; pm2 save
for f in /etc/nginx/sites-enabled/*system*rootk* /opt/rootk/apps/ROOTK_SYSTEM/deployments/production/nginx/conf.d/system.rootk-eg.com*.conf; do
  [ -e "$f" ] && mv "$f" "$f.disabled-stale"
done
nginx -t && systemctl reload nginx 2>/dev/null || true
docker exec rootk-prod-nginx nginx -t && docker exec rootk-prod-nginx nginx -s reload 2>/dev/null || true
```

أو انسخ السكربت: `scripts/disable-stale-crm-on-old-vps.sh`

بعد الإيقاف: كاش DNS قديم = خطأ اتصال (مقبول) بدل بيانات غلط. بعد انتهاء TTL → الجميع على السيرفر الجديد.

## DNS
في Hostinger DNS لـ `system` A record: خفّض TTL إلى **300** قبل أي cutover الجاي.

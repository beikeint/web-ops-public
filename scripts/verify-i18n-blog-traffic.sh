#!/usr/bin/env bash
# F3-6 i18n 博客内链修复 - 防回滚验证 (verification-pending: feedback3-f3-6-i18n-rewrite-demo-c)
# 抽样 5 非 EN 语种线上博客, 残留 /en/ 内链 ≤ 2/页 (= 语言切换器, 合法)
set -uo pipefail
SLUG="eps-machine-buying-guide-china"
THRESHOLD=2
FAIL=0
for loc in es pt fr ru ar; do
  url="https://demo-c.com/$loc/blog/$SLUG/"
  count=$(curl -fsS -m 10 "$url" 2>/dev/null | grep -cE 'href="/en/' || echo 999)
  if [ "$count" -gt "$THRESHOLD" ]; then
    echo "🔴 $loc: $count > $THRESHOLD"
    FAIL=1
  else
    echo "✅ $loc: $count"
  fi
done
[ "$FAIL" -eq 0 ] && echo "PASS: 5 非 EN locale 博客内链均 ≤ $THRESHOLD" || exit 1

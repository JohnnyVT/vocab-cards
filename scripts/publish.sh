#!/usr/bin/env bash
# 一鍵發布到 GitHub Pages。
#   ./scripts/publish.sh ["commit 訊息"]
#
# 會自動：1) 把 sw.js 的快取版本 +1（確保裝置端抓到新素材）
#         2) git add/commit/push 到 main
#         3) 印出線上網址
set -euo pipefail
cd "$(dirname "$0")/.."

# 1. 自動把 Service Worker 快取版本 vN -> v(N+1)，否則裝置會繼續用舊快取
cur=$(grep -oE "const VERSION = 'v[0-9]+'" sw.js | grep -oE '[0-9]+')
next=$((cur + 1))
sed -i '' "s/const VERSION = 'v${cur}'/const VERSION = 'v${next}'/" sw.js
echo "↑ Service Worker 快取版本：v${cur} → v${next}"

# 2. 提交並推送
msg="${*:-更新內容 (cache v${next})}"
git add -A
if git diff --cached --quiet; then
  echo "（沒有變更可提交，僅更新了版本號）"
fi
git commit -q -m "$msg

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
git push -q origin main

echo ""
echo "✓ 已發布 → https://johnnyvt.github.io/vocab-cards/"
echo "  約 1 分鐘後生效；平板上重開 app 會自動抓到新版（舊快取自動清除）。"

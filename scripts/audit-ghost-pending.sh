#!/bin/bash
# 幽灵待办审计 — 扫 4 客户 pending-tasks.md 的 open 项, 找出事实已闭环但 status 仍 open 的"幽灵"
# v1.0 (2026-05-02) — 起源: Demo-D GSC Full User / GA4 ID 已实测闭环但 open 状态没改, 智能体每天浪费运营人员时间
#
# 调用: bash audit-ghost-pending.sh
# 输出: 幽灵候选清单 (markdown), 由 verification-runner 推企微

set -euo pipefail

CLIENTS=(
  "客户/Demo-D-client-A:hearingprotect.com"
  "客户/Demo-C-client-B:demo-c.com"
  "客户/Demo-A-client-B2:demo-a.com"
  "客户/Demo-B-client-D:demo-b.com"
)

OUTPUT="## 🔍 幽灵待办审计报告 $(date '+%Y-%m-%d')\n\n"
TOTAL_GHOST=0

for entry in "${CLIENTS[@]}"; do
  path="${entry%:*}"
  domain="${entry#*:}"
  full_path="${WORKSPACE_ROOT}/$path"
  pending_file="$full_path/website/docs/pending-tasks.md"

  if [[ ! -f "$pending_file" ]]; then
    continue
  fi

  # 提取 Open 段所有项
  open_items=$(awk '/## Open/,/## Closed/' "$pending_file" 2>/dev/null | grep "^| 2026-" || true)
  open_count=$(echo "$open_items" | grep -c "^|" || echo 0)

  ghost_in_client=0
  ghost_list=""

  while IFS= read -r line; do
    [[ -z "$line" ]] && continue

    # 启发式: 找含特定关键字的项, 实测当前状态
    # 关键字 1: "GSC service account 升 Full User" → 实测 sitemap submit
    if echo "$line" | grep -qE "GSC.*Full User|service account.*权限|403.*sitemap"; then
      # 简单实测: 看 client-manager 时间线最近是否有 "Full User" 闭环记录
      recent_mention=$(git -C "$full_path" log --since="14 days ago" --pretty=format:"%s" 2>/dev/null | grep -ciE "Full User|sitemap submit" | head -1 || echo 0)
      recent_mention=${recent_mention:-0}
      if [[ "$recent_mention" -gt 0 ]]; then
        ghost_in_client=$((ghost_in_client+1))
        ghost_list+="\n  🐛 ${line:0:100}..."
      fi
    fi

    # 关键字 2: "GA4 Property ID 配置" → 实测能否拉数据 (跳过, 由 ga4 MCP 跑时自动判断)
    if echo "$line" | grep -qE "GA4.*Property ID|GA4.*属性 ID.*配置"; then
      # 启发: 如果客户日报里近 3 天有"GA4 数据"段, 说明实际能拉
      ga4_mention=$(find "$full_path/website/docs" -name "client-briefing-*.md" -newer "$(date -d '3 days ago' '+%Y-%m-%d')" 2>/dev/null | xargs grep -lE "GA4|Google Analytics.*[1-9][0-9]+" 2>/dev/null | head -1 || true)
      if [[ -n "$ga4_mention" ]]; then
        ghost_in_client=$((ghost_in_client+1))
        ghost_list+="\n  🐛 ${line:0:100}..."
      fi
    fi
  done <<< "$open_items"

  TOTAL_GHOST=$((TOTAL_GHOST + ghost_in_client))

  OUTPUT+="**${domain}** (open ${open_count} 项, 幽灵 ${ghost_in_client}):"
  if [[ "$ghost_in_client" -gt 0 ]]; then
    OUTPUT+="${ghost_list}\n\n"
  else
    OUTPUT+=" ✅ 无幽灵\n\n"
  fi
done

OUTPUT+="---\n"
OUTPUT+="**总计**: $TOTAL_GHOST 个幽灵待办候选\n"
OUTPUT+="**处理建议**: 智能体下次 daily-cron 跑时主动查这些项当前状态, 实测闭环则标 closed."

echo -e "$OUTPUT"

# 退出码: 0 = 无幽灵, 1 = 有幽灵 (verification-runner 用此判断 pass/fail)
[[ "$TOTAL_GHOST" -eq 0 ]] && exit 0 || exit 1

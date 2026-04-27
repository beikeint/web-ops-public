#!/usr/bin/env bash
# ================================================================
# pm2 健康监控 — 每小时跑一次,检测 daily-check / social-daily-check 进程状态
# 任一 stopped → 立刻推企微告警 + 尝试自动重启
# ================================================================
# 触发原因: 2026-04-26 审计发现 pm2 daily-check 进程 stopped
# 导致 2 周里 daily-cron 没真跑(报告断档),问题级别 P0
# ================================================================

set -uo pipefail

WEBHOOK_URL="${WEBHOOK_URL:-}"
LOG_DIR="$HOME/.local/share/web-ops"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/pm2-health-$(date +%Y%m%d).log"

# 加载凭证(WEBHOOK_URL 在 ~/.claude/.env)
if [ -f "$HOME/.claude/.env" ]; then
  # shellcheck source=/dev/null
  source "$HOME/.claude/.env"
fi

# 加载 pm2 路径(NVM 安装的 node 环境)
export PATH="$PATH:${USER_HOME}/.nvm/versions/node/v22.22.2/bin"

# 待监控进程
PROCESSES=("daily-check" "social-daily-check" "wecom-bot" "wecom-bot-advisor" "wecom-proxy")
ALERTS=()

for proc in "${PROCESSES[@]}"; do
  status=$(pm2 jlist 2>/dev/null | grep -oE "\"name\":\"$proc\".*?\"status\":\"[^\"]*\"" | grep -oE "\"status\":\"[^\"]*\"" | cut -d'"' -f4 | head -1)

  if [ -z "$status" ]; then
    ALERTS+=("❌ $proc: 进程不存在(未注册)")
  elif [ "$status" != "online" ]; then
    ALERTS+=("⚠️ $proc: 状态 = $status (尝试自动重启)")
    pm2 restart "$proc" >> "$LOG_FILE" 2>&1
    sleep 2
    new_status=$(pm2 jlist 2>/dev/null | grep -oE "\"name\":\"$proc\".*?\"status\":\"[^\"]*\"" | grep -oE "\"status\":\"[^\"]*\"" | cut -d'"' -f4 | head -1)
    if [ "$new_status" = "online" ]; then
      ALERTS+=("  ✅ 自动重启成功 → online")
    else
      ALERTS+=("  🔴 自动重启失败,状态仍为 $new_status,运营人员必须手动处理")
    fi
  fi
done

# 有告警就推企微
if [ ${#ALERTS[@]} -gt 0 ] && [ -n "$WEBHOOK_URL" ]; then
  msg="🚨 pm2 健康监控告警 ($(date '+%Y-%m-%d %H:%M'))\n\n"
  for a in "${ALERTS[@]}"; do
    msg+="$a\n"
  done
  msg+="\n日志: $LOG_FILE"

  json_msg=$(printf '%s' "$msg" | python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))")

  curl -sS -X POST "$WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d "{\"msgtype\":\"text\",\"text\":{\"content\":$json_msg}}" \
    >> "$LOG_FILE" 2>&1

  echo "[$(date)] 推送告警: ${#ALERTS[@]} 项" >> "$LOG_FILE"
else
  echo "[$(date)] 全部健康" >> "$LOG_FILE"
fi

# 保留最近 30 天 log
find "$LOG_DIR" -name "pm2-health-*.log" -mtime +30 -delete 2>/dev/null

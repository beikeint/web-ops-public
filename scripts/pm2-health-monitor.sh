#!/usr/bin/env bash
# ================================================================
# pm2 健康监控 v3 — 每小时跑一次（自愈版，2026-04-29 v10.4 改造）
# ================================================================
# 历史：
#   v1: 监控 status (cron 模式跑完 stopped 是正常 → 永远在错误重启)
#   v2: 改成监控"今日报告是否含失败标记" (噪音多, 运营人员反感)
#   v3 (本版, 2026-04-29 v10.4):
#       - 静默化 (只剩 3 类 P0, 不再推日常状态)
#       - 加自愈机制: 配额恢复 / 0 A 级 commit / 周三 0 博客 → 自动补跑
#       - 自愈成功推 1 行结果 (不是告警)
# ================================================================
# 自愈机制 (B 轨核心):
#   ① daily-cron 配额耗尽 → 配额恢复后自动补跑 (一日一次)
#   ② 周三 20:00 后仍 0 博客 → 自动 weekly-blog-trigger --force (一日一次)
#   ③ 21:00 后跨 4 客户仍 0 A 级 commit → 自动 daily-cron catch-up (一日一次)
# ================================================================

set -uo pipefail

WEBHOOK_URL="${WEBHOOK_URL:-}"
LOG_DIR="$HOME/.local/share/web-ops"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/pm2-health-$(date +%Y%m%d).log"
HEAL_DIR="$LOG_DIR/heal-markers"
mkdir -p "$HEAL_DIR"
TODAY="$(date +%Y-%m-%d)"

# 加载凭证
if [ -f "$HOME/.claude/.env" ]; then
  # shellcheck source=/dev/null
  source "$HOME/.claude/.env"
fi

# pm2 / node 路径
export PATH="$PATH:${USER_HOME}/.nvm/versions/node/v22.22.2/bin"

ALERTS=()
INFO=()
HEAL_NOTIFICATIONS=()

DAILY_REPORT="${WORKSPACE_ROOT}/mcp-servers/wecom-bot/reports/daily-${TODAY}.txt"
DAILY_ERROR_LOG="${WORKSPACE_ROOT}/mcp-servers/wecom-bot/logs/daily-error.log"
DAILY_CRON_PATH="${WORKSPACE_ROOT}/mcp-servers/wecom-bot/daily-cron.mjs"
WEEKLY_BLOG_PATH="${WORKSPACE_ROOT}/智能体/运营/网站运营-web-ops/scripts/weekly-blog-trigger.mjs"
WECOM_BOT_DIR="${WORKSPACE_ROOT}/mcp-servers/wecom-bot"
WEB_OPS_SCRIPTS="${WORKSPACE_ROOT}/智能体/运营/网站运营-web-ops/scripts"
CEILING_LATEST="${WORKSPACE_ROOT}/智能体/运营/网站运营-web-ops/reports/ceiling-latest.json"

# 4 客户 repo 路径（v10.2 管辖名单）
CLIENT_REPOS=(
  "${WORKSPACE_ROOT}/客户/Demo-D-client-A"
  "${WORKSPACE_ROOT}/客户/Demo-C-client-B"
  "${WORKSPACE_ROOT}/客户/Demo-A-client-B2"
  "${WORKSPACE_ROOT}/客户/Demo-B-client-D"
)

CURRENT_HOUR=$(date +%H)
CURRENT_UTC_HOUR=$(date -u +%H)
DOW=$(date +%w)  # 0=周日, 3=周三

# ============================================================
# 工具函数
# ============================================================

push_wecom() {
  local content="$1"
  [ -z "$WEBHOOK_URL" ] && return
  local json_msg
  json_msg=$(printf '%s' "$content" | python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))")
  curl -sS -X POST "$WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d "{\"msgtype\":\"text\",\"text\":{\"content\":$json_msg}}" \
    >> "$LOG_FILE" 2>&1
}

# 跨 4 客户合计今日 A 级 commit 数
count_today_a_level() {
  local d="$1"
  local total=0
  for repo in "${CLIENT_REPOS[@]}"; do
    [ -d "$repo/.git" ] || continue
    local n
    n=$(git -C "$repo" log --since="$d 00:00" --until="$d 23:59" --oneline 2>/dev/null | \
        grep -ciE 'feat\((blog|ctr|refresh|internal-link|schema|indexnow|geo|topic-cluster|content-refresh)|博客|新博客|CTR 改|refresh|内链注入|Schema 补|IndexNow' || true)
    total=$((total + n))
  done
  echo "$total"
}

# 跨 4 客户合计今日博客 commit 数
count_today_blogs() {
  local d="$1"
  local total=0
  for repo in "${CLIENT_REPOS[@]}"; do
    [ -d "$repo/.git" ] || continue
    local n
    n=$(git -C "$repo" log --since="$d 00:00" --until="$d 23:59" --oneline 2>/dev/null | \
        grep -ciE 'feat\(blog|content: 发布博客|博客.*发布|feat\(content' || true)
    total=$((total + n))
  done
  echo "$total"
}

# 解析 daily-error.log 最新一条 "resets X(am|pm)" 或 "resets Mon DD, X(am|pm)" → 转 24h UTC 小时
parse_quota_reset_hour() {
  [ -f "$DAILY_ERROR_LOG" ] || { echo ""; return; }
  local last_line
  last_line=$(grep "^$TODAY " "$DAILY_ERROR_LOG" 2>/dev/null | grep "hit your limit" | tail -1)
  [ -z "$last_line" ] && { echo ""; return; }
  # 提取 "resets 6am" 或 "resets 6pm"
  local m
  m=$(echo "$last_line" | grep -oE 'resets ([A-Za-z]{3} [0-9]+, )?[0-9]+(am|pm)' | tail -1)
  [ -z "$m" ] && { echo ""; return; }
  local hour ampm
  hour=$(echo "$m" | grep -oE '[0-9]+(am|pm)$' | grep -oE '[0-9]+')
  ampm=$(echo "$m" | grep -oE '(am|pm)$')
  if [ "$ampm" = "pm" ] && [ "$hour" -lt 12 ]; then
    hour=$((hour + 12))
  fi
  if [ "$ampm" = "am" ] && [ "$hour" -eq 12 ]; then
    hour=0
  fi
  echo "$hour"
}

# 检测今日 daily-cron 是否全部失败
all_clients_failed_today() {
  [ -f "$DAILY_REPORT" ] || return 1
  local fail_count
  fail_count=$(grep -cE "^==== .* ❌ ====" "$DAILY_REPORT" 2>/dev/null || echo 0)
  local ok_count
  ok_count=$(grep -cE "^==== .* ✅ ====" "$DAILY_REPORT" 2>/dev/null || echo 0)
  # 全部失败 = ≥ 4 个 ❌ 且 0 个 ✅
  if [ "$fail_count" -ge 4 ] && [ "$ok_count" -eq 0 ]; then
    return 0
  fi
  return 1
}

# 自愈标记: 一日一次保护
heal_marker() { echo "$HEAL_DIR/$1-$TODAY.marker"; }
heal_already_done() { [ -f "$(heal_marker "$1")" ]; }
mark_heal_done() { touch "$(heal_marker "$1")"; }

# 周内自愈标记 (cooldown 跨日, 用 ISO 周号做 key)
ISO_WEEK="$(date +%G-W%V)"
heal_marker_week() { echo "$HEAL_DIR/$1-$ISO_WEEK.marker"; }
heal_done_this_week() { [ -f "$(heal_marker_week "$1")" ]; }
mark_heal_done_week() { touch "$(heal_marker_week "$1")"; }

# 月内自愈标记 (cooldown 跨周, 用年月做 key)
ISO_MONTH="$(date +%Y-%m)"
heal_marker_month() { echo "$HEAL_DIR/$1-$ISO_MONTH.marker"; }
heal_done_this_month() { [ -f "$(heal_marker_month "$1")" ]; }
mark_heal_done_month() { touch "$(heal_marker_month "$1")"; }

# 用 jq 读 ceiling-latest.json 拿严重度 — 没 jq 用 python 兜底
read_ceiling_field() {
  local jq_path="$1"
  [ -f "$CEILING_LATEST" ] || { echo ""; return; }
  if command -v jq >/dev/null 2>&1; then
    jq -r "$jq_path // empty" "$CEILING_LATEST" 2>/dev/null
  else
    python3 -c "
import json,sys
try:
  with open('$CEILING_LATEST') as f: d=json.load(f)
  # 简单 jq path 转 python attr
  path='$jq_path'.lstrip('.').replace('[','.').replace(']','').replace('\"','')
  v=d
  for p in path.split('.'):
    if p=='': continue
    if isinstance(v,list): v=v[int(p)]
    else: v=v.get(p,{})
  print(v if not isinstance(v,(dict,list)) else '')
except Exception as e:
  pass
" 2>/dev/null
  fi
}

# ============================================================
# 1) wecom 长连接进程必须 online
# ============================================================
LONG_RUNNING=("wecom-bot" "wecom-bot-advisor" "wecom-proxy")

for proc in "${LONG_RUNNING[@]}"; do
  status=$(pm2 jlist 2>/dev/null | grep -oE "\"name\":\"$proc\".*?\"status\":\"[^\"]*\"" | grep -oE "\"status\":\"[^\"]*\"" | cut -d'"' -f4 | head -1)

  if [ -z "$status" ]; then
    ALERTS+=("❌ $proc: 进程不存在")
  elif [ "$status" != "online" ]; then
    ALERTS+=("⚠️ $proc: $status (尝试重启)")
    pm2 restart "$proc" >> "$LOG_FILE" 2>&1
    sleep 2
    new_status=$(pm2 jlist 2>/dev/null | grep -oE "\"name\":\"$proc\".*?\"status\":\"[^\"]*\"" | grep -oE "\"status\":\"[^\"]*\"" | cut -d'"' -f4 | head -1)
    if [ "$new_status" = "online" ]; then
      ALERTS+=("  ✅ 重启成功 → online")
    else
      ALERTS+=("  🔴 重启失败，状态仍为 $new_status")
    fi
  fi
done

# ============================================================
# 2) daily-cron 真 P0 (静默化 — 只剩 3 类 P0)
# ============================================================
if [ "$CURRENT_HOUR" -ge 9 ]; then
  # ① 报告完全缺失 = cron 没启动
  if [ ! -f "$DAILY_REPORT" ]; then
    ALERTS+=("🔴 daily-cron 今日报告缺失: cron 可能没启动")
  fi

  # ② 连续 ≥ 3 天 0 A 级 commit → 智能体真懒
  consec_lazy_days=0
  for offset in 0 1 2 3 4; do
    d=$(date -d "$TODAY -$offset days" +%Y-%m-%d)
    a_level_count=$(count_today_a_level "$d")
    if [ "$a_level_count" -eq 0 ]; then
      consec_lazy_days=$((consec_lazy_days + 1))
    else
      break
    fi
  done
  if [ "$consec_lazy_days" -ge 3 ]; then
    ALERTS+=("🔴 智能体连续 $consec_lazy_days 天 0 A 级 commit — 跨 4 客户均无博客/CTR/refresh/内链/Schema/IndexNow 真活，请运营人员介入")
  fi

  # ③ 非配额严重错误
  if [ -f "$DAILY_ERROR_LOG" ]; then
    serious_errors=$(grep "^$TODAY " "$DAILY_ERROR_LOG" 2>/dev/null | \
                     grep -vE "hit your limit|exceed max length|markdown.content|Reached max turns" | \
                     grep -E "顶层异常|EACCES|ENOENT|spawn.*ENOENT|Cannot find module|crashed|segfault|OOM" | tail -1)
    if [ -n "$serious_errors" ]; then
      first_err=$(echo "$serious_errors" | cut -c1-200)
      ALERTS+=("🔴 daily-cron 严重错误: $first_err")
    fi
  fi
fi

# ============================================================
# 3) 自愈机制 v10.4 (B 轨核心) — 9:00 后才启动检测
# ============================================================
if [ "$CURRENT_HOUR" -ge 9 ]; then

  # ============== ① 配额恢复后自愈 daily-cron ==============
  # 触发: daily-cron 今日 4/4 失败 + 配额恢复时间已到
  # 一日一次 (heal marker 防重复)
  if all_clients_failed_today && ! heal_already_done "daily-cron-quota"; then
    reset_hour=$(parse_quota_reset_hour)
    if [ -n "$reset_hour" ]; then
      # 当前 UTC 时间 ≥ reset_hour + 1 (留 1h 缓冲, 避免边缘 race)
      if [ "$CURRENT_UTC_HOUR" -ge "$((reset_hour + 1))" ] || \
         { [ "$reset_hour" -ge 22 ] && [ "$CURRENT_UTC_HOUR" -le 6 ]; }; then
        mark_heal_done "daily-cron-quota"
        echo "[$(date)] 自愈触发: daily-cron 配额恢复后补跑 (reset=${reset_hour} UTC, now=${CURRENT_UTC_HOUR} UTC)" >> "$LOG_FILE"
        cd "$WECOM_BOT_DIR" && nohup node "$DAILY_CRON_PATH" \
          > "$LOG_DIR/heal-daily-cron-${TODAY}.log" 2>&1 &
        HEAL_PID=$!
        HEAL_NOTIFICATIONS+=("🩹 自愈: daily-cron 配额已恢复, 自动补跑 (pid ${HEAL_PID})")
      fi
    fi
  fi

  # ============== ② 周三晚 0 博客 → 自愈 weekly-blog ==============
  # 触发: 今天周三 + 当前 ≥ 20:00 + 今日博客 0 篇 + 上次 weekly-blog 失败
  if [ "$DOW" = "3" ] && [ "$CURRENT_HOUR" -ge 20 ] && ! heal_already_done "weekly-blog"; then
    today_blogs=$(count_today_blogs "$TODAY")
    if [ "$today_blogs" -eq 0 ]; then
      mark_heal_done "weekly-blog"
      echo "[$(date)] 自愈触发: 周三晚 0 博客, 自动跑 weekly-blog-trigger --force" >> "$LOG_FILE"
      cd "$WECOM_BOT_DIR" && nohup node "$WEEKLY_BLOG_PATH" --force \
        > "$LOG_DIR/heal-weekly-blog-${TODAY}.log" 2>&1 &
      HEAL_PID=$!
      HEAL_NOTIFICATIONS+=("🩹 自愈: 周三晚仍 0 博客, 强制触发 weekly-blog (pid ${HEAL_PID})")
    fi
  fi

  # ============== ③ 21:00 收尾自检 — 0 A 级 → 自愈 daily-cron 第 2 次 ==============
  # 触发: 当前 ≥ 21:00 + 今日跨 4 客户 0 A 级 commit + 今日尚未自愈 catch-up
  if [ "$CURRENT_HOUR" -ge 21 ] && ! heal_already_done "daily-cron-catchup"; then
    today_a_level=$(count_today_a_level "$TODAY")
    if [ "$today_a_level" -eq 0 ]; then
      mark_heal_done "daily-cron-catchup"
      echo "[$(date)] 自愈触发: 21:00 后 0 A 级, 跑 daily-cron catch-up 模式" >> "$LOG_FILE"
      cd "$WECOM_BOT_DIR" && CATCH_UP_MODE=1 nohup node "$DAILY_CRON_PATH" \
        > "$LOG_DIR/heal-catchup-${TODAY}.log" 2>&1 &
      HEAL_PID=$!
      HEAL_NOTIFICATIONS+=("🩹 自愈: 21:00 后仍 0 A 级 commit, 跑 daily-cron catch-up (pid ${HEAL_PID})")
    fi
  fi

fi

# ============================================================
# 4) 天花板能力缺口反向触发 v10.5 (B 轨核心扩展, 2026-05-01)
# ============================================================
# 起源: 4-29 运营人员"我每次问你都同样塌方" — 5 大天花板长期 0 产出.
# 不靠日历窗口 (周三才博客 / 周四才 GEO), 改靠 ceiling-kpi-scanner 实测缺口反向触发.
#
# 触发逻辑 (cooldown 不重复):
#   ① 博客本周缺口 critical (本周 < 50% + dow >= 4)              → spawn weekly-blog-trigger (一日一次)
#   ② HARO 本周全局缺口 critical (本周 < 30% + dow >= 3)         → spawn haro-batch-trigger (一日一次)
#   ③ GEO 本月缺口 critical (本月 < 50% + dom >= 15)             → spawn geo-attack-trigger (一周一次)
#   ④ CRO 本月缺口 critical (本月 < 50% + dom >= 15)             → spawn cro-experiment-trigger (一周一次)
#   ⑤ Looker 本月缺口未达成 (本月 < 100% + dom >= 25)            → spawn looker-monthly-trigger (一月一次)
# ============================================================
if [ "$CURRENT_HOUR" -ge 9 ] && [ -f "$CEILING_LATEST" ]; then

  # ============== ① 博客缺口 → weekly-blog 反向触发 ==============
  # 不同于上面 ②(只看周三晚 0 博客). 这里看本周整体进度: 周四起 < 50% → 不等周三, 直接补.
  # 4 客户每个独立判: 哪个 critical 跑哪个 (--client <id>)
  if ! heal_already_done "ceiling-blog"; then
    for cid in client-A client-B client-B2 client-D; do
      sev=$(read_ceiling_field ".domains.contentStrategy.perClient[\"$cid\"].severity")
      if [ "$sev" = "critical" ]; then
        echo "[$(date)] 缺口反向触发: $cid 博客 critical → weekly-blog --client $cid" >> "$LOG_FILE"
        cd "$WECOM_BOT_DIR" && nohup node "$WEEKLY_BLOG_PATH" --client "$cid" --force \
          > "$LOG_DIR/heal-blog-${cid}-${TODAY}.log" 2>&1 &
        HEAL_NOTIFICATIONS+=("🩹 反向触发: $cid 本周博客 critical → weekly-blog (pid $!)")
      fi
    done
    # 仅在至少触发一个时打 marker (避免无 critical 也消耗每日额度)
    if [ ${#HEAL_NOTIFICATIONS[@]} -gt 0 ]; then
      mark_heal_done "ceiling-blog"
    fi
  fi

  # ============== ② HARO 缺口 → haro-batch 反向触发 (一日一次) ==============
  if ! heal_already_done "ceiling-haro"; then
    haro_sev=$(read_ceiling_field ".domains.linkBuilding.severity")
    if [ "$haro_sev" = "critical" ] && [ "$DOW" -ge 3 ] && [ "$DOW" -le 5 ]; then
      # 周三/四/五跑 (周末 + 周一二配额吃紧不强求)
      mark_heal_done "ceiling-haro"
      HARO_TRIGGER="$WEB_OPS_SCRIPTS/haro-batch-trigger.mjs"
      if [ -f "$HARO_TRIGGER" ]; then
        echo "[$(date)] 缺口反向触发: HARO 本周 critical → haro-batch-trigger" >> "$LOG_FILE"
        cd "$WECOM_BOT_DIR" && nohup node "$HARO_TRIGGER" \
          > "$LOG_DIR/heal-haro-${TODAY}.log" 2>&1 &
        HEAL_NOTIFICATIONS+=("🩹 反向触发: HARO 本周 critical → haro-batch (pid $!)")
      else
        echo "[$(date)] HARO trigger 不存在: $HARO_TRIGGER (待落地)" >> "$LOG_FILE"
      fi
    fi
  fi

  # ============== ③ GEO 缺口 → geo-attack 反向触发 (一周一次) ==============
  if ! heal_done_this_week "ceiling-geo" && [ "$DOW" = "4" ]; then
    # 仅周四触发, 整月用一周窗口
    for cid in client-A client-B client-B2 client-D; do
      sev=$(read_ceiling_field ".domains.geoAttack.perClient[\"$cid\"].severity")
      if [ "$sev" = "critical" ]; then
        GEO_TRIGGER="$WEB_OPS_SCRIPTS/geo-attack-trigger.mjs"
        if [ -f "$GEO_TRIGGER" ]; then
          echo "[$(date)] 缺口反向触发: $cid GEO critical → geo-attack-trigger" >> "$LOG_FILE"
          cd "$WECOM_BOT_DIR" && nohup node "$GEO_TRIGGER" --client "$cid" \
            > "$LOG_DIR/heal-geo-${cid}-${TODAY}.log" 2>&1 &
          HEAL_NOTIFICATIONS+=("🩹 反向触发: $cid 本月 GEO critical → geo-attack (pid $!)")
        else
          echo "[$(date)] GEO trigger 不存在: $GEO_TRIGGER (待落地)" >> "$LOG_FILE"
        fi
      fi
    done
    mark_heal_done_week "ceiling-geo"
  fi

  # ============== ④ CRO 缺口 → cro-experiment 反向触发 (一周一次, 周四) ==============
  if ! heal_done_this_week "ceiling-cro" && [ "$DOW" = "4" ]; then
    for cid in client-A client-B client-B2 client-D; do
      sev=$(read_ceiling_field ".domains.croExperiment.perClient[\"$cid\"].severity")
      if [ "$sev" = "critical" ]; then
        CRO_TRIGGER="$WEB_OPS_SCRIPTS/cro-experiment-trigger.mjs"
        if [ -f "$CRO_TRIGGER" ]; then
          echo "[$(date)] 缺口反向触发: $cid CRO critical → cro-experiment-trigger" >> "$LOG_FILE"
          cd "$WECOM_BOT_DIR" && nohup node "$CRO_TRIGGER" --client "$cid" \
            > "$LOG_DIR/heal-cro-${cid}-${TODAY}.log" 2>&1 &
          HEAL_NOTIFICATIONS+=("🩹 反向触发: $cid 本月 CRO critical → cro-experiment (pid $!)")
        fi
      fi
    done
    mark_heal_done_week "ceiling-cro"
  fi

  # ============== ⑤ Analytics/Looker 缺口 → looker-monthly 反向触发 (一月一次, 25 号后) ==============
  if ! heal_done_this_month "ceiling-looker" && [ "$(date +%-d)" -ge 25 ]; then
    for cid in client-A client-B client-B2 client-D; do
      sev=$(read_ceiling_field ".domains.analyticsDeep.perClient[\"$cid\"].severity")
      if [ "$sev" = "critical" ] || [ "$sev" = "warning" ]; then
        LOOKER_TRIGGER="$WEB_OPS_SCRIPTS/looker-monthly-trigger.mjs"
        if [ -f "$LOOKER_TRIGGER" ]; then
          echo "[$(date)] 缺口反向触发: $cid Looker → looker-monthly-trigger" >> "$LOG_FILE"
          cd "$WECOM_BOT_DIR" && nohup node "$LOOKER_TRIGGER" --client "$cid" \
            > "$LOG_DIR/heal-looker-${cid}-${TODAY}.log" 2>&1 &
          HEAL_NOTIFICATIONS+=("🩹 反向触发: $cid 本月 Looker → looker-monthly (pid $!)")
        fi
      fi
    done
    mark_heal_done_month "ceiling-looker"
  fi

fi

# ============================================================
# 5) 推送 (P0 告警 + 自愈通知)
# ============================================================

# P0 告警
if [ ${#ALERTS[@]} -gt 0 ] && [ -n "$WEBHOOK_URL" ]; then
  msg="🚨 pm2 健康告警 ($(date '+%Y-%m-%d %H:%M'))\n\n"
  for a in "${ALERTS[@]}"; do msg+="$a\n"; done
  msg+="\n日志: $LOG_FILE"
  push_wecom "$msg"
  echo "[$(date)] 推送 P0 告警: ${#ALERTS[@]} 项" >> "$LOG_FILE"
fi

# 自愈通知 (跟告警分开推, 让运营人员清晰看到"系统自己修好了")
if [ ${#HEAL_NOTIFICATIONS[@]} -gt 0 ] && [ -n "$WEBHOOK_URL" ]; then
  msg="🩹 自愈机制触发 ($(date '+%Y-%m-%d %H:%M'))\n\n"
  for h in "${HEAL_NOTIFICATIONS[@]}"; do msg+="$h\n"; done
  msg+="\n约 15-30 min 后看 git log 验证 A 级 commit"
  push_wecom "$msg"
  echo "[$(date)] 推送自愈通知: ${#HEAL_NOTIFICATIONS[@]} 项" >> "$LOG_FILE"
fi

# 静默情况
if [ ${#ALERTS[@]} -eq 0 ] && [ ${#HEAL_NOTIFICATIONS[@]} -eq 0 ]; then
  echo "[$(date)] 全部健康, 无需自愈" >> "$LOG_FILE"
fi

# 保留 30 天 log + heal markers
# - 日级 marker (单字段-YYYY-MM-DD) 7 天就够
# - 周级 marker (单字段-YYYY-WNN) 保留 14 天 (跨 2 周)
# - 月级 marker (单字段-YYYY-MM) 保留 35 天 (跨 1 月余量)
find "$LOG_DIR" -name "pm2-health-*.log" -mtime +30 -delete 2>/dev/null
find "$LOG_DIR" -name "heal-*.log" -mtime +30 -delete 2>/dev/null
find "$HEAL_DIR" -name "*-20*-*-*.marker" -mtime +7 -delete 2>/dev/null   # 日级 YYYY-MM-DD
find "$HEAL_DIR" -name "*-20*-W*.marker" -mtime +14 -delete 2>/dev/null   # 周级 YYYY-WNN
find "$HEAL_DIR" -name "*-20*-*.marker" -mtime +35 -delete 2>/dev/null    # 月级 YYYY-MM (兜底)

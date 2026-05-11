#!/usr/bin/env bash
# ================================================================
# Stop hook: 检测本轮 assistant response 是否含选项询问模式
# 命中 → exit 2 + stderr 注入 system-reminder, 让 Claude 下轮自查
# ================================================================
# 起源 (2026-04-29 v10.4 A 轨):
#   运营人员明确反映「每次对话你塞 A/B 让我选, 导致工作跑偏完不成」
#   memory 已有 3 条相关反馈但仍反复违反 → 加 Stop hook 兜底
# ================================================================
# 设计原则:
#   - 不硬 block (exit 1) — 必问 4 类需保留, 误判风险大
#   - 软提醒 (exit 2 注入 reminder) — 让 Claude 下次自查
#   - 故障兜底: 任何解析异常都 exit 0 放行, 绝不炸会话

set -u
set +e

INPUT="$(cat)"
TRANSCRIPT_PATH=$(printf '%s' "$INPUT" | jq -r '.transcript_path // empty' 2>/dev/null)

[[ -z "$TRANSCRIPT_PATH" || ! -f "$TRANSCRIPT_PATH" ]] && exit 0

# 提取本轮最后一条 assistant message 的 text content
# (选项模式只该出现在 assistant text 输出, 不该在 tool_use input 里)
# 修复 (2026-04-30): 原写法 jq | tail -100 会把整个会话历史最后 100 行
# 全扫一遍, 触发 false positive (久远前的"要不要"被反复抓回来).
# 改用 jq -s slurp + last 只取 transcript 里最后一条 assistant message.
LAST_MSG=$(jq -s -r '
  [.[] | select(.type=="assistant")] |
  if length == 0 then "" else
    last | .message.content[]? | select(.type=="text") | .text // empty
  end
' "$TRANSCRIPT_PATH" 2>/dev/null)

[[ -z "$LAST_MSG" ]] && exit 0

# ---- 选项询问模式检测 ----
# 命中任意一条即视为违反决策默认值表

HIT_PATTERNS=()

# ① 字母选项列表 (A. xxx / B. xxx / C. xxx) 连续 ≥ 2 行
# 注意排除"列表序号"误判 (1. / 2. 是正常列表), 只看大写字母 A-D
if echo "$LAST_MSG" | grep -cE '^\s*\*?\*?[A-D]\.\s' | awk '{ if($1>=2) exit 0; else exit 1 }'; then
  HIT_PATTERNS+=("A./B. 字母选项列表 ≥ 2 项")
fi

# ② 表格选项 (markdown table 含 | A | / | B |)
if echo "$LAST_MSG" | grep -qE '\|\s*\*?\*?[A-D]\.\s'; then
  HIT_PATTERNS+=("表格里塞 A./B. 选项")
fi

# ③ "要不要 X" / "是否 X" / "需要我 X 吗" / "现在 X 吗"
if echo "$LAST_MSG" | grep -qE '要不要|是否需要|需要我.{1,30}吗|现在.{1,30}吗'; then
  HIT_PATTERNS+=("\"要不要/是否/需要我...吗\" 询问句")
fi

# ④ "X 还是 Y" 选择句 (但要排除 "用 X 还是 Y" 这种业务讨论 — 简单粗暴: 命中即标)
if echo "$LAST_MSG" | grep -qE '.{2,30}还是.{2,30}[？\?]'; then
  HIT_PATTERNS+=("\"X 还是 Y?\" 选择句")
fi

# ⑤ "你说" / "你定" 让运营人员决定
if echo "$LAST_MSG" | grep -qE '你说.*[补做改干跑]|你定.*[就好行]|说[补做改干跑]或不[补做改干跑]'; then
  HIT_PATTERNS+=("\"你说/你定\" 把决策推给运营人员")
fi

# ⑥ "如果方向对/方向认可, 我...开干" 变相征求确认
if echo "$LAST_MSG" | grep -qE '如果方向(对|认可)|你点头|点头.{1,5}[就才]'; then
  HIT_PATTERNS+=("变相征求方向确认")
fi

# ---- 没命中 → 放行 ----
[[ ${#HIT_PATTERNS[@]} -eq 0 ]] && exit 0

# ---- 命中 → 注入 reminder ----
# 排除合法的"必问 4 类"语境: 钱 / 跨客户群发 / 删数据 / 跨智能体边界
# 简单关键词检测, 命中即认为是合法询问, 放行
LEGITIMATE_CTX='报价|定价|服务费|合同|多少钱|预算|月度.+token|跨客户群发|公开发布|LinkedIn|GitHub public|删除生产数据|force push|改.+DNS|改.+域名 NS|跨智能体边界|该不该归我管'
if echo "$LAST_MSG" | grep -qE "$LEGITIMATE_CTX"; then
  exit 0
fi

# 命中且非合法 → 推 reminder
{
  echo ""
  echo "⚠️ web-ops 决策默认值表违规检测 (Stop hook)"
  echo ""
  echo "上一轮 response 命中以下选项询问模式:"
  for p in "${HIT_PATTERNS[@]}"; do
    echo "  - $p"
  done
  echo ""
  echo "按 web-ops/CLAUDE.md \"决策默认值翻转\"硬规则, 必问运营人员的只有 4 类:"
  echo "  ① 钱 / 客户合同 / 服务定价"
  echo "  ② 跨客户群发 / 公开发布到外部"
  echo "  ③ 删除生产数据 / 大规模 force push / 改客户域名 DNS"
  echo "  ④ 跨智能体边界"
  echo ""
  echo "其他全部默认自己拍板做完报告. 如刚才的询问不属于这 4 类, 下一轮重写为"
  echo "\"我做了 X, 因为 Y. 如果错了请回滚\". 别再让运营人员选."
} >&2

exit 2

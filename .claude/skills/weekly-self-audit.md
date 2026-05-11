---
name: weekly-self-audit
description: 每周日跑的元规则自审 — 扫智能体本周是否重犯了 memory 已记录的反模式。重犯 ≥ 2 次升级到硬规则 (hook/阻断)。是 v11.0 治"同样错教 5 次"反复教训的关键机制。
---

# weekly-self-audit — 反复教训终结者

## 起源

2026-05-07 v11.0 诊断发现：memory 25% 是"不要拖延 / 自己拍板"反复教训（9 条同主题）。
顶级 vs 中等分水岭：**顶级一次学会终身遵守 / 中等同错教 5 次**。
本 skill 解决"教训写进 memory 但智能体仍重犯"的元问题。

## 触发

- **自动**：pm2 cron `weekly-self-audit-cron` 每周日 18:00 跑（[scripts/weekly-self-audit.mjs](../../scripts/weekly-self-audit.mjs)）
- **手动**：运营人员说"自审" / "复盘" / "学到了什么" / "/自审"
- **事件驱动**：运营人员第 N 次教同一件事时（"我都说过 X 了"）立即跑

## 4 阶段流程

### 阶段 1：抽提反模式清单
- Read 所有 `~/.claude/projects/-home-hkf-ai-studio-------------web-ops/memory/feedback_*.md`
- 提取每条的**反模式关键词**（取 description 字段 + 文件名核心词）
- 输出：当前共 N 条反模式

### 阶段 2：扫本周触发证据
- git log 本周（4 客户站 + web-ops + site-builder + 父仓）所有 commit message + diff
- 看 commit message / 改动文件 / commit 时间是否触发已知反模式
- 记录每个反模式的"本周触发次数"

### 阶段 3：识别重犯（≥ 2 次或本周 ≥ 1 次但 memory 已记录 ≥ 3 次）
- 重犯 = "memory 已记录 + 本周仍触发"
- 严重重犯 = "本周触发 ≥ 2 次" 或 "memory 累计 ≥ 3 条同主题"
- 严重重犯**自动升级到硬规则**：spawn 待办"加 settings.json hook"或"加 build-qa 检查项"

### 阶段 4：输出周自审报告
- 落 `案例库/周自审/2026-WXX.md`
- 含：本周新教训 / 重犯清单 / 升级动作 / 下周防线

## 反模式分类（v11.0 起步分类，可扩）

### A. 拖延 / 不立即执行（feedback_no_*）
关键词：明早 / 将 / 加进 daily-ops / 下次 / 等会 / 之后再 / 推迟
重犯检测：grep commit message 含这些词，或运营人员本周说过"我都说过不要拖延"类原话

### B. 决策默认值漂移（feedback_decision_default_action 系列）
关键词：A 选项 / B 选项 / 您选择 / 要不要我 / 是否需要 / 您觉得
重犯检测：本周对话内（或 git commit message）出现给运营人员塞选项的模式

### C. 边界违反（feedback_strengthen_agent_not_client_work 系列）
关键词：在 web-ops 改建站文件 / 在运营对话改 starter / 越界
重犯检测：git diff 看本周是否有跨智能体边界的改动

### D. 通信反模式（no_briefing_as_success / no_push_only_real_work 等）
关键词：每天发简报 / 推日报 / 长卡片
重犯检测：daily-cron 推送数 vs A 级 commit 数比例

### E. 重做 / 补丁化（structural_not_patches）
关键词：先补这次 / 临时方案 / 之后再根治
重犯检测：本周 commit message 含"临时" / "先" / "fix"但同 issue 历史已修过 ≥ 2 次

## 输出格式（落盘 案例库/周自审/2026-WXX.md）

```markdown
# 2026 第 X 周 智能体自审报告

**周期**：YYYY-MM-DD ~ YYYY-MM-DD
**生成**：YYYY-MM-DD HH:MM

## 一、本周触发的已知反模式

| 反模式 | 触发次数 | 累计 memory 记录次数 | 严重度 |
|---|---|---|---|
| ...

## 二、严重重犯（≥ 2 次或累计 ≥ 3）→ 自动升级硬规则

1. 反模式 X
   - 本周触发：N 次
   - 累计：M 次
   - 升级动作：加 settings.json hook 阻断 / build-qa 检查项 / Stop hook 软提醒

## 三、本周新教训（不在已知 memory 中）

(列出新出现的反模式 + 是否要写 memory)

## 四、下周防线（具体动作）

1. ...
2. ...

## 五、自审评分（量化）

- 反模式重犯次数：N
- 重犯严重度：低/中/高
- 元规则健康度：x/100
```

## 升级触发器

**当反模式累计 ≥ 5 次仍重犯时**：
- 把 memory 提示从"软记忆"升级到 **hook 硬阻断**（settings.json 配 PreToolUse / Stop hook）
- 相关变更落到 settings.json + 跨智能体广播（其他智能体也加同样 hook）

**当本周触发 ≥ 3 个不同反模式时**：
- 推 P0 企微提醒运营人员"智能体本周状态异常，建议人工 review"

## 与现有机制的关系

- **不替代** memory 系统（仍是教训第一时间存放点）
- **不替代** 收尾扫描（那是即时兜底）
- **是新增**的"周一次元自审"层，专治反复教训不根治问题

## 反元规则（防止本 skill 自身漂移）

- 不要把"自审输出"当事情做完（输出报告 ≠ 升级硬规则才是真闭环）
- 重犯 ≥ 2 次必须当周立 hook，不允许标"下周做"
- 自审报告 ≤ 500 字，禁止变成"周日总结作文"

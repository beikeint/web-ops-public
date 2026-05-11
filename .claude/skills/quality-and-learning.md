---
name: quality-and-learning
description: 智能体的质量 gate 和学习曲线 — 客户日报评分 + 月度 commit 归集. 防产出退化, 形成"成功复用 / 失败沉淀"的双轨.
---

# 质量 & 学习曲线技能 (v10.2 batch6, 2026-04-27 立)

## 起源

智能体 4 月 4 客户产出 170 commits, 但:
- 真独立 A 级优化只 13 个 (7.6%)
- 客户日报质量参差 (实测 demo-c 63 / demo-b 63 / demo-a 43 / hearingprotect 80)

**问题**: 没自动评分 → 不知道哪些日报低质 / 哪些 commit 是真增量 / 哪些经验该跨客户复用. 顶级运营团队的核心特征 = 持续学习曲线, 不是堆数量.

## 工具 1: 客户日报质量评分器

`scripts/briefing-quality-scorer.mjs`

```bash
# 单文件评分
node scripts/briefing-quality-scorer.mjs <briefing.md>

# 客户 + 日期
node scripts/briefing-quality-scorer.mjs --client demo-c --date 2026-04-27
```

### 评分维度 (100 分制)

| 维度 | 满分 | 检测项 |
|---|---|---|
| 数据完整度 | 25 | GSC 7d / GA4 24h / 索引状态 / SSL |
| 行动可执行性 | 25 | ≥ 3 项今日执行 / 每项含"预期效果" |
| 客户语言 | 25 | 第二人称 ≥ 3 次 / 内部术语未脱壳扣分 |
| 排期清晰度 | 25 | 含明天 / 本周 / 接下来 |

### 阈值

- ≥ 80 ✅ 通过 (可直接发客户)
- 60-79 ⚠️ 警告 (建议人工微调)
- < 60 🔴 待人工审 (低于阈值)

退出码: 0 / 1 / 2 (可用于 cron 自动过滤)

### 集成

daily-cron 阶段 4 推企微时, 每客户卡片头部自动附 "客户日报质量 X/100 ✅/⚠️/🔴" 标签.

## 工具 2: 月度案例库归集器

`scripts/case-study-collector.mjs`

```bash
# 跑当月 (默认 30 天)
node scripts/case-study-collector.mjs

# 指定月份 + 天数
node scripts/case-study-collector.mjs --month 2026-04 --days 30
```

### 工作流

1. 扫 4 客户站近 30 天 `git log`
2. 按 commit message 关键词分 7 类:
   - 📝 博客发布 / 🔗 内链矩阵 / 🎯 CTR 优化 / 🏷️ Schema/GEO / 🚨 紧急修复 / ♻️ 内容 refresh / 📦 其他
3. 输出 `案例库/月度归集/<YYYY-MM>.md`:
   - 总览表 (类别 / 数量 / 客户分布)
   - 按类别详情 (每条带 hash / 日期 / 客户 / subject)
   - **沉淀指引** (人工补充 Top 3 成功 / Top 3 失败 / 跨客户复用候选)

### 4 月归集 (4-27 首跑数据)

- 4 客户 170 commits
- 真独立 A 级 13 个 (7.6%)
- 其他 157 (主要是 daily-ops 切碎 + 视觉升级 + chore)
- 暴露问题: commit 粒度规则 4-27 才立, 前 30 天未生效

### 激活节奏

每月 1 号手动跑一次 (后续可加 pm2 cron):
- `node scripts/case-study-collector.mjs --month <上月>`
- 归集生成后, 运营人员人工标 Top 3 成功 + Top 3 失败 + 跨客户复用候选
- 沉淀进案例库, 智能体下个月 daily-cron 跑时引用 (zero-touch A 级判定时参考)

## 反例

- ❌ 评分 < 80 时只警告不行动 (应推运营人员企微 + 标"待人工审")
- ❌ 月度归集只生成不沉淀 (Top 3 成功/失败 段空着 = 学习曲线断)
- ❌ 跨客户复用候选靠人工记忆 (应每月 collector 主动列候选对)

## 与其他 skill 关系

- 与 `content-production` 互补: content 写作技能, 此 skill 验收日报输出
- 与 `cross-client-pattern-application` 协同: 月度归集是后者的数据源
- 与 `case-study-pipeline` 同源: 此 skill 是 case-study 的**自动归集入口**, case-study skill 是手动深度沉淀

---
description: 跑 CTR 优化引擎（P5 能力），找指定客户的"高排名低 CTR"机会页+批量重写 Title/Desc
argument-hint: <客户ID>
---

激活网站运营智能体 v9.4，对客户 **$1** 跑 P5 CTR 优化引擎。

执行 `.claude/skills/ctr-optimization.md` 全流程：

1. **数据拉取**：
   - 调 search-analytics MCP `gsc_search_performance` 拉本月 query+page 维度数据
   - 过滤条件：position ≤ 20 + impressions ≥ 50 + ctr < 2%
   - 输出"高排名低 CTR 机会页"清单（按 impressions × (期待 CTR - 实际 CTR) 排序）

2. **机会页诊断**（每页）：
   - 当前 Title / Description 截图
   - 该 query 的 SERP 看竞品 Title 怎么写（调 fetcher MCP 或 brightdata）
   - 识别 CTR 低的原因（Title 太长截断 / 缺数字/年份 / 缺 emoji 钩子 / 不含品牌优势 / 不含本地化信号）

3. **批量重写**（top 5-10 机会页）：
   - 新 Title（含主关键词 + 钩子 + 不超过 60 字）
   - 新 Description（150-160 字 + CTA + 差异化卖点）
   - **必过 humanizer-zh** 去 AI 味（这是给真人看的）

4. **部署**：
   - 客户站类型决定怎么改（WP → wp-cli / Astro → 改 frontmatter / 静态站 → 改 HTML）
   - 改完 IndexNow 推送让 Bing/Yandex 立刻抓
   - GSC URL Inspection API 申请重抓

5. **7 天复盘环**：
   - 加进 client-manager timeline，写明"7 天后回看 CTR 是否提升 ≥ 1pp"
   - 设置 schedule 提醒 7 天后跑回查

**输出**：机会页清单 + 重写前后对比表 + 部署确认 + 7 天复盘提醒已设

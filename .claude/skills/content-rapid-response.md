---
name: content-rapid-response
description: 3 阶段快速内容生产 — 用于 48h 竞品响应 + GSC Gap 词补位。与深度 12 阶段 content-production 互补。
---

# 3 阶段快速响应技能 v1.0

> 触发场景：  
> A. 竞品雷达发现 48h 内新文章覆盖我们的关键词 → 立即响应对抗  
> B. 选题池 Top 1 GSC Gap 词 → 周二内容进化维度补位  
> 
> 目标：每篇 2-3 小时交付（vs 12 阶段深度版 2-3 天）  
> 2026-04-20 P5+P7 强化落地

---

## 深度 vs 快速 — 什么时候用哪个

| 维度 | 12 阶段深度（content-production） | 3 阶段快速（本技能） |
|---|---|---|
| 字数 | 2500-5000+ | 800-1500 |
| 耗时 | 2-3 天 | 2-3 小时 |
| 适用 | 支柱页/行业权威内容 | 竞品响应/长尾补位/博客节奏保温 |
| 月频 | 1-2 篇 | 2-3 篇 |
| 质量底线 | 独家数据+权威来源 | 结构清晰+对得上搜索意图 |

**组合目标**：每月 4 篇 = 1-2 篇深度 + 2-3 篇快速。

---

## 阶段 1 · 调研（20-30 分钟）

```
Step 1: 确认选题源
        A. 竞品响应：读 docs/competitor-radar-YYYY-MM-DD.md 的新文章
        B. GSC Gap：读 docs/topic-pool-YYYY-MM-DD.md 的 Top 词

Step 2: 搜索意图校准
        → fetch Google "关键词" 前 10 结果
        → 快速扫结果类型（博客/产品页/视频/问答/图表）
        → 确定本文应是：信息型/对比型/购买决策型/问答型

Step 3: 差异化角度（必有，否则就不做）
        → 竞品原文提了什么 ✅ 什么没提 ❌
        → 我们有什么独家数据能加（客户真实产线/价格/ROI 数据）
        → 一句话角度：「竞品说了 X，但他们没提 Y（我们能讲得更好/更全）」

Step 4: 数据+来源清单（至少 3 条）
        → 权威数据源 1-2 条（行业报告/维基/学术论文）
        → 我方数据 1 条（产品规格/客户案例/价格区间）

输出：docs/outlines/YYYY-MM-DD-{slug}.md 含选题+意图+角度+数据清单
```

---

## 阶段 2 · 撰写（1-1.5 小时）

```
Step 5: 用 6 段式模板生产

  H1: 主关键词 + 数字锚点 + 年份
  ├─ Lead 段（答案胶囊 60 词）：BLUF 直接回答核心问题
  ├─ H2-1: What is X（定义 + 关键规格 200 词）
  ├─ H2-2: X vs Y / Types / Categories（对比表或分类 300 词）
  ├─ H2-3: How to Choose / When to Use（决策框架 300 词）
  ├─ H2-4: Cost / MOQ / Lead Time（价格+采购信号 200 词）
  ├─ FAQ 4-6 问（FAQPage Schema 必备，直接抄 GSC Gap 词 + 搜索关联问题）
  └─ CTA 段：Request sample + MSDS + 24h reply

Step 6: SEO 强制清单（写完立即自查）
        ☐ Title 50-65 字符，含主关键词 + 数字
        ☐ Meta Description 140-160 字符，含 MOQ/交期/样品承诺之一
        ☐ 答案胶囊第一段 40-80 词
        ☐ FAQ ≥ 4 问
        ☐ 内链 ≥ 3 条（指向相关博客/产品页）
        ☐ 出链 ≥ 1 条（权威来源背书 E-E-A-T）
        ☐ 图片含 alt + 产品图用 .webp

输出：src/data/blog-posts.ts 新增条目（中文版，英文版做 EN 再用 sonnet 翻 ES/PT）
```

---

## 阶段 3 · 发布（20-30 分钟）

```
Step 7: 翻译（用 Sonnet 省 token）
        → Agent(subagent_type='general-purpose', model='sonnet')
        → 提供 EN 原文 + 术语表（参考 client-briefing.md 21 条对照）
        → 生成 ES + PT 版本（FR/AR/RU 视客户市场决定）

Step 8: 部署 + 追踪
        → npm run build
        → deployer MCP 部署
        → fetch 验证 3 语种页面 HTTP 200
        → IndexNow 推
        → GSC sitemap 重提交
        → content-tracker.add_content 录入
        → client-manager.add_timeline 记里程碑

Step 9: 纳入 Day 7/14/30 追踪
        → 7 天后：查 GSC 曝光 + 索引状态
        → 14 天后：CTR + 排名曲线
        → 30 天后：总点击 + 询盘归因（GA4 事件）
        → 写入 docs/content-performance.md 长期追踪表
```

---

## 禁止行为

- 禁止没有差异化角度就写（生成"同行都能写"的通用内容 = 负 SEO 分）
- 禁止跳过 SEO 强制清单（会影响排名，后期补成本更高）
- 禁止忽略 Day 7/14/30 追踪（没复盘 = 学不到模式）

---

## 与其他技能联动

```
周一 daily-growth:
  SEO 精细化 → 跑 CTR 引擎
  + 跑 topic-pool.mjs 生成本周选题单

周二 daily-growth:
  内容深度进化 → 从选题池选 Top 1 → content-rapid-response 3 阶段生产

日常（可接 pm2 cron）:
  凌晨 6:00 跑 competitor-radar.mjs
  → 发现新文章 → 今日第一个 task 是评估响应
```

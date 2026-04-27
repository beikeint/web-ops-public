---
name: attribution-analytics
description: >
  深度归因分析 — server-side tracking + cohort 分析 + first-touch/last-touch/data-driven
  attribution + cross-device 跟踪 + 自定义维度。突破 GA4 默认 last-click 偏见,识别真实
  增长引擎。基于 Avinash Kaushik 框架 + 2026 cookieless 时代实战。触发词:
  "归因分析"、"attribution"、"server-side tracking"、"cohort"、"first-touch"、
  "data-driven attribution"、"GA4 数据准"、"为什么 Direct 占比这么高"。
user-invokable: true
argument-hint: "<客户ID>"
license: MIT
metadata:
  source: "Avinash Kaushik 框架 + GA4 Attribution + 2026 server-side / cookieless 实战"
  version: "1.0"
  category: analytics
  added_in: "v10 (2026-04-26)"
---

# Attribution & Analytics 深度套件 v1.0

> **何时用**：客户站 GA4 Direct 流量占 > 50%（归因失效）/ Conversion path 不清晰 / 多渠道营销但不知谁有效 / 季度 ROI 计算需要
> **不适用**：基础 GSC/GA4 数据拉取（用 analytics-api skill）
> **核心原则**：**默认 last-click 归因严重低估上游渠道（搜索 / 社媒 / 内容）的贡献**

---

## 核心问题：GA4 默认归因的 4 大盲区

### 1. Direct 流量虚高
**症状**：GA4 显示 Direct = 60-90%
**真因**：
- 跨设备访问（手机搜到，电脑买）→ Last-click 显示 Direct
- HTTPS → HTTP referrer 丢失
- 邮件客户端 / 社媒 app 内嵌浏览器不传 referrer
- 私密浏览模式

**修复**：
- UTM 参数全链路覆盖（emails / 社媒 post / 广告）
- Server-side tracking 部分恢复（不全恢复但减半）

### 2. Last-Click 偏见
**症状**：博客内容引来流量但 conversion 全归 Direct / Organic Search 第二次访问
**真因**：用户旅程：博客（发现）→ 几天后 Direct 来（转化）→ Last-click 算 Direct
**修复**：用 GA4 Data-driven Attribution（DDA）模型

### 3. Cross-Device 缺失
**症状**：移动 SEO 流量大但转化少
**真因**：用户手机搜到，桌面来转化（被算两个 user）
**修复**：登录用户开 user_id；匿名用 Google Signals（cookie consent 允许下）

### 4. Cookieless 时代失真
**症状**：iOS 17+ 移动流量数据骤降
**真因**：ITP（Intelligent Tracking Prevention）+ App Tracking Transparency
**修复**：server-side tracking + first-party data 战略

---

## 4 大归因模型对比

| 模型 | 适合场景 | 视角 |
|---|---|---|
| **Last-Click**（GA4 默认） | 简单认知 | 谁拿走最后一击 |
| **First-Click** | 想知道渠道发现价值 | 谁第一次接触 |
| **Linear** | 平均认知所有触点 | 每个渠道平等贡献 |
| **Time-Decay** | 长决策周期 | 越接近转化贡献越大 |
| **Position-Based** (40-20-40) | 平衡发现+转化 | First + Last 重要 + 中间均匀 |
| **Data-Driven Attribution** ✅ | 高流量站（GA4 推荐） | ML 算法基于实际转化路径 |

**B2B 长决策周期推荐**：Time-Decay 或 DDA
**B2C 短决策周期**：Last-Click 或 Position-Based

---

## Server-Side Tracking 配置（2026 必备）

### 选型
- **Google Tag Manager Server-side**（自己维护，完全自由，月 $20-50 server 成本）
- **Stape.io**（GTM Server-side 托管，$20-50/月）
- **Segment + Customer.io**（CDP 模式，$120+/月起，企业级）

### 收益
- 跨设备识别（user_id + cookie 联合识别）
- iOS ITP 失真减半
- 跑分广告（FB/TikTok）转化回传率显著提升

### 部署 SOP
1. 选 server-side 工具（推荐 GTM SS for technical clients）
2. 创建 server container
3. 配 GA4 client → endpoint
4. 改前端：events 发到自己 endpoint 而非 google-analytics.com
5. server 反向发到 GA4 + 必要时 enrichment（拼 user_id 等）
6. cookie consent 兼容：保留 first-party cookie

---

## Looker Studio Dashboard 模板

每个客户必备 5 个 dashboard：

### 1. SEO Performance Overview
- Source: GSC + GA4
- Metrics: Impressions / Clicks / CTR / Avg Position（按 Country、Device、Page、Query 切片）
- 时间维度：7 天 / 30 天 / 90 天 trend

### 2. Conversion Funnel
- Source: GA4
- Metrics: Page View → Engagement → Conversion event 各步流失率
- 按 Landing page / Source / Medium 切片

### 3. Content Performance
- Source: GA4 + GSC
- Metrics: Top 20 pages by traffic / engagement / conversion
- 红绿灯：traffic ↑ + conversion ↑（绿）/ traffic ↑ conversion ↓（黄）/ 全降（红）

### 4. Attribution Comparison
- Source: GA4 Attribution reports
- 4 模型并列对比：Last-click vs First-click vs Linear vs DDA
- 揭示哪个渠道在不同模型下被低估/高估

### 5. ROI Calculator
- Source: GA4 + 客户提供的成本数据 + 内部投入工时
- Metrics: 每渠道流量成本 / 每条 lead 成本 / 客户终生价值（LTV）

---

## Cohort 分析 SOP

**用途**：识别"获客质量随时间变化"

### Cohort 1: Acquisition cohort（按月入站时间）
- 每月获客组的 30/60/90 天留存
- 哪个月新客质量更高？
- 关联同月做的运营动作（排名 / 内容 / 外链）

### Cohort 2: Behavior cohort（按首次行为）
- 首页进 vs 博客进 vs 产品页进的用户后续转化差异
- 内容 vs 直接 vs 社媒的转化差异

### Cohort 3: Source cohort（按渠道）
- Organic Search 来的用户 LTV vs Paid Search vs Direct
- 揭示真实的渠道价值（last-click 之外）

---

## 自定义维度建议

GA4 默认维度有限，建议加：

1. **page_template**（首页/产品/博客/about/contact）
2. **content_topic**（博客主题分类）
3. **user_segment**（new vs returning vs identified）
4. **conversion_step**（funnel 阶段标签）
5. **language**（多语言站必备）
6. **source_grouped**（merging "google search console" / "google search" 等）

---

## 输出报告模板

```
## 归因深度报告 · [客户ID] · [周期]

### 1. 流量来源真实分布（多模型对比）
| 渠道 | Last-Click | First-Click | DDA |
|---|---|---|---|
| Organic Search | 30% | 50% | 42% |
| Direct | 50% | 5% | 22% |
| Email | 10% | 8% | 12% |
| Social | 5% | 25% | 15% |
| Referral | 5% | 12% | 9% |
**洞察**：Organic 实际贡献被 last-click 低估 12pp,Social 被低估 10pp

### 2. Conversion Path 分析
- 平均触点数：X
- 平均决策时长：Y 天
- Top 3 转化路径：
  1. Organic Search → Direct → Convert (30%)
  2. Social → Email → Convert (15%)
  3. Direct → Direct → Convert (10%)

### 3. Cohort 留存分析
| Cohort | 30 天留存 | 60 天留存 | 90 天留存 |
|---|---|---|---|
| 2026-02 | 35% | 22% | 15% |
| 2026-03 | 41% | 28% | (n/a) |
| 2026-04 | 48% | (n/a) | (n/a) |
**洞察**：3-4 月获客质量明显提升,关联 4 月内容产出加速

### 4. ROI 计算
- 总投入：[人力 + 工具] = $X
- 总产出（含 LTV 估算）：$Y
- ROI: Y/X = Z

### 5. 行动建议
- 优化方向 1: ...
- 优化方向 2: ...
```

---

## 工具栈

| 用途 | 工具 | 价格 |
|---|---|---|
| 数据可视化 | Looker Studio（免费）/ Metabase（开源） | 免费 |
| Server-side tracking | GTM Server-side / Stape.io | $20-50/月 |
| Cohort 分析 | GA4 Explorations 内置 | 免费 |
| 跨工具同步 | Make.com / Zapier | $9+/月 |
| First-party data | Customer.io / Klaviyo | $100+/月 |

---

## 跨技能协作

| 发现 | 转给 |
|---|---|
| Funnel 某步流失大 | cro-suite |
| 哪个内容贡献最大但没流量 | content-production（扩写 / 类似主题） |
| 哪个外链高 ROI | digital-pr（继续这种 outreach） |
| 哪个搜索词到了但没转化 | ctr-optimization（CTR 改） |

---

## 成熟度评分（自评 0-100）

- GA4 5 转化事件部署：✅ 已部署（90/100）
- GSC + GA4 数据集成：✅ search-analytics MCP 12 工具（85/100）
- Looker Studio Dashboard：⚠️ 各客户未配（20/100）
- Server-side tracking：❌ 未起步（0/100）
- Cohort 分析：❌ 未起步（5/100）
- Attribution 多模型对比：⚠️ GA4 内置但未使用（30/100）
- 自定义维度：⚠️ 部分客户配了 page_type（25/100）
- **总体成熟度：35/100**（v10 起点，目标 2 个月达 65/100）

---

## v10 起步 30 天计划

### 第 1 周：Looker Studio 起跑
- 给 demo-b / demo-c / demo-a 各搭 SEO Performance + Conversion Funnel 2 个 dashboard

### 第 2 周：Attribution 对比报告
- 用 GA4 Attribution 跑每客户 last-click vs DDA 对比
- 出"被低估渠道"清单

### 第 3 周：自定义维度部署
- 给每客户站加 page_template + language 维度
- 重新切片报告

### 第 4 周：Server-side tracking 评估
- 选 1 个客户（推荐 demo-c，流量最大）做 GTM Server-side 试点
- 部署 1 个月后对比数据准确性变化

---

*v10 新增 skill · 2026-04-26 起执行*

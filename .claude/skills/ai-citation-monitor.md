---
name: ai-citation-monitor
description: AI搜索引用监控 — 在ChatGPT/Perplexity/Google AI Mode中搜索客户核心关键词，检测客户网站是否被AI引用，追踪GEO效果
---

# AI搜索引用监控技能

> 触发指令：`[客户名] AI引用检查` / 在weekly-check中自动执行  
> 执行频率：每周1次  
> 人工确认：无需确认，自动输出

---

## 为什么需要这个技能

传统SEO只追踪Google排名。但2025-2026年，越来越多买家通过AI搜索（ChatGPT、Perplexity、Google AI Mode）获取信息。

**如果AI在回答"EPS machine manufacturer China"时引用了你的网站，即使用户没有点击链接，你的品牌也获得了曝光。**

这个技能追踪的是：AI搜索引擎是否在回答行业相关问题时引用了客户的网站内容。

---

## MCP 调用链

```
Step 1: 加载客户信息
        → client-manager.get_client(client_id)
        → 获取：域名、产品、核心关键词

Step 2: 构建查询列表
        → 基于客户产品线生成5-10个AI搜索查询
        → 查询类型：
          - 产品类："best EPS block molding machine manufacturer"
          - 对比类："EPS vs EPP which is better for packaging"
          - 指南类："how to set up an EPS factory"
          - 供应商类："EPS machine suppliers China"
          - 技术类："EPS pre-expander working principle"

Step 3: Perplexity 检测（最可靠）
        → fetch("https://www.perplexity.ai/search?q=[查询词]")
        → 分析返回内容：
          - 是否提到客户品牌名（如"Demo-C"）
          - 是否引用客户域名（如"demo-c.com"）
          - 是否引用客户文章内容（关键句匹配）
          - 引用位置（正文 vs 来源列表）

Step 4: 结果分类

    ✅ 被引用 — AI在回答中引用了客户网站
    ⚠️ 被提及 — AI提到了客户品牌名但未链接
    ❌ 未出现 — AI回答中完全没有客户信息
    🔄 竞品被引用 — 竞品出现在AI回答中但客户没有

Step 5: 输出引用报告
        → 保存到 客户-XX/数据/YYYY-WXX_AI引用监控报告.md
```

---

## 查询词设计原则

### 按买家意图分层

| 层级 | 查询类型 | 示例 | 目的 |
|------|---------|------|------|
| 品牌层 | 直接搜品牌 | "Demo-C" / "demo-c.com" | 确认品牌是否被AI知道 |
| 产品层 | 搜具体产品 | "EPS block molding machine" | 核心产品是否被推荐 |
| 对比层 | 搜对比问题 | "EPS vs EPP foam" | 博客内容是否被引用 |
| 场景层 | 搜应用场景 | "how to start EPS factory" | 指南类内容是否被引用 |
| 供应商层 | 搜供应商 | "China EPS machine manufacturer" | 是否在供应商推荐列表中 |

### 每次检测的查询数量

- 品牌层：1-2个（固定）
- 产品层：2-3个（与核心产品对应）
- 其余：2-3个（轮换，每周不同）
- **每次总计：5-8个查询**

---

## 引用报告格式

```
# [客户名] AI引用监控 — YYYY年第XX周

## 总览

| 指标 | 数值 | 环比 |
|------|------|------|
| 检测查询数 | X |  |
| ✅ 被引用 | X | +X/-X |
| ⚠️ 被提及 | X | +X/-X |
| ❌ 未出现 | X |  |
| 🔄 竞品被引用 | X |  |

## 引用详情

### ✅ 被引用

| 查询词 | AI平台 | 引用方式 | 引用内容摘要 |
|--------|--------|---------|-------------|
| "EPS vs EPP foam" | Perplexity | 来源链接 | 引用了/en/blog/eps-vs-epp文章的对比表格 |

### ❌ 未出现但应该出现

| 查询词 | AI回答了什么 | 引用了谁 | 我们的差距 | 建议行动 |
|--------|-------------|---------|-----------|---------|
| "EPS machine China" | 推荐了3家供应商 | competitor-a.com | 我们的产品页缺少对比数据 | 补充产品页数据 |

### 🔄 竞品引用情况

| 竞品 | 被引用次数 | 主要被引用内容 |
|------|-----------|--------------|
| competitor-a.com | X次 | ICF博客、材料对比 |

## GEO改进建议

1. [基于未被引用的查询，给出具体内容改进建议]
2. [基于竞品被引用的内容，给出差异化策略]
```

---

## 提升AI引用率的策略

基于监控结果，对应改进：

| 发现 | 改进动作 | 联动技能 |
|------|---------|---------|
| 产品查询未被引用 | 产品页补充具体数据、对比表格 | → tech-optimization |
| 博客内容未被引用 | 补充答案胶囊、数据点、FAQ | → content-refresh |
| 竞品被引用但我们没有 | 写同主题更深度的文章 | → content-production |
| 品牌完全未被AI认知 | 部署llms.txt + 增加外部引用 | → link-building |
| FAQ类查询未被引用 | 补充FAQ Schema + 结构化问答 | → hotfix |

---

## 检测方案优先级（实战验证后更新）

Perplexity搜索页robots.txt禁止MCP fetch抓取。需要多种备选方案：

### 方案A：反向验证法（推荐，最可靠）

不去抓AI搜索页面，而是检查客户网站是否具备被AI引用的条件：

```
→ fetch(客户博客页, raw=true) → 检查GEO要素是否完整：
  - 有答案胶囊（首段40-60词直接回答问题）？
  - 有FAQ Schema？
  - 有具体数据点（数字、百分比、价格）？
  - 有表格？
  - 段落长度<=120词？
  - 有llms.txt？
→ 打分：GEO就绪度（0-100）
→ GEO就绪度>80 = 被引用概率高
```

### 方案B：品牌搜索量追踪

如果AI频繁引用你的品牌，品牌搜索量会上升：

```
→ 从GSC数据中提取品牌词搜索量变化
→ 品牌搜索量上升 = AI引用在起效的间接证据
```

### 方案C：手动检测+截图记录

每周手动在以下平台搜索3个核心关键词：
- Perplexity.ai
- ChatGPT（联网模式）
- Google AI Mode（如果可用）

截图保存到 `客户-XX/数据/AI引用截图/`，标注日期和关键词。

### 方案D：Perplexity API（未来）

Perplexity提供API服务，可以通过API查询获得结构化结果。待评估成本和可行性。

---

## 局限性说明

1. **无法直接自动抓取AI搜索结果**：Perplexity/ChatGPT/Google均限制自动抓取
2. **反向验证法是间接指标**：GEO就绪度高不等于一定被引用，但概率显著更高
3. **引用结果有时效性**：同一查询不同时间AI可能给出不同回答
4. **品牌搜索量受多因素影响**：上升不一定是AI引用导致，但可作为参考指标

---

## 与其他技能联动

| 场景 | 联动 |
|------|------|
| 发现竞品被大量引用 | → competitor-monitor 深度分析 |
| 核心内容未被引用 | → content-refresh 补充GEO元素 |
| 新文章发布后 | → 下周检测是否被AI收录 |
| llms.txt更新后 | → 2-4周后检测效果 |
| 季度复盘 | → quarterly-review 分析AI引用趋势 |

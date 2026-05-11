---
name: lead-magnet-automation
description: Lead Magnet 自动化生成 — 行业报告 PDF / Buyer's Guide / ROI 计算器 / 产品对比表 / Webinar 注册 5 类模板。换 email 进 inquiry nurturing sequence。B2B 转化倍增器（提升 30-100%）。
---

# Lead Magnet 自动化 v1.0

> **建立时间**：2026-04-27（v10.1 第四批）
> **核心目标**：每客户站 ≥ 2 份 Lead Magnet，把"看完就走"流量转为"留 email"流量
> **B2B 数据**：Lead Magnet 提升转化率 30-100%（DemandGen 2024 研究）

---

## 一、5 类 Lead Magnet（按 ROI 排序）

| # | 类型 | B2B ROI | 制作成本 | 适合阶段 |
|---|---|---|---|---|
| 1 | **行业报告 PDF**（Industry Report） | ⭐⭐⭐⭐⭐ | 1 篇/8h（AI 辅助） | 信任建立期 |
| 2 | **Buyer's Guide PDF**（采购指南） | ⭐⭐⭐⭐⭐ | 1 篇/6h | 决策评估期 |
| 3 | **ROI 计算器**（互动工具） | ⭐⭐⭐⭐ | 1 个/16h（首次） | 决策评估期 |
| 4 | **产品对比表 PDF** | ⭐⭐⭐⭐ | 1 张/4h | 决策评估期 |
| 5 | **Webinar 注册** | ⭐⭐⭐ | 持续 | 信任建立期 |

---

## 二、行业报告 PDF · 自动化生产

### 选题来源
- Top 关键词的"State of the Industry" / "{年份} Trends" / "Market Size"
- GSC 高展示但低 CTR 的查询词（用户在找信息但没看到我们）
- 竞品没有的角度（数据驱动 + 客户独家数据）

### 生产流程（8 小时）

```
Step 1: 选题 (1h)
  - search-analytics MCP 找高展示低 CTR 查询
  - WebSearch 看竞品的 industry report
  - 选 1 个角度（如 "2026 EPS Industry Trends Report"）

Step 2: 数据收集 (2h)
  - Statista / Grand View Research / 行业协会数据
  - 客户独家数据（如真实出口数据 / 工厂能耗 / 案例数据）
  - WebSearch 拉权威来源（IEA / IMF / WTO）

Step 3: AI 起草 (1h)
  - 用 Opus 模型基于数据写 20-30 页报告
  - 含 5-10 个图表（数据图 / 趋势图 / 对比图）
  - 含 3-5 个客户案例（真实数据）

Step 4: 审稿 + humanizer-zh (1h)
  - 检查数据准确性
  - 过 humanizer-zh 去 AI 味
  - 客户审一遍确认数据可公开

Step 5: 设计排版 (2h)
  - Canva Pro / Figma 模板
  - 客户品牌色 + logo
  - 图表用 brand 颜色
  - 封面 + 目录 + 章节分隔页

Step 6: 配套发布 (1h)
  - 客户站 /resources 页加下载入口
  - Form 收集邮箱（Form 提交后才下载）
  - 自动接 inquiry email-nurture（PDF 邮件附件方式发出）
  - GA4 事件 generate_lead 触发
```

### 模板（B2B 工业报告）

```
Cover: [报告名] · [年份] · {{COMPANY}} 出品

Executive Summary (1 page):
- 核心洞察 5 条（数字驱动）
- 报告价值（"为什么读"）

Chapter 1: 行业现状 (4-6 pages)
- 市场规模 + 增长率
- 主要玩家分布
- 区域市场对比

Chapter 2: 关键趋势 (5-8 pages)
- 5-7 个 trend，每个含数据 + 案例
- AI / 可持续 / 供应链等热点

Chapter 3: 采购决策 (4-6 pages)
- B2B 采购流程
- 评估指标（价格 / 品质 / 服务 / 资质）
- 常见误区

Chapter 4: 案例研究 (3-5 pages)
- 3-5 个真实案例（含数据）
- "How XX 工厂用 YY 产品提升 ZZ"

Chapter 5: 未来展望 (2-3 pages)
- 6-12 个月预测
- 推荐行动

Appendix:
- 数据来源
- 术语表
- 联系方式 (CTA)
```

---

## 三、Buyer's Guide PDF · 决策辅助

### 适用
- 客户站有产品页但访客在评估"哪种产品适合我"
- 决策周期 ≥ 2 周

### 模板（6 小时）

```
Cover: [产品类目] Buyer's Guide · 2026 Edition

Section 1: 你为什么需要 [产品类目] (1-2 pages)
- 解决的核心问题
- 不用的代价

Section 2: 5 种主流方案对比 (3-4 pages)
- 每方案优缺点 + 价格区间 + 适用场景
- 横向对比表

Section 3: 评估清单 (2-3 pages)
- 12 个评估维度（如 capacity / lead time / certifications / ROI）
- 每维度的 baseline / 推荐值 / 红线

Section 4: 询价模板 (1 page)
- "向供应商问的 10 个关键问题"
- 用户复制问每家供应商

Section 5: 案例 (2 pages)
- 真实买家如何用本指南做决策

CTA:
- "Get a customized recommendation: [客户站 contact]"
- "Free consultation: WhatsApp xxx"
```

**钩子设计**：
- 第 4 章"询价模板"是核心钩子（用户拿去问竞争对手，但因为 PDF 是我们做的，他们会先问我们）

---

## 四、ROI 计算器（互动工具）

### 实施

参考已有的 demo-c `/en/roi-calculator/`：
- 用户填产能参数
- 算回本周期 + 5 年 TCO
- 留邮箱获完整报告

### 模板（首次 16h）

```typescript
// pages/roi-calculator.astro
---
const calculatorConfig = {
  inputs: [
    { id: 'capacity', label: '产能 (吨/月)', type: 'number', default: 100 },
    { id: 'currentCost', label: '当前成本 ($/吨)', type: 'number', default: 1000 },
    { id: 'targetMarket', label: '目标市场', type: 'select', options: ['EU', 'US', 'AU', 'Other'] },
    // ...
  ],
  formula: (inputs) => {
    // 业务逻辑算回本周期
    return {
      paybackMonths: ...,
      totalSavings5y: ...,
      roiPct: ...,
    };
  },
  emailGate: {
    label: '获取完整 PDF 报告（含税务/物流/案例）',
    fields: ['email', 'company', 'country'],
  },
};
---
```

后续客户接入只需复制 + 改业务逻辑 formula。

---

## 五、产品对比表 PDF（4h 生产）

### 适用
- 跨境 B2B 客户问"你们产品 vs X 品牌"

### 模板

```
[产品类目] Comparison Matrix · 2026

| Feature | Our [Product] | Competitor A | Competitor B | Industry Avg |
|---|---|---|---|---|
| 价格区间 | $$ | $$$ | $$$ | $$ |
| Lead Time | 15 days | 30 days | 25 days | 25 days |
| MOQ | 5 tons | 10 tons | 5 tons | 7 tons |
| 资质 | ISO/SGS/CE | ISO | ISO/SGS | varies |
| 客户数 | 200+ | 1000+ | 500+ | - |
| ... |

注意：竞品名用化名 / 类别（Avoid 直接告对手）
```

---

## 六、Webinar 注册（持续运营）

### 主题选型
- "2026 EPS Industry Outlook"
- "How to Choose Your First [Product] Supplier"
- "Q&A with Our Engineers"

### 实施

- 用 Zoom Free（100 人/会，40 分钟限）/ 或 YouTube Live（无限制）
- 客户站 /webinars 页
- Form 收集邮箱 + 公司
- 注册后接 inquiry email-nurture（前置 + 后置邮件）

---

## 七、自动化 SOP（部署到客户站）

### Step 1: 制作 Lead Magnet 内容（按上述 5 类选 1-2 类首批）

### Step 2: 部署到客户站

```
客户/<X>/website/src/pages/resources/
├── index.astro              ← 资源页（列出所有 lead magnets）
├── industry-report.astro     ← 行业报告下载页
├── buyers-guide.astro        ← Buyer's Guide
├── roi-calculator.astro      ← ROI 计算器（已有）
└── product-comparison.astro  ← 产品对比表
```

### Step 3: Form 设计（最少摩擦）

```html
<form id="lead-magnet-form" data-magnet-type="industry-report">
  <input name="email" type="email" required placeholder="Work email">
  <input name="firstName" placeholder="First name">
  <input name="company" placeholder="Company (optional)">
  <button type="submit">Download Free Report</button>
</form>
```

**关键**：必填 ≤ 2 字段（email + 1 个）。其他字段后续 nurturing 时收集。

### Step 4: GA4 事件

```javascript
form.addEventListener('submit', () => {
  gtag('event', 'generate_lead', {
    event_category: 'lead_magnet',
    lead_magnet_type: form.dataset.magnetType,
  });
});
```

### Step 5: 接 inquiry 智能体

Form 提交触发 → inquiry 智能体 → email-nurture sequence 启动（已有 web-ops-integration skill）

---

## 八、节奏目标

每客户站 6 个月内：
- 第 1 月：1 份 Lead Magnet（行业报告或 Buyer's Guide）
- 第 2-3 月：第 2 份 + ROI 计算器
- 第 4-6 月：3-5 份齐备 + 第一次 Webinar

每月新增 lead magnet 下载 ≥ 30 个 → 进 inquiry nurture pipeline。

---

## 九、KPI 验证

### 30 天
- 至少 1 份 Lead Magnet 上线
- 下载数 ≥ 20 个
- 转化（下载 → 进入 nurture sequence）≥ 80%

### 90 天
- 2-3 份 Lead Magnet 齐备
- 累计下载 ≥ 100
- 询盘转化（下载 → 询盘）≥ 10%

---

## 十、跨技能协作

| 协作场景 | 转给 |
|---|---|
| Lead Magnet 内容选题 | content-production skill 阶段 1-3（用同样的关键词矩阵） |
| 数据来源整理 | analytics-api / search-analytics |
| 设计排版 | image-generator MCP（封面） + Canva 人工 |
| Email 投递 | inquiry 智能体 email-nurture |
| 转化追踪 | attribution-analytics（看 lead magnet → 询盘 → 成交全链路） |

---

## 十一、客户配合需求

✅ 必须客户提供：
- 真实数据（出口数据 / 案例数据 / 价格区间）
- 客户案例同意公开（含数字）
- 资质证书扫描图

✅ 客户审批：
- 报告内容（数据准确性）
- PDF 设计（品牌色 / logo 用法）
- Form 字段（GDPR 合规）

---

*v10.1 第四批 · Lead Magnet 自动化 · 2026-04-27 · B2B 转化倍增器*

---
name: schema-library
description: >
  完整 Schema.org 类型库 — 10+ 类型 (Article/Product/FAQPage/HowTo/VideoObject/
  LocalBusiness/Organization/BreadcrumbList/Recipe/SoftwareApplication/Person/Event)
  + 2026 GEO 时代特别强化(AI Overviews / ChatGPT 引用解析 schema)。
  Schema 是 2026 年最高 ROI 技术 SEO 投资:CTR +25%,AI 引用率显著提升。触发词:
  "schema"、"结构化数据"、"rich snippet"、"FAQ schema"、"产品 schema"、"video schema"、
  "knowledge graph"、"AI Overviews 引用"、"AEO"。
user-invokable: true
argument-hint: "<客户ID> [page-type 或 url]"
license: MIT
metadata:
  source: "Schema.org 官方 + 2026 Google rich result guidelines + GEO/AEO 实战"
  version: "1.0"
  category: technical-seo
  added_in: "v10 (2026-04-26)"
---

# Schema 完整类型库 v1.0

> **何时用**：客户站准备上线 / 已上线但 SERP 视觉素净（无 rating / FAQ / image / video carousel）/ AI Overviews 不引用
> **不适用**：纯样式 schema（如 BreadcrumbList 已被各 starter 默认带）
> **核心数据（2026）**：
> - Schema 站点 CTR **+25%**（vs 无 schema）
> - AI Overviews / ChatGPT / Perplexity 都依赖 schema 解析作者归属、内容类型
> - **Schema 是 2026 年单点投资最高 ROI 的技术 SEO 项目**

---

## 12 大常用 Schema 类型 + 触发场景

### 1. Article / NewsArticle / BlogPosting

**适用**：所有博客文章 / 新闻稿
**关键属性**：
```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "...",
  "datePublished": "2026-04-26",
  "dateModified": "2026-04-26",
  "author": { "@type": "Person", "name": "...", "url": "https://.../author/...", "sameAs": ["LinkedIn URL", "Wikipedia URL"] },
  "publisher": { "@type": "Organization", "name": "...", "logo": { "@type": "ImageObject", "url": "..." } },
  "image": ["URL1", "URL2"],
  "mainEntityOfPage": { "@type": "WebPage", "@id": "..." }
}
```
**2026 重点**：`author.sameAs` 必带（AI 引用作者归属信号）

### 2. Product + Offer + AggregateRating + Review

**适用**：B2C 产品页 / B2B 产品配置页
**完整组合（最高 rich result 触发率）**：
```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "...",
  "image": ["URL"],
  "description": "...",
  "sku": "...",
  "brand": { "@type": "Brand", "name": "..." },
  "offers": {
    "@type": "Offer",
    "url": "...",
    "priceCurrency": "USD",
    "price": "999.00",
    "availability": "https://schema.org/InStock",
    "itemCondition": "https://schema.org/NewCondition"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "reviewCount": "127"
  },
  "review": [...]
}
```

### 3. FAQPage

**⚠️ 2026 警告**：Google 已限制 FAQPage rich result 仅 government / health 域名（YMYL）**部分查询**触发，但**非 YMYL 仍触发** ≈ 多数行业仍可用。
**适用**：产品页底部 / 服务说明页 / 帮助中心
**关键**：每个 question 必含 1 个 acceptedAnswer

### 4. HowTo

**适用**："如何..."、"step by step..." 内容
**强势触发**：featured snippet + step-by-step rich result
**示例**：怎么使用 PVA 胶水 / 怎么安装防火门胶 / 怎么测试材料
**关键属性**：`step[]` 每步含 `name + text + image`

### 5. VideoObject

**适用**：所有嵌入视频内容
**强信号**：解锁 Google Video search tab 入选
**关键属性**：
```json
{
  "@type": "VideoObject",
  "name": "...",
  "description": "...",
  "thumbnailUrl": [...],
  "uploadDate": "2026-04-26T08:00:00+08:00",
  "duration": "PT2M30S",
  "contentUrl": "...",
  "embedUrl": "..."
}
```

### 6. LocalBusiness

**适用**：本地服务（餐饮/医疗/装修/线下店）
**关键**：`address` + `geo` + `openingHoursSpecification` + `priceRange`
**ROI**：触发 Google Maps 本地包，转化率最高

### 7. Organization

**适用**：所有公司站首页（强制必备）
**2026 强化**：
```json
{
  "@type": "Organization",
  "name": "...",
  "url": "...",
  "logo": "...",
  "description": "...",
  "foundingDate": "...",
  "sameAs": [
    "LinkedIn URL",
    "Crunchbase URL",
    "YouTube URL",
    "Wikipedia URL（如有）",
    "Wikidata URL（如有）"
  ],
  "contactPoint": [
    { "@type": "ContactPoint", "telephone": "...", "contactType": "sales", "areaServed": ["US","DE"], "availableLanguage": ["en","de"] }
  ]
}
```
**`sameAs` 是 GEO 时代关键**：AI 借此识别"实体身份"

### 8. BreadcrumbList

**适用**：所有非首页（默认必备）
**好处**：SERP 显示面包屑路径替代 URL
**Astro starter 已默认带**

### 9. Recipe

**适用**：食品 / 烹饪 / 料理类站
**强势 rich result**：rating / cooking time / nutrition label

### 10. SoftwareApplication

**适用**：SaaS 工具 / 软件下载
**关键**：`applicationCategory` + `operatingSystem` + `offers.price`

### 11. Person

**适用**：作者页 / 创始人页 / 团队页
**2026 强化**：`sameAs` + `knowsAbout` + `alumniOf`
**作用**：AI 时代作者身份信号，影响 AI 引用归属

### 12. Event

**适用**：展会 / webinar / 线下活动
**关键**：`startDate` + `location` + `offers`（如收费）

---

## 跨境 B2B 化工类客户首批必上 schema

按 demo-b 实战经验，B2B 化工站建议必上：

1. ✅ **Organization**（首页 + sameAs 全部填全）
2. ✅ **Product**（每个产品页，含 brand + sku + offers 即使是"Contact for Pricing"）
3. ✅ **BreadcrumbList**（所有内页）
4. ✅ **Article**（所有博客）
5. ⚠️ **FAQPage**（产品页底部 FAQ section，注意 2026 限制）
6. ⚠️ **HowTo**（"如何使用"类内容）
7. ⏳ **VideoObject**（如有产品演示视频）
8. ⏳ **Person**（创始人 + 总工程师页面）

---

## Schema 部署 SOP

### Step 1: 现有 schema 审计
```bash
# 用 seo-checker MCP
check_structured_data <客户站 URL>
```

### Step 2: Google Rich Result Test
- 上 https://search.google.com/test/rich-results 测每页
- 修复所有 ❌ Required field 缺失 / 格式错误

### Step 3: Schema Markup Validator
- 上 https://validator.schema.org 校验 JSON-LD 语法

### Step 4: GSC Enhancement 报告
- GSC > Enhancements 看每类 schema 的 valid / warning / error 数

### Step 5: 部署后跟踪
- 1 周后看 GSC: rich result impression 是否增加
- 4 周后看：是否出现在 SERP（用 site:URL 搜核心词查）

---

## 常见错误（2026 高发）

| 错误 | 影响 | 修复 |
|---|---|---|
| Product 没 offers | 不触发 rich result | 即使无价也填 `priceSpecification` 或 `availability` |
| Article 缺 author.url | AI 不知作者归属 | 加 author 页 + `sameAs` 链接 |
| FAQ 题目重复 SERP 截断 | 显示不全 | 5 题以内，每题 ≤ 80 字 |
| sameAs 给假链接 | 实体识别失败 | 必须真实可访问 + 含品牌信息 |
| 多语言站 schema 没本地化 | 多语种 rich result 缺失 | 每语种页 schema 本地化 description / name |
| HowTo step 没 image | 触发率低 | 每步必带 `image` 即使是简笔画 |

---

## 工具栈

| 用途 | 工具 | 价格 |
|---|---|---|
| Schema 生成 | https://www.schema-app.com / https://technicalseo.com/tools/schema-markup-generator/ | 免费起 |
| Schema 校验 | https://validator.schema.org | 免费 |
| Rich Result Test | https://search.google.com/test/rich-results | 免费 |
| 监控 SERP rich result | GSC > Enhancements | 免费 |
| Astro 集成 | astro-seo-schema 包 / 自写 helper | 免费 |

---

## 跨技能协作

| 发现 | 转给 |
|---|---|
| Schema 部署后 CTR 仍低 | ctr-optimization（Title/Desc 改） |
| 多语言 schema 本地化复杂 | seo-hreflang skill |
| 作者实体建设需要外部信号 | digital-pr（Wikipedia / LinkedIn） |
| AI Overviews 引用不到 | seo-geo skill |

---

## 实战案例锚点

- demo-b 4-22 多语种部署时 schema 已本地化 description / name → 阿语 / 俄语 query 都能触发
- demo-a 上线 Day 9 已有 organization + product + breadcrumb schema → 首批转化（1 WhatsApp + 1 phone）出现得快

---

## 成熟度评分（自评 0-100）

- Organization schema：✅ 各客户已部署（80/100）
- Product schema：✅ 大多已部署（70/100）
- Article schema：✅ 已部署（75/100）
- FAQPage schema：⚠️ 部分客户已部署（50/100）
- HowTo schema：❌ 未启用（10/100）
- VideoObject schema：❌ 未启用（0/100）
- Person schema：❌ 未启用（10/100）
- sameAs 完整度：⚠️ 部分填了（40/100）
- **总体成熟度：50/100**（v10 起点，目标 1 个月达 75/100）

---

*v10 新增 skill · 2026-04-26 起执行*

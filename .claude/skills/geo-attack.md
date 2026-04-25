---
name: geo-attack
description: GEO 主动攻占 — 给排名好但未被 AI 引用的页面补信号（答案胶囊/FAQ/权威外链/定义语句），拿 Perplexity/ChatGPT/Google AI Overviews 引用
---

# GEO 攻防系统 v1.0

> 触发：周四 daily-growth GEO 强化维度 / `[客户] GEO 攻占`  
> 数据源：`scripts/geo-opportunities.mjs` 每周扫描输出  
> 2026-04-20 P9 落地（强化第二波·自主完成部分）

---

## 为什么做 GEO 攻占

**AI 搜索份额上升**：Perplexity / ChatGPT / Google AI Overviews / Bing Copilot 在 2025-2026 抢占了传统搜索 15%+ 份额。**被 AI 引用**成为新的流量入口。

**现状（2026-04-20 基线）**：
- demo-c GA4 28 天 16 会话，AI referral **0**
- demo-b GA4 28 天 5 会话，AI referral **0**
- 攻占潜力巨大

**AI 引用优选信号**（综合 Perplexity 源码分析 + OpenAI 搜索论文）：
1. **答案胶囊**（Answer Box / BLUF）首段 40-80 词直接回答问题
2. **FAQPage Schema** 结构化问答（≥5 问）
3. **权威外链**（.gov / .edu / wikipedia / 行业协会），E-E-A-T 信任信号
4. **定义性语句**（"X is Y" / "X refers to..."）H1 附近出现

---

## 4 种强化动作模板

### 动作 A · 答案胶囊（40-80 词 BLUF）

放在文章 H1 之后、第一个 H2 之前，独立成段。

**模板**：
```
{核心主题} 的核心答案 40-80 词：

{主题 X} is {一句话定义 15-25 词}. Used in {典型应用 2-3 个}. 
Key advantages include {3 个数字化优势}. Compared to {对标对象}, 
{关键差异点}. Typical cost/spec: {具体数字}.
```

**示例（EPS Fast Cycling）**：
> EPS Fast Cycling Grade material is a premium-grade expandable polystyrene resin (0.4-0.7 mm beads, 40-60x expansion) designed for high-volume molding. Used in packaging, insulation, and ICF blocks. It cuts cycle times 20-30% and steam energy 15-20% vs standard EPS, enabling 30% higher daily output from the same equipment. MOQ from 5 tons.

---

### 动作 B · FAQPage Schema（5+ 问）

从 GSC 的 query 数据 + "People Also Ask"（Google SERP 右侧）挖 5-8 个真实问题。

**问题类型覆盖**：
- 1 个定义型（"What is X?"）
- 1 个对比型（"X vs Y which is better?"）
- 1 个价格型（"How much does X cost?"）
- 1 个规格型（"What are the specifications of X?"）
- 1 个采购型（"How to buy X / MOQ / Lead time"）

**答案要求**：
- 每问答 80-150 词
- 含具体数字（$价格 / MOQ / %效率 / 天数等）
- 含产品链接（CTA 埋点）

**Schema 嵌入**（Astro 模板已支持，只需提供 FAQ 数组给 FAQPage 组件）。

---

### 动作 C · 权威外链（≥2 条）

出站链接到：
- `.gov`（government 标准）— 如 epa.gov、nist.gov、ec.europa.eu
- `.edu`（学术）
- `wikipedia.org`（背景定义）
- `iso.org` / `astm.org` / `bsi.com`（行业标准）
- 行业协会（EUMEPS、INSULPRO 等）

**实操**：
- 每篇文章至少 2 条权威外链
- 链接文字用描述性文字（不是"click here"）
- `rel="noopener"`（不要 `nofollow`，AI 搜索会解读为"不想背书"）

---

### 动作 D · 定义性语句

H1 下方紧跟的第一段必须用"X is Y"句式。

**模板**：
- `[Product/Topic] is [a/an] [category] that [key function/benefit]`
- `[Product/Topic] refers to [definition] used in [application]`
- `[Product/Topic] means [concept] characterized by [key spec]`

**示例**：
> EPS block molding machine **is** an industrial steam-fusion press that converts pre-expanded polystyrene beads into large rigid foam blocks (typically 1,400 × 800 × 400 mm) used for cutting into insulation boards, packaging sheets, and geofoam.

---

## 执行流程（周四 GEO 维度）

```
Step 1: 跑 scripts/geo-opportunities.mjs
        → 输出 Top 5 攻占目标
        → 每个目标列出缺失信号（无答案胶囊 / FAQ<5 / 无权威链 / 无定义语）

Step 2: 选 Top 1 或 Top 2 同时做
        → 每个目标每次补 1-2 个缺失信号（不要一次全改，影响评估）

Step 3: 按 A/B/C/D 模板补信号
        → 改 src/data/blog-posts.ts 或 src/data/products.ts
        → Schema 自动继承（FAQPage 组件已支持）

Step 4: 部署 + 验证
        → npm run build / deployer MCP
        → fetch 验证页面 HTML 里新信号可见
        → IndexNow 推

Step 5: 30 天后复盘（geo-log.md）
        → GA4 referral 是否有 AI 站点（perplexity.ai / chatgpt.com / gemini / copilot）
        → 手动到 Perplexity 搜核心词看是否引用本站
        → GSC 品牌词（公司名）展示是否增长
```

---

## 禁止行为

- 禁止只给 FAQPage Schema 不给可读的 FAQ 内容（Google 会判为 schema 滥用）
- 禁止给不相关的权威外链（扣 E-E-A-T 分）
- 禁止答案胶囊超过 150 词（AI 不会抓取过长段落作"答案"）
- 禁止同一周对同一页面改超过 2 个信号（无法评估哪个生效）

---

## 成功指标（90 天）

- 核心博客 GEO 分从 2-3/10 → 8+/10
- GA4 AI referral 从 0 → 每周 3-5 次
- Perplexity 手动查核心词时，本站进入引用列表
- GSC 品牌词展示增长 2-3 倍（AI 搜索→品牌搜索的漏斗效应）

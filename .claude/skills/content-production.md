---
name: content-production
description: 天花板级内容生产 — 12阶段全流程（SERP拆解→关键词矩阵→架构→创作→SEO→GEO→CRO→评分→翻译→发布→追踪），模型分层省token
---

# 内容生产技能（天花板版）

> 🔴 **v10.1 弹性激活节奏（2026-04-27 起，修正 v10 硬指标过激）**：
> - **节奏目标**（不是硬指标）：B2B 客户每周 ≥1 篇（含 refresh）/ 跨境 B2C 每周 ≥2 篇 / SaaS 每周 ≥3 篇
> - **每周三 9:00 daily-cron 自动检查**：上周博客发布数 < 节奏目标 → 当日跑数据驱动选题（topic-pool + GSC + competitor）出 Top 3 候选
> - **优先 refresh 老内容 > 写新博客**（顶级 agency 70% 时间花 refresh，ROI 高 2-5 倍）
> - **没真高价值候选可跳过该周**（不为完成 KPI 硬塞，禁止稀释内容质量）
> - **季度自检**（不是月度）：B2B 12+ 篇 / B2C 24+ 篇 / SaaS 36+ 篇
> - **slash 命令**：`/博客 <客户ID>` 零参数 = 自动选题 / `/博客 <客户ID> <主题>` = 指定
>
> 触发指令：`[客户名] 写博客：[主题]` / `[客户名] 选题确认，开始执行` / **`/博客 <客户ID> <主题>`**
> 人工确认：⏸️ 阶段4架构设计确认后，阶段5-12自动完成
> 模型分层：阶段1-9 + 11-12用**Opus**，阶段10翻译用**Sonnet**
>
> **集成新 skill（v10）**：
> - 阶段 7 GEO 植入 → 调 [seo-geo skill](../seo-geo/SKILL.md)
> - 阶段 8 转化植入 → 调 [cro-suite skill](../cro-suite/SKILL.md)
> - SERP 拆解 → 借 [seo-sxo skill](../seo-sxo/SKILL.md)
> - Schema 生成 → 调 [schema-library skill](../schema-library/SKILL.md)

---

## 12阶段总览

```
调研层（Opus）     │ 1.搜索意图 → 2.SERP拆解 → 3.关键词矩阵 → 4.架构设计 ⏸️确认
创作层（Opus）     │ 5.英文撰写 → 6.SEO植入 → 7.GEO植入 → 8.转化植入
质控层（Opus）     │ 9.三维评分（≥75分才过）
翻译层（Sonnet）   │ 10.多语言翻译
发布层（Opus）     │ 11.发布部署 → 12.发布后追踪
```

---

## MCP 调用链

```
Step 1: 加载客户
        → client-manager.get_client(client_id)
        → 获取：域名、语言列表、行业、产品线、已发布文章

Step 2: 记录写作状态
        → content-tracker.add_content(client_id, 标题, "blog", "writing")

Step 3: 执行12阶段（详见下方）

Step 4: 构建验证
        → npm run build → 验证新页面生成

Step 5: 部署
        → deployer.deploy(client_id) 或 sshpass+rsync

Step 6: 更新内容记录
        → content-tracker.update_content(status="published", url, publish_date)

Step 7: 索引提交+追踪启动（search-analytics MCP）
        → search-analytics.gsc_submit_sitemap(site=域名) → 通知Google有新内容
        → search-analytics.gsc_index_status(site=域名, urls=[新文章URL]) → 记录初始状态
        → 加入索引追踪队列：Day 7 / Day 14 / Day 30 回查索引+排名

Step 8: 时间线记录
        → client-manager.add_timeline(id, "发布博客: [标题] ([语言数]语言)")

### 发布后自动追踪（由 daily-ops 每日执行）

```
Day 7:  search-analytics.gsc_index_status(url) → 已索引？未索引？
        → 未索引 → 重新提交sitemap + 检查页面是否可访问
Day 14: search-analytics.gsc_search_performance(dimension='page') → 出现排名了？
        → 有排名 → 记录初始排名和关键词
        → 无排名 → 检查内链密度、内容质量
Day 30: search-analytics.gsc_search_performance(dimension='page') → 流量表现
        → 记录到 content-tracker → 用于下月 content-refresh 判断
```
```

---

## 调研层（阶段1-4，用Opus）

### 阶段1：搜索意图分析

不猜用户想要什么，**看Google实际给什么**。

```
操作：
→ fetch("https://www.google.com/search?q=[主关键词]&gl=us&hl=en")
→ 分析SERP实际页面构成：

1. 意图判定：
   - 信息型（SERP以博客/指南为主）→ 写长文指南
   - 商业调研型（SERP有博客+产品页混合）→ 写对比/选购指南
   - 交易型（SERP全是产品页/电商）→ 不适合写博客，应优化产品页
   - 导航型（SERP是品牌官网）→ 不适合

2. SERP特征检测：
   - 有Featured Snippet？→ 必须抢占（文章需包含精准的40-60词回答段）
   - 有People Also Ask？→ 提取所有PAA问题，纳入FAQ
   - 有表格展示？→ 文章必须有HTML表格
   - 有列表展示？→ 文章必须有有序列表
   - 有图片轮播？→ 文章需要高质量图片+alt
   - 有视频结果？→ 标记未来可做视频

3. 内容格式决策：
   意图是信息型 + SERP以长文为主 → 写2500-5000词深度指南
   意图是商业型 + SERP有对比内容 → 写对比评测文章+表格
   意图是"how to" + SERP有步骤列表 → 写步骤式教程
```

**输出**：搜索意图类型 + SERP特征清单 + 内容格式决策

---

### 阶段2：SERP前5名深度拆解

不只看标题，**逐篇拆解竞品内容的骨架**。

```
操作：
→ fetch(Google首页前5名文章URL) × 5（并行）
→ 对每篇文章分析：

| 维度 | 提取内容 |
|------|---------|
| 字数 | 总字数（用于确定我们的字数目标：比最长的多20%） |
| H2结构 | 所有H2标题列出（看覆盖了哪些子话题） |
| H3深度 | 每个H2下有几个H3（衡量深度） |
| 数据密度 | 有多少具体数字/百分比/价格/统计 |
| 表格 | 有几个表格，表格内容是什么 |
| FAQ | 有FAQ吗？几个问题？ |
| 图片 | 有原创图表吗？ |
| CTA | 有几个CTA？什么类型？ |
| 内链 | 链接到哪些内部页面？ |
| 外链 | 引用了哪些外部来源？ |
| Schema | 有什么结构化数据？ |
| 答案胶囊 | 首段是否直接回答问题？ |
```

```
关键分析：
→ 5篇文章的并集 = 这个话题必须覆盖的子话题
→ 5篇文章的空白交集 = 所有竞品都没写的点 = 我们的差异化机会
→ 最强的那篇缺什么 = 我们超越它的具体方向
```

**输出**：竞品拆解矩阵 + 内容空白点清单 + 超越策略

---

### 阶段3：关键词矩阵

不只选一个词，**构建完整的关键词生态**。

```
1. 主关键词（1个）
   → 与搜索意图精准匹配
   → 放在Title、首段、至少1个H2

2. 支撑关键词（3-5个）
   → 主词的变体/同义词
   → 分布在不同H2中
   → 如 "EPS block molding machine" → "EPS block moulding equipment" / "foam block maker"

3. 长尾问题词（5-8个）
   → 从阶段1的People Also Ask提取
   → 作为FAQ的问题
   → 如 "how much does an EPS block machine cost" / "EPS machine maintenance schedule"

4. LSI语义实体词（5-10个）
   → 与主题高度相关但不是关键词变体的术语
   → Google用这些词理解"这篇文章真的懂这个话题"
   → 如写EPS机器文章，LSI词包括：pentane, steam pressure, cycle time, bead density, mold cavity

5. AI搜索专用词（3-5个）
   → 适合被AI生成回答时引用的精确表述
   → 通常是"定义+数字"组合
   → 如 "EPS pre-expanders typically consume 25-40 kg steam per cubic meter"

6. 内链锚文本预规划
   → 这篇文章要链到哪些页面？用什么锚文本？
   → 哪些现有文章要链回到这篇？
```

**输出**：完整关键词矩阵表 + 内链预规划

---

### 🎯 模板优先级（v10.2 batch5 加 · 阶段 4 之前必做）

**写新博客前先检查是否能套用已验证的跨客户复用模板**（沉淀在 [案例库/跨客户复用模板/](../../案例库/跨客户复用模板/)）：

| 模板 | 适用 | 已验证客户 |
|---|---|---|
| [X-vs-Y 对比博客](../../案例库/跨客户复用模板/X-vs-Y-对比博客模板.md) | 客户产品/材料/工艺存在 2+ 选项需对比 | demo-c eps-vs-epp（13 博客流量第 1，64 imp/月）/ demo-b PVA-vs-Epoxy / demo-a Vacuum-vs-Foaming |
| (待沉淀) Buying Guide / How-to / FAQ Hub / Case Study | 后续按 ROI 抽提 | - |

**优先级判定**：
1. 选题命中"X vs Y / X 比 Y 好 / X 还是 Y / 哪个更适合 / Should I choose X or Y" → 直接走 X-vs-Y 模板（13 节骨架，工程从 8h → 2h/篇）
2. 不命中 → 走通用 12 阶段流程

**反例**：把 X-vs-Y 类选题当成"普通博客"自由写，丢掉流量支柱潜力（demo-c eps-vs-epp 是站内**唯一**有 1 click 的博客，不复用就错过）。

---

### 阶段4：架构设计 ⏸️ 需确认（v10 升级：含多模态强制项 + topic cluster 归属）

这是**文章的蓝图**，确认后才开始写。

**🔥 v10 新增 4 项必填**（之前没有 = 缺口）：
- **多模态规划**（GEO 引用率 +156%）：每篇文章必须含至少 1 项 — ① 视频（嵌入或建议拍摄）/ ② 原创信息图 / ③ 互动元素（计算器/工具）/ ④ 流程图。仅"加图片"不算。
- **Topic Cluster 归属**：本文章属于哪个 pillar（支柱页）？挂在 cluster 哪个 spoke 位置？如客户站还没 pillar，**先建 pillar 再写 spoke**（调 topic-cluster skill）
- **平台差异化目标**：本文优先攻占哪个 AI 平台？（ChatGPT/Perplexity/Google AIO/Bing Copilot），决定写法侧重
- **Person Schema 作者**：本文作者是谁？该作者的 LinkedIn/Wikipedia/Crunchbase 等 sameAs 链接列出（GEO 时代关键，AI 借此识别作者实体）

```
输出内容：

1. Title（≤60字符）
   → 含主关键词 + 数字/年份 + 吸引点击的hook
   → 示例："EPS Block Molding Machine: Complete Buyer's Guide 2026"

2. Meta Description（≤155字符）
   → 含主关键词 + 价值承诺 + CTA
   → 示例："Compare specs, costs & ROI of EPS block molding machines. Includes capacity calculator and 5-year TCO analysis. Get a free quote."

3. URL Slug
   → 短、含关键词、无停用词
   → 示例：/en/blog/eps-block-molding-machine-buyers-guide

4. 答案胶囊草稿（40-60词）
   → 文章第一段，直接回答核心问题
   → 这段被AI搜索引用的概率最高

5. H2/H3完整结构
   → 每个H2标注：植入哪个支撑关键词、覆盖哪个子话题
   → 每个H2下的H3列出
   → 标注哪个H2下放表格、哪个放列表
   → 标注SERP特征抢占点（如某个H2对应Featured Snippet）

6. 内链计划
   → 锚文本 → 目标URL（至少3-5条产品页链接 + 2-3条博客互链）

7. CTA设计
   → 开头CTA（软性，如"Get a free factory layout plan"）
   → 中间CTA（价值型，在关键H2之后，如"Download our capacity calculator"）
   → 结尾CTA（强引导，如"Request a quote — 48h response guaranteed"）

8. 外链引用计划
   → 引用哪些外部权威来源（行业报告、标准、研究机构）
   → 提升E-E-A-T

9. FAQ设计（5-7个问题）
   → 来源1：阶段1提取的PAA问题
   → 来源2：客户实际收到的高频询盘问题
   → 来源3：竞品FAQ中我们应该覆盖的
   → 每个问题标注目标长尾关键词

10. 预估字数 + 预计评分
```

**⏸️ 暂停等确认。确认后阶段5-12一口气完成。**

---

## 创作层（阶段5-8，用Opus）

### 阶段5：英文撰写（v10 升级：含平台差异化写法）

按阶段4的蓝图写作。**不是自由发挥，是精确执行蓝图。**

**🔥 v10 新增：平台差异化写法**（按阶段 4 选定的目标平台调整）：

| 目标平台 | 主要引用源（数据） | 写法侧重 |
|---|---|---|
| **Google AI Overviews** | Top-10 排名页 92% | 传统 SEO + 段落优化（继续传统 SEO 强项） |
| **ChatGPT 网页搜索** | Wikipedia 47.9% / Reddit 11.3% | 含"X is..."定义句 + 引用 Wikipedia/权威研究 + 作者实体 sameAs 必备 |
| **Perplexity** | Reddit 46.7% / Wikipedia | 加 "discussion-style" 段落（"some experts argue..." / 多视角对比）+ 论坛风格问题 |
| **Bing Copilot** | Bing 索引 + 权威站 | Bing SEO 优化 + IndexNow 推送（已自动） |

**实操**：
- 阶段 4 选了 ChatGPT → 文章首段必含明确定义 + 加引用一篇 Wikipedia 风格的来源
- 阶段 4 选了 Perplexity → 加 "Common debate / Industry views" 类段落 + Reddit 风格 Q&A
- 阶段 4 选了 AIO → 走传统 SEO 满分路径即可（我们 12 阶段本身就是）
- 阶段 4 选了"全平台" → 三种风格段落各写 1-2 段

```
写作标准：

1. 答案胶囊
   → 文章第一段 = 阶段4设计的答案胶囊
   → 40-60词直接回答核心问题
   → 加粗标记（<strong>）让AI更容易抓取

2. 每个H2的首句 = 该节的答案
   → 先给结论，再展开论述
   → 如 H2 "Batch vs. Continuous Pre-Expanders"
   → 首句："Batch pre-expanders offer ±0.5 kg/m³ density control for precision applications; continuous pre-expanders deliver 30-50% higher throughput for high-volume production."

3. 数据密度标准
   → 每150-200词至少1个具体数据点
   → 数据类型：数字/百分比/价格范围/时间周期/对比数值
   → 所有数据标注来源

4. 段落控制
   → 每段≤120词（AI搜索更容易提取短段落）
   → 每段聚焦一个观点

5. 独家数据
   → 至少包含2-3个只有设备制造商才知道的数据
   → 如：实际能耗数据、真实交付周期、典型故障率
   → 竞品（贸易商/博主）写不出这些 = E-E-A-T差异化

6. 表格使用
   → 对比类内容必须用HTML表格
   → 规格类内容必须用表格
   → 表格≥2个（这是竞品超越的关键）

7. 禁止事项
   → 禁止空洞自夸（"world-class" "leading" 无数据支撑）
   → 禁止催促语气（"Buy now" "Don't miss"）
   → 禁止模糊数据（"大量" "显著" 改为具体数字）
   → 禁止AI味道（"In today's rapidly evolving..." "It's worth noting that..."）
```

---

### 阶段6：SEO植入（v10 升级：图片 SEO 全套 + Person Schema sameAs 强制）

写作完成后，逐项检查并植入SEO元素。

**🔥 v10 新增图片 SEO 全套**（影响 LCP/CLS Core Web Vitals 和 Google Image Search）：

```html
<picture>
  <source srcset="/blog/cover.avif" type="image/avif">
  <source srcset="/blog/cover.webp" type="image/webp">
  <img
    src="/blog/cover.jpg"
    alt="EPS block molding machine PE-1400 with technical specs"
    width="1200"
    height="630"
    loading="lazy"
    decoding="async"
    fetchpriority="auto">
</picture>
```

**强制 5 项**：
- ✅ `width` + `height` 显式（防 CLS 布局位移）
- ✅ `loading="lazy"`（首屏图除外，首屏用 `fetchpriority="high"`）
- ✅ `srcset` 多分辨率（移动 / desktop / retina）
- ✅ AVIF 优先 + WebP 兼容 + JPG 兜底（picture 标签）
- ✅ alt 含主关键词且描述性（不只是关键词堆砌）

**🔥 v10 新增 Person Schema sameAs 强制**（GEO 时代关键，AI 借此识别作者实体）：

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "author": {
    "@type": "Person",
    "name": "[作者真名]",
    "url": "https://[域名]/en/team/[作者slug]/",
    "jobTitle": "[职位]",
    "worksFor": { "@type": "Organization", "name": "[公司名]" },
    "sameAs": [
      "https://www.linkedin.com/in/[作者]/",
      "https://twitter.com/[作者]",
      "https://www.crunchbase.com/person/[作者]"
    ]
  },
  ...
}
```

`sameAs` 至少含 LinkedIn（B2B 必备）。如有 Wikipedia/Wikidata 必加（强信号）。
**作者必须是真人**（不能用 AI 笔名 / "Editorial Team"）— Google 2024 起惩罚假作者。

```
检查清单：

☐ 主关键词出现位置：
  - Title ✅
  - 首段100词内 ✅
  - 至少1个H2中 ✅
  - 结尾段 ✅
  - URL slug ✅
  - Meta Description ✅
  - 至少1个图片alt ✅

☐ 关键词密度：1-2%（不堆砌）

☐ 支撑关键词分布：每个支撑词在不同H2中出现

☐ LSI语义实体词：检查是否自然出现在正文中

☐ 内链执行：按阶段4的内链计划逐条植入
  - 每条内链锚文本自然融入句子
  - 不使用"click here"
  - 产品页链接使用产品名锚文本
  - 博客互链使用描述性锚文本

☐ 外链执行：按计划植入外部权威引用

☐ 图片alt：所有图片都有含关键词的描述性alt

☐ Schema准备：
  - Article Schema（标题、描述、作者、发布日期）
  - FAQPage Schema（所有FAQ问答对）
  - BreadcrumbList Schema
```

---

### 阶段7：GEO植入

让每段内容都**可被AI搜索引擎直接引用**。

```
逐段检查：

☐ 答案胶囊（首段）
  → 40-60词直接回答
  → 加粗标记
  → 可独立引用（脱离上下文也能理解）

☐ 定义性语句
  → 核心术语有标准定义句
  → 格式："[术语] is [定义], typically used for [用途]"
  → 放在该术语首次出现的位置

☐ 引用就绪语句
  → 每个H2中至少1句可被AI直接引用的事实性语句
  → 特征：包含具体数字+来源标注
  → 如："According to Grand View Research, the global EPS market reached $18.2 billion in 2024."

☐ 来源标注
  → 所有数据标注来源（行业报告名+年份 或 "based on manufacturer data"）
  → 增强可信度

☐ 结论前置
  → 每个H2的首句是该节的结论/答案
  → AI提取信息时优先读首句

☐ 表格化数据
  → 所有对比信息用HTML表格而非纯文字
  → AI特别喜欢引用表格中的结构化数据

☐ 段落长度
  → 所有段落≤120词
  → 超长段落拆分
```

---

### 阶段8：转化植入

内容好但不转化=白写。**每篇文章都是一个销售页面。**

```
3级CTA设计：

Level 1 — 软性CTA（文章前1/3处）
  → 不卖东西，提供价值
  → 如："Need help calculating your production line capacity? [Download our free capacity calculator →]"
  → 目的：建立信任，让读者知道你是制造商不是博主

Level 2 — 价值CTA（文章中间，核心H2之后）
  → 与当前阅读内容直接相关的下一步
  → 如（在讨论设备规格的H2之后）："Want to compare these specs against your production requirements? [Request a customized equipment recommendation →]"
  → 目的：抓住已深度阅读、正在考虑的读者

Level 3 — 强引导CTA（文章结尾，FAQ之前）
  → 明确的行动号召
  → 如："Ready to discuss your EPS production line? Our engineers respond within 48 hours with a customized proposal. [Get Your Free Quote →]"
  → 附加信任信号：CE certified / 30+ countries / 5-year warranty

内联CTA（可选，在长文章中）：
  → 在>3000词文章的中间位置
  → 用不同颜色/样式的内联卡片
  → 关联到相关产品页

社会证明植入：
  → 自然融入正文（非刻意插入）
  → 如："...as we've implemented in production lines across 30+ countries..."
  → 如："Our PE-1400, CE certified and installed in over 200 factories worldwide, offers..."
```

---

## 质控层（阶段9，用Opus）

### 阶段9：三维评分（100分制）

**必须≥75分才能进入翻译阶段。<75分回到阶段5重写。**

```
SEO维度（35分，v10 砍 5 分给 GEO+多模态）
├── 主关键词布局完整（Title+首段+H2+结尾+URL+Meta）  8分
├── 支撑关键词覆盖（3-5个词分布在不同H2）            4分
├── LSI语义实体词（5+个自然出现）                     4分
├── 内链（≥3条产品页+≥2条博客互链）                   4分
├── 外链引用（≥2个权威来源）                          2分
├── Title（≤60字符+含关键词+吸引点击）                 3分
├── Meta Description（≤155字符+含CTA）                3分
├── 🆕 图片 SEO 全套（width/height/loading/srcset/AVIF）  4分
└── Schema（Article+FAQ+Breadcrumb 准备就绪）          3分

GEO维度（40分，v10 加 5 分含多模态+作者实体）
├── 答案胶囊（40-60词加粗首段直接回答）               6分
├── 引用就绪语句（每个H2至少1句可被AI引用）           5分
├── 定义性语句（核心术语有标准定义）                   4分
├── 数据密度（每150-200词1个数据点+有来源标注）       4分
├── 表格（≥2个HTML表格呈现数据）                      3分
├── FAQ（≥5个问题+覆盖长尾词+有Schema）               3分
├── 段落控制（全部≤120词）                             2分
├── 🆕 多模态（≥1 视频/信息图/互动元素，156% 引用率提升）  5分
├── 🆕 Person Schema sameAs（作者 LinkedIn 必备，GEO 关键）  4分
├── 🆕 平台差异化写法（按目标平台 ChatGPT/Perplexity/AIO 调整）  2分
└── 🆕 Topic Cluster 归属（挂在 pillar page 下，不孤立）  2分

转化维度（25分）
├── 3级CTA完整（软+价值+强）                          10分
├── CTA文案质量（具体价值而非"联系我们"）               5分
├── 产品页链接（内容自然链到相关产品）                  4分
├── 社会证明（自然融入认证/客户数/出口国信息）          3分
└── 无废话/无催促/无空洞自夸                           3分

评分判定（v10：80 是新天花板线）：
  90-100 → ✅ 顶级，直接进入翻译
  80-89  → ⚠️ 合格，修改扣分项后进入翻译
  75-79  → ⚠️ 偏低，强烈建议改 v10 缺口（多模态/Person sameAs）后进入
  <75    → ❌ 回到阶段5重写
```

---

## 翻译层（阶段10，用Sonnet）

### 阶段10：多语言翻译

**这是模型分层的关键：翻译用Sonnet，省60-70% token。**

```
执行方式：
→ Agent(model="sonnet") 执行翻译任务

翻译提示词模板：
---
你是一个专业的B2B工业设备翻译专家。

将以下英文博客文章翻译为[目标语言]。要求：
1. 保持所有HTML标签结构不变
2. 保持所有内链URL不变（只翻译锚文本，链接改为对应语言前缀 /en/ → /es/ 或 /pt/）
3. 专业术语参考以下术语表：
   - EPS = EPS（不翻译，国际通用缩写）
   - Pre-expander = [目标语言对应术语]
   - Block molding machine = [目标语言对应术语]
   [术语表从客户配置中读取]
4. 语气保持专业但友好，适合B2B工厂主阅读
5. 数字、单位、货币符号保持原样
6. CTA按钮文案要本地化，不要直译

原文：
[英文HTML正文]
---

翻译后检查：
☐ HTML标签完整未破损
☐ 内链URL语言前缀正确
☐ 专业术语一致
☐ 无漏翻段落
☐ 数字/单位未被改动
☐ CTA文案已本地化
```

### 各语言独立关键词检查

```
翻译完成后（仍由Sonnet执行）：
→ 检查目标语言的主关键词在Title和首段中是否出现
→ 如 "EPS block molding machine" 的西语版应该包含 "máquina de moldeo de bloques EPS"
→ Meta Description也要翻译并检查关键词
```

---

## 发布层（阶段11-12，用Opus）

### 阶段11：发布部署（v10 升级：含 AI 爬虫 robots.txt 检查）

**🔥 v10 新增 Step 0：AI 爬虫 robots.txt 检查**（发布前必跑）

调 fetch MCP 抓 `<域名>/robots.txt`，确保以下 4 大 AI 爬虫**未被屏蔽**：

```
User-agent: GPTBot          # OpenAI ChatGPT 网页搜索
Allow: /

User-agent: OAI-SearchBot   # OpenAI 搜索功能
Allow: /

User-agent: ClaudeBot        # Anthropic Claude
Allow: /

User-agent: PerplexityBot   # Perplexity AI 搜索
Allow: /
```

如发现 `Disallow: /` 或 `User-agent: *` 屏蔽 → **当场修复 robots.txt + 部署**，否则文章再好 AI 也抓不到。

**可选**（看客户偏好）：
- `CCBot`（Common Crawl 训练数据）— 想贡献训练数据放行，否则 Disallow
- `anthropic-ai`（Claude 训练）— 同上
- `Bytespider`（字节）— 国内市场放行

```
Step 1: 写入代码
        → blog-posts.ts 中添加新的 article body（英文+各语言翻译版）
        → 处理HTML转义（法语撇号 ' → &#39; 等）
        → 设置正确的发布日期、tags、relatedProducts

Step 2: 构建验证
        → npm run build
        → 确认：
          - 新页面生成（en/es/pt 三语博客页均存在）
          - 无构建报错
          - sitemap包含新URL

Step 3: 部署
        → sshpass+rsync 或 deployer.deploy(client_id)
        → 部署完成后 fetch 验证线上可访问

Step 4: Schema验证
        → fetch(新文章URL, raw=true) → 检查Article Schema + FAQ Schema存在
```

### 阶段12：发布后追踪

**发了不是结束，要追踪效果。**

```
发布当天：
  → 在GSC中请求编入索引（提醒客户操作，或通过API自动提交）
  → 🔥 v10 强制：更新 llms.txt 添加新文章（不只是"提一下"）
     格式：在 llms.txt 的 `## Recent Articles` 节追加 `- [文章标题](URL): 一句话描述`
     如果客户站还没 llms.txt → 立刻建一份（参考 seo-geo skill 模板）
  → 🔥 v10 强制：IndexNow 推送（已自动）+ Bing Webmaster URL Submission API（如已配）
  → content-tracker.update_content → 标记published

发布后24小时：
  → fetch(新文章URL) 确认线上正常

发布后3天：
  → 检查Google是否已索引（在Google搜索 site:域名/blog/新slug）

发布后7天：
  → 反向内链注入：
    - 找到2-3篇相关的老文章
    - 在老文章中自然位置添加指向新文章的内链
    - 构建+部署
  → 检查GSC是否有该文章的展示数据

发布后14天：
  → rank-tracking 追踪目标关键词排名
  → 如已有排名 → 记录基线
  → 如无排名 → 检查索引状态，排查原因

发布后30天：
  → 效果回验：
    - 排名位置（vs 发布时）
    - 点击量和展示量
    - 该页面是否带来询盘（GA4 source_page追踪）
  → 结果记录到 content-tracker
  → 如效果不理想 → 纳入 content-refresh 优化队列
```

---

## 内容深度标准

| 类型 | 字数 | 表格 | FAQ | 数据点 | 用途 |
|------|------|------|-----|--------|------|
| 支柱页面 | 5000-8000词 | ≥4 | ≥7 | ≥30 | 覆盖主题所有意图 |
| 对比/选购指南 | 2500-3500词 | ≥3 | ≥5 | ≥15 | 覆盖考虑阶段买家 |
| 技术/应用指南 | 2000-2500词 | ≥2 | ≥5 | ≥12 | 覆盖特定场景 |
| FAQ/解答类 | 1500-2000词 | ≥1 | ≥7 | ≥8 | 覆盖长尾搜索 |

---

## 内容质量底线（不可违反）

1. **答案胶囊**：每篇文章首段必须40-60词直接回答核心问题
2. **数据密度**：每150-200词至少1个有来源的数据点
3. **表格**：≥2个HTML表格
4. **FAQ**：≥5个问题+Schema标记
5. **内链**：≥3条产品页+≥2条博客互链
6. **3级CTA**：软+价值+强三个层级
7. **评分≥80**：低于80分必须重写（v10.6 升级，原 75 → 80）
8. **无AI废话**：禁止"In today's..."、"It's worth noting..."、"In conclusion..."

---

## v10.6 强制门禁清单（2026-05-07 立 — 跨 4 客户质量审计驱动）

> **背景**：2026-05-07 跨 4 客户审计 16 sample（reports/quality-audit-2026-05-07/）发现 6 个智能体能力缺口（详见 [案例库/通用教训/2026-05-07-质量审计教训-HCU-SpamBrain.md](../../案例库/通用教训/2026-05-07-质量审计教训-HCU-SpamBrain.md)）。本区块是 12 阶段之上的硬门禁，**任一项失败 = 阻断发布**。

### 门禁 #1：E-E-A-T 强制（覆盖缺口 #1）

**阶段 4（架构设计）必填字段**：
- `author`：真人姓名（**禁止** "Organization" / "Editorial Team" / "Demo-B Technical Team" 等集体名）
- `authorUrl`：LinkedIn 个人页 URL（**必填**，不是 LinkedIn 公司页，必须是个人页 URL 含 `/in/` 路径）
- `authorTitle`：作者职位（如 "Sr. Application Engineer at Demo-C EPS"）
- `authorBio`：1-2 句作者背景（如 "10 年 EPS 设备应用经验，参与过 200+ 客户产线规划"）

**阶段 6（SEO 植入）必生成 Person Schema**（在 Article Schema 的 `author` 字段嵌入）：

```json
"author": {
  "@type": "Person",
  "name": "{真名}",
  "url": "{LinkedIn URL}",
  "sameAs": ["{LinkedIn URL}", "{其他真实社交账号}"],
  "jobTitle": "{职位}",
  "worksFor": {"@type": "Organization", "name": "{公司}"},
  "description": "{authorBio}"
}
```

**阶段 9 评分自动检查**：
- grep frontmatter 是否含 `author` 真名 + `authorUrl` LinkedIn → 缺失 = 评分 -20 分
- grep Article Schema author 是 `"@type": "Person"` 且含 sameAs → 缺失 = 评分 -15 分
- 合计扣 35 分 → 评分必然 <80 → 阻断发布

**新客户接入时**（接入客户技能必扩）：运营人员必须提供至少 1 个真名作者 + LinkedIn URL，否则该客户站不允许进入博客生产阶段。

---

### 门禁 #2：权威外链强制 ≥ 2（覆盖缺口 #2）

**阶段 4（架构设计）必含**：
- 外链规划清单：本篇博客打算引用哪 2-3 个真权威源（含具体 URL）
- 不允许"专家认为 / 行业报告显示"无具体来源的模糊归因

**阶段 5（撰写）执行规则**：
- 正文必含 ≥ 2 个真外链超链接（不是裸文字提及）
- 行业典型权威源白名单（按行业匹配）：
  - 听力防护：osha.gov / cdc.gov/niosh / nih.gov / iso.org（EN 352 系列） / hse.gov.uk
  - 化工/胶粘剂：epa.gov / echa.europa.eu（REACH） / iso.org（EN 204 等） / astm.org / ihs.com
  - 包装/EPS：cen.eu / eumeps.org / epro-plasticsrecycling.org / eu-recycling.com
  - 冷链：fda.gov / fao.org / iiar.org / astm.org / cdc.gov
  - 通用学术：scholar.google.com 引文 / sciencedirect.com / nature.com

**阶段 9 评分自动检查**：
- grep 正文 `\[.*\]\(https?://([^)]*\.)?(osha|niosh|cdc|nih|epa|echa|fda|cen|eumeps|epro|astm|iso|hse|fao|iiar|sciencedirect|nature)\.` → 命中数 ≥ 2 = 通过 / < 2 = 评分 -15 分
- 合计 < 2 真权威外链 → 阻断发布

---

### 门禁 #3：boilerplate Schema 反复用（覆盖缺口 #3）

**阶段 11（发布部署）必跑 build-qa.sh #19**：
- 同站 ≥ 5 个产品页 / 方案页 FAQPage Schema 文本相似度 > 80% → fail
- GEO capsule 字符串相似度 > 70% → fail
- 任何 fail = 阻断 deploy

**阶段 4（架构）注意**：
- 多 SKU 不允许共享同一 FAQPage Schema（每 SKU 独立 FAQ）
- 多产品页不允许同一 GEO capsule 模板字符串（每页独立改写）

> 详见 [astro-b2b-starter/scripts/build-qa.sh](../../../../建站/astro-b2b-starter/scripts/build-qa.sh) #17-#22 项

---

### 门禁 #4：build-time 资源完整性（覆盖缺口 #4）

**阶段 11（发布部署）必跑**：

```bash
# 检查 1：博客封面图必须存在
for blog in src/content/blog/en/*.md; do
  cover=$(grep -E '^cover:|^image:|^heroImage:' "$blog" | head -1 | sed 's/.*: *//;s/^"//;s/"$//')
  if [ -n "$cover" ] && [ ! -f "public${cover}" ] && [ ! -f "public/${cover#/}" ]; then
    echo "🔴 BROKEN: $blog cover → $cover"
    exit 1
  fi
done

# 检查 2：6 语种博客 body ≥ 500 字符（不只 frontmatter）
for lang in es fr ar ru zh; do
  for blog in src/content/blog/$lang/*.md 2>/dev/null; do
    body_size=$(awk '/^---$/{i++; next} i==2{print}' "$blog" | wc -c)
    if [ "$body_size" -lt 500 ]; then
      echo "🔴 EMPTY BODY: $blog ($body_size chars)"
      exit 1
    fi
  done
done
```

**任何 fail = 阻断 deploy**。已落地：astro-b2b-starter/scripts/qa-no-broken-image.sh（v10.6 新增）。

---

### 门禁 #5：同结构博客 14 天冷却（覆盖缺口 #5）

**阶段 1（搜索意图）/ 阶段 4（架构）必查**：

```bash
# 查最近 14 天本站发布的博客 template-type
recent=$(find src/content/blog/en -name "*.md" -mtime -14 -newer "$(date -d '14 days ago' +%Y%m%d)" 2>/dev/null)
# 按 frontmatter 的 templateType 字段分组
# 如果当前要写的 templateType 在最近 14 天已出现 ≥ 1 次 → 强制差异化
```

**博客 frontmatter 必填字段**：
- `templateType`：`X-vs-Y` / `pillar` / `how-to` / `listicle` / `case-study` / `industry-news` 之一

**冷却规则**：同 templateType 最近 14 天 ≤ 1 篇。超出时**强制差异化**：
- 角色化重构（生产工程师 / 合规官 / 承包商 3 视角任选 1，与上篇不同）
- 章节顺序打乱（不能是同样的"What is X / What is Y / 头对头表 / When X / When Y / Cost / Further reading"）
- FAQ 数量不同（如上篇 5 问，本篇 7-8 问）
- 表格列不同（上篇按价格对比，本篇按性能对比）

**违反检测**：阶段 9 评分自动 -10 分（同模板 burst 同质化 = SpamBrain 信号）。

---

### 门禁 #6：B2B 节奏阈值（覆盖缺口 #6）

**weekly-blog-trigger.mjs 自动检查**：
- 单站 ≤ 3 篇/周（含翻译多语种合并算 1 篇）
- 单站 ≤ 8 篇/月
- 超出 → trigger 自动 skip + 推 P0 警示「{客户}本周已发 N 篇 ≥ 阈值，跳过本周博客生产」

**B2B 制造商可信节奏（外部审计基准）**：
- 小型工厂（10-30 人）：每周 1-2 篇深度博客最可信
- 中型企业（50-200 人）：每周 2-3 篇可信
- > 3 篇/周 = SpamBrain 模式识别签名（2026-05-07 Demo-D 11 天 90 篇案例 = 反例）

> 详见 [scripts/weekly-blog-trigger.mjs](../../scripts/weekly-blog-trigger.mjs) v10.6 升级

---

### v10.6 评分自动检查整合

**阶段 9（三维评分）从 100 分制升级为含 6 个门禁项的 110 分制**（其中 10 分是门禁项扣分上限）：

| 门禁项 | 满分扣减规则 |
|---|---|
| #1 E-E-A-T | author 非真人 -10 / Person Schema 缺 sameAs -10 |
| #2 权威外链 | < 2 个真外链 -15 |
| #5 同结构冷却 | 14 天内同 templateType 未差异化 -10 |
| 合计扣减上限 | -45 分 |

**生效阈值**：评分 < 80 = 阻断发布。门禁 #1+#2+#5 三项全失 = -35 分 = 数学上不可能 ≥ 80。这是设计意图：**强制智能体在阶段 4 就把这 3 项做完**。

---

## 模型分层成本对比

以一篇3000词英文+西语+葡语博客为例：

| 阶段 | 模型 | 估算token | 不分层成本 | 分层后成本 |
|------|------|----------|-----------|-----------|
| 1-9（调研+创作+评分） | Opus | ~15K | $0.30 | $0.30 |
| 10（翻译×2语言） | Sonnet | ~20K | ~~$0.40~~ | $0.06 |
| 11-12（发布+追踪） | Opus | ~3K | $0.06 | $0.06 |
| **合计** | | | **~$0.76** | **~$0.42** |

**节省约45%。** 如果翻译用Haiku可省更多，但Sonnet翻译质量更有保障。

---

## 执行规则（不可违反）

1. 阶段1-4输出后必须等确认，不可自行跳入写作
2. 确认后阶段5-12一口气完成
3. 阶段5-8在同一个上下文中完成（保持内容连贯性）
4. 阶段9评分<75必须重写，不降低标准
5. 阶段10翻译必须用Sonnet `Agent(model="sonnet")`，不用Opus浪费
6. 阶段12发布后追踪不可跳过——7天内必须注入反向内链
7. 不重复覆盖已发布文章的关键词（检查content-tracker）
8. 数据必须真实，行业数据标注来源
9. 发布后必须更新content-tracker和llms.txt

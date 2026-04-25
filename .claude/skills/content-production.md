---
name: content-production
description: 天花板级内容生产 — 12阶段全流程（SERP拆解→关键词矩阵→架构→创作→SEO→GEO→CRO→评分→翻译→发布→追踪），模型分层省token
---

# 内容生产技能（天花板版）

> 触发指令：`[客户名] 写博客：[主题]` / `[客户名] 选题确认，开始执行`  
> 人工确认：⏸️ 阶段4架构设计确认后，阶段5-12自动完成  
> 模型分层：阶段1-9 + 11-12用**Opus**，阶段10翻译用**Sonnet**

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

### 阶段4：架构设计 ⏸️ 需确认

这是**文章的蓝图**，确认后才开始写。

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

### 阶段5：英文撰写

按阶段4的蓝图写作。**不是自由发挥，是精确执行蓝图。**

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

### 阶段6：SEO植入

写作完成后，逐项检查并植入SEO元素。

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
SEO维度（40分）
├── 主关键词布局完整（Title+首段+H2+结尾+URL+Meta）  10分
├── 支撑关键词覆盖（3-5个词分布在不同H2）            5分
├── LSI语义实体词（5+个自然出现）                     5分
├── 内链（≥3条产品页+≥2条博客互链）                   5分
├── 外链引用（≥2个权威来源）                          3分
├── Title（≤60字符+含关键词+吸引点击）                 4分
├── Meta Description（≤155字符+含CTA）                3分
├── 图片alt（所有图片有描述性alt）                     3分
└── Schema（Article+FAQ+Breadcrumb准备就绪）           2分

GEO维度（35分）
├── 答案胶囊（40-60词加粗首段直接回答）               8分
├── 引用就绪语句（每个H2至少1句可被AI引用）           7分
├── 定义性语句（核心术语有标准定义）                   5分
├── 数据密度（每150-200词1个数据点+有来源标注）       5分
├── 表格（≥2个HTML表格呈现数据）                      4分
├── FAQ（≥5个问题+覆盖长尾词+有Schema）               4分
└── 段落控制（全部≤120词）                             2分

转化维度（25分）
├── 3级CTA完整（软+价值+强）                          10分
├── CTA文案质量（具体价值而非"联系我们"）               5分
├── 产品页链接（内容自然链到相关产品）                  4分
├── 社会证明（自然融入认证/客户数/出口国信息）          3分
└── 无废话/无催促/无空洞自夸                           3分

评分判定：
  90-100 → ✅ 直接进入翻译
  75-89  → ⚠️ 修改扣分项后进入翻译
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

### 阶段11：发布部署

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
  → 更新 llms.txt 添加新文章
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
7. **评分≥75**：低于75分必须重写
8. **无AI废话**：禁止"In today's..."、"It's worth noting..."、"In conclusion..."

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

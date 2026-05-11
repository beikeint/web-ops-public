---
name: blog-to-youtube
description: 博客 → YouTube 视频转化工作流。每篇高价值博客自动生成视频脚本+封面+上传 YouTube，覆盖全球第二大搜索引擎。配套 video-generator MCP blog_to_video_script 工具。
---

# Blog → YouTube 视频工作流 v1.0

> **建立时间**：2026-04-27（v10.1 第二批）
> **背景**：YouTube 是全球第二大搜索引擎（仅次于 Google），客户站 0 视频 = 错过 30%+ 流量入口
> **核心目标**：每篇高价值博客自动转视频版，10x 流量入口扩展

---

## 触发条件

✅ **应跑**：
- 博客字数 ≥ 2000 词（值得转视频）
- 博客评分 ≥ 80（v10 内容生产线门槛）
- 主题是 how-to / 对比 / 教程 / 案例（视频形式有价值）
- 视频在 GSC 数据显示有需求（"keyword + video" 搜索量 ≥ 100/月）

❌ **不跑**：
- 短文（<1500 词，撑不起 5 分钟视频）
- 纯产品规格页（视频价值低）
- 太抽象 / 概念性主题（视频化困难）

---

## 5 阶段工作流

### 阶段 1：博客 → 视频脚本（用 video-generator MCP `blog_to_video_script` 工具）

**输入**：博客 markdown
**输出**：3-7 分钟视频脚本（口播稿 + 画面提示）

**脚本结构**（针对 B2B 工业类客户）：
```
00:00-00:15  Hook（钩子）
  "Did you know that 73% of EPS factory owners overspend on..."
  画面：工厂场景 + 数据图

00:15-00:45  Problem（问题）
  "Most buyers face 3 critical decisions when..."
  画面：常见误区图示

00:45-03:30  Solution（解决方案，对应博客主体）
  覆盖博客 Top 3 H2
  画面：产品演示 / 数据对比 / 案例图

03:30-04:30  Proof（证据）
  客户案例 + 数字 + 资质
  画面：工厂照 / 证书图 / 客户 logo 墙

04:30-05:00  CTA（行动号召）
  "Visit [客户站] for the full guide"
  画面：网站截图 + WhatsApp/Email 联系方式
```

### 阶段 2：视频画面准备

**3 种生产方式**（按成本排序）：

| 方式 | 工具 | 成本 | 质量 |
|---|---|---|---|
| **AI 生成视频**（Kling/Dreamina/Runway） | video-generator MCP 已有 | 0-$50/视频 | ⭐⭐⭐ 适合科普 |
| **客户素材剪辑** | 客户提供工厂/产品视频 + DaVinci Resolve | 0（客户提供） | ⭐⭐⭐⭐⭐ 真实感最强 |
| **画面叠图 + 配音** | Canva / Capcut + AI 配音 | 0-$10/视频 | ⭐⭐⭐⭐ 最快 |

**B2B 推荐**：第 3 种（画面叠图 + 配音）— 成本低 + 内容密度高 + 客户可直接复用 PPT/产品图

### 阶段 3：YouTube SEO 优化（关键）

#### Title（≤ 60 字符）

**模板**：`[主关键词] : [Hook 数字/承诺] | [品牌]`

例：`PVA Glue vs Epoxy: 5 Critical Differences for Fire Doors | DesaiInd`

#### Description（≤ 5000 字符）

```
[60 字 hook 段，含主关键词 + 视频核心收益]

🎬 What's Inside:
- [00:15] [Section 1]
- [00:45] [Section 2]
- [03:30] [Section 3]
- [04:30] [CTA / Resources]

📚 Read the Full Guide:
[博客 URL] (with all the data tables and case studies)

📦 Products Featured:
- [产品 1]: [URL]
- [产品 2]: [URL]

🔬 Specs & Technical Resources:
- Datasheet PDF: [URL]
- Case Study: [URL]
- Free Quote: [WhatsApp / Email]

🌍 We Serve:
[市场国家列表]

#关键词1 #关键词2 #关键词3 [行业 hashtag]

About [客户公司]:
[2 行公司介绍 + 出口国 + 资质]

Subscribe for more [行业] insights: [频道 URL]
```

#### Tags（≤ 500 字符）

- 主关键词
- 长尾词 5-10 个
- 行业通用词（如 "industrial chemicals" / "B2B manufacturing"）
- 品牌名 + 产品名
- 相关搜索建议

#### Thumbnail（缩略图）

**B2B 缩略图 4 大要素**：
1. 产品 / 设备清晰图（占 40%）
2. 大字（标题精简版，3-5 词）
3. 钩子数字（"73%" / "$10K" / "5x"）
4. 品牌 logo（右下角）

工具：image-generator MCP `generate_cover` 加 YouTube 16:9 模板

### 阶段 4：上传 YouTube

#### 自动化（推荐）：YouTube Data API v3

```
1. 客户 Google 账号申请 YouTube Data API v3 凭证
2. OAuth 2.0 授权
3. video-generator MCP 加 `youtube_upload` 工具
4. 自动上传 + 设置 SEO 字段
```

#### 手动（首批）

- YouTube Studio → Upload → 填 Title/Desc/Tags
- 设置 visibility = Unlisted（先内部 review）
- review 通过后切 Public

### 阶段 5：发布后追踪

#### Day 0
- 在博客文末加 "Watch this guide on YouTube" 嵌入视频
- 在 LinkedIn / Twitter 分享
- 给现有 Email subscribers 推

#### Day 7
- YouTube Analytics 拉数据：watch time / impression / CTR / retention
- impressionCTR < 4% → 改 Thumbnail
- retention < 40% → 下次脚本调整（前 30s 钩子加强）

#### Day 30
- watch time ≥ 100 hours / 月 → 视频健康
- 拉到 ≥ 1 个 organic search 引流（YouTube → 客户站）→ 成功
- 进 content-tracker 标记为 "video-published"

---

## 节奏目标

| 客户类型 | 视频数/月 | 备注 |
|---|---|---|
| B2B 工业 | 2-4 个 | 每月挑 Top 2-4 篇高价值博客转视频 |
| 跨境 B2C | 4-8 个 | 频率更高，TikTok 系内容并行做 |
| SaaS | 8-16 个 | 教程 + Demo 视频高频 |

---

## 数据指标

- YouTube 频道 → 客户站 referral session：≥ 5/视频/月（30 天后）
- 视频 organic search 排名：≥ 1 个核心词 top 20（90 天后）
- YouTube 订阅数：≥ 50（180 天后第一波积累）

---

## 工具栈

| 用途 | 工具 |
|---|---|
| 脚本生成 | video-generator MCP `blog_to_video_script` 工具（v10.1 新增） |
| AI 视频生成 | Kling 国际 / Dreamina / Runway（video-generator 现有 4 后端） |
| 缩略图 | image-generator MCP `generate_cover` |
| 上传 | YouTube Data API v3 + video-generator MCP `youtube_upload`（v10.1 待实现） |
| Analytics | YouTube Studio + GA4 cross-domain tracking |

---

## 跨客户复用

每个成功视频自动进 [模式库/成功模式/](../../模式库/成功模式/)：
- 标题模板
- Hook 类型
- Thumbnail 设计
- 视频长度 vs retention 曲线

让第 100 个视频享受前 99 个视频的全部经验。

---

## 客户配合需求

- ✅ 客户提供：YouTube 频道 + 频道认证（如有 / Google Search Console 同账号）
- ✅ 客户提供（推荐）：工厂参观视频 / 产品演示视频原片（提升真实感）
- ✅ 客户审核：视频发布前 review（避免说错品牌话术）

---

## v10.1 落地清单

### 已完成
- [x] 本 skill 文件
- [x] hermes-via-wecom.md（明确 chat-widget 跟 Hermes 分工）

### 第二批后续
- [ ] video-generator MCP 加 `blog_to_video_script` 工具
- [ ] video-generator MCP 加 `youtube_upload` 工具（含 SEO 字段写入）
- [ ] image-generator MCP `generate_cover` 加 YouTube 16:9 thumbnail 模板
- [ ] daily-cron 加每周三"YouTube 节奏检查"分支（如果博客发了 ≥ 2 篇但视频 0 个 → 提醒）

### 第一个客户试点
- [ ] demo-b 选 1 篇 PVA glue 高价值博客 → 转视频
- [ ] 客户审 → 上传 Unlisted → 7 天数据 → 调优 → Public
- [ ] 沉淀进模式库

---

*v10.1 第二批 · 博客 → YouTube 工作流 · 2026-04-27 立 · YouTube 是错过最久的流量入口*

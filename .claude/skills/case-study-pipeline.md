---
name: case-study-pipeline
description: 成交事件 → 案例自动沉淀 → 7 个变现入口（博客/视频/PR/Reddit/LinkedIn/Email/HARO）。把客户案例从"信任信号"升级为"新流量入口"。B2B 最强复利机制，1 个案例 = 7 倍流量入口。
---

# Case Study 自动沉淀 + 7 入口复利 v1.0

> **建立时间**：2026-04-27（v10.1 第六批 · 学习进化）
> **核心洞察**：普通团队把"案例"看成"信任信号"，顶级团队把它看成**新流量入口**
> **复利公式**：1 个客户成交 = 7 个新流量入口 + 持续 6-12 个月被引用

---

## 一、为什么案例是 B2B 最强复利

### 传统做法

成交后：
- 在客户站 /case-studies 页加 1 条 → 看的人少 → 价值 = 1x

### 顶级做法

成交后：
- ① Case Study 详细 PDF → Lead Magnet 换 email
- ② 博客文章 "How [客户] solved X with [产品]"（长文）→ SEO 入口
- ③ YouTube 视频（5 分钟客户访谈或工厂参观）→ 视频 SEO 入口
- ④ LinkedIn post（社媒分享）→ 社媒入口
- ⑤ HARO/Qwoted 答记者问 引用案例数据 → Tier-1 媒体反链
- ⑥ Reddit/Quora 答相关问题 引用案例 → AI 引用入口
- ⑦ Email newsletter 发给现有 contact → 复购触发

**1 个案例 = 7 个新流量入口 × 6-12 个月持续被引用 = 复利 50-100x**

---

## 二、自动化设计

### 触发器：成交事件

```
inquiry 智能体 deal-tracking skill 检测到 deal status = closed_won
       │
       ↓
触发 case-study-pipeline (本 skill)
       │
       ↓
并行启动 7 个变现路径
```

### 7 入口自动化流程

```
                    成交事件 (inquiry deal-tracking)
                           │
       ┌───────────────────┼───────────────────┐
       │                   │                   │
       ↓                   ↓                   ↓
   入口 1             入口 2-3              入口 4-7
   Case Study PDF     博客 + 视频           PR + 社媒 + 邮件
   (Lead Magnet)     (SEO + YouTube)      (HARO + Reddit + Email)
       │                   │                   │
       ↓                   ↓                   ↓
   触发 lead-magnet    触发 content-       触发 digital-pr
   skill 发布           production 12       + community-marketing
                       阶段 + blog-to-       (待第六批) + email
                       youtube 工作流       MCP
       │                   │                   │
       └───────────────────┴───────────────────┘
                           │
                           ↓
                   写入 模式库/成功模式/
                   (跨客户复用)
                           │
                           ↓
                   30 天后 ROI 验证
                   (流量 / 询盘 / 营收 归因)
```

---

## 三、各入口具体实施

### 入口 1: Case Study PDF（Lead Magnet）

**自动化**：

```
1. 拉成交客户数据 (inquiry deal-tracking + client-manager)
2. 调 RAG 拉该客户购买前的对话 + 询盘历史 (产品级 batch 5 设计)
3. 用 Opus 模型基于真实数据写 case study draft (8-12 页)
4. 客户审一遍同意公开 (含数字 / 国家 / 应用)
5. 设计 PDF (Canva 模板 + 客户品牌色)
6. 部署到 /resources/case-studies/[case-slug].pdf
7. 加进 Lead Magnet 库 (lead-magnet-automation skill)
8. Form 收集 email → inquiry email-nurture
```

**模板结构**：

```
Page 1: Cover
- 客户公司 logo (匿名版用化名)
- 标题: "How [Customer] Achieved [Result] with [Our Product]"
- 副标题: 数字钩子 (e.g., "20% Cost Reduction in 6 Months")

Page 2: Customer Background
- 行业 + 国家 + 规模
- 业务挑战 (challenges before)

Page 3-4: The Problem
- 具体痛点 (含数字)
- 用户尝试过的方案 + 失败原因

Page 5-7: Our Solution
- 我们的产品 + 实施过程
- 技术细节 + 配置 + 时间线

Page 8-10: Results
- 具体数字 (产能 / 成本 / 时间 / 质量)
- 对比图表
- 客户引用 (quote)

Page 11: Lessons & Best Practices
- 这个案例适用什么样的客户
- 关键成功要素

Page 12: Next Steps / CTA
- 联系方式
- "Get a similar solution" CTA
```

**钩子**：让买家看了就想问"我们能不能也这样"。

### 入口 2: 博客文章（SEO 入口）

**自动化**：

```
1. 调 content-production skill 12 阶段 v10
2. 主题: "How [Industry] Companies Solve [Problem] · 2026 Case Study"
3. 关键词: 行业关键词 + "case study" / "real example" / "how to"
4. 内容: 基于 PDF 改写但更 SEO 友好 (含 H2 / FAQ / 内链)
5. 自动接入 topic cluster (如属于已有 pillar)
6. 发布 + IndexNow + 反向内链注入
```

**预期效果**：
- 30 天后该博客拿到 10-50 sessions/月
- 90 天后稳定排名 + 持续来流量
- 文中引用案例的关键词带新询盘

### 入口 3: YouTube 视频（视频 SEO 入口）

**自动化**：

```
1. 调 blog-to-youtube skill (v10.1 batch 2)
2. 视频脚本基于 Case Study PDF 转
3. 用 video-generator MCP blog_to_video_script + youtube_seo_pack
4. 5-7 分钟视频:
   - 0-15s: 钩子 (客户成绩数据)
   - 15s-1min: 客户背景 + 痛点
   - 1-4min: 解决方案 + 实施
   - 4-6min: 结果 + 客户访谈片段 (如有)
   - 6-7min: CTA + 我们能怎么帮你
5. 上传 YouTube + SEO 字段
6. 嵌入到博客 (入口 2) 文章里 → 双向流量
```

### 入口 4: LinkedIn Post（社媒入口）

**自动化**：

```
1. 接 social-ops 智能体 (v10.1 batch 2 已计划)
2. 5 个 LinkedIn post 矩阵:
   - Post 1: 案例数字 + Hook ("How XX achieved 20% cost cut")
   - Post 2: 客户引用 (quote with permission)
   - Post 3: 流程拆解 (3-5 关键步骤)
   - Post 4: 行业洞察 (从案例提炼的趋势)
   - Post 5: CTA + 案例 PDF 下载
3. 跨周发布 (一篇/周) → 持续曝光
4. 用 image-generator MCP 出每篇配图
```

### 入口 5: HARO/Qwoted 答记者问（Tier-1 反链）

**自动化**：

```
1. 接 digital-pr skill (v10.1 已有)
2. 案例数据进 HARO 答题素材库
3. 当行业相关 query 来时:
   - 我们用案例数字 + 客户引用回答记者
   - 1 小时内回复 (HBR: +60% 命中率)
4. 被记者引用 → 拿到 Tier-1 媒体反链 (DR 70+)
```

### 入口 6: Reddit/Quora（AI 引用入口）

**自动化**：

```
1. 接 community-marketing skill (待第六批扩展)
2. 监控相关 subreddit / Quora 问题
3. AI 起草专家回答 (引用案例数字, 不硬广)
4. 人工审核后发布
5. 持续 6-12 个月被 AI 搜索引擎引用 (Perplexity 47% 引用 Reddit)
```

### 入口 7: Email Newsletter（复购触发）

**自动化**：

```
1. 接 email MCP (v10.1 待激活)
2. 发给现有 contact list:
   - "Customer Success: How [Customer] Achieved [Result]"
   - 链接到 Case Study PDF + 博客
3. 触发条件:
   - 同行业的 contact: 即时发
   - 不同行业: 月度 newsletter 合集
4. 触发复购:
   - 现有客户看到 + 联想自己也能做 → 加单
```

---

## 四、跨客户模式沉淀

每个完成的 case study 自动写入 [模式库/](../../模式库/)：

```
模式库/成功模式/
├── client-D-demo-b-pva-glue-FR-ES-PT.md         (已有, batch 1)
├── client-XX-<新成交>-<解决方案>.md                 (新增)
└── ...
```

**沉淀字段**：
- 行业 + 应用场景
- 解决的问题 + 数字
- 关键成功要素
- 适用条件 + 不适用条件
- 7 入口 ROI 数据 (验证后填)

→ 让第 100 个客户接入时，我们已有 50+ 成功案例的"行业蓝图"参考。

---

## 五、daily-cron 集成

成交事件不是定时触发的，是**事件驱动**。但 daily-cron 加每日检查：

```javascript
// 每日检查 (在 daily-cron 步骤 8 后加)
9. **v10.1 batch 6 新增 · case-study-pipeline 触发**:
   - 调 inquiry deal-tracking 拿过去 24h status=closed_won 的成交
   - 对每个新成交触发 case-study-pipeline:
     - 入口 1: 自动起草 Case Study PDF (待客户审)
     - 入口 2: 触发 content-production 12 阶段 (排进选题池)
     - 入口 3: 触发 blog-to-youtube 工作流 (排进视频队列)
     - 入口 4-7: 排进 social/PR/community/email 队列
   - 简报"今日新成交"段标绿 + 7 入口启动状态
```

每周三 daily-cron 加跑：

```javascript
// 每周三除了博客节奏检查,加 case study 进度复盘
- 检查每个进行中的 case study (入口 1-7 完成度)
- 哪个入口卡住了 (如客户没审 PDF / 视频脚本待 review) → 推进
- 已发布的入口 → 30 天 ROI 验证
```

---

## 六、ROI 验证（30/90/180 天）

每个 case study 必须验证 ROI：

```
30 天后:
- 入口 1 PDF 下载数 ≥ 20
- 入口 2 博客流量 ≥ 50 sessions
- 入口 3 视频播放 ≥ 100
- 入口 4 LinkedIn 互动 ≥ 50 reactions
- 入口 5-7 视情况

90 天后:
- 累计询盘 (来自该 case study 任意入口) ≥ 5
- 至少 1 个新成交可归因到该 case study

180 天后:
- 累计营收 (归因到该 case study) ≥ 10x case study 制作成本
- 沉淀进 模式库 + 行业蓝图
```

---

## 七、客户配合（关键）

✅ 客户必须同意：
- 公开成绩数字 (产能 / 成本 / 时间 / 质量)
- 公开行业 + 国家 (公司名可化名)
- 提供客户 quote (1-2 句话推荐)
- 配合视频访谈 (5-10 分钟，可在线 Zoom)

✅ 客户审批节点：
- Case Study PDF draft 审 (含数字)
- 博客文章 draft 审 (含案例提及)
- 视频脚本审 + 上传前审
- LinkedIn post 审 (是否点名客户)

✅ 法律：
- 公开前签 case study release form
- 数字脱敏程度由客户决定 (绝对值 / 百分比 / 范围)

---

## 八、第一个客户试点：demo-b

demo-b 4-22 多语种部署 +2360% 已经是天花板成绩。但**还没成交记录**（属于"运营成功"不是"销售成交"）。

第六批后续动作：
- inquiry 智能体跟进 demo-b 当前 12 条询盘
- 第一个 closed_won 出现 → 立刻触发 case-study-pipeline
- 7 入口实战 → 沉淀 ROI 数据

**预计**：5-6 月 demo-b 第一个成交 → 第一个 case-study-pipeline 完整跑通 → 模式库新增 1 条。

---

## 九、效果指标

### 30 天（试点）
- 第一个 case-study-pipeline 跑通
- 至少 4 入口产出（PDF + 博客 + LinkedIn + 1 个其他）

### 90 天
- 3 客户至少各 1 个 case study
- 累计 30+ 入口产出
- 累计询盘归因 ≥ 10

### 180 天
- 跨客户模式沉淀 ≥ 5 条
- ROI 验证通过 (10x+ cost recovery)
- 可作为新客户接入的"我们的成绩"展示

---

## 十、跨技能协作

| 入口 | 触发 skill |
|---|---|
| 1 PDF | lead-magnet-automation |
| 2 博客 | content-production v10 |
| 3 视频 | blog-to-youtube + video-generator MCP |
| 4 LinkedIn | social-ops 智能体 (待协同) |
| 5 HARO | digital-pr |
| 6 Reddit/Quora | community-marketing (第六批待建) |
| 7 Email | inquiry email-nurture + email MCP |

---

## 十一、风险

### 风险 1：客户不配合公开
**应对**：从 onboarding 阶段就跟客户说明"案例化是合作的一部分"

### 风险 2：案例数据被竞品利用
**应对**：行业 / 应用 / 数字脱敏到合适程度（通常用百分比 + 范围）

### 风险 3：自动化质量低被客户拒
**应对**：每入口必须人工审节点 + 客户最终签字

---

*v10.1 第六批 · case-study-pipeline · 2026-04-27 · B2B 最强复利机制*

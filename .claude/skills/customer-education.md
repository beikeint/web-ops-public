---
name: customer-education
description: 客户教育内容生成 — 月报附"为什么排名上升/下降"解释 + 季度战略 PDF + 行业知识科普。让客户从"看不懂数据"升级到"理解 SEO 战略"，提升续约率 + 信任度。
---

# 客户教育 v1.0

> **建立时间**：2026-04-27（v10.1 第六批 · 学习进化）
> **核心问题**：客户看月报只看数字（"展示 4200 / 排名 14"）但**不懂为什么**
> **产品级目标**：每月报 / 季度报附"为什么"解释 + 客户能学到 SEO 知识 → 续约率提升 + 转介绍

---

## 一、3 大教育输出

### 输出 1: 月报附"为什么"段

每月 28 号 monthly-report 升级附"客户教育"段：

```markdown
## 📊 [客户] · 2026-04 月报

### 本月成绩
- GSC 展示: 4200 (vs 3500 上月, ↑ 20%)
- 询盘: 12 条
- 排名: 平均 14.3

### 🎓 为什么这样？(本月教育解释)

**展示量上升 20% 的原因**：
1. 4-22 我们给您的 PVA Glue 系列加了 FR/ES/PT 三语种，4-25 起 Google 开始把这些页面展示给法语、西语、葡语用户。这是"多语种延伸效应"，部署后 3-7 天才生效。
2. 4-20 我们把全站产品页的 Title 模板压缩了（从 38 字符冗余后缀改成 12 字符简洁版），SERP 显示完整后用户更愿意点击。

**排名提升 2.5 位的原因**：
- 内链结构改了 → Google 重新评估页面权重
- 新博客带回反向内链 → 老博客排名一起涨

**询盘 12 条 vs 上月 8 条 (+50%)**：
- 主要来自西语市场（4 条）和俄语市场（2 条）→ 多语种部署带来新市场
- 8 条来自现有英语市场 → 跟上月持平 + 内容升级带来 +1
```

**关键**：
- 解释**因果**（不是"展示涨了，恭喜！"这种废话）
- 用客户**能听懂的语言**（不要"E-E-A-T 信号" / "PageRank weight"）
- 引用**具体动作**（4-22 部署 / 4-20 改 Title）
- 客户能**学到知识**（什么是多语种延伸效应）

### 输出 2: 季度战略 PDF

每季度第一周生成"季度战略 review PDF"给客户：

```
Q1 2026 SEO Strategy Review · [客户]

Page 1: Cover + Executive Summary
- Q1 总成绩 1 句话
- Q2 战略方向 1 句话

Page 2-3: Q1 成绩复盘
- 流量曲线 (Q1 vs Q4)
- 排名分布变化
- 询盘数 + 来源
- 内容产出
- ROI 计算

Page 4-5: 关键洞察 (客户能学到的)
- "为什么 EN 比 FR/ES 贵 5 倍流量?"
- "为什么 PVA Glue 比 EPS 关键词更难做?"
- "为什么 Google 4-15 算法更新让我们短期下降但长期受益?"

Page 6-7: Q2 战略 (前瞻)
- Top 3 优先级
- 投入需求 (内容数量 / 客户配合)
- 预期成果 (流量 / 询盘 / 排名)

Page 8: Q&A 客户常问
- "为什么不能立刻看到排名第 1?"
- "为什么需要内容刷新?"
- "Backlink 重要吗? 我们要花钱买吗?"
- "AI 搜索 (ChatGPT) 影响我们吗?"

Page 9-10: 案例 + 推荐
- 行业内类似规模客户的标杆数据
- 我们对应的进度
- 推荐: "您应该考虑 [...]"
```

### 输出 3: 客户教育 PDF 库（积累）

每客户站建 `/learn/` 路由（可公开或客户内部）：
- "B2B SEO 入门 10 讲"
- "如何看 GSC 数据"
- "AI 搜索时代怎么应对"
- "Lead Magnet 什么是有效的"
- ...

每月新增 1-2 篇 → 客户随时查 + 当 Lead Magnet 用 → 复利。

---

## 二、教育内容来源

### 来源 1: 模式库（B2C 内部沉淀）

模式库的"为什么"自动转客户语言：
- 成功模式 → "我们这样做的原因"
- 失败教训 → "什么不能做 + 为什么"
- 行业蓝图 → "您所在行业的 SEO 全景"

### 来源 2: 实时数据驱动

月度 / 季度 review 时基于实际数据生成解释：
- GSC 数据变化 → 解释根因
- 算法更新影响 → 解释机制
- 竞品动作 → 解释对我们影响

### 来源 3: 行业权威引用

引用：
- Google Search Central（官方）
- Search Engine Journal / Backlinko 等行业媒体
- Ahrefs / Semrush 行业研究
- HBR / SparkToro 数据

→ 增强权威性，让客户感觉"我们不是瞎说，是基于行业共识"。

---

## 三、自动化 SOP

### 月报"为什么"段自动生成

```javascript
// monthly-report skill 升级
async function generateWhySection(client) {
  // 拉本月所有数据变化
  const trafficChange = await getTrafficChange(client, 30);
  const rankingChange = await getRankingChange(client, 30);
  const inquiryChange = await getInquiryChange(client, 30);
  
  // 拉本月执行的所有动作
  const actions = await getActions(client, 30);
  
  // 调 LLM 生成"为什么"
  const prompt = `
    客户 ${client.name} 本月数据变化:
    - 展示: ${trafficChange.impressions}
    - 排名: ${rankingChange.avg_position}
    - 询盘: ${inquiryChange.count}
    
    本月执行动作:
    ${actions.map(a => `- ${a.date}: ${a.description}`).join('\n')}
    
    用客户能听懂的语言（避免技术术语）解释:
    1. 数据变化的因果关系
    2. 哪个动作带来了哪个变化
    3. 客户能学到的 1-2 个 SEO 知识点
    
    风格: 友好但专业, 不夸张, 含具体数字, 过 humanizer-zh.
  `;
  
  return await llm.generate(prompt, { model: 'opus' });
}
```

### 季度战略 PDF 自动生成

```javascript
// 季度首周 cron
async function generateQuarterlyStrategy(client) {
  const quarterData = await getQuarterData(client);
  const nextQuarterPredictions = await predictiveAnalytics.predict(client, 90);
  const industryBenchmarks = await modelLib.getIndustryBenchmark(client.industry);
  const recommendations = await crossClientPatterns.recommend(client);
  
  const pdf = await generatePDF({
    template: 'quarterly-strategy',
    data: { quarterData, predictions, benchmarks, recommendations },
  });
  
  // 客户审 → 发送
  return pdf;
}
```

---

## 四、daily-cron 集成

每月 28 号 monthly-report 升级（已在 v10.1 batch 5 加预测段，再加教育段）：

```javascript
if (dom === 28) {
  weeklyTasks += `

【本日加跑（每月 28 号）· v10.1 batch 1+5+6 · monthly-report 完整版】月报草稿:

回顾段 (monthly-report skill, batch 1):
- ROI 投入产出表 + 排名变化 + 内容产出数 + 询盘数

预测段 (predictive-analytics skill, batch 5):
- GSC 展示 30/90/180 天预测 + 置信度
- 询盘数 / 排名 / ROI / 风险预测

教育段 (customer-education skill, batch 6):
- 本月数据变化的"为什么"解释
- 引用具体动作 (4-22 部署 / 4-20 改 Title)
- 客户能学到的 1-2 个 SEO 知识点
- 引用行业权威研究

最终: 客户版月报 (过 humanizer-zh) → 运营人员审后发`;
}
```

每季度首周（1-7 号）：

```javascript
if ((month === 1 || month === 4 || month === 7 || month === 10) && dom <= 7) {
  weeklyTasks += `

【本周（季度首周）· v10.1 batch 6 · 季度战略 PDF】:
- 每客户生成 Q[X] 战略 review PDF (8-10 页)
- 含: 上季度复盘 + 本季度战略 + 客户教育 Q&A + 案例对标
- 客户审 → 发送`;
}
```

---

## 五、客户教育页面（持续累积）

每客户站建 `/learn/` 路由：

```
客户/<X>/website/src/pages/learn/
├── index.astro                     ← 教育内容总目录
├── b2b-seo-basics-1.astro          ← 入门 10 讲第 1 讲
├── b2b-seo-basics-2.astro          ← ...
├── how-to-read-gsc-data.astro      ← 如何看 GSC 数据
├── ai-search-impact.astro           ← AI 搜索影响
└── [跨客户共享] 大部分内容跨客户复用
```

**节奏**：每月 1-2 篇 → 6 月累计 6-12 篇 → 12 月累计 15-25 篇。

**ROI**：
- 内部用：客户教育，提升续约
- 外部用：作为 Lead Magnet → 换 email
- SEO 用：行业关键词获流（如"how to read GSC data"是高搜索量长尾词）

---

## 六、客户类型分级

不同客户类型不同教育策略：

### 客户老板（Owner）
- 关注：营收 / ROI / 战略
- 适合：季度战略 PDF + 月报 Executive Summary
- 频率：季度

### 客户运营 / 营销经理
- 关注：执行细节 / 工具用法
- 适合：月报"为什么"段 + 教育页面
- 频率：每月

### 客户技术
- 关注：实施细节 / Schema / 性能
- 适合：技术博客 / 内部技术 review
- 频率：按需

→ 月报草稿默认用"客户运营"语言，给老板单独抽 Executive Summary。

---

## 七、效果指标

### 30 天
- 第一份月报含"为什么"段 (demo-b 试点)
- 客户反馈"看懂了" 比例 ≥ 80%

### 90 天
- 3 客户全部月报含教育段
- 第一份季度战略 PDF (Q2 季度首周)
- 客户教育页面累计 ≥ 5 篇

### 180 天
- 累计教育内容 ≥ 15 篇
- 客户续约率（如有续约节点）≥ 95%
- 客户主动转介绍 ≥ 1 个

---

## 八、客户配合

✅ 客户提供：
- 主要决策者类型（老板 / 运营 / 技术）→ 决定教育语言
- 反馈月报"是否看懂" → 持续优化

---

## 九、跨技能协作

| 协作场景 | skill |
|---|---|
| 月报数据回顾 | monthly-report (batch 1) |
| 月报预测段 | predictive-analytics (batch 5) |
| 季度成绩 | quarterly-review (batch 6 升级) |
| 跨客户案例对标 | cross-client-pattern-application |
| 模式库 → 客户语言 | 模式库 + customer-education 转译 |

---

## 十、产品级愿景

客户教育最终目标：

```
普通运营公司: 客户看月报 → "数字涨了, 不知道为啥"
顶级运营公司: 客户看月报 → "学到了, 知道为啥, 信任续约"
              ↓
              客户向同行推荐 → "我们用 [我们] 半年学到很多, 推荐"
              ↓
              客户成功故事 → 转化为 Lead Magnet → 新客户来源
              ↓
              复利循环
```

---

*v10.1 第六批 · 客户教育 · 2026-04-27 · 让数字背后的"为什么"被听见*

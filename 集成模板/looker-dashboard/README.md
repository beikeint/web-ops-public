# Looker Studio Dashboard 模板库

> **作用**：每客户标配 5 个 Looker Studio dashboard，给客户**可视化运营效果**
> **价格**：完全免费（Google 服务）
> **替代品**：Tableau ($70+/月) / PowerBI / Metabase（开源 self-host）→ Looker Studio 是 B2B 中小客户首选

---

## 一、5 个标配 Dashboard

每客户首期建这 5 个：

### 1. SEO Performance Overview
**数据源**：GSC + GA4
**核心指标**：
- Impressions / Clicks / CTR / Avg Position（按 Country/Device/Page/Query 切片）
- 时间维度：7 天 / 30 天 / 90 天 trend
**面向**：客户老板（看大盘）
**频率**：每周一次客户主动看

### 2. Conversion Funnel
**数据源**：GA4
**核心指标**：
- Page View → Engagement → Conversion event 各步流失率
- 按 Landing page / Source / Medium 切片
**面向**：客户运营 + 运营人员
**频率**：每天关注（异常时立即看）

### 3. Content Performance
**数据源**：GA4 + GSC
**核心指标**：
- Top 20 pages by traffic / engagement / conversion
- 红绿灯：traffic ↑ + conversion ↑（绿）/ traffic ↑ conversion ↓（黄）/ 全降（红）
**面向**：内容团队（决定下个月写什么）
**频率**：每月看一次

### 4. Attribution Comparison
**数据源**：GA4 Attribution reports
**核心指标**：
- 4 模型并列对比：Last-click vs First-click vs Linear vs DDA
- 揭示哪个渠道在不同模型下被低估/高估
**面向**：运营人员 + 客户战略
**频率**：每月一次

### 5. ROI Calculator
**数据源**：GA4 + 客户提供的成本数据 + 内部投入工时
**核心指标**：
- 每渠道流量成本 / 每条 lead 成本 / 客户终生价值（LTV）
**面向**：客户老板（看 ROI 决定续约）
**频率**：每季度看

---

## 二、模板复用机制

每客户接入时：
1. **复制模板**（不是从头建）
2. 改数据源连接（指向客户的 GSC + GA4）
3. 改品牌色 + logo
4. 5 分钟搞定 vs 从头建 4 小时

---

## 三、Dashboard 设计规范

### 视觉
- 每个 dashboard 1-2 屏（不要超长滚动）
- 关键指标用大号 score card（KPI tile）
- 时间趋势用折线图（7 天 / 30 天 / 90 天 toggle）
- 渠道对比用横向 bar chart
- 数据表 + 排序

### 交互
- 全局 date range picker（默认过去 30 天）
- 下钻：点 score card → 跳到详细页
- 客户可分享 link（无需 Google 账号）

### 颜色
- 用客户品牌色（不是 Looker 默认蓝）
- 红绿灯：traffic ↑ / ↓ / 平
- 数据高亮：异常用红字 + 图标

---

## 四、首批模板（待真实客户复用）

```
集成模板/looker-dashboard/
├── README.md                          ← 本文件
├── 1-seo-performance-overview/        ← Dashboard 1 模板
│   ├── data-sources.md                ← GSC + GA4 字段说明
│   ├── tile-spec.md                    ← 每 tile 的 spec
│   └── share-link-template.txt        ← 客户分享链接（脱敏）
├── 2-conversion-funnel/
├── 3-content-performance/
├── 4-attribution-comparison/
└── 5-roi-calculator/
```

后续每接 1 个客户验证 1 套，沉淀真实链接 + 经验。

---

## 五、第一个客户（demo-b）部署 SOP

### Step 1: 准备数据源

GA4 → Admin → Property → API access → Authorize Looker Studio
GSC → Settings → Authorize Looker Studio

### Step 2: 复制模板

未来：访问网站运营智能体已建好的模板链接 → "Make a copy"
当前：从头建（首批）

### Step 3: 改数据源指向 demo-b

每个 chart 点 → Data source → Edit → 指向 demo-b GA4 + GSC

### Step 4: 改品牌色

Theme → Custom color palette → 输入 demo-b 品牌色

### Step 5: 测试

预览 → 检查所有 chart 加载正常 → 数据正确

### Step 6: 分享给客户

Share → Get shareable link → 设置"无需 Google 账号"
发邮件给客户："欢迎查看您的运营 dashboard: <link>"

---

## 六、月度更新 SOP

每月 5 号 daily-cron 跑（v10.1 batch 4 配套）：

```
对每客户:
1. 检查 Looker dashboard 是否还能加载（数据源没断）
2. 截图 5 dashboard 关键指标（用 puppeteer 或手工）
3. 写月报文档时引用 dashboard link
4. 客户邮件附 dashboard 截图 + 解读
```

---

## 七、跟其他 skill 协作

| 数据来源 | 哪个 dashboard 用 |
|---|---|
| search-analytics MCP（GSC） | 1, 3, 4 |
| ga4 数据 | 1, 2, 3, 4, 5 |
| attribution-analytics skill | 4 |
| ctr-optimization 数据 | 3 |
| b2b-platform-presence UTM 数据 | 4, 5 |
| inquiry 智能体询盘数据 | 2, 5 |

---

## 八、效果指标

### 30 天
- 5 个 dashboard 全部建成（先 demo-b 试点）
- 客户至少看过 2 次

### 90 天
- 3 客户全部配齐
- 客户每月主动查看 ≥ 1 次

### 180 天
- 客户用 dashboard 数据驱动决策（"哪个产品多投入" / "哪个渠道砍掉"）

---

## 九、客户教育

发给客户的"如何看 Dashboard"说明（中文）：

```
Dashboard 1 SEO Performance:
看：展示 vs 点击趋势，识别"哪些词带来曝光但没点击"
行动：CTR 优化（找运营人员 / web-ops 智能体）

Dashboard 2 Conversion Funnel:
看：访客从 Landing 到 Form 提交各步流失
行动：流失大的步骤需要 CRO 介入

Dashboard 3 Content Performance:
看：哪些博客带流量 + 哪些带询盘
行动：复制成功内容的模式（topic / 格式 / 长度）

Dashboard 4 Attribution:
看：不同归因模型下，哪个渠道贡献最大
行动：把投入倾斜到 ROI 高的渠道（不只看 last-click）

Dashboard 5 ROI Calculator:
看：每条询盘成本 + 客户终生价值
行动：基于 ROI 决定续约 + 加投预算
```

---

*v10.1 第四批 · Looker Studio Dashboard 模板库 · 2026-04-27 · 客户可视化能力*

---
name: ctr-optimization
description: CTR 优化引擎 — 数据驱动识别"高排名低 CTR"机会页，批量重写 Title/Desc 提升点击率。每周一跑，覆盖所有活跃客户站。
---

# CTR 优化引擎 v1.0

> 触发：周一 daily-growth SEO 精细化维度自动调用 / `[客户] CTR 优化`  
> 频率：每周一次（周一跑完扫描 → 改 Top 1 机会页 → 7 天后复盘）  
> 来源：2026-04-20 P5 落地 — demo-c CTR 1.2% / demo-b 3.0% 长期瓶颈，需要系统化工程解

---

## 为什么必须工程化

**过去痛点**：
- 每天凭手感改 Title，没系统扫全部机会页
- 改过的没追踪，可能反复改或漏改
- "改完就忘"，不知道改动是否见效
- 多语种站点优化分散，效率低

**引擎带来的 3 个改变**：
1. **系统选目标**：每周自动扫出 Top 5 机会页（按潜在流失点击降序）
2. **改动有日志**：每次改什么、为什么、改前/改后 Title — 存 `docs/ctr-log.md`
3. **改完有复盘**：7 天后对比前后 CTR，学习哪种 Title 模式有效

---

## CTR 基准表（SISTRIX 2024）

| 平均位置 | 期望 CTR | 潜力公式 |
|---|---|---|
| 1 | 28% | 本位即最佳，无需优化 |
| 2 | 15% | 本位即最佳 |
| 3 | 11% | 本位即最佳 |
| 4 | 8% | 本位即最佳 |
| 5 | 7% | 本位即最佳 |
| 6 | 5% | 核查 Title/Desc 是否契合搜索意图 |
| 7 | 4% | 同上 |
| 8-10 | 2.5-3.2% | **核心机会区**（看得见但不够诱人） |
| 11-15 | 1.5-2% | 排名临界，Title 优化能抢排名 |
| 16-20 | 0.8-1.2% | 通常 Title 相关度问题，需诊断 |
| 21+ | <0.5% | 先做内容增强/外链，再做 Title |

**机会判定**：`潜力分数 = 展示 × (期望CTR - 当前CTR)`，按分数降序选 Top 5。

---

## 4 阶段流程

### 阶段 1：扫描机会页（自动，~30 秒）

```
→ search-analytics.gsc_search_performance(site=域名, days=28, dimension='page', limit=50)
→ search-analytics.gsc_search_performance(site=域名, days=28, dimension='query', limit=100)
→ 运行 scripts/ctr-opportunities.mjs 或内置算法：
  - 过滤：展示 ≥ 5 AND 位置 ≤ 20 AND 当前CTR < 期望CTR × 0.5
  - 去重：排除过去 14 天在 ctr-log.md 里改过 Title 的页（防反复改）
  - 关联：每个机会页拉其 top 3 queries（作为 Title 关键词依据）
  - 排序：按潜力分数降序
  - 输出：docs/ctr-opportunities-YYYY-MM-DD.md
```

### 阶段 2：诊断 + 生成候选（手动判断）

对 Top 1-3 机会页：

**诊断 3 问**：
1. 当前 Title 是否含该页 top query 关键词？（不含 = 相关度问题）
2. 当前 Title 是否有价值锚点？（价格/数据/时间承诺/对比）
3. 当前 Desc 是否有 CTA 或具体承诺？（MOQ/交期/样品/认证）

**生成 3 个 Title 候选**（每个对应一种策略）：
- **策略 A · 数字锚点**：产品型号 + 价格区间 + 产能（例"BM-1400 Block Molding: 8-12 blocks/hr, $XX K"）
- **策略 B · 对比 + 决策点**：X vs Y: 某数据对比（例"EPS vs EPP: Cost, Strength & Thermal (2026)"）
- **策略 C · 长尾问题式**：How to / Complete Guide / X Mistakes（例"How to Set Up EPS Factory: 12-Step Plan"）

**Desc 3 候选**（对应 Title）：
- 每条 140-160 字符
- 含 CTA（Request sample / Get MSDS / 24h reply）
- 含 1-2 个具体数字（$X/ton、N days delivery、Y% margin）
- 含地理信号（from China / Chinese factory）

### 阶段 3：部署 + 记录（自动）

```
→ 选定最优候选（按"含关键词 + 含数字 + 含 CTA"三项评分）
→ 部署到对应语种（EN/ES/PT 默认同步）
→ 写入 docs/ctr-log.md：
  | 日期 | URL | Top Query | 改前 Title | 改后 Title | 改前 CTR | 待复盘日期 |
  | 2026-04-20 | /xxx | yyy | Old | New | 0.7% | 2026-04-27 |
→ 构建 + 部署 + IndexNow + GSC sitemap 重提交
→ 客户时间线记录改动
```

### 阶段 4：7 天后复盘（自动）

```
→ 对比 ctr-log.md 里"待复盘"条目
→ search-analytics.gsc_search_performance(site=域名, days=7, dimension='page')
→ 找到对应 URL 的新 CTR
→ 写入 ctr-log.md 复盘列：
  | 改后 CTR | 提升 | 结论 |
  | 2.5% | +1.8pt | 策略 A 有效，加入模式库 |
→ 有效策略纳入下次优化的优先候选；无效的降权
```

---

## 多客户执行

| 客户 | 当前 CTR | 首周目标 | 优化重点 |
|---|---|---|---|
| demo-c | 1.2% | 2% | 15 个机会页，多半是博客位 8-20 |
| demo-b | 3.0% | 4% | 首页位 26.9 (28 天 7 展示 0 点击)，blog fr 位 1 |
| demo-a | 发酵期 | - | 7 天后待 GSC 数据充足 |

---

## 与 daily-growth 的联动

**周一 SEO 精细化维度升级**：从"手感改 Title"→"跑 CTR 引擎选目标 → 改 Top 1 → 记日志 → 下周一对比"

**周二复盘**：跑上周改动的 7 天后 CTR 对比，写入日志"结论"列。

---

## 禁止行为

- 禁止一周内同一页面反复改 Title（破坏 Google 评估稳定性）
- 禁止改 Title 不记日志（破坏可追溯）
- 禁止改完不推 IndexNow（Google 需要重新抓取才看到新 Title）
- 禁止跳过 top query 分析直接写 Title（没对上搜索意图 = 瞎猜）

---

## 成功指标（30 天）

- 单站 avg CTR 提升 1-2 pt（绝对值）
- Top 5 机会页中至少 3 个见效（改后 7 天 CTR > 改前）
- 建立≥3 条"有效 Title 模式"进入模式库

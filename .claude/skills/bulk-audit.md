---
name: bulk-audit
description: 全站批量体检 — unlighthouse 一条命令扫 100+ 页 → 5 维度(性能/CWV/SEO/a11y/最佳实践)分桶 → 优先级修复清单 → 移交 hotfix。月度跑一次,客户老板要"为什么排名上不去"时甩这份表
---

# bulk-audit · 全站批量体检

## 什么时候用

- **月度技术体检**:每月 1 次,所有客户活跃站
- **客户问"为什么排名上不去"**:全站表格甩过去最有说服力(单页 PSI 报告说服力差)
- **重大改版后**:重做主题/换 CMS/批量上线后做 baseline 对比
- **季度复盘**:跟上季度 baseline 比看趋势

**不适用**:
- 单页诊断 → 用 `seo-checker.check_pagespeed` 或 `mcp__chrome-devtools__lighthouse_audit`
- 实时监控 → 用 `daily-ops` 7+1 项
- 内容衰退 → 用 `content-refresh` + `mcp__search-analytics__gsc_content_decay`

**和 tech-optimization 边界**:tech-optimization 是月度**深度技术优化 SOP**(站点架构/Schema/sitemap),本 skill 是**全站广度扫描**(每页指标),两者互补。

---

## 工具链

| 工具 | 用途 |
|---|---|
| **unlighthouse-ci** (4.5k⭐ 已 npm 全局装,CLI 实际名 `unlighthouse-ci`) | 一键全站 Lighthouse 扫描,导出 CSV/JSON/HTML |
| **mcp__chrome-devtools** | 单页深度 Performance trace + Memory snapshot |
| **mcp__seo-checker__check_pagespeed** | 备用,单页 PSI |

**为什么不只用 PSI 单页**:跨境 B2B 站常 100-500 页,单页跑要 N 小时,unlighthouse 并行扫 30 分钟搞定。

---

## 流程(5 步)

### Step 1:启动全站扫(后台跑)

```bash
cd /tmp
unlighthouse-ci --site https://{客户域名} --build-static --output-path ./bulk-audit-{客户}-{date}
```

**注意**:
- `--build-static` 生成 HTML 报告 + JSON 详情(可机器解析)
- 默认扫 sitemap 全部 URL,大站(>500 页)加 `--urls-limit 200` 避免跑太久
- 默认 mobile 端配置(跟 Google 一致),桌面端用 `--device desktop`

### Step 2:解析 JSON(脚本辅助)

unlighthouse 输出 `routes/{slug}.json`,每页含 5 维度分:

```json
{
  "url": "https://demo-c.com/en/products/bm-1400/",
  "score": {
    "performance": 0.45,
    "accessibility": 0.92,
    "seo": 0.88,
    "best-practices": 0.83
  },
  "lhr": { "audits": {...} }
}
```

写一行 `jq` 把 100+ 页拍平成 CSV:

```bash
jq -r '[.url, .score.performance, .score.seo, .score.accessibility, .score.["best-practices"]] | @csv' \
  ./bulk-audit-{客户}-{date}/routes/*.json > bulk-audit-{客户}-{date}.csv
```

### Step 3:5 维度分桶(优先级排序)

按 Google 阈值划档:

| 档位 | 性能 | SEO | a11y | 处置 |
|---|---|---|---|---|
| 🔴 严重 | < 0.5 | < 0.7 | < 0.8 | P0 — 本周必修 |
| 🟡 警戒 | 0.5-0.8 | 0.7-0.9 | 0.8-0.9 | P1 — 月内修 |
| 🟢 健康 | ≥ 0.8 | ≥ 0.9 | ≥ 0.9 | 维护即可 |

**重点看哪些**:
- **CWV 三巨头**(LCP/INP/CLS) — Google 排名因素,Google 75 百分位测,75% 访问必须 ≤ 阈值
  - LCP:Good ≤ 2.5s / 差 > 4s
  - INP:Good ≤ 200ms / 差 > 500ms
  - CLS:Good ≤ 0.1 / 差 > 0.25
- **跨页同问题**:80% 页都有同一个 a11y 问题(如 alt 缺失) = 模板级修复(改 BaseLayout 一次全好)

### Step 4:出修复清单 → 移交 hotfix

格式:

```markdown
# bulk-audit 报告 - {客户站} {YYYY-MM-DD}

## 总览
- 扫描页数:{n}
- 平均分:性能 {x} / SEO {x} / a11y {x} / best-practices {x}
- 上次:性能 {y} / SEO {y} / ...  趋势:⬆️/➡️/⬇️

## P0 修复清单(本周)

### 1. {问题}: 影响 {n} 页(模板级)
- **症状**:LCP > 4s
- **根因**:hero 图片未 preload
- **修复**:BaseLayout 加 `<link rel="preload" as="image">`
- **移交**:hotfix skill 执行

### 2. ...

## P1 修复清单(月内)
...

## P2 单页问题(逐个修)
低优先级,排进 monthly tech-optimization
```

### Step 5:存档 + 趋势对比

- 报告:`reports/bulk-audit-{客户}-{date}.md`
- CSV:`reports/bulk-audit-{客户}-{date}.csv`(给客户老板看)
- 跟上月报告做 diff,趋势 ⬇️ 警戒

---

## 5 维度参考(深度内容指针)

详细 metric 解释 + 修复代码示例,见 `~/refs/web-quality-skills/skills/`(Google Chrome 团队 Addy Osmani 维护,1.8k⭐):

| 维度 | 指针 |
|---|---|
| Core Web Vitals | `~/refs/web-quality-skills/skills/core-web-vitals/SKILL.md` |
| 性能 | `~/refs/web-quality-skills/skills/performance/SKILL.md` |
| SEO | `~/refs/web-quality-skills/skills/seo/SKILL.md` |
| 可访问性 | `~/refs/web-quality-skills/skills/accessibility/SKILL.md` |
| 最佳实践 | `~/refs/web-quality-skills/skills/best-practices/SKILL.md` |

**用法**:遇到具体修复问题时,引用对应 SKILL.md 的 prompt 片段(不全抄,保持本 skill 简洁)。

---

## 重要原则

1. **批量 > 单页**:发现"100 页同一个问题"的价值远高于"1 页 5 个问题"。先看跨页共性
2. **CWV 优先**:Google 三巨头(LCP/INP/CLS)是排名因素,其他维度优先级靠后
3. **客户老板要看分**:总览那张表是给老板的,详细页表是给运营的
4. **不要追求 100 分**:Lighthouse 100 分有时是过度优化(如 100KB 包压到 80KB 没意义),抓"差档→警戒档"才是 ROI

---

## 失败模式

- ❌ unlighthouse 跑超时(大站 > 500 页) → 加 `--urls-limit 200` + 分批跑
- ❌ 只看总分不看 75 百分位 → CWV 是 75 百分位指标,平均值会骗人
- ❌ 只看 mobile,忽略 desktop → 跨境 B2B 客户老板用 desktop 多,desktop 也要扫
- ❌ 一次修 50 个问题 → 改太多无法定位哪个生效,**每周改 1-3 个模板级问题**

---

## v9.5 候选(等触发)

- 接 mcp__chrome-devtools 做 Performance trace 深度诊断(配 lighthouse_audit + performance_start_trace)
- 接 lighthouse-ci 做 budget.json 配置 + GitHub Action 退化告警(跟 site-builder 协作进 starter 默认配置)
- 多客户聚合 dashboard(unlighthouse 跨客户对比,看哪个客户最需要重点投入)

---

*抄改自 harlan-zw/unlighthouse (4.5k⭐) 工作流 + addyosmani/web-quality-skills (1.8k⭐ Google Chrome 团队) 5 维度框架,2026-04-26 · 网站运营智能体本地化(跨境 B2B 站 + 客户老板视角 ROI + 跟 22 skill 边界明确)*

---
description: P1+ 人机协同索引加速器 — 智能体每日扫 git 改动 → 生成 GSC 重抓清单 → 员工执行 → 7 天后自动复盘闭环
---

# 🔄 P1+ 人机协同索引加速器（reindex-acceleration）

## 为什么有这个能力

GSC URL Inspection 的 "请求编入索引" 按钮**只在网页 UI 上**，Google 不开放 API（反爬政策）。所以 web-ops 智能体在 GSC 索引加速这一环只能 IndexNow（Bing/Yandex）+ sitemap 提交，**Google 这边新内容入索引慢 7-14 天**。

这是个跨内容运营 / 跨 SEO 优化 / 跨 CTR 改动的瓶颈。

## 解决方案：人机协同 + 自动化闭环

```
🤖 智能体（自动）        👤 员工（手动）          🤖 智能体（自动）
─────────────         ─────────              ──────────────
1. 扫今日 git commit    →  4. 看清单         →   7. 7 天后跑 followup
2. 文件 → URL + 评分        点 GSC 按钮             调 GSC URL Inspection API
3. Top 10/站 推清单        约 5-15 min             ✅/⚠️/🔴 分类统计
                                                   8. 反馈员工"哪些有效"
                                                   9. 闭环：失败的下次再点
```

**关键设计点：第 7-9 步的反向闭环** — 让员工的手动操作有数据反馈，从"机械执行"变成"数据驱动的可优化 SOP"。

## 4 阶段流程

### 阶段 1：扫描（自动，08:00 daily-cron 跑完后触发）

`scripts/reindex-checklist.mjs` 跑：

1. 对每个客户站（4 个），跑 `git log --since=今日00:00 --name-only`
2. 解析 commit message + 改动文件
3. 文件 → URL 推导（仅英文版，hreflang 自动联动多语种）：
   - `src/pages/[locale]/<page>.astro` → `/en/<page>/`
   - `src/pages/[locale]/blog/<slug>.astro` → `/en/blog/<slug>/`
   - `src/pages/[locale]/index.astro` → `/en/`
   - 动态路由（`[slug]` / `[group]`）跳过（无法对应单 URL）
   - `BaseLayout` / `Header` / `site.config` → 推 `/en/` + `/en/products/` + `/en/contact/`
   - `src/data/blog-posts.ts` → 从 commit message grep slug 关键词

### 阶段 2：评分（自动）

`SCORING_RULES` 数组按"commit message 关键词 + 文件路径 patterns"打分：

| 优先级 | 类型 | 触发条件 |
|---|---|---|
| **10** | 新博客 | commit message `^feat\|add` + 文件 `/blog/<slug>` |
| **9** | 新产品页 | commit message `^feat\|add` + 文件 `/products/<slug>` |
| **8** | 内容 refresh | commit message `refresh\|rewrite\|重写\|重构\|更新内容` |
| **7** | Title/Desc/CTR | commit message `title\|desc\|ctr\|meta` |
| **5** | Schema | commit message `schema\|jsonld\|json-ld\|结构化` |
| **3** | 内链 | commit message `internal-link\|内链\|backlink` |
| **2** | 联系方式 / 配置 | commit message `config\|contact\|whatsapp\|email` |
| **1** | 其他改动 | 兜底 |

每客户取 Top 10 URL（GSC 上限），低于 10 个全推，高于截断。

### 阶段 3：推送（自动）

输出 markdown 推企微（`@员工`），同时写：
- `reports/reindex-YYYY-MM-DD.md`（员工友好）
- `reports/reindex-YYYY-MM-DD.json`（followup 用）
- `reports/reindex-latest.json`

无改动日推"今日无改动跳过"消息，员工不用做。

### 阶段 4：员工执行 + 7 天后复盘（半自动）

员工 SOP：`reports/SOP-员工GSC重抓.md`（3 分钟读完）

7 天后 `scripts/reindex-followup.mjs` 自动跑：
- 读 7 天前的 `reindex-YYYY-MM-DD.json`
- 对每个 URL 调 GSC URL Inspection API（**read-only，合规**）
- 状态分类：
  - ✅ 已索引（PASS / coverage 含 indexed）
  - ⚠️ 已爬未索引（coverage 含 crawled / discovered / 有 last_crawl）
  - 🔴 未爬到（coverage 含 not found / blocked）
  - ❓ 状态不明 / 错误
- 推企微复盘报告 → 员工 + 运营人员都能看到工作 ROI

## 集成到 daily-cron

`mcp-servers/wecom-bot/daily-cron.mjs` 在 Stage 4 推完每客户卡片后追加一段：

```js
import { generateReindexChecklist } from '/.../reindex-checklist.mjs';

// Stage 4.5: 重抓清单段
try {
  const reindex = await generateReindexChecklist({
    clients: WEB_OPS_CLIENTS.map(c => ({...c, repoPath: clientRepoPath(c.id)})),
    // sinceISO 默认今日 00:00 北京时间
  });
  if (reindex.json.totalUrls > 0) {
    await pushChunked(reindex.markdown);
  }
  // 同时写 reports/reindex-YYYY-MM-DD.json 给 followup 用
} catch (e) {
  console.error('[daily-cron] reindex 段失败:', e.message);
}
```

## cron 排期建议

```
08:00  pm2 daily-check 跑 daily-cron.mjs（含 reindex-checklist 推送）
09:00  员工早会前看到清单
09:00-09:30  员工照单点 GSC
09:30  企微回 +1 表示完成

每周一 09:00（建议在 daily-cron 后或独立 cron）
       reindex-followup.mjs 跑上周一清单的 7 天复盘
```

可选独立 pm2 进程：
```js
// ecosystem.config.cjs
{
  name: 'reindex-followup',
  script: 'scripts/reindex-followup.mjs',
  cron_restart: '0 1 * * 1',  // 每周一 09:00 北京（UTC 01:00）
  autorestart: false,
}
```

## 优先级评分调优（迭代式）

v0 评分规则可能太粗，迭代方向：

1. **客户 phase 加权**：fermenting（< 30 天）的客户基础分 +2（站新急需 Google 关注）
2. **GSC 历史关联**：如果某 URL 之前 7 天点过但仍未索引，下次升 +3 紧迫
3. **流量价值加权**：高 GSC 曝光 query 落地页的改动 +2
4. **Schema rich result 触发**：含 schema 改 + 是 FAQ/HowTo/Product 页 +3

后续版本可加 `reindex-checklist.mjs` 的 `--strategy aggressive|conservative` 参数，让运营人员调整侧重。

## 边界 / 不要做的

- ❌ **不要写自动化爬虫去点 GSC UI 按钮**（违反 Google 服务条款，可能被封 GSC 账号 → 整个数据通道断）
- ❌ **不要把员工 SOP 写得太机械**（会让员工失去思考）— 评分清单是参考，员工可以根据当日情况判断
- ❌ **不要每天强制员工做满 40 个**（无改动日清单空，跳过即可）

## 与其他能力的关系

| 现有能力 | 关系 |
|---|---|
| **P1 索引加速引擎**（IndexNow + sitemap）| 互补：P1 自动通知，P1+ 主动催索引 |
| **content-production**（12 阶段）| 触发：每篇博客发布次日清单上自动出现 |
| **ctr-optimization**（P5）| 触发：CTR 改 Title/Desc 后清单上出现，加速 SERP 信号生效 |
| **content-rapid-response**（P7 48h 响应）| 触发：48h 内紧急博客发布后立刻进清单（高分推） |
| **geo-attack**（P9）| 触发：FAQ Schema / 答案胶囊 / 权威外链 改动后进清单 |

## 沉淀位置

- 此 skill：`.claude/skills/reindex-acceleration.md`
- 核心引擎：`scripts/reindex-checklist.mjs`
- 7 天复盘：`scripts/reindex-followup.mjs`
- 员工 SOP：`reports/SOP-员工GSC重抓.md`
- 报告归档：`reports/reindex-YYYY-MM-DD.{md,json}`
- 集成点：`mcp-servers/wecom-bot/daily-cron.mjs` Stage 4.5
- CLAUDE.md：在 "已落地全栈能力 P1-P9" 加 P1+ 章节

---
*v1.0 · 2026-04-29 · 独立站建站智能体 web-ops · GSC URL Inspection API 反爬政策催生的人机协同设计*

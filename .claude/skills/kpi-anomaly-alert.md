---
name: kpi-anomaly-alert
description: KPI 异常实时报警 — 流量/CTR/转化骤降自动触发企微 P0 告警，对照 7 天/30 天/同期 baseline 识别异常。补足 daily-cron 之前缺失的"KPI 骤降无专门触发器"问题。
---

# KPI 异常报警 v1.0

> **建立时间**：2026-04-27（v10.1 第四批）
> **解决问题**：之前 daily-cron 只报"GSC 异常"，但流量/CTR/转化骤降需要客户主动看简报才能发现
> **核心原则**：**异常发生即推企微，不等运营人员/客户员工看简报**

---

## 6 大 KPI 异常类型

| KPI | 触发阈值 | 严重性 | 报警方式 |
|---|---|---|---|
| **GSC 展示量骤降** | 7 天 vs 上 7 天 ↓ ≥ 30% | 🔴 P0 | 即时推企微 + 简报红字 |
| **GSC 点击量骤降** | 7 天 vs 上 7 天 ↓ ≥ 40% | 🔴 P0 | 即时推企微 |
| **平均排名骤降** | 核心词 7 天均 ↓ ≥ 5 位 | 🟠 P1 | 简报红字 + 周一深查 |
| **GA4 流量骤降** | 7 天 vs 上 7 天 ↓ ≥ 30% | 🔴 P0 | 即时推企微 |
| **CTR 骤降** | 7 天 vs 上 7 天 ↓ ≥ 1pp | 🟠 P1 | 简报红字 |
| **转化事件骤降** | 7 天 vs 上 7 天 ↓ ≥ 50% | 🔴 P0 | 即时推企微 |
| **新询盘 0 天数** | 连续 ≥ 7 天 0 询盘 | 🟡 P2 | 简报警告（不一定是问题但提醒） |

---

## 触发流程

```
daily-cron 9:00 跑（已 cron 化）
       │
       ↓
对每客户:
   1. 拉 GSC 14 天数据 (7+7 对比)
   2. 拉 GA4 14 天数据 (7+7 对比)
   3. 拉 rank-tracking 14 天数据
   4. 拉 5 转化事件 14 天数据
       │
       ↓
   异常检测算法 (按上表阈值)
       │
       ├─ 发现 P0 异常 → 立刻推企微 + 写 incident 报告
       ├─ 发现 P1 异常 → 简报红字 + 周一深查清单
       └─ 发现 P2 异常 → 简报黄字提醒
       │
       ↓
   异常归类 + 根因初判
       │
       ├─ Google 算法更新? (查 Search Engine Land RSS)
       ├─ 客户站事故? (调 site-monitor uptime)
       ├─ 竞品突破? (调 competitor-radar 上周新文章)
       ├─ Title/Desc 改动后波动? (查 ctr-log.md 7 天内改动)
       ├─ 季节性? (对比去年同期)
       └─ 数据采集异常? (GSC quota / GA4 tag 失效)
       │
       ↓
   生成行动建议 (按异常类型对应 SOP)
       │
       ↓
   推企微告警 (P0/P1) + 写 incident 报告 + 加进 pending-tasks.md
```

---

## 算法实现（伪代码）

```javascript
// daily-cron.mjs 加 KPI 异常检测段
async function detectKpiAnomalies(clientId) {
  const gsc14d = await searchAnalytics.gsc_search_performance({ site: clientId.domain, days: 14 });
  const ga14d = await searchAnalytics.ga4_traffic_summary({ propertyId: clientId.ga4, days: 14 });

  const last7 = gsc14d.slice(0, 7).reduce((sum, d) => sum + d.impressions, 0);
  const prev7 = gsc14d.slice(7, 14).reduce((sum, d) => sum + d.impressions, 0);
  const dropPct = ((prev7 - last7) / prev7) * 100;

  const anomalies = [];

  if (dropPct >= 30) {
    anomalies.push({
      severity: 'P0',
      kpi: 'GSC_impressions',
      from: prev7,
      to: last7,
      drop_pct: dropPct.toFixed(1),
      action: 'investigate_immediately',
    });
  }
  // ... 其他 KPI 类型 ...

  return anomalies;
}

async function pushP0Alert(clientId, anomaly) {
  const msg = `🔴 KPI P0 告警 · ${clientId.name}\n\n` +
    `${anomaly.kpi}: ${anomaly.from} → ${anomaly.to} (↓${anomaly.drop_pct}%)\n` +
    `时间: 过去 7 天 vs 前 7 天\n\n` +
    `初判:\n` +
    `${await diagnose(clientId, anomaly)}\n\n` +
    `行动: 见 daily-briefing 详细诊断 + pending-tasks.md`;

  await curl(WEBHOOK_URL, { msgtype: 'text', text: { content: msg } });
}
```

---

## 异常对应行动 SOP

### GSC 展示量骤降 ↓ ≥ 30%

**5 步排查**：
1. **Google 算法更新？**
   - 查 https://twitter.com/searchliaison 最近 7 天
   - 查 Search Engine Land "core update" 标签
   - 如有更新 → 标记为"算法波动"，等待 Google 稳定后看
2. **客户站事故？**
   - 调 site-monitor.check_site：HTTP 状态 / SSL / robots.txt 是否变了
   - 如挂了 → hotfix
3. **GSC sitemap 出错？**
   - 调 search-analytics.gsc_submit_sitemap 看 errors
   - 如有错 → 修复 + 重提交
4. **大量页面被 deindexed？**
   - 调 gsc_index_changes 看过去 7 天 indexed → not-indexed 转换
   - 如有 → 检查 robots.txt / canonical / 404
5. **季节性？**
   - 对比去年同期数据
   - 如是季节性 → 简报记录"季节性下降，预计 X 月回升"

### GSC 点击量骤降 ↓ ≥ 40%

**额外检查**（在展示量 5 步基础上）：
- CTR 是不是也降了？
  - 是 → Title/Desc 改动后的副作用
  - 否 → 展示量降是主因
- 排名是不是降了？
  - 是 → 内容质量/外链/竞品突破
  - 否 → SERP 特性变化（如 AI Overview 占位）

### 转化事件骤降 ↓ ≥ 50%

**关键诊断**：
- GA4 tag 是不是失效了？（最常见）
  - 测试：Realtime → 自己访问站点 → 看事件触发
- 客户站 Form / WhatsApp / Email 链接是不是改了？
  - 调 fetch + grep "wa.me|mailto|tel:" 对比 7 天前
- 是不是某个国家流量没了？
  - GA4 → Demographics → Country 拆分

### CTR 骤降 ↓ ≥ 1pp

**最常见原因**：
- 自家 Title/Desc 改动后的副作用（查 ctr-log.md）
- SERP 出现了 AI Overview / Featured Snippet（被吃流量）
- 竞品出新内容压制（查 competitor-radar）

---

## 报警去重 + 防骚扰

**规则**：
- 同一客户 + 同一 KPI 异常 → 24h 内只推 1 次
- 趋势是否持续？如 24h 后还在异常 → 升级（P1 → P0）
- 自愈 → 自动消报警（推一条"已自愈"消息）

**实施**：

```
~/.local/share/web-ops/kpi-alerts/<客户>-<KPI>-<日期>.json
```

每次报警写入 + 检查重复 + 自愈。

---

## 与现有 daily-cron 集成

加进 daily-cron 步骤 8（在询盘检查后）：

```javascript
8. **v10.1 batch 4 新增 · KPI 异常实时检测**:
   - 对每个客户跑 detectKpiAnomalies()
   - P0 异常 → 立刻推企微 (24h 去重)
   - P1 异常 → 简报红字
   - P2 异常 → 简报黄字提醒
   - 异常详情写 ~/.local/share/web-ops/kpi-alerts/<客户>-<KPI>-<日期>.json
```

---

## 监控指标（30 天验证）

- **召回率**：真异常被检测到的比例（目标 ≥ 95%）
- **误报率**：报警了但实际没问题的比例（目标 < 10%）
- **响应速度**：异常发生 → 报警时长（目标 ≤ 24h，daily-cron 每天跑）
- **诊断准确率**：报警附带的初判跟真因的吻合度（目标 ≥ 60%）

---

## 第四批后续扩展（v10.2+）

- [ ] 接 Search Engine Land RSS 自动监控算法更新
- [ ] Wayback Machine 集成（自动回看客户站历史快照对比）
- [ ] 异常自愈检测（异常 + 7 天后自动看是否已恢复，恢复则消报警）
- [ ] 季节性 baseline（拉去年同期数据自动对比）

---

*v10.1 第四批 · KPI 异常实时报警 · 2026-04-27 · 修复 daily-cron 缺失的 KPI 骤降触发器*

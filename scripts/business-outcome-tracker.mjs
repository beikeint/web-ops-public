#!/usr/bin/env node
/**
 * business-outcome-tracker.mjs — 月度业务结果追踪
 *
 * v11.0 (2026-05-07 立) — 治 "KPI 跟产出不跟业务结果" 反模式
 *
 * 职责：从 GSC + GA4 拉每客户上月真业务数据，生成 ROI 表。
 *       月度天花板评分（commit 数）+ 业务结果（流量+询盘+成单）双指标体系。
 *
 * 用法:
 *   node business-outcome-tracker.mjs              # 跑上月数据
 *   node business-outcome-tracker.mjs --month YYYY-MM  # 指定月份
 *   node business-outcome-tracker.mjs --client client-A  # 只跑指定客户
 *   node business-outcome-tracker.mjs --dry-run    # 不写盘
 *
 * pm2 cron: 每月 1 号 14:00 (monthly-ceiling 跑完 5h 后)
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const WEB_OPS_ROOT = '${WORKSPACE_ROOT}/智能体/运营/网站运营-web-ops';

const CLIENTS = [
  { id: 'client-A',  name: 'Demo-D', domain: 'demo-a.com', phase: 'fermenting', launchDate: '2026-04-26' },
  { id: 'client-B',  name: 'Demo-C', domain: 'demo-c.com', phase: 'mature' },
  { id: 'client-B2', name: 'Demo-A', domain: 'demo-a.com', phase: 'fermenting', launchDate: '2026-04-19' },
  { id: 'client-D',  name: 'Demo-B', domain: 'demo-b.com', phase: 'mature' },
];

const ARGS = {
  dryRun: process.argv.includes('--dry-run'),
  month: process.argv.includes('--month') ? process.argv[process.argv.indexOf('--month') + 1] : null,
  client: process.argv.includes('--client') ? process.argv[process.argv.indexOf('--client') + 1] : null,
};

function getLastMonth() {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function generateClientReport(client, month) {
  const phaseGrowthThreshold = client.phase === 'fermenting'
    ? { impr: 0.05, clicks: 0.08, conv: 0.05 }
    : { impr: 0.10, clicks: 0.15, conv: 0.10 };

  // MVP 版本: 输出框架 + 待数据填充槽位
  // v11.1 接入 search-analytics MCP 自动拉数据
  const report = `# ${client.name} (${client.domain}) · ${month} 业务结果月报

> v11.0 MVP — 数据槽位待 search-analytics MCP 集成自动填充
> 客户阶段：${client.phase === 'fermenting' ? '🌱 发酵期（阈值减半）' : '🌳 成熟期'}

## 一、流量真账（GSC + GA4 月环比）

| 指标 | 上月 | 上上月 | 变化 | 阈值（${client.phase}）| 达成 |
|---|---|---|---|---|---|
| GSC 展示 | TBD | TBD | TBD | +${(phaseGrowthThreshold.impr*100).toFixed(0)}% | TBD |
| GSC 点击 | TBD | TBD | TBD | +${(phaseGrowthThreshold.clicks*100).toFixed(0)}% | TBD |
| GA4 用户 | TBD | TBD | TBD | - | - |
| GA4 自然流量 | TBD | TBD | TBD | - | - |
| GA4 conversions (lead/quote/whatsapp/email) | TBD | TBD | TBD | +${(phaseGrowthThreshold.conv*100).toFixed(0)}% | TBD |

> ⚠️ MVP 版未接 MCP, 数据槽位待 v11.1 自动填充. 当前手动跑 \`mcp__search-analytics__gsc_search_performance\` + \`ga4_traffic_summary\` 填入

## 二、询盘归因（来自 client-manager + 客户群反馈日志）

- 上月新增询盘数：TBD（需 client-manager 时间线 grep "询盘" "lead" "inquiry"）
- 自然搜索归因：TBD（来源 = google/bing 自然搜索）
- 询盘关键词：TBD

## 三、成单跟踪（季度维度，月度只标增量）

- 本月新成单：TBD
- 本月成单总值：TBD
- 单笔均值：TBD

## 四、本月核心运营动作（贡献分析）

> 从 git log 拉本月 A 级 commit 列表 → 推断对流量增长的贡献

| 动作 | 上线日 | 影响指标 | 实际效果 |
|---|---|---|---|
| TBD | TBD | TBD | TBD |

## 五、月度 ROI 评估

- 智能体投入工时（commit 数 × 估算）：TBD
- 实际业务产出（询盘 / 成单价值）：TBD
- ROI：TBD

## 六、下月行动建议

1. TBD
2. TBD
3. TBD

---

*v11.0 MVP. 数据槽位接入路径：search-analytics MCP + client-manager 时间线 + GA4 conversions API. 预计 v11.1 (1-2 周内) 自动化填充.*
`;
  return report;
}

async function main() {
  const month = ARGS.month || getLastMonth();
  const targetClients = ARGS.client
    ? CLIENTS.filter(c => c.id === ARGS.client)
    : CLIENTS;

  console.log(`📊 business-outcome-tracker v11.0 启动`);
  console.log(`📅 目标月份: ${month}`);
  console.log(`👥 目标客户: ${targetClients.map(c => c.name).join(' / ')}`);

  const reportDir = join(WEB_OPS_ROOT, '案例库', '月度业务结果');
  if (!existsSync(reportDir)) mkdirSync(reportDir, { recursive: true });

  for (const client of targetClients) {
    const report = generateClientReport(client, month);
    const reportPath = join(reportDir, `${month}-${client.id}.md`);

    if (ARGS.dryRun) {
      console.log(`\n[DRY-RUN] 会落盘: ${reportPath}`);
      console.log(report.split('\n').slice(0, 15).join('\n'));
    } else {
      writeFileSync(reportPath, report);
      console.log(`✅ ${client.name}: ${reportPath}`);
    }
  }

  console.log(`\n✅ 完成. v11.1 待办: 接 search-analytics MCP 自动填充数据槽位.`);
  process.exit(0);
}

main().catch(err => {
  console.error('business-outcome-tracker 失败:', err);
  process.exit(1);
});

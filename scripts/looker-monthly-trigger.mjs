#!/usr/bin/env node
/**
 * Analytics 深度月度触发器 — 单客户每月 ≥1 次 Looker / Cohort / DDA 更新
 *
 * 起源: v10.5 ceiling-kpi-scanner 发现 4 客户本月 Analytics 全部 0/1.
 *      .claude/skills/attribution-analytics.md 已落地但无月度调度.
 *      Avinash Kaushik 标准: 每月 ≥1 次深度归因更新.
 *
 * 调用:
 *   node looker-monthly-trigger.mjs --client client-B
 *   node looker-monthly-trigger.mjs                        # 全跑
 *
 * cron: 每月 25 号 (距月底 5 天, 数据足够覆盖整月)
 */

import { writeFileSync, mkdirSync } from 'fs';
import { loadStdEnv, callClaude, pushOne, parseArgs, WEB_OPS_CLIENTS, todayISO } from './trigger-common.mjs';

loadStdEnv();

const REPORT_DIR = '${WORKSPACE_ROOT}/智能体/运营/网站运营-web-ops/reports';
const PER_CLIENT_MAX_TURNS = 60;
const TIMEOUT_MS = 1500000; // 25 min

async function main() {
  const ARGS = parseArgs();
  const date = todayISO();
  const targets = ARGS.client
    ? WEB_OPS_CLIENTS.filter(c => c.id === ARGS.client)
    : WEB_OPS_CLIENTS;

  console.log(`[looker-monthly] ${date} 启动 — ${targets.length} 客户`);

  if (ARGS.dryRun) { console.log('dry-run'); process.exit(0); }

  const results = [];
  for (const client of targets) {
    const t0 = Date.now();
    try {
      const out = await callClaude(buildPrompt(client, date), {
        maxTurns: PER_CLIENT_MAX_TURNS,
        timeoutMs: TIMEOUT_MS,
        tag: `looker-${client.id}`,
      });
      results.push({ client, ok: true, output: out, durMs: Date.now() - t0 });
      console.log(`[looker-monthly] ✅ ${client.name}`);
    } catch (err) {
      results.push({ client, ok: false, error: err.message, durMs: Date.now() - t0 });
      console.error(`[looker-monthly] ❌ ${client.name}:`, err.message.slice(0, 150));
    }
  }

  mkdirSync(REPORT_DIR, { recursive: true });
  const report = results.map(r => `==== ${r.client.name} ${r.ok ? '✅' : '❌'} ====\n${r.ok ? r.output : '失败: ' + r.error}\n`).join('\n');
  writeFileSync(`${REPORT_DIR}/looker-monthly-${date}.txt`, report);

  if (!ARGS.noPush) {
    const ok = results.filter(r => r.ok).length;
    const summary = `# 📊 Analytics 月度深度 ${date}\n\n${ok}/${results.length} 客户已更新\n\n` +
      results.filter(r => r.ok).map(r => `**${r.client.name}**\n${r.output.slice(0, 400)}`).join('\n\n');
    await pushOne(summary);
  }

  process.exit(results.every(r => r.ok) ? 0 : 2);
}

function buildPrompt(client, date) {
  return `今天 ${date}, 对客户「${client.name}」(${client.id}) 跑 Analytics 月度深度归因.

【背景】
- v10.5 ceiling-kpi-scanner 检测 ${client.name} 本月 Analytics 0/1 (critical/warning)
- .claude/skills/attribution-analytics.md 提供完整方法论 (Avinash Kaushik 标准)
- 月度节奏: ≥1 次 Looker dashboard / Cohort / DDA 三选一更新

【流程】3 选 1 (按数据成熟度选, 优先 Looker):
A. **Looker dashboard 月度更新** (推荐):
   1. 调 search-analytics 拉 30 天 GSC + GA4 数据
   2. 5 维度评估: 流量 / 转化 / 内容 / 渠道 / 设备
   3. 写到客户 docs/analytics-monthly/<YYYY-MM>.md (含 Looker URL 配置 + 5 节深度评论)
B. **Cohort 分析**: 7-day / 30-day retention by source/medium → docs/cohort-<YYYY-MM>.md
C. **DDA (Data-Driven Attribution) 配置**: GA4 attribution model 升级 + 落 docs/dda-config-<YYYY-MM>.md

【流程通用步骤】
1. 调 search-analytics.ga4_traffic_summary days=30 + ga4_traffic_sources days=30 + ga4_conversions days=30
2. 写月度报告到对应 docs/ 文件
3. 自动算 4 个核心指标 month-over-month: 会话 / 用户 / 转化 / 询盘 (含 Δ%)
4. 标记本月 Top 3 增长机会 + Top 3 衰退预警
5. git commit \`feat(analytics): <YYYY-MM> Looker / Cohort / DDA update\`

【输出】≤ 1500 字符:
## ${client.name} Analytics 月度深度
- 模式: A/B/C
- 数据期: <start>~<end>
- 4 核心指标 MoM: 会话 X (+Y%) / 用户 X (+Y%) / 转化 X / 询盘 X
- Top 3 增长: <列表>
- Top 3 衰退: <列表>
- 落盘文件: <path>
- commit: <hash>

直接做完, 不要列计划.`;
}

main().catch(e => { console.error('顶层异常', e); process.exit(1); });

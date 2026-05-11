#!/usr/bin/env node
/**
 * CRO 实验注册触发器 — 单客户每月 ≥1 个新实验
 *
 * 起源: v10.5 ceiling-kpi-scanner 发现 4 客户本月 CRO 全部 0/1.
 *      cro-experiment-tracker.mjs (web-ops/scripts/) 已存在但无 cron 调度.
 *      .claude/skills/cro-suite.md 全套方法论已落地 11 天 0 实验注册.
 *
 * 调用:
 *   node cro-experiment-trigger.mjs --client client-B    # 单客户
 *   node cro-experiment-trigger.mjs                        # 跑所有 4 客户
 *
 * cron: 月度第 1 周周四 (反向触发兜底, 主调度由 pm2-health 在月过半未达成时触发)
 */

import { writeFileSync, mkdirSync } from 'fs';
import { loadStdEnv, callClaude, pushOne, parseArgs, WEB_OPS_CLIENTS, todayISO } from './trigger-common.mjs';

loadStdEnv();

const REPORT_DIR = '${WORKSPACE_ROOT}/智能体/运营/网站运营-web-ops/reports';
const PER_CLIENT_MAX_TURNS = 50;
const TIMEOUT_MS = 1200000; // 20 min

async function main() {
  const ARGS = parseArgs();
  const date = todayISO();
  const targets = ARGS.client
    ? WEB_OPS_CLIENTS.filter(c => c.id === ARGS.client)
    : WEB_OPS_CLIENTS;

  console.log(`[cro-experiment] ${date} 启动 — ${targets.length} 客户`);

  if (ARGS.dryRun) { console.log('dry-run'); process.exit(0); }

  const results = [];
  for (const client of targets) {
    const t0 = Date.now();
    try {
      const out = await callClaude(buildPrompt(client, date), {
        maxTurns: PER_CLIENT_MAX_TURNS,
        timeoutMs: TIMEOUT_MS,
        tag: `cro-${client.id}`,
      });
      results.push({ client, ok: true, output: out, durMs: Date.now() - t0 });
      console.log(`[cro-experiment] ✅ ${client.name}`);
    } catch (err) {
      results.push({ client, ok: false, error: err.message, durMs: Date.now() - t0 });
      console.error(`[cro-experiment] ❌ ${client.name}:`, err.message.slice(0, 150));
    }
  }

  mkdirSync(REPORT_DIR, { recursive: true });
  const report = results.map(r => `==== ${r.client.name} ${r.ok ? '✅' : '❌'} ====\n${r.ok ? r.output : '失败: ' + r.error}\n`).join('\n');
  writeFileSync(`${REPORT_DIR}/cro-experiment-${date}.txt`, report);

  if (!ARGS.noPush) {
    const ok = results.filter(r => r.ok).length;
    const summary = `# 🧪 CRO 实验注册 ${date}\n\n${ok}/${results.length} 客户已注册\n\n` +
      results.filter(r => r.ok).map(r => `**${r.client.name}**\n${r.output.slice(0, 400)}`).join('\n\n');
    await pushOne(summary);
  }

  process.exit(results.every(r => r.ok) ? 0 : 2);
}

function buildPrompt(client, date) {
  return `今天 ${date}, 对客户「${client.name}」(${client.id}) 注册 1 个新 CRO 实验.

【背景】
- v10.5 ceiling-kpi-scanner 检测 ${client.name} 本月 CRO 实验 0/1 (critical)
- cro-experiment-tracker.mjs 已就位, .claude/skills/cro-suite.md 提供完整方法论
- 顶级 CRO 团队 (Peep Laja / CXL) 节奏: 每客户每月 ≥1 个新实验

【流程】
1. 调 search-analytics.ga4_page_performance days=14 找页面 Top 5
   筛选: 跳出率 > 60% / 平均停留 < 30s / 转化率 < 0.5% (3 选 1 中至少 2 项命中)
2. 选 1 个最高机会页 (展示 × 改进空间最大)
3. 设计 1 个实验, 5 类之一:
   - heatmap (跑 Microsoft Clarity 1 周热图分析)
   - exit-intent (退出弹窗 -- 折扣码 / 资料下载)
   - form simplification (减字段 / 自动填充 / 进度条)
   - cta copy A/B (按钮文案 / 颜色 / 位置 3 变体)
   - mid-page CTA (长页内容中部加 CTA)
4. 跑 \`node ${WORKSPACE_ROOT}/智能体/运营/网站运营-web-ops/scripts/cro-experiment-tracker.mjs --register-template\` 拿模板
5. 填模板 + 写到客户 docs/cro-experiments.json (append 数组)
   字段: id / page_url / hypothesis / variant_a / variant_b / metric / target_lift / start_date / review_date (start + 14 天)
6. git commit \`feat(cro): register experiment <id> on <slug>\`

【输出】≤ 1000 字符:
## ${client.name} CRO 实验
- 实验 id: <id>
- 目标页: <url>
- 假设: <一句话>
- 类型: <heatmap/exit-intent/form/cta/mid-cta>
- 变体: A vs B
- 目标 lift: +X%
- review date: <date>
- commit: <hash>

直接做完, 不要列计划.`;
}

main().catch(e => { console.error('顶层异常', e); process.exit(1); });

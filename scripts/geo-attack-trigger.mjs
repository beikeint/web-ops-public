#!/usr/bin/env node
/**
 * GEO 攻占触发器 — 单客户每月 ≥1 个 GEO 改动 (AI 搜索引用攻占)
 *
 * 起源: v10.5 ceiling-kpi-scanner 发现 4 客户本月 GEO 全部 0/1.
 *      .claude/skills/geo-attack.md + 各客户站 scripts/geo-opportunities.mjs 已存在但无 cron.
 *      4-20 落地后 11 天 0 攻占动作 → 接 cron + 反向触发.
 *
 * 调用:
 *   node geo-attack-trigger.mjs --client client-B    # 单客户跑
 *   node geo-attack-trigger.mjs                         # 跑所有 4 客户
 *
 * cron: 建议周四 (与 daily-cron 周四 GEO 段不冲突, 那段只扫不改)
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { loadStdEnv, callClaude, pushOne, parseArgs, WEB_OPS_CLIENTS, todayISO } from './trigger-common.mjs';

loadStdEnv();

const REPORT_DIR = '${WORKSPACE_ROOT}/智能体/运营/网站运营-web-ops/reports';
const PER_CLIENT_MAX_TURNS = 80;
const TIMEOUT_MS = 1500000; // 25 min

async function main() {
  const ARGS = parseArgs();
  const date = todayISO();
  const targets = ARGS.client
    ? WEB_OPS_CLIENTS.filter(c => c.id === ARGS.client)
    : WEB_OPS_CLIENTS;

  console.log(`[geo-attack] ${date} 启动 — ${targets.length} 客户`);

  if (ARGS.dryRun) {
    console.log('[geo-attack] dry-run');
    process.exit(0);
  }

  const results = [];
  for (const client of targets) {
    const t0 = Date.now();
    try {
      const out = await callClaude(buildPrompt(client, date), {
        maxTurns: PER_CLIENT_MAX_TURNS,
        timeoutMs: TIMEOUT_MS,
        tag: `geo-${client.id}`,
      });
      results.push({ client, ok: true, output: out, durMs: Date.now() - t0 });
      console.log(`[geo-attack] ✅ ${client.name} (${Math.round((Date.now()-t0)/1000)}s)`);
    } catch (err) {
      results.push({ client, ok: false, error: err.message, durMs: Date.now() - t0 });
      console.error(`[geo-attack] ❌ ${client.name}:`, err.message.slice(0, 150));
    }
  }

  // 报告
  mkdirSync(REPORT_DIR, { recursive: true });
  const report = results.map(r => `==== ${r.client.name} ${r.ok ? '✅' : '❌'} ====\n${r.ok ? r.output : '失败: ' + r.error}\n`).join('\n');
  writeFileSync(`${REPORT_DIR}/geo-attack-${date}.txt`, report);

  // 推 1 段汇总
  if (!ARGS.noPush) {
    const ok = results.filter(r => r.ok).length;
    const summary = `# 🤖 GEO 攻占 ${date}\n\n${ok}/${results.length} 客户成功攻占\n\n` +
      results.filter(r => r.ok).map(r => `**${r.client.name}**\n${r.output.slice(0, 500)}`).join('\n\n');
    await pushOne(summary);
  }

  process.exit(results.every(r => r.ok) ? 0 : 2);
}

function buildPrompt(client, date) {
  return `今天 ${date}, 对客户「${client.name}」(${client.id} / ${client.domain}) 跑 GEO 主动攻占.

【背景】
- v10.5 ceiling-kpi-scanner 检测到 ${client.name} 本月 GEO 攻占 0/1 (critical)
- 顶级 AI 搜索运营团队节奏: 每客户每月 ≥1 个攻占改动, 抢 Perplexity/ChatGPT/Google AI Overviews/Bing Copilot 引用位

【流程】严格按 .claude/skills/geo-attack.md 4 信号策略:
1. 跑 ${client.repoPath}/website/scripts/geo-opportunities.mjs (若存在), 拿 Top 1 候选页
   - 若不存在或无候选: 调 search-analytics.gsc_search_performance days=28 找展示 ≥ 50 / 排名 5-15 的页面 Top 1
2. 对该页加 4 信号中的 1-2 个 (按现状缺哪个补哪个):
   - 答案胶囊 (Answer Box): 文章开头 80 字内含 "X is Y because Z" 直接回答
   - FAQ JSON-LD Schema: 5-8 个 PAA 真实问题 + 50-80 词答案
   - 权威外链: 引用 ≥1 个 .gov/.edu/wikipedia/行业协会 (用 mcp__fetcher__fetch_url 验证可达)
   - 定义性语句: "industry definition: X is..."  / "official spec: ..." / "according to ISO..."
3. 部署 + IndexNow + GSC URL Inspection 重抓
4. git commit \`feat(geo): <slug> 4-signal attack (+answer-box +faq +authority-link)\`
5. 写入 docs/geo-attack-log.md (改前/改后 GEO 分 0-10)

【输出】≤ 1200 字符:
## ${client.name} GEO 攻占
- 目标页: <url>
- 改前 GEO 分: X/10
- 改后 GEO 分: Y/10 (target ≥ 8)
- 信号补全: <列表>
- commit: <hash>
- 部署 / IndexNow / URL Inspection: ✅/❌

直接做完, 不要列计划.`;
}

main().catch(e => { console.error('顶层异常', e); process.exit(1); });

#!/usr/bin/env node
/**
 * HARO/Qwoted 批量草稿触发器 — 跨客户合计每周 ≥35 草稿
 *
 * 起源: v10.5 ceiling-kpi-scanner 发现 HARO 长期 0 产出 (本周 0/35 critical).
 *      .claude/skills/digital-pr.md + scripts/haro-draft-generator.mjs 已存在但无 cron.
 *      本脚本接 cron + 反向触发, 让"Digital PR"能力真跑.
 *
 * 调用:
 *   node haro-batch-trigger.mjs               # 默认跑 1 批 (5 草稿, 跨客户分配)
 *   node haro-batch-trigger.mjs --count 10    # 跑 10 草稿
 *   node haro-batch-trigger.mjs --dry-run     # 干跑
 *
 * cron: 建议 `30 1 * * 1-5` (UTC 周一-五 01:30 = 北京 09:30)
 *      让每天平均产出 ~5 草稿, 周末不跑 (HARO 周末记者活跃度低)
 */

import { writeFileSync, mkdirSync } from 'fs';
import { loadStdEnv, callClaude, pushOne, parseArgs, WEB_OPS_CLIENTS, todayISO } from './trigger-common.mjs';

loadStdEnv();

const REPORT_DIR = '${WORKSPACE_ROOT}/智能体/运营/网站运营-web-ops/reports';
const PER_RUN_MAX_TURNS = 50;
const TIMEOUT_MS = 1200000; // 20 min

async function main() {
  const ARGS = parseArgs();
  const args = process.argv.slice(2);
  const countArg = args.indexOf('--count');
  const draftCount = countArg >= 0 ? parseInt(args[countArg + 1], 10) : 5;
  const date = todayISO();

  console.log(`[haro-batch] ${date} 启动 — 目标 ${draftCount} 草稿`);

  if (ARGS.dryRun) {
    console.log('[haro-batch] dry-run, 不真跑');
    process.exit(0);
  }

  const t0 = Date.now();
  let result;
  try {
    result = await callClaude(buildPrompt(date, draftCount), {
      maxTurns: PER_RUN_MAX_TURNS,
      timeoutMs: TIMEOUT_MS,
      tag: 'haro-batch',
    });
    console.log(`[haro-batch] ✅ 完成 (${Math.round((Date.now()-t0)/1000)}s)`);
  } catch (err) {
    console.error(`[haro-batch] ❌ 失败:`, err.message.slice(0, 200));
    if (!ARGS.noPush) await pushOne(`🔴 HARO 批量触发失败 ${date}: ${err.message.slice(0, 200)}`);
    process.exit(1);
  }

  // 落盘
  mkdirSync(REPORT_DIR, { recursive: true });
  writeFileSync(`${REPORT_DIR}/haro-batch-${date}.txt`, result);

  // 推一段精简
  if (!ARGS.noPush) {
    const summary = `# 🔗 HARO 批量草稿 ${date}\n\n${result.slice(0, 3500)}`;
    await pushOne(summary);
  }

  process.exit(0);
}

function buildPrompt(date, count) {
  const clientList = WEB_OPS_CLIENTS.map(c => `- ${c.name} (${c.id} / ${c.domain})`).join('\n');
  return `今天 ${date}, 跑 HARO/Qwoted 批量草稿生成 — 目标 ${count} 个高质量草稿.

【背景】
- v10.5 ceiling-kpi-scanner 检测到本周 HARO 草稿 critical (0/35), 顶级团队 Digital PR 维度长期空白
- haro-draft-generator.mjs (web-ops/scripts/) + .claude/skills/digital-pr.md 已存在
- 4 客户 expertise pack 模板:
${clientList}

【流程】严格按 .claude/skills/digital-pr.md HARO 2025 范式跑:
1. 跑 mcp__brightdata__search_engine 搜近 24h "haro request" / "qwoted request" / "expert wanted" 行业相关查询
   - 主搜词: "manufacturing expert wanted" / "B2B procurement expert" / "industrial supplier interview"
   - 行业词: "EPS foam expert" / "PVA glue expert" / "PU foam refrigerator expert" / "hearing protection expert"
2. 筛 Top ${count} 最匹配 (行业 + deadline ≤ 48h + 媒体权威)
3. 每个草稿走 .claude/skills/digital-pr.md 模板:
   - 3 段 (问题答案 / 数据支撑 / 可引用金句) 共 150-250 词
   - Quotable 信号 (具体数字 / 反直觉 / 经验年数 / 案例)
   - 反 AI 味道 (避免 "in today's competitive landscape" 等 GPT 套话)
4. 草稿落盘到客户对应目录:
   - 每客户 docs/haro-drafts/${date}-<haro-id>.md
   - 客户匹配按行业关键词 (EPS → client-B, PU → client-B2, PVA → client-D, hearing → client-A)
5. git commit \`feat(haro): batch ${date} +N drafts\` (如有改动)

【输出】≤ 1500 字符:
## 🔗 HARO 批量草稿 ${date}
- 搜索查询: <列表>
- 候选 Top ${count}: <媒体名 / 主题 / 客户匹配>
- 草稿写入: <文件路径列表>
- 评分通过 (≥80): <数量>
- commit: <hash>

直接做完, 不要列计划.`;
}

main().catch(e => { console.error('顶层异常', e); process.exit(1); });

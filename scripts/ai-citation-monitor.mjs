#!/usr/bin/env node
/**
 * AI 引用监控器 (v10.2 batch7) — 真激活 AI/GEO 能力域 P9
 *
 * 起源: ai-citation-monitor skill 写了但 0 实战. 顶级 GEO 团队特征 = 量化"客户被 AI 搜索引用次数".
 *      技术实现: 用 GA4 referrer 数据过滤 AI 来源, 不需要爬 Perplexity/ChatGPT(它们反爬严).
 *      逻辑: 用户在 AI 搜索看到引用客户站点击进入 → GA4 记录 referrer = perplexity.ai 等.
 *
 * 检测 AI 搜索来源:
 * - perplexity.ai / pplx.ai
 * - chat.openai.com / chatgpt.com (ChatGPT Web/Search)
 * - bing.com (Bing Copilot, 但要看 medium 是否 chat)
 * - gemini.google.com / aistudio.google.com (Gemini)
 * - claude.ai
 * - you.com / phind.com / kagi.com (其他 AI 搜索)
 * - duckduckgo.com (DuckAssist)
 * - brave.com (Brave AI)
 *
 * 用法:
 *   node ai-citation-monitor.mjs [--client <id>] [--days 30]
 *
 * 输出:
 *   每客户 AI 来源会话数 + 着陆页分布 + 趋势
 *   写入: 客户/<X>/website/docs/ai-citation-<YYYY-MM>.json
 *
 * 集成: daily-cron 周日段调用 (周维度复盘 AI 引用情况)
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const CLIENT_DIRS = {
  'client-A':    '${WORKSPACE_ROOT}/客户/Demo-D-client-A',
  'client-B':    '${WORKSPACE_ROOT}/客户/Demo-C-client-B',
  'client-B2':   '${WORKSPACE_ROOT}/客户/Demo-A-client-B2',
  'client-D':    '${WORKSPACE_ROOT}/客户/Demo-B-client-D',
};

const CLIENT_DOMAINS = {
  'client-A':    'hearingprotect.com',
  'client-B':    'demo-c.com',
  'client-B2':   'demo-a.com',
  'client-D':    'demo-b.com',
};

// AI 搜索来源黑名单 (referrer 含这些 = AI citation)
const AI_SOURCES = [
  { pattern: /perplexity\.ai|pplx\.ai/i, label: 'Perplexity' },
  { pattern: /chat\.openai\.com|chatgpt\.com/i, label: 'ChatGPT' },
  { pattern: /gemini\.google\.com|aistudio\.google\.com/i, label: 'Gemini' },
  { pattern: /claude\.ai/i, label: 'Claude' },
  { pattern: /you\.com/i, label: 'You.com' },
  { pattern: /phind\.com/i, label: 'Phind' },
  { pattern: /kagi\.com/i, label: 'Kagi' },
  { pattern: /duckduckgo\.com/i, label: 'DuckAssist' },
  { pattern: /brave\.com/i, label: 'Brave Search' },
  // bing.com 单独判断: 普通搜索很多, 只算明确含 chat / copilot 的
  { pattern: /bing\.com.*(chat|copilot)/i, label: 'Bing Copilot' },
];

const args = process.argv.slice(2);
const get = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const ARGS = {
  client: get('--client'),
  days: parseInt(get('--days') || '30', 10),
};

main();

function main() {
  const today = new Date().toISOString().slice(0, 10);
  const targets = ARGS.client ? [ARGS.client] : Object.keys(CLIENT_DIRS);

  console.log(`=== AI 引用监控 (近 ${ARGS.days} 天) ${today} ===\n`);

  // 注意: 此脚本是**框架**, 真实数据需要通过 search-analytics MCP 调 ga4_traffic_sources
  //       由 Claude 在 daily-cron 周日段调用本脚本时, 先用 MCP 拉数据, 再 pipe 给本脚本分析
  //       或者: 客户 docs/ga4-referrers-<日期>.json 已存在时, 直接读
  //
  // 当前 MVP: 输出"指引 + 分析框架", 让 Claude 知道如何接 MCP 数据
  //          下一步 v2: 加 stdin 模式, 接受 MCP JSON 数据 → 自动分析

  for (const client of targets) {
    const dir = CLIENT_DIRS[client];
    if (!dir) { console.log(`❌ ${client}: 不在名单`); continue; }
    const domain = CLIENT_DOMAINS[client];
    console.log(`📊 ${client} (${domain})`);

    // 检查是否有预拉的 GA4 referrer 数据
    const refDataPath = join(dir, 'website/docs', `ga4-referrers-${today}.json`);
    if (!existsSync(refDataPath)) {
      console.log(`  ⏳ 待拉 GA4 referrer 数据: 调 search-analytics.ga4_traffic_sources days=${ARGS.days}`);
      console.log(`     存到 ${refDataPath} 后重跑此脚本`);
      console.log(`     格式: [{"source": "perplexity.ai", "sessions": 5, "conversions": 1, ...}, ...]`);
      console.log('');
      continue;
    }

    try {
      const refData = JSON.parse(require('fs').readFileSync(refDataPath, 'utf8'));
      analyzeAICitations(client, domain, refData, dir, today);
    } catch (e) {
      console.log(`  ❌ 读 ${refDataPath} 失败: ${e.message}`);
    }
    console.log('');
  }

  console.log('---');
  console.log('集成入口: daily-cron 周日段先用 MCP 拉 referrer 数据 → 写入文件 → 跑本脚本分析');
  console.log('原始 referrer 文件可保留 7 天后清理 (不入 git, .gitignore 规则: docs/ga4-referrers-*.json)');
}

function analyzeAICitations(client, domain, refData, clientDir, today) {
  const aiHits = [];
  let totalAISessions = 0;

  for (const row of refData) {
    const source = row.source || row.sessionSource || row.referrer || '';
    const sessions = parseInt(row.sessions || row.totalUsers || 0, 10);
    const matchedAI = AI_SOURCES.find(ai => ai.pattern.test(source));
    if (matchedAI) {
      aiHits.push({ source, ai: matchedAI.label, sessions, conversions: row.conversions || 0 });
      totalAISessions += sessions;
    }
  }

  if (aiHits.length === 0) {
    console.log(`  📊 0 AI 来源会话 (近 ${ARGS.days} 天)`);
    console.log(`  💡 行动: 强化 GEO 信号 (答案胶囊 / FAQ JSON-LD / 权威外链 / 定义性语句)`);
    return;
  }

  console.log(`  📊 ${totalAISessions} AI 来源会话 (${aiHits.length} 个 AI 平台)`);
  // 按 AI 平台分组
  const byPlatform = {};
  aiHits.forEach(h => {
    if (!byPlatform[h.ai]) byPlatform[h.ai] = { sessions: 0, conversions: 0 };
    byPlatform[h.ai].sessions += h.sessions;
    byPlatform[h.ai].conversions += h.conversions;
  });
  Object.entries(byPlatform).sort((a, b) => b[1].sessions - a[1].sessions).forEach(([platform, data]) => {
    console.log(`    ${platform}: ${data.sessions} 会话 / ${data.conversions} 转化`);
  });

  // 写月度 JSON 报告
  const monthSlug = today.slice(0, 7);
  const reportPath = join(clientDir, 'website/docs', `ai-citation-${monthSlug}.json`);
  writeFileSync(reportPath, JSON.stringify({
    client, domain, generated_at: today, days: ARGS.days,
    total_ai_sessions: totalAISessions, by_platform: byPlatform, raw_hits: aiHits,
  }, null, 2));
  console.log(`  ✅ 写入 ${reportPath}`);
}

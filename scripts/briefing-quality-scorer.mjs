#!/usr/bin/env node
/**
 * 客户日报质量评分器 (v10.2 batch6) — 防产出退化
 *
 * 起源: 智能体输出客户日报数量上去了 (4-27 4 客户每天 1 篇), 但没自动评分,
 *      未来可能出现"格式正确但价值低"的退化. quality gate 是顶级运营团队的标配.
 *
 * 评分维度 (100 分制):
 * - 数据完整度 25 分: GSC 7 天 / GA4 24h / 索引状态 / SSL 状态
 * - 行动可执行性 25 分: ≥ 3 项今日执行 / 每项含"预期效果"
 * - 客户语言 25 分: 第二人称 ≥ 5 次 / 禁内部术语未脱壳
 * - 排期清晰度 25 分: 含"明天/本周/接下来"段
 *
 * 阈值: ≥ 80 通过 / 60-79 警告 / < 60 红字"待人工审"
 *
 * 用法:
 *   node briefing-quality-scorer.mjs <briefing-file-path>
 *   node briefing-quality-scorer.mjs --client demo-c --date 2026-04-27
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const CLIENT_DIRS = {
  demo-c:        '${WORKSPACE_ROOT}/客户/Demo-C-client-B',
  'client-B':    '${WORKSPACE_ROOT}/客户/Demo-C-client-B',
  demo-a:        '${WORKSPACE_ROOT}/客户/Demo-A-client-B2',
  'client-B2':   '${WORKSPACE_ROOT}/客户/Demo-A-client-B2',
  demo-b:        '${WORKSPACE_ROOT}/客户/Demo-B-client-D',
  'client-D':    '${WORKSPACE_ROOT}/客户/Demo-B-client-D',
  demo-a:  '${WORKSPACE_ROOT}/客户/Demo-D-client-A',
  'client-A':    '${WORKSPACE_ROOT}/客户/Demo-D-client-A',
};

// 内部术语黑名单 (出现 = 客户语言扣分)
const INTERNAL_JARGON = [
  'GSC', 'GA4', 'IndexNow', 'sitemap.xml', 'robots.txt',
  'CTR 引擎', '选题池', '竞品雷达', 'pending-tasks',
  'A 级', 'B 级', 'C 级', 'zero-touch',
  '12 阶段', 'pillar', 'spoke', 'topic cluster',
  'commit', 'IndexNow API', 'JSON-LD', 'Schema',
];

// 客户友好替代词 (映射检查)
const FRIENDLY_TERMS = [
  /Google.{0,5}(?:搜索|展示)/, /Bing/, /索引/, /关键词/, /排名/,
  /您|你|贵公司/,  // 第二人称
];

// ============================================================
// CLI
// ============================================================
const args = process.argv.slice(2);
let filePath;
const clientIdx = args.indexOf('--client');
const dateIdx = args.indexOf('--date');
if (clientIdx >= 0 && dateIdx >= 0) {
  const client = args[clientIdx + 1];
  const date = args[dateIdx + 1];
  if (CLIENT_DIRS[client]) {
    filePath = join(CLIENT_DIRS[client], 'website/docs', `client-briefing-${date}.md`);
  }
} else if (args[0] && !args[0].startsWith('--')) {
  filePath = args[0];
}

if (!filePath || !existsSync(filePath)) {
  console.error('用法: node briefing-quality-scorer.mjs <file>');
  console.error('     或: node briefing-quality-scorer.mjs --client <id> --date 2026-04-27');
  console.error(`(filePath: ${filePath || '(未提供)'})`);
  process.exit(1);
}

main(filePath);

function main(filePath) {
  const content = readFileSync(filePath, 'utf8');
  // 检测发酵期: 文件本身有"发酵期"标记, 或客户站 .git 上线时间 ≤ 30 天
  const isFermenting = detectFermenting(content, filePath);
  const result = scoreContent(content, filePath, { isFermenting });
  printReport(result);

  // 退出码: ≥80=0 / 60-79=1 / <60=2
  if (result.total >= 80) process.exit(0);
  if (result.total >= 60) process.exit(1);
  process.exit(2);
}

// 发酵期检测: 文件含"发酵期"关键词 / 客户站首次 commit ≤ 30 天前
function detectFermenting(content, filePath) {
  if (/发酵期|新域名|新站|刚上线|刚迁移/.test(content)) return true;
  // 试图从 filePath 找客户站 git 路径
  const m = filePath.match(/客户\/([^/]+)/);
  if (!m) return false;
  try {
    const clientRoot = `${WORKSPACE_ROOT}/客户/${m[1]}`;
    const out = require('child_process').execSync(
      `git -C "${clientRoot}" log --reverse --pretty=format:"%at" 2>/dev/null | head -1`,
      { encoding: 'utf8' }
    ).trim();
    if (!out) return false;
    const firstCommitTs = parseInt(out, 10) * 1000;
    const ageDays = (Date.now() - firstCommitTs) / 86400000;
    return ageDays <= 30;
  } catch {
    return false;
  }
}

// ============================================================
// 评分核心
// ============================================================
function scoreContent(content, filePath, opts = {}) {
  const result = {
    filePath,
    chars: content.length,
    breakdown: {},
    issues: [],
    total: 0,
    fermenting: opts.isFermenting || false,
  };

  // ---- 维度 1: 数据完整度 (25 分) ----
  // 发酵期(≤ 30 天上线): GSC/GA4 数据缺失不扣分,但要求显式标记"发酵期数据少属正常"
  let dataScore = 0;
  const dataChecks = [
    { name: 'GSC 7 天展示数据', re: /\b\d+\s*次?展示|展示\s*\d+|imp\b/i, weight: 7, fermentExempt: true },
    { name: 'GA4 24h 数据', re: /\b\d+\s*会话|会话\s*\d+|\b\d+\s*用户|用户\s*\d+|访客\s*\d+/i, weight: 6, fermentExempt: true },
    { name: '索引/可用状态', re: /HTTP\s*200|可访问|正常|网站访问/i, weight: 6 },
    { name: 'SSL 证书', re: /SSL|证书|加密/i, weight: 6 },
  ];
  dataChecks.forEach(c => {
    if (c.re.test(content)) {
      dataScore += c.weight;
    } else if (opts.isFermenting && c.fermentExempt) {
      // 发酵期: 自动给满分(条件: 文件须显式标"发酵期"否则不豁免)
      if (/发酵期/.test(content)) {
        dataScore += c.weight;
        result.issues.push(`(发酵期豁免) ${c.name} 缺失但已标"发酵期"`);
      } else {
        result.issues.push(`数据维度缺失: ${c.name} (发酵期但未标"发酵期"说明)`);
      }
    } else {
      result.issues.push(`数据维度缺失: ${c.name}`);
    }
  });
  result.breakdown['数据完整度'] = `${dataScore}/25`;

  // ---- 维度 2: 行动可执行性 (25 分) ----
  let actionScore = 0;
  // 今日执行清单 (≥ 3 项 = 满)
  const executedItems = (content.match(/^\s*\|.*✅/gm) || []).length;
  if (executedItems >= 3) actionScore += 12;
  else if (executedItems >= 1) actionScore += 6;
  else result.issues.push('今日执行清单 < 1 项');

  // 每项是否含"预期效果"或"为了...".
  if (/预期效果|为了|目的是|作用|帮助您|提升/i.test(content)) actionScore += 13;
  else result.issues.push('行动缺"预期效果"说明');

  result.breakdown['行动可执行性'] = `${actionScore}/25`;

  // ---- 维度 3: 客户语言 (25 分) ----
  let langScore = 25;
  // 第二人称密度
  const youCount = (content.match(/您|你的网站|贵公司|贵站/g) || []).length;
  if (youCount < 3) {
    langScore -= 8;
    result.issues.push(`第二人称密度不足 (${youCount} 次, 期望 ≥ 3)`);
  } else if (youCount < 5) {
    langScore -= 4;
  }

  // 内部术语黑名单
  const jargonHits = INTERNAL_JARGON.filter(term => {
    // 必须是孤立出现 (不在已脱壳上下文里)
    const re = new RegExp(`(?<![\\w\\u4e00-\\u9fa5])${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w\\u4e00-\\u9fa5])`, 'g');
    return re.test(content);
  });
  if (jargonHits.length > 0) {
    const penalty = Math.min(jargonHits.length * 3, 15);
    langScore -= penalty;
    result.issues.push(`内部术语未脱壳: ${jargonHits.slice(0, 5).join(', ')}${jargonHits.length > 5 ? ' ...' : ''}`);
  }

  langScore = Math.max(0, langScore);
  result.breakdown['客户语言'] = `${langScore}/25`;

  // ---- 维度 4: 排期清晰度 (25 分) ----
  let scheduleScore = 0;
  if (/明天|明日/.test(content)) scheduleScore += 8;
  if (/本周|这周/.test(content)) scheduleScore += 8;
  if (/接下来|下周|本月|预计/.test(content)) scheduleScore += 9;
  if (scheduleScore < 17) result.issues.push('排期段不完整 (缺明天/本周/接下来)');
  result.breakdown['排期清晰度'] = `${scheduleScore}/25`;

  // ---- 总分 ----
  result.total = dataScore + actionScore + langScore + scheduleScore;
  result.verdict = result.total >= 80 ? '✅ 通过 (可直接发客户)'
    : result.total >= 60 ? '⚠️ 警告 (建议人工微调)'
    : '🔴 待人工审 (低于阈值)';

  return result;
}

function printReport(r) {
  console.log(`\n=== 客户日报质量评分 ===`);
  console.log(`文件: ${r.filePath}`);
  console.log(`字数: ${r.chars}`);
  console.log('');
  Object.entries(r.breakdown).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
  console.log('');
  console.log(`总分: ${r.total}/100`);
  console.log(`判定: ${r.verdict}`);
  if (r.issues.length > 0) {
    console.log('\n问题:');
    r.issues.forEach(i => console.log(`  - ${i}`));
  }
  console.log('');
}

#!/usr/bin/env node
/**
 * 月度天花板能力评分报告 — 每月 1 号跑, 评估上月 6 域达成度
 *
 * 起源: v10.5 ceiling-kpi-scanner 是日级缺口扫描, 但缺月度汇总让运营人员"30 秒看真账".
 *      与 case-study-monthly (按 commit 分类归集) 互补 — 那个看"做了什么", 这个看"达成多少 vs 顶级团队目标".
 *
 * 调用:
 *   node monthly-ceiling-report.mjs              # 评估上个月 (默认)
 *   node monthly-ceiling-report.mjs --month 2026-04
 *
 * cron: 建议每月 1 号 02:00 UTC = 北京 10:00 (case-study-monthly 09:00 跑完后)
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { loadStdEnv, pushOne, WEB_OPS_CLIENTS } from './trigger-common.mjs';

// v10.5+1 (5-01): phase 标识从 ceiling-kpi-scanner.CLIENTS 拿 — fermenting 客户评分豁免月度 3 域
import { CLIENTS as CEILING_CLIENTS } from './ceiling-kpi-scanner.mjs';
const PHASE_BY_ID = Object.fromEntries(CEILING_CLIENTS.map(c => [c.id, c.phase || 'mature']));

loadStdEnv();

const REPORT_DIR = '${WORKSPACE_ROOT}/智能体/运营/网站运营-web-ops/reports';
const ARCHIVE_DIR = '${WORKSPACE_ROOT}/智能体/运营/网站运营-web-ops/案例库/月度天花板评分';

function parseArgs() {
  const a = process.argv.slice(2);
  const get = (n) => { const i = a.indexOf(n); return i >= 0 ? a[i + 1] : null; };
  return {
    month: get('--month'),
    noPush: a.includes('--no-push'),
  };
}

function lastMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  d.setMonth(d.getMonth() - 1);
  return d;
}

function fmtMonth(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function lastDayOfMonth(d) {
  const next = new Date(d);
  next.setMonth(next.getMonth() + 1);
  next.setDate(0);
  return next;
}

function countGitMatches(repoPath, sinceISO, untilISO, patterns) {
  if (!repoPath || !existsSync(`${repoPath}/.git`)) return 0;
  try {
    const log = execSync(
      `git -C "${repoPath}" log --since="${sinceISO} 00:00" --until="${untilISO} 23:59" --pretty=format:"%s" 2>/dev/null`,
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
    ).toString().trim();
    if (!log) return 0;
    const re = new RegExp(patterns.join('|'), 'i');
    return log.split('\n').filter(line => re.test(line)).length;
  } catch { return 0; }
}

const PATTERNS = {
  blog:    ['^feat\\(blog\\)', '^feat\\(content\\)', '^content:\\s*发布博客'],
  refresh: ['^feat\\(refresh\\)'],
  ctr:     ['^ctr\\(', '^feat\\(ctr', '^fix\\(ctr'],
  schema:  ['^feat\\(schema', '^schema:'],
  geo:     ['^feat\\(geo', '^geo:', 'GEO 攻占'],
  internalLink: ['^feat\\(internal-link', 'internal-link'],
  haro:    ['^feat\\(haro', 'HARO', 'Qwoted'],
  cro:     ['^feat\\(cro', 'CRO 实验'],
  analytics: ['^feat\\(analytics', '^feat\\(looker', '^feat\\(cohort'],
};

function scoreClient(client, sinceISO, untilISO) {
  const repoPath = client.repoPath;
  const phase = PHASE_BY_ID[client.id] || 'mature';
  const isFerm = phase === 'fermenting';
  const counts = {};
  for (const [k, p] of Object.entries(PATTERNS)) {
    counts[k] = countGitMatches(repoPath, sinceISO, untilISO, p);
  }

  // v10.5+1 phase-aware 月度目标
  // mature: blog 8 / geo 1 / cro 1 / analytics 1 (满量)
  // fermenting: blog 4 (减半, 发酵期建立基线) / geo cro analytics 豁免不评分
  const targets = isFerm
    ? { blog: 4, haro: 0, geo: null, cro: null, analytics: null }
    : { blog: 8, haro: 0, geo: 1, cro: 1, analytics: 1 };

  // v10.5+1 phase-aware 加权:
  // mature: Content 40 / GEO 20 / CRO 20 / Analytics 20 = 100
  // fermenting: Content 100 (其他 3 域豁免, 全权重压在博客建基线)
  const blogScore = Math.min(100, (counts.blog + counts.refresh) / targets.blog * 100) * (isFerm ? 1.0 : 0.4);
  const geoScore = isFerm ? null : Math.min(100, counts.geo / targets.geo * 100) * 0.2;
  const croScore = isFerm ? null : Math.min(100, counts.cro / targets.cro * 100) * 0.2;
  const analyticsScore = isFerm ? null : Math.min(100, counts.analytics / targets.analytics * 100) * 0.2;
  const total = Math.round(blogScore + (geoScore || 0) + (croScore || 0) + (analyticsScore || 0));

  return {
    client,
    phase,
    isFerm,
    counts,
    scores: { blog: blogScore, geo: geoScore, cro: croScore, analytics: analyticsScore, total },
    targets,
  };
}

function renderReport(monthStr, perClient, totalAcrossClients) {
  const lines = [];
  lines.push(`# 🎯 ${monthStr} 月度天花板能力评分报告`);
  lines.push('');
  lines.push(`v10.5 ceiling-monthly · ${new Date().toISOString().slice(0, 10)} 生成`);
  lines.push('');
  lines.push(`## 总览 (4 客户加权平均)`);
  lines.push('');
  lines.push(`**${totalAcrossClients}/100** ${totalAcrossClients >= 70 ? '✅' : totalAcrossClients >= 50 ? '⚠️' : '🔴'}`);
  lines.push('');
  lines.push(`*60 分 = 巡检维护正常水平 / 70 分 = 顶级团队入门 / 85 分 = 顶级团队稳定输出*`);
  lines.push('');

  lines.push(`## 客户明细`);
  lines.push('');
  lines.push('| 客户 | phase | 总分 | 博客 | GEO | CRO | Analytics | 真实数 |');
  lines.push('|---|---|---|---|---|---|---|---|');
  for (const r of perClient) {
    const c = r.counts;
    const s = r.scores;
    const counts = `B${c.blog + c.refresh}/G${c.geo}/CRO${c.cro}/A${c.analytics}`;
    const phaseTag = r.isFerm ? '🌱 发酵期' : '🌳 成熟期';
    const blogCol = r.isFerm
      ? `${Math.round(s.blog)} (满分100, B${c.blog + c.refresh}/4)`
      : `${Math.round(s.blog)} (40, B${c.blog + c.refresh}/8)`;
    const geoCol = r.isFerm ? '🌱 豁免' : `${Math.round(s.geo)} (20)`;
    const croCol = r.isFerm ? '🌱 豁免' : `${Math.round(s.cro)} (20)`;
    const anCol = r.isFerm ? '🌱 豁免' : `${Math.round(s.analytics)} (20)`;
    lines.push(`| ${r.client.name} | ${phaseTag} | **${Math.round(s.total)}** | ${blogCol} | ${geoCol} | ${croCol} | ${anCol} | ${counts} |`);
  }
  lines.push('');
  lines.push('**说明**: 🌱 发酵期 (≤30 天上线) 全权重压在"博客建基线" (满分 100, 目标 4 篇/月减半); 🌳 成熟期 4 维加权 (40/20/20/20).');
  lines.push('');

  // HARO 全局
  const haroTotal = perClient.reduce((sum, r) => sum + r.counts.haro, 0);
  const haroTarget = 35 * 4; // 每周 35 × 4 周
  lines.push(`## HARO / Digital PR (跨客户合计)`);
  lines.push('');
  lines.push(`本月草稿数: **${haroTotal}** / 目标 **${haroTarget}** (${Math.round(haroTotal / haroTarget * 100)}%)`);
  lines.push('');

  // 教训段 (phase-aware: fermenting 客户阈值 < 50, mature < 50)
  lines.push(`## 月度教训`);
  lines.push('');
  const lowScorers = perClient.filter(r => r.scores.total < 50);
  if (lowScorers.length > 0) {
    lines.push(`🔴 **低分客户 (<50): ${lowScorers.map(r => `${r.client.name}${r.isFerm ? '(🌱)' : ''}`).join(', ')}**`);
    for (const r of lowScorers) {
      const gaps = [];
      const blogGap = r.targets.blog;
      const blogActual = r.counts.blog + r.counts.refresh;
      if (r.isFerm) {
        // fermenting: 只看博客
        if (blogActual < blogGap * 0.5) gaps.push(`博客 ${blogActual}/${blogGap} (发酵期目标减半, 仍未达半)`);
      } else {
        if (r.scores.blog < 20) gaps.push(`博客 ${blogActual}/${blogGap} 严重不足`);
        if (r.scores.geo < 10) gaps.push('GEO 月度未达成');
        if (r.scores.cro < 10) gaps.push('CRO 月度未达成');
        if (r.scores.analytics < 10) gaps.push('Analytics 月度未达成');
      }
      if (gaps.length) lines.push(`- ${r.client.name}: ${gaps.join(' / ')}`);
    }
    lines.push('');
  } else {
    lines.push('✅ 所有客户均达基础水平');
  }

  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(`数据源: 各客户 git repo 月度 commit, 与 case-study-monthly 互补 (那个看做了什么, 这个看达成多少)`);

  return lines.join('\n');
}

async function main() {
  const ARGS = parseArgs();
  let target;
  if (ARGS.month) {
    const [y, m] = ARGS.month.split('-').map(Number);
    target = new Date(y, m - 1, 1);
  } else {
    target = lastMonth();
  }
  const monthStr = fmtMonth(target);
  const sinceISO = `${monthStr}-01`;
  const untilISO = lastDayOfMonth(target).toISOString().slice(0, 10);

  console.log(`[monthly-ceiling] 评估 ${monthStr} (${sinceISO} ~ ${untilISO})`);

  const perClient = WEB_OPS_CLIENTS.map(c => scoreClient(c, sinceISO, untilISO));
  const total = Math.round(perClient.reduce((s, r) => s + r.scores.total, 0) / perClient.length);

  const report = renderReport(monthStr, perClient, total);

  // 落盘 + 归档
  mkdirSync(REPORT_DIR, { recursive: true });
  mkdirSync(ARCHIVE_DIR, { recursive: true });
  writeFileSync(`${REPORT_DIR}/monthly-ceiling-${monthStr}.md`, report);
  writeFileSync(`${ARCHIVE_DIR}/${monthStr}.md`, report);
  console.log(`[monthly-ceiling] 报告写入: ${ARCHIVE_DIR}/${monthStr}.md`);

  // 推企微 (短版, 用于运营人员"30 秒看真账")
  if (!ARGS.noPush) {
    const short = `# 🎯 ${monthStr} 天花板评分\n\n**${total}/100** ${total >= 70 ? '✅' : total >= 50 ? '⚠️' : '🔴'}\n\n` +
      perClient.map(r => {
        const tag = r.isFerm ? '🌱' : '🌳';
        if (r.isFerm) {
          return `${tag} **${r.client.name}**: ${Math.round(r.scores.total)}/100 — 博客 ${r.counts.blog + r.counts.refresh}/${r.targets.blog} (发酵期减半目标, 其他 3 域豁免)`;
        }
        return `${tag} **${r.client.name}**: ${Math.round(r.scores.total)}/100 — 博客 ${r.counts.blog + r.counts.refresh}/8 / GEO ${r.counts.geo}/1 / CRO ${r.counts.cro}/1 / Analytics ${r.counts.analytics}/1`;
      }).join('\n');
    await pushOne(short);
  }
}

main().catch(e => { console.error('顶层异常', e); process.exit(1); });

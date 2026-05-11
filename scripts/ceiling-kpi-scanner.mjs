#!/usr/bin/env node
/**
 * 天花板能力 KPI 缺口扫描器 — 顶级运营团队 6 域日扫
 * ================================================================
 * v1.0 (2026-05-01)
 *
 * 核心理念：智能体能稳定完成「巡检 + Schema 修补」是因为这俩有 cron 调度,
 * 5 大天花板能力 (Content/HARO/GEO/CRO/Analytics) 一直没产出是因为:
 *   ① 没有缺口监控 — 智能体不知道本周博客欠 8 篇
 *   ② 没有反向触发 — 即使知道也没 cron 把它转成动作
 *   ③ 没有进 prompt — daily-cron 不告知缺口, 智能体被 Schema 巡检拐走
 *
 * 本脚本职责:
 *   - 每日扫每客户当周 / 当月 git log + 文件
 *   - 对照 ceiling-targets.json 算缺口 (实际 / 目标 / 进度% / 严重度)
 *   - 输出 JSON (机器读) + markdown (人读 + prompt 注入)
 *
 * 调用:
 *   node ceiling-kpi-scanner.mjs                         # 全部输出 markdown
 *   node ceiling-kpi-scanner.mjs --json                  # JSON only
 *   node ceiling-kpi-scanner.mjs --gaps                  # 仅 gap 段 (prompt 注入用)
 *   node ceiling-kpi-scanner.mjs --client client-B     # 单客户
 *   node ceiling-kpi-scanner.mjs --client client-B --gaps  # 单客户缺口段
 *
 * 输出落盘:
 *   reports/ceiling-${date}.json   (供 daily-cron / pm2-health 读)
 *   reports/ceiling-${date}.md     (人读)
 *   reports/ceiling-latest.json    (始终最新)
 * ================================================================
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TARGETS_PATH = join(__dirname, 'ceiling-targets.json');
const REPORT_DIR = '${WORKSPACE_ROOT}/智能体/运营/网站运营-web-ops/reports';

// ============================================================
// 管辖客户 (与 daily-cron.mjs WEB_OPS_CLIENTS 对齐 — 真在运营的 Astro 站)
// ============================================================
const CLIENTS = [
  { id: 'client-A',  name: 'Demo-D',    domain: 'demo-a.com', repoPath: '${WORKSPACE_ROOT}/客户/Demo-D-client-A',     phase: 'fermenting' },
  { id: 'client-B',  name: 'Demo-C',   domain: 'demo-c.com',       repoPath: '${WORKSPACE_ROOT}/客户/Demo-C-client-B',     phase: 'mature' },
  { id: 'client-B2', name: 'Demo-A',  domain: 'demo-a.com',       repoPath: '${WORKSPACE_ROOT}/客户/Demo-A-client-B2',  phase: 'fermenting' },
  { id: 'client-D',  name: 'Demo-B',    domain: 'demo-b.com',       repoPath: '${WORKSPACE_ROOT}/客户/Demo-B-client-D',     phase: 'mature' },
  // WP 站 client-A-eastragonltd 不进 KPI 追踪 (轻巡检, 不适用 A 级)
];

// ============================================================
// 时间窗口工具
// ============================================================
function todayISO() { return new Date().toISOString().slice(0, 10); }

function weekStart(date = new Date()) {
  // ISO 周: 周一开始
  const d = new Date(date);
  const dow = d.getDay();
  const offset = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + offset);
  d.setHours(0, 0, 0, 0);
  return d;
}

function monthStart(date = new Date()) {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dowToday() { return new Date().getDay() === 0 ? 7 : new Date().getDay(); } // 周一=1, 周日=7
function domToday() { return new Date().getDate(); }

function fmtDate(d) { return d.toISOString().slice(0, 10); }

// ============================================================
// git log 计数器 (匹配 commitPatterns)
// ============================================================
function countGitMatches(repoPath, sinceISO, patterns) {
  if (!repoPath || !existsSync(join(repoPath, '.git'))) return 0;
  try {
    const log = execSync(
      `git -C "${repoPath}" log --since="${sinceISO} 00:00" --pretty=format:"%s" 2>/dev/null`,
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
    ).toString().trim();
    if (!log) return 0;
    const lines = log.split('\n').filter(Boolean);
    const re = new RegExp(patterns.join('|'), 'i');
    return lines.filter(line => re.test(line)).length;
  } catch {
    return 0;
  }
}

// ============================================================
// 文件计数器 (匹配 fileGlobs)
// ============================================================
function countFiles(repoPath, fileGlobs, sinceMs = null) {
  if (!repoPath || !existsSync(repoPath)) return 0;
  let total = 0;
  for (const glob of fileGlobs) {
    // 简单 glob: 取最后一段 / 之前作为目录, 之后作为模式
    const idx = glob.lastIndexOf('/');
    const dirRel = idx >= 0 ? glob.slice(0, idx) : '.';
    const pattern = idx >= 0 ? glob.slice(idx + 1) : glob;
    const candidates = [
      join(repoPath, dirRel),
      join(repoPath, 'website', dirRel),
    ];
    for (const dir of candidates) {
      if (!existsSync(dir)) continue;
      try {
        const files = readdirSync(dir);
        const re = globToRegex(pattern);
        for (const f of files) {
          if (!re.test(f)) continue;
          const full = join(dir, f);
          if (sinceMs !== null) {
            try {
              if (statSync(full).mtimeMs < sinceMs) continue;
            } catch { continue; }
          }
          total++;
        }
      } catch {}
    }
  }
  return total;
}

function globToRegex(pattern) {
  const esc = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.');
  return new RegExp(`^${esc}$`);
}

// ============================================================
// 全局文件计数 (跨客户 — 用于 HARO 这类不分客户的)
// ============================================================
function countGlobalFiles(fileGlobs, sinceMs) {
  let total = 0;
  for (const c of CLIENTS) {
    total += countFiles(c.repoPath, fileGlobs, sinceMs);
  }
  return total;
}

// ============================================================
// 严重度判定
// ============================================================
function severity(progress, isPastHalf) {
  if (progress >= 0.7) return 'info';
  if (progress >= 0.5) return 'warning';
  return isPastHalf ? 'critical' : 'warning';
}

function severityIcon(sev) {
  return { info: '✅', warning: '⚠️', critical: '🔴', 'phase-skip': '🌱' }[sev] || '❓';
}

// ============================================================
// 主扫描逻辑
// ============================================================
function scan(targets, opts = {}) {
  const date = todayISO();
  const ws = weekStart();
  const ms = monthStart();
  const wsISO = fmtDate(ws);
  const msISO = fmtDate(ms);
  const wsMs = ws.getTime();
  const msMs = ms.getTime();
  const dow = dowToday();
  const dom = domToday();
  const weekHalfDay = targets.thresholds?.weekly?.weekHalfDay || 4;
  const monthHalfDay = targets.thresholds?.monthly?.monthHalfDay || 15;
  const isWeekPastHalf = dow >= weekHalfDay;
  const isMonthPastHalf = dom >= monthHalfDay;

  const targetClients = opts.client
    ? CLIENTS.filter(c => c.id === opts.client)
    : CLIENTS;

  const result = {
    date,
    weekStart: wsISO,
    monthStart: msISO,
    dayOfWeek: dow,
    dayOfMonth: dom,
    isWeekPastHalf,
    isMonthPastHalf,
    domains: {},
    perClient: {},
    summary: {
      totalCritical: 0,
      totalWarning: 0,
      criticalDomains: [],
    },
  };

  // ===== Content Strategy (per-client weekly) =====
  const cs = targets.domains.contentStrategy;
  result.domains.contentStrategy = {
    label: cs.label,
    cycle: 'weekly',
    perClient: {},
    weekTarget: cs.weekly.perClient,
  };
  for (const c of targetClients) {
    const actual = countGitMatches(c.repoPath, wsISO, cs.commitPatterns);
    const target = cs.weekly.perClient;
    const progress = target ? actual / target : 1;
    const sev = severity(progress, isWeekPastHalf);
    result.domains.contentStrategy.perClient[c.id] = { actual, target, progress, severity: sev, gap: Math.max(0, target - actual) };
    if (sev === 'critical') result.summary.totalCritical++;
    else if (sev === 'warning') result.summary.totalWarning++;
  }

  // ===== Link Building / HARO (global weekly) =====
  const lb = targets.domains.linkBuilding;
  const haroFileCount = countGlobalFiles(lb.fileGlobs || [], wsMs);
  const haroCommitCount = targetClients.reduce((s, c) => s + countGitMatches(c.repoPath, wsISO, lb.commitPatterns || []), 0);
  const haroActual = Math.max(haroFileCount, haroCommitCount);
  const haroTarget = lb.weekly.global;
  const haroProgress = haroTarget ? haroActual / haroTarget : 1;
  const haroSev = severity(haroProgress, isWeekPastHalf);
  result.domains.linkBuilding = {
    label: lb.label,
    cycle: 'weekly',
    scope: 'global',
    actual: haroActual,
    target: haroTarget,
    progress: haroProgress,
    severity: haroSev,
    gap: Math.max(0, haroTarget - haroActual),
  };
  if (haroSev === 'critical') result.summary.totalCritical++;
  else if (haroSev === 'warning') result.summary.totalWarning++;

  // ============================================================
  // v10.5+1 phase-aware: fermenting 客户 (≤30 天上线) 月度 GEO/CRO/Analytics 豁免
  // 起源: 5-01 实跑发现Demo-D/demo-a 是 fermenting 但仍标 ⚠️ 0/1, 智能体可能被错误引导
  // 规则: fermenting 客户的月度 3 域统一标 severity='phase-skip', 不入 critical/warning 计数
  //       本周博客 (weekly) 不豁免 — 发酵期也要写博客建立基线
  // ============================================================
  const isFerm = (c) => c.phase === 'fermenting';

  // ===== GEO Attack (per-client monthly) =====
  const geo = targets.domains.geoAttack;
  result.domains.geoAttack = {
    label: geo.label,
    cycle: 'monthly',
    perClient: {},
    monthTarget: geo.monthly.perClient,
  };
  for (const c of targetClients) {
    if (isFerm(c)) {
      result.domains.geoAttack.perClient[c.id] = { actual: 0, target: geo.monthly.perClient, progress: 1, severity: 'phase-skip', gap: 0, phase: 'fermenting' };
      continue;
    }
    const actual = countGitMatches(c.repoPath, msISO, geo.commitPatterns);
    const target = geo.monthly.perClient;
    const progress = target ? actual / target : 1;
    const sev = severity(progress, isMonthPastHalf);
    result.domains.geoAttack.perClient[c.id] = { actual, target, progress, severity: sev, gap: Math.max(0, target - actual) };
    if (sev === 'critical') result.summary.totalCritical++;
    else if (sev === 'warning') result.summary.totalWarning++;
  }

  // ===== CRO Experiment (per-client monthly) =====
  const cro = targets.domains.croExperiment;
  result.domains.croExperiment = {
    label: cro.label,
    cycle: 'monthly',
    perClient: {},
    monthTarget: cro.monthly.perClient,
  };
  for (const c of targetClients) {
    if (isFerm(c)) {
      result.domains.croExperiment.perClient[c.id] = { actual: 0, target: cro.monthly.perClient, progress: 1, severity: 'phase-skip', gap: 0, phase: 'fermenting' };
      continue;
    }
    const fileActual = countFiles(c.repoPath, cro.fileGlobs || [], msMs);
    const commitActual = countGitMatches(c.repoPath, msISO, cro.commitPatterns);
    const actual = Math.max(fileActual, commitActual);
    const target = cro.monthly.perClient;
    const progress = target ? actual / target : 1;
    const sev = severity(progress, isMonthPastHalf);
    result.domains.croExperiment.perClient[c.id] = { actual, target, progress, severity: sev, gap: Math.max(0, target - actual) };
    if (sev === 'critical') result.summary.totalCritical++;
    else if (sev === 'warning') result.summary.totalWarning++;
  }

  // ===== Analytics Deep (per-client monthly) =====
  const an = targets.domains.analyticsDeep;
  result.domains.analyticsDeep = {
    label: an.label,
    cycle: 'monthly',
    perClient: {},
    monthTarget: an.monthly.perClient,
  };
  for (const c of targetClients) {
    if (isFerm(c)) {
      result.domains.analyticsDeep.perClient[c.id] = { actual: 0, target: an.monthly.perClient, progress: 1, severity: 'phase-skip', gap: 0, phase: 'fermenting' };
      continue;
    }
    const fileActual = countFiles(c.repoPath, an.fileGlobs || [], msMs);
    const commitActual = countGitMatches(c.repoPath, msISO, an.commitPatterns);
    const actual = Math.max(fileActual, commitActual);
    const target = an.monthly.perClient;
    const progress = target ? actual / target : 1;
    const sev = severity(progress, isMonthPastHalf);
    result.domains.analyticsDeep.perClient[c.id] = { actual, target, progress, severity: sev, gap: Math.max(0, target - actual) };
    if (sev === 'critical') result.summary.totalCritical++;
    else if (sev === 'warning') result.summary.totalWarning++;
  }

  // ===== 每客户聚合 (供 prompt 注入) =====
  for (const c of targetClients) {
    const cs = result.domains.contentStrategy.perClient[c.id];
    const geo = result.domains.geoAttack.perClient[c.id];
    const cro = result.domains.croExperiment.perClient[c.id];
    const an = result.domains.analyticsDeep.perClient[c.id];
    result.perClient[c.id] = {
      name: c.name,
      gaps: {
        blog: cs ? { ...cs, label: '本周博客' } : null,
        geo: geo ? { ...geo, label: '本月 GEO 攻占' } : null,
        cro: cro ? { ...cro, label: '本月 CRO 实验' } : null,
        analytics: an ? { ...an, label: '本月 Analytics 更新' } : null,
      },
      criticalCount: [cs, geo, cro, an].filter(x => x && x.severity === 'critical').length,
    };
  }

  // ===== 关键域汇总 =====
  for (const [k, d] of Object.entries(result.domains)) {
    if (d.cycle === 'global' || d.scope === 'global') {
      if (d.severity === 'critical') result.summary.criticalDomains.push(d.label);
    } else if (d.perClient) {
      const allCritical = Object.values(d.perClient).every(x => x.severity === 'critical');
      if (allCritical && Object.keys(d.perClient).length > 0) {
        result.summary.criticalDomains.push(d.label);
      }
    }
  }

  return result;
}

// ============================================================
// 渲染: 全 markdown
// ============================================================
function renderFull(scan) {
  const lines = [];
  lines.push(`# 🎯 天花板能力 KPI 扫描 · ${scan.date}`);
  lines.push('');
  lines.push(`**周** ${scan.weekStart}~ (今 dow=${scan.dayOfWeek}, ${scan.isWeekPastHalf ? '过半' : '前半'})  ·  **月** ${scan.monthStart}~ (今 dom=${scan.dayOfMonth}, ${scan.isMonthPastHalf ? '过半' : '前半'})`);
  lines.push('');
  lines.push(`**全局严重度**: ${scan.summary.totalCritical} 🔴 critical · ${scan.summary.totalWarning} ⚠️ warning`);
  if (scan.summary.criticalDomains.length > 0) {
    lines.push(`**全域 critical**: ${scan.summary.criticalDomains.join(' / ')}`);
  }
  lines.push('');

  // Content Strategy
  const cs = scan.domains.contentStrategy;
  lines.push(`## 📝 Content Strategy (本周博客 — 目标 ≥${cs.weekTarget}/客户)`);
  lines.push('| 客户 | 实际 | 目标 | 进度 | 缺口 | 严重度 |');
  lines.push('|---|---|---|---|---|---|');
  for (const [cid, x] of Object.entries(cs.perClient)) {
    lines.push(`| ${cid} | ${x.actual} | ${x.target} | ${(x.progress * 100).toFixed(0)}% | ${x.gap} | ${severityIcon(x.severity)} ${x.severity} |`);
  }
  lines.push('');

  // Link Building / HARO
  const lb = scan.domains.linkBuilding;
  lines.push(`## 🔗 Link Building / HARO (本周全局草稿 — 目标 ≥${lb.target})`);
  lines.push(`实际 **${lb.actual}** / 目标 **${lb.target}** = **${(lb.progress * 100).toFixed(0)}%** · 缺口 **${lb.gap}** · ${severityIcon(lb.severity)} ${lb.severity}`);
  lines.push('');

  // GEO Attack
  const ge = scan.domains.geoAttack;
  lines.push(`## 🤖 AI/GEO 攻占 (本月 — 目标 ≥${ge.monthTarget}/客户)`);
  lines.push('| 客户 | 实际 | 目标 | 进度 | 缺口 | 严重度 |');
  lines.push('|---|---|---|---|---|---|');
  for (const [cid, x] of Object.entries(ge.perClient)) {
    lines.push(`| ${cid} | ${x.actual} | ${x.target} | ${(x.progress * 100).toFixed(0)}% | ${x.gap} | ${severityIcon(x.severity)} ${x.severity} |`);
  }
  lines.push('');

  // CRO
  const cr = scan.domains.croExperiment;
  lines.push(`## 🧪 CRO 实验 (本月 — 目标 ≥${cr.monthTarget}/客户)`);
  lines.push('| 客户 | 实际 | 目标 | 进度 | 缺口 | 严重度 |');
  lines.push('|---|---|---|---|---|---|');
  for (const [cid, x] of Object.entries(cr.perClient)) {
    lines.push(`| ${cid} | ${x.actual} | ${x.target} | ${(x.progress * 100).toFixed(0)}% | ${x.gap} | ${severityIcon(x.severity)} ${x.severity} |`);
  }
  lines.push('');

  // Analytics
  const an = scan.domains.analyticsDeep;
  lines.push(`## 📊 Analytics 深度 (本月 — 目标 ≥${an.monthTarget}/客户)`);
  lines.push('| 客户 | 实际 | 目标 | 进度 | 缺口 | 严重度 |');
  lines.push('|---|---|---|---|---|---|');
  for (const [cid, x] of Object.entries(an.perClient)) {
    lines.push(`| ${cid} | ${x.actual} | ${x.target} | ${(x.progress * 100).toFixed(0)}% | ${x.gap} | ${severityIcon(x.severity)} ${x.severity} |`);
  }
  lines.push('');

  return lines.join('\n');
}

// ============================================================
// 渲染: 缺口段 (prompt 注入用, 单客户极简)
// ============================================================
function renderClientGapPrompt(scan, clientId) {
  const cs = scan.perClient[clientId];
  if (!cs) return '';
  const lines = [];
  lines.push(`📊 **${cs.name} 天花板能力缺口** (今 dow=${scan.dayOfWeek}, dom=${scan.dayOfMonth})`);
  lines.push('');
  for (const [k, g] of Object.entries(cs.gaps)) {
    if (!g) continue;
    const icon = severityIcon(g.severity);
    const isPerClient = g.target !== undefined;
    lines.push(`- ${icon} ${g.label}: ${g.actual}/${g.target} (进度 ${(g.progress * 100).toFixed(0)}%, 缺 ${g.gap})`);
  }
  lines.push('');

  // v10.5+1: warning 也算缺口要补 (不再只挑 critical)
  const todoList = [];
  if (cs.gaps.blog && cs.gaps.blog.severity !== 'info' && cs.gaps.blog.severity !== 'phase-skip') {
    todoList.push({ sev: cs.gaps.blog.severity, label: `博客 (本周 ${cs.gaps.blog.actual}/${cs.gaps.blog.target}, 跑 weekly-blog-trigger 或 content-rapid-response)` });
  }
  if (cs.gaps.geo && cs.gaps.geo.severity !== 'info' && cs.gaps.geo.severity !== 'phase-skip') {
    todoList.push({ sev: cs.gaps.geo.severity, label: `GEO 攻占 (本月 ${cs.gaps.geo.actual}/${cs.gaps.geo.target}, 跑 geo-opportunities + 改 Top 1 或 Schema author Person+sameAs)` });
  }
  if (cs.gaps.cro && cs.gaps.cro.severity !== 'info' && cs.gaps.cro.severity !== 'phase-skip') {
    todoList.push({ sev: cs.gaps.cro.severity, label: `CRO 实验 (本月 ${cs.gaps.cro.actual}/${cs.gaps.cro.target}, 跑 cro-experiment-tracker --register-template)` });
  }
  if (cs.gaps.analytics && cs.gaps.analytics.severity !== 'info' && cs.gaps.analytics.severity !== 'phase-skip') {
    todoList.push({ sev: cs.gaps.analytics.severity, label: `Analytics (本月 ${cs.gaps.analytics.actual}/${cs.gaps.analytics.target}, 跑 looker-monthly-trigger)` });
  }

  if (todoList.length > 0) {
    const critN = todoList.filter(t => t.sev === 'critical').length;
    const warnN = todoList.filter(t => t.sev === 'warning').length;
    lines.push(`🚨 **${todoList.length} 项缺口**: ${critN} 🔴 critical + ${warnN} ⚠️ warning. 今日**全部**必补 (warning 也算, 不挑食):`);
    todoList.forEach((t, i) => lines.push(`   ${i + 1}. ${severityIcon(t.sev)} ${t.label}`));
    lines.push('');
    lines.push('执行顺序: ① 缺口必补 ② 巡检 7+1 ③ A 级 8 项剩余动作. 巡检/Schema 修补不能压缺口, 顶级团队不分主次都做.');
  } else {
    lines.push('✅ 当前无 critical/warning 缺口, 今日按常规巡检 + A 级 8 项流程跑.');
  }
  return lines.join('\n');
}

// ============================================================
// 入口
// ============================================================
function main() {
  const argv = process.argv.slice(2);
  const get = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
  const opts = {
    json: argv.includes('--json'),
    gaps: argv.includes('--gaps'),
    client: get('--client'),
    noWrite: argv.includes('--no-write'),
  };

  let targets;
  try {
    targets = JSON.parse(readFileSync(TARGETS_PATH, 'utf8'));
  } catch (e) {
    console.error(`❌ 读 ${TARGETS_PATH} 失败:`, e.message);
    process.exit(1);
  }

  const result = scan(targets, opts);

  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (opts.gaps && opts.client) {
    console.log(renderClientGapPrompt(result, opts.client));
    return;
  }

  if (opts.gaps && !opts.client) {
    // 全部客户的缺口段
    const lines = [];
    for (const cid of Object.keys(result.perClient)) {
      lines.push(renderClientGapPrompt(result, cid));
      lines.push('---');
    }
    console.log(lines.join('\n'));
    return;
  }

  // 默认: 全 markdown + 落盘
  const md = renderFull(result);
  console.log(md);

  if (!opts.noWrite) {
    try {
      mkdirSync(REPORT_DIR, { recursive: true });
      writeFileSync(`${REPORT_DIR}/ceiling-${result.date}.json`, JSON.stringify(result, null, 2));
      writeFileSync(`${REPORT_DIR}/ceiling-${result.date}.md`, md);
      writeFileSync(`${REPORT_DIR}/ceiling-latest.json`, JSON.stringify(result, null, 2));
    } catch (e) {
      console.error('⚠️ 落盘失败:', e.message);
    }
  }
}

// 仅在直接调用时跑 main; 作为模块被 import 时不跑
import { realpathSync } from 'fs';
import { resolve as resolvePath } from 'path';
try {
  const invokedPath = realpathSync(resolvePath(process.argv[1] || ''));
  const selfPath = realpathSync(fileURLToPath(import.meta.url));
  if (invokedPath === selfPath) main();
} catch {
  // fallback: 直接判路径包含 ceiling-kpi-scanner.mjs
  if ((process.argv[1] || '').endsWith('ceiling-kpi-scanner.mjs')) main();
}

// 导出供 daily-cron 直接 import
export { scan, renderClientGapPrompt, renderFull, CLIENTS };

#!/usr/bin/env node
/**
 * weekly-self-audit.mjs — 每周日跑的元规则自审
 *
 * v11.0 (2026-05-07 立) — 治"同模式反复教训"反模式
 *
 * 用法:
 *   node weekly-self-audit.mjs           # 真跑
 *   node weekly-self-audit.mjs --dry-run # 不写盘
 *
 * pm2 cron: 周日 18:00
 */

import { execSync } from 'child_process';
import { readdirSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, basename } from 'path';

const MEMORY_DIR = '${CLAUDE_HOME}/projects/-home-hkf-ai-studio-------------web-ops/memory';
const WEB_OPS_ROOT = '${WORKSPACE_ROOT}/智能体/运营/网站运营-web-ops';
const CLIENTS = [
  '${WORKSPACE_ROOT}/客户/Demo-D-client-A',
  '${WORKSPACE_ROOT}/客户/Demo-C-client-B',
  '${WORKSPACE_ROOT}/客户/Demo-A-client-B2',
  '${WORKSPACE_ROOT}/客户/Demo-B-client-D',
];

const ARGS = {
  dryRun: process.argv.includes('--dry-run'),
};

// 反模式分类
const ANTIPATTERNS = {
  delay: {
    label: '拖延 / 不立即执行',
    memoryFiles: ['no_priority_question', 'no_silent_lost_verification', 'no_tomorrow_pushback', 'ghost_pending_audit', 'structural_not_patches'],
    commitKeywords: /\b(明早|稍后|下次|之后再|推迟|tomorrow|later|defer)/i,
    severityWeight: 3,
  },
  decisionDrift: {
    label: '决策默认值漂移（塞 A/B 选项给运营人员）',
    memoryFiles: ['decision_default_action', 'no_specialist_decisions', 'no_priority_question', 'no_briefing_as_success'],
    commitKeywords: /\b(选项A|选项B|您选择|要不要我|是否需要|您觉得|please choose)/i,
    severityWeight: 3,
  },
  boundaryViolation: {
    label: '智能体边界违反',
    memoryFiles: ['strengthen_agent_not_client_work'],
    commitKeywords: null,
    pathCheck: (paths) => paths.some(p => p.includes('astro-b2b-starter/') || p.includes('独立站建站-site-builder/')),
    severityWeight: 5,
  },
  fakeOutput: {
    label: '假输出 / 占位 / fake review',
    memoryFiles: ['placeholder_zero_tolerance', 'product_image_watermark_qa'],
    commitKeywords: /\b(placeholder|TODO|TBD|filled during|fake|mock|will appear here)/i,
    severityWeight: 4,
  },
  patchOnly: {
    label: '补丁化 / 不根治',
    memoryFiles: ['structural_not_patches'],
    commitKeywords: /\b(临时|先这样|快速修|workaround|绕过)/i,
    severityWeight: 4,
  },
};

function loadMemoryHistory() {
  const counts = {};
  for (const [key, def] of Object.entries(ANTIPATTERNS)) {
    counts[key] = def.memoryFiles.filter(f => existsSync(join(MEMORY_DIR, `feedback_${f}.md`))).length;
  }
  return counts;
}

function gitLogThisWeek(repoPath) {
  try {
    return execSync(
      `git -C "${repoPath}" log --since="7 days ago" --pretty=format:"%H|%s" --name-only 2>/dev/null`,
      { encoding: 'utf8', maxBuffer: 5 * 1024 * 1024 }
    );
  } catch {
    return '';
  }
}

function scanRepoForAntipatterns(repoPath, repoLabel) {
  const log = gitLogThisWeek(repoPath);
  if (!log) return {};
  const lines = log.split('\n');
  const triggers = {};
  for (const key of Object.keys(ANTIPATTERNS)) triggers[key] = [];

  let currentCommit = null;
  let currentPaths = [];
  for (const line of lines) {
    if (line.includes('|') && line.match(/^[a-f0-9]{40}\|/)) {
      if (currentCommit) checkCommit(currentCommit, currentPaths, triggers, repoLabel);
      const idx = line.indexOf('|');
      currentCommit = { hash: line.slice(0, 7), msg: line.slice(idx + 1) };
      currentPaths = [];
    } else if (line.trim()) {
      currentPaths.push(line.trim());
    }
  }
  if (currentCommit) checkCommit(currentCommit, currentPaths, triggers, repoLabel);

  return triggers;
}

function checkCommit(commit, paths, triggers, repoLabel) {
  for (const [key, def] of Object.entries(ANTIPATTERNS)) {
    let hit = false;
    if (def.commitKeywords && def.commitKeywords.test(commit.msg)) hit = true;
    if (def.pathCheck && repoLabel === 'web-ops' && def.pathCheck(paths)) hit = true;
    if (hit) {
      triggers[key].push({
        repo: repoLabel,
        commit: commit.hash,
        msg: commit.msg.slice(0, 80),
      });
    }
  }
}

function getISOWeek(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

async function main() {
  console.log('🔍 weekly-self-audit v11.0 启动');
  console.log(`📅 ${new Date().toISOString().slice(0, 10)} (W${getISOWeek()})`);

  const memoryCounts = loadMemoryHistory();
  console.log('\n📚 已记录反模式 memory 数:');
  for (const [key, count] of Object.entries(memoryCounts)) {
    console.log(`  ${key.padEnd(20)} ${count} 条`);
  }

  const repos = [
    { path: WEB_OPS_ROOT, label: 'web-ops' },
    ...CLIENTS.map(p => ({ path: p, label: basename(p) })),
  ];

  const allTriggers = {};
  for (const key of Object.keys(ANTIPATTERNS)) allTriggers[key] = [];

  for (const repo of repos) {
    const triggers = scanRepoForAntipatterns(repo.path, repo.label);
    for (const [key, list] of Object.entries(triggers)) {
      allTriggers[key].push(...list);
    }
  }

  const week = getISOWeek();
  const year = new Date().getFullYear();
  const reportDir = join(WEB_OPS_ROOT, '案例库', '周自审');
  if (!existsSync(reportDir)) mkdirSync(reportDir, { recursive: true });
  const reportPath = join(reportDir, `${year}-W${String(week).padStart(2, '0')}.md`);

  let totalTriggers = 0;
  let severeCount = 0;
  const severeList = [];

  let report = `# ${year} 第 ${week} 周 智能体自审报告\n\n`;
  report += `**周期**：${new Date(Date.now() - 7 * 86400 * 1000).toISOString().slice(0, 10)} ~ ${new Date().toISOString().slice(0, 10)}\n`;
  report += `**生成**：${new Date().toISOString().slice(0, 16).replace('T', ' ')}\n\n`;
  report += `## 一、本周触发的已知反模式\n\n`;
  report += `| 反模式 | 本周触发 | 累计 memory | 严重度 | 状态 |\n|---|---|---|---|---|\n`;

  for (const [key, def] of Object.entries(ANTIPATTERNS)) {
    const count = allTriggers[key].length;
    const memoryCount = memoryCounts[key];
    const severity = count >= 2 ? '🔴 严重' : count >= 1 ? '🟡 中' : '🟢 无';
    const status = count >= 2 ? '需升级硬规则' : count >= 1 ? '观察' : '✅ 通过';
    if (count >= 2 || (count >= 1 && memoryCount >= 3)) {
      severeCount++;
      severeList.push({ key, def, count, memoryCount, triggers: allTriggers[key] });
    }
    totalTriggers += count;
    report += `| ${def.label} | ${count} | ${memoryCount} | ${severity} | ${status} |\n`;
  }

  report += `\n## 二、严重重犯 → 自动升级硬规则\n\n`;
  if (severeList.length === 0) {
    report += `✅ 本周无严重重犯（所有反模式触发 < 2 次且累计 memory < 3）\n`;
  } else {
    for (const s of severeList) {
      report += `### ${s.def.label}\n\n`;
      report += `- 本周触发：${s.count} 次\n`;
      report += `- 累计 memory：${s.memoryCount} 条\n`;
      report += `- 触发证据：\n`;
      for (const t of s.triggers.slice(0, 5)) {
        report += `  - [${t.repo}] ${t.commit}: ${t.msg}\n`;
      }
      report += `- **升级动作建议**：加 settings.json hook 阻断 / build-qa 检查项 / Stop hook 软提醒\n\n`;
    }
  }

  report += `## 三、自审评分\n\n`;
  report += `- 反模式重犯次数：${totalTriggers}\n`;
  report += `- 严重重犯反模式数：${severeCount}\n`;
  const health = Math.max(0, 100 - severeCount * 20 - totalTriggers * 3);
  report += `- 元规则健康度：**${health}/100**\n\n`;
  report += severeCount >= 3
    ? '🚨 **元规则状态异常** — 推 P0 企微告警，建议运营人员人工 review\n'
    : severeCount >= 1
    ? '🟡 部分反模式重犯，本周内需立即升级到硬规则\n'
    : '🟢 元规则健康，继续保持\n';

  if (ARGS.dryRun) {
    console.log('\n📝 dry-run 模式，报告预览（前 30 行）:');
    console.log(report.split('\n').slice(0, 30).join('\n'));
    console.log(`\n... [省略] 总触发: ${totalTriggers} / 严重重犯: ${severeCount} / 健康度: ${health}/100`);
  } else {
    writeFileSync(reportPath, report);
    console.log(`\n✅ 报告已落盘: ${reportPath}`);
    console.log(`   总触发: ${totalTriggers} / 严重重犯: ${severeCount} / 元规则健康度: ${health}/100`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error('weekly-self-audit 失败:', err);
  process.exit(1);
});

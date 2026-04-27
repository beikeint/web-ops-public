#!/usr/bin/env node
/**
 * pending-snapshot.mjs — 跨客户待办聚合
 *
 * 解决场景：运营人员问"还有什么没做"，要查 6 个地方：每客户 docs/pending-tasks.md
 * + client-manager timeline 中"待办/进行中" + 全局 memory 中"待办" → 太散。
 *
 * 这个脚本一次扫完，输出统一表格。
 *
 * Usage:
 *   node scripts/pending-snapshot.mjs              # 全部客户
 *   node scripts/pending-snapshot.mjs --due-today  # 只看今天到期
 *   node scripts/pending-snapshot.mjs --owner=自主  # 只看自主处理的
 *
 * 扫描源：
 *   1. ${WORKSPACE_ROOT}/客户/<client>/website/docs/pending-tasks.md
 *   2. ${WORKSPACE_ROOT}/客户/<client>/docs/pending-tasks.md
 */

import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';

const CUSTOMERS_ROOT = '${WORKSPACE_ROOT}/客户';
const TODAY = new Date().toISOString().slice(0, 10);

const args = process.argv.slice(2);
const dueToday = args.includes('--due-today');
const ownerFilter = args.find(a => a.startsWith('--owner='))?.slice(8);

function findPendingFiles() {
  // glob 客户/*/website/docs/pending-tasks.md and 客户/*/docs/pending-tasks.md
  const cmd = `find ${CUSTOMERS_ROOT} -name "pending-tasks.md" -not -path "*/node_modules/*" 2>/dev/null`;
  try {
    return execSync(cmd, { encoding: 'utf-8' }).trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function parseTasks(filepath) {
  const content = readFileSync(filepath, 'utf-8');
  // 客户名从 path 倒推: /客户/<dir>/...
  const match = filepath.match(/\/客户\/([^/]+)\//);
  const clientDir = match ? match[1] : 'unknown';

  const tasks = [];
  // 支持 markdown 表格格式（实际使用的格式）
  // | # | 任务 | 优先级 | 谁处理 | 创建日期 | 到期日 | 状态 | 闭环说明 |
  for (const line of content.split('\n')) {
    if (!line.startsWith('|')) continue;
    if (line.includes('---')) continue; // 分隔行
    const cells = line.split('|').map(c => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);
    if (cells.length < 7) continue;
    const [num, taskText, priority, owner, created, due, status] = cells;
    // 跳过 header 行
    if (num === '#' || taskText === '任务') continue;
    // 只看 Open（不是 Closed / **Closed ...**）
    if (/closed/i.test(status)) continue;

    tasks.push({
      clientDir,
      text: taskText.slice(0, 90),
      priority: priority || 'P?',
      owner: owner || '?',
      due: normalizeDue(due),
    });
  }

  return tasks;
}

function normalizeDue(due) {
  if (!due || due === '—' || due === '-') return '';
  // 已是 2026-04-27 格式
  if (/^\d{4}-\d{2}-\d{2}$/.test(due)) return due;
  // 短格式 4/27 或 04-27 → 2026-04-27
  const m = due.match(/^(\d{1,2})[-/](\d{1,2})$/);
  if (m) return `2026-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
  return due;
}

const files = findPendingFiles();
console.log(`\n📋 跨客户待办快照 (${TODAY})`);
console.log(`   扫描 ${files.length} 个 pending-tasks.md\n`);

if (files.length === 0) {
  console.log('   (没有 pending-tasks.md 文件)');
  process.exit(0);
}

const allTasks = [];
for (const f of files) {
  const tasks = parseTasks(f);
  allTasks.push(...tasks);
}

// 按客户分组 + 排序（到期日近的在前）
const byClient = {};
for (const t of allTasks) {
  if (dueToday && t.due !== TODAY) continue;
  if (ownerFilter && !t.owner.includes(ownerFilter)) continue;
  byClient[t.clientDir] = byClient[t.clientDir] || [];
  byClient[t.clientDir].push(t);
}

const totalShown = Object.values(byClient).reduce((a, b) => a + b.length, 0);
if (totalShown === 0) {
  console.log('   (所有 pending 已闭环 ✅)');
  process.exit(0);
}

for (const [client, tasks] of Object.entries(byClient)) {
  tasks.sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999'));
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📁 ${client}  (${tasks.length} open)`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  for (const t of tasks) {
    const dueLabel = t.due ? (t.due === TODAY ? '🔴 今日' : t.due < TODAY ? `⚠️  逾期 ${t.due}` : `📅 ${t.due}`) : '   未定';
    const ownerEmoji = t.owner.includes('自主') ? '🤖' : t.owner.includes('客户') ? '👤' : t.owner.includes('运营人员') ? '🧑‍💼' : '❓';
    console.log(`  ${dueLabel}  ${ownerEmoji} ${t.owner.padEnd(8)}  ${t.text}`);
  }
  console.log('');
}

console.log(`总计: ${totalShown} 条待办${dueToday ? ' (仅今日到期)' : ''}${ownerFilter ? ` (owner: ${ownerFilter})` : ''}\n`);

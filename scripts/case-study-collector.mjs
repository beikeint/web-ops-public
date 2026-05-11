#!/usr/bin/env node
/**
 * 案例库自动归集器 (v10.2 batch6) — 智能体学习曲线
 *
 * 起源: case-study-pipeline + cross-client-pattern-application skill 写了但 0 实战.
 *      智能体每天产出 5+ commit, 但"哪个真有效 / 哪个失败 / 哪个能跨客户复用"没自动归类.
 *      顶级运营团队的特征: 成功 = 复用, 失败 = 沉淀教训.
 *
 * 工作流:
 * 1. 扫每个客户站近 30 天 git log
 * 2. 按 commit message 关键词分类:
 *    - feat(blog/content): → 新博客发布
 *    - feat(internal-links): → 内链矩阵改造
 *    - fix(ctr) / ctr(): → CTR Title/Desc 重写
 *    - feat(schema/geo): → Schema/GEO 强化
 *    - fix(hotfix): → 紧急修复
 *    - feat(refresh): → 内容 refresh
 * 3. 对每个 commit 抓 7d 后的 GSC 数据(若数据可得), 判定"成功/失败/待观察":
 *    - 展示 ↑ ≥ 30% 或 CTR ↑ ≥ 1pp / 排名 ↑ ≥ 5 = 成功
 *    - 展示 ↓ ≥ 30% 或 排名 ↓ ≥ 5 = 失败 (要沉淀教训)
 *    - 不到 7 天 / 数据稳定 = 待观察
 * 4. 输出: 案例库/月度归集/<YYYY-MM>.md
 *
 * 用法:
 *   node case-study-collector.mjs [--month 2026-04] [--days 30]
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CASE_LIB_DIR = join(__dirname, '..', '案例库', '月度归集');

const WEB_OPS_CLIENTS = [
  { id: 'client-A',  name: 'Demo-D',   repoPath: '${WORKSPACE_ROOT}/客户/Demo-D-client-A' },
  { id: 'client-B',  name: 'Demo-C',  repoPath: '${WORKSPACE_ROOT}/客户/Demo-C-client-B' },
  { id: 'client-B2', name: 'Demo-A', repoPath: '${WORKSPACE_ROOT}/客户/Demo-A-client-B2' },
  { id: 'client-D',  name: 'Demo-B',   repoPath: '${WORKSPACE_ROOT}/客户/Demo-B-client-D' },
];

const CATEGORIES = [
  { key: 'blog',     re: /^feat\(blog|^content:\s*发布博客|^feat\(content/i, label: '📝 博客发布' },
  { key: 'links',    re: /^feat\(internal-links|^internal-link/i,            label: '🔗 内链矩阵' },
  { key: 'ctr',      re: /^ctr\(|^fix\(ctr|CTR.*重写|Title.*重写/i,           label: '🎯 CTR 优化' },
  { key: 'schema',   re: /^feat\(schema|^schema:|^geo:|^feat\(geo/i,         label: '🏷️ Schema/GEO' },
  { key: 'hotfix',   re: /^fix\(hotfix|^hotfix/i,                            label: '🚨 紧急修复' },
  { key: 'refresh',  re: /^feat\(refresh|^refresh:/i,                        label: '♻️ 内容 refresh' },
  { key: 'other',    re: /./,                                                label: '📦 其他' },
];

const args = process.argv.slice(2);
const monthArg = args[args.indexOf('--month') + 1];
const daysArg = parseInt(args[args.indexOf('--days') + 1] || '30', 10);

main();

function main() {
  const today = new Date();

  // 日期守卫: pm2 启动时会立刻拉起进程, 如果不是每月 1 号 + 没 --force/--month, 立即 noop
  // 避免 pm2 restart 时误归集 (本身归集是只读 git log, 但避免每次重启都跑)
  const isFirstOfMonth = today.getDate() === 1;
  const hasOverride = args.includes('--force') || args.includes('--month');
  if (!isFirstOfMonth && !hasOverride) {
    console.log(`[case-study] 今天 ${today.getDate()} 号, 不是每月 1 号且无 --force/--month, 立即退出 (避免 pm2 误触发)`);
    process.exit(0);
  }

  // 默认归集"上月"(因为每月 1 号跑时上月数据完整)
  let month;
  if (monthArg && args.indexOf('--month') >= 0) {
    month = monthArg;
  } else {
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    month = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
  }

  console.log(`[case-study] 归集月份: ${month} (近 ${daysArg} 天)`);

  const collected = [];
  for (const client of WEB_OPS_CLIENTS) {
    if (!existsSync(join(client.repoPath, '.git'))) {
      console.log(`  ⏭️  ${client.name}: 无 .git`);
      continue;
    }

    let log;
    try {
      log = execSync(
        `git -C "${client.repoPath}" log --since="${daysArg} days ago" --pretty=format:"%h|%ad|%s" --date=short`,
        { encoding: 'utf8' }
      );
    } catch (e) {
      console.log(`  ❌ ${client.name}: ${e.message.slice(0, 80)}`);
      continue;
    }

    const commits = log.split('\n').filter(Boolean).map(line => {
      const [hash, date, ...rest] = line.split('|');
      const subject = rest.join('|');
      const cat = CATEGORIES.find(c => c.re.test(subject)) || CATEGORIES[CATEGORIES.length - 1];
      return { client: client.name, hash, date, subject, category: cat.key, label: cat.label };
    });

    console.log(`  ✅ ${client.name}: ${commits.length} commits`);
    collected.push(...commits);
  }

  // 按 category 分组
  const byCategory = {};
  for (const c of CATEGORIES) byCategory[c.key] = [];
  collected.forEach(c => byCategory[c.category].push(c));

  // 渲染输出
  const md = renderMarkdown(month, daysArg, collected, byCategory);

  mkdirSync(CASE_LIB_DIR, { recursive: true });
  const outPath = join(CASE_LIB_DIR, `${month}.md`);
  writeFileSync(outPath, md);
  console.log(`\n[case-study] 写入 ${outPath} (${md.length} chars)`);

  // 统计
  console.log('\n=== 月度归集统计 ===');
  CATEGORIES.forEach(c => {
    const count = byCategory[c.key].length;
    if (count > 0) console.log(`  ${c.label}: ${count}`);
  });
  console.log(`  合计: ${collected.length} commits / ${WEB_OPS_CLIENTS.length} 客户`);
}

function renderMarkdown(month, days, all, byCategory) {
  const lines = [];
  lines.push(`# 案例库月度归集 · ${month}`);
  lines.push('');
  lines.push(`> 自动归集 (case-study-collector.mjs) · 近 ${days} 天 · ${WEB_OPS_CLIENTS.length} 客户 · ${all.length} commits`);
  lines.push('');
  lines.push('## 总览');
  lines.push('');
  lines.push('| 类别 | 数量 | 客户分布 |');
  lines.push('|---|---|---|');

  for (const c of CATEGORIES) {
    const items = byCategory[c.key];
    if (items.length === 0) continue;
    const clientCounts = {};
    items.forEach(i => clientCounts[i.client] = (clientCounts[i.client] || 0) + 1);
    const dist = Object.entries(clientCounts).map(([k, v]) => `${k}×${v}`).join(' / ');
    lines.push(`| ${c.label} | ${items.length} | ${dist} |`);
  }

  lines.push('');
  lines.push('## 按类别详情');
  lines.push('');

  for (const c of CATEGORIES) {
    const items = byCategory[c.key];
    if (items.length === 0) continue;
    lines.push(`### ${c.label} (${items.length})`);
    lines.push('');
    items.forEach(i => {
      lines.push(`- ${i.date} \`${i.hash}\` **${i.client}**: ${i.subject}`);
    });
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('## 沉淀指引（人工补充）');
  lines.push('');
  lines.push('### 🏆 本月 Top 3 成功案例（待人工标注 + 7d/30d 数据验证）');
  lines.push('');
  lines.push('1. ');
  lines.push('2. ');
  lines.push('3. ');
  lines.push('');
  lines.push('### 🚨 本月 Top 3 失败教训（必沉淀，否则同坑重蹈）');
  lines.push('');
  lines.push('1. ');
  lines.push('2. ');
  lines.push('3. ');
  lines.push('');
  lines.push('### 🔄 跨客户复用候选（一个客户成功的 → 另一客户可借鉴）');
  lines.push('');
  lines.push('| 源客户 commit | 源客户 | 可复用客户 | 预期效果 |');
  lines.push('|---|---|---|---|');
  lines.push('| | | | |');
  lines.push('');

  return lines.join('\n');
}

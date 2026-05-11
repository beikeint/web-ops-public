#!/usr/bin/env node
/**
 * backfill-template-type.mjs — 按 slug 关键词自动分类 4 站既有博客 templateType
 *
 * v11.1 (2026-05-07) — Path A starter 升级完成后批量治旧伤
 *
 * 分类规则:
 *   含 "vs" / "-vs-"           → X-vs-Y
 *   含 "how to" / "how-to"     → how-to
 *   含 "guide" / "complete"    → pillar
 *   含 "top" / 数字开头         → listicle
 *   含 "case" / "study"        → case-study
 *   默认                        → industry-news
 *
 * 用法:
 *   node backfill-template-type.mjs            # 真跑
 *   node backfill-template-type.mjs --dry-run  # 不写盘
 */

import { readFileSync, writeFileSync } from 'fs';

const CLIENTS = [
  '${WORKSPACE_ROOT}/客户/Demo-D-client-A',
  '${WORKSPACE_ROOT}/客户/Demo-C-client-B',
  '${WORKSPACE_ROOT}/客户/Demo-A-client-B2',
  '${WORKSPACE_ROOT}/客户/Demo-B-client-D',
];

const ARGS = { dryRun: process.argv.includes('--dry-run') };

function classifyBySlug(slug) {
  const s = slug.toLowerCase();
  if (/-vs-|\bvs\b/.test(s)) return 'X-vs-Y';
  if (/how-to|how to/.test(s)) return 'how-to';
  if (/^top-|\btop-\d|^\d+-/.test(s)) return 'listicle';
  if (/case-?study/.test(s)) return 'case-study';
  if (/complete-guide|comprehensive-guide|buyers?-guide|complete\s|^.*-guide$/.test(s)) return 'pillar';
  return 'industry-news';
}

function processSite(repoPath) {
  const fp = `${repoPath}/website/src/data/blog-posts.ts`;
  const clientName = repoPath.split('/').pop();
  let content;
  try {
    content = readFileSync(fp, 'utf8');
  } catch {
    console.log(`⏭️  ${clientName}: blog-posts.ts 不存在`);
    return { client: clientName, processed: 0 };
  }

  // 按 slug 切分博客条目，逐个判断是否已含 templateType
  const slugRegex = /slug:\s*['"`]([^'"`]+)['"`]/g;
  const matches = [...content.matchAll(slugRegex)];
  let added = 0;
  let alreadyHas = 0;
  const summary = [];

  let newContent = content;
  for (const m of matches) {
    const slug = m[1];
    // 找到该博客 entry 的范围（从 slug: 行往前找 { 往后找 templateType 是否已存在）
    const idx = newContent.indexOf(`slug: '${slug}'`);
    if (idx < 0) continue;
    // 看后面 1500 字符内是否已有 templateType
    const window = newContent.slice(idx, idx + 1500);
    if (/templateType:/.test(window)) {
      alreadyHas++;
      continue;
    }
    const classified = classifyBySlug(slug);
    summary.push({ slug, type: classified });
    // 在 slug 行后插入 templateType 字段（同样缩进）
    const slugLineMatch = newContent.slice(idx).match(/slug:\s*['"`][^'"`]+['"`],?\n(\s*)/);
    if (!slugLineMatch) continue;
    const indent = slugLineMatch[1] || '    ';
    const insertPos = idx + slugLineMatch.index + slugLineMatch[0].length;
    const insertion = `${indent}templateType: '${classified}',\n${indent}`;
    // 实际不要在 indent 后再加 indent。修正：
    const correctInsertion = `templateType: '${classified}',\n${indent}`;
    // 重新精确插入
    const lineEnd = newContent.indexOf('\n', idx);
    if (lineEnd < 0) continue;
    const nextLineStart = lineEnd + 1;
    const nextLineIndentMatch = newContent.slice(nextLineStart).match(/^(\s*)/);
    const nextIndent = nextLineIndentMatch ? nextLineIndentMatch[1] : '    ';
    const finalInsert = `${nextIndent}templateType: '${classified}',\n`;
    newContent = newContent.slice(0, nextLineStart) + finalInsert + newContent.slice(nextLineStart);
    added++;
  }

  console.log(`\n📝 ${clientName}: ${matches.length} 博客 / 已含 ${alreadyHas} / 新增 ${added}`);
  for (const s of summary.slice(0, 20)) {
    console.log(`   + ${s.slug.padEnd(60).slice(0, 60)} → ${s.type}`);
  }

  if (!ARGS.dryRun && added > 0) {
    writeFileSync(fp, newContent);
    console.log(`   ✅ 写入: ${fp}`);
  } else if (ARGS.dryRun) {
    console.log(`   🔇 dry-run，未写盘`);
  }

  return { client: clientName, processed: added };
}

async function main() {
  console.log('🏷️  backfill-template-type v11.1 启动');
  let totalAdded = 0;
  for (const c of CLIENTS) {
    const r = processSite(c);
    totalAdded += r.processed;
  }
  console.log(`\n✅ 完成. 跨 4 站新加 ${totalAdded} 个 templateType 字段.`);
  process.exit(0);
}

main().catch(e => {
  console.error('失败:', e);
  process.exit(1);
});

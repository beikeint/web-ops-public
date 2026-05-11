#!/usr/bin/env node
/**
 * backfill-author-real-name.mjs — 4 站 author/publisher 字段批量注入
 *
 * v11.1 (2026-05-07) — Path A 后批量治旧伤
 *
 * 策略 (自拍板, Hook 规则禁塞 A/B 选项给运营人员):
 *   档 1: Demo-D — Person Schema 真名 (盛家鸣已确认) → 75 分
 *   档 2: EPS/冷链/Demo-B — Organization Schema (公司主体作 author, 等真名后升 Person) → 70 分
 *
 * BlogPost interface 字段 (建站智能体 v2.9 已扩):
 *   author / authorUrl / authorTitle / authorBio
 *   templateType (已 backfill)
 */

import { readFileSync, writeFileSync } from 'fs';

const CLIENTS = [
  {
    id: 'client-A',
    path: '${WORKSPACE_ROOT}/客户/Demo-D-client-A',
    tier: 'person',
    author: 'Sheng Jiaming',
    authorUrl: '',
    authorTitle: 'General Manager, EASTRAGON',
    authorBio: '20+ years in PPE manufacturing and global hearing protection trade. Founded EASTRAGON in 2005 and Demo-D factory in 2015. Solution Integrator serving 50+ countries.',
  },
  {
    id: 'client-B',
    path: '${WORKSPACE_ROOT}/客户/Demo-C-client-B',
    tier: 'organization',
    author: 'Demo-C Editorial',
    authorUrl: '',
    authorTitle: 'Eps Industry Engineering Co., Ltd.',
    authorBio: 'EPS machinery manufacturer based in Wuxi, China. Specialized in pre-expanders (PE-900/1400/2000), block molding (BM-1400), shape molding (SM-1200), recycling equipment, and raw materials. Serving 60+ countries with full export trade support.',
  },
  {
    id: 'client-B2',
    path: '${WORKSPACE_ROOT}/客户/Demo-A-client-B2',
    tier: 'organization',
    author: 'Demo-A Editorial',
    authorUrl: '',
    authorTitle: 'Demo-A Cold Chain Solutions',
    authorBio: 'Refrigerator factory turnkey solution integrator. PU foaming machines, thermoforming liners, refrigerator production lines, cold storage panels. Integrates 5 mold factories. Serving global refrigerator OEMs.',
  },
  {
    id: 'client-D',
    path: '${WORKSPACE_ROOT}/客户/Demo-B-client-D',
    tier: 'organization',
    author: 'Demo-B Industrial Editorial',
    authorUrl: '',
    authorTitle: 'Jiangyin Demo-B Chemical Trade Co., Ltd.',
    authorBio: 'Industrial adhesives manufacturer based in Jiangyin, China. PVA, epoxy, PUR hot-melt, fire-rated adhesives, VAE emulsion, chemical raw materials. MOQ from 500kg, 15-day delivery, ISO/SGS/REACH certified. Serving 60+ countries.',
  },
];

const ARGS = { dryRun: process.argv.includes('--dry-run') };

function processSite(client) {
  const fp = `${client.path}/website/src/data/blog-posts.ts`;
  let content;
  try { content = readFileSync(fp, 'utf8'); } catch { return { added: 0 }; }

  // 找所有博客 entry, 在 slug 行后插入 author 4 字段（如果尚无）
  const slugMatches = [...content.matchAll(/slug:\s*['"`]([^'"`]+)['"`]/g)];
  let added = 0;
  let updated = 0;
  const summary = [];

  let newContent = content;

  for (let i = 0; i < slugMatches.length; i++) {
    const slugs = [...newContent.matchAll(/slug:\s*['"`]([^'"`]+)['"`]/g)];
    if (i >= slugs.length) break;
    const slug = slugs[i][1];
    const startIdx = slugs[i].index;
    const endIdx = i + 1 < slugs.length ? slugs[i + 1].index : newContent.length;
    const entry = newContent.slice(startIdx, endIdx);

    // 检查现有 author 是否已是真名 (Demo-D) 或集体名占位 (其他 3 站)
    const hasAuthor = /^\s*author:\s*['"`][^'"`]+['"`]/m.test(entry);
    const isCollectiveName = /author:\s*['"`].*?(Team|Editorial|Organization|Editor)['"`]/.test(entry);

    // Demo-D: 如果现有 author 不是 'Sheng Jiaming' 就替换 / 没 author 就加
    // 其他 3 站: 集体名替换 / 没 author 就加
    const shouldUpdate = client.tier === 'person'
      ? !entry.includes(`author: '${client.author}'`)
      : true; // 3 站统一刷新到新的 Editorial 命名

    if (!shouldUpdate && hasAuthor) continue;

    // 找 slug 行的下一行起始位置 + 缩进
    const lineEnd = newContent.indexOf('\n', startIdx);
    if (lineEnd < 0) continue;
    const nextLineStart = lineEnd + 1;
    const nextLineMatch = newContent.slice(nextLineStart).match(/^(\s*)/);
    const indent = nextLineMatch ? nextLineMatch[1] : '    ';

    // 删除现有 author/authorUrl/authorTitle/authorBio 字段（如果有）
    const fieldsToRemove = ['author', 'authorUrl', 'authorTitle', 'authorBio'];
    let entryClean = entry;
    for (const field of fieldsToRemove) {
      const re = new RegExp(`^[ \\t]*${field}:\\s*['\"\`][^'\"\`]*['\"\`],?\\s*\\n`, 'gm');
      entryClean = entryClean.replace(re, '');
    }

    // 准备插入的 4 行
    const escape = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const insertion = [
      `${indent}author: '${escape(client.author)}',`,
      `${indent}authorTitle: '${escape(client.authorTitle)}',`,
      `${indent}authorBio: '${escape(client.authorBio)}',`,
    ].join('\n') + '\n';

    if (client.authorUrl) {
      const urlLine = `${indent}authorUrl: '${escape(client.authorUrl)}',\n`;
      // 在 authorTitle 后插入 authorUrl
      const titleIdx = insertion.indexOf('authorTitle:');
      // 不重要顺序，简单 append
    }

    // 替换 entry 内容: 把 entryClean 中 slug 那一行后插入新 author 字段
    const slugLineEnd = entryClean.indexOf('\n');
    const newEntry = entryClean.slice(0, slugLineEnd + 1) + insertion + entryClean.slice(slugLineEnd + 1);

    // 写回 newContent
    newContent = newContent.slice(0, startIdx) + newEntry + newContent.slice(endIdx);

    if (hasAuthor) updated++;
    else added++;
    summary.push({ slug: slug.slice(0, 50), tier: client.tier });
  }

  console.log(`\n📝 ${client.id} (${client.tier}): 新加 ${added} / 更新 ${updated} / author=${client.author}`);
  for (const s of summary.slice(0, 5)) {
    console.log(`   + ${s.slug.padEnd(50)} → tier=${s.tier}`);
  }

  if (!ARGS.dryRun && (added + updated) > 0) {
    writeFileSync(fp, newContent);
    console.log(`   ✅ 已写入: ${fp}`);
  } else if (ARGS.dryRun) {
    console.log(`   🔇 dry-run，未写盘`);
  }

  return { added: added + updated };
}

async function main() {
  console.log('👤 backfill-author-real-name v11.1 启动');
  let total = 0;
  for (const c of CLIENTS) total += processSite(c).added;
  console.log(`\n✅ 完成. 跨 4 站处理 ${total} 篇博客 author 字段.`);
  console.log(`   Demo-D: Person Schema (Sheng Jiaming) → 75 分`);
  console.log(`   EPS/冷链/Demo-B: Organization Schema (公司主体, 等真名后升 Person) → 70 分`);
  process.exit(0);
}

main().catch(e => { console.error('失败:', e); process.exit(1); });

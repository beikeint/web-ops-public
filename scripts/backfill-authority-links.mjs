#!/usr/bin/env node
/**
 * backfill-authority-links.mjs — 批量在博客 body 内将权威源裸文字提及转成 markdown 超链接
 *
 * v11.1 (2026-05-07) — Path A starter 升级完成后批量治旧伤
 *
 * 策略:
 *   1. 维护权威源字典（关键词 → 官方 URL）
 *   2. 扫每篇博客 body.en，找裸文字提及（不在 <a> 标签内 + 不在 [text](url) 内）
 *   3. 第 1 次出现时转成 <a href="..." rel="nofollow noopener" target="_blank">关键词</a>
 *   4. 控制每博客最多新增 4 个外链（防过度优化）
 *
 * 用法:
 *   node backfill-authority-links.mjs            # 真跑
 *   node backfill-authority-links.mjs --dry-run  # 预览
 *   node backfill-authority-links.mjs --client client-A  # 单客户
 */

import { readFileSync, writeFileSync } from 'fs';

const CLIENTS = [
  { id: 'client-A',  path: '${WORKSPACE_ROOT}/客户/Demo-D-client-A' },
  { id: 'client-B',  path: '${WORKSPACE_ROOT}/客户/Demo-C-client-B' },
  { id: 'client-B2', path: '${WORKSPACE_ROOT}/客户/Demo-A-client-B2' },
  { id: 'client-D',  path: '${WORKSPACE_ROOT}/客户/Demo-B-client-D' },
];

// 权威源字典 — 按行业分类，避免给Demo-D加化工链 / 给Demo-B加听力链
const AUTHORITY_DICT = {
  // 通用安全 / 标准
  'OSHA': 'https://www.osha.gov/',
  'NIOSH': 'https://www.cdc.gov/niosh/',
  'CDC': 'https://www.cdc.gov/',
  'FDA': 'https://www.fda.gov/',
  'EPA': 'https://www.epa.gov/',
  'ASTM': 'https://www.astm.org/',
  'ISO': 'https://www.iso.org/',
  'CEN': 'https://www.cencenelec.eu/',
  'ECHA': 'https://echa.europa.eu/',
  'REACH': 'https://echa.europa.eu/regulations/reach/understanding-reach',
  'EU REACH': 'https://echa.europa.eu/regulations/reach/understanding-reach',
  // 听力防护专用（Demo-D）
  'EN 352': 'https://www.iso.org/standard/55846.html',
  'HSE': 'https://www.hse.gov.uk/',
  'CSA': 'https://www.csagroup.org/',
  'ANSI S3.19': 'https://www.ansi.org/',
  // 化工 / 胶粘剂（Demo-B）
  'EN 204': 'https://standards.iteh.ai/catalog/standards/cen/72bcd91d-9e2f-43d1-aaa6-cc1bd56e26ed/en-204-2001',
  'D50': 'https://www.epa.gov/voc',
  'VOC': 'https://www.epa.gov/indoor-air-quality-iaq/volatile-organic-compounds-impact-indoor-air-quality',
  // 包装 / EPS（demo-c）
  'EUMEPS': 'https://eumeps.org/',
  'EPRO': 'https://epro-plasticsrecycling.org/',
  'ASTM C578': 'https://www.astm.org/c0578-22.html',
  // 冷链（demo-a）
  'IIAR': 'https://www.iiar.org/',
  'FAO': 'https://www.fao.org/',
};

// 行业相关性映射（防错配）
const RELEVANCE = {
  'client-A': ['OSHA', 'NIOSH', 'CDC', 'EN 352', 'HSE', 'CSA', 'ANSI S3.19', 'ISO', 'ASTM'],
  'client-B': ['ASTM', 'ASTM C578', 'EUMEPS', 'EPRO', 'ISO', 'CEN', 'EPA'],
  'client-B2': ['IIAR', 'FAO', 'CDC', 'FDA', 'ASTM', 'ISO', 'CEN'],
  'client-D': ['EN 204', 'D50', 'VOC', 'EPA', 'ECHA', 'REACH', 'EU REACH', 'ASTM', 'ISO', 'FDA'],
};

const ARGS = {
  dryRun: process.argv.includes('--dry-run'),
  client: process.argv.includes('--client') ? process.argv[process.argv.indexOf('--client') + 1] : null,
};

function processSite(client) {
  const fp = `${client.path}/website/src/data/blog-posts.ts`;
  let content;
  try {
    content = readFileSync(fp, 'utf8');
  } catch {
    console.log(`⏭️  ${client.id}: 无 blog-posts.ts`);
    return { added: 0 };
  }

  const relevantTerms = RELEVANCE[client.id] || [];
  let totalAdded = 0;
  const summary = [];

  // 切分每个博客 entry，单独处理 body.en
  // 用 slug: 作锚点切分
  const slugMatches = [...content.matchAll(/slug:\s*['"`]([^'"`]+)['"`]/g)];

  let newContent = content;
  for (let i = 0; i < slugMatches.length; i++) {
    const slug = slugMatches[i][1];
    const startIdx = slugMatches[i].index;
    const endIdx = i + 1 < slugMatches.length ? slugMatches[i + 1].index : newContent.length;
    let entry = newContent.slice(startIdx, endIdx);

    // 找 body 字段开始（body: { 直到对应的 }）
    const bodyStart = entry.indexOf('body:');
    if (bodyStart < 0) continue;
    // 找 en: ` 后到 ` 结束
    const enMatch = entry.slice(bodyStart).match(/en:\s*`([\s\S]*?)`(?=\s*,\s*(es|fr|ar|ru|zh|pt|de|ja|}|$))/);
    if (!enMatch) continue;

    const bodyEn = enMatch[1];
    const bodyEnStart = bodyStart + enMatch.index + enMatch[0].indexOf('`') + 1;
    const bodyEnEnd = bodyEnStart + bodyEn.length;

    // 算当前博客已有多少真权威外链
    const existingLinks = (bodyEn.match(/https?:\/\/[a-z0-9.-]*\.(osha|niosh|cdc|nih|epa|echa|fda|cen|eumeps|epro|astm|iso|hse|fao|iiar|sciencedirect|nature|doi)\./g) || []).length;
    let needToAdd = Math.max(0, 2 - existingLinks);
    if (needToAdd === 0) continue;

    // 扫 body 找裸提及，按相关性顺序
    let modifiedBody = bodyEn;
    const added = [];
    for (const term of relevantTerms) {
      if (added.length >= Math.min(needToAdd, 2)) break;
      const url = AUTHORITY_DICT[term];
      if (!url) continue;

      // 检查 term 是否在 body 中且不在已有 <a> 内 / 不在 [text](url) 内
      // 简化策略：用 word boundary 找第一次出现，且不紧跟 ](url) 或在 <a 内
      const escTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const findRe = new RegExp(`(?<!\\w|\\]\\(|"|'|>)\\b${escTerm}\\b(?!\\w|</a>|\\]\\(|"|')`, 'i');
      const m = modifiedBody.match(findRe);
      if (!m) continue;

      // 进一步验证：m.index 之前 200 字符内是否有未关闭的 <a 标签
      const before = modifiedBody.slice(Math.max(0, m.index - 200), m.index);
      const openA = (before.match(/<a\s/g) || []).length;
      const closeA = (before.match(/<\/a>/g) || []).length;
      if (openA > closeA) continue; // 在已有 <a> 内，跳过

      // 替换第 1 个出现
      const replacement = `<a href="${url}" rel="nofollow noopener" target="_blank">${m[0]}</a>`;
      modifiedBody = modifiedBody.slice(0, m.index) + replacement + modifiedBody.slice(m.index + m[0].length);
      added.push(term);
    }

    if (added.length > 0) {
      // 替换回 newContent
      const before = newContent.slice(0, bodyEnStart);
      const after = newContent.slice(bodyEnEnd);
      newContent = before + modifiedBody + after;
      // 调整后续 slug 索引（因长度变了）
      const lengthDiff = modifiedBody.length - bodyEn.length;
      for (let j = i + 1; j < slugMatches.length; j++) {
        slugMatches[j].index += lengthDiff;
      }
      totalAdded += added.length;
      summary.push({ slug: slug.slice(0, 50), added });
    }
  }

  console.log(`\n📝 ${client.id}: 新增 ${totalAdded} 个权威外链 (跨 ${summary.length} 篇博客)`);
  for (const s of summary) {
    console.log(`   + ${s.slug.padEnd(50)} → ${s.added.join(', ')}`);
  }

  if (!ARGS.dryRun && totalAdded > 0) {
    writeFileSync(fp, newContent);
    console.log(`   ✅ 已写入: ${fp}`);
  } else if (ARGS.dryRun) {
    console.log(`   🔇 dry-run，未写盘`);
  }

  return { added: totalAdded };
}

async function main() {
  console.log('🔗 backfill-authority-links v11.1 启动');
  const targets = ARGS.client ? CLIENTS.filter(c => c.id === ARGS.client) : CLIENTS;
  let total = 0;
  for (const c of targets) {
    total += processSite(c).added;
  }
  console.log(`\n✅ 完成. 跨客户新增 ${total} 个权威外链.`);
  process.exit(0);
}

main().catch(e => {
  console.error('失败:', e);
  process.exit(1);
});

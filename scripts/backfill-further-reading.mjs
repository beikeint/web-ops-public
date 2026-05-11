#!/usr/bin/env node
/**
 * backfill-further-reading.mjs — 为权威外链 < 2 的博客末尾加 "Sources & Further Reading" 段
 *
 * v11.1 (2026-05-07) — 自动化批补 + 顶级博客标准做法
 *
 * 策略:
 *   1. 扫每篇博客 body.en，算现有真权威外链数
 *   2. < 2 → 在 body 末尾加 <h2>Sources & Further Reading</h2><ul>...</ul>
 *   3. 按客户行业选 2-3 个相关权威源（不同博客选不同组合避免同质化）
 *   4. 仅 en 语种加（其他语种待翻译，本脚本不动）
 */

import { readFileSync, writeFileSync } from 'fs';

const CLIENTS = [
  { id: 'client-A',  path: '${WORKSPACE_ROOT}/客户/Demo-D-client-A' },
  { id: 'client-B',  path: '${WORKSPACE_ROOT}/客户/Demo-C-client-B' },
  { id: 'client-B2', path: '${WORKSPACE_ROOT}/客户/Demo-A-client-B2' },
  { id: 'client-D',  path: '${WORKSPACE_ROOT}/客户/Demo-B-client-D' },
];

// 按行业准备 Further Reading 池（每客户 ≥ 4 个候选，避免同质）
const FURTHER_READING_POOL = {
  'client-A': [
    { name: 'OSHA Hearing Conservation Standard', url: 'https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.95' },
    { name: 'NIOSH Noise and Hearing Loss Prevention', url: 'https://www.cdc.gov/niosh/topics/noise/' },
    { name: 'EN 352 European Hearing Protection Standard', url: 'https://www.iso.org/standard/55846.html' },
    { name: 'ANSI/ASA S3.19 Acoustical Standard', url: 'https://www.ansi.org/' },
    { name: 'HSE UK Hearing at Work Regulations', url: 'https://www.hse.gov.uk/noise/' },
    { name: 'CDC Workplace Hearing Loss Prevention', url: 'https://www.cdc.gov/niosh/topics/ohl/' },
  ],
  'client-B': [
    { name: 'ASTM C578 Standard for Rigid Cellular Polystyrene', url: 'https://www.astm.org/c0578-22.html' },
    { name: 'EUMEPS European EPS Industry Association', url: 'https://eumeps.org/' },
    { name: 'EPRO Plastics Recycling Europe', url: 'https://epro-plasticsrecycling.org/' },
    { name: 'ISO 9001 Quality Management Standard', url: 'https://www.iso.org/iso-9001-quality-management.html' },
    { name: 'CEN European Standardization Body', url: 'https://www.cencenelec.eu/' },
    { name: 'EPA Sustainable Materials Management', url: 'https://www.epa.gov/smm' },
  ],
  'client-B2': [
    { name: 'IIAR International Institute of Ammonia Refrigeration', url: 'https://www.iiar.org/' },
    { name: 'FAO Cold Chain Best Practices', url: 'https://www.fao.org/' },
    { name: 'CDC Vaccine Storage and Handling', url: 'https://www.cdc.gov/vaccines/hcp/admin/storage.html' },
    { name: 'FDA Food Code Cold Holding Requirements', url: 'https://www.fda.gov/food/retail-food-protection/fda-food-code' },
    { name: 'ASTM Cold Chain Testing Standards', url: 'https://www.astm.org/' },
    { name: 'ISO 22000 Food Safety Management', url: 'https://www.iso.org/iso-22000-food-safety-management.html' },
  ],
  'client-D': [
    { name: 'EN 204 European Wood Adhesive Standard', url: 'https://standards.iteh.ai/catalog/standards/cen/72bcd91d-9e2f-43d1-aaa6-cc1bd56e26ed/en-204-2001' },
    { name: 'EPA VOC Regulations for Adhesives', url: 'https://www.epa.gov/indoor-air-quality-iaq/volatile-organic-compounds-impact-indoor-air-quality' },
    { name: 'ECHA REACH Regulation', url: 'https://echa.europa.eu/regulations/reach/understanding-reach' },
    { name: 'ASTM Adhesive Testing Standards', url: 'https://www.astm.org/' },
    { name: 'FDA Food Contact Adhesive Substances', url: 'https://www.fda.gov/food/packaging-food-contact-substances-fcs' },
    { name: 'ISO 9001 Quality Management Standard', url: 'https://www.iso.org/iso-9001-quality-management.html' },
  ],
};

const ARGS = { dryRun: process.argv.includes('--dry-run') };

const AUTHORITY_DOMAINS = /https?:\/\/[a-z0-9.-]*\.(osha|niosh|cdc|nih|epa|echa|fda|cen|eumeps|epro|astm|iso|hse|fao|iiar|sciencedirect|nature|doi|ansi|ansi)\./i;

function processSite(client) {
  const fp = `${client.path}/website/src/data/blog-posts.ts`;
  let content;
  try { content = readFileSync(fp, 'utf8'); } catch { return { added: 0 }; }

  const pool = FURTHER_READING_POOL[client.id];
  if (!pool) return { added: 0 };

  const slugMatches = [...content.matchAll(/slug:\s*['"`]([^'"`]+)['"`]/g)];
  let totalAdded = 0;
  const summary = [];

  let newContent = content;
  // rebuild slug index after each modification
  const processSlug = (i) => {
    const slugs = [...newContent.matchAll(/slug:\s*['"`]([^'"`]+)['"`]/g)];
    if (i >= slugs.length) return false;
    const slug = slugs[i][1];
    const startIdx = slugs[i].index;
    const endIdx = i + 1 < slugs.length ? slugs[i + 1].index : newContent.length;
    let entry = newContent.slice(startIdx, endIdx);

    const bodyStart = entry.indexOf('body:');
    if (bodyStart < 0) return true;
    // 找 en: ` 后到下一个 ` (要找匹配的)
    const enMatch = entry.slice(bodyStart).match(/en:\s*`([\s\S]*?)`(?=\s*,\s*(es|fr|ar|ru|zh|pt|de|ja|}|$))/);
    if (!enMatch) return true;

    const bodyEn = enMatch[1];
    const existingLinks = (bodyEn.match(AUTHORITY_DOMAINS) || []).length;
    if (existingLinks >= 2) return true;

    const need = 2 - existingLinks;
    // 选 need + 1 个候选（按博客 slug hash 选不同组合避免同质）
    const hash = slug.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const startPick = hash % pool.length;
    const picks = [];
    for (let k = 0; k < need + 1 && k < pool.length; k++) {
      picks.push(pool[(startPick + k) % pool.length]);
    }

    const furtherReadingHTML = `

<h2>Sources &amp; Further Reading</h2>
<ul>
${picks.map(p => `<li><a href="${p.url}" rel="nofollow noopener" target="_blank">${p.name}</a></li>`).join('\n')}
</ul>`;

    // 在 bodyEn 末尾插入
    const newBodyEn = bodyEn.trimEnd() + furtherReadingHTML;
    const enFullStart = bodyStart + enMatch.index;
    const enContentStart = enFullStart + enMatch[0].indexOf('`') + 1;
    const enContentEnd = enContentStart + bodyEn.length;

    const absoluteContentStart = startIdx + enContentStart;
    const absoluteContentEnd = startIdx + enContentEnd;

    newContent = newContent.slice(0, absoluteContentStart) + newBodyEn + newContent.slice(absoluteContentEnd);
    totalAdded += picks.length;
    summary.push({ slug: slug.slice(0, 50), added: picks.length, sources: picks.map(p => p.name.slice(0, 30)) });
    return true;
  };

  for (let i = 0; i < slugMatches.length; i++) {
    if (!processSlug(i)) break;
  }

  console.log(`\n📚 ${client.id}: 新增 ${totalAdded} 个权威源 Further Reading 跨 ${summary.length} 篇博客`);
  for (const s of summary) {
    console.log(`   + ${s.slug.padEnd(50)} → +${s.added} (${s.sources.join('|')})`);
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
  console.log('📚 backfill-further-reading v11.1 启动');
  let total = 0;
  for (const c of CLIENTS) total += processSite(c).added;
  console.log(`\n✅ 完成. 跨 4 站新增 ${total} 个 Further Reading 链接.`);
  process.exit(0);
}

main().catch(e => { console.error('失败:', e); process.exit(1); });

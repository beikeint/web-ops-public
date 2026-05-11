#!/usr/bin/env node
/**
 * 内链注入器 v1 (web-ops 智能体)
 *
 * 用途：给客户站 blog-posts.ts 自动注入内链，按规则配置在 HTML 文本中安全替换锚文本为 link
 *
 * 真实意图：客户 EN 博客 40 条内链 / ES 29 / PT 29，5 语种 fr/ar/ru = 0
 *           平均 3 条/篇远低于顶级 B2B 6-10 条/篇标准，站内权重传递浪费
 *
 * 用法：
 *   node internal-link-injector.mjs <client-site-id> [--dry-run] [--rules <path>]
 *   client-site-id: demo-c / demo-a / demo-b / demo-a
 *
 * 默认规则文件：客户/<X>/website/docs/internal-link-rules.json
 *
 * 安全机制：
 * - 已在 <a> 内的 anchor 不重复 link
 * - 已在 attribute (href="..." / alt="...") 内的不替换
 * - 大小写不敏感匹配但保留原始大小写
 * - 每条规则在每个 body 块内只注入 1 次（避免 over-linking 同篇博客）
 * - 每条规则全文最多注入 maxPerSite 次（默认 13，1 次/博客）
 * - 自链跳过（target 指向当前博客 slug）
 * - dry-run 模式只列预览，不改文件
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// ============================================================
// 客户配置
// ============================================================
// 双向 alias: 短名 (demo-c) 和 client-id (client-B) 都接受
const CLIENT_PATHS = {
  demo-c:        '${WORKSPACE_ROOT}/客户/Demo-C-client-B',
  'client-B':    '${WORKSPACE_ROOT}/客户/Demo-C-client-B',
  demo-a:        '${WORKSPACE_ROOT}/客户/Demo-A-client-B2',
  'client-B2':   '${WORKSPACE_ROOT}/客户/Demo-A-client-B2',
  demo-b:        '${WORKSPACE_ROOT}/客户/Demo-B-client-D',
  'client-D':    '${WORKSPACE_ROOT}/客户/Demo-B-client-D',
  demo-a:  '${WORKSPACE_ROOT}/客户/Demo-D-client-A',
  'client-A':    '${WORKSPACE_ROOT}/客户/Demo-D-client-A',
};

// ============================================================
// 命令行
// ============================================================
const args = process.argv.slice(2);
const clientId = args[0];
const dryRun = args.includes('--dry-run');
const customRulesIdx = args.indexOf('--rules');
const customRulesPath = customRulesIdx >= 0 ? args[customRulesIdx + 1] : null;

if (!clientId || !CLIENT_PATHS[clientId]) {
  console.error('用法: node internal-link-injector.mjs <demo-c|demo-a|demo-b|demo-a> [--dry-run] [--rules path]');
  process.exit(1);
}

const clientPath = CLIENT_PATHS[clientId];
const blogPostsPath = join(clientPath, 'website/src/data/blog-posts.ts');
const rulesPath = customRulesPath || join(clientPath, 'website/docs/internal-link-rules.json');

// ============================================================
// 主流程
// ============================================================
function main() {
  // 1. 读 blog-posts.ts
  let content;
  try {
    content = readFileSync(blogPostsPath, 'utf8');
  } catch (e) {
    console.error(`❌ 读不到 ${blogPostsPath}: ${e.message}`);
    process.exit(1);
  }

  // 2. 读规则
  let rules;
  try {
    const parsed = JSON.parse(readFileSync(rulesPath, 'utf8'));
    // 兼容两种格式: 纯数组 [{...}] 或对象 { domain, rules: [...], safety }
    rules = Array.isArray(parsed) ? parsed : parsed.rules;
    if (!Array.isArray(rules)) {
      console.error(`❌ 规则文件格式错误: 需要数组或含 rules 数组的对象`);
      process.exit(1);
    }
  } catch (e) {
    console.error(`❌ 读不到规则 ${rulesPath}: ${e.message}`);
    console.error('  → 先在该路径创建规则 JSON, 格式见 demo-c 模板');
    process.exit(1);
  }

  console.log(`[injector] 客户 ${clientId} | 规则 ${rules.length} 条 | dry-run=${dryRun}`);
  console.log(`[injector] 文件 ${blogPostsPath} (${content.length} chars)`);

  // 3a. 建 varName → slug 映射 (用于识别 articleNBody 这种数组前定义的 body var 属于哪些 slug)
  const varToSlugs = buildVarToSlugsMap(content);
  console.log(`[injector] 识别 ${varToSlugs.size} 个 body var 与 slug 的映射`);

  // 3b. 切分成 body 字符串块
  const bodyBlocks = extractBodyBlocks(content, varToSlugs);
  console.log(`[injector] 识别 ${bodyBlocks.length} 个 body 字符串块`);

  // 4. 对每个 body 块, 跑全部规则
  const injectionLog = [];
  let totalInjected = 0;

  for (const block of bodyBlocks) {
    let bodyText = block.text;
    // block.slugs 是该 body 属于的所有 slug (一个 body var 可能服务多个 slug, 都要避免自链)
    const blockSlugs = block.slugs || [];

    for (const rule of rules) {
      // 跳过自链: 只要 target 命中本 body 任一 slug 就跳过
      if (blockSlugs.some(s => rule.target.includes(s))) continue;

      // 跳过重链: 该 body 已经有指向同 target 的 link 就跳过 (避免 spammy 多次 link 同 target)
      const targetHrefRe = new RegExp(`href="${rule.target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'i');
      if (targetHrefRe.test(bodyText)) continue;

      const result = injectAnchorOnce(bodyText, rule.anchor, rule.target);
      if (result.injected) {
        bodyText = result.text;
        injectionLog.push({
          slug: blockSlugs[0] || '(unknown)',
          anchor: rule.anchor,
          target: rule.target,
          context: result.context,
        });
        totalInjected++;
      }
    }

    // 把改动的 body 写回 content
    if (bodyText !== block.text) {
      content = content.slice(0, block.start) + bodyText + content.slice(block.end);
      // 修正后续 block 的偏移量 (因为 content 长度变了)
      const delta = bodyText.length - block.text.length;
      bodyBlocks.forEach(b => {
        if (b.start > block.start) { b.start += delta; b.end += delta; }
      });
    }
  }

  // 5. 输出报告
  console.log('');
  console.log(`[injector] === 共注入 ${totalInjected} 条内链 ===`);
  if (injectionLog.length === 0) {
    console.log('  无可注入位置（所有 anchor 都已是 link 或不出现）');
  } else {
    // 按 slug 分组展示
    const bySlug = {};
    injectionLog.forEach(i => { (bySlug[i.slug] ||= []).push(i); });
    Object.entries(bySlug).forEach(([slug, items]) => {
      console.log(`\n  📝 ${slug} (+${items.length} 链)`);
      items.forEach(i => {
        console.log(`     "${i.anchor}" → ${i.target}`);
        console.log(`     上下文: ...${i.context}...`);
      });
    });
  }

  // 6. dry-run 不写文件
  if (dryRun) {
    console.log('\n[injector] 🔇 dry-run 不写文件');
  } else {
    writeFileSync(blogPostsPath, content);
    console.log(`\n[injector] ✅ 写入 ${blogPostsPath}`);
  }
}

// ============================================================
// 工具函数
// ============================================================

// 建立 body var name → 服务的 slug 列表 映射
// 例: { 'article1Body' → ['how-to-choose-eps-pre-expander'], 'article2Body' → ['eps-vs-epp-differences-applications'] }
function buildVarToSlugsMap(src) {
  const map = new Map();
  const arrayStart = src.indexOf('export const blogPosts');
  if (arrayStart < 0) return map;
  const arr = src.slice(arrayStart);
  // 用宽松正则切分每个博客 entry
  const blocks = arr.split(/\{\s*\n\s*slug:/);
  blocks.forEach(b => {
    const slugM = b.match(/^\s*'([^']+)'/);
    if (!slugM) return;
    const slug = slugM[1];
    const bodyM = b.match(/body:\s*\{([\s\S]*?)\n\s*\}/);
    if (!bodyM) return;
    // 抽 body 块里的所有 var name 引用 (en: article1Body, es: article1Body, ...)
    const varRefs = [...bodyM[1].matchAll(/(?:en|es|pt|fr|ar|ru):\s*([a-zA-Z][a-zA-Z0-9_]*),?/g)];
    varRefs.forEach(m => {
      const v = m[1];
      if (!map.has(v)) map.set(v, []);
      if (!map.get(v).includes(slug)) map.get(v).push(slug);
    });
  });
  return map;
}

// 抽出所有 body 字符串块, 每块带 slug 列表
function extractBodyBlocks(src, varToSlugs) {
  const blocks = [];
  const arrayStart = src.indexOf('export const blogPosts');

  let i = 0;
  while (i < src.length) {
    const tickIdx = src.indexOf('`', i);
    if (tickIdx < 0) break;
    const closeIdx = findClosingBacktick(src, tickIdx + 1);
    if (closeIdx < 0) break;
    const text = src.slice(tickIdx + 1, closeIdx);
    if (text.trimStart().startsWith('<p>') && text.length > 1000) {
      // 推断 slug 列表
      let slugs = [];
      if (tickIdx < arrayStart) {
        // body var 定义区 (在 export 数组之前) - 通过 var name 反查
        const varName = findEnclosingVarName(src, tickIdx);
        if (varName && varToSlugs.has(varName)) {
          slugs = varToSlugs.get(varName);
        }
      } else {
        // inline body (直接在数组内) - 向上找最近的 slug
        const before = src.slice(0, tickIdx);
        const matches = [...before.matchAll(/slug:\s*'([^']+)'/g)];
        if (matches.length > 0) slugs = [matches[matches.length - 1][1]];
      }
      blocks.push({ start: tickIdx + 1, end: closeIdx, text, slugs });
    }
    i = closeIdx + 1;
  }
  return blocks;
}

// 找 backtick 位置之前最近的 `const VarName = ` 模式中的 VarName
function findEnclosingVarName(src, tickIdx) {
  const before = src.slice(Math.max(0, tickIdx - 200), tickIdx);
  const m = before.match(/const\s+([a-zA-Z][a-zA-Z0-9_]*)\s*=\s*$/);
  return m ? m[1] : null;
}

// 找闭合 backtick (跳过转义)
function findClosingBacktick(src, from) {
  let i = from;
  while (i < src.length) {
    if (src[i] === '\\') { i += 2; continue; }
    if (src[i] === '`') return i;
    i++;
  }
  return -1;
}

// 在 body 内安全注入 1 次 anchor link
function injectAnchorOnce(body, anchor, target) {
  const lower = body.toLowerCase();
  const anchorLower = anchor.toLowerCase();
  let cursor = 0;
  while (cursor < body.length) {
    const idx = lower.indexOf(anchorLower, cursor);
    if (idx < 0) return { injected: false, text: body };

    // 检查 1: 不在已有 <a> 内
    // 用"从 idx 向前找最近的 <a 和 </a>"对比, 哪个更近
    // - 最近是 </a> → 已闭合, 不在 link 内, 可以注入
    // - 最近是 <a  → 在 link 内, 跳过
    // - 都找不到 → 不在 link 内, 可以注入
    const beforeStr = body.slice(0, idx);
    const lastOpenIdx = beforeStr.lastIndexOf('<a ');
    const lastOpenIdx2 = beforeStr.lastIndexOf('<a\n');  // 极少数 <a\n href=...
    const lastOpen = Math.max(lastOpenIdx, lastOpenIdx2);
    const lastClose = beforeStr.lastIndexOf('</a>');
    if (lastOpen > lastClose) {
      cursor = idx + anchor.length;
      continue;
    }

    // 检查 2: 不在 HTML attribute 内 (向前找最近的 < 之前是否有 = 而无 >)
    const ctxNear = body.slice(Math.max(0, idx - 80), idx);
    if (/=["'][^"'>]*$/.test(ctxNear)) {
      cursor = idx + anchor.length;
      continue;
    }

    // 检查 3: 词边界 (前后是字母/数字则跳过, 避免 "ROI" 误匹配 "ROIs")
    const before = idx > 0 ? body[idx - 1] : ' ';
    const after = idx + anchor.length < body.length ? body[idx + anchor.length] : ' ';
    if (/[a-zA-Z0-9]/.test(before) || /[a-zA-Z0-9]/.test(after)) {
      cursor = idx + anchor.length;
      continue;
    }

    // 通过, 注入
    const realAnchor = body.slice(idx, idx + anchor.length);
    const replacement = `<a href="${target}">${realAnchor}</a>`;
    const newBody = body.slice(0, idx) + replacement + body.slice(idx + anchor.length);
    const ctxOut = body.slice(Math.max(0, idx - 30), idx + anchor.length + 30).replace(/\s+/g, ' ');
    return { injected: true, text: newBody, context: ctxOut };
  }
  return { injected: false, text: body };
}

main();

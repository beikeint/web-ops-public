#!/usr/bin/env node
/**
 * backfill-broken-images.mjs — 临时修复博客 image 字段引用 broken 图
 *
 * v11.1 (2026-05-07) — Path A 后批量治旧伤
 *
 * 策略:
 *   1. 扫 blog-posts.ts 中 image: '/images/blog/X.png|webp' 字段
 *   2. 检查 public/images/blog/X.{png,webp,jpg,jpeg,avif} 是否存在
 *   3. 不存在 → 注释掉 image 字段（保留为 TODO 待生成）
 *
 * 注意：这是临时方案。最终需要 image-generator 为每篇博客生成真封面图。
 * 优先级：标 P1 给"未来生成真图"路线。
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';

const CLIENTS = [
  '${WORKSPACE_ROOT}/客户/Demo-D-client-A',
  '${WORKSPACE_ROOT}/客户/Demo-C-client-B',
  '${WORKSPACE_ROOT}/客户/Demo-A-client-B2',
  '${WORKSPACE_ROOT}/客户/Demo-B-client-D',
];

const ARGS = { dryRun: process.argv.includes('--dry-run') };

function processSite(repoPath) {
  const fp = `${repoPath}/website/src/data/blog-posts.ts`;
  const publicDir = `${repoPath}/website/public`;
  const clientName = repoPath.split('/').pop();
  let content;
  try {
    content = readFileSync(fp, 'utf8');
  } catch {
    console.log(`⏭️  ${clientName}: 无 blog-posts.ts`);
    return { commented: 0 };
  }

  // 找所有 image: '/images/blog/X' 字段
  const imageRegex = /^(\s*)(image:\s*['"`])(\/images\/blog\/[^'"`]+)(['"`])(\s*,?)/gm;
  let commented = 0;
  const summary = [];

  let newContent = content.replace(imageRegex, (full, indent, prefix, imgPath, quote, suffix) => {
    // 去掉前导 / 拼到 publicDir
    const fsPath = `${publicDir}${imgPath}`;
    if (existsSync(fsPath)) {
      return full; // 图存在，不改
    }
    // 尝试不同扩展名
    const baseName = imgPath.replace(/\.[^.]+$/, '');
    for (const ext of ['.png', '.webp', '.jpg', '.jpeg', '.avif']) {
      if (existsSync(`${publicDir}${baseName}${ext}`)) {
        // 修正扩展名
        commented++;
        summary.push({ status: 'fixed-ext', from: imgPath, to: `${baseName}${ext}` });
        return `${indent}${prefix}${baseName}${ext}${quote}${suffix}`;
      }
    }
    // 真 broken — 注释掉
    commented++;
    summary.push({ status: 'commented', path: imgPath });
    return `${indent}// TODO v11.x 图待生成 — image: ${prefix}${imgPath}${quote}${suffix}`;
  });

  console.log(`\n🖼  ${clientName}: 处理 ${commented} 处 broken image`);
  for (const s of summary.slice(0, 15)) {
    if (s.status === 'fixed-ext') {
      console.log(`   ✏️  扩展名修正: ${s.from} → ${s.to}`);
    } else {
      console.log(`   💬 注释: ${s.path}`);
    }
  }

  if (!ARGS.dryRun && commented > 0) {
    writeFileSync(fp, newContent);
    console.log(`   ✅ 已写入: ${fp}`);
  } else if (ARGS.dryRun) {
    console.log(`   🔇 dry-run，未写盘`);
  }

  return { commented };
}

async function main() {
  console.log('🖼  backfill-broken-images v11.1 启动');
  let total = 0;
  for (const c of CLIENTS) {
    total += processSite(c).commented;
  }
  console.log(`\n✅ 完成. 跨 4 站处理 ${total} 处 broken image (注释/扩展修正).`);
  process.exit(0);
}

main().catch(e => {
  console.error('失败:', e);
  process.exit(1);
});

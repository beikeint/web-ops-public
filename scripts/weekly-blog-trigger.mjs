#!/usr/bin/env node
/**
 * 周三博客硬触发器 — 让博客生产 12 阶段独立跑（不被 daily-cron 50 turns 限制）
 *
 * 起源：v10.2 daily-cron 50 turns 单客户预算塞不下 12 阶段博客生产 + 6 语种翻译 + 部署 + IndexNow
 *      所以"周三 cron 段"虽然写了硬触发逻辑，但实际跑不动（max turns 触顶失败）
 * 解决：博客生产抽出来周三独立跑，每客户 max-turns 100, 30 min timeout, 单段独立子进程
 *
 * 调用：
 *   node weekly-blog-trigger.mjs [--client <id>] [--dry-run] [--no-push]
 *
 * cron：建议加 `0 3 * * 3` (UTC 周三 03:00 = 北京周三 11:00)
 *   pm2 加 weekly-blog-cron 进程（独立于 daily-check）
 */

import { spawn } from 'child_process';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { execSync } from 'child_process';

// 内联 loadEnv (web-ops 目录无 node_modules, 不依赖 dotenv)
function loadEnv(path) {
  if (!existsSync(path)) return;
  readFileSync(path, 'utf8').split('\n').forEach(line => {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  });
}
loadEnv('${WORKSPACE_ROOT}/mcp-servers/wecom-bot/.env');
loadEnv('${CLAUDE_HOME}/.env');

const CLAUDE_CLI = process.env.CLAUDE_CLI;
const CLAUDE_CWD = process.env.CLAUDE_CWD;
const CLAUDE_TOOLS = process.env.CLAUDE_ALLOWED_TOOLS;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const REPORT_DIR = '${WORKSPACE_ROOT}/mcp-servers/wecom-bot/reports';

const WEB_OPS_CLIENTS = [
  { id: 'client-A',  name: 'Demo-D',   domain: 'hearingprotect.com', repoPath: '${WORKSPACE_ROOT}/客户/Demo-D-client-A' },
  { id: 'client-B',  name: 'Demo-C',  domain: 'demo-c.com',       repoPath: '${WORKSPACE_ROOT}/客户/Demo-C-client-B' },
  { id: 'client-B2', name: 'Demo-A', domain: 'demo-a.com',       repoPath: '${WORKSPACE_ROOT}/客户/Demo-A-client-B2' },
  { id: 'client-D',  name: 'Demo-B',   domain: 'demo-b.com',       repoPath: '${WORKSPACE_ROOT}/客户/Demo-B-client-D' },
];

const PER_CLIENT_MAX_TURNS = 100;        // 博客生产 12 阶段 + 6 语种 + 部署 token 大户, 100 turns
const PER_CLIENT_TIMEOUT_MS = 1800000;   // 30 min/客户

const args = process.argv.slice(2);
const ARGS = {
  client: args[args.indexOf('--client') + 1] !== '--client' ? args[args.indexOf('--client') + 1] : null,
  dryRun: args.includes('--dry-run'),
  noPush: args.includes('--no-push'),
  force: args.includes('--force'),       // 不检查上周是否已有博客, 强制写
  thursday: args.includes('--thursday'), // v10.4 周四 fallback 专用 (双锁防 pm2 start 误触)
  manual: args.includes('--manual'),     // 人工调试 (绕过日期守卫)
};
if (args.indexOf('--client') < 0) ARGS.client = null;

async function main() {
  const date = new Date().toISOString().slice(0, 10);

  // v10.4 日期守卫: pm2 启动 / restart / resurrect 时会立刻拉起进程, 必须严格挡住
  // 进程类型由 ARGS.thursday 区分:
  //   - 周三 cron (不带 --thursday): 必须 dow===3 才跑, 否则退出
  //   - 周四 fallback cron (带 --thursday + --force): 必须 dow===4 才跑, 否则退出
  //   - --dry-run / --manual: 任意日跑 (人工调试用)
  const dow = new Date(`${date}T08:00:00+08:00`).getDay();
  const dowName = ['日','一','二','三','四','五','六'][dow];

  if (ARGS.dryRun || ARGS.manual) {
    console.log(`[weekly-blog] 周${dowName} ${ARGS.dryRun ? 'dry-run' : 'manual'} 模式, 跳过日期守卫`);
  } else if (ARGS.thursday) {
    // Thursday fallback 进程: 必须 dow===4 且 --force, 周三 cron 时段一定退出
    if (dow !== 4 || !ARGS.force) {
      console.log(`[weekly-blog] --thursday fallback 进程仅周四 + --force 才跑, 当前周${dowName}/--force=${ARGS.force}, 立即退出 (防 pm2 误触发)`);
      process.exit(0);
    }
  } else {
    // 周三 cron 进程 (不带 --thursday): 必须 dow===3
    if (dow !== 3) {
      console.log(`[weekly-blog] 周三 cron 进程仅周三才跑, 当前周${dowName}, 立即退出 (防 pm2 误触发). 手动跑加 --manual 或 --dry-run.`);
      process.exit(0);
    }
  }

  const targetClients = ARGS.client
    ? WEB_OPS_CLIENTS.filter(c => c.id === ARGS.client)
    : WEB_OPS_CLIENTS;

  console.log(`[weekly-blog] ${date} 启动 — 检查 ${targetClients.length} 客户上周博客发布数`);

  const results = [];
  for (const client of targetClients) {
    // v10.6 (2026-05-07): B2B 节奏阈值预防 — 防 SpamBrain 大规模产出信号
    const thisWeekBlogCount = countThisWeekBlogs(client.repoPath);
    const thisMonthBlogCount = countThisMonthBlogs(client.repoPath);
    if (thisWeekBlogCount >= 3 || thisMonthBlogCount >= 8) {
      const reason = thisWeekBlogCount >= 3
        ? `本周已 ${thisWeekBlogCount} 篇 ≥ 3 阈值`
        : `本月已 ${thisMonthBlogCount} 篇 ≥ 8 阈值`;
      console.log(`[weekly-blog] → ${client.name}: 🛑 v10.6 节奏阈值熔断 — ${reason}`);
      console.log(`  ⚠️  B2B 制造商不可信节奏 → SpamBrain 信号. 跳过. force 也不放行`);
      results.push({ client, skipped: true, reason: `v10.6 节奏熔断: ${reason}`, paceBlock: true });
      continue;
    }

    const lastWeekBlogCount = countLastWeekBlogs(client.repoPath);
    console.log(`[weekly-blog] → ${client.name}: 上周 ${lastWeekBlogCount} 篇 / 本周 ${thisWeekBlogCount} / 本月 ${thisMonthBlogCount}`);

    if (lastWeekBlogCount >= 1 && !ARGS.force) {
      console.log(`  ✓ 节奏达标 (≥1 篇/周), 跳过`);
      results.push({ client, skipped: true, reason: `上周 ${lastWeekBlogCount} 篇达标` });
      continue;
    }

    if (ARGS.dryRun) {
      console.log(`  🔇 dry-run 不真跑博客生产`);
      results.push({ client, dryRun: true });
      continue;
    }

    // 真跑博客生产 (v10.4: 配额耗尽延后 1h × 3 次重试)
    console.log(`  🚀 触发博客生产 (max-turns ${PER_CLIENT_MAX_TURNS})`);
    const t0 = Date.now();
    let attempt = 0;
    const MAX_RETRIES = 3;
    let lastErr = null;

    while (attempt < MAX_RETRIES) {
      attempt++;
      try {
        const out = await callClaude(buildBlogPrompt(client, date), {
          maxTurns: PER_CLIENT_MAX_TURNS,
          timeoutMs: PER_CLIENT_TIMEOUT_MS,
          tag: `blog-${client.id}-try${attempt}`,
        });
        results.push({ client, ok: true, output: out, durMs: Date.now() - t0, attempts: attempt });
        console.log(`  ✅ 完成 (${Math.round((Date.now()-t0)/1000)}s, 第 ${attempt} 次)`);
        lastErr = null;
        break;
      } catch (err) {
        lastErr = err;
        const isQuota = /hit your limit|限额|quota/i.test(err.message);
        const willRetry = isQuota && attempt < MAX_RETRIES;
        console.error(`  ❌ 第 ${attempt}/${MAX_RETRIES} 次失败: ${err.message.slice(0, 150)}`);
        if (willRetry) {
          console.log(`  ⏳ 配额耗尽, 延后 1h 重试 (第 ${attempt + 1} 次)...`);
          await new Promise(r => setTimeout(r, 3600000)); // 1h
        } else {
          break;
        }
      }
    }

    if (lastErr) {
      results.push({ client, ok: false, error: lastErr.message, durMs: Date.now() - t0, attempts: attempt });
    }
  }

  // 报告
  mkdirSync(REPORT_DIR, { recursive: true });
  const report = renderReport(date, results);
  writeFileSync(`${REPORT_DIR}/weekly-blog-${date}.txt`, report);

  // 推企微（每客户一段）
  if (!ARGS.noPush) await pushReport(date, results);

  process.exit(0);
}

function countLastWeekBlogs(repoPath) {
  return countBlogsInWindow(repoPath, '14 days ago', '7 days ago');
}

// v10.6 (2026-05-07) — B2B 节奏阈值预防
function countThisWeekBlogs(repoPath) {
  return countBlogsInWindow(repoPath, '7 days ago', null);
}

function countThisMonthBlogs(repoPath) {
  return countBlogsInWindow(repoPath, '30 days ago', null);
}

function countBlogsInWindow(repoPath, since, until) {
  if (!existsSync(repoPath + '/.git')) return 0;
  try {
    const untilArg = until ? `--until="${until}"` : '';
    const out = execSync(
      `git -C "${repoPath}" log --since="${since}" ${untilArg} --pretty=format:"%s" 2>/dev/null | grep -iE "feat\\(blog|content: 发布博客|博客.*发布|feat\\(content" | wc -l`,
      { encoding: 'utf8' }
    ).trim();
    return parseInt(out, 10) || 0;
  } catch {
    return 0;
  }
}

function buildBlogPrompt(client, date) {
  return `今天 ${date}（周三），对客户「${client.name}」(${client.id} / ${client.domain}) 跑 zero-touch 博客生产。

【背景】
- 上周该客户 0 篇新博客，节奏目标 ≥ 1 篇/周
- 本任务独立于 daily-cron, max-turns 100 充足

【流程】
1. 选题（数据驱动，三选一按 ROI 排）：
   a. 跑 ${client.repoPath}/scripts/topic-pool.mjs（若存在）拿 Top 1 潜力分 ≥ 50 主题 → 走全流程 12 阶段
   b. 跑 search-analytics.gsc_content_decay 找衰退 ≥ 30% 老博客 Top 1 → refresh skill 重写
   c. 调 search-analytics.gsc_search_performance 找 GSC Gap（高展示低排名）Top 1 → content-rapid-response 3 阶段快速产出

2. 全流程必走（按 .claude/skills/content-production.md 12 阶段，含 v10 7 项底线）：
   - 多模态强制（≥1 图/视频/信息图）
   - Person Schema sameAs（作者 + LinkedIn）
   - Topic Cluster 归属（挂 pillar）
   - AI 爬虫 robots.txt 已放行（验证）
   - llms.txt 强制更新
   - 6 语种翻译（如客户站支持）
   - 图片 SEO（width/height/loading/srcset/AVIF）
   - 部署 + IndexNow + GSC URL Inspection
   - timeline 写入 client-manager
   - 独立 git commit \`content: 发布博客 #N <slug>\`

3. 评分线 80 分，<80 不发布

【输出】≤ 2000 字符段：
## ${client.name} 周三博客硬触发结果
- 选题路径：a/b/c
- 主题：[blog title]
- slug：[blog slug]
- 评分：[X/100]
- commit hash：[hash]
- 部署：✅/❌
- IndexNow：✅/❌
- GSC URL Inspection：✅/❌

直接做完，不要列计划。`;
}

function callClaude(prompt, opts) {
  return new Promise((resolve, reject) => {
    const toolsList = CLAUDE_TOOLS ? CLAUDE_TOOLS.split(',').filter(Boolean) : [];
    const cliArgs = [
      '-p', prompt,
      '--output-format', 'text',
      '--max-turns', String(opts.maxTurns),
    ];
    if (toolsList.length > 0) cliArgs.push('--allowedTools', ...toolsList);

    const child = spawn(CLAUDE_CLI, cliArgs, {
      cwd: CLAUDE_CWD,
      env: { ...process.env, HOME: '${USER_HOME}' },
      timeout: opts.timeoutMs,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let out = '', err = '';
    child.stdout.on('data', d => out += d);
    child.stderr.on('data', d => err += d);
    child.on('close', code => {
      const partial = out.trim();
      const isPureError = /^Error:|^You've hit your limit/m.test(partial) && partial.length < 200;
      if (code === 0) resolve(partial || `(${opts.tag} 完成)`);
      else if (partial.length > 80 && !isPureError) resolve(partial + `\n\n⚠️ (${opts.tag} 退出码 ${code})`);
      else reject(new Error(isPureError ? `Claude CLI: ${partial}` : `退出码 ${code}${err ? ' | ' + err.slice(0, 300) : ''}`));
    });
    child.on('error', e => reject(e));
  });
}

function renderReport(date, results) {
  const lines = [`[周三博客硬触发报告 ${date}]`, ''];
  for (const r of results) {
    lines.push(`==== ${r.client.name} (${r.client.id}) ${r.ok ? '✅' : (r.skipped ? '⏭️' : (r.dryRun ? '🔇' : '❌'))} ====`);
    if (r.skipped) lines.push(`跳过: ${r.reason}`);
    else if (r.dryRun) lines.push('dry-run');
    else if (r.ok) lines.push(r.output);
    else lines.push(`失败: ${r.error}`);
    lines.push('');
  }
  return lines.join('\n');
}

async function pushReport(date, results) {
  if (!WEBHOOK_URL) return;
  // 头部摘要
  const ok = results.filter(r => r.ok).length;
  const skipped = results.filter(r => r.skipped).length;
  const failed = results.filter(r => r.ok === false).length;
  const header = `# 📝 周三博客硬触发 ${date}\n\n${ok} 篇新博客 / ${skipped} 客户跳过(节奏达标) / ${failed} 失败`;
  await pushOne(header);

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const seg = `# [${i+1}/${results.length}] ${r.client.name}\n\n` +
      (r.skipped ? `⏭️ ${r.reason}` :
       r.dryRun ? '🔇 dry-run' :
       r.ok ? r.output : `❌ ${r.error}`);
    await pushOne(seg);
    await new Promise(rr => setTimeout(rr, 1100));
  }
}

async function pushOne(content) {
  const body = content.length > 4000 ? content.slice(0, 3950) + '\n...(截断)' : content;
  try {
    await fetch(WEBHOOK_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ msgtype: 'markdown', markdown: { content: body } }),
    });
  } catch (e) { console.error('[push]', e.message); }
}

main().catch(e => { console.error('顶层异常', e); process.exit(1); });

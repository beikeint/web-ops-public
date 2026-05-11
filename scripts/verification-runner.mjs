#!/usr/bin/env node
/**
 * 验证待办自动执行器 — 防"我说明天验证就石沉大海"反模式
 * ================================================================
 * v1.0 (2026-05-01)
 *
 * 起源: 运营人员明确反馈"很多次都是要等第二天验证结果都是石沉大海无音讯, 然后一直
 *      完不成任务和得不到结果". 这是反复出现的反模式 — 我承诺"明天验证"但没机制
 *      保证真去验证, 完全靠运营人员记得来问 = 系统漏洞.
 *
 * 工作机制:
 *   1. 持久化清单: reports/verification-pending.json (人工/智能体 add 待验证项)
 *   2. 每日扫描: 由 daily-cron 阶段 4.7 调用 (跑完客户 + 反向触发后)
 *   3. 自动验证: 按 verifyType 跑验证命令 (git-grep / file-exists / custom-script)
 *   4. 主动推送: 通过/失败都推企微 — 不静默, 不靠运营人员问
 *   5. 状态更新: passed/failed/expired 写回 JSON, 老项目自动清理
 *
 * 调用:
 *   node verification-runner.mjs              # 跑所有到期项
 *   node verification-runner.mjs --no-push    # 不推企微
 *   node verification-runner.mjs --dry-run    # 干跑只打印不写盘
 *   node verification-runner.mjs --add <json> # 加新项 (从 stdin 读 JSON)
 *
 * 集成点:
 *   - daily-cron 阶段 4.7: 每天 8:30+ 自动跑
 *   - pm2 cron verification-daily (备用): 北京 9:30 兜底
 * ================================================================
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPORT_DIR = '${WORKSPACE_ROOT}/智能体/运营/网站运营-web-ops/reports';
const PENDING_PATH = `${REPORT_DIR}/verification-pending.json`;

// 加载 env (用于 WEBHOOK_URL 推企微)
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

const ARGS = (() => {
  const a = process.argv.slice(2);
  return {
    noPush: a.includes('--no-push'),
    dryRun: a.includes('--dry-run'),
    add: a.includes('--add'),
  };
})();

// ============================================================
// 时间工具
// ============================================================
function nowISO() {
  return new Date().toISOString();
}

function isPast(timeStr) {
  if (!timeStr) return true;
  // 支持 '2026-05-02 09:00' 格式 (默认 +0800 北京时区)
  const t = timeStr.includes('T')
    ? new Date(timeStr).getTime()
    : new Date(timeStr.replace(' ', 'T') + '+08:00').getTime();
  return Date.now() >= t;
}

// ============================================================
// 验证器
// ============================================================
async function verifyItem(item) {
  const t = item.verifyType;
  try {
    if (t === 'git-grep') return verifyGitGrep(item.verifyParams);
    if (t === 'file-exists') return verifyFileExists(item.verifyParams);
    if (t === 'file-exists-or-git-grep') {
      const a = verifyFileExists(item.verifyParams);
      if (a.passed) return a;
      const b = verifyGitGrep(item.verifyParams);
      return b.passed ? b : { passed: false, detail: `文件未找到 (${a.detail}) 且 git 无匹配 (${b.detail})` };
    }
    if (t === 'http-fetch') return await verifyHttpFetch(item.verifyParams);
    if (t === 'custom-script') return verifyCustomScript(item.verifyParams);
    return { passed: false, detail: `未知 verifyType: ${t}` };
  } catch (err) {
    return { passed: false, detail: `验证异常: ${err.message.slice(0, 200)}` };
  }
}

function verifyGitGrep(p) {
  const repos = p.gitRepoPaths || (p.repoPath ? [p.repoPath] : []);
  if (repos.length === 0) return { passed: false, detail: 'no repoPath' };
  const since = p.since || '1 day ago';
  const until = p.until || '';
  const patterns = p.patterns || [p.pattern].filter(Boolean);
  const minMatches = p.minMatches || 1;

  let totalMatches = 0;
  const details = [];
  for (const repo of repos) {
    if (!existsSync(`${repo}/.git`)) continue;
    try {
      const cmd = `git -C "${repo}" log --since="${since}"${until ? ` --until="${until}"` : ''} --pretty=format:"%s" 2>/dev/null`;
      const out = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
      if (!out) continue;
      const lines = out.split('\n').filter(Boolean);
      const re = new RegExp(patterns.join('|'), 'i');
      const matches = lines.filter(l => re.test(l));
      if (matches.length > 0) {
        totalMatches += matches.length;
        const repoName = repo.split('/').slice(-1)[0];
        details.push(`${repoName}: ${matches.slice(0, 3).map(m => m.slice(0, 80)).join('; ')}`);
      }
    } catch {}
  }
  return {
    passed: totalMatches >= minMatches,
    detail: totalMatches > 0 ? `${totalMatches} 命中. ${details.join(' | ')}` : `${repos.length} repo 全 0 命中 (期望 ≥${minMatches})`,
  };
}

function verifyFileExists(p) {
  const paths = p.paths || [];
  const globs = p.fileGlobs || [];
  const minCount = p.minCount || p.fileMinCount || 1;

  let count = 0;
  const found = [];

  for (const path of paths) {
    if (existsSync(path)) {
      count++;
      found.push(path);
    }
  }

  for (const glob of globs) {
    const idx = glob.lastIndexOf('/');
    const dir = idx >= 0 ? glob.slice(0, idx) : '.';
    const pat = idx >= 0 ? glob.slice(idx + 1) : glob;
    if (!existsSync(dir)) continue;
    try {
      const re = new RegExp(`^${pat.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')}$`);
      const files = readdirSync(dir).filter(f => re.test(f));
      count += files.length;
      found.push(...files.slice(0, 3).map(f => `${dir}/${f}`));
    } catch {}
  }

  return {
    passed: count >= minCount,
    detail: count > 0 ? `${count} 文件命中: ${found.slice(0, 3).join(', ')}` : `0 文件命中 (期望 ≥${minCount})`,
  };
}

async function verifyHttpFetch(p) {
  try {
    const r = await fetch(p.url);
    const ok = p.expectStatus ? r.status === p.expectStatus : r.ok;
    return { passed: ok, detail: `HTTP ${r.status}` };
  } catch (err) {
    return { passed: false, detail: `fetch 失败: ${err.message}` };
  }
}

function verifyCustomScript(p) {
  if (!p.script || !existsSync(p.script)) {
    return { passed: false, detail: `script 不存在: ${p.script}` };
  }
  try {
    const out = execSync(`bash "${p.script}"`, { encoding: 'utf8', timeout: 30000 }).toString().trim();
    return { passed: true, detail: `脚本输出: ${out.slice(0, 200)}` };
  } catch (err) {
    return { passed: false, detail: `脚本失败 (exit ${err.status}): ${(err.stdout || err.stderr || '').toString().slice(0, 200)}` };
  }
}

// ============================================================
// 推企微
// ============================================================
async function pushOne(content) {
  const url = process.env.WEBHOOK_URL;
  if (!url || ARGS.noPush) {
    console.log(`[push 跳过] 内容: ${content.slice(0, 200)}`);
    return;
  }
  const body = content.length > 4000 ? content.slice(0, 3950) + '\n...(截断)' : content;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ msgtype: 'markdown', markdown: { content: body } }),
    });
  } catch (e) {
    console.error('[push 失败]', e.message);
  }
}

// ============================================================
// 主流程
// ============================================================
async function main() {
  if (!existsSync(PENDING_PATH)) {
    console.log('[verification-runner] 无 pending 清单');
    return;
  }

  const data = JSON.parse(readFileSync(PENDING_PATH, 'utf8'));
  const items = data.items || [];

  const dueItems = items.filter(it =>
    it.status === 'pending' &&
    isPast(it.verifyAfter) &&
    !isPast(it.verifyExpire || '')  // 没到期不验证, 但已过期保持 pending 由下面 expire 段处理
  );

  // 标记过期
  let expiredCount = 0;
  for (const it of items) {
    if (it.status === 'pending' && it.verifyExpire && isPast(it.verifyExpire)) {
      it.status = 'expired';
      it.verifiedAt = nowISO();
      it.result = '验证窗口已过 — 跳过';
      expiredCount++;
    }
  }

  console.log(`[verification-runner] ${dueItems.length} 项到期需验证, ${expiredCount} 项过期`);

  if (dueItems.length === 0 && expiredCount === 0) {
    if (!ARGS.dryRun) writeFileSync(PENDING_PATH, JSON.stringify(data, null, 2));
    return;
  }

  // 跑验证
  const results = [];
  for (const item of dueItems) {
    console.log(`[verify] ${item.id} ...`);
    const r = await verifyItem(item);
    item.status = r.passed ? 'passed' : 'failed';
    item.verifiedAt = nowISO();
    item.result = r.detail;
    results.push({ item, r });
    console.log(`  → ${r.passed ? '✅ PASS' : '❌ FAIL'}: ${r.detail.slice(0, 150)}`);
  }

  // 写回 JSON
  if (!ARGS.dryRun) {
    writeFileSync(PENDING_PATH, JSON.stringify(data, null, 2));
  }

  // 推企微 (即使全 pass 也推 — "已验证"的可见性比"全静默"重要)
  const passed = results.filter(r => r.r.passed).length;
  const failed = results.filter(r => !r.r.passed).length;

  let msg = `# 🔍 验证待办 ${new Date().toISOString().slice(0, 10)}\n\n`;
  msg += `${passed} ✅ 通过 / ${failed} ❌ 失败 / ${expiredCount} ⏰ 过期\n\n`;

  for (const { item, r } of results) {
    msg += `${r.passed ? '✅' : '🔴'} **${item.id}**\n`;
    msg += `${r.passed ? item.onPass : item.onFail}\n`;
    msg += `*实测*: ${r.detail.slice(0, 200)}\n\n`;
  }

  if (expiredCount > 0) {
    msg += `\n⏰ ${expiredCount} 项验证窗口已过, 自动跳过 (避免老项目积压)\n`;
  }

  if (!ARGS.noPush) {
    await pushOne(msg);
  } else {
    console.log('\n=== 推送内容 (--no-push, 仅打印) ===');
    console.log(msg);
  }
}

main().catch(e => {
  console.error('[verification-runner] 顶层异常:', e);
  process.exit(1);
});

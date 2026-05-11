/**
 * 天花板能力 trigger 共享辅助 — 4 个反向触发器复用
 * (haro-batch / geo-attack / cro-experiment / looker-monthly)
 *
 * 起源: v10.5 ceiling-kpi-scanner 反向触发 5 域 cron, 都需要相同的:
 *   - loadEnv (web-ops 目录无 node_modules, 不依赖 dotenv)
 *   - callClaude (spawn Claude CLI + max-turns + timeout)
 *   - 单段企微推送
 */

import { spawn } from 'child_process';
import { existsSync, readFileSync } from 'fs';

export function loadEnv(path) {
  if (!existsSync(path)) return;
  readFileSync(path, 'utf8').split('\n').forEach(line => {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  });
}

export function loadStdEnv() {
  loadEnv('${WORKSPACE_ROOT}/mcp-servers/wecom-bot/.env');
  loadEnv('${CLAUDE_HOME}/.env');
}

export const WEB_OPS_CLIENTS = [
  { id: 'client-A',  name: 'Demo-D',    domain: 'demo-a.com', repoPath: '${WORKSPACE_ROOT}/客户/Demo-D-client-A' },
  { id: 'client-B',  name: 'Demo-C',   domain: 'demo-c.com',       repoPath: '${WORKSPACE_ROOT}/客户/Demo-C-client-B' },
  { id: 'client-B2', name: 'Demo-A',  domain: 'demo-a.com',       repoPath: '${WORKSPACE_ROOT}/客户/Demo-A-client-B2' },
  { id: 'client-D',  name: 'Demo-B',    domain: 'demo-b.com',       repoPath: '${WORKSPACE_ROOT}/客户/Demo-B-client-D' },
];

export function callClaude(prompt, opts = {}) {
  const { maxTurns = 60, timeoutMs = 1500000, tag = 'task' } = opts;
  const CLAUDE_CLI = process.env.CLAUDE_CLI;
  const CLAUDE_CWD = process.env.CLAUDE_CWD;
  const CLAUDE_TOOLS = process.env.CLAUDE_ALLOWED_TOOLS;

  return new Promise((resolve, reject) => {
    const toolsList = CLAUDE_TOOLS ? CLAUDE_TOOLS.split(',').filter(Boolean) : [];
    const cliArgs = [
      '-p', prompt,
      '--output-format', 'text',
      '--max-turns', String(maxTurns),
    ];
    if (toolsList.length > 0) cliArgs.push('--allowedTools', ...toolsList);

    const child = spawn(CLAUDE_CLI, cliArgs, {
      cwd: CLAUDE_CWD,
      env: { ...process.env, HOME: '${USER_HOME}' },
      timeout: timeoutMs,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let out = '', err = '';
    child.stdout.on('data', d => out += d);
    child.stderr.on('data', d => err += d);
    child.on('close', code => {
      const partial = out.trim();
      const isPureError = /^Error:|^You've hit your limit/m.test(partial) && partial.length < 200;
      if (code === 0) resolve(partial || `(${tag} 完成)`);
      else if (partial.length > 80 && !isPureError) resolve(partial + `\n\n⚠️ (${tag} 退出码 ${code})`);
      else reject(new Error(isPureError ? `Claude CLI: ${partial}` : `退出码 ${code}${err ? ' | ' + err.slice(0, 300) : ''}`));
    });
    child.on('error', e => reject(e));
  });
}

export async function pushOne(content) {
  const WEBHOOK_URL = process.env.WEBHOOK_URL;
  if (!WEBHOOK_URL) return;
  const body = content.length > 4000 ? content.slice(0, 3950) + '\n...(截断)' : content;
  try {
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ msgtype: 'markdown', markdown: { content: body } }),
    });
  } catch (e) { console.error('[push]', e.message); }
}

export function parseArgs() {
  const a = process.argv.slice(2);
  const get = (n) => { const i = a.indexOf(n); return i >= 0 ? a[i + 1] : null; };
  return {
    client: get('--client'),
    dryRun: a.includes('--dry-run'),
    noPush: a.includes('--no-push'),
    force: a.includes('--force'),
    manual: a.includes('--manual'),
  };
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

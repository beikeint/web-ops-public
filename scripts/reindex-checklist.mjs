#!/usr/bin/env node
/**
 * 🔄 GSC 重抓清单生成器（P1+ 人机协同索引加速器）
 *
 * 设计：
 *   - 智能体每天扫 4 客户站今日 git commit → 识别"值得 GSC 重抓"的页面
 *   - 按 commit 类型评分（新博客 10 / refresh 8 / Title 改 7 / Schema 5 / 内链 3）
 *   - 输出 markdown 清单 → 员工照单去 GSC 顶部搜索框点"请求编入索引"
 *   - GSC URL Inspection API 是 read-only（Google 反爬政策），手动点击是唯一合规路径
 *
 * 用法：
 *   node scripts/reindex-checklist.mjs                       # 跑全部 4 客户，自己推企微
 *   node scripts/reindex-checklist.mjs --client client-B   # 只跑 demo-c
 *   node scripts/reindex-checklist.mjs --days 2              # 扫近 2 天 commit（默认 1）
 *   node scripts/reindex-checklist.mjs --no-push             # 不推企微，只写本地报告
 *   node scripts/reindex-checklist.mjs --max 5               # 每站取 Top 5（默认 10，GSC 上限）
 *   node scripts/reindex-checklist.mjs --output json         # 输出 JSON 而非 markdown
 *
 * 集成：daily-cron.mjs 可 import { generateReindexChecklist }
 */

import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// 独立 CLI 模式：load ~/.claude/.env 让 WEBHOOK_URL 等变量可用（daily-cron 集成时已 dotenv.config()）
try {
  const envPath = `${process.env.HOME}/.claude/.env`;
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const m = line.match(/^export\s+([A-Z_]+)\s*=\s*['"]?(.*?)['"]?\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  }
} catch {}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================
// 4 客户配置（保持与 daily-cron.mjs 的 WEB_OPS_CLIENTS 一致）
// ============================================================
export const WEB_OPS_CLIENTS = [
  {
    id: 'client-A',  name: 'Demo-D',   domain: 'hearingprotect.com',
    repoPath: '${WORKSPACE_ROOT}/客户/Demo-D-client-A',
    websitePath: 'website',
  },
  {
    id: 'client-B',  name: 'Demo-C',  domain: 'demo-c.com',
    repoPath: '${WORKSPACE_ROOT}/客户/Demo-C-client-B',
    websitePath: 'website',
  },
  {
    id: 'client-B2', name: 'Demo-A', domain: 'demo-a.com',
    repoPath: '${WORKSPACE_ROOT}/客户/Demo-A-client-B2',
    websitePath: 'website',
  },
  {
    id: 'client-D',  name: 'Demo-B',   domain: 'demo-b.com',
    repoPath: '${WORKSPACE_ROOT}/客户/Demo-B-client-D',
    websitePath: 'website',
  },
];

const REPORT_DIR = '${WORKSPACE_ROOT}/智能体/运营/网站运营-web-ops/reports';
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const DEFAULT_MAX_PER_SITE = 10;  // GSC 每站每天 URL Inspection 请求上限

// ============================================================
// 评分规则：commit message + 文件路径 → URL 优先级
// ============================================================
const SCORING_RULES = [
  // [优先级, 类型描述, message 关键词正则, 路径关键词正则]
  [10, '新博客', /^(feat|add)/i, /\/blog\/[^/]+\.astro$|\/blog\/[^/]+\.md$|blog-posts\.ts/],
  [9,  '新产品页', /^(feat|add)/i, /\/products\/[^/[]+\.astro$/],
  [8,  '内容 refresh', /(refresh|rewrite|重写|重构|更新内容)/i, /\.(astro|ts|md)$/],
  [7,  'Title/Desc/CTR 改', /(title|desc|description|ctr|meta)/i, /\.(astro|ts)$/],
  [5,  'Schema 优化', /schema|jsonld|json-ld|结构化/i, /\.(astro|ts)$/],
  [3,  '内链注入', /(internal-link|internal_link|内链|backlink)/i, /\.(astro|ts|md|json)$/],
  [2,  '联系方式 / 配置', /(config|contact|whatsapp|email|tel|联系方式)/i, /(site\.config|BaseLayout|Header|Footer)/i],
  [1,  '其他改动', /.*/, /\.(astro|ts)$/],
];

// ============================================================
// 文件路径 → URL 推导（仅英文版，hreflang 自动联动其他语种）
// 4 客户都用 Astro `src/pages/[locale]/...` 结构
// ============================================================
function fileToUrls(filePath, domain, commitMsg) {
  const urls = [];

  // 模式 1: src/pages/[locale]/<page>.astro
  let m = filePath.match(/src\/pages\/\[locale\]\/(.+?)\.astro$/);
  if (m) {
    let path = m[1];
    // index.astro → /
    if (path === 'index') {
      urls.push(`https://${domain}/en/`);
      return urls;
    }
    // <page>/index.astro → /<page>/
    path = path.replace(/\/index$/, '');
    // 动态路由 [slug] / [group] 跳过
    if (path.includes('[')) return [];
    urls.push(`https://${domain}/en/${path}/`);
    return urls;
  }

  // 模式 2: src/pages/<lang>/<page>.astro（无 [locale]，部分老站）
  m = filePath.match(/src\/pages\/(en|es|fr|de|ru|ar|pt|zh)\/(.+?)\.astro$/);
  if (m) {
    if (m[1] !== 'en') return []; // 只取英文（hreflang 联动）
    let path = m[2].replace(/\/index$/, '');
    if (path === 'index') {
      urls.push(`https://${domain}/en/`);
      return urls;
    }
    if (path.includes('[')) return [];
    urls.push(`https://${domain}/en/${path}/`);
    return urls;
  }

  // 模式 3: src/data/blog-posts.ts → 从 commit message 找 slug
  if (filePath.match(/src\/data\/blog-posts\.(ts|js|json)$/)) {
    // commit message 形如 "feat(blog): EPS vs EPP 对比" or "blog: eps-vs-epp"
    // 提取可能的 slug（kebab-case 单词）
    const slugMatch = commitMsg.match(/[a-z][a-z0-9]+(?:-[a-z0-9]+){2,}/g);
    if (slugMatch) {
      for (const slug of slugMatch) {
        urls.push(`https://${domain}/en/blog/${slug}/`);
      }
    }
    return urls;
  }

  // 模式 4: BaseLayout / Header / Footer / site.config → 全站影响，推首页 + 主要落地页
  if (filePath.match(/(BaseLayout|Header|Footer|site\.config)/)) {
    urls.push(`https://${domain}/en/`);
    urls.push(`https://${domain}/en/products/`);
    urls.push(`https://${domain}/en/contact/`);
    return urls;
  }

  return [];
}

// ============================================================
// 评分
// ============================================================
function scoreUrl(filePath, commitMsg) {
  for (const [score, label, msgRegex, pathRegex] of SCORING_RULES) {
    if (msgRegex.test(commitMsg) && pathRegex.test(filePath)) {
      return { score, label };
    }
  }
  return { score: 1, label: '其他改动' };
}

// ============================================================
// 扫一个客户 git log 拿改动
// ============================================================
function scanClient(client, sinceISO) {
  const cwd = client.repoPath;
  if (!existsSync(`${cwd}/.git`)) {
    return { client, error: `git repo 不存在: ${cwd}/.git`, urls: [] };
  }

  let gitLogOut;
  try {
    // git log --since=<ISO> --name-only --pretty=format:"COMMIT|%H|%s"
    gitLogOut = execFileSync('git', [
      'log',
      `--since=${sinceISO}`,
      '--name-only',
      '--pretty=format:COMMIT|%H|%s',
      '--no-merges',
    ], { cwd, encoding: 'utf-8', timeout: 15000 });
  } catch (e) {
    return { client, error: `git log 失败: ${e.message.slice(0, 200)}`, urls: [] };
  }

  if (!gitLogOut.trim()) return { client, urls: [], commits: 0 };

  // 解析 commit + 文件
  const commits = []; // [{ hash, msg, files: [] }]
  let cur = null;
  for (const line of gitLogOut.split('\n')) {
    if (line.startsWith('COMMIT|')) {
      if (cur) commits.push(cur);
      const [, hash, ...msgParts] = line.split('|');
      cur = { hash, msg: msgParts.join('|'), files: [] };
    } else if (cur && line.trim()) {
      cur.files.push(line.trim());
    }
  }
  if (cur) commits.push(cur);

  // 文件 → URL + 评分（去重 + 取每个 URL 的最高分）
  const urlMap = new Map(); // url → { score, label, sources: [] }
  for (const c of commits) {
    for (const f of c.files) {
      const urls = fileToUrls(f, client.domain, c.msg);
      const { score, label } = scoreUrl(f, c.msg);
      for (const u of urls) {
        const existing = urlMap.get(u);
        if (!existing || existing.score < score) {
          urlMap.set(u, {
            score, label,
            sources: [{ commit: c.hash.slice(0, 8), msg: c.msg, file: f }],
          });
        } else if (existing.score === score) {
          existing.sources.push({ commit: c.hash.slice(0, 8), msg: c.msg, file: f });
        }
      }
    }
  }

  // 排序（分数降序 + 入库时间降序作为隐式 tie-breaker）
  const urls = Array.from(urlMap.entries())
    .map(([url, data]) => ({ url, ...data }))
    .sort((a, b) => b.score - a.score);

  return { client, urls, commits: commits.length };
}

// ============================================================
// 核心：生成清单（导出供 daily-cron 调用）
// ============================================================
export async function generateReindexChecklist({
  clients = WEB_OPS_CLIENTS,
  sinceISO,
  maxPerSite = DEFAULT_MAX_PER_SITE,
} = {}) {
  // 默认 since = 今日 00:00 北京时间
  if (!sinceISO) {
    const todayBJT = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
    sinceISO = `${todayBJT}T00:00:00+08:00`;
  }

  const results = clients.map(c => scanClient(c, sinceISO));

  // 截断每站 Top N
  for (const r of results) {
    if (r.urls.length > maxPerSite) {
      r.urls = r.urls.slice(0, maxPerSite);
      r.truncated = true;
    }
  }

  const totalUrls = results.reduce((s, r) => s + r.urls.length, 0);
  const todayBJT = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);

  // ----- Markdown 渲染（员工友好）-----
  let md = `# 🔄 GSC 重抓清单 · ${todayBJT} · @员工\n\n`;

  if (totalUrls === 0) {
    md += `## ✅ 今日无改动，跳过\n\n`;
    md += `4 站今日均无新博客 / Title 改 / Schema / 内链注入 等需重抓动作，员工今天**不用做**。\n\n`;
    md += `下次有 git commit 涉及内容/SEO 改动时，本清单会自动出现。\n`;
  } else {
    md += `## 📋 工作量\n`;
    md += `- 4 站共 ${totalUrls} 个 URL（约 ${Math.ceil(totalUrls * 0.5)}-${Math.ceil(totalUrls)} 分钟）\n`;
    md += `- 每个 URL 30 秒：复制 → 粘贴 GSC 顶部搜索框 → 回车 → 右上角"请求编入索引"\n`;
    md += `- 评分越高越值得做（10 = 新博客 / 7 = CTR Title 改 / 3 = 内链）\n\n`;

    for (const r of results) {
      if (r.error) {
        md += `## ⚠️ ${r.client.name}（${r.client.domain}）\n${r.error}\n\n`;
        continue;
      }
      if (r.urls.length === 0) {
        md += `## ✅ ${r.client.name}（${r.client.domain}）— 无改动跳过\n\n`;
        continue;
      }
      md += `## ${r.client.name}（${r.client.domain}）— ${r.urls.length} 个${r.truncated ? '（已截到 Top ' + maxPerSite + '）' : ''}\n\n`;
      for (const u of r.urls) {
        md += `- \`[${u.score}]\` ${u.label}\n`;
        md += `  ${u.url}\n`;
        const top = u.sources[0];
        md += `  > ${top.commit} · ${top.msg.slice(0, 80)}${top.msg.length > 80 ? '...' : ''}\n`;
      }
      md += '\n';
    }

    md += `---\n`;
    md += `## 操作流程\n`;
    md += `1. 浏览器开 https://search.google.com/search-console\n`;
    md += `2. 左上角属性下拉切到对应站\n`;
    md += `3. 复制本清单 URL → 粘贴 GSC 顶部搜索框 → 回车\n`;
    md += `4. 等 5-10 秒看到 "网址检查" 结果 → 右上角点 **请求编入索引**\n`;
    md += `5. 一站点完换下一站\n`;
    md += `6. 全部完成 → 企微回 "+1"\n\n`;
    md += `> **提示**：每站每天 GSC 上限 10 个 URL，超过会拒绝\n`;
    md += `> **提示**：7 天后智能体会自动跑 \`reindex-followup.mjs\` 复盘哪些真被 Google 索引了\n`;
  }

  // ----- JSON（备查 + followup 用）-----
  const json = {
    date: todayBJT,
    sinceISO,
    totalUrls,
    perClient: results.map(r => ({
      id: r.client.id,
      name: r.client.name,
      domain: r.client.domain,
      error: r.error || null,
      commits: r.commits || 0,
      urls: r.urls.map(u => ({
        url: u.url,
        score: u.score,
        label: u.label,
        sources: u.sources.slice(0, 3),
      })),
    })),
  };

  return { markdown: md, json };
}

// ============================================================
// 推企微（独立 CLI 模式用）
// ============================================================
async function pushToWecom(content) {
  if (!WEBHOOK_URL) {
    console.warn('[reindex] WEBHOOK_URL 未配置，跳过推送');
    return;
  }
  const MAX = 4000;
  let s = content, part = 1, total = Math.ceil(s.length / MAX);
  while (s.length > 0) {
    let chunk;
    if (s.length <= MAX) { chunk = s; s = ''; }
    else {
      let cut = s.lastIndexOf('\n', MAX);
      if (cut < MAX * 0.5) cut = MAX;
      chunk = s.slice(0, cut);
      s = s.slice(cut).replace(/^\n+/, '');
    }
    const tag = total > 1 ? `（${part}/${total}）` : '';
    const text = part === 1 ? chunk : `（接上 ${tag}）\n\n${chunk}`;
    const r = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ msgtype: 'markdown', markdown: { content: text } }),
    });
    const data = await r.json();
    if (data.errcode !== 0) console.error('[reindex push] 失败:', data.errmsg);
    else console.log(`[reindex push] ✅ 段 ${part}/${total} 推送成功`);
    await new Promise(rs => setTimeout(rs, 1100));
    part++;
  }
}

// ============================================================
// 独立 CLI 入口
// ============================================================
if (process.argv[1] === __filename || import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2);
  const args = {
    client: null,
    days: 1,
    noPush: argv.includes('--no-push'),
    max: DEFAULT_MAX_PER_SITE,
    output: 'md', // md | json | both
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--client') args.client = argv[++i];
    else if (argv[i] === '--days') args.days = parseInt(argv[++i], 10);
    else if (argv[i] === '--max') args.max = parseInt(argv[++i], 10);
    else if (argv[i] === '--output') args.output = argv[++i];
  }

  const clients = args.client
    ? WEB_OPS_CLIENTS.filter(c => c.id === args.client)
    : WEB_OPS_CLIENTS;
  if (args.client && clients.length === 0) {
    console.error(`❌ --client ${args.client} 不在 WEB_OPS_CLIENTS 名单`);
    process.exit(1);
  }

  // 算 sinceISO（北京时间今天 00:00 减 days-1）
  const todayBJT = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
  const sinceDate = new Date(`${todayBJT}T00:00:00+08:00`);
  sinceDate.setDate(sinceDate.getDate() - (args.days - 1));
  const sinceISO = sinceDate.toISOString().replace(/\.\d{3}Z$/, '+00:00');

  console.log(`[reindex] 扫 ${clients.length} 客户 since=${sinceISO} max-per-site=${args.max}`);

  const result = await generateReindexChecklist({
    clients,
    sinceISO,
    maxPerSite: args.max,
  });

  // 写本地报告
  mkdirSync(REPORT_DIR, { recursive: true });
  const dateSlug = todayBJT;
  if (args.output === 'md' || args.output === 'both') {
    const path = `${REPORT_DIR}/reindex-${dateSlug}.md`;
    writeFileSync(path, result.markdown);
    console.log(`[reindex] 📝 markdown 已写: ${path}`);
  }
  if (args.output === 'json' || args.output === 'both') {
    const path = `${REPORT_DIR}/reindex-${dateSlug}.json`;
    writeFileSync(path, JSON.stringify(result.json, null, 2));
    console.log(`[reindex] 📝 json 已写: ${path}`);
  }
  // 永远写一份 latest.json 让 followup 能找到
  writeFileSync(`${REPORT_DIR}/reindex-latest.json`, JSON.stringify(result.json, null, 2));

  // 推企微
  if (!args.noPush) {
    console.log(`[reindex] 推企微... ${result.json.totalUrls} URLs`);
    await pushToWecom(result.markdown);
  } else {
    console.log('[reindex] 🔇 --no-push 跳过推送');
  }

  // 控制台简报
  console.log(`\n=== 完成 ===`);
  console.log(`总 URL: ${result.json.totalUrls}`);
  for (const pc of result.json.perClient) {
    console.log(`  ${pc.name}: ${pc.urls.length} URLs (${pc.commits} commits)`);
  }
}

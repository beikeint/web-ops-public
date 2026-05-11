#!/usr/bin/env node
/**
 * 🔍 GSC 重抓 7 天后复盘（P1+ 人机协同索引加速器 - 闭环验证）
 *
 * 设计：
 *   - 读 7 天前的 reindex-checklist JSON（reports/reindex-YYYY-MM-DD.json）
 *   - 对清单上每个 URL 调 GSC URL Inspection API 查当前索引状态
 *   - 输出复盘报告：✅ 已索引 / ⚠️ 已爬未索引 / ❌ 未爬到
 *   - 反向喂员工"上周哪些点了真有效，哪些没用"，让手动操作有数据反馈
 *   - 这是把人机协同变成数据驱动的关键闭环
 *
 * 用法：
 *   node scripts/reindex-followup.mjs                    # 复盘 7 天前清单
 *   node scripts/reindex-followup.mjs --days 7           # 默认 7
 *   node scripts/reindex-followup.mjs --date 2026-04-22  # 指定日期复盘
 *   node scripts/reindex-followup.mjs --no-push          # 不推企微
 *
 * 注意：GSC URL Inspection API 跟 Indexing API 是两个不同的端点：
 *   - URL Inspection API（urlInspection.index.inspect）→ 只读，能查任何 URL 的索引状态
 *   - Indexing API → 写入端点，但只支持 JobPosting + BroadcastEvent
 *   - 我们用前者做复盘，合规无风险
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// 独立 CLI / pm2 跑时 load ~/.claude/.env（pm2 ecosystem 不会自动注入）
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

const REPORT_DIR = '${WORKSPACE_ROOT}/智能体/运营/网站运营-web-ops/reports';
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const KEY_FILE = '${GSC_CONFIG_PATH}/example-seo.json';

// 客户域名 → GSC siteUrl（与 search-analytics MCP 的 GSC_SITE_OVERRIDES 保持一致）
const GSC_SITE_OVERRIDES = {
  'demo-b.com': 'https://demo-b.com/',
  'demo-a.com': 'https://demo-a.com/',
  'demo-a.com': 'https://demo-a.com/',
};
function gscSiteUrl(domain) {
  return GSC_SITE_OVERRIDES[domain] || `sc-domain:${domain}`;
}

// ============================================================
// 调 GSC URL Inspection API（用 Python，跟 search-analytics MCP 一致避免 gRPC 代理问题）
// ============================================================
function inspectUrls(siteUrl, urls) {
  // 调一次 Python 子进程跑批查（每个 URL 一次 API 请求）
  const code = `
import json, sys
from google.oauth2 import service_account
from googleapiclient.discovery import build

creds = service_account.Credentials.from_service_account_file(
    '${KEY_FILE}',
    scopes=['https://www.googleapis.com/auth/webmasters.readonly']
)
service = build('searchconsole', 'v1', credentials=creds)

site_url = ${JSON.stringify(siteUrl)}
urls = ${JSON.stringify(urls)}
results = []
for u in urls:
    try:
        resp = service.urlInspection().index().inspect(body={
            'inspectionUrl': u,
            'siteUrl': site_url,
            'languageCode': 'en-US',
        }).execute()
        idx = resp.get('inspectionResult', {}).get('indexStatusResult', {})
        verdict = idx.get('verdict', 'UNKNOWN')  # PASS, NEUTRAL, FAIL, etc
        coverage = idx.get('coverageState', '')   # e.g. "Submitted and indexed"
        last_crawl = idx.get('lastCrawlTime', '')
        google_canonical = idx.get('googleCanonical', '')
        user_canonical = idx.get('userCanonical', '')
        crawled_as = idx.get('crawledAs', '')
        results.append({
            'url': u, 'verdict': verdict, 'coverage': coverage,
            'last_crawl': last_crawl, 'crawled_as': crawled_as,
            'google_canonical': google_canonical, 'user_canonical': user_canonical,
        })
    except Exception as e:
        results.append({'url': u, 'error': str(e)[:200]})

print(json.dumps(results, ensure_ascii=False))
`;

  const tmp = `/tmp/reindex_inspect_${Date.now()}_${Math.floor(Math.random() * 10000)}.py`;
  writeFileSync(tmp, code);
  try {
    const out = execFileSync('python3', [tmp], { encoding: 'utf-8', timeout: 120000 });
    return JSON.parse(out);
  } catch (e) {
    return urls.map(u => ({ url: u, error: e.message.slice(0, 200) }));
  }
}

// ============================================================
// 状态映射
// ============================================================
function categorizeStatus(item) {
  if (item.error) return { tier: 'error', emoji: '🔴', label: '查询失败' };
  const cov = (item.coverage || '').toLowerCase();
  if (item.verdict === 'PASS' || cov.includes('indexed')) {
    return { tier: 'indexed', emoji: '✅', label: '已索引' };
  }
  if (cov.includes('crawled') || cov.includes('discovered') || item.last_crawl) {
    return { tier: 'crawled', emoji: '⚠️', label: '已爬未索引' };
  }
  // "URL is unknown to Google" / "not found" / "blocked" 都视为未爬到
  if (cov.includes('not found') || cov.includes('blocked') || cov.includes('unknown') || item.verdict === 'FAIL') {
    return { tier: 'fail', emoji: '🔴', label: '未爬到' };
  }
  return { tier: 'unknown', emoji: '❓', label: '状态不明' };
}

// ============================================================
// 主流程
// ============================================================
async function main() {
  const argv = process.argv.slice(2);
  const args = { days: 7, date: null, noPush: argv.includes('--no-push') };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--days') args.days = parseInt(argv[++i], 10);
    else if (argv[i] === '--date') args.date = argv[++i];
  }

  // 算复盘目标日期
  let targetDate = args.date;
  if (!targetDate) {
    const d = new Date(Date.now() + 8 * 3600 * 1000);
    d.setDate(d.getDate() - args.days);
    targetDate = d.toISOString().slice(0, 10);
  }

  const checklistFile = `${REPORT_DIR}/reindex-${targetDate}.json`;
  if (!existsSync(checklistFile)) {
    const msg = `# 🔍 GSC 重抓复盘 · ${targetDate}\n\n找不到 ${args.days} 天前的清单文件 \`reindex-${targetDate}.json\`，可能那天没生成清单（无改动日）或清单还未启用。`;
    console.log(msg);
    if (!args.noPush) await pushToWecom(msg);
    process.exit(0);
  }

  const checklist = JSON.parse(readFileSync(checklistFile, 'utf-8'));
  const todayBJT = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);

  console.log(`[followup] 复盘 ${targetDate} 清单（共 ${checklist.totalUrls} URLs）`);

  // 按客户分组调 inspect
  const perClient = [];
  for (const pc of checklist.perClient) {
    if (!pc.urls || pc.urls.length === 0) {
      perClient.push({ ...pc, results: [] });
      continue;
    }
    const siteUrl = gscSiteUrl(pc.domain);
    console.log(`[followup] 查 ${pc.name} ${pc.urls.length} URLs (siteUrl=${siteUrl})...`);
    const urlList = pc.urls.map(u => u.url);
    const inspectResults = inspectUrls(siteUrl, urlList);
    // 合并 inspect 结果回 url 对象
    const resultMap = new Map(inspectResults.map(r => [r.url, r]));
    const results = pc.urls.map(u => ({
      ...u,
      ...resultMap.get(u.url),
      ...categorizeStatus(resultMap.get(u.url) || {}),
    }));
    perClient.push({ ...pc, results });
  }

  // ----- Markdown 渲染 -----
  let md = `# 🔍 GSC 重抓 7 天复盘 · ${todayBJT}\n\n`;
  md += `**复盘对象**：${targetDate} 清单（${checklist.totalUrls} URLs）\n\n`;

  // 总览
  let totalIndexed = 0, totalCrawled = 0, totalFail = 0, totalErr = 0, totalAll = 0;
  for (const pc of perClient) {
    for (const r of pc.results) {
      totalAll++;
      if (r.tier === 'indexed') totalIndexed++;
      else if (r.tier === 'crawled') totalCrawled++;
      else if (r.tier === 'fail') totalFail++;
      else totalErr++;  // tier === 'error' 或 'unknown' 都归未明
    }
  }
  if (totalAll === 0) {
    md += `## ✅ ${targetDate} 当日清单为空，无需复盘\n`;
  } else {
    const pct = (n) => `${Math.round(n * 100 / totalAll)}%`;
    md += `## 📊 总览\n`;
    md += `- ✅ 已索引：${totalIndexed} 个 (${pct(totalIndexed)})\n`;
    md += `- ⚠️ 已爬未索引：${totalCrawled} 个 (${pct(totalCrawled)})\n`;
    md += `- 🔴 未爬到：${totalFail} 个 (${pct(totalFail)})\n`;
    md += `- ❓ 状态不明 / 错误：${totalErr} 个 (${pct(totalErr)})\n\n`;

    // ROI 提示
    if (totalIndexed >= totalAll * 0.7) {
      md += `🎉 **加速效果好**：${pct(totalIndexed)} 已索引，员工手动重抓有效。继续保持。\n\n`;
    } else if (totalCrawled >= totalAll * 0.5) {
      md += `🟡 **部分有效**：Google 爬到了大部分，但还没决定索引 — 内容质量 / 内链 / 外链可能要加强。\n\n`;
    } else {
      md += `⚠️ **效果偏弱**：未爬到比例高 — 可能是站太新、页面权重低、或 Google 对站整体信任不足。\n\n`;
    }

    // 每客户细节
    for (const pc of perClient) {
      if (!pc.results || pc.results.length === 0) continue;
      md += `## ${pc.name}（${pc.domain}）\n\n`;
      for (const r of pc.results) {
        md += `- ${r.emoji} \`[${r.score || '?'}]\` ${r.label} — ${r.url}\n`;
        if (r.coverage) md += `  > coverage: ${r.coverage}\n`;
        if (r.last_crawl) md += `  > 上次爬取: ${r.last_crawl.slice(0, 16).replace('T', ' ')}\n`;
        if (r.error) md += `  > 错误: ${r.error.slice(0, 100)}\n`;
      }
      md += '\n';
    }

    // 行动建议
    md += `---\n## 💡 下一步建议\n`;
    if (totalCrawled > 0) {
      md += `- ⚠️ ${totalCrawled} 个"已爬未索引" → 检查页面 thin content / 重复 / 低质量？提升内容长度 + 加 Schema + 加内链\n`;
    }
    if (totalFail > 0) {
      md += `- 🔴 ${totalFail} 个"未爬到" → 跑 \`scripts/reindex-checklist.mjs --client <id>\` 重新加进今日清单 + 让员工再点一次\n`;
    }
    if (totalErr > 0) {
      md += `- ❓ ${totalErr} 个状态不明 → 可能 GSC 还在处理中（24-48h）或 sa 权限问题，明日复盘\n`;
    }
  }

  md += `\n> 来源：reports/reindex-${targetDate}.json + GSC URL Inspection API 实时查询`;

  // 写本地复盘文件
  const followupPath = `${REPORT_DIR}/reindex-followup-${todayBJT}.md`;
  mkdirSync(REPORT_DIR, { recursive: true });
  writeFileSync(followupPath, md);
  console.log(`[followup] 📝 复盘已写: ${followupPath}`);

  // 推企微
  if (!args.noPush) {
    console.log(`[followup] 推企微...`);
    await pushToWecom(md);
  }

  // 控制台简报
  console.log(`\n=== 复盘完成 ===`);
  console.log(`总: ${totalAll} | ✅ ${totalIndexed} | ⚠️ ${totalCrawled} | 🔴 ${totalFail} | ❓ ${totalErr}`);
}

// 推企微（同 reindex-checklist 的实现）
async function pushToWecom(content) {
  if (!WEBHOOK_URL) return;
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
    if (data.errcode !== 0) console.error('[followup push] 失败:', data.errmsg);
    await new Promise(rs => setTimeout(rs, 1100));
    part++;
  }
}

main().catch(e => {
  console.error('[followup] 异常:', e);
  process.exit(1);
});

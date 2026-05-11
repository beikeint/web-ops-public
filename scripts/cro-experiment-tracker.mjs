#!/usr/bin/env node
/**
 * CRO 实验跟踪器 (v10.2 batch7) — 强化智能体的实验文化
 *
 * 起源: demo-c 已有 docs/ctr-log.md 手写复盘环, 但仅 demo-c 用. 4 客户应统一用结构化 JSON 实验记录,
 *      让"假设→改动→7/14/30 天数据→提升 lift / 失败教训"自动跑.
 *
 * 设计理念: CRO 不只 A/B 测试 (那需 Microsoft Clarity / GrowthBook 埋点),
 *           也包括"前后对比"实验 (改 Title 前 7 天 vs 改后 7 天). 这种最简但最实用.
 *
 * 用法:
 *   node cro-experiment-tracker.mjs --list [--client <id>]    # 列所有实验状态
 *   node cro-experiment-tracker.mjs --review [--client <id>]  # 跑过期 review (拉 GSC 对比)
 *   node cro-experiment-tracker.mjs --register-template       # 输出 JSON 模板
 *
 * 实验 JSON: 客户/<X>/website/docs/cro-experiments.json
 *
 * 集成:
 *   - daily-cron 周日段自动跑 --review (检查所有客户)
 *   - 周一 CTR 引擎扫到机会页改 Title 后, 同时登记一条实验
 *   - 提升 > 1pp 进"有效模式库" / 下降 > 1pp 进"失败教训"
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';

const CLIENT_DIRS = {
  demo-c:        '${WORKSPACE_ROOT}/客户/Demo-C-client-B',
  'client-B':    '${WORKSPACE_ROOT}/客户/Demo-C-client-B',
  demo-a:        '${WORKSPACE_ROOT}/客户/Demo-A-client-B2',
  'client-B2':   '${WORKSPACE_ROOT}/客户/Demo-A-client-B2',
  demo-b:        '${WORKSPACE_ROOT}/客户/Demo-B-client-D',
  'client-D':    '${WORKSPACE_ROOT}/客户/Demo-B-client-D',
  hearingprotect:  '${WORKSPACE_ROOT}/客户/Demo-D-client-A',
  'client-A':    '${WORKSPACE_ROOT}/客户/Demo-D-client-A',
};

const ALL_CLIENTS = ['client-A', 'client-B', 'client-B2', 'client-D'];

const args = process.argv.slice(2);
const get = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const ARGS = {
  list: args.includes('--list'),
  review: args.includes('--review'),
  template: args.includes('--register-template'),
  client: get('--client'),
};

if (ARGS.template) { printTemplate(); process.exit(0); }
if (ARGS.list) listExperiments();
else if (ARGS.review) reviewExperiments();
else { console.log('用法: node cro-experiment-tracker.mjs [--list|--review] [--client <id>] [--register-template]'); process.exit(1); }

function expFilePath(client) {
  const dir = CLIENT_DIRS[client];
  if (!dir) return null;
  return `${dir}/website/docs/cro-experiments.json`;
}

function loadExp(client) {
  const path = expFilePath(client);
  if (!path || !existsSync(path)) return [];
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return []; }
}

function saveExp(client, data) {
  const path = expFilePath(client);
  writeFileSync(path, JSON.stringify(data, null, 2));
}

function listExperiments() {
  const targets = ARGS.client ? [ARGS.client] : ALL_CLIENTS;
  console.log('=== CRO 实验状态 ===\n');
  let totalRunning = 0, totalSuccess = 0, totalFail = 0, totalPending = 0;
  for (const c of targets) {
    const exps = loadExp(c);
    if (exps.length === 0) {
      console.log(`📋 ${c}: 0 实验`);
      continue;
    }
    console.log(`📋 ${c}: ${exps.length} 实验`);
    exps.forEach(e => {
      const icon = e.status === 'success' ? '✅' : e.status === 'failed' ? '🔴' : e.status === 'inconclusive' ? '🟡' : '🔄';
      console.log(`  ${icon} ${e.id} [${e.status || 'running'}] ${e.variable_type || 'change'}: ${(e.hypothesis || '').slice(0, 60)}`);
      console.log(`     页面: ${e.page} | 指标: ${e.metric} | 开始: ${e.experiment_start}`);
      if (e.results && e.results.length > 0) {
        e.results.forEach(r => console.log(`     [${r.review_date}] ${r.metric_value} (lift ${r.lift > 0 ? '+' : ''}${r.lift}${r.unit || ''})`));
      }
      if (e.status === 'success') totalSuccess++;
      else if (e.status === 'failed') totalFail++;
      else if (e.status === 'inconclusive') totalPending++;
      else totalRunning++;
    });
  }
  console.log(`\n汇总: 运行中 ${totalRunning} / 成功 ${totalSuccess} / 失败 ${totalFail} / 不确定 ${totalPending}`);
}

function reviewExperiments() {
  const today = new Date().toISOString().slice(0, 10);
  const targets = ARGS.client ? [ARGS.client] : ALL_CLIENTS;
  let dueCount = 0;
  console.log('=== CRO 实验 review (today: ' + today + ') ===\n');

  for (const c of targets) {
    const exps = loadExp(c);
    if (exps.length === 0) continue;
    const dueExps = exps.filter(e => {
      if (e.status === 'success' || e.status === 'failed' || e.status === 'inconclusive') return false;
      return (e.review_dates || []).some(d => d <= today);
    });
    if (dueExps.length === 0) continue;
    console.log(`📋 ${c}: ${dueExps.length} 实验到期 review`);
    dueExps.forEach(e => {
      console.log(`  🔍 ${e.id}: ${(e.hypothesis || '').slice(0, 60)}`);
      console.log(`     需手动跑: search-analytics.gsc_search_performance dimension=page → 拉 ${e.page} 当前数据`);
      console.log(`     对比 baseline (${(e.baseline_period || []).join(' to ')}) 算 lift`);
      console.log(`     更新 ${expFilePath(c)} 的 results[] + status (success / failed / inconclusive)`);
      dueCount++;
    });
  }
  if (dueCount === 0) console.log('全部实验在窗口期内或已结案, 无 review 任务');
  else console.log(`\n共 ${dueCount} 个实验到期, 需 daily-cron 周日段或手动 review`);
}

function printTemplate() {
  const template = [{
    id: 'exp-001',
    client: 'client-XXX',
    hypothesis: '改 Title 加 BM-1200 vs BM-1800 对比信号 → CTR 0% → 2-3%',
    variable_type: 'Title',
    before: { title: '原 Title', desc: '原 Desc' },
    after: { title: '新 Title', desc: '新 Desc' },
    page: '/en/blog/xxx/',
    metric: 'ctr',
    baseline_period: ['2026-04-13', '2026-04-26'],
    experiment_start: '2026-04-27',
    review_dates: ['2026-05-04', '2026-05-11', '2026-05-25'],
    status: 'running',
    results: [],
    notes: '可选, 实验上下文 / 关联 commit hash 等',
  }];
  console.log(JSON.stringify(template, null, 2));
}

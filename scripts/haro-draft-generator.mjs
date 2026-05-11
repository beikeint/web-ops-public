#!/usr/bin/env node
/**
 * HARO/Qwoted 响应草稿生成器 (v10.2 batch7) — Digital PR 启动器
 *
 * 起源: Link Building / Digital PR 能力域 10/100, 顶级目标 35/100. 4-27 评分仍 18/100.
 *      最大阻塞: HARO 平台账号未注册. 但智能体能先做"等账号后立刻能用"的部分:
 *      ① 客户 expertise pack (quotable 专家素材) ② 草稿生成器 (输入征集主题 → 输出 quote 草稿)
 *
 * 用法 (账号注册前手动用):
 *   node haro-draft-generator.mjs --client <id> --query "征集主题文本"
 *
 * 用法 (账号注册后, 集成邮件订阅):
 *   邮件 webhook → 解析 query → 自动跑本脚本批量生成草稿 → 推运营人员企微审 → 提交平台
 *
 * 输入: 客户 ID + 征集主题文本 (如 "Looking for B2B EPS machine experts to comment on China sourcing risks 2026")
 * 输出: 草稿 quote (150-250 词, 含数据点 + 客户专家身份 + 反 AI 味道)
 *
 * 当前 MVP: 输出"草稿模板 + 客户 expertise pack 路径", 让 Claude/运营人员手动填.
 * 未来 v2: 接 Anthropic API 自动生成 quote.
 */

import { readFileSync, existsSync } from 'fs';

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

const args = process.argv.slice(2);
const get = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const ARGS = {
  client: get('--client'),
  query: get('--query'),
};

if (!ARGS.client || !ARGS.query) {
  console.error('用法: node haro-draft-generator.mjs --client <demo-c|demo-b|demo-a|hearingprotect> --query "<征集主题>"');
  console.error('示例: node haro-draft-generator.mjs --client demo-c --query "Looking for EPS machine experts to comment on China sourcing trends 2026"');
  process.exit(1);
}

const dir = CLIENT_DIRS[ARGS.client];
if (!dir) { console.error(`客户 ${ARGS.client} 不在名单`); process.exit(1); }

const expertisePackPath = `${dir}/website/docs/expertise-pack.md`;
const hasPack = existsSync(expertisePackPath);

console.log(`# HARO/Qwoted 草稿模板 · ${ARGS.client}\n`);
console.log(`## 征集主题\n> ${ARGS.query}\n`);

console.log(`## 客户 expertise pack`);
if (hasPack) {
  console.log(`✅ 路径: ${expertisePackPath}`);
  const content = readFileSync(expertisePackPath, 'utf8');
  const dataPoints = content.match(/^- \*\*数据点[^:]*\*\*:[^\n]+/gm) || [];
  if (dataPoints.length > 0) {
    console.log('\n核心数据点 (用于 quote):');
    dataPoints.slice(0, 5).forEach(d => console.log(`  ${d}`));
  }
} else {
  console.log(`❌ 未找到 ${expertisePackPath}`);
  console.log(`   首次需创建 (基于模板 .claude/skills/digital-pr-haro.md)`);
}

console.log(`\n## 草稿框架 (150-250 词目标)\n`);
console.log(`### 1. 第一段 (40-60 词): 直接答记者问 + 一个反直觉数据点\n`);
console.log(`    "记者问 X. 答: 简短直接答案. 但实际上, [数据点 1, 来自 expertise pack]."\n`);
console.log(`### 2. 第二段 (60-100 词): 数据支撑 + 客户独有视角 (其他专家答不出的)\n`);
console.log(`    "Based on [客户产能数据 / 客户合作案例 / 客户认证], [独到见解]."\n`);
console.log(`### 3. 第三段 (50-90 词): 行动建议 / 趋势预判 + 客户身份签名\n`);
console.log(`    "因此 [实操建议 1-2 条]. — [客户专家姓名], [职位], [客户公司, URL]"\n`);

console.log(`## Quotable 信号 (必含 ≥ 2 个)\n`);
console.log(`- 具体数字 (如 "30-50% 节能"), 不要 "significant" / "many"`);
console.log(`- 反直觉断言 (如 "EPS 比 EPP 贵 50% 但适用场景不同")`);
console.log(`- 客户独有数据 (其他工厂/品牌答不出的, 如客户产线产能 / 客户案例)`);
console.log(`- 时效信号 ("2026 Q1 数据" / "刚完成的项目")`);

console.log(`\n## 反 AI 味道 (必避免)\n`);
console.log(`- ❌ "It's important to note that..." / "In today's fast-paced world..."`);
console.log(`- ❌ "leverage" / "utilize" / "synergy" / "ecosystem"`);
console.log(`- ❌ 三段式套话 (开头 + 中间扩展 + 结尾呼应)`);
console.log(`- ❌ 无数据的笼统断言`);

console.log(`\n## 提交后必做`);
console.log(`- 在客户 docs/digital-pr-log.md 登记: 平台 / 日期 / 主题 / 草稿 hash / 是否被采用`);
console.log(`- 30 天后看是否真见 published (Google "site:reporterdomain ${ARGS.client}")`);
console.log(`- 被采用 → 加入"有效模板库" / 未被采用 → 沉淀失败原因 (可能数据点弱 / 主题不匹配)`);

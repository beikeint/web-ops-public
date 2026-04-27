#!/usr/bin/env node
/**
 * visual-verify.mjs — 跨客户站快速验收脚本
 *
 * 解决场景：客户截图反馈"看不出区别"——是缓存？还是真没生效？
 * 30 秒内给答案：自动 curl + grep 关键 fingerprint 判断线上是否已是预期版本。
 *
 * Usage:
 *   node scripts/visual-verify.mjs <url> [profile]
 *
 * Profiles:
 *   v2-full    — 完整 v2 视觉升级套餐（默认）
 *   v2-card    — 只查卡片+Header+Progress
 *   v2-cta     — 只查 FloatingCTA v2 + ExitIntent
 *   inquiry    — 只查询盘转化器件
 *
 * Examples:
 *   node scripts/visual-verify.mjs https://demo-a.com/en/
 *   node scripts/visual-verify.mjs https://demo-c.com/ar/ v2-full
 *   node scripts/visual-verify.mjs https://demo-b.com/en/ inquiry
 *
 * Exit code: 0 if all ✅, 1 if any ❌ (so you can chain in CI / cron).
 */

const PROFILES = {
  'v2-full': [
    { name: 'FloatingCTA v2 trigger',         re: /id="cta-trigger"/,                       expect: 1 },
    { name: 'FloatingCTA v2 popup card',      re: /id="cta-popup"/,                         expect: 1 },
    { name: 'ScrollProgress bar',             re: /id="scroll-progress"/,                   expect: 1 },
    { name: 'Header #site-header',            re: /id="site-header"/,                       expect: 1 },
    { name: 'Header backdrop-blur',           re: /backdrop-blur-md/,                       expect: '>=1' },
    { name: 'SectionBackdrop dots/grid',      re: /id="bd-(dots|grid)"/,                    expect: '>=1' },
    { name: 'SectionBackdrop bold mesh',      re: /radial-gradient\(circle at center/,      expect: '>=1' },
    { name: 'NO legacy WhatsApp orphan',      re: /fixed bottom-6 right-6[^"]*bg-green-500/, expect: 0 },
    { name: 'NO FloatingCTA v1 三圆叠加',     re: /id="floating-cta"[^>]*flex flex-col items-end/, expect: 0 },
    { name: 'fixed bottom-6 right-6 = 1 处',  re: /fixed bottom-6 right-6/g,                expect: 1 },
  ],
  'v2-card': [
    { name: 'Header #site-header',            re: /id="site-header"/,                       expect: 1 },
    { name: 'Header backdrop-blur',           re: /backdrop-blur-md/,                       expect: '>=1' },
    { name: 'ScrollProgress bar',             re: /id="scroll-progress"/,                   expect: 1 },
    { name: 'SectionBackdrop dots/grid',      re: /id="bd-(dots|grid)"/,                    expect: '>=1' },
  ],
  'v2-cta': [
    { name: 'FloatingCTA v2 trigger',         re: /id="cta-trigger"/,                       expect: 1 },
    { name: 'FloatingCTA v2 popup',           re: /id="cta-popup"/,                         expect: 1 },
    { name: 'ExitIntent popup',               re: /id="exit-popup"/,                        expect: 1 },
    { name: 'CTA pulse animation',            re: /cta-pulse-dot/,                          expect: '>=1' },
    { name: 'NO FloatingCTA v1 三圆',         re: /flex flex-col items-end gap-3"\s+id="floating-cta"/, expect: 0 },
  ],
  'inquiry': [
    { name: 'FloatingCTA v2 trigger',         re: /id="cta-trigger"/,                       expect: 1 },
    { name: 'ExitIntent popup',               re: /id="exit-popup"/,                        expect: 1 },
    { name: 'Web3Forms access_key 真值',      re: /data-access-key="[a-f0-9-]{30,}"/,       expect: 1 },
    { name: 'WhatsApp wa.me link',            re: /wa\.me\/\d{8,}/,                         expect: '>=1' },
    { name: 'mailto: link',                   re: /mailto:[^"@]+@[^"]+/,                    expect: '>=1' },
  ],
};

function evalCount(matches, expect) {
  if (typeof expect === 'number') return matches === expect;
  if (typeof expect === 'string' && expect.startsWith('>=')) {
    return matches >= parseInt(expect.slice(2));
  }
  return false;
}

async function check(url, profileName) {
  const profile = PROFILES[profileName];
  if (!profile) {
    console.error(`Unknown profile: ${profileName}. Available: ${Object.keys(PROFILES).join(', ')}`);
    process.exit(2);
  }

  console.log(`\n🔍 Verifying ${url}`);
  console.log(`   Profile: ${profileName} · ${profile.length} fingerprints\n`);

  const cacheBust = url + (url.includes('?') ? '&' : '?') + 'v=' + Date.now();
  let html;
  try {
    const res = await fetch(cacheBust, { headers: { 'User-Agent': 'visual-verify/1.0' } });
    if (!res.ok) {
      console.error(`❌ HTTP ${res.status} ${res.statusText}`);
      process.exit(1);
    }
    html = await res.text();
  } catch (e) {
    console.error(`❌ Fetch failed: ${e.message}`);
    process.exit(1);
  }

  let pass = 0, fail = 0;
  for (const c of profile) {
    const flags = c.re.flags.includes('g') ? c.re.flags : c.re.flags + 'g';
    const re = new RegExp(c.re.source, flags);
    const matches = (html.match(re) || []).length;
    const ok = evalCount(matches, c.expect);
    const expectStr = typeof c.expect === 'string' ? c.expect : String(c.expect);
    console.log(`  ${ok ? '✅' : '❌'} ${c.name.padEnd(40)} found ${String(matches).padStart(3)}  (expect ${expectStr})`);
    if (ok) pass++; else fail++;
  }

  console.log(`\n   ${pass}/${profile.length} ${pass === profile.length ? '✅ ALL PASS' : `❌ ${fail} FAILED`}`);

  if (fail > 0) {
    console.log('\n💡 If unexpected, common causes:');
    console.log('   1. Browser cache — tell client to Ctrl+Shift+R');
    console.log('   2. CDN cache — wait 1-5 min after deploy or purge');
    console.log('   3. Deploy actually rolled back — re-run npm run build && deploy');
    console.log('   4. v2 upgrade incomplete — see .claude/skills/visual-upgrade-v2.md');
  }

  process.exit(fail > 0 ? 1 : 0);
}

const [, , url, profile = 'v2-full'] = process.argv;
if (!url) {
  console.error('Usage: node scripts/visual-verify.mjs <url> [profile]');
  console.error('Profiles: ' + Object.keys(PROFILES).join(' / '));
  process.exit(2);
}

check(url, profile);

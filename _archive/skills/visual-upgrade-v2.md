# visual-upgrade-v2

> 客户站从 v1（白底/平庸/三圆按钮）升级到 v2（mesh + bold + Intercom-style）的标准 SOP。
> **触发场景**：客户反馈"视觉模板化 / 单调 / 像草稿 / 所有站都一样"，或新接手老站发现是 v1 模板。
> **预估时间**：1-1.5 小时（vs 不按 SOP 走会 3-4 小时来回返工，2026-04-25 实测）

## v1 vs v2 决策标准

| 信号 | 用 v1 (subtle) | 用 v2 (bold) |
|---|---|---|
| 客户偏好 | 明确说"克制 / 工业感 / 简洁" | 默认 / 客户说"想要前沿感 / 高端感" |
| 行业 | 重金属 / 矿业 / 严肃 B2B | 一般 B2B 制造 / SaaS 风 |
| 客户审美阈值 | 超保守传统派 | 主流 / 看 Stripe/Linear |
| **2026-04-25 教训** | 客户 002 反馈"看不出区别"否决 v1，证明 B2B 制造客户审美天花板比想象高 |

**默认走 v2**。除非客户明确说"克制点 / 不要花哨"。

---

## v2 完整 7 件套餐清单

### 1. SectionBackdrop V2（4 层装饰升级到 bold）
- starter `core/SectionBackdrop.astro` 升级到 V2 含 `intensity="bold"` 默认
- mesh gradient（3 radials 叠加）+ brand-color blob blur-3xl + dot/img opacity ~2x + radial mask 羽化
- 客户站 sections 自动获得 bold 效果，无需逐个改

### 2. 卡片 hover 升级（global.css 零 markup）
```css
.bg-white.rounded-lg.border:hover,
.bg-white.rounded-xl.border:hover,
.bg-white.rounded-lg.shadow-sm:hover,
.bg-white.rounded-xl.shadow-sm:hover,
.bg-white.rounded-2xl.shadow-sm:hover {
  transform: translateY(-4px);
  box-shadow:
    0 20px 40px -12px rgba({BRAND_RGB}, 0.20),
    0 8px 24px -8px rgba(0, 0, 0, 0.10);
  border-color: rgba({BRAND_RGB}, 0.25);
}
```
- `{BRAND_RGB}` = demo-c `30, 58, 95` (navy) / demo-a `3, 105, 161` (sky)

### 3. Header backdrop-blur sticky
```astro
<header id="site-header" class="bg-white/95 backdrop-blur-md border-b border-gray-200/60 sticky top-0 z-40 shadow-sm transition-all duration-300">
```
- 替换原来的 `bg-white border-b shadow-sm`
- 视觉效果：滚动时半透明 + 模糊背景，Apple/Stripe 风

### 4. ScrollProgress 顶部进度条
- 复制 `ScrollProgress.astro` 到客户 components/
- 改 brand 色：`linear-gradient(to right, {BRAND}, {ACCENT})`
- BaseLayout `<body>` 顶部挂 `<ScrollProgress />`

### 5. FloatingCTA v2 Intercom-style（替换 v1 三圆按钮）
- 复制 `FloatingCTA.astro` v2 到客户 components/
- 默认单一胶囊 trigger + 展开 popup card
- 3 选项带响应时间承诺（WhatsApp 30min / Email 24h / Form 5min）
- 多语种标识 🌍 EN/ES/PT/FR/RU/AR
- **删 Footer 老的单 WhatsApp `fixed bottom-6 right-6` 浮动按钮**（与 v2 重叠！）
- BaseLayout 挂 + 适配 i18n + 适配 siteConfig 取联系方式

### 6. ExitIntent 询盘弹窗（如果还没有）
- 复制 `ExitIntent.astro` 到客户 components/
- storage key 改 `{site}_exit_shown`
- access_key 走 `siteConfig.forms.web3FormsAccessKey`（不要 fallback 到别的客户的 key）
- BaseLayout 挂

### 7. 6 语种 i18n 文案补全
- floatingCta v2 schema：13 字段（trigger + popup + 3 options + lang note + wa message）
- exitIntent schema：13 字段（headline + subheadline + body + capacity options + thanks）
- 6 语种全本地化（EN 主写，5 语种翻译）
- **不能 fallback 到 EN**，否则非英语用户看到英文很违和

---

## 实施步骤（30 分钟工作流）

### 准备（5 min）
1. 确认客户站主色 hex（`grep -E "color-(brand|primary)" src/styles/global.css`）
2. 确认 i18n 架构：`siteConfig.contact.email` 还是 `t(locale, 'contact.info.email')`
3. 确认现有 components 列表（是否已有 FloatingCTA v1 / ExitIntent / ScrollProgress 等）
4. **重要**：grep `fixed bottom-6 right-6` 在所有 .astro 中出现的位置（防 v2 上线后重叠）

### 装饰背景（5 min，零 markup）
1. 复制最新 `SectionBackdrop.astro` 到客户 components/
2. 替换 `accent` 为客户主色 hex
3. 检查 i18n 文件不需要改

### 卡片 + Header + Progress（5 min）
1. 追加卡片 hover CSS 到 global.css（替换 `{BRAND_RGB}`）
2. Edit Header.astro：加 `id="site-header"` + `bg-white/95 backdrop-blur-md`
3. 复制 ScrollProgress.astro，改 brand 色
4. BaseLayout 挂 ScrollProgress

### 询盘 widget（10 min）
1. 复制 FloatingCTA.astro v2 到 components/
2. 全文 search/replace 主色 token（demo-a brand-700 → demo-c [#1e3a5f] 等）
3. 6 语种 i18n 注入（用 `/tmp/inject_floating_cta_v2_*.py` 模板改路径）
4. 复制 ExitIntent.astro，改 storage key + access_key
5. 删 Footer 老 WhatsApp 浮动按钮
6. BaseLayout 挂两组件

### 验证（5 min）
1. `npm run build` 确认 0 错误
2. 部署
3. 跑 `node scripts/visual-verify.mjs <url> v2-full` 自动检查 8 个 fingerprint
4. 手机 UA 抽查：`curl -A "Mozilla/5.0 (iPhone..." | grep cta-trigger` 必须 = 1

---

## 7 大踩坑预警

1. **deployer ID 用错** → 客户 002 双站已踩（4-18），用 `client-B-demo-a` 不是 `client-B`
2. **siteConfig vs i18n** → demo-c 没有 site.config.ts，复制 demo-a 组件需把 `siteConfig.contact.email` 改成 `t(locale, 'contact.info.email')`
3. **`fixed bottom-6 right-6` 重叠** → Footer 里如果还有老的单 WhatsApp 浮动按钮，必须删（否则 v2 上线后两个浮动元素叠在同一位置）
4. **Web3Forms key 占位符 / 串号** → ExitIntent 内部 fallback access_key 必须改成本客户 key，否则提交飞错地方
5. **i18n key 缺位** → floatingCta v2 有 13 个 key，6 语种 = 78 处，遗漏一个非英语用户看到 i18n key 字符串
6. **5 语种同步遗漏** → EN 改完必须 batch 改其他 5 语种（用 Python 脚本批量）
7. **client cache** → 部署后必须告知客户"清缓存看（Ctrl+Shift+R）"，否则客户截图反馈"看不出区别"

---

## 客户视觉反馈 3 档分类

| 客户反馈词 | 真问题 | 应对 |
|---|---|---|
| "看不出区别" | 缓存 / 太克制 | 跑 visual-verify 验证线上是新版 → 是新版就升级到 bold；老缓存就引导清缓存 |
| "丑 / 模板化 / 所有站都这样" | 设计语言审美疲劳 | 引入新模式（如 v2 Intercom-style 替代 v1 三圆按钮）|
| "不专业 / 像草稿 / 乱" | 模板复刻陷阱 / 业务模型不匹配 | 切建站智能体走业务叙事档案 v2.4 重建 |
| "不会用 / 找不到 X" | UX 漏洞 / 转化器件缺失 | 检查移动端入口（不是只看 Footer），FloatingCTA 是 P0 必带 |

---

## 验收 fingerprint 列表（visual-verify.mjs 用）

```js
const V2_FULL_FINGERPRINTS = [
  { name: 'FloatingCTA v2 trigger', selector: 'id="cta-trigger"', expect: 1 },
  { name: 'FloatingCTA v2 popup',    selector: 'id="cta-popup"',   expect: 1 },
  { name: 'ScrollProgress bar',      selector: 'id="scroll-progress"', expect: 1 },
  { name: 'Header backdrop-blur',    selector: 'backdrop-blur-md', expect: '>=1' },
  { name: 'SectionBackdrop dots',    selector: 'id="bd-dots"',     expect: '>=1' },
  { name: 'No legacy WhatsApp orphan', selector: 'fixed bottom-6 right-6.*?bg-green-500', expect: 0 },
  { name: 'Web3Forms key',           selector: 'data-access-key="[a-f0-9-]{30,}"', expect: 1 },
  { name: 'No FloatingCTA v1 三圆',  selector: 'flex flex-col items-end gap-3', expect: 0 },
];
```

---

## 完成定义

- [ ] 7 件套全部上线
- [ ] visual-verify v2-full profile 8 项全 ✅
- [ ] 6 语种页面 cta-trigger + cta-popup 都注入
- [ ] `fixed bottom-6 right-6` 全 HTML 中只剩 1 处（FloatingCTA 容器）
- [ ] 客户清缓存后反馈认可（不再"看不出区别"）

---

*Created 2026-04-25, 基于客户 002 双站升级实战教训*

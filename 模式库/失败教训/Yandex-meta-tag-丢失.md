# 根 URL 跳转空壳 → Yandex verification meta tag 丢失

> **类型**：失败教训
> **客户来源**：client-B (demo-c.com)
> **沉淀时间**：2026-04-27
> **可复用度**：⭐⭐⭐⭐（多语言站默认根 URL 跳转的客户都可能踩）
> **触发损失**：Yandex Webmaster 报"未找到元标签"，俄语市场流量入口失效

---

## 背景

demo-c 是多语言站（EN / ES / RU 等），首页 `https://demo-c.com/` **不是真实页面**而是跳转到默认语言版（`/en/`）。

实现方式：`pages/index.astro` 用了 Astro 的 `Astro.redirect('/en/')`。

2026-04-19 配 Yandex Webmaster verification 时发现：Yandex 一直报"未找到元标签"。

---

## 根因分析

### 直接原因

Astro 静态构建（`output: 'static'`）下，`Astro.redirect()` **降级为 meta refresh 空壳**：

```html
<!DOCTYPE html>
<meta http-equiv="refresh" content="0;url=/en/">
```

**这个 HTML 不经过 BaseLayout**，所以 Google verification、Bing verification、**Yandex verification** 这些 meta 全部丢失。

### 系统性原因

不同搜索引擎对 meta refresh 跳转的处理差异：
- **Google**：会跟着 refresh 跳到 `/en/`，读那里的 verification ✅
- **Bing**：同 Google ✅
- **Yandex**：**只爬根 URL，不跟 refresh** ❌ → 找不到 verification

加上 **Yandex 在俄语市场份额 ~50%**（仅次于 Google），俄语市场流量入口失效。

---

## 解决方法

### 修法 1: index.astro 改手写 HTML 跳转模板

```astro
---
// pages/index.astro
import { GOOGLE_SITE_VERIFICATION, BING_VERIFICATION, YANDEX_VERIFICATION } from '@/site.config';
---
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0; url=/en/">
  <link rel="canonical" href="https://demo-c.com/en/">
  {GOOGLE_SITE_VERIFICATION && <meta name="google-site-verification" content={GOOGLE_SITE_VERIFICATION}>}
  {BING_VERIFICATION && <meta name="msvalidate.01" content={BING_VERIFICATION}>}
  {YANDEX_VERIFICATION && <meta name="yandex-verification" content={YANDEX_VERIFICATION}>}
  <title>Redirecting to English version...</title>
</head>
<body>
  <p>Please follow <a href="/en/">this link</a>.</p>
</body>
</html>
```

### 修法 2: 改成 SSR 在服务端 redirect（如客户站支持）

如果用 Cloudflare Pages / Vercel，可以配 `_redirects` 文件做服务端 301 跳转：
```
/    /en/    301
```

服务端 301 跳转所有引擎都能正确处理 verification（继承到目标页）。

---

## 防止再次踩坑（已加 QA 必检第 12 项）

```
QA 必检 #12: 根 URL 跳转空壳必须含 verification meta

验证命令: curl -s https://<domain>/ | grep -E "(google-site-verification|msvalidate|yandex-verification)"
        必须 ≥ 1 行匹配

风险: 静态构建下 Astro.redirect() 降级为 meta refresh 空壳,不经过 BaseLayout.
     Yandex 不跟 refresh,只爬根 URL → 俄语市场流量入口失效
```

**触发条件**：
- 多语言站默认首页跳转到默认语言版（多数 B2B 多语言站都这样）
- Astro / Next.js / 其他静态站点生成器 + redirect

---

## 关联

- QA 必检清单第 12 项
- 关联文件：客户站 `pages/index.astro`
- 关联配置：客户站 `site.config.ts`（VERIFICATION 常量）
- 关联 MCP：search-analytics（多引擎覆盖）

---

## 自我进化（4 步已执行）

1. ✅ 修复问题（demo-c index.astro 改手写 HTML 含三引擎 verification）
2. ✅ 回溯根因（Astro.redirect 在静态构建下行为不符直觉）
3. ✅ 更新规则（QA 必检 11→12 项）
4. ✅ 时间线记录（demo-c 4-19 hotfix）

**额外应用**：检查所有 7 个客户站是否有同样问题，发现 demo-b 也有同样模式 → 同步修复。

---

*失败教训 #2 · 沉淀自 client-B demo-c 4-19 Yandex 配置实战 · 已扩散修复全部多语言客户站*

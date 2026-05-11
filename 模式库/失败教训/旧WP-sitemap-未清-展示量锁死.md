# 旧 WordPress sitemap 未清理 → 展示量锁死

> **类型**：失败教训
> **客户来源**：client-B2 (demo-a.com，原 WP 站迁移到 Astro)
> **沉淀时间**：2026-04-27
> **可复用度**：⭐⭐⭐⭐⭐（**所有 WordPress→Astro 迁移客户必查**）
> **触发损失**：demo-a 上线 8 天 GSC 仅 6 次展示（应该 100+）

---

## 背景

demo-a 从 WordPress 迁移到 Astro，2026-04-15 上线。
4-23 daily-cron 巡检发现：上线 8 天，GSC 仅 **6 次展示**（同期 demo-b 同等流量基础应该 100+）。

诊断发现：**老 WP 站残留 5+ 个 sitemap 文件**，指向迁移前的死链 URL：
- `/post-sitemap.xml`
- `/page-sitemap.xml`
- `/product-sitemap.xml`
- `/category-sitemap.xml`
- `/sitemaps.xml`

这些老 sitemap 持续被 Google 爬，瓜分爬取预算，新站的真 sitemap 被相对降权。

---

## 根因分析

### 直接原因
WordPress 默认插件（Yoast / RankMath / All-in-One SEO）会自动生成多个分类 sitemap，并在 GSC 后台被独立提交。
迁移到 Astro 时只换了网站本体，**没有去 GSC 后台删除这些老 sitemap**。

### 系统性原因（QA 检查项缺失）
原 QA 必检清单 14 项里没有"WP→Astro 迁移必清 GSC 老 sitemap"这一项。
这是建站交付的盲区。

---

## 解决方法

### 验证命令（找出问题）
```bash
# 用 search-analytics MCP
gsc_submit_sitemap site=<domain>
# 看 current_sitemaps 列表
```

如果除 `sitemap-index.xml` + `sitemap-0.xml` 外还有其他文件 → 是老 WP 残留。

### 删除方法（按 GSC 属性类型分两种）

#### Case A: URL-prefix 属性（如 `https://demo-a.com/`）
- GSC 后台 Settings → Sitemaps → 手动点击老 sitemap 行 → 删除
- 或 service account + Python 直调 GSC API `sitemaps.delete`
- **Owner 权限**可删

#### Case B: sc-domain 属性（如 `sc-domain:demo-a.com`）
- ⚠️ **Full User 权限不够**（Restricted User 也不够）
- 必须 **Owner 权限**才能删 sitemap
- 客户原 GSC 账号（建站人）才有 Owner 权限
- **2026-04-20 升级 service account 到 Full User 后才发现这个限制**

---

## 防止再次踩坑（已加 QA 必检第 15 项）

```
QA 必检 #15: WordPress→Astro 迁移后必须清理 GSC 老 sitemap

验证命令: gsc_submit_sitemap site=<domain> 看 current_sitemaps
        除 sitemap-index.xml + sitemap-0.xml 外的全部清掉

注意: 仅 URL-prefix 属性 + Owner 权限可删 (sc-domain Full User 不够)

风险: 不清掉会让新站展示量锁死, 8 天仅 6 次展示是真实案例.
```

**触发条件**：
- 任何 WordPress / Wix / Shopify 等其他平台迁移到独立站时
- 任何客户站接入时（不只是迁移，初次接入也要查）

---

## 关联

- QA 必检清单 [feedback_website_qa_checklist.md](../../../../../.claude/projects/-home-hkf-ai-studio/memory/feedback_website_qa_checklist.md) 第 15 项
- 关联 MCP `search-analytics.gsc_submit_sitemap`
- 关联 skill [hotfix](../../.claude/skills/hotfix.md)
- 关联客户 timeline（demo-a 4-24 修复记录）

---

## 自我进化（4 步已执行）

1. ✅ 修复问题（demo-a 4 个老 sitemap 已删）
2. ✅ 回溯根因（QA 清单第 15 项缺失）
3. ✅ 更新规则（QA 必检 14→15 项 + 加进 daily-ops 7+1 的"上线后 14 天内每周一查"）
4. ✅ 时间线记录（demo-a 4-24 hotfix）

---

*失败教训 #1 · 沉淀自 client-B2 demo-a 4-24 排查实战 · 必加 QA 检查项已加*

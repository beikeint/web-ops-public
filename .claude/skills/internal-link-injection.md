---
name: internal-link-injection
description: 通用内链注入器 — 给客户 blog-posts.ts 自动注入站内链, 按 docs/internal-link-rules.json 规则配置安全替换 anchor 为 link
---

# 内链注入技能 (v10.2 batch5, 2026-04-27 立)

## 触发场景

- **每周一 daily-ops 自动跑**(集成在 daily-cron 周一段, 每客户独立扫一次)
- **新博客发布后**(content-production 12 阶段末步, 给老博客织新链)
- **定期清理**(发现某 anchor 高频出现但少量内链时, 添加规则后重跑)
- **新客户 onboarding** 阶段为该客户写规则文件 + 初次跑全量

## 工具

`scripts/internal-link-injector.mjs` — 通用脚本, 接受客户 ID + dry-run 标志

```bash
# 干跑 (看会改哪些位置 + 上下文, 不真改)
node scripts/internal-link-injector.mjs <client-id> --dry-run

# 真注入 (改 blog-posts.ts)
node scripts/internal-link-injector.mjs <client-id>

# 自定义规则路径
node scripts/internal-link-injector.mjs <client-id> --rules /path/rules.json
```

`<client-id>` 接受两种形式:
- 短名: `demo-c` / `demo-a` / `demo-b` / `demo-a`
- client-id: `client-A` / `client-B` / `client-B2` / `client-D`

## 规则文件格式

每个客户站 `website/docs/internal-link-rules.json`:

```json
[
  { "anchor": "ROI calculation", "target": "/en/blog/eps-machine-roi-calculation-guide/" },
  { "anchor": "PVA wood glue", "target": "/en/blog/complete-guide-to-wood-adhesives/" }
]
```

## 安全机制 (脚本内置)

- **跳过自链**: target 命中本 body 任一 slug 时跳过 (factory-setup 博客不自链 factory-setup)
- **跳过重链**: 该 body 已有指向同 target 的 link 时跳过 (避免 spammy 多次链)
- **跳过 link 内**: anchor 在已有 `<a>...</a>` 内时跳过 (避免嵌套 link)
- **跳过 attribute**: anchor 落在 HTML attribute 内时跳过
- **词边界检查**: anchor 前后是字母/数字时跳过 (避免 "ROI" 误匹配 "ROIs")
- **每条规则在每个 body 块内最多注入 1 次**(找第一个出现位置)

## 输出格式

```
[injector] 客户 demo-c | 规则 33 条 | dry-run=false
[injector] 文件 /path/blog-posts.ts (816654 chars)
[injector] 识别 17 个 body var 与 slug 的映射
[injector] 识别 24 个 body 字符串块

[injector] === 共注入 N 条内链 ===

  📝 <slug> (+M 链)
     "<anchor>" → <target>
     上下文: ...<surrounding text>...

[injector] ✅ 写入 /path/blog-posts.ts
```

## 工作流 (每周一自动 + 新博客后手动)

```
1. daily-cron 周一段 → 对每个客户独立跑 dry-run
2. 看是否 ≥ 1 条新链 (通常 0, 但新博客发布后会出现)
3. 如有 → 去掉 --dry-run 真注入
4. 部署到客户站 (deployer MCP deploy <client-id>)
5. IndexNow 提交所有受影响 URL
6. commit: feat(internal-links): +N 真链 (eps-vs-epp 3→5 / ...)
7. timeline 写入 client-manager
```

## 已实战验证

- **demo-c (4-27 17:30)**: 13 篇博客 +20 真链 (commit 0eabae6)
  - eps-vs-epp 流量支柱: 3 → 5 链
  - factory-setup 入口集线器: 4 → 9 链
  - flame-retardant: 8 → 9 链
  - 部署 + IndexNow 13 URL HTTP 200
- **demo-b (4-27 17:35)**: 4 篇博客已饱和 (8 链/篇), 0 新增 (规则配置已留待未来博客)
- **demo-a**: body 在 src/content/blog-bodies/*.ts 不被 v1 支持, 已登记 pending 扩展

## 设计权衡

- **粒度**: 每篇博客对每 target 只 1 link (避免 spammy), 不是每 anchor 各注入
- **质量 vs 数量**: 不追求 anchor 数量上限, 追求每条注入都对 SEO 有真价值
- **多语种**: demo-c/demo-b body 共享 EN/ES/PT, 注入一处即三语种生效; demo-a 独立 .ts 文件需扩展

## 反例 (不要这样做)

- ❌ 用太通用 anchor (如 "PVA" / "EPS"), 即使每篇博客只 1 次也会破坏正文阅读
- ❌ 不限制 maxOccurrences, 全文同一 anchor 反复 link
- ❌ 跳过 dry-run 直接真改 (4-27 第一轮 dry-run 发现 false positive 嵌套 link, 修复后才上线)
- ❌ 注入后不部署不 IndexNow (链上不了线、Google 看不到)

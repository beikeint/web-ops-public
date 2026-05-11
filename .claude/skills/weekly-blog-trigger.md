---
name: weekly-blog-trigger
description: 周三博客硬触发 — 独立于 daily-cron 跑(max-turns 100, 30 min/客户), 检查上周 0 篇博客的客户自主写一篇
---

# 周三博客硬触发技能 (v10.2 batch5, 2026-04-27 立)

## 起源

daily-cron 单客户 50 turns 预算塞不下 12 阶段博客生产 + 6 语种 + 部署 + IndexNow。
所以"周三博客硬触发"逻辑虽然写在 daily-cron 周三段, 但实际跑不动 (max turns 触顶)。

**解决**: 抽到独立 cron 进程 weekly-blog-cron, max-turns 100, timeout 30 min/客户。

## 自动触发 (推荐)

pm2 进程 `weekly-blog-cron` 已装, cron `0 3 * * 3` (UTC 周三 03:00 = 北京周三 11:00)。

```
pm2 describe weekly-blog-cron
pm2 logs weekly-blog-cron --lines 50
```

启动时**有日期守卫**: 非周三 + 非 --force/--dry-run 立即 noop 退出, 避免 pm2 restart 误触发。

## 手动触发

```bash
# 干跑 (查上周 0 篇博客的客户, 不真写)
node scripts/weekly-blog-trigger.mjs --dry-run

# 单客户真跑
node scripts/weekly-blog-trigger.mjs --client client-A

# 强制全量真跑 (即使非周三)
node scripts/weekly-blog-trigger.mjs --force

# 跳过推企微
node scripts/weekly-blog-trigger.mjs --no-push
```

## 工作流

```
1. 读 WEB_OPS_CLIENTS 4 客户名单
2. 对每客户:
   - git log --since="7 days ago" 数 commit message 含 "feat(blog" / "content: 发布博客" 的数量
   - 上周 ≥ 1 篇 → 跳过 (节奏达标)
   - 上周 0 篇 → 触发自主博客生产
3. 触发流程 (按 ROI 三选一):
   a. topic-pool Top 1 潜力分 ≥ 50 → 走 12 阶段 content-production (写新博客)
   b. gsc_content_decay 衰退 ≥ 30% Top 1 老博客 → refresh skill 重写
   c. GSC Gap (高展示低排名) Top 1 → content-rapid-response 3 阶段快速产出
4. 必走完整闭环:
   - v10 7 项底线 (多模态 / Person Schema / Topic Cluster / 平台差异化 / AI爬虫放行 / llms.txt / 图片 SEO)
   - 6 语种翻译 (如客户支持)
   - 部署 + IndexNow + GSC URL Inspection
   - 独立 git commit (feat(blog): ...)
   - timeline 写入 client-manager
   - 评分线 80 分, <80 不发布
5. 推企微: 每客户独立卡片 [N/M] 标号
```

## 已实战验证 (4-27 单客户测试)

- Demo-D client-A 80 turns / 7:56 min 跑通 → 写出 2533B 客户日报 + 2 commit (1 A 级)
- 验证多客户串行模式 OK

## TODO 后续优化

- 让 c (content-rapid-response) 也独立 max-turns (目前共用 100)
- 加并行模式 (4 客户并行跑而非串行, 时间从 ~120 min → ~30 min)
- 加 quality gate: 若评分 < 80, 不发布 + 推企微人工审

## 设计权衡

- **避免 pm2 误触发**: 日期守卫 (非周三 noop)
- **token 预算**: max-turns 100, 单客户够用 (Demo-D 80 验证)
- **时间预算**: timeout 30 min/客户, 4 客户串行最长 120 min
- **失败容错**: 单客户失败不影响其他, 推企微独立卡片标记

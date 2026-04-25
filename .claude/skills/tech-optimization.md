---
name: tech-optimization
description: 月度技术优化 — SEO全面检测+PageSpeed优化+Schema审计+内链建设+GSC问题全修+GEO审计+一键部署
---

# 技术优化技能

> 触发指令：`[客户名] 技术优化` 或 `部署 [客户名]`  
> 执行周期：每月 Day 16-18  
> 人工确认：自动执行，部署前确认

---

## MCP 调用链：月度技术优化

```
Step 1: 加载客户
        → client-manager.get_client(client_id)
        → 获取域名、语言列表、关键页面

Step 2: 全面技术检测（并行）
        ┌→ seo-checker.check_seo(域名)
        ├→ seo-checker.check_pagespeed(域名)
        ├→ seo-checker.check_structured_data(域名)
        ├→ seo-checker.batch_check([关键页面列表])
        ├→ fetch(域名/robots.txt)
        ├→ fetch(域名/sitemap-index.xml)
        └→ fetch(域名/llms.txt)

Step 3: GSC 问题全修
        → 基于巡检和周检积累的问题清单，集中修复：

        3a. 404 全修
            → 收集所有404 URL
            → 分类：可恢复 / 需重定向 / 应删除
            → 批量配置301重定向或恢复页面
            → 更新sitemap移除无效URL

        3b. robots.txt 优化
            → 移除不必要的 Disallow
            → 确保所有语言版本可抓取
            → 确保 Sitemap 指向正确

        3c. 索引修复
            → 内容过薄页面：补充内容
            → 重复页面：设置canonical
            → noindex误标：移除noindex
            → 重定向链：简化为直达

        3d. Meta标签补全
            → 缺失title/description的页面逐一补全
            → 优化过长/过短的title和description
            → 补全og:title/og:description

Step 4: Schema 结构化数据完善
        → Organization Schema 信息是否最新
        → 所有产品页有 Product Schema
        → 所有博客有 Article + FAQPage Schema
        → 面包屑导航有 BreadcrumbList Schema
        → 缺失的Schema逐页补全

Step 5: 内链优化
        → 为本月新发布的博客规划内链（博客→产品页，博客→博客）
        → 检测孤岛页面（无内链指向的页面），补充入链
        → 优化锚文本多样性
        → 检查并修复断链

Step 6: PageSpeed 优化（如CWV不达标）
        → 图片压缩（转WebP，单张<200KB）
        → 延迟加载非首屏图片
        → 预加载关键资源
        → 精简第三方脚本
        → 设置图片宽高属性（减少CLS）

Step 7: GEO 审计
        7a. FAQ 扩充
            → 每月至少2个页面新增FAQ
            → 来源：GSC疑问句搜索词 + People Also Ask + 客户高频询盘
            → 确保所有FAQ有 FAQPage Schema

        7b. llms.txt 更新
            → 检查是否存在且内容最新
            → 新增博客和产品页是否已添加
            → 如不存在则创建

        7c. 答案胶囊审计
            → 抽查5篇博客的BLUF段落
            → 检查每个H2开头是否有直接回答

Step 8: 构建验证
        → npm run build → 确认无报错
        → 检查新页面生成正确

Step 8b: 修复后二次检测（闭环验证，不可跳过）
        → 重新运行 Step 2 中发现问题的检测项，确认问题已消失：
          ┌→ 404修复后：fetch(修复的URL) → 确认返回200
          ├→ Schema补全后：seo-checker.check_structured_data(修复的页面) → 确认无缺失
          ├→ robots修改后：fetch(robots.txt) → 确认Disallow已移除
          └→ PageSpeed优化后：seo-checker.check_pagespeed(域名) → 确认分数提升
        → 任何检测仍失败 → 回到对应Step重新修复，直到通过

Step 9: 记录
        → 保存到 客户-XX/优化/YYYY-MM_技术优化记录.md
        → client-manager.add_timeline(id, "月度技术优化: [修复项摘要]")
```

**⏸️ 暂停**：所有修复完成、构建通过后，确认是否部署。

---

## MCP 调用链：一键部署

触发：`部署 [客户名]`

```
Step 1: 确认客户
        → client-manager.get_client(client_id)

Step 2: 执行部署
        → deployer.deploy(client_id)
        → 如deployer失败，使用rsync/scp手动部署

Step 3: 验证部署
        → site-monitor.check_site(域名)        // 验证可访问
        → seo-checker.check_seo(域名)           // 验证SEO正常

Step 4: 记录
        → client-manager.add_timeline(id, "完成网站部署")
```

---

## 月度技术优化检查清单

### 必做项（每月）

- [ ] 404页面全部修复（重定向或恢复）
- [ ] robots.txt审计通过
- [ ] 所有关键页面meta标签完整
- [ ] Schema结构化数据完整
- [ ] sitemap与实际页面一致
- [ ] 新博客内链规划并执行
- [ ] llms.txt 更新
- [ ] FAQ至少扩充2个页面
- [ ] 构建通过无报错

### 条件项（如需要时）

- [ ] PageSpeed优化（CWV不达标时）
- [ ] 孤岛页面补充入链
- [ ] 断链修复
- [ ] 重定向链简化
- [ ] canonical标签修复

---

## 内链优化规范

### 标准

- 每篇博客至少 3-5 个内链
- 产品页链接使用产品名作为锚文本
- 博客间链接使用自然语言锚文本
- 避免"点击这里"等无意义锚文本
- 每个产品页至少被1篇博客链接到
- 禁止单页面超过15个内链

### 内链矩阵

每月维护一个内链矩阵：

```
| 页面 | 指向该页面的内链数 | 该页面的出链数 | 状态 |
|------|-------------------|--------------|------|
| /en/blog/xxx | 3 | 5 | ✅ 健康 |
| /en/products/yyy | 0 | 2 | ⚠️ 孤岛 |
```

---

## 技术优化记录格式

```
# [客户名] 月度技术优化记录 — YYYY年MM月

## 检测结果摘要

| 检测项 | 优化前 | 优化后 |
|--------|--------|--------|
| SEO评分 | X | X |
| PageSpeed（移动） | X | X |
| PageSpeed（桌面） | X | X |
| Schema数量 | X | X |
| 404页面 | X | 0 |
| robots误屏蔽 | X | 0 |

## 修复详情

### 404修复（X个）
[列表]

### Schema补全（X个页面）
[列表]

### 内链优化（X条新内链）
[列表]

### 其他修复
[列表]

## GEO审计
- FAQ扩充：X个页面
- llms.txt：已更新 / 已创建
- 答案胶囊：X篇通过 / X篇需优化

## 部署信息
- 构建：✅ / ❌
- 部署：✅ / ❌ / 待确认
```

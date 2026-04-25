---
name: client-onboarding
description: 客户接入初始化 — 新客户接入时一次性完成：注册客户信息、服务器配置、历史内容录入、基线快照、首次全面检测
---

# 客户接入初始化技能

> 触发指令：`[客户名] 启动` / `新客户接入 [客户名]`  
> 执行时机：新客户首次接入时，一次性执行  
> 人工确认：⏸️ 客户信息确认后继续

---

## 为什么需要这个技能

实战发现：如果新客户接入时不做初始化，后续运营会遇到：
- Content Tracker是空的，无法追踪内容状态
- 没有基线数据，月报无法对比
- 不知道网站有多少页面、什么技术栈
- 第一次周检就大量误报

**一次性把家底摸清，后续运营才顺畅。**

---

## MCP 调用链

```
Step 1: 注册客户信息
        → client-manager.add_client(...)
        → client-manager.set_server_info(...)
        → 确认：公司名、域名、行业、产品、联系人、服务器信息

Step 2: 基线快照（并行）
        ┌→ site-monitor.check_site(域名)              // 可用性基线
        ├→ seo-checker.check_seo(域名)                 // SEO基线
        ├→ seo-checker.check_pagespeed(域名)            // 速度基线
        ├→ seo-checker.check_structured_data(域名)      // Schema基线
        ├→ fetch(域名/robots.txt)                       // robots审计
        ├→ fetch(域名/sitemap-index.xml)                // sitemap审计
        └→ fetch(域名, raw=true)                        // HTML分析：meta标签/hreflang/GA4

        ⚠️ 注意：MCP检测结果需用fetch交叉验证
        （seo-checker可能因重定向返回不准确数据）

Step 3: 历史内容盘点
        → fetch(域名/en/blog/) → 提取所有博客标题、日期、URL
        → 逐篇录入 content-tracker.add_content(...)
        → 统计：总内容数、语言版本数、最近更新日期

Step 4: 技术栈识别
        → 从HTML/meta generator标签识别建站框架（Astro/WordPress/Shopify等）
        → 识别已安装的工具（GA4/GSC/Hotjar等）
        → 识别多语言方案（hreflang配置）

Step 5: GSC/GA4 数据接入（v9.0新增）

        5a. 检查客户是否已有GSC和GA4
            → 从Step 2的HTML分析中判断是否安装了GA4（有gtag/G-开头的衡量ID）
            → 询问客户是否有GSC权限

        5b. 发送授权教程
            → 发送《GSC授权操作指南》和《GA4授权操作指南》给客户
            → 文件位置：客户版/GSC授权操作指南.md 和 客户版/GA4授权操作指南.md
            → 服务账号邮箱：gsc-reader@example-seo.iam.gserviceaccount.com

        5c. 客户完成授权后
            → GSC: 用 search-analytics.gsc_search_performance(site=域名) 测试连通
            → ⚠️ GSC 权限必须升到 Full User（默认加进来是 Restricted，submit sitemap 会永久 403）
              - 客户登录 GSC → 属性 Settings ⚙ → Users and permissions
              - 找到 gsc-reader@example-seo.iam.gserviceaccount.com
              - 下拉把权限从 Restricted 改为 Full
              - 验证命令：python 调 service.sites().list() 确认 permissionLevel=siteFullUser
              - 然后用 gsc_submit_sitemap 实测 submit 成功才算完成
            → GA4: 客户提供Property ID → 写入 mcp-servers/search-analytics/index.mjs 的 GA4_PROPERTIES
            → GA4: 用 search-analytics.ga4_traffic_summary(site=域名) 测试连通
            → 三项都通 → 标记"数据接入完成 ✅"

        5d. 如果客户暂未授权
            → 标记"GSC/GA4待授权"，不阻断其他接入步骤
            → 后续每周提醒一次，直到完成

Step 6: 竞品初步识别
        → 基于客户行业和产品，fetch搜索行业关键词
        → 识别2-3个主要竞品
        → 快速扫描竞品博客数量和更新频率

Step 7: 首次全面检测
        → 运行 weekly-check 的完整流程（含修复闭环）
        → 发现的问题当场修复能修的

Step 8: 建立关键词基线
        → 如GSC已接入：search-analytics.gsc_search_performance(site=域名, days=28) → 真实排名基线
        → 如GSC未接入：基于产品线推导核心关键词列表
        → 保存到 客户-XX/数据/关键词基线.md

Step 9: 输出接入报告
        → 保存到 客户-XX/报告/YYYY-MM_接入初始化报告.md
        → client-manager.add_timeline(id, "客户接入完成: X篇内容/SEO评分X/已修X项")
```

---

## 接入报告格式

```
# [客户名] 接入初始化报告 — YYYY-MM-DD

## 客户信息
- 公司：[中文名] / [英文名]
- 域名：[域名]
- 行业：[行业]
- 产品：[产品线]
- 语言：[语言列表]
- 技术栈：[Astro/WordPress/...]
- 已安装工具：[GA4 ✅ / GSC ✅ / ...]
- 数据接入：[GSC API ✅/❌ / GA4 API ✅/❌ / Property ID: XXX]

## 基线快照

| 指标 | 数值 |
|------|------|
| HTTP状态 | 200 |
| 响应时间 | Xs |
| SSL到期 | YYYY-MM-DD（X天） |
| PageSpeed（移动） | X |
| PageSpeed（桌面） | X |
| Schema类型数 | X |
| Sitemap URL数 | X |
| 博客数量 | X篇 |
| 最近发布 | YYYY-MM-DD |

## 内容盘点
- 已录入Content Tracker：X篇
[列表]

## 首次检测 + 修复

### ✅ 已修复
| 问题 | 修复方式 |
|------|---------|

### 🟡 待修复（本周内）
| 问题 | 计划 |
|------|------|

## 竞品识别
| 竞品 | 域名 | 博客数 | 威胁等级 |
|------|------|--------|---------|

## 关键词基线
| 关键词 | 当前排名 | 搜索量估算 |
|--------|---------|-----------|

## 下一步
1. [第一个月的运营计划]
```

---

## 接入检查清单（不可跳过）

- [ ] client-manager 注册完成
- [ ] server_info 配置完成（含密码/密钥）
- [ ] 基线快照保存
- [ ] 所有已有内容录入 Content Tracker
- [ ] **GSC 授权完成（服务账号已加入GSC用户且权限=Full User，实测 submit sitemap 返回 200）**
- [ ] **GA4 授权完成（服务账号已加入GA4查看者 + Property ID已配置）**
- [ ] **search-analytics MCP 连通测试通过（GSC + GA4）**
- [ ] 首次全面检测通过
- [ ] 能修的问题已修复
- [ ] 竞品已识别
- [ ] 关键词基线已建立
- [ ] 接入报告已输出
- [ ] timeline 已记录

---

## 接入完成后自动衔接

客户接入检查全部通过后，按以下顺序启动运营：

1. **当天** → `daily-ops` 首次巡检（建立基线数据）
2. **Day 1-2** → `data-analysis` 月度分析+选题
3. **Day 1-2** → `competitor-monitor` 竞品深度分析
4. **Day 3** → `topic-cluster` 规划内容集群（首次全量）
5. **Day 5+** → `content-production` 开始第一篇博客

**没有完成接入检查的客户不允许执行运营指令。**

---

## 与其他技能联动

| 场景 | 联动 |
|------|------|
| 接入检测发现SEO问题 | → **hotfix** 立即修复 |
| 接入检测Schema缺失 | → **tech-optimization** 补全 |
| 首次巡检发现异常 | → **daily-ops** 闭环修复 |
| 内容盘点发现已有博客 | → **content-tracker** 录入 |
| 竞品已识别 | → **competitor-monitor** 首次深度分析 |

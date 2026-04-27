---
name: monthly-report
description: 月报生成与发送 — MCP汇总SEO/网站/内容数据，结合GA4/GSC生成专业月度运营报告
---

# 月报生成技能

> 触发指令：`[客户名] 生成月报` / `[客户名] 月报确认，发送`  
> 执行周期：每月 Day 22-25  
> 人工确认：⏸️ 月报草稿需审核后才发送

---

## MCP 调用链：生成月报

```
Step 1: 客户信息与最新状态（并行）
        ┌→ client-manager.get_client(client_id)          // 客户完整信息
        ├→ seo-checker.check_seo(域名)                    // 最新SEO状态快照
        ├→ site-monitor.check_site(域名)                   // 最新可用性数据
        ├→ content-tracker.list_content(client_id)         // 本月内容交付
        └→ content-tracker.content_summary()               // 内容全景数据

Step 2: 拉取搜索数据（search-analytics MCP 自动化，无需客户导出CSV）
        → search-analytics.gsc_search_performance(site=域名, days=28, dimension='query') → 关键词数据
        → search-analytics.gsc_search_performance(site=域名, days=28, dimension='page') → 页面表现
        → search-analytics.gsc_search_performance(site=域名, days=28, dimension='country') → 国家分布
        → search-analytics.gsc_index_status(site=域名, check_all_en=true) → 索引率
        → search-analytics.gsc_ranking_changes(site=域名) → 排名变化
        → search-analytics.ga4_traffic_summary(site=域名, days=28) → 流量/用户/跳出率
        → search-analytics.ga4_traffic_sources(site=域名, days=28) → 流量来源分布
        → search-analytics.ga4_page_performance(site=域名, days=28) → 各页面表现
        → search-analytics.ga4_conversions(site=域名, days=28) → 转化/询盘数据
        → GA4未接入时自动返回提示，月报中GA4部分标注"待接入"
        → 客户-XX/内容/ 本月博客记录
        → 客户-XX/优化/ 本月优化记录
        → 上月报告（用于环比对比）

Step 3: 按模板生成月报
        → 读取 模板库/月度报告模板.md（或首月用首月模板）
        → 填充所有数据（优先使用API实时数据）
        → 数据交叉验证（search-analytics数据 vs MCP数据一致性）

Step 4: 保存与记录
        → 保存到 客户-XX/报告/YYYY-MM_[客户名]_月度运营报告.md
        → client-manager.add_timeline(id, "生成[月份]月报草稿")
```

**⏸️ 暂停**：输出月报草稿后等审核。

---

## MCP 调用链：发送归档

触发：`[客户名] 月报确认，发送`

```
Step 1: 生成发送邮件（中文，200字以内）
Step 2: client-manager.add_timeline(id, "[月份]月报已发送")
Step 3: 标记本月工作完成
```

---

## 月报结构标准

| 章节 | 内容 | 数据来源 |
|------|------|----------|
| 封面 | 客户名+月份+3个核心数字（展示/点击/排名） | search-analytics.gsc_search_performance |
| 数据总览 | 本月 vs 上月 vs 基准月 | search-analytics（GSC+GA4 API） |
| 索引状态 | 索引率+变化+新收录 | search-analytics.gsc_index_status |
| 本月完成工作 | 博客+优化+技术 | content-tracker + 本地记录 |
| 数据洞察 | 深度分析（不是数字罗列） | search-analytics 多维度数据 |
| 问题与建议 | 每个可执行 | seo-checker + search-analytics |
| 下月计划 | 内容+技术+SEO | content-tracker.suggest_content |
| 附录 | 竞品简报 | competitor-monitor 输出 |
| **ROI 投入产出表**（v9.4 新增） | 月费 vs 增量流量 vs 询盘 vs 已成单价值 | client-manager + GA4 + 询盘记录 |

### ROI 投入产出表格式（江阴老板要看的"花 N 千值不值"）

```markdown
## 本月 ROI 投入产出

| 维度 | 数值 | 计算 |
|---|---|---|
| 客户运营月费 | ¥{x}/月 | client-manager 合同 |
| 本月增量自然流量 | {y} 会话 | GA4 本月 - 上月 |
| 流量单价(CPV) | ¥{x/y} | 月费 ÷ 增量流量 |
| 本月新增询盘 | {n} 条 | GA4 generate_lead 事件 + WhatsApp/email 记录 |
| 询盘转化率 | {p}% | 询盘 ÷ 流量 |
| 已成单价值(本月) | ¥{v} | client-manager 时间线"成单"事件 |
| 归因 ROI | {v÷月费}× | 已成单价值 ÷ 月费 |
| 累计成单价值(YTD) | ¥{V} | 接客户起到本月 |
| 累计 ROI | {V÷已付月费}× | YTD 价值 ÷ 累计月费 |
```

**写月报时硬规则**：
- ROI < 1 月份要解释（前 3 个月 SEO 周期正常,但写明"为什么不慌"）
- ROI ≥ 3 主动续约谈起 → 引用累计 ROI 表
- 已成单**只算可归因到自然流量/SEO**的（朋友圈直接来的不算 SEO ROI,要分开记）

### 首月特殊格式

| 常规章节 | 首月替代 |
|----------|----------|
| 数据总览 | 基础设施搭建报告 |
| 完成工作 | 初始SEO审计 |
| 数据洞察 | 初始数据快照 |
| 问题建议 | 竞品初始调研 |
| 下月计划 | 第2个月执行计划 |

首月原则：不强行分析不存在的趋势，用竞品数据作为参照系，重点展示已完成的建设工作。

---

## 发送邮件模板

```
XX总，您好！

附上 [域名] [YYYY年MM月] 网站运营报告。

📊 核心数据：
• 网站访问量：XX（环比+XX%）
• 询盘数量：XX条
• 关键词前50排名：XX个

📝 本月完成：
• 发布X篇行业博客（XX语言版本）
• 完成X项技术优化

⚡ 需要您关注：
• [最重要的1-2个建议]

详细数据请见附件。如有任何问题随时联系我。

独立站建站智能体·网站运营-web-ops
```

---

## GSC数据使用规范（必读）

> 来源：客户B实战教训——向客户报"排名第1"，客户搜不到，信任受损。

1. **过滤假关键词**：query 中包含 `-site:` 或引号+排除条件的，必须从报告中剔除
2. **排名用"平均排名"**：position 6.5 不代表稳定在第6名，报告中标注"GSC平均排名"
3. **禁止夸大表述**：禁用"登顶""排名第1""已进入首页"。用"GSC显示平均排名X.X"
4. **区分词类**：长尾词（4+单词）排名预期与核心商业词（1-2词）完全不同，不混谈
5. **客户可验证声明**：报告末尾加注"排名因搜索地区、语言、设备不同而异，以GSC数据为准"

---

## 质量检查清单

发送前必须通过：

- [ ] MCP 数据与 CSV 数据交叉验证一致
- [ ] 环比计算正确
- [ ] content-tracker 记录与实际发布一致
- [ ] 月报每个章节已填写
- [ ] 所有数字可追溯到原始数据
- [ ] 无模糊表述
- [ ] client-manager.add_timeline 已记录

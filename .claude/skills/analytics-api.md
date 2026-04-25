---
name: analytics-api
description: GA4/GSC数据自动拉取 — 通过search-analytics MCP直接获取流量、排名、索引、转化数据，完全自动化
---

# GA4/GSC 数据自动拉取技能

> 触发指令：`[客户名] 拉取数据` / 在data-analysis、rank-tracking、monthly-report中自动调用  
> 前置条件：search-analytics MCP已配置（GSC/GA4凭据+客户Property ID）  
> 人工确认：无需确认，自动执行

---

## 数据来源

### search-analytics MCP（v9.0新增，当前14个MCP之一）

通过Google API直接获取真实数据，无需客户手动导出CSV。

**凭据位置**：`${GSC_CONFIG_PATH}/example-seo.json`
**服务账号**：`gsc-reader@example-seo.iam.gserviceaccount.com`
**MCP配置**：`${WORKSPACE_ROOT}/mcp-servers/search-analytics/index.mjs`

### 已接入客户

| 客户 | 域名 | GSC | GA4 Property ID |
|------|------|-----|----------------|
| Demo-C | demo-c.com | ✅ sc-domain:demo-c.com | 530830745 |

> 新客户接入时，按 client-onboarding 技能的 Step 5 完成授权，然后在MCP的 GA4_PROPERTIES 中添加映射。

---

## 可拉取的数据（10个工具）

### GSC 数据（6个工具）

| 工具 | 数据 | 用途 | 对应技能 |
|------|------|------|---------|
| `gsc_index_status` | 页面索引状态（已索引/未索引/错误） | 索引监控 | daily-ops, weekly-check |
| `gsc_index_changes` | 索引变化（新增/掉索引/新404） | 每日告警 | daily-ops |
| `gsc_search_performance` | 关键词排名+页面表现+国家+设备 | 排名追踪+月报 | rank-tracking, monthly-report |
| `gsc_ranking_changes` | 核心词排名变化（本周vs上周） | 排名波动检测 | daily-ops, rank-tracking |
| `gsc_crawl_errors` | 抓取错误（404/403/重定向） | 问题发现 | daily-ops, weekly-check |
| `gsc_submit_sitemap` | 提交/重新提交sitemap | 催促索引 | content-production |

### GA4 数据（4个工具）

| 工具 | 数据 | 用途 | 对应技能 |
|------|------|------|---------|
| `ga4_traffic_summary` | 会话/用户/浏览/跳出率/停留时间 | 流量监控+月报 | daily-ops, monthly-report |
| `ga4_traffic_sources` | 流量来源（自然/直接/社媒/referral） | 渠道分析 | data-analysis, monthly-report |
| `ga4_page_performance` | 各页面浏览/停留/跳出/转化 | 内容效果评估 | content-refresh, monthly-report |
| `ga4_conversions` | 转化事件（表单/询盘/下载） | ROI计算 | monthly-report, quarterly-review |

---

## MCP 调用链

### 拉取全量数据（`[客户名] 拉取数据`）

```
Step 1: 加载客户
        → client-manager.get_client(client_id) → 获取域名

Step 2: GSC数据拉取（并行）
        ┌→ search-analytics.gsc_search_performance(site=域名, days=28, dimension='query')
        ├→ search-analytics.gsc_search_performance(site=域名, days=28, dimension='page')
        ├→ search-analytics.gsc_search_performance(site=域名, days=28, dimension='country')
        ├→ search-analytics.gsc_index_status(site=域名, check_all_en=true)
        └→ search-analytics.gsc_ranking_changes(site=域名)

Step 3: GA4数据拉取（并行）
        ┌→ search-analytics.ga4_traffic_summary(site=域名, days=28)
        ├→ search-analytics.ga4_traffic_sources(site=域名, days=28)
        ├→ search-analytics.ga4_page_performance(site=域名, days=28)
        └→ search-analytics.ga4_conversions(site=域名, days=28)

Step 4: 输出汇总
        → 整合所有数据生成综合数据报告
        → 保存到 客户-XX/数据/YYYY-MM_数据拉取.md
        → 数据自动供其他技能使用（rank-tracking/monthly-report/content-refresh等）
```

---

## 与现有技能的集成

| 技能 | 之前（v8.0手动CSV） | 现在（v9.0 MCP自动） |
|------|-------------------|---------------------|
| daily-ops | GSC/GA4标注"待导出" | gsc_index_changes + ga4_traffic_summary 全自动 |
| rank-tracking | 等CSV或抓Google | gsc_search_performance + gsc_ranking_changes 真实数据 |
| content-refresh | 无页面流量数据 | ga4_page_performance 精准到每篇 |
| monthly-report | 等CSV才能写报告 | 一键全量拉取，报告自动生成 |
| weekly-check | 索引维度靠估算 | gsc_index_status 真实索引率 |
| content-production | 发布后不追踪索引 | gsc_index_status 7/14/30天回查 |

---

## 新客户接入数据的步骤

```
1. 客户按《GSC授权操作指南》操作（约10分钟）
   → 把 gsc-reader@example-seo.iam.gserviceaccount.com 加入GSC用户

2. 客户按《GA4授权操作指南》操作（约2分钟）
   → 启用GA4 Data API
   → 把服务账号加入GA4查看者
   → 提供Property ID

3. 在MCP中添加GA4映射
   → 编辑 ${WORKSPACE_ROOT}/mcp-servers/search-analytics/index.mjs
   → 在 GA4_PROPERTIES 对象中添加：'新域名': '新PropertyID'

4. 测试连通
   → search-analytics.gsc_search_performance(site=新域名) → 确认有数据
   → search-analytics.ga4_traffic_summary(site=新域名) → 确认有数据

5. 完成
   → 更新 client-manager.add_timeline → "GSC+GA4数据接入完成"
```

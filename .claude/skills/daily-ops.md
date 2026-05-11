---
name: daily-ops
description: 每日必做7+1项 — 网站可用性/GSC异常/排名波动/竞品扫描/昨日数据/索引提交/结构化数据验证+闭环修复。深度模式含图片SEO抽查。发现即修，不留过夜。
---

# 每日必做巡检

> 触发指令：`每日巡检` / `[客户名] 每日巡检`  
> 执行频率：每天一次，每日工作的第一步  
> 人工确认：无需确认。发现问题直接修，修完报告结果  
> 耗时：全局模式约5分钟 / 单客户深度约15分钟（含修复）

---

## 每日7项必做清单

**不是可选，是每天必须完成的工作。不做等于这个岗位今天没上班。**

```
☐ 1. 网站可用性检查    — 活着吗？快吗？证书正常吗？
☐ 2. GSC异常监控       — 新增404？索引下降？爬取错误？安全警告？
☐ 3. 排名波动检测      — 核心词排名突然掉了？
☐ 4. 竞品新内容扫描    — 竞品今天发了什么？
☐ 5. 昨日数据回顾      — 流量/询盘/跳出有异常吗？
☐ 6. 索引提交          — 昨天更新的页面Google知道了吗？
☐ 7. 结构化数据验证    — Schema有错误吗？（每周一必做，其他日仅部署后检查）
☐ 8. 问题修复          — 以上发现的问题，修完才算结束
```

---

## 模式一：全局巡检（`每日巡检`）

对所有活跃客户执行必做项1-4+7，快速排查异常。

### MCP 调用链

```
Step 1: 并行采集所有客户基础状态
        ┌→ site-monitor.check_all_sites()          // 必做1: 可用性
        ├→ site-monitor.check_ssl_expiry()          // 必做1: SSL
        └→ client-manager.list_clients(active)      // 客户列表

Step 2: MCP 健康自检
        → 对seo-checker执行一次简单调用验证返回数据有效
        → 如MCP结果全部显示"缺少"→ 标记MCP异常，用fetch交叉验证
        → MCP异常时提示需重启

Step 3: 遍历每个活跃客户（并行）
        ┌→ fetch(域名/en/blog/) → 必做4: 对比上次抓取，检测竞品是否有新内容
        └→ content-tracker.list_content(client_id) → 检查昨天是否有更新需要提交索引

Step 4: 异常判定
        🔴 紧急：网站不可达 / SSL已过期 / SSL<7天 / 索引骤降
        🟡 告警：响应>3s / SSL<30天 / 竞品发了重要新内容 / MCP数据异常
        🟢 正常：其余

Step 5: 立即修复
        → 🔴 紧急 → 直接触发 hotfix，不等确认
        → 🟡 告警 → 能修的当场修
        → 修复后回验确认

Step 6: 输出
        → 所有客户一页日报
        → 已修复的问题标注 ✅ 已修
        → client-manager.add_timeline 记录
```

### 全局巡检输出格式

```
# 每日巡检 — YYYY-MM-DD

| 客户 | 域名 | 可用性 | 响应 | SSL | 竞品动态 | 状态 |
|------|------|--------|------|-----|---------|------|
| XX | xx.com | 200 ✅ | 0.8s | 83天 | 无新动态 | 🟢 |
| YY | yy.com | 200 ✅ | 1.2s | 45天 | 竞品发1篇 | 🟡 |

## ✅ 今日已修复
- [客户X] [问题] → [修复方式] → 验证通过

## 🟡 需关注（非紧急）
- [客户Y] 竞品发布了[主题]相关文章 → 建议本周内容响应

## 📋 索引提交
- [客户X] 昨日更新2个页面 → 需提交索引（提醒操作或自动提交）

今日巡检完毕，所有客户正常 ✅ / X个问题已修复 ✅ / X个需关注 🟡
→ 接下来执行 daily-growth 每日增长任务
```

---

## 模式二：单客户深度巡检（`[客户名] 每日巡检`）

对单个客户执行完整7项必做。

### MCP 调用链

```
═══ 必做1: 网站可用性检查 ═══

Step 1: 并行检测
        ┌→ site-monitor.check_site(域名)
        ├→ fetch(域名, raw=true, max_length=2000) → 交叉验证MCP + 检查HTML head标签
        └→ seo-checker.check_seo(域名)

Step 2: 判定
        → HTTP非200 → 🔴 紧急
        → 响应>3s → 🟡（多次测试排除偶发）
        → SSL<30天 → 🟡
        → MCP数据与fetch不一致 → 标记MCP异常

═══ 必做2: GSC异常监控（search-analytics MCP 自动化）═══

Step 3: GSC索引变化检测（全自动）
        → search-analytics.gsc_index_changes(site=域名)
        → 自动与上次对比，输出：
          - 🎉 新索引页面（哪些页面被Google新收录了）
          - ⚠️ 掉索引页面（哪些页面从索引中消失了）
          - 📋 仍未索引页面（待Google处理的）
        → 掉索引>2个 → 🔴 自动告警

Step 3b: GSC抓取错误检测
        → search-analytics.gsc_crawl_errors(site=域名)
        → 新增404/403/重定向错误 → 立即标记修复

Step 3c: 「GSC 有展示但线上 404」交叉检查（2026-04-20 新增，每周一必做）
        → 来源：客户D pva-glue-vs-epoxy-resin 事件 — 4-18 精简删 blog 目录，当时无 GSC 数据，后续 GSC 显示该页 EN #5.7 / FR #1 但线上 404
        → search-analytics.gsc_search_performance(site=域名, days=7, dimension='page', limit=50)
        → 对每个有展示/点击的页面路径做并行 HEAD 请求（fetch HEAD）
        → 发现 GSC 有 impressions > 0 但 HTTP 404/410 → 🔴 P0 紧急
           a) 如果是建站时主动删除的页面 → 立即决策：恢复路由 / 301 到最相关页 / 接受损失
           b) 如果是本该存在的页面 → 立即 hotfix
        → 这是"删功能前漏查 GSC"导致的补救关口，避免流量资产被无感损失

Step 3d: 「URL-prefix vs sc-domain 视角双查」（2026-05-06 新增，避免数据视角错觉）
        → 来源：demo-a.com 5-05 客户截图显示"3 个月数据全 0"，实测 sc-domain 维度 90 天有 22 imp / 1 clk / pos 1.0 真实数据 — URL-prefix 属性只统计精确前缀，不聚合多语种 + 子域
        → 当 URL-prefix 属性显示 0 数据时，必须同时查 sc-domain 维度（前提：domain property 已建）才下"无数据"结论
        → 实现：search-analytics MCP 默认走 GSC_SITE_OVERRIDES 映射，但客户问"为什么是 0"时必须用 Python 直调 service.searchanalytics().query(siteUrl="sc-domain:<domain>") 交叉验证
        → 触发条件：截图反馈 / 客户质问 / 客户日报展示数突然变 0

Step 3e: 「幽灵语种 404 爬取」检查（2026-05-06 新增）
        → 来源：demo-a.com 5-06 GSC 90 天数据发现 /de/ /ko/ 不存在但被 Google 爬到 9 imp 全 404，浪费爬取预算
        → search-analytics MCP 调 sc-domain 90 天 page 维度，过滤路径开头不在站点支持语种列表里的 URL
        → 发现非支持语种 imp > 0 → 立即 SSH 加 .htaccess 规则 `^(<幽灵语种>)(/.*)?$ → /en$2 [R=301,L]`
        → 同时反查源头：是否站内有错误 hreflang / 是否外站误链

Step 4: 如发现新问题 → 立即触发 hotfix

═══ 必做3: 排名波动检测（search-analytics MCP 自动化）═══

Step 5: 排名变化检测（全自动）
        → search-analytics.gsc_ranking_changes(site=域名)
        → 自动对比本周 vs 上周排名，输出：
          - 排名提升>5位的关键词 → 🎉 记录成功
          - 排名下降>5位的关键词 → 🔴 自动告警
          - 新出现的关键词 → 📋 记录新机会
          - 消失的关键词 → ⚠️ 需要检查

Step 6: 如排名暴跌 → 紧急诊断
        → 是算法更新？（查Google算法更新新闻）
        → 是技术问题？（页面是否可访问、是否被noindex）
        → 是竞品超越？（竞品对应页面有什么变化）
        → 制定响应策略

### GSC数据使用规范（必读）

> 来源：客户B实战教训——向客户报"排名第1"，客户搜不到，信任受损。

1. **过滤假关键词**：query 中包含 `-site:` 或引号+排除条件的，必须从报告中剔除
2. **排名用"平均排名"**：position 6.5 不代表稳定在第6名，报告中标注"GSC平均排名"
3. **禁止夸大表述**：禁用"登顶""排名第1""已进入首页"。用"GSC显示平均排名X.X"
4. **区分词类**：长尾词（4+单词）排名预期与核心商业词（1-2词）完全不同，不混谈
5. **客户可验证声明**：报告末尾加注"排名因搜索地区、语言、设备不同而异，以GSC数据为准"

═══ 必做4: 竞品新内容扫描 ═══

Step 7: 竞品扫描（不可跳过）
        → client-manager.get_client(id) → 读取 notes 中的竞品列表
        → 对每个竞品域名（最多3个），并行执行：
          ┌→ fetch(https://竞品域名/blog/, max_length=3000) → 提取最新文章标题+日期
          └→ fetch(https://竞品域名/news/ 或 /resources/, max_length=2000) → 备选路径
        → 对比判定：
          - 竞品有过去7天内的新文章 → 📋 记录主题
          - 新文章主题与我方核心关键词重叠 → 🟡 标记需48h内内容响应
          - 竞品新增产品页或重大改版 → 🟡 详细记录
          - 无新动态 → ✅ 正常
        → fetch失败（403/超时）→ 标记跳过，不影响其他项
        → 输出格式：竞品名 | 最新文章标题 | 发布日期 | 与我方重叠度 | 行动建议

═══ 必做5: 昨日数据回顾（search-analytics MCP 自动化）═══

Step 8: 昨日数据回顾（全自动）
        → search-analytics.gsc_search_performance(site=域名, days=1, dimension='page') → 昨日搜索展示/点击
        → search-analytics.ga4_traffic_summary(site=域名, days=1) → 昨日流量/用户/跳出率
        → search-analytics.ga4_conversions(site=域名, days=1) → 昨日询盘/表单提交
        → 与近7天日均对比 → 偏差>30%为异常
        → GA4未接入时返回提示，不影响其他检查项

═══ 必做6: 索引提交（search-analytics MCP 自动化）═══

Step 9: 新内容索引检查+自动提交
        → content-tracker.list_content(client_id) → 查最近3天发布/更新的内容
        → 对每个新/更新页面：
          - search-analytics.gsc_index_status(site=域名, urls=[新URL]) → 检查是否已被索引
          - 未索引 → 记录，持续追踪
        → search-analytics.gsc_submit_sitemap(site=域名) → 自动重新提交sitemap催促索引
        → 输出索引追踪表：哪些新内容已索引、哪些等待中、等了几天

═══ 必做7: 结构化数据验证（每周一必做 + 每次部署后必做）═══

Step 10: Schema验证
        → 每周一 或 当天有部署时执行，否则跳过
        → 并行检查3个关键页面：
          ┌→ seo-checker.check_structured_data(域名/en/products/[任一产品]/) → Product Schema
          ├→ seo-checker.check_structured_data(域名/en/about/) → LocalBusiness Schema
          └→ seo-checker.check_structured_data(域名/en/blog/[任一博客]/) → Article + FAQPage Schema
        → 检查必填字段是否存在：
          Product: name, image, offers.price/priceSpecification, brand ← 缺任一 → 🔴
          LocalBusiness: name, image, address, telephone ← 缺任一 → 🔴
          Article: headline, author, datePublished ← 缺任一 → 🟡
          FAQPage: mainEntity 有至少1个Question ← 缺 → 🟡
        → 发现缺失 → 立即修复，不留到下次

═══ 必做8: 问题修复 ═══

Step 11: 汇总所有发现的问题
         → 按紧急度排序
         → 🔴 立即修复 → 触发 hotfix → 构建 → 部署 → 回验
         → 🟡 当天可修 → 执行修复 → 验证
         → ⚪ 需客户配合 → 明确告知需要做什么
         → 所有修复完成后才输出最终日报
```

### 单客户深度巡检输出格式

```
# [客户名] 每日巡检 — YYYY-MM-DD

## 必做7项执行结果

| # | 检查项 | 结果 | 详情 |
|---|--------|------|------|
| 1 | 网站可用性 | ✅ | 200, 0.8s, SSL 83天 |
| 2 | GSC异常 | ✅ | 无新增错误 |
| 3 | 排名波动 | ✅ | 核心词无异常波动 |
| 4 | 竞品扫描 | 🟡 | Epsole发布1篇新文章 |
| 5 | 昨日数据 | ✅ | 流量正常，无询盘 |
| 6 | 索引提交 | 📋 | 2个页面需提交索引 |
| 7 | 问题修复 | ✅ | 无待修问题 |

## ✅ 今日已修复
[如有修复列出详情]

## 🟡 需关注
- 竞品动态：Epsole发布 "[标题]" → 建议48h内响应
- 索引提交：以下URL请在GSC中请求编入索引：
  - https://xxx/en/blog/新文章1
  - https://xxx/en/blog/新文章2

## 图片SEO抽查
[抽查1-2个核心页面的图片alt/格式/宽高]

→ 巡检完毕，进入 daily-growth 每日增长任务
```

---

## 图片SEO审计（深度巡检自动包含）

每次深度巡检时抽查1-2个关键页面：

```
→ fetch(页面URL, raw=true) → 提取所有 <img> 标签
→ 检查：alt存在/alt非空/有width+height/WebP格式/URL可访问
→ 有问题的当场修复（触发hotfix）
```

---

## 🚨 commit 粒度规则（v10.2 新加，2026-04-27 立）

**触发原因**：4-27 demo-c 一天 12 个 daily-ops commit 看似繁荣，commit message 7 条几乎重复（"周一巡检+CTR引擎+选题池"），实际独立优化只有 2 个。一天看着像团队在干活，拆开是会话被切碎。

### 硬规则

1. **会话级合并**：同一客户在**同一会话内**的多次 daily-ops 改动 → **合并到 1 个 commit**
   - commit message 格式：`daily-ops <date>: <动作1> + <动作2> + <动作3>`
   - 反例：`周一巡检+CTR引擎+选题池` 这种 commit 一天只能出现 1 次（不是 7 次）
   - 中间状态（数据更新 / 简报修订 / pending 增减）→ `git add` 累积，等到这一轮巡检完整收尾再统一 commit

2. **真独立动作各一个 commit**（这些算 A 级 commit 数）：
   - 博客发布（`content: 发布博客 #N <slug>`）
   - CTR 优化（`ctr: <slug> Title/Desc 改写`）
   - Content refresh（`refresh: <slug> 重写 + 内链补强`）
   - Schema 修补（`schema: <type> on <slug>`）
   - GEO 攻占（`geo: <slug> 4 信号补全 (X→10/10)`）
   - 内链注入（`internal-link: <count> 个相关链接`）
   - 紧急修复（`hotfix: <issue>`）
   - 这些**必须**独立 commit，可单独回滚 + 计入"今日 A 级 commit 数"指标

3. **commit message 禁词**（v10.2 起）：
   - ❌ `周一巡检+CTR引擎+选题池`（动作泛化、不可追溯）
   - ❌ `daily-ops X: 更新客户日报+pending同步`（这是中间状态，不应单独 commit）
   - ❌ `daily-ops X: 巡检+待办闭环`（同上）
   - ✅ `daily-ops X: 周一巡检（GSC 139 imp / 17 机会页扫出）`（带数据，1 个 commit/天）
   - ✅ `content: 发布博客#13 Flame Retardant EPS Beads（zero-touch 自主选题）`

4. **每日"A 级 commit 数"统计口径**：
   - 巡检/简报合并 commit = 1 个**基线**（不算 A 级产出）
   - 博客 / CTR / refresh / Schema / GEO / 内链 等真独立 commit = N 个 A 级
   - v10.1 batch 8 zero-touch 节奏目标"每客户每天 ≥ 1 A 级 commit"指的是**A 级**那 N 个，不含巡检合并

### 反假繁荣校验

每客户每日简报"今日 A 级自主完成"段必须列出：

- 每条带 commit hash
- 区分"巡检合并"vs"真独立优化"
- 不允许把同一动作的多次 commit 合并展示成"完成 X 件事"

---

## 与其他技能的联动

**巡检是每日工作流的第一步，后面衔接修复和增长：**

```
daily-ops（必做7项）
    ↓ 有问题
    hotfix（修复）→ 部署 → 回验
    ↓ 没问题或修完了
    daily-growth（主动增长，选最高价值任务执行）
```

| 巡检发现 | 联动技能 | 触发方式 |
|---------|---------|---------|
| 404/robots/noindex | → **hotfix** | 立即执行 |
| Schema缺失/错误 | → **hotfix** | 立即执行 |
| 图片缺alt/无宽高 | → **hotfix** | 立即执行 |
| 排名暴跌 | → **rank-tracking** 紧急诊断 | 立即执行 |
| 竞品新内容 | → **daily-growth** 维度7竞品响应 | 48h内 |
| 索引骤降 | → **hotfix** 紧急诊断 | 立即执行 |
| 流量异常 | → **data-analysis** 深度分析 | 当天 |
| 旧文章质量低 | → **daily-growth** 维度2内容增强 | 纳入增长任务 |
| SSL即将到期 | → 直接报告客户 | 立即 |
| 巡检全部正常 | → **daily-growth** | 直接衔接 |

---
name: wp-site-ops
description: WordPress 站日常巡检（轻量版，针对 Astro 不适用的客户老 WP 站）。覆盖可用性/SSL/GSC 通用维度 + WP 特有的 wp-cli 健康检查 + 内容机会清单（输出建议给运营人员/客户，不擅自登后台改）
type: 运营
trigger: "[客户] WP巡检" / "[客户站(WP)] 每日巡检" / daily-cron WEB_OPS_CLIENTS 项 techStack==='wordpress' 时
---

# WordPress 站日常巡检 skill

## 这个 skill 不做什么（边界 - 必看）

- ❌ 不通过 SSH 改 `wp-config.php`
- ❌ 不直接改 Rank Math / Yoast 等 SEO 插件设置
- ❌ 不改 `.htaccess` / DNS / Cloudflare 规则
- ❌ 不改 WooCommerce 产品/库存/价格
- ❌ 不删插件、不批量更新插件（更新可能破坏前端布局，需客户/运营人员确认）
- ❌ 不操作数据库内容（除官方 `wp db optimize` 安全维护命令）
- ❌ 不创建/编辑文章/页面/产品（WP 后台运营是客户/运营人员的事）

## 这个 skill 做什么

**职责定位**：WP 站不像 Astro 站可以 commit + 部署，所以"自主执行 A 级动作"不适用。WP 站智能体的角色是 **数据采集 + 健康监控 + 待办清单输出器**，把 GSC 数据 + WP 健康 + 内容机会变成"运营人员/客户能直接照做的 1-3 句指令"。

## 触发条件

- 手动：`<客户站> WP巡检`
- 自动：daily-cron 中 `techStack === 'wordpress'` 的客户项每日跑一次

## 4 阶段流程

### 阶段 1：可用性 + SSL（通用，10 秒）

```bash
# 用 mcp__site-monitor__check_site
# 关注：HTTP 200 / 响应时间 / SSL 剩余天数
```

异常处理：
- HTTP 非 200 → 立刻推 P0 企微
- SSL ≤ 14 天 → 推 P1 企微 + 发 Bluehost AutoSSL UAPI 触发重签
- 响应时间 > 3s → 标 🟡 写客户日报（不立刻动）

### 阶段 2：GSC + GA4 数据（通用，与 Astro 站逻辑一致）

```text
mcp__search-analytics__gsc_search_performance site=<domain> days=7
mcp__search-analytics__gsc_index_status site=<domain> check_all_en=true
mcp__search-analytics__ga4_traffic_summary days=1
```

- 7 天展示/点击/CTR/平均排名
- 索引覆盖率（已索引 / sitemap 总数）
- 24h GA4 会话/转化（如已配 Property ID）
- **GSC service account 权限不到位时**：日报标"GSC 数据通道未通"，提醒运营人员 5 分钟到 GSC 后台升 Full User

### 阶段 3：WP 健康（wp-cli over SSH）

通过 `sshpass + ssh + wp-cli` 远程执行只读命令（不动数据）：

```bash
source ~/.claude/.env
sshpass -p "$DEPLOY_CLIENT_001_PASS" ssh -o StrictHostKeyChecking=no eastrago@<server_ip> bash -c '
  cd ~/public_html  # docroot 由 client-manager.secondary_sites[].doc_root 提供
  echo "==core=="; wp core version --allow-root
  echo "==core update=="; wp core check-update --allow-root
  echo "==plugin update count=="; wp plugin list --update=available --format=count --allow-root
  echo "==plugin updates list=="; wp plugin list --update=available --format=csv --allow-root
  echo "==theme update count=="; wp theme list --update=available --format=count --allow-root
  echo "==db check=="; wp db check --allow-root 2>&1 | tail -2
  echo "==search-replace dry-run for old urls=="; # 仅 dry-run, 不真改
  echo "==media count=="; wp post list --post_type=attachment --format=count --allow-root
  echo "==published posts=="; wp post list --post_status=publish --format=count --allow-root
  echo "==products=="; wp post list --post_type=product --post_status=publish --format=count --allow-root 2>/dev/null
'
```

输出 4 个数据点：
- WP 核心是否最新（最新 ✅ / 落后 X 版本 ⚠️）
- 插件待更数（≥ 5 标 🟡，建议运营人员后台批量更）
- 主题待更数
- DB 健康
- 内容计数（博客/产品/媒体）

### 阶段 4：内容机会清单（GSC 数据驱动，输出给运营人员/客户审）

**核心逻辑**：WP 站不能跑 internal-link-injector / ctr-opportunities 这些 Astro 脚本，但可以读 GSC 数据生成"建议"。

```text
mcp__search-analytics__gsc_search_performance site=<domain> days=28 dimensions=["query","page"]
```

筛 **3 类机会**（Top 5 各列）：

1. **CTR 机会**：position ≤ 20 + impressions ≥ 30 + CTR < 1%
   - 输出：`/wp-admin/post.php?post=XXX → Rank Math 改 Title 加品牌/数字/动词`
   - 不擅自登后台改，因为 WP 后台改可能触发缓存层（WP Rocket/Super Cache）混乱

2. **Title 长度异常**：现有 Title > 70 字符 或 < 20 字符
   - 输出：建议改的 URL + 推荐 Title

3. **缺失 Schema 类型**：检测到产品页但 schema 仅 1 个
   - 输出：建议在 Rank Math → 标题和元 → 产品里启用 Product Schema

### 阶段 5：客户日报（WP 站专用模板）

写到：`客户/<客户>-<id>/website/docs/client-briefing-<domain>-<date>.md`

模板（必含 4 维度，与 Astro 站日报同质量门槛）：

```md
# <客户名> WP 站日报 <date>（<域名>）

## 网站健康状态
- ✅/❌ 可用性 HTTP 200 / 响应 X.Xs
- ✅/❌ SSL 剩余 N 天
- ✅/❌ 数据库健康

## 今日数据亮点（GSC 7 天）
- 展示 X / 点击 X / CTR X% / 平均排名 X.X
- 索引覆盖率 X / Y URL
- 发酵期 / 老站标签

## WP 健康
- WP 核心 6.9.4（最新 ✅）
- 插件待更新 17 个 ⚠️ 建议本周择期统一更新（更新前先备份数据库）
- 主题 flatsome 已最新 ✅
- 数据库健康 ✅

## 今日工作
（智能体只做了 GSC 数据采集 + 健康检查，没动 WP 内容。如有发现机会页，列在下面"建议您操作"段，给运营人员/客户去改）

## 建议您操作（按优先级）
1. 🔴 [紧急] ...（如 SSL <14 天 / 插件有安全更新）
2. 🟡 [本周] CTR 机会页 Top 1：URL → Rank Math 改 Title 为「...」预期 7 天后 CTR +2pt
3. 🟢 [本月] 17 个插件批量更新（备份后）

## 接下来安排
- 明天：继续监控
- 本周：等您处理上面 🟡 项
- 1-2 周：观察 CTR 改动效果（需先改完）
```

### 客户日报评分（沿用 quality-and-learning 评分器）

4 维度 25 分共 100 分，≥ 80 才算合格：

1. 数据完整度：GSC 7d / WP 健康 / SSL / 索引覆盖率四项必齐
2. 行动可执行性：≥ 3 项给客户/运营人员的"操作清单"，每项含 URL + 操作步骤 + 预期效果
3. 客户语言：第二人称 ≥ 5 次，禁内部黑话（A 级 / catch-up / 12 阶段）
4. 排期清晰度：明天 / 本周 / 1-2 周 三段

## 与 daily-ops（Astro 版）的差异

| 维度 | daily-ops（Astro） | wp-site-ops（WP） |
|---|---|---|
| 改 Title/Desc | 自主改代码 + commit + 部署 | 输出建议清单，让运营人员/客户在 Rank Math 后台改 |
| 内链注入 | 跑 internal-link-injector.mjs | 不适用（WP 后台 Yoast/Rank Math 内链有自家工具） |
| Schema 补 | 改代码加 JSON-LD | 输出建议，让运营人员/客户在 Rank Math 设置启用 |
| 内容生产 | content-production 12 阶段 | 不适用（客户/运营人员在 WP 后台写） |
| IndexNow | 自动跑 index-boost.mjs | Rank Math 自带 IndexNow，确认插件已配 key 即可 |
| 部署 | rsync to prod | 不部署，更新走 wp-admin |
| 视觉验收 | visual-verify.mjs | 不适用 |
| commit 节奏 | 每日 ≥ 1 A 级 | **不适用**（WP 站智能体职责是采集 + 建议，commit 不计入 A 级 KPI） |

## 跨客户复用规则

未来客户接入老 WP 站，按 client-manager.secondary_sites[] 字段填齐这些后即可复用本 skill：

```json
{
  "domain": "...",
  "tech_stack": "wordpress",
  "ssh_host": "...",
  "ssh_user": "...",
  "ssh_password_env": "DEPLOY_CLIENT_XXX_PASS",
  "doc_root": "public_html/<dir-or-empty>",
  "db_name": "...",
  "wp_cli_available": true
}
```

## 已知限制

- 拉 GSC 数据需要 service account 已升 Full User 且 sa email 已加进站点权限（参考 v9.3 教训）
- IndexNow 需 Rank Math 后台启用并填 key（不是用 Astro 那一套自研脚本）
- WP 后台批量更新插件可能改动数据库结构 + 影响 Cloudflare 缓存 → 不擅自跑

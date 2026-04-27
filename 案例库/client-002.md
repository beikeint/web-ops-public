# 客户B · Demo-C（demo-c + demo-a 双站并行运营）

> **运营视角**案例库（建站视角案例库见 `智能体/建站/独立站建站-site-builder/案例库/客户B-*.md`）
> 周期覆盖：2026-04-05 接入 → 持续运营中
> 双站结构：demo-c.com（主站，EPS/EPP 机械）+ demo-a.com（第二站，冷链整合商）

---

## 客户基本面

| 维度 | 详情 |
|---|---|
| **客户ID** | client-B |
| **行业** | EPS 设备 / 冷链产线整合 双业态 |
| **目标市场** | 全球 B 端（俄/拉美/中东重点） |
| **plan** | 标准档 |
| **服务起始** | 2026-04-05 |
| **联系人决策风格** | 老板亲自抓数字化，反馈频繁、视觉敏感、产品认知深、技术认知有限 |

---

## 双站对比（关键差异，操作时不能混用）

| 维度 | demo-c.com | demo-a.com |
|---|---|---|
| **业务模型** | Pure Manufacturer | Solution Integrator（方案 B） |
| **i18n 文案口吻** | "our factory" 第一人称 | "partner network / manufacturing network" 第三人称 |
| **联系方式** | +86 +86-xxx-xxxx-xxxx / info@demo-c.com | +86 +86-xxx-xxxx-xxxx / info@demo-a.com（**禁止混用**） |
| **主色** | navy `#1e3a5f` + amber accent | sky `#0369a1` (brand-700) + ice |
| **i18n 架构** | translations/{locale}.ts + page-content.ts 混用 | translations/{locale}.ts 单文件 + siteConfig.ts |
| **联系方式取法** | `t(locale, 'contact.info.email')`（无 site.config.ts） | `siteConfig.contact.email` |
| **服务器** | 89.117.139.251:65002（u368650831） | 145.223.105.172:65002（u399092155） |
| **deployer ID** | `client-B` | `client-B-demo-a`（**4-18 误用 client-B 部署到主站险些污染**） |
| **部署密码** | Baidu+123 | CHINApumachine2026 |

---

## 重要决策路径（按时间）

### 4-17 demo-a 第二站启动 + 同日 v1→v2→v2.4 三轮重建
> 详见建站智能体案例库。**运营视角教训**：v1.0 MVP 客户满意，v2.0 满配（按 v2.3 模板）客户骂"乱、像草稿"——驱动建站智能体升级到 v2.4 + 业务叙事档案前置。

### 4-18 客户群反馈：cold chain → refrigerator 术语收窄
- 客户群说"我们更聚焦冰箱产线，不是冷链整体"
- 5 主问 + 4 追问对齐：业务模型 Solution Integrator 不变，工厂类型从 7 扩到 13（核心 5 + 拓展 6 + 专业 2 三层），HVAC 仅 AHU 箱体 / 医用仅产线设备不含合规
- **运营动作**：术语全站替换 + 13 solutions 页重排 + 首页 Who-We-Serve 三层重构
- **关键决策**：保留 subtitle/eyebrow 的"refrigeration equipment"作为业务范围补充（**主窄副宽 SEO 写法**），不一次全部收死
- **deployer 教训**：用 `client-B-demo-a` 不是 `client-B`，否则污染主站（4-18 当天差点踩坑，已加 timeline + memory）

### 4-22 客户群反馈 17 条响应
- 完成运营边界内 7 条 + 4 张真图替换：电话格式国际化 / Header 加 Home / Solutions Featured Equipment 修缺图 / 产品页 GEO Capsule 精简 / About 占位换真合影 / Blog 卡片 fallback / 4 张产品真图 data 层替换
- **客户反馈分级原则首次实践**（见 memory `feedback_client_feedback_filtering.md`）：17 条不是照单全收，分 3 档过滤
- 5 条建站范围（小语种/博客结构/Solutions 战略重构）转建站智能体排期
- **教训**：5 语种同步必须 batch 处理，不能 EN 改完忘了其他 5 语种

### 4-23 demo-c 7 张合作品牌 logo wall + 顺手修 fr/ar/ru 西语泄漏
- 客户发来 7 张品牌 logo（Torgplast 俄罗斯 / ELARABY 埃及 / EPS Empresa 西语 / Aisla Pak / EPS LASTRO / ICF Solutions / Retech）
- elaraby 是白色透明 PNG → PIL 反色处理（白→深灰 #2a2f36）
- 6 语种主页 Logo Wall section 同步重写：8 个虚线占位 → 7 个真品牌
- **意外发现**：fr/ar/ru 三个文件 H2+subtitle 是西班牙语硬编码（建站时偷懒留下的 bug），顺手修
- **运营沉淀**：暴露了"建站时偷懒未翻译"问题，必须从源头解决 → 触发 4-25 i18n 硬技术债攻坚

### 4-23 demo-b SSL SAN 缺 www 踩坑
- 客户反馈 Safari 访问 www.demo-b.com 报"此连接非私人连接"
- 诊断：Hostinger Lifetime SSL 初次签发时 www CNAME DNS 传播未完，Let's Encrypt 只签裸域，SAN 缺 www
- 修复：hPanel 卸载后重装 SSL，等 3 分钟重签
- **沉淀**：QA 清单第 13 项 + memory `feedback_ssl_san_coverage.md`

### 4-24 demo-a Day 8 GSC 老 sitemap 大清理
- 诊断：老 WP 站残留 8 个 sitemap（post/page/product/category/sitemaps.xml）瓜分 Google 爬取预算 → 新站 253 URL 8 天仅 6 次展示
- 修复：service account 直调 GSC API `sitemaps.delete`（**注意**：仅 URL-prefix 属性下 service account 有 Owner 权限可删，sc-domain 不行）
- 移植 demo-c `scripts/index-boost.mjs` 到 demo-a（之前缺）
- **沉淀**：QA 清单第 15 项 + memory `feedback_wp_to_astro_gsc_sitemap_cleanup.md`

### 4-25 三大动作日（视觉升级三轮 + 询盘漏功能 + i18n 攻坚）

**Round 1 - 内容深化 + hero 二次收窄**：
- demo-a hero `Refrigeration Equipment Factory` → `Refrigerator Factory`（4-18 收窄路径延续）
- 8 个非核心 solutions 全量补 advantages（4 条差异化卖点）+ 5 条扩展 FAQ × 6 语种（spawn 5 sonnet 子 agent 并行翻译）
- 修 [slug].astro 渲染 bug：DEEP_DIVE_SLUGS 白名单 → "i18n 数据存在则渲染"（chefBase + displayCabinet 数据已存在但白名单只放 3 个 = 白写）
- demo-c 删产品页 "Video coming soon" 虚线占位（B2B 客户看到反感）

**Round 2 - 视觉装饰 v1（克制） → 客户反馈"看不出来" → v2 (bold)**：
- v1：SectionBackdrop 4 层叠加（渐变 + SVG + 模糊 AVIF + fade），opacity 0.06/0.13 极度克制
- 客户反馈："没有发现什么变化，背景还是空荡荡的，并不是像很多高端前沿的网站那样视觉上很丰富和专业"
- **教训**：我对"天花板级"理解错了——客户要的是 Stripe/Linear 那种**视觉张力明显**，不是"克制到看不见"
- v2：加 intensity="bold" 默认 — mesh gradient（3 radials 叠加） + 大型 brand-color blob blur-3xl + dot/img opacity 翻倍 + radial mask 边缘羽化
- 客户反馈："这次视觉的升级很好，比之前的网站好多了，视觉不会疲乏了"
- **沉淀**：memory `feedback_section_backdrop_design.md`

**Round 3 - 询盘漏功能 + FloatingCTA v2**：
- 客户反馈："第二个站好像没有邮件和在线询单功能"
- 诊断：demo-a contact 表单 + Web3Forms 真 key + Footer mailto/tel/whatsapp 都齐，**真问题是 FloatingCTA + ExitIntent 两个浮动器件 v1 MVP 时省略了**
- 移植两组件 + 适配 brand-700 sky + 6 语种 i18n + Web3Forms 走 siteConfig + storage key 改 demo-a_exit_shown
- 删 Footer 老 WhatsApp 单按钮（与 FloatingCTA `fixed bottom-6 right-6` 重叠 — 教训：建站交付前必 grep 这个）
- **客户后续反馈："这个 3 圆按钮丑，所有站都这样，可能是审美疲劳"**
- 重设计 v2 Intercom-style：单一胶囊 trigger + 展开 popup card 含响应时间承诺（WhatsApp 30min / Email 24h / Form 5min）+ 多语种小标识（🌍 EN/ES/PT/FR/RU/AR）
- 配 Header backdrop-blur sticky + ScrollProgress 渐变进度条 + 全站卡片 hover lift -4px brand glow
- **沉淀**：memory `feedback_inquiry_baseline_components.md` + `feedback_floating_cta_v2_intercom_style.md`

**Round 4 - demo-c i18n 硬技术债攻坚（Stage 1+2+3）**：
- 起源：4-23 fr/ar/ru 西语泄漏暴露建站偷懒
- Stage 1：Header.astro 53 处文本改 t()，nav 翻译表新增 11 key × 6 语种
- Stage 2 PoC：quality 页迁移到 [locale] 动态路由（删 6 个旧 quality.astro，新建 1 个）
- Stage 3：11 类页面（privacy/thank-you/applications/about/contact/solutions/blog/products/index 等）+ ExitIntent 全部从 cp-多目录反模式重构为 [locale] 动态路由，删 66 旧文件，新建 11 [locale]/ 模板
- page-content.ts 大扩容：8 个新 content blob + aboutContent / thankYouContent 6 语种真翻译填充
- GSC URL pattern 完全不变（无需 301），SEO 平滑
- **沉淀价值**：fr/ar/ru/pt 4 语种 GSC 27/31/35/18 曝光从 CTR 0% 开始有内容止血

---

## 跨双站设计语言一致性（4-25 起）

两站共享设计组件但**主色 token 不同**：

| 组件 | demo-c | demo-a |
|---|---|---|
| `SectionBackdrop.astro` | NAVY=`#1e3a5f` AMBER=`#f59e0b` | NAVY=`#0369a1` AMBER=`#0ea5e9` |
| `FloatingCTA.astro` v2 | from-[#1e3a5f] to-[#2d5a8e] | from-brand-700 to-brand-600 |
| `ExitIntent.astro` | storage `demo-c_exit_shown` | storage `demo-a_exit_shown` |
| `ScrollProgress.astro` | linear-gradient(orange-500) 旧 | linear-gradient(brand-700, accent-500) 新 |
| Header backdrop-blur | bg-white/95 + backdrop-blur-md | bg-white/95 + backdrop-blur-md |
| 全站卡片 hover | rgba(30,58,95,0.20) navy glow | rgba(3,105,161,0.20) sky glow |

复制组件到第三站时：grep 替换主色 hex + 替换 storage key + 验证 i18n 适配。

---

## 数据基线对比（4-25 当日）

| 指标 | demo-c | demo-a | Demo-B（对比） |
|---|---|---|---|
| GSC 7d 展示 | 173 | 6 | 123 |
| GSC 7d 点击 | 0 | 0 | 1 |
| GSC 7d CTR | 0% | 0% | 0.8% |
| GA4 7d sessions | 35 | 86 | 28 |
| GA4 7d 跳出率 | 54.3% | 71.1% | 68% |
| 站龄 | 主站 1 年+ | 第二站 8 天 | 6 个月+ |
| 索引页数 | 9（主站） | 6（沙盒期） | 50+ |

---

## 客户协作画风总结（影响后续决策）

- **视觉敏感度高**：截图反馈频繁，对"模板化"特别敏感（4-25 一天连续反馈"白底单调"+"3 圆按钮所有站都这样"）
- **认知靠"对比"**：直接问"X vs Y 差别"会犹豫，给截图对比 + 数字差距能秒决策
- **不会主动清缓存**：每次部署后必须明确告知"按 Ctrl+Shift+R"
- **要求"可追溯"**：每次大改后会问"为什么改 / 数据支持"，简报必须含决策依据
- **接受"主窄副宽"**：术语收窄时不要一次全收死，subtitle/SEO meta 留宽口径补充业务范围
- **重视响应承诺**：FloatingCTA v2 加"WhatsApp 30min / Email 24h"承诺时立即认可
- **审美疲劳真实存在**：跨站统一组件用久了客户会觉得"模板化"，需要每 1-2 月引入新设计语言（v1→v2 升级即此场景）

---

## 给后来的运营智能体（继任）的建议

1. **双站 deployer ID 必须确认**：`client-B` vs `client-B-demo-a`，错了会污染主站。每次部署前 echo 一下。
2. **i18n 取联系方式**：demo-c 用 i18n key（无 site.config.ts），demo-a 用 siteConfig。复制组件时这是常见报错点。
3. **客户反馈分 3 档过滤**：见 memory `feedback_client_feedback_filtering.md`。绝不能传话筒模式照单全收。
4. **视觉装饰**：默认用 v2 bold 模式，不要再回 v1 subtle（除非客户明确要求克制）。
5. **询盘 widget**：v2 Intercom-style 已成两站基线，**新页面必检 FloatingCTA 是否还在**。
6. **5 语种同步是常踩**：EN 改完必须 batch 改其他 5 语种，否则非英语用户看到 fallback 到 EN（建站智能体待沉淀进 starter 自动同步机制）。
7. **客户素材积压**：8 类成品照 + 真案例 + ISO/CE 扫描件 + LinkedIn URL 一直是 pending，建议每月固定一次"素材请求清单"催客户。
8. **建站职责越界**：架构级变动（site.config 重做 / BaseLayout 重写 / 主题预设切换 / 7 业务模型判定）禁止运营智能体做。涉及到这个范围立即引导切换到建站智能体（见 memory `feedback_agent_boundary.md`）。

---

*Last updated: 2026-04-25 by 网站运营-web-ops v9.3*

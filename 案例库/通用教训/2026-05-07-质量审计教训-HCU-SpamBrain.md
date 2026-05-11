# 2026-05-07 跨 4 客户质量审计教训 — HCU + SpamBrain 风险

> **来源**：运营人员"我有点担心我们的质量会被谷歌判定为 AI 或低质量"驱动，4 个并行 Agent 审计 4 站 × 4 sample = 16 张评分卡（reports/quality-audit-2026-05-07/）
> **核心结论**：4 站平均 67.3/100 全在警示档，**单篇博客本身合格**（AI 痕迹 LOW），**风险全部在 sitewide 模板层 + E-E-A-T 缺失 + boilerplate Schema**
> **认知转换**：从"修当下"到"治未来" — 16 个 P0 不是独立 bug 是 6 个智能体能力缺口

---

## 4 客户站评分快照

| 客户 | 总分 | 风险 | 最致命独有问题 |
|---|---|---|---|
| Demo-D | 63/100 | 🟠 高 | 11 天 90 篇（15×6 语种）超可信节奏 / 0 配图 / 多 SKU 共享 FAQPage |
| Demo-C EPS | 71/100 | 🟠 中高 | fake AggregateRating 4.8/5 × 25+ 产品页（教科书违规） |
| Demo-A | 70.5/100 | 🟡 中下 | 13 产品页 GEO capsule 复用相同字符串 |
| Demo-B | 64.75/100 | 🟡 中 | 9 张博客头图全 broken / 6 语种 body 字段空 |

**4 站平均 67.3/100**

---

## 6 个智能体能力缺口（必须沉淀进未来 SOP）

### 缺口 #1：博客无 Person Schema + 真人作者 + LinkedIn

**审计发现**：4 站 60+ 篇博客 author 全是 Organization 或集体名（"Demo-B Technical Team"），0 Person Schema，0 sameAs LinkedIn URL。

**Google 信号**：2024-2025 E-E-A-T 强化版核心。流量支柱博客（EPS-vs-EPP 132 imp / 木材胶水 63 imp）当前 OK 是"Google 暂时给机会"窗口，下次 Core Update 易切。

**强化方向**：content-production.md 加 E-E-A-T 强制门禁 — frontmatter `author` = 真名 + `authorUrl` = LinkedIn URL，Person Schema 含 sameAs / 头衔 / 工作经验。**模板槽位必填，缺失阻断发布。**

---

### 缺口 #2：博客正文 0 个外链权威源

**审计发现**：OSHA / NIOSH / EU REACH / ASTM / EN 标准 / EUMEPS / EPRO 4 站全是裸文字提及，无超链接。

**Google 信号**：humanizer-zh 24 模式中"模糊归因"扣分严重。HCU 判定"内容是否引用真权威源"=关键信号。"专家认为 / 行业报告显示"无具体来源 = AI 痕迹典型。

**强化方向**：content-production.md 阶段 4 加"权威外链强制 ≥ 2"硬规则。grep 正则覆盖行业典型权威源（OSHA / NIOSH / FDA / EPA / CEN / ASTM / EN / ISO / EUMEPS / EPRO 等），不到 fail。

---

### 缺口 #3：产品页 / 方案页 boilerplate Schema 跨页复用

**审计发现**：
- Demo-D：多 SKU 共享同一 FAQPage Schema
- EPS：25+ 产品页同一 fake AggregateRating
- 冷链：13 产品页 GEO capsule 复用模板字符串
- Demo-B：双组分木材胶产品页 54/100（最低）

**Google 信号**：2023+ Google 明确打击的"scaled content abuse"模式。Schema 同站跨页相似度 > 80% = SpamBrain boilerplate signal。

**强化方向**：build-qa.sh 加 #19 检查 — 同站 ≥ 5 个产品页 FAQPage Schema 文本相似度 > 80% 视为 fail；GEO capsule 字符串相似度 > 70% fail。

---

### 缺口 #4：博客图 broken / 多语种 body 字段空

**审计发现**：
- Demo-B博客图库 4 张图但 frontmatter 引用 9 张（5 张 broken）
- Demo-B 6 语种博客 body 字段空（搜索引擎看到的是骨架）

**Google 信号**：broken image alt 抓不到 / 多语种 hreflang 指向空内容 = 用户体验信号差 + 多语种欺诈嫌疑。

**强化方向**：content-production.md 阶段 12 + build-qa.sh 加 build-time 资源完整性硬扫 — frontmatter `cover/image/heroImage` 引用必须 fs.exists；多语种 body 字段 ≥ 500 字符（不是只 frontmatter）。

---

### 缺口 #5：X-vs-Y / pillar 模板 4 天 burst 同质化

**审计发现**：Demo-B 5/4 + 5/5 + 5/7 三篇 X-vs-Y 对比博客，骨架高度雷同（TL;DR 表 + 7 段固定顺序 + 5 问 FAQ + 5 链接），加共同瑕疵 = SpamBrain 模式识别签名簇。

**Google 信号**：单看任意 1 篇不构成触发，**3 篇作为内容簇被识别"同模板批量生产"概率中高**。

**强化方向**：content-production.md 阶段 1（选题）加同结构博客 14 天冷却期 — 同模板（X-vs-Y / pillar / how-to / listicle）最近 14 天 ≤ 1 篇，超出强制差异化（角色化重构 / 不同章节顺序 / 不同 FAQ 数）。

---

### 缺口 #6：单站发布节奏超可信阈值

**审计发现**：Demo-D 11 天 15 篇 × 6 语种 = 90 篇产出。Agent 直接点出："发布速率超出小型 B2B 制造商可信节奏"。

**Google 信号**：SpamBrain 模式识别签名簇。**单篇质量合格 ≠ 不被判 boilerplate**。"小型 B2B 制造商一周发 7 篇" = 不可信信号。

**强化方向**：weekly-blog-trigger.mjs 加 B2B 节奏阈值 — 单站 ≤ 3 篇/周 / ≤ 8 篇/月（含翻译多语种合并算 1 篇）。超出 trigger 自动 skip + 推 P0 警示。

---

## 跨智能体 P1（标记给建站智能体）

**starter 模板（astro-b2b-starter）清理**：
- 删 fake AggregateRating + 假 Review by "South American packaging manufacturer" 等历史遗留
- 删 testimonialsFooterNote "Real testimonials...will appear here" 占位
- 默认带 Person Schema 槽位 + author bio i18n 模板
- build 阶段集成"反欺诈 Schema"自检

> 这是建站智能体的活，运营智能体不越界改。已记 P1 待办。

---

## 自我进化机制要求

按 CLAUDE.md "自我进化机制（核心制度）" 4 步：

1. ✅ 修复问题本身 — 16 个 P0 待修（边整改边发，不暂停 KPI）
2. ✅ 回溯根因 — 已识别 6 个能力缺口
3. **🔄 更新规则**（本次重点）：
   - content-production.md 阶段升级（缺口 #1 #2 #4 #5）
   - build-qa.sh 扩展 #17-#22（缺口 #3 #4）
   - weekly-blog-trigger.mjs 节奏阈值（缺口 #6）
   - CLAUDE.md QA 16→22 项 + 同步指针
   - ceiling-targets.json 加 contentQuality 维度
4. **📝 记录进化** — 时间线 add_timeline + commit + 这份教训档案

---

## 长期监控点（每月跑一次）

- 4 客户站季度 quality-audit 重跑（看分数是否提升）
- 顶级团队入门线 70+ / 稳定输出线 85+
- 单站 < 70 → 反向触发整改任务（ceiling-targets.json 配置）

---

*这份教训档案是新客户接入时**必读必继承**的。`接入客户` 技能下次升级时把它加到 onboarding checklist 第 1 步。*

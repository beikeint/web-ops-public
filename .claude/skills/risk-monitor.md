---
name: risk-monitor
description: 6 大风险类别监控 — Google 算法更新预警 / 竞品突然上线 / 客户站攻击 / 内容被复制 / GDPR-CCPA 合规 / GSC manual action。顶级 agency 标配的"防御性能力"，我们之前完全空白。
---

# 6 大风险监控 v1.0

> **建立时间**：2026-04-27（v10.1 第五批 · 产品级基础设施）
> **核心理念**：顶级 agency 不只看流量上升，更要防"突然下降"
> **解决问题**：之前 web-ops 智能体只有 KPI 异常报警（v10.1 batch 4），但缺**主动外部风险监控**

---

## 一、6 大风险类别

| # | 风险 | 触发频率 | 影响 | 监控方式 |
|---|---|---|---|---|
| 1 | **Google 算法更新预警** | 每月 1-2 次 | 排名突变 / 流量骤降 | RSS 订阅 + WebSearch |
| 2 | **竞品突然上线** | 季度 | 关键词被分流 | 行业关键词周扫 |
| 3 | **客户站被攻击** | 偶发 | uptime 损失 + SEO 惩罚 | uptime + WAF + DNS 监控 |
| 4 | **内容被复制 / 抄袭** | 持续 | E-E-A-T 信号稀释 | Copyscape / Google 反向搜索 |
| 5 | **GDPR / CCPA / 中国网安法合规** | 持续 | 法律风险 + 罚款 | Privacy policy 检查 + cookie consent |
| 6 | **GSC manual action / 警告** | 偶发 | 索引被取消 | GSC API 每日扫 |

---

## 二、风险 1：Google 算法更新预警

### 数据源

- **官方**：https://twitter.com/searchliaison（Search Liaison 推特）
- **Google Search Status Dashboard**：https://status.search.google.com
- **Search Engine Land "Core Update" 标签**：RSS feed
- **Search Engine Journal "Algorithm Update"**：RSS feed

### 监控 SOP

```
每天 daily-cron 9:00 跑:
1. fetch RSS https://searchengineland.com/library/google/google-algorithm-updates/feed
2. 看过去 24h 是否有新 algo update 公告
3. 关键词识别: "core update" / "spam update" / "helpful content update" / "PageRank tweak"
4. 如有新更新:
   - 简报"算法更新预警"段标红
   - 推企微 P1 告警
   - 后续 7 天对每客户 daily-cron 加跑"算法影响检查"
5. 算法更新后 7 天内:
   - 流量骤降是 algo 副作用 (不是站点本身问题)
   - 简报标记"算法波动期 → 等 Google 稳定 (一般 2-4 周)"
```

### 历史算法更新对应 SOP

| 更新类型 | 影响 | 应对 |
|---|---|---|
| Core Update（季度大更） | 全行业排名洗牌 | 等 4 周稳定 + 看哪些页面被惩罚 → 提升内容质量 |
| Spam Update | 低质量内容站惩罚 | 检查我们是否有过度优化 / 关键词堆砌 |
| Helpful Content Update（HCU） | AI 生成内容被打击 | 强化 Person Schema sameAs + humanizer-zh 必跑 |
| Reviews Update | 评论页面影响 | 加强真实评论 + Avoid 假评 |
| Page Experience Update | CWV 影响 | 优化 INP/LCP/CLS（已有 schema-library + 图片 SEO） |

---

## 三、风险 2：竞品突然上线

### 监控 SOP

每周一 daily-cron 跑：
- 对每客户行业 Top 5 关键词跑 GSC organic SERP（用 search-analytics 模拟）
- 看 SERP top 20 是否有"过去 7 天首次出现"的新域名
- 新域名 = 新竞品上线（或老竞品发布新内容）

### 应对 SOP

```
发现新竞品 X:
1. fetch https://X.com 抓主页
2. 抓他的 sitemap.xml 看产品/内容数
3. WebSearch X.com 公司背景 / 投资 / 团队规模
4. 评估威胁等级:
   - 大厂背景 → 严重（如阿里/腾讯出海子公司）
   - 中型 agency 出海项目 → 中等
   - 个体 / 副业 → 低
5. 简报"新竞品出现"段
6. 加进 competitor-radar 监控列表（自动跑 7 天 baseline）
7. 对比内容差距 → 我们补什么 / 抢哪些 PAA / 写哪些对比文
```

---

## 四、风险 3：客户站被攻击

### 监控 SOP

每天 daily-cron 7+1 项已含 uptime/SSL/可用性，但 **risk-monitor 加深度**：

```
1. uptime monitoring (已有)
2. SSL 监控 (已有)
3. **DNS 突变检测** (新增):
   - 拉客户站当前 A / AAAA / NS / MX 记录
   - 跟昨日快照对比
   - 如有变化但无客户告知 → 可能被劫持 → P0 推企微
4. **WAF / Cloudflare 状态** (如客户用):
   - Cloudflare API 看 firewall events 24h
   - 异常 IP 集中访问 → 报警
5. **页面内容篡改检测**:
   - 抓客户首页 + Top 5 产品页
   - SHA256 hash 对比昨日
   - 内容大变 → 推企微 (有可能是被黑或者客户改了没说)
6. **Backlink 异常** (季度):
   - Ahrefs/Semrush API (如付费) 看新增反链
   - 大量低质垃圾外链 → 可能被 negative SEO 攻击
   - 进 disavow 流程
```

---

## 五、风险 4：内容被复制 / 抄袭

### 监控 SOP（每月 1 号 daily-cron）

```
对每客户:
1. 拉过去 6 个月发布的 Top 20 博客
2. 对每篇博客:
   - 选取 1-2 个独特句子 (含具体数据 / 案例)
   - Google 搜索带引号 "独特句子"
   - 看返回结果是否有非客户站
   - 如发现复制 → 标记
3. 严重程度评估:
   - 完全复制 + 不署名: 严重
   - 复制 + 改写但不引用源: 中等
   - 短句引用 + 注明来源: 可接受
4. 应对:
   - 严重: DMCA takedown notice
   - 中等: 邮件要求引用源 / 加 link
   - 可接受: 不处理但记录 (反向证明内容好)
```

### 工具

- **Copyscape Premium**: $0.05/搜索
- **Google 手动反向搜索**: 免费但需人工
- **Plagiarisma**: 免费 + 限额

---

## 六、风险 5：GDPR / CCPA / 中国网安法合规

### 检查清单

```
对每客户:
1. Privacy Policy 页存在? URL 在 footer / cookie banner?
2. Cookie Consent banner 实施? (跨境必备)
   - GDPR: 拒绝 cookie 默认 + 颗粒度选择
   - CCPA: "Do Not Sell My Personal Information" 链接
3. 数据传输条款 (跨境): 用户数据是否跨境 + 用户知情?
4. 第三方服务披露: GA4 / Crisp / Clarity 等是否在 Privacy Policy 提及?
5. Form 数据保留期声明
6. 用户权利说明:
   - 查询权 (查我们存了你什么)
   - 修改权 (改正错误数据)
   - 删除权 (彻底删除)
   - 数据可携权 (导出数据)
7. 联系点: DPO (Data Protection Officer) 或 privacy@<domain> 邮箱
8. 违规罚款准备:
   - GDPR: 最高 4% 全球年营收 或 €20M
   - CCPA: $7500/intentional violation
   - 中国网安法: 营收 1-5% 罚款
```

### 自动检查

```
每月 1 号 daily-cron:
- fetch 客户站 footer 看 "Privacy Policy" / "Cookie Policy" 链接
- fetch privacy-policy 页看长度 (太短 = 没诚意)
- 拉 cookie banner 实现 (GDPR 必备)
- 给客户发 compliance check report:
  - ✅ 已有项
  - ⚠️ 部分项
  - ❌ 缺失项
  - 📋 推荐补完
```

---

## 七、风险 6：GSC manual action / 警告

### 监控 SOP

每天 daily-cron 7+1 项已有 GSC 异常检查，**risk-monitor 加细化**：

```
调 search-analytics MCP gsc_crawl_errors + gsc_index_changes 之外:
1. **Manual Actions**: GSC > Security & Manual actions
   - 如有 manual action → P0 推企微
   - 类型: spam / unnatural links / thin content / cloaking 等
2. **Security Issues**: 
   - 黑客攻击警告
   - 恶意代码注入
   - SSL 突然失效
3. **Coverage Status**: 
   - "Crawled - currently not indexed" 数量
   - "Discovered - currently not indexed" 数量
   - 异常增长 → 内容质量问题
4. **Mobile Usability**: 
   - "Text too small to read"
   - "Clickable elements too close together"
5. **Core Web Vitals 警告**: 
   - URLs failing FID/INP/LCP/CLS thresholds
```

### 各类 manual action 对应 SOP

| Manual Action | 应对 |
|---|---|
| **Unnatural Links to Site** | disavow 工具 + 检查 backlink 来源 + 移除可控外链 |
| **Thin Content** | 用 content-refresh 重写内容 + 增加深度 |
| **Cloaking** | 检查 user-agent specific rendering + 修复 |
| **Hacked Content** | 立刻 hotfix + 改密码 + WAF 增强 |
| **User-generated Spam** | 加垃圾过滤 + reCAPTCHA |
| **Pure Spam** | 严重，全站 review + 可能需放弃域名 |

---

## 八、daily-cron 集成

新增 dom===2 月度风险审计：

```javascript
if (dom === 2) {
  weeklyTasks += `

【本日加跑（每月 2 号）· v10.1 batch 5 · risk-monitor 月度风险审计】6 大风险类别扫描:
- 风险 1: 算法更新汇总 (过去 30 天 + 影响评估)
- 风险 2: 新竞品出现 (基于 competitor-radar 数据)
- 风险 3: 客户站攻击迹象 (DNS 变化 / WAF 异常 / 内容篡改)
- 风险 4: 内容被复制扫描 (Top 20 博客抽样)
- 风险 5: GDPR/CCPA 合规 checklist
- 风险 6: GSC manual action / 警告 / coverage 异常增长
- 输出综合风险报告 + Top 3 行动项
- 详见 skill: \`.claude/skills/risk-monitor.md\``;
}
```

---

## 九、优先级 + 报警机制

| 风险等级 | 触发 | 报警方式 |
|---|---|---|
| 🔴 P0（即时） | manual action / 站被黑 / DNS 劫持 / 大量内容被复制 | 推企微 + 简报顶部红字 + pending-tasks.md |
| 🟠 P1（24h 内） | 算法更新预警 / 新强竞品 / GDPR 缺关键项 | 简报红字 + pending-tasks.md |
| 🟡 P2（一周内） | 内容被引用未署名 / 合规小问题 | 简报黄字 + 月报记录 |
| 🟢 P3（关注） | 排名波动正常范围 / 老竞品微动作 | 月报记录 |

---

## 十、跨技能协作

| 风险类型 | 转给 |
|---|---|
| 风险 1（算法更新） | 触发 web-ops 全客户 baseline 重测 |
| 风险 2（新竞品） | 触发 competitor-radar 加监控 + content-production 出竞品对比文 |
| 风险 3（站攻击） | 触发 hotfix skill + 客户运维介入 |
| 风险 4（内容被复制） | 触发 digital-pr skill 发 takedown / 加 backlink |
| 风险 5（合规） | 触发客户 IT/法务团队 + 加进 onboarding 必查项 |
| 风险 6（GSC 警告） | 触发 hotfix skill + content-refresh skill |

---

## 十一、效果指标

### 30 天验证
- 月度风险审计跑 ≥ 1 次
- 至少识别 1 个真风险
- 至少 1 个 P0/P1 风险被处理

### 90 天
- 6 大风险类别全部覆盖
- 风险召回率 ≥ 80%（真风险被检测到的比例）
- 风险误报率 < 20%

---

## 十二、工具栈

| 用途 | 工具 |
|---|---|
| 算法更新 RSS | https://searchengineland.com/library/google/google-algorithm-updates/feed |
| Search Status | https://status.search.google.com |
| 竞品监控 | competitor-radar.mjs（已有） + WebSearch |
| 站点篡改检测 | curl + sha256sum + diff |
| DNS 监控 | dig / cloudflare API |
| 内容复制扫描 | Copyscape / Google 手动 |
| 合规检查 | privacy-policy fetch + grep + checklist |

---

*v10.1 第五批 · 6 大风险监控 · 2026-04-27 · 顶级 agency 标配的防御性能力*

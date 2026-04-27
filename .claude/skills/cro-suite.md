---
name: cro-suite
description: >
  CRO 转化率优化套件 — heatmap + session replay + A/B 测试 + funnel 分析 + form
  优化 + 信任信号布局 + exit-intent。基于 Peep Laja / CXL 方法论。识别用户从访问
  到转化的漏斗每一步流失,数据驱动优化(不拍脑袋改设计)。触发词:"CRO"、"转化率"、
  "heatmap"、"A/B 测试"、"funnel"、"漏斗"、"信任信号"、"为什么访客不转化"、
  "form 优化"、"exit intent"。
user-invokable: true
argument-hint: "<客户ID> [target-page]"
license: MIT
metadata:
  source: "Peep Laja (CXL/Speero) + Avinash Kaushik 方法论 + 2026 GSC/GA4 数据集成"
  version: "1.0"
  category: cro
  added_in: "v10 (2026-04-26)"
---

# CRO 转化率优化套件 v1.0

> **何时用**：客户站有流量但转化为 0 / 低于预期 / Funnel 某一步流失严重 / 客户问"我们流量不少为啥不询盘"
> **不适用**：纯 SEO 排名问题（用 ctr-optimization）/ 流量不够（用 daily-ops + content-production）
> **核心原则**：**Peep Laja 铁律 — 不靠直觉改 UX,只用数据驱动**

---

## 7 步 CRO 工作流

### Step 1: 现状基准（Baseline）
拉数据：
- **GA4 转化事件**（已部署的 5 个：whatsapp_click / email_click / phone_click / quote_click / generate_lead）
- **Funnel**（用 GA4 explorations）：
  - 步骤 1：Landing page → 浏览
  - 步骤 2：浏览 → 关键页（产品/服务/about）
  - 步骤 3：关键页 → CTA 触发
  - 步骤 4：CTA → 完成（form submit / WhatsApp 发起 / 电话点击）
- **跳出率**：> 60% 的页面识别
- **页面停留时长**：< 30s 的页面识别
- **Heatmap**（用 Microsoft Clarity 免费方案）：scroll depth / click map / dead click
- **Session replay**：抽 5-10 个真实访客视频看 friction 在哪

### Step 2: Funnel 流失诊断
**最大流失步是哪一步？**

| 流失阶段 | 典型原因 | 修复优先 |
|---|---|---|
| Landing → 浏览 | 首屏不相关 / 加载慢 / 文案不抓人 | 🔴 P0 |
| 浏览 → 关键页 | 内链不清晰 / 导航太复杂 / search 缺失 | 🟠 P1 |
| 关键页 → CTA | CTA 不明显 / 信任信号不足 / 价格不透明 | 🔴 P0 |
| CTA → 完成 | Form 太长 / 国际化错配 / 支付/咨询渠道不便 | 🟠 P1 |

### Step 3: 7 大转化障碍排查（Peep Laja 框架）
1. **相关性（Relevance）**：广告/搜索词承诺的内容首屏看到了吗？
2. **清晰度（Clarity）**：10 秒内能说清"这是啥/能给我啥"？
3. **价值（Value）**：差异化优势 vs 竞品？
4. **信任（Trust）**：客户 logo / 证书 / 评价 / 资质 / 案例
5. **紧迫感（Urgency）**：现在做的理由（库存/优惠/截止时间）
6. **摩擦（Friction）**：填表步骤数 / 必填字段数 / 是否要注册
7. **干扰（Distraction）**：多余链接 / 弹窗 / 不相关 banner

### Step 4: 信任信号深度审计
**B2B 站点必备**：
- ✅ 客户 logo 墙（≥6 家可识别品牌）
- ✅ 客户案例 / case study（含具体数据 + 客户引言）
- ✅ 资质证书（ISO / SGS / 行业认证扫描图）
- ✅ 团队照片 + 工厂实拍（不要 stock photo）
- ✅ 真实联系方式（电话 / WhatsApp / email / 地址 / 营业执照号）
- ✅ Google 评价 / Trustpilot / 行业平台评分
- ✅ 媒体报道 / 行业奖项

**跨境 B2C 必备**：
- ✅ 产品评价 + 真实买家秀
- ✅ 退货政策清晰
- ✅ 物流时间承诺
- ✅ 支付安全标识（SSL / 信用卡 logo / PayPal）
- ✅ 客服可达性（Live chat / WhatsApp）

### Step 5: A/B 测试设计
**优先级排序（按 PIE 框架：Potential / Importance / Ease）**：
- Potential：改后预期提升幅度（10-50%+）
- Importance：触达流量大小
- Ease：改造成本（设计 / 开发 / 测试时间）

每个 A/B 测试必含：
1. **假设**："我相信改 X 会让 Y 提升 Z%，因为...。"
2. **MDE**（最小可检测效应）：通常 ≥ 10%
3. **样本量**：用 evanmiller.org/ab-testing 算
4. **测试时长**：≥ 14 天（覆盖周末效应）
5. **成功指标**：定量（CR / RPV / form completion rate）
6. **次级指标**（防止 false positive）：跳出率 / 平均订单价 / 跨设备一致性

**典型测试候选**：
- Hero CTA 文案（"Get a Quote" vs "Free Engineering Consult"）
- Hero 图（产品图 vs 工厂图 vs 客户使用图）
- Form 字段数（5 vs 3 vs 1+渐进披露）
- 信任 badge 位置（首屏 vs CTA 旁 vs 页脚）
- 价格展示（透明 vs "Contact for pricing"）

### Step 6: Form 优化（最高 ROI 改造点）
**铁律**：每减少 1 个必填字段，转化率约 +10-25%

**B2B 询盘表单极简模板**：
- 必填：姓名 / Email / 询问内容
- 可选：公司 / 电话 / 国家 / 数量预估
- ❌ 删除：年龄 / 性别 / 详细地址 / 怎么找到我们

**渐进披露**：先要 email + name，提交后再问"详细需求"
**Multi-step form**：长 form 拆 3 步，进度条可见
**Smart defaults**：国家/语言根据 IP 预填

### Step 7: Exit-Intent 触发器
访客**离开页面**时触发：
- 桌面：鼠标移到顶部（关闭/地址栏方向）
- 移动：scroll up 快速 + 离开 tab

弹窗内容选择：
- **询盘磁铁**：免费报价 / 样品申请 / 行业报告 PDF
- **优惠**：首单减 X% / 免运费
- **挽留**：常见问题列表 / Live chat 主动邀请

⚠️ 不要乱用 — 每个客户最多 1 次/30 天

---

## 工具栈（2026 年免费 / 平价首选）

| 用途 | 推荐工具 | 价格 |
|---|---|---|
| Heatmap + Session Replay | **Microsoft Clarity**（free 无限制） | 免费 |
| A/B 测试 | **PostHog**（开源 self-host）/ **VWO** | 免费起 / $199 起 |
| Funnel 分析 | **GA4 Explorations** | 免费 |
| Form 分析 | **Formspark** / **Tally** + 自定义 GA4 事件 | 免费起 |
| Survey | **Hotjar Surveys**（free 1k responses） | 免费 |
| Live chat | **Crisp**（free 2 seats）/ **Tawk.to** | 免费 |

---

## 输出报告模板

```
## CRO 诊断报告 · [客户ID] · [日期]

### 1. 转化基线
- 总会话：X / 转化事件：Y / 转化率：Z%
- 主转化 funnel 流失分布：[1] -> [2]: -X% / [2] -> [3]: -Y% / [3] -> [4]: -Z%

### 2. 最大流失阶段诊断
- 流失阶段：[X]
- 推测原因：[A / B / C]
- 数据证据：[heatmap / replay / GA4 表现]

### 3. 7 大障碍排查结果
| 障碍 | 状态 | 发现 |
|---|---|---|
| 相关性 | ✅/⚠️/❌ | ... |
| 清晰度 | ... | ... |
| ... | ... | ... |

### 4. 信任信号缺口
- 缺：[X / Y / Z]
- 影响：转化路径上 [X 阶段] 受阻

### 5. A/B 测试候选（按 PIE 排序）
1. [测试名] · 假设 · 预期提升 · 优先级
2. ...

### 6. Form 优化建议
- 当前字段数：X
- 建议字段数：Y
- 预期 CR 提升：~Z%

### 7. 7 天行动清单
- 周一：[实施 X]
- 周三：[启动 A/B 测试 Y]
- ...
```

---

## 跨技能协作

| 发现 | 转给 |
|---|---|
| SEO 流量本身不足 | daily-ops + content-production |
| Title/Desc CTR 低导致流量没引进来 | ctr-optimization |
| 多语言站文化适配缺失 | seo-hreflang skill 的"文化适配评估" |
| 信任信号需要外链/品牌提及补 | digital-pr skill |
| Schema 不全影响 SERP 视觉 | schema-library skill |

---

## 实战案例锚点

- demo-b（client-D）2026-04-25 数据：123 展示 / 1 点击 / **0 转化** — 经典"流量到了但没转化"场景，CRO 介入时机
- 优先排查：Hero CTA 多语种本地化 + 信任信号是否在首屏 + Form 字段数

---

## 成熟度评分（自评 0-100）

- 数据基础：✅ GA4 5 事件已部署 + GSC 集成（85/100）
- Heatmap：⚠️ Microsoft Clarity 待激活（30/100）
- A/B 测试：❌ 未起步（10/100）
- Funnel 分析：⚠️ GA4 Explorations 未配置（40/100）
- Form 优化：⚠️ 各客户站 Form 字段数未审计（35/100）
- **总体成熟度：40/100**（v10 起点，目标 1 个月达 70/100）

# A/B 测试体系 · PostHog Self-Host 集成

> **作用**：基于 Peep Laja / CXL 框架的 A/B 测试 + Feature Flag + Funnel 分析
> **价格**：PostHog Cloud 1M events/月免费 / Self-host 完全免费
> **替代品**：VWO ($199+/月) / Optimizely ($50K+/年) / Google Optimize（已下线 2023-09）

---

## 一、为什么 PostHog（自托管）

| 维度 | PostHog Cloud | PostHog Self-host | VWO |
|---|---|---|---|
| 价格 | Free 1M events/月 | **完全免费** | $199+/月 |
| A/B 测试 | ✅ | ✅ | ✅ |
| Feature Flag | ✅ | ✅ | ⚠️ |
| Funnel 分析 | ✅ | ✅ | ✅ |
| Heatmap | ✅ | ✅ | ✅ |
| Session replay | ✅ | ✅ | ✅ |
| 数据所有权 | PostHog 服务器 | **你自己** | VWO 服务器 |
| 安装难度 | ⭐ | ⭐⭐⭐ | ⭐ |
| GDPR 合规 | ✅ | ✅ 完全可控 | ⚠️ |

**B2B 推荐 Self-host**：数据完全在客户手中（GDPR 友好）+ 永久免费

---

## 二、Self-Host 部署 SOP

### Step 1: 准备 VPS

最低配置：
- 4 GB RAM / 2 CPU / 80 GB SSD
- Docker + docker-compose
- 推荐：Hetzner CX21（€5.83/月）/ Vultr 4GB（$24/月）

### Step 2: 一键部署 PostHog

```bash
# SSH 到 VPS
ssh root@<vps-ip>

# 一键脚本
curl -fsSL https://posthog.com/deploy/docker-compose | bash

# 等 5-10 分钟后访问 https://<vps-ip>
# 创建 admin 账号
```

### Step 3: 客户站集成

#### 客户站 BaseLayout.astro 加：

```html
{config.features.posthogAB && config.posthog?.apiKey && (
  <script is:inline define:vars={{ apiKey: config.posthog.apiKey, host: config.posthog.host }}>
    !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){...});  /* 简化省略 */
    posthog.init(apiKey, { api_host: host });
  </script>
)}
```

#### site.config.ts 配置：

```typescript
features: {
  posthogAB: true,
},
posthog: {
  apiKey: 'phc_xxx',  // PostHog 控制台拿
  host: 'https://posthog.<你的域名>.com',  // self-host 地址
}
```

---

## 三、第一个 A/B 测试 SOP

### 测试 1：Hero CTA 文案

**假设**：把首页 hero CTA 从 "Get a Quote" 改成 "Free Engineering Consult" 会提升点击率 ≥ 20%

**实施**：

```typescript
// pages/index.astro
---
import posthog from 'posthog-js';
const heroCtaVariant = posthog.getFeatureFlag('hero-cta-test') || 'control';
const heroCta = heroCtaVariant === 'variant' 
  ? 'Free Engineering Consult' 
  : 'Get a Quote';
---
<a href="/contact" data-variant={heroCtaVariant} onclick={`posthog.capture('hero_cta_click', {variant: '${heroCtaVariant}'})`}>
  {heroCta}
</a>
```

PostHog 控制台：
1. Feature Flags → New
2. Key: `hero-cta-test`
3. Variants: control (50%) / variant (50%)
4. Conditions: 全部 users
5. Save → Activate

**测试时长**：≥ 14 天（覆盖周末效应）

**样本量计算**（用 evanmiller.org/ab-testing）：
- baseline CTR = 5%
- MDE = 20%（5% → 6%）
- power = 80%
- alpha = 0.05
- → 需要 ~3000 sessions/variant

### 测试 2：Form 字段数

**假设**：从 5 字段减到 3 字段，转化率提升 ≥ 15%

### 测试 3：信任 Badge 位置

**假设**：信任 badge 从页脚移到 CTA 旁边，CTR 提升 ≥ 10%

---

## 四、PIE 优先级框架（Peep Laja）

每个测试候选打分：

| 维度 | 1-10 分 | 含义 |
|---|---|---|
| **Potential** | 1-10 | 改后预期提升幅度 |
| **Importance** | 1-10 | 触达流量大小 |
| **Ease** | 1-10 | 改造成本（设计/开发/测试时间） |

**总分**：(P + I + E) / 3

按总分排序，优先做 ≥ 7 分的测试。

---

## 五、测试设计 checklist

每个 A/B 测试必含：

- [ ] **假设**："我相信改 X 会让 Y 提升 Z%，因为..."
- [ ] **MDE**：通常 ≥ 10%
- [ ] **样本量**：用 evanmiller.org/ab-testing 算
- [ ] **测试时长**：≥ 14 天
- [ ] **成功指标**（定量）：CR / RPV / form completion rate
- [ ] **次级指标**（防 false positive）：跳出率 / 平均订单价 / 跨设备一致性
- [ ] **失败回滚预案**：如何快速恢复 control

---

## 六、常见错误

### ❌ 错误 1：测试时间太短

样本不够 → 结论无统计意义

**规则**：≥ 14 天 + ≥ 计算的样本量 + ≥ 2 个完整周末

### ❌ 错误 2：同时跑多个测试

测试互相干扰 → 结论不准

**规则**：一次只跑 1 个 hero CTA 测试 + 1 个不冲突的 form 测试

### ❌ 错误 3：测试改动太大

如同时改 Hero 文案 + 颜色 + 排版 → 不知道哪个起作用

**规则**：每次只改 1 个变量

### ❌ 错误 4：没有 holdout group

100% 用户都测 → 没法验证后续效应

**规则**：保留 10-20% 用户作为 control（不参与任何测试）

---

## 七、Funnel 分析 + Cohort

PostHog 还能做：

- **Funnel**：定义转化漏斗（Landing → Product → Form → Submit）→ 看每步流失
- **Cohort**：按入站时间/来源/行为分组 → 看不同 cohort 留存差异
- **Trends**：长期趋势对比

---

## 八、跟现有工具协同

| 工具 | 跟 PostHog 关系 |
|---|---|
| Microsoft Clarity | Clarity 看 heatmap/replay；PostHog 跑实验。**互补不冲突** |
| GA4 | GA4 看大盘 / 长期归因；PostHog 看实验细节 |
| Looker Studio | Dashboard 可拉 PostHog API 数据 |
| Crisp Live Chat | PostHog 可跟踪 chat 跟实验关联 |

---

## 九、节奏目标

每客户站：
- 第 1 月：PostHog 部署 + 第 1 个测试启动（hero CTA）
- 第 2 月：第 2-3 个测试（form / trust badge）
- 第 3 月：3+ 测试同时跑 + 第一波 holdout group 数据
- 第 6 月：累计 10+ 测试 + 形成"有效模式库"

---

## 十、客户配合

✅ 客户必须同意：
- VPS 维护（运营人员代维或客户自己维护）
- 测试期间数据公开（A/B 比例、显著性结果）
- 失败测试也要诚实报（不只报成功）

✅ 法律：
- Privacy Policy 加"A/B testing"条款
- GDPR：不收集个人数据（PostHog 默认匿名化）

---

*v10.1 第四批 · A/B 测试 PostHog Self-host 集成 · 2026-04-27*

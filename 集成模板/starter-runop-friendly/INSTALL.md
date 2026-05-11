# astro-b2b-starter "运营友好度"内置规范

> **作用**：让 astro-b2b-starter 模板成为运营智能体的最佳搭档，每客户站一键开启所有运营能力
> **核心理念**：运营能力倒逼建站模板（不能先建好站再加运营，要建站时就为运营留好接口）
> **建立时间**：2026-04-27（v10.1 第五批 · 产品级基础设施）

---

## 一、模板必备的 11 大"运营友好"内置项

| # | 内置项 | 当前 starter | 产品级要求 |
|---|---|---|---|
| 1 | **`chat-widget.astro` 组件** | ❌ | ✅ 一键嵌入 Crisp/Tawk.to/Custom，配 client_id 即生效 |
| 2 | **`lead-magnet-modal.astro` 组件** | ❌ | ✅ Form 收集邮箱 + 自动接 inquiry nurturing |
| 3 | **`exit-intent-modal.astro` 组件** | ❌ | ✅ 已有通用模板（v10.1 batch 4） |
| 4 | **多语言 schema 自动化** | ⚠️ 部分 | ✅ 每语种 schema description/name 自动本地化 |
| 5 | **GA4 + GSC + Meta Pixel + Clarity 一键配** | ⚠️（GA4 部分） | ✅ site.config.ts 填 ID 即全部生效 |
| 6 | **`llms.txt` 自动维护** | ❌ | ✅ 每发新博客自动追加（v10 SEO 已加要求） |
| 7 | **`robots.txt` AI 爬虫 4 大默认放行** | ❌ | ✅ 模板默认含（GPTBot/ClaudeBot/PerplexityBot/OAI-SearchBot） |
| 8 | **Person Schema 作者库** | ❌ | ✅ `data/authors/` 目录 + sameAs |
| 9 | **Lead Magnet PDF 渲染页** | ❌ | ✅ `pages/resources/` 路由 |
| 10 | **Topic Cluster pillar 模板** | ❌ | ✅ `pages/guides/` 长文章模板 |
| 11 | **PostHog A/B 测试 SDK** | ❌ | ✅ 内置 SDK + Feature Flag helper |

---

## 二、site.config.ts 统一开关

未来理想形态（一个文件控制所有运营能力）：

```typescript
// astro-b2b-starter/src/config/site.config.ts
export default {
  // ... 现有配置 ...

  features: {
    // === 运营功能开关（v10.1 batch 5 新增） ===
    chatWidget: false,         // Live Chat（chat-widget.astro）
    leadMagnetModal: false,    // Lead Magnet 弹窗
    exitIntent: false,         // Exit-Intent 弹窗
    aiCrawlersAllow: true,     // robots.txt 放行 AI 爬虫（默认开）
    llmsTxtAutoUpdate: true,   // llms.txt 每发布博客自动更新
    posthogAB: false,          // PostHog A/B 测试
    clarityHeatmap: false,     // Microsoft Clarity heatmap
    metaPixel: false,          // Meta Pixel retargeting
  },

  // 第三方服务配置（运营智能体激活时填）
  chatWidget: {
    provider: 'crisp',  // 'crisp' | 'tawk' | 'custom'
    crispWebsiteId: '',
    tawkPropertyId: '',
    tawkWidgetId: '',
    customScript: '',
  },

  leadMagnet: {
    primaryMagnetUrl: '/resources/industry-report',
    primaryMagnetTitle: 'Free 2026 Industry Report',
    secondaryMagnets: [],  // 数组配置多份
  },

  exitIntent: {
    variant: 'lead-magnet',  // 'lead-magnet' | 'discount' | 'live-chat-invite'
    leadMagnetTitle: '',
    leadMagnetDesc: '',
    leadMagnetCta: '',
    leadMagnetUrl: '',
    coolDownDays: 30,
  },

  posthog: {
    apiKey: '',
    host: '',  // self-host: https://posthog.<your-domain>.com
  },

  clarity: {
    projectId: '',
  },

  metaPixel: {
    pixelId: '',
  },

  // SEO + GEO 增强（v10 已部分覆盖）
  authors: {
    // Person Schema 作者库
    'john-doe': {
      name: 'John Doe',
      jobTitle: 'Chief Engineer',
      sameAs: [
        'https://www.linkedin.com/in/johndoe/',
        'https://twitter.com/johndoe',
      ],
    },
  },

  // robots.txt AI 爬虫配置（模板默认放行）
  aiCrawlers: {
    allow: ['GPTBot', 'OAI-SearchBot', 'ClaudeBot', 'PerplexityBot'],
    block: ['CCBot', 'Bytespider', 'cohere-ai'],  // 客户可改
  },
};
```

---

## 三、组件清单（待加到 starter）

```
astro-b2b-starter/src/components/interactive/
├── ChatWidget.astro          ← v10.1 batch 2 已设计 (集成模板/chat-widget/)
├── LeadMagnetModal.astro      ← v10.1 batch 5 待设计
├── ExitIntentModal.astro      ← v10.1 batch 4 已设计 (集成模板/exit-intent/)
├── PostHogTracker.astro       ← v10.1 batch 5 待设计
├── ClarityTracker.astro       ← v10.1 batch 5 待设计
└── MetaPixelTracker.astro     ← v10.1 batch 5 待设计

astro-b2b-starter/src/data/
└── authors/                   ← Person Schema 作者库
    ├── default.ts
    └── README.md

astro-b2b-starter/src/pages/
├── resources/                 ← Lead Magnet 路由
│   ├── index.astro
│   ├── industry-report.astro
│   ├── buyers-guide.astro
│   └── roi-calculator.astro
├── guides/                    ← Topic Cluster pillar 路由
│   └── [slug].astro
└── llms.txt.ts                ← 动态生成 llms.txt

astro-b2b-starter/public/
└── robots.txt                 ← 含 AI 爬虫配置
```

---

## 四、跨智能体协作

这个改造**不能在 web-ops 智能体内独立做**（违反智能体边界硬规则），需要跨智能体协作：

### web-ops 智能体（本智能体）的角色
- **设计** "运营友好度"规范（本文档）
- **设计** 各组件接口（chat-widget / lead-magnet / exit-intent 已有）
- **集成模板** 提供（已有）

### 建站智能体（site-builder）的角色
- **实施** 把模板加进 starter 主仓库
- **测试** v2.4 starter 兼容性
- **发布** 新版 starter（v2.5 含运营友好度）

### 协作流程
1. web-ops 写本规范 + 各组件代码（**已完成 chat-widget / exit-intent**）
2. web-ops PR 到 starter 仓库（**待 site-builder 智能体审 + 合并**）
3. starter 发新版 v2.5
4. 已有客户站升级（按需，不强制）
5. 新客户站默认含全部能力

---

## 五、实施 SOP

### Phase 1（v10.1 batch 5 当前）：规范 + 组件就位

- [x] chat-widget 模板（batch 2）
- [x] exit-intent 模板（batch 4）
- [x] 本规范（batch 5）
- [ ] LeadMagnetModal.astro 组件设计（batch 5+）
- [ ] PostHogTracker / ClarityTracker / MetaPixelTracker 组件（batch 5+）
- [ ] llms.txt 动态生成 endpoint
- [ ] robots.txt AI 爬虫默认配置

### Phase 2（v10.2）：starter 主仓库加入

切到 `智能体/建站/独立站建站-site-builder/` 智能体执行：

- [ ] PR 把所有"运营友好"组件加进 starter
- [ ] 加 site.config.ts 11 大开关
- [ ] 测试 v2.4 兼容性
- [ ] 发布 starter v2.5

### Phase 3（v10.3）：新客户站默认应用

- [ ] /接入客户 命令自动用 starter v2.5
- [ ] 新客户接入 = 11 大运营能力默认就位（只需填 API key）

---

## 六、向后兼容

已有客户站（用 starter v2.4 建的）**不强制升级**：
- v2.4 仍然能跑，运营智能体 daily-cron 不依赖 v2.5
- 客户**主动想升级**时再做（如想加 Heatmap）
- 升级路径文档：`starter-v2.4-to-v2.5-migration.md`

---

## 七、效果指标

### 30 天（batch 5 后）
- 11 大运营能力组件全部就位（设计 + 代码）
- 至少 1 个客户站验证（试点）

### 90 天（v10.2 后）
- starter v2.5 发布
- 至少 1 个新客户用 v2.5 一键接入

### 180 天（v10.3 后）
- 全部新客户默认 v2.5
- 已有 3 客户站按需升级 ≥ 1 个

---

## 八、风险 + 注意

### 风险 1：跨智能体边界

按 CLAUDE.md "智能体边界硬规则"，web-ops 智能体不能直接改 starter（建站智能体管）。

**应对**：
- 本智能体只做"设计 + 集成模板 + PR 草稿"
- 实际合并到 starter 由建站智能体执行
- 跟运营人员明确切换智能体的时机

### 风险 2：v2.4 客户站升级阻力

启动新模板会改 BaseLayout / site.config.ts 结构，可能需要客户配合。

**应对**：
- 提供详细 migration guide
- 升级脚本自动改大部分配置
- 不强制，按需

### 风险 3：第三方服务成本累加

11 大能力中部分需要付费服务（PostHog VPS / bit.ly Pro / Crisp Pro）。

**应对**：
- 默认全部 free 方案
- 客户想升级 paid 时由客户决定

---

## 九、跨技能引用

| 技能 | 关系 |
|---|---|
| chat-widget 模板 | 已就位（v10.1 batch 2） |
| exit-intent 模板 | 已就位（v10.1 batch 4） |
| lead-magnet-automation skill | 配套（v10.1 batch 4） |
| clarity-heatmap 模板 | 配套（v10.1 batch 4） |
| ab-testing 模板 | 配套（v10.1 batch 4） |
| seo-geo skill | llms.txt + AI 爬虫 robots.txt 标准来源 |
| content-production skill v10 | Person Schema sameAs 来源 |

---

*v10.1 第五批 · astro-b2b-starter 运营友好度内置规范 · 2026-04-27 · 产品级模板与运营智能体耦合*

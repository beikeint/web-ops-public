# B2B 垂直平台集成模板

> **作用**：给客户在 Alibaba/MIC/EuroPages/ThomasNet/TradeIndia 等平台快速建立反向引流钩子
> **建立时间**：2026-04-27（v10.1 第三批）
> **配套 skill**：[b2b-platform-presence](../../.claude/skills/b2b-platform-presence.md)

---

## 目录结构

```
b2b-platform/
├── README.md                          ← 本文件
├── alibaba/                           ← Alibaba.com 模板
│   ├── company-profile.template.md
│   ├── product-pitch.template.md
│   └── PLATFORM-RULES.md
├── made-in-china/                     ← Made-in-China 模板
├── europages/                         ← EuroPages 模板（欧洲市场）
├── thomasnet/                         ← ThomasNet 模板（北美工业）
├── tradeindia/                        ← TradeIndia 模板（印度市场）
└── shared/                            ← 跨平台共享资产
    ├── nap-consistency.md             ← NAP 一致性 checklist
    ├── utm-tracking-guide.md          ← UTM 追溯体系
    └── bitly-shortlink-sop.md         ← bit.ly 短链生成 SOP
```

---

## 使用流程

### 1. 选择平台（按客户主市场）

| 客户主市场 | 优先级 |
|---|---|
| 全球 / 欧美 | Alibaba > MIC > EuroPages > ThomasNet |
| 欧洲为主 | EuroPages > Alibaba > Kompass |
| 北美为主 | ThomasNet > Alibaba > Kompass |
| 印度 / 南亚 | TradeIndia > IndiaMART > Alibaba |
| 化工 / 工业品 | + 行业垂直平台（ChemNet 等） |

### 2. 复制对应平台模板

```bash
cp -r ${WORKSPACE_ROOT}/智能体/运营/网站运营-web-ops/集成模板/b2b-platform/alibaba/ \
      ${WORKSPACE_ROOT}/客户/<客户>/website/docs/b2b-platform/alibaba/
```

### 3. 填充客户信息

- 公司名 / 联系人 / 产品列表 / 资质 / 案例
- 跨平台 NAP 一致

### 4. 生成 UTM 短链（用 bit.ly）

参考 [shared/bitly-shortlink-sop.md](shared/bitly-shortlink-sop.md)

### 5. 上传到平台 + 监控数据

- 客户后台手动上传（或客户员工配合）
- GA4 + bit.ly Analytics 看反向引流

---

## v10.1 完成度

| 平台 | 模板就位 | 已实战客户 | 平均月引流 |
|---|---|---|---|
| Alibaba | ⏳（v10.1 batch 3 建骨架） | - | - |
| Made-in-China | ⏳ | - | - |
| EuroPages | ⏳ | - | - |
| ThomasNet | ⏳ | - | - |
| TradeIndia | ⏳ | - | - |

后续每接 1 个客户验证 1 个平台，沉淀模板和数据。

---

*v10.1 第三批 · b2b-platform 集成模板根目录*

# UTM 追溯体系 · 跨平台引流 ROI 量化

> **作用**：让每一次反向引流都可追溯，决定哪个平台 / 哪个产品 / 哪个钩子 ROI 最高
> **配套**：[bitly-shortlink-sop.md](bitly-shortlink-sop.md)

---

## 标准 UTM 参数模板

```
?utm_source=<平台>
&utm_medium=<位置>
&utm_campaign=<活动/产品>
&utm_content=<具体钩子>
&utm_term=<关键词>  (可选)
```

---

## 5 大参数详解

### 1. utm_source（必填）

**值**：平台名（小写，无空格）

| 平台 | utm_source 值 |
|---|---|
| Alibaba.com | `alibaba` |
| Made-in-China | `mic` |
| EuroPages | `europages` |
| ThomasNet | `thomasnet` |
| TradeIndia | `tradeindia` |
| IndiaMART | `indiamart` |
| Kompass | `kompass` |
| Global Sources | `globalsources` |

### 2. utm_medium（必填）

**值**：链接所在位置

| 位置 | utm_medium 值 | 备注 |
|---|---|---|
| 公司主页 / About Us | `profile` | 高频来源 |
| 产品页 Description | `product` | 含具体产品 utm_campaign |
| 站内信 / IM 询盘回复 | `message` | 询盘后转化 |
| Banner / 视频 | `banner` | 视觉钩子 |
| 平台站内文章 / Blog | `content` | 平台 SEO 引流 |
| 平台直播 | `livestream` | 直播带货 |
| 邮件签名 | `email-sig` | 邮件触发 |

### 3. utm_campaign（必填）

**值**：具体活动 / 产品 / 战略

| 类型 | 示例 | 用途 |
|---|---|---|
| 品牌曝光 | `brand` | 公司主页类 |
| 产品 SKU | `pe-1400` / `pva-glue-fire-door` | 产品页 |
| 季节活动 | `spring-2026` / `canton-fair-2026` | 时段活动 |
| 新品发布 | `launch-pe-2000` | 新品 |
| 促销 | `promo-summer-2026` | 价格促销 |

### 4. utm_content（可选）

**值**：具体钩子或元素

| 钩子 | utm_content 值 |
|---|---|
| 文案中"resource pack"链接 | `resource-pack` |
| 文案中"datasheet PDF"链接 | `pdf-datasheet` |
| 视频末尾水印 | `video-watermark` |
| Banner 图链接 | `banner-image` |
| 评论区链接 | `review-link` |
| 询盘回复 PDF 附件 | `inquiry-attachment` |

### 5. utm_term（可选）

主要用于 PPC，B2B 平台一般不用。

---

## 完整示例

### 例 1：Alibaba 公司主页钩子

```
原链接: https://demo-b.com/cases
带 UTM: https://demo-b.com/cases?utm_source=alibaba&utm_medium=profile&utm_campaign=brand&utm_content=case-studies-link
bit.ly: bit.ly/demo-b-cases-ali
```

### 例 2：Alibaba PE-1400 产品页钩子

```
原链接: https://demo-b.com/products/pe-1400
带 UTM: https://demo-b.com/products/pe-1400?utm_source=alibaba&utm_medium=product&utm_campaign=pe-1400&utm_content=description-link
bit.ly: bit.ly/demo-b-pe1400-ali
```

### 例 3：Made-in-China 同产品

```
原链接: 同上
带 UTM: ...?utm_source=mic&utm_medium=product&utm_campaign=pe-1400&utm_content=description-link
bit.ly: bit.ly/demo-b-pe1400-mic
```

→ 这样 bit.ly Analytics 能直接对比"PE-1400 在 Alibaba vs MIC 的引流效果"

---

## GA4 配置（必做）

### 1. 自定义维度

GA4 → Admin → Custom definitions → Custom dimensions

| Dimension Name | Scope | Event parameter |
|---|---|---|
| Platform Source | Event | utm_source |
| Platform Medium | Event | utm_medium |
| Platform Campaign | Event | utm_campaign |
| Platform Content | Event | utm_content |

### 2. 自定义报告

GA4 → Reports → Acquisition → Traffic acquisition

加 Filter: `Source / medium contains alibaba|mic|europages|thomasnet|tradeindia`

### 3. 转化归因

确保 5 个转化事件（generate_lead 等）能附上 UTM 维度：
- whatsapp_click + utm_source = ?
- email_click + utm_source = ?
- ...

---

## Looker Studio Dashboard（推荐）

在每客户的 Looker dashboard 加 "B2B Platform Sources" 维度：

| Metric | 拆分维度 |
|---|---|
| Sessions | utm_source × utm_campaign |
| Users | utm_source |
| Conversion Rate | utm_source |
| Avg Session Duration | utm_source |
| Goal Completions | utm_source |

→ 一眼看哪个平台 ROI 最高

---

## 月度复盘 SOP

每月 5 号跑：

```
对每客户:
1. GA4 拉过去 30 天 utm_source != "(not set)" 的 sessions
2. 按 utm_source 分组,计算:
   - Sessions 总数
   - 平均会话时长
   - 转化率（generate_lead / sessions）
   - ROI = 转化数 × 平均询盘价值 / 平台投入成本
3. 沉淀 platform-tracking.md:
   | 平台 | Sessions | 转化数 | ROI | 趋势 |
   |---|---|---|---|---|
4. ROI 排序,识别:
   - Top 3 平台 → 加大投入
   - Bottom 平台 → 砍掉或观察
5. bit.ly Analytics 对比:
   - 哪个产品的短链点击量最高 → 该产品对平台用户最有吸引力
   - 哪个钩子（utm_content）转化最好 → 复制到其他平台
```

---

## 常见错误

### ❌ 错误 1：UTM 参数不一致

```
某天用: utm_source=alibaba
另一天用: utm_source=Alibaba
另一天用: utm_source=alibaba.com
```

→ GA4 会拆成 3 个不同来源，数据严重稀释

**规则**：所有 UTM 参数**全小写、连字符分隔**，建一份"UTM Naming Convention"文档定死。

### ❌ 错误 2：utm_medium 不规范

```
某天用: utm_medium=profile
另一天用: utm_medium=Profile-page
另一天用: utm_medium=company-profile
```

**规则**：参考上文表格，固定 7 个值。

### ❌ 错误 3：utm_campaign 用了产品中文名

```
utm_campaign=pva胶水
```

→ URL 编码后看着乱码，影响可读性

**规则**：utm_campaign 用 SKU 或英文 slug。

### ❌ 错误 4：忘了 bit.ly 短链

直接在 Alibaba Description 放 `https://demo-b.com/...?utm_source=...` → 平台识别为"明显外链"，限流。

**规则**：所有外链必走 bit.ly。

---

## 工具栈

| 用途 | 工具 |
|---|---|
| UTM 生成 | https://ga-dev-tools.google/campaign-url-builder/ |
| 短链 | bit.ly Pro ($8/月，可追溯 + 自定义后缀) |
| Analytics | GA4 + Looker Studio |
| 自动归因 | （可选）attribution-analytics skill |

---

*v10.1 第三批 · UTM 追溯体系 · 2026-04-27*

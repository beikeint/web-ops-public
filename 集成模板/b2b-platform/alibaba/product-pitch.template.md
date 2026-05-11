# Alibaba 产品页钩子模板

> 每个 SKU 一份。占位符 `{{...}}` 替换后上传 Alibaba 后台
> 关键：钩子要给"独立站才有的额外价值"（数据/PDF/计算器/案例），不是简单"详情见网站"

---

## Product Title（≤ 128 字符）

```
{{PRODUCT_NAME}} for {{APPLICATION}} — {{KEY_DIFF}} | {{COMPANY_NAME}}
```

例：
```
PVA Glue PE-1400 for Fire Door Bonding — 20-30% Faster Curing | DesaiInd
```

**钩子要点**：
- 主关键词在前
- 应用场景明确（避免笼统）
- 1 个数据锚点（"20-30% Faster" / "MOQ 5 Tons" / "ROI 18 months"）
- 品牌名置后（识别度）

---

## Product Description（突破平台限链规则）

```
🏭 {{PRODUCT_NAME}} - Industrial-Grade {{PRODUCT_CATEGORY}}

📋 Quick Specs:
- Density: {{DENSITY}}
- Cure Time: {{CURE_TIME}}
- Operating Temp: {{TEMP_RANGE}}
- MOQ: {{MOQ}}
- Lead Time: {{LEAD_TIME}}

✅ Why Choose {{PRODUCT_NAME}}:
- {{BENEFIT_1}}
- {{BENEFIT_2}}
- {{BENEFIT_3}}

📥 Full Resource Pack (free download):
- 28-page Technical Datasheet
- {{N_CASE_STUDIES}} Case Studies ({{N_FACTORIES}} factories in {{N_COUNTRIES}} countries)
- Custom Formulation Calculator
- Application Guide (PDF + video)

🔗 Get the resource pack: bit.ly/{{PRODUCT_SHORT_LINK}}
   (Will redirect to our research portal: {{COMPANY_DOMAIN}}/products/{{SLUG}})

⚡ 1-Hour Quote Response: WhatsApp {{WHATSAPP}}
🌍 Shipping to: {{TARGET_COUNTRIES}}
🏆 Certifications: {{CERTIFICATIONS}}

💼 Recent Customers:
- {{CUSTOMER_1}} ({{COUNTRY_1}}, {{INDUSTRY_1}})
- {{CUSTOMER_2}} ({{COUNTRY_2}}, {{INDUSTRY_2}})
- {{CUSTOMER_3}} ({{COUNTRY_3}}, {{INDUSTRY_3}})

🎁 First Order Bonus:
- Free sample (5 kg)
- Application engineer support
- Custom packaging design
```

---

## bit.ly 短链生成

每产品独立 1 个短链，UTM 参数固定：

```
bit.ly/{{PRODUCT_SHORT_LINK}}
   → 跳转到: {{COMPANY_DOMAIN}}/products/{{SLUG}}?utm_source=alibaba&utm_medium=product&utm_campaign={{SKU}}&utm_content=description-link
```

例：
```
bit.ly/demo-b-pe1400-ali
   → demo-b.com/products/pe-1400?utm_source=alibaba&utm_medium=product&utm_campaign=pe-1400&utm_content=description-link
```

**短链命名规范**：
```
bit.ly/<品牌缩写>-<产品ID>-<平台缩写>
```

例：
- `bit.ly/demo-b-pe1400-ali` (Alibaba)
- `bit.ly/demo-b-pe1400-mic` (Made-in-China)
- `bit.ly/demo-b-pe1400-eu`  (EuroPages)

这样 bit.ly Analytics 能直接对比"同一产品在不同平台"的引流效果。

---

## 主图设计（5-10 张）

| 图片 | 内容 | 钩子 |
|---|---|---|
| 主图 | 产品本体 + 高清材质特写 | 右下角 logo |
| 图 2 | 工厂场景 / 生产线 | 突出"自有工厂" |
| 图 3 | 应用场景（在客户工厂用） | 突出"实战" |
| 图 4 | 资质证书拼接 | 突出"合规" |
| 图 5 | 包装 / 标签 / 装箱 | 突出"运输" |
| 图 6 | 数据图表（性能对比） | 突出"数据" |
| 图 7-10 | 客户反馈 / 案例工厂照 | 突出"信任" |

**钩子规则**：
- 每张图右下角加 `{{COMPANY_DOMAIN}}` 水印（小字，不影响视觉）
- 主图 / 图 2 至少含一个肉眼可识别的 brand element
- 不要用 stock photo（B2B 用户秒识别假图）

---

## 视频设计（如有）

30-60 秒短视频：
- 0-5s：产品本体 + 钩子文字"20-30% Faster Curing"
- 5-20s：工厂生产线（快速剪辑）
- 20-40s：应用场景 + 客户使用画面
- 40-55s：资质证书 / 客户 logo 墙
- 55-60s：联系方式 + `{{COMPANY_DOMAIN}}` 水印

**视频末尾必须叠加品牌网址**（间接引流，平台无法限制视觉水印）

---

## 关键词布局（产品页 SEO）

Alibaba 站内 SEO 跟 Google SEO 类似但权重略不同：

| 位置 | 主关键词出现 |
|---|---|
| Product Title | ✅ 1 次（前置） |
| Description 首段 | ✅ 1 次 |
| Description H2/Section | ✅ 2-3 次自然出现 |
| Image alt | ✅ 含主关键词 |
| 产品分类 / 标签 | ✅ 主关键词 + 同义词 |

**Alibaba 内部 SEO 工具**：
- 后台 "Keyword Tools" 看竞争度
- 选 KD < 60 的长尾词作为副关键词

---

## 上传后 7 天验证

- [ ] 产品页可访问 + 主图正常
- [ ] bit.ly 短链点击量 > 0
- [ ] GA4 看到 `utm_source=alibaba` referral
- [ ] 平台后台看到 product view ≥ 10
- [ ] 至少 1 个询盘消息（如有）

---

## 替换 checklist

```bash
grep -c "{{" product-pitch.template.md
# 应该返回 0
```

---

*v10.1 第三批 · Alibaba 产品页钩子模板 · 2026-04-27*

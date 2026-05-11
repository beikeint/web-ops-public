# EN Title 模板批量压缩 — 提升 CTR

> **类型**：成功模式
> **客户来源**：client-B (demo-c.com)
> **沉淀时间**：2026-04-27
> **可复用度**：⭐⭐⭐⭐（全站产品页有统一 Title 模板的客户都适用）

---

## 背景

demo-c 4-20 跑 P5 CTR 引擎，发现 fast-cycling 产品页：位 6.4 / 16 展示 / **CTR 0%**。

问题诊断：EN 产品页 Title 模板后缀过长（38 字符），SERP 显示时被截断，关键卖点没被用户看到。

```
原 Title 模板：
"[Product Name] | [Spec Detail] - China EPS Manufacturer | China EPS Machinery"
                                                          ^^^^^^^^^^^^^^^^^^^
                                                          38 字符冗余后缀

压缩后模板：
"[Product Name] | [Spec Detail] | ChinaEPS"
                                  ^^^^^^^^^
                                  12 字符品牌后缀
```

**关键改进**：删除冗余的"China EPS Manufacturer | China EPS Machinery"重复表述。

## 数据证明

- **影响范围**：全站 40+ 产品页统一受益（一次改动全站生效）
- **fast-cycling 单页**：进一步加"20-30% Faster Cycles, MOQ 5 Tons"数据锚点到 names.en
- **7 天复盘窗口**：2026-04-27（待复盘）
- **预期**：单站 avg CTR 1.2% → 3%（30 天目标）

---

## 操作步骤（SOP）

### 1. 用 P5 CTR 引擎扫机会页
```bash
node scripts/ctr-opportunities.mjs
```
输出"潜力分数 = 展示 × (期望CTR - 当前CTR)"排序的机会页清单。

### 2. 找 Title 模板冗余
通用问题：
- ❌ 重复品牌词（"X Manufacturer | X Machinery"）
- ❌ 没必要的"|"分隔符堆砌
- ❌ 没数据锚点（"20-30% Faster" / "MOQ 5 Tons" / "ROI 18 months" 这种）
- ❌ 通用宣传词（"World-Class" / "Leading"）

### 3. 改 Title 模板（site.config.ts 或 i18n 文件）
压缩到 ≤ 60 字符：
- `[产品名] | [核心规格 / 数据锚点] | [简洁品牌名]`

### 4. 高价值单页 Title 单独优化
对 P5 引擎输出的 Top 5 机会页：
- Title 加具体数据（不靠模板）
- 含"数字 + 单位"格式（被 AI 引用率更高）

### 5. 记 docs/ctr-log.md
```markdown
| 改动日期 | URL | 改前 Title | 改后 Title | 改前 CTR | 改后 CTR (7 天) | 结论 |
|---|---|---|---|---|---|---|
| 4-20 | /en/products/fast-cycling | ... | ... | 0% | 待 4-27 | - |
```

### 6. 部署 + IndexNow + GSC URL Inspection 重抓

### 7. 7 天后回查 CTR
- 提升 ≥ 1pt 的策略 → 进"有效模式库"
- 提升 < 1pt 的 → 分析原因（关键词意图错配？SERP 还有更强竞争？）

---

## 适用条件

✅ **强适用**：
- 全站有统一 Title 模板（多数现代站都有，site.config.ts 控制）
- GSC 数据 ≥ 30 天（有足够 baseline）
- 至少 5 个产品页 / 内容页（小站效果不明显）

⚠️ **谨慎适用**：
- 站点流量很低（<100 sessions/月，CTR 改动数据噪音大）

---

## 不适用情况

❌ 单页静态站（一个 Title 改了就改了，没有"模板压缩"概念）

---

## 关联模式

- 关联 skill [ctr-optimization](../../.claude/skills/ctr-optimization.md)（P5 CTR 优化引擎）
- 关联工具 `scripts/ctr-opportunities.mjs`（机会页扫描）
- 关联 `docs/ctr-log.md`（改动记录 + 复盘）

---

## 验证清单（7 天后）

- [ ] CTR 提升 ≥ 1pt（绝对值）
- [ ] 无负面副作用（避免改太狠 Title 不再含主关键词）
- [ ] 排名稳定（没有因为 Title 改动导致排名下滑）
- [ ] 改动记录已写进 ctr-log.md

---

*成功模式 #2 · 沉淀自 client-B demo-c 4-20 实战 · 待 4-27 复盘验证*

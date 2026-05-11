---
name: cross-client-pattern-application
description: 跨客户经验自动应用机制 — 一个客户的成功模式自动推荐到其他客户。基于模式库 + 行业蓝图 + 共享 RAG。让第 100 个客户享受前 99 个客户的全部经验，零踩坑。
---

# 跨客户经验自动应用 v1.0

> **建立时间**：2026-04-27（v10.1 第六批 · 学习进化）
> **核心目标**：经验是**资产**，不是知识。第 100 个客户接入时**自动应用**前 99 个的全部经验
> **配套依赖**：[模式库/](../../模式库/)（v10.1 batch 1）+ [shared-rag-knowledge](shared-rag-knowledge.md)（v10.1 batch 5）

---

## 一、4 大触发场景 + 自动应用

### 场景 1: 新客户接入时（onboarding）

```
/接入客户 命令触发
       │
       ↓
1. 客户填行业 + 主要市场 + 业务模型 (v10.1 batch 1 已设计)
       │
       ↓
2. 自动加载对应行业蓝图
   - 例: B2B 工业化工 → 模式库/行业蓝图/B2B工业化工.md
   - 90 天上手计划 + 11 大基础设施清单 + 5 个坑预警
       │
       ↓
3. 扫描所有失败教训库
   - 对每个失败教训跑"是否适用本客户":
     - 旧 WP sitemap 残留 → WordPress 迁移客户必跑
     - Yandex meta tag 丢失 → 多语言 + 俄语市场客户必跑
     - ...
   - 适用的失败教训 → 加进客户首批 audit 检查清单
       │
       ↓
4. 推荐 Top 3 适用成功模式
   - 例: B2B 工业化工 + 多语言扩展计划 → 推荐"多语种沙盒期+延伸效应"
   - 例: 全站 Title 模板 → 推荐"EN-Title-模板压缩-提升 CTR"
   - 客户首批 30 天上手计划自动应用这些模式
       │
       ↓
5. 30 天后回看模式应用效果 → 沉淀进客户档案
```

### 场景 2: 巡检中发现已知问题

```
daily-cron 巡检发现某问题 (如 GSC 展示骤降)
       │
       ↓
1. 检索 模式库/失败教训/ 看是否有同类历史
   - 关键词匹配 (问题描述 / 影响 / 症状)
   - 语义检索 (用 RAG vector store)
       │
       ↓
2. 如找到匹配:
   - 自动应用对应失败教训库的修复 SOP
   - 简报标"已识别为 [失败教训 X]，按 SOP 自动修复"
   - 推企微通知运营人员/客户员工
       │
       ↓
3. 修复后验证:
   - 7 天后看是否真修复
   - 如修复成功 → 失败教训"成功复用次数 +1"
   - 如修复失败 → 失败教训需要更新 (现有 SOP 不全)
```

### 场景 3: 月度 review

```
每月 28 号 monthly-report 跑
       │
       ↓
1. 拉客户当月所有成果 + 失败
2. 对成果识别"这是哪个成功模式起作用"
   - 多语种部署生效 → 多语种沙盒期+延伸效应模式
   - CTR 突然提升 → EN-Title-模板压缩模式
   - ...
3. 对失败识别"这是哪个失败教训提醒过的"
   - 如失败 = 之前已警告但未防 → 客户档案降权 + 跨客户警告强化
4. 沉淀新成功 / 新失败到 模式库 (累积)
```

### 场景 4: 跨客户模式发现

```
跨客户模式发现 (季度跑一次)
       │
       ↓
1. 拉所有客户 90 天数据
2. 找跨客户共同成功模式:
   - 哪些动作在多个客户上都生效?
   - 例: "周三发博客 + 周一推 LinkedIn" 在 3 客户都效果好
       │
       ↓
3. 提取为新跨客户模式
   - 写入 模式库/成功模式/<新模式>.md
   - 标 "首次发现日期" + "在哪几个客户验证过"
       │
       ↓
4. 推荐应用到所有客户
   - 通过下次 monthly-report 提醒
   - 客户接受 → 加进自动化流程
```

---

## 二、模式匹配算法

### 输入

- 当前情况 / 当前客户特征
- 模式库内所有成功模式 + 失败教训 + 行业蓝图

### 算法（3 层）

```python
# Layer 1: 元数据筛选 (快)
def filter_by_metadata(client, patterns):
    return [p for p in patterns 
            if p.industry_match(client.industry) 
            and p.business_model_match(client.business_model)
            and p.market_match(client.markets)]

# Layer 2: 语义检索 (中)
def semantic_search(query, patterns_filtered):
    # 用 RAG vector store
    embeddings = embed(query)
    results = rag.query(
        collection='patterns',
        query_embedding=embeddings,
        top_k=10
    )
    return results

# Layer 3: LLM 综合判断 (慢但准)
def llm_judge_applicability(client, pattern):
    prompt = f"""
    客户特征: {client}
    候选模式: {pattern}
    
    判断:
    1. 这个模式对这个客户适用吗? (yes/no/maybe)
    2. 适用度评分 (1-10)
    3. 适用条件 + 不适用风险
    4. 推荐应用顺序 (P0/P1/P2)
    """
    return llm.generate(prompt)
```

---

## 三、模式生命周期管理

每个模式自动跟踪：

| 状态 | 含义 | 触发动作 |
|---|---|---|
| `proposed` | 首次沉淀，单客户验证 | 试用 30 天 |
| `validated` | 2+ 客户验证生效 | 推荐到所有适用客户 |
| `production` | 5+ 客户验证 + 90 天数据 | 加进默认 onboarding 自动应用 |
| `deprecated` | 不再适用（如算法变化） | 标记历史，不再推荐 |

### 跟踪字段

每模式 frontmatter 加：

```yaml
---
name: 多语种沙盒期+延伸效应
type: 成功模式
status: validated  # proposed / validated / production / deprecated
applicable_clients: [client-D, client-B]  # 已验证生效
success_rate: 100%  # 应用后 90 天达成预期效果的比例
last_applied: 2026-04-22
last_validated: 2026-04-25
auto_apply_to:
  - 行业: B2B工业制造
  - 业务: 多语言出海
  - 阶段: 第 30-60 天
---
```

---

## 四、daily-cron 集成

每周一 daily-cron 加跑：

```javascript
【本日加跑（每周一）· v10.1 batch 6 · cross-client-pattern-application】跨客户模式应用复盘:
- 检查 模式库/成功模式/ 中所有 status=validated 的模式
- 对每个客户:
  - 哪些 validated 模式应用了? 当前生效中?
  - 哪些 validated 模式未应用? 是否适用?
- 输出"模式应用机会"清单 (跨客户)
- 简报"模式建议"段
```

每月 1 号月度复盘：

```javascript
- 拉所有客户当月成果 / 失败
- 自动归因到对应模式
- 模式生命周期状态更新:
  - proposed → validated (如新增 1 客户验证)
  - validated → production (如累计 5 客户验证 90 天)
- 输出"模式库本月动态"段
```

每季度跨客户挖矿：

```javascript
if (month === 1 || month === 4 || month === 7 || month === 10) {
  // 季度首月跑跨客户模式发现
  - 拉所有客户 90 天数据
  - 跨客户找共同成功动作
  - 提取为候选新模式
  - 人工审 → 加进 模式库
}
```

---

## 五、客户档案档位（按经验复用度）

每客户在 client-manager 加字段：

```json
{
  "client_id": "client-D",
  "applied_patterns": [
    {"pattern": "多语种沙盒期+延伸效应", "applied_at": "2026-04-22", "result": "+2360% 展示量", "validated": true},
    {"pattern": "EN-Title-模板压缩", "applied_at": null, "result": null, "validated": null}
  ],
  "warned_pitfalls": [
    {"pitfall": "旧WP-sitemap-未清", "warned_at": "2026-04-15 onboarding", "triggered": false},
    {"pitfall": "Yandex-meta-tag-丢失", "warned_at": "2026-04-15 onboarding", "triggered": false}
  ],
  "next_recommended_patterns": [
    {"pattern": "EN-Title-模板压缩", "reason": "全站 40+ 产品页 Title 后缀重复 'China EPS'"},
    {"pattern": "blog-to-youtube", "reason": "已有 8 篇博客但 0 视频"}
  ]
}
```

---

## 六、跨客户经验数字化

| 指标 | 含义 |
|---|---|
| **模式覆盖率** | 客户已应用 validated 模式数 / 总适用 validated 模式数 |
| **失败教训预警率** | 客户接入时被警告的相关 pitfall 数 / 总相关 pitfall |
| **模式生效率** | 应用模式后 90 天达成预期的比例 |
| **跨客户模式数** | 模式库中 status ≥ validated 的模式总数 |

### 30 天目标
- 模式覆盖率 ≥ 50% (客户接入时自动应用所有 validated 模式)
- 失败教训预警率 = 100% (所有适用 pitfall 都被警告)

### 90 天
- 至少 3 个 proposed 模式升级到 validated
- 至少 1 个 validated 升级到 production

### 180 天
- 模式库 ≥ 30 条 (含成功 + 失败 + 行业蓝图)
- 跨客户模式生效率 ≥ 70%

---

## 七、与已有 skill 的协同

| 协作场景 | 协作 skill |
|---|---|
| 新客户接入应用模式 | /接入客户 命令 (v10.1 batch 1) |
| 模式库读写 | shared-rag-knowledge (collection: patterns) |
| 成交后沉淀新成功模式 | case-study-pipeline (v10.1 batch 6) |
| 失败应用失败教训 | hotfix skill (调失败教训 SOP) |
| 月报附模式应用情况 | monthly-report (v10.1 batch 1+5) |
| 季度战略 review | quarterly-review (v10.1 batch 6) |

---

## 八、风险 + 注意

### 风险 1：模式过时

**应对**：每模式有 `last_validated` 字段，180 天未验证 → 标 stale，需重新验证

### 风险 2：错误推广

**应对**：模式必须 ≥ 2 客户验证才进 validated，≥ 5 客户才进 production

### 风险 3：客户特殊性导致模式无效

**应对**：每模式有"不适用情况"段，匹配时跳过

---

## 九、产品级愿景

180 天后实现：

```
新客户接入 (v10.1 batch 1 /接入客户 命令)
       │
       ↓
自动加载行业蓝图 + 失败教训预警 + 推荐 Top 3 成功模式
       │
       ↓
30 天上手计划 = 90% 来自跨客户经验
       │
       ↓
新客户走过的路 = 前 99 个客户走过的最优路径
       │
       ↓
踩坑率从 50% (新客户必踩) → 5% (零基础前提下)
```

**这是产品级智能体跟普通运营公司最大区别**。

---

*v10.1 第六批 · 跨客户经验自动应用 · 2026-04-27 · 经验 = 资产复利*

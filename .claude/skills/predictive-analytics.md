---
name: predictive-analytics
description: 预测能力 — 流量/转化/ROI/排名 6-12 月预测。从"回顾型"智能体升级到"预测型"，月报附预测段让客户看到未来。顶级 agency 跟普通 agency 最大差距之一。
---

# 预测能力 v1.0

> **建立时间**：2026-04-27（v10.1 第五批 · 产品级基础设施）
> **核心问题**：当前 web-ops 是**回顾型**（看上周展示 X / 排名 Y），客户看不到未来
> **产品级目标**：升级到**预测型**，月报附"按当前节奏 6 个月后预计..."

---

## 一、5 大预测维度

### 1. **流量预测**（GSC + GA4）

**输入**：
- 过去 90-180 天 GSC 展示/点击趋势
- 内容产出节奏（content-tracker）
- 竞品强度（competitor-radar）
- 季节性（去年同期）

**算法**：
- 简化版：线性回归 + 季节性调整
- 进阶版：ARIMA / Prophet（Facebook 开源）

**输出**：
```
{
  "client": "demo-b",
  "metric": "GSC_impressions",
  "current_30d": 4200,
  "predicted_90d": 9800,    // ↑ 233%
  "predicted_180d": 15000,  // ↑ 357%
  "confidence": 0.78,        // 置信度
  "key_drivers": ["内容产出节奏 +50% / 多语种延伸效应 / 季节性"],
  "risks": ["如算法更新可能 ±20%"]
}
```

### 2. **转化预测**（GA4 + 历史 funnel）

**输入**：
- 过去 90 天转化漏斗（流量 → 询盘 → 报价 → 成交）
- 各阶段转化率
- 流量预测

**输出**：
```
{
  "current_30d_inquiries": 12,
  "predicted_90d_inquiries": 45,
  "predicted_180d_inquiries": 95,
  "predicted_yearly_revenue": "$420K-$680K",
  "key_factors": ["询盘 → 成交转化 18%", "客单价 $5K-$8K"]
}
```

### 3. **排名预测**（GSC + 内容质量）

**输入**：
- 关键词当前排名 + 历史趋势
- 内容质量评分（content-production 12 阶段评分）
- 竞品强度（DR / 内容深度）

**输出**：
```
{
  "keyword": "PVA glue manufacturer",
  "current_rank": 23,
  "predicted_30d": 18,       // ↑ 5
  "predicted_90d": 12,       // ↑ 11
  "predicted_180d": 8,       // ↑ 15
  "key_factors": ["新博客覆盖该词 + 反向内链 +5 / 多语种延伸 +3"],
  "blockers": ["竞品 X 排名第 5 强，需要 3 倍内容深度才能超过"]
}
```

### 4. **ROI 预测**（投入产出表）

**输入**：
- 月人力投入（小时）+ 工具成本
- 预测询盘 + 平均询盘价值

**输出**：
```
{
  "monthly_cost": "$X (人力) + $Y (工具)",
  "predicted_monthly_revenue_attributed_to_seo": "$Z",
  "roi_pct": "300% in 6 months",
  "payback_months": 3,
  "best_invested_in": ["content-refresh ROI 最高,加大投入", "Lead Magnet ROI 第二"]
}
```

### 5. **风险预测**（基于 risk-monitor）

**输入**：
- 算法更新历史频率
- 客户行业 SERP 波动
- 竞品威胁

**输出**：
```
{
  "next_30d_risks": [
    {"type": "core_update", "probability": 0.45, "expected_impact": "±15% 流量"},
    {"type": "new_competitor", "probability": 0.20, "expected_impact": "排名 ↓3-5 位"},
  ],
  "mitigation_recommended": ["...", "..."]
}
```

---

## 二、技术实现（分阶段）

### Phase 1（v10.1 batch 5 · 当前）：简化版

每月 28 号 daily-cron 跑 `monthly-report`，附简化预测：

```python
# 简化算法（线性外推 + 季节性调整）
def predict_traffic(client_id, days_ahead):
    # 拉过去 180 天 GSC 数据
    gsc_data = search_analytics.gsc_search_performance(site=client.domain, days=180)
    
    # 计算近 30 天月增长率
    last_30d_avg = mean(gsc_data[-30:])
    prev_30d_avg = mean(gsc_data[-60:-30])
    monthly_growth_rate = (last_30d_avg - prev_30d_avg) / prev_30d_avg
    
    # 季节性调整 (用去年同期对比)
    last_year_same_period = gsc_data[-365-30:-365] if len(gsc_data) > 365 else None
    seasonal_factor = 1.0 if not last_year_same_period else (last_30d_avg / mean(last_year_same_period))
    
    # 线性外推
    predicted = last_30d_avg * (1 + monthly_growth_rate) ** (days_ahead / 30) * seasonal_factor
    
    # 置信度（基于数据稳定性）
    confidence = 1.0 - std(gsc_data[-30:]) / mean(gsc_data[-30:])
    
    return {
        "predicted": predicted,
        "confidence": confidence,
        "method": "linear-extrapolation-with-seasonality"
    }
```

### Phase 2（v10.2）：Prophet 模型

升级到 Facebook Prophet（处理趋势 + 季节性 + 节假日）：

```python
from prophet import Prophet

def predict_traffic_prophet(client_id, days_ahead):
    df = pd.DataFrame({
        'ds': dates,
        'y': impressions
    })
    model = Prophet(yearly_seasonality=True, weekly_seasonality=True)
    model.fit(df)
    future = model.make_future_dataframe(periods=days_ahead)
    forecast = model.predict(future)
    return forecast
```

### Phase 3（v11+）：多智能体协同 + ML

- 用 RAG 拿"客户对话/询盘/竞品" 喂给 LLM
- LLM 综合判断 + 给定性预测
- 累积 1-2 年数据后训练专属模型

---

## 三、月报附预测段（产品级核心）

每月 28 号生成月报时，附上预测段：

```markdown
## 📊 [客户] · 2026-04 月报

### 本月成绩（回顾）
- GSC 展示: 4200 (vs 3500 上月, ↑ 20%)
- 询盘: 12 条
- 排名: 平均 14.3 (vs 16.8 上月)

### 🔮 未来预测（按当前节奏）

| 指标 | 当前 30 天 | 预测 90 天 | 预测 180 天 | 置信度 |
|---|---|---|---|---|
| GSC 展示 | 4200 | **9800** (↑233%) | **15000** (↑357%) | 78% |
| 询盘数 | 12 | **45** | **95** | 72% |
| 平均排名 | 14.3 | **9.5** | **6.8** | 65% |

### 🎯 关键驱动 (为什么会这样预测)
1. 4-22 多语种部署延伸效应继续 (FR/ES/PT 已生效, AR/RU 5 月生效)
2. 内容产出节奏 +50% (3 月 4 篇 → 4 月 6 篇)
3. P5 CTR 引擎刚跑, 7 天后 CTR 提升预计 +1.5pp

### ⚠️ 风险 (可能让预测偏低)
1. Google 5 月可能有 Core Update (历史频率每季度 1 次)
2. 竞品 X 上线 → 关键词分流可能 -10%

### 💰 ROI 预测
- 当前月投入: $1500 (人力 + 工具)
- 预计 90 天后月营收 (SEO 归因): $15K-$25K
- ROI: 1000-1666% in 90 days
```

---

## 四、验证机制（关键）

每月 28 号生成预测后，**3 个月后必须验证**：

```
2026-04-28 预测: 4-28→7-28 90 天 GSC 展示 9800
2026-07-28 验证: 实际 GSC 展示 ?
   - 准确度 = 1 - |实际 - 预测| / 预测
   - 如准确度 > 80%: 算法验证通过
   - 如准确度 < 50%: 算法需调整
```

每季度做"预测准确度回归"：
- 沉淀进 [模式库/](../../模式库/)
- 调整算法参数
- 累积"什么客户什么阶段预测准确度高"

---

## 五、daily-cron 集成

每月 28 号月报草稿 cron 已存在（v10.1 batch 1），**升级**让它含预测段：

```javascript
if (dom === 28) {
  weeklyTasks += `

【本日加跑（每月 28 号）· v10.1 batch 1+5 · monthly-report + predictive-analytics】月报草稿生成 + 预测段:
- 每个客户跑 monthly-report skill 全流程 (回顾段)
- 跑 predictive-analytics skill (预测段):
  - GSC 展示 30/90/180 天预测
  - 询盘数预测
  - 平均排名预测
  - ROI 预测
  - 风险预测
- 月报附预测段 (产品级差异化: 让客户看到未来)
- 详见 skill: .claude/skills/predictive-analytics.md`;
}
```

---

## 六、客户教育

在月报里加"如何看预测"中文说明：

```
预测 ≠ 承诺。基于:
- 您当前的运营节奏 (内容产出 / 投入)
- 您行业的历史规律
- 算法/竞品风险因子

置信度 70-80% = 大概率会发生
置信度 < 60% = 不确定大,实际可能偏离

如果您想加大投入 (更多内容/更多 Lead Magnet/更多 A/B), 
预测会调整为更激进的曲线。
反之,如果想稳健,预测会更保守。
```

---

## 七、效果指标

### 30 天（batch 5 后）
- 简化版预测算法跑通
- 至少 1 个客户月报附预测段

### 90 天
- 3 客户月报全部附预测段
- 第一波预测验证（4-28 预测的 90 天后看实际）

### 180 天
- 预测准确度 ≥ 70%（行业平均水平）
- Prophet 模型升级完成

### 360 天
- 预测准确度 ≥ 80%（顶级水平）
- 跨客户经验累积（哪些行业/阶段预测最准）

---

## 八、跨技能协作

| 数据来源 | 用途 |
|---|---|
| search-analytics MCP（GSC/GA4） | 流量预测 + 排名预测 |
| analytics-api skill | 转化漏斗历史 |
| competitor-radar | 竞品强度评估 |
| risk-monitor skill | 风险预测 |
| content-tracker | 内容产出节奏 |
| 模式库 | 行业 baseline 数据 |

---

## 九、限制 + 注意

### 不要做的事

- ❌ 不要给客户**承诺**预测（用"预计"/"按当前节奏"等语气）
- ❌ 不要做太长期预测（>1 年置信度极低）
- ❌ 不要忽略风险（必须附风险段）

### 法律注意

- 跨境客户：避免给"投资回报"承诺（可能涉及证券法）
- 中国大陆客户：避免"流量保证"（违反广告法）

---

*v10.1 第五批 · 预测能力 · 2026-04-27 · 让客户看到未来,而不只是过去*

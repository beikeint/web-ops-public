---
name: digital-pr-haro
description: HARO/Qwoted/Featured Digital PR 工作流 — 客户 expertise pack 模板 + 草稿生成器 + 提交跟踪
---

# Digital PR / HARO 技能 (v10.2 batch7, 2026-04-27 立)

## 起源

Link Building / Digital PR 能力域起点 10/100, 顶级目标 35/100. 4-27 实际仅 18/100. 最大阻塞: HARO 平台账号. 但能先做"等账号后立刻能用"的基础设施.

## 工具

`scripts/haro-draft-generator.mjs` — 输入征集主题 + 客户, 输出草稿模板 + 客户 expertise pack 数据点

```bash
node scripts/haro-draft-generator.mjs \
  --client demo-c \
  --query "Looking for B2B EPS experts to comment on China sourcing risks 2026"
```

输出: 草稿框架 (3 段, 150-250 词) + 客户专属数据点 + Quotable 信号 + 反 AI 味道清单

## 客户 expertise pack 模板

每客户在 `客户/<X>/website/docs/expertise-pack.md` 维护:

```markdown
# <客户名> Expertise Pack — Digital PR 引用素材库

## 公司基本信息
- 公司名: ...
- 建厂年份: ...
- 工厂面积/产能/员工数: ...
- 主要市场 / 海外份额: ...
- 认证 (ISO/SGS/CE 等): ...

## 核心数据点 (用于 Quote)

- **数据点 1: [指标名]**: [具体数字 + 单位 + 时间范围] (例: "EPS 块成型机蒸汽消耗 30-50 kg/吨, 2026 Q1 数据")
- **数据点 2: ...**:
- **数据点 3: ...**:
- **数据点 4: ...**:
- **数据点 5: ...**:

## 客户独有视角 (反直觉断言)

- 视角 1: ... (例: "EPS 价格比 EPP 低 50% 但能耗只有 EPP 30%, 这是为什么大批量包装首选 EPS 而非 EPP")
- 视角 2: ...

## 实证案例 (可署名引用)

- 案例 1: [客户名 / 项目 / 结果数据]
- 案例 2: ...

## 专家署名

- 姓名: [客户专家中文/英文名]
- 职位: [总经理 / 技术总监 / 创始人 等]
- LinkedIn: [URL]
- 公司 URL: [客户站 URL]

## 已成功案例 (有效模板库)

| 日期 | 平台 | 征集主题 | 媒体 | 是否被采用 | 草稿 hash |
|---|---|---|---|---|---|
| | | | | | |

## 失败教训 (沉淀)

| 日期 | 主题 | 未被采用原因 | 改进 |
|---|---|---|---|
| | | | |
```

## 工作流 (账号注册后)

```
1. 早上收 HARO/Qwoted/Featured 邮件 (30-50 条征集)
2. 按客户行业关键词过滤 (demo-c: EPS/EPP/foam/packaging machinery
                       demo-b: adhesive/glue/PVA/epoxy/wood/fire-rated
                       demo-a: refrigerator/cold chain/PU foam/insulation
                       hearingprotect: earplug/hearing protection/PPE/EN 352)
3. 每条匹配的征集 → 跑 haro-draft-generator.mjs --client X --query "..."
4. 草稿审 (智能体或运营人员)
5. 平台提交 (注意截止时间, 大多 24h 内)
6. 登记 expertise-pack.md "已成功案例" 段
7. 30 天后回查发表情况 (Google "site:reporterdomain 客户名")
```

## 4 客户 expertise pack 状态 (4-27)

- demo-c: ❌ 待创建 (建议: EPS Industry Alliance 数据 / 工厂 50-1000 吨/月 / 出口 50+ 国 / ISO 9001)
- demo-b: ❌ 待创建 (建议: PVA glue 价格 ¥X-Y/吨 / 防火胶认证 UL10C/EN 1634-1 / 工厂 ...)
- demo-a: ❌ 待创建 (建议: K-factor 数据 / 冷链产线 ... / 13 solutions)
- hearingprotect: ❌ 待创建 (建议: EN 352-1/2 认证 / 30-35 dB SNR / 出口 ... 国)

## 阻塞 + 解决路径

| 阻塞项 | 解决方式 | 谁做 |
|---|---|---|
| HARO 平台账号 | 注册 connectively.us | 运营人员 |
| Qwoted 账号 | 注册 qwoted.com | 运营人员 |
| Featured 账号 | 注册 featured.com | 运营人员 |
| 邮件订阅 + 解析 | 加邮件 webhook | 智能体 (账号到位后) |
| 客户 expertise pack | 各客户专家 1h 填空 | 运营人员协调客户 |

## 反例

- ❌ Quote 含 "It's important to note that..." 套话 (AI 味重, 记者识别后丢)
- ❌ Quote 没具体数字 (用 "significant" 替 "30-50%") — 不可引用
- ❌ Quote 没客户独有视角 (跟其他 50 个专家答一样, 媒体不挑)
- ❌ 提交后不跟踪 (失败原因不沉淀, 下次重蹈覆辙)
- ❌ 抢截止时间提交但 quote 质量差 (单次失败但损害 expert credit)

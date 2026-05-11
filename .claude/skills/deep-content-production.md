---
name: deep-content-production
description: Path C 90+ 顶级深度博客生产 — 12+6 阶段 (vs base 12 阶段). 每客户每月 ≥ 1 篇. 必须基于 client-data-collection 资源包启动. 评分 ≥ 90 才发布. 这是行业前 1% 内容质量 (Brian Dean / Eli Schwartz 级).
---

# deep-content-production — Path C 90+ 顶级深度博客生产

## v11.0+1 (2026-05-07 立) Path C 战略产物

**核心区别**（vs base content-production v10.6）：

| 维度 | base v10.6 | deep v11.0+1 |
|---|---|---|
| 节奏 | 每周 ≥ 1 篇 | **每月 ≥ 1 篇 / 客户** |
| 字数 | ~1500 字 | **2500-5000 字** |
| 阶段数 | 12 | **18**（+6 深度阶段）|
| 评分线 | 75-85 | **≥ 90** |
| 启动条件 | 自动 | **必须有 client-data-collection 资源包** |
| 第一手数据 | 0 | **≥ 5 个** |
| 真案例 | 0 | **≥ 1 个**（具体名字+数字）|
| 内部专家 quote | 0 | **≥ 1 个**（真名 + LinkedIn）|
| 原创配图 | 0（占位）| **≥ 3 张**（工厂实拍 / 产品对比 / 流程图）|
| 多模态 | 0 | **≥ 1**（视频 / 信息图 / 互动工具）|
| 翻译 | 部分 | **6 语种 100% + 文化适配** |

## 触发条件（硬阻塞）

- **必须有当月 client-data-collection 资源包**（参考 [client-data-collection skill](client-data-collection.md)）
- 资源包路径：`客户/<客户>/website/docs/path-c-resources/YYYY-MM/`
- 4 类资源任一缺失 → **直接 abort**，不允许凑数启动

## 18 阶段流程（base 12 阶段 + 6 深度阶段，按 ⭐ 标深度新增）

### 调研层（阶段 0.5 / 1-4）

**阶段 0.5 ⭐ 资源包验证**（新加，硬门）
- 检查 `path-c-resources/{当前月}/` 4 类资源全在
- 缺任一类 → abort + 推 P0 给运营人员"客户 X 本月深度博客资源不齐"

阶段 1：搜索意图分析（同 base）
阶段 2：SERP 前 5 名深度拆解（同 base）
阶段 3：关键词矩阵（同 base + 加 long-tail 决策意图词）
阶段 4：架构设计 ⏸️ 需确认（同 base + 含资源包嵌入计划）

### 创作层（阶段 5-8 + 深度阶段）

阶段 5：英文撰写（同 base，但字数升级 2500-5000 字）

**阶段 5.5 ⭐ 第一手数据嵌入**
- 每 300 字至少 1 个具体数字（来自资源包"运营数据"）
- 数字必须有来源标注：「实测自客户 5000 次抽样」/「来自 EN 204 D3 测试」
- 用 `<strong>` 标记关键数字

**阶段 6.5 ⭐ 真实客户案例叙事**
- 在博客 30-50% 位置插入"Real-world case"段
- 必含：具体客户名（可匿名"中东某 X 厂"）+ 国家 + 行业 + 应用 + 收益数字 + 客户反馈 quote
- ≥ 200 字 / 1 张配图（工厂实拍 / 产品图）

阶段 6：SEO 植入（同 base + 加 ImageObject Schema）

**阶段 7.5 ⭐ 内部专家 quote 嵌入**
- 在博客 60-80% 位置插入专家 quote 段
- 形式：`<blockquote>{真专家 30-50 字 quote}</blockquote><cite>— {真名}, {职位}, <a href="{LinkedIn URL}">LinkedIn</a></cite>`
- 同步 Article Schema author 字段为 Person + sameAs LinkedIn

阶段 7：GEO 植入（同 base + 加权威外链 ≥ 5 / 含 1 个学术 doi.org）
阶段 8：转化植入（同 base + 加 lead magnet 链接到 ROI calculator / case study PDF）

### 多模态层（新加）

**阶段 8.5 ⭐ 多模态资产生成**
- 必含 ≥ 1 个：
  - 视频（YouTube embed 或 SVG 动画）
  - 信息图（Canva / 自制 SVG 比对图）
  - 互动工具（计算器 / 配置器）
- Schema 加 VideoObject 或 ImageObject

**阶段 8.8 ⭐ 原创配图植入**
- 资源包"视觉资产"中的 ≥ 3 张图嵌入
- 每张配图必含 alt（描述性，30-80 字符）+ width/height + loading="lazy" + srcset 多分辨率

### 质控层（阶段 9 升级）

**阶段 9 ⭐ 90+ 评分**（vs base 80）
- 基础分（vs base 80）：
  - 答案胶囊 / 数据密度 / 表格 / FAQ / 内链 / 3 级 CTA / Schema / 多语种 = 60 分
- 深度分（90+ 必加）：
  - 第一手数据 ≥ 5：+10 分
  - 真客户案例 ≥ 1（具体名+数字）：+10 分
  - 内部专家 quote + LinkedIn：+8 分
  - 原创配图 ≥ 3：+7 分
  - 多模态 ≥ 1：+5 分
- **< 90 必须重写**（不降标准）

### 翻译层（阶段 10 升级）

**阶段 10 ⭐ 6 语种 100% + 文化适配**
- 不只翻译，要本地化（如阿拉伯语博客中"中东某 EPS 厂"案例要换成"沙特某 EPS 厂"）
- 度量衡换算（英尺 / 米 / 加仑 / 升）
- 货币换算（USD / EUR / SAR / RUB）
- 不同语种 hreflang 完整

### 发布层（阶段 11-12 + 11.5）

阶段 11：发布部署（同 base + 必跑 pre-deploy-quality-check.sh 6/6 通过 + qa-no-placeholder.sh + build-qa.sh）

**阶段 11.5 ⭐ 客户老板 review（不只 SEO 渠道）**
- 发布前生成"博客预览 PDF"给客户老板
- 标"这是 90+ 顶级深度博客（行业前 1%）" + 引用资源（你的数据 / 你的案例 / 你的员工 quote）
- 客户老板审一遍后才上线（让他"拥有"这篇内容，主动转发给行业人脉）

阶段 12：发布后追踪（同 base + 月度 ROI 回报：本篇带来询盘数 / 关键词排名 / Backlinks 数 / 业务结果）

## 评分卡（≥ 90 才发布）

| 维度 | 满分 | 90+ 阈值 |
|---|---|---|
| 答案胶囊（首段 40-60 词回答）| 5 | ≥ 4 |
| 数据密度（每 150-200 词 1 个数据）| 10 | ≥ 8 |
| 表格 ≥ 3 个 | 5 | ≥ 4 |
| FAQ ≥ 5 个真问题 + Schema | 10 | ≥ 8 |
| 内链 ≥ 8 | 5 | ≥ 4 |
| 3 级 CTA | 5 | ≥ 4 |
| Article + Person + FAQPage + ImageObject + VideoObject Schema | 10 | ≥ 9 |
| 多语种 100% + 文化适配 | 10 | ≥ 9 |
| 第一手数据 ≥ 5 个 | 10 | ≥ 9 |
| 真客户案例 ≥ 1 个（具体名+数字）| 10 | ≥ 9 |
| 内部专家 quote + LinkedIn | 8 | ≥ 7 |
| 原创配图 ≥ 3 张 | 7 | ≥ 6 |
| 多模态 ≥ 1 个 | 5 | ≥ 4 |
| **总分** | **100** | **≥ 90** |

**< 90 = 必须重写或回退到 base content-production**（降级，不能凑数发深度博客）。

## MCP 调用链

```
Step 0.5: 资源包验证
        → fs.exists 检查 4 类资源
        → 缺 → spawn 通知运营人员 + abort

Step 1-4: 同 base content-production 调研

Step 5-8: 创作 + 深度阶段（5.5 / 6.5 / 7.5）

Step 8.5-8.8: 多模态 + 原创配图

Step 9: 90+ 评分（< 90 重写）

Step 10: 6 语种翻译 + 文化适配 (Sonnet)

Step 11: 发布部署 (pre-deploy-quality-check.sh)

Step 11.5: 客户老板 PDF 审 (生成预览 + 通知运营人员)

Step 12: 发布后追踪 (Day 7/14/30)
```

## 模型分层

- 阶段 0.5 / 1-9 / 11-12: **Opus**（深度推理 + 复杂判断）
- 阶段 10 翻译: Sonnet（翻译质量足够）
- 阶段 8.5 多模态: Opus + image-generator MCP

## 与现有机制的关系

- **替代** content-production 在月度深度博客场景的角色（base 仍跑每周基础博客）
- **触发** weekly-blog-trigger.mjs 改造（v11.0+1 加每月 1 号 11:00 cron 跑深度博客 — `monthly-deep-blog-cron`）
- **依赖** client-data-collection 资源包（无资源不启动）
- **驱动** ceiling-targets v1.3 deepContentMonthly 维度（每客户每月 ≥ 1 篇 90+ 必达）

## 触发指令

- `[客户名] 启动月度深度博客`
- `/深度博客 <客户ID>` （新增 slash 命令）
- 自动：每月 1 号 11:00 北京 `monthly-deep-blog-cron` 自动跑（前提：当月资源包已就位）

## 反元规则

- **不为"完成 KPI"凑数**：客户没给资源就跳月，不降标准
- **不在评分上手软**：< 90 不发，宁可延期
- **不混用 base + deep**：基础博客是基础博客（每周），深度博客是深度博客（每月），不要"加点深度元素假装深度"

## 输出最终落到客户老板手上

每篇深度博客发布后必须：
1. PDF 预览（含完整内容 + 数据来源 + 客户案例 + 专家 quote）发给客户老板
2. 标注"这是行业前 1% 内容"+ 鼓励客户老板转发到 LinkedIn / 微信群 / 行业群
3. 月度 ROI 回报跟踪（询盘数 / 排名 / Backlinks）一并附上

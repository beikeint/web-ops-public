---
name: hermes-via-wecom
description: 通过企业微信跟"赫尔墨斯"对话查询客户站状态/跑 SEO 体检/生成报告。Hermes Agent 是企微长连接 bot，服务对象是运营人员/客户员工的内部场景（不嵌入客户 web 站，那是 chat-widget 的事）。
---

# Hermes Agent 真用法 · 企微内部对话

> **建立时间**：2026-04-27（v10.1 第二批校准）
> **背景**：v10 路线图原计划"Hermes 接客户站 Live Chat"，2026-04-27 调研后发现 Hermes 是**企微长连接 bot**不适合 web，定位需校准。
> **真定位**：Hermes 是**对内**工具（运营人员/客户员工通过企微查站况），不是**对外**工具（网站访客 Live Chat）

---

## Hermes Agent 现状回顾

- **部署目录**：`${USER_HOME}/hermes-stack/`（Docker 化 + 独立 git 仓库）
- **入口**：企业微信，bot 名"赫尔墨斯"，user id `BK00001`
- **LLM**：ChatGPT Plus via Codex OAuth → gpt-5.3-codex（零 API 费）
- **能力**：3 个自研 MCP 共 25 工具（content-tracker / seo-checker / site-monitor）
- **响应时间**：DM 平均 11.8s 返回回复

---

## 真用法（对内工具）

### 场景 1：运营人员出差时查站况

```
运营人员：@赫尔墨斯 demo-b 今天怎么样
赫尔墨斯：✅ 200 OK / 1.27s / SSL 86 天 / GSC 7天 89 imp 1 click ...
       (调用 site-monitor + search-analytics MCP)
```

### 场景 2：客户员工自查 SEO

```
客户员工 (在企微给"赫尔墨斯" DM)：
       demo-c 上周博客有没有索引

赫尔墨斯：调 search-analytics MCP gsc_index_status
       → 返回索引状态报告
```

### 场景 3：内容创作辅助

```
运营人员：@赫尔墨斯 demo-b pva-glue 选题给我 3 个
赫尔墨斯：调 content-tracker + topic-pool 数据
       → 返回 Top 3 选题候选
```

### 场景 4：紧急排查

```
运营人员：@赫尔墨斯 demo-c 是不是挂了
赫尔墨斯：调 site-monitor.check_site
       → 返回当前可用性 + SSL + 响应时间
```

---

## 跟 chat-widget 的分工

| 维度 | chat-widget（Crisp/Tawk） | Hermes（企微） |
|---|---|---|
| 服务对象 | 客户网站访客（潜在买家） | 运营人员 + 客户员工（内部团队） |
| 入口 | 客户站右下角弹窗 | 企业微信 DM |
| 目的 | 转化访客 → 询盘 | 查站况 / 跑工具 / 创作辅助 |
| 数据敏感度 | 公开 | 内部 |
| 集成 | GA4 事件 + inquiry webhook | 25 个 MCP 工具 |

**互不冲突**，分工清晰。

---

## 给客户员工的"赫尔墨斯使用指南"（可写进客户欢迎包）

> 如果你的公司接入了赫尔墨斯（Hermes Agent），可以在企业微信跟它对话查询自己网站的状态。
> 
> **常用命令**：
> - "今天 [域名] 怎么样" → 拉当日巡检
> - "[域名] 上周排名" → 拉排名变化
> - "[域名] GSC 异常" → 拉报错
> - "[域名] 内容产出" → 拉本月博客数
> 
> **注意**：赫尔墨斯只读不写（不会自己改你的网站），所有动作要通过运营人员 / web-ops 智能体执行。

---

## 监控 + 维护

- **每月 1 号**：health-check.sh 维度 ⑭ 自动扫 Hermes 容器存活 + Codex auth 有效 + 25 MCP 工具
- **手动检查**：`docker exec hermes-agent hermes doctor`
- **重启**：`cd ${USER_HOME}/hermes-stack && docker compose restart`

---

## 不做的事（明确边界）

- ❌ 不嵌入客户 web 站（那是 chat-widget 的事）
- ❌ 不直接修改客户站代码（要用 web-ops/site-builder 智能体）
- ❌ 不发邮件（要用 inquiry 智能体的 email MCP）
- ❌ 不发社媒帖（要用 social-ops 智能体）

Hermes 是"内部知识助手 + 工具集合"，不是"全能助手"。

---

## v10.1 校准记录

**之前 v10 路线图说**："Hermes Agent → 客户站 Live Chat（最高 ROI，转化率 3-5x）"

**校准结论**：
- Hermes 不适合做 web Live Chat（架构不匹配）
- 真天花板 Live Chat 用 Crisp/Tawk.to（专业 web chat 工具）
- Hermes 的真价值是**内部对话 + 工具集合**，继续保留作为对内资产

详见 [chat-widget 集成模板](../../集成模板/chat-widget/INSTALL.md) 选择对外 chat 方案。

---

*v10.1 第二批 · Hermes 真用法记录 · 资产价值保留 · 定位明确*

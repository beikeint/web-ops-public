# Chat Widget 集成指南

> **来源**：web-ops v10.1 第二批集成模板
> **目的**：给客户站加 Live Chat（提升转化率 3-5x，Drift 2024 研究）
> **支持后端**：Crisp（推荐，免费 2 seats）/ Tawk.to（完全免费带 logo）/ Custom

---

## 一、为什么要装 Chat Widget

| 场景 | 数据 |
|---|---|
| 跨境时差问题 | 客户晚上访问，老板已睡 → AI / 排班 24h 在线 |
| 转化率 | Live Chat 比 Form 高 3-5 倍（Drift 2024） |
| 询盘速度 | 1 小时内回复 vs 24 小时 → 转化 +7 倍（HBR） |
| Form 流失挽回 | 看到 Form 但没填 → Chat 弹窗主动问 |

---

## 二、Provider 选择

### Crisp（强烈推荐 B2B/B2C 客户站）

- ✅ 永久免费 2 seats
- ✅ 含 mobile / 桌面 SDK
- ✅ 支持 chatbot scripted flow
- ✅ Slack / Email / WhatsApp 集成
- ⚠️ 中等用量后要付费（$25+/月）

### Tawk.to（极致免费）

- ✅ 完全免费、无 seats 限制
- ✅ 多语言支持
- ⚠️ 默认带 Tawk.to logo（去 logo $19/月）
- ⚠️ UI 不如 Crisp 现代

### Custom（高级用户）

- 自己接 Intercom / Zendesk / 自研 chatbot
- 用 `customScript` 字段填入 SDK 代码

### Hermes Agent ❌ 不适合 web

- Hermes 是企微长连接 bot
- 服务对象是**运营人员/客户员工**（通过企微跟"赫尔墨斯"对话查站况），**不是网站访客**
- 不嵌入客户 web 站
- 详见 [hermes-via-wecom skill](../../.claude/skills/hermes-via-wecom.md)（待建）

---

## 三、安装步骤

### Step 1: 客户注册账号 + 拿凭证

#### Crisp
1. 访问 https://crisp.chat 注册
2. 创建 Workspace
3. Settings → Workspace → Setup instructions → 复制 `CRISP_WEBSITE_ID`

#### Tawk.to
1. 访问 https://tawk.to 注册
2. Add Property → 填客户站 URL
3. Get Code → 复制 `propertyId` 和 `widgetId`

### Step 2: 复制组件到客户站

```bash
cp ${WORKSPACE_ROOT}/智能体/运营/网站运营-web-ops/集成模板/chat-widget/ChatWidget.astro \
   ${WORKSPACE_ROOT}/客户/<客户>/website/src/components/interactive/ChatWidget.astro
```

### Step 3: 改 BaseLayout.astro

在 `客户/<客户>/website/src/layouts/BaseLayout.astro` 加：

```astro
---
import ChatWidget from '../components/interactive/ChatWidget.astro';
// ... 其他 import
---

<!-- 在 </body> 前 -->
{config.features.chatWidget && <ChatWidget />}
```

### Step 4: 改 site.config.ts

```typescript
features: {
  // ... 其他 features
  chatWidget: true,  // 开启
},

chatWidget: {
  provider: 'crisp',  // 'crisp' | 'tawk' | 'custom'
  crispWebsiteId: 'YOUR_CRISP_WEBSITE_ID',  // 从 Crisp 控制台拿
  // 或 tawkPropertyId + tawkWidgetId
  primaryColor: '#0066ff',
  greeting: 'Hi! Need help with our products?',  // 仅文档说明，实际 greeting 在 Crisp/Tawk 控制台配
  businessHours: '09:00-18:00 GMT+8',
},
```

### Step 5: 构建 + 部署

```bash
npm run build
deployer.deploy(<客户>)
```

### Step 6: 验证

```bash
# 抓首页源码看 Crisp/Tawk 脚本是否注入
curl -s https://<客户域名>/en/ | grep -E "client.crisp.chat|embed.tawk.to"
```

应该 ≥ 1 行匹配。

实地测试：
- 打开客户站 → 右下角应出现 chat 按钮
- 点击 → 应能发送消息
- GA4 Realtime 应看到 `chat_session_started` 事件

---

## 四、第一周配置建议（Crisp）

### Day 1: 基础配置
- [ ] Workspace logo + 颜色（匹配客户站品牌色）
- [ ] Welcome message（基于客户行业写）
- [ ] Auto-greeting trigger（访客停留 30 秒后弹）
- [ ] Operator hours（客户员工排班）

### Day 2: AI Chatbot 配置（Crisp Pro $25/月，但 ROI 高）
- [ ] FAQ 上传（基于客户站常见问题）
- [ ] Lead capture form（必填邮箱+公司）
- [ ] 触发词（如询问"price" / "MOQ" → 引导填 form）

### Day 3-7: 优化
- [ ] 看 heatmap 哪页 chat 最活跃
- [ ] 调 trigger 时机
- [ ] 写 quick replies（员工常用回答模板）

---

## 五、与 inquiry 智能体的集成

Chat 中收集到的邮箱 / 询盘 → **自动 webhook 到 inquiry 智能体**：

### Crisp Webhook
1. Crisp 控制台 → Settings → Webhooks → Add
2. URL: `<inquiry-webhook-endpoint>`（待 inquiry 启动 webhook 服务时填）
3. Events: `message:send` / `session:loaded`

### Tawk.to Webhook
1. Tawk.to 控制台 → Administration → Webhooks
2. 同上配置

收到 webhook 后 inquiry 智能体走 web-ops-integration.md 流程：
- lead-capture 提取邮箱
- email-nurture 7 天序列启动

---

## 六、注意事项

- **不要**把 `crispWebsiteId` 提交到 git（虽然是公开 ID 但建议 .env）
- **检查** 客户站 Privacy Policy 是否提到 Chat（GDPR / CCPA 合规）
- **多语言**：Crisp 自动按浏览器语言显示；Tawk.to 需手工配
- **移动端测试** 必跑（QA 必检 14 项移动端导航 + Chat 按钮位置不冲突）

---

## 七、效果预期

- 安装后 7 天：chat session ≥ 5 / 客户站 / 周
- 30 天：chat → email 转化率 ≥ 30%
- 90 天：通过 chat 拿到的询盘占总询盘 ≥ 20%

---

*v10.1 第二批 · chat-widget 通用集成模板 · 2026-04-27 立*

# Email MCP（Resend）+ Microsoft Clarity CRO 激活操作包

> 两件事都是免费工具，合计 5-10 分钟完成。  
> 做完后告诉智能体"email 已配"/"Clarity 已配"，智能体立即接入跑通。

---

## 任务 A：激活 Resend Email MCP（询盘跟进 + 月报邮件）

**价值**：
- 客户询盘表单提交后自动发感谢邮件 + 48h 跟进邮件
- 运营月报从"手动发微信"升级到"邮件自动发送给客户"
- 博客订阅保温触达
- 免费 100 封/天 / 3000 封/月

### 5 步操作

1. **注册 Resend 账号**  
   https://resend.com/signup → 用 contact@example.com 直接登录即可

2. **添加发信域名**  
   首选用 example.com（你自己的品牌域名）或 demo-b.com 之一  
   → Dashboard → Domains → Add Domain → 输入域名  
   → 复制 DNS 记录（SPF / DKIM / MX 3 条 TXT）  
   → 到域名 DNS 面板（阿里云/腾讯云/Cloudflare）添加这 3 条记录  
   → 等 5-15 分钟 Resend 自动验证通过

3. **拿 API Key**  
   → Dashboard → API Keys → Create API Key → 起名"example-ops-agent"  
   → 权限选 **Full Access**（发件+读收件+管理 Audience）  
   → 复制 `re_XXXXXXXXXXXX` 开头的 key（只显示一次，立即保存）

4. **替换本地 MCP 配置**  
   告诉智能体："resend key 是 re_XXXXXX"，我会帮你改 `${USER_HOME}/.mcp.json` 的 `RESEND_API_KEY` 字段（或你自己改）

5. **重启 Claude Code**  
   改完 MCP 配置必须重启才生效。重启后告诉智能体"已配"。

### 我接下来会自动做

- 验证 email MCP 连通（list-domains 应返回你刚加的域名）
- 创建 3 个基础模板：询盘跟进 / 月报 / 博客通知
- 给 demo-c 和 demo-b 做询盘表单→自动回复的对接（Web3Forms → Resend）
- 试发一封测试邮件到 info@demo-c.com 确认全链路通

---

## 任务 B：激活 Microsoft Clarity（落地页 heatmap + session replay）

**价值**：
- 免费**无限**使用（微软出品，比 Hotjar 每月 $39 省下来）
- 看用户点击热力图 / 滑动深度 / 死点（rage click）/ session replay 视频
- 直接发现"为什么有流量没询盘"——用户在哪走了
- 无 GDPR 风险（微软自带合规）

### 3 步操作

1. **注册 Clarity 账号**  
   https://clarity.microsoft.com → Sign in with Microsoft（用你现有微软账号或注册一个）

2. **给每个客户站创建 Project**  
   → New Project → 输入站点名（如 "Demo-C / demo-c.com"）→ 创建  
   → 对 demo-c / demo-a / demo-b 三个站各创建一个 Project  
   → 每个 Project 会给一串 **Project ID**（10 位字母数字，如 `k3x9m2p7qr`）

3. **把 3 个 Project ID 告诉智能体**  
   直接发："demo-c clarity = XXX / demo-a clarity = YYY / demo-b clarity = ZZZ"

### 我接下来会自动做

- 给每个站的 `site.config.ts` 加 `clarityId` 字段
- `BaseLayout.astro` 加条件渲染 Clarity 追踪脚本（空值时不输出）
- 构建 + 部署 + 线上验证脚本加载成功
- 第一周观察数据，下周一用 Clarity 数据驱动 CRO 优化动作（替代当前靠 GA4 盲猜）

---

## 总时间

- 任务 A：5 分钟（多数时间等 DNS 生效）
- 任务 B：3 分钟
- **合计不超过 10 分钟**

做完给我一句"两个都好了 + key 和 ID"，后续所有接入我全部自动完成。

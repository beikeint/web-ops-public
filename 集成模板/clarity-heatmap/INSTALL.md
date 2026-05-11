# Microsoft Clarity Heatmap 集成

> **作用**：免费 heatmap + session replay + scroll depth + dead click 监控
> **价格**：完全免费（无 session 限制，无 retention 限制）
> **替代品**：Hotjar（free 35 sessions/月）/ FullStory（付费）→ Clarity 是 2026 性价比最高方案

---

## 一、为什么选 Microsoft Clarity

| 维度 | Microsoft Clarity | Hotjar Free | FullStory |
|---|---|---|---|
| 价格 | **永久免费** | Free 35 sessions/月 | $300+/月起 |
| Heatmap | ✅ 无限 | ✅ 35/月 | ✅ |
| Session replay | ✅ 无限 | ✅ 35/月 | ✅ |
| Scroll depth | ✅ | ✅ | ✅ |
| Dead click | ✅ | ✅ | ✅ |
| Rage click | ✅ | ✅ | ✅ |
| GDPR | ✅ Microsoft 合规 | ✅ | ✅ |
| GA4 集成 | ✅ 原生 | ⚠️ 手工 | ✅ |
| AI insights | ✅（2025-12 推出） | ❌ | ✅ |

**结论**：Clarity 是顶级 SEO/CRO 工具栈标配。

---

## 二、安装步骤（5 分钟）

### Step 1: 客户注册 Clarity 账号

1. 访问 https://clarity.microsoft.com
2. 用 Microsoft 账号登录（或 Google / Facebook）
3. Add new project
4. 输入客户站 URL + 时区
5. 拿到 `Project ID`（10 位字符串）

### Step 2: 复制 tracking 代码到客户站

#### 方法 A: 手动加（首批客户）

在客户站 BaseLayout.astro 的 `<head>` 加：

```html
<!-- Microsoft Clarity -->
{config.features.clarityHeatmap && config.clarity?.projectId && (
  <script is:inline define:vars={{ clarityId: config.clarity.projectId }}>
    (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", clarityId);
  </script>
)}
```

#### 方法 B: 自动注入（推荐 v10.5+ 产品级）

加到 astro-b2b-starter 模板 BaseLayout 默认带，site.config.ts 一行配置即开启：

```typescript
// site.config.ts
features: {
  clarityHeatmap: true,
},
clarity: {
  projectId: 'YOUR_CLARITY_PROJECT_ID',
}
```

### Step 3: 部署 + 验证

```bash
npm run build && deployer.deploy(<客户>)

# 验证
curl -s https://<客户域名>/en/ | grep "clarity.ms" | head
```

### Step 4: 在 Clarity 后台 30 分钟后看到数据

- Dashboards → Heatmaps（点击/移动/scroll）
- Recordings → Session replays
- Insights → Dead clicks / Rage clicks / Excessive scrolling

---

## 三、GA4 集成（自动归因）

Clarity 控制台 → Settings → Setup → "Connect to Google Analytics"

授权后：
- Clarity 数据自动 push 到 GA4 自定义事件
- GA4 → Realtime 看 `clarity_session_recording` 事件

---

## 四、第一周配置 SOP

### Day 1: 基础配置
- [ ] Clarity 账号注册 + 加客户站 project
- [ ] tracking 代码部署 + 验证
- [ ] 等待 24h 拿到首批数据

### Day 2-3: 看 Top 5 页面 heatmap
- [ ] 首页（最多流量）
- [ ] Top 3 产品页
- [ ] 询盘页 / Contact 页
- [ ] 找：哪里点击最多 / 哪里 dead click / 哪里 rage click

### Day 4-7: 看 Session Replay
- [ ] 看 5-10 个完整 session（特别是访问 ≥ 60 秒的）
- [ ] 找：访客在哪卡住 / 哪里不知道下一步 / 哪里离开
- [ ] 沉淀进客户 docs/cro-findings.md

---

## 五、关键 insight 类型 + 对应 SOP

### Dead Click（看似可点但不响应）

**典型问题**：
- 图片没设 cursor:pointer 但用户以为可点
- 按钮 z-index 被遮挡
- JS 没绑定事件就让按钮显示

**SOP**：
- 截图给开发者
- 加进 hotfix queue（P1 优先级）

### Rage Click（连续点 ≥ 3 次同一位置）

**典型问题**：
- 加载慢（> 3 秒响应）
- 表单提交按钮失败但无反馈
- 链接坏了

**SOP**：
- 立即 hotfix（用户已经怒气）

### Excessive Scrolling（滚到底找东西）

**典型问题**：
- 关键信息（价格 / CTA）藏在底部
- 没有目录 / TOC
- 段落过长

**SOP**：
- 重排页面，关键信息上提
- 加 TOC（B2B 长文必备）

### Quick-Back（30 秒内 back）

**典型问题**：
- 页面跟搜索词不匹配
- 加载慢
- 内容质量差

**SOP**：
- 看是哪个搜索词来的（GSC 配合）
- 改 page-type 或换关键词
- 用 seo-sxo skill 排查 page-type 错配

---

## 六、跟 cro-suite skill 协同

每月 5 号 daily-cron 跑：
1. 拉 Clarity 数据 30 天
2. Top 5 dead click 页面
3. Top 5 rage click 页面
4. 平均 scroll depth < 50% 的页面
5. 输出 cro-suite 行动清单
6. 写入客户 docs/heatmap-findings-<月>.md

---

## 七、隐私 + 合规

Clarity 默认含：
- IP 匿名化（GDPR 合规）
- Mask 敏感字段（密码 / 信用卡）
- Opt-out cookie 支持

**需要做**：
- 客户 Privacy Policy 加"我们使用 Microsoft Clarity 改进体验"
- 如客户在欧洲，加 cookie consent banner（一般已有）

---

## 八、效果指标

### 30 天后
- Heatmap 数据 ≥ 1000 sessions / 客户
- 至少识别 5 个 friction 点
- 至少修复 2 个 dead click / rage click

### 90 天后
- 转化率提升 ≥ 5-15%（来自 friction 修复）
- 跳出率下降 ≥ 5pp

---

*v10.1 第四批 · Microsoft Clarity Heatmap 集成 · 2026-04-27*

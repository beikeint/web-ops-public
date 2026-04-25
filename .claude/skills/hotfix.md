---
name: hotfix
description: 紧急修复技能 — 当天发现当天修复：404页面、robots.txt误屏蔽、索引问题、Schema错误、重定向链、noindex误标、deployer部署失败（7个场景）
---

# 紧急修复技能

> 触发指令：`[客户名] 修复 [问题类型]` / 由 daily-ops 或 weekly-check 自动建议触发  
> 执行时机：发现问题后立即执行  
> 人工确认：代码修改后需确认部署，纯配置修改自动执行

---

## 修复流程总览

```
发现问题 → 定位原因 → 制定修复方案 → 执行修复 → 构建验证 → 部署 → 回验
```

**核心原则**：
- 每个修复都要验证，不盲修
- 修复后必须重新检测确认问题消失
- 所有修复记录到 client-manager.add_timeline
- 批量同类问题一次性修复，不逐个处理

---

## 修复场景清单

### 场景1：404页面修复

**诊断**：
```
→ fetch(域名/sitemap.xml) 或 fetch(域名/sitemap-index.xml)
→ 提取所有URL
→ 逐批检查哪些返回404（用 site-monitor.check_site 或 fetch 验证）
```

**修复策略**（按优先级选择）：

| 情况 | 修复方式 |
|------|---------|
| 页面被误删 | 恢复页面内容 |
| URL已改但旧链接在外部存在 | 设置301重定向（nginx/astro配置） |
| 页面已永久不需要 | 返回410 + 从sitemap移除 |
| 语言版本缺失（如/es/路径404） | 补充对应语言页面或重定向到/en/版本 |

**Astro项目的301重定向**：
```javascript
// astro.config.mjs → redirects配置
redirects: {
  '/old-path': '/new-path',
  '/old-blog/[slug]': '/en/blog/[slug]',
}
```

**验证**：修复后 fetch 每个原404 URL，确认返回200或301。

---

### 场景2：robots.txt 误屏蔽

**诊断**：
```
→ fetch(域名/robots.txt)
→ 分析 Disallow 规则
→ 与实际页面结构对照，找出被误屏蔽的正常页面
```

**常见误屏蔽**：
- `Disallow: /en/` — 屏蔽了整个英文站
- `Disallow: /wp-admin/` — WordPress残留，Astro站不需要
- `Disallow: /*?` — 屏蔽了所有带参数的URL
- `Disallow: /api/` — 可能屏蔽了有效的API路径

**修复**：
```
→ 读取项目中的 robots.txt 或 public/robots.txt
→ 删除错误的 Disallow 规则
→ 确保 Sitemap 指向正确
→ 构建 + 部署
```

**验证**：fetch(域名/robots.txt) 确认修改生效。

---

### 场景3：索引问题修复

**「已发现-尚未编入索引」**：
- Google知道URL但还没来抓 → 提交sitemap + 确认页面可访问
- 检查是否有noindex标签误标

**「已抓取-尚未编入索引」**：
- Google看了但觉得不值得收录 → 页面内容太薄/重复
- 修复：补充内容深度（至少500词有价值内容）
- 检查是否与其他页面内容重复 → 设置canonical

**「重复网页」**：
- 同一内容多个URL → 设置canonical标签
- 多语言版本未正确配置hreflang → 检查并修复hreflang标签
- www和非www、http和https未统一 → 设置301重定向

**「网页会自动重定向」**：
- 重定向链过长（A→B→C） → 改为A→C直达
- 语言重定向逻辑问题 → 检查中间件/路由配置

**修复后**：重新构建sitemap，提交到GSC。

---

### 场景4：Schema结构化数据修复

**诊断**：
```
→ seo-checker.check_structured_data(域名)
→ 检查缺失的Schema类型
```

**必须有的Schema**：

| 页面类型 | 必须的Schema |
|---------|-------------|
| 首页 | Organization + LocalBusiness |
| 产品页 | Product + BreadcrumbList |
| 博客页 | Article + FAQPage + BreadcrumbList |
| 联系页 | Organization + ContactPoint |
| 关于页 | Organization + AboutPage |

**修复**：在对应页面组件中添加JSON-LD Script标签。

**验证**：seo-checker.check_structured_data(域名) 确认Schema数量增加。

---

### 场景5：Meta标签修复

**常见问题**：
- 缺失title → 每个页面必须有唯一title
- 缺失description → 每个页面必须有meta description
- title/description过长或过短 → title≤60字符，description≤155字符
- 缺失og:title/og:description → 影响社交分享
- 缺失viewport → 影响移动端渲染
- 缺失lang属性 → 影响语言识别

**修复**：在页面模板或Layout组件中补充缺失标签。

---

### 场景6：重定向问题

**诊断**：
```
→ site-monitor.check_site(域名) 查看是否有重定向
→ fetch(域名) 检查重定向链
```

**修复策略**：
- 多级重定向（A→B→C）→ 改为A→C
- HTTP→HTTPS重定向未配置 → nginx/Cloudflare设置
- 根域名→语言版本重定向正确但SEO工具检测到 → 确认最终页面SEO正常即可，根域名重定向页无需优化
- 混合内容（HTTPS页面中有HTTP资源） → 改为相对路径或HTTPS

### 场景7：deployer部署失败（v9.2新增）

**诊断**：
```
→ deployer.deploy(client_id) 返回 "Permission denied" 或其他错误
→ 检查 client-manager 中的 server 配置（ssh_password/ssh_key/server_port）
→ 手动测试SSH连接：sshpass -p '密码' ssh -p 端口 用户@IP "echo OK"
```

**修复策略**：
- Permission denied → 密码/key错误 → 更新 client-manager 中的 server.ssh_password
- MCP代码bug → 检查 deployer/index.mjs 变量作用域 → 修复后需重启Claude Code使MCP加载新代码
- SSH连接超时 → 检查端口/防火墙 → 确认 server_port 正确
- **应急部署**（MCP不可用时）：
  ```bash
  sshpass -p '密码' rsync -avz --delete -e "ssh -p 端口 -o StrictHostKeyChecking=no" "项目/dist/" 用户@IP:web_root/
  ```
- 部署后必须 fetch 验证线上页面更新

---

## 批量修复流程

当同类问题影响多个页面时（如19个404）：

```
Step 1: 导出完整问题列表
        → 收集所有同类问题URL

Step 2: 分类处理
        → 可批量修复的（如统一添加redirects配置）→ 一次性修复
        → 需逐个处理的（如内容补充）→ 按优先级排序

Step 3: 执行修复
        → 优先修复高流量页面
        → 批量操作用脚本或配置文件

Step 4: 统一验证
        → 构建 → 部署 → 逐个验证修复结果

Step 5: 记录
        → 保存到 客户-XX/优化/YYYY-MM-DD_紧急修复记录.md
        → client-manager.add_timeline(id, "紧急修复: [修复X个404/修复robots.txt/...]")
```

---

## 修复记录格式

```
# [客户名] 紧急修复记录 — YYYY-MM-DD

## 问题来源
- 发现方式：每日巡检 / 周检查 / GSC报告 / 手动触发
- 发现时间：YYYY-MM-DD HH:MM

## 修复清单

| # | 问题 | URL | 修复方式 | 验证结果 |
|---|------|-----|---------|---------|
| 1 | 404 | /old/page | 301→/new/page | ✅ 200 |
| 2 | robots屏蔽 | /en/products | 移除Disallow | ✅ 可抓取 |

## 部署信息
- 构建：✅ 通过
- 部署：✅ 完成
- 回验：✅ 所有修复确认生效

## 影响评估
- 预计恢复时间：Google重新抓取通常1-7天
- 建议后续关注：[具体事项]
```

# bit.ly 短链 SOP

> **作用**：跨 B2B 平台的短链管理 + 反向引流追溯
> **预算**：bit.ly Pro $8/月 / 客户（可自定义后缀 + Analytics）

---

## 命名规范（强制）

```
bit.ly/<品牌缩写>-<产品ID或主题>-<平台缩写>
```

**示例**：

| 用途 | 短链 |
|---|---|
| demo-b 公司主页 | `bit.ly/demo-b-brand-ali` |
| demo-b PE-1400 在 Alibaba | `bit.ly/demo-b-pe1400-ali` |
| demo-b PE-1400 在 MIC | `bit.ly/demo-b-pe1400-mic` |
| demo-b PVA-glue 在 EuroPages | `bit.ly/demo-b-pvaglue-eu` |
| demo-b 工厂参观视频 | `bit.ly/demo-b-tour-ali` |
| demo-b 资源包 PDF | `bit.ly/demo-b-resources-ali` |

**规则**：
- 全小写
- 连字符（不要下划线）
- 平台缩写：`ali` / `mic` / `eu` / `tn` / `ti` / `im`（IndiaMART）
- 长度 ≤ 25 字符（bit.ly 后缀限制）

---

## 生成流程

### 手动版（首批客户）

1. 登录 bit.ly Pro
2. Create New
3. 输入完整 URL（含 UTM）
4. 自定义后缀（按上述命名规范）
5. 复制短链 → 用到平台 Description

### 半自动版（中批）

用 [bit.ly API](https://dev.bitly.com/) Python 脚本批量生成：

```python
# 伪代码
import requests

def create_shortlink(long_url, custom_back_half):
    headers = {'Authorization': f'Bearer {BITLY_TOKEN}'}
    data = {
        'long_url': long_url,
        'domain': 'bit.ly',
        'custom_bitlinks': [f'bit.ly/{custom_back_half}']
    }
    r = requests.post('https://api-ssl.bitly.com/v4/bitlinks', json=data, headers=headers)
    return r.json()
```

每客户站可写脚本 `scripts/bitly-batch.mjs`，根据产品列表批量生成跨平台短链。

### 全自动版（产品级）

新增 `mcp-servers/bitly-mcp/` 自研 MCP（v10.x+）：
- 工具：`create_shortlink` / `list_shortlinks` / `get_analytics`
- 集成进 b2b-platform-presence skill

---

## 数据追溯

### bit.ly 后台 Analytics

每条短链可看：
- 总点击量
- 按时间分布
- 按地理位置分布
- Referrer（哪个平台来的）

### GA4 双重验证

短链点击 → 跳转独立站 → GA4 记录 utm_source

理论上 bit.ly 点击量应**等于** GA4 中该 utm_source 的 sessions（误差 ±10%）。

如果差距 > 30% → 排查：
- bit.ly 链接是否被平台限流（短链有时被识别为 spam）
- GA4 跨域追踪是否正常
- UTM 参数是否被剥离

---

## 月度数据复盘 SOP

每月 5 号：

```
对每客户:
1. bit.ly Analytics → Export 30 天数据 csv
2. 分析:
   - 每个短链点击量
   - 总点击量分布（哪个产品 / 哪个平台 / 哪个钩子最强）
   - 点击趋势（上升 / 平稳 / 下降）
3. 沉淀进 客户/<X>/website/docs/b2b-platform/platform-tracking.md
4. 跟 GA4 数据交叉验证(差距 > 30% → 排查)
5. ROI 计算:
   - Top 短链 ROI 排序
   - 前 5 个短链贡献 ≥ 70% 点击 → 集中加大这些
   - 后面短链贡献 < 5% → 砍掉或换钩子
```

---

## 风险

### 1. bit.ly 被平台识别为 spam（罕见但可能）

某些极端情况 Alibaba/MIC 算法会把 bit.ly 短链标记为 "外部链接"。

**应对**：
- 备用域名：`tinyurl.com` / `t.ly`
- 或自建短链服务（如 YOURLS 开源 self-host，~$5/月 VPS）

### 2. 短链被滥用

如果 bit.ly 后缀简单（如 `bit.ly/test`），可能被恶意利用。

**应对**：
- 后缀含品牌名（`bit.ly/demo-b-xxx`）
- 监控异常点击（地理 / 时间）

---

## 工具栈

| 用途 | 工具 | 价格 |
|---|---|---|
| 标准短链 | bit.ly Pro | $8-29/月 |
| 自建短链 | YOURLS（开源） | ~$5/月 VPS |
| 自动化 | bit.ly API | 免费（Pro 账户） |

---

*v10.1 第三批 · bit.ly 短链 SOP · 2026-04-27*

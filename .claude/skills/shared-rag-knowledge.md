---
name: shared-rag-knowledge
description: 多智能体共享认知层 — 每客户独立 vector store，Hermes/inquiry/web-ops 共享读写客户对话/询盘/数据。从"信息断流"升级到"知识共享",让选题准确度从 60% → 90%。产品级智能体核心差异化。
---

# 共享 RAG 认知层 v1.0

> **建立时间**：2026-04-27（v10.1 第五批 · 产品级基础设施）
> **解决的核心问题**：3 大智能体（Hermes/inquiry/web-ops）各自有客户认知，**信息断流，重复劳动**
> **产品级差异化**：普通运营公司每月人工开"客户洞察会议"，我们自动化跨智能体认知统一

---

## 一、当前问题诊断

### 信息断流的实际场景

**Hermes Agent**（企微长连接）：
- 知道"今天有 3 个访客问 PVA glue 的耐温性"
- 但 **inquiry 不知道**

**inquiry 智能体**（5 分钟回复 + nurturing）：
- 处理 1 周询盘，知道"75% 询盘问 MOQ"
- 但 **web-ops 不知道**

**web-ops 智能体**（每天选题写博客）：
- 写下个月 "PVA Glue Buyer's Guide"
- **不知道**前两者的发现，重复研究"客户最关心啥"

→ 三个智能体各自有 70% 客户认知，**全部加起来 ≠ 90%（因为 30% 重叠 + 10% 互相不知道）**

### 产品级解决方案

**每客户配独立 RAG（Vector Store + Knowledge Graph）**：

```
              ┌─────────────────────────┐
              │  共享 Vector Store       │
              │  per client              │
              │  (Chroma/Weaviate/...)   │
              └────────────┬────────────┘
                           │
       ┌───────────────────┼───────────────────┐
       │                   │                   │
       ↓                   ↓                   ↓
  Hermes Agent      inquiry 智能体        web-ops 智能体
  (写入对话)         (写入询盘)          (读取 → 选题)
       │                   │                   │
       ↓                   ↓                   ↓
  访客对话上下文    询盘要点 + 对话历史   "本周客户最关心 PVA 耐温性,
                                          下周博客优先写"
```

---

## 二、技术方案选型

### Vector Store 选型对比

| 方案 | 适合 | 价格 | 自托管 | 成熟度 |
|---|---|---|---|---|
| **Chroma**（开源） | 中小客户（<100K docs） | 免费 | ✅ Python/Node | ⭐⭐⭐⭐⭐ |
| **Weaviate**（开源） | 大客户（>100K docs） | 免费/Cloud $25+/月 | ✅ | ⭐⭐⭐⭐⭐ |
| **Qdrant**（开源） | 性能优先 | 免费/Cloud $50+/月 | ✅ Rust 高性能 | ⭐⭐⭐⭐ |
| **Pinecone**（SaaS） | 想省事 | $70+/月 | ❌ 云服务 | ⭐⭐⭐⭐⭐ |
| **Anthropic Files**（API） | Claude 原生 | API 价钱 | ❌ Claude 专用 | ⭐⭐⭐ 新 |

**推荐**：**Chroma**（每客户独立 collection，Docker 部署，零成本）

### Embedding 模型

| 模型 | 中文 | 英文 | 价格 | 维度 |
|---|---|---|---|---|
| OpenAI text-embedding-3-small | ✅ | ✅⭐ | $0.02/1M tokens | 1536 |
| OpenAI text-embedding-3-large | ✅ | ✅⭐ | $0.13/1M tokens | 3072 |
| BGE-M3（开源） | ✅⭐ | ✅ | 自托管免费 | 1024 |
| Cohere multilingual-v3 | ✅ | ✅⭐ | $0.1/1M tokens | 1024 |

**推荐**：跨境 B2B 用 **text-embedding-3-small**（性价比最高，中英都好）

---

## 三、客户认知 Schema 设计

### 每客户 vector store 内 6 大数据类型

```python
COLLECTIONS = {
    'visitor_conversations': {
        # Hermes Agent 写入
        # 访客通过 chat-widget / 企微跟智能体的对话
        'fields': ['timestamp', 'visitor_id', 'page_url', 'question', 'answer', 'topics_mentioned', 'sentiment'],
        'embedding': 'question + answer'
    },
    'inquiries': {
        # inquiry 智能体写入
        # 完整询盘 + nurturing 序列对话历史
        'fields': ['timestamp', 'lead_email', 'company', 'country', 'product_interest', 'message', 'reply_history', 'stage'],
        'embedding': 'message + reply_history concatenated'
    },
    'gsc_queries': {
        # web-ops 写入
        # GSC 14/30/90 天高展示 query (含 -site: 假查询过滤后)
        'fields': ['date', 'query', 'page', 'impressions', 'clicks', 'ctr', 'position'],
        'embedding': 'query'
    },
    'competitor_intel': {
        # competitor-radar 写入
        # 竞品新发布的内容/产品/价格
        'fields': ['date', 'competitor', 'content_type', 'title', 'url', 'key_points'],
        'embedding': 'title + key_points'
    },
    'content_published': {
        # content-tracker 写入
        # 我们自己发布的博客/产品页/Lead Magnet 数据
        'fields': ['date', 'url', 'type', 'topic', 'keywords', 'gsc_30d_data', 'ga4_30d_data'],
        'embedding': 'topic + keywords'
    },
    'patterns': {
        # 模式库写入
        # 成功模式 / 失败教训 / 行业蓝图
        'fields': ['date', 'type', 'title', 'content', 'applicability'],
        'embedding': 'title + content'
    }
}
```

### 查询用例

#### Use Case 1: web-ops 选题前先查 RAG

```python
# web-ops content-production skill 阶段 1 升级
def get_topic_suggestions(client_id):
    rag = ClientRAG(client_id)
    
    # 查"过去 30 天访客最关心的 Top 5 主题"
    visitor_topics = rag.query(
        collection='visitor_conversations',
        query='', 
        days=30,
        agg='topics_mentioned',
        top_k=5
    )
    
    # 查"询盘中最高频的产品/问题"
    inquiry_themes = rag.query(
        collection='inquiries',
        query='',
        days=30,
        agg='product_interest',
        top_k=5
    )
    
    # 查"GSC 高展示低排名 query"
    gsc_gaps = rag.query(
        collection='gsc_queries',
        filter='impressions > 50 AND position > 20',
        days=30,
        top_k=10
    )
    
    # 综合三源,语义聚类,出 Top 3 选题
    return rag.cluster_and_rank([visitor_topics, inquiry_themes, gsc_gaps])
```

**效果**：选题不再"拍脑袋"或"只看 GSC"，是"GSC + 访客对话 + 询盘"三源融合。**准确度从 60% → 90%**。

#### Use Case 2: inquiry 回复前查 RAG

```python
# inquiry email-nurture skill 升级
def personalize_reply(lead_email, message):
    rag = ClientRAG(client_id)
    
    # 查这个 lead 之前的访问/询盘历史
    history = rag.query(
        collection='inquiries+visitor_conversations',
        filter=f'visitor_id={lead_email}',
        top_k=10
    )
    
    # 查相似询盘的成功回复
    similar = rag.query(
        collection='inquiries',
        query=message,
        filter='stage=closed_won',
        top_k=3
    )
    
    # LLM 综合 history + similar 写个性化回复
    return llm.generate(
        prompt=f"基于这个 lead 的历史 + 类似成功案例,写回复。\n历史:{history}\n类似案例:{similar}\n当前询盘:{message}"
    )
```

**效果**：回复**带客户记忆**，不是模板化套话。**回复转化率提升 30-50%**。

#### Use Case 3: Hermes 答客户员工查询时调 RAG

```python
# Hermes via wecom 升级
def hermes_answer(query):
    # 客户员工问"上周询盘趋势?"
    if 'trend' in query.lower():
        rag = ClientRAG(client_id)
        recent = rag.query(
            collection='inquiries',
            days=7,
            agg='by_day'
        )
        return summarize_trend(recent)
```

**效果**：Hermes 给员工的答案是**实时基于 vector store**，不是查询时再调一堆 MCP。

---

## 四、实施 SOP（分阶段）

### Phase 1（v10.1 batch 5 · 当前）：设计 + 单客户试点

- [ ] 选 Chroma（最易部署）
- [ ] demo-b 试点（流量大 + 多语种 + 实战丰富）
- [ ] Docker compose 部署 Chroma 到 hermes-stack 同一台 VPS
- [ ] 写 `mcp-servers/rag/` 自研 MCP（提供 add/query/delete 接口）

### Phase 2（v10.2）：3 客户铺开

- [ ] demo-b / demo-c / demo-a 各自独立 vector store
- [ ] daily-cron 加每日 RAG 写入分支（GSC + GA4 + 竞品数据）
- [ ] inquiry 接 RAG（每询盘自动写入）

### Phase 3（v10.3）：跨智能体读集成

- [ ] web-ops content-production 阶段 1 改用 RAG 选题
- [ ] inquiry email-nurture 改用 RAG 个性化回复
- [ ] Hermes 集成 RAG 查询能力

### Phase 4（v11+ 产品级）：自学习 + 跨客户

- [ ] 跨客户模式发现（"哪个行业 Lead Magnet 最有效"）
- [ ] 定期 re-embedding（升级 model）
- [ ] 数据治理（GDPR：访客对话 90 天后匿名化）

---

## 五、技术栈

```
mcp-servers/rag/
├── index.mjs              ← MCP server (add_document/query/list_collections)
├── chroma-client.mjs      ← Chroma 集成
├── embeddings.mjs         ← OpenAI/BGE 切换
└── per-client-store.mjs   ← 每客户独立 collection 管理

部署:
├── Docker: chroma:latest 容器
├── 持久化: /data/chroma/<client_id>/ (ai-studio 父仓库 .gitignore)
└── 备份: 每周 dump 到 ~/maintenance/backups/
```

### 自研 MCP 工具设计

```javascript
// mcp-servers/rag/index.mjs (设计草案)
tools: [
  {
    name: 'rag_add',
    description: '写入文档到客户 vector store',
    inputSchema: {
      properties: {
        client_id: { type: 'string' },
        collection: { type: 'string', enum: ['visitor_conversations', 'inquiries', 'gsc_queries', 'competitor_intel', 'content_published', 'patterns'] },
        documents: { type: 'array', items: { type: 'object' } }
      },
      required: ['client_id', 'collection', 'documents']
    }
  },
  {
    name: 'rag_query',
    description: '语义查询客户 vector store',
    inputSchema: {
      properties: {
        client_id: { type: 'string' },
        collection: { type: 'string' },
        query: { type: 'string' },
        filter: { type: 'object' },
        top_k: { type: 'number', default: 10 }
      },
      required: ['client_id', 'collection']
    }
  },
  {
    name: 'rag_cluster',
    description: '把多个 query 结果语义聚类,出 Top N 主题',
    inputSchema: { /* ... */ }
  },
  {
    name: 'rag_stats',
    description: '查询客户 RAG 统计 (文档数 / 各 collection 增长曲线)',
    inputSchema: { properties: { client_id: { type: 'string' } } }
  }
]
```

---

## 六、隐私 + 合规

### GDPR 要求

- **数据最小化**：访客对话的 PII（邮箱/电话）单独存储 + 哈希索引
- **right to be forgotten**：客户员工可调 `rag_delete(visitor_id)` 删除指定访客所有数据
- **保留期**：访客对话 90 天后自动匿名化（保留趋势数据，去掉 PII）
- **数据本地化**：欧洲客户的 vector store 部署在欧洲 VPS

### 数据安全

- 每客户独立 collection（不共享）
- API key 加密存储
- 备份加密
- 访问日志（谁查了什么）

---

## 七、成本预算

### Chroma 自托管（推荐）

| 项 | 月成本 |
|---|---|
| VPS（如 Hetzner CX21 4G）共享 hermes-stack | €5.83 |
| OpenAI text-embedding-3-small | ~$1-5/客户/月（视数据量） |
| 备份存储 | 已有 |
| **合计** | **~$8-15/客户/月** |

### Pinecone（如选 SaaS）

| 项 | 月成本 |
|---|---|
| Pinecone Standard | $70+ |
| OpenAI embedding | $1-5 |
| **合计** | **~$75/客户/月** |

**推荐 Chroma**：成本是 Pinecone 的 1/10。

---

## 八、跨智能体协议（重要）

### 写入规则

| 智能体 | 写哪些 collection | 频率 |
|---|---|---|
| Hermes | visitor_conversations | 实时（每对话） |
| inquiry | inquiries | 实时（每询盘+回复） |
| web-ops | gsc_queries / competitor_intel / content_published | daily-cron 跑（每天） |
| 模式库（人工） | patterns | 沉淀时（按需） |

### 读取规则

任意智能体可读任意 collection（同客户内）。

### 元数据约定

每条文档必含：
```json
{
  "id": "<uuid>",
  "timestamp": "<ISO 8601>",
  "agent_source": "<hermes|inquiry|web-ops|human>",
  "client_id": "<client-XXX>",
  "version": "v1"
}
```

便于追溯 + 回滚。

---

## 九、节奏目标

### 30 天（v10.1 batch 5 后）
- 设计完成（本文档）
- demo-b 试点部署
- 3 个 collection（visitor_conversations / inquiries / gsc_queries）跑起来

### 90 天
- 3 客户铺开
- 6 个 collection 齐全
- daily-cron 自动写入
- web-ops 选题升级用 RAG

### 180 天
- inquiry 回复升级用 RAG（个性化）
- Hermes 查询升级用 RAG
- 跨客户模式发现初步出来

---

## 十、效果指标

### 选题准确度
- baseline（v10.1 batch 4 前）：60%
- 目标（用 RAG 后）：≥ 90%
- 衡量：选题写完发布 → 90 天后看排名 + 询盘

### 询盘回复个性化度
- baseline：模板化（< 30% 个性化）
- 目标：≥ 80% 含访客历史 + 类似案例

### 跨智能体延迟
- 目标：访客对话写入 → web-ops 可读 < 60 秒

---

*v10.1 第五批 · 共享 RAG 认知层 · 2026-04-27 · 产品级智能体核心差异化*

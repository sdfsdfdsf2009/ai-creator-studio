# AI Creator Studio - 完整需求文档包 v1.0

## 📋 文档目录

| 序号 | 文档名称 | 页码 | 状态 |
|------|---------|------|------|
| 1 | [产品概览](#1-产品概览) | - | ✅ 完成 |
| 2 | [业务架构](#2-业务架构) | - | ✅ 完成 |
| 3 | [技术架构](#3-技术架构) | - | ✅ 完成 |
| 4 | [数据字段定义](#4-数据字段定义) | - | ✅ 完成 |
| 5 | [功能模块1：图片生成流程](#5-功能模块1图片生成流程) | - | ✅ 完成 |
| 6 | [功能模块2：视频生成流程](#6-功能模块2视频生成流程) | - | ✅ 完成 |
| 7 | [功能模块3：素材库管理](#7-功能模块3素材库管理) | - | ✅ 完成 |
| 8 | [功能模块4：Prompt模板管理](#8-功能模块4prompt模板管理) | - | ✅ 完成 |
| 9 | [功能模块5：任务监控](#9-功能模块5任务监控) | - | ✅ 完成 |
| 10 | [功能模块6：数据统计分析](#10-功能模块6数据统计分析) | - | ✅ 完成 |
| 11 | [补充功能：多AI模型支持](#11-补充功能多ai模型支持) | - | ✅ 完成 |
| 12 | [接口文档汇总](#12-接口文档汇总) | - | ✅ 完成 |
| 13 | [测试方案](#13-测试方案) | - | ✅ 完成 |
| 14 | [部署方案](#14-部署方案) | - | ✅ 完成 |
| 15 | [项目排期](#15-项目排期) | - | ✅ 完成 |

---

## 1. 产品概览

### 1.1 产品定位

**AI Creator Studio** 是一款面向高频内容创作者的AI生成管理工具，帮助用户批量生成、管理、追踪AI图片和视频，降低创作成本，提升生产效率。

### 1.2 核心价值

- **效率提升**：批量生成替代单次操作，日处理能力250+ 图片/视频
- **成本可控**：智能缓存节省20-30%，月成本控制在$150-200
- **资产管理**：统一存储、快速检索、版本追踪
- **商业扩展**：预留多租户架构，6个月内支持SaaS化

### 1.3 目标用户

**Phase 1（0-3个月）：**
- 自媒体创作者
- 独立设计师
- 小型工作室

**Phase 2（3-6个月）：**
- 创作团队
- MCN机构
- 企业营销部门

### 1.4 关键指标（KPI）

| 类型 | 指标 | 目标值 |
|------|------|--------|
| **效率** | 日处理能力 | 250+ 图片/视频 |
| **效率** | 任务创建耗时 | < 30秒 |
| **效率** | 状态更新延迟 | < 100ms |
| **成本** | 月度成本 | $150-200 |
| **成本** | 缓存节省率 | 20-30% |
| **成本** | API调用减少 | 48% |
| **体验** | 页面加载速度 | < 2秒 |
| **体验** | API响应时间 | < 500ms |
| **体验** | 任务成功率 | > 95% |
| **体验** | 缓存命中率 | > 20% |

---

## 2. 业务架构

### 2.1 业务领域模型

```
┌──────────────────────────────────────────────────────────────────┐
│                          领域层（Domain）                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────┐         ┌─────────────────┐                │
│  │   任务域         │────────│   素材域         │                │
│  │  Task Domain    │  生成   │  Asset Domain   │                │
│  ├─────────────────┤         ├─────────────────┤                │
│  │• 任务创建       │         │• 结果存储       │                │
│  │• 任务调度       │         │• 标签管理       │                │
│  │• 进度追踪       │         │• 版本控制       │                │
│  │• 状态管理       │         │• 使用统计       │                │
│  └─────────────────┘         └─────────────────┘                │
│           │                           │                          │
│           │                           │                          │
│  ┌─────────────────┐         ┌─────────────────┐                │
│  │  Prompt域       │────────│   财务域         │                │
│  │  Prompt Domain  │  关联   │  Finance Domain │                │
│  ├─────────────────┤         ├─────────────────┤                │
│  │• 模板管理       │         │• 成本计算       │                │
│  │• 变量系统       │         │• 预算控制       │                │
│  │• 复用优化       │         │• 消费分析       │                │
│  │• 效果评估       │         │• 预警通知       │                │
│  └─────────────────┘         └─────────────────┘                │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 功能模块地图

```
AI Creator Studio
├── 任务管理
│   ├── 创建任务（图片/视频）
│   ├── 任务列表
│   ├── 任务详情
│   └── 任务操作（取消/删除/重试）
├── 素材库
│   ├── 图片库
│   ├── 视频库
│   ├── 搜索过滤
│   └── 批量操作
├── Prompt管理
│   ├── 模板库
│   ├── 创建/编辑模板
│   ├── 变量系统
│   └── 使用统计
├── 数据面板
│   ├── 成本统计
│   ├── 生成分析
│   ├── 缓存效率
│   └── 存储监控
└── 系统设置
    ├── AI模型配置
    ├── API密钥管理
    └── 预算设置
```

---

## 3. 技术架构

### 3.1 系统架构全景图

```
客户端层
    ↓
前端应用层 (Vercel)
  Next.js 15 + React 19
    ↓
API网关层
  /api/feishu/* | /api/n8n/* | /api/tasks/*
    ↓
数据存储层 (混合架构)
  ├─ n8n Table (热数据)
  │  • task_execution_state
  │  • generation_queue
  │  • ai_api_cache
  │  • execution_logs
  └─ 飞书多维表格 (冷数据)
     • tasks
     • results
     • prompt_templates
     • daily_stats
    ↓
工作流编排层
  n8n Workflow Engine
    ↓
外部服务层
  MidJourney | DALL-E | Runway | 飞书
```

### 3.2 混合存储策略

| 数据类型 | 存储位置 | 理由 | TTL |
|---------|---------|------|-----|
| 任务执行状态 | n8n Table | 高频读写 | 任务完成后清理 |
| 生成队列 | n8n Table | 实时处理 | 任务完成后清理 |
| AI缓存 | n8n Table | 快速查询 | 30天 |
| 执行日志 | n8n Table | 调试追踪 | 7天 |
| 任务记录 | 飞书 | 用户可见、持久化 | 永久 |
| 生成结果 | 飞书 | 用户可见、持久化 | 永久 |
| Prompt模板 | 飞书 | 用户编辑、持久化 | 永久 |
| 统计数据 | 飞书 | 长期分析 | 永久 |
| 文件 | 飞书云文档 | CDN加速 | 永久 |

### 3.3 技术选型

| 层级 | 技术 | 版本 | 理由 |
|------|------|------|------|
| 前端框架 | Next.js | 15 | App Router、SSR、性能最优 |
| UI组件 | shadcn/ui | latest | 无依赖、可定制 |
| 状态管理 | Zustand | latest | 轻量、TypeScript友好 |
| 数据请求 | React Query | latest | 缓存管理、自动重试 |
| 工作流 | n8n | latest | 可视化、快速迭代 |
| 数据存储 | 飞书 | - | 快速启动、用户友好 |
| 文件存储 | 飞书云文档 | - | 集成方便 |
| 部署 | Vercel | - | 零配置、全球CDN |

---

## 4. 数据字段定义

### 4.1 n8n Table存储

#### 表1: task_execution_state

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| task_id | String (PK) | ✓ | 任务ID |
| execution_id | String | ✓ | n8n执行ID |
| current_sequence | Number | ✓ | 当前序号 |
| total_count | Number | ✓ | 总数量 |
| status | String | ✓ | pending/running/completed/failed |
| retry_count | Number | ✓ | 重试次数 |
| started_at | Timestamp | ✓ | 开始时间 |
| updated_at | Timestamp | ✓ | 更新时间 |

#### 表2: generation_queue

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| queue_id | String (PK) | ✓ | 队列ID |
| task_id | String | ✓ | 任务ID |
| sequence | Number | ✓ | 序号 |
| prompt | String | ✓ | Prompt |
| status | String | ✓ | waiting/processing/completed/failed |
| ai_job_id | String | - | AI Job ID |
| result_url | String | - | 结果URL |
| cost | Number | ✓ | 成本 |
| is_cached | Boolean | ✓ | 是否缓存 |

#### 表3: ai_api_cache

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| cache_key | String (PK) | ✓ | MD5(model:prompt:params) |
| model | String | ✓ | 模型ID |
| prompt | String | ✓ | Prompt |
| result_url | String | ✓ | 结果URL |
| usage_count | Number | ✓ | 使用次数 |
| cost_saved | Number | ✓ | 节省成本 |
| expires_at | Timestamp | ✓ | 过期时间 |

### 4.2 飞书多维表格

#### 表1: tasks

| 字段名 | 类型 | 说明 |
|--------|------|------|
| task_id | 单行文本 | UUID |
| type | 单选 | image/video |
| mode | 单选 | single/batch |
| prompt | 多行文本 | Prompt |
| model | 单行文本 | 模型ID |
| total_count | 数字 | 总数 |
| completed_count | 数字 | 完成数 |
| cache_hit_count | 数字 | 缓存命中 |
| status | 单选 | pending/running/completed/failed |
| actual_cost | 数字 | 实际成本 |
| cost_saved | 数字 | 节省成本 |
| created_at | 日期时间 | 创建时间 |
| completed_at | 日期时间 | 完成时间 |

#### 表2: results

| 字段名 | 类型 | 说明 |
|--------|------|------|
| result_id | 单行文本 | UUID |
| task_id | 单行文本 | 任务ID |
| sequence | 数字 | 序号 |
| type | 单选 | image/video |
| file_url | 单行文本 | 文件URL |
| model_used | 单行文本 | 使用的模型 |
| cost | 数字 | 成本 |
| is_cached | 复选框 | 缓存命中 |
| generated_at | 日期时间 | 生成时间 |
| tags | 多选 | 标签 |

#### 表3: prompt_templates

| 字段名 | 类型 | 说明 |
|--------|------|------|
| template_id | 单行文本 | UUID |
| title | 单行文本 | 标题 |
| content | 多行文本 | Prompt内容 |
| variables | 多行文本 | 变量JSON |
| type | 单选 | image/video |
| usage_count | 数字 | 使用次数 |
| cache_save_rate | 数字 | 缓存节省率 |
| is_favorite | 复选框 | 收藏 |

#### 表4: daily_stats

| 字段名 | 类型 | 说明 |
|--------|------|------|
| date | 日期 | 统计日期 |
| image_count | 数字 | 图片数 |
| video_count | 数字 | 视频数 |
| total_cost | 数字 | 总成本 |
| cache_hit_count | 数字 | 缓存命中 |
| cost_saved | 数字 | 节省成本 |
| cache_hit_rate | 数字 | 命中率(%) |
| storage_used_gb | 数字 | 存储占用 |

---

## 5. 功能模块1：图片生成流程

### 5.1 用户故事

**作为**内容创作者  
**我想要**批量生成多张风格统一的AI图片  
**以便于**快速完成一组内容的素材准备工作

### 5.2 核心场景

1. **单次生成**：验证创意效果
2. **批量生成**：生成20-50张变体（主要场景）
3. **模板生成**：从Prompt库快速生成

### 5.3 页面设计

#### 创建任务页面 `/tasks/create`

**表单字段：**
- 任务类型：● 图片生成 ○ 视频生成
- 生成模式：○ 单次 ● 批量
- AI模型：下拉选择（见模块11）
- Prompt输入：多行文本框（10-2000字符）
- 变量设置：动态表单（检测{变量名}）
- 高级参数：模型专属参数
- 成本预估：实时计算

**交互规则：**
- 模式切换时动态显示/隐藏变量区域
- Prompt输入时检测变量格式
- 变量输入时实时预览生成数量
- 提交前验证预算是否充足

#### 任务详情页面 `/tasks/{id}`

**核心区域：**
- 任务信息：状态、模型、参数
- 进度条：实时更新（SSE推送）
- 实时日志：n8n execution_logs
- 已生成结果：网格/列表视图
- 成本统计：实际/预估/节省

**实时更新：**
```typescript
// SSE订阅
const eventSource = new EventSource(`/api/tasks/${id}/stream`);

eventSource.addEventListener('status_update', (e) => {
  // 更新进度
});

eventSource.addEventListener('result_ready', (e) => {
  // 添加新结果
});
```

### 5.4 业务流程

```
用户提交表单
  ↓
前端验证（Prompt长度、预算）
  ↓
写入飞书tasks表
  ↓
触发n8n workflow
  ↓
n8n写入执行状态到Table
  ↓
批量写入队列
  ↓
循环处理队列（并发3个）：
  ├─ 查询缓存
  │  ├─ 命中 → 复用
  │  └─ 未命中 → 调用AI API
  ├─ 上传飞书
  ├─ 写入results表
  └─ 回调前端（SSE推送）
  ↓
全部完成 → 更新tasks表 → 清理n8n Table
```

### 5.5 接口定义

**创建任务：**
```
POST /api/feishu/tasks
Body: {
  type: "image",
  mode: "batch",
  prompt: "A {主体} in...",
  variables: {"主体": ["城市","森林"]},
  model: "midjourney-v6"
}
Response: {task_id, estimated_cost}
```

**获取详情：**
```
GET /api/tasks/{id}
Response: {
  status, progress, logs, results, 
  source: "n8n"|"feishu"
}
```

**SSE订阅：**
```
GET /api/tasks/{id}/stream
Events: status_update, result_ready, task_completed
```

### 5.6 验收标准

- [ ] 支持单次/批量生成
- [ ] 变量展开正确（笛卡尔积）
- [ ] 缓存检测准确
- [ ] 进度实时更新（延迟<3秒）
- [ ] 成本预估准确（误差<5%）
- [ ] 任务成功率>95%

---

## 6. 功能模块2：视频生成流程

### 6.1 与图片生成的差异

| 维度 | 图片生成 | 视频生成 |
|------|---------|---------|
| 时长 | N/A | 5秒/10秒 |
| 成本 | $0.02-0.08/张 | $1.00-2.50/个 |
| 生成时间 | 30-120秒 | 2-8分钟 |
| 文件大小 | 2-5MB | 20-50MB |
| 专属参数 | 纵横比、风格强度 | 帧率、运动强度、转场 |

### 6.2 页面设计差异

#### 创建任务页面

**视频专属字段：**
```
视频时长: ● 5秒 ($1.25)  ○ 10秒 ($2.50)
帧率: [24 fps ▼] 24/30/60
运动强度: [━━━○━━━━] 50
  低(静态) ←─────→ 高(快速)
转场效果: [无 ▼] 无/淡入淡出/切换
```

**成本预估：**
```
5秒视频 × 10个 = $12.50
预计完成: 约 30 分钟
```

#### 任务详情页面

**视频预览：**
```
┌────────────────────────────┐
│                            │
│     [视频播放器]            │
│                            │
│  ▶️  ⏸  ⏭  🔊  ⚙️         │
│  [━━━━━━○━━━━] 00:03/00:05│
└────────────────────────────┘
[下载MP4] [下载GIF]
```

### 6.3 特殊处理

**大文件上传：**
```typescript
// 分片上传到飞书
async function uploadLargeVideo(file: File) {
  const chunkSize = 10 * 1024 * 1024; // 10MB
  const chunks = Math.ceil(file.size / chunkSize);
  
  for (let i = 0; i < chunks; i++) {
    const chunk = file.slice(
      i * chunkSize, 
      (i + 1) * chunkSize
    );
    await uploadChunk(chunk, i, chunks);
  }
}
```

**进度轮询：**
```typescript
// 视频生成时间较长，需要更频繁的状态查询
const pollInterval = taskType === 'video' ? 10000 : 5000;
```

### 6.4 验收标准

- [ ] 支持5秒/10秒视频
- [ ] 视频预览流畅
- [ ] 大文件上传稳定
- [ ] 生成进度准确
- [ ] 支持视频格式转换（MP4/GIF）

---

## 7. 功能模块3：素材库管理

### 7.1 用户故事

**作为**创作者  
**我想要**快速找到之前生成的素材  
**以便于**复用或二次创作

### 7.2 页面设计

#### 素材库页面 `/library`

**布局：**
```
┌─────────────────────────────────────────┐
│ 素材库                   [图片] [视频]   │
├─────────────────────────────────────────┤
│ 🔍 搜索框                               │
│ 过滤: [最近7天▼] [标签] [模型]         │
│ 排序: [创建时间▼]  视图: [⊞] [☰]       │
├─────────────────────────────────────────┤
│ 共 1,247 个结果        [批量操作▼]      │
│                                          │
│ ┌────┬────┬────┬────┐                  │
│ │[图]│[图]│[图]│[图]│  4列网格          │
│ └────┴────┴────┴────┘                  │
│ ┌────┬────┬────┬────┐                  │
│ │[图]│[图]│[图]│[图]│                  │
│ └────┴────┴────┴────┘                  │
│                                          │
│ [加载更多...]                            │
└─────────────────────────────────────────┘
```

**卡片信息：**
```
┌──────────────────┐
│  [缩略图]         │
│                  │
│  Prompt片段...   │
│  模型: MJ v6     │
│  $0.04  ⚡缓存   │
│  10-17 14:23    │
│  [⬇] [❤️] [🗑]  │
└──────────────────┘
```

### 7.3 核心功能

#### 搜索与过滤

**搜索支持：**
- Prompt全文搜索
- 标签搜索
- 模型筛选
- 日期范围
- 成本范围
- 是否缓存

**过滤器组合：**
```typescript
interface LibraryFilter {
  search?: string;           // 搜索关键词
  type?: 'image' | 'video';  // 类型
  tags?: string[];           // 标签（多选）
  models?: string[];         // 模型（多选）
  dateRange?: {              // 日期范围
    from: Date;
    to: Date;
  };
  costRange?: {              // 成本范围
    min: number;
    max: number;
  };
  isCached?: boolean;        // 仅缓存/非缓存
  isFavorite?: boolean;      // 仅收藏
}
```

#### 批量操作

**支持的操作：**
- 批量下载（打包为ZIP）
- 批量删除（软删除）
- 批量添加标签
- 批量设置收藏

**批量下载实现：**
```typescript
import JSZip from 'jszip';

async function batchDownload(resultIds: string[]) {
  const zip = new JSZip();
  
  // 下载所有文件
  for (const id of resultIds) {
    const result = await getResult(id);
    const blob = await fetch(result.file_url).then(r => r.blob());
    zip.file(`${result.sequence}_${id}.png`, blob);
  }
  
  // 生成ZIP
  const content = await zip.generateAsync({ type: 'blob' });
  
  // 触发下载
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = `batch_${Date.now()}.zip`;
  a.click();
}
```

#### 预览功能

**Lightbox预览：**
```
┌─────────────────────────────────────────┐
│  ✕                          [< 1/24 >]  │
│                                          │
│            [大图显示]                     │
│                                          │
├─────────────────────────────────────────┤
│ Prompt: A cyberpunk cityscape...        │
│ 模型: MidJourney v6                     │
│ 标签: #赛博朋克 #城市                    │
│ 成本: $0.04  ⚡缓存命中                  │
│ 生成时间: 2025-10-17 14:25             │
│                                          │
│ [下载原图] [复制Prompt] [添加收藏]      │
│ [从此Prompt重新生成]                     │
└─────────────────────────────────────────┘
```

### 7.4 接口定义

**获取列表：**
```
GET /api/feishu/results
Query: {
  type, tags, search, dateFrom, dateTo,
  minCost, maxCost, isCached, isFavorite,
  page, limit, sort, order
}
Response: {
  items: [...],
  pagination: {page, total, totalPages}
}
```

**批量操作：**
```
POST /api/feishu/results/batch
Body: {
  action: "delete"|"tag"|"favorite",
  result_ids: [...],
  params: {...}
}
```

### 7.5 性能优化

**缩略图策略：**
1. 优先加载base64缩略图（瞬间显示）
2. 懒加载高清缩略图（进入视口时）
3. 原图仅在预览时加载

**虚拟滚动：**
```typescript
// 超过100个结果时启用
import { FixedSizeGrid } from 'react-window';

<FixedSizeGrid
  columnCount={4}
  rowCount={Math.ceil(results.length / 4)}
  height={600}
  width={1000}
>
  {RenderCell}
</FixedSizeGrid>
```

### 7.6 验收标准

- [ ] 搜索响应<500ms
- [ ] 支持5种以上过滤条件
- [ ] 批量下载支持50+文件
- [ ] 虚拟滚动支持1000+结果
- [ ] 预览加载<1秒

---

## 8. 功能模块4：Prompt模板管理

### 8.1 用户故事

**作为**创作者  
**我想要**保存常用的Prompt模板  
**以便于**快速复用并保持风格统一

### 8.2 页面设计

#### Prompt库页面 `/prompts`

```
┌─────────────────────────────────────────────────┐
│ Prompt模板库               [➕ 创建新模板]       │
├─────────────────────────────────────────────────┤
│ 分类: [全部] [图片] [视频] [我的收藏⭐]         │
│ 排序: [使用次数▼]         🔍 搜索模板...        │
│                                                  │
│ ┌─────────────────────────────────────────────┐│
│ │ 赛博朋克人物生成         [⭐收藏] [编辑] [✕] ││
│ │ A {character} in cyberpunk style...         ││
│ │ 变量: {character}, {pose}                   ││
│ │ 使用 45次 | 平均 $0.04 | 缓存节省 25%       ││
│ │                              [使用此模板 →] ││
│ ├─────────────────────────────────────────────┤│
│ │ 商业产品摄影             [⭐已收藏] [编辑]   ││
│ │ Professional product photography...         ││
│ │ 使用 32次 | 平均 $0.04 | 缓存节省 30%       ││
│ │                              [使用此模板 →] ││
│ └─────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

#### 创建/编辑模板页面

```
┌─────────────────────────────────────────────────┐
│ 创建Prompt模板                       [保存] [取消]│
├─────────────────────────────────────────────────┤
│ 模板名称:                                        │
│ [赛博朋克人物生成                            ]  │
│                                                  │
│ 模板描述: (可选)                                 │
│ [适用于生成未来科幻风格的人物角色...          ]  │
│                                                  │
│ 适用类型:                                        │
│ ● 图片  ○ 视频  ○ 两者                         │
│                                                  │
│ 分类:                                            │
│ [人物 ▼] 人物/场景/产品/抽象                    │
│                                                  │
│ Prompt内容:                      [插入变量 ▼]   │
│ ┌─────────────────────────────────────────────┐│
│ │ A {character} in cyberpunk style, {pose},   ││
│ │ neon lights in background, highly detailed  ││
│ └─────────────────────────────────────────────┘│
│ 字数: 95 / 2000                                 │
│                                                  │
│ 变量定义: (检测到2个变量)        [添加变量]     │
│ ┌─────────────────────────────────────────────┐│
│ │ 变量1: {character}                     [✕]  ││
│ │ 显示名称: [角色                          ]  ││
│ │ 类型: ● 文本  ○ 下拉选择                   ││
│ │ 默认值: [warrior                         ]  ││
│ │ 占位符: [例如: warrior, scientist...     ]  ││
│ │                                             ││
│ │ 变量2: {pose}                          [✕]  ││
│ │ 显示名称: [姿势                          ]  ││
│ │ 类型: ○ 文本  ● 下拉选择                   ││
│ │ 选项: [standing, sitting, running       ]  ││
│ └─────────────────────────────────────────────┘│
│                                                  │
│ 推荐模型: (可选)                                 │
│ [MidJourney v6 ▼]                               │
│                                                  │
│ 推荐参数: (可选)                   [配置参数]   │
│ 纵横比: 16:9, 质量: 标准, 风格强度: 70         │
│                                                  │
│ 标签: (用于搜索)                                 │
│ [赛博朋克] [人物] [科幻] [+添加]                │
│                                                  │
│ [ ] 设为公开模板 (Phase 2)                      │
│                                                  │
│              [保存草稿]  [保存并使用]            │
└─────────────────────────────────────────────────┘
```

### 8.3 核心功能

#### 变量系统

**变量类型：**
```typescript
type VariableType = 'text' | 'select' | 'number';

interface Variable {
  name: string;              // 变量名（不含{}）
  label: string;             // 显示名称
  type: VariableType;        // 类型
  defaultValue?: any;        // 默认值
  placeholder?: string;      // 占位符
  options?: string[];        // 下拉选项（select类型）
  min?: number;              // 最小值（number类型）
  max?: number;              // 最大值（number类型）
  required?: boolean;        // 是否必填
}
```

**变量检测：**
```typescript
function detectVariables(prompt: string): string[] {
  const regex = /\{([^}]+)\}/g;
  const matches = prompt.matchAll(regex);
  return [...new Set([...matches].map(m => m[1]))];
}
```

**变量替换：**
```typescript
function replaceVariables(
  template: string, 
  values: Record<string, string>
): string {
  return template.replace(/\{([^}]+)\}/g, (match, key) => {
    return values[key] || match;
  });
}
```

#### 使用统计

**记录使用：**
```typescript
// 每次使用模板时
await feishuClient.updateTemplate(templateId, {
  usage_count: { $increment: 1 },
  last_used_at: Date.now()
});

// 记录成本和缓存
await feishuClient.updateTemplate(templateId, {
  total_cost: { $increment: actualCost },
  cache_saved: { $increment: savedCost }
});
```

**计算缓存节省率：**
```typescript
const cacheRate = template.cache_saved / template.total_cost * 100;
```

#### 模板推荐

**基于场景推荐：**
```typescript
function recommendTemplates(
  type: 'image' | 'video',
  keywords: string[]
): Template[] {
  const templates = getTemplatesByType(type);
  
  // 计算相关度
  return templates
    .map(t => ({
      template: t,
      relevance: calculateRelevance(t, keywords)
    }))
    .filter(x => x.relevance > 0.3)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 5)
    .map(x => x.template);
}

function calculateRelevance(
  template: Template, 
  keywords: string[]
): number {
  const content = template.content.toLowerCase();
  const tags = template.tags.map(t => t.toLowerCase());
  
  let score = 0;
  for (const keyword of keywords) {
    if (content.includes(keyword)) score += 0.5;
    if (tags.includes(keyword)) score += 0.3;
  }
  
  return Math.min(score, 1);
}
```

### 8.4 接口定义

**获取模板列表：**
```
GET /api/feishu/prompts
Query: {type, category, isFavorite, search, sort, order}
Response: {items: [...]}
```

**创建模板：**
```
POST /api/feishu/prompts
Body: {
  title, description, content, variables,
  type, category, recommended_model, 
  recommended_params, tags
}
Response: {template_id}
```

**使用模板：**
```
POST /api/feishu/prompts/{id}/use
Response: {
  template: {...},
  prefilled_values: {...}
}
```

### 8.5 验收标准

- [ ] 支持文本/下拉/数字变量类型
- [ ] 自动检测Prompt中的变量
- [ ] 使用模板时自动填充表单
- [ ] 使用统计准确记录
- [ ] 缓存节省率计算准确
- [ ] 支持模板搜索和过滤

---

## 9. 功能模块5：任务监控

### 9.1 任务列表页面 `/tasks`

```
┌─────────────────────────────────────────────────┐
│ 我的任务                        [创建新任务 +]  │
├─────────────────────────────────────────────────┤
│ 状态: [全部] [进行中] [已完成] [失败]           │
│ 类型: [全部] [图片] [视频]                      │
│ 时间: [最近7天▼]       🔍 搜索任务...           │
├─────────────────────────────────────────────────┤
│ 排序: [创建时间▼]  共 156 个任务               │
│                                                  │
│ ┌─────────────────────────────────────────────┐│
│ │ 🖼️ 赛博朋克城市场景 x20      🟢 进行中      ││
│ │ 模型: MidJourney v6                         ││
│ │ 进度: [████████░░░░] 12/20 (60%)  ⚡5缓存  ││
│ │ 成本: $0.32 / $0.48  节省: $0.20           ││
│ │ 创建: 10-17 14:23  预计完成: 14:31         ││
│ │              [查看详情] [取消] [...]        ││
│ ├─────────────────────────────────────────────┤│
│ │ 🎬 产品宣传视频 x5           ✓ 已完成       ││
│ │ 模型: Runway Gen-2                          ││
│ │ 进度: [████████████] 5/5 (100%)            ││
│ │ 成本: $6.25  节省: $0                      ││
│ │ 完成: 10-17 10:45  耗时: 24分钟            ││
│ │              [查看详情] [重新生成] [...]    ││
│ └─────────────────────────────────────────────┘│
│                                                  │
│ [加载更多...]                                   │
└─────────────────────────────────────────────────┘
```

### 9.2 状态说明

| 状态 | 图标 | 说明 | 操作 |
|------|------|------|------|
| pending | 🟡 | 待处理，已创建未开始 | 取消 |
| running | 🟢 | 执行中 | 查看详情、取消 |
| completed | ✓ | 全部完成 | 查看详情、重新生成 |
| partial_completed | ⚠️ | 部分完成 | 查看详情、重试失败项 |
| failed | ❌ | 全部失败 | 查看详情、重试 |
| cancelled | ⭕ | 用户取消 | 查看详情、重新生成 |

### 9.3 快速操作

**任务卡片操作菜单：**
```
[...]
  ├─ 查看详情
  ├─ 重新生成
  ├─ 复制Prompt
  ├─ 取消任务 (仅running)
  ├─ 删除任务
  └─ 分享任务 (Phase 2)
```

### 9.4 验收标准

- [ ] 任务列表分页加载
- [ ] 支持5种状态筛选
- [ ] 搜索响应<500ms
- [ ] 进行中任务实时更新
- [ ] 快速操作菜单完整

---

## 10. 功能模块6：数据统计分析

### 10.1 数据面板页面 `/analytics`

```
┌─────────────────────────────────────────────────┐
│ 数据分析              [时间范围: 最近30天 ▼]    │
├─────────────────────────────────────────────────┤
│ 【核心指标】                                    │
│ ┌──────────┬──────────┬──────────┬──────────┐ │
│ │ 总成本   │ 节省成本 │ 缓存命中 │ 生成数量 │ │
│ │ $127.50  │ $38.20   │ 23%      │ 3,200    │ │
│ │ ▲12%     │ ▲18%     │ ▲5%      │ ▲256     │ │
│ └──────────┴──────────┴──────────┴──────────┘ │
├─────────────────────────────────────────────────┤
│ 【成本趋势】                                    │
│ ┌─────────────────────────────────────────────┐│
│ │  $                                           ││
│ │  15│          实际成本                       ││
│ │  12│        ╱╲      ╱╲                      ││
│ │   9│    ╱╲╱  ╲  ╱╲╱  ╲    缓存节省          ││
│ │   6│╱╲╱        ╲╱        ╲╱                 ││
│ │   3│                        ─────────       ││
│ │   0└──────────────────────────────────────→ ││
│ │     9/17  9/24  10/1  10/8  10/15  10/22   ││
│ └─────────────────────────────────────────────┘│
├─────────────────────────────────────────────────┤
│ 【生成统计】                                    │
│ ┌──────────────────┬──────────────────┐       │
│ │  图片生成趋势    │  视频生成趋势    │       │
│ │  [柱状图]        │  [柱状图]        │       │
│ └──────────────────┴──────────────────┘       │
├─────────────────────────────────────────────────┤
│ 【模型分析】                                    │
│ ┌─────────────────────────────────────────────┐│
│ │ 模型使用分布              成本 | 数量 | 占比││
│ │ ┌─────────────────┐                        ││
│ │ │ MidJourney v6  ██████████░ 58%           ││
│ │ │ $74.00  |  1,850张                       ││
│ │ │                                           ││
│ │ │ DALL-E 3       ████░░░░░░░ 25%           ││
│ │ │ $25.00  |  625张                         ││
│ │ │                                           ││
│ │ │ SD XL          ███░░░░░░░░ 17%           ││
│ │ │ $13.60  |  680张                         ││
│ │ └─────────────────┘                        ││
│ └─────────────────────────────────────────────┘│
├─────────────────────────────────────────────────┤
│ 【缓存效率分析】                    [优化建议→] │
│ ┌─────────────────────────────────────────────┐│
│ │ 整体缓存命中率: 23%  🎯 目标: 30%          ││
│ │                                             ││
│ │ Top 缓存Prompt:                             ││
│ │ 1. "赛博朋克城市" - 命中8次, 节省$0.32     ││
│ │ 2. "产品摄影" - 命中6次, 节省$0.24         ││
│ │ 3. "人物肖像" - 命中5次, 节省$0.20         ││
│ │                                             ││
│ │ 💡 提升建议:                                ││
│ │ • 使用Prompt模板可提升命中率至35%          ││
│ │ • 固定风格关键词可增加15%缓存复用          ││
│ └─────────────────────────────────────────────┘│
├─────────────────────────────────────────────────┤
│ 【存储监控】                                    │
│ ┌─────────────────────────────────────────────┐│
│ │ 当前使用: 87.2GB / 150GB (58%)  🟡         ││
│ │ [████████████████████░░░░░░░░░] 58%        ││
│ │                                             ││
│ │ 预计可用天数: 42天                          ││
│ │ 日均增长: 2.1GB                             ││
│ │                                             ││
│ │ ⚠️ 预警: 建议在30天内完成数据迁移          ││
│ └─────────────────────────────────────────────┘│
├─────────────────────────────────────────────────┤
│ 【导出报表】                                    │
│ [导出PDF] [导出Excel] [导出CSV]                │
└─────────────────────────────────────────────────┘
```

### 10.2 统计维度

**时间维度：**
- 今日
- 最近7天
- 最近30天
- 自定义范围

**统计指标：**
- 总成本、节省成本
- 生成数量（图片/视频）
- 缓存命中率
- 模型使用分布
- 存储占用
- 任务成功率
- 平均生成时间

### 10.3 数据导出

**导出格式：**
```typescript
interface ExportData {
  summary: {
    totalCost: number;
    savedCost: number;
    cacheHitRate: number;
    totalGenerated: number;
  };
  daily: Array<{
    date: string;
    cost: number;
    generated: number;
    cacheHits: number;
  }>;
  models: Array<{
    model: string;
    cost: number;
    count: number;
    percentage: number;
  }>;
}
```

**生成PDF：**
```typescript
import jsPDF from 'jspdf';

async function exportPDF(data: ExportData) {
  const doc = new jsPDF();
  
  // 添加标题
  doc.text('AI Creator Studio - 数据报告', 10, 10);
  
  // 添加汇总信息
  doc.text(`总成本: $${data.summary.totalCost}`, 10, 20);
  doc.text(`节省成本: $${data.summary.savedCost}`, 10, 30);
  
  // 添加图表（需要先转为图片）
  const chartImage = await captureChart('cost-chart');
  doc.addImage(chartImage, 'PNG', 10, 40, 190, 100);
  
  // 保存
  doc.save(`report-${Date.now()}.pdf`);
}
```

### 10.4 验收标准

- [ ] 核心指标实时更新
- [ ] 图表交互流畅
- [ ] 支持4种时间范围
- [ ] 数据导出格式正确
- [ ] 存储预警准确

---

## 11. 补充功能：多AI模型支持

### 11.1 支持的模型

**图片生成：**
- MidJourney v6 ($0.04/张)
- MidJourney v5.2 ($0.04/张)
- DALL-E 3 ($0.04/张)
- Stable Diffusion XL ($0.02/张)
- Flux Pro ($0.08/张)

**视频生成：**
- Runway Gen-2 ($1.25/5秒)
- Runway Gen-3 ($2.50/5秒)
- Pika Labs ($1.00/5秒)
- Stable Video ($0.50/5秒)

### 11.2 模型选择UI

详见创建任务页面模型选择区域（第5节）

### 11.3 智能推荐

```typescript
function recommendModel(prompt: string): Model {
  const keywords = extractKeywords(prompt);
  
  // 检测风格
  if (keywords.includes('cyberpunk') || keywords.includes('fantasy')) {
    return 'midjourney-v6';  // 艺术性强
  }
  
  // 检测是否需要文字
  if (hasTextRequirement(prompt)) {
    return 'dalle-3';  // 文字准确
  }
  
  // 检测是否需要真实感
  if (keywords.includes('realistic') || keywords.includes('photographic')) {
    return 'flux-pro';  // 超高清真实
  }
  
  // 默认推荐
  return 'midjourney-v6';
}
```

### 11.4 验收标准

- [ ] 支持5种图片模型
- [ ] 支持4种视频模型
- [ ] 模型切换参数正确更新
- [ ] 智能推荐准确率>70%
- [ ] 缓存按模型隔离

---

## 12. 接口文档汇总

### 12.1 任务相关

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/feishu/tasks` | POST | 创建任务 |
| `/api/tasks/{id}` | GET | 获取任务详情 |
| `/api/tasks/{id}/stream` | GET | SSE订阅 |
| `/api/tasks/{id}/cancel` | POST | 取消任务 |
| `/api/feishu/tasks` | GET | 获取任务列表 |

### 12.2 结果相关

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/feishu/results` | GET | 获取结果列表 |
| `/api/feishu/results/{id}` | GET | 获取结果详情 |
| `/api/feishu/results/{id}` | DELETE | 删除结果 |
| `/api/feishu/results/batch` | POST | 批量操作 |

### 12.3 模板相关

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/feishu/prompts` | GET | 获取模板列表 |
| `/api/feishu/prompts` | POST | 创建模板 |
| `/api/feishu/prompts/{id}` | PUT | 更新模板 |
| `/api/feishu/prompts/{id}` | DELETE | 删除模板 |
| `/api/feishu/prompts/{id}/use` | POST | 使用模板 |

### 12.4 统计相关

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/feishu/analytics` | GET | 获取统计数据 |
| `/api/feishu/analytics/export` | POST | 导出报表 |

---

## 13. 测试方案

### 13.1 单元测试

```typescript
describe('核心功能测试', () => {
  test('变量展开', () => {
    const result = expandVariables(
      'A {主体} at {时间}',
      {主体: ['城市'], 时间: ['白天','夜晚']}
    );
    expect(result).toHaveLength(2);
  });
  
  test('缓存查询', async () => {
    const cached = await checkCache('midjourney-v6', 'test prompt');
    expect(cached).toBeDefined();
  });
  
  test('成本计算', () => {
    const cost = calculateCost('midjourney-v6', 10);
    expect(cost).toBe(0.40);
  });
});
```

### 13.2 集成测试

```typescript
describe('端到端测试', () => {
  test('完整生成流程', async () => {
    // 创建任务
    const task = await createTask({...});
    expect(task.task_id).toBeDefined();
    
    // 等待完成
    await waitForCompletion(task.task_id);
    
    // 验证结果
    const results = await getResults(task.task_id);
    expect(results).toHaveLength(10);
  });
});
```

### 13.3 性能测试

```typescript
describe('性能测试', () => {
  test('页面加载时间', async () => {
    const start = Date.now();
    await loadPage('/tasks/create');
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(2000);
  });
  
  test('API响应时间', async () => {
    const start = Date.now();
    await fetch('/api/tasks');
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(500);
  });
});
```

---

## 14. 部署方案

### 14.1 环境配置

**开发环境：**
```
前端: localhost:3000
n8n: localhost:5678
飞书: 测试应用
```

**生产环境：**
```
前端: https://app.yourdomain.com (Vercel)
n8n: https://n8n.yourdomain.com (Railway)
飞书: 正式应用
```

### 14.2 环境变量

```bash
# .env.local
FEISHU_APP_ID=cli_xxx
FEISHU_APP_SECRET=xxx
FEISHU_TASKS_TABLE=xxx
FEISHU_RESULTS_TABLE=xxx
FEISHU_PROMPTS_TABLE=xxx
FEISHU_STATS_TABLE=xxx

N8N_WEBHOOK_URL=https://n8n.yourdomain.com/webhook
N8N_API_KEY=xxx

MIDJOURNEY_API_KEY=xxx
DALLE_API_KEY=xxx
RUNWAY_API_KEY=xxx

NEXT_PUBLIC_APP_URL=https://app.yourdomain.com
```

### 14.3 部署步骤

**前端部署（Vercel）：**
```bash
# 1. 连接GitHub仓库
# 2. 配置环境变量
# 3. 自动部署
```

**n8n部署（Railway）：**
```bash
# 1. 创建新项目
# 2. 添加Docker服务
# 3. 配置环境变量
# 4. 导入workflow JSON
```

---

## 15. 项目排期

### 15.1 总体时间线（4周）

```
Week 1: 基础架构 + 图片生成
Week 2: 视频生成 + 素材库
Week 3: Prompt管理 + 数据面板
Week 4: 测试 + 优化 + 上线
```

### 15.2 详细任务分解

**Week 1 (10.21-10.27):**
- [ ] Day 1-2: Next.js项目搭建、飞书SDK集成
- [ ] Day 3-4: n8n部署、工作流开发
- [ ] Day 5-7: 图片生成流程（创建+详情页）

**Week 2 (10.28-11.03):**
- [ ] Day 1-2: 视频生成流程
- [ ] Day 3-4: 素材库页面（搜索+过滤）
- [ ] Day 5-7: 批量操作、预览功能

**Week 3 (11.04-11.10):**
- [ ] Day 1-2: Prompt模板管理
- [ ] Day 3-4: 数据统计分析
- [ ] Day 5-7: 任务列表、系统设置

**Week 4 (11.11-11.17):**
- [ ] Day 1-2: 端到端测试
- [ ] Day 3-4: 性能优化、Bug修复
- [ ] Day 5: 部署上线
- [ ] Day 6-7: 文档整理、用户培训

### 15.3 里程碑

| 日期 | 里程碑 | 交付物 |
|------|--------|--------|
| 10.27 | M1: 图片生成可用 | 创建任务、查看详情 |
| 11.03 | M2: 核心功能完成 | +视频生成、素材库 |
| 11.10 | M3: 完整功能 | +模板、统计 |
| 11.17 | M4: 正式上线 | 生产环境部署 |

---

## 附录

### A. 术语表

| 术语 | 说明 |
|------|------|
| Prompt | 输入给AI的文本描述 |
| 变量 | Prompt中的{变量名}占位符 |
| 缓存 | 相同Prompt的结果复用 |
| 批量生成 | 使用变量一次生成多个 |
| 混合存储 | n8n Table + 飞书的存储策略 |
| SSE | Server-Sent Events实时推送 |

### B. 参考资料

- [飞书开放平台](https://open.feishu.cn/document)
- [n8n文档](https://docs.n8n.io)
- [Next.js 15文档](https://nextjs.org/docs)
- [MidJourney API](https://docs.midjourney.com)
- [OpenAI API](https://platform.openai.com/docs)

### C. 联系方式

**产品团队：** product@company.com  
**技术团队：** tech@company.com  
**反馈渠道：** feedback@company.com

---

**文档版本：** v1.0 Final  
**最后更新：** 2025-10-17  
**文档状态：** ✅ 待评审  
**下一步：** 技术评审 → 开发排期 → 开工

---

## 📝 评审清单

### 产品层面
- [ ] 功能优先级明确
- [ ] 用户体验流畅
- [ ] 业务逻辑完整
- [ ] 成本可控

### 技术层面
- [ ] 接口定义完整
- [ ] 字段设计合理
- [ ] 架构可扩展
- [ ] 性能可达标

### 项目层面
- [ ] 排期可行
- [ ] 风险可控
- [ ] 里程碑清晰
- [ ] 验收标准明确

**需要补充或修改的内容，请反馈！**

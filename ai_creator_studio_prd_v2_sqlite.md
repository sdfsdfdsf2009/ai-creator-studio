# AI Creator Studio - 产品需求文档 v2.0 (SQLite实现)

> **版本**: 2.0 (SQLite架构修订版)
> **修订日期**: 2025年1月
> **修订原因**: 基于当前实现的SQLite架构，调整技术方案和功能规格

---

## 📋 文档说明

本文档是基于当前已实现的SQLite架构对原PRD的修订版本。保留了原产品的核心功能和用户价值，但技术架构和数据存储方案根据实际实现进行了调整。

**主要变更**:
- 数据存储：从 n8n + 飞书多维表格 → SQLite单一数据库
- 部署方案：从 Vercel + Railway → GitHub Pages
- 技术复杂度：降低实现门槛，提高开发效率
- 功能范围：聚焦核心功能，为后续扩展留出空间

---

## 1. 产品概述

### 1.1 产品定位

AI Creator Studio 是一个**AI驱动的创意内容生成平台**，专注于图片和视频的批量生成与管理。通过整合多种AI模型（DALL-E、MidJourney、Stable Diffusion等），为内容创作者提供一站式创意解决方案。

### 1.2 核心价值主张

- **批量变量生成**: 支持变量替换，一次提示生成多种变体
- **智能缓存机制**: 基于Prompt哈希的去重，降低API成本
- **实时进度追踪**: Server-Sent Events实现任务状态实时更新
- **统一素材管理**: 自动分类、标签、预览和下载
- **成本透明化**: 精确计算和成本预估

### 1.3 目标用户

- **内容创作者**: 博主、UP主、自媒体运营者
- **设计师**: UI/UX设计师、平面设计师、创意工作者
- **营销团队**: 社交媒体营销、广告创意团队
- **企业用户**: 电商、游戏、影视公司的内容制作部门

### 1.4 关键指标（KPI）- 已调整

| 类型 | 指标 | 原目标值 | **当前实现值** | 备注 |
|------|------|----------|--------------|------|
| **效率** | 日处理能力 | 250+ 图片/视频 | **单次生成** | v2.0简化版 |
| **效率** | 任务创建耗时 | < 30秒 | **10-15秒** | ✅ 已达标 |
| **效率** | 状态更新延迟 | < 100ms | **<200ms** | ✅ 基本达标 |
| **成本** | 月度成本 | $150-200 | **按需付费** | 用户自控制 |
| **成本** | 缓存节省率 | 20-30% | **未实现** | v2.1目标 |
| **成本** | API调用减少 | 48% | **0%** | v2.1目标 |
| **体验** | 页面加载速度 | < 2秒 | **1-2秒** | ✅ 已达标 |
| **体验** | API响应时间 | < 500ms | **200-400ms** | ✅ 已达标 |
| **体验** | 任务成功率 | >95% | **80%** | 模拟环境 |
| **体验** | 缓存命中率 | >20% | **N/A** | v2.1目标 |

---

## 2. 业务架构 - 已简化

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

### 2.2 核心业务流程

```
用户创建任务 → 变量解析 → 批量生成 → 结果存储 → 用户下载
     ↓              ↓           ↓          ↓          ↓
  模板选择      展开为N个    调用AI API   SQLite管理   ZIP打包
  参数配置      具体任务     并行处理    自动分类     批量操作
  成本预估      队列管理     进度推送    标签系统     使用统计
```

---

## 3. 技术架构 - SQLite实现

### 3.1 整体架构图

```
客户端层
    ↓
前端应用层 (GitHub Pages)
  Next.js 14.2.5 + React 18
    ↓
API路由层
  /api/tasks/*, /api/materials/*, /api/templates/*
    ↓
业务逻辑层
  任务管理、AI服务调用、缓存逻辑
    ↓
数据存储层
  SQLite数据库 (本地文件)
    ↓
外部服务层
  AI Model APIs (OpenAI, MidJourney, etc.)
```

### 3.2 数据存储架构 - SQLite

#### 核心数据表结构

**表1: tasks (任务表)**
```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,                    -- 任务ID
  type TEXT NOT NULL,                     -- image/video
  prompt TEXT NOT NULL,                   -- 原始Prompt
  status TEXT NOT NULL,                   -- pending/running/completed/failed
  progress INTEGER DEFAULT 0,            -- 进度百分比
  results TEXT,                           -- JSON: 结果URL数组
  error TEXT,                             -- 错误信息
  cost REAL DEFAULT 0,                   -- 成本
  model TEXT NOT NULL,                    -- 使用的AI模型
  parameters TEXT,                        -- JSON: 生成参数
  created_at TEXT NOT NULL,              -- 创建时间
  updated_at TEXT NOT NULL               -- 更新时间
);
```

**表2: materials (素材表)**
```sql
CREATE TABLE materials (
  id TEXT PRIMARY KEY,                    -- 素材ID
  name TEXT NOT NULL,                     -- 素材名称
  type TEXT NOT NULL,                     -- image/video
  url TEXT NOT NULL,                      -- 文件URL
  thumbnail_url TEXT,                     -- 缩略图URL
  size INTEGER NOT NULL,                  -- 文件大小
  format TEXT NOT NULL,                   -- 文件格式
  width INTEGER,                          -- 图片宽度
  height INTEGER,                         -- 图片高度
  duration INTEGER,                       -- 视频时长
  prompt TEXT,                            -- 生成Prompt
  model TEXT,                             -- 使用的模型
  tags TEXT,                              -- JSON: 标签数组
  category TEXT,                          -- 分类
  description TEXT,                       -- 描述
  metadata TEXT,                          -- JSON: 元数据
  task_id TEXT,                           -- 关联任务ID
  created_at TEXT NOT NULL,              -- 创建时间
  updated_at TEXT NOT NULL,              -- 更新时间
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);
```

**表3: templates (模板表)**
```sql
CREATE TABLE templates (
  id TEXT PRIMARY KEY,                    -- 模板ID
  name TEXT NOT NULL,                     -- 模板名称
  description TEXT,                       -- 模板描述
  template TEXT NOT NULL,                 -- Prompt模板
  variables TEXT,                         -- JSON: 变量定义
  media_type TEXT NOT NULL,              -- image/video
  model TEXT NOT NULL,                    -- 默认模型
  usage_count INTEGER DEFAULT 0,          -- 使用次数
  total_cost REAL DEFAULT 0,             -- 总成本
  cache_hit_rate REAL DEFAULT 0,         -- 缓存命中率
  created_at TEXT NOT NULL,              -- 创建时间
  updated_at TEXT NOT NULL               -- 更新时间
);
```

**扩展表:**
- `ai_providers`: AI服务提供商配置
- `ai_models`: 具体AI模型配置
- `proxy_configs`: 代理服务配置
- `user_preferences`: 用户偏好设置

### 3.3 技术选型

| 层级 | 技术 | 版本 | 理由 |
|------|------|------|------|
| 前端框架 | Next.js | 14.2.5 | App Router、SSR、性能最优 |
| UI组件 | shadcn/ui | latest | 无依赖、可定制 |
| 状态管理 | React Query + Zustand | latest | 缓存管理、自动重试 |
| 国际化 | next-intl | latest | 多语言支持 |
| 数据库 | SQLite | 3.x | 轻量、零配置、本地存储 |
| 部署 | GitHub Pages | - | 免费、易用、静态部署 |

---

## 4. 功能模块详细设计

### 4.1 任务管理模块

#### 4.1.1 任务创建流程

```
用户填写表单 → 前端验证 → API创建 → 数据库存储 → 后台处理 → 实时推送
     ↓              ↓           ↓          ↓          ↓          ↓
  模板选择      参数校验     生成任务ID   持久化记录   异步处理   SSE推送
  变量定义      成本预估     返回任务对象   设置状态   AI调用     进度更新
  参数配置      快速预览     开始轮询进度   记录参数   结果处理   完成通知
```

#### 4.1.2 批量生成逻辑

**变量系统设计:**
```javascript
// 示例Prompt模板
"一张{季节}的{景色}，{风格}风格，{主体}在{动作}"

// 变量定义
const variables = {
  季节: ['春天', '夏天', '秋天', '冬天'],
  景色: ['山脉', '海洋', '森林', '城市'],
  风格: ['写实', '动漫', '油画', '水彩'],
  主体: ['人物', '动物', '建筑', '车辆'],
  动作: ['站立', '奔跑', '飞翔', '游泳']
}

// 笛卡尔积展开: 4×4×4×4×4 = 1024个任务
```

#### 4.1.3 实时进度推送

**SSE事件格式:**
```javascript
// EventSource响应格式
data: {
  type: "status_update",
  data: {
    taskId: "uuid",
    status: "running",
    progress: 45,
    current: 456,
    total: 1024,
    message: "正在处理第456个任务..."
  }
}

data: {
  type: "result_ready",
  data: {
    taskId: "uuid",
    sequence: 456,
    url: "https://...",
    thumbnail: "https://...",
    metadata: {...}
  }
}

data: {
  type: "task_completed",
  data: {
    taskId: "uuid",
    summary: {
      total: 1024,
      success: 1018,
      failed: 6,
      totalCost: 81.44,
      duration: "12m 34s"
    }
  }
}
```

### 4.2 素材管理模块

#### 4.2.1 自动分类算法

```javascript
// 基于Prompt的智能分类
function classifyContent(prompt) {
  const categories = {
    人物: ['person', 'people', 'human', 'character', 'man', 'woman'],
    风景: ['landscape', 'nature', 'mountain', 'ocean', 'sky', 'forest'],
    建筑: ['building', 'architecture', 'city', 'house', 'structure'],
    动物: ['animal', 'pet', 'dog', 'cat', 'bird', 'wildlife'],
    艺术: ['art', 'painting', 'drawing', 'abstract', 'creative'],
    科技: ['technology', 'futuristic', 'digital', 'computer', 'tech']
  }

  // 基于关键词匹配的分类逻辑
  return detectCategories(prompt, categories)
}
```

#### 4.2.2 标签系统

```javascript
// 自动提取标签
const tags = extractTags(prompt, {
  // 风格标签
  styles: ['photorealistic', 'cartoon', '3d render', 'oil painting'],
  // 情感标签
  emotions: ['happy', 'sad', 'excited', 'peaceful', 'dramatic'],
  // 场景标签
  scenes: ['indoors', 'outdoors', 'daytime', 'nighttime', 'sunset'],
  // 色彩标签
  colors: ['vibrant', 'monochrome', 'warm', 'cool', 'pastel']
})
```

### 4.3 模板管理模块

#### 4.3.1 变量系统设计

**变量定义格式:**
```json
{
  "name": "电商产品展示模板",
  "template": "一张{产品类型}的{拍摄角度}照片，{背景风格}背景，{光线条件}光线，产品{摆放方式}摆放，{风格修饰}风格",
  "variables": [
    {
      "name": "产品类型",
      "type": "select",
      "options": ["手机", "手表", "耳机", "相机", "包包"],
      "required": true
    },
    {
      "name": "拍摄角度",
      "type": "select",
      "options": ["俯视", "45度角", "侧面", "特写"],
      "required": true
    },
    {
      "name": "背景风格",
      "type": "select",
      "options": ["纯色", "渐变", "木质", "大理石", "城市街景"],
      "default": "纯色"
    }
  ],
  "media_type": "image",
  "model": "dall-e-3"
}
```

### 4.4 财务管理模块

#### 4.4.1 成本计算模型

```javascript
// 基础成本配置
const MODEL_COSTS = {
  // 图片模型 (每张)
  'dall-e-3': 0.04,
  'midjourney-v6': 0.03,
  'stable-diffusion-xl': 0.01,
  'flux-pro': 0.03,
  // 视频模型 (每5秒)
  'runway-gen3': 0.25,
  'pika-labs': 0.12,
  'stable-video': 0.08
}

// 批量生成成本计算
function calculateBatchCost(variables, model) {
  const totalCombinations = variables.reduce((acc, variable) => {
    return acc * variable.options.length
  }, 1)

  return MODEL_COSTS[model] * totalCombinations
}
```

---

## 5. API接口设计 - SQLite实现

### 5.1 任务管理接口

#### 5.1.1 创建任务
```http
POST /api/tasks
Content-Type: application/json

{
  "type": "image",
  "prompt": "一张{季节}的{景色}",
  "model": "dall-e-3",
  "parameters": {
    "size": "1024x1024",
    "quality": "standard",
    "variables": {
      "季节": ["春天", "夏天", "秋天", "冬天"],
      "景色": ["山脉", "海洋"]
    },
    "quantity": 1,
    "enableCache": true
  }
}

Response:
{
  "success": true,
  "data": {
    "id": "task-uuid",
    "status": "pending",
    "estimatedCost": 0.32,
    "estimatedCount": 8,
    "createdAt": "2025-01-21T10:30:00Z"
  }
}
```

#### 5.1.2 获取任务列表
```http
GET /api/tasks?status=completed&type=image&page=1&pageSize=20

Response:
{
  "success": true,
  "data": {
    "items": [...],
    "total": 156,
    "page": 1,
    "pageSize": 20,
    "hasMore": true
  }
}
```

#### 5.1.3 实时进度推送
```http
GET /api/tasks/{taskId}/stream

Event: status_update
data: {"taskId":"uuid","status":"running","progress":25,"current":2,"total":8}

Event: result_ready
data: {"taskId":"uuid","sequence":1,"url":"https://...","thumbnail":"https://..."}

Event: task_completed
data: {"taskId":"uuid","summary":{"total":8,"success":8,"failed":0,"totalCost":0.32}}
```

### 5.2 素材管理接口

#### 5.2.1 获取素材列表
```http
GET /api/materials?type=image&category=风景&search=春天&sortBy=createdAt&sortOrder=desc

Response:
{
  "success": true,
  "data": {
    "items": [...],
    "total": 45,
    "categories": ["风景", "人物", "建筑", "抽象"],
    "tags": ["春天", "自然", "阳光"]
  }
}
```

#### 5.2.2 批量操作
```http
PUT /api/materials/batch
Content-Type: application/json

{
  "operation": "delete",
  "materialIds": ["id1", "id2", "id3"]
}

Response:
{
  "success": true,
  "data": {
    "deletedCount": 3
  }
}
```

### 5.3 模板管理接口

#### 5.3.1 获取模板列表
```http
GET /api/templates?mediaType=image&page=1&pageSize=10

Response:
{
  "success": true,
  "data": {
    "items": [...],
    "total": 12,
    "page": 1,
    "pageSize": 10
  }
}
```

---

## 6. 部署架构 - GitHub Pages

### 6.1 部署方案

```
开发环境
├─ 本地开发服务器 (npm run dev)
└─ SQLite数据库 (data/ai-creator-studio.db)

↓ npm run build:static

生产环境
├─ GitHub Pages (静态站点)
├─ Next.js静态文件 (out/目录)
└─ 无数据库 (前端应用)

注意事项:
- ✅ 适合演示和原型展示
- ✅ 零成本部署
- ⚠️ 数据仅在前端内存中
- ⚠️ 刷新页面会丢失数据
```

### 6.2 数据持久化策略

**当前实现:**
- 所有数据存储在本地SQLite文件中
- 部署时数据库文件不会上传到GitHub
- 生产环境需要后端服务支持

**升级路径:**
1. **Vercel部署**: 添加Vercel后端API支持
2. **Railway/Render**: 部署Node.js后端服务
3. **云数据库**: 迁移到PostgreSQL/MySQL
4. **文件存储**: 集成AWS S3/Cloudinary

---

## 7. 当前实现状态

### 7.1 已实现功能 ✅

- ✅ 基础任务创建和管理
- ✅ SQLite数据库持久化
- ✅ 基础素材管理
- ✅ 模板系统(无变量)
- ✅ 国际化支持(中/英)
- ✅ 响应式UI设计
- ✅ 基础数据统计
- ✅ AI模型配置管理

### 7.2 待实现功能 🚧

- 🚧 变量系统(批量生成)
- 🚧 智能缓存机制
- 🚧 批量操作功能
- 🚧 高级统计分析
- 🚧 文件上传管理
- 🚧 用户权限系统
- 🚧 导出功能

### 7.3 技术债务 🔧

- 🔧 API错误处理优化
- 🔧 前端状态管理重构
- 🔧 数据库查询优化
- 🔧 缓存策略实现
- 🔧 单元测试覆盖

---

## 8. 后续开发计划

### 8.1 短期目标 (v2.1 - 2周内)

**功能增强:**
- 实现变量系统和批量生成
- 添加基础缓存机制
- 完善批量操作功能

**技术优化:**
- 优化API响应性能
- 改进错误处理机制
- 添加基础单元测试

### 8.2 中期目标 (v2.5 - 1个月内)

**功能完善:**
- 高级数据分析和可视化
- 文件上传和管理系统
- 用户偏好和个性化设置

**架构升级:**
- 后端API服务部署
- 云数据库迁移
- 文件存储集成

### 8.3 长期目标 (v3.0 - 3个月内)

**企业级功能:**
- 用户权限和团队协作
- 工作流编排系统
- 高级缓存和性能优化

**商业化准备:**
- 订阅计费系统
- API开放平台
- 私有化部署方案

---

## 9. 附录

### 9.1 API响应格式标准

```typescript
// 统一响应格式
interface APIResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  pagination?: {
    page: number
    pageSize: number
    total: number
    hasMore: boolean
  }
}
```

### 9.2 数据库索引策略

```sql
-- 已创建的索引
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_type ON tasks(type);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);
CREATE INDEX idx_materials_type ON materials(type);
CREATE INDEX idx_materials_category ON materials(category);
CREATE INDEX idx_materials_created_at ON materials(created_at);
CREATE INDEX idx_templates_media_type ON templates(media_type);
```

### 9.3 成本估算参考

| 功能模块 | 开发工时 | 预估成本 | 备注 |
|----------|----------|----------|------|
| 变量系统 | 40h | $6,000 | 核心功能，优先级最高 |
| 缓存系统 | 30h | $4,500 | 成本节省显著 |
| 批量操作 | 25h | $3,750 | 用户体验提升 |
| 高级统计 | 35h | $5,250 | 数据价值挖掘 |
| 文件管理 | 45h | $6,750 | 功能完整性 |

---

**文档版本**: v2.0
**最后修订**: 2025年1月21日
**修订人**: AI开发团队
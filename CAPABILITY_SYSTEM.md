# 能力系统架构使用指南

## 🎯 概述

本项目的能力系统是一个模块化的架构设计，将复杂的功能封装成独立、可重用的能力组件。系统采用依赖注入和工作流编排模式，支持灵活的功能组合和扩展。

## 📋 核心能力列表

### 1. **VideoGenerationCapability** - 视频生成能力
- **功能**: 同步/异步视频生成、轮询管理、批量生成
- **适用场景**: 视频内容创作、动画生成、素材制作

### 2. **ImageGenerationCapability** - 图像生成能力
- **功能**: 单张/批量图像生成、多模型对比、图像变体
- **适用场景**: 图像创作、设计素材、营销内容

### 3. **TaskManagementCapability** - 任务管理能力
- **功能**: 任务CRUD、状态管理、批量操作、统计分析
- **适用场景**: 任务跟踪、进度监控、批量处理

### 4. **AsyncProcessingCapability** - 异步处理能力
- **功能**: 异步任务执行、超时管理、重试机制、状态跟踪
- **适用场景**: 长时间运行的任务、外部API调用、后台处理

### 5. **BatchProcessingCapability** - 批量处理能力
- **功能**: CSV数据处理、批量任务创建、变量映射、进度跟踪
- **适用场景**: 批量内容生成、数据导入、自动化工作流

### 6. **AssetManagementCapability** - 资产管理能力
- **功能**: 素材库集成、文件管理、元数据管理、搜索过滤
- **适用场景**: 媒体资源管理、内容库维护、素材组织

### 7. **ExternalIntegrationCapability** - 外部集成能力
- **功能**: 飞书集成、webhook支持、第三方API集成、数据同步
- **适用场景**: 团队协作、通知推送、数据同步

## 🚀 快速开始

### 基础使用

```typescript
import {
  useVideoGeneration,
  useImageGeneration,
  useTaskManagement,
  CapabilityComposer
} from '@/lib/capabilities'

// 1. 使用单个能力
const videoGen = await useVideoGeneration()
const result = await videoGen.generateVideo(
  "美丽的日落风景",
  "Veo 3 Fast (EvoLink)",
  { duration: 5 }
)

// 2. 使用能力组合器（推荐）
const result = await CapabilityComposer.generateVideoWorkflow(
  "A beautiful sunset over mountains",
  "Veo 3 Fast (EvoLink)",
  { duration: 5 },
  ["https://example.com/image.jpg"] // 可选的参考图像
)
```

### API端点使用

#### 创建任务
```bash
POST /api/tasks-new/
Content-Type: application/json

{
  "type": "video",
  "prompt": "A beautiful sunset over mountains",
  "model": "Veo 3 Fast (EvoLink)",
  "parameters": {
    "duration": 5
  },
  "imageUrls": ["https://example.com/reference.jpg"]
}
```

#### 获取任务列表
```bash
GET /api/tasks-new/?limit=10&page=1&status=completed
```

#### 轮询任务状态
```bash
GET /api/tasks-new/{taskId}/poll/
```

## 🏗️ 架构设计

### 核心组件

1. **BaseCapability**: 抽象基类，定义能力的基本接口
2. **CapabilityManager**: 单例管理器，负责能力的注册、初始化和生命周期管理
3. **CapabilityFactory**: 工厂类，负责创建能力实例
4. **CapabilityComposer**: 组合器，提供高级工作流编排

### 设计模式

- **单例模式**: CapabilityManager确保全局唯一实例
- **工厂模式**: CapabilityFactory负责能力实例创建
- **依赖注入**: 能力之间通过接口解耦
- **组合模式**: CapabilityComposer组合多个能力实现复杂工作流

## 📝 使用示例

### 示例1: 简单视频生成
```typescript
import { useVideoGeneration } from '@/lib/capabilities'

async function generateVideo() {
  const videoGen = await useVideoGeneration()
  const result = await videoGen.generateVideo(
    "一只可爱的小猫在花园里玩耍",
    "Veo 3 Fast (EvoLink)",
    { duration: 10 }
  )

  if (result.success) {
    console.log("视频生成成功:", result.data)
  } else {
    console.error("视频生成失败:", result.error)
  }
}
```

### 示例2: 复杂工作流
```typescript
import { CapabilityComposer } from '@/lib/capabilities'

async function completeWorkflow() {
  const result = await CapabilityComposer.generateVideoWorkflow(
    "我在深圳工作，早上起床，梦想在泰山山顶看日出",
    "Veo 3 Fast (EvoLink)",
    {
      duration: 15,
      quality: "high"
    },
    [
      "https://example.com/sunrise.jpg",
      "https://example.com/mountain.jpg"
    ]
  )

  // 自动处理: 任务创建 → 视频生成 → 结果保存 → 素材库集成
  console.log("工作流完成:", result)
}
```

### 示例3: 自定义能力组合
```typescript
import {
  useTaskManagement,
  useVideoGeneration,
  useAssetManagement
} from '@/lib/capabilities'

async function customWorkflow() {
  const taskManager = await useTaskManagement()
  const videoGen = await useVideoGeneration()
  const assetManager = await useAssetManagement()

  // 创建任务
  const task = await taskManager.createTask({
    type: 'video',
    prompt: '创意动画场景',
    model: 'Veo 3 Fast (EvoLink)'
  })

  // 生成视频
  const videoResult = await videoGen.generateVideo(
    task.prompt,
    task.model,
    { duration: 8 }
  )

  // 保存到素材库
  if (videoResult.success) {
    await assetManager.saveToLibrary(
      task.id,
      [videoResult.data],
      { tags: ['动画', '创意'], category: 'video' }
    )
  }

  return { task, videoResult }
}
```

## 🔧 开发指南

### 添加新能力

1. **创建能力类**:
```typescript
// src/lib/capabilities/my-capability.ts
import { BaseCapability, CapabilityResult } from './base'

export class MyCapability extends BaseCapability {
  constructor() {
    super('MyCapability', '1.0.0', '我的自定义能力')
  }

  async doSomething(input: string): Promise<CapabilityResult<string>> {
    this.ensureInitialized()

    try {
      // 实现你的逻辑
      const result = `处理结果: ${input}`
      return this.createResult(true, result)
    } catch (error) {
      return this.createResult(false, undefined, error.message)
    }
  }

  protected async onInitialize(): Promise<void> {
    // 初始化逻辑
    console.log('MyCapability 初始化完成')
  }
}
```

2. **注册能力**:
```typescript
// src/lib/capabilities/my-capability.ts
import { registerCapability } from './manager'

registerCapability('MyCapability', MyCapability)
```

3. **导出便捷函数**:
```typescript
// src/lib/capabilities/index.ts
export { MyCapability } from './my-capability'

export async function useMyCapability(): Promise<MyCapability> {
  const { getCapability } = await import('./manager')
  const capability = await getCapability<MyCapability>('MyCapability')
  if (!capability) {
    throw new Error('我的能力不可用')
  }
  return capability
}
```

### 能力配置

```typescript
// 能力初始化时的配置
const config: CapabilityConfig = {
  enabled: true,
  retryAttempts: 3,
  timeout: 30000,
  customSettings: {
    apiKey: 'your-api-key',
    endpoint: 'https://api.example.com'
  }
}
```

## 🔍 监控和调试

### 健康检查
```typescript
import { checkCapabilityHealth } from '@/lib/capabilities'

const health = await checkCapabilityHealth()
console.log('能力系统健康状态:', health)
```

### 能力状态查看
```typescript
import { getAvailableCapabilities } from '@/lib/capabilities'

const capabilities = getAvailableCapabilities()
console.log('可用能力:', capabilities)
```

### 日志输出
能力系统提供详细的日志输出，包括：
- 能力初始化状态
- 任务执行进度
- 错误信息和重试机制
- 性能指标

## 📊 性能优化

### 缓存策略
- 能力实例缓存：避免重复创建
- 结果缓存：减少重复计算
- 连接池管理：优化资源使用

### 异步处理
- 所有能力操作都是异步的
- 支持并发执行
- 智能超时和重试机制

## 🚨 注意事项

1. **初始化顺序**: 确保在使用能力前先调用 `initializeCapabilitySystem()`
2. **错误处理**: 所有能力调用都应该检查返回结果的 `success` 字段
3. **资源管理**: 及时释放不需要的能力实例
4. **配置管理**: 敏感信息应通过环境变量或配置文件管理

## 📚 更多资源

- [API参考文档](./API_REFERENCE.md)
- [架构设计文档](./ARCHITECTURE.md)
- [故障排除指南](./TROUBLESHOOTING.md)
- [最佳实践](./BEST_PRACTICES.md)

---

**版本**: 1.0.0
**最后更新**: 2025-10-27
**维护者**: AI Creator Studio Team
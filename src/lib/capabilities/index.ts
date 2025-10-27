/**
 * 能力系统统一入口
 * 提供能力初始化、管理和便捷访问功能
 */

// 导出基础接口和类型
export * from './base'

// 导出能力管理器 - 避免循环依赖，直接导出
export {
  capabilityFactory,
  capabilityManager,
  executeCapability,
  registerCapability,
  initializeCapabilities,
  shutdownCapabilities,
  capability,
  inject
} from './manager'

// 延迟导出这些函数，避免循环依赖
export { getAvailableCapabilities } from './manager'

// 导出具体能力类
export { VideoGenerationCapability } from './video-generation'
export { ImageGenerationCapability } from './image-generation'
export { TaskManagementCapability } from './task-management'
export { AsyncProcessingCapability } from './async-processing'
export { BatchProcessingCapability, type Variable, type CSVData, type CSVBatchConfig } from './batch-processing'
export { AssetManagementCapability } from './asset-management'
export { ExternalIntegrationCapability } from './external-integration'

// 导出所有能力的注册（自动注册）
import './video-generation'
import './image-generation'
import './task-management'
import './async-processing'
import './batch-processing'
import './asset-management'
import './external-integration'

/**
 * 能力系统初始化
 */
export async function initializeCapabilitySystem(): Promise<void> {
  console.log('🚀 初始化能力系统...')

  try {
    // 初始化能力管理器
    const { capabilityManager } = await import('./manager')
    await capabilityManager.initialize()

    // 获取可用能力列表
    const { getAvailableCapabilities } = await import('./manager')
    console.log('✅ 能力系统初始化完成')
    console.log('📋 可用能力列表:', getAvailableCapabilities())

  } catch (error) {
    console.error('❌ 能力系统初始化失败:', error)
    throw error
  }
}

/**
 * 获取能力实例的便捷函数 - 使用动态导入避免循环依赖
 */
export async function useVideoGeneration(): Promise<VideoGenerationCapability> {
  const { getCapability } = await import('./manager')
  const capability = await getCapability<VideoGenerationCapability>('VideoGeneration')
  if (!capability) {
    throw new Error('视频生成能力不可用')
  }
  return capability
}

export async function useImageGeneration(): Promise<ImageGenerationCapability> {
  const { getCapability } = await import('./manager')
  const capability = await getCapability<ImageGenerationCapability>('ImageGeneration')
  if (!capability) {
    throw new Error('图像生成能力不可用')
  }
  return capability
}

export async function useTaskManagement(): Promise<TaskManagementCapability> {
  const { getCapability } = await import('./manager')
  const capability = await getCapability<TaskManagementCapability>('TaskManagement')
  if (!capability) {
    throw new Error('任务管理能力不可用')
  }
  return capability
}

export async function useAsyncProcessing(): Promise<AsyncProcessingCapability> {
  const { getCapability } = await import('./manager')
  const capability = await getCapability<AsyncProcessingCapability>('AsyncProcessing')
  if (!capability) {
    throw new Error('异步处理能力不可用')
  }
  return capability
}

export async function useBatchProcessing(): Promise<BatchProcessingCapability> {
  const { getCapability } = await import('./manager')
  const capability = await getCapability<BatchProcessingCapability>('BatchProcessing')
  if (!capability) {
    throw new Error('批量处理能力不可用')
  }
  return capability
}

export async function useAssetManagement(): Promise<AssetManagementCapability> {
  const { getCapability } = await import('./manager')
  const capability = await getCapability<AssetManagementCapability>('AssetManagement')
  if (!capability) {
    throw new Error('素材管理能力不可用')
  }
  return capability
}

export async function useExternalIntegration(): Promise<ExternalIntegrationCapability> {
  const { getCapability } = await import('./manager')
  const capability = await getCapability<ExternalIntegrationCapability>('ExternalIntegration')
  if (!capability) {
    throw new Error('外部集成能力不可用')
  }
  return capability
}

/**
 * 能力组合器 - 提供常见的能力组合使用模式
 */
export class CapabilityComposer {
  /**
   * 完整的图像生成流程
   */
  static async generateImageWorkflow(
    prompt: string,
    model: string,
    options?: any
  ): Promise<any> {
    const taskManager = await useTaskManagement()
    const imageGen = await useImageGeneration()
    const assetManager = await useAssetManagement()
    const externalIntegration = await useExternalIntegration()

    try {
      // 1. 创建任务
      const taskResult = await taskManager.createTask({
        type: 'image',
        prompt,
        model,
        parameters: options
      })

      if (!taskResult.success || !taskResult.data) {
        throw new Error(taskResult.error || '任务创建失败')
      }

      const task = taskResult.data

      // 2. 生成图像
      const imageResult = await imageGen.generateImage(prompt, model, options)

      if (!imageResult.success || !imageResult.data) {
        await taskManager.updateTaskStatus(task.id, 'failed', 0, imageResult.error)
        throw new Error(imageResult.error || '图像生成失败')
      }

      // 3. 保存到素材库
      const assetResult = await assetManager.saveToLibrary(
        task.id,
        [imageResult.data.url],
        {
          taskId: task.id,
          model,
          prompt,
          parameters: options || {}
        }
      )

      // 4. 更新任务状态
      await taskManager.updateTaskStatus(task.id, 'completed', 100)
      await taskManager.updateTaskResults(task.id, [imageResult.data.url])

      // 5. 同步到外部服务
      try {
        await externalIntegration.integrateWithFeishu({
          taskId: task.id,
          type: 'image',
          prompt,
          model,
          parameters: options || {},
          results: [imageResult.data.url]
        })
      } catch (error) {
        console.warn('外部集成失败:', error)
      }

      return {
        task,
        image: imageResult.data,
        assets: assetResult.data || []
      }

    } catch (error) {
      console.error('图像生成工作流失败:', error)
      throw error
    }
  }

  /**
   * 完整的视频生成流程
   */
  static async generateVideoWorkflow(
    prompt: string,
    model: string,
    options?: any,
    imageUrls?: string[]
  ): Promise<any> {
    const taskManager = await useTaskManagement()
    const videoGen = await useVideoGeneration()
    const asyncProcessing = await useAsyncProcessing()
    const assetManager = await useAssetManagement()
    const externalIntegration = await useExternalIntegration()

    try {
      // 1. 创建任务
      const taskResult = await taskManager.createTask({
        type: 'video',
        prompt,
        model,
        parameters: options,
        imageUrls
      })

      if (!taskResult.success || !taskResult.data) {
        throw new Error(taskResult.error || '任务创建失败')
      }

      const task = taskResult.data

      // 2. 生成视频
      const videoResult = await videoGen.generateVideo(prompt, model, options, imageUrls)

      if (!videoResult.success) {
        await taskManager.updateTaskStatus(task.id, 'failed', 0, videoResult.error)
        throw new Error(videoResult.error || '视频生成失败')
      }

      // 3. 处理结果
      if (videoResult.metadata?.isAsync) {
        // 异步视频生成
        const externalTaskId = videoResult.data as string

        const asyncResult = await asyncProcessing.executeAsyncTask({
          taskId: task.id,
          executor: async () => {
            const result = await videoGen.handleAsyncVideo(task.id, externalTaskId, model)
            if (!result.success) {
              throw new Error(result.error || '异步视频处理失败')
            }
            return result.data
          },
          onProgress: (progress) => {
            taskManager.updateTaskStatus(task.id, 'running', progress)
          },
          timeout: 10 * 60 * 1000 // 10分钟
        })

        if (!asyncResult.success) {
          throw new Error(asyncResult.error || '异步视频任务失败')
        }

        // 保存到素材库
        const assetResult = await assetManager.saveToLibrary(
          task.id,
          asyncResult.data!.map(v => v.url),
          {
            taskId: task.id,
            model,
            prompt,
            parameters: options || {}
          }
        )

        return {
          task,
          videos: asyncResult.data,
          assets: assetResult.data || [],
          isAsync: true
        }

      } else {
        // 同步视频生成
        const videos = videoResult.data as any[]

        // 保存到素材库
        const assetResult = await assetManager.saveToLibrary(
          task.id,
          videos.map(v => v.url),
          {
            taskId: task.id,
            model,
            prompt,
            parameters: options || {}
          }
        )

        // 更新任务状态
        await taskManager.updateTaskStatus(task.id, 'completed', 100)
        await taskManager.updateTaskResults(task.id, videos.map(v => v.url))

        // 同步到外部服务
        try {
          await externalIntegration.integrateWithFeishu({
            taskId: task.id,
            type: 'video',
            prompt,
            model,
            parameters: options || {},
            results: videos.map(v => v.url)
          })
        } catch (error) {
          console.warn('外部集成失败:', error)
        }

        return {
          task,
          videos,
          assets: assetResult.data || [],
          isAsync: false
        }
      }

    } catch (error) {
      console.error('视频生成工作流失败:', error)
      throw error
    }
  }

  /**
   * 批量生成工作流
   */
  static async batchGenerateWorkflow(
    prompts: string[],
    model: string,
    options?: any
  ): Promise<any> {
    const taskManager = await useTaskManagement()
    const batchProcessing = await useBatchProcessing()
    const asyncProcessing = await useAsyncProcessing()

    try {
      // 1. 创建批量任务
      const batchResult = await batchProcessing.createVariableBatch({
        name: `批量生成 - ${prompts.length}个提示词`,
        basePrompt: prompts[0],
        mediaType: 'image', // 可以根据需要调整
        models: [{ modelId: model, quantity: 1 }],
        variables: {}
      })

      if (!batchResult.success) {
        throw new Error(batchResult.error || '批量任务创建失败')
      }

      // 2. 执行批量任务
      const executeResult = await batchProcessing.executeBatchTask(
        batchResult.data!.batchTaskId,
        3 // 并发数
      )

      if (!executeResult.success) {
        throw new Error(executeResult.error || '批量任务执行失败')
      }

      return executeResult.data

    } catch (error) {
      console.error('批量生成工作流失败:', error)
      throw error
    }
  }
}

/**
 * 能力健康检查
 */
export async function checkCapabilityHealth(): Promise<{
  healthy: boolean
  capabilities: Record<string, {
    available: boolean
    initialized: boolean
    error?: string
  }>
}> {
  const capabilities = getAvailableCapabilities()
  const results: Record<string, any> = {}
  let overallHealthy = true

  for (const capabilityName of capabilities) {
    try {
      const capability = await getCapability(capabilityName)
      results[capabilityName] = {
        available: !!capability,
        initialized: capability?.isInitialized() || false
      }

      if (!capability) {
        overallHealthy = false
        results[capabilityName].error = '能力不可用'
      } else if (!capability.isInitialized()) {
        overallHealthy = false
        results[capabilityName].error = '能力未初始化'
      }

    } catch (error) {
      overallHealthy = false
      results[capabilityName] = {
        available: false,
        initialized: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  return {
    healthy: overallHealthy,
    capabilities: results
  }
}
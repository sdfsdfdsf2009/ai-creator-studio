/**
 * 统一的轮询管理器
 * 用于处理所有异步任务的状态查询，避免代码重复
 */

export interface PollingOptions {
  maxWaitTime?: number // 最大等待时间（毫秒）
  initialDelay?: number // 初始延迟（毫秒）
  maxDelay?: number // 最大延迟（毫秒）
  backoffFactor?: number // 退避因子
  onProgress?: (progress: number, status: string) => void // 进度回调
}

export interface PollingResult {
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  results?: string[]
  error?: string
  rawData?: any // 原始API响应数据
}

export interface TaskProvider {
  pollVideoTask(taskId: string, apiUrl: string): Promise<PollingResult>
  pollImageTask?(taskId: string, apiUrl: string): Promise<PollingResult>
  getApiEndpoint(mediaType: string, model: string): Promise<string>
  getPollingEndpoint?(mediaType: string, model: string): Promise<string>
}

/**
 * 统一的轮询管理器类
 */
export class PollingManager {
  private static instance: PollingManager

  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): PollingManager {
    if (!PollingManager.instance) {
      PollingManager.instance = new PollingManager()
    }
    return PollingManager.instance
  }

  /**
   * 通用的轮询方法
   */
  async pollTask(
    provider: TaskProvider,
    taskId: string,
    mediaType: 'video' | 'image',
    model: string,
    options: PollingOptions = {}
  ): Promise<PollingResult> {
    const {
      maxWaitTime = 10 * 60 * 1000, // 默认10分钟
      initialDelay = 2000, // 默认初始延迟2秒
      maxDelay = 30000, // 默认最大延迟30秒
      backoffFactor = 1.5, // 默认退避因子1.5
      onProgress
    } = options

    console.log(`🔄 [POLLING-MANAGER] 开始轮询任务: ${taskId}`)
    console.log(`📋 [POLLING-MANAGER] 配置:`, {
      mediaType,
      model,
      maxWaitTime: `${maxWaitTime / 1000}s`,
      initialDelay: `${initialDelay / 1000}s`
    })

    const startTime = Date.now()
    let currentDelay = initialDelay
    let attemptCount = 0

    // 等待初始延迟
    if (initialDelay > 0) {
      console.log(`⏳ [POLLING-MANAGER] 初始等待 ${initialDelay / 1000}s...`)
      await new Promise(resolve => setTimeout(resolve, initialDelay))
    }

    while (Date.now() - startTime < maxWaitTime) {
      attemptCount++
      console.log(`🔍 [POLLING-MANAGER] 轮询尝试 #${attemptCount}`)

      try {
        // 获取正确的API端点
        const apiUrl = await (provider.getPollingEndpoint ?
          provider.getPollingEndpoint(mediaType, model) :
          provider.getApiEndpoint(mediaType, model))

        console.log(`🌐 [POLLING-MANAGER] 轮询URL: ${apiUrl}`)

        // 执行轮询
        let result: PollingResult
        if (mediaType === 'video' && provider.pollVideoTask) {
          result = await provider.pollVideoTask(taskId, apiUrl)
        } else if (mediaType === 'image' && provider.pollImageTask) {
          result = await provider.pollImageTask(taskId, apiUrl)
        } else {
          throw new Error(`不支持的媒体类型: ${mediaType}`)
        }

        console.log(`📊 [POLLING-MANAGER] 轮询结果:`, {
          status: result.status,
          progress: result.progress,
          hasResults: !!(result.results && result.results.length > 0),
          error: result.error
        })

        // 调用进度回调
        if (onProgress) {
          onProgress(result.progress, result.status)
        }

        // 检查是否完成
        if (result.status === 'completed') {
          console.log(`✅ [POLLING-MANAGER] 任务完成: ${taskId}`)
          if (result.results && result.results.length > 0) {
            console.log(`🎯 [POLLING-MANAGER] 获得 ${result.results.length} 个结果`)
          }
          return result
        }

        // 检查是否失败
        if (result.status === 'failed') {
          console.error(`❌ [POLLING-MANAGER] 任务失败: ${taskId}`, result.error)
          return result
        }

        // 仍在进行中，计算下次延迟
        if (result.status === 'pending' || result.status === 'processing') {
          console.log(`⏳ [POLLING-MANAGER] 任务进行中: ${result.status} (${result.progress}%)`)

          // 指数退避算法
          const nextDelay = Math.min(currentDelay * backoffFactor, maxDelay)
          currentDelay = nextDelay

          console.log(`⏰ [POLLING-MANAGER] 下次轮询间隔: ${currentDelay / 1000}s`)
          await new Promise(resolve => setTimeout(resolve, currentDelay))
          continue
        }

        // 未知状态，当作处理中
        console.warn(`⚠️ [POLLING-MANAGER] 未知状态: ${result.status}，继续轮询`)
        await new Promise(resolve => setTimeout(resolve, currentDelay))

      } catch (error: any) {
        console.error(`❌ [POLLING-MANAGER] 轮询出错:`, error)

        // 错误分类处理
        if (this.isNetworkError(error)) {
          console.log(`🔄 [POLLING-MANAGER] 网络错误，${currentDelay / 1000}s后重试`)
          await new Promise(resolve => setTimeout(resolve, currentDelay))
          // 网络错误时增加延迟
          currentDelay = Math.min(currentDelay * backoffFactor, maxDelay)
          continue
        }

        if (this.isAuthError(error)) {
          console.error(`🚫 [POLLING-MANAGER] 认证错误，停止轮询`)
          return {
            status: 'failed',
            progress: 0,
            error: `API认证失败: ${error.message}`
          }
        }

        if (this.isNotFoundError(error)) {
          console.error(`🔍 [POLLING-MANAGER] 任务不存在，停止轮询`)
          return {
            status: 'failed',
            progress: 0,
            error: `任务不存在或已被删除: ${error.message}`
          }
        }

        // 其他错误，重试
        console.log(`🔄 [POLLING-MANAGER] 其他错误，${currentDelay / 1000}s后重试`)
        await new Promise(resolve => setTimeout(resolve, currentDelay))
        currentDelay = Math.min(currentDelay * backoffFactor, maxDelay)
      }
    }

    // 超时
    console.error(`⏰ [POLLING-MANAGER] 轮询超时: ${taskId}`)
    return {
      status: 'failed',
      progress: 0,
      error: `轮询超时 (${maxWaitTime / 1000}s)`
    }
  }

  /**
   * 批量轮询多个任务
   */
  async pollMultipleTasks(
    tasks: Array<{
      taskId: string
      mediaType: 'video' | 'image'
      model: string
      provider: TaskProvider
      options?: PollingOptions
    }>
  ): Promise<Array<{ taskId: string; result: PollingResult }>> {
    console.log(`📦 [POLLING-MANAGER] 开始批量轮询 ${tasks.length} 个任务`)

    // 并发轮询所有任务
    const promises = tasks.map(async ({ taskId, mediaType, model, provider, options }) => {
      try {
        const result = await this.pollTask(provider, taskId, mediaType, model, options)
        return { taskId, result }
      } catch (error: any) {
        console.error(`❌ [POLLING-MANAGER] 批量轮询任务失败 ${taskId}:`, error)
        return {
          taskId,
          result: {
            status: 'failed',
            progress: 0,
            error: error.message || '批量轮询失败'
          }
        }
      }
    })

    const results = await Promise.all(promises)
    console.log(`✅ [POLLING-MANAGER] 批量轮询完成: ${results.length} 个任务`)

    return results
  }

  /**
   * 检查是否为网络错误
   */
  private isNetworkError(error: any): boolean {
    return error.code === 'ECONNRESET' ||
           error.code === 'ETIMEDOUT' ||
           error.code === 'ENOTFOUND' ||
           error.message?.includes('Network') ||
           error.message?.includes('fetch')
  }

  /**
   * 检查是否为认证错误
   */
  private isAuthError(error: any): boolean {
    return error.message?.includes('401') ||
           error.message?.includes('403') ||
           error.message?.includes('Unauthorized') ||
           error.message?.includes('Forbidden')
  }

  /**
   * 检查是否为404错误
   */
  private isNotFoundError(error: any): boolean {
    return error.message?.includes('404') ||
           error.message?.includes('Not Found')
  }
}

/**
 * 获取轮询管理器实例
 */
export const pollingManager = PollingManager.getInstance()

/**
 * 便捷的轮询函数
 */
export async function pollAsyncTask(
  provider: TaskProvider,
  taskId: string,
  mediaType: 'video' | 'image',
  model: string,
  options?: PollingOptions
): Promise<PollingResult> {
  return pollingManager.pollTask(provider, taskId, mediaType, model, options)
}
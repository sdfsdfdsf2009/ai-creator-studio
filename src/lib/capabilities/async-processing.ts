/**
 * 异步处理能力
 * 通用的异步任务处理框架，支持重试、超时、进度回调等
 */

import { BaseCapability, AsyncTaskConfig, PollingConfig, AsyncContext, ErrorHandlingResult, CapabilityResult, CapabilityConfig } from './base'
import { registerCapability } from './manager'

export class AsyncProcessingCapability extends BaseCapability {
  private activeTasks = new Map<string, AbortController>()
  private taskMetrics = new Map<string, {
    startTime: number
    endTime?: number
    retryCount: number
    success: boolean
  }>()

  constructor(config: CapabilityConfig = { enabled: true }) {
    super(
      'AsyncProcessing',
      '1.0.0',
      '异步处理能力，提供通用的异步任务执行、轮询、重试和错误处理功能',
      config
    )
  }

  protected async onInitialize(): Promise<void> {
    console.log('✅ AsyncProcessing capability initialized')
  }

  /**
   * 执行异步任务
   */
  async executeAsyncTask<T>(config: AsyncTaskConfig<T>): Promise<CapabilityResult<T>> {
    this.ensureInitialized()

    const startTime = Date.now()
    const context: AsyncContext = {
      taskId: config.taskId,
      operation: 'async-execution',
      startTime,
      metadata: config.retries ? { maxRetries: config.retries } : undefined
    }

    console.log(`⚡ 开始异步任务: ${config.taskId}`)

    try {
      const result = await this.executeWithRetry(
        async () => {
          // 创建 AbortController
          const controller = new AbortController()
          this.activeTasks.set(config.taskId, controller)

          // 进度回调
          if (config.onProgress) {
            config.onProgress(0)
          }

          const result = await Promise.race([
            config.executor(),
            this.createTimeoutPromise(config.timeout || 120000)
          ])

          this.activeTasks.delete(config.taskId)

          // 完成进度回调
          if (config.onProgress) {
            config.onProgress(100)
          }

          return result
        },
        config.retries || 3,
        config.retryDelay || 1000
      )

      // 记录成功指标
      this.recordTaskMetrics(config.taskId, {
        startTime,
        endTime: Date.now(),
        retryCount: 0,
        success: true
      })

      // 成功回调
      if (config.onSuccess) {
        config.onSuccess(result)
      }

      const duration = Date.now() - startTime
      console.log(`✅ 异步任务完成: ${config.taskId} (${duration}ms)`)

      return this.createResult(true, result, undefined, {
        taskId: config.taskId,
        duration,
        context
      })

    } catch (error) {
      // 记录失败指标
      this.recordTaskMetrics(config.taskId, {
        startTime,
        endTime: Date.now(),
        retryCount: config.retries || 0,
        success: false
      })

      this.activeTasks.delete(config.taskId)

      // 错误回调
      if (config.onError) {
        config.onError(error as Error)
      }

      const duration = Date.now() - startTime
      console.error(`❌ 异步任务失败: ${config.taskId} (${duration}ms) -`, error)

      return this.createResult(false, undefined, error instanceof Error ? error.message : 'Unknown error', {
        taskId: config.taskId,
        duration,
        context,
        errorType: error instanceof Error ? error.constructor.name : 'Unknown'
      })
    }
  }

  /**
   * 轮询直到满足条件
   */
  async pollUntilComplete<T>(config: PollingConfig<T>): Promise<CapabilityResult<T>> {
    this.ensureInitialized()

    const startTime = Date.now()
    const maxDuration = config.maxDuration || 10 * 60 * 1000 // 10分钟
    const interval = config.interval || 5000 // 5秒

    console.log(`🔄 开始轮询: ${config.taskId}, 间隔=${interval}ms, 最大时长=${maxDuration / 1000}s`)

    let attempts = 0
    let lastResult: T | undefined

    try {
      while (Date.now() - startTime < maxDuration) {
        attempts++

        // 检查任务是否被取消
        const controller = this.activeTasks.get(config.taskId)
        if (controller?.signal.aborted) {
          throw new Error('Task was cancelled')
        }

        try {
          const result = await this.executeWithTimeout(
            config.poller(),
            config.timeout || 30000
          )

          lastResult = result

          // 检查条件是否满足
          if (config.condition(result)) {
            const duration = Date.now() - startTime
            console.log(`✅ 轮询成功: ${config.taskId} (${attempts} 次, ${duration}ms)`)

            return this.createResult(true, result, undefined, {
              taskId: config.taskId,
              attempts,
              duration,
              lastResult
            })
          }

          // 更新进度
          const progress = Math.min(Math.round(((Date.now() - startTime) / maxDuration) * 100), 95)
          console.log(`⏳ 轮询进度: ${config.taskId} - ${progress}% (第 ${attempts} 次)`)

        } catch (error) {
          console.error(`❌ 轮询第 ${attempts} 次失败:`, error)

          // 检查是否应该停止轮询
          const errorResult = await this.handleAsyncError(error as Error, {
            taskId: config.taskId,
            operation: 'polling',
            startTime,
            metadata: { attempts }
          })

          if (!errorResult.shouldRetry) {
            throw error
          }

          if (errorResult.delay) {
            await this.delay(errorResult.delay)
          }
        }

        // 等待下次轮询
        await this.delay(interval)
      }

      // 超时
      throw new Error(`轮询超时: ${maxDuration / 1000}秒`)

    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`❌ 轮询失败: ${config.taskId} (${attempts} 次, ${duration}ms) -`, error)

      return this.createResult(false, lastResult, error instanceof Error ? error.message : 'Unknown error', {
        taskId: config.taskId,
        attempts,
        duration,
        lastResult,
        timedOut: Date.now() - startTime >= maxDuration
      })
    }
  }

  /**
   * 并行执行多个异步任务
   */
  async executeParallel<T>(
    configs: AsyncTaskConfig<T>[],
    maxConcurrency: number = 5
  ): Promise<CapabilityResult<{
    results: T[]
    errors: { taskId: string; error: string }[]
    successCount: number
    failureCount: number
  }>> {
    this.ensureInitialized()

    console.log(`🚀 开始并行执行: ${configs.length} 个任务, 最大并发=${maxConcurrency}`)

    const results: T[] = []
    const errors: { taskId: string; error: string }[] = []
    let successCount = 0
    let failureCount = 0

    // 分批执行
    for (let i = 0; i < configs.length; i += maxConcurrency) {
      const batch = configs.slice(i, i + maxConcurrency)

      const batchPromises = batch.map(async (config) => {
        const result = await this.executeAsyncTask(config)

        if (result.success && result.data) {
          results.push(result.data)
          successCount++
        } else {
          errors.push({
            taskId: config.taskId,
            error: result.error || 'Unknown error'
          })
          failureCount++
        }
      })

      await Promise.all(batchPromises)

      console.log(`📊 批次进度: ${Math.min(i + maxConcurrency, configs.length)}/${configs.length}`)
    }

    console.log(`✅ 并行执行完成: 成功 ${successCount}, 失败 ${failureCount}`)

    return this.createResult(true, {
      results,
      errors,
      successCount,
      failureCount
    }, undefined, {
      totalTasks: configs.length,
      maxConcurrency,
      successRate: Math.round((successCount / configs.length) * 100)
    })
  }

  /**
   * 串行执行多个异步任务
   */
  async executeSerial<T>(
    configs: AsyncTaskConfig<T>[],
    stopOnError: boolean = false
  ): Promise<CapabilityResult<{
    results: T[]
    errors: { taskId: string; error: string }[]
    successCount: number
    failureCount: number
  }>> {
    this.ensureInitialized()

    console.log(`📝 开始串行执行: ${configs.length} 个任务, 遇错停止=${stopOnError}`)

    const results: T[] = []
    const errors: { taskId: string; error: string }[] = []
    let successCount = 0
    let failureCount = 0

    for (let i = 0; i < configs.length; i++) {
      const config = configs[i]

      console.log(`🔄 执行第 ${i + 1}/${configs.length} 个任务: ${config.taskId}`)

      const result = await this.executeAsyncTask(config)

      if (result.success && result.data) {
        results.push(result.data)
        successCount++
      } else {
        errors.push({
          taskId: config.taskId,
          error: result.error || 'Unknown error'
        })
        failureCount++

        if (stopOnError) {
          console.log(`⏹️ 遇到错误，停止执行: ${config.taskId}`)
          break
        }
      }
    }

    console.log(`✅ 串行执行完成: 成功 ${successCount}, 失败 ${failureCount}`)

    return this.createResult(true, {
      results,
      errors,
      successCount,
      failureCount
    }, undefined, {
      totalTasks: configs.length,
      stopOnError,
      completedTasks: successCount + failureCount
    })
  }

  /**
   * 取消异步任务
   */
  async cancelTask(taskId: string): Promise<CapabilityResult<boolean>> {
    this.ensureInitialized()

    try {
      const controller = this.activeTasks.get(taskId)

      if (!controller) {
        return this.createResult(false, undefined, '任务不存在或已完成')
      }

      controller.abort()
      this.activeTasks.delete(taskId)

      console.log(`✅ 任务已取消: ${taskId}`)
      return this.createResult(true, true)

    } catch (error) {
      console.error(`❌ 取消任务失败:`, error)
      return this.createResult(false, undefined, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  /**
   * 获取任务状态
   */
  getTaskStatus(taskId: string): CapabilityResult<{
    active: boolean
    metrics?: {
      startTime: number
      endTime?: number
      retryCount: number
      success: boolean
    }
  }> {
    const isActive = this.activeTasks.has(taskId)
    const metrics = this.taskMetrics.get(taskId)

    return this.createResult(true, {
      active: isActive,
      metrics
    })
  }

  /**
   * 获取所有活动任务
   */
  getActiveTasks(): string[] {
    return Array.from(this.activeTasks.keys())
  }

  /**
   * 获取任务指标
   */
  getTaskMetrics(): CapabilityResult<Array<{
    taskId: string
    duration?: number
    retryCount: number
    success: boolean
  }>> {
    const metrics = Array.from(this.taskMetrics.entries()).map(([taskId, metric]) => ({
      taskId,
      duration: metric.endTime ? metric.endTime - metric.startTime : undefined,
      retryCount: metric.retryCount,
      success: metric.success
    }))

    return this.createResult(true, metrics)
  }

  /**
   * 清理完成的任务指标
   */
  cleanupMetrics(olderThanMinutes: number = 60): CapabilityResult<number> {
    const cutoffTime = Date.now() - (olderThanMinutes * 60 * 1000)
    let cleanedCount = 0

    for (const [taskId, metric] of this.taskMetrics.entries()) {
      if (metric.endTime && metric.endTime < cutoffTime) {
        this.taskMetrics.delete(taskId)
        cleanedCount++
      }
    }

    console.log(`🧹 清理了 ${cleanedCount} 个任务指标`)
    return this.createResult(true, cleanedCount)
  }

  // 私有方法

  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      promise,
      this.createTimeoutPromise(timeoutMs)
    ])
  }

  private createTimeoutPromise<T>(timeoutMs: number): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`操作超时: ${timeoutMs}ms`)), timeoutMs)
    })
  }

  private async handleAsyncError(
    error: Error,
    context: AsyncContext
  ): Promise<ErrorHandlingResult> {
    // 智能错误处理逻辑
    const errorMessage = error.message.toLowerCase()

    // 网络相关错误 - 应该重试
    if (errorMessage.includes('network') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('connection')) {
      return {
        shouldRetry: true,
        delay: 2000
      }
    }

    // 认证错误 - 不应该重试
    if (errorMessage.includes('unauthorized') ||
        errorMessage.includes('authentication')) {
      return {
        shouldRetry: false,
        shouldFail: true
      }
    }

    // 资源限制错误 - 延迟重试
    if (errorMessage.includes('rate limit') ||
        errorMessage.includes('quota')) {
      return {
        shouldRetry: true,
        delay: 30000 // 30秒
      }
    }

    // 默认重试
    return {
      shouldRetry: true,
      delay: 1000
    }
  }

  private recordTaskMetrics(taskId: string, metrics: {
    startTime: number
    endTime?: number
    retryCount: number
    success: boolean
  }): void {
    this.taskMetrics.set(taskId, metrics)
  }

  /**
   * 关闭能力
   */
  async shutdown(): Promise<void> {
    console.log('🔄 Shutting down AsyncProcessing capability...')

    // 取消所有活动任务
    for (const [taskId, controller] of this.activeTasks) {
      controller.abort()
      console.log(`❌ 取消任务: ${taskId}`)
    }

    this.activeTasks.clear()
    this.taskMetrics.clear()
    this._initialized = false

    console.log('✅ AsyncProcessing capability shutdown complete')
  }
}

// 注册能力
registerCapability('AsyncProcessing', AsyncProcessingCapability)
/**
 * 视频生成能力
 * 封装视频生成的完整流程，包括同步和异步生成、轮询、状态管理等
 */

import { BaseCapability, VideoOptions, VideoResult, VideoStatus, CapabilityResult, CapabilityConfig, AsyncTaskConfig } from './base'
import { withDatabase } from '@/lib/database'
import { mapDisplayNameToActualModel } from '@/lib/model-mapping'
import { registerCapability } from './manager'

export class VideoGenerationCapability extends BaseCapability {
  constructor(config: CapabilityConfig = { enabled: true }) {
    super(
      'VideoGeneration',
      '1.0.0',
      '视频生成能力，支持同步和异步视频生成、状态轮询和结果管理',
      config
    )
  }

  protected async onInitialize(): Promise<void> {
    // 初始化AI服务
    const { aiService } = await import('@/lib/ai-service')
    await aiService.initialize()
    console.log('✅ VideoGeneration capability initialized')
  }

  /**
   * 生成视频（同步或异步）
   */
  async generateVideo(
    prompt: string,
    model: string,
    options: VideoOptions = {},
    imageUrls?: string[]
  ): Promise<CapabilityResult<VideoResult[] | string>> {
    this.ensureInitialized()

    try {
      console.log(`🎬 开始视频生成: 模型=${model}, prompt="${prompt.substring(0, 50)}..."`)

      // 映射模型名称
      const actualModel = mapDisplayNameToActualModel(model)
      console.log(`🔄 模型名称映射: ${model} -> ${actualModel}`)

      // 准备视频生成参数
      const videoOptions = {
        ...options,
        image_urls: imageUrls
      }

      // 动态导入AI服务
      const { aiService } = await import('@/lib/ai-service')

      // 调用AI服务生成视频
      const result = await aiService.generateVideo(actualModel, prompt, videoOptions)

      // 检查是否为异步任务（返回的是外部任务ID）
      if (typeof result === 'string' && result.startsWith('task-')) {
        console.log(`⏳ 视频生成任务已创建（异步）: ${result}`)
        return this.createResult(true, result, undefined, {
          isAsync: true,
          externalTaskId: result,
          model: actualModel
        })
      }

      // 同步结果，转换为标准格式
      const videoResults = Array.isArray(result) ? result : [result]
      const formattedResults: VideoResult[] = videoResults.map(url => ({
        url,
        format: 'mp4',
        metadata: {
          model: actualModel,
          prompt: prompt.substring(0, 100),
          generatedAt: new Date().toISOString()
        }
      }))

      console.log(`✅ 视频生成完成（同步）: ${formattedResults.length} 个视频`)
      return this.createResult(true, formattedResults, undefined, {
        isAsync: false,
        model: actualModel,
        count: formattedResults.length
      })

    } catch (error) {
      console.error(`❌ 视频生成失败:`, error)
      return this.createResult(false, undefined, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  /**
   * 轮询视频任务状态
   */
  async pollVideoStatus(externalTaskId: string): Promise<CapabilityResult<VideoStatus>> {
    this.ensureInitialized()

    try {
      console.log(`🔍 开始轮询视频状态: ${externalTaskId}`)

      const { aiService } = await import('@/lib/ai-service')
      const result = await aiService.pollVideoTask(externalTaskId)

      const status: VideoStatus = {
        status: result.status,
        progress: result.progress,
        results: result.results,
        error: result.error,
        externalTaskId
      }

      console.log(`📊 视频状态更新: ${externalTaskId} -> ${result.status} (${result.progress}%)`)
      return this.createResult(true, status)

    } catch (error) {
      console.error(`❌ 视频状态轮询失败:`, error)
      return this.createResult(false, undefined, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  /**
   * 处理异步视频任务
   */
  async handleAsyncVideo(
    taskId: string,
    externalTaskId: string,
    model: string
  ): Promise<CapabilityResult<VideoResult[]>> {
    this.ensureInitialized()

    try {
      console.log(`⏳ 开始处理异步视频任务: taskId=${taskId}, externalTaskId=${externalTaskId}`)

      // 使用轮询逻辑获取结果
      const pollResult = await this.pollUntilComplete(externalTaskId)

      if (!pollResult.success || !pollResult.data) {
        throw new Error(pollResult.error || '轮询失败')
      }

      const videoStatus = pollResult.data

      if (videoStatus.status === 'failed') {
        throw new Error(videoStatus.error || '视频生成失败')
      }

      if (!videoStatus.results || videoStatus.results.length === 0) {
        throw new Error('视频生成完成但没有结果')
      }

      // 转换为标准视频结果格式
      const videoResults: VideoResult[] = videoStatus.results.map(url => ({
        url,
        format: 'mp4',
        metadata: {
          model,
          externalTaskId,
          generatedAt: new Date().toISOString(),
          totalProgress: videoStatus.progress
        }
      }))

      // 更新任务状态和结果
      await this.updateTaskResults(taskId, {
        status: 'completed',
        progress: 100,
        results: videoStatus.results
      })

      console.log(`✅ 异步视频任务完成: ${taskId}, ${videoResults.length} 个视频`)
      return this.createResult(true, videoResults, undefined, {
        taskId,
        externalTaskId,
        model,
        totalDuration: Date.now()
      })

    } catch (error) {
      console.error(`❌ 异步视频任务处理失败:`, error)

      // 更新任务状态为失败
      await this.updateTaskResults(taskId, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      })

      return this.createResult(false, undefined, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  /**
   * 轮询直到完成
   */
  private async pollUntilComplete(
    externalTaskId: string,
    maxDuration: number = 10 * 60 * 1000, // 10分钟
    interval: number = 15000 // 15秒
  ): Promise<CapabilityResult<VideoStatus>> {
    const startTime = Date.now()

    while (Date.now() - startTime < maxDuration) {
      const pollResult = await this.pollVideoStatus(externalTaskId)

      if (!pollResult.success || !pollResult.data) {
        return pollResult
      }

      const status = pollResult.data

      if (status.status === 'completed') {
        console.log(`🎉 视频生成完成: ${externalTaskId}`)
        return pollResult
      }

      if (status.status === 'failed') {
        console.log(`❌ 视频生成失败: ${externalTaskId} - ${status.error}`)
        return pollResult
      }

      // 继续轮询
      console.log(`⏳ 视频生成中: ${externalTaskId} - ${status.progress}%`)
      await this.delay(interval)
    }

    // 超时
    return this.createResult(false, undefined, `轮询超时: ${maxDuration / 1000}秒`)
  }

  /**
   * 更新任务状态和结果
   */
  private async updateTaskResults(
    taskId: string,
    updates: {
      status?: string
      progress?: number
      results?: string[]
      error?: string
    }
  ): Promise<void> {
    await withDatabase(async (db) => {
      const updateData: any = {
        updatedAt: new Date().toISOString()
      }

      if (updates.status) updateData.status = updates.status
      if (updates.progress !== undefined) updateData.progress = updates.progress
      if (updates.results) updateData.results = JSON.stringify(updates.results)
      if (updates.error) updateData.error = updates.error

      await db.updateTask(taskId, updateData)
    })
  }

  /**
   * 获取视频生成成本估算
   */
  async getCostEstimate(
    model: string,
    duration?: number,
    options: VideoOptions = {}
  ): Promise<CapabilityResult<number>> {
    this.ensureInitialized()

    try {
      const actualModel = mapDisplayNameToActualModel(model)

      // 这里可以实现具体的成本计算逻辑
      // 目前使用模拟计算
      let baseCost = 0
      switch (actualModel) {
        case 'veo3.1-fast':
          baseCost = 0.05
          break
        case 'veo3.1-pro':
          baseCost = 0.15
          break
        case 'luma-1.6':
          baseCost = 0.08
          break
        default:
          baseCost = 0.10
      }

      // 根据时长调整成本
      if (duration && duration > 5) {
        baseCost *= (duration / 5)
      }

      return this.createResult(true, Math.round(baseCost * 100) / 100)
    } catch (error) {
      return this.createResult(false, undefined, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  /**
   * 验证视频生成参数
   */
  async validateParameters(
    prompt: string,
    model: string,
    options: VideoOptions = {}
  ): Promise<CapabilityResult<boolean>> {
    this.ensureInitialized()

    try {
      // 基础验证
      if (!prompt || prompt.trim().length === 0) {
        return this.createResult(false, undefined, 'Prompt 不能为空')
      }

      if (prompt.length > 1000) {
        return this.createResult(false, undefined, 'Prompt 长度不能超过1000个字符')
      }

      if (!model) {
        return this.createResult(false, undefined, '必须指定模型')
      }

      // 模型验证
      const actualModel = mapDisplayNameToActualModel(model)
      const supportedModels = ['veo3.1-fast', 'veo3.1-pro', 'luma-1.6', 'video-1']

      if (!supportedModels.includes(actualModel)) {
        return this.createResult(false, undefined, `不支持的模型: ${model}`)
      }

      // 参数验证
      if (options.duration && (options.duration < 1 || options.duration > 60)) {
        return this.createResult(false, undefined, '视频时长必须在1-60秒之间')
      }

      if (options.fps && (options.fps < 8 || options.fps > 60)) {
        return this.createResult(false, undefined, '帧率必须在8-60之间')
      }

      return this.createResult(true, true)
    } catch (error) {
      return this.createResult(false, undefined, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  /**
   * 批量生成视频
   */
  async generateBatchVideos(
    prompts: string[],
    model: string,
    options: VideoOptions = {}
  ): Promise<CapabilityResult<VideoResult[][]>> {
    this.ensureInitialized()

    try {
      console.log(`🎬 开始批量视频生成: ${prompts.length} 个提示词`)

      const results: VideoResult[][] = []
      let successCount = 0
      let failureCount = 0

      for (let i = 0; i < prompts.length; i++) {
        const prompt = prompts[i]
        console.log(`📹 处理第 ${i + 1}/${prompts.length} 个视频...`)

        try {
          const result = await this.generateVideo(prompt, model, options)

          if (result.success) {
            if (Array.isArray(result.data)) {
              results.push(result.data)
            } else {
              // 异步任务，暂时跳过
              console.log(`⏳ 跳过异步任务: ${result.data}`)
              results.push([])
            }
            successCount++
          } else {
            console.error(`❌ 第 ${i + 1} 个视频生成失败:`, result.error)
            results.push([])
            failureCount++
          }
        } catch (error) {
          console.error(`❌ 第 ${i + 1} 个视频生成异常:`, error)
          results.push([])
          failureCount++
        }
      }

      console.log(`✅ 批量视频生成完成: 成功 ${successCount}, 失败 ${failureCount}`)

      return this.createResult(true, results, undefined, {
        totalPrompts: prompts.length,
        successCount,
        failureCount
      })

    } catch (error) {
      console.error(`❌ 批量视频生成失败:`, error)
      return this.createResult(false, undefined, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  /**
   * 获取支持的视频模型列表
   */
  getSupportedModels(): CapabilityResult<string[]> {
    const models = [
      { name: 'Veo 3 Fast (EvoLink)', id: 'veo3.1-fast', description: '快速视频生成' },
      { name: 'Veo 3 Pro (EvoLink)', id: 'veo3.1-pro', description: '高质量视频生成' },
      { name: 'Luma 1.6 (EvoLink)', id: 'luma-1.6', description: 'Luma视频生成' },
      { name: 'Video-1 (EvoLink)', id: 'video-1', description: '通用视频生成' }
    ]

    return this.createResult(true, models.map(m => m.name), undefined, {
      detailed: models
    })
  }

  /**
   * 关闭能力
   */
  async shutdown(): Promise<void> {
    console.log('🔄 Shutting down VideoGeneration capability...')
    // 清理资源
    this._initialized = false
    console.log('✅ VideoGeneration capability shutdown complete')
  }
}

// 注册能力
registerCapability('VideoGeneration', VideoGenerationCapability)
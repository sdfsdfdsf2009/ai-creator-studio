/**
 * 批量处理能力
 * 统一的批量任务处理框架，支持变量展开、CSV处理、并发控制等
 */

import { BaseCapability, BatchTaskConfig, BatchResult, CapabilityResult, CapabilityConfig } from './base'
import { MediaType } from '@/types'
import { randomUUID } from 'crypto'
import { registerCapability } from './manager'

// 变量定义接口
export interface Variable {
  name: string
  type: 'text' | 'select' | 'number'
  defaultValue?: string | number
  options?: string[]
  required?: boolean
  description?: string
}

// CSV数据接口
export interface CSVData {
  prompt: string
  model?: string
  parameters?: Record<string, any>
  [key: string]: any
}

// CSV批量配置接口
export interface CSVBatchConfig {
  taskName: string
  mediaType: MediaType
  modelIds: string[]
  defaultParams: Record<string, any>
  data: CSVData[]
}

// 子任务接口
export interface SubTask {
  id: string
  batchTaskId: string
  modelId: string
  prompt: string
  parameters: Record<string, any>
  variableValues: Record<string, any>
  costEstimate: number
  status: 'pending' | 'running' | 'completed' | 'failed'
  result?: any
  error?: string
}

export class BatchProcessingCapability extends BaseCapability {
  private activeBatches = new Map<string, AbortController>()

  constructor(config: CapabilityConfig = { enabled: true }) {
    super(
      'BatchProcessing',
      '1.0.0',
      '批量处理能力，提供变量展开、CSV导入、并发控制等批量任务处理功能',
      config
    )
  }

  protected async onInitialize(): Promise<void> {
    console.log('✅ BatchProcessing capability initialized')
  }

  /**
   * 创建基于变量的批量任务
   */
  async createVariableBatch(config: BatchTaskConfig): Promise<CapabilityResult<{
    batchTaskId: string
    subtasks: SubTask[]
    totalCostEstimate: number
  }>> {
    this.ensureInitialized()

    try {
      console.log(`📝 创建变量批量任务: ${config.name}`)

      // 展开变量生成所有提示词
      const expandedPrompts = await this.expandVariables(config.basePrompt, config.variables)

      // 生成子任务
      const subtasks: SubTask[] = []
      const batchTaskId = randomUUID()

      for (const modelConfig of config.models) {
        for (let i = 0; i < expandedPrompts.length; i++) {
          const expandedPrompt = expandedPrompts[i]

          const subtask: SubTask = {
            id: randomUUID(),
            batchTaskId,
            modelId: modelConfig.modelId,
            prompt: expandedPrompt.prompt,
            parameters: {
              ...config.baseParameters,
              ...modelConfig.parameters,
              ...expandedPrompt.variableValues
            },
            variableValues: expandedPrompt.variableValues,
            costEstimate: await this.calculateSubTaskCost(
              config.mediaType,
              modelConfig.modelId,
              expandedPrompt.prompt,
              modelConfig.parameters
            ),
            status: 'pending'
          }

          subtasks.push(subtask)
        }
      }

      // 计算总成本
      const totalCostEstimate = subtasks.reduce((sum, task) => sum + task.costEstimate, 0)

      // 保存批量任务到数据库
      await this.saveBatchTaskToDatabase(batchTaskId, config, subtasks, totalCostEstimate)

      console.log(`✅ 变量批量任务创建成功: ${batchTaskId}, ${subtasks.length} 个子任务`)

      return this.createResult(true, {
        batchTaskId,
        subtasks,
        totalCostEstimate
      }, undefined, {
        expandedPromptCount: expandedPrompts.length,
        modelCount: config.models.length,
        averageCostPerTask: totalCostEstimate / subtasks.length
      })

    } catch (error) {
      console.error(`❌ 创建变量批量任务失败:`, error)
      return this.createResult(false, undefined, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  /**
   * 创建基于CSV的批量任务
   */
  async createCSVBatch(config: CSVBatchConfig): Promise<CapabilityResult<{
    batchTaskId: string
    subtasks: SubTask[]
    totalCostEstimate: number
  }>> {
    this.ensureInitialized()

    try {
      console.log(`📊 创建CSV批量任务: ${config.taskName}, ${config.data.length} 行数据`)

      const batchTaskId = randomUUID()
      const subtasks: SubTask[] = []

      for (let i = 0; i < config.data.length; i++) {
        const row = config.data[i]

        // 处理模型选择
        let model = row.model || config.modelIds[0]
        if (!model || model.trim() === '') {
          model = config.mediaType === 'video' ? 'Sora-2' : 'Gemini 2.5 Flash'
          console.log(`🔧 使用默认模型: ${model}`)
        }

        const subtask: SubTask = {
          id: randomUUID(),
          batchTaskId,
          modelId: model,
          prompt: row.prompt,
          parameters: {
            ...config.defaultParams,
            ...row.parameters
          },
          variableValues: {
            rowIndex: i,
            ...row
          },
          costEstimate: await this.calculateSubTaskCost(
            config.mediaType,
            model,
            row.prompt,
            config.defaultParams
          ),
          status: 'pending'
        }

        subtasks.push(subtask)
      }

      // 计算总成本
      const totalCostEstimate = subtasks.reduce((sum, task) => sum + task.costEstimate, 0)

      // 保存批量任务到数据库
      const batchConfig: BatchTaskConfig = {
        name: config.taskName,
        description: `从CSV文件导入的批量任务，共${config.data.length}个提示词`,
        basePrompt: config.data[0]?.prompt || '批量任务',
        mediaType: config.mediaType,
        models: config.modelIds.map(modelId => ({
          modelId,
          quantity: 1,
          parameters: config.defaultParams
        })),
        baseParameters: config.defaultParams,
        maxConcurrent: 3
      }

      await this.saveBatchTaskToDatabase(batchTaskId, batchConfig, subtasks, totalCostEstimate)

      console.log(`✅ CSV批量任务创建成功: ${batchTaskId}, ${subtasks.length} 个子任务`)

      return this.createResult(true, {
        batchTaskId,
        subtasks,
        totalCostEstimate
      }, undefined, {
        rowCount: config.data.length,
        averageCostPerTask: totalCostEstimate / subtasks.length
      })

    } catch (error) {
      console.error(`❌ 创建CSV批量任务失败:`, error)
      return this.createResult(false, undefined, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  /**
   * 执行批量任务
   */
  async executeBatchTask(
    batchTaskId: string,
    maxConcurrency: number = 3
  ): Promise<CapabilityResult<BatchResult>> {
    this.ensureInitialized()

    try {
      console.log(`🚀 开始执行批量任务: ${batchTaskId}, 并发数=${maxConcurrency}`)

      // 创建AbortController
      const controller = new AbortController()
      this.activeBatches.set(batchTaskId, controller)

      // 获取子任务
      const subtasks = await this.getSubTasks(batchTaskId)
      const pendingTasks = subtasks.filter(task => task.status === 'pending')

      if (pendingTasks.length === 0) {
        return this.createResult(false, undefined, '没有待执行的子任务')
      }

      const startTime = Date.now()
      const results: any[] = []
      const errors: string[] = []
      let completedTasks = 0
      let failedTasks = 0

      // 并发执行子任务
      await this.executeConcurrentTasks(
        pendingTasks,
        maxConcurrency,
        controller.signal,
        async (subtask) => {
          try {
            // 更新子任务状态为运行中
            await this.updateSubTaskStatus(subtask.id, 'running')

            // 执行子任务
            const result = await this.executeSubTask(subtask)

            // 更新子任务状态为完成
            await this.updateSubTaskStatus(subtask.id, 'completed', undefined, result)

            results.push(result)
            completedTasks++

            console.log(`✅ 子任务完成: ${subtask.id} (${completedTasks}/${pendingTasks.length})`)

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'

            // 更新子任务状态为失败
            await this.updateSubTaskStatus(subtask.id, 'failed', errorMessage)

            errors.push(`任务 ${subtask.id}: ${errorMessage}`)
            failedTasks++

            console.error(`❌ 子任务失败: ${subtask.id} -`, error)
          }
        }
      )

      // 更新批量任务状态
      await this.updateBatchTaskStatus(batchTaskId, {
        completedSubtasks: completedTasks,
        failedSubtasks: failedTasks,
        status: failedTasks === 0 ? 'completed' : 'partial_completed'
      })

      const duration = Date.now() - startTime

      console.log(`✅ 批量任务执行完成: ${batchTaskId} (${duration}ms)`)

      const batchResult: BatchResult = {
        totalTasks: pendingTasks.length,
        completedTasks,
        failedTasks,
        results,
        errors,
        duration
      }

      this.activeBatches.delete(batchTaskId)

      return this.createResult(true, batchResult, undefined, {
        successRate: Math.round((completedTasks / pendingTasks.length) * 100),
        averageTaskDuration: duration / pendingTasks.length
      })

    } catch (error) {
      this.activeBatches.delete(batchTaskId)
      console.error(`❌ 批量任务执行失败:`, error)
      return this.createResult(false, undefined, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  /**
   * 取消批量任务
   */
  async cancelBatchTask(batchTaskId: string): Promise<CapabilityResult<boolean>> {
    this.ensureInitialized()

    try {
      const controller = this.activeBatches.get(batchTaskId)

      if (!controller) {
        return this.createResult(false, undefined, '批量任务不存在或已完成')
      }

      controller.abort()
      this.activeBatches.delete(batchTaskId)

      // 更新数据库中的批量任务状态
      await this.updateBatchTaskStatus(batchTaskId, {
        status: 'cancelled'
      })

      // 取消所有待执行的子任务
      const subtasks = await this.getSubTasks(batchTaskId)
      const pendingTasks = subtasks.filter(task => task.status === 'pending')

      for (const task of pendingTasks) {
        await this.updateSubTaskStatus(task.id, 'cancelled', '批量任务已取消')
      }

      console.log(`✅ 批量任务已取消: ${batchTaskId}`)
      return this.createResult(true, true)

    } catch (error) {
      console.error(`❌ 取消批量任务失败:`, error)
      return this.createResult(false, undefined, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  /**
   * 获取批量任务状态
   */
  async getBatchTaskStatus(batchTaskId: string): Promise<CapabilityResult<{
    batchTaskId: string
    status: string
    totalSubtasks: number
    completedSubtasks: number
    failedSubtasks: number
    progress: number
    subtasks: SubTask[]
  }>> {
    this.ensureInitialized()

    try {
      const batchInfo = await this.getBatchTaskInfo(batchTaskId)
      const subtasks = await this.getSubTasks(batchTaskId)

      const progress = batchInfo.totalSubtasks > 0
        ? Math.round((batchInfo.completedSubtasks + batchInfo.failedSubtasks) / batchInfo.totalSubtasks * 100)
        : 0

      return this.createResult(true, {
        batchTaskId,
        status: batchInfo.status,
        totalSubtasks: batchInfo.totalSubtasks,
        completedSubtasks: batchInfo.completedSubtasks,
        failedSubtasks: batchInfo.failedSubtasks,
        progress,
        subtasks
      })

    } catch (error) {
      console.error(`❌ 获取批量任务状态失败:`, error)
      return this.createResult(false, undefined, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  /**
   * 获取所有活动批量任务
   */
  getActiveBatchTasks(): string[] {
    return Array.from(this.activeBatches.keys())
  }

  /**
   * 展开变量
   */
  private async expandVariables(
    basePrompt: string,
    variables: Record<string, Variable>
  ): Promise<Array<{ prompt: string; variableValues: Record<string, any> }>> {
    const results: Array<{ prompt: string; variableValues: Record<string, any> }> = []
    const variableNames = Object.keys(variables)

    if (variableNames.length === 0) {
      return [{ prompt: basePrompt, variableValues: {} }]
    }

    // 生成所有变量值的组合
    const combinations = this.generateVariableCombinations(variables)

    for (const combination of combinations) {
      let prompt = basePrompt

      // 替换模板中的变量
      for (const [name, value] of Object.entries(combination)) {
        const placeholder = new RegExp(`{{\\s*${name}\\s*}}`, 'g')
        prompt = prompt.replace(placeholder, String(value))
      }

      results.push({
        prompt,
        variableValues: combination
      })
    }

    return results
  }

  /**
   * 生成变量值的组合
   */
  private generateVariableCombinations(variables: Record<string, Variable>): Array<Record<string, any>> {
    const variableNames = Object.keys(variables)
    const combinations: Array<Record<string, any>> = [{}]

    for (const varName of variableNames) {
      const variable = variables[varName]
      const newCombinations: Array<Record<string, any>> = []

      let values: any[] = []

      if (variable.type === 'select' && variable.options) {
        values = variable.options
      } else if (variable.type === 'number') {
        // 对于数字类型，生成一些示例值
        const min = variable.defaultValue as number || 1
        const max = Math.max(min + 5, min * 2)
        for (let i = min; i <= max; i++) {
          values.push(i)
        }
      } else {
        // 对于文本类型，使用默认值
        values = [variable.defaultValue || '']
      }

      for (const combination of combinations) {
        for (const value of values) {
          newCombinations.push({
            ...combination,
            [varName]: value
          })
        }
      }

      combinations.length = 0
      combinations.push(...newCombinations)
    }

    return combinations
  }

  /**
   * 并发执行任务
   */
  private async executeConcurrentTasks<T>(
    tasks: T[],
    maxConcurrency: number,
    signal: AbortSignal,
    executor: (task: T) => Promise<void>
  ): Promise<void> {
    const executing: Promise<void>[] = []

    for (const task of tasks) {
      // 检查是否被取消
      if (signal.aborted) {
        throw new Error('批量任务已取消')
      }

      const promise = executor(task)
      executing.push(promise)

      // 控制并发数
      if (executing.length >= maxConcurrency) {
        await Promise.race(executing)
        // 移除已完成的promise
        for (let i = executing.length - 1; i >= 0; i--) {
          if (await Promise.race([executing[i], Promise.resolve()])) {
            executing.splice(i, 1)
          }
        }
      }
    }

    // 等待所有剩余任务完成
    await Promise.all(executing)
  }

  /**
   * 执行单个子任务
   */
  private async executeSubTask(subtask: SubTask): Promise<any> {
    // 这里需要调用相应的生成能力
    // 暂时返回模拟结果
    await this.delay(Math.random() * 5000 + 1000) // 1-6秒

    return {
      taskId: subtask.id,
      url: `https://example.com/result/${subtask.id}.jpg`,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * 计算子任务成本
   */
  private async calculateSubTaskCost(
    mediaType: MediaType,
    modelId: string,
    prompt: string,
    parameters: Record<string, any>
  ): Promise<number> {
    // 简单的成本计算
    let baseCost = mediaType === 'video' ? 0.10 : 0.02

    // 根据模型调整
    const modelCosts: Record<string, number> = {
      'dall-e-3': 0.04,
      'veo3.1-pro': 0.15,
      'flux-pro': 0.03
    }

    baseCost = modelCosts[modelId] || baseCost

    // 根据数量调整
    const quantity = parameters?.quantity || 1
    return baseCost * quantity
  }

  // 数据库操作方法（需要根据实际数据库实现）

  private async saveBatchTaskToDatabase(
    batchTaskId: string,
    config: BatchTaskConfig,
    subtasks: SubTask[],
    totalCostEstimate: number
  ): Promise<void> {
    const { withDatabase } = await import('@/lib/database')
    await withDatabase(async (db) => {
      // 保存批量任务
      await db.createBatchTask({
        id: batchTaskId,
        name: config.name,
        description: config.description,
        basePrompt: config.basePrompt,
        mediaType: config.mediaType,
        model: config.models[0]?.modelId || '',
        baseParameters: config.baseParameters,
        variableDefinitions: {},
        totalSubtasks: subtasks.length,
        completedSubtasks: 0,
        failedSubtasks: 0,
        totalCost: totalCostEstimate,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

      // 保存子任务
      for (const subtask of subtasks) {
        await db.createTask({
          id: subtask.id,
          type: config.mediaType,
          prompt: subtask.prompt,
          status: 'pending',
          progress: 0,
          results: [],
          cost: subtask.costEstimate,
          model: subtask.modelId,
          parameters: subtask.parameters,
          batchId: batchTaskId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      }
    })
  }

  private async getSubTasks(batchTaskId: string): Promise<SubTask[]> {
    const { withDatabase } = await import('@/lib/database')
    return await withDatabase(async (db) => {
      const tasks = await db.getTasks({ batchId: batchTaskId })
      return tasks.items.map((task: any) => ({
        id: task.id,
        batchTaskId: task.batchId || batchTaskId,
        modelId: task.model,
        prompt: task.prompt,
        parameters: task.parameters,
        variableValues: task.variableValues || {},
        costEstimate: task.cost,
        status: task.status,
        result: task.results,
        error: task.error
      }))
    })
  }

  private async updateSubTaskStatus(
    subtaskId: string,
    status: string,
    error?: string,
    result?: any
  ): Promise<void> {
    const { withDatabase } = await import('@/lib/database')
    await withDatabase(async (db) => {
      const updates: any = {
        status,
        updatedAt: new Date().toISOString()
      }

      if (error) updates.error = error
      if (result) updates.results = result

      await db.updateTask(subtaskId, updates)
    })
  }

  private async getBatchTaskInfo(batchTaskId: string): Promise<any> {
    const { withDatabase } = await import('@/lib/database')
    return await withDatabase(async (db) => {
      return await db.getBatchTask(batchTaskId)
    })
  }

  private async updateBatchTaskStatus(batchTaskId: string, updates: any): Promise<void> {
    const { withDatabase } = await import('@/lib/database')
    await withDatabase(async (db) => {
      updates.updatedAt = new Date().toISOString()
      await db.updateBatchTask(batchTaskId, updates)
    })
  }

  /**
   * 关闭能力
   */
  async shutdown(): Promise<void> {
    console.log('🔄 Shutting down BatchProcessing capability...')

    // 取消所有活动批量任务
    for (const [batchTaskId, controller] of this.activeBatches) {
      controller.abort()
      console.log(`❌ 取消批量任务: ${batchTaskId}`)
    }

    this.activeBatches.clear()
    this._initialized = false

    console.log('✅ BatchProcessing capability shutdown complete')
  }
}

// 注册能力
registerCapability('BatchProcessing', BatchProcessingCapability)
// 批量任务处理器 - 处理变量展开和批量任务创建

import { v4 as uuidv4 } from 'uuid'
import { Variable, expandVariables, calculateVariableCost, generateDefaultValues } from './variables'
import { withDatabase } from './database'

export interface BatchTaskConfig {
  name: string
  description?: string
  basePrompt: string
  mediaType: 'image' | 'video'
  model: string
  baseParameters?: Record<string, any>
  variables: Record<string, Variable>
  userValues?: Record<string, any>
}

export interface BatchTaskResult {
  batchTaskId: string
  totalSubtasks: number
  subtasks: Array<{
    taskId: string
    variableValues: Record<string, any>
    expandedPrompt: string
    costEstimate: number
  }>
  totalCostEstimate: number
}

export interface SubTaskProgress {
  batchTaskId: string
  taskId: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  error?: string
  result?: any
}

/**
 * 批量任务处理器类
 */
export class BatchProcessor {

  /**
   * 创建批量任务 - 基于变量配置生成所有子任务
   */
  static async createBatchTask(config: BatchTaskConfig): Promise<BatchTaskResult> {
    const now = new Date().toISOString()

    // 生成批量任务ID
    const batchTaskId = uuidv4()

    // 验证用户提供的变量值
    const userValues = config.userValues || {}
    const variableValues = { ...generateDefaultValues(config.variables), ...userValues }

    // 生成所有可能的变量组合（笛卡尔积）
    const variableCombinations = this.generateVariableCombinations(config.variables, variableValues)

    // 创建批量任务记录
    const batchTask = {
      id: batchTaskId,
      name: config.name,
      description: config.description || '',
      basePrompt: config.basePrompt,
      mediaType: config.mediaType,
      model: config.model,
      baseParameters: config.baseParameters || {},
      variableDefinitions: config.variables,
      totalSubtasks: variableCombinations.length,
      completedSubtasks: 0,
      failedSubtasks: 0,
      totalCost: 0,
      status: 'pending',
      createdAt: now,
      updatedAt: now
    }

    // 保存批量任务到数据库
    await withDatabase(async (db) => {
      await db.createBatchTask(batchTask)
    })

    // 为每个变量组合创建子任务和变量集
    const subtasks: BatchTaskResult['subtasks'] = []
    let totalCostEstimate = 0

    for (let i = 0; i < variableCombinations.length; i++) {
      const combination = variableCombinations[i]
      const expandedPrompt = expandVariables(config.basePrompt, config.variables, combination)

      // 计算单个任务的预估成本
      const baseCost = this.getBaseCostForModel(config.model)
      const costEstimate = calculateVariableCost(baseCost, config.variables, combination, 1)
      totalCostEstimate += costEstimate

      const taskId = uuidv4()

      // 创建子任务
      const subtask = {
        id: taskId,
        type: config.mediaType,
        prompt: expandedPrompt,
        status: 'pending',
        progress: 0,
        results: [],
        cost: 0,
        model: config.model,
        parameters: { ...config.baseParameters },
        batchId: batchTaskId,
        variableValues: combination,
        isBatchRoot: false,
        batchIndex: i,
        createdAt: now,
        updatedAt: now
      }

      // 创建变量集记录
      const variableSet = {
        id: uuidv4(),
        batchTaskId,
        taskId,
        variableValues: combination,
        expandedPrompt,
        costEstimate,
        status: 'pending',
        createdAt: now
      }

      subtasks.push({
        taskId,
        variableValues: combination,
        expandedPrompt,
        costEstimate
      })

      // 保存到数据库
      await withDatabase(async (db) => {
        await db.createTask(subtask)
        await db.createVariableSet(variableSet)
      })
    }

    // 更新批量任务的总成本预估
    await withDatabase(async (db) => {
      await db.updateBatchTask(batchTaskId, {
        totalCost: totalCostEstimate,
        status: 'pending'
      })
    })

    return {
      batchTaskId,
      totalSubtasks: variableCombinations.length,
      subtasks,
      totalCostEstimate
    }
  }

  /**
   * 开始执行批量任务
   */
  static async startBatchExecution(batchTaskId: string): Promise<void> {
    // 更新批量任务状态为运行中
    await withDatabase(async (db) => {
      await db.updateBatchTask(batchTaskId, {
        status: 'running',
        updatedAt: new Date().toISOString()
      })
    })

    // 获取所有待执行的子任务
    const subtasks = await withDatabase(async (db) => {
      return await db.getTasks({ batchId: batchTaskId, status: 'pending' })
    })

    // 这里可以启动后台处理队列
    // 目前先返回，任务将由 API 端点处理
    console.log(`Starting batch execution for ${subtasks.items.length} subtasks`)
  }

  /**
   * 更新子任务进度
   */
  static async updateSubTaskProgress(progress: SubTaskProgress): Promise<void> {
    await withDatabase(async (db) => {
      // 更新子任务状态
      await db.updateTask(progress.taskId, {
        status: progress.status,
        progress: progress.progress,
        error: progress.error,
        results: progress.result ? [progress.result] : [],
        updatedAt: new Date().toISOString()
      })

      // 更新变量集状态
      const variableSets = await db.getVariableSets({ taskId: progress.taskId })
      if (variableSets.items.length > 0) {
        await db.updateVariableSet(variableSets.items[0].id, {
          status: progress.status
        })
      }

      // 更新批量任务统计
      await this.updateBatchTaskStatistics(progress.batchTaskId)
    })
  }

  /**
   * 取消批量任务
   */
  static async cancelBatchTask(batchTaskId: string): Promise<void> {
    await withDatabase(async (db) => {
      // 取消所有待执行的子任务
      const pendingTasks = await db.getTasks({ batchId: batchTaskId, status: 'pending' })

      for (const task of pendingTasks.items) {
        await db.updateTask(task.id, {
          status: 'cancelled',
          updatedAt: new Date().toISOString()
        })
      }

      // 取消批量任务
      await db.updateBatchTask(batchTaskId, {
        status: 'cancelled',
        updatedAt: new Date().toISOString()
      })
    })
  }

  /**
   * 获取批量任务进度
   */
  static async getBatchTaskProgress(batchTaskId: string): Promise<any> {
    return await withDatabase(async (db) => {
      const batchTask = await db.getBatchTask(batchTaskId)
      if (!batchTask) return null

      const subtasks = await db.getBatchSubTasks(batchTaskId)

      return {
        ...batchTask,
        subtasks,
        progressPercentage: batchTask.totalSubtasks > 0
          ? (batchTask.completedSubtasks / batchTask.totalSubtasks) * 100
          : 0
      }
    })
  }

  /**
   * 生成变量组合（笛卡尔积）
   */
  private static generateVariableCombinations(
    variables: Record<string, Variable>,
    userValues: Record<string, any>
  ): Array<Record<string, any>> {
    const variableNames = Object.keys(variables)
    const combinations: Array<Record<string, any>> = []

    // 为每个变量生成可能的值列表
    const valueLists: Array<Array<any>> = variableNames.map(name => {
      const variable = variables[name]

      // 如果用户有提供值，使用用户的值
      if (userValues[name] !== undefined) {
        return [userValues[name]]
      }

      // 根据变量类型生成值列表
      switch (variable.type) {
        case 'select':
          return variable.options || []
        case 'number':
          // 如果是数字类型，根据默认值生成一个值
          return [variable.defaultValue || 0]
        case 'text':
        default:
          // 如果是文本类型，使用默认值或空字符串
          return [variable.defaultValue || '']
      }
    })

    // 计算笛卡尔积
    this.calculateCartesianProduct(valueLists, 0, [], combinations, variableNames)

    return combinations
  }

  /**
   * 递归计算笛卡尔积
   */
  private static calculateCartesianProduct(
    valueLists: Array<Array<any>>,
    index: number,
    current: Array<any>,
    result: Array<Record<string, any>>,
    variableNames: Array<string>
  ): void {
    if (index === valueLists.length) {
      const combination: Record<string, any> = {}
      variableNames.forEach((name, i) => {
        combination[name] = current[i]
      })
      result.push(combination)
      return
    }

    for (const value of valueLists[index]) {
      current.push(value)
      this.calculateCartesianProduct(valueLists, index + 1, current, result, variableNames)
      current.pop()
    }
  }

  /**
   * 更新批量任务统计信息
   */
  private static async updateBatchTaskStatistics(batchTaskId: string): Promise<void> {
    await withDatabase(async (db) => {
      const subtasks = await db.getBatchSubTasks(batchTaskId)

      const completed = subtasks.filter(t => t.status === 'completed').length
      const failed = subtasks.filter(t => t.status === 'failed').length
      const totalCost = subtasks.reduce((sum, t) => sum + (t.cost || 0), 0)

      let status = 'running'
      if (completed + failed === subtasks.length) {
        status = failed > 0 ? 'completed_with_errors' : 'completed'
      }

      await db.updateBatchTask(batchTaskId, {
        completedSubtasks: completed,
        failedSubtasks: failed,
        totalCost,
        status,
        updatedAt: new Date().toISOString()
      })
    })
  }

  /**
   * 获取模型的基础成本
   */
  private static getBaseCostForModel(model: string): number {
    const modelCosts: Record<string, number> = {
      'dall-e-3': 0.04,
      'midjourney-v6': 0.03,
      'midjourney-v5.2': 0.025,
      'stable-diffusion-xl': 0.01,
      'flux-pro': 0.03,
      'gemini-2.5-flash-image': 1.6,
      'runway-gen3': 0.25,
      'runway-gen2': 0.15,
      'pika-labs': 0.12,
      'stable-video': 0.08
    }

    return modelCosts[model] || 0.04 // 默认成本
  }
}

/**
 * 工具函数：创建批量任务
 */
export async function createBatchTask(config: BatchTaskConfig): Promise<BatchTaskResult> {
  return await BatchProcessor.createBatchTask(config)
}

/**
 * 工具函数：开始批量任务执行
 */
export async function startBatchExecution(batchTaskId: string): Promise<void> {
  return await BatchProcessor.startBatchExecution(batchTaskId)
}

/**
 * 工具函数：获取批量任务进度
 */
export async function getBatchTaskProgress(batchTaskId: string): Promise<any> {
  return await BatchProcessor.getBatchTaskProgress(batchTaskId)
}

/**
 * 工具函数：取消批量任务
 */
export async function cancelBatchTask(batchTaskId: string): Promise<void> {
  return await BatchProcessor.cancelBatchTask(batchTaskId)
}
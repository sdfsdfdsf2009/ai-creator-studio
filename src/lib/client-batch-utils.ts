// 客户端批量任务工具 - 避免服务端依赖
import { Variable, expandVariables, calculateVariableCost, generateDefaultValues } from './variables'

export interface ClientBatchTaskConfig {
  name: string
  description?: string
  basePrompt: string
  mediaType: 'image' | 'video'
  model?: string // 保留向后兼容
  models?: Array<{    // 新的多模型配置
    modelId: string
    quantity: number
    parameters?: Record<string, any>
  }>
  baseParameters?: Record<string, any>
  variables: Record<string, Variable>
  userValues?: Record<string, any>
}

export interface ClientBatchTaskResult {
  batchTaskId: string
  totalSubtasks: number
  subtasks: Array<{
    taskId: string
    modelId: string
    quantity: number
    variableValues: Record<string, any>
    expandedPrompt: string
    costEstimate: number
  }>
  totalCostEstimate: number
  modelBreakdown: Array<{
    modelId: string
    totalTasks: number
    totalCost: number
  }>
}

// AI 模型配置
export const AI_MODELS = {
  image: [
    { id: 'dall-e-3', name: 'DALL-E 3', provider: 'OpenAI', cost: 0.04 },
    { id: 'midjourney-v6', name: 'MidJourney v6', provider: 'MidJourney', cost: 0.03 },
    { id: 'midjourney-v5.2', name: 'MidJourney v5.2', provider: 'MidJourney', cost: 0.025 },
    { id: 'stable-diffusion-xl', name: 'Stable Diffusion XL', provider: 'Stability AI', cost: 0.01 },
    { id: 'flux-pro', name: 'Flux Pro', provider: 'Black Forest Labs', cost: 0.03 },
    { id: 'gpt-4o-image', name: 'GPT-4O Image (Nano Banana)', provider: 'Nano Banana', cost: 0.08 },
  ],
  video: [
    { id: 'runway-gen3', name: 'Runway Gen-3', provider: 'Runway', cost: 0.25 },
    { id: 'runway-gen2', name: 'Runway Gen-2', provider: 'Runway', cost: 0.15 },
    { id: 'pika-labs', name: 'Pika Labs', provider: 'Pika Labs', cost: 0.12 },
    { id: 'stable-video', name: 'Stable Video', provider: 'Stability AI', cost: 0.08 },
  ]
}

/**
 * 客户端批量任务处理器类
 */
export class ClientBatchProcessor {

  /**
   * 预览批量任务配置（不创建任务）
   */
  static previewBatchTask(config: ClientBatchTaskConfig): ClientBatchTaskResult {
    // 处理多模型配置（兼容旧的单模型配置）
    const models = config.models || (config.model ? [{
      modelId: config.model,
      quantity: 1,
      parameters: config.baseParameters || {}
    }] : [])

    if (models.length === 0) {
      throw new Error('At least one model must be specified')
    }

    // 验证用户提供的变量值
    const userValues = config.userValues || {}
    const variableValues = { ...generateDefaultValues(config.variables), ...userValues }

    // 生成所有可能的变量组合（笛卡尔积）
    const variableCombinations = this.generateVariableCombinations(config.variables, variableValues)

    // 计算总任务数（变量组合数 × 各模型数量之和）
    const totalTasks = variableCombinations.length * models.reduce((sum, model) => sum + model.quantity, 0)

    // 为每个变量组合和每个模型创建子任务预览
    const subtasks: ClientBatchTaskResult['subtasks'] = []
    let totalCostEstimate = 0
    const modelBreakdown: ClientBatchTaskResult['modelBreakdown'] = []

    let taskIndex = 0

    for (let i = 0; i < variableCombinations.length; i++) {
      const combination = variableCombinations[i]
      const expandedPrompt = expandVariables(config.basePrompt, config.variables, combination)

      // 为每个模型配置创建相应数量的任务
      for (const modelConfig of models) {
        const baseCost = this.getBaseCostForModel(modelConfig.modelId)

        // 为该模型的每个数量创建任务
        for (let q = 0; q < modelConfig.quantity; q++) {
          // 计算单个任务的预估成本
          const costEstimate = calculateVariableCost(baseCost, config.variables, combination, 1)
          totalCostEstimate += costEstimate

          const taskId = `preview-${taskIndex}`

          subtasks.push({
            taskId,
            modelId: modelConfig.modelId,
            quantity: 1, // 每个子任务对应一个具体任务
            variableValues: combination,
            expandedPrompt,
            costEstimate
          })

          taskIndex++
        }
      }
    }

    // 计算模型分解统计
    for (const modelConfig of models) {
      const modelTaskCount = variableCombinations.length * modelConfig.quantity
      const modelCost = modelTaskCount * this.getBaseCostForModel(modelConfig.modelId)

      modelBreakdown.push({
        modelId: modelConfig.modelId,
        totalTasks: modelTaskCount,
        totalCost: modelCost
      })
    }

    return {
      batchTaskId: 'preview',
      totalSubtasks: totalTasks,
      subtasks,
      totalCostEstimate,
      modelBreakdown
    }
  }

  /**
   * 生成变量组合（笛卡尔积）
   */
  private static generateVariableCombinations(
    variables: Record<string, Variable>,
    userValues: Record<string, any>
  ): Array<Record<string, any>> {
    const variableNames = Object.keys(variables)

    // 如果没有变量，直接返回空数组
    if (variableNames.length === 0) {
      return []
    }

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
   * 获取模型的基础成本
   */
  private static getBaseCostForModel(model: string): number {
    const modelCosts: Record<string, number> = {
      'dall-e-3': 0.04,
      'midjourney-v6': 0.03,
      'midjourney-v5.2': 0.025,
      'stable-diffusion-xl': 0.01,
      'flux-pro': 0.03,
      'gpt-4o-image': 0.08,
      'runway-gen3': 0.25,
      'runway-gen2': 0.15,
      'pika-labs': 0.12,
      'stable-video': 0.08
    }

    return modelCosts[model] || 0.04 // 默认成本
  }
}

/**
 * 工具函数：创建批量任务（通过API）
 */
export async function createBatchTaskViaAPI(config: ClientBatchTaskConfig): Promise<ClientBatchTaskResult> {
  const response = await fetch('/api/batch-tasks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'create',
      ...config
    })
  })

  const result = await response.json()
  if (!result.success) {
    throw new Error(result.error || 'Failed to create batch task')
  }

  return result.data
}

/**
 * 工具函数：预览批量任务（客户端计算）
 */
export function previewBatchTask(config: ClientBatchTaskConfig): ClientBatchTaskResult {
  return ClientBatchProcessor.previewBatchTask(config)
}
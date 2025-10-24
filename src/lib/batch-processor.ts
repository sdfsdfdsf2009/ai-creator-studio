// 批量任务处理器 - 处理变量展开和批量任务创建

import { v4 as uuidv4 } from 'uuid'
import { Variable, expandVariables, calculateVariableCost, generateDefaultValues } from './variables'
import { withDatabase } from './database'

export interface BatchTaskConfig {
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

export interface BatchTaskResult {
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
   * 创建批量任务 - 基于变量配置生成所有子任务（支持多模型）
   */
  static async createBatchTask(config: BatchTaskConfig): Promise<BatchTaskResult> {
    const now = new Date().toISOString()

    // 生成批量任务ID
    const batchTaskId = uuidv4()

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

    // 计算总任务数（区分有变量和无变量两种情况）
    const totalTasks = variableCombinations.length === 0
      ? models.reduce((sum, model) => sum + model.quantity, 0)  // 无变量：每个模型1个任务
      : variableCombinations.length * models.reduce((sum, model) => sum + model.quantity, 0)  // 有变量：组合数×模型数量

    // 创建批量任务记录
    const batchTask = {
      id: batchTaskId,
      name: config.name,
      description: config.description || '',
      basePrompt: config.basePrompt,
      mediaType: config.mediaType,
      model: config.model || models[0].modelId, // 向后兼容
      models: models, // 存储多模型配置
      baseParameters: config.baseParameters || {},
      variableDefinitions: config.variables,
      totalSubtasks: totalTasks,
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

    // 为每个变量组合和每个模型创建子任务和变量集
    const subtasks: BatchTaskResult['subtasks'] = []
    let totalCostEstimate = 0
    const modelBreakdown: BatchTaskResult['modelBreakdown'] = []

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

          const taskId = uuidv4()

          // 合并参数：模型特定参数 + 基础参数
          const mergedParameters = {
            ...config.baseParameters,
            ...modelConfig.parameters
          }

          // 创建子任务
          const subtask = {
            id: taskId,
            type: config.mediaType,
            prompt: expandedPrompt,
            status: 'pending',
            progress: 0,
            results: [],
            cost: 0,
            model: modelConfig.modelId,
            parameters: mergedParameters,
            batchId: batchTaskId,
            variableValues: combination,
            isBatchRoot: false,
            batchIndex: taskIndex,
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
            modelId: modelConfig.modelId,
            costEstimate,
            status: 'pending',
            createdAt: now
          }

          subtasks.push({
            taskId,
            modelId: modelConfig.modelId,
            quantity: 1, // 每个子任务对应一个具体任务
            variableValues: combination,
            expandedPrompt,
            costEstimate
          })

          // 保存到数据库
          await withDatabase(async (db) => {
            await db.createTask(subtask)
            await db.createVariableSet(variableSet)
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

    // 更新批量任务的总成本预估
    await withDatabase(async (db) => {
      await db.updateBatchTask(batchTaskId, {
        totalCost: totalCostEstimate,
        status: 'pending'
      })
    })

    return {
      batchTaskId,
      totalSubtasks: totalTasks,
      subtasks,
      totalCostEstimate,
      modelBreakdown
    }
  }

  /**
   * 开始执行批量任务
   */
  static async startBatchExecution(batchTaskId: string): Promise<void> {
    console.log(`🚀 Starting batch execution for ${batchTaskId}`)

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

    console.log(`📋 Found ${subtasks.items.length} subtasks to execute`)

    // 🔧 NEW: 实现任务队列机制避免并发冲突
    const maxConcurrentTasks = 2 // 限制最大并发数
    const executingTasks = new Set<string>()

    // 创建任务队列处理函数
    const processSubTaskWithQueue = async (subtask: any) => {
      // 等待可用槽位
      while (executingTasks.size >= maxConcurrentTasks) {
        console.log(`⏳ [BATCH-DEBUG] Waiting for available slot... (executing: ${executingTasks.size})`)
        await new Promise(resolve => setTimeout(resolve, 1000)) // 等待1秒
      }

      // 标记任务为执行中
      executingTasks.add(subtask.id)

      try {
        console.log(`🔄 [BATCH-DEBUG] Processing subtask ${subtask.id}: ${subtask.prompt.substring(0, 50)}...`)

        // 使用超时保护执行子任务
        await Promise.race([
          this.executeSubTask(subtask),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('子任务执行超时')), 300000) // 5分钟超时
          )
        ])

        console.log(`✅ [BATCH-DEBUG] Subtask ${subtask.id} completed`)
      } catch (error) {
        console.error(`❌ [BATCH-DEBUG] Subtask ${subtask.id} failed:`, error)

        // 增强错误处理 - 确保状态同步和错误记录
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        const errorDetails = {
          message: errorMessage,
          stack: error?.stack,
          name: error?.name,
          code: error?.code,
          statusCode: error?.statusCode
        }

        console.error(`🔍 [BATCH-DEBUG] Subtask ${subtask.id} error details:`, errorDetails)

        try {
          await this.updateSubTaskProgress({
            taskId: subtask.id,
            status: 'failed',
            progress: 0,
            error: errorMessage
          })
          console.log(`📝 [BATCH-DEBUG] Updated subtask ${subtask.id} status to failed`)
        } catch (updateError) {
          console.error(`❌ [BATCH-DEBUG] Failed to update subtask status for ${subtask.id}:`, updateError)
          // 即使状态更新失败，也要继续执行下一个子任务，避免阻塞整个批量任务
        }
      } finally {
        // 释放执行槽位
        executingTasks.delete(subtask.id)
        console.log(`🔓 [BATCH-DEBUG] Released slot for subtask ${subtask.id}. Active: ${executingTasks.size}`)
      }
    }

    // 实际执行每个子任务
    console.log(`📋 [BATCH-DEBUG] Starting parallel subtask execution with max concurrency: ${maxConcurrentTasks}`)

    // 创建所有子任务的执行Promise
    const taskPromises = subtasks.items.map(subtask =>
      processSubTaskWithQueue(subtask)
    )

    // 等待所有任务完成
    await Promise.allSettled(taskPromises)

    // 检查批量任务是否完成
    await this.checkBatchCompletion(batchTaskId)

    console.log(`🏁 Batch execution completed for ${batchTaskId}`)
  }

  /**
   * 🔧 NEW: 带超时保护的子任务执行方法
   */
  private static async executeSubTaskWithTimeout(subtask: any): Promise<void> {
    return this.executeSubTask(subtask)
  }

  /**
   * 🔧 NEW: 智能错误处理和重试的子任务执行方法
   */
  private static async executeSubTaskWithErrorHandling(subtask: any): Promise<{ success: boolean, results: string[], errorMessage?: string }> {
    try {
      // 尝试正常执行
      await this.executeSubTask(subtask)
      return { success: true, results: await this.getSubTaskResults(subtask.id) }
    } catch (error: any) {
      console.error(`❌ [BATCH-DEBUG] Subtask execution error:`, error)

      // 检查是否是prompt长度错误
      if (error.message && error.message.includes('Prompt长度超过限制')) {
        console.log(`🔧 [BATCH-DEBUG] Prompt length error detected, attempting smart truncation`)

        // 智能截断prompt并重试
        const truncatedPrompt = subtask.prompt ? subtask.prompt.substring(0, 1800) : '' // 截断到1800字符
        console.log(`🔧 [BATCH-DEBUG] Truncated prompt from ${subtask.prompt?.length || 0} to ${truncatedPrompt.length} chars`)

        try {
          // 临时更新subtask的prompt，用于API调用
          const tempSubtask = { ...subtask, prompt: truncatedPrompt }
          await this.executeSubTask(tempSubtask)
          return { success: true, results: await this.getSubTaskResults(subtask.id) }
        } catch (retryError: any) {
          console.error(`❌ [BATCH-DEBUG] Retry with truncated prompt failed:`, retryError)

          // 如果重试也失败，返回部分成功结果
          const existingResults = await this.getSubTaskResults(subtask.id)
          return {
            success: false,
            results: existingResults,
            errorMessage: `Prompt长度错误，已截断重试但仍失败。建议手动缩短prompt后重试。原错误: ${error.message}`
          }
        }
      } else {
        // 其他类型的错误，直接返回失败
        return {
          success: false,
          results: [],
          errorMessage: error.message || '未知错误'
        }
      }
    }
  }

  /**
   * 🔧 NEW: 获取子任务的生成结果
   */
  private static async getSubTaskResults(taskId: string): Promise<string[]> {
    try {
      const { withDatabase } = require('@/lib/database')
      const materials = await withDatabase(async (db) => {
        return db.getMaterialsByTaskId(taskId)
      })

      return materials.map((material: any) => material.url)
    } catch (error) {
      console.error(`❌ [BATCH-DEBUG] Failed to get subtask results:`, error)
      return []
    }
  }

  /**
   * 执行单个子任务
   */
  private static async executeSubTask(subtask: any): Promise<void> {
    // 更新任务状态为运行中
    await this.updateSubTaskProgress({
      batchTaskId: subtask.batchId,
      taskId: subtask.id,
      status: 'running',
      progress: 0
    })

    try {
      console.log(`🎨 [BATCH-DEBUG] Starting subtask execution: ${subtask.id}`)
      console.log(`🔍 [BATCH-DEBUG] Subtask details:`, {
        id: subtask.id,
        mediaType: subtask.type, // 修复：使用正确的字段名
        modelId: subtask.model, // 修复：使用正确的字段名
        prompt: subtask.prompt?.substring(0, 100),
        parameters: subtask.parameters,
        batchId: subtask.batchId
      })

      // 🚀 集成真实的AI生成服务（复用单个任务的成功逻辑）
      console.log(`📦 [BATCH-DEBUG] Importing aiService...`)
      const { aiService } = await import('@/lib/ai-service')
      console.log(`✅ [BATCH-DEBUG] aiService imported successfully`)

      // 确保AI服务已初始化
      console.log(`🔧 [BATCH-DEBUG] Initializing aiService...`)
      await aiService.initialize()
      console.log(`✅ [BATCH-DEBUG] aiService initialized successfully`)

      let results: string[] = []

      // 根据任务类型调用相应的生成方法
      if (subtask.type === 'image') {
        console.log(`🖼️ [BATCH-DEBUG] Starting image generation...`)
        console.log(`📋 [BATCH-DEBUG] Task config: model=${subtask.model}, prompt="${subtask.prompt.substring(0, 50)}..."`)

        // 检查模型是否可用
        console.log(`🔍 [BATCH-DEBUG] Testing model availability for: ${subtask.model}`)
        const isModelAvailable = await aiService.testModel(subtask.model)
        console.log(`📊 [BATCH-DEBUG] Model ${subtask.model} availability:`, isModelAvailable)

        if (!isModelAvailable) {
          console.error(`❌ [BATCH-DEBUG] Model ${subtask.model} is not available!`)
          throw new Error(`模型 ${subtask.model} 不可用，请检查代理配置`)
        }

        console.log(`✅ [BATCH-DEBUG] Model is available, proceeding with generation...`)

        // 获取要生成的图片数量
        const quantity = subtask.parameters?.quantity || 1
        console.log(`开始批量图片生成任务: model=${subtask.model}, quantity=${quantity}, prompt="${subtask.prompt.substring(0, 50)}..."`)

        // 多次调用API生成多张图片
        console.log(`🔄 [BATCH-DEBUG] Starting image generation loop, quantity: ${quantity}`)
        results = []
        for (let i = 0; i < quantity; i++) {
          try {
            console.log(`🎨 [BATCH-DEBUG] Generating image ${i + 1}/${quantity}...`)

            // 为每张图片使用不同的seed确保多样性
            const imageParameters = {
              ...subtask.parameters,
              seed: subtask.parameters?.seed ? subtask.parameters.seed + i : undefined,
              // 每次只生成1张，让API调用次数等于quantity
              quantity: 1
            }

            console.log(`⚙️ [BATCH-DEBUG] Calling aiService.generateImage with:`, {
              model: subtask.model,
              prompt: subtask.prompt?.substring(0, 100),
              parameters: imageParameters
            })

            const imageResults = await aiService.generateImage(subtask.model, subtask.prompt, imageParameters)

            console.log(`📸 [BATCH-DEBUG] AI generation completed, results:`, imageResults)
            results.push(...imageResults)

            console.log(`✅ [BATCH-DEBUG] Image ${i + 1}/${quantity} completed, got ${imageResults.length} images`)

            // 更新进度 - 基于已完成的图片数量
            const progress = Math.round(((i + 1) / quantity) * 80) // 80%用于生成，20%用于最终处理
            await this.updateSubTaskProgress({
              batchTaskId: subtask.batchId,
              taskId: subtask.id,
              status: 'running',
              progress
            })

          } catch (error) {
            console.error(`❌ [BATCH-DEBUG] Image ${i + 1} generation failed:`, error)
            console.error(`❌ [BATCH-DEBUG] Error details:`, {
              message: error?.message,
              stack: error?.stack,
              name: error?.name,
              code: error?.code,
              statusCode: error?.statusCode
            })
            // 单张图片失败不影响其他图片，继续生成剩余的
          }
        }

        console.log(`所有图片生成完成，共获得 ${results.length} 张图片（要求: ${quantity} 张）`)

      } else if (subtask.type === 'video') {
        console.log(`开始批量视频生成任务: model=${subtask.model}`)
        results = await aiService.generateVideo(subtask.model, subtask.prompt, subtask.parameters)

        // 更新进度 - 视频生成步骤较多，中间更新
        await this.updateSubTaskProgress({
          batchTaskId: subtask.batchId,
          taskId: subtask.id,
          status: 'running',
          progress: 30
        })
        await new Promise(resolve => setTimeout(resolve, 2000))
        await this.updateSubTaskProgress({
          batchTaskId: subtask.batchId,
          taskId: subtask.id,
          status: 'running',
          progress: 70
        })
      }

      console.log(`✅ Subtask execution completed: ${subtask.id}`)

      // 🎁 创建真实的结果对象（使用真实AI生成的结果）
      const realResult = {
        id: `result-${subtask.id}`,
        taskId: subtask.id,
        type: subtask.type, // 修复：使用正确的字段名
        results: results, // 真实的AI生成结果URLs
        prompt: subtask.prompt,
        model: subtask.model, // 修复：使用正确的字段名
        cost: subtask.cost || 0, // 修复：使用正确的字段名
        metadata: {
          width: subtask.parameters?.width || 1024,
          height: subtask.parameters?.height || 1024,
          quantity: results.length,
          steps: [
            "🎨 AI生成中...",
            "✅ 生成完成",
            "📸 已保存到素材库"
          ]
        },
        createdAt: new Date().toISOString(),
        status: 'completed'
      }

      console.log(`💾 Storing real AI generation result for subtask ${subtask.id}:`, realResult)

      // 📁 更新任务为完成状态并存储真实结果
      await this.updateSubTaskProgress({
        batchTaskId: subtask.batchId,
        taskId: subtask.id,
        status: 'completed',
        progress: 100,
        result: realResult
      })

      // 🎁 自动保存真实生成的结果到素材库
      await this.saveRealResultsToMaterialLibrary(subtask, realResult)

      console.log(`🎉 Subtask ${subtask.id} completed with real AI generation results stored`)
    } catch (error) {
      console.error(`❌ Subtask ${subtask.id} execution failed:`, error)
      await this.updateSubTaskProgress({
        batchTaskId: subtask.batchId,
        taskId: subtask.id,
        status: 'failed',
        progress: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * 保存结果到素材库
   */
  private static async saveToMaterialLibrary(subtask: any, result: any): Promise<void> {
    await withDatabase(async (db) => {
      const material = {
        id: `material-${subtask.id}`, // 使用不同的ID避免冲突
        name: `批量任务生成 - ${subtask.prompt.substring(0, 30)}${subtask.prompt.length > 30 ? '...' : ''}`,
        type: subtask.mediaType || result.type || 'image',
        url: result.url,
        thumbnailUrl: result.thumbnailUrl,
        size: `${result.metadata?.width || 1024}x${result.metadata?.height || 1024}`,
        format: 'jpg',
        width: result.metadata?.width || 1024,
        height: result.metadata?.height || 1024,
        duration: subtask.mediaType === 'video' ? 30 : null, // 视频默认30秒
        prompt: result.prompt,
        model: subtask.modelId,
        tags: ['批量任务生成', subtask.modelId],
        category: 'default',
        description: `批量任务生成的${subtask.mediaType === 'video' ? '视频' : '图片'}，使用${subtask.modelId}模型`,
        metadata: {
          ...result.metadata,
          batchTaskId: subtask.batchId,
          subtaskId: subtask.id,
          generatedBy: 'batch-task'
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        taskId: subtask.id
      }

      await db.createMaterial(material)
      console.log(`📚 Material saved to library:`, material.id)
    })
  }

  /**
   * 保存真实AI生成结果到素材库（复用单个任务的逻辑）
   */
  private static async saveRealResultsToMaterialLibrary(subtask: any, result: any): Promise<void> {
    await withDatabase(async (db) => {
      // 为每个生成的结果创建素材库条目（复用单个任务的素材保存逻辑）
      for (let i = 0; i < result.results.length; i++) {
        const resultUrl = result.results[i]
        const materialId = `material-${Date.now()}-${i}`

        // 估算文件信息（复用单个任务的逻辑）
        const fileInfo = await this.getFileInfo(resultUrl, subtask.type) // 修复：使用正确的字段名

        const material = {
          id: materialId,
          name: `${subtask.prompt.substring(0, 30)}${subtask.prompt.length > 30 ? '...' : ''} - ${i + 1}`,
          type: subtask.type, // 修复：使用正确的字段名
          url: resultUrl,
          thumbnailUrl: subtask.type === 'image' ? resultUrl : undefined, // 修复：使用正确的字段名
          size: fileInfo.size,
          format: fileInfo.format,
          width: fileInfo.width,
          height: fileInfo.height,
          duration: fileInfo.duration,
          prompt: result.prompt,
          model: subtask.model, // 修复：使用正确的字段名
          tags: this.extractTagsFromPrompt(subtask.prompt),
          category: this.inferCategoryFromPrompt(subtask.prompt),
          description: `由 ${subtask.modelId} 生成的${subtask.mediaType === 'image' ? '图片' : '视频'}（批量任务）`,
          metadata: {
            ...result.metadata,
            batchTaskId: subtask.batchId,
            subtaskId: subtask.id,
            parameters: subtask.parameters,
            cost: subtask.costEstimate,
            generatedBy: 'batch-task'
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          taskId: subtask.id,
        }

        await db.createMaterial(material)
      }

      console.log(`📚 Saved ${result.results.length} real AI generation materials to library`)
    })
  }

  /**
   * 获取文件信息（复用单个任务的逻辑）
   */
  private static async getFileInfo(url: string, type: 'image' | 'video') {
    // 在实际项目中，这里应该发送HEAD请求或下载文件来获取真实信息
    // 现在返回模拟数据
    if (type === 'image') {
      return {
        size: Math.floor(Math.random() * 2000000) + 500000, // 500KB - 2.5MB
        format: 'jpg',
        width: 1024,
        height: 1024,
      }
    } else {
      return {
        size: Math.floor(Math.random() * 10000000) + 5000000, // 5MB - 15MB
        format: 'mp4',
        duration: 5,
        width: 1024,
        height: 1024,
      }
    }
  }

  /**
   * 从提示词提取标签（复用单个任务的逻辑）
   */
  private static extractTagsFromPrompt(prompt: string): string[] {
    const tags: string[] = []
    const lowerPrompt = prompt.toLowerCase()

    // 简单的关键词提取
    const keywords: Record<string, string[]> = {
      '人物': ['person', 'woman', 'man', 'girl', 'boy', 'people', 'character'],
      '风景': ['landscape', 'mountain', 'ocean', 'sky', 'nature', 'forest', 'beach'],
      '动物': ['cat', 'dog', 'bird', 'animal', 'pet'],
      '建筑': ['building', 'house', 'city', 'architecture', 'street'],
      '艺术': ['art', 'painting', 'drawing', 'artistic', 'abstract'],
      '科技': ['technology', 'futuristic', 'sci-fi', 'robot', 'computer'],
      '美食': ['food', 'fruit', 'vegetable', 'delicious', 'meal'],
    }

    Object.entries(keywords).forEach(([tag, keywords]) => {
      if (keywords.some(keyword => lowerPrompt.includes(keyword))) {
        tags.push(tag)
      }
    })

    return tags
  }

  /**
   * 从提示词推断分类（复用单个任务的逻辑）
   */
  private static inferCategoryFromPrompt(prompt: string): string {
    const lowerPrompt = prompt.toLowerCase()

    if (lowerPrompt.includes('character') || lowerPrompt.includes('person') || lowerPrompt.includes('people')) {
      return 'characters'
    }
    if (lowerPrompt.includes('landscape') || lowerPrompt.includes('nature') || lowerPrompt.includes('mountain')) {
      return 'landscapes'
    }
    if (lowerPrompt.includes('abstract') || lowerPrompt.includes('artistic')) {
      return 'abstract'
    }
    if (lowerPrompt.includes('product') || lowerPrompt.includes('item') || lowerPrompt.includes('object')) {
      return 'products'
    }

    return 'default'
  }

  /**
   * 🔧 NEW: 获取子任务当前状态的方法
   */
  private static async getSubTaskStatus(taskId: string): Promise<string> {
    try {
      const task = await withDatabase(async (db) => {
        return await db.getTask(taskId)
      })
      return task?.status || 'unknown'
    } catch (error) {
      console.error(`❌ [BATCH-DEBUG] Failed to get subtask status for ${taskId}:`, error)
      return 'unknown'
    }
  }

  /**
   * 检查批量任务是否完成
   */
  private static async checkBatchCompletion(batchTaskId: string): Promise<void> {
    const batchProgress = await this.getBatchTaskProgress(batchTaskId)

    if (!batchProgress) return

    const allTasksCompleted = batchProgress.subtasks.every(
      (subtask: any) => subtask.status === 'completed' || subtask.status === 'failed'
    )

    if (allTasksCompleted) {
      const completedCount = batchProgress.subtasks.filter(
        (subtask: any) => subtask.status === 'completed'
      ).length
      const failedCount = batchProgress.subtasks.filter(
        (subtask: any) => subtask.status === 'failed'
      ).length

      // 更新批量任务状态
      const finalStatus = failedCount === 0 ? 'completed' : 'completed_with_errors'

      await withDatabase(async (db) => {
        await db.updateBatchTask(batchTaskId, {
          status: finalStatus,
          updatedAt: new Date().toISOString()
        })
      })

      console.log(`📊 Batch ${batchTaskId} finished: ${completedCount} completed, ${failedCount} failed`)
    }
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
  console.log('Creating batch task with config:', config)

  const result = await BatchProcessor.createBatchTask(config)

  console.log('✅ Batch task created successfully:', result.batchTaskId)

  // 🚀 NEW: 立即开始执行批量任务
  console.log('🔄 Starting auto-execution for batch task:', result.batchTaskId)
  await startBatchExecution(result.batchTaskId)

  console.log('📋 Auto-execution started for batch task:', result.batchTaskId)

  return result
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
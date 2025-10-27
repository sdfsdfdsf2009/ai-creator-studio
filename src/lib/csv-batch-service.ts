import { SQLiteDatabase } from './database'
import { CSVData, CSVBatchConfig } from './csv-types'
import { randomUUID } from 'crypto'

/**
 * CSV批量任务服务 - 专门处理CSV导入的批量任务创建和执行
 */
export class CSVBatchService {
  /**
   * 创建基于CSV数据的批量任务
   */
  static async createCSVBatchTask(config: CSVBatchConfig): Promise<string> {
    const db = new SQLiteDatabase('data/ai-creator-studio.db')

    try {
      // 创建批量任务
      const now = new Date().toISOString()
      const batchTaskId = randomUUID()

      const batchTask = await db.createBatchTask({
        id: batchTaskId,
        name: config.taskName,
        description: `从CSV文件导入的批量任务，共${config.data.length}个提示词`,
        basePrompt: config.data[0]?.prompt || '批量任务',
        mediaType: config.mediaType,
        model: config.modelIds[0], // 使用第一个模型作为主要模型
        baseParameters: config.defaultParams,
        variableDefinitions: {},
        totalSubtasks: config.data.length,
        completedSubtasks: 0,
        failedSubtasks: 0,
        totalCost: this.calculateCostEstimate(config),
        status: 'pending',
        createdAt: now,
        updatedAt: now
      })

      // 为每行创建子任务
      const subtaskIds = []
      for (let i = 0; i < config.data.length; i++) {
        const row = config.data[i]

        // 🔧 修复：处理空模型选择问题
        let model = row.model || config.modelIds[0]

        // 如果模型为空或无效，选择默认模型
        if (!model || model.trim() === '') {
          model = config.mediaType === 'video' ? 'Sora-2' : 'Gemini 2.5 Flash'
          console.log(`🔧 CSV模型选择为空，使用默认模型: ${model} (媒体类型: ${config.mediaType})`)
        }

        // 🎯 模型名称映射：用户定义名称 -> 实际API模型名称
        const getActualModelName = (displayName: string, mediaType: string) => {
          const mappings: Record<string, Record<string, string>> = {
            'Gemini 2.5 Flash': {
              'image': 'gemini-2.5-flash-image',
              'video': 'veo3.1-fast'
            },
            'Sora-2': {
              'video': 'veo3.1-fast'
            }
          }
          return mappings[displayName]?.[mediaType] || displayName
        }

        model = getActualModelName(model, config.mediaType)
        console.log(`🔧 CSV模型映射: ${row.model} -> ${model} (媒体类型: ${config.mediaType})`)
        const taskId = randomUUID()

        // 根据媒体类型选择合适的提示词
        console.log('🔍 CSV字段映射调试 - 处理行数据:', {
          mediaType: config.mediaType,
          rowData: row,
          availableFields: Object.keys(row)
        })

        let selectedPrompt = ''
        if (config.mediaType === 'video') {
          // 视频生成优先级：video_prompt > image_prompt > prompt
          selectedPrompt = row.video_prompt || row.image_prompt || row.prompt
        } else {
          // 图片生成优先级：image_prompt > prompt > video_prompt (备用)
          selectedPrompt = row.image_prompt || row.prompt || row.video_prompt
        }

        console.log('🎯 提示词选择结果:', {
          mediaType: config.mediaType,
          selectedPrompt: selectedPrompt,
          video_prompt: row.video_prompt,
          image_prompt: row.image_prompt,
          prompt: row.prompt
        })

        // 验证提示词不为空
        if (!selectedPrompt || selectedPrompt.trim() === '') {
          console.error('❌ 提示词为空，跳过该行:', row)
          continue // 跳过这行数据
        }

        const subtask = await db.createTask({
          id: taskId,
          type: config.mediaType,
          prompt: selectedPrompt,
          status: 'pending',
          model: model,
          parameters: {
            width: row.width || config.defaultParams.width,
            height: row.height || config.defaultParams.height,
            quantity: row.quantity || config.defaultParams.quantity,
            seed: row.seed,
            negative_prompt: row.negative_prompt,
            // 🔧 修复：添加图片URL传递，解决素材库选图生成视频的数据丢失问题
            image_urls: config.defaultParams.image_urls || []
          },
          batchId: batchTaskId,
          parentTaskId: null,
          isBatchRoot: false,
          batchIndex: i,
          variableValues: {},
          csvRowData: row,
          createdAt: now,
          updatedAt: now
        })

        subtaskIds.push(taskId)
      }

      console.log(`✅ 创建了批量任务 ${batchTaskId}，包含 ${subtaskIds.length} 个子任务`)

      return batchTaskId

    } catch (error) {
      console.error('创建CSV批量任务失败:', error)
      throw error
    } finally {
      await db.close()
    }
  }

  /**
   * 启动CSV批量任务执行
   */
  static async startCSVBatchExecution(batchTaskId: string): Promise<void> {
    try {
      console.log(`🚀 开始执行CSV批量任务: ${batchTaskId}`)

      // 直接调用BatchProcessor的执行方法
      // 这样可以复用现有的所有逻辑，包括AI生成、错误处理等
      const { BatchProcessor } = await import('./batch-processor')
      await BatchProcessor.startBatchExecution(batchTaskId)

      console.log(`✅ CSV批量任务执行已启动: ${batchTaskId}`)

    } catch (error) {
      console.error('CSV批量任务执行失败:', error)
      throw error
    }
  }

  /**
   * 获取CSV批量任务统计信息
   */
  static async getCSVBatchStats(batchTaskId: string): Promise<any> {
    const db = new SQLiteDatabase('data/ai-creator-studio.db')

    try {
      const subtasks = await db.getBatchSubTasks(batchTaskId)
      const completedTasks = subtasks.filter(task => task.status === 'completed')
      const failedTasks = subtasks.filter(task => task.status === 'failed')

      // 计算结果统计（如果有results表）
      let totalResults = 0
      let totalSize = 0

      // 这里简化实现，因为results表可能还没有数据
      try {
        for (const task of completedTasks) {
          if (task.result_count > 0) {
            totalResults += task.result_count
            totalSize += task.total_size || 0
          }
        }
      } catch (e) {
        console.warn('获取结果统计失败:', e.message)
      }

      const stats = {
        totalSubtasks: subtasks.length,
        completedSubtasks: completedTasks.length,
        failedSubtasks: failedTasks.length,
        totalResults,
        totalSize,
        successRate: subtasks.length > 0 ? ((completedTasks.length / subtasks.length) * 100) : 0
      }

      return stats

    } catch (error) {
      console.error('获取CSV批量任务统计失败:', error)
      throw error
    } finally {
      await db.close()
    }
  }

  /**
   * 计算CSV批量任务的成本估算
   */
  static calculateCostEstimate(config: CSVBatchConfig): number {
    // 这里简化实现，使用固定成本值
    // 实际实现中应该根据每个模型的实际成本计算
    const modelCosts: Record<string, number> = {
      'gpt-4o-image': 0.08,
      'dall-e-3': 0.04,
      'flux-pro': 0.05,
      'midjourney-v6': 0.1,
      'gemini-2.5-flash-image': 0.08,
      'stable-diffusion-xl': 0.03
    }

    let totalCost = 0

    for (const row of config.data) {
      const model = row.model || config.modelIds[0]
      const quantity = row.quantity || config.defaultParams.quantity
      const cost = modelCosts[model] || 0.01

      totalCost += cost * quantity
    }

    return totalCost
  }

  /**
   * 验证CSV配置
   */
  static validateCSVBatchConfig(config: CSVBatchConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // 验证基本参数
    if (!config.taskName || config.taskName.trim().length === 0) {
      errors.push('任务名称不能为空')
    }

    if (!config.data || config.data.length === 0) {
      errors.push('CSV数据不能为空')
    }

    if (!config.modelIds || config.modelIds.length === 0) {
      errors.push('必须选择至少一个模型')
    }

    if (!config.mediaType) {
      errors.push('必须选择媒体类型')
    }

    // 根据媒体类型验证数据（与前端逻辑保持一致）
    console.log('🔍 CSV验证 - 开始验证提示词数据 (媒体类型:', config.mediaType, ')')

    const validRowCount = config.data.filter(row => {
      if (!row) return false // 确保row不为undefined或null

      let selectedPrompt = ''
      if (config.mediaType === 'video') {
        // 视频生成优先级：video_prompt > image_prompt > prompt
        selectedPrompt = row.video_prompt || row.image_prompt || row.prompt
      } else {
        // 图片生成优先级：image_prompt > prompt > video_prompt (备用)
        selectedPrompt = row.image_prompt || row.prompt || row.video_prompt
      }

      return selectedPrompt && selectedPrompt.trim().length > 0
    }).length

    const totalRowCount = config.data.length

    // 详细统计各种提示词字段的情况
    const promptStats = {
      image_prompt_count: config.data.filter(row => row && row.image_prompt && row.image_prompt.trim().length > 0).length,
      video_prompt_count: config.data.filter(row => row && row.video_prompt && row.video_prompt.trim().length > 0).length,
      general_prompt_count: config.data.filter(row => row && row.prompt && row.prompt.trim().length > 0).length,
      valid_by_media_type: validRowCount
    }
    console.log('📊 CSV验证 - 提示词字段统计:', promptStats)

    if (validRowCount === 0) {
      if (config.mediaType === 'image') {
        errors.push(`CSV中没有有效的图片提示词数据。请确保包含"Combined Image Prompt"、"Image Prompt"或通用提示词列`)
      } else {
        errors.push(`CSV中没有有效的视频提示词数据。请确保包含"Image-to-Video Prompt"、"Video Prompt"或通用提示词列`)
      }
    }

    if (validRowCount < totalRowCount) {
      console.warn(`⚠️ CSV验证 - 只有${validRowCount}/${totalRowCount}行有效数据`)
      // 不将此作为错误，只记录警告，因为部分数据无效可能是正常的
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}
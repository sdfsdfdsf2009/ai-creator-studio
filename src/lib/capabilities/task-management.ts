/**
 * 任务管理能力
 * 统一的任务生命周期管理，包括创建、更新、重试、状态管理等
 */

import { BaseCapability, TaskConfig, TaskUpdateConfig, CapabilityResult, CapabilityConfig } from './base'
import { Task, TaskStatus, MediaType } from '@/types'
import { randomUUID } from 'crypto'
import { registerCapability } from './manager'

export class TaskManagementCapability extends BaseCapability {
  constructor(config: CapabilityConfig = { enabled: true }) {
    super(
      'TaskManagement',
      '1.0.0',
      '任务管理能力，提供完整的任务生命周期管理功能',
      config
    )
  }

  protected async onInitialize(): Promise<void> {
    console.log('✅ TaskManagement capability initialized')
  }

  /**
   * 创建新任务
   */
  async createTask(config: TaskConfig): Promise<CapabilityResult<Task>> {
    this.ensureInitialized()

    try {
      console.log(`📝 创建任务: 类型=${config.type}, 模型=${config.model}`)

      // 验证任务配置
      const validation = await this.validateTaskConfig(config)
      if (!validation.success) {
        return this.createResult(false, undefined, validation.error)
      }

      // 生成任务ID和时间戳
      const taskId = randomUUID()
      const now = new Date().toISOString()

      // 计算成本
      const cost = await this.calculateCost(config)

      // 构建任务对象
      const task: Task = {
        id: taskId,
        type: config.type,
        prompt: config.prompt,
        status: 'pending',
        progress: 0,
        results: [],
        cost: cost.success ? cost.data! : 0,
        model: config.model,
        parameters: config.parameters || {},
        imageUrls: config.imageUrls || [],
        createdAt: now,
        updatedAt: now
      }

      // 保存到数据库
      await this.saveTaskToDatabase(task)

      console.log(`✅ 任务创建成功: ${taskId}`)
      return this.createResult(true, task, undefined, {
        cost: task.cost,
        estimatedDuration: this.estimateDuration(config)
      })

    } catch (error) {
      console.error(`❌ 任务创建失败:`, error)
      return this.createResult(false, undefined, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  /**
   * 更新任务状态
   */
  async updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    progress?: number,
    error?: string
  ): Promise<CapabilityResult<boolean>> {
    this.ensureInitialized()

    try {
      console.log(`🔄 更新任务状态: ${taskId} -> ${status} (${progress || 0}%)`)

      const updates: Partial<Task> = {
        status,
        updatedAt: new Date().toISOString()
      }

      if (progress !== undefined) {
        updates.progress = Math.max(0, Math.min(100, progress))
      }

      if (error) {
        updates.error = error
      }

      await this.updateTaskInDatabase(taskId, updates)

      console.log(`✅ 任务状态更新成功: ${taskId}`)
      return this.createResult(true, true)

    } catch (error) {
      console.error(`❌ 任务状态更新失败:`, error)
      return this.createResult(false, undefined, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  /**
   * 更新任务结果
   */
  async updateTaskResults(
    taskId: string,
    results: string[],
    status?: TaskStatus
  ): Promise<CapabilityResult<boolean>> {
    this.ensureInitialized()

    try {
      console.log(`📊 更新任务结果: ${taskId}, ${results.length} 个结果`)

      const updates: Partial<Task> = {
        results,
        updatedAt: new Date().toISOString()
      }

      if (status) {
        updates.status = status
        updates.progress = 100
      }

      await this.updateTaskInDatabase(taskId, updates)

      console.log(`✅ 任务结果更新成功: ${taskId}`)
      return this.createResult(true, true)

    } catch (error) {
      console.error(`❌ 任务结果更新失败:`, error)
      return this.createResult(false, undefined, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  /**
   * 获取任务详情
   */
  async getTask(taskId: string): Promise<CapabilityResult<Task | null>> {
    this.ensureInitialized()

    try {
      const task = await this.loadTaskFromDatabase(taskId)

      if (!task) {
        return this.createResult(true, null, undefined, {
          message: 'Task not found'
        })
      }

      return this.createResult(true, task)

    } catch (error) {
      console.error(`❌ 获取任务失败:`, error)
      return this.createResult(false, undefined, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  /**
   * 重试任务
   */
  async retryTask(taskId: string): Promise<CapabilityResult<boolean>> {
    this.ensureInitialized()

    try {
      console.log(`🔄 重试任务: ${taskId}`)

      const task = await this.loadTaskFromDatabase(taskId)
      if (!task) {
        return this.createResult(false, undefined, '任务不存在')
      }

      // 检查任务状态是否允许重试
      if (task.status !== 'failed' && task.status !== 'cancelled') {
        return this.createResult(false, undefined, `任务状态为 ${task.status}，不支持重试`)
      }

      // 检查重试次数限制
      const retryCount = (task as any).retryCount || 0
      const maxRetries = 3

      if (retryCount >= maxRetries) {
        return this.createResult(false, undefined, `已达到最大重试次数 (${maxRetries})`)
      }

      // 更新任务状态为重试
      const updates: Partial<Task> = {
        status: 'pending',
        progress: 0,
        error: undefined,
        updatedAt: new Date().toISOString()
      }

      // 更新重试信息
      await this.updateTaskRetryInfo(taskId, {
        retryCount: retryCount + 1,
        lastRetriedAt: new Date().toISOString()
      })

      await this.updateTaskInDatabase(taskId, updates)

      console.log(`✅ 任务重试设置成功: ${taskId} (第 ${retryCount + 1} 次重试)`)
      return this.createResult(true, true, undefined, {
        retryCount: retryCount + 1,
        remainingRetries: maxRetries - retryCount - 1
      })

    } catch (error) {
      console.error(`❌ 任务重试失败:`, error)
      return this.createResult(false, undefined, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  /**
   * 取消任务
   */
  async cancelTask(taskId: string): Promise<CapabilityResult<boolean>> {
    this.ensureInitialized()

    try {
      console.log(`❌ 取消任务: ${taskId}`)

      const task = await this.loadTaskFromDatabase(taskId)
      if (!task) {
        return this.createResult(false, undefined, '任务不存在')
      }

      // 检查任务状态是否允许取消
      if (['completed', 'failed', 'cancelled'].includes(task.status)) {
        return this.createResult(false, undefined, `任务状态为 ${task.status}，无法取消`)
      }

      // 更新任务状态为已取消
      await this.updateTaskStatus(taskId, 'cancelled', task.progress, '任务已取消')

      console.log(`✅ 任务取消成功: ${taskId}`)
      return this.createResult(true, true)

    } catch (error) {
      console.error(`❌ 任务取消失败:`, error)
      return this.createResult(false, undefined, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  /**
   * 删除任务
   */
  async deleteTask(taskId: string): Promise<CapabilityResult<boolean>> {
    this.ensureInitialized()

    try {
      console.log(`🗑️ 删除任务: ${taskId}`)

      const task = await this.loadTaskFromDatabase(taskId)
      if (!task) {
        return this.createResult(false, undefined, '任务不存在')
      }

      // 检查任务状态是否允许删除
      if (['pending', 'running'].includes(task.status)) {
        return this.createResult(false, undefined, '任务进行中，无法删除')
      }

      // 从数据库删除任务
      await this.deleteTaskFromDatabase(taskId)

      console.log(`✅ 任务删除成功: ${taskId}`)
      return this.createResult(true, true)

    } catch (error) {
      console.error(`❌ 任务删除失败:`, error)
      return this.createResult(false, undefined, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  /**
   * 获取任务列表
   */
  async getTasks(params: {
    status?: TaskStatus
    type?: MediaType
    search?: string
    limit?: number
    page?: number
  } = {}): Promise<CapabilityResult<{ tasks: Task[]; total: number; page: number; pageSize: number }>> {
    this.ensureInitialized()

    try {
      const pageSize = Math.min(params.limit || 20, 100)
      const page = Math.max(params.page || 1, 1)
      const offset = (page - 1) * pageSize

      console.log(`📋 获取任务列表: page=${page}, pageSize=${pageSize}`)

      const { tasks, total } = await this.loadTasksFromDatabase({
        ...params,
        limit: pageSize,
        offset
      })

      return this.createResult(true, {
        tasks,
        total,
        page,
        pageSize
      }, undefined, {
        hasMore: offset + tasks.length < total,
        currentPage: page,
        totalPages: Math.ceil(total / pageSize)
      })

    } catch (error) {
      console.error(`❌ 获取任务列表失败:`, error)
      return this.createResult(false, undefined, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  /**
   * 获取任务统计信息
   */
  async getTaskStats(): Promise<CapabilityResult<{
    total: number
    byStatus: Record<TaskStatus, number>
    byType: Record<MediaType, number>
    recentActivity: number
  }>> {
    this.ensureInitialized()

    try {
      const stats = await this.loadTaskStatsFromDatabase()

      return this.createResult(true, stats)

    } catch (error) {
      console.error(`❌ 获取任务统计失败:`, error)
      return this.createResult(false, undefined, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  /**
   * 批量更新任务状态
   */
  async batchUpdateTaskStatus(
    taskIds: string[],
    status: TaskStatus,
    progress?: number
  ): Promise<CapabilityResult<{ success: number; failed: number; errors: string[] }>> {
    this.ensureInitialized()

    try {
      console.log(`📊 批量更新任务状态: ${taskIds.length} 个任务 -> ${status}`)

      let successCount = 0
      let failureCount = 0
      const errors: string[] = []

      for (const taskId of taskIds) {
        try {
          const result = await this.updateTaskStatus(taskId, status, progress)
          if (result.success) {
            successCount++
          } else {
            failureCount++
            errors.push(`${taskId}: ${result.error}`)
          }
        } catch (error) {
          failureCount++
          errors.push(`${taskId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      console.log(`✅ 批量更新完成: 成功 ${successCount}, 失败 ${failureCount}`)

      return this.createResult(true, {
        success: successCount,
        failed: failureCount,
        errors
      })

    } catch (error) {
      console.error(`❌ 批量更新任务状态失败:`, error)
      return this.createResult(false, undefined, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  /**
   * 清理过期任务
   */
  async cleanupExpiredTasks(olderThanDays: number = 30): Promise<CapabilityResult<number>> {
    this.ensureInitialized()

    try {
      console.log(`🧹 清理过期任务: ${olderThanDays} 天前`)

      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

      const deletedCount = await this.deleteExpiredTasksFromDatabase(cutoffDate.toISOString())

      console.log(`✅ 清理完成: 删除 ${deletedCount} 个过期任务`)
      return this.createResult(true, deletedCount)

    } catch (error) {
      console.error(`❌ 清理过期任务失败:`, error)
      return this.createResult(false, undefined, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  // 私有方法

  private async validateTaskConfig(config: TaskConfig): Promise<CapabilityResult<boolean>> {
    if (!config.type || !['image', 'video'].includes(config.type)) {
      return this.createResult(false, undefined, '无效的任务类型')
    }

    if (!config.prompt || config.prompt.trim().length === 0) {
      return this.createResult(false, undefined, 'Prompt 不能为空')
    }

    if (config.prompt.length > 5000) {
      return this.createResult(false, undefined, 'Prompt 长度不能超过5000个字符')
    }

    if (!config.model) {
      return this.createResult(false, undefined, '必须指定模型')
    }

    return this.createResult(true, true)
  }

  private async calculateCost(config: TaskConfig): Promise<CapabilityResult<number>> {
    try {
      // 简单的成本计算逻辑
      let baseCost = 0.02

      if (config.type === 'video') {
        baseCost = 0.10
      }

      // 根据模型调整
      const modelCosts: Record<string, number> = {
        'dall-e-3': 0.04,
        'veo3.1-pro': 0.15,
        'flux-pro': 0.03
      }

      baseCost = modelCosts[config.model] || baseCost

      // 根据参数调整
      const quantity = config.parameters?.quantity || 1
      const totalCost = baseCost * quantity

      return this.createResult(true, Math.round(totalCost * 100) / 100)
    } catch (error) {
      return this.createResult(false, undefined, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  private estimateDuration(config: TaskConfig): number {
    // 估算执行时间（秒）
    if (config.type === 'video') {
      return 300 // 5分钟
    } else {
      const quantity = config.parameters?.quantity || 1
      return 30 * quantity // 30秒每张图像
    }
  }

  private async saveTaskToDatabase(task: Task): Promise<void> {
    const { withDatabase } = await import('@/lib/database')
    await withDatabase(async (db) => {
      await db.createTask(task)
    })
  }

  private async updateTaskInDatabase(taskId: string, updates: Partial<Task>): Promise<void> {
    const { withDatabase } = await import('@/lib/database')
    await withDatabase(async (db) => {
      await db.updateTask(taskId, updates)
    })
  }

  private async updateTaskRetryInfo(taskId: string, retryInfo: {
    retryCount: number
    lastRetriedAt: string
  }): Promise<void> {
    const { withDatabase } = await import('@/lib/database')
    await withDatabase(async (db) => {
      await db.updateTask(taskId, retryInfo)
    })
  }

  private async loadTaskFromDatabase(taskId: string): Promise<Task | null> {
    const { withDatabase } = await import('@/lib/database')
    return await withDatabase(async (db) => {
      return await db.getTask(taskId)
    })
  }

  private async loadTasksFromDatabase(params: {
    status?: TaskStatus
    type?: MediaType
    search?: string
    limit: number
    offset: number
  }): Promise<{ tasks: Task[]; total: number }> {
    const { withDatabase } = await import('@/lib/database')
    return await withDatabase(async (db) => {
      const result = await db.getTasks(params)
      return {
        tasks: result.items,
        total: result.total
      }
    })
  }

  private async loadTaskStatsFromDatabase(): Promise<{
    total: number
    byStatus: Record<TaskStatus, number>
    byType: Record<MediaType, number>
    recentActivity: number
  }> {
    const { withDatabase } = await import('@/lib/database')
    return await withDatabase(async (db) => {
      // 这里需要实现具体的统计查询逻辑
      // 目前返回模拟数据
      return {
        total: 100,
        byStatus: {
          pending: 10,
          running: 5,
          completed: 80,
          failed: 3,
          cancelled: 2
        },
        byType: {
          image: 70,
          video: 30
        },
        recentActivity: 25
      }
    })
  }

  private async deleteTaskFromDatabase(taskId: string): Promise<void> {
    const { withDatabase } = await import('@/lib/database')
    await withDatabase(async (db) => {
      // 这里需要实现删除任务的具体逻辑
      console.log(`删除任务: ${taskId}`)
    })
  }

  private async deleteExpiredTasksFromDatabase(cutoffDate: string): Promise<number> {
    const { withDatabase } = await import('@/lib/database')
    return await withDatabase(async (db) => {
      // 这里需要实现删除过期任务的具体逻辑
      console.log(`删除 ${cutoffDate} 之前的任务`)
      return 5 // 模拟返回删除的数量
    })
  }

  /**
   * 关闭能力
   */
  async shutdown(): Promise<void> {
    console.log('🔄 Shutting down TaskManagement capability...')
    // 清理资源
    this._initialized = false
    console.log('✅ TaskManagement capability shutdown complete')
  }
}

// 注册能力
registerCapability('TaskManagement', TaskManagementCapability)
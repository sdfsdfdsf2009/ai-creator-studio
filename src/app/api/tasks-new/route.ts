/**
 * 重构后的任务API - 使用新的能力系统
 *
 * 主要改进：
 * 1. 使用能力组合器简化工作流
 * 2. 更好的错误处理和状态管理
 * 3. 支持能力系统健康检查
 * 4. 统一的响应格式
 */

import { NextRequest, NextResponse } from 'next/server'
import { initializeCapabilitySystem, CapabilityComposer, useTaskManagement, useExternalIntegration } from '@/lib/capabilities'
import { MediaType, TaskStatus } from '@/types'

// 计算成本的辅助函数
function calculateCost(type: MediaType, model: string, parameters: any): number {
  let baseCost = 0.02

  if (type === 'video') {
    baseCost = 0.10
  }

  // 根据模型调整成本
  const modelCosts: Record<string, number> = {
    'dall-e-3': 0.04,
    'veo3.1-pro': 0.15,
    'flux-pro': 0.03
  }

  baseCost = modelCosts[model] || baseCost

  // 根据数量调整
  const quantity = parameters?.quantity || 1
  return Math.round(baseCost * quantity * 100) / 100
}

/**
 * 处理任务创建请求
 */
async function handleTaskCreation(request: NextRequest): Promise<NextResponse> {
  try {
    // 确保能力系统已初始化
    await initializeCapabilitySystem()

    const body = await request.json()
    const { type, prompt, model, parameters } = body

    // 验证请求参数
    const validationResult = validateTaskRequest(body)
    if (!validationResult.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: validationResult.error,
          code: 'INVALID_REQUEST'
        },
        { status: 400 }
      )
    }

    console.log(`📝 创建任务请求: 类型=${type}, 模型=${model}, 提示="${prompt.substring(0, 50)}..."`)

    // 使用能力组合器处理任务
    const result = type === 'video'
      ? await CapabilityComposer.generateVideoWorkflow(
          prompt,
          model,
          parameters,
          body.imageUrls
        )
      : await CapabilityComposer.generateImageWorkflow(
          prompt,
          model,
          parameters
        )

    // 外部集成（可选，失败不影响主要功能）
    await handleExternalIntegration(result.task, type, prompt, model, parameters)

    console.log(`✅ 任务创建成功: ${result.task.id}`)
    console.log(`📊 任务详情: 状态=${result.task.status}, 成本=${result.task.cost}`)

    return NextResponse.json({
      success: true,
      data: {
        task: result.task,
        results: type === 'video' ? result.videos : [result.image],
        assets: result.assets,
        metadata: {
          workflow: type === 'video' ? 'video-generation' : 'image-generation',
          processingTime: Date.now(),
          cost: result.task.cost
        }
      }
    })

  } catch (error) {
    console.error('❌ 任务创建失败:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

/**
 * 验证任务请求参数
 */
function validateTaskRequest(body: any): { isValid: boolean; error?: string } {
  const { type, prompt, model } = body

  if (!type || !['image', 'video'].includes(type)) {
    return { isValid: false, error: 'Invalid type. Must be image or video' }
  }

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return { isValid: false, error: 'Prompt is required and must be a non-empty string' }
  }

  if (prompt.length > (type === 'video' ? 1000 : 4000)) {
    return {
      isValid: false,
      error: `Prompt too long. Maximum ${type === 'video' ? 1000 : 4000} characters`
    }
  }

  if (!model || typeof model !== 'string') {
    return { isValid: false, error: 'Model is required and must be a string' }
  }

  return { isValid: true }
}

/**
 * 处理外部集成
 */
async function handleExternalIntegration(
  task: any,
  type: MediaType,
  prompt: string,
  model: string,
  parameters: any
): Promise<void> {
  try {
    const externalIntegration = await useExternalIntegration()

    await externalIntegration.integrateWithFeishu({
      taskId: task.id,
      type,
      prompt,
      model,
      parameters,
      results: type === 'video'
        ? (task as any).videos?.map((v: any) => v.url) || []
        : [(task as any).image?.url].filter(Boolean)
    })
  } catch (error) {
    console.warn('外部集成失败，但不影响主要功能:', error)
  }
}

/**
 * 获取任务列表
 */
async function handleTaskList(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as TaskStatus | null
    const type = searchParams.get('type') as MediaType | null
    const search = searchParams.get('search')
    const limitParam = searchParams.get('limit')
    const pageParam = searchParams.get('page')

    console.log('📋 任务列表查询参数:', { status, type, search, limitParam, pageParam })

    // 计算分页参数
    const pageSize = limitParam && parseInt(limitParam) > 0 ? parseInt(limitParam) : 20
    const pageNumber = pageParam && parseInt(pageParam) > 0 ? parseInt(pageParam) : 1

    const params: any = {
      limit: pageSize,
      page: pageNumber
    }

    if (status) params.status = status
    if (type) params.type = type
    if (search) params.search = search

    const taskManager = await useTaskManagement()
    const result = await taskManager.getTasks(params)

    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch tasks')
    }

    const { tasks, total, page, pageSize: returnedPageSize } = result.data!

    console.log(`📊 查询结果: 总计 ${total} 个任务，当前页 ${page}，每页 ${returnedPageSize} 个`)

    return NextResponse.json({
      success: true,
      data: {
        items: tasks,
        pagination: {
          page,
          pageSize: returnedPageSize,
          total,
          totalPages: Math.ceil(total / returnedPageSize),
          hasNext: page * returnedPageSize < total,
          hasPrev: page > 1
        }
      }
    })

  } catch (error) {
    console.error('❌ 获取任务列表失败:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        code: 'FETCH_ERROR'
      },
      { status: 500 }
    )
  }
}

/**
 * 获取任务统计信息
 */
async function handleTaskStats(request: NextRequest): Promise<NextResponse> {
  try {
    const taskManager = await useTaskManagement()
    const result = await taskManager.getTaskStats()

    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch task stats')
    }

    return NextResponse.json({
      success: true,
      data: result.data
    })

  } catch (error) {
    console.error('❌ 获取任务统计失败:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        code: 'STATS_ERROR'
      },
      { status: 500 }
    )
  }
}

/**
 * 批量操作任务
 */
async function handleBatchOperation(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { taskIds, operation, parameters } = body

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Task IDs are required and must be a non-empty array',
          code: 'INVALID_TASK_IDS'
        },
        { status: 400 }
      )
    }

    if (!operation || !['cancel', 'retry', 'delete'].includes(operation)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid operation. Must be cancel, retry, or delete',
          code: 'INVALID_OPERATION'
        },
        { status: 400 }
      )
    }

    console.log(`🔄 批量${operation}操作: ${taskIds.length} 个任务`)

    const taskManager = await useTaskManagement()
    let result

    switch (operation) {
      case 'cancel':
        result = await taskManager.batchUpdateTaskStatus(taskIds, 'cancelled', 0)
        break
      case 'retry':
        // 重试需要逐个处理
        const retryResults = await Promise.allSettled(
          taskIds.map(taskId => taskManager.retryTask(taskId))
        )
        const successCount = retryResults.filter(r => r.status === 'fulfilled' && r.value.success).length
        const failureCount = taskIds.length - successCount
        result = { success: true, data: { successCount, failureCount } }
        break
      case 'delete':
        // 删除需要逐个处理
        const deleteResults = await Promise.allSettled(
          taskIds.map(taskId => taskManager.deleteTask(taskId))
        )
        const deleteSuccessCount = deleteResults.filter(r => r.status === 'fulfilled' && r.value.success).length
        const deleteFailureCount = taskIds.length - deleteSuccessCount
        result = { success: true, data: { successCount: deleteSuccessCount, failedCount: deleteFailureCount } }
        break
      default:
        throw new Error('Unsupported operation')
    }

    if (!result.success) {
      throw new Error(result.error || 'Batch operation failed')
    }

    console.log(`✅ 批量${operation}操作完成:`, result.data)

    return NextResponse.json({
      success: true,
      data: result.data
    })

  } catch (error) {
    console.error('❌ 批量操作失败:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        code: 'BATCH_ERROR'
      },
      { status: 500 }
    )
  }
}

// HTTP方法路由
export async function POST(request: NextRequest) {
  return await handleTaskCreation(request)
}

export async function GET(request: NextRequest) {
  return await handleTaskList(request)
}

// 支持额外的自定义方法
export async function PUT(request: NextRequest) {
  return await handleBatchOperation(request)
}

// 元数据端点
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({
    success: true,
    data: {
      endpoints: {
        'POST /': 'Create new task',
        'GET /': 'List tasks with pagination and filtering',
        'PUT /': 'Batch operations on tasks',
        'GET /stats': 'Get task statistics',
        'OPTIONS /': 'API metadata'
      },
      supportedTypes: ['image', 'video'],
      supportedOperations: ['cancel', 'retry', 'delete'],
      defaultPagination: { pageSize: 20, maxPageSize: 100 }
    }
  })
}
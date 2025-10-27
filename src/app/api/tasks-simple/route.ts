/**
 * 测试简化版任务API - 不使用复杂的能力系统
 */

import { NextRequest, NextResponse } from 'next/server'
import { withDatabase } from '@/lib/database'
import { TaskStatus, MediaType } from '@/types'
import { v4 as uuidv4 } from 'uuid'

// 计算成本的辅助函数
function calculateCost(type: MediaType, model: string, parameters: any): number {
  let baseCost = 0.02
  if (type === 'video') {
    baseCost = 0.10
  }
  const modelCosts: Record<string, number> = {
    'dall-e-3': 0.04,
    'veo3.1-pro': 0.15,
    'flux-pro': 0.03
  }
  baseCost = modelCosts[model] || baseCost
  const quantity = parameters?.quantity || 1
  return Math.round(baseCost * quantity * 100) / 100
}

/**
 * 处理任务创建请求
 */
async function handleTaskCreation(request: NextRequest): Promise<NextResponse> {
  try {
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

    console.log(`📝 [简化API] 创建任务请求: 类型=${type}, 模型=${model}, 提示="${prompt.substring(0, 50)}..."`)

    // 创建任务记录
    const taskId = uuidv4()
    const cost = calculateCost(type, model, parameters)

    await withDatabase(async (db) => {
      await db.createTask({
        id: taskId,
        type,
        prompt,
        model,
        parameters: JSON.stringify(parameters),
        status: 'pending',
        cost,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    })

    console.log(`✅ [简化API] 任务创建成功: ${taskId}`)

    // 模拟处理结果
    const results = type === 'image'
      ? [{ url: `https://example.com/image-${taskId}.jpg` }]
      : [{ url: `https://example.com/video-${taskId}.mp4` }]

    return NextResponse.json({
      success: true,
      data: {
        task: {
          id: taskId,
          type,
          prompt,
          model,
          status: 'completed',
          cost,
          createdAt: new Date().toISOString()
        },
        results,
        assets: [],
        metadata: {
          workflow: `${type}-generation`,
          processingTime: Date.now(),
          cost,
          simplified: true
        }
      }
    })

  } catch (error) {
    console.error('❌ [简化API] 任务创建失败:', error)
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
 * 获取任务列表
 */
async function handleTaskList(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const limitParam = searchParams.get('limit')
    const pageParam = searchParams.get('page')

    const pageSize = limitParam && parseInt(limitParam) > 0 ? parseInt(limitParam) : 20
    const pageNumber = pageParam && parseInt(pageParam) > 0 ? parseInt(pageParam) : 1
    const offset = (pageNumber - 1) * pageSize

    const tasks = await withDatabase(async (db) => {
      return await db.getTasks({
        limit: pageSize,
        offset,
        orderBy: 'createdAt',
        orderDirection: 'DESC'
      })
    })

    const total = await withDatabase(async (db) => {
      const result = await db.db.prepare('SELECT COUNT(*) as count FROM tasks').get()
      return result?.count || 0
    })

    return NextResponse.json({
      success: true,
      data: {
        items: tasks,
        pagination: {
          page: pageNumber,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
          hasNext: pageNumber * pageSize < total,
          hasPrev: pageNumber > 1
        }
      }
    })

  } catch (error) {
    console.error('❌ [简化API] 获取任务列表失败:', error)
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

// HTTP方法路由
export async function POST(request: NextRequest) {
  return await handleTaskCreation(request)
}

export async function GET(request: NextRequest) {
  return await handleTaskList(request)
}

// 元数据端点
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({
    success: true,
    data: {
      endpoints: {
        'POST /': 'Create new task (simplified)',
        'GET /': 'List tasks with pagination',
        'OPTIONS /': 'API metadata'
      },
      supportedTypes: ['image', 'video'],
      version: 'simplified-1.0.0',
      defaultPagination: { pageSize: 20, maxPageSize: 100 }
    }
  })
}
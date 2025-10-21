// 批量任务 API 路由

import { NextRequest, NextResponse } from 'next/server'
import { createBatchTask, startBatchExecution, getBatchTaskProgress, cancelBatchTask } from '@/lib/batch-processor'
import { withDatabase } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, ...config } = body

    switch (action) {
      case 'create': {
        // 创建批量任务
        const result = await createBatchTask(config)

        return NextResponse.json({
          success: true,
          data: result,
          message: `Successfully created batch task with ${result.totalSubtasks} subtasks`
        })
      }

      case 'start': {
        // 开始执行批量任务
        const { batchTaskId } = body
        await startBatchExecution(batchTaskId)

        return NextResponse.json({
          success: true,
          message: 'Batch task execution started'
        })
      }

      case 'cancel': {
        // 取消批量任务
        const { batchTaskId } = body
        await cancelBatchTask(batchTaskId)

        return NextResponse.json({
          success: true,
          message: 'Batch task cancelled'
        })
      }

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Batch task API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const batchTaskId = searchParams.get('id')

    if (batchTaskId) {
      // 获取特定批量任务的进度
      const progress = await getBatchTaskProgress(batchTaskId)

      if (!progress) {
        return NextResponse.json({
          success: false,
          error: 'Batch task not found'
        }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        data: progress
      })
    } else {
      // 获取批量任务列表
      const page = parseInt(searchParams.get('page') || '1')
      const pageSize = parseInt(searchParams.get('pageSize') || '10')
      const status = searchParams.get('status') || undefined

      const result = await withDatabase(async (db) => {
        return await db.getBatchTasks({
          page,
          pageSize,
          status
        })
      })

      return NextResponse.json({
        success: true,
        data: result
      })
    }
  } catch (error) {
    console.error('Batch task GET error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
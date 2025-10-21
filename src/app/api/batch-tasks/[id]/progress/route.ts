// 批量任务进度更新 API 路由

import { NextRequest, NextResponse } from 'next/server'
import { BatchProcessor } from '@/lib/batch-processor'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const batchTaskId = params.id
    const body = await request.json()

    // 更新子任务进度
    await BatchProcessor.updateSubTaskProgress({
      batchTaskId,
      taskId: body.taskId,
      status: body.status,
      progress: body.progress || 0,
      error: body.error,
      result: body.result
    })

    return NextResponse.json({
      success: true,
      message: 'Progress updated successfully'
    })
  } catch (error) {
    console.error('Progress update error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const batchTaskId = params.id

    // 获取批量任务进度
    const progress = await BatchProcessor.getBatchTaskProgress(batchTaskId)

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
  } catch (error) {
    console.error('Progress get error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
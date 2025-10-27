/**
 * 重构后的任务轮询API - 使用新的能力系统
 */

import { NextRequest, NextResponse } from 'next/server'
import { useVideoGeneration, useTaskManagement } from '@/lib/capabilities'

/**
 * 处理任务轮询请求
 */
async function handleTaskPolling(request: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
  try {
    const taskId = params.id
    console.log(`🔍 [CAPABILITY-SYSTEM] 开始轮询任务: ${taskId}`)

    // 使用任务管理能力获取任务信息
    const taskManager = await useTaskManagement()
    const taskResult = await taskManager.getTask(taskId)

    if (!taskResult.success || !taskResult.data) {
      return NextResponse.json(
        {
          success: false,
          error: 'Task not found',
          code: 'TASK_NOT_FOUND'
        },
        { status: 404 }
      )
    }

    const task = taskResult.data
    console.log(`📋 [CAPABILITY-SYSTEM] 任务信息:`, {
      id: task.id,
      type: task.type,
      status: task.status,
      model: task.model,
      hasExternalTaskId: !!task.externalTaskId
    })

    // 如果是视频任务且有外部任务ID，进行轮询
    if (task.type === 'video' && task.externalTaskId) {
      const videoGen = await useVideoGeneration()

      console.log(`🎬 [CAPABILITY-SYSTEM] 开始轮询视频任务状态: ${task.externalTaskId}`)
      const pollResult = await videoGen.pollVideoStatus(task.externalTaskId)

      if (!pollResult.success) {
        console.error(`❌ [CAPABILITY-SYSTEM] 视频轮询失败: ${pollResult.error}`)
        return NextResponse.json({
          success: false,
          error: pollResult.error,
          code: 'POLL_ERROR'
        })
      }

      const pollData = pollResult.data
      console.log(`✅ [CAPABILITY-SYSTEM] 视频轮询成功:`, {
        status: pollData.status,
        progress: pollData.progress,
        hasResults: !!(pollData.results && pollData.results.length > 0)
      })

      // 如果任务完成，更新任务状态和结果
      if (pollData.status === 'completed' && pollData.results && pollData.results.length > 0) {
        await taskManager.updateTaskStatus(taskId, 'completed', 100)
        await taskManager.updateTaskResults(taskId, pollData.results)

        console.log(`✅ [CAPABILITY-SYSTEM] 任务 ${taskId} 已标记为完成，结果已保存`)
      } else if (pollData.status === 'failed') {
        await taskManager.updateTaskStatus(taskId, 'failed', 0, pollData.error)
        console.log(`❌ [CAPABILITY-SYSTEM] 任务 ${taskId} 已标记为失败`)
      } else {
        // 更新进度
        const progress = pollData.progress || 0
        await taskManager.updateTaskStatus(taskId, 'running', progress)
        console.log(`📊 [CAPABILITY-SYSTEM] 任务 ${taskId} 进度更新: ${progress}%`)
      }

      return NextResponse.json({
        success: true,
        data: {
          taskId,
          status: pollData.status,
          progress: pollData.progress || 0,
          results: pollData.results || [],
          error: pollData.error,
          isAsyncVideo: true,
          metadata: {
            externalTaskId: task.externalTaskId,
            model: task.model,
            lastPolled: new Date().toISOString()
          }
        }
      })

    } else {
      // 非视频任务或无外部任务ID，返回当前状态
      console.log(`📋 [CAPABILITY-SYSTEM] 返回当前任务状态: ${task.status}`)

      return NextResponse.json({
        success: true,
        data: {
          taskId,
          status: task.status,
          progress: task.progress || 0,
          results: task.results || [],
          error: task.error,
          isAsyncVideo: false,
          metadata: {
            type: task.type,
            model: task.model,
            createdAt: task.createdAt
          }
        }
      })
    }

  } catch (error) {
    console.error(`❌ [CAPABILITY-SYSTEM] 轮询处理失败:`, error)

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

// HTTP方法路由
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  return await handleTaskPolling(request, { params })
}
import { NextRequest, NextResponse } from 'next/server'
import { taskMonitorService } from '@/lib/task-monitor'

// GET - 获取任务监控详情
export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const taskId = params.taskId
    const monitor = taskMonitorService.getMonitor(taskId)

    if (!monitor) {
      return NextResponse.json(
        { success: false, error: 'Task monitor not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: monitor
    })

  } catch (error) {
    console.error('Error fetching task monitor:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - 更新任务监控状态
export async function POST(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const taskId = params.taskId
    const body = await request.json()
    const { type, data } = body

    let monitor = taskMonitorService.getMonitor(taskId)
    if (!monitor) {
      monitor = taskMonitorService.createMonitor(taskId)
    }

    switch (type) {
      case 'status':
        taskMonitorService.updateStatus(taskId, data.status, data.stage)
        break

      case 'progress':
        taskMonitorService.updateProgress(taskId, data.progress, data.stage)
        break

      case 'metrics':
        taskMonitorService.updateMetrics(taskId, data)
        break

      case 'log':
        taskMonitorService.addLog(taskId, data.level, data.message, data.data)
        break

      case 'notification':
        taskMonitorService.addNotification(
          taskId,
          data.type,
          data.title,
          data.message,
          data.actionUrl,
          data.actionText
        )
        break

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid update type' },
          { status: 400 }
        )
    }

    const updatedMonitor = taskMonitorService.getMonitor(taskId)

    return NextResponse.json({
      success: true,
      data: updatedMonitor
    })

  } catch (error) {
    console.error('Error updating task monitor:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - 清理任务监控
export async function DELETE(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const taskId = params.taskId
    taskMonitorService.cleanup(taskId)

    return NextResponse.json({
      success: true,
      message: 'Task monitor cleaned up successfully'
    })

  } catch (error) {
    console.error('Error cleaning up task monitor:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
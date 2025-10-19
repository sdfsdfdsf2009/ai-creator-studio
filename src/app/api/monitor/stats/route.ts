import { NextRequest, NextResponse } from 'next/server'
import { taskMonitorService } from '@/lib/task-monitor'

// GET - 获取任务监控统计信息
export async function GET(request: NextRequest) {
  try {
    const stats = taskMonitorService.getStats()

    return NextResponse.json({
      success: true,
      data: stats
    })

  } catch (error) {
    console.error('Error fetching task monitor stats:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - 获取所有监控器详情
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { includeDetails = false } = body

    const monitors = taskMonitorService.getAllMonitors()
    const stats = taskMonitorService.getStats()

    const responseData = {
      stats,
      monitors: includeDetails ? monitors : monitors.map(m => ({
        id: m.id,
        taskId: m.taskId,
        status: m.status,
        progress: m.progress,
        stage: m.stage,
        startTime: m.startTime,
        endTime: m.endTime,
        notificationCount: m.notifications.filter(n => !n.read).length
      }))
    }

    return NextResponse.json({
      success: true,
      data: responseData
    })

  } catch (error) {
    console.error('Error fetching all task monitors:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
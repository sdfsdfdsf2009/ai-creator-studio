import { NextRequest, NextResponse } from 'next/server'
import { Task } from '@/types'

// 导入共享的任务存储 (在实际项目中应该使用数据库)
// 这里我们需要从主API导入任务存储，为了调试简化，使用全局变量
declare global {
  var __tasks: Map<string, Task>
}

if (!global.__tasks) {
  global.__tasks = new Map()
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const task = global.__tasks.get(id)

    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: task
    })

  } catch (error) {
    console.error('Error fetching task:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const task = global.__tasks.get(id)

    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      )
    }

    // 更新任务状态为已取消
    task.status = 'cancelled'
    task.updatedAt = new Date().toISOString()

    return NextResponse.json({
      success: true,
      data: task
    })

  } catch (error) {
    console.error('Error cancelling task:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { action } = body

    const task = global.__tasks.get(id)
    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      )
    }

    switch (action) {
      case 'retry':
        // 重试任务
        if (task.status === 'failed' || task.status === 'cancelled') {
          task.status = 'pending'
          task.progress = 0
          task.error = undefined
          task.updatedAt = new Date().toISOString()
          // 这里应该重新启动任务处理流程
        }
        break

      case 'cancel':
        // 取消任务
        if (task.status === 'pending' || task.status === 'running') {
          task.status = 'cancelled'
          task.updatedAt = new Date().toISOString()
        }
        break

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      data: task
    })

  } catch (error) {
    console.error('Error updating task:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
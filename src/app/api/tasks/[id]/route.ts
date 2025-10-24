import { NextRequest, NextResponse } from 'next/server'
import { Task } from '@/types'
import { withDatabase } from '@/lib/database'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const task = await withDatabase(async (db) => {
      return await db.getTask(id)
    })

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

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()

    const updatedTask = await withDatabase(async (db) => {
      await db.updateTask(id, body)
      return await db.getTask(id)
    })

    if (!updatedTask) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedTask
    })

  } catch (error) {
    console.error('Error updating task:', error)
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

    const updatedTask = await withDatabase(async (db) => {
      await db.updateTask(id, { status: 'cancelled' })
      return await db.getTask(id)
    })

    if (!updatedTask) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedTask
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

    let updateData = {}

    switch (action) {
      case 'retry':
        // 重试任务
        updateData = {
          status: 'pending',
          progress: 0,
          error: null
        }
        break

      case 'cancel':
        // 取消任务
        updateData = {
          status: 'cancelled'
        }
        break

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }

    const updatedTask = await withDatabase(async (db) => {
      await db.updateTask(id, updateData)
      return await db.getTask(id)
    })

    if (!updatedTask) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedTask
    })

  } catch (error) {
    console.error('Error updating task:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { createN8nClient } from '@/lib/n8n'

// GET - 获取执行历史
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workflowId = searchParams.get('workflowId')
    const limit = parseInt(searchParams.get('limit') || '50')

    const client = createN8nClient()

    try {
      const executions = await client.getExecutions(
        workflowId || undefined,
        limit
      )
      return NextResponse.json({
        success: true,
        data: executions
      })
    } catch (error) {
      console.warn('Failed to get executions from n8n, returning mock data')
      // 返回模拟执行数据
      const mockExecutions = [
        {
          id: 'exec-1',
          workflowId: workflowId || 'workflow-1',
          status: 'success' as const,
          startedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          finishedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
          data: {
            input: { prompt: '测试prompt' },
            output: { images: ['image1.jpg'] }
          }
        },
        {
          id: 'exec-2',
          workflowId: workflowId || 'workflow-1',
          status: 'running' as const,
          startedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          data: {
            input: { prompt: '另一个测试prompt' }
          }
        },
        {
          id: 'exec-3',
          workflowId: workflowId || 'workflow-2',
          status: 'error' as const,
          startedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          finishedAt: new Date(Date.now() - 58 * 60 * 1000).toISOString(),
          data: {},
          error: 'API调用失败'
        }
      ]

      return NextResponse.json({
        success: true,
        data: mockExecutions
      })
    }

  } catch (error) {
    console.error('Error fetching n8n executions:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch executions' },
      { status: 500 }
    )
  }
}
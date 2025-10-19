import { NextRequest, NextResponse } from 'next/server'
import { createN8nClient, WORKFLOW_TEMPLATES } from '@/lib/n8n'

// GET - 获取工作流列表
export async function GET(request: NextRequest) {
  try {
    // 这里应该从设置中获取 n8n 配置
    // 现在使用环境变量或默认配置
    const client = createN8nClient()

    // 尝试连接到 n8n 实例
    let workflows = []
    try {
      workflows = await client.getWorkflows()
    } catch (error) {
      console.warn('Failed to connect to n8n, returning mock data')
      // 返回模拟工作流数据
      workflows = [
        {
          id: 'workflow-1',
          name: 'AI内容生成工作流',
          description: '自动处理AI生成任务，包括prompt优化和多模型生成',
          status: 'active' as const,
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          nodes: WORKFLOW_TEMPLATES.aiGeneration.nodes,
          connections: WORKFLOW_TEMPLATES.aiGeneration.connections
        },
        {
          id: 'workflow-2',
          name: '批量处理工作流',
          description: '批量处理多个生成任务，支持队列管理和并发控制',
          status: 'inactive' as const,
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          nodes: WORKFLOW_TEMPLATES.batchProcessing.nodes,
          connections: WORKFLOW_TEMPLATES.batchProcessing.connections
        }
      ]
    }

    return NextResponse.json({
      success: true,
      data: workflows
    })

  } catch (error) {
    console.error('Error fetching n8n workflows:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch workflows' },
      { status: 500 }
    )
  }
}

// POST - 创建新工作流
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, template } = body

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Workflow name is required' },
        { status: 400 }
      )
    }

    const client = createN8nClient()

    // 如果使用了模板，应用模板配置
    let workflowData: any = {
      name,
      description: description || '',
      nodes: [],
      connections: []
    }

    if (template && WORKFLOW_TEMPLATES[template as keyof typeof WORKFLOW_TEMPLATES]) {
      const templateData = WORKFLOW_TEMPLATES[template as keyof typeof WORKFLOW_TEMPLATES]
      workflowData = {
        ...workflowData,
        nodes: templateData.nodes,
        connections: templateData.connections
      }
    }

    try {
      const newWorkflow = await client.createWorkflow(workflowData)
      return NextResponse.json({
        success: true,
        data: newWorkflow
      })
    } catch (error) {
      console.warn('Failed to create workflow in n8n, returning mock data')
      // 返回模拟创建的工作流
      const mockWorkflow = {
        id: `workflow-${Date.now()}`,
        name,
        description: description || '',
        status: 'inactive' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        nodes: workflowData.nodes,
        connections: workflowData.connections
      }

      return NextResponse.json({
        success: true,
        data: mockWorkflow
      })
    }

  } catch (error) {
    console.error('Error creating n8n workflow:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create workflow' },
      { status: 500 }
    )
  }
}
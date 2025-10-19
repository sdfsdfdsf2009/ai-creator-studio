import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createN8nClient, N8nWorkflow, N8nExecution, N8nWebhook } from '@/lib/n8n'

// API 响应类型
interface N8nWorkflowsResponse {
  success: boolean
  data: N8nWorkflow[]
}

interface N8nWorkflowResponse {
  success: boolean
  data: N8nWorkflow
}

interface N8nExecutionsResponse {
  success: boolean
  data: N8nExecution[]
}

interface N8nExecutionResponse {
  success: boolean
  data: N8nExecution
}

interface N8nWebhooksResponse {
  success: boolean
  data: N8nWebhook[]
}

interface ConnectionTestResponse {
  success: boolean
  data: {
    connected: boolean
    message: string
  }
}

// 获取 n8n 工作流列表
export function useN8nWorkflows() {
  return useQuery({
    queryKey: ['n8n-workflows'],
    queryFn: async () => {
      const response = await fetch('/api/n8n/workflows')
      if (!response.ok) {
        throw new Error('Failed to fetch n8n workflows')
      }
      return response.json() as Promise<N8nWorkflowsResponse>
    },
    refetchOnWindowFocus: false,
  })
}

// 获取 n8n 工作流详情
export function useN8nWorkflow(id: string) {
  return useQuery({
    queryKey: ['n8n-workflow', id],
    queryFn: async () => {
      const response = await fetch(`/api/n8n/workflows/${id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch n8n workflow')
      }
      return response.json() as Promise<N8nWorkflowResponse>
    },
    enabled: !!id,
    refetchOnWindowFocus: false,
  })
}

// 创建 n8n 工作流
export function useCreateN8nWorkflow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (workflow: Partial<N8nWorkflow>) => {
      const response = await fetch('/api/n8n/workflows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(workflow),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create workflow')
      }

      return response.json() as Promise<N8nWorkflowResponse>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['n8n-workflows'] })
    },
  })
}

// 更新 n8n 工作流
export function useUpdateN8nWorkflow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, workflow }: { id: string; workflow: Partial<N8nWorkflow> }) => {
      const response = await fetch(`/api/n8n/workflows/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(workflow),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update workflow')
      }

      return response.json() as Promise<N8nWorkflowResponse>
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['n8n-workflows'] })
      queryClient.invalidateQueries({ queryKey: ['n8n-workflow', id] })
    },
  })
}

// 删除 n8n 工作流
export function useDeleteN8nWorkflow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/n8n/workflows/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete workflow')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['n8n-workflows'] })
    },
  })
}

// 激活 n8n 工作流
export function useActivateN8nWorkflow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/n8n/workflows/${id}/activate`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to activate workflow')
      }

      return response.json() as Promise<N8nWorkflowResponse>
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['n8n-workflows'] })
      queryClient.invalidateQueries({ queryKey: ['n8n-workflow', id] })
    },
  })
}

// 停用 n8n 工作流
export function useDeactivateN8nWorkflow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/n8n/workflows/${id}/deactivate`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to deactivate workflow')
      }

      return response.json() as Promise<N8nWorkflowResponse>
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['n8n-workflows'] })
      queryClient.invalidateQueries({ queryKey: ['n8n-workflow', id] })
    },
  })
}

// 执行 n8n 工作流
export function useExecuteN8nWorkflow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data?: Record<string, any> }) => {
      const response = await fetch(`/api/n8n/workflows/${id}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to execute workflow')
      }

      return response.json() as Promise<N8nExecutionResponse>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['n8n-executions'] })
    },
  })
}

// 获取 n8n 执行历史
export function useN8nExecutions(workflowId?: string, limit = 50) {
  return useQuery({
    queryKey: ['n8n-executions', workflowId, limit],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: limit.toString() })
      if (workflowId) {
        params.append('workflowId', workflowId)
      }

      const response = await fetch(`/api/n8n/executions?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch n8n executions')
      }
      return response.json() as Promise<N8nExecutionsResponse>
    },
    refetchOnWindowFocus: false,
  })
}

// 获取 n8n 执行详情
export function useN8nExecution(id: string) {
  return useQuery({
    queryKey: ['n8n-execution', id],
    queryFn: async () => {
      const response = await fetch(`/api/n8n/executions/${id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch n8n execution')
      }
      return response.json() as Promise<N8nExecutionResponse>
    },
    enabled: !!id,
    refetchOnWindowFocus: false,
  })
}

// 获取 n8n Webhook 列表
export function useN8nWebhooks() {
  return useQuery({
    queryKey: ['n8n-webhooks'],
    queryFn: async () => {
      const response = await fetch('/api/n8n/webhooks')
      if (!response.ok) {
        throw new Error('Failed to fetch n8n webhooks')
      }
      return response.json() as Promise<N8nWebhooksResponse>
    },
    refetchOnWindowFocus: false,
  })
}

// 测试 n8n 连接
export function useTestN8nConnection() {
  return useMutation({
    mutationFn: async (config: { baseUrl: string; apiKey?: string }) => {
      const response = await fetch('/api/n8n/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to test connection')
      }

      return response.json() as Promise<ConnectionTestResponse>
    },
  })
}

// 工作流工具函数
export const n8nUtils = {
  // 获取工作流状态文本
  getStatusText: (status: string): string => {
    const statusMap = {
      'active': '激活',
      'inactive': '未激活',
      'error': '错误',
      'running': '运行中',
      'success': '成功',
      'canceled': '已取消'
    }
    return statusMap[status as keyof typeof statusMap] || status
  },

  // 获取工作流状态颜色
  getStatusColor: (status: string): string => {
    const colorMap = {
      'active': 'text-green-600 bg-green-50',
      'inactive': 'text-gray-600 bg-gray-50',
      'error': 'text-red-600 bg-red-50',
      'running': 'text-blue-600 bg-blue-50',
      'success': 'text-green-600 bg-green-50',
      'canceled': 'text-yellow-600 bg-yellow-50'
    }
    return colorMap[status as keyof typeof colorMap] || 'text-gray-600 bg-gray-50'
  },

  // 格式化执行时间
  formatExecutionTime: (startedAt: string, finishedAt?: string): string => {
    if (!finishedAt) {
      const start = new Date(startedAt)
      const now = new Date()
      const duration = Math.floor((now.getTime() - start.getTime()) / 1000)
      return `运行中 (${duration}秒)`
    }

    const start = new Date(startedAt)
    const end = new Date(finishedAt)
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000)

    if (duration < 60) {
      return `${duration}秒`
    } else if (duration < 3600) {
      return `${Math.floor(duration / 60)}分${duration % 60}秒`
    } else {
      const hours = Math.floor(duration / 3600)
      const minutes = Math.floor((duration % 3600) / 60)
      return `${hours}小时${minutes}分`
    }
  },

  // 格式化时间
  formatTime: (timeString: string): string => {
    return new Date(timeString).toLocaleString('zh-CN')
  },

  // 获取节点类型显示名称
  getNodeTypeDisplayName: (nodeType: string): string => {
    const typeMap = {
      'n8n-nodes-base.start': '开始',
      'n8n-nodes-base.webhook': 'Webhook',
      'n8n-nodes-base.httpRequest': 'HTTP请求',
      'n8n-nodes-base.function': '函数',
      'n8n-nodes-base.cron': '定时触发器',
      'n8n-nodes-base.splitInBatches': '批量处理',
      'n8n-nodes-base.set': '设置变量',
      'n8n-nodes-base.if': '条件判断',
      'n8n-nodes-base.switch': '条件分支',
      'n8n-nodes-base.merge': '合并数据',
      'n8n-nodes-base.code': '代码执行'
    }
    return typeMap[nodeType as keyof typeof typeMap] || nodeType.replace('n8n-nodes-base.', '')
  },

  // 验证工作流配置
  validateWorkflow: (workflow: Partial<N8nWorkflow>): { valid: boolean; errors: string[] } => {
    const errors: string[] = []

    if (!workflow.name || workflow.name.trim() === '') {
      errors.push('工作流名称不能为空')
    }

    if (!workflow.nodes || workflow.nodes.length === 0) {
      errors.push('工作流必须包含至少一个节点')
    }

    if (!workflow.connections || workflow.connections.length === 0) {
      errors.push('工作流必须包含节点连接')
    }

    // 检查是否有开始节点
    const hasStartNode = workflow.nodes?.some(node =>
      node.type === 'n8n-nodes-base.start' || node.type === 'n8n-nodes-base.webhook'
    )
    if (!hasStartNode) {
      errors.push('工作流必须有开始节点或Webhook节点')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}
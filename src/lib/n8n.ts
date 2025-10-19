// n8n 工作流集成
export interface N8nWorkflow {
  id: string
  name: string
  description?: string
  status: 'active' | 'inactive' | 'error'
  createdAt: string
  updatedAt: string
  nodes: N8nNode[]
  connections: N8nConnection[]
}

export interface N8nNode {
  id: string
  name: string
  type: string
  parameters: Record<string, any>
  position: [number, number]
}

export interface N8nConnection {
  sourceNode: string
  targetNode: string
  sourceIndex?: number
  targetIndex?: number
}

export interface N8nExecution {
  id: string
  workflowId: string
  status: 'running' | 'success' | 'error' | 'canceled'
  startedAt: string
  finishedAt?: string
  data: Record<string, any>
  error?: string
}

export interface N8nWebhook {
  id: string
  workflowId: string
  path: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  responseMode: 'onReceived' | 'waitingForWebhookResponse'
  authentication: 'none' | 'basicAuth' | 'headerAuth' | 'oAuth1'
  pathParameters?: Record<string, string>
  queryParameters?: Record<string, string>
  headers?: Record<string, string>
  responseCode?: number
  responseHeaders?: Record<string, string>
  responseBody?: string
  options: {
    rawBody?: boolean
  }
}

class N8nClient {
  private baseUrl: string
  private apiKey?: string

  constructor(baseUrl: string, apiKey?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '') // 移除末尾斜杠
    this.apiKey = apiKey
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    if (this.apiKey) {
      headers['X-N8N-API-KEY'] = this.apiKey
      headers['Authorization'] = `Bearer ${this.apiKey}`
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`
        )
      }

      return response.json()
    } catch (error) {
      console.error(`N8n API request failed: ${endpoint}`, error)
      throw error
    }
  }

  // 获取所有工作流
  async getWorkflows(): Promise<N8nWorkflow[]> {
    try {
      const response = await this.request<{ data: N8nWorkflow[] }>('/rest/workflows')
      return response.data
    } catch (error) {
      console.error('Failed to fetch workflows:', error)
      throw new Error('获取工作流列表失败')
    }
  }

  // 获取工作流详情
  async getWorkflow(id: string): Promise<N8nWorkflow> {
    try {
      const response = await this.request<{ data: N8nWorkflow }>(`/rest/workflows/${id}`)
      return response.data
    } catch (error) {
      console.error('Failed to fetch workflow:', error)
      throw new Error('获取工作流详情失败')
    }
  }

  // 创建工作流
  async createWorkflow(workflow: Partial<N8nWorkflow>): Promise<N8nWorkflow> {
    try {
      const response = await this.request<{ data: N8nWorkflow }>('/rest/workflows', {
        method: 'POST',
        body: JSON.stringify(workflow),
      })
      return response.data
    } catch (error) {
      console.error('Failed to create workflow:', error)
      throw new Error('创建工作流失败')
    }
  }

  // 更新工作流
  async updateWorkflow(id: string, workflow: Partial<N8nWorkflow>): Promise<N8nWorkflow> {
    try {
      const response = await this.request<{ data: N8nWorkflow }>(`/rest/workflows/${id}`, {
        method: 'PUT',
        body: JSON.stringify(workflow),
      })
      return response.data
    } catch (error) {
      console.error('Failed to update workflow:', error)
      throw new Error('更新工作流失败')
    }
  }

  // 删除工作流
  async deleteWorkflow(id: string): Promise<void> {
    try {
      await this.request(`/rest/workflows/${id}`, {
        method: 'DELETE',
      })
    } catch (error) {
      console.error('Failed to delete workflow:', error)
      throw new Error('删除工作流失败')
    }
  }

  // 激活工作流
  async activateWorkflow(id: string): Promise<N8nWorkflow> {
    try {
      const response = await this.request<{ data: N8nWorkflow }>(`/rest/workflows/${id}/activate`, {
        method: 'POST',
      })
      return response.data
    } catch (error) {
      console.error('Failed to activate workflow:', error)
      throw new Error('激活工作流失败')
    }
  }

  // 停用工作流
  async deactivateWorkflow(id: string): Promise<N8nWorkflow> {
    try {
      const response = await this.request<{ data: N8nWorkflow }>(`/rest/workflows/${id}/deactivate`, {
        method: 'POST',
      })
      return response.data
    } catch (error) {
      console.error('Failed to deactivate workflow:', error)
      throw new Error('停用工作流失败')
    }
  }

  // 执行工作流
  async executeWorkflow(id: string, data?: Record<string, any>): Promise<N8nExecution> {
    try {
      const response = await this.request<{ data: N8nExecution }>(`/rest/workflows/${id}/execute`, {
        method: 'POST',
        body: JSON.stringify({
          data: data || {},
        }),
      })
      return response.data
    } catch (error) {
      console.error('Failed to execute workflow:', error)
      throw new Error('执行工作流失败')
    }
  }

  // 获取执行历史
  async getExecutions(workflowId?: string, limit = 50): Promise<N8nExecution[]> {
    try {
      const params = new URLSearchParams({ limit: limit.toString() })
      if (workflowId) {
        params.append('workflowId', workflowId)
      }

      const response = await this.request<{ data: N8nExecution[] }>(`/rest/executions?${params}`)
      return response.data
    } catch (error) {
      console.error('Failed to fetch executions:', error)
      throw new Error('获取执行历史失败')
    }
  }

  // 获取执行详情
  async getExecution(id: string): Promise<N8nExecution> {
    try {
      const response = await this.request<{ data: N8nExecution }>(`/rest/executions/${id}`)
      return response.data
    } catch (error) {
      console.error('Failed to fetch execution:', error)
      throw new Error('获取执行详情失败')
    }
  }

  // 获取 Webhook 列表
  async getWebhooks(): Promise<N8nWebhook[]> {
    try {
      const response = await this.request<{ data: N8nWebhook[] }>('/rest/webhooks')
      return response.data
    } catch (error) {
      console.error('Failed to fetch webhooks:', error)
      throw new Error('获取 Webhook 列表失败')
    }
  }

  // 测试连接
  async testConnection(): Promise<boolean> {
    try {
      await this.request('/rest/workflows', { method: 'GET' })
      return true
    } catch (error) {
      return false
    }
  }
}

// 创建 n8n 客户端实例
export function createN8nClient(baseUrl?: string, apiKey?: string): N8nClient {
  // 从环境变量或设置中获取配置
  const defaultBaseUrl = baseUrl || process.env.N8N_BASE_URL || 'http://localhost:5678'
  const defaultApiKey = apiKey || process.env.N8N_API_KEY

  return new N8nClient(defaultBaseUrl, defaultApiKey)
}

// 预定义的工作流模板
export const WORKFLOW_TEMPLATES = {
  // AI生成工作流
  aiGeneration: {
    name: 'AI内容生成工作流',
    description: '自动处理AI生成任务，包括prompt优化、多模型生成和结果处理',
    nodes: [
      {
        id: 'start',
        name: '开始',
        type: 'n8n-nodes-base.start',
        parameters: {},
        position: [240, 300]
      },
      {
        id: 'webhook',
        name: '接收任务',
        type: 'n8n-nodes-base.webhook',
        parameters: {
          path: 'ai-generation',
          method: 'POST',
          responseMode: 'onReceived'
        },
        position: [460, 300]
      },
      {
        id: 'prompt-optimizer',
        name: 'Prompt优化',
        type: 'n8n-nodes-base.httpRequest',
        parameters: {
          method: 'POST',
          url: '{{ $json.aiService }}/chat/completions',
          headers: {
            'Authorization': 'Bearer {{ $json.apiKey }}',
            'Content-Type': 'application/json'
          },
          body: {
            model: 'gpt-4',
            messages: [
              {
                role: 'system',
                content: '你是一个专业的prompt优化专家，请优化用户的prompt以提高AI生成质量。'
              },
              {
                role: 'user',
                content: '{{ $json.prompt }}'
              }
            ]
          }
        },
        position: [680, 300]
      },
      {
        id: 'ai-generator',
        name: 'AI生成',
        type: 'n8n-nodes-base.httpRequest',
        parameters: {
          method: 'POST',
          url: '{{ $json.aiService }}/{{ $json.type }}/generations',
          headers: {
            'Authorization': 'Bearer {{ $json.apiKey }}',
            'Content-Type': 'application/json'
          },
          body: {
            prompt: '{{ $json.optimizedPrompt }}',
            model: '{{ $json.model }}',
            // 其他参数...
          }
        },
        position: [900, 300]
      },
      {
        id: 'result-processor',
        name: '结果处理',
        type: 'n8n-nodes-base.function',
        parameters: {
          functionCode: `
            // 处理AI生成结果
            const results = $input.first().json;

            // 保存到素材库
            const processedResults = {
              taskId: results.taskId,
              images: results.data?.map((img, index) => ({
                id: \`img_\${Date.now()}_\${index}\`,
                url: img.url,
                filename: img.filename || \`image_\${index}.png\`,
                size: img.size || 0,
                type: 'image',
                metadata: {
                  model: results.model,
                  prompt: results.prompt,
                  parameters: results.parameters,
                  createdAt: new Date().toISOString()
                }
              })) || [],
              metadata: {
                totalCost: results.cost || 0,
                generationTime: results.generationTime || 0,
                success: true
              }
            };

            return processedResults;
          `
        },
        position: [1120, 300]
      },
      {
        id: 'save-to-library',
        name: '保存到素材库',
        type: 'n8n-nodes-base.httpRequest',
        parameters: {
          method: 'POST',
          url: '{{ $json.apiBaseUrl }}/api/materials',
          headers: {
            'Content-Type': 'application/json'
          },
          body: '{{ $json }}'
        },
        position: [1340, 300]
      }
    ],
    connections: [
      {
        sourceNode: 'start',
        targetNode: 'webhook'
      },
      {
        sourceNode: 'webhook',
        targetNode: 'prompt-optimizer'
      },
      {
        sourceNode: 'prompt-optimizer',
        targetNode: 'ai-generator'
      },
      {
        sourceNode: 'ai-generator',
        targetNode: 'result-processor'
      },
      {
        sourceNode: 'result-processor',
        targetNode: 'save-to-library'
      }
    ]
  },

  // 批量处理工作流
  batchProcessing: {
    name: '批量内容处理工作流',
    description: '批量处理多个生成任务，支持队列管理和并发控制',
    nodes: [
      {
        id: 'start',
        name: '开始',
        type: 'n8n-nodes-base.start',
        parameters: {},
        position: [240, 300]
      },
      {
        id: 'scheduler',
        name: '定时触发器',
        type: 'n8n-nodes-base.cron',
        parameters: {
          cronExpression: '0 */5 * * * *', // 每5分钟执行一次
          timezone: 'Asia/Shanghai'
        },
        position: [460, 300]
      },
      {
        id: 'get-pending-tasks',
        name: '获取待处理任务',
        type: 'n8n-nodes-base.httpRequest',
        parameters: {
          method: 'GET',
          url: '{{ $json.apiBaseUrl }}/api/tasks?status=pending&limit=10',
          headers: {
            'Content-Type': 'application/json'
          }
        },
        position: [680, 300]
      },
      {
        id: 'process-batch',
        name: '批量处理',
        type: 'n8n-nodes-base.splitInBatches',
        parameters: {
          batchSize: 3,
          options: {}
        },
        position: [900, 300]
      },
      {
        id: 'generate-content',
        name: '生成内容',
        type: 'n8n-nodes-base.httpRequest',
        parameters: {
          method: 'POST',
          url: '{{ $json.apiBaseUrl }}/api/tasks/{{ $json.id }}/process',
          headers: {
            'Content-Type': 'application/json'
          }
        },
        position: [1120, 300]
      },
      {
        id: 'update-status',
        name: '更新状态',
        type: 'n8n-nodes-base.httpRequest',
        parameters: {
          method: 'PUT',
          url: '{{ $json.apiBaseUrl }}/api/tasks/{{ $json.id }}/status',
          headers: {
            'Content-Type': 'application/json'
          },
          body: {
            status: 'completed',
            results: '{{ $json.results }}'
          }
        },
        position: [1340, 300]
      }
    ],
    connections: [
      {
        sourceNode: 'start',
        targetNode: 'scheduler'
      },
      {
        sourceNode: 'scheduler',
        targetNode: 'get-pending-tasks'
      },
      {
        sourceNode: 'get-pending-tasks',
        targetNode: 'process-batch'
      },
      {
        sourceNode: 'process-batch',
        targetNode: 'generate-content'
      },
      {
        sourceNode: 'generate-content',
        targetNode: 'update-status'
      }
    ]
  }
}

export default N8nClient
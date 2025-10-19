import { ApiResponse, PaginatedResponse, Task, PromptTemplate, Analytics, AIModel } from '@/types'

// API 基础配置
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api'

// 通用请求函数
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  }

  try {
    const response = await fetch(url, config)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`)
    }

    return data
  } catch (error) {
    console.error('API request failed:', error)
    throw error
  }
}

// 分页请求函数
async function apiRequestPaginated<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<PaginatedResponse<T>> {
  const response = await apiRequest<PaginatedResponse<T>>(endpoint, options)
  return response.data!
}

// 任务相关 API
export const taskApi = {
  // 获取任务列表
  getTasks: (params?: {
    page?: number
    pageSize?: number
    status?: string
    type?: string
  }) => {
    const searchParams = new URLSearchParams(params as any).toString()
    return apiRequestPaginated<Task>(`/tasks?${searchParams}`)
  },

  // 获取单个任务
  getTask: (id: string) => 
    apiRequest<Task>(`/tasks/${id}`),

  // 创建任务
  createTask: (data: {
    type: 'image' | 'video'
    prompt: string
    model: string
    parameters?: Record<string, any>
  }) => 
    apiRequest<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // 取消任务
  cancelTask: (id: string) =>
    apiRequest<Task>(`/tasks/${id}`, {
      method: 'POST',
      body: JSON.stringify({ action: 'cancel' }),
    }),

  // 重试任务
  retryTask: (id: string) =>
    apiRequest<Task>(`/tasks/${id}`, {
      method: 'POST',
      body: JSON.stringify({ action: 'retry' }),
    }),

  // 删除任务
  deleteTask: (id: string) =>
    apiRequest<void>(`/tasks/${id}`, {
      method: 'DELETE',
    }),
}

// Prompt 模板相关 API
export const templateApi = {
  // 获取模板列表
  getTemplates: (params?: {
    page?: number
    pageSize?: number
    mediaType?: string
    search?: string
  }) => {
    const searchParams = new URLSearchParams(params as any).toString()
    return apiRequestPaginated<PromptTemplate>(`/templates?${searchParams}`)
  },

  // 获取单个模板
  getTemplate: (id: string) => 
    apiRequest<PromptTemplate>(`/templates/${id}`),

  // 创建模板
  createTemplate: (data: Omit<PromptTemplate, 'id' | 'usageCount' | 'totalCost' | 'cacheHitRate' | 'createdAt' | 'updatedAt'>) => 
    apiRequest<PromptTemplate>('/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // 更新模板
  updateTemplate: (id: string, data: Partial<PromptTemplate>) => 
    apiRequest<PromptTemplate>(`/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // 删除模板
  deleteTemplate: (id: string) => 
    apiRequest<void>(`/templates/${id}`, {
      method: 'DELETE',
    }),

  // 使用模板
  useTemplate: (id: string, variables: Record<string, any>) => 
    apiRequest<{ expandedPrompt: string; estimatedCost: number }>(`/templates/${id}/use`, {
      method: 'POST',
      body: JSON.stringify({ variables }),
    }),
}

// AI 模型相关 API
export const modelApi = {
  // 获取模型列表
  getModels: (mediaType?: 'image' | 'video') => 
    apiRequest<AIModel[]>(`/models${mediaType ? `?type=${mediaType}` : ''}`),

  // 获取模型详情
  getModel: (id: string) => 
    apiRequest<AIModel>(`/models/${id}`),

  // 测试模型可用性
  testModel: (id: string) => 
    apiRequest<{ isAvailable: boolean; latency?: number }>(`/models/${id}/test`, {
      method: 'POST',
    }),
}

// 分析数据相关 API
export const analyticsApi = {
  // 获取分析数据
  getAnalytics: (params?: {
    startDate?: string
    endDate?: string
    groupBy?: 'day' | 'week' | 'month'
  }) => {
    const searchParams = new URLSearchParams(params as any).toString()
    return apiRequest<Analytics>(`/analytics?${searchParams}`)
  },

  // 获取成本统计
  getCostStats: (params?: {
    startDate?: string
    endDate?: string
  }) => {
    const searchParams = new URLSearchParams(params as any).toString()
    return apiRequest<any>(`/analytics/cost?${searchParams}`)
  },

  // 导出报表
  exportReport: (params: {
    format: 'pdf' | 'excel' | 'csv'
    startDate?: string
    endDate?: string
  }) => 
    apiRequest<{ downloadUrl: string }>('/analytics/export', {
      method: 'POST',
      body: JSON.stringify(params),
    }),
}

// 素材库相关 API
export const materialsApi = {
  // 获取素材列表
  getMaterials: (params?: {
    page?: number
    pageSize?: number
    type?: 'image' | 'video'
    category?: string
    tags?: string[]
    search?: string
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  }) => {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            if (value.length > 0) {
              searchParams.set(key, value.join(','))
            }
          } else {
            searchParams.set(key, String(value))
          }
        }
      })
    }
    const queryString = searchParams.toString()
    return apiRequestPaginated<any>(`/materials${queryString ? `?${queryString}` : ''}`)
  },

  // 获取单个素材
  getMaterial: (id: string) =>
    apiRequest<any>(`/materials/${id}`),

  // 创建素材
  createMaterial: (data: Omit<any, 'id' | 'createdAt' | 'updatedAt'>) =>
    apiRequest<any>('/materials', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // 更新素材
  updateMaterial: (id: string, data: Partial<any>) =>
    apiRequest<any>(`/materials/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // 删除素材
  deleteMaterial: (id: string) =>
    apiRequest<void>(`/materials/${id}`, {
      method: 'DELETE',
    }),

  // 批量操作
  batchOperation: (params: {
    operation: 'delete' | 'move' | 'addTags' | 'removeTags'
    materialIds: string[]
    categoryId?: string
    tags?: string[]
  }) =>
    apiRequest<any>('/materials', {
      method: 'PUT',
      body: JSON.stringify(params),
    }),

  // 搜索素材
  searchMaterials: (params: {
    search: string
    type?: 'image' | 'video'
    category?: string
    tags?: string[]
    page?: number
    pageSize?: number
  }) => {
    const searchParams = new URLSearchParams(params as any).toString()
    return apiRequestPaginated<any>(`/materials/search?${searchParams}`)
  },

  // 获取分类
  getCategories: () =>
    apiRequest<any[]>('/materials/categories'),

  // 创建分类
  createCategory: (data: {
    name: string
    description?: string
    parentId?: string
  }) =>
    apiRequest<any>('/materials/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // 获取集合
  getCollections: () =>
    apiRequest<any[]>('/materials/collections'),

  // 创建集合
  createCollection: (data: {
    name: string
    description?: string
    materialIds: string[]
    isPublic?: boolean
  }) =>
    apiRequest<any>('/materials/collections', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // 上传文件
  uploadFile: (file: File, onProgress?: (progress: number) => void) => {
    return new Promise<{ url: string; thumbnailUrl?: string }>((resolve, reject) => {
      const formData = new FormData()
      formData.append('file', file)

      const xhr = new XMLHttpRequest()

      if (onProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = (event.loaded / event.total) * 100
            onProgress(progress)
          }
        })
      }

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText)
            if (response.success) {
              resolve(response.data)
            } else {
              reject(new Error(response.error || 'Upload failed'))
            }
          } catch (error) {
            reject(new Error('Invalid response'))
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`))
        }
      })

      xhr.addEventListener('error', () => {
        reject(new Error('Network error'))
      })

      xhr.open('POST', `${API_BASE_URL}/materials/upload`)
      xhr.send(formData)
    })
  },
}

// 飞书集成相关 API
export const feishuApi = {
  // 同步任务到飞书
  syncTaskToFeishu: (taskId: string) =>
    apiRequest<{ success: boolean; recordId?: string }>('/feishu/tasks/sync', {
      method: 'POST',
      body: JSON.stringify({ taskId }),
    }),

  // 从飞书获取任务
  getTasksFromFeishu: (params?: {
    pageSize?: number
    pageToken?: string
  }) => {
    const searchParams = new URLSearchParams(params as any).toString()
    return apiRequestPaginated<Task>(`/feishu/tasks?${searchParams}`)
  },

  // 同步结果到飞书
  syncResultsToFeishu: (taskId: string, results: string[]) =>
    apiRequest<{ success: boolean }>('/feishu/results/sync', {
      method: 'POST',
      body: JSON.stringify({ taskId, results }),
    }),

  // 从飞书获取结果
  getResultsFromFeishu: (params?: {
    pageSize?: number
    pageToken?: string
    mediaType?: string
  }) => {
    const searchParams = new URLSearchParams(params as any).toString()
    return apiRequestPaginated<any>(`/feishu/results?${searchParams}`)
  },
}